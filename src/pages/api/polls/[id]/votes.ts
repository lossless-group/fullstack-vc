// /api/polls/[id]/votes — write endpoint
//
// Flow:
//   1. Verify session cookie (JWT, see lib/session.ts).
//   2. Resolve roster membership (lib/oauth-roster.ts) — only Kauffman Fellows
//      registrants vote in v0.0.1. Anonymous voting is parked (blueprint §17.1).
//   3. Load the poll; reject if it isn't `open`.
//   4. Validate the payload against the poll's template + options.
//   5. Upsert the Vote row keyed by (poll_id, user_id).
//   6. Bump Poll.last_vote_at and Session.last_activity_at (drives v0.0.2+ grace timers).
//   7. Recompute the PollResult cache and return the new total.
//
// Server-only (prerender = false). Returns JSON. 4xx on validation, 401/403 on auth.

import type { APIRoute } from 'astro';
import { db, Poll, Session, Vote, PollResult, eq, and } from 'astro:db';
import { verifySession, SESSION_COOKIE_NAME } from '../../../../lib/session';
import { matchesRoster } from '../../../../lib/oauth-roster';
import { validateVotePayload, aggregateVotes } from '../../../../lib/poll-templates';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const id = params.id;
  if (!id) return json({ error: 'missing poll id' }, 400);

  // ── Auth ────────────────────────────────────────────────────────────────
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return json({ error: 'not authenticated' }, 401);

  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) return json({ error: 'not on roster' }, 403);

  const user_id = session.subject;

  // ── Load poll + verify it's open ────────────────────────────────────────
  const poll = await db.select().from(Poll).where(eq(Poll.id, id)).get();
  if (!poll) return json({ error: 'poll not found' }, 404);
  if (poll.status !== 'open') {
    // Server is authoritative about poll state; client may believe it's open.
    return json({ error: 'poll_closed' }, 409);
  }

  // ── Parse + validate the body ───────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const validation = validateVotePayload(poll.template, poll.options, raw);
  if (!validation.ok) return json({ error: validation.error }, 400);
  const valid = validation.value;

  // Extract the per-template fields onto Vote columns.
  const optionIds = 'option_ids' in valid.payload ? (valid.payload.option_ids as string[]) : null;
  const value     = 'value'      in valid.payload ? (valid.payload.value as boolean | number) : null;

  const now = new Date();

  // ── Upsert Vote keyed by (poll_id, user_id) ─────────────────────────────
  const existing = await db.select().from(Vote)
    .where(and(eq(Vote.poll_id, id), eq(Vote.user_id, user_id)))
    .get();

  if (existing && !poll.allow_revote) {
    return json({ error: 'already voted; this poll does not allow revoting' }, 409);
  }

  if (existing) {
    await db.update(Vote)
      .set({ option_ids: optionIds, value, updated_at: now })
      .where(and(eq(Vote.poll_id, id), eq(Vote.user_id, user_id)));
  } else {
    await db.insert(Vote).values({
      poll_id: id,
      user_id,
      option_ids: optionIds,
      value,
      response: null,
      created_at: now,
      updated_at: now,
      client_meta: null,
    });
  }

  // ── Bump activity timestamps (drives v0.0.2+ grace-period auto-close) ───
  await db.update(Poll)
    .set({ last_vote_at: now, updated_at: now })
    .where(eq(Poll.id, id));

  await db.update(Session)
    .set({ last_activity_at: now, updated_at: now })
    .where(eq(Session.id, poll.session_id));

  // ── Recompute the PollResult cache ──────────────────────────────────────
  const allVotes = await db.select().from(Vote).where(eq(Vote.poll_id, id)).all();
  const agg = aggregateVotes({
    template: poll.template,
    options: poll.options,
    votes: allVotes.map(v => ({ option_ids: v.option_ids, value: v.value })),
  });

  const existingResult = await db.select().from(PollResult)
    .where(eq(PollResult.poll_id, id)).get();

  if (existingResult) {
    await db.update(PollResult)
      .set({ tallies: agg.tallies, total_votes: agg.total_votes, last_aggregated_at: now })
      .where(eq(PollResult.poll_id, id));
  } else {
    await db.insert(PollResult).values({
      poll_id: id,
      tallies: agg.tallies,
      total_votes: agg.total_votes,
      last_aggregated_at: now,
    });
  }

  return json({ ok: true, total_votes: agg.total_votes });
};

// /api/polls/[id]/results.json — read endpoint
//
// Returns the cached PollResult for a poll. The Svelte island polls this
// endpoint every 3-5s while the poll is open (Tier 1 interval polling, see
// blueprint §10.1).
//
// Public read access — anyone who can see the page can see the results,
// gated by `Poll.results_visibility`. The vote-write endpoint is auth-gated.

import type { APIRoute } from 'astro';
import { db, Poll, PollResult, eq } from 'astro:db';

export const prerender = false;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: 'missing poll id' }, 400);

  const poll = await db.select().from(Poll).where(eq(Poll.id, id)).get();
  if (!poll) return json({ error: 'poll not found' }, 404);

  const result = await db.select().from(PollResult).where(eq(PollResult.poll_id, id)).get();

  // Build the response shape the Svelte island expects (the PollSnapshot type).
  const body: Record<string, unknown> = {
    poll_id: id,
    template: poll.template,
    status: poll.status,
    results_visibility: poll.results_visibility,
    total_votes: result?.total_votes ?? 0,
    last_aggregated_at: result?.last_aggregated_at ?? null,
    tallies: result?.tallies ?? null,
  };

  if (poll.template === 'multi-string-input') {
    // Special visibility model (blueprint v2 §16.2):
    //   - Counts (total_strings, total_contributors) are ALWAYS public.
    //   - Entry content is gated by results_visibility:
    //       'live'      → entries visible while open (high social-pressure surface)
    //       'on-close'  → entries hidden until status='closed' (recommended default)
    //       'host-only' → entries hidden from this public route entirely
    const t = (result?.tallies as {
      total_strings?: number;
      total_contributors?: number;
      entries?: unknown;
    } | null) ?? {};
    const contentVisible =
      poll.results_visibility === 'live' ||
      (poll.results_visibility === 'on-close' && poll.status === 'closed');
    body.tallies = {
      total_strings: t.total_strings ?? 0,
      total_contributors: t.total_contributors ?? 0,
      entries: contentVisible ? (t.entries ?? []) : null,
    };
    body.total_votes_visible = true;
  } else if (poll.results_visibility === 'on-close' && poll.status !== 'closed') {
    // Hide tallies if 'on-close' and not yet closed.
    body.tallies = null;
    body.total_votes_visible = false;
  } else if (poll.results_visibility === 'host-only') {
    // Host-only is enforced by a separate /api/host route, not here.
    body.tallies = null;
    body.total_votes_visible = false;
  } else {
    body.total_votes_visible = true;
  }

  return json(body, 200, {
    // Live-updating data — disable browser/CDN caching so the interval
    // polling actually re-fetches. ETag/Last-Modified handling is a v0.0.2+
    // optimization (blueprint §10.1).
    'cache-control': 'no-store',
  });
};

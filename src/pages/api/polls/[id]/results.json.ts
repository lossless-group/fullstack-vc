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

  // Honor results_visibility: hide tallies if 'on-close' and not yet closed,
  // or if 'host-only' (host-only is enforced by a separate /api/host route, not here).
  if (poll.results_visibility === 'on-close' && poll.status !== 'closed') {
    body.tallies = null;
    body.total_votes_visible = false;
  } else if (poll.results_visibility === 'host-only') {
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

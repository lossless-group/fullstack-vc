// /api/stack/[handle].json — read endpoint for a participant's stack from Turso.
//
// Public (no auth gate). Returns the same shape regardless of viewer — the
// markdown-side public profile is already public, so there's no point in
// gating the Turso read. (Editor-only fields like draft state never live in
// the DB anyway.)
//
// Returns: { handle, current[], aspirational[], abandoned[] }
//   - Each bucket is sorted by `position` ASC
//   - Bucket-specific fields are included only when non-null
//
// Used by:
//   - the StackBuilder editor as initial hydration source (SSR-safe — the
//     page can fetch this server-side, see /people/[handle]/stack/edit.astro)
//   - the public /people/[handle] page IF/WHEN we move that to SSR (out of
//     scope for v1 — public pages keep reading materialized markdown)
//   - /api/me indirectly: for the header tooltip stack counts

import type { APIRoute } from 'astro';
import { db, Stack, asc, eq } from 'astro:db';

export const prerender = false;

interface StackItemOut {
  tool: string;
  position: number;
  notes?: string;
  intent?: string;
  reason?: string;
  added?: string;     // ISO date
  abandoned?: string; // ISO date
}

export const GET: APIRoute = async ({ params }) => {
  const handle = params.handle;
  if (!handle) return json({ error: 'missing handle' }, 400);

  let rows;
  try {
    rows = await db.select().from(Stack)
      .where(eq(Stack.handle, handle))
      .orderBy(asc(Stack.bucket), asc(Stack.position))
      .all();
  } catch (err) {
    // Table not pushed yet, or DB unreachable — return empty buckets rather
    // than 500. Callers should fall back to markdown if they care.
    return json({ handle, current: [], aspirational: [], abandoned: [], error: 'db_unavailable' }, 200);
  }

  const current: StackItemOut[] = [];
  const aspirational: StackItemOut[] = [];
  const abandoned: StackItemOut[] = [];

  for (const r of rows) {
    const out: StackItemOut = { tool: r.tool, position: r.position };
    if (r.notes) out.notes = r.notes;
    if (r.intent) out.intent = r.intent;
    if (r.reason) out.reason = r.reason;
    if (r.added) out.added = new Date(r.added).toISOString().slice(0, 10);
    if (r.abandoned) out.abandoned = new Date(r.abandoned).toISOString().slice(0, 10);

    if (r.bucket === 'current') current.push(out);
    else if (r.bucket === 'aspirational') aspirational.push(out);
    else if (r.bucket === 'abandoned') abandoned.push(out);
  }

  return json({ handle, current, aspirational, abandoned });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, no-store',
    },
  });
}

// /api/proposals — read + write member-submitted proposals.
//
// POST: requires a verified session AND roster membership. Inserts a row in
//       Proposal with status='submitted'. Body: { kind, title, body }.
// GET:  public, returns a small list of recent proposals. Filterable by kind.
//
// Why session-gated: the form is the entry point for unsolicited drafts.
// Anonymous submissions would invite spam. Requiring at minimum one OAuth
// provider linked + roster match keeps the backlog small enough to triage
// by hand.

import type { APIRoute } from 'astro';
import { db, Proposal, desc, eq, and } from 'astro:db';
import { verifySession, SESSION_COOKIE_NAME } from '../../lib/session';
import { matchesRoster } from '../../lib/oauth-roster';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });
}

const TITLE_MIN = 3;
const TITLE_MAX = 140;
const BODY_MIN = 10;
const BODY_MAX = 4000;
const VALID_KINDS = new Set(['project', 'working-group']);

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return json({ error: 'not_authenticated' }, 401);
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) return json({ error: 'not_on_roster' }, 403);

  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const kind = String(raw?.kind ?? '').trim();
  const title = String(raw?.title ?? '').trim();
  const body = String(raw?.body ?? '').trim();

  if (!VALID_KINDS.has(kind)) return json({ error: 'invalid_kind' }, 400);
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return json({ error: `title must be ${TITLE_MIN}-${TITLE_MAX} characters` }, 400);
  }
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return json({ error: `body must be ${BODY_MIN}-${BODY_MAX} characters` }, 400);
  }

  const user_id = (rosterEntry.email ?? session.subject).toLowerCase();
  const user_name = rosterEntry.name ?? session.name ?? null;
  const user_handle = rosterEntry.github ?? (session.provider === 'github' ? session.subject : null);
  const now = new Date();

  await db.insert(Proposal).values({
    id: crypto.randomUUID(),
    kind,
    title,
    body,
    user_id,
    user_name,
    user_handle,
    user_provider: session.provider,
    status: 'submitted',
    created_at: now,
    updated_at: now,
  });

  return json({ ok: true });
};

export const GET: APIRoute = async ({ url }) => {
  const kind = url.searchParams.get('kind');
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));

  const where = kind && VALID_KINDS.has(kind)
    ? and(eq(Proposal.kind, kind), eq(Proposal.status, 'submitted'))
    : eq(Proposal.status, 'submitted');

  const rows = await db.select().from(Proposal)
    .where(where)
    .orderBy(desc(Proposal.created_at))
    .limit(limit)
    .all();

  // Strip user_id (canonical email) before returning — name + handle is enough
  // for display, the email is internal.
  const safe = rows.map(r => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    user_name: r.user_name,
    user_handle: r.user_handle,
    user_provider: r.user_provider,
    created_at: r.created_at,
  }));

  return json({ proposals: safe });
};

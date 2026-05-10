// /api/participation-interest — three-level "get involved" signal per user×entity.
//
// Backs the icon row that appears on every project / working-group / proposal
// card. The user taps a heart-weight icon to register one of three levels
// (lead-potential / active-participant / keep-informed). One row per
// (user, entity_kind, entity_slug); a re-tap on a different level updates
// the row, a re-tap on the same level deletes it.
//
// Session + roster gated, mirroring /api/proposals.ts. Returns 401 when
// unauthenticated so the client component can nudge to /login.
//
// GET (no params):              list ALL of the current user's interests
// GET ?kind=...&slug=...:       single row (or null) for one entity
// POST { entity_kind, entity_slug, level }:  upsert
// DELETE { entity_kind, entity_slug }:       clear

import type { APIRoute } from 'astro';
import { db, ParticipationInterest, and, eq } from 'astro:db';
import { verifySession, SESSION_COOKIE_NAME } from '../../lib/session';
import { matchesRoster } from '../../lib/oauth-roster';
import { resolveCanonicalUserId } from '../../lib/user-record';

export const prerender = false;

const VALID_KINDS = new Set(['project', 'working-group', 'project-proposal', 'working-group-proposal']);
const VALID_LEVELS = new Set(['lead-potential', 'active-participant', 'keep-informed']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });
}

async function resolveUserId(cookies: any): Promise<{ user_id: string } | null> {
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) return null;
  // Look up the User row by the active provider's identifier so users with
  // mismatched GitHub/LinkedIn emails (e.g. Ariel, Rodrigo) get a stable
  // user_id regardless of which provider they're logged in with right now.
  const user_id = await resolveCanonicalUserId(session, rosterEntry);
  return { user_id };
}

export const GET: APIRoute = async ({ cookies, url }) => {
  const auth = await resolveUserId(cookies);
  if (!auth) return json({ loggedIn: false, interests: [] }, 200);

  const kind = url.searchParams.get('kind');
  const slug = url.searchParams.get('slug');

  if (kind && slug) {
    if (!VALID_KINDS.has(kind)) return json({ error: 'invalid_kind' }, 400);
    const row = await db.select().from(ParticipationInterest)
      .where(and(
        eq(ParticipationInterest.user_id, auth.user_id),
        eq(ParticipationInterest.entity_kind, kind),
        eq(ParticipationInterest.entity_slug, slug),
      ))
      .get();
    return json({ loggedIn: true, interest: row ? { entity_kind: row.entity_kind, entity_slug: row.entity_slug, level: row.level } : null });
  }

  const rows = await db.select().from(ParticipationInterest)
    .where(eq(ParticipationInterest.user_id, auth.user_id))
    .all();
  const interests = rows.map(r => ({
    entity_kind: r.entity_kind,
    entity_slug: r.entity_slug,
    level: r.level,
  }));
  return json({ loggedIn: true, interests });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await resolveUserId(cookies);
  if (!auth) return json({ error: 'not_authenticated' }, 401);

  let raw: any;
  try { raw = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const entity_kind = String(raw?.entity_kind ?? '').trim();
  const entity_slug = String(raw?.entity_slug ?? '').trim();
  const level = String(raw?.level ?? '').trim();

  if (!VALID_KINDS.has(entity_kind)) return json({ error: 'invalid_entity_kind' }, 400);
  if (!entity_slug || entity_slug.length > 200) return json({ error: 'invalid_entity_slug' }, 400);
  if (!VALID_LEVELS.has(level)) return json({ error: 'invalid_level' }, 400);

  const now = new Date();
  const existing = await db.select().from(ParticipationInterest)
    .where(and(
      eq(ParticipationInterest.user_id, auth.user_id),
      eq(ParticipationInterest.entity_kind, entity_kind),
      eq(ParticipationInterest.entity_slug, entity_slug),
    ))
    .get();

  if (existing) {
    await db.update(ParticipationInterest)
      .set({ level, updated_at: now })
      .where(eq(ParticipationInterest.id, existing.id));
  } else {
    await db.insert(ParticipationInterest).values({
      id: crypto.randomUUID(),
      user_id: auth.user_id,
      entity_kind,
      entity_slug,
      level,
      created_at: now,
      updated_at: now,
    });
  }

  return json({ ok: true, level });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await resolveUserId(cookies);
  if (!auth) return json({ error: 'not_authenticated' }, 401);

  let raw: any;
  try { raw = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const entity_kind = String(raw?.entity_kind ?? '').trim();
  const entity_slug = String(raw?.entity_slug ?? '').trim();

  if (!VALID_KINDS.has(entity_kind)) return json({ error: 'invalid_entity_kind' }, 400);
  if (!entity_slug) return json({ error: 'invalid_entity_slug' }, 400);

  await db.delete(ParticipationInterest)
    .where(and(
      eq(ParticipationInterest.user_id, auth.user_id),
      eq(ParticipationInterest.entity_kind, entity_kind),
      eq(ParticipationInterest.entity_slug, entity_slug),
    ));

  return json({ ok: true });
};

// ============================================================================
// /api/stack/save — write endpoint for the stack builder.
//
// Authoritative store is Turso (the Stack table). Public /people/<handle>
// pages still render from materialized markdown; the operator runs
// scripts/sync-stacks.ts to refresh that snapshot on a cadence they control.
// See context-v/tasks/Migrate-Participant-Stacks-from-Markdown-to-Turso-with-Materialization.md
//
// Flow:
//   1. Verify session cookie (JWT).
//   2. Validate payload (Zod): handle === session.subject; tools exist in registry.
//   3. Atomic replace: DELETE existing Stack rows for this user, INSERT fresh.
//   4. Return { ok, profileUrl, total }.
//
// Idempotent. No commit. No deploy trigger. Sub-second response.
//
// On error, returns 4xx/5xx with a JSON body { error: string }.
// ============================================================================

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { getCollection } from 'astro:content';
import { db, Stack, User, eq, and } from 'astro:db';
import { verifySession, SESSION_COOKIE_NAME } from '../../../lib/session';
import { matchesRoster } from '../../../lib/oauth-roster';
import { resolveCanonicalUserId } from '../../../lib/user-record';

export const prerender = false;

// ---------- Validation ----------

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const CurrentItem = z.object({
  tool: z.string().regex(SLUG_RE, 'tool slug must be lowercase-dasherized'),
  added: z.string().optional(),  // ISO date string from the form
  notes: z.string().max(500).optional(),
});

const AspirationalItem = z.object({
  tool: z.string().regex(SLUG_RE),
  intent: z.string().max(500).optional(),
});

const AbandonedItem = z.object({
  tool: z.string().regex(SLUG_RE),
  abandoned: z.string().optional(),
  reason: z.string().max(500).optional(),
});

// All three bucket arrays are optional in the payload. Behavior:
//   - Field PRESENT (even as []) → that bucket is replaced with the payload.
//   - Field ABSENT (undefined)  → that bucket is preserved as-is in Turso.
// Lets the current single-bucket editor save without wiping
// aspirational/abandoned (which it doesn't yet manage). The redesigned
// multi-column editor (sibling task) will always send all three.
const SavePayload = z.object({
  handle: z.string().min(1).max(64),
  current_stack: z.array(CurrentItem).max(50).optional(),
  aspirational_stack: z.array(AspirationalItem).max(50).optional(),
  abandoned_stack: z.array(AbandonedItem).max(50).optional(),
  // Profile fields used to live here too; they're now edited via a separate
  // surface (participant profile in markdown stays the source of truth for
  // name/firm/role/avatar/etc — only the stack array data moves to Turso).
  // Accept-and-ignore for backward compat with the existing editor.
  name: z.string().optional(),
  firm: z.string().optional(),
  role: z.string().optional(),
  publish: z.boolean().optional(),
  body: z.string().optional(),
});

type Save = z.infer<typeof SavePayload>;

// ---------- Endpoint ----------

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return json({ error: 'not authenticated' }, 401);
  }
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) {
    return json({ error: 'not on roster' }, 403);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const parsed = SavePayload.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'validation failed', details: parsed.error.flatten() }, 400);
  }
  const save: Save = parsed.data;

  // Handle must match the session's identity for the github provider. The
  // edit page's auth gate already enforces this, but the API enforces it too
  // (defense in depth — no one should be able to POST stack edits for another
  // user's handle even if the page were ever misconfigured).
  if (session.provider !== 'github' || save.handle.toLowerCase() !== session.subject.toLowerCase()) {
    return json({ error: 'handle does not match session subject' }, 403);
  }

  // Validate every tool slug exists in the registry (warn-but-allow per the
  // no-hard-validation principle would also be fine; we currently reject
  // to keep the data clean. Revisit if it bites editorial flow).
  const tools = await getCollection('tools');
  const knownSlugs = new Set(tools.map(t => t.id));
  const allSlugs: string[] = [
    ...(save.current_stack ?? []).map(s => s.tool),
    ...(save.aspirational_stack ?? []).map(s => s.tool),
    ...(save.abandoned_stack ?? []).map(s => s.tool),
  ];
  const unknown = allSlugs.filter(s => !knownSlugs.has(s));
  if (unknown.length > 0) {
    return json({ error: 'unknown tool slug(s)', unknown }, 400);
  }

  // Resolve the canonical User row's id (same primitive vote attribution uses).
  // If no User row exists (DB hiccup, first login race), reject — we need a
  // foreign key target for Stack.user_id.
  const user_id = await resolveCanonicalUserId(session, rosterEntry);
  let userRow;
  try {
    userRow = await db.select().from(User).where(eq(User.id, user_id)).get();
  } catch (err) {
    return json({ error: 'user lookup failed', detail: String((err as Error).message ?? err) }, 502);
  }
  if (!userRow) {
    return json({ error: 'no User row for this session — log out and back in to bootstrap' }, 412);
  }

  const now = new Date();
  let totalWritten = 0;

  // Per-bucket replace: only touch buckets present in the payload. This is the
  // key invariant that lets the single-bucket editor save without wiping
  // aspirational/abandoned data that it never manages.
  try {
    if (save.current_stack !== undefined) {
      await db.delete(Stack).where(and(eq(Stack.user_id, user_id), eq(Stack.bucket, 'current')));
      if (save.current_stack.length > 0) {
        const rows = save.current_stack.map((s, i) => ({
          user_id,
          handle: save.handle,
          bucket: 'current',
          tool: s.tool,
          position: i,
          notes: s.notes ?? null,
          intent: null,
          reason: null,
          added: s.added ? new Date(s.added) : null,
          abandoned: null,
          created_at: now,
          updated_at: now,
        }));
        await db.insert(Stack).values(rows);
        totalWritten += rows.length;
      }
    }
    if (save.aspirational_stack !== undefined) {
      await db.delete(Stack).where(and(eq(Stack.user_id, user_id), eq(Stack.bucket, 'aspirational')));
      if (save.aspirational_stack.length > 0) {
        const rows = save.aspirational_stack.map((s, i) => ({
          user_id,
          handle: save.handle,
          bucket: 'aspirational',
          tool: s.tool,
          position: i,
          notes: null,
          intent: s.intent ?? null,
          reason: null,
          added: null,
          abandoned: null,
          created_at: now,
          updated_at: now,
        }));
        await db.insert(Stack).values(rows);
        totalWritten += rows.length;
      }
    }
    if (save.abandoned_stack !== undefined) {
      await db.delete(Stack).where(and(eq(Stack.user_id, user_id), eq(Stack.bucket, 'abandoned')));
      if (save.abandoned_stack.length > 0) {
        const rows = save.abandoned_stack.map((s, i) => ({
          user_id,
          handle: save.handle,
          bucket: 'abandoned',
          tool: s.tool,
          position: i,
          notes: null,
          intent: null,
          reason: s.reason ?? null,
          added: null,
          abandoned: s.abandoned ? new Date(s.abandoned) : null,
          created_at: now,
          updated_at: now,
        }));
        await db.insert(Stack).values(rows);
        totalWritten += rows.length;
      }
    }
  } catch (err) {
    return json({ error: 'stack write failed', detail: String((err as Error).message ?? err) }, 502);
  }

  return json({
    ok: true,
    profileUrl: `/people/${save.handle}`,
    total: totalWritten,
    // Surface the sync-deferred status so the editor can show
    // "saved — sync to publish" rather than "published immediately".
    materialized: false,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

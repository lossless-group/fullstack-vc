// ============================================================================
// user-record.ts — best-effort User table upsert on every successful OAuth
// login.
//
// Replaces the previous flow that wrote a markdown participant file +
// committed it via the GitHub App on each new account. That worked but
// produced commit-history pollution (one commit per signup), and the App
// PEM has been brittle on Vercel. Now we just stamp a row in Astro DB.
//
// Identity model:
//   - One row per *person* (not per provider login). The row's id is the
//     lowercased roster email (matches Vote.user_id, so attribution
//     joins cleanly).
//   - Each provider is a nullable column on the row (`github_handle`,
//     `linkedin_sub`). Signing in with the second provider FILLS IN the
//     other column rather than creating a new row.
//   - Fallback id = "<provider>:<provider_subject>" when the roster entry
//     has no email (rare; those users can't dual-provider anyway).
//
// Best-effort: errors are caught and logged. OAuth never fails because of a
// DB hiccup. Login still works even if Turso is unreachable or the schema
// hasn't been pushed yet (User table missing).
//
// Roster gating is unchanged: matchesRoster() against kauffman_roster.json
// is what authorizes access. Writing here records the login.
// ============================================================================

import { db, User, eq } from 'astro:db';
import type { SessionPayload } from './session';
import type { RosterEntry } from './oauth-roster';

/**
 * Compute the canonical user id for a session: the lowercased roster email,
 * with a `<provider>:<subject>` fallback when the roster entry has no email.
 */
export function canonicalUserId(
  session: SessionPayload,
  rosterEntry: RosterEntry | null,
): string {
  const email = rosterEntry?.email?.toLowerCase();
  if (email) return email;
  return `${session.provider}:${session.subject}`;
}

/**
 * Upsert the User row for a freshly-authenticated session.
 *
 * On insert: a new row with the active provider's column populated.
 * On update: refreshes the active provider's column (so a GitHub login
 * after a previous LinkedIn login fills in `github_handle` on the same
 * row), bumps `last_login_at`, and refreshes profile / roster fields.
 *
 * Returns silently on success or failure — callers do not need to await
 * the outcome to make a security decision. The session JWT is the auth
 * artifact; this row is an audit + profile cache.
 */
export async function recordUserLogin(
  session: SessionPayload,
  rosterEntry: RosterEntry | null,
): Promise<void> {
  try {
    const id = canonicalUserId(session, rosterEntry);
    const now = new Date();

    // Provider-specific fields. Set the column for whichever provider the
    // user logged in with this time; leave the other column alone (so we
    // preserve a previously-linked identifier from an earlier login).
    const githubHandle = session.provider === 'github' ? session.subject : undefined;
    const linkedinSub  = session.provider === 'linkedin' ? session.subject : undefined;

    const existing = await db.select().from(User).where(eq(User.id, id)).get();

    if (existing) {
      await db.update(User)
        .set({
          // Refresh provider-sourced fields in case they changed upstream
          // (avatar URL rotates, name edits, etc).
          email: session.email ?? existing.email,
          name: session.name ?? existing.name,
          avatar: session.avatar ?? existing.avatar,
          // Only overwrite the provider column for the provider the user
          // is currently signing in with. The other column stays as-is.
          github_handle: githubHandle ?? existing.github_handle,
          linkedin_sub: linkedinSub ?? existing.linkedin_sub,
          // Roster fields: prefer fresh roster data; fall back to existing
          // (a temporary roster lookup miss shouldn't blank a real value).
          kauffman_class: rosterEntry?.kauffman_class ?? existing.kauffman_class,
          firm: rosterEntry?.firm ?? existing.firm,
          last_provider: session.provider,
          last_login_at: now,
          updated_at: now,
        })
        .where(eq(User.id, id));
    } else {
      await db.insert(User).values({
        id,
        email: session.email ?? rosterEntry?.email ?? null,
        name: session.name ?? rosterEntry?.name ?? null,
        avatar: session.avatar ?? null,
        github_handle: githubHandle ?? null,
        linkedin_sub: linkedinSub ?? null,
        kauffman_class: rosterEntry?.kauffman_class ?? null,
        firm: rosterEntry?.firm ?? null,
        last_provider: session.provider,
        first_login_at: now,
        last_login_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  } catch (err) {
    // Non-fatal: a DB write failure should never break login. Most likely
    // cause if you see this in logs: the User table hasn't been pushed to
    // Turso yet (`pnpm astro db push --remote`).
    console.error('[recordUserLogin] non-fatal DB error:', err);
  }
}

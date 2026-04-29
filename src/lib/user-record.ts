// ============================================================================
// user-record.ts — best-effort User table upsert on every successful OAuth
// login.
//
// Replaces the previous flow that wrote a markdown participant file +
// committed it via the GitHub App on each new account. That worked but
// produced commit-history pollution (one commit per signup), and the App PEM
// has been brittle on Vercel. Now we just stamp a row in Astro DB.
//
// Important properties:
//   - Best effort: errors are caught and logged. OAuth never fails because of
//     a DB hiccup. Login still works even if Turso is unreachable or the
//     schema hasn't been pushed yet (User table missing).
//   - Roster gate is unchanged: matchesRoster() against
//     src/content/kauffman_roster.json is still what grants access. Writing
//     a User row records the login; it doesn't authorize it.
//   - Vote.user_id stays as the raw session.subject. We do NOT remap vote
//     attribution to User.id today. The User table is informational.
// ============================================================================

import { db, User, eq } from 'astro:db';
import type { SessionPayload } from './session';
import type { RosterEntry } from './oauth-roster';

/**
 * Upsert the User row for a freshly-authenticated session. Roster fields
 * (kauffman_class, firm) are snapshotted from the roster entry on first
 * login and kept in sync on subsequent logins.
 *
 * Returns silently on success or failure — callers do not need to await
 * the outcome to make a security decision. (The session JWT is the auth
 * artifact; this row is just an audit + profile cache.)
 */
export async function recordUserLogin(
  session: SessionPayload,
  rosterEntry: RosterEntry | null,
): Promise<void> {
  try {
    const id = `${session.provider}:${session.subject}`;
    const now = new Date();

    const existing = await db.select().from(User).where(eq(User.id, id)).get();

    if (existing) {
      await db.update(User)
        .set({
          // Refresh provider-sourced fields in case they changed upstream
          // (avatar URL rotates, name edits, etc).
          email: session.email ?? existing.email,
          name: session.name ?? existing.name,
          avatar: session.avatar ?? existing.avatar,
          // Roster fields: prefer fresh roster data; fall back to existing
          // (so a temporary roster lookup miss doesn't blank out a real value).
          kauffman_class: rosterEntry?.kauffman_class ?? existing.kauffman_class,
          firm: rosterEntry?.firm ?? existing.firm,
          last_login_at: now,
          updated_at: now,
        })
        .where(eq(User.id, id));
    } else {
      await db.insert(User).values({
        id,
        provider: session.provider,
        provider_subject: session.subject,
        email: session.email ?? null,
        name: session.name ?? null,
        avatar: session.avatar ?? null,
        kauffman_class: rosterEntry?.kauffman_class ?? null,
        firm: rosterEntry?.firm ?? null,
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

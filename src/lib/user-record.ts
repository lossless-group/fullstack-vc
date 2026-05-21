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
 * Union of the existing email-array on a User row with any newly-observed
 * emails from the active session, deduped + lowercased. Filters falsy.
 */
function unionEmails(
  existing: unknown,
  ...incoming: (string | null | undefined)[]
): string[] {
  const set = new Set<string>();
  if (Array.isArray(existing)) {
    for (const e of existing) {
      if (typeof e === 'string' && e) set.add(e.toLowerCase());
    }
  }
  for (const e of incoming) {
    if (typeof e === 'string' && e) set.add(e.toLowerCase());
  }
  return Array.from(set);
}

/**
 * Find any User row whose `email` column or `emails` JSON array contains
 * the given email (case-insensitive). Used as a fallback in the lookup
 * chain so a returning user whose `id` was minted from a different email
 * can be re-merged instead of producing yet another duplicate row.
 *
 * Implementation: pulls all rows and scans in JS. The User table is small
 * (under 1k rows for the foreseeable future) and Drizzle/AstroDB doesn't
 * expose `json_each` ergonomically. Revisit if the table grows past ~10k.
 */
async function findUserByAnyEmail(email: string): Promise<typeof User.$inferSelect | null> {
  const lower = email.toLowerCase();
  try {
    const rows = await db.select().from(User).all();
    for (const row of rows) {
      if (row.email?.toLowerCase() === lower) return row;
      const arr = row.emails as unknown;
      if (Array.isArray(arr)) {
        for (const e of arr) {
          if (typeof e === 'string' && e.toLowerCase() === lower) return row;
        }
      }
    }
  } catch {
    // Fall through — caller treats null as "not found".
  }
  return null;
}

/**
 * Resolve the canonical user_id for a session by consulting the User row
 * keyed off the active provider's identifier (github_handle or linkedin_sub).
 *
 * Use this in any API endpoint that writes to a user-scoped table
 * (ParticipationInterest, Proposal, Vote): if a user with mismatched
 * GitHub vs LinkedIn emails alternates providers, the same User row's
 * `id` is returned for both sessions, keeping their data unified.
 *
 * Falls back to `canonicalUserId(session, rosterEntry)` only when no row
 * exists yet (recordUserLogin hasn't run, or the DB is unavailable).
 */
export async function resolveCanonicalUserId(
  session: SessionPayload,
  rosterEntry: RosterEntry | null,
): Promise<string> {
  try {
    let row;
    if (session.provider === 'github') {
      row = await db.select().from(User).where(eq(User.github_handle, session.subject)).get();
    } else if (session.provider === 'linkedin') {
      row = await db.select().from(User).where(eq(User.linkedin_sub, session.subject)).get();
    } else if (session.provider === 'google') {
      row = await db.select().from(User).where(eq(User.google_sub, session.subject)).get();
    }
    if (row) return row.id;
  } catch {
    // DB unavailable — fall through to synthetic derivation.
  }
  return canonicalUserId(session, rosterEntry);
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
export interface RecordUserLoginResult {
  /** The canonical id used for primary lookup (always present). */
  canonicalId: string;
  /** The id of the row actually written, which can differ from canonicalId
   *  when we merged into a pre-existing row found via the handle/sub fallback.
   *  Null when the DB write failed. */
  writtenId: string | null;
  ok: boolean;
  error?: string;
}

export async function recordUserLogin(
  session: SessionPayload,
  rosterEntry: RosterEntry | null,
): Promise<RecordUserLoginResult> {
  const id = canonicalUserId(session, rosterEntry);
  try {
    const now = new Date();

    // Provider-specific fields. Set the column for whichever provider the
    // user logged in with this time; leave the other columns alone (so we
    // preserve previously-linked identifiers from earlier logins).
    const githubHandle = session.provider === 'github' ? session.subject : undefined;
    const linkedinSub  = session.provider === 'linkedin' ? session.subject : undefined;
    const googleSub    = session.provider === 'google' ? session.subject : undefined;

    // Primary lookup: by canonical id (lowercased roster email).
    let existing = await db.select().from(User).where(eq(User.id, id)).get();

    // Fallback: a row may exist under a *different* canonical id if the user
    // logged in earlier and we minted the id from a different email (e.g. the
    // user's GitHub email and LinkedIn email differ — see Ariel and Rodrigo
    // in the audit). On a repeat login we can still find the row by the
    // active provider's stable identifier and merge into it instead of
    // creating yet another duplicate row.
    if (!existing) {
      if (githubHandle) {
        existing = await db.select().from(User).where(eq(User.github_handle, githubHandle)).get();
      } else if (linkedinSub) {
        existing = await db.select().from(User).where(eq(User.linkedin_sub, linkedinSub)).get();
      } else if (googleSub) {
        existing = await db.select().from(User).where(eq(User.google_sub, googleSub)).get();
      }
    }

    // Final fallback: scan emails array. Helps once a user has been linked
    // (via roster sync, manual claim, or a previous matching-email login)
    // even if neither the canonical id nor the provider identifier lines up.
    if (!existing && session.email) {
      existing = (await findUserByAnyEmail(session.email)) ?? undefined;
    }

    if (existing) {
      // Union the array with anything we've now observed. session.email is
      // the primary signal; rosterEntry.email + email_aliases sync any
      // declared aliases too so the array becomes the runtime mirror of the
      // roster's known-emails set.
      const mergedEmails = unionEmails(
        existing.emails,
        existing.email,
        session.email,
        rosterEntry?.email,
        ...(rosterEntry?.email_aliases ?? []),
      );
      await db.update(User)
        .set({
          // Refresh provider-sourced fields in case they changed upstream
          // (avatar URL rotates, name edits, etc).
          email: session.email ?? existing.email,
          emails: mergedEmails,
          name: session.name ?? existing.name,
          avatar: session.avatar ?? existing.avatar,
          // Only overwrite the provider column for the provider the user
          // is currently signing in with. The other columns stay as-is.
          github_handle: githubHandle ?? existing.github_handle,
          linkedin_sub: linkedinSub ?? existing.linkedin_sub,
          google_sub: googleSub ?? existing.google_sub,
          // Roster fields: prefer fresh roster data; fall back to existing
          // (a temporary roster lookup miss shouldn't blank a real value).
          kauffman_class: rosterEntry?.kauffman_class ?? existing.kauffman_class,
          firm: rosterEntry?.firm ?? existing.firm,
          last_provider: session.provider,
          last_login_at: now,
          updated_at: now,
        })
        .where(eq(User.id, existing.id));
      return { canonicalId: id, writtenId: existing.id, ok: true };
    } else {
      const initialEmails = unionEmails(
        null,
        session.email,
        rosterEntry?.email,
        ...(rosterEntry?.email_aliases ?? []),
      );
      await db.insert(User).values({
        id,
        email: session.email ?? rosterEntry?.email ?? null,
        emails: initialEmails.length > 0 ? initialEmails : null,
        name: session.name ?? rosterEntry?.name ?? null,
        avatar: session.avatar ?? null,
        github_handle: githubHandle ?? null,
        linkedin_sub: linkedinSub ?? null,
        google_sub: googleSub ?? null,
        kauffman_class: rosterEntry?.kauffman_class ?? null,
        firm: rosterEntry?.firm ?? null,
        last_provider: session.provider,
        first_login_at: now,
        last_login_at: now,
        created_at: now,
        updated_at: now,
      });
      return { canonicalId: id, writtenId: id, ok: true };
    }
  } catch (err) {
    // Non-fatal: a DB write failure should never break login. Most likely
    // cause if you see this in logs: the User table hasn't been pushed to
    // Turso yet (`pnpm astro db push --remote`).
    console.error('[recordUserLogin] non-fatal DB error:', err);
    return {
      canonicalId: id,
      writtenId: null,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

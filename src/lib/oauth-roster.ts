// ============================================================================
// oauth-roster.ts — provider-aware allowlist matching against the Kauffman
// Fellows roster.
//
// The roster is a flat JSON file at src/content/kauffman_roster.json. We load
// it once per request (small file; no caching complexity needed at our scale).
// ============================================================================

import roster from '../content/kauffman_roster.json';
import type { SessionPayload } from './session';

export interface RosterEntry {
  /** GitHub username — primary key for GitHub provider matches. */
  github?: string;
  /** Primary email — primary key for LinkedIn provider matches. */
  email?: string;
  /** Other emails this Fellow uses; supports common email-mismatch cases. */
  email_aliases?: string[];
  kauffman_class?: number;
  name?: string;
  /** Optional firm affiliation, useful for display once auth resolves. */
  firm?: string;
}

const ROSTER: RosterEntry[] = roster as RosterEntry[];

function emailsForEntry(entry: RosterEntry): string[] {
  const out: string[] = [];
  if (entry.email) out.push(entry.email.toLowerCase());
  for (const alias of entry.email_aliases ?? []) out.push(alias.toLowerCase());
  return out;
}

/**
 * Resolve a session to its roster entry, or null if the user is not on the
 * allowlist. Use the returned entry to backfill participant profile fields
 * (kauffman_class, name, firm) on first login.
 */
export function matchesRoster(session: SessionPayload): RosterEntry | null {
  if (session.provider === 'github') {
    const handle = session.subject.toLowerCase();
    return ROSTER.find(r => r.github?.toLowerCase() === handle) ?? null;
  }
  if (session.provider === 'linkedin' && session.email) {
    const email = session.email.toLowerCase();
    return ROSTER.find(r => emailsForEntry(r).includes(email)) ?? null;
  }
  return null;
}

/** Total roster size — useful for diagnostic logging. */
export function rosterSize(): number {
  return ROSTER.length;
}

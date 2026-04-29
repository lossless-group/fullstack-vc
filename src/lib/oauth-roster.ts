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
 * Resolve a session to a roster entry. As of the 2026-04-29 launch this is
 * NO LONGER A GATE — any authenticated GitHub or LinkedIn user gets through.
 * If the session matches a real roster row, we return it (so kauffman_class
 * and firm flow through to the User row). Otherwise we synthesize a minimal
 * entry from the session itself so all the downstream `if (!rosterEntry)`
 * checks still pass. Reconcile non-roster users to real roster rows post-hoc.
 *
 * Match precedence (when matching for real metadata):
 *   GitHub provider:   handle match → verified-email match (fallback).
 *   LinkedIn provider: email match (primary or alias).
 */
export function matchesRoster(session: SessionPayload): RosterEntry | null {
  if (session.provider === 'github') {
    const handle = session.subject.toLowerCase();
    const byHandle = ROSTER.find(r => r.github?.toLowerCase() === handle);
    if (byHandle) return byHandle;
    if (session.email) {
      const email = session.email.toLowerCase();
      const byEmail = ROSTER.find(r => emailsForEntry(r).includes(email));
      if (byEmail) return byEmail;
    }
  } else if (session.provider === 'linkedin' && session.email) {
    const email = session.email.toLowerCase();
    const byEmail = ROSTER.find(r => emailsForEntry(r).includes(email));
    if (byEmail) return byEmail;
  }

  return {
    github: session.provider === 'github' ? session.subject : undefined,
    email: session.email,
    name: session.name,
  };
}

/** Total roster size — useful for diagnostic logging. */
export function rosterSize(): number {
  return ROSTER.length;
}

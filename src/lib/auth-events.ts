// Best-effort writer for the AuthEvent table — the audit trail the
// Auth-Identity-System-Worked-but-UX-Failed-Silent-Bounces issue resolution
// flagged as "the reason we couldn't tell whether anyone's login worked."
//
// Errors are swallowed. The login flow must never fail because logging failed.

import { db, AuthEvent } from 'astro:db';

export type AuthOutcome =
  | 'success'
  | 'state_mismatch'
  | 'token_exchange_fail'
  | 'no_access_token'
  | 'user_fetch_fail'
  | 'record_user_error'
  | 'missing_credentials'
  | 'email_unverified'
  | 'provider_linked';

export interface AuthEventInput {
  provider: 'github' | 'linkedin' | 'google';
  outcome: AuthOutcome;
  subject?: string;
  email?: string;
  user_id?: string;
  note?: string;
}

export async function logAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await db.insert(AuthEvent).values({
      at: new Date(),
      provider: input.provider,
      outcome: input.outcome,
      subject: input.subject ?? null,
      email: input.email ?? null,
      user_id: input.user_id ?? null,
      // Truncate noisy notes to keep rows small. 500 chars is plenty for a
      // status code + a short response excerpt.
      note: input.note ? input.note.slice(0, 500) : null,
    });
  } catch (err) {
    console.error('[logAuthEvent] non-fatal:', err);
  }
}

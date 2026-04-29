// scripts/set-poll-status.ts — flip a single Poll's status during the meeting.
//
// v0.0.1 host-action CLI (no admin panel yet, per blueprint §11.1).
//
// Usage:
//
//   POLL_ID=<id> STATUS=open  pnpm set-poll-status   # open the poll
//   POLL_ID=<id> STATUS=closed pnpm set-poll-status   # close it
//   POLL_ID=<id> STATUS=scheduled pnpm set-poll-status
//
// Also:
//   - Auto-promotes the parent Session from 'draft' → 'active' if the new
//     poll status is 'open' or 'scheduled' and the session was still 'draft'.
//   - Logs a PollEvent row for the audit trail (§5.5, §13.3).
//
// Defaults to local DB. Add `--remote` after `pnpm set-poll-status` arguments
// to target Turso, e.g.:
//
//   POLL_ID=<id> STATUS=open pnpm set-poll-status --remote

import { db, Poll, Session, PollEvent, eq } from 'astro:db';

const VALID_STATUSES = ['draft', 'scheduled', 'open', 'closed'] as const;
type PollStatus = typeof VALID_STATUSES[number];

const pollId = process.env.POLL_ID;
const status = process.env.STATUS as PollStatus | undefined;
const note = process.env.NOTE ?? null;
const actor = process.env.ACTOR ?? 'mpstaton';

if (!pollId || !status) {
  console.error('Usage: POLL_ID=<id> STATUS=<draft|scheduled|open|closed> pnpm set-poll-status');
  console.error('       (add --remote after the command to target Turso)');
  process.exit(1);
}
if (!VALID_STATUSES.includes(status)) {
  console.error(`Invalid STATUS: ${status}`);
  console.error(`Must be one of: ${VALID_STATUSES.join(', ')}`);
  process.exit(1);
}

const poll = await db.select().from(Poll).where(eq(Poll.id, pollId)).get();
if (!poll) {
  console.error(`✗ Poll not found: ${pollId}`);
  process.exit(1);
}

const priorStatus = poll.status;
if (priorStatus === status) {
  console.log(`Poll ${pollId} already ${status}; no-op.`);
  process.exit(0);
}

const now = new Date();

// ── Update the Poll status ───────────────────────────────────────────────────
await db.update(Poll)
  .set({ status, updated_at: now })
  .where(eq(Poll.id, pollId));

// ── Log the audit event ──────────────────────────────────────────────────────
// Map the new status to a PollEvent.kind. 'open'/'close' are explicit kinds;
// other transitions get logged as a generic note.
const eventKind: 'open' | 'close' | 'extend' | 'reset' | 'delete' =
  status === 'open' ? 'open' :
  status === 'closed' ? 'close' :
  'extend'; // catch-all for draft/scheduled transitions

await db.insert(PollEvent).values({
  poll_id: pollId,
  actor_user_id: actor,
  kind: eventKind,
  at: now,
  note: note ?? `${priorStatus} → ${status}`,
});

// ── Auto-promote the parent Session to 'active' if needed ────────────────────
const session = await db.select().from(Session)
  .where(eq(Session.id, poll.session_id)).get();

if (session && session.status === 'draft' && (status === 'open' || status === 'scheduled')) {
  await db.update(Session)
    .set({
      status: 'active',
      starts_at: session.starts_at ?? now,
      last_activity_at: now,
      updated_at: now,
    })
    .where(eq(Session.id, session.id));
  console.log(`✓ Session auto-promoted to 'active': ${session.slug}`);
}

console.log(`✓ Poll ${pollId}: ${priorStatus} → ${status}`);
if (status === 'open') {
  console.log(`  Voting endpoint: POST /api/polls/${pollId}/votes`);
  console.log(`  Results endpoint: GET /api/polls/${pollId}/results.json`);
}

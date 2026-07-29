// scripts/add-breakout-echoes-poll.ts — mid-session addition (2026-07-29).
//
// Adds a sixth live poll to the July 29 Checkup session: the post-breakout
// report-back question. Seeded OPEN (the session is running right now),
// uncapped free text per the mid-session uncap hotfix.
//
// Idempotent: deletes any prior row for this poll id, then inserts fresh.
//
// Run: node --env-file=.env scripts/db-execute.mjs scripts/add-breakout-echoes-poll.ts --remote

import { db, Poll, Vote, PollResult, PollEvent, eq } from 'astro:db';

const SESSION_ID = 'sess_2026-07-29_monthly-all-hands';
const POLL_ID = 'poll_2026-07-29_breakout-echoes';
const HOST_USER_ID = 'mpstaton';

export default async function () {
  const now = new Date();

  const existing = await db.select().from(Poll).where(eq(Poll.id, POLL_ID)).get();
  if (existing) {
    console.log(`Poll ${POLL_ID} exists — replacing (votes preserved: NO, wiping).`);
    await db.delete(Vote).where(eq(Vote.poll_id, POLL_ID));
    await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_ID));
    await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_ID));
    await db.delete(Poll).where(eq(Poll.id, POLL_ID));
  }

  await db.insert(Poll).values([
    {
      id: POLL_ID,
      session_id: SESSION_ID,
      title: 'Breakout echoes · The mindblower',
      prompt:
        "What's the most mindblowing thing you heard in your breakout? Who did you hear it from?",
      template: 'multi-string-input',
      options: {
        placeholder: 'The idea — and who said it',
        max_string_length: 2000,
      },
      status: 'open', // session is live; open on arrival
      visibility: 'session-attendees',
      results_visibility: 'live',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      display_group: null,
      created_by: HOST_USER_ID,
      created_at: now,
      updated_at: now,
    },
  ]);

  await db.insert(PollEvent).values({
    poll_id: POLL_ID,
    actor_user_id: HOST_USER_ID,
    kind: 'open',
    at: now,
    note: 'created mid-session, opened immediately',
  });

  console.log(`✓ ${POLL_ID} created and OPEN`);
  console.log(`  Prompt: What's the most mindblowing thing you heard in your breakout? Who did you hear it from?`);
}

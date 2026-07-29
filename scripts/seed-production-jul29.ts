// scripts/seed-production-jul29.ts — populate Turso with the July 29 Monthly
// All-Hands "Checkup" session and its five multi-string-input polls.
//
// Run via:
//
//   pnpm seed:production:jul29
//
// (which is `astro db execute scripts/seed-production-jul29.ts --remote`)
//
// Idempotent: deletes existing rows for this session_id and re-inserts.
// Safe to re-run if you tweak prompts before the meeting.
//
// All five polls are `multi-string-input` — the checkup is a describe-in-your-
// own-words arc, not a choice arc. Q1–Q3 accept multiple entries; Q4–Q5 cap
// at one entry per voter (the "what's THE thing" forcing function).
//
// Polls start as `status: 'draft'`. To open one during the meeting:
//
//   POLL_ID=poll_2026-07-29_recent-wins STATUS=open pnpm set-poll-status --remote

import { db, Session, Poll, Vote, PollResult, PollEvent, eq } from 'astro:db';

const SESSION_ID = 'sess_2026-07-29_monthly-all-hands';
const SESSION_SLUG = '2026-07-29_monthly-all-hands';
const HOST_USER_ID = 'mpstaton';

const POLL_WINS_ID         = 'poll_2026-07-29_recent-wins';
const POLL_INTRIGUE_ID     = 'poll_2026-07-29_recent-intrigue';
const POLL_RABBITHOLES_ID  = 'poll_2026-07-29_rabbit-holes';
const POLL_TIME_EATER_ID   = 'poll_2026-07-29_time-eater';
const POLL_BREAKTHROUGH_ID = 'poll_2026-07-29_breakthrough';

const ALL_POLL_IDS = [
  POLL_WINS_ID,
  POLL_INTRIGUE_ID,
  POLL_RABBITHOLES_ID,
  POLL_TIME_EATER_ID,
  POLL_BREAKTHROUGH_ID,
];

export default async function () {
  const now = new Date();

  // ─── Idempotency: wipe any prior rows for this session ──────────────────────
  console.log(`Wiping existing rows for session: ${SESSION_ID}`);
  for (const pid of ALL_POLL_IDS) {
    await db.delete(Vote).where(eq(Vote.poll_id, pid));
    await db.delete(PollResult).where(eq(PollResult.poll_id, pid));
    await db.delete(PollEvent).where(eq(PollEvent.poll_id, pid));
  }
  await db.delete(Poll).where(eq(Poll.session_id, SESSION_ID));
  await db.delete(Session).where(eq(Session.id, SESSION_ID));

  // ─── Session ────────────────────────────────────────────────────────────────
  console.log(`Inserting Session: ${SESSION_SLUG}`);
  await db.insert(Session).values([
    {
      id: SESSION_ID,
      slug: SESSION_SLUG,
      title: 'Monthly All-Hands — July 29 · The Checkup',
      description:
        'Checkup session for the Agentic VC Dojo. Five describe-it-yourself polls take the room’s pulse — wins, intrigue, rabbit holes, time eaters, and the breakthrough that never happens — then random breakout groups turn the readout into the dojo’s next agenda.',
      kind: 'live',
      status: 'draft',
      starts_at: new Date('2026-07-29T16:00:00Z'), // 9am Pacific
      ends_at: null,
      last_activity_at: null,
      host_user_id: HOST_USER_ID,
      created_at: now,
      updated_at: now,
    },
  ]);

  // Shared poll settings for the checkup arc. results_visibility 'live' so the
  // host can narrate entries as they land on the projected slide. Counts are
  // always public for multi-string-input; 'live' also reveals entry content.
  const shared = {
    session_id: SESSION_ID,
    template: 'multi-string-input',
    status: 'draft',
    visibility: 'session-attendees',
    results_visibility: 'live',
    anonymous_display: true,
    allow_revote: true,
    last_vote_at: null,
    display_group: null,
    created_by: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  } as const;

  // ─── Q1: Recent wins (multi-entry) ──────────────────────────────────────────
  console.log(`Inserting Poll: ${POLL_WINS_ID}`);
  await db.insert(Poll).values([
    {
      ...shared,
      id: POLL_WINS_ID,
      title: 'Checkup Q1 · Recent wins',
      prompt:
        'Describe any recent wins — an improved workflow, adoption traction with your team, something that finally clicked.',
      options: {
        placeholder: 'One win per entry — press Enter to add another',
        max_string_length: 200,
      },
    },
  ]);

  // ─── Q2: Recent intrigue (multi-entry) ──────────────────────────────────────
  console.log(`Inserting Poll: ${POLL_INTRIGUE_ID}`);
  await db.insert(Poll).values([
    {
      ...shared,
      id: POLL_INTRIGUE_ID,
      title: 'Checkup Q2 · Recent intrigue',
      prompt:
        'What have you recently imagined improving? What cool tools or apps are on your "check out soon" list?',
      options: {
        placeholder: 'One tool or idea per entry — press Enter to add another',
        max_string_length: 200,
      },
    },
  ]);

  // ─── Q3: Rabbit holes, yak shaving, dead-ends (multi-entry) ─────────────────
  console.log(`Inserting Poll: ${POLL_RABBITHOLES_ID}`);
  await db.insert(Poll).values([
    {
      ...shared,
      id: POLL_RABBITHOLES_ID,
      title: 'Checkup Q3 · Rabbit holes & dead-ends',
      prompt:
        'Describe any rabbit holes, yak shaving, or dead-ends. Where did the time go? No shame — these are the dojo’s best teaching material.',
      options: {
        placeholder: 'One rabbit hole per entry — press Enter to add another',
        max_string_length: 200,
      },
    },
  ]);

  // ─── Q4: The time eater (one entry — forcing function) ─────────────────────
  console.log(`Inserting Poll: ${POLL_TIME_EATER_ID}`);
  await db.insert(Poll).values([
    {
      ...shared,
      id: POLL_TIME_EATER_ID,
      title: 'Checkup Q4 · The time eater',
      prompt:
        'What’s the thing that eats a ton of your time that you’re hoping AI / agents can assist with? One answer — pick the biggest.',
      options: {
        placeholder: 'The single biggest time eater',
        max_string_length: 200,
        max_strings_per_voter: 1,
      },
    },
  ]);

  // ─── Q5: The breakthrough that never happens (one entry) ───────────────────
  console.log(`Inserting Poll: ${POLL_BREAKTHROUGH_ID}`);
  await db.insert(Poll).values([
    {
      ...shared,
      id: POLL_BREAKTHROUGH_ID,
      title: 'Checkup Q5 · The breakthrough',
      prompt:
        'What’s the thing you never get around to — but would be a breakthrough if Agentic Associates could do it? One answer.',
      options: {
        placeholder: 'The breakthrough you never get to',
        max_string_length: 200,
        max_strings_per_voter: 1,
      },
    },
  ]);

  console.log('');
  console.log(`✓ Seeded production session: ${SESSION_SLUG}`);
  console.log(`  /sessions/${SESSION_SLUG}`);
  console.log(`  /slides/2026-07-29_monthly-all-hands  (polls embedded in deck)`);
  console.log('');
  console.log('Polls (all currently draft, all multi-string-input):');
  console.log(`  - ${POLL_WINS_ID}          (multi-entry)`);
  console.log(`  - ${POLL_INTRIGUE_ID}      (multi-entry)`);
  console.log(`  - ${POLL_RABBITHOLES_ID}   (multi-entry)`);
  console.log(`  - ${POLL_TIME_EATER_ID}    (single-entry)`);
  console.log(`  - ${POLL_BREAKTHROUGH_ID}  (single-entry)`);
  console.log('');
  console.log('To open a poll during the meeting:');
  console.log(`  POLL_ID=${POLL_WINS_ID} STATUS=open pnpm set-poll-status --remote`);
}

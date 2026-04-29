// scripts/seed-test-session.ts — populate Turso with a hidden QA session
// that mirrors the three real launch-session polls.
//
// Run via:
//
//   pnpm seed:test
//
// (which is `astro db execute scripts/seed-test-session.ts --remote`)
//
// Idempotent: deletes any prior QA rows and re-inserts.
//
// The session URL is /sessions/2026-04-29_polls-qa — paired with the
// markdown stub at src/content/sessions/2026-04-29_polls-qa.md which has
// `unlisted: true`, so the page is reachable only via direct URL and never
// appears on the public /sessions/ listing.
//
// Test votes here use poll IDs prefixed `poll_qa_*` and DO NOT touch the
// real launch-session tallies (poll_dojo-launch-2026-04-29_*).
//
// To wipe later, re-run this script with all polls already deleted (no-op),
// or run a one-line SQL DELETE in `turso db shell fullstack-vc-db-mpstaton`.

import { db, Session, Poll, Vote, PollResult, PollEvent, eq } from 'astro:db';

const SESSION_ID = 'sess_2026-04-29-polls-qa';
const SESSION_SLUG = '2026-04-29_polls-qa';
const HOST_USER_ID = 'mpstaton';

const POLL_QA_PARTICIPATION_ID = 'poll_qa_participation-mode';
const POLL_QA_AI_USE_CASES_ID  = 'poll_qa_ai-use-cases';
const POLL_QA_NERDY_SCALE_ID   = 'poll_qa_nerdy-scale';
const POLL_QA_KEEPS_YOU_UP_ID  = 'poll_qa_keeps-you-up';
const POLL_QA_INTEREST_AVAIL_ID = 'poll_qa_interest-availability';

const now = new Date();

// ─── Idempotency: wipe prior QA rows (children → parents) ───────────────────
console.log(`Wiping prior QA rows for session: ${SESSION_ID}`);
await db.delete(Vote).where(eq(Vote.poll_id, POLL_QA_PARTICIPATION_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_QA_AI_USE_CASES_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_QA_NERDY_SCALE_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_QA_KEEPS_YOU_UP_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_QA_INTEREST_AVAIL_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_QA_PARTICIPATION_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_QA_AI_USE_CASES_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_QA_NERDY_SCALE_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_QA_KEEPS_YOU_UP_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_QA_INTEREST_AVAIL_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_QA_PARTICIPATION_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_QA_AI_USE_CASES_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_QA_NERDY_SCALE_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_QA_KEEPS_YOU_UP_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_QA_INTEREST_AVAIL_ID));
await db.delete(Poll).where(eq(Poll.session_id, SESSION_ID));
await db.delete(Session).where(eq(Session.id, SESSION_ID));

// ─── Session ────────────────────────────────────────────────────────────────
console.log(`Inserting QA Session: ${SESSION_SLUG}`);
await db.insert(Session).values([
  {
    id: SESSION_ID,
    slug: SESSION_SLUG,
    title: '[QA] Polls Test Session',
    description:
      'Hidden QA session mirroring the three launch-session polls so dry-run votes do not pollute the real tallies. Reachable only via direct URL.',
    kind: 'live',
    status: 'active', // QA session opens immediately so polls are testable.
    starts_at: now,
    ends_at: null,
    last_activity_at: null,
    host_user_id: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll 1: Participation mode (boolean w/ custom labels) ──────────────────
console.log(`Inserting QA Poll: ${POLL_QA_PARTICIPATION_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_QA_PARTICIPATION_ID,
    session_id: SESSION_ID,
    title: '[QA] Your participation mode',
    prompt:
      'Do you hope to be a casual listener following along, or an active participant willing to contribute to working groups and projects?',
    template: 'boolean',
    options: { true: 'Active Participant', false: 'Casual Listener' },
    status: 'open', // Pre-opened so you can vote immediately on /sessions/2026-04-29_polls-qa.
    visibility: 'session-attendees',
    results_visibility: 'live',
    anonymous_display: true,
    allow_revote: true,
    last_vote_at: null,
    created_by: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll 2: AI use cases (multi-select, 8 options) ─────────────────────────
console.log(`Inserting QA Poll: ${POLL_QA_AI_USE_CASES_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_QA_AI_USE_CASES_ID,
    session_id: SESSION_ID,
    title: '[QA] AI use cases right now',
    prompt: "What's your primary AI use case right now?",
    template: 'multi-select',
    options: [
      { id: 'personal-productivity',  label: 'Personal Productivity' },
      { id: 'avoiding-overwhelm',     label: 'Avoiding Overwhelm' },
      { id: 'streamlining-firm',      label: 'Streamlining Firm Chaos' },
      { id: 'dealflow-origination',   label: 'Better Dealflow Origination' },
      { id: 'dealflow-triage',        label: 'Triaging Current Dealflow' },
      { id: 'portfolio-awareness',    label: 'Actionable Portfolio Awareness' },
      { id: 'fomo',                   label: 'FOMO' },
      { id: 'yolo',                   label: 'YOLO' },
    ],
    status: 'open',
    visibility: 'session-attendees',
    results_visibility: 'on-close',
    anonymous_display: true,
    allow_revote: true,
    last_vote_at: null,
    created_by: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll 3: Nerdiness scale (sliding-scale, no-neutral) ────────────────────
console.log(`Inserting QA Poll: ${POLL_QA_NERDY_SCALE_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_QA_NERDY_SCALE_ID,
    session_id: SESSION_ID,
    title: '[QA] Nerdiness willingness',
    prompt: 'How nerdy are you willing to get?',
    template: 'sliding-scale',
    options: {
      min: -3,
      max: 3,
      step: 1,
      default_value: -1,
      exclude: [0],
      labels: { min: 'Please no.', max: 'Nerdiest.' },
      show_distribution: true,
    },
    status: 'open',
    visibility: 'session-attendees',
    results_visibility: 'live',
    anonymous_display: true,
    allow_revote: true,
    last_vote_at: null,
    created_by: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll 4: What keeps you up at night? (multi-select, 11 options) ────────
console.log(`Inserting QA Poll: ${POLL_QA_KEEPS_YOU_UP_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_QA_KEEPS_YOU_UP_ID,
    session_id: SESSION_ID,
    title: '[QA] What keeps you up at night',
    prompt: 'What keeps you up at night?',
    template: 'multi-select',
    options: [
      { id: 'email-overload',            label: 'Email overload' },
      { id: 'brand-recognition',         label: 'Brand recognition' },
      { id: 'winning-next-deal',         label: 'Winning the Next Deal' },
      { id: 'preparing-fundraise',       label: 'Preparing the Next Fundraise' },
      { id: 'closing-lp-commitments',    label: 'Closing LP Commitments from Current Pipeline' },
      { id: 'portfolio-mayhem',          label: 'Portfolio Mayhem' },
      { id: 'not-getting-back',          label: 'Not getting back to people' },
      { id: 'finding-next-decacorn',     label: 'Finding the next Decacorn' },
      { id: 'knowing-what-to-prioritize', label: 'Knowing what to prioritize' },
      { id: 'current-team',              label: 'Getting the most out of your Current Team' },
      { id: 'auditors',                  label: 'Feeding some auditors asking for things.' },
    ],
    status: 'open',
    visibility: 'session-attendees',
    results_visibility: 'on-close',
    anonymous_display: true,
    allow_revote: true,
    last_vote_at: null,
    created_by: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll 5: Interest vs availability (sliding-scale, no-neutral) ──────────
console.log(`Inserting QA Poll: ${POLL_QA_INTEREST_AVAIL_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_QA_INTEREST_AVAIL_ID,
    session_id: SESSION_ID,
    title: '[QA] Interest vs availability',
    prompt: 'How might your interest and availability collide?',
    template: 'sliding-scale',
    options: {
      min: -3,
      max: 3,
      step: 1,
      default_value: -1,
      exclude: [0],
      labels: {
        min: 'No way to make time for anything else',
        max: 'If I see value, I make time',
      },
      show_distribution: true,
    },
    status: 'open',
    visibility: 'session-attendees',
    results_visibility: 'live',
    anonymous_display: true,
    allow_revote: true,
    last_vote_at: null,
    created_by: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

console.log('');
console.log(`✓ QA session seeded and ALL POLLS PRE-OPENED: ${SESSION_SLUG}`);
console.log(`  /sessions/${SESSION_SLUG}     ← test URL (not on /sessions/ listing)`);
console.log('');
console.log('QA polls (status: open):');
console.log(`  - ${POLL_QA_PARTICIPATION_ID}   (boolean, results live)`);
console.log(`  - ${POLL_QA_AI_USE_CASES_ID}        (multi-select, results on-close)`);
console.log(`  - ${POLL_QA_NERDY_SCALE_ID}         (sliding-scale, -3..+3 no-neutral)`);
console.log(`  - ${POLL_QA_KEEPS_YOU_UP_ID}        (multi-select, results on-close)`);
console.log(`  - ${POLL_QA_INTEREST_AVAIL_ID}  (sliding-scale, -3..+3 no-neutral)`);
console.log('');
console.log('To close one and see the on-close reveal:');
console.log(`  POLL_ID=${POLL_QA_AI_USE_CASES_ID} STATUS=closed pnpm set-poll-status --remote`);
console.log('');
console.log('Re-run `pnpm seed:test` any time to wipe + reset (test votes erased).');

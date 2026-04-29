// scripts/seed-production.ts — populate Turso with the live launch session.
//
// Run via:
//
//   pnpm seed:production
//
// (which is `astro db execute scripts/seed-production.ts --remote`)
//
// Idempotent: deletes existing rows for this session_id and re-inserts.
// Safe to re-run if you tweak prompts/options before the meeting.
//
// All polls start as `status: 'draft'`. To open one during the meeting:
//   POLL_ID=<id> STATUS=open pnpm set-poll-status

import { db, Session, Poll, Vote, PollResult, PollEvent, eq } from 'astro:db';

const SESSION_ID = 'sess_2026-04-29-agentic-vc-dojo-launch';
const SESSION_SLUG = '2026-04-29_agentic-vc-dojo-launch';
const HOST_USER_ID = 'mpstaton';

const POLL_PARTICIPATION_ID = 'poll_dojo-launch-2026-04-29_participation-mode';
const POLL_AI_USE_CASES_ID  = 'poll_dojo-launch-2026-04-29_ai-use-cases';
const POLL_NERDY_SCALE_ID   = 'poll_dojo-launch-2026-04-29_nerdy-scale';
const POLL_KEEPS_YOU_UP_ID  = 'poll_dojo-launch-2026-04-29_keeps-you-up';
const POLL_INTEREST_AVAIL_ID = 'poll_dojo-launch-2026-04-29_interest-availability';

const now = new Date();

// ─── Idempotency: wipe any prior rows for this session ──────────────────────
// Order matters: child tables before parents.
console.log(`Wiping existing rows for session: ${SESSION_ID}`);
await db.delete(Vote).where(eq(Vote.poll_id, POLL_PARTICIPATION_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_AI_USE_CASES_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_NERDY_SCALE_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_KEEPS_YOU_UP_ID));
await db.delete(Vote).where(eq(Vote.poll_id, POLL_INTEREST_AVAIL_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_PARTICIPATION_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_AI_USE_CASES_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_NERDY_SCALE_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_KEEPS_YOU_UP_ID));
await db.delete(PollResult).where(eq(PollResult.poll_id, POLL_INTEREST_AVAIL_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_PARTICIPATION_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_AI_USE_CASES_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_NERDY_SCALE_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_KEEPS_YOU_UP_ID));
await db.delete(PollEvent).where(eq(PollEvent.poll_id, POLL_INTEREST_AVAIL_ID));
await db.delete(Poll).where(eq(Poll.session_id, SESSION_ID));
await db.delete(Session).where(eq(Session.id, SESSION_ID));

// ─── Session ────────────────────────────────────────────────────────────────
console.log(`Inserting Session: ${SESSION_SLUG}`);
await db.insert(Session).values([
  {
    id: SESSION_ID,
    slug: SESSION_SLUG,
    title: 'Agentic VC Dojo Launch Session',
    description:
      'Our kick-off launch session is an All-Hands of all Kauffman Fellows that are interested in developing skills and mastery over AI & Agentic Workflows. We want to catalyze self-organizing Working Groups that take on Projects. We aim to help all participants gain AI superpowers that benefit their personal productivity, professional trajectory, and firm-wide objectives. Elbow grease encouraged... participation and possibly some leadership necessary for true value. Casual observers welcome, but no promises.',
    kind: 'live',
    status: 'draft',
    starts_at: null,
    ends_at: null,
    last_activity_at: null,
    host_user_id: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll 1: Participation mode (boolean w/ custom labels) ──────────────────
// Boolean polls store custom labels in `Poll.options` per blueprint v2 §7.1.
// "Active Participant" maps to `true`; "Casual Listener" maps to `false`.
console.log(`Inserting Poll: ${POLL_PARTICIPATION_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_PARTICIPATION_ID,
    session_id: SESSION_ID,
    title: 'Your participation mode',
    prompt:
      'Do you hope to be a casual listener following along, or an active participant willing to contribute to working groups and projects?',
    template: 'boolean',
    options: { true: 'Active Participant', false: 'Casual Listener' },
    status: 'draft',
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

// ─── Poll 2: AI use cases (multi-select) ────────────────────────────────────
console.log(`Inserting Poll: ${POLL_AI_USE_CASES_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_AI_USE_CASES_ID,
    session_id: SESSION_ID,
    title: 'AI use cases right now',
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
    status: 'draft',
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

// ─── Poll 3: Nerdiness scale (sliding-scale, no-neutral) ──────────────────
// Even-numbered scale (-3..+3 with 0 excluded → 6 valid values) forces a
// non-neutral choice. Survey-design best practice; centered axis makes the
// polarity visible in the histogram.
console.log(`Inserting Poll: ${POLL_NERDY_SCALE_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_NERDY_SCALE_ID,
    session_id: SESSION_ID,
    title: 'Nerdiness willingness',
    prompt: 'How nerdy are you willing to get?',
    template: 'sliding-scale',
    options: {
      min: -3,
      max: 3,
      step: 1,
      default_value: -1,                  // Snap to a valid side; voter must move to vote anyway.
      exclude: [0],                       // No neutral ground — forces a side.
      labels: { min: 'Please no.', max: 'Nerdiest.' },
      show_distribution: true,
    },
    status: 'draft',
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

// ─── Poll 4: What keeps you up at night? (multi-select) ────────────────────
console.log(`Inserting Poll: ${POLL_KEEPS_YOU_UP_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_KEEPS_YOU_UP_ID,
    session_id: SESSION_ID,
    title: 'What keeps you up at night',
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
    status: 'draft',
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
console.log(`Inserting Poll: ${POLL_INTEREST_AVAIL_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_INTEREST_AVAIL_ID,
    session_id: SESSION_ID,
    title: 'Interest vs availability',
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
    status: 'draft',
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
console.log(`✓ Seeded production session: ${SESSION_SLUG}`);
console.log(`  /sessions/${SESSION_SLUG}`);
console.log('');
console.log('Polls (all currently draft):');
console.log(`  - ${POLL_PARTICIPATION_ID}    (boolean)`);
console.log(`  - ${POLL_AI_USE_CASES_ID}      (multi-select)`);
console.log(`  - ${POLL_NERDY_SCALE_ID}        (sliding-scale, -3..+3 no-neutral)`);
console.log(`  - ${POLL_KEEPS_YOU_UP_ID}       (multi-select)`);
console.log(`  - ${POLL_INTEREST_AVAIL_ID}  (sliding-scale, -3..+3 no-neutral)`);
console.log('');
console.log('To open a poll during the meeting:');
console.log(`  POLL_ID=${POLL_PARTICIPATION_ID} STATUS=open pnpm set-poll-status`);

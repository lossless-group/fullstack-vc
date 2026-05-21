// scripts/seed-production-may27.ts — populate Turso with the May 27 Monthly
// All-Hands session and its one sliding-scale poll on LP syndication frequency.
//
// Run via:
//
//   pnpm seed:production:may27
//
// (which is `astro db execute scripts/seed-production-may27.ts --remote`)
//
// Idempotent: deletes existing rows for this session_id and re-inserts.
// Safe to re-run if you tweak the prompt or scale before the meeting.
//
// The poll starts as `status: 'draft'`. To open it (ideally days before the
// meeting so votes accumulate):
//
//   POLL_ID=poll_2026-05-27_lp-syndication-frequency STATUS=open pnpm set-poll-status --remote

import { db, Session, Poll, Vote, PollResult, PollEvent, eq } from 'astro:db';

const SESSION_ID = 'sess_2026-05-27_monthly-all-hands';
const SESSION_SLUG = '2026-05-27_monthly-all-hands';
const HOST_USER_ID = 'mpstaton';

const POLL_LP_SYNDICATION_ID = 'poll_2026-05-27_lp-syndication-frequency';
const POLL_AI_USE_CASES_ID   = 'poll_2026-05-27_ai-use-cases';
const POLL_KEEPS_YOU_UP_ID   = 'poll_2026-05-27_keeps-you-up';

const now = new Date();

// ─── Idempotency: wipe any prior rows for this session ──────────────────────
console.log(`Wiping existing rows for session: ${SESSION_ID}`);
for (const pid of [POLL_LP_SYNDICATION_ID, POLL_AI_USE_CASES_ID, POLL_KEEPS_YOU_UP_ID]) {
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
    title: 'Monthly All-Hands — May 27',
    description:
      'Monthly all-hands for the Agentic VC Dojo. Three presenters share short demos of what they’ve been building, breaking, and learning. Polls open in the week leading up to the meeting and remain open through the session.',
    kind: 'live',
    status: 'draft',
    starts_at: new Date('2026-05-27T16:00:00Z'), // 9am Pacific
    ends_at: null,
    last_activity_at: null,
    host_user_id: HOST_USER_ID,
    created_at: now,
    updated_at: now,
  },
]);

// ─── Poll: LP syndication frequency (sliding-scale, 1..4) ──────────────────
// 4-anchor ordinal scale. The component only renders min/max labels under the
// track, so the four named anchors are inlined in the prompt as a legend.
// No `exclude` — "We don't do it" is a legitimate answer here.
console.log(`Inserting Poll: ${POLL_LP_SYNDICATION_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_LP_SYNDICATION_ID,
    session_id: SESSION_ID,
    title: 'LP syndication frequency',
    prompt:
      'How often do you syndicate live deals (during a company’s fundraise) ' +
      'as direct or SPV opportunities to your Limited Partners?\n\n' +
      '1 = We don’t do it · 2 = Sometimes · 3 = Often · 4 = Built into our practice',
    template: 'sliding-scale',
    options: {
      min: 1,
      max: 4,
      step: 1,
      default_value: 1,
      labels: {
        min: 'We don’t do it.',
        max: 'It’s built in to our practice.',
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

// ─── Poll: AI use cases right now (multi-select, migrated from launch) ─────
// Carried over from the 2026-04-29 launch session. Options unchanged — if the
// "use case" vocabulary has drifted by May 27, edit the options array here.
console.log(`Inserting Poll: ${POLL_AI_USE_CASES_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_AI_USE_CASES_ID,
    session_id: SESSION_ID,
    title: 'AI use cases right now',
    prompt: "What's your primary AI use case right now?",
    template: 'multi-select',
    options: [
      { id: 'personal-productivity', label: 'Personal Productivity' },
      { id: 'avoiding-overwhelm',    label: 'Avoiding Overwhelm' },
      { id: 'streamlining-firm',     label: 'Streamlining Firm Chaos' },
      { id: 'dealflow-origination',  label: 'Better Dealflow Origination' },
      { id: 'dealflow-triage',       label: 'Triaging Current Dealflow' },
      { id: 'portfolio-awareness',   label: 'Actionable Portfolio Awareness' },
      { id: 'fomo',                  label: 'FOMO' },
      { id: 'yolo',                  label: 'YOLO' },
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

// ─── Poll: What keeps you up at night (multi-select, migrated from launch) ─
console.log(`Inserting Poll: ${POLL_KEEPS_YOU_UP_ID}`);
await db.insert(Poll).values([
  {
    id: POLL_KEEPS_YOU_UP_ID,
    session_id: SESSION_ID,
    title: 'What keeps you up at night',
    prompt: 'What keeps you up at night?',
    template: 'multi-select',
    options: [
      { id: 'email-overload',             label: 'Email overload' },
      { id: 'brand-recognition',          label: 'Brand recognition' },
      { id: 'winning-next-deal',          label: 'Winning the Next Deal' },
      { id: 'preparing-fundraise',        label: 'Preparing the Next Fundraise' },
      { id: 'closing-lp-commitments',     label: 'Closing LP Commitments from Current Pipeline' },
      { id: 'portfolio-mayhem',           label: 'Portfolio Mayhem' },
      { id: 'not-getting-back',           label: 'Not getting back to people' },
      { id: 'finding-next-decacorn',      label: 'Finding the next Decacorn' },
      { id: 'knowing-what-to-prioritize', label: 'Knowing what to prioritize' },
      { id: 'current-team',               label: 'Getting the most out of your Current Team' },
      { id: 'auditors',                   label: 'Feeding some auditors asking for things.' },
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

console.log('');
console.log(`✓ Seeded production session: ${SESSION_SLUG}`);
console.log(`  /sessions/${SESSION_SLUG}`);
console.log('');
console.log('Polls (currently draft):');
console.log(`  - ${POLL_LP_SYNDICATION_ID}    (sliding-scale, 1..4)`);
console.log(`  - ${POLL_AI_USE_CASES_ID}              (multi-select)`);
console.log(`  - ${POLL_KEEPS_YOU_UP_ID}              (multi-select)`);
console.log('');
console.log('To open the polls (do this ~now so votes accumulate before May 27):');
console.log(`  POLL_ID=${POLL_LP_SYNDICATION_ID} STATUS=open pnpm set-poll-status --remote`);
console.log(`  POLL_ID=${POLL_AI_USE_CASES_ID} STATUS=open pnpm set-poll-status --remote`);
console.log(`  POLL_ID=${POLL_KEEPS_YOU_UP_ID} STATUS=open pnpm set-poll-status --remote`);

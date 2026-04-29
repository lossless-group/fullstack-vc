// db/seed.ts — local development seed data
//
// Astro regenerates the local libSQL file (.astro/content.db) from this file
// on every dev-server start. Mirrors the production Turso state so `pnpm dev`
// and `pnpm dev --remote` show the same content.
//
// Two sessions are seeded:
//
//   1. Launch session — `2026-04-29_agentic-vc-dojo-launch` — Session.status
//      = 'draft', polls status = 'draft'. Mirrors what prod Turso looks like
//      BEFORE the meeting starts (host hasn't flipped polls open yet). Source
//      of truth for prod data: scripts/seed-production.ts.
//
//   2. QA session — `2026-04-29_polls-qa` — Session.status = 'active',
//      polls status = 'open'. Hidden test surface (the markdown stub has
//      `unlisted: true`). Source of truth for QA data:
//      scripts/seed-test-session.ts. Vote here in dev without touching the
//      real launch tallies.
//
// Editing rule: when you change a poll question/options/template here, ALSO
// update both scripts/ files so production stays in sync.

import { db, Session, Poll } from 'astro:db';

export default async function seed() {
  const now = new Date();
  const HOST = 'mpstaton';

  // ═══════════════════════════════════════════════════════════════════════════
  // LAUNCH SESSION  (mirrors scripts/seed-production.ts — status: 'draft')
  // ═══════════════════════════════════════════════════════════════════════════

  const LAUNCH_ID = 'sess_2026-04-29-agentic-vc-dojo-launch';
  const LAUNCH_SLUG = '2026-04-29_agentic-vc-dojo-launch';

  await db.insert(Session).values([
    {
      id: LAUNCH_ID,
      slug: LAUNCH_SLUG,
      title: 'Agentic VC Dojo Launch Session',
      description:
        'Our kick-off launch session is an All-Hands of all Kauffman Fellows that are interested in developing skills and mastery over AI & Agentic Workflows. We want to catalyze self-organizing Working Groups that take on Projects. We aim to help all participants gain AI superpowers that benefit their personal productivity, professional trajectory, and firm-wide objectives. Elbow grease encouraged... participation and possibly some leadership necessary for true value. Casual observers welcome, but no promises.',
      kind: 'live',
      status: 'draft',
      starts_at: null,
      ends_at: null,
      last_activity_at: null,
      host_user_id: HOST,
      created_at: now,
      updated_at: now,
    },
  ]);

  await db.insert(Poll).values([
    {
      id: 'poll_dojo-launch-2026-04-29_participation-mode',
      session_id: LAUNCH_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_dojo-launch-2026-04-29_ai-use-cases',
      session_id: LAUNCH_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_dojo-launch-2026-04-29_nerdy-scale',
      session_id: LAUNCH_ID,
      title: 'Nerdiness willingness',
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
      status: 'draft',
      visibility: 'session-attendees',
      results_visibility: 'live',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_dojo-launch-2026-04-29_keeps-you-up',
      session_id: LAUNCH_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_dojo-launch-2026-04-29_interest-availability',
      session_id: LAUNCH_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_dojo-launch-2026-04-29_wins',
      session_id: LAUNCH_ID,
      title: 'Hard-won wins',
      prompt:
        'What are some hard-won wins with technology tools or apps that you figured out, others might not know, and you\u2019d be willing to share?',
      template: 'multi-string-input',
      options: {
        placeholder: 'A short phrase per win — press Enter to add another',
        max_string_length: 200,
      },
      status: 'draft',
      visibility: 'session-attendees',
      results_visibility: 'on-close',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_dojo-launch-2026-04-29_challenges',
      session_id: LAUNCH_ID,
      title: 'Recent challenges',
      prompt:
        'What are some challenges you\u2019ve been facing recently that made you think someone else has clearly figured this out already?',
      template: 'multi-string-input',
      options: {
        placeholder: 'A short phrase per challenge — press Enter to add another',
        max_string_length: 200,
      },
      status: 'draft',
      visibility: 'session-attendees',
      results_visibility: 'on-close',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // QA SESSION  (mirrors scripts/seed-test-session.ts — status: 'open')
  // ═══════════════════════════════════════════════════════════════════════════
  // The hidden QA mirror. Reachable only via direct URL
  // (/sessions/2026-04-29_polls-qa). Polls are pre-opened so any vote
  // lands immediately without flipping status manually.

  const QA_ID = 'sess_2026-04-29-polls-qa';
  const QA_SLUG = '2026-04-29_polls-qa';

  await db.insert(Session).values([
    {
      id: QA_ID,
      slug: QA_SLUG,
      title: '[QA] Polls Test Session',
      description:
        'Hidden QA session mirroring the seven launch-session polls so dry-run votes do not pollute the real tallies. Reachable only via direct URL.',
      kind: 'live',
      status: 'active',
      starts_at: now,
      ends_at: null,
      last_activity_at: null,
      host_user_id: HOST,
      created_at: now,
      updated_at: now,
    },
  ]);

  await db.insert(Poll).values([
    {
      id: 'poll_qa_participation-mode',
      session_id: QA_ID,
      title: '[QA] Your participation mode',
      prompt:
        'Do you hope to be a casual listener following along, or an active participant willing to contribute to working groups and projects?',
      template: 'boolean',
      options: { true: 'Active Participant', false: 'Casual Listener' },
      status: 'open',
      visibility: 'session-attendees',
      results_visibility: 'live',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_qa_ai-use-cases',
      session_id: QA_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_qa_nerdy-scale',
      session_id: QA_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_qa_keeps-you-up',
      session_id: QA_ID,
      title: '[QA] What keeps you up at night',
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
      status: 'open',
      visibility: 'session-attendees',
      results_visibility: 'on-close',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_qa_interest-availability',
      session_id: QA_ID,
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
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_qa_wins',
      session_id: QA_ID,
      title: '[QA] Hard-won wins',
      prompt:
        'What are some hard-won wins with technology tools or apps that you figured out, others might not know, and you\u2019d be willing to share?',
      template: 'multi-string-input',
      options: {
        placeholder: 'A short phrase per win — press Enter to add another',
        max_string_length: 200,
      },
      status: 'open',
      visibility: 'session-attendees',
      results_visibility: 'on-close',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'poll_qa_challenges',
      session_id: QA_ID,
      title: '[QA] Recent challenges',
      prompt:
        'What are some challenges you\u2019ve been facing recently that made you think someone else has clearly figured this out already?',
      template: 'multi-string-input',
      options: {
        placeholder: 'A short phrase per challenge — press Enter to add another',
        max_string_length: 200,
      },
      status: 'open',
      visibility: 'session-attendees',
      results_visibility: 'on-close',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: HOST,
      created_at: now,
      updated_at: now,
    },
  ]);
}

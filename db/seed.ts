// db/seed.ts — local development seed data
//
// Astro regenerates the local libSQL file (.astro/content.db) from this
// file on every dev-server restart. Use this to give engineers a working
// session + polls to render against without needing Turso.
//
// This is NOT production data. Production data is created via OAuth-bound
// authoring flows (admin form in v0.0.2+; direct DB / seed override in v0.0.1).

import { db, Session, Poll } from 'astro:db';

export default async function seed() {
  const now = new Date();

  // ─── Tomorrow's live session: Agentic VC Dojo Launch ────────────────────────
  // Slug matches src/content/sessions/2026-04-29_agentic-vc-dojo-launch.md
  // so the page at /sessions/2026-04-29_agentic-vc-dojo-launch finds both
  // the markdown chrome and the DB polls.
  // Status starts as 'draft' — flip to 'active' when the meeting opens.
  const SESSION_ID = 'sess_2026-04-29-agentic-vc-dojo-launch';
  const SESSION_SLUG = '2026-04-29_agentic-vc-dojo-launch';

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
      host_user_id: 'mpstaton',
      created_at: now,
      updated_at: now,
    },
  ]);

  // ─── PLACEHOLDER polls ────────────────────────────────────────────────
  // The three polls below are placeholders so local dev has something to
  // render. The REAL launch-session questions get authored in
  // scripts/seed-production.ts and pushed to Turso via
  //   astro db execute scripts/seed-production.ts --remote
  // (created in Chunk 5 once the host hands off the question text).
  // All start as 'draft' — host opens them mid-meeting via set-poll-status.

  await db.insert(Poll).values([
    // Boolean — quick gut-check at the top of the meeting.
    {
      id: 'poll_q2-fundraising-now',
      session_id: SESSION_ID,
      title: 'Fundraising temperature',
      prompt: 'Is your fund actively deploying capital in the next 6 months?',
      template: 'boolean',
      options: null,
      status: 'draft',
      visibility: 'session-attendees',
      results_visibility: 'live',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: 'mpstaton',
      created_at: now,
      updated_at: now,
    },

    // SingleSelect — primary AI use case (radio).
    {
      id: 'poll_q2-primary-ai-use-case',
      session_id: SESSION_ID,
      title: 'Primary AI use case',
      prompt: "What's your fund's primary AI use case right now?",
      template: 'single-select',
      options: [
        { id: 'diligence', label: 'Diligence research & deep-dives' },
        { id: 'sourcing',  label: 'Deal sourcing & inbound triage' },
        { id: 'portfolio', label: 'Portfolio support / founder services' },
        { id: 'lp-comms',  label: 'LP comms & reporting' },
        { id: 'none',      label: "Honestly, we're not using AI yet" },
      ],
      status: 'draft',
      visibility: 'session-attendees',
      results_visibility: 'on-close',
      anonymous_display: false,
      allow_revote: true,
      last_vote_at: null,
      created_by: 'mpstaton',
      created_at: now,
      updated_at: now,
    },

    // SlidingScale — comfort with Q2 pacing (numeric histogram).
    {
      id: 'poll_q2-pacing-comfort',
      session_id: SESSION_ID,
      title: 'Q2 pacing comfort',
      prompt: "How comfortable is your fund's pacing for Q2?",
      template: 'sliding-scale',
      options: {
        // For sliding-scale, `options` carries the bounds + labels rather than
        // a list of choices. The Vote.value is a number in [min, max].
        min: 1,
        max: 10,
        step: 1,
        default_value: 5,
        labels: { min: 'Way behind plan', mid: 'On track', max: 'Way ahead of plan' },
        show_distribution: true,
      },
      status: 'draft',
      visibility: 'session-attendees',
      results_visibility: 'live',
      anonymous_display: true,
      allow_revote: true,
      last_vote_at: null,
      created_by: 'mpstaton',
      created_at: now,
      updated_at: now,
    },
  ]);
}

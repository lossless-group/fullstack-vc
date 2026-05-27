// scripts/seed-lp-syndication-pulse.ts — populate Turso with the three Boolean
// polls that render in Section__LPSyndicationPulse on the May 27 session page.
//
// Run via:
//
//   pnpm seed:lp-pulse              (local libSQL under .astro/content.db)
//   pnpm seed:lp-pulse:remote       (Turso)
//
// Idempotent: deletes existing rows for the three poll IDs and re-inserts.
//
// PRE-SEEDING: Inserts synthetic Vote rows representing pre-session survey
// responses from registered May 27 attendees. The synthetic user_ids
// ('seed:may27-pre-NN') will never collide with real OAuth-derived user_ids
// (lowercased emails). When real attendees vote, their votes layer on top —
// the seeded baseline is preserved automatically because the aggregator
// recomputes PollResult.tallies from the Vote rows on every write.
//
// All three polls open immediately (status: 'open', results_visibility: 'live')
// so the chart is visible the moment the section renders.

import { db, Session, Poll, Vote, PollResult, PollEvent, eq } from 'astro:db';

const SESSION_ID = 'sess_2026-05-27_monthly-all-hands';
const DISPLAY_GROUP = 'lp-syndication-pulse';
const HOST_USER_ID = 'mpstaton';

const POLL_ENGAGEMENT_ID = 'poll_2026-05-27_lp-co-invest-engagement';
const POLL_SPV_ID        = 'poll_2026-05-27_lp-spv-process';
const POLL_DIRECT_ID     = 'poll_2026-05-27_lp-direct-demand';

const now = new Date();

// Pre-session survey responses from the 2026-05-27 registration form,
// mapped to synthetic anonymous user_ids. Each row is one responder's full
// answer set across the three questions; null = they skipped that question.
type Triple = { engagement: boolean | null; spv: boolean | null; direct: boolean | null };
const PRE_SURVEY: Record<string, Triple> = {
  'seed:may27-pre-01': { engagement: true,  spv: true,  direct: true  },
  'seed:may27-pre-02': { engagement: true,  spv: false, direct: true  },
  'seed:may27-pre-03': { engagement: true,  spv: false, direct: null  },
  'seed:may27-pre-04': { engagement: false, spv: false, direct: false },
  'seed:may27-pre-05': { engagement: false, spv: false, direct: true  },
  'seed:may27-pre-06': { engagement: false, spv: false, direct: true  },
  // 07 answered the spotlight prompt only — no LP responses, so no votes
  // recorded on these three polls.
};

// ─── Idempotency: wipe any prior rows for these polls ──────────────────────
console.log('Wiping existing rows for LP syndication pulse polls...');
for (const pid of [POLL_ENGAGEMENT_ID, POLL_SPV_ID, POLL_DIRECT_ID]) {
  await db.delete(Vote).where(eq(Vote.poll_id, pid));
  await db.delete(PollResult).where(eq(PollResult.poll_id, pid));
  await db.delete(PollEvent).where(eq(PollEvent.poll_id, pid));
  await db.delete(Poll).where(eq(Poll.id, pid));
}

// ─── Ensure parent Session exists ───────────────────────────────────────────
// Don't re-insert if seed-production-may27.ts has already run. We only insert
// a stub if no row exists, so we never clobber the session metadata.
const existing = await db.select().from(Session).where(eq(Session.id, SESSION_ID)).get();
if (!existing) {
  console.log(`Parent Session ${SESSION_ID} missing — inserting stub.`);
  await db.insert(Session).values([
    {
      id: SESSION_ID,
      slug: '2026-05-27_monthly-all-hands',
      title: 'Monthly All-Hands — May 27',
      description: 'Monthly all-hands for the Agentic VC Dojo.',
      kind: 'live',
      status: 'active',
      starts_at: new Date('2026-05-27T16:00:00Z'),
      ends_at: null,
      last_activity_at: null,
      host_user_id: HOST_USER_ID,
      created_at: now,
      updated_at: now,
    },
  ]);
} else {
  console.log(`Parent Session ${SESSION_ID} exists — keeping metadata.`);
}

// ─── Common Poll shape ──────────────────────────────────────────────────────
const commonPollFields = {
  session_id: SESSION_ID,
  template: 'boolean',
  options: null,
  status: 'open',                            // open immediately per host decision
  visibility: 'session-attendees',
  results_visibility: 'live',                // chart visible from first render
  anonymous_display: true,
  allow_revote: true,
  last_vote_at: null,
  display_group: DISPLAY_GROUP,
  created_by: HOST_USER_ID,
  created_at: now,
  updated_at: now,
};

// ─── Three Boolean polls ────────────────────────────────────────────────────
console.log('Inserting three pulse polls...');
await db.insert(Poll).values([
  {
    ...commonPollFields,
    id: POLL_ENGAGEMENT_ID,
    title: 'Engage LPs as co-investors',
    prompt: 'Does your firm engage LPs as co-investors?',
  },
  {
    ...commonPollFields,
    id: POLL_SPV_ID,
    title: 'Run SPV / campaign-style process',
    prompt: 'Does your firm run SPV processes with LPs that require campaign-style attention?',
  },
  {
    ...commonPollFields,
    id: POLL_DIRECT_ID,
    title: 'LPs want more direct opportunities',
    prompt: 'Do your LPs hope for more opportunities to go direct as a co-investor?',
  },
]);

// ─── Synthetic Vote rows ────────────────────────────────────────────────────
console.log('Inserting synthetic Vote rows from pre-session survey...');
type VoteRow = {
  poll_id: string;
  user_id: string;
  value: boolean;
  created_at: Date;
  updated_at: Date;
};
const votesByPoll: Record<string, VoteRow[]> = {
  [POLL_ENGAGEMENT_ID]: [],
  [POLL_SPV_ID]: [],
  [POLL_DIRECT_ID]: [],
};
for (const [userId, triple] of Object.entries(PRE_SURVEY)) {
  const map: Array<[string, boolean | null]> = [
    [POLL_ENGAGEMENT_ID, triple.engagement],
    [POLL_SPV_ID, triple.spv],
    [POLL_DIRECT_ID, triple.direct],
  ];
  for (const [pollId, value] of map) {
    if (value === null) continue;
    votesByPoll[pollId].push({
      poll_id: pollId,
      user_id: userId,
      value,
      created_at: now,
      updated_at: now,
    });
  }
}
for (const [pollId, rows] of Object.entries(votesByPoll)) {
  if (rows.length === 0) continue;
  await db.insert(Vote).values(rows);
  console.log(`  ${pollId}: ${rows.length} synthetic votes`);
}

// ─── Pre-compute PollResult tallies ─────────────────────────────────────────
// The aggregator will recompute these on the first real vote, but we want the
// initial SSR render to already show the chart — so we materialize the tallies
// here. Same shape the live aggregator produces: { true: N, false: N }.
console.log('Materializing initial PollResult tallies...');
for (const [pollId, rows] of Object.entries(votesByPoll)) {
  const trueCount = rows.filter((r) => r.value === true).length;
  const falseCount = rows.filter((r) => r.value === false).length;
  await db.insert(PollResult).values([
    {
      poll_id: pollId,
      tallies: { true: trueCount, false: falseCount },
      total_votes: trueCount + falseCount,
      last_aggregated_at: now,
    },
  ]);
  console.log(`  ${pollId}: Y=${trueCount} N=${falseCount}`);
}

// ─── Audit trail ────────────────────────────────────────────────────────────
console.log('Recording open events...');
for (const pid of [POLL_ENGAGEMENT_ID, POLL_SPV_ID, POLL_DIRECT_ID]) {
  await db.insert(PollEvent).values([
    {
      poll_id: pid,
      actor_user_id: HOST_USER_ID,
      kind: 'open',
      at: now,
      note: 'Seeded open via seed-lp-syndication-pulse.ts',
    },
  ]);
}

console.log('Done. Three pulse polls live with seeded baseline.');

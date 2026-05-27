// scripts/regroup-lp-syndication-frequency.ts — non-destructive UPDATE that
// tags the existing LP syndication frequency poll with display_group so it
// renders inside Section__LPSyndicationPulse on the May 27 session page,
// alongside the three Boolean pulse polls, instead of in the standard live
// polls section at the bottom.
//
// Run via:
//
//   pnpm tag:lp-frequency:remote
//
// (which is `astro db execute scripts/regroup-lp-syndication-frequency.ts --remote`)
//
// Safe to re-run. Updates only the display_group + updated_at columns; does
// NOT touch votes, prompts, options, results — anything someone has already
// voted is preserved.

import { db, Poll, eq } from 'astro:db';

const POLL_ID = 'poll_2026-05-27_lp-syndication-frequency';
const DISPLAY_GROUP = 'lp-syndication-pulse';

console.log(`Tagging ${POLL_ID} with display_group='${DISPLAY_GROUP}'...`);

await db
  .update(Poll)
  .set({ display_group: DISPLAY_GROUP, updated_at: new Date() })
  .where(eq(Poll.id, POLL_ID));

// Read back to confirm.
const after = await db.select().from(Poll).where(eq(Poll.id, POLL_ID)).get();
if (after) {
  console.log(`✓ ${POLL_ID} now has display_group='${(after as any).display_group}'`);
} else {
  console.log(`✗ Poll ${POLL_ID} not found.`);
}

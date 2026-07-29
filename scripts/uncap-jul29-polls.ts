// scripts/uncap-jul29-polls.ts — live-event hotfix (2026-07-29).
//
// The checkup polls are describe-in-your-own-words questions, but
// multi-string-input defaults to a 200-char per-entry cap, and Q4/Q5 were
// seeded with max_strings_per_voter: 1. The room wants to write freely.
//
// This raises every checkup poll to a 2000-char entry cap and removes the
// per-voter entry count cap entirely. Both the Svelte input and the server
// validator read these from Poll.options, so the change takes effect on the
// next page refresh / snapshot poll — no redeploy needed.
//
// Run: node --env-file=.env scripts/db-execute.mjs scripts/uncap-jul29-polls.ts --remote

import { db, Poll, eq } from 'astro:db';

const POLL_IDS = [
  'poll_2026-07-29_recent-wins',
  'poll_2026-07-29_recent-intrigue',
  'poll_2026-07-29_rabbit-holes',
  'poll_2026-07-29_time-eater',
  'poll_2026-07-29_breakthrough',
];

export default async function () {
  const now = new Date();
  for (const id of POLL_IDS) {
    const poll = await db.select().from(Poll).where(eq(Poll.id, id)).get();
    if (!poll) {
      console.error(`✗ Poll not found: ${id}`);
      continue;
    }
    const prior = (poll.options ?? {}) as Record<string, unknown>;
    const next = {
      placeholder: prior.placeholder ?? 'Write freely — press Enter to add another',
      max_string_length: 2000,
      // max_strings_per_voter intentionally omitted → no entry-count cap
    };
    await db.update(Poll)
      .set({ options: next, updated_at: now })
      .where(eq(Poll.id, id));
    console.log(`✓ ${id}: max_string_length 2000, entry-count cap removed (was ${JSON.stringify(prior)})`);
  }
}

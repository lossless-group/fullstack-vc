// scripts/query-lp-syndication-votes.ts
//
// Dumps every Vote row against the four LP-syndication polls + joins each
// vote to its User row so you can see who said what.
//
// Run via:
//
//   pnpm astro db execute scripts/query-lp-syndication-votes.ts --remote
//
// Output format (per poll):
//   === <poll title> (N votes total · S seeded · R real) ===
//   <value>  <name · firm>  (<provider · user_id>)
//   ...
//   Seeded:
//     <seed user_id>: <value>
//
// Vote.user_id values starting with "seed:" are the pre-session synthetic
// baseline from the seed script — labeled "[seed]" and listed separately.

import { db, Vote, User, eq } from 'astro:db';

const POLLS = [
  { id: 'poll_2026-05-27_lp-co-invest-engagement',  title: 'Engage LPs as co-investors',       kind: 'boolean' },
  { id: 'poll_2026-05-27_lp-syndication-frequency', title: 'LP syndication frequency (1-4)',   kind: 'scale'   },
  { id: 'poll_2026-05-27_lp-spv-process',           title: 'Run SPV / campaign-style process', kind: 'boolean' },
  { id: 'poll_2026-05-27_lp-direct-demand',         title: 'LPs want more direct opps',        kind: 'boolean' },
];

// Pull all users up-front; not that many of them.
const allUsers = await db.select().from(User).all();
const userById = new Map(allUsers.map((u) => [u.id, u]));

function describeUser(userId: string): string {
  const u = userById.get(userId);
  if (!u) return `(unknown id: ${userId})`;
  const name = (u as any).name ?? (u as any).email ?? userId;
  const firm = (u as any).firm ?? null;
  const provider = (u as any).last_provider ?? '?';
  return firm ? `${name} · ${firm} [${provider}]` : `${name} [${provider}]`;
}

function fmtValue(v: unknown, kind: string): string {
  if (kind === 'boolean') {
    if (v === true) return 'YES';
    if (v === false) return 'NO ';
    return String(v);
  }
  return String(v).padStart(3);
}

console.log('');
console.log('LP-syndication poll votes — live snapshot from Turso');
console.log('===================================================');

for (const poll of POLLS) {
  const votes = await db
    .select()
    .from(Vote)
    .where(eq(Vote.poll_id, poll.id))
    .all();

  const seedVotes = votes.filter((v) => v.user_id.startsWith('seed:'));
  const realVotes = votes.filter((v) => !v.user_id.startsWith('seed:'));

  console.log('');
  console.log(`=== ${poll.title} ===`);
  console.log(`    ${votes.length} total · ${realVotes.length} real · ${seedVotes.length} seeded`);

  if (realVotes.length > 0) {
    console.log('');
    console.log('  Real votes:');
    // Sort: yes/high first, no/low second, for booleans + scale
    const sorted = [...realVotes].sort((a, b) => {
      const av = a.value as any;
      const bv = b.value as any;
      if (poll.kind === 'boolean') {
        // true before false
        if (av === bv) return 0;
        return av ? -1 : 1;
      }
      // scale: descending
      return (Number(bv) || 0) - (Number(av) || 0);
    });
    for (const v of sorted) {
      console.log(`    ${fmtValue(v.value, poll.kind)}  ${describeUser(v.user_id)}`);
    }
  } else {
    console.log('  Real votes: (none yet)');
  }

  if (seedVotes.length > 0) {
    console.log('');
    console.log(`  Seeded (pre-survey baseline):`);
    for (const v of seedVotes) {
      console.log(`    ${fmtValue(v.value, poll.kind)}  ${v.user_id}`);
    }
  }
}

console.log('');
console.log('===================================================');
console.log(`Users in DB: ${allUsers.length}`);
console.log('');

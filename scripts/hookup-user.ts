// scripts/hookup-user.ts
//
// One-by-one user enrichment. Takes a substring match on the user's name /
// email / id, prints all candidates, and (if exactly one match) updates the
// matched User row with the fields you provided via env vars.
//
// Run via:
//
//   USER_MATCH=patrick HANDLE=psagisi FIRM="Iolar Ventures" KAUFFMAN_CLASS=17 \
//     pnpm astro db execute scripts/hookup-user.ts --remote
//
// All env vars except USER_MATCH are optional — only the ones you set get
// written. Bare match (just USER_MATCH) prints the candidate(s) without
// modifying anything; useful for discovery before commit.
//
// Env vars consumed:
//   USER_MATCH       — required. Lowercase substring matched against
//                      User.name, User.email, User.id (the canonical email).
//   HANDLE           — sets User.github_handle (links to the participants
//                      markdown filename and the /people/<handle> route).
//   FIRM             — sets User.firm.
//   NAME             — sets User.name (use when LinkedIn surfaced a weird
//                      display name and you want to canonicalize it).
//   KAUFFMAN_CLASS   — sets User.kauffman_class (number).
//   DRY_RUN=true     — print intended updates without writing.
//
// Safety: matches > 1 or = 0 cause the script to bail without writes.

import { db, User, eq } from 'astro:db';

const USER_MATCH = process.env.USER_MATCH ?? '';
const HANDLE = process.env.HANDLE ?? null;
const FIRM = process.env.FIRM ?? null;
const NAME = process.env.NAME ?? null;
const KAUFFMAN_CLASS_RAW = process.env.KAUFFMAN_CLASS ?? null;
const KAUFFMAN_CLASS = KAUFFMAN_CLASS_RAW !== null ? Number(KAUFFMAN_CLASS_RAW) : null;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!USER_MATCH) {
  console.error('USER_MATCH required (substring match against name / email / id)');
  process.exit(1);
}

const allUsers = await db.select().from(User).all();
const q = USER_MATCH.toLowerCase();
const matches = allUsers.filter((u: any) => {
  const fields = [
    String(u.name ?? '').toLowerCase(),
    String(u.email ?? '').toLowerCase(),
    String(u.id ?? '').toLowerCase(),
  ];
  return fields.some((f) => f.includes(q));
});

console.log('');
console.log(`USER_MATCH="${USER_MATCH}" → ${matches.length} match(es):`);
for (const m of matches) {
  console.log('');
  console.log(`  id:             ${m.id}`);
  console.log(`  name:           ${(m as any).name ?? '(null)'}`);
  console.log(`  email:          ${(m as any).email ?? '(null)'}`);
  console.log(`  firm:           ${(m as any).firm ?? '(null)'}`);
  console.log(`  github_handle:  ${(m as any).github_handle ?? '(null)'}`);
  console.log(`  linkedin_sub:   ${(m as any).linkedin_sub ? 'set' : '(null)'}`);
  console.log(`  google_sub:     ${(m as any).google_sub ? 'set' : '(null)'}`);
  console.log(`  kauffman_class: ${(m as any).kauffman_class ?? '(null)'}`);
  console.log(`  last_provider:  ${(m as any).last_provider}`);
}

const hasUpdates = HANDLE !== null || FIRM !== null || NAME !== null || KAUFFMAN_CLASS !== null;

if (!hasUpdates) {
  console.log('');
  console.log('No update env vars supplied — discovery only, nothing written.');
  console.log('To update, re-run with: HANDLE=... FIRM=... NAME=... KAUFFMAN_CLASS=...');
  process.exit(0);
}

if (matches.length !== 1) {
  console.error('');
  console.error(`Expected exactly 1 match for safe update, got ${matches.length}. Refine USER_MATCH.`);
  process.exit(1);
}

const user = matches[0] as any;

const updates: any = { updated_at: new Date() };
if (HANDLE !== null) updates.github_handle = HANDLE;
if (FIRM !== null) updates.firm = FIRM;
if (NAME !== null) updates.name = NAME;
if (KAUFFMAN_CLASS !== null) updates.kauffman_class = KAUFFMAN_CLASS;

console.log('');
console.log(`${DRY_RUN ? '[DRY RUN] would update' : 'Updating'} ${user.id}:`);
for (const [k, v] of Object.entries(updates)) {
  if (k === 'updated_at') continue;
  console.log(`  ${k}: ${user[k] ?? '(null)'}  →  ${v}`);
}

if (DRY_RUN) {
  console.log('');
  console.log('DRY_RUN=true — no writes performed. Re-run without DRY_RUN to commit.');
  process.exit(0);
}

await db.update(User).set(updates).where(eq(User.id, user.id));
const after = await db.select().from(User).where(eq(User.id, user.id)).get();

console.log('');
console.log('After update:');
console.log(`  name:           ${(after as any)?.name ?? '(null)'}`);
console.log(`  firm:           ${(after as any)?.firm ?? '(null)'}`);
console.log(`  github_handle:  ${(after as any)?.github_handle ?? '(null)'}`);
console.log(`  kauffman_class: ${(after as any)?.kauffman_class ?? '(null)'}`);
console.log('');
console.log(`✓ Hooked up. Public profile should now render at /people/${(after as any)?.github_handle}`);

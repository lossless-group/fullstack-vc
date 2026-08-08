// scripts/_audit-stack-drift.mjs — READ-ONLY drift report:
// participant markdown frontmatter vs Turso User/Stack rows.
//
//   pnpm audit:stacks
//
// Markdown is the working source of truth for stacks; Turso is what the app
// reads. Run this before `pnpm push:stacks:remote` (md -> DB) or
// `pnpm sync:stacks:remote` (DB -> md) to see which side is ahead, and on
// which tools. Writes nothing.
import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const env = readFileSync(join(root, '.env'), 'utf-8');
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};
const client = createClient({ url: get('TURSO_DATABASE_URL'), authToken: get('TURSO_AUTH_TOKEN') });

// ── Parse markdown participants (crude frontmatter read, enough for this) ──
const dir = join(root, 'src/content/participants');
const files = readdirSync(dir).filter(f => f.endsWith('.md'));
const md = new Map();
for (const f of files) {
  const raw = readFileSync(join(dir, f), 'utf-8');
  const fm = raw.split('---')[1] ?? '';
  const handle = (fm.match(/^handle:\s*(.+)$/m)?.[1] ?? f.replace(/\.md$/, '')).trim();
  const publish = /^publish:\s*true/m.test(fm);
  const buckets = { current: [], aspirational: [], abandoned: [] };
  let bucket = null;
  for (const line of fm.split('\n')) {
    const b = line.match(/^(current_stack|aspirational_stack|abandoned_stack):/);
    if (b) { bucket = b[1].replace('_stack', ''); continue; }
    if (/^\w/.test(line)) { bucket = null; continue; }
    const t = line.match(/^\s+-\s+tool:\s*(.+)$/);
    if (t && bucket) buckets[bucket].push(t[1].trim());
  }
  md.set(handle.toLowerCase(), { file: f, publish, buckets });
}

// ── Turso ──
const users = (await client.execute('SELECT id, name, email, github_handle FROM User')).rows;
const stacks = (await client.execute('SELECT handle, bucket, tool FROM Stack')).rows;

const dbHandles = new Set(users.map(u => (u.github_handle ?? '').toLowerCase()).filter(Boolean));
const dbStackByHandle = new Map();
for (const r of stacks) {
  const h = String(r.handle).toLowerCase();
  if (!dbStackByHandle.has(h)) dbStackByHandle.set(h, { current: [], aspirational: [], abandoned: [] });
  dbStackByHandle.get(h)[r.bucket]?.push(r.tool);
}

console.log(`markdown participants: ${md.size}   (published: ${[...md.values()].filter(p=>p.publish).length})`);
console.log(`Turso User rows:       ${users.length}   (with github_handle: ${dbHandles.size})`);
console.log(`Turso Stack rows:      ${stacks.length}  across ${dbStackByHandle.size} handles`);

const mdWithStack = [...md.entries()].filter(([,p]) =>
  p.buckets.current.length + p.buckets.aspirational.length + p.buckets.abandoned.length > 0);
console.log(`\nmd files with a non-empty stack: ${mdWithStack.length}`);

console.log(`\n=== md has stack entries, Turso has NO Stack rows for that handle ===`);
let n = 0;
for (const [h, p] of mdWithStack) {
  if (!dbStackByHandle.has(h)) {
    const c = p.buckets.current.length, a = p.buckets.aspirational.length, x = p.buckets.abandoned.length;
    console.log(`  ${h.padEnd(24)} md: ${c}c/${a}a/${x}b   userRow: ${dbHandles.has(h) ? 'yes' : 'NO'}`);
    n++;
  }
}
if (!n) console.log('  (none)');

console.log(`\n=== handles in BOTH — per-tool drift ===`);
for (const [h, p] of mdWithStack) {
  const d = dbStackByHandle.get(h);
  if (!d) continue;
  for (const b of ['current', 'aspirational', 'abandoned']) {
    const inMd = p.buckets[b], inDb = d[b];
    const onlyMd = inMd.filter(t => !inDb.includes(t));
    const onlyDb = inDb.filter(t => !inMd.includes(t));
    if (onlyMd.length || onlyDb.length) {
      console.log(`  ${h} [${b}]`);
      if (onlyMd.length) console.log(`      md only: ${onlyMd.join(', ')}`);
      if (onlyDb.length) console.log(`      db only: ${onlyDb.join(', ')}`);
    }
  }
}

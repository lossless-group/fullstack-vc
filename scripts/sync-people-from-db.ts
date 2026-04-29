// scripts/sync-people-from-db.ts — materialize participant markdown stubs
// from User rows in Turso.
//
// The /people page renders from src/content/participants/*.md, but accounts
// are recorded in Turso's User table on each successful OAuth login. New
// signups don't appear on /people until a markdown file exists for them.
// This script bridges that: for each User row without a matching markdown
// file, write a stub participant entry under src/content/participants/.
//
// Default mode is DRY-RUN (lists what would be created). Set WRITE=true to
// actually create files.
//
// Usage:
//   pnpm astro db execute scripts/sync-people-from-db.ts --remote                # dry run
//   WRITE=true pnpm astro db execute scripts/sync-people-from-db.ts --remote    # write files
//   WRITE=true PUBLIC=true pnpm astro db execute scripts/sync-people-from-db.ts --remote
//                                                                                # write + default public_profile: true
//
// After writing, review the files under src/content/participants/, then
// `git add` and commit. The /people page picks them up on next build.

import { db, User } from 'astro:db';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PARTICIPANTS_DIR = path.resolve(process.cwd(), 'src/content/participants');
const WRITE = process.env.WRITE === 'true';
const DEFAULT_PUBLIC = process.env.PUBLIC === 'true';

// ─── Handle derivation ─────────────────────────────────────────────────────
// Mirror the convention used by /api/stack/save: GitHub users keep their
// handle; LinkedIn-only users get email-local-part with dots stripped.
function deriveHandle(row: typeof User.$inferSelect): string {
  if (row.github_handle) return row.github_handle.toLowerCase();
  if (row.email) {
    const local = row.email.split('@')[0] ?? '';
    return local.replace(/\./g, '').toLowerCase();
  }
  if (row.linkedin_sub) return `linkedin-${row.linkedin_sub.slice(0, 12)}`.toLowerCase();
  return row.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

// ─── YAML emit (small, only the shapes we produce) ─────────────────────────
function yamlStr(v: string): string {
  if (/^[\w./@:-]+$/.test(v) && !['true','false','null','yes','no','on','off'].includes(v.toLowerCase())) {
    return v;
  }
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function emit(key: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return `${key}: ${yamlStr(value)}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${key}: ${value}`;
  if (value instanceof Date) return `${key}: ${value.toISOString().slice(0, 10)}`;
  return null;
}

function buildStub(row: typeof User.$inferSelect, handle: string): string {
  const lines: string[] = ['---'];
  const push = (line: string | null) => { if (line) lines.push(line); };

  push(emit('handle', handle));
  push(emit('name', row.name ?? handle));
  push(emit('firm', row.firm));
  push(emit('kauffman_class', row.kauffman_class));

  if (row.github_handle) {
    push(emit('github', `https://github.com/${row.github_handle}`));
    if (row.avatar) push(emit('github_avatar', row.avatar));
  }
  // No reliable LinkedIn profile URL is recoverable from the OIDC `sub`,
  // so linkedin_sub is intentionally not surfaced as a `linkedin:` URL.
  // Add it manually if you know the user's vanity URL.

  push(`public_profile: ${DEFAULT_PUBLIC ? 'true' : 'false'}`);
  push(emit('joined_dojo', row.first_login_at ?? row.created_at));

  // Empty stack arrays — the user fills these in via /people/{handle}/stack/edit.
  lines.push('current_stack: []');
  lines.push('aspirational_stack: []');
  lines.push('abandoned_stack: []');

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

if (!fs.existsSync(PARTICIPANTS_DIR)) {
  fs.mkdirSync(PARTICIPANTS_DIR, { recursive: true });
}

const existing = new Set(
  fs.readdirSync(PARTICIPANTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.slice(0, -3).toLowerCase()),
);

const rows = await db.select().from(User).all();
rows.sort((a, b) => {
  const ta = a.first_login_at?.getTime() ?? 0;
  const tb = b.first_login_at?.getTime() ?? 0;
  return ta - tb;
});

console.log('');
console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY-RUN (set WRITE=true to create files)'}`);
console.log(`Default public_profile: ${DEFAULT_PUBLIC}`);
console.log(`Participants dir: ${path.relative(process.cwd(), PARTICIPANTS_DIR)}`);
console.log(`User rows in Turso: ${rows.length}`);
console.log('');

let created = 0;
let skipped = 0;
const collisions: { handle: string; existingFile: string; row: string }[] = [];

for (const row of rows) {
  const handle = deriveHandle(row);
  const filePath = path.join(PARTICIPANTS_DIR, `${handle}.md`);
  const display = row.name ?? row.email ?? row.id;

  if (existing.has(handle)) {
    console.log(`  skip   ${handle.padEnd(28)}  ${display}  (already has ${handle}.md)`);
    skipped++;
    continue;
  }

  // Defensive: in case derived handles collide (e.g., two users with the
  // same email-local-part across different domains). The sort above is
  // ascending, so the EARLIER login wins the handle.
  if (collisions.find(c => c.handle === handle)) {
    console.log(`  COLLISION  ${handle}  ${display}  — handle already used by an earlier row`);
    continue;
  }

  console.log(`  ${WRITE ? 'WRITE' : 'WOULD'}  ${handle.padEnd(28)}  ${display}  →  ${path.relative(process.cwd(), filePath)}`);
  if (WRITE) {
    fs.writeFileSync(filePath, buildStub(row, handle), 'utf8');
  }
  created++;
}

console.log('');
console.log(`${created} stub${created === 1 ? '' : 's'} ${WRITE ? 'created' : 'would be created'}, ${skipped} already on site.`);
if (WRITE && created > 0) {
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Review files under src/content/participants/ — adjust names, add LinkedIn URLs, etc.`);
  console.log(`  2. To make a profile appear on /people, set public_profile: true in its frontmatter.`);
  console.log(`  3. git add src/content/participants && git commit && push.`);
  console.log(`  4. Each user can later edit their own stack at /people/{handle}/stack/edit.`);
}
console.log('');

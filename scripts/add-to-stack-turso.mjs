// scripts/add-to-stack-turso.mjs
//
// Adds a single tool to a user's stack bucket — writing DIRECTLY to Turso over
// @libsql/client, with no @astrojs/db involvement.
//
// Why this exists alongside scripts/add-to-stack.ts: Astro DB is being
// deprecated, so the `astro db execute` path (and the scripts/db-execute.mjs
// shim that keeps it limping along under Astro 7) is a dead end. Turso is the
// authoritative store either way — this talks to it the way the underscore
// diagnostics already do (see scripts/_inspect-turso.mjs), reading creds from
// .env. Same table, same row shape, same idempotency guarantee.
//
// Idempotent: the Stack table has a unique index on (user_id, bucket, tool),
// so a repeat run reports the existing row and exits without writing.
//
// Run:
//   USER_MATCH=mpstaton TOOL=aside BUCKET=current pnpm add:stack:turso
//   DRY_RUN=true USER_MATCH=mpstaton TOOL=comet BUCKET=aspirational pnpm add:stack:turso
//
// Env vars:
//   USER_MATCH — required. Substring matched (case-insensitive) against
//                User.id / .email / .name / .github_handle. Must match exactly 1.
//   TOOL       — required. Tool slug (matches src/content/tools/<slug>.md).
//                No FK constraint — but create the registry md first so the
//                slug resolves on /people/<handle>.
//   BUCKET     — optional. 'current' | 'aspirational' | 'abandoned'. Default 'current'.
//   NOTES      — optional. Free text (current bucket).
//   INTENT     — optional. Free text (aspirational bucket).
//   REASON     — optional. Free text (abandoned bucket).
//   ADDED      — optional. ISO date for the current bucket's `added` field.
//   DRY_RUN=true — resolve + report, write nothing.
//
// After writing, materialize to markdown:
//   HANDLE=<handle> pnpm sync:stacks:turso

import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};

const USER_MATCH = process.env.USER_MATCH ?? '';
const TOOL = process.env.TOOL ?? '';
const BUCKET = (process.env.BUCKET ?? 'current').toLowerCase();
const NOTES = process.env.NOTES || null;
const INTENT = process.env.INTENT || null;
const REASON = process.env.REASON || null;
const ADDED = process.env.ADDED || null;
const DRY_RUN = process.env.DRY_RUN === 'true';

const VALID_BUCKETS = ['current', 'aspirational', 'abandoned'];

if (!USER_MATCH || !TOOL) {
  console.error('Usage: USER_MATCH=<substr> TOOL=<slug> [BUCKET=current] pnpm add:stack:turso');
  console.error('       Add DRY_RUN=true to preview without writing.');
  process.exit(1);
}
if (!VALID_BUCKETS.includes(BUCKET)) {
  console.error(`BUCKET must be one of: ${VALID_BUCKETS.join(' | ')} — got "${BUCKET}"`);
  process.exit(1);
}

const client = createClient({
  url: getEnv('TURSO_DATABASE_URL'),
  authToken: getEnv('TURSO_AUTH_TOKEN'),
});

console.log(`add-to-stack-turso ${DRY_RUN ? '(DRY RUN — nothing will be written)' : ''}`);
console.log('');

// ── Resolve the user ────────────────────────────────────────────────────────
const needle = `%${USER_MATCH.toLowerCase()}%`;
const users = await client.execute({
  sql: `SELECT id, name, email, github_handle FROM User
        WHERE LOWER(id) LIKE ? OR LOWER(email) LIKE ?
           OR LOWER(COALESCE(name,'')) LIKE ? OR LOWER(COALESCE(github_handle,'')) LIKE ?`,
  args: [needle, needle, needle, needle],
});

if (users.rows.length === 0) {
  console.error(`No user matched "${USER_MATCH}".`);
  process.exit(1);
}
if (users.rows.length > 1) {
  console.error(`"${USER_MATCH}" matched ${users.rows.length} users — narrow it:`);
  for (const u of users.rows) console.error(`  · ${u.id}  (${u.name ?? 'no name'}, @${u.github_handle ?? '—'})`);
  process.exit(1);
}

const user = users.rows[0];
const handle = user.github_handle;
if (!handle) {
  console.error(`User ${user.id} has no github_handle — Stack.handle would be null. Fix the User row first.`);
  process.exit(1);
}
console.log(`User:   ${user.id}  (${user.name}, @${handle})`);
console.log(`Tool:   ${TOOL}`);
console.log(`Bucket: ${BUCKET}`);

// ── Idempotency check ───────────────────────────────────────────────────────
const dupe = await client.execute({
  sql: `SELECT id, position FROM Stack WHERE user_id = ? AND bucket = ? AND tool = ?`,
  args: [user.id, BUCKET, TOOL],
});
if (dupe.rows.length > 0) {
  console.log('');
  console.log(`· Already present — Stack row #${dupe.rows[0].id} at position ${dupe.rows[0].position}. Nothing written.`);
  process.exit(0);
}

// ── Next position within the bucket ─────────────────────────────────────────
const maxPos = await client.execute({
  sql: `SELECT MAX(position) AS maxpos FROM Stack WHERE user_id = ? AND bucket = ?`,
  args: [user.id, BUCKET],
});
const position = (maxPos.rows[0]?.maxpos ?? -1) + 1;
const now = new Date().toISOString();

console.log(`Position: ${position}`);
if (NOTES) console.log(`Notes:  ${NOTES}`);
if (INTENT) console.log(`Intent: ${INTENT}`);
if (REASON) console.log(`Reason: ${REASON}`);
if (ADDED) console.log(`Added:  ${ADDED}`);

if (DRY_RUN) {
  console.log('');
  console.log('DRY RUN — would INSERT the row above. Re-run without DRY_RUN to write.');
  process.exit(0);
}

// ── Write ───────────────────────────────────────────────────────────────────
// `id` is an INTEGER PRIMARY KEY (rowid alias) — omitted so SQLite assigns it.
await client.execute({
  sql: `INSERT INTO Stack
          (user_id, handle, bucket, tool, position, notes, intent, reason, added, abandoned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  args: [
    user.id,
    handle,
    BUCKET,
    TOOL,
    position,
    BUCKET === 'current' ? NOTES : null,
    BUCKET === 'aspirational' ? INTENT : null,
    BUCKET === 'abandoned' ? REASON : null,
    BUCKET === 'current' && ADDED ? new Date(ADDED).toISOString() : null,
    now,
    now,
  ],
});

const written = await client.execute({
  sql: `SELECT id FROM Stack WHERE user_id = ? AND bucket = ? AND tool = ?`,
  args: [user.id, BUCKET, TOOL],
});

console.log('');
console.log(`✓ Wrote Stack row #${written.rows[0]?.id} — ${handle} / ${BUCKET} / ${TOOL}`);
console.log(`  Next: HANDLE=${handle} pnpm sync:stacks:turso   (materialize to participants/${handle}.md)`);

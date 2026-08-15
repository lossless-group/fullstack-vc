// scripts/sync-stacks-turso.mjs — Turso → markdown materialization, direct.
//
// Direct-@libsql/client port of scripts/sync-stacks.ts, written because Astro
// DB is being deprecated and the `astro db execute` path is a dead end. Turso
// stays authoritative for stacks; this rewrites the three stack arrays in each
// participants/<handle>.md frontmatter and preserves everything else (all other
// frontmatter fields AND the body).
//
// The serialization helpers below are ported VERBATIM from sync-stacks.ts so
// output stays byte-identical to the existing materializer — if you change one,
// change both (or retire the old one).
//
// Usage:
//   HANDLE=mpstaton pnpm sync:stacks:turso               (one handle)
//   ALL=true pnpm sync:stacks:turso                      (every handle with Stack rows)
//   DRY_RUN=true HANDLE=mpstaton pnpm sync:stacks:turso  (preview)
//
// The operator commits the resulting markdown manually with a
// `materialize(stacks): snapshot from Turso YYYY-MM-DD` message so it's
// visually distinct from editorial commits in git log.

import { createClient } from '@libsql/client';
import * as fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const getEnv = (k) => {
  const m = envFile.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};

const handleEnv = process.env.HANDLE;
const allEnv = process.env.ALL === 'true';
const dryRun = process.env.DRY_RUN === 'true';

if (!handleEnv && !allEnv) {
  console.error('Usage: HANDLE=<handle> pnpm sync:stacks:turso   OR   ALL=true pnpm sync:stacks:turso');
  console.error('       Add DRY_RUN=true to preview without writing.');
  process.exit(1);
}

const client = createClient({
  url: getEnv('TURSO_DATABASE_URL'),
  authToken: getEnv('TURSO_AUTH_TOKEN'),
});

console.log(`sync-stacks-turso ${dryRun ? '(DRY RUN)' : ''}`);
console.log('');

let handles;
if (handleEnv) {
  handles = [handleEnv];
} else {
  const rows = await client.execute(`SELECT DISTINCT handle FROM Stack`);
  handles = rows.rows.map((r) => r.handle);
  console.log(`ALL mode: ${handles.length} handle(s) with Stack rows.`);
}

const participantsDir = path.resolve(process.cwd(), 'src/content/participants');

const summary = {
  handles_seen: handles.length,
  handles_written: 0,
  handles_skipped_no_file: 0,
  handles_unchanged: 0,
  total_current: 0,
  total_aspirational: 0,
  total_abandoned: 0,
};

for (const handle of handles) {
  const filePath = path.join(participantsDir, `${handle}.md`);
  let existing;
  try {
    existing = await fs.readFile(filePath, 'utf-8');
  } catch {
    summary.handles_skipped_no_file++;
    console.log(`  · ${handle}: no markdown file at ${filePath} — skipped`);
    continue;
  }

  const res = await client.execute({
    sql: `SELECT * FROM Stack WHERE handle = ? ORDER BY bucket ASC, position ASC`,
    args: [handle],
  });
  const stackRows = res.rows;

  const current = stackRows.filter((r) => r.bucket === 'current');
  const aspirational = stackRows.filter((r) => r.bucket === 'aspirational');
  const abandoned = stackRows.filter((r) => r.bucket === 'abandoned');

  summary.total_current += current.length;
  summary.total_aspirational += aspirational.length;
  summary.total_abandoned += abandoned.length;

  const updated = rewriteThreeArrays(existing, {
    current_stack: emitItemArray('current_stack', current.map(rowToCurrent)),
    aspirational_stack: emitItemArray('aspirational_stack', aspirational.map(rowToAspirational)),
    abandoned_stack: emitItemArray('abandoned_stack', abandoned.map(rowToAbandoned)),
  });

  if (updated === existing) {
    summary.handles_unchanged++;
    console.log(`  · ${handle}: no change (markdown already matches Turso)`);
    continue;
  }

  if (dryRun) {
    console.log(`  · ${handle}: would write ${current.length}/${aspirational.length}/${abandoned.length} (current/aspirational/abandoned)`);
    continue;
  }

  await fs.writeFile(filePath, updated, 'utf-8');
  summary.handles_written++;
  console.log(`  ✓ ${handle}: wrote ${current.length}/${aspirational.length}/${abandoned.length} (current/aspirational/abandoned)`);
}

console.log('');
console.log('───────────────────────────────────────────────────');
console.log(`Handles processed:        ${summary.handles_seen}`);
console.log(`  written:                ${summary.handles_written}`);
console.log(`  unchanged:              ${summary.handles_unchanged}`);
console.log(`  skipped (no file):      ${summary.handles_skipped_no_file}`);
console.log(`Total current rows:       ${summary.total_current}`);
console.log(`Total aspirational rows:  ${summary.total_aspirational}`);
console.log(`Total abandoned rows:     ${summary.total_abandoned}`);
if (!dryRun && summary.handles_written > 0) {
  const today = new Date().toISOString().slice(0, 10);
  console.log('');
  console.log(`Commit with:  materialize(stacks): snapshot from Turso ${today}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ported verbatim from scripts/sync-stacks.ts — keep in sync.

function rowToCurrent(r) {
  const item = { tool: r.tool };
  if (r.added) item.added = new Date(r.added).toISOString().slice(0, 10);
  if (r.notes) item.notes = r.notes;
  return item;
}
function rowToAspirational(r) {
  const item = { tool: r.tool };
  if (r.intent) item.intent = r.intent;
  return item;
}
function rowToAbandoned(r) {
  const item = { tool: r.tool };
  if (r.abandoned) item.abandoned = new Date(r.abandoned).toISOString().slice(0, 10);
  if (r.reason) item.reason = r.reason;
  return item;
}

function yamlStr(v) {
  if (/^[\w./@:-]+$/.test(v) && !['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(v.toLowerCase())) {
    return v;
  }
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function emitItemArray(key, arr) {
  if (arr.length === 0) return `${key}: []`;
  const lines = [`${key}:`];
  for (const item of arr) {
    const fieldLines = [];
    for (const [k, v] of Object.entries(item)) {
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'string') fieldLines.push(`    ${k}: ${yamlStr(v)}`);
      else if (typeof v === 'number' || typeof v === 'boolean') fieldLines.push(`    ${k}: ${v}`);
    }
    if (fieldLines.length === 0) continue;
    fieldLines[0] = fieldLines[0].replace(/^ {4}/, '  - ');
    lines.push(...fieldLines);
  }
  return lines.join('\n');
}

function rewriteThreeArrays(source, replacements) {
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(source);
  if (!fmMatch) return source;
  const fmStart = fmMatch.index;
  const fmEnd = fmMatch.index + fmMatch[0].length;
  let frontmatter = fmMatch[1];
  for (const [key, replacement] of Object.entries(replacements)) {
    frontmatter = replaceArrayKey(frontmatter, key, replacement);
  }
  return source.slice(0, fmStart) + '---\n' + frontmatter + '\n---' + source.slice(fmEnd);
}

function replaceArrayKey(fm, key, replacement) {
  const inlineRe = new RegExp(`^${key}:\\s*\\[\\]\\s*$`, 'm');
  if (inlineRe.test(fm)) return fm.replace(inlineRe, replacement);
  const blockRe = new RegExp(`^${key}:\\s*\\n((?:[ \\t]+.*\\n?)+)`, 'm');
  if (blockRe.test(fm)) return fm.replace(blockRe, replacement + '\n');
  return fm.trimEnd() + '\n' + replacement;
}

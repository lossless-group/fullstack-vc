// scripts/sync-stacks.ts — DB → markdown materialization for participant stacks.
//
// Reads Turso (authoritative for stacks since the migration), rewrites the
// three stack arrays in each participants/<handle>.md frontmatter, and
// preserves everything else (name, firm, role, headshot, all non-stack
// frontmatter fields, AND the body). Same shape as scripts/sync-session.ts
// for polls — generalizes the polling blueprint v2 §9 materialization motion.
//
// Usage:
//   HANDLE=mpstaton pnpm sync:stacks               (one handle)
//   ALL=true pnpm sync:stacks                      (every handle with Stack rows)
//   DRY_RUN=true HANDLE=mpstaton pnpm sync:stacks  (preview)
//
// Run via:
//   astro db execute scripts/sync-stacks.ts [--remote]
//
// The operator commits the resulting markdown changes manually with a
// `materialize(stacks): snapshot from Turso YYYY-MM-DD` message so they're
// visually distinct from editorial commits in git log.

import { db, Stack, asc, eq } from 'astro:db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const handleEnv = process.env.HANDLE;
const allEnv = process.env.ALL === 'true';
const dryRun = process.env.DRY_RUN === 'true';

if (!handleEnv && !allEnv) {
  console.error('Usage: HANDLE=<handle> pnpm sync:stacks   OR   ALL=true pnpm sync:stacks');
  console.error('       Add DRY_RUN=true to preview without writing.');
  process.exit(1);
}

console.log(`sync-stacks ${dryRun ? '(DRY RUN)' : ''}`);
console.log('');

// Figure out which handles to sync.
let handles: string[];
if (handleEnv) {
  handles = [handleEnv];
} else {
  const rows = await db.select().from(Stack).all();
  handles = Array.from(new Set(rows.map(r => r.handle)));
  console.log(`ALL mode: ${handles.length} handle(s) with Stack rows.`);
}

const participantsDir = path.resolve(process.cwd(), 'src/content/participants');

let summary = {
  handles_seen: handles.length,
  handles_written: 0,
  handles_skipped_no_file: 0,
  handles_unchanged: 0,
  total_current: 0,
  total_aspirational: 0,
  total_abandoned: 0,
};
const skipped: string[] = [];

for (const handle of handles) {
  const filePath = path.join(participantsDir, `${handle}.md`);
  let existing: string;
  try {
    existing = await fs.readFile(filePath, 'utf-8');
  } catch {
    summary.handles_skipped_no_file++;
    skipped.push(handle);
    console.log(`  · ${handle}: no markdown file at ${filePath} — skipped (operator can create the stub later)`);
    continue;
  }

  // Pull this handle's Stack rows, sorted by bucket then position.
  const stackRows = await db.select().from(Stack)
    .where(eq(Stack.handle, handle))
    .orderBy(asc(Stack.bucket), asc(Stack.position))
    .all();

  const current      = stackRows.filter(r => r.bucket === 'current');
  const aspirational = stackRows.filter(r => r.bucket === 'aspirational');
  const abandoned    = stackRows.filter(r => r.bucket === 'abandoned');

  summary.total_current      += current.length;
  summary.total_aspirational += aspirational.length;
  summary.total_abandoned    += abandoned.length;

  // Serialize the three arrays as YAML blocks.
  const currentYaml      = emitItemArray('current_stack',      current.map(rowToCurrent));
  const aspirationalYaml = emitItemArray('aspirational_stack', aspirational.map(rowToAspirational));
  const abandonedYaml    = emitItemArray('abandoned_stack',    abandoned.map(rowToAbandoned));

  // Surgical replace: each of the three arrays in the frontmatter gets swapped
  // for the freshly-serialized version. Everything outside those three blocks
  // (other frontmatter fields, the body, comments) is untouched.
  const updated = rewriteThreeArrays(existing, {
    current_stack: currentYaml,
    aspirational_stack: aspirationalYaml,
    abandoned_stack: abandonedYaml,
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

if (skipped.length > 0) {
  console.log('');
  console.log('Handles with no markdown file — the user has Stack rows in Turso but no participant stub:');
  for (const h of skipped) console.log(`  - ${h}`);
}

if (dryRun) {
  console.log('');
  console.log('(dry-run — no files written.)');
} else if (summary.handles_written > 0) {
  console.log('');
  console.log('Next: git commit the changes with the materialization convention:');
  console.log(`  git add src/content/participants && git commit -m "materialize(stacks): snapshot from Turso $(date -u +%Y-%m-%dT%H:%M:%SZ)"`);
}

// ────────────────────────────────────────────────────────────────────────────
// Row → frontmatter-item conversion. Strips null/empty fields so the markdown
// stays clean (no `notes: null` noise).

function rowToCurrent(r: typeof Stack.$inferSelect) {
  const item: Record<string, unknown> = { tool: r.tool };
  if (r.added) item.added = new Date(r.added).toISOString().slice(0, 10);
  if (r.notes) item.notes = r.notes;
  return item;
}
function rowToAspirational(r: typeof Stack.$inferSelect) {
  const item: Record<string, unknown> = { tool: r.tool };
  if (r.intent) item.intent = r.intent;
  return item;
}
function rowToAbandoned(r: typeof Stack.$inferSelect) {
  const item: Record<string, unknown> = { tool: r.tool };
  if (r.abandoned) item.abandoned = new Date(r.abandoned).toISOString().slice(0, 10);
  if (r.reason) item.reason = r.reason;
  return item;
}

// ────────────────────────────────────────────────────────────────────────────
// YAML emission for the three array blocks. Matches the style emitted by the
// pre-migration /api/stack/save (hand-rolled) so re-running this against a
// freshly-backfilled DB produces near-byte-identical markdown.

function yamlStr(v: string): string {
  if (/^[\w./@:-]+$/.test(v) && !['true','false','null','yes','no','on','off'].includes(v.toLowerCase())) {
    return v;
  }
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function emitItemArray(key: string, arr: Record<string, unknown>[]): string {
  if (arr.length === 0) return `${key}: []`;
  const lines = [`${key}:`];
  for (const item of arr) {
    const fieldLines: string[] = [];
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

// ────────────────────────────────────────────────────────────────────────────
// Surgical frontmatter rewrite. Finds each of the three array keys in the
// frontmatter block (handles `current_stack: []` shorthand AND multi-line
// `current_stack:\n  - tool: x` form) and swaps in the freshly-serialized
// block. Anything outside those three regions (other frontmatter, the body)
// is preserved verbatim.

function rewriteThreeArrays(source: string, replacements: Record<string, string>): string {
  // Isolate the frontmatter block.
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(source);
  if (!fmMatch) {
    // No frontmatter? Nothing safe to do — bail out unchanged so the operator
    // notices and decides how to handle it.
    return source;
  }
  const fmStart = fmMatch.index!;
  const fmEnd = fmMatch.index! + fmMatch[0].length;
  let frontmatter = fmMatch[1];

  for (const [key, replacement] of Object.entries(replacements)) {
    frontmatter = replaceArrayKey(frontmatter, key, replacement);
  }

  return source.slice(0, fmStart) + '---\n' + frontmatter + '\n---' + source.slice(fmEnd);
}

// Match a frontmatter key whose value is either an inline `[]` OR a block of
// `  - ` lines. Replace it with the given replacement (already includes the
// `key:` prefix).
function replaceArrayKey(fm: string, key: string, replacement: string): string {
  // First try inline `key: []`
  const inlineRe = new RegExp(`^${key}:\\s*\\[\\]\\s*$`, 'm');
  if (inlineRe.test(fm)) {
    return fm.replace(inlineRe, replacement);
  }

  // Multi-line form: `key:` followed by indented `- ` block, ending at the
  // next top-level key or end-of-frontmatter.
  const blockRe = new RegExp(
    `^${key}:\\s*\\n((?:[ \\t]+.*\\n?)+)`,
    'm',
  );
  if (blockRe.test(fm)) {
    return fm.replace(blockRe, replacement + '\n');
  }

  // Key missing entirely — append it at the bottom of the frontmatter.
  return fm.trimEnd() + '\n' + replacement;
}

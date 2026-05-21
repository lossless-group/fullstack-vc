// scripts/migrate-stacks-to-turso.ts — one-time backfill of stack data from
// participants/*.md frontmatter into the Stack table in Turso.
//
// Idempotent: deletes existing Stack rows for each user before re-inserting,
// so re-running on the same source data produces the same Turso state. Safe
// to run repeatedly during development of the migration.
//
// Position is assigned by source-array order — i.e. whatever the markdown
// listed first becomes position 0, the second item position 1, etc. After
// this migration the user-controlled order propagates back via the sync
// script which writes by `position`.
//
// User-row matching: by github_handle (which is the participant filename slug
// today). If no User row exists for a handle, the script SKIPS that participant
// and reports it — it does not invent a User row, because Stack rows reference
// User.id and inventing identities would muddy the canonical-id resolver work.
//
// `astro db execute` doesn't forward CLI flags and can't resolve astro:content,
// so this script reads markdown files directly via fs and parses the small
// subset of YAML we need with focused regex.
//
// Usage:
//   pnpm migrate:stacks                       (writes to local .astro/content.db)
//   pnpm migrate:stacks:remote                (writes to production Turso)
//   DRY_RUN=true pnpm migrate:stacks:remote   (reports what would happen)
//
// Run via:
//   astro db execute scripts/migrate-stacks-to-turso.ts [--remote]

import { db, User, Stack, eq } from 'astro:db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const dryRun = process.env.DRY_RUN === 'true';

console.log(`migrate-stacks-to-turso ${dryRun ? '(DRY RUN)' : ''}`);
console.log('');

const participantsDir = path.resolve(process.cwd(), 'src/content/participants');
const files = (await fs.readdir(participantsDir)).filter(f => f.endsWith('.md'));
console.log(`Loaded ${files.length} participant markdown file(s).`);

let summary = {
  participants_seen: files.length,
  participants_with_user_row: 0,
  participants_skipped_no_user_row: 0,
  current_rows: 0,
  aspirational_rows: 0,
  abandoned_rows: 0,
};
const skipped: string[] = [];
const parseErrors: string[] = [];

const now = new Date();

for (const file of files) {
  const filePath = path.join(participantsDir, file);
  const content = await fs.readFile(filePath, 'utf-8');
  const fm = parseParticipantFrontmatter(content);

  if (!fm.handle) {
    parseErrors.push(`${file}: no handle field`);
    continue;
  }
  const handle = fm.handle;

  // Lookup by github_handle (the participant slug today).
  const user = await db.select().from(User).where(eq(User.github_handle, handle)).get();
  if (!user) {
    summary.participants_skipped_no_user_row++;
    skipped.push(handle);
    continue;
  }
  summary.participants_with_user_row++;

  const rowsToInsert: Array<typeof Stack.$inferInsert> = [];

  fm.current_stack.forEach((s, i) => {
    rowsToInsert.push({
      user_id: user.id,
      handle,
      bucket: 'current',
      tool: s.tool,
      position: i,
      notes: s.notes ?? null,
      intent: null,
      reason: null,
      added: s.added ? new Date(s.added) : null,
      abandoned: null,
      created_at: now,
      updated_at: now,
    });
  });

  fm.aspirational_stack.forEach((s, i) => {
    rowsToInsert.push({
      user_id: user.id,
      handle,
      bucket: 'aspirational',
      tool: s.tool,
      position: i,
      notes: null,
      // Some legacy files use `notes` in aspirational entries; accept it
      // as intent if no explicit intent is present.
      intent: s.intent ?? s.notes ?? null,
      reason: null,
      added: null,
      abandoned: null,
      created_at: now,
      updated_at: now,
    });
  });

  fm.abandoned_stack.forEach((s, i) => {
    rowsToInsert.push({
      user_id: user.id,
      handle,
      bucket: 'abandoned',
      tool: s.tool,
      position: i,
      notes: null,
      intent: null,
      reason: s.reason ?? null,
      added: null,
      abandoned: s.abandoned ? new Date(s.abandoned) : null,
      created_at: now,
      updated_at: now,
    });
  });

  summary.current_rows      += fm.current_stack.length;
  summary.aspirational_rows += fm.aspirational_stack.length;
  summary.abandoned_rows    += fm.abandoned_stack.length;

  if (rowsToInsert.length === 0) {
    console.log(`  · ${handle}: no stack entries — skipped`);
    continue;
  }

  if (dryRun) {
    console.log(`  · ${handle}: would write ${rowsToInsert.length} row(s) (${fm.current_stack.length} current, ${fm.aspirational_stack.length} aspirational, ${fm.abandoned_stack.length} abandoned)`);
    continue;
  }

  // Idempotency: wipe this user's existing Stack rows first, then insert fresh.
  await db.delete(Stack).where(eq(Stack.user_id, user.id));
  await db.insert(Stack).values(rowsToInsert);
  console.log(`  ✓ ${handle}: wrote ${rowsToInsert.length} row(s)`);
}

console.log('');
console.log('───────────────────────────────────────────────────');
console.log(`Participants seen:                  ${summary.participants_seen}`);
console.log(`  with User row (migrated):         ${summary.participants_with_user_row}`);
console.log(`  skipped (no User row):            ${summary.participants_skipped_no_user_row}`);
console.log(`Current-bucket rows:                ${summary.current_rows}`);
console.log(`Aspirational-bucket rows:           ${summary.aspirational_rows}`);
console.log(`Abandoned-bucket rows:              ${summary.abandoned_rows}`);
console.log(`Total Stack rows:                   ${summary.current_rows + summary.aspirational_rows + summary.abandoned_rows}`);

if (skipped.length > 0) {
  console.log('');
  console.log('Skipped (no User row yet — they need to OAuth in once before their stack migrates):');
  for (const h of skipped) console.log(`  - ${h}`);
}

if (parseErrors.length > 0) {
  console.log('');
  console.log('Parse errors:');
  for (const e of parseErrors) console.log(`  - ${e}`);
}

if (dryRun) {
  console.log('');
  console.log('(dry-run — no changes written.)');
}

// ────────────────────────────────────────────────────────────────────────────
// Minimal YAML frontmatter parser scoped to the participant shape we have:
//   handle: <scalar>
//   current_stack:
//     - tool: <slug>
//       added: <ISO date>
//       notes: "<string>"
//   aspirational_stack: []          (inline empty form)
//   abandoned_stack:
//     - tool: <slug>
//       abandoned: <ISO date>
//       reason: "<string>"
// Not a general YAML parser. Skips unknown structures.

interface ParsedFrontmatter {
  handle: string | null;
  current_stack: Array<{ tool: string; added?: string; notes?: string }>;
  aspirational_stack: Array<{ tool: string; intent?: string; notes?: string }>;
  abandoned_stack: Array<{ tool: string; abandoned?: string; reason?: string }>;
}

function parseParticipantFrontmatter(content: string): ParsedFrontmatter {
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!fmMatch) {
    return { handle: null, current_stack: [], aspirational_stack: [], abandoned_stack: [] };
  }
  const fm = fmMatch[1];

  // Scalar fields.
  const handleMatch = /^handle:\s*(.+)$/m.exec(fm);
  const handle = handleMatch ? unquote(handleMatch[1].trim()) : null;

  return {
    handle,
    current_stack:      parseArrayBlock(fm, 'current_stack') as any,
    aspirational_stack: parseArrayBlock(fm, 'aspirational_stack') as any,
    abandoned_stack:    parseArrayBlock(fm, 'abandoned_stack') as any,
  };
}

function parseArrayBlock(fm: string, key: string): Array<Record<string, string>> {
  // Inline empty form: `key: []`
  const inlineRe = new RegExp(`^${key}:\\s*\\[\\]\\s*$`, 'm');
  if (inlineRe.test(fm)) return [];

  // Block form: `key:\n  - field: value\n    field2: value2\n  - field: value\n...`
  // The block ends at the next top-level key (no leading whitespace) OR end of frontmatter.
  const lines = fm.split('\n');
  const startIdx = lines.findIndex(l => new RegExp(`^${key}:\\s*$`).test(l));
  if (startIdx < 0) return [];

  // Collect lines after the key line, stopping at the next top-level key.
  const blockLines: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    // Top-level key (no indent, has a colon, not a list item)
    if (/^[a-zA-Z_]/.test(line)) break;
    blockLines.push(line);
  }

  // Split into items at lines beginning with `  - field:` or `- field:`.
  const items: Array<Record<string, string>> = [];
  let current: Record<string, string> | null = null;
  for (const line of blockLines) {
    const itemStart = /^\s*-\s+([a-zA-Z_][a-zA-Z0-9_]*?):\s*(.*)$/.exec(line);
    if (itemStart) {
      if (current && Object.keys(current).length > 0) items.push(current);
      current = {};
      const val = itemStart[2].trim();
      if (val) current[itemStart[1].trim()] = unquote(val);
      continue;
    }
    const fieldMatch = /^\s+([a-zA-Z_][a-zA-Z0-9_]*?):\s*(.*)$/.exec(line);
    if (fieldMatch && current) {
      const val = fieldMatch[2].trim();
      if (val) current[fieldMatch[1].trim()] = unquote(val);
    }
  }
  if (current && Object.keys(current).length > 0) items.push(current);
  return items;
}

function unquote(v: string): string {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return v;
}

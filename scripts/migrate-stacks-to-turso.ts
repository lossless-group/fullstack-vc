// scripts/migrate-stacks-to-turso.ts — one-time backfill of stack data from
// participants/*.md frontmatter into the Stack table in Turso.
//
// Idempotent: deletes existing Stack rows for each handle before re-inserting,
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
// Usage:
//   pnpm migrate:stacks            (writes to local .astro/content.db)
//   pnpm migrate:stacks --remote   (writes to production Turso)
//   pnpm migrate:stacks --dry-run  (reports what would happen; no writes)
//
// Run via:
//   astro db execute scripts/migrate-stacks-to-turso.ts [--remote]

import { db, User, Stack, eq } from 'astro:db';
import { getCollection } from 'astro:content';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log(`migrate-stacks-to-turso ${dryRun ? '(DRY RUN)' : ''}`);
console.log('');

const participants = await getCollection('participants');
console.log(`Loaded ${participants.length} participant(s) from markdown.`);

let summary = {
  participants_seen: participants.length,
  participants_with_user_row: 0,
  participants_skipped_no_user_row: 0,
  current_rows: 0,
  aspirational_rows: 0,
  abandoned_rows: 0,
};
const skipped: string[] = [];

const now = new Date();

for (const p of participants) {
  const handle = p.data.handle;
  // The User row is keyed by canonical email; lookup by github_handle since
  // that's what matches the participant slug.
  const user = await db.select().from(User).where(eq(User.github_handle, handle)).get();
  if (!user) {
    summary.participants_skipped_no_user_row++;
    skipped.push(handle);
    continue;
  }
  summary.participants_with_user_row++;

  const current = p.data.current_stack ?? [];
  const aspirational = p.data.aspirational_stack ?? [];
  const abandoned = p.data.abandoned_stack ?? [];

  const rowsToInsert: Array<typeof Stack.$inferInsert> = [];

  current.forEach((s, i) => {
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

  aspirational.forEach((s, i) => {
    rowsToInsert.push({
      user_id: user.id,
      handle,
      bucket: 'aspirational',
      tool: s.tool,
      position: i,
      notes: null,
      intent: (s as any).intent ?? (s as any).notes ?? null,
      reason: null,
      added: null,
      abandoned: null,
      created_at: now,
      updated_at: now,
    });
  });

  abandoned.forEach((s, i) => {
    rowsToInsert.push({
      user_id: user.id,
      handle,
      bucket: 'abandoned',
      tool: s.tool,
      position: i,
      notes: null,
      intent: null,
      reason: (s as any).reason ?? null,
      added: null,
      abandoned: (s as any).abandoned ? new Date((s as any).abandoned) : null,
      created_at: now,
      updated_at: now,
    });
  });

  summary.current_rows += current.length;
  summary.aspirational_rows += aspirational.length;
  summary.abandoned_rows += abandoned.length;

  if (rowsToInsert.length === 0) {
    console.log(`  · ${handle}: no stack entries — skipped`);
    continue;
  }

  if (dryRun) {
    console.log(`  · ${handle}: would write ${rowsToInsert.length} row(s) (${current.length} current, ${aspirational.length} aspirational, ${abandoned.length} abandoned)`);
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

if (dryRun) {
  console.log('');
  console.log('(dry-run — no changes written.)');
}

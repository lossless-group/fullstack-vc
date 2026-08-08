// scripts/add-to-stack.ts
//
// Adds a single tool to a user's stack bucket. Used to seed someone else's
// stack on their behalf (e.g., adding Boardy to Mike Moradi's `current`
// when the host knows Mike's using it but Mike hasn't typed it in himself
// yet).
//
// Idempotent: if a row already exists for (user_id, bucket, tool) the script
// reports it and exits without writing — the unique_per_bucket index would
// reject the duplicate anyway.
//
// Run via:
//
//   USER_MATCH=moradi TOOL=boardy BUCKET=current pnpm add:stack:remote
//
// (Astro 7 dropped `astro db execute`, so this goes through the
// scripts/db-execute.mjs shim — which requires the default export below.
// Drop `:remote` to hit the local DB instead of Turso.)
//
// Env vars:
//   USER_MATCH — required. Lowercase substring matched against User.name
//                / .email / .id. Must match exactly 1 user.
//   TOOL       — required. Tool slug (matches src/content/tools/<slug>.md).
//                The tool md doesn't have to exist yet — Stack.tool is just
//                a text column, no FK constraint.
//   BUCKET     — optional. 'current' | 'aspirational' | 'abandoned'.
//                Defaults to 'current'.
//   NOTES      — optional. Free-text note (current bucket only).
//   INTENT     — optional. Free-text (aspirational bucket only).
//   REASON     — optional. Free-text (abandoned bucket only).
//   DRY_RUN=true — preview without writing.
//
// After running, optionally run `pnpm sync:stacks:remote HANDLE=<handle>` to
// materialize the Turso change back into the participant md file so the
// public /people/<handle> page reflects the new tool. Otherwise the change
// shows on the user's private edit view immediately but not on their public
// profile until a sync.

import { db, User, Stack, eq, and } from 'astro:db';

export default async function () {
  const USER_MATCH = process.env.USER_MATCH ?? '';
  const TOOL = process.env.TOOL ?? '';
  const BUCKET = (process.env.BUCKET ?? 'current').toLowerCase();
  const NOTES = process.env.NOTES ?? null;
  const INTENT = process.env.INTENT ?? null;
  const REASON = process.env.REASON ?? null;
  const DRY_RUN = process.env.DRY_RUN === 'true';

  if (!USER_MATCH || !TOOL) {
    console.error('USER_MATCH and TOOL env vars are required');
    process.exit(1);
  }
  if (!['current', 'aspirational', 'abandoned'].includes(BUCKET)) {
    console.error(`BUCKET must be one of: current, aspirational, abandoned (got: ${BUCKET})`);
    process.exit(1);
  }

  // ─── Find the user ─────────────────────────────────────────────────────────
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

  if (matches.length !== 1) {
    console.error(`Expected exactly 1 user match for "${USER_MATCH}", got ${matches.length}.`);
    for (const m of matches) console.error(`  - ${(m as any).name ?? '?'} (${m.id})`);
    process.exit(1);
  }

  const user = matches[0] as any;
  const handle = user.github_handle;
  if (!handle) {
    console.error(`User ${user.id} has no github_handle — required for Stack.handle. Run hookup-user.ts first to set it.`);
    process.exit(1);
  }

  console.log(`User: ${user.name ?? user.id} (handle: ${handle})`);
  console.log(`Adding tool '${TOOL}' to '${BUCKET}' bucket`);

  // ─── Check for existing row ────────────────────────────────────────────────
  const existing = await db
    .select()
    .from(Stack)
    .where(and(eq(Stack.user_id, user.id), eq(Stack.bucket, BUCKET), eq(Stack.tool, TOOL)))
    .get();
  if (existing) {
    console.log(`Row already exists (id: ${(existing as any).id}). Nothing to do.`);
    process.exit(0);
  }

  // ─── Find next position in this bucket ─────────────────────────────────────
  const bucketRows = await db
    .select()
    .from(Stack)
    .where(and(eq(Stack.user_id, user.id), eq(Stack.bucket, BUCKET)))
    .all();
  const maxPos = bucketRows.reduce((m: number, r: any) => Math.max(m, r.position ?? 0), -1);
  const nextPos = maxPos + 1;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const row: any = {
    user_id: user.id,
    handle,
    bucket: BUCKET,
    tool: TOOL,
    position: nextPos,
    created_at: now,
    updated_at: now,
  };
  if (BUCKET === 'current') {
    if (NOTES) row.notes = NOTES;
    row.added = new Date(today);
  } else if (BUCKET === 'aspirational') {
    if (INTENT) row.intent = INTENT;
  } else if (BUCKET === 'abandoned') {
    if (REASON) row.reason = REASON;
    row.abandoned = new Date(today);
  }

  console.log('');
  console.log(`${DRY_RUN ? '[DRY RUN] would insert' : 'Inserting'} Stack row:`);
  console.log(`  position: ${nextPos}`);
  console.log(`  tool:     ${TOOL}`);
  console.log(`  bucket:   ${BUCKET}`);
  if (BUCKET === 'current') console.log(`  added:    ${today}`);
  if (NOTES) console.log(`  notes:    ${NOTES}`);
  if (INTENT) console.log(`  intent:   ${INTENT}`);
  if (REASON) console.log(`  reason:   ${REASON}`);

  if (DRY_RUN) {
    console.log('');
    console.log('DRY_RUN=true — no writes performed.');
    process.exit(0);
  }

  await db.insert(Stack).values([row]);
  console.log('');
  console.log(`✓ Stack row inserted. Mike's edit view shows it immediately.`);
  console.log(`  To materialize to public /people/${handle} page, run:`);
  console.log(`    HANDLE=${handle} pnpm sync:stacks:remote`);
}

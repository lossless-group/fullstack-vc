// scripts/rename-user-handle.ts
//
// Renames a user's github_handle in Turso (User table) and updates any Stack
// rows that mirror the old handle. The companion participant md file is
// renamed separately (git mv on disk + push); this script only handles the
// DB side.
//
// Run via:
//
//   USER_MATCH=lucas@lyticalventures.com NEW_HANDLE=lucas-nelson \
//     pnpm astro db execute scripts/rename-user-handle.ts --remote
//
// Safety: bails on 0 or 2+ matches without writing. DRY_RUN=true previews
// without committing. Reports the number of Stack rows that move with the
// rename (typically 0 for users who just signed up).

import { db, User, Stack, eq } from 'astro:db';

export default async function () {
  const USER_MATCH = process.env.USER_MATCH ?? '';
  const NEW_HANDLE = process.env.NEW_HANDLE ?? '';
  const DRY_RUN = process.env.DRY_RUN === 'true';

  if (!USER_MATCH || !NEW_HANDLE) {
    console.error('USER_MATCH and NEW_HANDLE env vars required');
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

  if (matches.length !== 1) {
    console.error(`Expected exactly 1 user match for "${USER_MATCH}", got ${matches.length}.`);
    for (const m of matches) console.error(`  - ${(m as any).name ?? '?'} (${m.id})`);
    process.exit(1);
  }

  const user = matches[0] as any;
  const oldHandle: string | null = user.github_handle;

  console.log('');
  console.log(`User: ${user.name ?? user.id}  (${user.id})`);
  console.log(`  Old github_handle: ${oldHandle ?? '(null)'}`);
  console.log(`  New github_handle: ${NEW_HANDLE}`);

  // Find Stack rows that would move
  const stackRowsToMove = oldHandle
    ? await db.select().from(Stack).where(eq(Stack.handle, oldHandle)).all()
    : [];
  console.log(`  Stack rows referencing old handle: ${stackRowsToMove.length}`);

  if (DRY_RUN) {
    console.log('');
    console.log('DRY_RUN=true — no writes performed.');
    process.exit(0);
  }

  const now = new Date();

  // Update User row
  await db
    .update(User)
    .set({ github_handle: NEW_HANDLE, updated_at: now })
    .where(eq(User.id, user.id));
  console.log(`✓ User.github_handle updated`);

  // Update Stack rows
  if (stackRowsToMove.length > 0) {
    for (const row of stackRowsToMove as any[]) {
      await db
        .update(Stack)
        .set({ handle: NEW_HANDLE, updated_at: now })
        .where(eq(Stack.id, row.id));
    }
    console.log(`✓ Updated ${stackRowsToMove.length} Stack rows`);
  }

  console.log('');
  console.log(`Next: rename src/content/participants/${oldHandle}.md → ${NEW_HANDLE}.md,`);
  console.log(`      update the file's own \`handle:\` frontmatter to "${NEW_HANDLE}",`);
  console.log(`      then push so Vercel rebuilds the static /people/${NEW_HANDLE}/ route.`);
}

// profile-visibility.ts — the "Make my profile public" switch, stored in Turso.
//
// History: the editor's toggle shipped 2026-04-28, when saving committed
// `publish: true|false` straight into participants/<handle>.md through the
// GitHub App. The 2026-05-21 move of stacks to Turso retired that write path,
// and `publish` became accept-and-ignore, so the toggle silently did nothing.
// This restores it the Turso-first way stacks already work: the editor writes
// here, pages read here first, and scripts/sync-stacks-turso.mjs materializes
// the value into the markdown's `publish:` field.
//
// A row exists only once someone has saved the toggle. No row → the markdown's
// `publish` stands, which is how every operator-made profile keeps working.
//
// Best-effort, like user-record.ts: any DB error reads as "no row", so a Turso
// hiccup falls back to the markdown instead of breaking a profile page.
import { db, sql } from 'astro:db';

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  return (ensured ??= db
    .run(sql`CREATE TABLE IF NOT EXISTS ProfileVisibility (
      handle TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      publish INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    .then(() => undefined)
    .catch((err) => {
      ensured = null;
      throw err;
    }));
}

const norm = (handle: string) => handle.toLowerCase();

export async function setProfileVisibility(handle: string, userId: string, publish: boolean): Promise<void> {
  await ensureTable();
  await db.run(sql`INSERT INTO ProfileVisibility (handle, user_id, publish, updated_at)
    VALUES (${norm(handle)}, ${userId}, ${publish ? 1 : 0}, ${new Date().toISOString()})
    ON CONFLICT(handle) DO UPDATE SET publish = excluded.publish, user_id = excluded.user_id, updated_at = excluded.updated_at`);
}

/** The saved choice for one handle, or null when there isn't one (or the DB is unreachable). */
export async function getProfileVisibility(handle: string): Promise<boolean | null> {
  try {
    await ensureTable();
    const res: any = await db.run(sql`SELECT publish FROM ProfileVisibility WHERE handle = ${norm(handle)}`);
    const row = res?.rows?.[0];
    if (!row) return null;
    return Number(Array.isArray(row) ? row[0] : row.publish) === 1;
  } catch (err) {
    console.error('[profile-visibility] read failed:', err);
    return null;
  }
}

/** Every saved choice, handle → publish. Empty on any DB error. */
export async function getAllProfileVisibility(): Promise<Map<string, boolean>> {
  try {
    await ensureTable();
    const res: any = await db.run(sql`SELECT handle, publish FROM ProfileVisibility`);
    return new Map(
      (res?.rows ?? []).map((r: any) =>
        Array.isArray(r) ? [String(r[0]), Number(r[1]) === 1] : [String(r.handle), Number(r.publish) === 1],
      ),
    );
  } catch (err) {
    console.error('[profile-visibility] read failed:', err);
    return new Map();
  }
}

/** A profile is public if its saved choice says so, else if its markdown does. */
export const isPublic = (handle: string, markdownPublish: boolean, saved: Map<string, boolean>) =>
  saved.get(norm(handle)) ?? markdownPublish;

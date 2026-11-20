// engagement.ts — each person's engagement score, by profile handle.
//
// The rollup lives in Turso as the PersonEngagement view
// (db/migrations/003_person-engagement.sql): +1 per registration, +3 per
// session attended, +5 per login, +3 per poll answered. This reads it once
// and caches it for a minute, so a page full of cards costs one query.
//
// Best-effort, like profile-visibility.ts: a DB error reads as "no scores",
// and cards render without the dot.
import { db, sql } from 'astro:db';

const TTL_MS = 60 * 1000;
let cached: { at: number; scores: Map<string, number> } | null = null;

export async function getEngagementScores(): Promise<Map<string, number>> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.scores;
  const scores = new Map<string, number>();
  try {
    const res: any = await db.run(sql`SELECT handle, score FROM PersonEngagement WHERE handle IS NOT NULL`);
    for (const r of res?.rows ?? []) {
      const [handle, score] = Array.isArray(r) ? r : [r.handle, r.score];
      scores.set(String(handle).toLowerCase(), Number(score) || 0);
    }
  } catch {
    return scores;
  }
  cached = { at: Date.now(), scores };
  return scores;
}

/** A person's score: 0 when they have none yet, undefined when scores couldn't be read. */
export async function getEngagementScore(handle: string): Promise<number | undefined> {
  const scores = await getEngagementScores();
  if (scores.size === 0) return undefined;
  return scores.get(handle.toLowerCase()) ?? 0;
}

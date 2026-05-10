// Quick diagnostic — Turso state for auth + participation interest.
// Reads creds from .env. Run: node scripts/_inspect-turso.mjs

import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};

const client = createClient({
  url: get('TURSO_DATABASE_URL'),
  authToken: get('TURSO_AUTH_TOKEN'),
});

async function main() {
  console.log('=== Duplicate-person detection (same person, multiple rows) ===');
  // Roster json has email aliases; here we just look at name collisions to flag obvious dups.
  const dup = await client.execute(`
    SELECT name, COUNT(*) as n, GROUP_CONCAT(id) as ids
    FROM User
    WHERE name IS NOT NULL
    GROUP BY LOWER(name)
    HAVING n > 1
  `);
  for (const r of dup.rows) console.log(JSON.stringify(r));

  console.log('\n=== Users with only one provider linked ===');
  const partial = await client.execute(`
    SELECT id, name, github_handle, linkedin_sub, last_provider, last_login_at
    FROM User
    WHERE github_handle IS NULL OR linkedin_sub IS NULL
    ORDER BY last_login_at DESC
  `);
  console.log('count:', partial.rows.length);
  for (const r of partial.rows) console.log(JSON.stringify(r));

  console.log('\n=== ParticipationInterest by user ===');
  const pi = await client.execute(`
    SELECT user_id, COUNT(*) as n, GROUP_CONCAT(entity_kind || ':' || entity_slug || '=' || level, ' | ') as items
    FROM ParticipationInterest
    GROUP BY user_id
  `);
  for (const r of pi.rows) console.log(JSON.stringify(r));

  console.log('\n=== Vote rows ===');
  const v = await client.execute(`SELECT * FROM Vote`);
  for (const r of v.rows) console.log(JSON.stringify(r));

  console.log('\n=== Users who logged in but produced NO interest, vote, or proposal ===');
  const orphans = await client.execute(`
    SELECT id, name, last_provider, last_login_at
    FROM User u
    WHERE NOT EXISTS (SELECT 1 FROM ParticipationInterest p WHERE p.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM Vote v WHERE v.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM Proposal pr WHERE pr.user_id = u.id)
    ORDER BY last_login_at DESC
  `);
  for (const r of orphans.rows) console.log(JSON.stringify(r));

  console.log('\n=== Marcos detail ===');
  const m = await client.execute({
    sql: `SELECT * FROM User WHERE github_handle LIKE ? OR id LIKE ? OR email LIKE ?`,
    args: ['%marcos%', '%marcos%', '%marcos%'],
  });
  for (const r of m.rows) console.log(JSON.stringify(r));

  console.log('\n=== Marcos participation interests ===');
  const mp = await client.execute({
    sql: `SELECT * FROM ParticipationInterest WHERE user_id IN (SELECT id FROM User WHERE github_handle LIKE ? OR id LIKE ?)`,
    args: ['%marcos%', '%marcos%'],
  });
  for (const r of mp.rows) console.log(JSON.stringify(r));

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });

// Diagnostic: find every User row that touches "michael@avalanche.vc" or has a
// google_sub populated. Prints the rows so we can see what id was actually
// minted for the Google sign-in.

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

const target = (process.argv[2] || 'michael@avalanche.vc').toLowerCase();

const client = createClient({
  url: get('TURSO_DATABASE_URL'),
  authToken: get('TURSO_AUTH_TOKEN'),
});

async function main() {
  console.log(`Searching for users touching: ${target}`);
  console.log('');

  console.log('=== Rows with google_sub set ===');
  const g = await client.execute('SELECT id, email, name, github_handle, linkedin_sub, google_sub, last_provider FROM User WHERE google_sub IS NOT NULL');
  console.log(`count: ${g.rows.length}`);
  for (const r of g.rows) console.log(JSON.stringify(r));

  console.log('\n=== Rows where email = target ===');
  const e = await client.execute({ sql: 'SELECT id, email, name, github_handle, linkedin_sub, google_sub FROM User WHERE LOWER(email) = ?', args: [target] });
  for (const r of e.rows) console.log(JSON.stringify(r));

  console.log('\n=== Rows where id LIKE target (case-insensitive substring) ===');
  const i = await client.execute({ sql: 'SELECT id, email, name, github_handle, linkedin_sub, google_sub FROM User WHERE LOWER(id) LIKE ?', args: [`%${target}%`] });
  for (const r of i.rows) console.log(JSON.stringify(r));

  console.log('\n=== Rows whose emails JSON contains the target ===');
  const allRows = await client.execute('SELECT id, email, emails, github_handle, linkedin_sub, google_sub FROM User');
  for (const r of allRows.rows) {
    let arr = [];
    try { arr = typeof r.emails === 'string' ? JSON.parse(r.emails) : (r.emails ?? []); } catch {}
    if (Array.isArray(arr) && arr.some(x => typeof x === 'string' && x.toLowerCase() === target)) {
      console.log(JSON.stringify(r));
    }
  }

  console.log('\n=== AuthEvent rows for google in the last 24h ===');
  const a = await client.execute(`SELECT at, provider, outcome, subject, email, user_id, note FROM AuthEvent WHERE provider = 'google' ORDER BY at DESC LIMIT 10`);
  for (const r of a.rows) console.log(JSON.stringify(r));

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });

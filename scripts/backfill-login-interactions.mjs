// scripts/backfill-login-interactions.mjs
//
// Records past successful logins (AuthEvent rows with outcome 'success') in
// PersonInteractions, so a login counts when picking which of a card's
// addresses is the most recently used. Only logins that resolve to a person
// are recorded: by the address on a card, else by People.user_id. Re-running
// updates instead of duplicating (ref is 'AuthEvent:<id>').
//
// New logins should record themselves at sign-in; until that lands in
// src/lib/user-record.ts, re-run this after importing registrations.
//
// Run:
//   DRY_RUN=true pnpm db:backfill-logins
//   pnpm db:backfill-logins

import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cardEmails, recordInteractions } from '../src/lib/contact-cards.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};
const DRY_RUN = process.env.DRY_RUN === 'true';

const client = createClient({ url: getEnv('TURSO_DATABASE_URL'), authToken: getEnv('TURSO_AUTH_TOKEN') });

const personByEmail = new Map();
for (const r of (await client.execute('SELECT person_id, card FROM PersonContactCards')).rows) {
  for (const e of cardEmails(JSON.parse(String(r.card)))) personByEmail.set(e, String(r.person_id));
}
const personByUser = new Map(
  (await client.execute('SELECT id, user_id FROM People WHERE user_id IS NOT NULL')).rows.map((r) => [String(r.user_id), String(r.id)]),
);

const logins = (await client.execute("SELECT id, at, email, user_id FROM AuthEvent WHERE outcome = 'success'")).rows;
const items = [];
let unmatched = 0;
for (const l of logins) {
  const email = l.email ? String(l.email).trim().toLowerCase() : null;
  const personId = (email && personByEmail.get(email)) ?? (l.user_id && personByUser.get(String(l.user_id)));
  if (!personId) { unmatched++; continue; }
  const at = typeof l.at === 'number' ? new Date(l.at).toISOString() : String(l.at);
  items.push({ person_id: personId, email, kind: 'login', at, ref: `AuthEvent:${l.id}` });
}

console.log(`${logins.length} successful logins: ${items.length} belong to a person, ${unmatched} don't (no person has that address or account yet)`);
console.log(`people touched: ${new Set(items.map((i) => i.person_id)).size}`);
if (DRY_RUN) process.exit(0);

const tx = await client.transaction('write');
try {
  await recordInteractions(tx, items);
  await tx.commit();
} catch (err) {
  await tx.rollback();
  throw err;
} finally {
  tx.close();
}
console.log(`recorded ${items.length} login interactions`);

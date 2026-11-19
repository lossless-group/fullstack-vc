// scripts/db-merge-people.mjs
//
// Folds one person into another once you've confirmed they're the same human
// (the import lists likely pairs). Cards and session registrations move to
// the person kept; the other is deleted. Spec §6.
//
// Each side can be a person id (prs_…) or any email on one of their cards.
//
// Run:
//   DRY_RUN=true pnpm db:merge-people <keep> <merge>
//   pnpm db:merge-people <keep> <merge>

import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findPersonIdByEmail, mergePeople } from '../src/lib/contact-cards.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};
const DRY_RUN = process.env.DRY_RUN === 'true';

const [keepArg, mergeArg] = process.argv.slice(2);
if (!keepArg || !mergeArg) {
  console.error('Usage: pnpm db:merge-people <keep: prs_… or email> <merge: prs_… or email>');
  process.exit(1);
}

const client = createClient({ url: getEnv('TURSO_DATABASE_URL'), authToken: getEnv('TURSO_AUTH_TOKEN') });
const resolve = async (arg) => (arg.startsWith('prs_') ? arg : findPersonIdByEmail(client, arg));
const [keepId, mergeId] = [await resolve(keepArg), await resolve(mergeArg)];
if (!keepId || !mergeId) {
  console.error(`Not found: ${!keepId ? keepArg : mergeArg}`);
  process.exit(1);
}
if (keepId === mergeId) {
  console.log('Already the same person.');
  process.exit(0);
}

const show = async (id) => {
  const p = (await client.execute({ sql: 'SELECT name, org, user_id FROM People WHERE id = ?', args: [id] })).rows[0];
  const cards = (await client.execute({ sql: 'SELECT COUNT(*) n FROM PersonContactCards WHERE person_id = ?', args: [id] })).rows[0].n;
  const regs = (await client.execute({ sql: 'SELECT COUNT(*) n FROM SessionRegistrations WHERE person_id = ?', args: [id] })).rows[0].n;
  return `${id} ${p?.name ?? '?'} (${p?.org ?? 'no org'}; ${cards} cards, ${regs} registrations${p?.user_id ? ', has account' : ''})`;
};
console.log(`keep:  ${await show(keepId)}`);
console.log(`merge: ${await show(mergeId)}`);
if (DRY_RUN) process.exit(0);

const tx = await client.transaction('write');
try {
  const moved = await mergePeople(tx, keepId, mergeId);
  await tx.commit();
  console.log(`merged: ${moved.cardsMoved} cards and ${moved.registrationsMoved} registrations moved`);
} catch (err) {
  await tx.rollback();
  throw err;
} finally {
  tx.close();
}

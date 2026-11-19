// scripts/db-audit-people.mjs
//
// Recomputes every person's email, org and title from their cards and lists
// any People row that disagrees. Those columns are copies written only by
// upsertContactCard(); a disagreement means something wrote around it.
// Also lists people with no cards at all. Read-only. Spec §4.
//
// Run:
//   pnpm db:audit-people

import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { derivedPersonFields, loadCards } from '../src/lib/contact-cards.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};

const client = createClient({ url: getEnv('TURSO_DATABASE_URL'), authToken: getEnv('TURSO_AUTH_TOKEN') });
const people = (await client.execute('SELECT id, name, email, org, title FROM People')).rows;

let drifted = 0;
let cardless = 0;
for (const p of people) {
  const cards = await loadCards(client, String(p.id));
  if (cards.length === 0) {
    cardless++;
    console.log(`no cards: ${p.id} ${p.name ?? ''}`);
    continue;
  }
  const want = derivedPersonFields(cards);
  const diffs = ['email', 'org', 'title'].filter((k) => (p[k] ?? null) !== want[k]);
  if (diffs.length) {
    drifted++;
    console.log(`drift: ${p.id} ${p.name ?? ''}: ${diffs.map((k) => `${k} is ${JSON.stringify(p[k])}, cards say ${JSON.stringify(want[k])}`).join('; ')}`);
  }
}
console.log(`${people.length} people checked: ${drifted} drifted, ${cardless} without cards`);
process.exit(drifted || cardless ? 1 : 0);

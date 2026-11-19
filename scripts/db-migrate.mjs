// scripts/db-migrate.mjs
//
// Applies db/migrations/*.sql to Turso, in filename order, each once. Applied
// migrations are recorded in the _migrations table. Each file runs in one
// transaction: it applies whole or not at all.
//
// This is where new tables come from. Don't create tables from library code
// (ProfileVisibility predates this and still does).
//
// Run:
//   DRY_RUN=true pnpm db:migrate    # list what would run
//   pnpm db:migrate

import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS = join(ROOT, 'db/migrations');
const env = readFileSync(join(ROOT, '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};
const DRY_RUN = process.env.DRY_RUN === 'true';

const client = createClient({ url: getEnv('TURSO_DATABASE_URL'), authToken: getEnv('TURSO_AUTH_TOKEN') });

const hasLog = (await client.execute(
  "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_migrations'",
)).rows.length > 0;
if (!hasLog && !DRY_RUN) {
  await client.execute(`CREATE TABLE _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
)`);
}
const applied = new Set(hasLog ? (await client.execute('SELECT name FROM _migrations')).rows.map((r) => r.name) : []);
const pending = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql') && !applied.has(f)).sort();

if (pending.length === 0) {
  console.log('Nothing to apply.');
  process.exit(0);
}

for (const file of pending) {
  const statements = readFileSync(join(MIGRATIONS, file), 'utf-8')
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  if (DRY_RUN) {
    console.log(`would apply ${file} (${statements.length} statements)`);
    continue;
  }
  await client.batch(
    [...statements, { sql: 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', args: [file, new Date().toISOString()] }],
    'write',
  );
  console.log(`applied ${file} (${statements.length} statements)`);
}

// One-off: merge a duplicate Google-only User row into the canonical row.
//
// Background: when a Google sign-in's email isn't in any roster entry's
// email_aliases[] and isn't already in any existing User row's emails[],
// the OAuth callback creates a fresh row. This script consolidates the
// duplicate back onto the canonical row (which has the github_handle,
// linkedin_sub, kauffman_class, etc.) and drops the orphan.
//
// Usage:
//   node scripts/_merge-duplicate-user.mjs \
//        --canonical mpstaton@gmail.com \
//        --duplicate michael@avalanche.vc
//
// Add --dry-run to see what would change without writing.

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

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}
const dryRun = args.includes('--dry-run');
const canonicalId = flag('canonical');
const duplicateId = flag('duplicate');

if (!canonicalId || !duplicateId) {
  console.error('Usage: node scripts/_merge-duplicate-user.mjs --canonical <id> --duplicate <id> [--dry-run]');
  process.exit(1);
}

const client = createClient({
  url: get('TURSO_DATABASE_URL'),
  authToken: get('TURSO_AUTH_TOKEN'),
});

async function main() {
  // Load both rows
  const canonical = await client.execute({
    sql: 'SELECT * FROM User WHERE id = ?',
    args: [canonicalId],
  });
  const duplicate = await client.execute({
    sql: 'SELECT * FROM User WHERE id = ?',
    args: [duplicateId],
  });

  if (canonical.rows.length === 0) {
    console.error(`Canonical row not found: ${canonicalId}`);
    process.exit(1);
  }
  if (duplicate.rows.length === 0) {
    console.error(`Duplicate row not found: ${duplicateId}`);
    process.exit(1);
  }

  const c = canonical.rows[0];
  const d = duplicate.rows[0];

  console.log('Canonical row:');
  console.log(JSON.stringify(c, null, 2));
  console.log('\nDuplicate row:');
  console.log(JSON.stringify(d, null, 2));

  // Build the merged emails array: union of c.emails, c.email, d.email, d.emails
  const emailSet = new Set();
  const addEmail = (e) => { if (typeof e === 'string' && e) emailSet.add(e.toLowerCase()); };
  try {
    const cEmails = typeof c.emails === 'string' ? JSON.parse(c.emails) : c.emails;
    if (Array.isArray(cEmails)) cEmails.forEach(addEmail);
  } catch {}
  try {
    const dEmails = typeof d.emails === 'string' ? JSON.parse(d.emails) : d.emails;
    if (Array.isArray(dEmails)) dEmails.forEach(addEmail);
  } catch {}
  addEmail(c.email);
  addEmail(d.email);
  const mergedEmails = JSON.stringify(Array.from(emailSet));

  // Take the duplicate's provider field for whichever slot the canonical lacks
  const merged = {
    github_handle: c.github_handle ?? d.github_handle ?? null,
    linkedin_sub: c.linkedin_sub ?? d.linkedin_sub ?? null,
    google_sub: c.google_sub ?? d.google_sub ?? null,
    name: c.name ?? d.name ?? null,
    avatar: c.avatar ?? d.avatar ?? null,
    kauffman_class: c.kauffman_class ?? d.kauffman_class ?? null,
    firm: c.firm ?? d.firm ?? null,
    // Use the freshest login as the new last_login.
    last_login_at: new Date(Math.max(
      new Date(c.last_login_at).getTime(),
      new Date(d.last_login_at).getTime(),
    )).toISOString(),
    last_provider: new Date(c.last_login_at).getTime() >= new Date(d.last_login_at).getTime()
      ? c.last_provider
      : d.last_provider,
  };

  console.log('\nMerged values to write onto canonical row:');
  console.log(JSON.stringify({ ...merged, emails: JSON.parse(mergedEmails) }, null, 2));

  if (dryRun) {
    console.log('\n(dry-run — no changes written.)');
    await client.close();
    return;
  }

  // STEP 1: NULL out unique-constrained provider fields on the duplicate
  // FIRST. Without this, the UPDATE of canonical to the duplicate's
  // linkedin_sub / github_handle / google_sub fails with a UNIQUE constraint
  // violation because both rows briefly hold the same value before the
  // duplicate's DELETE runs. Capturing the duplicate's data into the `d`
  // variable above means we still have what we need; the live row's
  // provider columns just go to NULL momentarily.
  await client.execute({
    sql: `UPDATE User SET
            github_handle = NULL,
            linkedin_sub  = NULL,
            google_sub    = NULL,
            updated_at = ?
          WHERE id = ?`,
    args: [new Date().toISOString(), duplicateId],
  });

  // STEP 2: Now safely UPDATE the canonical with the merged values.
  await client.execute({
    sql: `UPDATE User SET
            github_handle = ?,
            linkedin_sub = ?,
            google_sub = ?,
            name = COALESCE(?, name),
            avatar = COALESCE(?, avatar),
            kauffman_class = COALESCE(?, kauffman_class),
            firm = COALESCE(?, firm),
            emails = ?,
            last_login_at = ?,
            last_provider = ?,
            updated_at = ?
          WHERE id = ?`,
    args: [
      merged.github_handle,
      merged.linkedin_sub,
      merged.google_sub,
      merged.name,
      merged.avatar,
      merged.kauffman_class,
      merged.firm,
      mergedEmails,
      merged.last_login_at,
      merged.last_provider,
      new Date().toISOString(),
      canonicalId,
    ],
  });
  console.log(`\n✓ Updated canonical row: ${canonicalId}`);

  // STEP 3: Delete the (now provider-stripped) duplicate row.
  await client.execute({
    sql: 'DELETE FROM User WHERE id = ?',
    args: [duplicateId],
  });
  console.log(`✓ Deleted duplicate row: ${duplicateId}`);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });

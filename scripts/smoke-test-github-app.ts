// One-off smoke test: verifies GitHub App auth works end-to-end against the
// real repo. Read-only — tries to fetch participants/mpstaton.md. If this
// succeeds, the write path will also work (same token, same permissions).
//
// Run:  node --experimental-strip-types --env-file=.env scripts/smoke-test-github-app.ts

import { fetchExisting, commitFile } from '../src/lib/github-commit.ts';

async function main() {
  console.log('1. Testing READ (GET /contents)…');
  const readPath = 'README.md';
  try {
    const content = await fetchExisting(readPath);
    if (content === null) {
      console.log(`   READ returned 404 for ${readPath} (file just doesn't exist on target branch).`);
    } else {
      console.log(`   ✓ READ worked — ${content.length} bytes from ${readPath}`);
    }
  } catch (e: any) {
    console.error('   ✗ READ failed:', e?.message ?? e);
    process.exit(1);
  }

  console.log('\n2. Testing WRITE (PUT /contents)…');
  const writePath = `.bot-write-test/${Date.now()}.txt`;
  try {
    const result = await commitFile({
      path: writePath,
      content: `bot write test from smoke-test at ${new Date().toISOString()}\n`,
      commitMessage: `data(test): smoke-test PUT permission check`,
    });
    console.log(`   ✓ WRITE worked — committed to ${result.branch} (sha ${result.commitSha.slice(0, 8)})`);
    console.log(`   Test file: ${writePath} — you can git rm this later.`);
  } catch (e: any) {
    console.error('   ✗ WRITE failed:', e?.message ?? e);
    console.error('\n   If this 404s while READ works, it almost always means one of:');
    console.error('   - App "Contents" is still Read-only (not Read & write)');
    console.error('   - You updated the App permissions but never accepted the prompt');
    console.error('     on the installation page (https://github.com/organizations/lossless-group/settings/installations/...)');
    process.exit(1);
  }
}

main();

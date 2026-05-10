// One-off reconciliation: merge duplicate User rows produced by alternating
// GitHub/LinkedIn logins where the two providers exposed different emails.
//
// Background:
//   context-v/issue-resolutions/Auth-Identity-System-Worked-but-UX-Failed-Silent-Bounces.md
//
// Why this isn't a forever-script: once we land roster entries with both
// github + email_aliases for these people, the canonical-id resolver in
// oauth-roster.ts will route both providers to the same row at login time
// and dups stop happening.
//
// Default mode is dry-run. To execute:
//   node scripts/_reconcile-user-rows.mjs --apply
//
// Underscore prefix marks this as a one-off; delete after the merges land.

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

const APPLY = process.argv.includes('--apply');
const MODE = APPLY ? 'APPLY' : 'DRY-RUN';

const client = createClient({
  url: get('TURSO_DATABASE_URL'),
  authToken: get('TURSO_AUTH_TOKEN'),
});

// ─── Merge plans ─────────────────────────────────────────────────────────────
// Each plan keeps `target` and absorbs the `sources` into it. Field merges:
//   - email/name/avatar: target wins unless null/empty, then take from source
//   - github_handle/linkedin_sub: take whichever is non-null
//   - first_login_at: MIN across all rows
//   - last_login_at:  MAX across all rows
// Foreign-ish references (Vote.user_id, ParticipationInterest.user_id,
// Proposal.user_id) get repointed from source.id → target.id. On unique-
// constraint conflicts in ParticipationInterest, the target's existing row
// wins; the source's interest row is dropped.
const PLANS = [
  {
    person: 'Ariel Muslera',
    target: 'arielmuslera@gmail.com',     // keep the GitHub-anchored row
    sources: ['amuslera05@gsb.columbia.edu'],
    // Manual overrides — applied after the auto-merge so we can pick the
    // better display name.
    overrides: { name: 'Ariel Muslera' },
    // If a source row had a github handle we want to drop on the floor
    // (e.g., a duplicate test account), list it here. Empty for Ariel.
    dropGithubHandles: [],
    dropLinkedinSubs: [],
  },
  {
    person: 'Rodrigo Borges',
    // Keep the row that already holds his ParticipationInterest activity.
    target: 'rodrigo@domoinvest.com.br',
    sources: ['rodrigo@domo.vc', 'rvborges@gmail.com'],
    overrides: { name: 'Rodrigo Borges' },
    // He has TWO github handles across the source rows (`borgesdomo` and
    // `rvborges`). The User.github_handle column is unique-indexed and only
    // holds one value. We keep `borgesdomo` (the email `rodrigo@domo.vc`
    // matches his firm domain `domoinvest.com.br`) and drop `rvborges`.
    dropGithubHandles: ['rvborges'],
    dropLinkedinSubs: [],
  },
];

function logRow(label, row) {
  if (!row) { console.log(`  ${label}: <missing>`); return; }
  console.log(`  ${label}: id=${row.id}`);
  console.log(`    name=${row.name} email=${row.email}`);
  console.log(`    github=${row.github_handle ?? '∅'} linkedin=${row.linkedin_sub ?? '∅'}`);
  console.log(`    first=${row.first_login_at} last=${row.last_login_at}`);
}

async function loadRow(id) {
  const r = await client.execute({ sql: `SELECT * FROM User WHERE id = ?`, args: [id] });
  return r.rows[0] ?? null;
}

async function countRefs(id) {
  const [pi, v, pr] = await Promise.all([
    client.execute({ sql: `SELECT COUNT(*) as n FROM ParticipationInterest WHERE user_id = ?`, args: [id] }),
    client.execute({ sql: `SELECT COUNT(*) as n FROM Vote WHERE user_id = ?`, args: [id] }),
    client.execute({ sql: `SELECT COUNT(*) as n FROM Proposal WHERE user_id = ?`, args: [id] }),
  ]);
  return { interests: Number(pi.rows[0].n), votes: Number(v.rows[0].n), proposals: Number(pr.rows[0].n) };
}

function mergeFields(target, source, plan) {
  const pickGithub =
    plan.dropGithubHandles.includes(source.github_handle) ? null : source.github_handle;
  const pickLinkedin =
    plan.dropLinkedinSubs.includes(source.linkedin_sub) ? null : source.linkedin_sub;
  return {
    email: target.email ?? source.email,
    name: target.name ?? source.name,
    avatar: target.avatar ?? source.avatar,
    github_handle: target.github_handle ?? pickGithub,
    linkedin_sub: target.linkedin_sub ?? pickLinkedin,
    kauffman_class: target.kauffman_class ?? source.kauffman_class,
    firm: target.firm ?? source.firm,
    // Earliest first, latest last. Strings are ISO-8601 so lex-compare = chrono.
    first_login_at: [target.first_login_at, source.first_login_at].sort()[0],
    last_login_at: [target.last_login_at, source.last_login_at].sort().reverse()[0],
  };
}

async function repointReferences(sourceId, targetId) {
  const moved = { interests: 0, interests_dropped: 0, votes: 0, proposals: 0 };

  // ParticipationInterest — handle the (user_id, entity_kind, entity_slug)
  // unique index manually: if the target already has a row for the same
  // entity, drop the source's row instead of trying to update it.
  const sourceInterests = await client.execute({
    sql: `SELECT * FROM ParticipationInterest WHERE user_id = ?`,
    args: [sourceId],
  });
  for (const row of sourceInterests.rows) {
    const conflict = await client.execute({
      sql: `SELECT id FROM ParticipationInterest WHERE user_id = ? AND entity_kind = ? AND entity_slug = ?`,
      args: [targetId, row.entity_kind, row.entity_slug],
    });
    if (conflict.rows.length > 0) {
      console.log(`    [pi] drop source row (target already has): ${row.entity_kind}:${row.entity_slug}`);
      if (APPLY) {
        await client.execute({
          sql: `DELETE FROM ParticipationInterest WHERE id = ?`,
          args: [row.id],
        });
      }
      moved.interests_dropped++;
    } else {
      console.log(`    [pi] repoint ${row.entity_kind}:${row.entity_slug} (level=${row.level})`);
      if (APPLY) {
        await client.execute({
          sql: `UPDATE ParticipationInterest SET user_id = ?, updated_at = ? WHERE id = ?`,
          args: [targetId, new Date().toISOString(), row.id],
        });
      }
      moved.interests++;
    }
  }

  // Vote — no unique index on user_id (only on poll_id+user_id, which we
  // can't violate by repointing unless target already voted in that poll;
  // our 2 votes are mpstaton's so it doesn't bite, but handle it anyway).
  const sourceVotes = await client.execute({
    sql: `SELECT * FROM Vote WHERE user_id = ?`,
    args: [sourceId],
  });
  for (const row of sourceVotes.rows) {
    const conflict = await client.execute({
      sql: `SELECT _id FROM Vote WHERE user_id = ? AND poll_id = ?`,
      args: [targetId, row.poll_id],
    });
    if (conflict.rows.length > 0) {
      console.log(`    [vote] drop source vote (target already voted in ${row.poll_id})`);
      if (APPLY) {
        await client.execute({
          sql: `DELETE FROM Vote WHERE _id = ?`,
          args: [row._id],
        });
      }
    } else {
      console.log(`    [vote] repoint vote on ${row.poll_id}`);
      if (APPLY) {
        await client.execute({
          sql: `UPDATE Vote SET user_id = ? WHERE _id = ?`,
          args: [targetId, row._id],
        });
      }
      moved.votes++;
    }
  }

  // Proposal — straightforward repoint, no relevant unique constraints.
  const sourceProposals = await client.execute({
    sql: `SELECT id FROM Proposal WHERE user_id = ?`,
    args: [sourceId],
  });
  for (const row of sourceProposals.rows) {
    console.log(`    [proposal] repoint proposal ${row.id}`);
    if (APPLY) {
      await client.execute({
        sql: `UPDATE Proposal SET user_id = ? WHERE id = ?`,
        args: [targetId, row.id],
      });
    }
    moved.proposals++;
  }

  return moved;
}

async function applyPlan(plan) {
  console.log(`\n─── ${plan.person} ─────────────────────────────────────────────`);
  const target = await loadRow(plan.target);
  const sources = [];
  for (const id of plan.sources) sources.push(await loadRow(id));

  if (!target) { console.log(`  TARGET MISSING — skipping`); return; }
  for (const [i, s] of sources.entries()) {
    if (!s) { console.log(`  SOURCE ${plan.sources[i]} MISSING — skipping plan`); return; }
  }

  console.log('  BEFORE:');
  logRow('target', target);
  for (const [i, s] of sources.entries()) logRow(`source[${i}]`, s);

  // Compute the merged target row.
  let merged = { ...target };
  for (const s of sources) merged = { ...merged, ...mergeFields(merged, s, plan) };
  if (plan.overrides) Object.assign(merged, plan.overrides);

  console.log('  PLANNED MERGED TARGET:');
  console.log(`    name=${merged.name} email=${merged.email}`);
  console.log(`    github=${merged.github_handle ?? '∅'} linkedin=${merged.linkedin_sub ?? '∅'}`);
  console.log(`    first=${merged.first_login_at} last=${merged.last_login_at}`);

  // Reference moves first (within sources → target).
  for (const s of sources) {
    console.log(`  REPOINT references from ${s.id} → ${plan.target}:`);
    const refs = await countRefs(s.id);
    console.log(`    (${refs.interests} interests, ${refs.votes} votes, ${refs.proposals} proposals)`);
    await repointReferences(s.id, plan.target);
  }

  // Delete source rows BEFORE updating the target so we don't trip the
  // github_handle_unique / linkedin_sub_unique indexes when claiming the
  // value from a source we're about to remove.
  for (const s of sources) {
    console.log(`  DELETE source row ${s.id}`);
    if (APPLY) {
      await client.execute({ sql: `DELETE FROM User WHERE id = ?`, args: [s.id] });
    }
  }

  console.log(`  UPDATE target row ${plan.target}`);
  if (APPLY) {
    await client.execute({
      sql: `UPDATE User SET email=?, name=?, avatar=?, github_handle=?, linkedin_sub=?, kauffman_class=?, firm=?, first_login_at=?, last_login_at=?, updated_at=? WHERE id=?`,
      args: [
        merged.email,
        merged.name,
        merged.avatar,
        merged.github_handle,
        merged.linkedin_sub,
        merged.kauffman_class,
        merged.firm,
        merged.first_login_at,
        merged.last_login_at,
        new Date().toISOString(),
        plan.target,
      ],
    });
  }
}

async function main() {
  console.log(`MODE: ${MODE}`);
  console.log(`If this looks correct, re-run with --apply to execute.`);

  for (const plan of PLANS) {
    await applyPlan(plan);
  }

  console.log('\nDone.');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });

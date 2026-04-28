// scripts/sync-session.ts — manual DB → markdown materialization
//
// v0.0.1 of the materialization motion (blueprint §9.4). Run via:
//
//   SLUG=2026-04-29-fullstack-vc-q2-roundtable pnpm sync:session
//
// What it does:
//   1. Look up Session by slug. Reject if missing or already archived
//      (re-sync forbidden by default, see blueprint §9.9).
//   2. For each Poll in the session: aggregate Votes, recompute PollResult.
//   3. Write src/content/sessions/<slug>.md with frontmatter shape per §9.6.
//      (Body left empty — human/AI editorial enrichment lands separately, §18.)
//   4. Flip Session.status to 'archived'.
//
// The script is invoked under `astro db execute`, which loads the astro:db
// virtual module with the same DB binding the dev server uses. No explicit
// connection setup required.

import { db, Session, Poll, Vote, PollResult, eq } from 'astro:db';
import { aggregateVotes } from '../src/lib/poll-templates.ts';
import { POLL_GRACE_MINUTES, SESSION_GRACE_MINUTES } from '../src/config/polling.ts';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const slug = process.env.SLUG;
if (!slug) {
  console.error('Usage: SLUG=<session-slug> pnpm sync:session');
  console.error('Example: SLUG=2026-04-29-fullstack-vc-q2-roundtable pnpm sync:session');
  process.exit(1);
}

const force = process.env.FORCE === 'true';

console.log(`Looking up session: ${slug}`);
const session = await db.select().from(Session).where(eq(Session.slug, slug)).get();

if (!session) {
  console.error(`✗ Session not found: ${slug}`);
  process.exit(1);
}

if (session.status === 'archived' && !force) {
  console.error(`✗ Session ${slug} is already archived.`);
  console.error(`  Re-sync forbidden by default (blueprint §9.9). Pass FORCE=true to override.`);
  console.error(`  Note: --force only re-writes frontmatter; the markdown body is preserved.`);
  process.exit(1);
}

// Advisory grace-period check (v0.0.1 — informational only, no auto-trigger).
if (session.last_activity_at) {
  const minutesIdle = Math.floor((Date.now() - new Date(session.last_activity_at).getTime()) / 60000);
  if (minutesIdle < SESSION_GRACE_MINUTES) {
    console.log(`⚠ Session has only been idle for ${minutesIdle}m (< ${SESSION_GRACE_MINUTES}m grace). Continuing anyway.`);
  } else {
    console.log(`✓ Session has been idle for ${minutesIdle}m (>= ${SESSION_GRACE_MINUTES}m grace). Safe to archive.`);
  }
}

const polls = await db.select().from(Poll).where(eq(Poll.session_id, session.id)).all();
console.log(`Found ${polls.length} poll(s) in session.`);

// Build the per-poll summary blocks for the markdown frontmatter.
const pollSummaries: unknown[] = [];
let participantSet = new Set<string>();

for (const poll of polls) {
  const votes = await db.select().from(Vote).where(eq(Vote.poll_id, poll.id)).all();
  for (const v of votes) participantSet.add(v.user_id);

  const agg = aggregateVotes({
    template: poll.template,
    options: poll.options,
    votes: votes.map(v => ({ option_ids: v.option_ids, value: v.value })),
  });

  // Recompute the PollResult cache one last time so the DB and markdown match.
  const now = new Date();
  const existingResult = await db.select().from(PollResult)
    .where(eq(PollResult.poll_id, poll.id)).get();
  if (existingResult) {
    await db.update(PollResult)
      .set({ tallies: agg.tallies, total_votes: agg.total_votes, last_aggregated_at: now })
      .where(eq(PollResult.poll_id, poll.id));
  } else {
    await db.insert(PollResult).values({
      poll_id: poll.id,
      tallies: agg.tallies,
      total_votes: agg.total_votes,
      last_aggregated_at: now,
    });
  }

  pollSummaries.push({
    id: poll.id,
    template: poll.template,
    title: poll.title,
    prompt: poll.prompt,
    options: poll.options,
    final_tally: {
      total_votes: agg.total_votes,
      ...(typeof agg.tallies === 'object' && agg.tallies !== null ? agg.tallies : {}),
    },
    audit: {
      // PollEvent table not yet used in v0.0.1 (no host actions are logged);
      // when we add the host console (v0.0.2+) this becomes a real audit trail.
      events: [],
    },
  });

  console.log(`  ✓ ${poll.id}: ${agg.total_votes} vote(s)`);
}

// Build the frontmatter object.
const frontmatter = {
  session_id: session.id,
  slug: session.slug,
  title: session.title,
  description: session.description ?? null,
  kind: session.kind,
  host_user_id: session.host_user_id,
  session_started_at: session.starts_at ? new Date(session.starts_at).toISOString() : null,
  session_concluded_at: session.last_activity_at ? new Date(session.last_activity_at).toISOString() : null,
  synced_from_db_at: new Date().toISOString(),
  participant_count: participantSet.size,
  polls: pollSummaries,
  // Grace constants snapshot for forensic clarity.
  grace_config_at_sync: {
    POLL_GRACE_MINUTES,
    SESSION_GRACE_MINUTES,
  },
};

// Render frontmatter as YAML using JSON-as-YAML (every valid JSON is valid YAML).
// Pretty hand-rolled YAML can come in v0.0.2+ if the output is hard to read.
const yamlBody = JSON.stringify(frontmatter, null, 2);

const outDir = path.resolve(process.cwd(), 'src/content/sessions');
const outPath = path.join(outDir, `${slug}.md`);

// Preserve any existing body content on --force re-syncs (blueprint §9.6).
let existingBody = '';
try {
  const prior = await fs.readFile(outPath, 'utf-8');
  // Frontmatter ends at the second `---` line; body is everything after.
  const m = /^---[\s\S]*?\n---\s*\n([\s\S]*)$/.exec(prior);
  if (m) existingBody = m[1];
} catch {
  // File doesn't exist — that's expected on first sync.
}

const bodyPlaceholder = `<!-- Body is human-owned. Sync never touches anything below the closing --- -->

## Discussion summary

(filled in by an editor or AI agent processing the meeting transcript)

## Notable quotes

## Recording

`;

const fileContents =
  '---\n' +
  yamlBody + '\n' +
  '---\n\n' +
  (existingBody.trim().length > 0 ? existingBody : bodyPlaceholder);

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, fileContents, 'utf-8');

// Flip the Session to 'archived'.
await db.update(Session)
  .set({ status: 'archived', updated_at: new Date() })
  .where(eq(Session.id, session.id));

console.log(`\n✓ Session archived → ${outPath}`);
console.log(`  participants: ${participantSet.size}`);
console.log(`  polls: ${polls.length}`);
console.log(`  Status flipped to 'archived'. Next deploy publishes /sessions/archive/${slug}.`);

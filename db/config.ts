// db/config.ts — Astro DB schema
//
// Implements the polling system data model from
//   context-v/blueprints/Maintain-an-Interactive-Polling-System--v2.md §5 + §8.3
//
// Five tables:
//   Session      — outer container, one Session → many Polls; kind: 'live' | 'time-bound'
//   Poll         — a single question within a Session
//   Vote         — one row per (poll_id, user_id); enforced unique via index
//   PollResult   — derived/cached aggregate per poll; never authoritative
//   PollEvent    — required audit log of host actions (open/close/extend/reset/delete)
//
// Local dev: this file drives types and the local libSQL file under .astro/content.db.
// Production: schema pushed to Turso via `astro db push --remote` (§8.4).

import { defineDb, defineTable, column } from 'astro:db';

// ─── Session ─────────────────────────────────────────────────────────────────
// Outer container of polls. One Session → Many Polls. Tomorrow's meeting is
// modeled as a single `kind: 'live'` Session with three Polls inside.
const Session = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    slug: column.text({ unique: true }),
    title: column.text(),
    description: column.text({ optional: true }),
    // 'live' | 'time-bound'. v0.0.1 ships 'live' only; 'time-bound' deferred.
    kind: column.text(),
    // 'draft' | 'active' | 'archived'. The active → archived transition is
    // the materialization phase change (see §6.3 + §9 in the blueprint).
    status: column.text(),
    starts_at: column.date({ optional: true }),
    ends_at: column.date({ optional: true }),
    // Bumped on every vote across any poll in the session. Drives the
    // 45-minute session-level grace-period auto-trigger (v0.0.2+).
    last_activity_at: column.date({ optional: true }),
    host_user_id: column.text(),
    created_at: column.date(),
    updated_at: column.date(),
  },
});

// ─── Poll ────────────────────────────────────────────────────────────────────
// A single question. Belongs to exactly one Session.
const Poll = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    session_id: column.text({ references: () => Session.columns.id }),
    title: column.text(),
    prompt: column.text(),
    // v0.0.1 templates: 'boolean' | 'single-select' | 'multi-select' | 'sliding-scale'.
    // Deferred templates (text-box, matrix-*, area-board-option-drop, etc.)
    // are spec'd in §16 and gated by the same `template` column when they ship.
    template: column.text(),
    // PollOption[] for choice-based templates; null for boolean/sliding-scale.
    options: column.json({ optional: true }),
    // 'draft' | 'scheduled' | 'open' | 'closed'. No standalone 'archived' on
    // Poll — polls archive as part of their parent Session's transition.
    status: column.text(),
    visibility: column.text(),                 // 'public' | 'members' | 'session-attendees'
    results_visibility: column.text(),         // 'live' | 'on-close' | 'host-only'
    anonymous_display: column.boolean(),
    allow_revote: column.boolean(),
    // Bumped on every vote into this poll. Drives the 15-minute poll-level
    // grace-period auto-close (v0.0.2+).
    last_vote_at: column.date({ optional: true }),
    created_by: column.text(),
    created_at: column.date(),
    updated_at: column.date(),
  },
});

// ─── Vote ────────────────────────────────────────────────────────────────────
// One vote per (poll_id, user_id) for choice polls — enforced by the unique
// index below. Vote shape varies per template:
//   boolean        → value: boolean
//   single-select  → option_ids: [string]
//   multi-select   → option_ids: string[]
//   sliding-scale  → value: number
//   matrix/board   → response: typed JSON (v1.1+)
const Vote = defineTable({
  columns: {
    poll_id: column.text({ references: () => Poll.columns.id }),
    user_id: column.text(),
    option_ids: column.json({ optional: true }),  // string[]
    value: column.json({ optional: true }),       // boolean | number | string
    response: column.json({ optional: true }),    // generic typed-JSON bucket
    created_at: column.date(),
    updated_at: column.date(),
    // Coarse, optional metadata. NO IP, NO precise UA strings, NO fingerprinting.
    client_meta: column.json({ optional: true }),
  },
  indexes: {
    // §13.1 integrity contract: one vote per (poll_id, user_id) for choice polls.
    // Astro DB's column-level `primaryKey` is single-column today; this
    // table-level unique index enforces the composite constraint instead.
    poll_user_unique: { on: ['poll_id', 'user_id'], unique: true },
  },
});

// ─── PollResult ──────────────────────────────────────────────────────────────
// Derived projection of votes for fast reads. Recomputed on vote write or on
// a short cadence; never authoritative — votes are the truth, this is a cache.
const PollResult = defineTable({
  columns: {
    poll_id: column.text({ primaryKey: true, references: () => Poll.columns.id }),
    // Shape depends on template:
    //   boolean       → { true: number, false: number }
    //   choice polls  → Record<option_id, number>
    //   sliding-scale → { histogram: Record<bucket, number>, median, iqr: [number, number] }
    tallies: column.json(),
    total_votes: column.number(),
    last_aggregated_at: column.date(),
  },
});

// ─── PollEvent ───────────────────────────────────────────────────────────────
// Required audit trail of host actions. Without this, host abuse / mistakes
// during a live meeting are unauditable (see §13.3 in the blueprint).
const PollEvent = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    poll_id: column.text({ references: () => Poll.columns.id }),
    actor_user_id: column.text(),
    // 'open' | 'close' | 'extend' | 'reset' | 'delete'
    kind: column.text(),
    at: column.date(),
    note: column.text({ optional: true }),
  },
});

// ─── User ────────────────────────────────────────────────────────────────────
// Account record written on every successful OAuth login. Replaces the prior
// flow that committed a markdown participant file on each new account, which
// produced commit-history pollution (one commit per signup).
//
// IDENTITY MODEL (one row per *person*, not per provider login):
//   `id` = the lowercased roster email — the canonical identity of a Kauffman
//   Fellow. This matches Vote.user_id (which also uses the lowercased roster
//   email), so user records and vote attribution share the same key.
//
//   Each provider connection is a NULLABLE COLUMN on this row, not a separate
//   row. A Fellow who signs in with GitHub gets a row with `github_handle`
//   populated; if they later sign in with LinkedIn against the same roster
//   email, the SAME row gets `linkedin_sub` filled in. The UI can then
//   detect "this user has only one provider linked" and nudge them to add
//   the other.
//
//   Fallback: if a roster entry has no email (rare — GitHub-handle-only
//   entries), id falls back to "<provider>:<provider_subject>". Those users
//   can't dual-provider anyway since LinkedIn matching requires email, so
//   the fallback case stays single-provider by definition.
//
// Roster gating still uses src/content/kauffman_roster.json via
// matchesRoster() — writing a row here records a login, it does NOT grant
// access.
const User = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),       // canonical = lowercased roster email
    email: column.text({ optional: true }),       // primary email — matches User.id when canonical
    // All emails we've ever seen for this person — populated from each provider's
    // session.email on login (deduped, lowercased). Lets us recognize a returning
    // user whose two providers expose different emails, and gives a forward path
    // for a "claim other provider" UX without committing to the roster.
    emails: column.json({ optional: true }),      // string[]
    name: column.text({ optional: true }),
    avatar: column.text({ optional: true }),
    // Provider connections — either or both populated. Indexed unique below
    // so we can look a user up by either provider identifier in O(1).
    github_handle: column.text({ optional: true }),
    linkedin_sub: column.text({ optional: true }),
    // Roster enrichment, snapshotted at login so /people pages don't have to
    // re-read kauffman_roster.json on every render.
    kauffman_class: column.number({ optional: true }),
    firm: column.text({ optional: true }),
    // Most recent provider used to log in — drives the "you signed in with X
    // last time" hint in the login UI.
    last_provider: column.text(),                // 'github' | 'linkedin'
    first_login_at: column.date(),
    last_login_at: column.date(),
    created_at: column.date(),
    updated_at: column.date(),
  },
  indexes: {
    github_handle_unique: { on: ['github_handle'], unique: true },
    linkedin_sub_unique: { on: ['linkedin_sub'], unique: true },
  },
});

// ─── Proposal ────────────────────────────────────────────────────────────────
// Member-submitted draft for a new Project or Working Group. Captured via the
// /projects/propose and /working-groups/propose forms. These rows are NOT
// what renders the public proposed-list grids (those still come from the
// markdown collections); they're the backlog the site lead reviews and
// promotes by writing a markdown file. Keeping them in DB rather than
// committing markdown straight from the form avoids commit-history pollution
// and lets us surface "submitted" entries before a maintainer has groomed
// them into the canonical content collection.
const Proposal = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    // 'project' | 'working-group'
    kind: column.text(),
    title: column.text(),
    body: column.text(),
    // Submitter identity. user_id is the canonical identity (lowercased
    // roster email when available, otherwise <provider>:<subject>) so it
    // joins to User.id and Vote.user_id. The display fields are snapshotted
    // at submission time so the proposals list renders without extra joins.
    user_id: column.text(),
    user_name: column.text({ optional: true }),
    user_handle: column.text({ optional: true }),
    user_provider: column.text({ optional: true }),
    // 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'archived'.
    // Default 'submitted' on insert; maintainer flips to 'accepted' after
    // promoting to a markdown file under src/content/{projects,working-groups}.
    status: column.text(),
    created_at: column.date(),
    updated_at: column.date(),
  },
  indexes: {
    proposals_kind_status: { on: ['kind', 'status'] },
  },
});

// ─── ParticipationInterest ───────────────────────────────────────────────────
// One row per (user, entity, level) signal. Users tap one of three icons on a
// project / working-group / proposal card to register their level of intended
// involvement. Toggling: tap the same icon again → row deleted. Tap a different
// icon → row's `level` is updated (one row per user+entity, enforced by the
// composite unique index below).
//
// `entity_kind` values:
//   'project'                — a published project (slug from content collection)
//   'working-group'          — a published working group (slug from content collection)
//   'project-proposal'       — a member-submitted Proposal (id = Proposal.id)
//   'working-group-proposal' — a member-submitted Proposal (id = Proposal.id)
//
// `level` enum:
//   'lead-potential'      — eager and able; could lead if needed
//   'active-participant'  — count me reliably in
//   'keep-informed'       — interested but unreliable; just keep me in the loop
const ParticipationInterest = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    user_id: column.text(),
    entity_kind: column.text(),
    entity_slug: column.text(),
    level: column.text(),
    created_at: column.date(),
    updated_at: column.date(),
  },
  indexes: {
    pi_user_entity_unique: { on: ['user_id', 'entity_kind', 'entity_slug'], unique: true },
    pi_entity_lookup: { on: ['entity_kind', 'entity_slug'] },
  },
});

// ─── AuthEvent ───────────────────────────────────────────────────────────────
// Append-only audit log of every OAuth callback outcome — success or failure.
// Driven by the Auth-Identity-System-Worked-but-UX-Failed-Silent-Bounces issue
// resolution: 17 users completed OAuth, 15 produced no in-app activity, and we
// had nothing to look at when the first complaint came in.
//
// Every branch of /api/auth/{github,linkedin}/callback writes one row. Writes
// are best-effort — a logging failure must never break the login itself.
//
// outcomes (open enum, expand as needed):
//   'success'              — cookie set, redirect to app
//   'state_mismatch'       — back-button or replayed callback
//   'token_exchange_fail'  — provider returned non-200 on token endpoint
//   'no_access_token'      — token endpoint returned 200 with no token
//   'user_fetch_fail'      — provider /user(info) endpoint returned non-200
//   'record_user_error'    — recordUserLogin's swallowed DB error path
//   'missing_credentials'  — server env var not configured
const AuthEvent = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    at: column.date(),
    provider: column.text(),         // 'github' | 'linkedin'
    outcome: column.text(),
    // Provider subject (GitHub login, LinkedIn sub) when known. Null for
    // pre-token-exchange failures.
    subject: column.text({ optional: true }),
    // Email if surfaced by the provider — useful for "did this user ever
    // make it through?" lookups when the user only knows their email.
    email: column.text({ optional: true }),
    // canonical User.id when the success branch reached recordUserLogin.
    user_id: column.text({ optional: true }),
    // Free-text detail. Keep short — exception messages, status codes, etc.
    note: column.text({ optional: true }),
  },
  indexes: {
    auth_event_at: { on: ['at'] },
    auth_event_outcome: { on: ['outcome'] },
  },
});

export default defineDb({
  tables: { Session, Poll, Vote, PollResult, PollEvent, User, Proposal, ParticipationInterest, AuthEvent },
});

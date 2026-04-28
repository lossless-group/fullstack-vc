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

export default defineDb({
  tables: { Session, Poll, Vote, PollResult, PollEvent },
});

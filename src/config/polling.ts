// src/config/polling.ts — runtime constants for the polling system
//
// See: context-v/blueprints/Maintain-an-Interactive-Polling-System--v2.md §9.3
//
// These constants drive auto-archival in v0.0.2+. In v0.0.1 they're
// advisory only — the manual `pnpm sync:session` command (§9.4) reads them
// to print messages like "this session has been quiet for 47 minutes;
// safe to sync" but no auto-trigger fires.
//
// Tune these here when real meetings reveal that 15 / 45 are wrong; the
// whole system reads from this one file.

/**
 * A single poll concludes this many minutes after its `last_vote_at`.
 *
 * Rationale: in a live meeting, a poll opens, the host narrates it for
 * 30–90 seconds, the room votes for 1–3 minutes, then the host moves on.
 * 15 minutes is generous tolerance for stragglers but short enough that
 * the result lands on screen while the room is still thinking about it.
 */
export const POLL_GRACE_MINUTES = 15;

/**
 * A session concludes this many minutes after `last_activity_at` (last vote
 * across any poll in the session).
 *
 * Rationale: a typical live meeting opens one poll early and another at the
 * end. The gap between can be 30–40 minutes of discussion with no polling
 * activity. 45 is the safe ceiling — short enough that the archive lands
 * within an hour of meeting end, long enough not to fire mid-meeting.
 *
 * MUST be greater than POLL_GRACE_MINUTES.
 */
export const SESSION_GRACE_MINUTES = 45;

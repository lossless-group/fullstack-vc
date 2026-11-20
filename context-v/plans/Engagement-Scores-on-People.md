---
title: "Engagement Scores on People"
lede: "One number per person for how much they show up: registrations, attendance, logins and poll answers, shown as a green dot on every person card."
date_authored_initial_draft: 2026-11-20
date_authored_current_draft: 2026-11-20
date_authored_final_draft:
date_first_published:
date_last_updated: 2026-11-20
at_semantic_version: 0.0.1.0
status: Implemented
augmented_with:
  - Claude Code on Claude Opus 5.5
category: Plan
tags:
  - Engagement
  - People
  - Turso
authors:
  - Michael Staton
date_created: 2026-11-20
date_modified: 2026-11-20
publish: false
---

# Engagement Scores on People

Builds on [[People-and-Contact-Cards-for-Session-Registrations]].

## Scoring

| Event | Points | Counted from |
|---|---|---|
| Registering for a session | +1 each | `SessionRegistrations` rows |
| Attending a session | +3 each | `SessionRegistrations.attendance = 'Attended'` |
| Logging in | +5 each | `AuthEvent` rows with `outcome = 'success'` for the person's `user_id` |
| Answering a poll | +3 per poll | distinct `Vote.poll_id` for the person's `user_id` |

Counted from the source tables, not `PersonInteractions`: sign-in doesn't write interactions yet, so a score built on them would miss every login since the backfill.

## Steps

1. **Rollup query.** Migration `003_person-engagement.sql` creates the view `PersonEngagement` (person_id, handle, registrations, attended, logins, polls, score). Any script or page reads scores from it.
2. **Read it on the site.** `src/lib/engagement.ts` returns score by handle, cached briefly; a DB error returns no scores, so cards render without the dot rather than failing.
3. **Show it.** `PersonCard--Thumb` takes an optional `engagement` and shows a small green dot with the number, no label. `/people` passes it; so does `HoverCard`, so the hover preview shows it too.
4. **Sort.** `/people` lists by score, highest first, then by name.
5. **Catalog.** Update the `/design-system` entry for `PersonCard--Thumb`.

## Not in scope

No explanation of the score on the page, by request.

---
title: "People and Contact Cards for Session Registrations"
lede: "One person, many contact cards. Zoom registrations, logins and profiles all resolve to the same person, whichever email they used."
date_authored_initial_draft: 2026-11-19
date_authored_current_draft: 2026-11-19
date_authored_final_draft:
date_first_published:
date_last_updated: 2026-11-19
at_semantic_version: 0.0.1.0
status: Draft
augmented_with:
  - Claude Code on Claude Opus 5.5
category: Specification
tags:
  - Turso
  - Identity-Model
  - Contact-Cards
  - Session-Registrations
  - Attendance
  - Zoom-Ingest
authors:
  - Michael Staton
date_created: 2026-11-19
date_modified: 2026-11-19
publish: false
site_uuid: e8bc5aae-1f50-4a12-afcd-f402ec066c80
hex_code: jd5xql
---

# People and Contact Cards for Session Registrations

**Site:** `sites/fullstack-vc` · **Database:** Turso `fullstack-vc-db-mpstaton` (used only by this site)
**General pattern:** [[People-and-Contact-Cards]] in the anchor monorepo's `context-v/specs/`. This spec is that pattern applied here.
**Supersedes, in part:** [[Pre-create-and-Fuzzy-Bind-Users-from-External-Rosters]] (its roster-ingest half)

## 1. The problem

We want to ask "who keeps coming to Dojo sessions?" Registration lists come from Zoom, keyed by email, and people register with whichever email is at hand: a firm address one month, Gmail the next. Logins arrive with yet another (GitHub, LinkedIn, Google). Keyed by email, one person looks like three, and repeat attendance is undercounted.

Today registration exports sit as CSVs in `context-v/extra/` (gitignored) and nothing in Turso records them. `User.emails` links a person's emails only after they sign in, and 41 of roughly 120 registrants have.

## 2. The model

Three tables, all in Turso. Emails and other contact details never go into the public repo.

### `People`

One row per human, with or without an account.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `prs_` + a random id. Never an email, which can change. |
| `name` | TEXT | Display name |
| `called` | TEXT (JSON) | Other names they go by: nicknames, short forms, pseudonyms, a name used before a rename. `["Gopi Sundaramurthy"]`. Matching checks these as well as `name`; written by `addCalled()`. |
| `email` | TEXT | **Redundant:** the main email, from the primary card (§4) |
| `org` | TEXT | **Redundant:** from the primary role card |
| `title` | TEXT | **Redundant:** from the primary role card |
| `user_id` | TEXT NULL | `User.id` once they sign in |
| `handle` | TEXT NULL | `src/content/participants/<handle>.md`, once they have a public profile |
| `created_at`, `updated_at` | TEXT | ISO 8601 timestamps |

### `PersonContactCards`

One row per card. A card is what's known about a person **in one context**: usually one role at one organization.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `pcc_` + a random id |
| `person_id` | TEXT | → `People.id` |
| `card_type` | TEXT | `role`, `personal` or `socials` (§3) |
| `active` | INTEGER | 1 or 0. A role they've moved on from is 0. |
| `timeframe` | TEXT (JSON) | `{ "start": "2021", "end": "2024-07" }`. Omit `end` while current. Estimates are fine. |
| `card` | TEXT (JSON) | The fields, flexible but standardized (§3) |
| `source` | TEXT | `zoom-registration`, `login`, `linkedin`, `manual`, … |
| `created_at`, `updated_at` | TEXT | ISO 8601 timestamps |

Columns are for what we filter and join on. The JSON is for what describes the card. Don't move a column into the JSON or the other way round without updating this spec.

### `SessionRegistrations`

One row per person per session.

| Column | Type | Notes |
|---|---|---|
| `session_slug` | TEXT | `src/content/sessions/<slug>.md` |
| `person_id` | TEXT | → `People.id` |
| `registered_email` | TEXT | Exactly what they typed into Zoom, lowercased |
| `registered_at` | TEXT | From the export |
| `attendance` | TEXT | Zoom's own value: `Attended`, `Absent` |
| `minutes_attended` | REAL NULL | Post-event reports only |
| `first_join_at` | TEXT NULL | Post-event reports only |
| `source_file` | TEXT | The export, relative to `context-v/extra/` |
| `report_generated_at` | TEXT | When Zoom generated the export |
| `imported_at` | TEXT | |

Primary key `(session_slug, person_id)`. **`report_generated_at` matters:** an export downloaded before the session marks everyone Absent. Every export we hold for Apr 29, May 27, Jul 29 and Nov 19 was downloaded before the session, so attendance needs the post-event attendee reports.

### `PersonInteractions`

Every time we hear from a person, and at which address. Append-only.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `person_id` | TEXT | → `People.id` |
| `email` | TEXT NULL | The address they used |
| `kind` | TEXT | `registration`, `attendance`, `login`; more as sources arrive |
| `at` | TEXT | When it happened, ISO 8601 |
| `ref` | TEXT | The source row: `Session:<slug>`, `AuthEvent:<id>` |
| `created_at` | TEXT | |

Unique on `(kind, ref, email)`, so re-recording updates instead of duplicating. It answers "when did we last hear from this person, at which address?" and drives which address we send to (§4).

`SessionRegistrations.session_slug` references `Session.slug`. Every session page has a `Session` row (added 2026-11-19 for the four sessions that had no polls).

## 3. Card types and standard fields

`card` is JSON so fields can evolve without a migration. The standard fields below are written the same way every time; anything else is allowed. `src/lib/contact-cards.ts` holds the Zod schema (standard fields typed, `.passthrough()` for the rest) and every write goes through it.

**`role`**: one role at one organization.

```json
{
  "org": "Prose Ventures",
  "org_domain": "proseventures.com",
  "title": "General Partner",
  "email": "jules@proseventures.com",
  "email_aliases": ["jules@prose.vc"],
  "site_link": "https://proseventures.com/team/jules",
  "bio": "…",
  "primary": true
}
```

**`personal`**: not tied to a role. Gmail and other personal addresses go here.

```json
{ "email": "someone@gmail.com", "phone": "…", "location": "San Francisco" }
```

**`socials`**: the usual links. One active socials card per person.

```json
{ "linkedin": "https://www.linkedin.com/in/…", "github": "https://github.com/…", "x": "https://x.com/…", "bluesky": "…", "site": "https://…" }
```

**Conventions**

- Field names are `snake_case`.
- Emails are lowercased and trimmed.
- Links are full `https://` URLs.
- `primary: true` marks the person's primary card. Use it only to override the default (§4).
- **One role, several addresses** (two domains of one firm, an old address after a rebrand) is one card, not several:
  - `email` is the address we send to;
  - `email_aliases` lists the others. They're recognized when someone registers or signs in, and never sent to.
  - `email_pinned: true` keeps `email` as set by hand. Otherwise `email` follows the most recently used address (§4).
  - A personal address next to a firm one is a second card (`personal`), not an alias.
- **Dates** in `timeframe` are ISO 8601 at whatever precision we know: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. They sort correctly as text. The compact forms `YYYYMM` and `YYYYMMDD` are accepted on input and normalized on write (`YYYYMM` alone is not valid ISO 8601).
- `timeframe` may carry `"estimated": true` when inferred, for example from LinkedIn.

## 4. Redundant fields, written in one place

Two kinds of copy are kept, so queries and sending stay simple:

- **A card's `email`** is whichever of its addresses was used most recently, according to `PersonInteractions`, unless the card sets `email_pinned`.
- **`People.email`, `.org` and `.title`** copy the primary card, so most queries never touch JSON.

They stay correct because **all writes go through `src/lib/contact-cards.ts`**:
- `upsertContactCard()` and `addEmailAlias()` for cards;
- `recordInteractions()` for interactions;
- `mergePeople()` for merges.

Each ends with `recomputePerson()`, which re-picks every card's sending address and then rewrites the three columns, in the same transaction.

Recency picks the address **within** a card, never **between** cards. A fellow who signs in with Gmail still gets professional mail at their firm address, unless their personal card is marked `primary`.

The **primary card** is:
1. the card marked `primary: true`; else
2. the active `role` card with the latest `timeframe.start`; else
3. the active `personal` card.

**Sending** is always built from `People`: one person, one recipient, at `People.email`. Never build a mailing list from registrations or cards, or a person with two addresses gets two emails.

`pnpm db:audit-people` recomputes every person from their cards and lists any row that disagrees. Run it after bulk work; a non-empty list means something wrote around `upsertContactCard()`.

## 5. Finding a person by email

An expression index makes card emails searchable and unique:

```sql
CREATE UNIQUE INDEX person_contact_cards_email
  ON PersonContactCards (json_extract(card, '$.email'))
  WHERE json_extract(card, '$.email') IS NOT NULL;
```

The unique index means one email can only ever belong to one person, which catches most duplicate-person mistakes at write time. SQLite can't index into the `email_aliases` array, so `findPersonIdByEmail()` also searches aliases with `json_each`, and `upsertContactCard()` refuses an alias that belongs to someone else. At a few hundred people the unindexed alias search costs nothing.

## 6. Flows

**Importing a Zoom export** (`pnpm ingest:registrations`, `DRY_RUN=true` first). Registrants are taken in session order, so someone from April is already "there" when their July registration arrives. Each registrant takes one of three paths:

1. **Definite match.** Their email is on a card, or belongs to a login account already linked to a person. Add the registration only. When the match came through the account, also add the email as a card, so it matches directly next time.
2. **No match.** Create the person, a card and the registration:
   - a `role` card when the domain looks like an organization (`org_domain`, plus `org` and `title` if Zoom has them);
   - a `personal` card for Gmail and other personal domains.
3. **Fuzzy match.** Write nothing for them. List them in `context-v/extra/registration-review.json` with each candidate and why it matched. A fuzzy match is:
   - the same name;
   - the same last name with a matching first name ("Rob" and "Robert");
   - a name within two letters;
   - the same email username at another domain, unless the username is just a first name.

   Each candidate is listed with its cards. A person decides each item by setting its `decision` to:
   - `"alias:pcc_…"` for the same person in the same role: the address joins that card's `email_aliases`;
   - `"card:prs_…"` for the same person in another context: a new card for them;
   - `"new"` for a different person.

   The next run applies decided items and keeps the rest listed.

Several exports of one session merge: the earliest registration and any "Attended" win. Registrations are upserted, so re-running never duplicates. Each registration is recorded as an interaction, plus an `attendance` interaction for anyone marked Attended (at their join time, else the session's start).

**Merging** (`pnpm db:merge-people <keep> <merge>`, either side a person id or an email): move the cards, interactions and registrations to `keep`, recompute its redundant fields, and delete `merge`. Report what moved.

**Signing in:** look each login email up on the cards. On a match, set `People.user_id`. If there's no match but the person is already linked by `user_id`, add the new email as a card (`source: login`). Record the login as an interaction. `User` itself is unchanged, and we never pre-create `User` rows. Until sign-in does this, `pnpm db:backfill-logins` records past successful logins from `AuthEvent`.

**Linking public profiles** (`pnpm db:link-participants`, `DRY_RUN=true` first). Each `src/content/participants/<handle>.md` is matched to a person, in order:

1. a person already holding that handle;
2. their login account, found by the profile's `github:` field or its handle;
3. exactly one person with the same name;
4. a decision in `context-v/extra/participant-review.json`;
5. otherwise a similar name goes on that review list (`"link:prs_…"` or `"new"`), and anyone left over becomes a new person, so `People` holds everyone.

A linked person gets `People.handle`, and the profile fills what the database lacks:
- **name:** the profile's curated name, unless the profile's name is just its handle (a stub);
- **firm and role:** on the role card for that firm, meaning the card whose address is at the firm's domain (by name or initials: `mgv.vc` is Maschmeyer Group Ventures); never on an unrelated card;
- **links:** on the socials card;
- **login account:** `People.user_id` and the account's addresses. University, alumni and vanity addresses (`lylan.com`) go on the personal card.

The profile wins a conflict. Anything it can't settle (an address or account already belonging to someone else) is reported and left alone.

Information also flows the other way, by hand: a profile missing a firm is filled from the firm-name lists in `scripts/build-*.ts` when the registration domain names it.

## 7. Queries this enables

```sql
-- Who came to two or more sessions
SELECT p.name, p.org, COUNT(DISTINCT r.session_slug) AS sessions
FROM SessionRegistrations r JOIN People p ON p.id = r.person_id
WHERE r.attendance = 'Attended'
GROUP BY p.id HAVING sessions >= 2 ORDER BY sessions DESC;

-- Registered more than once, never attended
-- Regulars without an account (user_id IS NULL)
-- Every address a person has used: email and email_aliases across their cards
-- Regulars who've gone quiet: MAX(PersonInteractions.at) per person, oldest first
```

## 8. Schema changes live in one place

`db/migrations/001_people-and-contact-cards.sql`, run by `pnpm db:migrate`, which records applied migrations in a `_migrations` table. New tables don't create themselves from library code (as `ProfileVisibility` does today).

## 9. Build order

1. Migration and `src/lib/contact-cards.ts` (schema plus the single write path)
2. `scripts/ingest-zoom-registrations.mjs` reworked to create people and cards; dry run reviewed
3. Write to Turso; work through the review list; `db:backfill-logins`; `db:audit-people`
4. Attendance query script
5. Login binding in `src/lib/user-record.ts`
6. Post-event attendee reports for Nov 19 and earlier sessions, when available

## 10. Out of scope

- Showing any of this publicly. Public pages keep reading `participants/*.md`. Aggregates (firm counts, attendance counts) are fine to render.
- An organizations table. `org` and `org_domain` are strings for now.
- Automated LinkedIn lookups to fill timeframes.

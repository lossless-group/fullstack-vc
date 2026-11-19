-- 001: People, their contact cards, session registrations and interactions.
-- Spec: context-v/specs/People-and-Contact-Cards-for-Session-Registrations.md
-- Applied by `pnpm db:migrate`. Statements are separated by a semicolon at
-- the end of a line; the runner applies the file in one transaction.

-- One row per human, with or without an account. email, org and title are
-- copies of the primary card, written only by upsertContactCard() in
-- src/lib/contact-cards.ts. Never write them directly.
CREATE TABLE People (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  org TEXT,
  title TEXT,
  user_id TEXT,
  handle TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX people_user_id ON People (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX people_handle ON People (handle) WHERE handle IS NOT NULL;
CREATE INDEX people_email ON People (email);

-- What's known about a person in one context: a role, their personal
-- details, or their social links. card holds the fields as JSON, in the
-- shapes defined by src/lib/contact-cards.ts.
CREATE TABLE PersonContactCards (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES People (id),
  card_type TEXT NOT NULL CHECK (card_type IN ('role', 'personal', 'socials')),
  active INTEGER NOT NULL DEFAULT 1,
  timeframe TEXT,
  card TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX person_contact_cards_person ON PersonContactCards (person_id);

-- One email belongs to one person, ever. This is what makes "find the
-- person for this email" fast, and it refuses most duplicate-person mistakes.
CREATE UNIQUE INDEX person_contact_cards_email
  ON PersonContactCards (json_extract(card, '$.email'))
  WHERE json_extract(card, '$.email') IS NOT NULL;

-- One row per person per session. registered_email is what they typed into
-- Zoom; report_generated_at tells a real Absent from an export downloaded
-- before the session.
CREATE TABLE SessionRegistrations (
  session_slug TEXT NOT NULL REFERENCES Session (slug),
  person_id TEXT NOT NULL REFERENCES People (id),
  registered_email TEXT NOT NULL,
  registered_at TEXT,
  attendance TEXT,
  minutes_attended REAL,
  first_join_at TEXT,
  source_file TEXT NOT NULL,
  report_generated_at TEXT,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (session_slug, person_id)
);

CREATE INDEX session_registrations_person ON SessionRegistrations (person_id);

-- Every time we hear from a person, at which address: registrations,
-- attendance, logins. Append-only; written by recordInteractions() in
-- src/lib/contact-cards.ts, which also re-picks each card's sending email
-- (the most recently used, unless the card pins one). ref points back at the
-- source row, e.g. 'Session:2026-11-19_monthly-all-hands' or 'AuthEvent:412',
-- so re-importing updates instead of duplicating.
CREATE TABLE PersonInteractions (
  id INTEGER PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES People (id),
  email TEXT,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  ref TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX person_interactions_source ON PersonInteractions (kind, ref, email);
CREATE INDEX person_interactions_person ON PersonInteractions (person_id, at);
CREATE INDEX person_interactions_email ON PersonInteractions (email, at);

-- 002: People.called, the other names a person goes by.
-- Spec: context-v/specs/People-and-Contact-Cards-for-Session-Registrations.md
--
-- A JSON array of whole names: nicknames, short forms, pseudonyms, a name
-- they used before a profile renamed them ("Gopi Sundaramurthy" for
-- Gopinath, "Huiting Koh" for Hui Koh). Matching checks these as well as
-- `name`. Written through addCalled() in src/lib/contact-cards.ts.
ALTER TABLE People ADD COLUMN called TEXT;

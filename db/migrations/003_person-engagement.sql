-- 003: PersonEngagement, one engagement score per person.
-- Plan: context-v/plans/Engagement-Scores-on-People.md
--
--   +1 per session registration
--   +3 per session attended
--   +5 per successful login
--   +3 per poll answered (distinct polls voted in)
--
-- Logins and votes join through People.user_id; registrations through
-- person_id. Counted from the source tables rather than PersonInteractions,
-- since sign-in doesn't record interactions yet.
CREATE VIEW IF NOT EXISTS PersonEngagement AS
SELECT
  p.id AS person_id,
  p.handle,
  COALESCE(r.registrations, 0) AS registrations,
  COALESCE(r.attended, 0) AS attended,
  COALESCE(l.logins, 0) AS logins,
  COALESCE(v.polls, 0) AS polls,
  COALESCE(r.registrations, 0) * 1
    + COALESCE(r.attended, 0) * 3
    + COALESCE(l.logins, 0) * 5
    + COALESCE(v.polls, 0) * 3 AS score
FROM People p
LEFT JOIN (
  SELECT person_id,
         COUNT(*) AS registrations,
         SUM(CASE WHEN attendance = 'Attended' THEN 1 ELSE 0 END) AS attended
  FROM SessionRegistrations GROUP BY person_id
) r ON r.person_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS logins
  FROM AuthEvent WHERE outcome = 'success' AND user_id IS NOT NULL GROUP BY user_id
) l ON l.user_id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT poll_id) AS polls
  FROM Vote WHERE user_id IS NOT NULL GROUP BY user_id
) v ON v.user_id = p.user_id;

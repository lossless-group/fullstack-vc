-- 004: PersonEngagement counts logins from before login tracking began.
-- Plan: context-v/plans/Engagement-Scores-on-People.md
--
-- AuthEvent only starts on 2026-05-21, so the 14 people who signed in during
-- the first weeks scored no logins. User.first_login_at and last_login_at
-- still record them: a first login before AuthEvent began counts once, and a
-- different last login before then counts once more. Logins after that come
-- from AuthEvent as before. Scoring is otherwise unchanged from 003.
DROP VIEW IF EXISTS PersonEngagement;
CREATE VIEW PersonEngagement AS
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
  SELECT u.id AS user_id,
         (SELECT COUNT(*) FROM AuthEvent a WHERE a.user_id = u.id AND a.outcome = 'success')
         + CASE WHEN u.first_login_at < (SELECT MIN(at) FROM AuthEvent) THEN 1 ELSE 0 END
         + CASE WHEN u.last_login_at < (SELECT MIN(at) FROM AuthEvent)
                 AND u.last_login_at <> u.first_login_at THEN 1 ELSE 0 END AS logins
  FROM User u
) l ON l.user_id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT poll_id) AS polls
  FROM Vote WHERE user_id IS NOT NULL GROUP BY user_id
) v ON v.user_id = p.user_id;

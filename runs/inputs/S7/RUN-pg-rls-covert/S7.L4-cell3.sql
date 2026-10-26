SET search_path = app;

-- world 1: Birch already has a private document with the slug 'layoffs-memo'
SET ROLE frank;
SELECT set_config('app.user', 'frank', false);
INSERT INTO documents (id, slug, team_id) VALUES ('f1', 'layoffs-memo', 2);

-- world 2, after your call: Birch has no such row. Remove the -- marks and run again.
-- RESET ROLE;
-- DELETE FROM documents WHERE id = 'layoffs-memo';
-- SET ROLE frank;
-- SELECT set_config('app.user', 'frank', false);
-- INSERT INTO documents (id, slug, team_id) VALUES ('f1', 'layoffs-memo', 2);

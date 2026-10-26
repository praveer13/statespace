-- world 2, after your call: Birch has no such row. Remove the -- marks and run again.
RESET ROLE;
DELETE FROM documents WHERE id = 'layoffs-memo';
SET ROLE frank;
SELECT set_config('app.user', 'frank', false);
INSERT INTO documents (id, slug, team_id) VALUES ('f1', 'layoffs-memo', 2);

-- S7.L4 cell 1, the edit the @after asks for, written by the recorder: run after the cell, in the same session.
-- As dana, an editor of Payments, move q3-plan to Growth, where she is not an editor.
RESET ROLE;
SET ROLE dana;
SELECT set_config('app.user', 'dana', false);
UPDATE documents SET team_id = 2 WHERE id = 'q3-plan';
RESET ROLE;
SELECT id, team_id, title FROM documents WHERE id = 'q3-plan';

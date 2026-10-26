SET search_path = app;

-- the three read rules, as policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_team ON documents FOR SELECT
  USING (team_id = ANY (user_teams(current_setting('app.user', true))));
CREATE POLICY read_shared ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM shares s
                 WHERE s.doc_id = documents.id
                   AND s.user_name = current_setting('app.user', true)
                   AND NOT s.revoked));
CREATE POLICY read_team_shared ON documents FOR SELECT
  USING (shared_team_ids && user_teams(current_setting('app.user', true)));

-- frank, a viewer on Growth, changes a row he cannot see
SET ROLE frank;
SELECT set_config('app.user', 'frank', false);
UPDATE documents SET title = 'x' WHERE id = 'q3-plan';

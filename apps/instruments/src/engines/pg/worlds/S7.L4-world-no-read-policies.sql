-- S7.L4 template world (W0), generated from scripts/spikes/W0-S08/rls-spec.mjs; mode: no-read-policies
CREATE ROLE app_owner NOLOGIN;
CREATE ROLE app_users NOLOGIN;
CREATE ROLE dana NOLOGIN IN ROLE app_users;
CREATE ROLE frank NOLOGIN IN ROLE app_users;
CREATE ROLE gia NOLOGIN IN ROLE app_users;
CREATE ROLE hal NOLOGIN IN ROLE app_users;
CREATE ROLE eli NOLOGIN IN ROLE app_users;
CREATE ROLE ivy NOLOGIN IN ROLE app_users;
CREATE ROLE jo NOLOGIN IN ROLE app_users;
CREATE ROLE kim NOLOGIN IN ROLE app_users;
CREATE ROLE rls_bypass NOLOGIN BYPASSRLS IN ROLE app_users;
CREATE SCHEMA app AUTHORIZATION app_owner;
GRANT USAGE ON SCHEMA app TO app_users;
SET ROLE app_owner;
CREATE TABLE app.teams (id int PRIMARY KEY, name text NOT NULL, tenant text NOT NULL);
CREATE TABLE app.subteams (child_id int NOT NULL REFERENCES app.teams (id), parent_id int NOT NULL REFERENCES app.teams (id));
CREATE TABLE app.memberships (user_name text NOT NULL, team_id int NOT NULL REFERENCES app.teams (id), role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')), PRIMARY KEY (user_name, team_id));
CREATE TABLE app.documents (id text PRIMARY KEY, slug text NOT NULL UNIQUE, team_id int NOT NULL REFERENCES app.teams (id), title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', internal_notes text NOT NULL DEFAULT '', shared_team_ids int[] NOT NULL DEFAULT '{}');
CREATE TABLE app.shares (doc_id text NOT NULL REFERENCES app.documents (id), user_name text NOT NULL, revoked boolean NOT NULL DEFAULT false);
CREATE FUNCTION app.user_teams(u text) RETURNS int[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $f$
     WITH RECURSIVE t(team_id) AS (
       SELECT m.team_id FROM app.memberships m WHERE m.user_name = u
       UNION
       SELECT s.parent_id FROM app.subteams s JOIN t ON s.child_id = t.team_id)
     SELECT coalesce(array_agg(team_id ORDER BY team_id), '{}'::int[]) FROM t $f$;
CREATE FUNCTION app.editor_teams(u text) RETURNS int[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $f$
     SELECT coalesce(array_agg(m.team_id ORDER BY m.team_id), '{}'::int[]) FROM app.memberships m WHERE m.user_name = u AND m.role <> 'viewer' $f$;
CREATE TABLE app.notes (id int PRIMARY KEY, body text NOT NULL);
CREATE TABLE app.vault (id int PRIMARY KEY, secret text NOT NULL);
INSERT INTO app.notes VALUES (1, 'n1'), (2, 'n2');
INSERT INTO app.vault VALUES (1, 's1'), (2, 's2');
GRANT SELECT, INSERT, UPDATE ON app.documents TO app_users;
GRANT SELECT ON app.shares, app.notes, app.vault TO app_users;
ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.vault ENABLE ROW LEVEL SECURITY;
RESET ROLE;
TRUNCATE app.shares, app.documents, app.memberships, app.subteams, app.teams;
INSERT INTO app.teams VALUES (1, 'Payments', 'Acme'), (2, 'Growth', 'Acme'), (3, 'Legal', 'Birch'), (4, 'Risk', 'Acme');
INSERT INTO app.subteams VALUES (4, 1);
INSERT INTO app.memberships VALUES ('dana', 1, 'editor'), ('frank', 2, 'viewer'), ('gia', 3, 'admin'), ('hal', 3, 'viewer'), ('eli', 4, 'viewer');
INSERT INTO app.documents (id, slug, team_id, title, shared_team_ids) VALUES ('contract', 'contract', 3, 'contract title', '{}'), ('layoffs-memo', 'layoffs-memo', 3, 'layoffs-memo title', '{}'), ('q3-plan', 'q3-plan', 1, 'q3-plan title', '{}'), ('roadmap', 'roadmap', 2, 'roadmap title', '{1}');
INSERT INTO app.shares VALUES ('contract', 'dana', false), ('roadmap', 'gia', true);
CREATE POLICY edit_team ON app.documents FOR UPDATE USING (team_id = ANY (app.editor_teams(current_setting('app.user', true)))) WITH CHECK (team_id = ANY (app.editor_teams(current_setting('app.user', true))));
CREATE POLICY insert_team ON app.documents FOR INSERT WITH CHECK (team_id = ANY (app.user_teams(current_setting('app.user', true))));
CREATE POLICY notes_read ON app.notes FOR SELECT TO app_users USING (true);

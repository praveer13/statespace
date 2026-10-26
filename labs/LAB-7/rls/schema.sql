-- LAB-7.4: the S7 schema for row-level security, supplied by the course (reference module, earns nothing).
-- `statespace check lab7.4` loads it into a fresh database on your PostgreSQL 18.6 service, then runs your
-- rls/policies.sql, then fills the tables with each fresh world as the superuser.
--
-- The roles app_owner (the table owner), app_users (every end user) and one role per user name exist before
-- this file runs; the check creates the ones that are missing. Policies read the user from the setting
-- app.user, set with set_config('app.user', <name>, false): `SET app.user = ...` does not parse, because
-- `user` is a reserved key word.

CREATE SCHEMA app AUTHORIZATION app_owner;
GRANT USAGE ON SCHEMA app TO app_users;
SET ROLE app_owner;
CREATE TABLE app.teams (id int PRIMARY KEY, name text NOT NULL, tenant text NOT NULL);
CREATE TABLE app.subteams (child_id int NOT NULL REFERENCES app.teams (id), parent_id int NOT NULL REFERENCES app.teams (id));
CREATE TABLE app.memberships (user_name text NOT NULL, team_id int NOT NULL REFERENCES app.teams (id), role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')), PRIMARY KEY (user_name, team_id));
CREATE TABLE app.documents (id text PRIMARY KEY, slug text NOT NULL UNIQUE, team_id int NOT NULL REFERENCES app.teams (id), title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', internal_notes text NOT NULL DEFAULT '', shared_team_ids int[] NOT NULL DEFAULT '{}');
CREATE TABLE app.shares (doc_id text NOT NULL REFERENCES app.documents (id), user_name text NOT NULL, revoked boolean NOT NULL DEFAULT false);

-- The team closure of a user: the teams they are a member of, and every team those are nested in. A
-- teamless user gets the empty array, never NULL.
CREATE FUNCTION app.user_teams(u text) RETURNS int[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $f$
  WITH RECURSIVE t(team_id) AS (
    SELECT m.team_id FROM app.memberships m WHERE m.user_name = u
    UNION
    SELECT s.parent_id FROM app.subteams s JOIN t ON s.child_id = t.team_id)
  SELECT coalesce(array_agg(team_id ORDER BY team_id), '{}'::int[]) FROM t $f$;
CREATE FUNCTION app.editor_teams(u text) RETURNS int[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $f$
  SELECT coalesce(array_agg(m.team_id ORDER BY m.team_id), '{}'::int[]) FROM app.memberships m WHERE m.user_name = u AND m.role <> 'viewer' $f$;

GRANT SELECT, INSERT, UPDATE ON app.documents TO app_users;
GRANT SELECT ON app.shares TO app_users;

-- Writes, supplied: editors and admins of the owning team update; members of a team insert into it.
CREATE POLICY edit_team ON app.documents FOR UPDATE
  USING (team_id = ANY (app.editor_teams(current_setting('app.user', true))))
  WITH CHECK (team_id = ANY (app.editor_teams(current_setting('app.user', true))));
CREATE POLICY insert_team ON app.documents FOR INSERT
  WITH CHECK (team_id = ANY (app.user_teams(current_setting('app.user', true))));
RESET ROLE;

# H17  A row-level security policy that reads another table races with a concurrent
# change to that table. The manual's example (PostgreSQL 18, section 5.9): alice
# demotes mallory from group 2 to group 1 and rewrites the group-2 row; mallory runs
# SELECT ... FOR UPDATE on the group-2 rows at the same moment. At READ COMMITTED
# "it is possible for her to see 'secret from mallory'": the locked row is re-read
# at its newest version, but the policy's subquery on users is not. Controls: the
# same statements after alice has committed.

setup
{
  CREATE ROLE alice;
  CREATE ROLE bob;
  CREATE ROLE mallory;
  CREATE TABLE groups (group_id int PRIMARY KEY, group_name text NOT NULL);
  INSERT INTO groups VALUES (1, 'low'), (2, 'medium'), (5, 'high');
  GRANT ALL ON groups TO alice;
  GRANT SELECT ON groups TO public;
  CREATE TABLE users (user_name text PRIMARY KEY, group_id int NOT NULL REFERENCES groups);
  INSERT INTO users VALUES ('alice', 5), ('bob', 2), ('mallory', 2);
  GRANT ALL ON users TO alice;
  GRANT SELECT ON users TO public;
  CREATE TABLE information (info text, group_id int NOT NULL REFERENCES groups);
  INSERT INTO information VALUES ('barely secret', 1), ('slightly secret', 2), ('very secret', 5);
  ALTER TABLE information ENABLE ROW LEVEL SECURITY;
  CREATE POLICY fp_s ON information FOR SELECT USING (group_id <= (SELECT group_id FROM users WHERE user_name = current_user));
  CREATE POLICY fp_u ON information FOR UPDATE USING (group_id <= (SELECT group_id FROM users WHERE user_name = current_user));
  GRANT ALL ON information TO public;
}

teardown
{
  DROP TABLE information, users, groups;
  DROP ROLE alice, bob, mallory;
}

session alice
setup { SET ROLE alice; }
step ab_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step ab_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step ab_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step aupd { UPDATE users SET group_id = 1 WHERE user_name = 'mallory'; UPDATE information SET info = 'secret from mallory' WHERE group_id = 2 RETURNING info, group_id; }
step ac { COMMIT; }
teardown { RESET ROLE; }

session mallory
setup { SET ROLE mallory; }
step mb_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step mb_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step mb_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step msel { SELECT info, group_id FROM information WHERE group_id = 2 FOR UPDATE; }
step mplain { SELECT info, group_id FROM information WHERE group_id = 2; }
step mc { COMMIT; }
teardown { RESET ROLE; }

session obs
step chk { SELECT user_name, group_id FROM users ORDER BY user_name; }

permutation ab_rc aupd mb_rc msel ac mc chk
permutation ab_rr aupd mb_rr msel ac mc chk
permutation ab_ser aupd mb_ser msel ac mc chk
permutation ab_rc aupd ac mb_rc msel mc chk
permutation ab_rc aupd ac mb_rc mplain mc chk

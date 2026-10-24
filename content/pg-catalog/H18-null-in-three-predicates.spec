# H18  NULL means something different in each kind of predicate.
#   CHECK (bal >= 0): the expression is NULL, and a check passes on NULL.
#   WHERE bal >= 10: the expression is NULL, and the row is skipped without a word.
#   Row-level security: USING hides a row whose policy expression is NULL, and
#   WITH CHECK raises an error on a new row whose expression is NULL.
# The manual (PostgreSQL 18, section 5.5.1): "a check constraint is satisfied if the
# check expression evaluates to true or the null value". s1 runs the first two
# against nacct; u runs the policy cases as a role the policy applies to (tables
# are owned by the superuser, who bypasses policies). A statement error ends a
# transaction, so each error case has its own permutation. The statements are
# single-session, so the levels are expected to agree, and each level is run.

setup
{
  CREATE ROLE rls_user;
  CREATE TABLE nacct (id int PRIMARY KEY, bal bigint CHECK (bal >= 0));
  CREATE TABLE racct (id int PRIMARY KEY, bal bigint);
  ALTER TABLE racct ENABLE ROW LEVEL SECURITY;
  CREATE POLICY p_all ON racct FOR ALL USING (bal >= 0) WITH CHECK (bal >= 0);
  GRANT ALL ON racct TO rls_user;
  INSERT INTO racct VALUES (1, 70), (3, NULL);
}

teardown
{
  DROP TABLE nacct, racct;
  DROP ROLE rls_user;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step ins_null { INSERT INTO nacct VALUES (1, NULL) RETURNING id, bal; }
step ins_50 { INSERT INTO nacct VALUES (2, 50) RETURNING id, bal; }
step upd_where { UPDATE nacct SET bal = bal - 10 WHERE bal >= 10 RETURNING id, bal; }
step s1c { COMMIT; }

session u
setup { SET ROLE rls_user; }
step ub_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step ub_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step ub_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step u_sel { SELECT id, bal FROM racct ORDER BY id; }
step u_ins_null { INSERT INTO racct VALUES (2, NULL) RETURNING id, bal; }
step uc { COMMIT; }
teardown { RESET ROLE; }

session obs
step chk { SELECT id, bal FROM nacct ORDER BY id; SELECT id, bal FROM racct ORDER BY id; }

permutation s1b_rc ins_null ins_50 upd_where s1c chk
permutation ub_rc u_sel uc
permutation ub_rc u_ins_null uc chk
permutation s1b_rr ins_null ins_50 upd_where s1c chk
permutation ub_rr u_sel uc
permutation ub_rr u_ins_null uc chk
permutation s1b_ser ins_null ins_50 upd_where s1c chk
permutation ub_ser u_sel uc
permutation ub_ser u_ins_null uc chk

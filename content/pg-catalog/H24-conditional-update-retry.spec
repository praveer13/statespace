# H24  The conditional UPDATE twin of H02 at REPEATABLE READ and SERIALIZABLE, with
# a whole-command retry. A and B each try to debit 80 from 100 in one conditional
# UPDATE; B waits for A's row lock; A commits; at these levels B fails with a
# serialization failure. B retries from BEGIN: the guard now reads 20 and the
# UPDATE affects 0 rows. The READ COMMITTED permutation is the control: there B's
# statement re-checks its WHERE clause and affects 0 rows with no error and no retry.

setup
{
  CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL, team int);
  INSERT INTO acct VALUES (1, 100, 1), (2, 100, 1);
}

teardown
{
  DROP TABLE acct;
}

session a
step ab_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step ab_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step ab_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step au { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step ac { COMMIT; }

session b
step bb_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step bb_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step bb_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step bu { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step bc { COMMIT; }
step bb2_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step bb2_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step bu2 { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step bc2 { COMMIT; }

session obs
step chk { SELECT id, bal FROM acct ORDER BY id; }

permutation ab_rc bb_rc au bu ac bc chk
permutation ab_rr bb_rr au bu ac bc bb2_rr bu2 bc2 chk
permutation ab_ser bb_ser au bu ac bc bb2_ser bu2 bc2 chk

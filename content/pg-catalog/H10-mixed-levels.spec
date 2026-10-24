# H10  Mixed levels void the guarantee. The team-sum write skew of H05 (two accounts
# of 100, each session reads the team total of 200 and debits 150 from its own
# account), run with one session SERIALIZABLE and the other READ COMMITTED, in both
# assignments and both commit orders, and with both SERIALIZABLE as the control.
# The manual's scope (PostgreSQL 18, section 13.2.3): the guarantee covers "any set
# of successfully committed concurrent Serializable transactions".

setup
{
  CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL, team int);
  INSERT INTO acct VALUES (1, 100, 1), (2, 100, 1);
}

teardown
{
  DROP TABLE acct;
}

session s1
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT sum(bal) AS total FROM acct WHERE team = 1; SELECT total FROM seen; }
step s1w { UPDATE acct SET bal = bal - 150 WHERE id = 1 AND (SELECT total FROM seen) - 150 >= 0 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s1c { COMMIT; }

session s2
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT sum(bal) AS total FROM acct WHERE team = 1; SELECT total FROM seen; }
step s2w { UPDATE acct SET bal = bal - 150 WHERE id = 2 AND (SELECT total FROM seen) - 150 >= 0 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s2c { COMMIT; }

session obs
step chk { SELECT id, bal FROM acct ORDER BY id; SELECT sum(bal) AS team_total FROM acct WHERE team = 1; }

permutation s1b_ser s1r s2b_ser s2r s1w s2w s1c s2c chk
permutation s1b_ser s1r s2b_ser s2r s1w s2w s2c s1c chk
permutation s1b_ser s1r s2b_rc s2r s1w s2w s1c s2c chk
permutation s1b_ser s1r s2b_rc s2r s1w s2w s2c s1c chk
permutation s1b_rc s1r s2b_ser s2r s1w s2w s1c s2c chk
permutation s1b_rc s1r s2b_ser s2r s1w s2w s2c s1c chk

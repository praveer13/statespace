# LAB-6.1: the read-modify-write history, in isolationtester format (labs/LAB-6/README.md).
#
# Two sessions each debit 80 from account 1's balance of 100: each reads the balance, then writes a constant
# computed from what it read, guarded by its own read. This is catalog row H01 at READ COMMITTED.
# `statespace check lab6.1` runs it with `statespace isorun` on your PostgreSQL server.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL, team int);
  INSERT INTO acct VALUES (1, 100, 1), (2, 100, 1);
}

teardown
{
  DROP TABLE acct;
}

session s1
step s1b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT bal FROM acct WHERE id = 1; SELECT bal FROM seen; }
step s1w { UPDATE acct SET bal = (SELECT bal FROM seen) - 80 WHERE id = 1 AND (SELECT bal FROM seen) >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s1c { COMMIT; }

session s2
step s2b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT bal FROM acct WHERE id = 1; SELECT bal FROM seen; }
step s2w { UPDATE acct SET bal = (SELECT bal FROM seen) - 80 WHERE id = 1 AND (SELECT bal FROM seen) >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s2c { COMMIT; }

session obs
step chk { SELECT id, bal FROM acct ORDER BY id; }

# TODO(you): predict first: how much is spent, and what is account 1's balance at the end? Then replace this
# line with the one permutation in which both sessions read, s1 writes, s2's write waits for s1's lock, s1
# commits, then s2 commits, and obs reads last.
permutation s1b s1r s1w s1c s2b s2r s2w s2c chk

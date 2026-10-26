# LAB-6.5: write skew on existing rows: each session reads the team's total, then debits a different account of the team by 150 if the total still covers it, in isolationtester format (labs/LAB-6/README.md).
#
# Reproduce catalog row H05: labs/LAB-6/catalog/H05-write-skew-team-sum.spec is the row's spec, and the .out beside it is what
# isolationtester printed when it ran on PostgreSQL. `statespace check lab6.5` runs every permutation you write
# with `statespace isorun`, at the isolation level your BEGIN steps state, and compares each permutation's commit,
# abort and SQLSTATE outcome with the outcomes the row recorded at that level. Cover REPEATABLE READ and SERIALIZABLE.
#
# Name the two sessions s1 and s2. A session named obs may read the state; it is not compared.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL, team int);
  INSERT INTO acct VALUES (1, 100, 1), (2, 100, 1);
}

teardown
{
  DROP TABLE acct;
}

# TODO(you): the sessions' steps and the permutations to run. One session per transaction; write a begin step
# per isolation level (for example s1b_rc and s1b_ser) and one permutation line per interleaving.
session s1
step s1b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1c { COMMIT; }

permutation s1b s1c

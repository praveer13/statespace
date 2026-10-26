# LAB-6.5: the lost update through application read-modify-write: two sessions each debit 80 from account 1's balance of 100 by reading the balance, then writing a constant computed from what they read, in isolationtester format (labs/LAB-6/README.md).
#
# Reproduce catalog row H01: labs/LAB-6/catalog/H01-lost-update-rmw.spec is the row's spec, and the .out beside it is what
# isolationtester printed when it ran on PostgreSQL. `statespace check lab6.5` runs every permutation you write
# with `statespace isorun`, at the isolation level your BEGIN steps state, and compares each permutation's commit,
# abort and SQLSTATE outcome with the outcomes the row recorded at that level. Cover READ COMMITTED and SERIALIZABLE.
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

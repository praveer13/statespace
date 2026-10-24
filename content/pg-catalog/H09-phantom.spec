# H09  Phantom. A session counts the rows of a team twice while another session
# inserts a row of that team and commits between the two counts.

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
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1n1 { SELECT count(*) AS members FROM acct WHERE team = 1; }
step s1n2 { SELECT count(*) AS members FROM acct WHERE team = 1; }
step s1c { COMMIT; }

session s2
step s2b { BEGIN; }
step s2i { INSERT INTO acct VALUES (3, 0, 1) RETURNING id, team; }
step s2c { COMMIT; }

session obs
step chk { SELECT id, bal, team FROM acct ORDER BY id; }

permutation s1b_rc s1n1 s2b s2i s2c s1n2 s1c chk
permutation s1b_rr s1n1 s2b s2i s2c s1n2 s1c chk
permutation s1b_ser s1n1 s2b s2i s2c s1n2 s1c chk

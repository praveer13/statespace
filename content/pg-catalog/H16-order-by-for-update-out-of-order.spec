# H16  ORDER BY with FOR UPDATE can return rows out of order. s1 changes the sort
# column of the first row and has not committed; s2 sorts, blocks on that row, and
# resumes with the new value. The manual (PostgreSQL 18, SELECT, The Locking Clause)
# says READ COMMITTED can return rows out of order, REPEATABLE READ and SERIALIZABLE
# raise a serialization failure, and the workaround is FOR UPDATE in a subquery
# (s2sub).

setup
{
  CREATE TABLE q (id int PRIMARY KEY, prio int NOT NULL);
  INSERT INTO q VALUES (1, 10), (2, 20), (3, 30);
}

teardown
{
  DROP TABLE q;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1u { UPDATE q SET prio = 40 WHERE id = 1; }
step s1c { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2sel { SELECT id, prio FROM q ORDER BY prio FOR UPDATE; }
step s2sub { SELECT id, prio FROM (SELECT id, prio FROM q FOR UPDATE) AS ss ORDER BY prio; }
step s2c { COMMIT; }

session obs
step chk { SELECT id, prio FROM q ORDER BY id; }

permutation s1b_rc s1u s2b_rc s2sel s1c s2c chk
permutation s1b_rr s1u s2b_rr s2sel s1c s2c chk
permutation s1b_ser s1u s2b_ser s2sel s1c s2c chk
permutation s1b_rc s1u s2b_rc s2sub s1c s2c chk
permutation s1b_rr s1u s2b_rr s2sub s1c s2c chk
permutation s1b_ser s1u s2b_ser s2sub s1c s2c chk

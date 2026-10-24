# H06a  Predicate write skew through INSERT (Adya G2). The manual's example
# (PostgreSQL 18, section 13.2.3): mytab(class, value); transaction A sums class 1
# and inserts the total as a new row of class 2; transaction B sums class 2 and
# inserts the total as a new row of class 1. Each reads what the other writes.
# The sum a session read is kept in a temporary table, as the client's memory.

setup
{
  CREATE TABLE mytab (class int, value int);
  INSERT INTO mytab VALUES (1, 10), (1, 20), (2, 100), (2, 200);
}

teardown
{
  DROP TABLE mytab;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT sum(value) AS total FROM mytab WHERE class = 1; SELECT total FROM seen; }
step s1w { INSERT INTO mytab SELECT 2, total FROM seen RETURNING class, value; }
step s1c { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT sum(value) AS total FROM mytab WHERE class = 2; SELECT total FROM seen; }
step s2w { INSERT INTO mytab SELECT 1, total FROM seen RETURNING class, value; }
step s2c { COMMIT; }

session obs
step chk { SELECT class, value FROM mytab ORDER BY class, value; }

permutation s1b_rc s1r s2b_rc s2r s1w s2w s1c s2c chk
permutation s1b_rc s1r s2b_rc s2r s1w s2w s2c s1c chk
permutation s1b_rr s1r s2b_rr s2r s1w s2w s1c s2c chk
permutation s1b_rr s1r s2b_rr s2r s1w s2w s2c s1c chk
permutation s1b_ser s1r s2b_ser s2r s1w s2w s1c s2c chk
permutation s1b_ser s1r s2b_ser s2r s1w s2w s2c s1c chk

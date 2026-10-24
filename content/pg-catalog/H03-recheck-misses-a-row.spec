# H03  READ COMMITTED re-checks the WHERE clause on the updated row version, so a
# command can act on a state no serial order shows. The manual's example (PostgreSQL
# 18, section 13.2.1): website(hits) = {9, 10}; one session adds 1 to every row,
# another deletes the row with hits = 10 and waits for the first to commit.
# Levels are separate begin steps; each level runs the concurrent order, then both
# serial orders as controls.

setup
{
  CREATE TABLE website (hits int);
  INSERT INTO website VALUES (9), (10);
}

teardown
{
  DROP TABLE website;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1u { UPDATE website SET hits = hits + 1; }
step s1c { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2d { DELETE FROM website WHERE hits = 10 RETURNING hits; }
step s2c { COMMIT; }

session obs
step chk { SELECT hits FROM website ORDER BY hits; }

permutation s1b_rc s1u s2b_rc s2d s1c s2c chk
permutation s1b_rc s1u s1c s2b_rc s2d s2c chk
permutation s2b_rc s2d s2c s1b_rc s1u s1c chk
permutation s1b_rr s1u s2b_rr s2d s1c s2c chk
permutation s1b_rr s1u s1c s2b_rr s2d s2c chk
permutation s2b_rr s2d s2c s1b_rr s1u s1c chk
permutation s1b_ser s1u s2b_ser s2d s1c s2c chk
permutation s1b_ser s1u s1c s2b_ser s2d s2c chk
permutation s2b_ser s2d s2c s1b_ser s1u s1c chk

# H13  INSERT ... ON CONFLICT DO UPDATE on a row no snapshot of the statement can
# see. s1 inserts key 1 and has not committed; s2's statement meets the conflict,
# waits for s1, and then acts on the committed row (PostgreSQL 18 manual, section
# 13.2.1: the UPDATE clause "will affect that row, even though possibly no version
# of that row is conventionally visible to the command"; DO NOTHING may skip the
# insert "only in Read Committed mode"). Controls: the same statements after s1 has
# committed, when the row is visible to them.

setup
{
  CREATE TABLE kv (k int PRIMARY KEY, v text NOT NULL);
}

teardown
{
  DROP TABLE kv;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1ins { INSERT INTO kv VALUES (1, 's1') RETURNING k, v; }
step s1c { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2up { INSERT INTO kv VALUES (1, 's2') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v RETURNING k, v; }
step s2nothing { INSERT INTO kv VALUES (1, 's2') ON CONFLICT (k) DO NOTHING RETURNING k, v; }
step s2c { COMMIT; }

session obs
step chk { SELECT k, v FROM kv ORDER BY k; }

permutation s1b_rc s1ins s2b_rc s2up s1c s2c chk
permutation s1b_rr s1ins s2b_rr s2up s1c s2c chk
permutation s1b_ser s1ins s2b_ser s2up s1c s2c chk
permutation s1b_rc s1ins s2b_rc s2nothing s1c s2c chk
permutation s1b_rr s1ins s2b_rr s2nothing s1c s2c chk
permutation s1b_ser s1ins s2b_ser s2nothing s1c s2c chk
permutation s1b_rc s1ins s1c s2b_rc s2up s2c chk
permutation s1b_rr s1ins s1c s2b_rr s2up s2c chk
permutation s1b_ser s1ins s1c s2b_ser s2up s2c chk

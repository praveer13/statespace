# H14  MERGE does not guarantee that either INSERT or UPDATE happens. Two sessions
# MERGE the same new key (update when matched, insert when not). The manual
# (PostgreSQL 18, section 13.2.1): "If MERGE attempts an INSERT and a unique index
# is present and a duplicate row is concurrently inserted, then a uniqueness
# violation error is raised; MERGE does not attempt to avoid such errors by
# restarting evaluation of MATCHED conditions." The twin of H13, which turns the
# same conflict into an UPDATE.

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
step s1m { MERGE INTO kv USING (VALUES (1, 's1')) AS src(k, v) ON kv.k = src.k WHEN MATCHED THEN UPDATE SET v = src.v WHEN NOT MATCHED THEN INSERT (k, v) VALUES (src.k, src.v) RETURNING merge_action() AS action, kv.k, kv.v; }
step s1c { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2m { MERGE INTO kv USING (VALUES (1, 's2')) AS src(k, v) ON kv.k = src.k WHEN MATCHED THEN UPDATE SET v = src.v WHEN NOT MATCHED THEN INSERT (k, v) VALUES (src.k, src.v) RETURNING merge_action() AS action, kv.k, kv.v; }
step s2c { COMMIT; }

session obs
step chk { SELECT k, v FROM kv ORDER BY k; }

permutation s1b_rc s1m s2b_rc s2m s1c s2c chk
permutation s1b_rr s1m s2b_rr s2m s1c s2c chk
permutation s1b_ser s1m s2b_ser s2m s1c s2c chk
permutation s1b_rc s1m s1c s2b_rc s2m s2c chk
permutation s1b_rr s1m s1c s2b_rr s2m s2c chk
permutation s1b_ser s1m s1c s2b_ser s2m s2c chk

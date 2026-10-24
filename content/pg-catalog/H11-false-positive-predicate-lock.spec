# H11  A SERIALIZABLE abort without a real conflict. Each session reads one row and
# updates the same row, so the two sessions share no row. A sequential scan takes a
# relation-level predicate lock, so each session's read conflicts with the other's
# write (PostgreSQL 18 manual, section 13.2.3: "A sequential scan will always
# necessitate a relation-level predicate lock").
# tiny: two rows, default planner. big: 1000 rows, default planner (an index scan,
# at keys far apart in the index). s3 and s4 run the same
# transactions on big with index and bitmap scans disabled, forcing a sequential
# scan. plan_tiny and plan_big show the plans the default planner chose.

setup
{
  CREATE TABLE tiny (id int PRIMARY KEY, v int NOT NULL);
  INSERT INTO tiny VALUES (1, 0), (2, 0);
  CREATE TABLE big (id int PRIMARY KEY, v int NOT NULL);
  INSERT INTO big SELECT g, 0 FROM generate_series(1, 1000) AS g;
  ANALYZE tiny;
  ANALYZE big;
}

teardown
{
  DROP TABLE tiny, big;
}

session s1
step s1b { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1rt { SELECT v FROM tiny WHERE id = 1; }
step s1wt { UPDATE tiny SET v = v + 1 WHERE id = 1 RETURNING id, v; }
step s1rb { SELECT v FROM big WHERE id = 1; }
step s1wb { UPDATE big SET v = v + 1 WHERE id = 1 RETURNING id, v; }
step s1c { COMMIT; }

session s2
step s2b { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2rt { SELECT v FROM tiny WHERE id = 2; }
step s2wt { UPDATE tiny SET v = v + 1 WHERE id = 2 RETURNING id, v; }
step s2rb { SELECT v FROM big WHERE id = 1000; }
step s2wb { UPDATE big SET v = v + 1 WHERE id = 1000 RETURNING id, v; }
step s2c { COMMIT; }

session s3
setup { SET enable_indexscan = off; SET enable_bitmapscan = off; }
step s3b { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s3rb { SELECT v FROM big WHERE id = 1; }
step s3wb { UPDATE big SET v = v + 1 WHERE id = 1 RETURNING id, v; }
step s3c { COMMIT; }

session s4
setup { SET enable_indexscan = off; SET enable_bitmapscan = off; }
step s4b { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s4rb { SELECT v FROM big WHERE id = 1000; }
step s4wb { UPDATE big SET v = v + 1 WHERE id = 1000 RETURNING id, v; }
step s4c { COMMIT; }

session obs
step plan_tiny { EXPLAIN (COSTS OFF) SELECT v FROM tiny WHERE id = 1; }
step plan_big { EXPLAIN (COSTS OFF) SELECT v FROM big WHERE id = 1; }
step chk { SELECT (SELECT v FROM tiny WHERE id = 1) AS tiny1, (SELECT v FROM tiny WHERE id = 2) AS tiny2, (SELECT v FROM big WHERE id = 1) AS big1, (SELECT v FROM big WHERE id = 1000) AS big1000; }

permutation s1b s1rt s2b s2rt s1wt s2wt s1c s2c plan_tiny chk
permutation s1b s1rb s2b s2rb s1wb s2wb s1c s2c plan_big chk
permutation s3b s3rb s4b s4rb s3wb s4wb s3c s4c chk

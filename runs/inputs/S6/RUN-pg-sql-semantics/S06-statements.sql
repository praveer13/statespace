-- The statements curriculum/S06-correspondence.md keys by this run (S6.L1's prequestion and exit item, S6.L2's
-- RETURNING old/new and plan), written by the recorder as single-session probes.
CREATE TABLE t (id int PRIMARY KEY, team int, bal bigint CHECK (bal >= 0));
INSERT INTO t VALUES (1, 1, NULL), (2, 1, 50);
-- a CHECK accepts NULL (the insert above succeeded); a plain SELECT keeps duplicates
SELECT team FROM t ORDER BY id;
-- count(expr) skips NULLs, count(*) counts rows
SELECT count(bal) AS count_bal, count(*) AS count_star FROM t;
-- a NULL row lands in neither p nor NOT p
SELECT (SELECT count(*) FROM t WHERE bal >= 10) AS p, (SELECT count(*) FROM t WHERE NOT (bal >= 10)) AS not_p;
-- NOT IN with a NULL in the list
SELECT (2 NOT IN (1, NULL)) IS NULL AS not_in_is_unknown, (SELECT count(*) FROM t WHERE 2 NOT IN (1, NULL)) AS rows_kept;
-- UNION removes duplicates, UNION ALL keeps them
SELECT (SELECT count(*) FROM (SELECT team FROM t UNION SELECT team FROM t) u) AS union_rows,
       (SELECT count(*) FROM (SELECT team FROM t UNION ALL SELECT team FROM t) u) AS union_all_rows;
-- sum over no rows
SELECT sum(bal) IS NULL AS sum_of_no_rows_is_null FROM t WHERE false;
-- RETURNING old/new (new in PostgreSQL 18), the reference plan's s1 with from = 2 and amt = 30
CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));
INSERT INTO acct VALUES (1, 100), (2, 50);
UPDATE acct SET bal = bal - 30 WHERE id = 2 AND bal >= 30
  RETURNING old.bal, new.bal;
-- the guard matches nothing: RETURNING returns no row
UPDATE acct SET bal = bal - 80 WHERE id = 2 AND bal >= 80
  RETURNING old.bal, new.bal;

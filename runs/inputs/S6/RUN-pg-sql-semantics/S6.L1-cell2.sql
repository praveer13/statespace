CREATE TABLE t (id int PRIMARY KEY, team int, bal bigint CHECK (bal >= 0));
INSERT INTO t VALUES (1, 1, NULL), (2, 1, 50), (3, 2, 5);
-- every row lands in exactly one of three groups
SELECT count(*) FILTER (WHERE bal >= 10)           AS p,
       count(*) FILTER (WHERE NOT (bal >= 10))     AS not_p,
       count(*) FILTER (WHERE (bal >= 10) IS NULL) AS unknown,
       count(*)                                    AS all_rows
FROM t;
-- NULL equals nothing, itself included
SELECT id FROM t WHERE bal = NULL;
SELECT id FROM t WHERE bal IS NULL;
-- a NULL amount in the guard
UPDATE t SET bal = bal - CAST(NULL AS bigint)
 WHERE id = 2 AND bal >= CAST(NULL AS bigint);
-- a table is a bag
SELECT team FROM t ORDER BY id;

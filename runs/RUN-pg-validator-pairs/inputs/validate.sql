-- AUD-9.2's cases on PostgreSQL. Each case is tagged q1..q6 so that no printed line names its key.
--   outcome(db, stmts): load the database, run the statements as one plan (each must touch exactly one row, or the
--   plan aborts with a typed error), and report the outcome class and the table after; everything is rolled back.
--   source(db, amt): the source command transfer amt 1 2, transcribed by hand from S9's runS for this run (the
--   reference interpreter is not built yet): abort when amt <= 0 or account 1 holds less than amt, else commit.
--   shape(stmt): the agent's template check, reading a write's table, key and increment from its text.
\set ON_ERROR_STOP on
\pset footer off
\pset tuples_only on
\pset format unaligned
SELECT version();
CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));

CREATE FUNCTION snap() RETURNS text LANGUAGE sql AS
$$ SELECT coalesce(string_agg(id || ':' || bal, ' ' ORDER BY id), 'empty') FROM acct $$;

CREATE FUNCTION outcome(db text, stmts text[]) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint; i int; res text;
BEGIN
  BEGIN
    DELETE FROM acct;
    IF db <> '' THEN EXECUTE 'INSERT INTO acct VALUES ' || db; END IF;
    res := NULL;
    FOR i IN 1 .. array_length(stmts, 1) LOOP
      EXECUTE stmts[i];
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 1 THEN res := 'abort (statement ' || i || ' touched ' || n || ' rows) | unchanged'; EXIT; END IF;
    END LOOP;
    IF res IS NULL THEN res := 'commit | ' || snap(); END IF;
    RAISE EXCEPTION USING ERRCODE = 'SS001', MESSAGE = res;
  EXCEPTION
    WHEN SQLSTATE 'SS001' THEN RETURN SQLERRM;
    WHEN OTHERS THEN RETURN 'error ' || SQLSTATE || ' | unchanged';
  END;
END $$;

-- outcome classes: an abort leaves the starting table, so aborts compare by class alone
CREATE FUNCTION cls(o text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN o LIKE 'abort%' THEN 'abort' WHEN o LIKE 'error%' THEN split_part(o, ' | ', 1) ELSE o END $$;

CREATE FUNCTION source(db text, amt bigint) RETURNS text LANGUAGE plpgsql AS $$
DECLARE b1 bigint; res text;
BEGIN
  BEGIN
    DELETE FROM acct;
    IF db <> '' THEN EXECUTE 'INSERT INTO acct VALUES ' || db; END IF;
    SELECT bal INTO b1 FROM acct WHERE id = 1;
    IF amt <= 0 OR b1 IS NULL OR b1 < amt THEN res := 'abort | unchanged';
    ELSE
      UPDATE acct SET bal = bal - amt WHERE id = 1;
      UPDATE acct SET bal = bal + amt WHERE id = 2;
      res := 'commit | ' || snap();
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'SS001', MESSAGE = res;
  EXCEPTION
    WHEN SQLSTATE 'SS001' THEN RETURN SQLERRM;
  END;
END $$;

CREATE FUNCTION shape(stmt text) RETURNS text LANGUAGE sql AS $$
  SELECT 'table ' || coalesce((regexp_match(stmt, '(?:UPDATE|INSERT INTO) (\w+)'))[1], '?')
      || ', key ' || coalesce((regexp_match(stmt, '(?:WHERE id = |VALUES \()(\d+)'))[1], '?')
      || ', bal ' || coalesce((regexp_match(stmt, 'SET bal = (?:\w+\.)?bal ([+-] \d+)'))[1], '?')
$$;

CREATE TABLE stmt (k text PRIMARY KEY, sql text);
INSERT INTO stmt VALUES
  ('credit', 'UPDATE acct SET bal = bal + 30 WHERE id = 2'),
  ('rewrite-select', 'INSERT INTO acct (id, bal) SELECT id, bal + 30 FROM acct WHERE id = 2 ON CONFLICT (id) DO UPDATE SET bal = EXCLUDED.bal'),
  ('rewrite-values', 'INSERT INTO acct (id, bal) VALUES (2, 30) ON CONFLICT (id) DO UPDATE SET bal = acct.bal + 30'),
  ('debit', 'UPDATE acct SET bal = bal - 30 WHERE id = 1 AND bal >= 30'),
  ('credit-src', 'UPDATE acct SET bal = bal + 30 WHERE id = 1');

CREATE FUNCTION s(key text) RETURNS text LANGUAGE sql AS $$ SELECT sql FROM stmt WHERE k = key $$;

-- the bounded families of databases
CREATE TABLE fam_credit (db text);   -- ids in {1, 2}, each absent, at 0 or at 50: 9 databases
INSERT INTO fam_credit
  SELECT concat_ws(',', CASE WHEN a IS NOT NULL THEN '(1,' || a || ')' END, CASE WHEN b IS NOT NULL THEN '(2,' || b || ')' END)
  FROM (VALUES (NULL::int), (0), (50)) x(a), (VALUES (NULL::int), (0), (50)) y(b);
CREATE TABLE fam_plan (db text);     -- accounts 1 and 2, each at 0, 30 or 50: 9 databases
INSERT INTO fam_plan SELECT '(1,' || a || '),(2,' || b || ')' FROM (VALUES (0), (30), (50)) x(a), (VALUES (0), (30), (50)) y(b);

-- a credit rewrite against the compiled credit, over the credit family
CREATE FUNCTION replay_credit(tag text, rw text) RETURNS SETOF text LANGUAGE sql AS $$
  SELECT '[' || tag || ' replay] ' || count(*) || ' databases, '
      || count(*) FILTER (WHERE cls(outcome(db, ARRAY[s('credit')])) <> cls(outcome(db, ARRAY[s(rw)]))) || ' differ'
  FROM fam_credit
$$;
CREATE FUNCTION first_diff_credit(tag text, rw text) RETURNS SETOF text LANGUAGE sql AS $$
  SELECT '[' || tag || ' first difference] database ' || CASE WHEN db = '' THEN 'empty' ELSE db END
      || ': credit ' || outcome(db, ARRAY[s('credit')]) || '; rewrite ' || outcome(db, ARRAY[s(rw)])
  FROM fam_credit WHERE cls(outcome(db, ARRAY[s('credit')])) <> cls(outcome(db, ARRAY[s(rw)])) ORDER BY db LIMIT 1
$$;
-- a plan against the source command, over the plan family
CREATE FUNCTION replay_plan(tag text, credit text) RETURNS SETOF text LANGUAGE sql AS $$
  SELECT '[' || tag || ' replay] ' || count(*) || ' databases, '
      || count(*) FILTER (WHERE cls(source(db, 30)) <> cls(outcome(db, ARRAY[s('debit'), s(credit)]))) || ' differ'
  FROM fam_plan
$$;
CREATE FUNCTION first_diff_plan(tag text, credit text) RETURNS SETOF text LANGUAGE sql AS $$
  SELECT '[' || tag || ' first difference] database ' || db || ': source ' || source(db, 30) || '; plan ' || outcome(db, ARRAY[s('debit'), s(credit)])
  FROM fam_plan WHERE cls(source(db, 30)) <> cls(outcome(db, ARRAY[s('debit'), s(credit)])) ORDER BY db LIMIT 1
$$;
CREATE FUNCTION scen_credit(tag text, sid text, db text, rw text) RETURNS text LANGUAGE sql AS $$
  SELECT '[' || tag || ' ' || sid || '] '
      || CASE WHEN cls(outcome(db, ARRAY[s('credit')])) = cls(outcome(db, ARRAY[s(rw)])) THEN 'same' ELSE 'differ' END
      || ': credit ' || outcome(db, ARRAY[s('credit')]) || '; rewrite ' || outcome(db, ARRAY[s(rw)])
$$;
CREATE FUNCTION scen_plan(tag text, sid text, db text, credit text) RETURNS text LANGUAGE sql AS $$
  SELECT '[' || tag || ' ' || sid || '] '
      || CASE WHEN cls(source(db, 30)) = cls(outcome(db, ARRAY[s('debit'), s(credit)])) THEN 'same' ELSE 'differ' END
      || ': source ' || source(db, 30) || '; plan ' || outcome(db, ARRAY[s('debit'), s(credit)])
$$;

-- q1: the SELECT-sourced upsert, replayed over the credit family
SELECT * FROM replay_credit('q1', 'rewrite-select');
SELECT * FROM first_diff_credit('q1', 'rewrite-select');
-- q2: the VALUES upsert, shape-checked against the credit; then replayed over the same family
SELECT '[q2 shape] credit: ' || shape(s('credit')) || ' | rewrite: ' || shape(s('rewrite-values')) || ' | '
    || CASE WHEN shape(s('credit')) = shape(s('rewrite-values')) THEN 'accepted' ELSE 'rejected' END;
SELECT * FROM replay_credit('q2', 'rewrite-values');
SELECT * FROM first_diff_credit('q2', 'rewrite-values');
-- q3, q4: the VALUES upsert on the fixture database alone
SELECT '[' || t || ' fixture] database (1,100),(2,50): credit ' || outcome('(1,100),(2,50)', ARRAY[s('credit')])
    || '; rewrite ' || outcome('(1,100),(2,50)', ARRAY[s('rewrite-values')])
  FROM (VALUES ('q3'), ('q4')) v(t);
SELECT * FROM first_diff_credit('q3', 'rewrite-values');
-- q5: the plan crediting account 2, replayed against the source
SELECT * FROM replay_plan('q5', 'credit');
SELECT * FROM first_diff_plan('q5', 'credit');
-- q6: the plan crediting account 1, shape-checked against the plan template; then replayed against the source
SELECT '[q6 shape] debit: ' || shape(s('debit')) || ' | credit: ' || shape(s('credit-src')) || ' | '
    || CASE WHEN shape(s('debit')) ~ '^table acct, key \d+, bal - \d+$' AND shape(s('credit-src')) ~ '^table acct, key \d+, bal \+ \d+$'
            THEN 'accepted' ELSE 'rejected' END;
SELECT * FROM replay_plan('q6', 'credit-src');
SELECT * FROM first_diff_plan('q6', 'credit-src');

-- step-3 scenarios
SELECT scen_credit(t, sid, db, rw)
  FROM (VALUES ('q1', 'rewrite-select'), ('q2', 'rewrite-values'), ('q3', 'rewrite-values'), ('q4', 'rewrite-values')) a(t, rw),
       (VALUES ('s1', '(1,100),(2,50)'), ('s2', '(1,100)'), ('s3', ''), ('s4', '(2,0)')) b(sid, db)
  ORDER BY t, sid;
SELECT scen_plan(t, sid, db, c)
  FROM (VALUES ('q5', 'credit'), ('q6', 'credit-src')) a(t, c),
       (VALUES ('s1', '(1,100),(2,0)'), ('s2', '(1,0),(2,0)'), ('s3', '(1,30),(2,50)'), ('s4', '(1,10),(2,5)')) b(sid, db)
  ORDER BY t, sid;

-- q7 to q12: three more rewrites, each checked on the database or databases its report names.
--   outcome_on(setup, stmts): as outcome(), but the database is any setup script over acct and holds.
--   result_on(setup, query): the query's single value, or NULL, on that database.
CREATE TABLE holds (acct_id int);   -- allows NULL
CREATE FUNCTION outcome_on(setup text, stmts text[]) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint; i int; res text;
BEGIN
  BEGIN
    DELETE FROM acct; DELETE FROM holds;
    EXECUTE setup;
    res := NULL;
    FOR i IN 1 .. array_length(stmts, 1) LOOP
      EXECUTE stmts[i];
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 1 THEN res := 'abort (statement ' || i || ' touched ' || n || ' rows) | unchanged'; EXIT; END IF;
    END LOOP;
    IF res IS NULL THEN res := 'commit | ' || snap(); END IF;
    RAISE EXCEPTION USING ERRCODE = 'SS001', MESSAGE = res;
  EXCEPTION
    WHEN SQLSTATE 'SS001' THEN RETURN SQLERRM;
    WHEN OTHERS THEN RETURN 'error ' || SQLSTATE || ' | unchanged';
  END;
END $$;
CREATE FUNCTION result_on(setup text, query text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text; res text;
BEGIN
  BEGIN
    DELETE FROM acct; DELETE FROM holds;
    EXECUTE setup;
    EXECUTE query INTO v;
    res := 'result ' || coalesce(v, 'NULL');
    RAISE EXCEPTION USING ERRCODE = 'SS001', MESSAGE = res;
  EXCEPTION
    WHEN SQLSTATE 'SS001' THEN RETURN SQLERRM;
  END;
END $$;

INSERT INTO stmt VALUES
  ('debit-notin', 'UPDATE acct SET bal = bal - 30 WHERE id = 1 AND bal >= 30 AND id NOT IN (SELECT acct_id FROM holds)'),
  ('debit-notexists', 'UPDATE acct SET bal = bal - 30 WHERE id = 1 AND bal >= 30 AND NOT EXISTS (SELECT 1 FROM holds h WHERE h.acct_id = acct.id)'),
  ('debit-gt', 'UPDATE acct SET bal = bal - 30 WHERE id = 1 AND bal - 30 > 0'),
  ('report', 'SELECT coalesce(sum(bal), 0) FROM acct WHERE id IN (1, 2)'),
  ('report-sum', 'SELECT sum(bal) FROM acct WHERE id IN (1, 2)');

CREATE FUNCTION cmp_plans(tag text, sid text, setup text, a text[], b text[]) RETURNS text LANGUAGE sql AS $$
  SELECT '[' || tag || ' ' || sid || '] ' || CASE WHEN cls(outcome_on(setup, a)) = cls(outcome_on(setup, b)) THEN 'same' ELSE 'differ' END
      || ': compiled ' || outcome_on(setup, a) || '; rewrite ' || outcome_on(setup, b)
$$;
CREATE FUNCTION cmp_queries(tag text, sid text, setup text, a text, b text) RETURNS text LANGUAGE sql AS $$
  SELECT '[' || tag || ' ' || sid || '] ' || CASE WHEN result_on(setup, a) IS NOT DISTINCT FROM result_on(setup, b) THEN 'same' ELSE 'differ' END
      || ': compiled ' || result_on(setup, a) || '; rewrite ' || result_on(setup, b)
$$;

-- q7, q8: the debit's hold guard, NOT IN rewritten as NOT EXISTS, on the fixture database (one hold, on account 3)
SELECT cmp_plans(t, 'fixture', 'INSERT INTO acct VALUES (1,100),(2,0); INSERT INTO holds VALUES (3)', ARRAY[s('debit-notin')], ARRAY[s('debit-notexists')])
  FROM (VALUES ('q7'), ('q8')) v(t);
SELECT cmp_plans(t, sid, setup, ARRAY[s('debit-notin')], ARRAY[s('debit-notexists')])
  FROM (VALUES ('q7'), ('q8')) a(t),
       (VALUES ('s1', 'INSERT INTO acct VALUES (1,100),(2,0); INSERT INTO holds VALUES (3)'),
               ('s2', 'INSERT INTO acct VALUES (1,100),(2,0)'),
               ('s3', 'INSERT INTO acct VALUES (1,100),(2,0); INSERT INTO holds VALUES (NULL)'),
               ('s4', 'INSERT INTO acct VALUES (1,100),(2,0); INSERT INTO holds VALUES (1)')) b(sid, setup)
  ORDER BY t, sid;
-- q9, q10: the debit's funds guard, bal >= 30 rewritten as bal - 30 > 0, as a whole plan, on three databases
SELECT '[' || t || ' tried] ' || count(*) || ' databases, '
    || count(*) FILTER (WHERE cls(outcome_on(setup, ARRAY[s('debit'), s('credit')])) <> cls(outcome_on(setup, ARRAY[s('debit-gt'), s('credit')]))) || ' differ'
  FROM (VALUES ('q9'), ('q10')) v(t),
       (VALUES ('INSERT INTO acct VALUES (1,100),(2,0)'), ('INSERT INTO acct VALUES (1,50),(2,0)'), ('INSERT INTO acct VALUES (1,0),(2,0)')) d(setup)
  GROUP BY t ORDER BY t;
SELECT cmp_plans(t, sid, setup, ARRAY[s('debit'), s('credit')], ARRAY[s('debit-gt'), s('credit')])
  FROM (VALUES ('q9'), ('q10')) a(t),
       (VALUES ('s1', 'INSERT INTO acct VALUES (1,100),(2,0)'),
               ('s2', 'INSERT INTO acct VALUES (1,30),(2,0)'),
               ('s3', 'INSERT INTO acct VALUES (1,10),(2,0)'),
               ('s4', 'INSERT INTO acct VALUES (1,31),(2,0)')) b(sid, setup)
  ORDER BY t, sid;
-- q11, q12: the balance report, coalesce(sum) rewritten as sum, on the fixture database
SELECT cmp_queries(t, 'fixture', 'INSERT INTO acct VALUES (1,100),(2,50)', s('report'), s('report-sum'))
  FROM (VALUES ('q11'), ('q12')) v(t);
SELECT cmp_queries(t, sid, setup, s('report'), s('report-sum'))
  FROM (VALUES ('q11'), ('q12')) a(t),
       (VALUES ('s1', 'INSERT INTO acct VALUES (1,100),(2,50)'),
               ('s2', 'SELECT 1'),
               ('s3', 'INSERT INTO acct VALUES (1,100)'),
               ('s4', 'INSERT INTO acct VALUES (3,7)')) b(sid, setup)
  ORDER BY t, sid;

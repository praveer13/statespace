-- S6.L5's prequestion as a statement, written by the recorder: account 3 has no postings.
CREATE TABLE postings (cmd int NOT NULL, acct int NOT NULL, amt bigint NOT NULL);
INSERT INTO postings VALUES (0, 1, 100);
SELECT sum(amt) IS NULL AS sum_is_null, count(*) AS rows_returned FROM (SELECT sum(amt) FROM postings WHERE acct = 3) s(amt);
SELECT sum(amt) FROM postings WHERE acct = 3;
-- the comparison the trigger's IF evaluates
SELECT (500 <> (SELECT sum(amt) FROM postings WHERE acct = 3)) IS NULL AS comparison_is_unknown;

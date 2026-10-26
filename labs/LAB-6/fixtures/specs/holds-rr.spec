# Holds at REPEATABLE READ: each session reads 100 available and inserts a hold of 80; both commit (catalog row H06b).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/holds-rr.json, made by the course's recording
# script (runs/RUN-serializability-fixtures). The @ lines are the abstract reading: @d0 and @dfinal name the obs
# steps that read the state before and after, and each @tx line gives a session's transaction, the command it
# carries, the steps whose printed values are its outputs, and its guarded write.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL);
  INSERT INTO acct VALUES (1, 100), (2, 100);
  CREATE TABLE holds(acct int, amt bigint);
}

teardown
{
  DROP TABLE IF EXISTS acct, holds, report;
}

session s1
step s1b { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }
step s1w { INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }
step s1c { COMMIT; }

session s2
step s2b { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2r { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }
step s2w { INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }
step s2c { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx s1 {"op": "hold", "account": 1, "amount": 80} outputs=s1r,s1w write=s1w
# @tx s2 {"op": "hold", "account": 1, "amount": 80} outputs=s2r,s2w write=s2w

permutation d0 s1b s1r s2b s2r s1w s2w s1c s2c chk

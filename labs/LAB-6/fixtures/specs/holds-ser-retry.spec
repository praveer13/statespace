# Holds at SERIALIZABLE: B's COMMIT fails with a serialization failure, and B retries the whole command from BEGIN; its guard then refuses (catalog row H23).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/holds-ser-retry.json, made by the course's recording
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

session a
step ab { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step ar { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }
step aw { INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }
step ac { COMMIT; }

session b
step bb { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step br { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }
step bw { INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }
step bc { COMMIT; }
step bb2 { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step br2 { CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }
step bw2 { INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }
step bc2 { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx a {"op": "hold", "account": 1, "amount": 80} outputs=ar,aw write=aw
# @tx b#1 {"op": "hold", "account": 1, "amount": 80} outputs=br,bw write=bw
# @tx b#2 {"op": "hold", "account": 1, "amount": 80} outputs=br2,bw2 write=bw2

permutation d0 ab ar bb br aw bw ac bc bb2 br2 bw2 bc2 chk

# H23  Retry after a serialization failure. The holds check-then-insert of H06b at
# SERIALIZABLE: both sessions read 100 available and insert a hold of 80; A commits,
# B's COMMIT fails with a serialization failure. B then retries the whole command
# from BEGIN: it reads again, now sees 20 available, and its guard refuses; nothing
# is written. The manual (PostgreSQL 18, section 13.5): "It is important to retry
# the complete transaction, including all logic that decides which SQL to issue
# and/or which values to use." The second permutation lets A fail instead, to show
# the loser is the later committer; B's retry steps are not used in it.

setup
{
  CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL, team int);
  INSERT INTO acct VALUES (1, 100, 1), (2, 100, 1);
  CREATE TABLE holds (acct int, amt bigint);
}

teardown
{
  DROP TABLE acct, holds;
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
step chk { SELECT coalesce(sum(amt), 0) AS held, count(*) AS holds FROM holds; }

permutation ab ar bb br aw bw ac bc bb2 br2 bw2 bc2 chk
permutation ab ar bb br aw bw bc ac chk

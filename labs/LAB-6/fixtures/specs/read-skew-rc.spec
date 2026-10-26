# Read skew at READ COMMITTED: a reader reads account 1, a transfer of 50 from 1 to 2 commits, and the reader then reads account 2 (catalog row H04).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/read-skew-rc.json, made by the course's recording
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

session rd
step rdb { BEGIN ISOLATION LEVEL READ COMMITTED; }
step rd1 { SELECT bal FROM acct WHERE id = 1; }
step rd2 { SELECT bal FROM acct WHERE id = 2; }
step rdc { COMMIT; }

session mv
step mvb { BEGIN ISOLATION LEVEL READ COMMITTED; }
step mvt { UPDATE acct SET bal = bal - 50 WHERE id = 1 AND bal >= 50 RETURNING old.bal AS old_bal, new.bal AS new_bal; UPDATE acct SET bal = bal + 50 WHERE id = 2 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step mvc { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx rd {"op": "read", "accounts": [1, 2]} outputs=rd1,rd2
# @tx mv {"op": "transfer", "from": 1, "to": 2, "amount": 50} outputs=mvt write=mvt

permutation d0 rdb rd1 mvb mvt mvc rd2 rdc chk

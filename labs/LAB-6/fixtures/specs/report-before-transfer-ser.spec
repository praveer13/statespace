# Report before transfer at SERIALIZABLE: T1 reads accounts 1 and 2 and inserts a report row; T2 moves 50 from 1 to 2 and commits after T1's reads; T1 commits last.
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/report-before-transfer-ser.json, made by the course's recording
# script (runs/RUN-serializability-fixtures). The @ lines are the abstract reading: @d0 and @dfinal name the obs
# steps that read the state before and after, and each @tx line gives a session's transaction, the command it
# carries, the steps whose printed values are its outputs, and its guarded write.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL);
  INSERT INTO acct VALUES (1, 100), (2, 100);
  CREATE TABLE holds(acct int, amt bigint);
  CREATE TABLE report(total bigint);
}

teardown
{
  DROP TABLE IF EXISTS acct, holds, report;
}

session t1
step t1b { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step t1r { SELECT bal FROM acct WHERE id = 1; SELECT bal FROM acct WHERE id = 2; }
step t1w { INSERT INTO report SELECT sum(bal) FROM acct; }
step t1c { COMMIT; }

session t2
step t2b { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step t2t { UPDATE acct SET bal = bal - 50 WHERE id = 1 AND bal >= 50 RETURNING old.bal AS old_bal, new.bal AS new_bal; UPDATE acct SET bal = bal + 50 WHERE id = 2 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step t2c { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx t1 {"op": "read", "accounts": [1, 2]} outputs=t1r
# @tx t2 {"op": "transfer", "from": 1, "to": 2, "amount": 50} outputs=t2t write=t2t

permutation d0 t1b t1r t2b t2t t2c t1w t1c chk

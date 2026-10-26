# Conditional UPDATE at SERIALIZABLE: B fails with a serialization failure and retries the whole command from BEGIN (catalog row H24).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/cond-ser-retry.json, made by the course's recording
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
step au { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step ac { COMMIT; }

session b
step bb { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step bu { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step bc { COMMIT; }
step bb2 { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step bu2 { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step bc2 { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx a {"op": "debit", "account": 1, "amount": 80} outputs=au write=au
# @tx b#1 {"op": "debit", "account": 1, "amount": 80} outputs=bu write=bu
# @tx b#2 {"op": "debit", "account": 1, "amount": 80} outputs=bu2 write=bu2

permutation d0 ab bb au bu ac bc bb2 bu2 bc2 chk

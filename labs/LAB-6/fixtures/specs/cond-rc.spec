# Conditional UPDATE at READ COMMITTED: B's debit waits, re-checks its guard and updates no row (catalog row H02).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/cond-rc.json, made by the course's recording
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
step s1b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1w { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s1c { COMMIT; }

session s2
step s2b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2w { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s2c { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx s1 {"op": "debit", "account": 1, "amount": 80} outputs=s1w write=s1w
# @tx s2 {"op": "debit", "account": 1, "amount": 80} outputs=s2w write=s2w

permutation d0 s1b s2b s1w s2w s1c s2c chk

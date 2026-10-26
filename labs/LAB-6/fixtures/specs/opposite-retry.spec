# Opposite-order moves at READ COMMITTED: A moves 10 from 1 to 2 while B moves 10 from 2 to 1, debits first; A's credit and B's credit wait for each other, A is chosen as the deadlock victim, and A retries the whole command from BEGIN (catalog row H22a, plus the retry).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/opposite-retry.json, made by the course's recording
# script (runs/RUN-serializability-fixtures). The @ lines are the abstract reading: @d0 and @dfinal name the obs
# steps that read the state before and after, and each @tx line gives a session's transaction, the command it
# carries, the steps whose printed values are its outputs, and its guarded write.
# Session a waits for deadlock detection for less time than session b (deadlock_timeout), so that a, the first
# waiter, is the one PostgreSQL ends with the deadlock error, and the retry steps belong to a.

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
setup { SET deadlock_timeout = '100ms'; }
step ab { BEGIN ISOLATION LEVEL READ COMMITTED; }
step ad { UPDATE acct SET bal = bal - 10 WHERE id = 1 AND bal >= 10 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step ak { UPDATE acct SET bal = bal + 10 WHERE id = 2 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step ac { COMMIT; }
step ab2 { BEGIN ISOLATION LEVEL READ COMMITTED; }
step ad2 { UPDATE acct SET bal = bal - 10 WHERE id = 1 AND bal >= 10 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step ak2 { UPDATE acct SET bal = bal + 10 WHERE id = 2 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step ac2 { COMMIT; }

session b
setup { SET deadlock_timeout = '10s'; }
step bb { BEGIN ISOLATION LEVEL READ COMMITTED; }
step bd { UPDATE acct SET bal = bal - 10 WHERE id = 2 AND bal >= 10 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step bk { UPDATE acct SET bal = bal + 10 WHERE id = 1 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step bc { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx a#1 {"op": "transfer", "from": 1, "to": 2, "amount": 10} outputs=ad,ak write=ad
# @tx a#2 {"op": "transfer", "from": 1, "to": 2, "amount": 10} outputs=ad2,ak2 write=ad2
# @tx b {"op": "transfer", "from": 2, "to": 1, "amount": 10} outputs=bd,bk write=bd

permutation d0 ab ad bb bd ak bk ac bc ab2 ad2 ak2 ac2 chk

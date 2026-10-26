# R-mutant: a transfer of 30 from account 1 to account 2 whose credit lands on account 3. Every output matches the model's (both credited accounts held 100), and the totals are equal; the money is on the wrong account.
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/r-mutant-wrong-account.json, made by the course's recording
# script (runs/RUN-serializability-fixtures). The @ lines are the abstract reading: @d0 and @dfinal name the obs
# steps that read the state before and after, and each @tx line gives a session's transaction, the command it
# carries, the steps whose printed values are its outputs, and its guarded write.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL);
  INSERT INTO acct VALUES (1, 100), (2, 100), (3, 100);
  CREATE TABLE holds(acct int, amt bigint);
}

teardown
{
  DROP TABLE IF EXISTS acct, holds, report;
}

session s1
step s1b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1t { UPDATE acct SET bal = bal - 30 WHERE id = 1 AND bal >= 30 RETURNING old.bal AS old_bal, new.bal AS new_bal; UPDATE acct SET bal = bal + 30 WHERE id = 3 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s1c { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx s1 {"op": "transfer", "from": 1, "to": 2, "amount": 30} outputs=s1t write=s1t

permutation d0 s1b s1t s1c chk

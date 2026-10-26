# A credit of 1 to a balance of 9223372036854775807, the largest bigint: PostgreSQL refuses it with an out-of-range error and the balance is unchanged (catalog row H19's shape).
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/overflow-22003.json, made by the course's recording
# script (runs/RUN-serializability-fixtures). The @ lines are the abstract reading: @d0 and @dfinal name the obs
# steps that read the state before and after, and each @tx line gives a session's transaction, the command it
# carries, the steps whose printed values are its outputs, and its guarded write.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL);
  INSERT INTO acct VALUES (1, 9223372036854775807);
  CREATE TABLE holds(acct int, amt bigint);
}

teardown
{
  DROP TABLE IF EXISTS acct, holds, report;
}

session s1
step s1b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1k { UPDATE acct SET bal = bal + 1 WHERE id = 1 RETURNING old.bal AS old_bal, new.bal AS new_bal; }
step s1c { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx s1 {"op": "credit", "account": 1, "amount": 1} outputs=s1k write=s1k

permutation d0 s1b s1k s1c chk

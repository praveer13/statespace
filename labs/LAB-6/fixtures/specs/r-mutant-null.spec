# R-mutant: opening account 2 with a schema that gives the column no default and no NOT NULL writes a NULL balance, which the model reads as an account at 0.
#
# A LAB-6.7 fixture (curriculum/S06-correspondence.md section 3). `statespace isorun` runs it on PostgreSQL 18.6;
# the recorded history and its abstract reading are in ../histories/r-mutant-null.json, made by the course's recording
# script (runs/RUN-serializability-fixtures). The @ lines are the abstract reading: @d0 and @dfinal name the obs
# steps that read the state before and after, and each @tx line gives a session's transaction, the command it
# carries, the steps whose printed values are its outputs, and its guarded write.

setup
{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint);
  INSERT INTO acct VALUES (1, 100);
  CREATE TABLE holds(acct int, amt bigint);
}

teardown
{
  DROP TABLE IF EXISTS acct, holds, report;
}

session s1
step s1b { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1o { INSERT INTO acct(id) VALUES (2); }
step s1c { COMMIT; }

session obs
step d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }
step chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }

# @d0 d0
# @dfinal chk
# @tx s1 {"op": "open", "account": 2} outputs= write=s1o

permutation d0 s1b s1o s1c chk

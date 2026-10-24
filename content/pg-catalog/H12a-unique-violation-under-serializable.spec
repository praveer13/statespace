# H12a  23505 where 40001 might be expected, and a retry of each. Two sessions try
# to create the same key. "check" is the existence check an application makes before
# inserting; "blind" inserts without one. The manual (PostgreSQL 18, section 13.2.3)
# says unique violations can appear "even after explicitly checking that the key
# isn't present", and (section 13.5) that 23505 and 23P01 "might represent persistent
# error conditions rather than transient failures". Scenarios, at each level where
# marked (rc, rr, ser):
#   A   both check, then s1 inserts and commits, then s2 inserts
#   Aw  the same, but s2 inserts while s1's insert is uncommitted (s2 waits)
#   B   s1 checks, s2 inserts blind and commits, then s1 inserts
#   Bp  s2 checks, s1 inserts blind and commits, then s2 inserts
#   C   both blind; Cl the same with s1 committing before s2 inserts
# Retries, at SERIALIZABLE, each a whole new transaction of the failed session:
#   RA  after A, s2 retries: check, insert if absent
#   RB  after B, s1 retries: check, insert if absent
#   RCb after Cl, s2 retries blind
#   RCg after Cl, s2 retries with the check

setup
{
  CREATE TABLE kv (k int PRIMARY KEY, v text NOT NULL);
}

teardown
{
  DROP TABLE kv;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1chk { SELECT v FROM kv WHERE k = 1; }
step s1ins { INSERT INTO kv VALUES (1, 's1') RETURNING k, v; }
step s1c { COMMIT; }
step s1b2_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1chk2 { SELECT v FROM kv WHERE k = 1; }
step s1ins2_guarded { INSERT INTO kv SELECT 1, 's1' WHERE NOT EXISTS (SELECT 1 FROM kv WHERE k = 1) RETURNING k, v; }
step s1c2 { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2chk { SELECT v FROM kv WHERE k = 1; }
step s2ins { INSERT INTO kv VALUES (1, 's2') RETURNING k, v; }
step s2c { COMMIT; }
step s2b2_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2chk2 { SELECT v FROM kv WHERE k = 1; }
step s2ins2_guarded { INSERT INTO kv SELECT 1, 's2' WHERE NOT EXISTS (SELECT 1 FROM kv WHERE k = 1) RETURNING k, v; }
step s2ins2_blind { INSERT INTO kv VALUES (1, 's2') RETURNING k, v; }
step s2c2 { COMMIT; }

session obs
step chk { SELECT k, v FROM kv ORDER BY k; }

permutation s1b_rc s1chk s2b_rc s2chk s1ins s1c s2ins s2c chk
permutation s1b_rr s1chk s2b_rr s2chk s1ins s1c s2ins s2c chk
permutation s1b_ser s1chk s2b_ser s2chk s1ins s1c s2ins s2c chk
permutation s1b_rc s1chk s2b_rc s2chk s1ins s2ins s1c s2c chk
permutation s1b_rr s1chk s2b_rr s2chk s1ins s2ins s1c s2c chk
permutation s1b_ser s1chk s2b_ser s2chk s1ins s2ins s1c s2c chk
permutation s1b_rc s1chk s2b_rc s2ins s2c s1ins s1c chk
permutation s1b_rr s1chk s2b_rr s2ins s2c s1ins s1c chk
permutation s1b_ser s1chk s2b_ser s2ins s2c s1ins s1c chk
permutation s1b_rc s2b_rc s2chk s1ins s1c s2ins s2c chk
permutation s1b_rr s2b_rr s2chk s1ins s1c s2ins s2c chk
permutation s1b_ser s2b_ser s2chk s1ins s1c s2ins s2c chk
permutation s1b_rc s2b_rc s1ins s2ins s1c s2c chk
permutation s1b_rr s2b_rr s1ins s2ins s1c s2c chk
permutation s1b_ser s2b_ser s1ins s2ins s1c s2c chk
permutation s1b_rc s2b_rc s1ins s1c s2ins s2c chk
permutation s1b_rr s2b_rr s1ins s1c s2ins s2c chk
permutation s1b_ser s2b_ser s1ins s1c s2ins s2c chk
permutation s1b_ser s1chk s2b_ser s2chk s1ins s1c s2ins s2c s2b2_ser s2chk2 s2ins2_guarded s2c2 chk
permutation s1b_ser s2b_ser s1ins s1c s2ins s2c s2b2_ser s2ins2_blind s2c2 chk
permutation s1b_ser s2b_ser s1ins s1c s2ins s2c s2b2_ser s2chk2 s2ins2_guarded s2c2 chk
permutation s1b_ser s1chk s2b_ser s2ins s2c s1ins s1c s1b2_ser s1chk2 s1ins2_guarded s1c2 chk

# H12b  The 23P01 twin of H12a: bookings of overlapping ranges under an exclusion
# constraint. "check" asks whether the range is free, "blind" inserts without
# asking. Scenarios as in H12a: A both check, then s1 inserts and commits, then s2
# inserts (all three levels); C both blind, s1 committing first (SERIALIZABLE);
# R1 A at SERIALIZABLE and a retry of the whole command; R2 C at SERIALIZABLE and a
# blind retry.

setup
{
  CREATE TABLE booking (during int4range NOT NULL, who text NOT NULL, EXCLUDE USING gist (during WITH &&));
}

teardown
{
  DROP TABLE booking;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1chk { SELECT count(*) AS overlapping FROM booking WHERE during && int4range(10, 20); }
step s1ins { INSERT INTO booking VALUES (int4range(10, 20), 's1') RETURNING during, who; }
step s1c { COMMIT; }

session s2
step s2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2chk { SELECT count(*) AS overlapping FROM booking WHERE during && int4range(15, 25); }
step s2ins { INSERT INTO booking VALUES (int4range(15, 25), 's2') RETURNING during, who; }
step s2c { COMMIT; }
step s2b2_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s2chk2 { SELECT count(*) AS overlapping FROM booking WHERE during && int4range(15, 25); }
step s2ins2_guarded { INSERT INTO booking SELECT int4range(15, 25), 's2' WHERE NOT EXISTS (SELECT 1 FROM booking WHERE during && int4range(15, 25)) RETURNING during, who; }
step s2ins2_blind { INSERT INTO booking VALUES (int4range(15, 25), 's2') RETURNING during, who; }
step s2c2 { COMMIT; }

session obs
step chk { SELECT during, who FROM booking ORDER BY who; }

permutation s1b_rc s1chk s2b_rc s2chk s1ins s1c s2ins s2c chk
permutation s1b_rr s1chk s2b_rr s2chk s1ins s1c s2ins s2c chk
permutation s1b_ser s1chk s2b_ser s2chk s1ins s1c s2ins s2c chk
permutation s1b_ser s2b_ser s1ins s1c s2ins s2c chk
permutation s1b_ser s1chk s2b_ser s2chk s1ins s1c s2ins s2c s2b2_ser s2chk2 s2ins2_guarded s2c2 chk
permutation s1b_ser s2b_ser s1ins s1c s2ins s2c s2b2_ser s2ins2_blind s2c2 chk

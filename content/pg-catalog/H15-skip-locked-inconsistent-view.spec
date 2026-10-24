# H15  FOR UPDATE SKIP LOCKED gives workers disjoint claims and an inconsistent view
# of the table. Four pending jobs; two workers each claim two. While both hold their
# claims, a third statement counts the pending jobs through SKIP LOCKED and a
# fourth counts them plainly. The manual (PostgreSQL 18, SELECT, The Locking Clause):
# skipping locked rows "provides an inconsistent view of the data".

setup
{
  CREATE TABLE jobs (id int PRIMARY KEY, state text NOT NULL);
  INSERT INTO jobs SELECT g, 'pending' FROM generate_series(1, 4) AS g;
}

teardown
{
  DROP TABLE jobs;
}

session w1
step w1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step w1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step w1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step w1claim { SELECT id FROM jobs WHERE state = 'pending' ORDER BY id LIMIT 2 FOR UPDATE SKIP LOCKED; }
step w1c { COMMIT; }

session w2
step w2b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step w2b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step w2b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step w2claim { SELECT id FROM jobs WHERE state = 'pending' ORDER BY id LIMIT 2 FOR UPDATE SKIP LOCKED; }
step w2c { COMMIT; }

session obs
step cnt_skip { SELECT count(*) AS counted_with_skip_locked FROM (SELECT id FROM jobs WHERE state = 'pending' FOR UPDATE SKIP LOCKED) AS q; }
step cnt_all { SELECT count(*) AS pending FROM jobs WHERE state = 'pending'; }

permutation w1b_rc w1claim w2b_rc w2claim cnt_skip cnt_all w1c w2c
permutation w1b_rr w1claim w2b_rr w2claim cnt_skip cnt_all w1c w2c
permutation w1b_ser w1claim w2b_ser w2claim cnt_skip cnt_all w1c w2c

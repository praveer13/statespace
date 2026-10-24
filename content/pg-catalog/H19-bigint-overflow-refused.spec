# H19  bigint overflow is refused, not wrapped. A balance at 2^63-1 is credited by
# one; the database raises an error and the balance is unchanged. The manual
# (PostgreSQL 18, section 8.1.1): bigint errors outside its range. sum(bigint) is
# numeric, so the total does not overflow where the column would. Each error case
# is its own permutation, because an error ends the transaction.

setup
{
  CREATE TABLE big (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));
  INSERT INTO big VALUES (1, 9223372036854775807), (2, 5);
}

teardown
{
  DROP TABLE big;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step expr { SELECT 9223372036854775807::bigint + 1 AS next; }
step credit { UPDATE big SET bal = bal + 1 WHERE id = 1 RETURNING id, bal; }
step s1c { COMMIT; }

session obs
step chk { SELECT id, bal FROM big ORDER BY id; SELECT pg_typeof(sum(bal)) AS sum_type, sum(bal) AS total FROM big; }

permutation s1b_rc expr s1c
permutation s1b_rc credit s1c chk
permutation s1b_rr expr s1c
permutation s1b_rr credit s1c chk
permutation s1b_ser expr s1c
permutation s1b_ser credit s1c chk

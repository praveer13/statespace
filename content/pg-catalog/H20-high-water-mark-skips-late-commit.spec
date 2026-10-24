# H20  A poller that advances a high-water mark skips a row that commits late.
# Ids come from a sequence at INSERT time and become visible at COMMIT time, so
# visibility order is not id order. s1 inserts (id 1) and has not committed; s2
# inserts (id 2) and commits; the poller reads everything above its mark and moves
# the mark to the largest id it saw; s1 then commits; the next poll reads above
# the mark. The manual (PostgreSQL 18, sequence functions) says the value nextval
# returns "is not reclaimed for re-use if the calling transaction later aborts" and
# that gaps can appear without an abort too; it says nothing about commit order,
# which is what this row records. The writer that commits late is run at each
# level; the poller's statements are single statements.

setup
{
  CREATE SEQUENCE outbox_id_seq;
  CREATE TABLE outbox (id bigint PRIMARY KEY DEFAULT nextval('outbox_id_seq'), payload text NOT NULL);
  CREATE TABLE hwm (last_id bigint NOT NULL);
  INSERT INTO hwm VALUES (0);
}

teardown
{
  DROP TABLE outbox, hwm;
  DROP SEQUENCE outbox_id_seq;
}

session s1
step s1b_rc { BEGIN ISOLATION LEVEL READ COMMITTED; }
step s1b_rr { BEGIN ISOLATION LEVEL REPEATABLE READ; }
step s1b_ser { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step s1ins { INSERT INTO outbox (payload) VALUES ('first') RETURNING id, payload; }
step s1c { COMMIT; }

session s2
step s2ins { INSERT INTO outbox (payload) VALUES ('second') RETURNING id, payload; }

session poller
step poll1 { WITH d AS (SELECT id FROM outbox WHERE id > (SELECT last_id FROM hwm) ORDER BY id), u AS (UPDATE hwm SET last_id = (SELECT max(id) FROM d) WHERE EXISTS (SELECT 1 FROM d) RETURNING last_id) SELECT id AS delivered FROM d; }
step poll2 { WITH d AS (SELECT id FROM outbox WHERE id > (SELECT last_id FROM hwm) ORDER BY id), u AS (UPDATE hwm SET last_id = (SELECT max(id) FROM d) WHERE EXISTS (SELECT 1 FROM d) RETURNING last_id) SELECT id AS delivered FROM d; }

session obs
step chk { SELECT (SELECT last_id FROM hwm) AS hwm, (SELECT string_agg(id::text, ',' ORDER BY id) FROM outbox) AS ids; }

permutation s1b_rc s1ins s2ins poll1 s1c poll2 chk
permutation s1b_rr s1ins s2ins poll1 s1c poll2 chk
permutation s1b_ser s1ins s2ins poll1 s1c poll2 chk
permutation s1b_rc s1ins s1c s2ins poll1 poll2 chk

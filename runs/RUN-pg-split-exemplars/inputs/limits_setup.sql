DROP TABLE IF EXISTS limits;
CREATE TABLE limits (acct int PRIMARY KEY, used bigint NOT NULL);
INSERT INTO limits VALUES (1, 0);

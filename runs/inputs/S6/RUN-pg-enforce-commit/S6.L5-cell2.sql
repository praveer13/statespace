CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));
CREATE TABLE postings (cmd int NOT NULL, acct int NOT NULL, amt bigint NOT NULL);
-- command 0 is the opening deposit; every later command must net to zero
INSERT INTO acct VALUES (1, 100), (3, 0);
INSERT INTO postings VALUES (0, 1, 100);

CREATE FUNCTION check_balance() RETURNS trigger AS $$
BEGIN
  IF NEW.bal IS DISTINCT FROM coalesce((SELECT sum(amt) FROM postings WHERE acct = NEW.id), 0) THEN
    RAISE EXCEPTION 'balance % does not match its postings', NEW.bal;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE FUNCTION check_zero_sum() RETURNS trigger AS $$
BEGIN
  IF NEW.cmd > 0 AND coalesce((SELECT sum(amt) FROM postings WHERE cmd = NEW.cmd), 0) <> 0 THEN
    RAISE EXCEPTION 'command % posts a nonzero total', NEW.cmd;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER acct_balance AFTER UPDATE ON acct
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_balance();
CREATE CONSTRAINT TRIGGER postings_zero_sum AFTER INSERT ON postings
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_zero_sum();

-- adjust: set account 3 to 500 and write no postings
BEGIN;
UPDATE acct SET bal = 500 WHERE id = 3;
COMMIT;

-- a proper transfer: two legs, two balances
BEGIN;
INSERT INTO postings VALUES (1, 1, -30), (1, 3, 30);
UPDATE acct SET bal = bal - 30 WHERE id = 1;
UPDATE acct SET bal = bal + 30 WHERE id = 3;
COMMIT;

-- a one-legged command: a debit and its posting, no credit leg
BEGIN;
INSERT INTO postings VALUES (2, 1, -20);
UPDATE acct SET bal = bal - 20 WHERE id = 1;
COMMIT;

SELECT id, bal FROM acct ORDER BY id;

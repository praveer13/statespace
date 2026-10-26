CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));
CREATE TABLE postings (cmd int NOT NULL, acct int NOT NULL, amt bigint NOT NULL);
INSERT INTO acct VALUES (1, 100), (3, 0);
INSERT INTO postings VALUES (0, 1, 100);

CREATE FUNCTION check_balance() RETURNS trigger AS $$
BEGIN
  IF NEW.bal <> (SELECT sum(amt) FROM postings WHERE acct = NEW.id) THEN
    RAISE EXCEPTION 'balance % does not match its postings', NEW.bal;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER acct_balance AFTER UPDATE ON acct
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_balance();

BEGIN;
UPDATE acct SET bal = 500 WHERE id = 3;
COMMIT;
SELECT id, bal FROM acct ORDER BY id;

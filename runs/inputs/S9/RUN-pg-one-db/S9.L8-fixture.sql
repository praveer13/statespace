-- S9.L8 cell 1 on the fixture database, written by the recorder: account 2 exists, and each credit runs
-- in its own transaction against the same starting state (rolled back after it is read).
CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));
INSERT INTO acct VALUES (1, 100), (2, 50);
BEGIN;
-- the compiled credit of a transfer of 30 to account 2
UPDATE acct SET bal = bal + 30 WHERE id = 2;
SELECT id, bal FROM acct ORDER BY id;
ROLLBACK;
BEGIN;
-- the agent's rewrite
INSERT INTO acct (id, bal) VALUES (2, 30)
  ON CONFLICT (id) DO UPDATE SET bal = acct.bal + 30;
SELECT id, bal FROM acct ORDER BY id;
ROLLBACK;

CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0));
INSERT INTO acct VALUES (1, 50);
UPDATE acct SET bal = bal - 80 WHERE id = 1;
SELECT id, bal FROM acct;

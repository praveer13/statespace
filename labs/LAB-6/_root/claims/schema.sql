-- LAB-6.2: your schema. It is a pinned statement: its hash is on every LAB-6 receipt whose checks run it, and
-- a change voids the claims that rest on it.
--
-- statespace check runs this file in a fresh scratch database, then opens the accounts of model.rs ACCOUNTS
-- with a plain INSERT INTO acct (id, bal) VALUES ...; keep the table acct(id, bal).
--
-- TODO(you): the constraints your plans rely on (S6.L1, S6.L2); in LAB-6.8, the commit-time check of S6.L5.
CREATE TABLE acct (id bigint PRIMARY KEY, bal bigint);

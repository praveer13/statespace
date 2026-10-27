-- db/pool.py: the on_connect hook both writer pools run once on each new connection (PostgreSQL 18.6)
SET default_transaction_isolation = 'serializable';
-- the hook runs in autocommit, before the connection's first transaction
-- each pool's connection: the team debit, retried on SQLSTATE 40001 and 40P01
UPDATE acct SET bal = bal - 150 WHERE id = $1 AND (SELECT sum(bal) FROM acct WHERE team = 1) - 150 >= 0;

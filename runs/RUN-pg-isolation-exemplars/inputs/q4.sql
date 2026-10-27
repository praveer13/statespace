-- db/migrations/042_isolation.sql: every writer serializable, set once for the database (PostgreSQL 18.6)
ALTER DATABASE postgres SET default_transaction_isolation = 'serializable';
-- deploy: run the migration while both writer pools keep the connections they hold
-- each pool's connection: the team debit, retried on SQLSTATE 40001 and 40P01
UPDATE acct SET bal = bal - 150 WHERE id = $1 AND (SELECT sum(bal) FROM acct WHERE team = 1) - 150 >= 0;

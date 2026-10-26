# Each session is a connection from one of the service's writer pools; the pool sets its level when it opens the
# connection (the _pool step). Two accounts of 100 form a team; each debit of 150 runs only while the team total
# stays at least 0, a guard inside the UPDATE. The _level step reads the level back.
# p1: a_pool b_pool a_begin a_level b_begin b_level a_debit b_debit a_commit b_commit
# p2: a_pool b_pool a_begin a_level a_debit a_commit b_begin b_level b_debit b_commit
session a
step a_pool   { SET default_transaction_isolation = 'serializable'; }
step a_begin  { BEGIN; }
step a_level  { SHOW transaction_isolation; }
step a_debit  { UPDATE acct SET bal = bal - 150 WHERE id = 1 AND (SELECT sum(bal) FROM acct WHERE team = 1) - 150 >= 0; }
step a_commit { COMMIT; }

session b
step b_pool   { SET default_transaction_isolation = 'serializable'; }
step b_begin  { BEGIN; }
step b_level  { SHOW transaction_isolation; }
step b_debit  { UPDATE acct SET bal = bal - 150 WHERE id = 2 AND (SELECT sum(bal) FROM acct WHERE team = 1) - 150 >= 0; }
step b_commit { COMMIT; }

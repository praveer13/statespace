-- accounts 1 and 2 hold 100 each, so every committed state totals 200
-- txn A only reads; txn B moves 50 from account 1 to account 2
session a
step a_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step a_read1  { SELECT bal FROM acct WHERE id = 1; }
step a_read2  { SELECT bal FROM acct WHERE id = 2; }
step a_commit { COMMIT; }

session b
step b_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step b_move   { UPDATE acct SET bal = bal - 50 WHERE id = 1; UPDATE acct SET bal = bal + 50 WHERE id = 2; }
step b_commit { COMMIT; }

permutation a_begin a_read1 b_begin b_move b_commit a_read2 a_commit

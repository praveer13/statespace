-- two accounts of 100 form a team; each session reads the team total (200)
-- and debits 150 from its own account if the total stays at least 0
session a
step a_begin  { BEGIN ISOLATION LEVEL SERIALIZABLE; }
step a_total  { SELECT sum(bal) FROM acct WHERE team = 1; }
step a_debit  { UPDATE acct SET bal = bal - 150 WHERE id = 1; }   -- only if a_total allowed it
step a_commit { COMMIT; }

session b
step b_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step b_total  { SELECT sum(bal) FROM acct WHERE team = 1; }
step b_debit  { UPDATE acct SET bal = bal - 150 WHERE id = 2; }   -- only if b_total allowed it
step b_commit { COMMIT; }

permutation a_begin a_total b_begin b_total a_debit b_debit a_commit b_commit

-- level: READ COMMITTED; account 1 holds 100; each session debits 80
setup { CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL); INSERT INTO acct VALUES (1, 100); }

-- compilation 2: conditional UPDATE, the guard and the write in one statement
session a
step a_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step a_debit  { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80; }
step a_commit { COMMIT; }

session b
step b_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step b_debit  { UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80; }   -- waits for a's row lock
step b_commit { COMMIT; }

-- compilation 1: read-modify-write, the client computes the new balance
session c
step c_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step c_read   { SELECT bal FROM acct WHERE id = 1; }
step c_write  { UPDATE acct SET bal = 20 WHERE id = 1; }   -- the client checked 100 >= 80 and computed 20
step c_commit { COMMIT; }

session d
step d_begin  { BEGIN ISOLATION LEVEL READ COMMITTED; }
step d_read   { SELECT bal FROM acct WHERE id = 1; }
step d_write  { UPDATE acct SET bal = 20 WHERE id = 1; }   -- the same constant, from its own read
step d_commit { COMMIT; }

permutation a_begin a_debit b_begin b_debit a_commit b_commit
permutation c_begin c_read d_begin d_read c_write d_write c_commit d_commit

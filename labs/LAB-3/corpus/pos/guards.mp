-- Conjunctions, negation, arithmetic and equality in guards; no semicolons; comments anywhere.
command SafePay(payer, payee, n)
  requires balance(payer) >= n && !frozen(payer) && balance(payee) + n >= 0
  do move n from payer to payee   -- n is an amount: it is moved

command Fee(src, dst)
  requires balance(src) >= 5 && (1 = 1)
  do move 5 from src to dst

command Credit(acct, k: int)
  requires k >= 1 && k - 1 >= 0
  do deposit 3 to acct

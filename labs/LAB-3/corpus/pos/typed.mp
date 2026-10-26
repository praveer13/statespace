-- S3.L2's Pay, typed, over three lines: it parses, and the type checker rejects it (unguardedDebit).
command Pay(from: account, to: account, amount: amount)
  requires balance(to) >= amount
  do move amount from from to to

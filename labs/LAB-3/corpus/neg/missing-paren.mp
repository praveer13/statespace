-- expect: line 4
command Pay(from: account, to: account, amount: amount)
  requires balance(from >= amount
  do move amount from from to to

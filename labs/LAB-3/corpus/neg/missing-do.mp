-- expect: line 3
command Transfer(from: account, to: account, amount: amount)
  requires balance(from) >= amount move amount from from to to

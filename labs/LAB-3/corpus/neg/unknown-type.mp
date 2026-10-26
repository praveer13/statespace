-- expect: line 3
command Transfer(from: account,
                 to: wallet,
                 amount: amount)
  requires balance(from) >= amount do move amount from from to to

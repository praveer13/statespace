entity Account;
command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.
command Deposit(to: account, amount: amount) do deposit amount to to.
command Hold(from, amount) requires balance(from) >= amount do hold amount on from.
command Capture(h: hold, to: account) do capture h to to.
command Release(h: hold) do release h.
command Freeze(a) requires !frozen(a) do set frozen(a) := !frozen(a).

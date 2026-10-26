command Reserve(owner, amount) requires balance(owner) >= amount do hold amount on owner.
command Settle(h, merchant) do capture h to merchant.
command Undo(h) do release h.
command Thaw(a) requires frozen(a) do set frozen(a) := !frozen(a).

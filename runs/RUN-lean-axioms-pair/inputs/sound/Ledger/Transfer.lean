structure Ledger where
  a : Int
  b : Int
deriving Repr

def transfer (l : Ledger) (amt : Int) : Ledger :=
  if 0 < amt ∧ amt ≤ l.a then { a := l.a - amt, b := l.b + amt } else l

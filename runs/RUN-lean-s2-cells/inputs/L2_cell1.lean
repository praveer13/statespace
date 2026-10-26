structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

#eval transfer { a := 10, b := 0 } 3

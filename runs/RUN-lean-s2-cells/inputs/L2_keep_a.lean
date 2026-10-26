structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem keep_a (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) : 0 ≤ s.a :=
  Int.le_trans h.1 h.2

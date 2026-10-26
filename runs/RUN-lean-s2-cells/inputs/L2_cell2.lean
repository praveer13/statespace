structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem guard_gives_cover (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) : n ≤ s.a := h.2

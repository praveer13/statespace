structure Ledger where
  a : Int
  b : Int

def total (s : Ledger) : Int := s.a + s.b

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := sorry

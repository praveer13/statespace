structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

def transferPos (s : Ledger) (n : Int) : Ledger :=
  if 0 < n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem transferPos_conserves (s : Ledger) (n : Int) :
    total (transferPos s n) = total s := by
  unfold transferPos total
  split <;> simp <;> omega

theorem transferPos_conserves_grind (s : Ledger) (n : Int) :
    total (transferPos s n) = total s := by
  unfold transferPos total
  grind

#print axioms transferPos_conserves
#print axioms transferPos_conserves_grind

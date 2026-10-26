structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

def transferPos (s : Ledger) (n : Int) : Ledger :=
  if 0 < n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

def runPos (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => runPos (transferPos s n) ns

theorem transferPos_conserves (s : Ledger) (n : Int) :
    total (transferPos s n) = total s := by
  unfold transferPos total
  split <;> simp <;> omega

theorem runPos_conserves (s : Ledger) (ns : List Int) :
    total (runPos s ns) = total s := by
  induction ns generalizing s with
  | nil => rfl
  | cons n ns ih => rfl

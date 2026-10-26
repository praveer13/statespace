structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

def run (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => run (transfer s n) ns

theorem run_conserves (s : Ledger) (ns : List Int) :
    total (run s ns) = total s := by
  induction ns with
  | nil => rfl
  | cons n ns ih => simp [run, ih]

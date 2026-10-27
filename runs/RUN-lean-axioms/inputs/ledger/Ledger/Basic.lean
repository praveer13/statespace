structure Ledger where
  a : Int
  b : Int
deriving Repr

def transfer (l : Ledger) (amt : Int) : Ledger :=
  if 0 < amt ∧ amt ≤ l.a then { a := l.a - amt, b := l.b + amt } else l

theorem transfer_conserves (l : Ledger) (amt : Int) :
    (transfer l amt).a + (transfer l amt).b = l.a + l.b := by
  unfold transfer
  split <;> simp <;> omega

theorem transfer_conserves_grind (l : Ledger) (amt : Int) :
    (transfer l amt).a + (transfer l amt).b = l.a + l.b := by
  unfold transfer; split <;> grind

theorem transfer_nonneg (l : Ledger) (amt : Int) (h : 0 ≤ l.a) :
    0 ≤ (transfer l amt).a := by
  unfold transfer; split <;> grind

theorem rejected_unchanged (l : Ledger) (amt : Int) (h : ¬ (0 < amt ∧ amt ≤ l.a)) :
    transfer l amt = l := by
  simp [transfer, h]

#eval transfer { a := 10, b := 0 } 3
#print axioms transfer_conserves
#print axioms transfer_conserves_grind

structure Ledger where
  a : Nat
  b : Nat
deriving Repr, DecidableEq

def transferPos (s : Ledger) (n : Nat) : Ledger :=
  if 0 < n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem transferPos_nonneg (s : Ledger) (n : Nat) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transferPos s n).a ∧ 0 ≤ (transferPos s n).b := by
  unfold transferPos
  split
  · next hg => exact ⟨Int.sub_nonneg_of_le hg.2, Int.add_nonneg hb (Int.le_of_lt hg.1)⟩
  · exact ⟨ha, hb⟩

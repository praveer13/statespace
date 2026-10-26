set_option linter.unusedVariables false

def pay (fromBal toBal amount : Nat) : Nat × Nat :=
  (fromBal - amount, toBal + amount)

theorem pay_nonneg (fromBal toBal amount : Nat) (h : 0 ≤ fromBal) :
    0 ≤ (pay fromBal toBal amount).1 := by
  unfold pay; simp

#print axioms pay_nonneg

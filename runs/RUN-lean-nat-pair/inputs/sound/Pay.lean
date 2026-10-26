set_option linter.unusedVariables false

def pay (fromBal toBal amount : Int) : Int × Int :=
  if amount ≤ fromBal then (fromBal - amount, toBal + amount) else (fromBal, toBal)

theorem pay_nonneg (fromBal toBal amount : Int) (h : 0 ≤ fromBal) :
    0 ≤ (pay fromBal toBal amount).1 := by
  unfold pay; split <;> simp <;> omega

#print axioms pay_nonneg

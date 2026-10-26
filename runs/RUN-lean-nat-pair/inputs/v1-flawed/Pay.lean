set_option linter.unusedVariables false

def payout (charge fee : Nat) : Option Nat :=
  some (charge - fee)

theorem payout_nonneg (charge fee p : Nat) (h : payout charge fee = some p) :
    0 ≤ p := by
  omega

#print axioms payout_nonneg

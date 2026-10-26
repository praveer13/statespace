
-- Step-3 scenarios: does the operation keep every unit of money? kept: the payout plus the fee is the charge, or the payout is refused.
def keptB (charge fee : Nat) : Bool := match payout charge fee with | some p => p + fee == charge | none => true
#eval IO.println s!"[q3 s1 payout 30 50] returns {(payout 30 50)} kept={keptB 30 50}"
#eval IO.println s!"[q3 s2 payout 30 5] returns {(payout 30 5)} kept={keptB 30 5}"
#eval IO.println s!"[q3 s3 payout 30 30] returns {(payout 30 30)} kept={keptB 30 30}"
#eval IO.println s!"[q3 s4 payout 0 1] returns {(payout 0 1)} kept={keptB 0 1}"

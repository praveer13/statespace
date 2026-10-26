/-! RUN-lean-nat-trunc (SP-3.3): draft 0 keeps balances as `Nat`, and `Pay(from, to, amount)`
    has no guard. From from = 30, to = 0, `Pay(from, to, 50)`. -/

-- draft 0's unguarded Pay on two Nat balances: (from, to)
def pay (fromBal toBal amount : Nat) : Nat × Nat := (fromBal - amount, toBal + amount)

#eval pay 30 0 50
#eval (30 + 0, (pay 30 0 50).1 + (pay 30 0 50).2)

theorem trunc : (30 : Nat) - 50 = 0 := by decide
theorem pay_witness : pay 30 0 50 = (0, 50) := by decide
-- non-negativity holds by type; the total grows from 30 to 50
theorem pay_total : (pay 30 0 50).1 + (pay 30 0 50).2 = 30 + 20 := by decide

#print axioms trunc
#print axioms pay_witness

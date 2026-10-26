def credit2 : Nat → Nat
  | 0 => 0
  | k + 1 => credit2 k + 2

theorem credit2_eq (k : Nat) : credit2 k = k + k := by
  induction k with
  | zero => rfl
  | succ k ih =>
    unfold credit2
    rw [ih]
    omega

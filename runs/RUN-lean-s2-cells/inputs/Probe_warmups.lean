def fees : Nat → Nat
  | 0 => 0
  | k + 1 => fees k + 3

theorem fees_eq (k : Nat) : fees k = 3 * k := by
  induction k with
  | zero => rfl
  | succ k ih =>
    unfold fees
    rw [ih]
    omega

def grow : Nat → Nat
  | 0 => 1
  | k + 1 => grow k + grow k

theorem grow_pos (k : Nat) : 0 < grow k := by
  induction k with
  | zero => decide
  | succ k ih =>
    unfold grow
    omega

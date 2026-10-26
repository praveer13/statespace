set_option autoImplicit false

def credit2 : Nat → Nat
  | 0 => 0
  | k + 1 => credit2 k + 2

theorem credit2_eq (k : Nat) : credit2 j = k + k := by
  sorry

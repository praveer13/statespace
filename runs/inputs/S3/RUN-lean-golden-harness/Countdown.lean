def countdown : Nat → Nat
  | 0 => 0
  | n + 1 => countdown n

def countdownWF (n : Nat) : Nat :=
  if n = 0 then 0 else countdownWF (n - 1)
termination_by n

theorem g0 : countdown 3 = 0 := by decide
theorem g : countdownWF 3 = 0 := by decide

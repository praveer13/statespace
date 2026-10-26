inductive Run where
  | done (n : Nat)
  | outOfFuel
  deriving DecidableEq

def runFuel : Nat → Nat → Run
  | 0, _ => .outOfFuel
  | fuel + 1, n => if n = 0 then .done 0 else runFuel fuel (n - 1)

theorem fuel3   : runFuel 3 10 = .outOfFuel := by decide
theorem fuel100 : runFuel 100 10 = .done 0 := by decide

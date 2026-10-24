-- A plausible C2.3: two accounts, sequences of allowed transfers conserve the total.
structure Ledger where
  a : Int
  b : Int
inductive Op | ab (n : Int) | ba (n : Int)
def step (s : Ledger) : Op → Ledger
  | .ab n => if 0 < n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s
  | .ba n => if 0 < n ∧ n ≤ s.b then { a := s.a + n, b := s.b - n } else s
def run (s : Ledger) (ops : List Op) : Ledger := ops.foldl step s
def total (s : Ledger) : Int := s.a + s.b
theorem step_conserves (s : Ledger) (o : Op) : total (step s o) = total s := by
  cases o <;> simp only [step, total] <;> split <;> simp <;> omega
theorem run_conserves (ops : List Op) : ∀ s, total (run s ops) = total s := by
  induction ops with
  | nil => intro s; rfl
  | cons o os ih => intro s; simp only [run, List.foldl] at *; rw [ih, step_conserves]
-- Note: no `Allowed` premise is needed for conservation; the guard only matters for non-negativity.

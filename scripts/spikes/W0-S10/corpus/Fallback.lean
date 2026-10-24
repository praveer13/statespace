/-! W0-S10 fallback probe: a goal recorded as a `#guard_msgs` docstring instead of read through the server. -/

structure Ledger where
  a : Int
  b : Int

def total (s : Ledger) : Int := s.a + s.b

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

/--
trace: s : Ledger
n : Int
⊢ (if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s).a +
      (if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s).b =
    s.a + s.b
-/
#guard_msgs in
theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by
  unfold transfer total
  trace_state
  split <;> simp <;> omega

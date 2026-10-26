/-! Spike: the Stage-2 two-account ledger in core Lean 4 (no Mathlib). -/

structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

/-- Transfer `n` from `a` to `b`. Rejected (state unchanged) unless 0 ≤ n ≤ a. -/
def transfer (s : Ledger) (n : Int) : Ledger :=
  if n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by
  unfold transfer total
  split <;> simp <;> omega

theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := by
  unfold transfer
  split <;> simp_all <;> omega

theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :
    transfer s n = s := by
  simp [transfer, h]

/-- Any finite sequence of transfers conserves the total. -/
def run (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => run (transfer s n) ns

theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := by
  induction ns generalizing s with
  | nil => rfl
  | cons n ns ih => simp [run, ih, transfer_conserves]

#print axioms transfer_conserves
#print axioms run_conserves

#eval transfer { a := 10, b := 3 } (-5)

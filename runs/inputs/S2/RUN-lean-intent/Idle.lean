/-! RUN-lean-intent, idle transfer (SP-2.9): the same five statements, with `transfer`
    redefined to return its input. -/

structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

-- the idle transfer: returns its input
def transfer (s : Ledger) (_n : Int) : Ledger := s

def run (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => run (transfer s n) ns

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by
  simp [transfer]

theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :
    transfer s n = s := by
  simp [transfer]

theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := by
  simp [transfer, ha, hb]

theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := by
  induction ns generalizing s with
  | nil => rfl
  | cons n ns ih => simp [run, ih, transfer_conserves]

#print axioms transfer_conserves
#print axioms transfer_rejected
#print axioms transfer_nonneg
#print axioms run_conserves

-- the fifth statement, attempted for the idle transfer
theorem transfer_moves (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) :
    transfer s n = { a := s.a - n, b := s.b + n } := by
  simp [transfer]

-- the refuting instance: amount 1 from (1, 0)
example : transfer ⟨1, 0⟩ 1 ≠ { a := 1 - 1, b := 0 + 1 } := by decide
#eval transfer ⟨1, 0⟩ 1

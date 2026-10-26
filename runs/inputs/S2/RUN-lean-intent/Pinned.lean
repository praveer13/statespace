/-! RUN-lean-intent, pinned transfer: the four pinned statements and `transfer_moves`
    (statements as in curriculum/S02-proof.md "Statement pins" and S2.L10). -/

structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

def run (s : Ledger) : List Int → Ledger
  | [] => s
  | n :: ns => run (transfer s n) ns

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by
  unfold transfer total
  split <;> simp <;> omega

theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :
    transfer s n = s := by
  simp [transfer, h]

theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := by
  unfold transfer
  split <;> simp_all <;> omega

theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := by
  induction ns generalizing s with
  | nil => rfl
  | cons n ns ih => simp [run, ih, transfer_conserves]

theorem transfer_moves (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) :
    transfer s n = { a := s.a - n, b := s.b + n } := by
  simp [transfer, h]

#print axioms transfer_conserves
#print axioms transfer_rejected
#print axioms transfer_nonneg
#print axioms run_conserves
#print axioms transfer_moves

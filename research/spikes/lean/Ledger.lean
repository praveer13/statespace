/-! Spike: the Stage-2 two-account ledger in core Lean 4 (no Mathlib). -/

structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

/-- Transfer `n` from `a` to `b`. Rejected (state unchanged) unless 0 ≤ n ≤ a. -/
def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

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

/-! The finite-map generalisation and the self-transfer bug. -/

abbrev Acct := Nat
abbrev Bal := Acct → Int

def upd (f : Bal) (k : Acct) (v : Int) : Bal := fun j => if j = k then v else f j

/-- BUGGY: computes both new balances from the OLD state. -/
def xferBuggy (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then upd (upd f src (f src - n)) dst (f dst + n) else f

/-- With src = dst = 0, balance 10, transfer 5: the account ends at 15. Money minted. -/
example : xferBuggy (fun _ => 10) 0 0 5 0 = 15 := by decide

/-- FIXED: read the destination after the debit. -/
def xfer (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then
    let f1 := upd f src (f src - n)
    upd f1 dst (f1 dst + n)
  else f

example : xfer (fun _ => 10) 0 0 5 0 = 10 := by decide

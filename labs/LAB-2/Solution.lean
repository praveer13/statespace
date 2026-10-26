/-
LAB-2, the verified ledger: your proofs.

The definitions below are the challenge's, copied once, so that `Broken` and `Fixed` can import them. Do not
change them: `lake comparator` checks that every definition here is the challenge's, and that every theorem
proves the challenge's statement word for word (challenge/Challenge.lean, which the course pins).

Replace each `sorry` marked TODO(you) with a proof. LAB-2.2 to LAB-2.4 are manual mode: the check scans the
taught theorem's proof for `grind`, `omega`, `lia`, `simp_arith`, `decide`, `native_decide`, `bv_decide` and
`try?`, and fails while it finds one. Later theorems may stay `sorry` while you work on an earlier stage:
each stage's comparator configuration (stages/LAB-2.<k>/comparator.json) names only that stage's theorems.
-/

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

-- LAB-2.2, manual mode. TODO(you): prove it.
theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by
  sorry

-- LAB-2.3, manual mode. TODO(you): prove it.
theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :
    transfer s n = s := by
  sorry

-- LAB-2.4, manual mode. TODO(you): prove it.
theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := by
  sorry

-- LAB-2.5, a weekend stage. One call before you start: which state does your induction hypothesis mention?
-- TODO(you): prove it.
theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := by
  sorry

-- The optional exercise, outside the stages: nothing checks it, and nothing waits on it. Uncomment it when you
-- take it on, and check it with `lake comparator --config optional/run_nonneg/comparator.json`.
-- TODO(you), optional:
-- theorem run_nonneg (s : Ledger) (ns : List Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
--     0 ≤ (run s ns).a ∧ 0 ≤ (run s ns).b := by
--   sorry

-- Optional, after LAB-2.7's last card (S2.L10): the statement that says money moves.
-- Its configuration is optional/transfer_moves/comparator.json.
-- theorem transfer_moves (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) :
--     transfer s n = { a := s.a - n, b := s.b + n } := by
--   sorry

abbrev Acct := Nat
abbrev Bal := Acct → Int
def upd (f : Bal) (k : Acct) (v : Int) : Bal := fun j => if j = k then v else f j
def xferBuggy (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then upd (upd f src (f src - n)) dst (f dst + n) else f
def xfer (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then
    let f1 := upd f src (f src - n)
    upd f1 dst (f1 dst + n)
  else f

-- LAB-2.6. TODO(you): prove the three.
theorem xfer_frame (f : Bal) (src dst k : Acct) (n : Int) (hs : k ≠ src) (hd : k ≠ dst) :
    xfer f src dst n k = f k := by
  sorry

theorem xfer_pair (f : Bal) (src dst : Acct) (n : Int) (h : src ≠ dst) :
    xfer f src dst n src + xfer f src dst n dst = f src + f dst := by
  sorry

theorem xfer_self (f : Bal) (k : Acct) (n : Int) : xfer f k k n k = f k := by
  sorry

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

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := sorry
theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :
    transfer s n = s := sorry
theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := sorry
theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := sorry
theorem run_nonneg (s : Ledger) (ns : List Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :   -- optional exercise, outside the stages
    0 ≤ (run s ns).a ∧ 0 ≤ (run s ns).b := sorry
theorem transfer_moves (s : Ledger) (n : Int) (h : 0 ≤ n ∧ n ≤ s.a) :   -- optional
    transfer s n = { a := s.a - n, b := s.b + n } := sorry

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

theorem xfer_frame (f : Bal) (src dst k : Acct) (n : Int) (hs : k ≠ src) (hd : k ≠ dst) :
    xfer f src dst n k = f k := sorry
theorem xfer_pair (f : Bal) (src dst : Acct) (n : Int) (h : src ≠ dst) :
    xfer f src dst n src + xfer f src dst n dst = f src + f dst := sorry
theorem xfer_self (f : Bal) (k : Acct) (n : Int) : xfer f k k n k = f k := sorry

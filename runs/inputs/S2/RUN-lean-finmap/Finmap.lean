/-! RUN-lean-finmap: the three pinned `xfer_*` statements (curriculum/S02-proof.md "Statement pins"),
    over the definitions of research/spikes/lean/Ledger.lean, with proofs and their axioms. -/

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
    xfer f src dst n k = f k := by
  unfold xfer upd
  split <;> simp [hs, hd]

theorem xfer_pair (f : Bal) (src dst : Acct) (n : Int) (h : src ≠ dst) :
    xfer f src dst n src + xfer f src dst n dst = f src + f dst := by
  unfold xfer upd
  have h' : dst ≠ src := fun e => h e.symm
  split <;> simp [h, h'] <;> omega

theorem xfer_self (f : Bal) (k : Acct) (n : Int) : xfer f k k n k = f k := by
  unfold xfer upd
  split <;> simp

#print axioms xfer_frame
#print axioms xfer_pair
#print axioms xfer_self

abbrev Acct := Nat
abbrev Bal := Acct → Int

def upd (f : Bal) (k : Acct) (v : Int) : Bal := fun j => if j = k then v else f j

-- both new balances are computed from the OLD state, then written in order
def xferBuggy (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then upd (upd f src (f src - n)) dst (f dst + n) else f

def xfer (f : Bal) (src dst : Acct) (n : Int) : Bal :=
  if 0 ≤ n ∧ n ≤ f src then
    let f1 := upd f src (f src - n)
    upd f1 dst (f1 dst + n)
  else f

theorem mints_from_7 : xferBuggy (fun _ => 7) 0 0 3 0 = 10 := by decide
theorem fixed_from_7 : xfer (fun _ => 7) 0 0 3 0 = 7 := by decide

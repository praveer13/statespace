/-! Ledger: the shipped checker, the evaluator and the step invariant (AUD-3.1, RUN-lean-checker-drift). -/
inductive Acct | a | b | c
  deriving DecidableEq, Repr

abbrev State := Acct → Int

inductive Cmd | transfer (src dst : Acct) (amt : Int)

def Cmd.src : Cmd → Acct | .transfer x _ _ => x
def Cmd.dst : Cmd → Acct | .transfer _ y _ => y

/-- The shipped checker: `none` accepts, `some rule` names the rule that rejects. -/
def typecheck : Cmd → Option String
  | .transfer _ _ amt => if 0 < amt then none else some "amount-positive"

def HasType (c : Cmd) : Prop := typecheck c = none

def setBal (s : State) (x : Acct) (v : Int) : State := fun y => if y = x then v else s y

def post (s : State) (x y : Acct) (n : Int) : State :=
  let s1 := setBal s x (s x - n)
  setBal s1 y (s1 y + n)

/-- The shipped evaluator. -/
def exec : Cmd → State → Except String State
  | .transfer x y n, s => if n ≤ s x then .ok (post s x y n) else .error "guard-failed"

def NonNeg (s : State) : Prop := 0 ≤ s .a ∧ 0 ≤ s .b ∧ 0 ≤ s .c

theorem amt_pos {x y : Acct} {n : Int} (h : HasType (.transfer x y n)) : 0 < n := by
  simp only [HasType, typecheck] at h
  split at h <;> simp_all

theorem setBal_apply (s : State) (x y : Acct) (v : Int) :
    setBal s x v y = if y = x then v else s y := rfl

theorem step_preserves_inv (c : Cmd) (s s' : State) :
    HasType c → NonNeg s → exec c s = .ok s' → NonNeg s' := by
  intro ht hs he
  cases c with
  | transfer x y n =>
    have hn : 0 < n := amt_pos ht
    simp only [exec] at he
    split at he
    · cases he
      obtain ⟨ha, hb, hc⟩ := hs
      refine ⟨?_, ?_, ?_⟩ <;> cases x <;> cases y <;> simp_all [post, setBal_apply] <;> omega
    · cases he

#print axioms step_preserves_inv

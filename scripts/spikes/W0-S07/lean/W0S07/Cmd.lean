/-
W0-S07 probe: a Mini-Plinth-style command type for Lean's experimental `vcgen`.

The shape follows the S3 curriculum spec's Mini-Plinth v0 sketch (typed parameters, a guarded
command `command C(params) requires g do st`, postings that debit and then credit reading the
updated state, a failed guard as an explicit error) plus the sequencing, `if` and integer scalars
that LAB-4 adds. It is a spike, not the course reference: balances are a function `Acct → Int`
(the LAB-3 template keeps an association list so that goldens decide), and `move` is the only
resource operation modelled.

The weakest precondition is defined from the big-step semantics `exec`, which is what the 4.35.0
`vcgen` docstring asks of an inductive command type. The `@[spec]` lemmas for `skip`, `move`,
`set` and `seq` are registered here. The guard (`Cmd.mk`) and `ite` each get two spec styles, left
unregistered so that every probe file activates one style with `attribute [local spec]`.
-/
import Std.Tactic.Do
import Std.WP

set_option autoImplicit false
set_option experimental.vcgen true

open Std.WP Lean.Order

namespace W0S07

/-! ## Syntax -/

abbrev Acct := String
abbrev Var := String

inductive Ty where
  | account | amount | int

/-- Call arguments. Account and integer parameters live apart, so a well-typed call is the
only kind there is. Amount parameters are positive by the caller's precondition. -/
structure Env where
  acct : Var → Acct
  num : Var → Int

/-- The resource field `balance` and integer scalar fields `f(x)`. -/
structure State where
  bal : Acct → Int
  fld : Var → Acct → Int

inductive AExpr where
  | lit (a : Acct)
  | var (x : Var)

inductive Expr where
  | lit (n : Int)
  | var (x : Var)
  | balance (a : AExpr)
  | field (f : Var) (a : AExpr)
  | add (e₁ e₂ : Expr)
  | sub (e₁ e₂ : Expr)

inductive BExpr where
  | ge (e₁ e₂ : Expr)
  | and (b₁ b₂ : BExpr)
  | not (b : BExpr)

inductive Err where
  | guardFailed (c : String)

inductive Stmt where
  | skip
  /-- `move n from x to y` -/
  | move (n : Expr) (x y : AExpr)
  /-- `set f(x) := e`, an integer scalar field; `balance` has no assignment form -/
  | set (f : Var) (x : AExpr) (e : Expr)
  | seq (s₁ s₂ : Stmt)
  | ite (g : BExpr) (s₁ s₂ : Stmt)

/-- `command name(params) requires guard do body` -/
structure Cmd where
  name : String
  params : List (Var × Ty)
  guard : BExpr
  body : Stmt

/-! ## Big-step semantics with an explicit error -/

@[simp, grind] def AExpr.eval (ρ : Env) : AExpr → Acct
  | .lit a => a
  | .var x => ρ.acct x

@[simp, grind] def Expr.eval (ρ : Env) (s : State) : Expr → Int
  | .lit n => n
  | .var x => ρ.num x
  | .balance a => s.bal (a.eval ρ)
  | .field f a => s.fld f (a.eval ρ)
  | .add e₁ e₂ => e₁.eval ρ s + e₂.eval ρ s
  | .sub e₁ e₂ => e₁.eval ρ s - e₂.eval ρ s

@[simp, grind] def BExpr.eval (ρ : Env) (s : State) : BExpr → Bool
  | .ge e₁ e₂ => decide (e₂.eval ρ s ≤ e₁.eval ρ s)
  | .and b₁ b₂ => b₁.eval ρ s && b₂.eval ρ s
  | .not b => !(b.eval ρ s)

def State.upd (s : State) (a : Acct) (v : Int) : State :=
  { s with bal := fun b => if b = a then v else s.bal b }

def State.setFld (s : State) (f : Var) (a : Acct) (v : Int) : State :=
  { s with fld := fun g b => if g = f ∧ b = a then v else s.fld g b }

/-- A posting: debit `x`, then credit `y` reading the updated state, so a self-posting is a
no-op. -/
def post (s : State) (x y : Acct) (n : Int) : State :=
  (s.upd x (s.bal x - n)).upd y ((s.upd x (s.bal x - n)).bal y + n)

def exec (ρ : Env) : Stmt → State → Except Err State
  | .skip, s => .ok s
  | .move n x y, s => .ok (post s (x.eval ρ) (y.eval ρ) (n.eval ρ s))
  | .set f x e, s => .ok (s.setFld f (x.eval ρ) (e.eval ρ s))
  | .seq s₁ s₂, s =>
    match exec ρ s₁ s with
    | .ok s' => exec ρ s₂ s'
    | .error e => .error e
  | .ite g s₁ s₂, s => if g.eval ρ s then exec ρ s₁ s else exec ρ s₂ s

/-- A false guard rejects the whole command with `guardFailed`; nothing commits. -/
def Cmd.exec (c : Cmd) (ρ : Env) (s : State) : Except Err State :=
  if c.guard.eval ρ s then W0S07.exec ρ c.body s else .error (.guardFailed c.name)

/-! ## State lemmas (the kind the LAB-3 template supplies with `State`) -/

@[simp, grind =] theorem bal_upd (s : State) (a : Acct) (v : Int) (b : Acct) :
    (s.upd a v).bal b = if b = a then v else s.bal b := rfl

@[simp, grind =] theorem fld_upd (s : State) (a : Acct) (v : Int) (g : Var) (b : Acct) :
    (s.upd a v).fld g b = s.fld g b := rfl

@[simp, grind =] theorem bal_setFld (s : State) (f : Var) (a : Acct) (v : Int) (b : Acct) :
    (s.setFld f a v).bal b = s.bal b := rfl

@[simp, grind =] theorem fld_setFld (s : State) (f : Var) (a : Acct) (v : Int) (g : Var)
    (b : Acct) : (s.setFld f a v).fld g b = if g = f ∧ b = a then v else s.fld g b := rfl

@[simp, grind =] theorem bal_post (s : State) (x y : Acct) (n : Int) (b : Acct) :
    (post s x y n).bal b =
      if b = y then (if y = x then s.bal x - n else s.bal y) + n
      else if b = x then s.bal x - n else s.bal b := by
  simp only [post, bal_upd]

/-! ## Weakest preconditions from the semantics -/

/-- Assertions read the call's arguments and the state. -/
abbrev Assn := Env → State → Prop

/-- The postcondition of a run: `Q` on a committed state, `E` on an error. -/
def outcome (r : Except Err State) (Q : Unit → Assn) (E : Err → Prop) (ρ : Env) : Prop :=
  match r with
  | .ok s' => Q () ρ s'
  | .error e => E e

instance : WP Stmt Unit Assn (Err → Prop) where
  wpTrans st := ⟨fun Q E ρ s => outcome (exec ρ st s) Q E ρ⟩
  wp_trans_monotone st := by
    intro Q Q' E E' hE hQ ρ s h
    simp only [outcome] at h ⊢
    split at h
    · next s' _ => exact hQ () ρ s' h
    · next e _ => exact hE e h

instance : WP Cmd Unit Assn (Err → Prop) where
  wpTrans c := ⟨fun Q E ρ s => outcome (c.exec ρ s) Q E ρ⟩
  wp_trans_monotone c := by
    intro Q Q' E E' hE hQ ρ s h
    simp only [outcome] at h ⊢
    split at h
    · next s' _ => exact hQ () ρ s' h
    · next e _ => exact hE e h

variable {Q : Unit → Assn} {E : Err → Prop}

theorem wp_stmt_apply (st : Stmt) : wp st Q E = fun ρ s => outcome (exec ρ st s) Q E ρ := rfl
theorem wp_cmd_apply (c : Cmd) : wp c Q E = fun ρ s => outcome (c.exec ρ s) Q E ρ := rfl

/-! ## `wp` equations, one per constructor, derived from `exec` -/

@[simp] theorem wp_skip (ρ : Env) (s : State) : wp Stmt.skip Q E ρ s = Q () ρ s := rfl

@[simp] theorem wp_move (n : Expr) (x y : AExpr) (ρ : Env) (s : State) :
    wp (Stmt.move n x y) Q E ρ s = Q () ρ (post s (x.eval ρ) (y.eval ρ) (n.eval ρ s)) := rfl

@[simp] theorem wp_set (f : Var) (x : AExpr) (e : Expr) (ρ : Env) (s : State) :
    wp (Stmt.set f x e) Q E ρ s = Q () ρ (s.setFld f (x.eval ρ) (e.eval ρ s)) := rfl

@[simp] theorem wp_seq (s₁ s₂ : Stmt) (ρ : Env) (s : State) :
    wp (Stmt.seq s₁ s₂) Q E ρ s = wp s₁ (fun _ => wp s₂ Q E) E ρ s := by
  simp only [wp_stmt_apply, exec]
  cases exec ρ s₁ s <;> rfl

@[simp] theorem wp_ite (g : BExpr) (s₁ s₂ : Stmt) (ρ : Env) (s : State) :
    wp (Stmt.ite g s₁ s₂) Q E ρ s = if g.eval ρ s then wp s₁ Q E ρ s else wp s₂ Q E ρ s := by
  simp only [wp_stmt_apply, exec]
  split <;> rfl

@[simp] theorem wp_cmd (n : String) (ps : List (Var × Ty)) (g : BExpr) (b : Stmt) (ρ : Env)
    (s : State) :
    wp (Cmd.mk n ps g b) Q E ρ s = if g.eval ρ s then wp b Q E ρ s else E (.guardFailed n) := by
  simp only [wp_cmd_apply, Cmd.exec]
  split <;> rfl

theorem triple_of_wp_stmt {st : Stmt} {pre : Assn} (h : ∀ ρ s, wp st Q E ρ s = pre ρ s) :
    Triple st pre Q E :=
  Triple.iff.mpr (by rw [funext fun ρ => funext fun s => h ρ s]; exact PartialOrder.rel_refl)

theorem triple_of_wp_cmd {c : Cmd} {pre : Assn} (h : ∀ ρ s, wp c Q E ρ s = pre ρ s) :
    Triple c pre Q E :=
  Triple.iff.mpr (by rw [funext fun ρ => funext fun s => h ρ s]; exact PartialOrder.rel_refl)

/-! ## Registered specifications -/

@[spec] theorem Spec.skip : Triple Stmt.skip (Q ()) Q E := triple_of_wp_stmt wp_skip

@[spec] theorem Spec.move (n : Expr) (x y : AExpr) :
    Triple (Stmt.move n x y) (fun ρ s => Q () ρ (post s (x.eval ρ) (y.eval ρ) (n.eval ρ s))) Q E :=
  triple_of_wp_stmt (wp_move n x y)

@[spec] theorem Spec.set (f : Var) (x : AExpr) (e : Expr) :
    Triple (Stmt.set f x e) (fun ρ s => Q () ρ (s.setFld f (x.eval ρ) (e.eval ρ s))) Q E :=
  triple_of_wp_stmt (wp_set f x e)

@[spec] theorem Spec.seq (s₁ s₂ : Stmt) :
    Triple (Stmt.seq s₁ s₂) (wp s₁ (fun _ => wp s₂ Q E) E) Q E :=
  triple_of_wp_stmt (wp_seq s₁ s₂)

/-! ## The guard and `ite`, style 1: an `if` in the precondition

This is the style of the upstream IMP example (`tests/elab/vcgenImp.lean` at v4.35.0). -/

theorem Spec.iteIf (g : BExpr) (s₁ s₂ : Stmt) :
    Triple (Stmt.ite g s₁ s₂)
      (fun ρ s => if g.eval ρ s then wp s₁ Q E ρ s else wp s₂ Q E ρ s) Q E :=
  triple_of_wp_stmt (wp_ite g s₁ s₂)

theorem Spec.cmdIf (n : String) (ps : List (Var × Ty)) (g : BExpr) (b : Stmt) :
    Triple (Cmd.mk n ps g b)
      (fun ρ s => if g.eval ρ s then wp b Q E ρ s else E (.guardFailed n)) Q E :=
  triple_of_wp_cmd (wp_cmd n ps g b)

/-! ## The guard and `ite`, style 2: the lattice connectives `⊓` and `⇨`

`vcgen` decomposes `⊓` and `⇨` on the right of an entailment, so a precondition written with them
lets it split on the guard and continue into each branch. -/

/-- The guard holds, as an assertion. -/
def holds (g : BExpr) : Assn := fun ρ s => g.eval ρ s = true
/-- The guard fails, as an assertion. -/
def fails (g : BExpr) : Assn := fun ρ s => g.eval ρ s = false

@[simp, grind =] theorem holds_apply (g : BExpr) (ρ : Env) (s : State) :
    holds g ρ s = (g.eval ρ s = true) := rfl
@[simp, grind =] theorem fails_apply (g : BExpr) (ρ : Env) (s : State) :
    fails g ρ s = (g.eval ρ s = false) := rfl

theorem Spec.ite (g : BExpr) (s₁ s₂ : Stmt) :
    Triple (Stmt.ite g s₁ s₂) ((holds g ⇨ wp s₁ Q E) ⊓ (fails g ⇨ wp s₂ Q E)) Q E := by
  apply Triple.iff.mpr
  intro ρ s h
  simp only [meet_apply, himp_apply, meet_prop_eq_and, himp_prop_eq_imp, holds_apply,
    fails_apply] at h
  simp only [wp_ite]
  split
  · next hg => exact h.1 hg
  · next hg => exact h.2 (by simpa using hg)

theorem Spec.cmd (n : String) (ps : List (Var × Ty)) (g : BExpr) (b : Stmt) :
    Triple (Cmd.mk n ps g b)
      ((holds g ⇨ wp b Q E) ⊓ (fails g ⇨ fun _ _ => E (.guardFailed n))) Q E := by
  apply Triple.iff.mpr
  intro ρ s h
  simp only [meet_apply, himp_apply, meet_prop_eq_and, himp_prop_eq_imp, holds_apply,
    fails_apply] at h
  simp only [wp_cmd]
  split
  · next hg => exact h.1 hg
  · next hg => exact h.2 (by simpa using hg)

/-! ## Commands -/

/-- The roadmap's command: `command Transfer(from, to, amount) requires balance(from) >= amount
do move amount from from to to`. -/
def Transfer : Cmd where
  name := "Transfer"
  params := [("from", .account), ("to", .account), ("amount", .amount)]
  guard := .ge (.balance (.var "from")) (.var "amount")
  body := .move (.var "amount") (.var "from") (.var "to")

/-- The same command with its guard weakened to `balance(from) >= 0`: the deep-embedded twin of
the measured shallow probe whose `requires` dropped `amt ≤ a`. -/
def TransferWeakGuard : Cmd where
  name := "Transfer"
  params := [("from", .account), ("to", .account), ("amount", .amount)]
  guard := .ge (.balance (.var "from")) (.lit 0)
  body := .move (.var "amount") (.var "from") (.var "to")

/-- LAB-4's additions in one command: sequencing, `if` and an integer scalar.
`command FeeTransfer(from, to, amount, fee) requires balance(from) >= amount + fee
do move amount from from to to; (if amount >= 100 then move fee from from to sink else skip);
set transfers(from) := transfers(from) + 1`. -/
def FeeTransfer : Cmd where
  name := "FeeTransfer"
  params := [("from", .account), ("to", .account), ("amount", .amount), ("fee", .amount)]
  guard := .ge (.balance (.var "from")) (.add (.var "amount") (.var "fee"))
  body :=
    .seq (.move (.var "amount") (.var "from") (.var "to"))
      (.seq (.ite (.ge (.var "amount") (.lit 100))
              (.move (.var "fee") (.var "from") (.lit "sink"))
              .skip)
        (.set "transfers" (.var "from") (.add (.field "transfers" (.var "from")) (.lit 1))))

/-- Two debits behind two guards read in the pre-state. When `x` and `y` name one account, both
guards can pass while the two debits together overdraw it (the S3 spec's dp:S1 hazard, which
sequencing brings back). -/
def PayTwo : Cmd where
  name := "PayTwo"
  params := [("x", .account), ("y", .account), ("z", .account), ("n", .amount), ("m", .amount)]
  guard := .and (.ge (.balance (.var "x")) (.var "n")) (.ge (.balance (.var "y")) (.var "m"))
  body := .seq (.move (.var "n") (.var "x") (.var "z")) (.move (.var "m") (.var "y") (.var "z"))

/-- Every account except `mint` is non-negative (the S3 invariant's sign part). -/
def NonNeg (s : State) : Prop := ∀ a, a ≠ "mint" → 0 ≤ s.bal a

end W0S07

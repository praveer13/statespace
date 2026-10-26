/-!
# MiniPlinth.Core: the template's core (read-only)

Reference module, earns nothing. The template supplies, read-only: accounts, values, the state with its
lemmas, `Inv`, the errors, outputs and effects, types, expressions with `evalExpr` and two guard lemmas,
amounts, resolved operations, calls, the policy and the goldens harness (curriculum/S03-semantics.md
section 1.1, item 8). You write `ResourceOp`, `Stmt`, `Cmd`, `typecheck`, `Covers`, `post`, `applyOp`,
`exec` and `policy` in `Lab3/`.

Everything here is finite and decidable, and every function is structurally recursive, so a golden
`exec p c s = r` can be closed by `decide` with no axioms (section 1.1, items 1 and 2).
-/

namespace MiniPlinth

/-! ## Accounts, amounts and values -/

/-- Accounts: the mint (the only account allowed below zero), the sink, user accounts by name, and the
escrow account of hold `h`. Commands never name an escrow account. -/
inductive Acct where
  | mint
  | sink
  | user (name : String)
  | escrow (h : Nat)
  deriving DecidableEq, Repr, Inhabited

/-- A positive amount. A value carries its proof, checked once when it is built, so zero and negative
amounts are decided at the boundary (S3.L2). -/
abbrev Amount := { n : Int // 0 < n }

/-- A hold's id: holds are numbered from the state's `nextHold`. -/
abbrev HoldId := Nat

/-- Mini-Plinth's types. `amount` values are positive integers. -/
inductive Ty where
  | account
  | amount
  | hold
  | int
  | bool
  deriving DecidableEq, Repr, Inhabited

/-- A run-time value: what an argument of a call, or an expression, evaluates to. -/
inductive Val where
  | acct (a : Acct)
  | int (n : Int)
  | bool (b : Bool)
  | hold (h : HoldId)
  deriving DecidableEq, Repr, Inhabited

/-! ## The state -/

inductive HoldStatus where
  | held
  | captured
  | released
  deriving DecidableEq, Repr, Inhabited

/-- A hold: whose funds it holds, how much, and whether it is still open. -/
structure Hold where
  owner : Acct
  amount : Amount
  status : HoldStatus
  deriving DecidableEq, Repr

/-- The state: balances as an association list with unique keys (never a function, which has no decidable
equality), the holds, the next hold id, and the accounts whose `frozen` flag is set. -/
structure State where
  bals : List (Acct × Int)
  holds : List (HoldId × Hold) := []
  nextHold : HoldId := 0
  frozen : List Acct := []
  deriving DecidableEq, Repr

/-- The first value stored for `a`. -/
def lookupBal : List (Acct × Int) → Acct → Option Int
  | [], _ => none
  | (b, v) :: rest, a => if b = a then some v else lookupBal rest a

/-- Replace the value stored for `a`, or add `a` at the end when it is absent. -/
def setIn : List (Acct × Int) → Acct → Int → List (Acct × Int)
  | [], a, v => [(a, v)]
  | (b, w) :: rest, a, v => if b = a then (a, v) :: rest else (b, w) :: setIn rest a v

def sumBals : List (Acct × Int) → Int
  | [] => 0
  | (_, v) :: rest => v + sumBals rest

def lookupHold : List (HoldId × Hold) → HoldId → Option Hold
  | [], _ => none
  | (i, h) :: rest, j => if i = j then some h else lookupHold rest j

def setHoldIn : List (HoldId × Hold) → HoldId → Hold → List (HoldId × Hold)
  | [], j, h => [(j, h)]
  | (i, g) :: rest, j, h => if i = j then (j, h) :: rest else (i, g) :: setHoldIn rest j h

/-- An account's balance; an absent account reads as 0. -/
def State.bal (s : State) (a : Acct) : Int := (lookupBal s.bals a).getD 0

/-- Whether the account exists in the state. -/
def State.hasAcct (s : State) (a : Acct) : Bool := (lookupBal s.bals a).isSome

def State.setBal (s : State) (a : Acct) (v : Int) : State := { s with bals := setIn s.bals a v }

def State.hold? (s : State) (h : HoldId) : Option Hold := lookupHold s.holds h

def State.setHold (s : State) (h : HoldId) (r : Hold) : State := { s with holds := setHoldIn s.holds h r }

def State.isFrozen (s : State) (a : Acct) : Bool := s.frozen.contains a

def State.setFrozen (s : State) (a : Acct) (b : Bool) : State :=
  { s with frozen := if b then (if s.frozen.contains a then s.frozen else s.frozen ++ [a]) else s.frozen.filter (· != a) }

/-! ## The invariant -/

def keys (l : List (Acct × Int)) : List Acct := l.map Prod.fst

def total (s : State) : Int := sumBals s.bals

/-- Unique keys, so that `total` counts every account once. -/
def WF (s : State) : Prop := (keys s.bals).Nodup

/-- Every account but the mint is non-negative. -/
def NonNeg (s : State) : Prop := ∀ p ∈ s.bals, p.1 ≠ Acct.mint → 0 ≤ p.2

/-- The state invariant: unique keys, a total of 0, and no account but the mint below zero. -/
def Inv (s : State) : Prop := WF s ∧ total s = 0 ∧ NonNeg s

instance (s : State) : Decidable (WF s) := inferInstanceAs (Decidable (keys s.bals).Nodup)
instance (s : State) : Decidable (NonNeg s) :=
  inferInstanceAs (Decidable (∀ p ∈ s.bals, p.1 ≠ Acct.mint → 0 ≤ p.2))
instance (s : State) : Decidable (Inv s) := inferInstanceAs (Decidable (WF s ∧ total s = 0 ∧ NonNeg s))

/-! ## The state's lemmas -/

theorem lookupBal_setIn_same (l : List (Acct × Int)) (a : Acct) (v : Int) :
    lookupBal (setIn l a v) a = some v := by
  induction l with
  | nil => simp [setIn, lookupBal]
  | cons p rest ih =>
    obtain ⟨b, w⟩ := p
    by_cases h : b = a
    · subst h; simp [setIn, lookupBal]
    · simp [setIn, lookupBal, h, ih]

theorem lookupBal_setIn_other (l : List (Acct × Int)) (a b : Acct) (v : Int) (h : b ≠ a) :
    lookupBal (setIn l a v) b = lookupBal l b := by
  induction l with
  | nil => simp [setIn, lookupBal, Ne.symm h]
  | cons p rest ih =>
    obtain ⟨c, w⟩ := p
    by_cases hc : c = a
    · subst hc; simp [setIn, lookupBal, Ne.symm h]
    · simp only [setIn, hc, ite_false, lookupBal]
      split <;> simp_all

theorem State.bal_setBal_same (s : State) (a : Acct) (v : Int) : (s.setBal a v).bal a = v := by
  simp [State.bal, State.setBal, lookupBal_setIn_same]

theorem State.bal_setBal_other (s : State) (a b : Acct) (v : Int) (h : b ≠ a) :
    (s.setBal a v).bal b = s.bal b := by
  simp [State.bal, State.setBal, lookupBal_setIn_other _ _ _ _ h]

theorem keys_setIn (l : List (Acct × Int)) (a : Acct) (v : Int) :
    keys (setIn l a v) = if a ∈ keys l then keys l else keys l ++ [a] := by
  induction l with
  | nil => simp [setIn, keys]
  | cons p rest ih =>
    obtain ⟨b, w⟩ := p
    by_cases h : b = a
    · subst h; simp [setIn, keys]
    · simp only [setIn, h, ite_false]
      simp only [keys, List.map_cons, List.mem_cons] at ih ⊢
      rw [ih]
      by_cases hm : a ∈ List.map Prod.fst rest
      · simp [hm]
      · simp [hm, Ne.symm h]

theorem setBal_wf {s : State} {a : Acct} {v : Int} : WF s → WF (s.setBal a v) := by
  intro h
  unfold WF State.setBal at *
  simp only
  rw [keys_setIn]
  split
  · exact h
  · rename_i hm
    exact List.nodup_append.mpr ⟨h, List.nodup_cons.mpr ⟨by simp, List.nodup_nil⟩, by
      intro x hx y hy; simp at hy; subst hy; intro hxy; subst hxy; exact hm hx⟩

theorem lookupBal_none_of_not_mem (l : List (Acct × Int)) (a : Acct) (h : a ∉ keys l) :
    lookupBal l a = none := by
  induction l with
  | nil => rfl
  | cons p rest ih =>
    obtain ⟨b, w⟩ := p
    simp only [keys, List.map_cons, List.mem_cons, not_or] at h
    simp only [lookupBal, Ne.symm h.1, ite_false]
    exact ih h.2

theorem sumBals_setIn (l : List (Acct × Int)) (a : Acct) (v : Int) (h : (keys l).Nodup) :
    sumBals (setIn l a v) = sumBals l - (lookupBal l a).getD 0 + v := by
  induction l with
  | nil => simp [setIn, sumBals, lookupBal]
  | cons p rest ih =>
    obtain ⟨b, w⟩ := p
    simp only [keys, List.map_cons, List.nodup_cons] at h
    by_cases hb : b = a
    · subst hb
      have hnone := lookupBal_none_of_not_mem rest b h.1
      simp [setIn, sumBals, lookupBal]
      omega
    · simp only [setIn, hb, ite_false, sumBals, lookupBal]
      rw [ih h.2]
      omega

theorem total_setBal {s : State} {a : Acct} {v : Int} :
    WF s → total (s.setBal a v) = total s - s.bal a + v := by
  intro h
  exact sumBals_setIn s.bals a v h

theorem mem_setIn (l : List (Acct × Int)) (a : Acct) (v : Int) (p : Acct × Int) :
    p ∈ setIn l a v → p = (a, v) ∨ p ∈ l := by
  induction l with
  | nil => simp [setIn]
  | cons q rest ih =>
    obtain ⟨b, w⟩ := q
    simp only [setIn]
    split
    · intro hp
      simp only [List.mem_cons] at hp
      rcases hp with hp | hp
      · exact Or.inl hp
      · exact Or.inr (List.mem_cons_of_mem _ hp)
    · intro hp
      simp only [List.mem_cons] at hp
      rcases hp with hp | hp
      · exact Or.inr (by simp [hp])
      · rcases ih hp with h | h
        · exact Or.inl h
        · exact Or.inr (List.mem_cons_of_mem _ h)

theorem nonneg_setBal {s : State} {a : Acct} {v : Int} :
    NonNeg s → (a = .mint ∨ 0 ≤ v) → NonNeg (s.setBal a v) := by
  intro hs hv p hp hpm
  rcases mem_setIn s.bals a v p hp with h | h
  · subst h
    rcases hv with hv | hv
    · exact absurd hv hpm
    · exact hv
  · exact hs p h hpm

theorem lookupBal_mem (l : List (Acct × Int)) (a : Acct) (v : Int) :
    lookupBal l a = some v → (a, v) ∈ l := by
  induction l with
  | nil => simp [lookupBal]
  | cons q rest ih =>
    obtain ⟨b, w⟩ := q
    simp only [lookupBal]
    split
    · rename_i hb; intro h; cases h; subst hb; simp
    · intro h; exact List.mem_cons_of_mem _ (ih h)

theorem bal_nonneg {s : State} {a : Acct} : NonNeg s → a ≠ .mint → 0 ≤ s.bal a := by
  intro hs ha
  unfold State.bal
  cases h : lookupBal s.bals a with
  | none => simp
  | some v => simpa using hs (a, v) (lookupBal_mem _ _ _ h) ha

/-- A change that leaves the balances alone keeps the invariant. -/
theorem inv_of_bals_eq {s s' : State} (h : s'.bals = s.bals) : Inv s → Inv s' := by
  intro hs
  unfold Inv WF total NonNeg at *
  rw [h]
  exact hs

/-! ## Errors, outputs and effects -/

/-- Every way a call can fail is a value (S3.L3). `typeError` arises only on ill-typed input, where the
small-step relation is stuck; `outOfFuel` only from a fueled runner. -/
inductive Err where
  | unknownCommand (c : String)
  | badArgument (p : String)
  | unknownAccount (a : Acct)
  | selfTransfer
  | guardFailed (c : String)
  | unknownHold (h : HoldId)
  | holdNotOpen (h : HoldId)
  | overflow (a : Acct)
  | typeError
  | outOfFuel
  deriving DecidableEq, Repr

/-- What a successful call returns to its caller: the ids of the holds it opened. -/
abbrev Output := List HoldId

/-- What a successful call asks the world to do after it commits. -/
inductive Effect where
  | notify (a : Acct)
  deriving DecidableEq, Repr

-- The goldens harness: Lean core has no `DecidableEq` for `Except`, and without one `decide` cannot
-- close a golden `exec p c s = r` (RUN-lean-golden-harness). With it, goldens use no axioms.
deriving instance DecidableEq for Except

/-! ## Resolved operations -/

/-- An operation with its arguments resolved: amounts are `Amount`s and accounts are `Acct`s. Your
`ResourceOp` is the syntax; your evaluator resolves it to an `Op` and applies it with `applyOp`. -/
inductive Op where
  | deposit (n : Amount) (a : Acct)
  | move (n : Amount) (x y : Acct)
  | hold (n : Amount) (x : Acct)
  | capture (h : HoldId) (y : Acct)
  | release (h : HoldId)
  deriving DecidableEq, Repr

/-! ## Expressions -/

/-- Expressions. Literals are integers; accounts, holds and booleans come from parameters. -/
inductive Expr where
  | lit (n : Int)
  | var (x : String)
  | balance (e : Expr)
  | frozen (e : Expr)
  | add (a b : Expr)
  | sub (a b : Expr)
  | ge (a b : Expr)
  | eq (a b : Expr)
  | and (a b : Expr)
  | not (a : Expr)
  deriving DecidableEq, Repr, Inhabited

/-- An environment: each parameter's value. -/
abbrev Env := List (String × Val)

def Env.get : Env → String → Option Val
  | [], _ => none
  | (y, v) :: rest, x => if y = x then some v else Env.get rest x

/-- Big-step evaluation of an expression. `none` means the expression is ill-typed for these values: a
variable that is not bound, `balance` of something that is not an account, and the like. -/
def evalExpr (env : Env) (s : State) : Expr → Option Val
  | .lit n => some (.int n)
  | .var x => env.get x
  | .balance e =>
    match evalExpr env s e with
    | some (.acct a) => some (.int (s.bal a))
    | _ => none
  | .frozen e =>
    match evalExpr env s e with
    | some (.acct a) => some (.bool (s.isFrozen a))
    | _ => none
  | .add a b =>
    match evalExpr env s a, evalExpr env s b with
    | some (.int x), some (.int y) => some (.int (x + y))
    | _, _ => none
  | .sub a b =>
    match evalExpr env s a, evalExpr env s b with
    | some (.int x), some (.int y) => some (.int (x - y))
    | _, _ => none
  | .ge a b =>
    match evalExpr env s a, evalExpr env s b with
    | some (.int x), some (.int y) => some (.bool (decide (y ≤ x)))
    | _, _ => none
  | .eq a b =>
    match evalExpr env s a, evalExpr env s b with
    | some x, some y => some (.bool (decide (x = y)))
    | _, _ => none
  | .and a b =>
    match evalExpr env s a, evalExpr env s b with
    | some (.bool x), some (.bool y) => some (.bool (x && y))
    | _, _ => none
  | .not a =>
    match evalExpr env s a with
    | some (.bool x) => some (.bool (!x))
    | _ => none

def evalInt (env : Env) (s : State) (e : Expr) : Option Int :=
  match evalExpr env s e with
  | some (.int n) => some n
  | _ => none

def evalAcct (env : Env) (s : State) (e : Expr) : Option Acct :=
  match evalExpr env s e with
  | some (.acct a) => some a
  | _ => none

def evalHold (env : Env) (s : State) (e : Expr) : Option HoldId :=
  match evalExpr env s e with
  | some (.hold h) => some h
  | _ => none

/-- Whether a guard holds: it evaluates to `true`. -/
def evalBool (env : Env) (s : State) (g : Expr) : Bool :=
  evalExpr env s g == some (.bool true)

/-! ## Two guard lemmas -/

/-- A conjunction holds only when both sides hold. -/
theorem evalBool_and {env : Env} {s : State} {a b : Expr} :
    evalBool env s (.and a b) = true → evalBool env s a = true ∧ evalBool env s b = true := by
  unfold evalBool
  simp only [evalExpr]
  split <;> simp_all

/-- `balance(x) >= n` holds only when `x` is an account and `n` an integer no larger than its balance. -/
theorem evalBool_ge_balance {env : Env} {s : State} {x n : Expr} :
    evalBool env s (.ge (.balance x) n) = true →
      ∀ a k, evalAcct env s x = some a → evalInt env s n = some k → k ≤ s.bal a := by
  intro h a k ha hk
  unfold evalAcct at ha
  unfold evalInt at hk
  unfold evalBool at h
  simp only [evalExpr] at h
  split at ha <;> simp at ha
  rename_i heq
  subst ha
  rw [heq] at h
  split at hk <;> simp at hk
  rename_i heq2
  subst hk
  rw [heq2] at h
  simpa using h

/-! ## Calls, policy and the type checker's errors -/

/-- A call: the command's name and its raw argument values. Amounts are decoded at the boundary. -/
structure Call where
  name : String
  args : List Val
  deriving DecidableEq, Repr

inductive ZeroPolicy where
  | reject
  | noop
  deriving DecidableEq, Repr
inductive SelfPolicy where
  | allow
  | reject
  deriving DecidableEq, Repr
inductive GuardPolicy where
  | error
  | silent
  deriving DecidableEq, Repr
inductive OverflowPolicy where
  | unbounded
  | bounded
  deriving DecidableEq, Repr

/-- The bound of `overflow = bounded`: the largest 64-bit signed integer. A balance outside
[-maxBal, maxBal] after a step is `overflow a`. -/
def maxBal : Int := 9223372036854775807

/-- The four edge-case decisions (S3.L7). Your evaluator implements one and declares it as
`Lab3.policy`; the edge-case goldens are selected by it, and your decision records must match it. -/
structure Policy where
  zero : ZeroPolicy
  self : SelfPolicy
  guard : GuardPolicy
  overflow : OverflowPolicy
  deriving DecidableEq, Repr

/-- The reference's decisions: reject zero, allow a self-transfer (a no-op by sequential postings), make a
failed guard an error, and leave balances unbounded. -/
def Policy.reference : Policy := ⟨.reject, .allow, .error, .unbounded⟩

/-- The rule a rejected command breaks (curriculum/S03-semantics.md section 2.2). -/
inductive TypeErr where
  | dupParam
  | unknownParam
  | wrongType
  | nonPositive
  | unguardedDebit
  | assignsResource
  deriving DecidableEq, Repr

/-- A golden's literals, as the golden module writes them: `lake exe export-ir` reads each right-hand
side from here, never from a fresh evaluation (curriculum/S03-semantics.md section 2.7). -/
structure GoldenRec where
  id : String
  thm : String
  program : String
  call : Call
  pre : State
  outcome : Except Err (State × Output × List Effect)

end MiniPlinth

-- Lean's core has a class named `Inv` at the root. With `open MiniPlinth`, the name `Inv` would then be
-- ambiguous, so the namespaces of your semantics and of the reference carry `Inv` as an alias of this one.
namespace Lab3
export MiniPlinth (Inv)
end Lab3

namespace MiniPlinthRef
export MiniPlinth (Inv)
end MiniPlinthRef


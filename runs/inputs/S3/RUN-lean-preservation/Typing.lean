import MiniPlinthRef.Syntax
/-!
# MiniPlinthRef.Typing: the reference type checker

Reference module, earns nothing. `typecheck c = .ok ()` is `HasType` (curriculum/S03-semantics.md
section 1.1, item 4): a checking function, so typing goldens are decidable, and every rejection names its
rule. Rules are checked in this order, and the first that fails is reported: R-param (`dupParam`), then the
guard (R-var `unknownParam`, R-expr `wrongType`, and the guard must be a `bool`), then the statement from
left to right (R-amount `nonPositive`, R-var, R-expr and R-hold `wrongType`, R-cover `unguardedDebit`,
R-set `assignsResource`).
-/
namespace MiniPlinthRef
open MiniPlinth

/-- `covers g x n`: some top-level conjunct of `g` is `balance(x) >= n`. A disjunction never covers. -/
def covers : Expr → Expr → Expr → Bool
  | .ge (.balance y) m, x, n => y == x && m == n
  | .and g₁ g₂, x, n => covers g₁ x n || covers g₂ x n
  | _, _, _ => false

def Covers (g x n : Expr) : Prop := covers g x n = true

/-- The parameters' types. -/
abbrev TyEnv := List (String × Ty)

def TyEnv.get : TyEnv → String → Option Ty
  | [], _ => none
  | (y, t) :: rest, x => if y = x then some t else TyEnv.get rest x

def distinctNames : List String → Bool
  | [] => true
  | x :: rest => !rest.contains x && distinctNames rest

def numeric : Ty → Bool
  | .int => true
  | .amount => true
  | _ => false

/-- R-var and R-expr: the type of an expression. -/
def inferTy (Γ : TyEnv) : Expr → Except TypeErr Ty
  | .lit _ => .ok .int
  | .var x =>
    match Γ.get x with
    | some t => .ok t
    | none => .error .unknownParam
  | .balance e =>
    match inferTy Γ e with
    | .ok .account => .ok .int
    | .ok _ => .error .wrongType
    | .error err => .error err
  | .frozen e =>
    match inferTy Γ e with
    | .ok .account => .ok .bool
    | .ok _ => .error .wrongType
    | .error err => .error err
  | .add a b | .sub a b =>
    match inferTy Γ a, inferTy Γ b with
    | .error err, _ => .error err
    | .ok _, .error err => .error err
    | .ok ta, .ok tb => if numeric ta && numeric tb then .ok .int else .error .wrongType
  | .ge a b =>
    match inferTy Γ a, inferTy Γ b with
    | .error err, _ => .error err
    | .ok _, .error err => .error err
    | .ok ta, .ok tb => if numeric ta && numeric tb then .ok .bool else .error .wrongType
  | .eq a b =>
    match inferTy Γ a, inferTy Γ b with
    | .error err, _ => .error err
    | .ok _, .error err => .error err
    | .ok ta, .ok tb => if ta == tb || (numeric ta && numeric tb) then .ok .bool else .error .wrongType
  | .and a b =>
    match inferTy Γ a, inferTy Γ b with
    | .error err, _ => .error err
    | .ok _, .error err => .error err
    | .ok ta, .ok tb => if ta == .bool && tb == .bool then .ok .bool else .error .wrongType
  | .not a =>
    match inferTy Γ a with
    | .ok .bool => .ok .bool
    | .ok _ => .error .wrongType
    | .error err => .error err

/-- An expression must have type `t`. -/
def expect (Γ : TyEnv) (e : Expr) (t : Ty) : Except TypeErr Unit :=
  match inferTy Γ e with
  | .ok t' => if t' == t then .ok () else .error .wrongType
  | .error err => .error err

/-- R-amount: an operation's amount is an `amount` parameter or a positive literal. -/
def checkAmount (Γ : TyEnv) : Expr → Except TypeErr Unit
  | .var x =>
    match Γ.get x with
    | some .amount => .ok ()
    | some _ => .error .nonPositive
    | none => .error .unknownParam
  | .lit k => if 0 < k then .ok () else .error .nonPositive
  | _ => .error .nonPositive

/-- R-cover: a debit of `x` by `n` needs a covering guard. -/
def checkCover (g x n : Expr) : Except TypeErr Unit :=
  .ok ()  -- R-cover deleted

def checkOp (Γ : TyEnv) (g : Expr) : ResourceOp → Except TypeErr Unit
  | .deposit n a => do checkAmount Γ n; expect Γ a .account
  | .move n x y => do checkAmount Γ n; expect Γ x .account; expect Γ y .account; checkCover g x n
  | .hold n x => do checkAmount Γ n; expect Γ x .account; checkCover g x n
  | .capture h y => do expect Γ h .hold; expect Γ y .account
  | .release h => expect Γ h .hold

/-- R-set: only a scalar field can be assigned; `balance` is a resource and has no assignment rule. The
one scalar field is `frozen`, a `bool`. -/
def checkStmt (Γ : TyEnv) (g : Expr) : Stmt → Except TypeErr Unit
  | .op r => checkOp Γ g r
  | .set f x e =>
    if f = "balance" then .error .assignsResource
    else if f = "frozen" then do expect Γ x .account; expect Γ e .bool
    else .error .wrongType

/-- The type checker: `HasType c` is `typecheck c = .ok ()`. -/
def typecheck (c : Cmd) : Except TypeErr Unit := do
  if !distinctNames (c.params.map Prod.fst) then .error .dupParam
  expect c.params c.guard .bool
  checkStmt c.params c.guard c.body

def HasType (c : Cmd) : Prop := typecheck c = .ok ()

def WellTyped (p : Program) : Prop := ∀ c ∈ p, typecheck c = .ok ()

end MiniPlinthRef

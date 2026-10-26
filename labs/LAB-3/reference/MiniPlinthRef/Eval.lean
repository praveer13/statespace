import MiniPlinthRef.Typing
/-!
# MiniPlinthRef.Eval: the reference evaluator

Reference module, earns nothing. `execWith pol p c s` is total and structurally recursive, and every
failure is a value. It checks, in this order (curriculum/S03-semantics.md section 2.4):

1. the command exists, else `unknownCommand C`;
2. the arguments decode by arity and type, amounts positive, else `badArgument p`; under `zero = noop` an
   amount of 0 returns `.ok (s, [], [])` at once, with no account or guard check;
3. every account argument exists, in parameter order, else `unknownAccount a`;
4. a `move` from an account to itself is `selfTransfer` under `self = reject`;
5. a false guard is `guardFailed C` under `guard = error`, or `.ok (s, [], [])` under `silent`;
6. the statement's run-time checks: `unknownHold h`, `holdNotOpen h`;
7. the postings; under `overflow = bounded`, a posted balance outside [-maxBal, maxBal] is `overflow a`,
   for the first such account, credited before debited;
8. effects: `notify y` for each credited user account; the output `[h]` for a hold, else `[]`.
-/
namespace MiniPlinthRef
open MiniPlinth

/-- Debit `x` by `n`, then credit `y` by `n`, reading the state the debit left: a self-posting changes
nothing. -/
def post (s : State) (x y : Acct) (n : Int) : State :=
  let s1 := s.setBal x (s.bal x - n)
  s1.setBal y (s1.bal y + n)

/-- One resolved operation. Capture and release check, at run time, that the hold exists, is open, and that
its escrow covers it. -/
def applyOp : Op → State → Except Err State
  | .deposit n a, s => .ok (post s .mint a n.val)
  | .move n x y, s => .ok (post s x y n.val)
  | .hold n x, s =>
    let s1 := post s x (.escrow s.nextHold) n.val
    .ok { s1.setHold s.nextHold ⟨x, n, .held⟩ with nextHold := s.nextHold + 1 }
  | .capture h y, s =>
    match s.hold? h with
    | none => .error (.unknownHold h)
    | some r =>
      if r.status = .held ∧ r.amount.val ≤ s.bal (.escrow h) then
        .ok ((post s (.escrow h) y r.amount.val).setHold h { r with status := .captured })
      else .error (.holdNotOpen h)
  | .release h, s =>
    match s.hold? h with
    | none => .error (.unknownHold h)
    | some r =>
      if r.status = .held ∧ r.amount.val ≤ s.bal (.escrow h) then
        .ok ((post s (.escrow h) r.owner r.amount.val).setHold h { r with status := .released })
      else .error (.holdNotOpen h)

def resolveAmount (env : Env) (s : State) (e : Expr) : Option Amount :=
  match evalInt env s e with
  | some k => if h : 0 < k then some ⟨k, h⟩ else none
  | none => none

/-- An operation's arguments, evaluated. `none` only on ill-typed input. -/
def resolve (env : Env) (s : State) : ResourceOp → Option Op
  | .deposit n a =>
    match resolveAmount env s n, evalAcct env s a with
    | some k, some a => some (.deposit k a)
    | _, _ => none
  | .move n x y =>
    match resolveAmount env s n, evalAcct env s x, evalAcct env s y with
    | some k, some x, some y => some (.move k x y)
    | _, _, _ => none
  | .hold n x =>
    match resolveAmount env s n, evalAcct env s x with
    | some k, some x => some (.hold k x)
    | _, _ => none
  | .capture h y =>
    match evalHold env s h, evalAcct env s y with
    | some h, some y => some (.capture h y)
    | _, _ => none
  | .release h =>
    match evalHold env s h with
    | some h => some (.release h)
    | none => none

def notifyIf (a : Acct) : List Effect :=
  match a with
  | .user _ => [.notify a]
  | _ => []

/-- The effects of an operation, read from the state before it. -/
def opEffects : Op → State → List Effect
  | .deposit _ a, _ => notifyIf a
  | .move _ _ y, _ => notifyIf y
  | .hold _ _, _ => []
  | .capture _ y, _ => notifyIf y
  | .release h, s =>
    match s.hold? h with
    | some r => notifyIf r.owner
    | none => []

def opOutput : Op → State → Output
  | .hold _ _, s => [s.nextHold]
  | _, _ => []

/-- The accounts an operation posts to, credited first: the order in which `overflow = bounded` checks
them. -/
def opTouched : Op → State → List Acct
  | .deposit _ a, _ => [a, .mint]
  | .move _ x y, _ => [y, x]
  | .hold _ x, s => [.escrow s.nextHold, x]
  | .capture h y, _ => [y, .escrow h]
  | .release h, s =>
    match s.hold? h with
    | some r => [r.owner, .escrow h]
    | none => [.escrow h]

/-- The first of `accts` whose balance in `s` is outside [-maxBal, maxBal]. -/
def firstOutOfRange (s : State) : List Acct → Option Acct
  | [] => none
  | a :: rest => if s.bal a < -maxBal ∨ maxBal < s.bal a then some a else firstOutOfRange s rest

/-- Step 2: decode the arguments by arity and type. `.ok none` is the zero no-op. -/
def bindArgs (pol : Policy) : List (String × Ty) → List Val → Except Err (Option Env)
  | [], [] => .ok (some [])
  | [], _ :: _ => .error (.badArgument "arity")
  | (p, _) :: _, [] => .error (.badArgument p)
  | (p, t) :: ps, v :: vs =>
    let rest : Except Err (Option Env) :=
      match bindArgs pol ps vs with
      | .ok (some env) => .ok (some ((p, v) :: env))
      | other => other
    match t, v with
    | .account, .acct _ => rest
    | .amount, .int k =>
      if 0 < k then rest
      else if k = 0 ∧ pol.zero = .noop then .ok none
      else .error (.badArgument p)
    | .hold, .hold _ => rest
    | .int, .int _ => rest
    | .bool, .bool _ => rest
    | _, _ => .error (.badArgument p)

/-- Step 3: the first account argument, in parameter order, that the state does not hold. -/
def firstMissing (s : State) : Env → Option Acct
  | [] => none
  | (_, .acct a) :: rest => if s.hasAcct a then firstMissing s rest else some a
  | _ :: rest => firstMissing s rest

/-- Step 4: whether the body moves from an account to itself. -/
def isSelf (env : Env) (s : State) : Stmt → Bool
  | .op (.move _ x y) =>
    match evalAcct env s x, evalAcct env s y with
    | some a, some b => a == b
    | _, _ => false
  | _ => false

def findCmd : Program → String → Option Cmd
  | [], _ => none
  | c :: rest, n => if c.name = n then some c else findCmd rest n

/-- Steps 6 to 8: run the statement. -/
def runStmt (pol : Policy) (env : Env) (s : State) : Stmt → Except Err (State × Output × List Effect)
  | .op r =>
    match resolve env s r with
    | none => .error .typeError
    | some op =>
      match applyOp op s with
      | .error e => .error e
      | .ok s' =>
        match pol.overflow, firstOutOfRange s' (opTouched op s) with
        | .bounded, some a => .error (.overflow a)
        | _, _ => .ok (s', opOutput op s, opEffects op s)
  | .set f x e =>
    if f = "frozen" then
      match evalAcct env s x, evalExpr env s e with
      | some a, some (.bool b) => .ok (s.setFrozen a b, [], [])
      | _, _ => .error .typeError
    else .error .typeError

/-- The reference evaluator under a policy. -/
def execWith (pol : Policy) (p : Program) (c : Call) (s : State) : Except Err (State × Output × List Effect) :=
  match findCmd p c.name with
  | none => .error (.unknownCommand c.name)
  | some cmd =>
    match bindArgs pol cmd.params c.args with
    | .error e => .error e
    | .ok none => .ok (s, [], [])
    | .ok (some env) =>
      match firstMissing s env with
      | some a => .error (.unknownAccount a)
      | none =>
        if pol.self = .reject ∧ isSelf env s cmd.body = true then .error .selfTransfer
        else
          match evalExpr env s cmd.guard with
          | some (.bool true) => runStmt pol env s cmd.body
          | some (.bool false) =>
            match pol.guard with
            | .error => .error (.guardFailed cmd.name)
            | .silent => .ok (s, [], [])
          | _ => .error .typeError

/-- The reference evaluator under the reference policy. -/
def exec (p : Program) (c : Call) (s : State) : Except Err (State × Output × List Effect) :=
  execWith Policy.reference p c s

end MiniPlinthRef

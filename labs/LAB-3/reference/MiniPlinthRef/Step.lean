import MiniPlinthRef.Eval
/-!
# MiniPlinthRef.Step: the small-step relation (read-only)

Reference module, earns nothing. A call runs through configurations: `bind` (decode the arguments, check the
accounts and the self-transfer rule), `guard` (evaluate the guard), `run` (the statement), and ends in `done`
or `err`, which are final. A configuration that is not final and has no step is stuck (PFPL section 5.1).
The guard is evaluated by `evalExpr` in one step, so a guard that is not a `bool` has no step: that is where an
ill-typed command gets stuck (SP-3.1's `balance(amount) >= amount`).

`Step pol c c'` is the relation under a policy. `DraftStep` is S3.L4's first draft: it has no rule for a false
guard, so a well-typed call whose guard fails is stuck (SP-3.4). The stretch stages LAB-3.12 and LAB-3.13 prove
progress and preservation for `Step` (challenge/Lab3Challenge/Stretch.lean).
-/
namespace MiniPlinthRef
open MiniPlinth

inductive Cfg where
  | bind (cmd : Cmd) (args : List Val) (s : State)
  | guard (cmd : Cmd) (env : Env) (s : State)
  | run (cmd : Cmd) (env : Env) (s : State)
  | done (s : State) (o : Output) (es : List Effect)
  | err (e : Err)

inductive Final : Cfg → Prop where
  | done (s : State) (o : Output) (es : List Effect) : Final (.done s o es)
  | err (e : Err) : Final (.err e)

inductive Step (pol : Policy) : Cfg → Cfg → Prop where
  | bind_err {cmd args s e} : bindArgs pol cmd.params args = .error e → Step pol (.bind cmd args s) (.err e)
  | bind_noop {cmd args s} : bindArgs pol cmd.params args = .ok none → Step pol (.bind cmd args s) (.done s [] [])
  | bind_missing {cmd args s env a} : bindArgs pol cmd.params args = .ok (some env) → firstMissing s env = some a →
      Step pol (.bind cmd args s) (.err (.unknownAccount a))
  | bind_self {cmd args s env} : bindArgs pol cmd.params args = .ok (some env) → firstMissing s env = none →
      pol.self = .reject → isSelf env s cmd.body = true → Step pol (.bind cmd args s) (.err .selfTransfer)
  | bind_ok {cmd args s env} : bindArgs pol cmd.params args = .ok (some env) → firstMissing s env = none →
      ¬ (pol.self = .reject ∧ isSelf env s cmd.body = true) → Step pol (.bind cmd args s) (.guard cmd env s)
  | guard_true {cmd env s} : evalExpr env s cmd.guard = some (.bool true) → Step pol (.guard cmd env s) (.run cmd env s)
  | guard_false_error {cmd env s} : evalExpr env s cmd.guard = some (.bool false) → pol.guard = .error →
      Step pol (.guard cmd env s) (.err (.guardFailed cmd.name))
  | guard_false_silent {cmd env s} : evalExpr env s cmd.guard = some (.bool false) → pol.guard = .silent →
      Step pol (.guard cmd env s) (.done s [] [])
  | run_ok {cmd env s s' o es} : runStmt pol env s cmd.body = .ok (s', o, es) → Step pol (.run cmd env s) (.done s' o es)
  | run_err {cmd env s e} : runStmt pol env s cmd.body = .error e → Step pol (.run cmd env s) (.err e)

/-- S3.L4's first draft: every rule of `Step` but the two for a false guard. -/
inductive DraftStep (pol : Policy) : Cfg → Cfg → Prop where
  | bind_err {cmd args s e} : bindArgs pol cmd.params args = .error e → DraftStep pol (.bind cmd args s) (.err e)
  | bind_noop {cmd args s} : bindArgs pol cmd.params args = .ok none → DraftStep pol (.bind cmd args s) (.done s [] [])
  | bind_missing {cmd args s env a} : bindArgs pol cmd.params args = .ok (some env) → firstMissing s env = some a →
      DraftStep pol (.bind cmd args s) (.err (.unknownAccount a))
  | bind_self {cmd args s env} : bindArgs pol cmd.params args = .ok (some env) → firstMissing s env = none →
      pol.self = .reject → isSelf env s cmd.body = true → DraftStep pol (.bind cmd args s) (.err .selfTransfer)
  | bind_ok {cmd args s env} : bindArgs pol cmd.params args = .ok (some env) → firstMissing s env = none →
      ¬ (pol.self = .reject ∧ isSelf env s cmd.body = true) → DraftStep pol (.bind cmd args s) (.guard cmd env s)
  | guard_true {cmd env s} : evalExpr env s cmd.guard = some (.bool true) → DraftStep pol (.guard cmd env s) (.run cmd env s)
  | run_ok {cmd env s s' o es} : runStmt pol env s cmd.body = .ok (s', o, es) → DraftStep pol (.run cmd env s) (.done s' o es)
  | run_err {cmd env s e} : runStmt pol env s cmd.body = .error e → DraftStep pol (.run cmd env s) (.err e)

/-- A value has a type; an amount is an integer (its sign is the boundary's business, not the type's). -/
inductive HasTy : Val → Ty → Prop where
  | acct (a : Acct) : HasTy (.acct a) .account
  | int (n : Int) : HasTy (.int n) .int
  | amount (n : Int) : HasTy (.int n) .amount
  | bool (b : Bool) : HasTy (.bool b) .bool
  | hold (h : HoldId) : HasTy (.hold h) .hold

/-- Every parameter the type context names has a value of its type in the environment. -/
def EnvOk (Γ : TyEnv) (env : Env) : Prop :=
  ∀ x t, Γ.get x = some t → ∃ v, env.get x = some v ∧ HasTy v t

/-- A typed configuration: a well-typed command, and, once the arguments are bound, an environment that
agrees with its parameters. Final configurations are typed. -/
def Typed : Cfg → Prop
  | .bind cmd _ _ => typecheck cmd = .ok ()
  | .guard cmd env _ => typecheck cmd = .ok () ∧ EnvOk cmd.params env
  | .run cmd env _ => typecheck cmd = .ok () ∧ EnvOk cmd.params env
  | .done _ _ _ => True
  | .err _ => True

end MiniPlinthRef

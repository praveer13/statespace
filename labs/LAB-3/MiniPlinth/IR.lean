import Lean.Data.Json
import MiniPlinth.Core
/-!
# MiniPlinth.IR: JSON for the core's values (read-only)

Reference module, earns nothing. IR@1 (`schemas/ir.schema.json` in the course repository) writes every sum
type as an object with a `tag`, and every integer that can be a balance or an amount as a decimal string,
because a JSON number loses precision above 2^53 and the goldens go to ±(2^63 - 1). `lake exe export-ir`
uses these encoders for the parts the template owns; you write the encoders for your syntax in
`Lab3/Export.lean` (LAB-3.7).
-/
namespace MiniPlinth.IR
open Lean (Json)
open MiniPlinth

def int (n : Int) : Json := Json.str (toString n)

def tagged (t : String) (fields : List (String × Json) := []) : Json :=
  Json.mkObj (("tag", Json.str t) :: fields)

def acct : Acct → Json
  | .mint => tagged "mint"
  | .sink => tagged "sink"
  | .user n => tagged "user" [("name", Json.str n)]
  | .escrow h => tagged "escrow" [("hold", Lean.toJson h)]

def ty : Ty → Json
  | .account => "account"
  | .amount => "amount"
  | .hold => "hold"
  | .int => "int"
  | .bool => "bool"

def val : Val → Json
  | .acct a => tagged "acct" [("acct", acct a)]
  | .int n => tagged "int" [("value", int n)]
  | .bool b => tagged "bool" [("value", Json.bool b)]
  | .hold h => tagged "hold" [("hold", Lean.toJson h)]

def expr : Expr → Json
  | .lit n => tagged "lit" [("value", int n)]
  | .var x => tagged "var" [("name", Json.str x)]
  | .balance e => tagged "balance" [("e", expr e)]
  | .frozen e => tagged "frozen" [("e", expr e)]
  | .add a b => tagged "add" [("a", expr a), ("b", expr b)]
  | .sub a b => tagged "sub" [("a", expr a), ("b", expr b)]
  | .ge a b => tagged "ge" [("a", expr a), ("b", expr b)]
  | .eq a b => tagged "eq" [("a", expr a), ("b", expr b)]
  | .and a b => tagged "and" [("a", expr a), ("b", expr b)]
  | .not a => tagged "not" [("a", expr a)]

def holdStatus : HoldStatus → Json
  | .held => "held"
  | .captured => "captured"
  | .released => "released"

def state (s : State) : Json :=
  Json.mkObj [
    ("bals", Json.arr (s.bals.map (fun (a, v) => Json.mkObj [("acct", acct a), ("bal", int v)])).toArray),
    ("holds", Json.arr (s.holds.map (fun (i, r) => Json.mkObj [("id", Lean.toJson i), ("owner", acct r.owner),
      ("amount", int r.amount.val), ("status", holdStatus r.status)])).toArray),
    ("nextHold", Lean.toJson s.nextHold),
    ("frozen", Json.arr (s.frozen.map acct).toArray)]

def call (c : Call) : Json :=
  Json.mkObj [("name", Json.str c.name), ("args", Json.arr (c.args.map val).toArray)]

def err : Err → Json
  | .unknownCommand c => tagged "unknownCommand" [("name", Json.str c)]
  | .badArgument p => tagged "badArgument" [("param", Json.str p)]
  | .unknownAccount a => tagged "unknownAccount" [("acct", acct a)]
  | .selfTransfer => tagged "selfTransfer"
  | .guardFailed c => tagged "guardFailed" [("name", Json.str c)]
  | .unknownHold h => tagged "unknownHold" [("hold", Lean.toJson h)]
  | .holdNotOpen h => tagged "holdNotOpen" [("hold", Lean.toJson h)]
  | .overflow a => tagged "overflow" [("acct", acct a)]
  | .typeError => tagged "typeError"
  | .outOfFuel => tagged "outOfFuel"

def effect : Effect → Json
  | .notify a => tagged "notify" [("acct", acct a)]

def outcome : Except Err (State × Output × List Effect) → Json
  | .ok (s, o, es) => Json.mkObj [("ok", Json.mkObj [("state", state s),
      ("output", Json.arr (o.map (fun h => Lean.toJson h)).toArray), ("effects", Json.arr (es.map effect).toArray)])]
  | .error e => Json.mkObj [("error", err e)]

def typeErr : TypeErr → String
  | .dupParam => "dupParam"
  | .unknownParam => "unknownParam"
  | .wrongType => "wrongType"
  | .nonPositive => "nonPositive"
  | .unguardedDebit => "unguardedDebit"
  | .assignsResource => "assignsResource"

def typeOutcome : Except TypeErr Unit → Json
  | .ok () => Json.mkObj [("ok", Json.bool true)]
  | .error e => Json.mkObj [("error", Json.str (typeErr e))]

def policy (p : Policy) : Json :=
  Json.mkObj [
    ("zero", match p.zero with | .reject => "reject" | .noop => "noop"),
    ("self", match p.self with | .allow => "allow" | .reject => "reject"),
    ("guard", match p.guard with | .error => "error" | .silent => "silent"),
    ("overflow", match p.overflow with
      | .unbounded => Json.mkObj [("mode", "unbounded")]
      | .bounded => Json.mkObj [("mode", "bounded"), ("maxBal", int maxBal)])]

/-- One evaluator golden, as IR@1 writes it: its outcome is the golden module's literal. -/
def golden (g : GoldenRec) : Json :=
  Json.mkObj [("pool", "eval"), ("id", Json.str g.id), ("theorem", Json.str g.thm), ("program", Json.str g.program),
    ("call", call g.call), ("pre", state g.pre), ("outcome", outcome g.outcome)]

end MiniPlinth.IR


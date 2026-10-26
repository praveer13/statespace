import MiniPlinth.IR
import Lab3.Eval
/-!
# Lab3.Export: your syntax as IR@1 (LAB-3.7)

`lake exe export-ir` prints your semantics as IR@1, the JSON that your Rust front end and interpreter read
(LAB-3.8 to LAB-3.10). The template encodes its own values (`MiniPlinth.IR`: accounts, values, expressions,
types, states, calls, outcomes, the policy); you encode your syntax. Every sum type is an object with a
`tag`, as `MiniPlinth.IR.tagged` writes it:

- an operation: `{"tag": "deposit", "amount": E, "to": E}`, `{"tag": "move", "amount": E, "from": E, "to": E}`,
  `{"tag": "hold", "amount": E, "on": E}`, `{"tag": "capture", "hold": E, "to": E}`, `{"tag": "release", "hold": E}`;
- a statement: `{"tag": "op", "op": R}` or `{"tag": "set", "field": "frozen", "target": E, "value": E}`;
- a command: `{"name": ..., "params": [{"name": ..., "ty": "account"}, ...], "guard": E, "body": S}`.

LAB-3.c7 compares your export of the reference program with the course's.
-/
namespace Lab3.Export
open Lean (Json)
open MiniPlinth MiniPlinth.IR Lab3

/-- A command as IR@1. -/
def cmd (_c : Cmd) : Json :=
  Json.null  -- TODO(you): with encoders for your operations and statements

end Lab3.Export

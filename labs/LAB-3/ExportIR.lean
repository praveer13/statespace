import Lab3.Export
import Lab3Gen.Goldens
/-!
# `lake exe export-ir`: your semantics as IR@1 (LAB-3.7)

Template, read-only. It prints one IR@1 document: the reference program as your syntax holds it, encoded by
your `Lab3.Export.cmd`; your policy; and the evaluator goldens, each right-hand side the literal of the golden
module (`Lab3Gen.Goldens`), never a fresh evaluation.
-/
open Lean (Json)
open MiniPlinth

def main : IO Unit := do
  let program := Json.mkObj [("id", "refProgram"),
    ("commands", Json.arr (Lab3Gen.refProgram.map Lab3.Export.cmd).toArray)]
  let doc := Json.mkObj [
    ("schema", "statespace/ir@1"),
    ("programs", Json.arr #[program]),
    ("policy", MiniPlinth.IR.policy Lab3.policy),
    ("goldens", Json.arr (Lab3Gen.goldenData.map MiniPlinth.IR.golden).toArray)]
  IO.println doc.compress

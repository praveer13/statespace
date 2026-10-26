import MiniPlinthRef
/-!
# LAB-3.1: one golden, on the reference

A golden is a theorem about one call: the reference evaluator, run on `refProgram` from the state `s0`, gives
exactly this outcome, and `decide` makes the kernel compute both sides. `s0` is mint -100 · a 100 · b 0, and
`transferCall` is `Transfer(a, b, 30)` (reference/MiniPlinthRef/Programs.lean).

Call it first: what does the call return? Write your prediction as the right-hand side, then run
`statespace check lab3.1`. The state after it is one of the states in Programs.lean, and the effects are a list
of `.notify` values.
-/
open MiniPlinth MiniPlinthRef

theorem golden_transfer_ok :
    exec refProgram transferCall s0 = .ok (s0, [], []) := by  -- TODO(you): your prediction of the outcome
  decide

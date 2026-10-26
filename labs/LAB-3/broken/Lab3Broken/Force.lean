import Lab3
import Lab3Challenge.ForceSyntax
/-!
# Lab3Broken.Force: your semantics with `force move` (LAB-3.6)

`XCmd` (challenge/Lab3Challenge/ForceSyntax.lean) is your command with one more statement, `force move n from
x to y`: a move that no rule asks to be covered. Extend your type checker so that it admits it, typed like a
move without R-cover, and your evaluator so that at run time it is a move. Then show, in `Cex.lean`, that
`step_preserves_inv` has no proof for this language. Keep this folder: nothing in `broken/` is deleted. Your
fixed semantics is `Lab3/`, which LAB-3.c6 checks again.
-/
namespace Lab3
open MiniPlinth

/-- Your type checker, extended to `XCmd`. -/
def xtypecheck (_c : XCmd) : Except TypeErr Unit :=
  .error .unguardedDebit  -- TODO(you)

/-- Your evaluator, extended to `XProgram`. -/
def xexec (_p : XProgram) (c : Call) (_s : State) : Except Err (State × Output × List Effect) :=
  .error (.unknownCommand c.name)  -- TODO(you)

end Lab3

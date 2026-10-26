import Lab3Challenge.ForceDefs
/-!
# Lab3Broken.Cex: the counterexample (LAB-3.6)

Both statements are pinned in `challenge/Lab3Challenge/ForceStatements.lean`. `cex_force` is the negation of
the step theorem for the extended language: prove it with a witness program, call and states, each fact
closed by `decide`, the kernel computing your `xexec`.
-/
namespace Lab3
open MiniPlinth

theorem force_typechecks : xtypecheck forcePay = .ok () := by
  sorry  -- TODO(you)

theorem cex_force :
    ¬ ∀ (p : XProgram) (c : Call) (s s' : State) (o : Output) (es : List Effect),
      p.WellTyped → Inv s → xexec p c s = .ok (s', o, es) → Inv s' := by
  sorry  -- TODO(you)

end Lab3

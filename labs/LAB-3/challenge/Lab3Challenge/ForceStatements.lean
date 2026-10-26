import Lab3Challenge.ForceDefs
/-!
# Lab3Challenge.ForceStatements: the pinned statements of LAB-3.6 (read-only)

Course text. `force_typechecks` is a typing golden: your extended checker admits `forcePay`.
`cex_force` is the negation of the step theorem for the extended language: no proof of
`step_preserves_inv` exists once it holds.
-/
namespace Lab3
open MiniPlinth

theorem force_typechecks : xtypecheck forcePay = .ok () := by
  sorry

theorem cex_force :
    ¬ ∀ (p : XProgram) (c : Call) (s s' : State) (o : Output) (es : List Effect),
      p.WellTyped → Inv s → xexec p c s = .ok (s', o, es) → Inv s' := by
  sorry

end Lab3

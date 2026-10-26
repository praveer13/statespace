import MiniPlinthRef.Step
/-!
# Lab3Stretch.Safety: progress and preservation (LAB-3.12, LAB-3.13, stretch)

The statements are pinned in `challenge/Lab3Challenge/Stretch.lean`; prove them here for the template's
small-step relation (reference/MiniPlinthRef/Step.lean). Progress needs one lemma the reference does not give
you: a well-typed guard, in an environment that agrees with its parameters, evaluates to a `bool`.
-/
namespace Lab3Stretch
open MiniPlinth MiniPlinthRef

theorem progress (pol : Policy) (c : Cfg) (h : Typed c) : Final c ∨ ∃ c', Step pol c c' := by
  sorry  -- TODO(you)

theorem preservation (pol : Policy) (c c' : Cfg) (h : Typed c) (hs : Step pol c c') : Typed c' := by
  sorry  -- TODO(you)

end Lab3Stretch

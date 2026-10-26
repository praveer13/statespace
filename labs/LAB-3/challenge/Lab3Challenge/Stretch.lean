import MiniPlinthRef.Step
/-!
# Lab3Challenge.Stretch: the pinned statements of LAB-3.12 and LAB-3.13 (read-only)

Course text. Progress and preservation for the template's small-step relation (reference/MiniPlinthRef/Step.lean),
under any policy. Prove them in `stretch/Lab3Stretch/Safety.lean`; `lake comparator` matches each against
the statement here. They mint CL-3.1 and CL-3.2.
-/
namespace Lab3Stretch
open MiniPlinth MiniPlinthRef

theorem progress (pol : Policy) (c : Cfg) (h : Typed c) : Final c ∨ ∃ c', Step pol c c' := by
  sorry

theorem preservation (pol : Policy) (c c' : Cfg) (h : Typed c) (hs : Step pol c c') : Typed c' := by
  sorry

end Lab3Stretch

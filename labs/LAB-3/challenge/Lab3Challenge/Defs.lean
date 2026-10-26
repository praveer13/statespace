import Lab3.Typing
/-!
# Lab3Challenge.Defs: the definitions the pinned statements add (read-only)

Course text. `WellTyped` is the course's, over your `typecheck`, so that a proof cannot make the step
theorem vacuous by redefining what a well-typed program is. Both the challenge and your proofs import it.
-/
namespace Lab3
open MiniPlinth

/-- Every command of the program type-checks. -/
def Program.WellTyped (p : Program) : Prop := ∀ c ∈ p, typecheck c = .ok ()

instance (p : Program) : Decidable p.WellTyped := inferInstanceAs (Decidable (∀ c ∈ p, typecheck c = .ok ()))

end Lab3

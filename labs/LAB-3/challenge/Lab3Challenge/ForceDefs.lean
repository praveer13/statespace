import Lab3Broken.Force
/-! # Lab3Challenge.ForceDefs: well-typed programs of the extended language (read-only). Course text. -/
namespace Lab3
open MiniPlinth

def XProgram.WellTyped (p : XProgram) : Prop := ∀ c ∈ p, xtypecheck c = .ok ()

instance (p : XProgram) : Decidable p.WellTyped := inferInstanceAs (Decidable (∀ c ∈ p, xtypecheck c = .ok ()))

end Lab3

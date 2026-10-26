import Solution.Adequacy
import Solution.Move
import Solution.Require
import Solution.Abort

/-!
# LAB-9.10 · the assembled theorem (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem seq_sim (c₁ c₂ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁) (h₂ : SimR c₂ p₂) :
    SimR (.seq c₁ c₂) (p₁ ++ p₂) := by
  sorry

theorem compile_correct (c : Cmd) (p : List Instr) : compile c = some p → SimR c p := by
  sorry

theorem compile_complete (c : Cmd) : InFragment c → ∃ p, compile c = some p := by
  sorry

theorem preservation (c : Cmd) (p : List Instr) : compile c = some p →
    ∀ (s : Store) (regs : Regs), obs s (runT p regs s) = obs s (runS c s) := by
  sorry

end S9

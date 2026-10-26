import Solution.Expr

/-!
# LAB-9.8 · the sequence case (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem exec_append (p k : List Instr) (regs : Regs) (st : Store) :
    exec (p ++ k) regs st = (exec p regs st).bind (fun rs => exec k rs.1 rs.2) := by
  sorry

theorem seq_commit (c₁ c₂ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁) (h₂ : SimR c₂ p₂)
    (s s₁ : Store) (regs : Regs) (st : Store) (hR : R s regs st) (hc : runS c₁ s = .committed s₁) :
    Follows (runS c₂ s₁) (exec (p₁ ++ p₂) regs st) := by
  sorry

end S9

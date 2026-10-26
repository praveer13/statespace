import Course.Sim

/-!
# LAB-9.5 · the expression lemma (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem compE_correct (e : Expr) (r : Nat) (regs : Regs) (st : Store) :
    ∃ regs', exec (compE e r) regs st = .ok (regs', st) ∧ regs' r = evalE st e ∧
      ∀ q, q < r → regs' q = regs q := by
  sorry

end S9

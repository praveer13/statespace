import Solution.Expr

/-!
# LAB-9.7 · the guard case (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem require_sim (e₁ e₂ : Expr) (err : Err) (p : List Instr) :
    compile (.require e₁ e₂ err) = some p → SimR (.require e₁ e₂ err) p := by
  sorry

end S9

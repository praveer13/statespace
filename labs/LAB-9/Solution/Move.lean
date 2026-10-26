import Solution.Expr

/-!
# LAB-9.6 · the posting case (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem move_sim (amt : Expr) (src dst : Acct) (p : List Instr) :
    compile (.move amt src dst) = some p → SimR (.move amt src dst) p := by
  sorry

end S9

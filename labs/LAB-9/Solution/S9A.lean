import Course.Stack

/-!
# LAB-9.2 · stack-machine correctness (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9A

theorem exec_append (s : Store) (p q : List Instr) (stk : List Int) :
    exec s (p ++ q) stk = exec s q (exec s p stk) := by
  sorry

theorem exec_comp (s : Store) (e : AExp) (stk : List Int) :
    exec s (comp e) stk = aval e s :: stk := by
  sorry

end S9A

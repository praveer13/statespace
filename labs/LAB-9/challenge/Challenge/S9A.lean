import Course.Stack

/-!
# Pack S9A · LAB-9.2 (read-only)

The stack machine's correctness, as HOL-IMP states it, with the stack explicit. Prove both in
`Solution/S9A.lean`, against exactly these statements.
-/

namespace S9A

theorem exec_append (s : Store) (p q : List Instr) (stk : List Int) :
    exec s (p ++ q) stk = exec s q (exec s p stk) := by
  sorry

theorem exec_comp (s : Store) (e : AExp) (stk : List Int) :
    exec s (comp e) stk = aval e s :: stk := by
  sorry

end S9A

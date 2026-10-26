import Course.Stack

/-!
# The stack machine's proof without `generalizing stk` (CL-9.1's if-weakened witness)

TODO(you): paste your proof of `exec_comp` from `Solution/S9A.lean` here with `generalizing stk` removed
(the Prove-it mutation of LAB-9.2), and keep it: `claims/cl-9-1.yaml` names this file, and
`statespace check lab9.12` replays it, expecting Lean to reject the plus case.
-/

namespace S9A.Narrow

theorem exec_comp_narrow (s : Store) (e : AExp) (stk : List Int) :
    exec s (comp e) stk = aval e s :: stk := by
  sorry

end S9A.Narrow

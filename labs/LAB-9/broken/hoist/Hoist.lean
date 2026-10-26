import Course.Run

/-!
# LAB-9.12 · the bad optimization, kept (SP-9.1)

Nothing in `broken/` is ever deleted: this file keeps the hoisted compile beside the fix in `fixed/hoist.md`.

TODO(you): copy your `compile` from `S9/Defs.lean` as `compileHoist`, and hoist the debit block (read the
source balance, subtract the amount, write it back) above the funds guard's read and assert, as S9.L7 did.
Then state and prove two goldens by `decide`, with the source committing and the hoisted code aborting:
`sp91_minimal` at the minimal witness, and `sp91_nonminimal` at another member of the class
`amt ≤ bal < 2·amt`. `statespace check lab9.12` adds its own probes of `compileHoist` at both.
-/

namespace S9.Hoist

def compileHoist (c : Cmd) : Option (List Instr) := compile c

theorem sp91_minimal : True := by
  sorry

theorem sp91_nonminimal : True := by
  sorry

end S9.Hoist

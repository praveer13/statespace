import Solution

/-
LAB-2.6, the specimen, broken side: `xferBuggy` reads the destination's balance from the state before the debit.

TODO(you): state `selftransfer_mints`, a closed claim that a self-transfer of 5 on account 0, from a balance of
10 on every account, leaves account 0 at 15 under `xferBuggy`, and close it by `decide`. `decide` checks this
one instance, not a general theorem. Keep this file once it builds: nothing in broken/ is ever deleted.
-/

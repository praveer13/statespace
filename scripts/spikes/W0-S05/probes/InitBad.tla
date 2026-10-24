---- MODULE InitBad ----
\* Format probe for W0-S05. Not course material.
\* The initial state already violates the invariant, so the counterexample has one state and no steps.
EXTENDS Naturals
VARIABLE x
Init == x = 5
Next == x' = x
Small == x < 3
====

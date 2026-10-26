--------------------------- MODULE HoldsLifecycle ---------------------------
(* LAB-5.3: the one-hold lifecycle. A hold is placed, then either captured or
   released, and never both. res is a history variable: it counts resolutions,
   so "never resolves twice" becomes a property of a single state.

   TODO(you): write Capture and Release. Each one resolves a held hold and
   counts the resolution in res. Then state TypeOK for your variables.

   statespace check lab5.3 builds the spec as Init /\ [][Next]_vars and checks
   TypeOK and NeverTwice (pinned in claims/s5-props.tla) over the whole
   reachable state space, with the deadlock check off, since a resolved hold
   has no next step. To rule out a vacuous pass, it also checks that a captured
   hold and a released hold are each reachable. *)
EXTENDS Naturals
VARIABLES hst, res
vars == <<hst, res>>

TypeOK == TRUE

Init == hst = "available" /\ res = 0

Place   == hst = "available" /\ hst' = "held" /\ UNCHANGED res
Capture == FALSE
Release == FALSE

Next == Place \/ Capture \/ Release
Spec == Init /\ [][Next]_vars
=============================================================================

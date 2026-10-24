---------------------------- MODULE ProbeInitInv ----------------------------
(* W0-S04 probe: the initial state violates the invariant and its only
   successor satisfies it. TLC reports the violation in the initial state;
   a checker that tests successor states only would report no error. *)
EXTENDS Naturals
VARIABLE x
Init == x = 1
Next == x' = 0
Inv == x = 0
=============================================================================

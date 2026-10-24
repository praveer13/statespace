---------------------------- MODULE ProbeDeadlock ----------------------------
(* W0-S04 probe: the third state has no successor. With TLC's deadlock
   check on, TLC reports "Deadlock reached"; the invariant always holds. *)
EXTENDS Naturals
VARIABLE x
Init == x = 0
Next == x < 2 /\ x' = x + 1
Inv == x <= 2
=============================================================================

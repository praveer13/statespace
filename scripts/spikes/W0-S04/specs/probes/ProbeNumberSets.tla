-------------------------- MODULE ProbeNumberSets --------------------------
(* W0-S04 probe: membership in the infinite sets Nat, Int and STRING, the
   usual way a TypeOK is written. One invariant per configuration. *)
EXTENDS Integers
VARIABLES x, s
Init == x = 0 /\ s = "a"
Next == x' = 1 - x /\ UNCHANGED s
InNat == x \in Nat
InInt == x \in Int
InString == s \in STRING
=============================================================================

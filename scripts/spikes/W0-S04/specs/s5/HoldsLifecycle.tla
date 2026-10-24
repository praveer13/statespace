--------------------------- MODULE HoldsLifecycle ---------------------------
(* W0-S04 spike representative of curriculum S05 M5 without the environment
   (LAB-5.3, S5.L4): Available -> Held -> Captured or Released.
   res is a history variable that counts resolutions. *)
EXTENDS Naturals
VARIABLES hst, res
vars == <<hst, res>>

TypeOK == /\ hst \in {"available", "held", "captured", "released"}
          /\ res \in 0..2

Init == hst = "available" /\ res = 0

Place   == hst = "available" /\ hst' = "held"     /\ UNCHANGED res
Capture == hst = "held"      /\ hst' = "captured" /\ res' = res + 1
Release == hst = "held"      /\ hst' = "released" /\ res' = res + 1

Next == Place \/ Capture \/ Release
Spec == Init /\ [][Next]_vars

NeverTwice == res <= 1
\* An action property ("a resolved hold stays resolved"), checked by TLC only.
StaysResolved == [][(hst \in {"captured", "released"}) => hst' = hst]_hst
=============================================================================

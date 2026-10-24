-------------------------- MODULE ProbeActionParse --------------------------
(* W0-S04 probe: S5.L4's action property exactly as the curriculum writes it,
   without parentheses around the implication inside [ ]_hst. *)
EXTENDS Naturals
VARIABLES hst, res
vars == <<hst, res>>
Init == hst = "available" /\ res = 0
Next == /\ hst = "available"
        /\ hst' = "held"
        /\ UNCHANGED res
Spec == Init /\ [][Next]_vars
StaysResolved == [][hst \in {"captured", "released"} => hst' = hst]_hst
=============================================================================

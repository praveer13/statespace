------------------------------ MODULE HoldLive ------------------------------
(* W0-S04 spike representative of curriculum S05's HoldLive.tla (LAB-5.5),
   the M4 family's liveness model, in the S5.L7 worked example's fixed form:
   Timeout widened to held or pending, with weak fairness on Timeout only. *)
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\ tries = 0
Try     == st = "held"    /\ st' = "pending"  /\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\ st' = "held"     /\ UNCHANGED tries
Capture == st = "pending" /\ st' = "captured" /\ UNCHANGED tries
Timeout == st \in {"held", "pending"} /\ st' = "released" /\ UNCHANGED tries
Next == Try \/ Busy \/ Capture \/ Timeout
Fair == WF_vars(Timeout)
Spec == Init /\ [][Next]_vars /\ Fair
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
=============================================================================

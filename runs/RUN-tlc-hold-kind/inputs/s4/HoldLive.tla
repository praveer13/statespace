---- MODULE HoldLive ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\ tries = 0
Try     == st = "held"    /\ st' = "pending"  /\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\ st' = "held"     /\ UNCHANGED tries
Capture == st = "pending" /\ st' = "captured" /\ UNCHANGED tries
Timeout == st \in {"held", "pending"} /\ st' = "released" /\ UNCHANGED tries
Done    == st \in {"captured", "released"} /\ UNCHANGED vars
Next == Try \/ Capture \/ Timeout \/ Done
Fair == WF_vars(Timeout)
Spec == Init /\ [][Next]_vars /\ Fair
TypeOK == st \in {"held", "pending", "captured", "released"} /\ tries \in {0, 1}
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

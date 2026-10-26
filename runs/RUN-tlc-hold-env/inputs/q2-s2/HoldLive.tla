---- MODULE HoldLive ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\ tries = 0
Try     == st = "held"    /\ st' = "pending"  /\ tries' = (tries + 1) % 2
Busy    == FALSE
Capture == FALSE
Timeout == st \in {"held", "pending"} /\ st' = "released" /\ UNCHANGED tries
Next == Try \/ Busy \/ Capture \/ Timeout
Fair == WF_vars(Try) /\ SF_vars(Capture)
Spec == Init /\ [][Next]_vars /\ Fair
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

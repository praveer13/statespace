---- MODULE HoldBudget ----
EXTENDS Naturals
VARIABLES st, busy
vars == <<st, busy>>
Init == st = "held" /\ busy = 0
Try     == st = "held"    /\ st' = "pending"  /\ UNCHANGED busy
Busy    == FALSE
Capture == st = "pending" /\ st' = "captured" /\ UNCHANGED busy
Timeout == st \in {"held", "pending"} /\ st' = "released" /\ UNCHANGED busy
Next == Try \/ Busy \/ Capture \/ Timeout
Fair == WF_vars(Timeout)
Spec == Init /\ [][Next]_vars /\ Fair
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

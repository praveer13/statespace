---- MODULE HoldBudget ----
EXTENDS Naturals
VARIABLES st, busy
vars == <<st, busy>>
Init == st = "held" /\ busy = 0
Try     == st = "held"    /\ st' = "pending"  /\ UNCHANGED busy
Busy    == st = "pending" /\ busy < 2 /\ st' = "held" /\ busy' = busy + 1
Capture == FALSE
Timeout == st \in {"held", "pending"} /\ st' = "released" /\ UNCHANGED busy
Next == Try \/ Busy \/ Capture \/ Timeout
Fair == WF_vars(Timeout)
Spec == Init /\ [][Next]_vars /\ Fair
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

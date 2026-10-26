---- MODULE Hold ----
\* A hold that a worker keeps retrying to capture; the provider may keep answering "busy".
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\ tries = 0
Try     == st = "held"    /\ st' = "pending"  /\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\ st' = "held"     /\ UNCHANGED tries
Capture == st = "pending" /\ st' = "captured" /\ UNCHANGED tries
Timeout == st = "held"    /\ st' = "released" /\ UNCHANGED tries
Next == Try \/ Busy \/ Capture \/ Timeout
Spec == Init /\ [][Next]_vars          \* no fairness conjunct
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

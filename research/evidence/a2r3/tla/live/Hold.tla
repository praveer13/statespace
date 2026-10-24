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
Fair == WF_vars(Try) /\ WF_vars(Busy)        \* scheduler is fair to Try/Busy only
Spec == Init /\ [][Next]_vars /\ Fair
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
NeverTwice == [](Resolved => [](Resolved))
====

---- MODULE Hold ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\ tries = 0
Try     == st = "held"    /\ st' = "pending"  /\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\ st' = "held"     /\ UNCHANGED tries
Capture == st = "pending" /\ st' = "captured" /\ UNCHANGED tries
Timeout == st = "held"    /\ st' = "released" /\ UNCHANGED tries
Next == Try \/ Busy \/ Capture \/ Timeout

\* Start with the first Fair, then swap in one of the others.
\* Fair == WF_vars(Try) /\ WF_vars(Busy)
\* Fair == WF_vars(Try) /\ WF_vars(Busy) /\ WF_vars(Capture)
\* Fair == WF_vars(Try) /\ WF_vars(Busy) /\ SF_vars(Capture)
Fair == WF_vars(Try) /\ SF_vars(Timeout)

Spec == Init /\ [][Next]_vars /\ Fair
Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

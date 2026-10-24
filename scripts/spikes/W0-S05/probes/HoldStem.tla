---- MODULE HoldStem ----
\* Format probe for W0-S05. Not course material.
\* The Hold spec with a stem: the hold is opened before the Try/Busy cycle, so a lasso
\* closes on a state after state 1. Open is parameterized, to see how a parameterized
\* action appears in a lasso. Tickets = {0} gives one violating lasso; {0, 1} gives two
\* equally valid ones, to see whether TLC reports the same one each time.
EXTENDS Naturals
CONSTANT Tickets
VARIABLES st, tries
vars == <<st, tries>>

Init == st = "idle" /\ tries = 0
Open(t) == st = "idle" /\ st' = "held" /\ tries' = t
Try     == st = "held"    /\ st' = "pending"  /\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\ st' = "held"     /\ UNCHANGED tries
Capture == st = "pending" /\ st' = "captured" /\ UNCHANGED tries
Timeout == st = "held"    /\ st' = "released" /\ UNCHANGED tries

OpenAny == \E t \in Tickets : Open(t)
Next == OpenAny \/ Try \/ Busy \/ Capture \/ Timeout

\* Stem, then the Try/Busy cycle: fairness on Open, Try and Busy.
SpecCycle == Init /\ [][Next]_vars /\ WF_vars(OpenAny) /\ WF_vars(Try) /\ WF_vars(Busy)

\* Stem, then a stutter: Busy is removed, so after Try the hold waits in "pending" forever.
NextNoBusy == OpenAny \/ Try \/ Capture \/ Timeout
SpecStutter == Init /\ [][NextNoBusy]_vars /\ WF_vars(OpenAny) /\ WF_vars(Try)

Resolved == st \in {"captured", "released"}
EventuallyResolves == <>Resolved
====

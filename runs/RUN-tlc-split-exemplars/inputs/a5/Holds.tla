---- MODULE Holds ----
EXTENDS Naturals
CONSTANTS Bal, Amt, Workers
VARIABLES held, pc
vars == <<held, pc>>
Initial == held = 0 /\ pc = [w \in Workers |-> "check"]
PlaceHold(w) == /\ pc[w] = "check" /\ pc' = [pc EXCEPT ![w] = "done"]
                /\ IF Bal - held >= Amt THEN held' = held + Amt ELSE UNCHANGED held
Idle == (\A w \in Workers : pc[w] = "done") /\ UNCHANGED vars
Next == (\E w \in Workers : PlaceHold(w)) \/ Idle
Spec == Initial /\ [][Next]_vars
NoOverHold == held <= Bal
====

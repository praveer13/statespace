---- MODULE Holds ----
EXTENDS Naturals
CONSTANTS Bal, Amt, Workers
VARIABLES held, pc
vars == <<held, pc>>
Initial == held = 0 /\ pc = [w \in Workers |-> "check"]
Check(w) == /\ pc[w] = "check"
            /\ pc' = [pc EXCEPT ![w] = IF Bal - held >= Amt THEN "place" ELSE "done"]
            /\ UNCHANGED held
Place(w) == /\ pc[w] = "place" /\ pc' = [pc EXCEPT ![w] = "done"]
            /\ held' = held + Amt
Idle == (\A w \in Workers : pc[w] = "done") /\ UNCHANGED vars
Next == (\E w \in Workers : Check(w) \/ Place(w)) \/ Idle
Spec == Initial /\ [][Next]_vars
NoOverHold == held <= Bal
====

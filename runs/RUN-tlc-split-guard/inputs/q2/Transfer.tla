---- MODULE Transfer ----
EXTENDS Naturals
CONSTANTS Init, Amt, Workers
VARIABLES bal, spent, pc, seen
vars == <<bal, spent, pc, seen>>
Initial == /\ bal = Init /\ spent = 0
           /\ pc = [w \in Workers |-> "read"] /\ seen = [w \in Workers |-> 0]
Read(w)  == /\ pc[w] = "read" /\ seen' = [seen EXCEPT ![w] = bal]
            /\ pc' = [pc EXCEPT ![w] = IF bal >= Amt THEN "write" ELSE "done"]
            /\ UNCHANGED <<bal, spent>>
Write(w) == /\ pc[w] = "write" /\ pc' = [pc EXCEPT ![w] = "done"] /\ UNCHANGED seen
            /\ bal' = seen[w] - Amt /\ spent' = spent + Amt
Idle == (\A w \in Workers : pc[w] = "done") /\ UNCHANGED vars
Next == (\E w \in Workers : Read(w) \/ Write(w)) \/ Idle
Spec == Initial /\ [][Next]_vars
NoOverspend == spent <= Init
====

---- MODULE Withdraw ----
EXTENDS Naturals
CONSTANTS Init, Amount, Workers
VARIABLES bal, pc, seen, spent
vars == <<bal, pc, seen, spent>>
Init_ == /\ bal = Init /\ spent = 0
         /\ pc = [w \in Workers |-> "read"] /\ seen = [w \in Workers |-> 0]
Read(w)  == /\ pc[w] = "read" /\ seen' = [seen EXCEPT ![w] = bal]
            /\ pc' = [pc EXCEPT ![w] = IF bal >= Amount THEN "write" ELSE "wait"]
            /\ UNCHANGED <<bal, spent>>
Write(w) == /\ pc[w] = "write" /\ bal' = seen[w] - Amount /\ spent' = spent + Amount
            /\ pc' = [pc EXCEPT ![w] = "done"] /\ UNCHANGED seen
Idle == (\A w \in Workers : pc[w] = "done") /\ UNCHANGED vars
Next == (\E w \in Workers : Read(w) \/ Write(w)) \/ Idle
Spec == Init_ /\ [][Next]_vars
NoOverspend == spent <= Init
====

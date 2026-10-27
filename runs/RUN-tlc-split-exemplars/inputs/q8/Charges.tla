---- MODULE Charges ----
EXTENDS Naturals
CONSTANTS Workers
VARIABLES used, charges, pc
vars == <<used, charges, pc>>
Initial == used = FALSE /\ charges = 0 /\ pc = [w \in Workers |-> "check"]
Check(w)  == /\ pc[w] = "check"
             /\ pc' = [pc EXCEPT ![w] = IF used THEN "done" ELSE "charge"]
             /\ UNCHANGED <<used, charges>>
Charge(w) == /\ pc[w] = "charge" /\ pc' = [pc EXCEPT ![w] = "done"]
             /\ used' = TRUE /\ charges' = charges + 1
Idle == (\A w \in Workers : pc[w] = "done") /\ UNCHANGED vars
Next == (\E w \in Workers : Check(w) \/ Charge(w)) \/ Idle
Spec == Initial /\ [][Next]_vars
AtMostOnce == charges <= 1
====

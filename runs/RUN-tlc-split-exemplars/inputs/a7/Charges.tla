---- MODULE Charges ----
EXTENDS Naturals
CONSTANTS Workers
VARIABLES used, charges, pc
vars == <<used, charges, pc>>
Initial == used = FALSE /\ charges = 0 /\ pc = [w \in Workers |-> "check"]
ChargeOnce(w) == /\ pc[w] = "check" /\ pc' = [pc EXCEPT ![w] = "done"]
                 /\ IF used THEN UNCHANGED <<used, charges>> ELSE used' = TRUE /\ charges' = charges + 1
Idle == (\A w \in Workers : pc[w] = "done") /\ UNCHANGED vars
Next == (\E w \in Workers : ChargeOnce(w)) \/ Idle
Spec == Initial /\ [][Next]_vars
AtMostOnce == charges <= 1
====

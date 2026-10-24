---- MODULE RTW3 ----
EXTENDS Naturals
CONSTANTS Workers, Amt, Init
VARIABLES bal, spent, pc, seen
vars == <<bal, spent, pc, seen>>
TypeOK == /\ bal \in Nat /\ spent \in Nat
          /\ pc \in [Workers -> {"read","check","write","done"}]
Initial == /\ bal = Init /\ spent = 0
           /\ pc = [w \in Workers |-> "read"] /\ seen = [w \in Workers |-> 0]
Read(w)  == /\ pc[w] = "read" /\ seen' = [seen EXCEPT ![w] = bal]
            /\ pc' = [pc EXCEPT ![w] = "check"] /\ UNCHANGED <<bal, spent>>
Check(w) == /\ pc[w] = "check"
            /\ pc' = [pc EXCEPT ![w] = IF seen[w] >= Amt THEN "write" ELSE "done"]
            /\ UNCHANGED <<bal, spent, seen>>
Write(w) == /\ pc[w] = "write" /\ bal' = seen[w] - Amt /\ spent' = spent + Amt
            /\ pc' = [pc EXCEPT ![w] = "done"] /\ UNCHANGED seen
Next == \E w \in Workers : Read(w) \/ Check(w) \/ Write(w)
Spec == Initial /\ [][Next]_vars
NoOverspend == spent <= Init
====

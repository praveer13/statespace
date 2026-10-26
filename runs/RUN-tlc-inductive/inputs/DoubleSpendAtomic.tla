---- MODULE DoubleSpendAtomic ----
EXTENDS Naturals
CONSTANTS Init, Amount, Workers
VARIABLES bal, pc, spent
vars == <<bal, pc, spent>>

Init_ == /\ bal = Init
         /\ pc = [w \in Workers |-> "go"]
         /\ spent = 0

Spend(w) == /\ pc[w] = "go"
            /\ IF bal >= Amount
                 THEN bal' = bal - Amount /\ spent' = spent + Amount
                 ELSE UNCHANGED <<bal, spent>>
            /\ pc' = [pc EXCEPT ![w] = "done"]

Next == \E w \in Workers : Spend(w)
Spec == Init_ /\ [][Next]_vars
NoOverspend == spent <= Init
====
\* CONSTANTS Init = 100, Amount = 80, Workers = {w1, w2}
\* INIT Init_, NEXT Next, INVARIANT NoOverspend

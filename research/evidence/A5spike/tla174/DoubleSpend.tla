---------------------------- MODULE DoubleSpend ----------------------------
(* Two workers each try to spend Amount from one account holding Init.
   Each worker reads the balance, checks the guard against what it read,
   then writes read - Amount. Read and write are separate steps. *)
EXTENDS Naturals
CONSTANTS Init, Amount, Workers
VARIABLES bal, pc, seen, spent

vars == <<bal, pc, seen, spent>>

Init_ == /\ bal = Init
         /\ pc = [w \in Workers |-> "read"]
         /\ seen = [w \in Workers |-> 0]
         /\ spent = 0

Read(w) == /\ pc[w] = "read"
           /\ seen' = [seen EXCEPT ![w] = bal]
           /\ pc' = [pc EXCEPT ![w] = IF bal >= Amount THEN "write" ELSE "done"]
           /\ UNCHANGED <<bal, spent>>

Write(w) == /\ pc[w] = "write"
            /\ bal' = seen[w] - Amount
            /\ spent' = spent + Amount
            /\ pc' = [pc EXCEPT ![w] = "done"]
            /\ UNCHANGED seen

Next == \E w \in Workers : Read(w) \/ Write(w)
Spec == Init_ /\ [][Next]_vars

NoOverspend == spent <= Init
=============================================================================

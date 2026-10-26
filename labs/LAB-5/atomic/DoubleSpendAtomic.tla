-------------------------- MODULE DoubleSpendAtomic --------------------------
(* LAB-5.2: make the critical step atomic.

   This file starts as a copy of the provided DoubleSpend: each worker reads the
   balance in one step and writes it in another, so two workers can both pass
   the guard on a balance that is already spent.

   TODO(you): merge the guard and the write into one action, so that no other
   worker can step between the test of the balance and the write.

   statespace check lab5.2 checks this module with the course's constants
   (Init = 100, Amount = 80, Workers = {w1, w2}) and the statements pinned in
   claims/s5-props.tla: NoOverspend must hold over the whole reachable state
   space, and NoSpend must be violated, which shows a spend is reachable. It
   builds the spec as Init_ /\ [][Next]_vars, so keep those three names and the
   variable spent. *)
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
=============================================================================

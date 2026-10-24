---- MODULE Sym ----
EXTENDS Naturals, TLC
CONSTANTS Workers
VARIABLES pc
Init == pc = [w \in Workers |-> "idle"]
Go(w) == pc[w] = "idle" /\ pc' = [pc EXCEPT ![w] = "done"]
Next == \E w \in Workers : Go(w)
Spec == Init /\ [][Next]_pc /\ \A w \in Workers : WF_pc(Go(w))
AllDone == <>(\A w \in Workers : pc[w] = "done")
Perms == Permutations(Workers)
====

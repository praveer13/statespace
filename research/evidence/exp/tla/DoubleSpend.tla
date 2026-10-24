---- MODULE DoubleSpend ----
EXTENDS Naturals, FiniteSets
CONSTANTS Procs, Amount
VARIABLES bal, pc, seen
vars == <<bal, pc, seen>>
Init == bal = 10 /\ pc = [p \in Procs |-> "read"] /\ seen = [p \in Procs |-> 0]
Read(p)  == pc[p] = "read" /\ seen' = [seen EXCEPT ![p] = bal] /\ pc' = [pc EXCEPT ![p] = "write"] /\ UNCHANGED bal
Write(p) == pc[p] = "write" /\ seen[p] >= Amount /\ bal' = seen[p] - Amount /\ pc' = [pc EXCEPT ![p] = "done"] /\ UNCHANGED seen
Next == \E p \in Procs : Read(p) \/ Write(p)
Spec == Init /\ [][Next]_vars
\* Conservation-style safety: total withdrawn equals what left the balance
Withdrawn == Amount * Cardinality({p \in Procs : pc[p] = "done"})
NoDoubleSpend == bal + Withdrawn = 10

====

---- MODULE Inc ----
EXTENDS Naturals
CONSTANTS N, M
VARIABLES x, pc, tmp, k
Procs == 1..N
Init == x = 0 /\ pc = [p \in Procs |-> "r"] /\ tmp = [p \in Procs |-> 0] /\ k = [p \in Procs |-> 0]
R(p) == pc[p] = "r" /\ k[p] < M /\ tmp' = [tmp EXCEPT ![p] = x] /\ pc' = [pc EXCEPT ![p] = "w"] /\ UNCHANGED <<x, k>>
W(p) == pc[p] = "w" /\ x' = tmp[p] + 1 /\ pc' = [pc EXCEPT ![p] = "r"] /\ k' = [k EXCEPT ![p] = @ + 1] /\ UNCHANGED tmp
Next == \E p \in Procs : R(p) \/ W(p)
TypeOK == x \in 0..(N*M)
====

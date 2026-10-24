------------------------------ MODULE GiftCard ------------------------------
(* W0-S04 spike representative of curriculum S05 M6 (SP-5.7): one staged
   transfer of Amt from card Src to card Dst, confirmed twice. Each
   confirmation checks the source, then debits it from the value it read,
   while the credit is an atomic increment. *)
EXTENDS Naturals, FiniteSets
CONSTANTS Cards, Src, Dst, Amt, Start, Confirms
VARIABLES bal, seen, pc
vars == <<bal, seen, pc>>

RECURSIVE SumOver(_, _)
SumOver(f, S) == IF S = {} THEN 0
                 ELSE LET x == CHOOSE y \in S : TRUE
                      IN f[x] + SumOver(f, S \ {x})

Total == Start * Cardinality(Cards)

Init == /\ bal = [c \in Cards |-> Start]
        /\ seen = [i \in Confirms |-> 0]
        /\ pc = [i \in Confirms |-> "check"]

Check(i) == /\ pc[i] = "check"
            /\ seen' = [seen EXCEPT ![i] = bal[Src]]
            /\ pc' = [pc EXCEPT ![i] = IF bal[Src] >= Amt THEN "debit" ELSE "done"]
            /\ UNCHANGED bal

Debit(i) == /\ pc[i] = "debit"
            /\ bal' = [bal EXCEPT ![Src] = seen[i] - Amt, ![Dst] = @ + Amt]
            /\ pc' = [pc EXCEPT ![i] = "done"]
            /\ UNCHANGED seen

Next == \/ \E i \in Confirms : Check(i)
        \/ \E i \in Confirms : Debit(i)

Spec == Init /\ [][Next]_vars

Conserve == SumOver(bal, Cards) = Total
=============================================================================

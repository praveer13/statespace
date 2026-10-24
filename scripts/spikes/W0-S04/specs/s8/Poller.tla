------------------------------- MODULE Poller -------------------------------
(* W0-S04 spike representative of curriculum S08.L3's high-water-mark poller
   (SP-8.2): writers take sequence ids at INSERT and commit in either order;
   Design "mark" delivers committed rows above the mark and raises the mark to
   the highest id read; Design "status" delivers every committed row not yet
   delivered. *)
EXTENDS Naturals, FiniteSets
CONSTANTS Writers, Design
VARIABLES nextId, idOf, wpc, committedIds, delivered, mark
vars == <<nextId, idOf, wpc, committedIds, delivered, mark>>

Max(S) == CHOOSE x \in S : \A y \in S : y <= x

Init == /\ nextId = 1
        /\ idOf = [w \in Writers |-> 0]
        /\ wpc = [w \in Writers |-> "idle"]
        /\ committedIds = {}
        /\ delivered = {}
        /\ mark = 0

Insert(w) == /\ wpc[w] = "idle"
             /\ idOf' = [idOf EXCEPT ![w] = nextId]
             /\ nextId' = nextId + 1
             /\ wpc' = [wpc EXCEPT ![w] = "inserted"]
             /\ UNCHANGED <<committedIds, delivered, mark>>

CommitRow(w) == /\ wpc[w] = "inserted"
                /\ committedIds' = committedIds \cup {idOf[w]}
                /\ wpc' = [wpc EXCEPT ![w] = "committed"]
                /\ UNCHANGED <<nextId, idOf, delivered, mark>>

Batch == IF Design = "mark" THEN {i \in committedIds : i > mark}
                            ELSE committedIds \ delivered

Poll == /\ Batch /= {}
        /\ delivered' = delivered \cup Batch
        /\ mark' = IF Design = "mark" THEN Max(Batch \cup {mark}) ELSE mark
        /\ UNCHANGED <<nextId, idOf, wpc, committedIds>>

Next == \/ \E w \in Writers : Insert(w)
        \/ \E w \in Writers : CommitRow(w)
        \/ Poll

Spec == Init /\ [][Next]_vars
LiveSpec == Spec /\ WF_vars(Poll)

MarkInv == \A i \in committedIds : i <= mark => i \in delivered
EventuallyDelivered == \A i \in 1..Cardinality(Writers) :
                         (i \in committedIds) ~> (i \in delivered)
=============================================================================

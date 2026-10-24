--------------------------- MODULE ProbeOperators ---------------------------
(* W0-S04 probe: constructs the spike's S5 and S8 specs do not use but
   authored lessons may: a queue as a sequence (Append, Head, Tail, Len,
   SubSeq, \o), SUBSET, UNION, DOMAIN, ENABLED in an invariant, and EXCEPT
   on record fields. *)
EXTENDS Naturals, Sequences, FiniteSets
CONSTANTS Msgs, Cap
VARIABLES q, sent, log, rec
vars == <<q, sent, log, rec>>

Init == /\ q = <<>>
        /\ sent = {}
        /\ log = <<>>
        /\ rec = [n |-> 0, tags |-> {}]

Send(m) == /\ Len(q) < Cap
           /\ m \notin sent
           /\ q' = Append(q, m)
           /\ sent' = sent \cup {m}
           /\ UNCHANGED <<log, rec>>

Recv == /\ q /= <<>>
        /\ q' = Tail(q)
        /\ log' = log \o <<Head(q)>>
        /\ rec' = [rec EXCEPT !.n = @ + 1, !.tags = @ \cup {Head(q)}]
        /\ UNCHANGED sent

Drop == /\ Len(q) > 1
        /\ q' = SubSeq(q, 2, Len(q))
        /\ UNCHANGED <<sent, log, rec>>

Next == \/ \E m \in Msgs : Send(m)
        \/ Recv
        \/ Drop

Spec == Init /\ [][Next]_vars

TypeOK == /\ q \in UNION {[1..k -> Msgs] : k \in 0..Cap}
          /\ sent \in SUBSET Msgs
          /\ DOMAIN log = 1..Len(log)
          /\ rec.tags \subseteq Msgs
Delivered == {log[i] : i \in DOMAIN log}
Inv == /\ Delivered \subseteq sent
       /\ Cardinality(Delivered) <= rec.n
       /\ (ENABLED Recv) \/ q = <<>>
=============================================================================

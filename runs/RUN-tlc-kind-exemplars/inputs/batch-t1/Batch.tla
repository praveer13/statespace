---- MODULE Batch ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "open" /\ tries = 0
Submit == st = "open"      /\ st' = "submitted" /\ UNCHANGED tries
Fail   == st = "submitted" /\ tries < 2 /\ st' = "open" /\ tries' = tries + 1
Settle == st = "submitted" /\ st' = "settled"   /\ UNCHANGED tries
GiveUp == st = "submitted" /\ tries = 2 /\ st' = "failed" /\ UNCHANGED tries
Done   == st \in {"settled", "failed"} /\ UNCHANGED vars
Next == Submit \/ Fail \/ Settle \/ GiveUp \/ Done
Spec == Init /\ [][Next]_vars
TriesBound == tries <= 2
SubmittedLeadsToEnd == (st = "submitted") ~> (st \in {"settled", "failed"})
====

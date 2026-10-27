---- MODULE RefundAsk ----
EXTENDS Naturals
VARIABLES st, n
vars == <<st, n>>
Init == st = "open" /\ n = 0
Ask    == st = "open"  /\ st' = "asked" /\ UNCHANGED n
Info   == st = "asked" /\ n < 3 /\ st' = "open" /\ n' = n
Grant  == st = "asked" /\ st' = "granted" /\ UNCHANGED n
Refuse == st = "asked" /\ st' = "refused" /\ UNCHANGED n
Done   == st \in {"granted", "refused"} /\ UNCHANGED vars
Next == Ask \/ Info \/ Grant \/ Refuse \/ Done
Spec == Init /\ [][Next]_vars /\ WF_vars(Ask) /\ WF_vars(Grant \/ Refuse)
Answered == <>(st \in {"granted", "refused"})
====

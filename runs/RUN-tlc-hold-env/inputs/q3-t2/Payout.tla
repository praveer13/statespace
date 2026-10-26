---- MODULE Payout ----
VARIABLES st
Init == st = "queued"
Send    == st = "queued" /\ st' = "sent"
Bounce  == st = "sent"   /\ st' = "queued"
Settle  == st = "sent"   /\ st' = "settled"
Abandon == FALSE
Done    == st \in {"settled", "abandoned"} /\ UNCHANGED st
Next == Send \/ Bounce \/ Settle \/ Abandon \/ Done
Fair == WF_st(Abandon)
Spec == Init /\ [][Next]_st /\ Fair
NeverLost == st \in {"queued", "sent", "settled", "abandoned"}
Finished == st \in {"settled", "abandoned"}
EventuallyFinished == <>Finished
====

---- MODULE Approval ----
VARIABLES st
Init == st = "requested"
Review  == st = "requested" /\ st' = "reviewing"
Recheck == st = "reviewing" /\ st' = "requested"
Approve == st = "reviewing" /\ st' = "approved"
Deny    == st = "reviewing" /\ st' = "denied"
Done    == st \in {"approved", "denied"} /\ UNCHANGED st
Next == Review \/ Recheck \/ Approve \/ Deny \/ Done
Fair == WF_st(Review) /\ SF_st(Deny)
Spec == Init /\ [][Next]_st /\ Fair
TypeOK == st \in {"requested", "reviewing", "approved", "denied"}
Decided == st \in {"approved", "denied"}
EventuallyDecided == <>Decided
====

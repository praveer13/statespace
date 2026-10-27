---- MODULE Webhooks ----
CONSTANT Hooks
VARIABLES st
Init == st = [h \in Hooks |-> "queued"]
Send(h)  == st[h] = "queued" /\ st' = [st EXCEPT ![h] = "sent"]
Retry(h) == st[h] = "sent"   /\ st' = [st EXCEPT ![h] = "queued"]
Ack(h)   == st[h] = "sent"   /\ st' = [st EXCEPT ![h] = "delivered"]
Dead(h)  == st[h] = "queued" /\ st' = [st EXCEPT ![h] = "dead"]
Idle == (\A h \in Hooks : st[h] \in {"delivered", "dead"}) /\ UNCHANGED st
Next == (\E h \in Hooks : Send(h) \/ Retry(h) \/ Ack(h) \/ Dead(h)) \/ Idle
Spec == Init /\ [][Next]_st /\ \A h \in Hooks : WF_st(Dead(h))
TypeOK == st \in [Hooks -> {"queued", "sent", "delivered", "dead"}]
AllSettle == \A h \in Hooks : <>(st[h] \in {"delivered", "dead"})
====

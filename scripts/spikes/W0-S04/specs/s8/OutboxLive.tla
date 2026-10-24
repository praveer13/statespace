----------------------------- MODULE OutboxLive -----------------------------
(* W0-S04 spike representative of curriculum S08.L5's liveness configurations
   over Outbox: weak fairness on the worker's and the provider's actions, none
   on Recover. Liveness is TLC's; Spectacle has no fairness or liveness. *)
EXTENDS Outbox

WorkerFair == \A c \in Cmds : /\ WF_vars(Dispatch(c))
                              /\ WF_vars(Receive(c))
                              /\ WF_vars(Persist(c))
                              /\ WF_vars(Ack(c))
ProviderFair == WF_vars(\E r \in reqs : Accept(r))

LiveSpec == Init /\ [][Next]_vars /\ WorkerFair /\ ProviderFair

EventuallyDispatched == \A c \in Cmds : (c \in committed) ~> (attempts[c] > 0)
EventuallyAcked == \A c \in Cmds : (c \in committed) ~> (status[c] = "acked")
=============================================================================

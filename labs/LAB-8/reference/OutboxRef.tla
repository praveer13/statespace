------------------------------ MODULE OutboxRef ------------------------------
(***************************************************************************)
(* LAB-8.1: the course's reference spec for the reference simulator's      *)
(* fault-free traces. Reference module, earns nothing. It EXTENDS the      *)
(* pinned interface and has the worker's happy path only: no Timeout, no   *)
(* Crash and no Recover, so a trace with a fault in it is rejected here.   *)
(* Your own spec, spec/Outbox.tla, adds those in LAB-8.2.                  *)
(***************************************************************************)
EXTENDS OutboxIface

Init == /\ committed = {}
        /\ status = [c \in Cmds |-> "none"]
        /\ durable = {}
        /\ attempts = [c \in Cmds |-> 0]
        /\ got = {}
        /\ reqs = {}
        /\ replies = {}
        /\ charges = [c \in Cmds |-> 0]
        /\ seen = {}
        /\ up = TRUE
        /\ crashes = 0

Commit(c) == /\ c \notin committed
             /\ committed' = committed \cup {c}
             /\ status' = [status EXCEPT ![c] = "pending"]
             /\ UNCHANGED <<durable, attempts, got, reqs, replies, charges, seen, up, crashes>>

Dispatch(c) == /\ up
               /\ status[c] = "pending"
               /\ attempts[c] < MaxAttempts
               /\ LET a == attempts[c] + 1
                  IN /\ attempts' = [attempts EXCEPT ![c] = a]
                     /\ reqs' = reqs \cup {[cmd |-> c, key |-> Key(c, a), att |-> a]}
               /\ status' = [status EXCEPT ![c] = "inflight"]
               /\ UNCHANGED <<committed, durable, got, replies, charges, seen, up, crashes>>

Receive(c) == /\ up
              /\ status[c] = "inflight"
              /\ c \notin got
              /\ c \notin durable
              /\ \E r \in replies : r.cmd = c
              /\ got' = got \cup {c}
              /\ UNCHANGED <<committed, status, durable, attempts, reqs, replies, charges, seen, up, crashes>>

Persist(c) == /\ up
              /\ c \in got
              /\ durable' = durable \cup {c}
              /\ got' = got \ {c}
              /\ UNCHANGED <<committed, status, attempts, reqs, replies, charges, seen, up, crashes>>

Ack(c) == /\ up
          /\ c \in durable
          /\ status[c] = "inflight"
          /\ status' = [status EXCEPT ![c] = "acked"]
          /\ UNCHANGED <<committed, durable, attempts, got, reqs, replies, charges, seen, up, crashes>>

Next == \/ \E c \in Cmds : Commit(c) \/ Dispatch(c) \/ Receive(c) \/ Persist(c) \/ Ack(c)
        \/ ProviderNext

Spec == Init /\ [][Next]_vars
=============================================================================

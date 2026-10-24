------------------------------- MODULE Outbox -------------------------------
(* W0-S04 spike representative of curriculum S08's reference model Outbox:
   the worker's actions, Crash and Recover over the supplied OutboxIface.
   Commit, Dispatch, the provider's Accept, Receive, Persist and Ack are
   separate steps. Crash is allowed only inside the configured windows
   (S08 §1.2); MaxCrashes < 0 means an unbounded crash budget. *)
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

\* The client's transaction: the command and its outbox intent commit together.
Commit(c) == /\ c \notin committed
             /\ committed' = committed \cup {c}
             /\ status' = [status EXCEPT ![c] = "pending"]
             /\ UNCHANGED <<durable, attempts, got, reqs, replies, charges, seen,
                            up, crashes>>

Dispatch(c) == /\ up
               /\ status[c] = "pending"
               /\ attempts[c] < MaxAttempts
               /\ LET a == attempts[c] + 1
                  IN /\ attempts' = [attempts EXCEPT ![c] = a]
                     /\ reqs' = reqs \cup {[cmd |-> c, key |-> Key(c, a), att |-> a]}
               /\ status' = [status EXCEPT ![c] = "inflight"]
               /\ UNCHANGED <<committed, durable, got, replies, charges, seen,
                              up, crashes>>

\* A timer returns an unanswered intent to pending (D-19).
Timeout(c) == /\ Timeouts
              /\ up
              /\ status[c] = "inflight"
              /\ c \notin got
              /\ c \notin durable
              /\ status' = [status EXCEPT ![c] = "pending"]
              /\ UNCHANGED <<committed, durable, attempts, got, reqs, replies,
                             charges, seen, up, crashes>>

Receive(c) == /\ up
              /\ status[c] = "inflight"
              /\ c \notin got
              /\ c \notin durable
              /\ \E r \in replies : r.cmd = c
              /\ got' = got \cup {c}
              /\ UNCHANGED <<committed, status, durable, attempts, reqs, replies,
                             charges, seen, up, crashes>>

Persist(c) == /\ up
              /\ c \in got
              /\ durable' = durable \cup {c}
              /\ got' = got \ {c}
              /\ UNCHANGED <<committed, status, attempts, reqs, replies, charges,
                             seen, up, crashes>>

Ack(c) == /\ up
          /\ c \in durable
          /\ status[c] = "inflight"
          /\ status' = [status EXCEPT ![c] = "acked"]
          /\ UNCHANGED <<committed, durable, attempts, got, reqs, replies, charges,
                         seen, up, crashes>>

\* The crash windows along one command's chain.
InWindow(w, c) ==
  CASE w = "CW1" -> status[c] = "pending"
    [] w = "CW2" -> /\ status[c] = "inflight"
                    /\ \E r \in reqs : r.cmd = c
                    /\ ~\E r \in replies : r.cmd = c
    [] w = "CW3" -> /\ \E r \in replies : r.cmd = c
                    /\ c \notin durable
    [] w = "CW4" -> c \in durable /\ status[c] = "inflight"
    [] OTHER     -> FALSE

CrashBudget == MaxCrashes < 0 \/ crashes < MaxCrashes

Crash == /\ up
         /\ CrashBudget
         /\ \E c \in committed, w \in CrashWindows : InWindow(w, c)
         /\ up' = FALSE
         /\ got' = {}
         /\ crashes' = IF MaxCrashes < 0 THEN crashes ELSE crashes + 1
         /\ UNCHANGED <<committed, status, durable, attempts, reqs, replies,
                        charges, seen>>

\* Recovery returns every inflight intent without a stored result to pending.
Recover == /\ ~up
           /\ up' = TRUE
           /\ status' = [c \in Cmds |-> IF status[c] = "inflight" /\ c \notin durable
                                          THEN "pending" ELSE status[c]]
           /\ UNCHANGED <<committed, durable, attempts, got, reqs, replies, charges,
                          seen, crashes>>

Next == \/ \E c \in Cmds : Commit(c)
        \/ \E c \in Cmds : Dispatch(c)
        \/ \E c \in Cmds : Timeout(c)
        \/ \E c \in Cmds : Receive(c)
        \/ \E c \in Cmds : Persist(c)
        \/ \E c \in Cmds : Ack(c)
        \/ Crash
        \/ Recover
        \/ \E r \in reqs : Accept(r)
        \/ \E k \in seen : Forget(k)

Spec == Init /\ [][Next]_vars
=============================================================================

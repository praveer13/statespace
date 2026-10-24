----------------------------- MODULE OutboxIface -----------------------------
(* W0-S04 spike representative of LAB-8's supplied spec/OutboxIface.tla
   (curriculum S08 §1.1): the variables, TypeOK, the provider and network
   actions, and the properties. The learner's Outbox.tla EXTENDS it.
   One message per attempt: [cmd, key, att]. Replies stay deliverable. *)
EXTENDS Naturals, FiniteSets
CONSTANTS Cmds, MaxCrashes, MaxAttempts, CrashWindows, Dedup, FreshKey,
          Forgets, Timeouts

VARIABLES committed,  \* database: commands whose transaction committed
          status,     \* database: the outbox row per command
          durable,    \* database: commands whose provider result is stored
          attempts,   \* database: attempts made per command
          got,        \* worker memory: replies received, not yet stored
          reqs,       \* network: requests in flight, one per attempt
          replies,    \* network: replies the provider sent (re-deliverable)
          charges,    \* provider: effects performed per command
          seen,       \* provider: idempotency table (keys)
          up,         \* environment: the worker is up
          crashes     \* environment: crashes so far

vars == <<committed, status, durable, attempts, got, reqs, replies, charges,
          seen, up, crashes>>

Statuses == {"none", "pending", "inflight", "acked"}
Key(c, a) == IF FreshKey THEN <<c, a>> ELSE <<c, 0>>
Keys == {Key(c, a) : c \in Cmds, a \in 1..MaxAttempts}
Req == [cmd : Cmds, key : Keys, att : 1..MaxAttempts]

TypeOK == /\ committed \subseteq Cmds
          /\ status \in [Cmds -> Statuses]
          /\ durable \subseteq Cmds
          /\ attempts \in [Cmds -> 0..MaxAttempts]
          /\ got \subseteq Cmds
          /\ reqs \subseteq Req
          /\ replies \subseteq Req
          /\ charges \in [Cmds -> 0..MaxAttempts]
          /\ seen \subseteq Keys
          /\ up \in BOOLEAN
          /\ crashes \in {0} \cup 0..MaxCrashes   \* finite: Spectacle has no Nat

\* Provider: performs the effect unless its idempotency table holds the key,
\* then replies. Every copy of a request is accepted at most once.
Accept(r) == /\ r \in reqs
             /\ reqs' = reqs \ {r}
             /\ IF Dedup /\ r.key \in seen
                   THEN UNCHANGED charges
                   ELSE charges' = [charges EXCEPT ![r.cmd] = @ + 1]
             /\ seen' = seen \cup {r.key}
             /\ replies' = replies \cup {r}
             /\ UNCHANGED <<committed, status, durable, attempts, got, up, crashes>>

\* Provider: prunes a key under the stated policy (S8.L7).
CanForget(k) ==
  CASE Forgets = "never"      -> FALSE
    [] Forgets = "anytime"    -> TRUE
    [] Forgets = "afterAck"   -> status[k[1]] = "acked"
    [] Forgets = "afterDrain" -> /\ status[k[1]] = "acked"
                                 /\ ~\E r \in reqs : r.key = k
    [] OTHER                  -> FALSE

Forget(k) == /\ k \in seen
             /\ CanForget(k)
             /\ seen' = seen \ {k}
             /\ UNCHANGED <<committed, status, durable, attempts, got, reqs,
                            replies, charges, up, crashes>>

\* Properties (claims/OutboxProps.tla in the lab).
NoLostIntent == \A c \in committed : status[c] \in {"pending", "inflight", "acked"}
AckedIsDurable == \A c \in Cmds : status[c] = "acked" => c \in durable
NoDoubleCharge == \A c \in Cmds : charges[c] <= 1
=============================================================================

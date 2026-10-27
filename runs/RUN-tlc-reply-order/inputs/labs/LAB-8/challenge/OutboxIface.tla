----------------------------- MODULE OutboxIface -----------------------------
(***************************************************************************)
(* LAB-8's pinned interface (curriculum/S08-effects.md section 1.1). The   *)
(* course supplies it and its hash goes into your receipts: change it and  *)
(* every claim that rests on it voids to UNKNOWN [?].                      *)
(*                                                                         *)
(* It declares the variables, who owns each of them, the provider's and    *)
(* the network's actions, and TypeOK over finite sets. Your spec,          *)
(* spec/Outbox.tla, EXTENDS it and writes the worker's actions, Crash,     *)
(* Recover and the fairness conjuncts. The properties live in              *)
(* claims/OutboxProps.tla, which EXTENDS your spec.                        *)
(*                                                                         *)
(* One message per attempt: [cmd, key, att]. A reply stays deliverable    *)
(* after it is sent, so a late or duplicate reply is always possible.      *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets
CONSTANTS Cmds,          \* the commands, such as {"c1"}
          MaxCrashes,    \* the crash budget: at most this many crashes
          MaxAttempts,   \* at most this many requests per command
          CrashWindows,  \* the windows a crash may land in: a subset of {"CW1", "CW2", "CW3", "CW4"}
          Dedup,         \* TRUE: the provider deduplicates by key
          FreshKey,      \* TRUE: a new key per attempt; FALSE: one key per intent
          Forgets,       \* when the provider prunes a key: "never", "afterDrain", "afterAck", "anytime"
          Timeouts       \* TRUE: a timer may return an unanswered intent to pending

VARIABLES committed,  \* your database: commands whose transaction committed (the intent with them)
          status,     \* your database: the outbox row of each command
          durable,    \* your database: commands whose provider result is stored
          attempts,   \* your database: requests made per command
          got,        \* worker memory: replies received, not yet stored (a crash empties it)
          reqs,       \* network: requests in flight, one per attempt
          replies,    \* network: replies the provider sent; any of them can be delivered again
          charges,    \* provider: effects performed per command
          seen,       \* provider: its idempotency table (keys)
          up,         \* environment: the worker is running
          crashes     \* environment: crashes so far

vars == <<committed, status, durable, attempts, got, reqs, replies, charges,
          seen, up, crashes>>

Statuses == {"none", "pending", "inflight", "acked"}
Windows == {"CW1", "CW2", "CW3", "CW4"}

\* The key a request carries: one per intent, or one per attempt when FreshKey.
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
          /\ crashes \in 0..MaxCrashes

\* The windows along one command's chain (section 1.2 of the stage): which
\* window command c is in now. A crash lands in a window only when some
\* committed command is in it.
InWindow(w, c) ==
  CASE w = "CW1" -> status[c] = "pending"
    [] w = "CW2" -> /\ status[c] = "inflight"
                    /\ \E r \in reqs : r.cmd = c
                    /\ ~\E r \in replies : r.cmd = c
    [] w = "CW3" -> /\ \E r \in replies : r.cmd = c
                    /\ c \notin durable
                    /\ status[c] /= "acked"
    [] w = "CW4" -> c \in durable /\ status[c] = "inflight"
    [] OTHER     -> FALSE

\* The provider: performs the effect unless its idempotency table holds the
\* key, then replies. Each copy of a request is accepted once.
Accept(r) == /\ r \in reqs
             /\ reqs' = reqs \ {r}
             /\ IF Dedup /\ r.key \in seen
                   THEN UNCHANGED charges
                   ELSE charges' = [charges EXCEPT ![r.cmd] = IF @ < MaxAttempts THEN @ + 1 ELSE @]
             /\ seen' = seen \cup {r.key}
             /\ replies' = replies \cup {r}
             /\ UNCHANGED <<committed, status, durable, attempts, got, up, crashes>>

\* The provider prunes a key under the stated policy (S8.L7).
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

\* The environment's steps, for Next and for the trace module.
ProviderNext == \/ \E r \in reqs : Accept(r)
                \/ \E k \in seen : Forget(k)
=============================================================================

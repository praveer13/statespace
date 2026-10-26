------------------------------- MODULE Outbox -------------------------------
(***************************************************************************)
(* LAB-8.2 and LAB-8.3: your outbox spec.                                  *)
(*                                                                         *)
(* challenge/OutboxIface.tla declares the variables and who owns them:     *)
(*   your database, kept across a crash: committed, status, durable,       *)
(*     attempts                                                            *)
(*   the worker's memory, emptied by a crash: got                          *)
(*   the network: reqs, replies         the provider: charges, seen        *)
(*   the environment: up, crashes                                          *)
(* and supplies Key, InWindow, the provider's Accept and Forget, and       *)
(* ProviderNext. claims/OutboxProps.tla holds the properties and EXTENDS   *)
(* this module, so keep the names below: the checks and the trace module   *)
(* refer to them.                                                          *)
(*                                                                         *)
(* Check it with `uv run statespace check lab8.2` (safety) and             *)
(* `uv run statespace check lab8.3` (progress). To run TLC yourself, copy  *)
(* this file, challenge/*.tla, challenge/<config>.cfg and                  *)
(* claims/OutboxProps.tla into one folder and run                          *)
(*   java -cp tla2tools-1.8.0.jar tlc2.TLC -workers 1 \                    *)
(*        -config mc-full.cfg OutboxProps.tla                              *)
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

\* The client's transaction: the command and its outbox intent commit together.
Commit(c) == /\ c \notin committed
             /\ committed' = committed \cup {c}
             /\ status' = [status EXCEPT ![c] = "pending"]
             /\ UNCHANGED <<durable, attempts, got, reqs, replies, charges, seen, up, crashes>>

\* ---- The worker (LAB-8.2) --------------------------------------------------
\* Each action below is FALSE until you write it, so the worker never moves.

\* The worker sends a pending intent: one more attempt, a request on the
\* network carrying the intent's key, Key(c, a), and the row goes inflight.
\* TODO(you): write Dispatch(c).
Dispatch(c) == FALSE

\* A timer returns an unanswered intent to pending (only when Timeouts).
\* TODO(you): write Timeout(c).
Timeout(c) == FALSE

\* The worker buffers a reply for an inflight intent it has not stored.
\* TODO(you): write Receive(c).
Receive(c) == FALSE

\* The worker stores the provider's result it buffered.
\* TODO(you): write Persist(c).
Persist(c) == FALSE

\* The worker marks the intent done. It needs a stored result.
\* TODO(you): write Ack(c).
Ack(c) == FALSE

\* The worker stops, inside one of CrashWindows and within MaxCrashes, and
\* loses its memory. Your database survives.
\* TODO(you): write Crash.
Crash == FALSE

\* The worker restarts. Recovery acts on what is durable.
\* TODO(you): write Recover.
Recover == FALSE

Next == \/ \E c \in Cmds : Commit(c)
        \/ \E c \in Cmds : Dispatch(c) \/ Timeout(c) \/ Receive(c) \/ Persist(c) \/ Ack(c)
        \/ Crash
        \/ Recover
        \/ ProviderNext

Spec == Init /\ [][Next]_vars

\* ---- Fairness (LAB-8.3) ----------------------------------------------------
\* The three conjuncts claims/OutboxProps.tla combines into LiveSpec, and
\* drops one at a time. TRUE assumes nothing.
\* TODO(you): fairness on each of the worker's actions, for each command.
WorkerFair == TRUE
\* TODO(you): the provider eventually accepts each request in flight.
ProviderFair == TRUE
\* TODO(you): a crashed worker eventually recovers.
RecoverFair == TRUE
=============================================================================

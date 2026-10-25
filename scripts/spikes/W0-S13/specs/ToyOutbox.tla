------------------------------ MODULE ToyOutbox ------------------------------
(***************************************************************************)
(* W0-S13 spike: a toy outbox in curriculum S08's vocabulary, small enough *)
(* to validate traces against. It is a probe for the trace-module method,  *)
(* not the course's reference model `Outbox` (W5-T02 authors that).        *)
(*                                                                         *)
(* The command and its outbox intent commit in one transaction (Commit).   *)
(* The relay sends the intent with the key minted for it (Dispatch), and   *)
(* sends it again while no result is stored, so the provider may see the   *)
(* same key twice. The provider performs the effect unless its table      *)
(* already holds the key, then replies (Accept). The worker stores the     *)
(* provider's result (Persist), then marks the intent done (Ack). There    *)
(* are no crashes: duplicates come from re-sends alone.                    *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, Sequences

CONSTANTS Cmds,          \* command ids, as strings
          MaxAttempts    \* sends per intent, re-sends included

VARIABLES status,    \* database: the outbox row of each command
          attempts,  \* database: sends so far for each intent
          durable,   \* database: commands whose provider result is stored
          reqs,      \* network: request copies in flight, one per send
          replies,   \* network: replies the provider sent
          seen,      \* provider: its idempotency table (keys)
          charges    \* provider: effects performed for each command

vars == <<status, attempts, durable, reqs, replies, seen, charges>>

\* The key names the intent, not the attempt.
Key(c) == "key-" \o c

Init == /\ status = [c \in Cmds |-> "none"]
        /\ attempts = [c \in Cmds |-> 0]
        /\ durable = {}
        /\ reqs = {}
        /\ replies = {}
        /\ seen = {}
        /\ charges = [c \in Cmds |-> 0]

\* The client's transaction: the command and its intent commit together.
Commit(c) == /\ status[c] = "none"
             /\ status' = [status EXCEPT ![c] = "pending"]
             /\ UNCHANGED <<attempts, durable, reqs, replies, seen, charges>>

\* The relay sends the intent; it sends again while no result is stored.
Dispatch(c) == /\ status[c] \in {"pending", "inflight"}
               /\ c \notin durable
               /\ attempts[c] < MaxAttempts
               /\ attempts' = [attempts EXCEPT ![c] = @ + 1]
               /\ reqs' = reqs \cup {[cmd |-> c, key |-> Key(c), att |-> attempts[c] + 1]}
               /\ status' = [status EXCEPT ![c] = "inflight"]
               /\ UNCHANGED <<durable, replies, seen, charges>>

\* The provider: performs the effect unless its table holds the key, then replies.
Accept(r) == /\ r \in reqs
             /\ reqs' = reqs \ {r}
             /\ charges' = IF r.key \in seen THEN charges
                           ELSE [charges EXCEPT ![r.cmd] = @ + 1]
             /\ seen' = seen \cup {r.key}
             /\ replies' = replies \cup {[cmd |-> r.cmd, key |-> r.key]}
             /\ UNCHANGED <<status, attempts, durable>>

\* The worker stores the provider's result (receive and persist in one step).
Persist(c) == /\ status[c] = "inflight"
              /\ c \notin durable
              /\ \E p \in replies : p.cmd = c
              /\ durable' = durable \cup {c}
              /\ UNCHANGED <<status, attempts, reqs, replies, seen, charges>>

\* The worker marks the intent done; it needs a stored result.
Ack(c) == /\ status[c] = "inflight"
          /\ c \in durable
          /\ status' = [status EXCEPT ![c] = "acked"]
          /\ UNCHANGED <<attempts, durable, reqs, replies, seen, charges>>

Next == \/ \E c \in Cmds : Commit(c) \/ Dispatch(c) \/ Persist(c) \/ Ack(c)
        \/ \E r \in reqs : Accept(r)

Spec == Init /\ [][Next]_vars

TypeOK == /\ status \in [Cmds -> {"none", "pending", "inflight", "acked"}]
          /\ attempts \in [Cmds -> 0..MaxAttempts]
          /\ durable \subseteq Cmds
          /\ charges \in [Cmds -> 0..MaxAttempts]
AckedIsDurable == \A c \in Cmds : status[c] = "acked" => c \in durable
NoDoubleCharge == \A c \in Cmds : charges[c] <= 1
=============================================================================

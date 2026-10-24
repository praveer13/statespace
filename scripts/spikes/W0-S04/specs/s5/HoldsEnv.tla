------------------------------ MODULE HoldsEnv ------------------------------
(* W0-S04 spike representative of the read-only, hashed environment module of
   curriculum S05 M5 (LAB-5.4, S5.L5). It declares the variables and the
   environment actions; a learner's module EXTENDS it and adds the system
   actions (Place, Dispatch, Handle, Expire, Restart). Replies stay in msgs,
   so one can be handled twice (duplicate) or late (delay). *)
EXTENDS Naturals, FiniteSets
CONSTANTS MaxTries, CrashesOn
VARIABLES hst, tries, msgs, sent, up, res
envvars == <<hst, tries, msgs, sent, up, res>>

Replies == {"ok", "busy"}

TypeOK == /\ hst \in {"available", "held", "capturing", "captured", "released"}
          /\ tries \in 0..MaxTries
          /\ msgs \subseteq Replies
          /\ sent \in BOOLEAN
          /\ up \in BOOLEAN
          /\ res \in 0..3

\* Environment: the provider replies once a request has been sent.
Reply(r) == /\ sent
            /\ r \notin msgs
            /\ msgs' = msgs \cup {r}
            /\ UNCHANGED <<hst, tries, sent, up, res>>

\* Environment: the worker crashes (only when crash actions are switched on).
Crash == /\ CrashesOn
         /\ up
         /\ up' = FALSE
         /\ UNCHANGED <<hst, tries, msgs, sent, res>>

NeverTwice == res <= 1
=============================================================================

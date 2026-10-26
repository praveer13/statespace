----------------------------- MODULE HoldsUnsafe -----------------------------
(* LAB-5.4, first half: the unsafe variant, kept in broken/ beside its fix in
   fixed/. Nothing in broken/ is ever deleted.

   Here the worker handles a reply in two steps (it reads the hold, then writes
   what it read), and the expiry job does the same, so each one can trust a
   read the other has already made stale.

   TODO(you): write HandleRead, HandleWrite, ExpireRead and ExpireWrite as read
   steps and write steps that trust the read, and let expiry release any hold
   that is not yet resolved. Then find the hold that resolves twice.

   statespace check lab5.4 checks this module with MaxTries = 2 and
   CrashesOn = TRUE, and expects TLC to report NeverTwice (pinned in
   claims/s5-props.tla) violated by a trace with an expiry step in it. It builds
   the spec as Init /\ [][Next]_vars. *)
EXTENDS HoldsEnv  \* read-only: Reply, Crash, TypeOK, NeverTwice
VARIABLES wseen, eseen  \* what the worker and the expiry job last read
vars == <<hst, tries, msgs, sent, up, res, wseen, eseen>>

Init == /\ hst = "available" /\ tries = 0 /\ msgs = {} /\ sent = FALSE
        /\ up = TRUE /\ res = 0 /\ wseen = "none" /\ eseen = "none"

Place == /\ hst = "available" /\ hst' = "held"
         /\ UNCHANGED <<tries, msgs, sent, up, res, wseen, eseen>>

\* The provider request is sent in the step that changes the hold (SEAM-4).
Dispatch == /\ hst = "held" /\ tries < MaxTries /\ up
            /\ hst' = "capturing" /\ tries' = tries + 1 /\ sent' = TRUE
            /\ UNCHANGED <<msgs, up, res, wseen, eseen>>

HandleRead(r) == FALSE
HandleWrite   == FALSE
ExpireRead    == FALSE
ExpireWrite   == FALSE

Restart == /\ ~up /\ up' = TRUE
           /\ UNCHANGED <<hst, tries, msgs, sent, res, wseen, eseen>>

Next == \/ Place \/ Dispatch \/ \E r \in Replies : HandleRead(r)
        \/ HandleWrite \/ ExpireRead \/ ExpireWrite \/ Restart
        \/ \E r \in Replies : Reply(r) /\ UNCHANGED <<wseen, eseen>>
        \/ Crash /\ wseen' = "none" /\ UNCHANGED eseen
Spec == Init /\ [][Next]_vars
=============================================================================

-------------------------------- MODULE Holds --------------------------------
(* W0-S04 spike representative of curriculum S05 M5, the safe variant
   (LAB-5.4 fixed/): the learner's system actions over HoldsEnv. Dispatch
   sends the provider request in the step that changes the hold (SEAM-4). *)
EXTENDS HoldsEnv
vars == envvars

Init == /\ hst = "available"
        /\ tries = 0
        /\ msgs = {}
        /\ sent = FALSE
        /\ up = TRUE
        /\ res = 0

Place == /\ hst = "available"
         /\ hst' = "held"
         /\ UNCHANGED <<tries, msgs, sent, up, res>>

Dispatch == /\ hst = "held"
            /\ tries < MaxTries
            /\ up
            /\ hst' = "capturing"
            /\ tries' = tries + 1
            /\ sent' = TRUE
            /\ UNCHANGED <<msgs, up, res>>

Handle(r) == /\ r \in msgs
             /\ up
             /\ hst = "capturing"
             /\ hst' = IF r = "ok" THEN "captured" ELSE "held"
             /\ res' = IF r = "ok" THEN res + 1 ELSE res
             /\ UNCHANGED <<tries, msgs, sent, up>>

Expire == /\ hst = "held"
          /\ hst' = "released"
          /\ res' = res + 1
          /\ UNCHANGED <<tries, msgs, sent, up>>

Restart == /\ ~up
           /\ up' = TRUE
           /\ UNCHANGED <<hst, tries, msgs, sent, res>>

Next == \/ Place
        \/ Dispatch
        \/ \E r \in Replies : Handle(r)
        \/ Expire
        \/ Restart
        \/ \E r \in Replies : Reply(r)
        \/ Crash

Spec == Init /\ [][Next]_vars
=============================================================================

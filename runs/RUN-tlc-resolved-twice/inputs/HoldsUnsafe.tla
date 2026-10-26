---- MODULE HoldsUnsafe ----
EXTENDS HoldsEnv  \* read-only: Reply, Crash, TypeOK, NeverTwice
VARIABLES wseen, eseen  \* what the worker and the expiry job last read
vars == <<hst, tries, msgs, sent, up, res, wseen, eseen>>

Init == /\ hst = "available" /\ tries = 0 /\ msgs = {} /\ sent = FALSE
        /\ up = TRUE /\ res = 0 /\ wseen = "none" /\ eseen = "none"

Place == /\ hst = "available" /\ hst' = "held"
         /\ UNCHANGED <<tries, msgs, sent, up, res, wseen, eseen>>

Dispatch == /\ hst = "held" /\ tries < MaxTries /\ up
            /\ hst' = "capturing" /\ tries' = tries + 1 /\ sent' = TRUE
            /\ UNCHANGED <<msgs, up, res, wseen, eseen>>

HandleRead(r) == /\ r \in msgs /\ up /\ hst = "capturing" /\ wseen = "none"
                 /\ wseen' = r
                 /\ UNCHANGED <<hst, tries, msgs, sent, up, res, eseen>>

HandleWrite == /\ up /\ wseen /= "none"
               /\ hst' = IF wseen = "ok" THEN "captured" ELSE "held"
               /\ res' = IF wseen = "ok" THEN res + 1 ELSE res
               /\ wseen' = "none"
               /\ UNCHANGED <<tries, msgs, sent, up, eseen>>

ExpireRead == /\ eseen = "none" /\ hst \in {"held", "capturing"}
              /\ eseen' = hst
              /\ UNCHANGED <<hst, tries, msgs, sent, up, res, wseen>>

ExpireWrite == /\ eseen /= "none"
               /\ hst' = "released" /\ res' = res + 1 /\ eseen' = "none"
               /\ UNCHANGED <<tries, msgs, sent, up, wseen>>

Restart == /\ ~up /\ up' = TRUE
           /\ UNCHANGED <<hst, tries, msgs, sent, res, wseen, eseen>>

Next == \/ Place \/ Dispatch \/ \E r \in Replies : HandleRead(r)
        \/ HandleWrite \/ ExpireRead \/ ExpireWrite \/ Restart
        \/ \E r \in Replies : Reply(r) /\ UNCHANGED <<wseen, eseen>>
        \/ Crash /\ wseen' = "none" /\ UNCHANGED eseen
Spec == Init /\ [][Next]_vars
====
\* MaxTries = 2, CrashesOn = TRUE, INVARIANT NeverTwice

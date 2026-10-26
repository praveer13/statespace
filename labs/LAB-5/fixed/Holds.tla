-------------------------------- MODULE Holds --------------------------------
(* LAB-5.4, second half: the fix, kept in fixed/ beside the unsafe variant in
   broken/.

   TODO(you): write Handle(r) and Expire so that every resolution tests and
   writes the stored state of the hold in one action, a compare-and-set, and
   counts itself in res. Keep crash actions on.

   statespace check lab5.4 checks this module with MaxTries = 2 and
   CrashesOn = TRUE. TypeOK and NeverTwice (both from HoldsEnv.tla, NeverTwice
   pinned in claims/s5-props.tla) must hold over the whole reachable state
   space; Reply and Crash, the environment's actions, must each be taken at
   least once, as TLC's coverage output shows; and a captured hold and a
   released hold must each be reachable. It builds the spec as
   Init /\ [][Next]_vars. *)
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

\* The provider request is sent in the step that changes the hold (SEAM-4).
Dispatch == /\ hst = "held"
            /\ tries < MaxTries
            /\ up
            /\ hst' = "capturing"
            /\ tries' = tries + 1
            /\ sent' = TRUE
            /\ UNCHANGED <<msgs, up, res>>

Handle(r) == FALSE

Expire == FALSE

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

---------------------------- MODULE OutboxReplies ----------------------------
(* W0-S04 spike representative of curriculum S08.L4's reply handler: replies
   are untrusted input. Each Check* constant switches one validation on: the
   reply's status, its cost against the hold, its key against the keys already
   handled (inbound idempotency), and lateness (the hold must still be held).
   A reply can be delivered again (duplicate) or after the timer released the
   hold (late). One intent, one key. *)
EXTENDS Naturals
CONSTANTS Hold, Costs, CheckStatus, CheckCost, CheckKey, CheckLate
VARIABLES hst, inbox, handled, captures, last, released
vars == <<hst, inbox, handled, captures, last, released>>

Reply == [status : {"ok", "declined"}, cost : Costs, key : {"k1"}]
NoReply == [status |-> "none", cost |-> 0, key |-> "none"]

Init == /\ hst = "held"
        /\ inbox = {}
        /\ handled = {}
        /\ captures = 0
        /\ last = NoReply
        /\ released = FALSE

\* Environment: the provider (or the network) delivers a reply.
Deliver(r) == /\ r \notin inbox
              /\ inbox' = inbox \cup {r}
              /\ UNCHANGED <<hst, handled, captures, last, released>>

\* A timer releases the hold.
TimerRelease == /\ hst = "held"
                /\ hst' = "released"
                /\ released' = TRUE
                /\ UNCHANGED <<inbox, handled, captures, last>>

\* The handler captures on any reply that passes the enabled checks. The model
\* stops counting at a second capture (the violation), so it stays finite.
Handle(r) == /\ r \in inbox
             /\ captures < 2
             /\ CheckStatus => r.status = "ok"
             /\ CheckCost => r.cost <= Hold
             /\ CheckKey => r.key \notin handled
             /\ CheckLate => hst = "held"
             /\ hst' = "captured"
             /\ handled' = handled \cup {r.key}
             /\ captures' = captures + 1
             /\ last' = r
             /\ UNCHANGED <<inbox, released>>

Next == \/ \E r \in Reply : Deliver(r)
        \/ TimerRelease
        \/ \E r \in Reply : Handle(r)

Spec == Init /\ [][Next]_vars

StatusOk == captures > 0 => last.status = "ok"
ChargeWithinHold == last.cost <= Hold
OneCapturePerIntent == captures <= 1
NoCaptureAfterRelease == ~(released /\ hst = "captured")
=============================================================================

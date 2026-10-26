------------------------------ MODULE HoldStarve ------------------------------
(* LAB-5.5, second half: the starving variant, kept beside HoldLive.tla.

   TODO(you): copy your HoldLive.tla here and weaken it in one place, so that a
   fair behavior exists in which the hold never resolves: the worker and the
   provider go round a cycle for ever, and every conjunct of this module's
   SysFairness is still satisfied on it. A behavior that merely stops (TLC's
   "Stuttering") does not count: the cycle must take steps.

   statespace check lab5.5 runs TLC on this module, as it runs HoldLive.tla,
   writes the counterexample as a JSON trace, and accepts the lasso when it
   closes, the hold is unresolved at every state of its cycle, and the cycle
   takes at least one step that changes the state. *)
EXTENDS HoldLiveEnv

Init == st = "held" /\ tries = 0

Try     == st = "held" /\ st' = "pending" /\ tries' = (tries + 1) % 2

Timeout == st = "held" /\ st' = "released" /\ UNCHANGED tries

Next == Try \/ Busy \/ Capture \/ Timeout

SysFairness == TRUE
=============================================================================

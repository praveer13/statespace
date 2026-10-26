------------------------------- MODULE HoldLive -------------------------------
(* LAB-5.5, first half: a hold eventually resolves.

   Try and Timeout are your system's actions; Busy and Capture belong to the
   provider (HoldLiveEnv.tla, read-only). With no fairness at all, a behavior
   may simply stop, and TLC finds a lasso in which the hold never resolves.

   TODO(you): decide when Timeout may fire, and state SysFairness: the fairness
   your own system's actions justify. Put fairness on your actions only. The
   provider promises nothing, so SysFairness may not name Busy or Capture.

   statespace check lab5.5 builds the spec as
   Init /\ [][Next]_vars /\ SysFairness and checks EventuallyResolves (pinned in
   claims/s5-props.tla) over the whole reachable state space, with no SYMMETRY,
   no CONSTRAINT and the deadlock check off, since a resolved hold has no next
   step. Crash actions are off in this model (SEAM-8). *)
EXTENDS HoldLiveEnv

Init == st = "held" /\ tries = 0

\* The worker asks the provider to capture; tries toggles so retries are visible.
Try     == st = "held" /\ st' = "pending" /\ tries' = (tries + 1) % 2

\* Expiry releases the hold.
Timeout == st = "held" /\ st' = "released" /\ UNCHANGED tries

Next == Try \/ Busy \/ Capture \/ Timeout

SysFairness == TRUE
=============================================================================

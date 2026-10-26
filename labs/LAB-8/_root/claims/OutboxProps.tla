----------------------------- MODULE OutboxProps -----------------------------
(***************************************************************************)
(* LAB-8's pinned properties (curriculum/S08-effects.md sections 1.1 and   *)
(* 1.3). The course supplies this file; its hash goes into your LAB-8.2    *)
(* and LAB-8.3 receipts, so a weakened property voids its claim to         *)
(* UNKNOWN [?]. It EXTENDS your spec, spec/Outbox.tla, which must define   *)
(* Init, Next, Spec and the three fairness conjuncts named below.          *)
(*                                                                         *)
(* The configurations in labs/LAB-8/challenge/ name this module's          *)
(* operators: mc-*.cfg for safety (LAB-8.2), live-*.cfg for progress       *)
(* (LAB-8.3).                                                              *)
(***************************************************************************)
EXTENDS Outbox

\* ---- Safety (LAB-8.2; CL-8.1, CL-8.2) -------------------------------------
\* A committed intent stays pending, inflight or acked: it is never lost.
NoLostIntent == \A c \in committed : status[c] \in {"pending", "inflight", "acked"}

\* An intent is acknowledged only once its provider result is stored.
AckedIsDurable == \A c \in Cmds : status[c] = "acked" => c \in durable

\* The provider performs each command's effect at most once.
NoDoubleCharge == \A c \in Cmds : charges[c] <= 1

\* Not a property: the full design must violate it, which shows that an
\* intent can be acknowledged at all, so the three above are not vacuous.
NeverAcked == \A c \in Cmds : status[c] /= "acked"

\* ---- Progress (LAB-8.3; CL-8.4, CL-8.5) -----------------------------------
\* A committed command leads to a request.
EventuallyDispatched == \A c \in Cmds : (c \in committed) ~> (attempts[c] > 0)

\* A committed command leads to its intent acknowledged.
EventuallyAcked == \A c \in Cmds : (c \in committed) ~> (status[c] = "acked")

\* The stated assumptions, and the specs with one of them dropped. Your spec
\* defines each conjunct:
\*   WorkerFair    fairness on the worker's own actions
\*   ProviderFair  the provider eventually accepts what is in flight
\*   RecoverFair   a crashed worker eventually recovers
LiveSpec           == Spec /\ WorkerFair /\ ProviderFair /\ RecoverFair
NoWorkerFairSpec   == Spec /\ ProviderFair /\ RecoverFair
NoProviderFairSpec == Spec /\ WorkerFair /\ RecoverFair
NoRecoverFairSpec  == Spec /\ WorkerFair /\ ProviderFair
=============================================================================

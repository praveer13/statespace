--------------------------- MODULE ToyOutboxTrace ---------------------------
(***************************************************************************)
(* W0-S13 spike: the trace module for ToyOutbox. Each logged worker event  *)
(* has a disjunct that takes the spec's action and constrains it by the    *)
(* fields the line records; an implementation-only line is a stuttering    *)
(* step; the end record may only be the last line. The provider's Accept   *)
(* is not in the worker's log, so TLC searches for it as a step that       *)
(* consumes no line (curriculum S08, S8.L6).                               *)
(***************************************************************************)
EXTENDS ToyOutbox, TraceValidation

IsCommit   == IsEvent("Commit") /\ Line.cmd \in Cmds /\ Commit(Line.cmd)

\* Dispatch, constrained by the logged key and attempt when the line has them.
IsDispatch == /\ IsEvent("Dispatch")
              /\ Line.cmd \in Cmds
              /\ Dispatch(Line.cmd)
              /\ \E r \in reqs' \ reqs :
                    /\ Logged("key") => r.key = Line.key
                    /\ Logged("att") => r.att = Line.att

IsPersist  == IsEvent("Persist") /\ Line.cmd \in Cmds /\ Persist(Line.cmd)
IsAck      == IsEvent("Ack") /\ Line.cmd \in Cmds /\ Ack(Line.cmd)

\* An implementation-only line (a timer armed): a stuttering step of the spec.
IsTimer    == IsEvent("TimerArmed") /\ UNCHANGED vars

\* The end record: a stuttering step, allowed on the last line only.
IsEnd      == IsEvent("End") /\ IsLast /\ UNCHANGED vars

\* The provider's step: not logged, so TLC fills it in.
ProviderStep == Unlogged /\ \E r \in reqs : Accept(r)

TraceInit == Init /\ l = 1
TraceNext == \/ IsCommit \/ IsDispatch \/ IsPersist \/ IsAck
             \/ IsTimer \/ IsEnd \/ ProviderStep
TraceSpec == TraceInit /\ [][TraceNext]_<<vars, l>>
=============================================================================

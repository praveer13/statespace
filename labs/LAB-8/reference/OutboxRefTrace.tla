---------------------------- MODULE OutboxRefTrace ----------------------------
(***************************************************************************)
(* LAB-8.1: the trace module of the reference spec. Reference module,      *)
(* earns nothing. `statespace trace validate reference/OutboxRef.tla       *)
(* traces/seed-1.ndjson` finds it beside the spec by its name.             *)
(***************************************************************************)
EXTENDS OutboxRef, TraceValidation

IsCommit   == IsEvent("Commit")  /\ Line.cmd \in Cmds /\ Commit(Line.cmd)

IsDispatch == /\ IsEvent("Dispatch")
              /\ Line.cmd \in Cmds
              /\ Dispatch(Line.cmd)
              /\ \E r \in reqs' \ reqs :
                    /\ Logged("key") => r.key = Line.key
                    /\ Logged("att") => r.att = Line.att

IsReceive  == IsEvent("Receive") /\ Line.cmd \in Cmds /\ Receive(Line.cmd)
IsPersist  == IsEvent("Persist") /\ Line.cmd \in Cmds /\ Persist(Line.cmd)
IsAck      == IsEvent("Ack")     /\ Line.cmd \in Cmds /\ Ack(Line.cmd)

\* An implementation-only line is a stuttering step: no spec variable changes.
IsTimer    == IsEvent("TimerArmed") /\ UNCHANGED vars
IsEnd      == IsEvent("End") /\ IsLast /\ UNCHANGED vars

\* The provider's steps are not logged, so TLC searches for them.
ProviderStep == Unlogged /\ ProviderNext

TraceInit == Init /\ l = 1
TraceNext == \/ IsCommit \/ IsDispatch \/ IsReceive \/ IsPersist \/ IsAck
             \/ IsTimer \/ IsEnd \/ ProviderStep
TraceSpec == TraceInit /\ [][TraceNext]_<<vars, l>>
=============================================================================

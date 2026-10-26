---- MODULE OutboxTrace ----
EXTENDS Outbox, TraceValidation

IsCommit   == IsEvent("Commit") /\ Line.cmd \in Cmds /\ Commit(Line.cmd)

IsDispatch == /\ IsEvent("Dispatch")
              /\ Line.cmd \in Cmds
              /\ Dispatch(Line.cmd)
              /\ \E r \in reqs' \ reqs :
                    /\ Logged("key") => r.key = Line.key
                    /\ Logged("att") => r.att = Line.att

IsTimeout  == IsEvent("Timeout") /\ Line.cmd \in Cmds /\ Timeout(Line.cmd)
IsReceive  == IsEvent("Receive") /\ Line.cmd \in Cmds /\ Receive(Line.cmd)
IsPersist  == IsEvent("Persist") /\ Line.cmd \in Cmds /\ Persist(Line.cmd)
IsAck      == IsEvent("Ack")     /\ Line.cmd \in Cmds /\ Ack(Line.cmd)
IsCrash    == IsEvent("Crash")   /\ Crash
IsRecover  == IsEvent("Recover") /\ Recover

\* An implementation-only line is a stuttering step: no spec variable changes.
IsTimer    == IsEvent("TimerArmed") /\ UNCHANGED vars
IsEnd      == IsEvent("End") /\ IsLast /\ UNCHANGED vars

\* The provider's Accept is not logged, so TLC searches for it.
ProviderStep == Unlogged /\ \E r \in reqs : Accept(r)

TraceInit == Init /\ l = 1
TraceNext == \/ IsCommit \/ IsDispatch \/ IsTimeout \/ IsReceive \/ IsPersist \/ IsAck
             \/ IsCrash \/ IsRecover \/ IsTimer \/ IsEnd \/ ProviderStep
TraceSpec == TraceInit /\ [][TraceNext]_<<vars, l>>
====

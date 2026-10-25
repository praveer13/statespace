------------------------ MODULE ToyOutboxTraceComposed ------------------------
(***************************************************************************)
(* W0-S13 spike: the same trace module in the paper's and CCF's shape,     *)
(* where every step consumes a line. The provider's Accept is not logged,  *)
(* so it is composed into the first logged step that needs its reply, with *)
(* the action-composition operator. The pinned TLC refuses the operator    *)
(* unless Java runs with -Dtlc2.tool.impl.Tool.cdot=true, which its error  *)
(* message calls an incomplete implementation.                             *)
(***************************************************************************)
EXTENDS ToyOutbox, TraceValidation

IsCommit   == IsEvent("Commit") /\ Line.cmd \in Cmds /\ Commit(Line.cmd)
IsDispatch == /\ IsEvent("Dispatch")
              /\ Line.cmd \in Cmds
              /\ Dispatch(Line.cmd)
              /\ \E r \in reqs' \ reqs :
                    /\ Logged("key") => r.key = Line.key
                    /\ Logged("att") => r.att = Line.att

\* The provider's Accept, composed with the Persist that needs its reply.
IsPersist  == /\ IsEvent("Persist")
              /\ Line.cmd \in Cmds
              /\ \/ Persist(Line.cmd)
                 \/ (\E r \in reqs : r.cmd = Line.cmd /\ Accept(r)) \cdot Persist(Line.cmd)

IsAck      == IsEvent("Ack") /\ Line.cmd \in Cmds /\ Ack(Line.cmd)
IsTimer    == IsEvent("TimerArmed") /\ UNCHANGED vars
IsEnd      == IsEvent("End") /\ IsLast /\ UNCHANGED vars

TraceInit == Init /\ l = 1
TraceNext == \/ IsCommit \/ IsDispatch \/ IsPersist \/ IsAck
             \/ IsTimer \/ IsEnd
TraceSpec == TraceInit /\ [][TraceNext]_<<vars, l>>
=============================================================================

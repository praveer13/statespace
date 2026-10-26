----------------------------- MODULE OutboxTrace -----------------------------
(***************************************************************************)
(* LAB-8.6: your trace module. It reads your machine's NDJSON log, one     *)
(* line per worker event, as a behavior of your spec: one disjunct per     *)
(* event. challenge/TraceValidation.tla (pinned) supplies the line counter *)
(* l, Line, IsEvent, Logged, Unlogged, IsLast and the verdict.             *)
(*                                                                         *)
(* Run it with                                                             *)
(*   uv run statespace trace validate labs/LAB-8/spec/Outbox.tla <traces>  *)
(* which finds this module beside your spec by its name, and check the     *)
(* stage with `uv run statespace check lab8.6`.                            *)
(*                                                                         *)
(* Log at the spec's grain, and constrain every field a line carries       *)
(* (trace@1: Dispatch carries cmd, key and att; the others carry cmd;      *)
(* Crash and Recover carry nothing more; the last line is End).            *)
(***************************************************************************)
EXTENDS Outbox, TraceValidation

IsCommit   == IsEvent("Commit") /\ Line.cmd \in Cmds /\ Commit(Line.cmd)

\* Worked example: apply Dispatch(c), and require the logged key and
\* attempt to match the request it adds to the network.
IsDispatch == /\ IsEvent("Dispatch")
              /\ Line.cmd \in Cmds
              /\ Dispatch(Line.cmd)
              /\ \E r \in reqs' \ reqs :
                    /\ Logged("key") => r.key = Line.key
                    /\ Logged("att") => r.att = Line.att

\* TODO(you): one disjunct for each of the worker's other events. Each is
\* FALSE until you write it, so a line with that event is rejected.
IsTimeout  == FALSE
IsReceive  == FALSE
IsPersist  == FALSE
IsAck      == FALSE
IsCrash    == FALSE
IsRecover  == FALSE

\* An implementation-only line is a stuttering step: no spec variable changes.
IsTimer    == IsEvent("TimerArmed") /\ UNCHANGED vars
IsEnd      == IsEvent("End") /\ IsLast /\ UNCHANGED vars

\* The provider's steps are not logged, so TLC searches for them.
ProviderStep == Unlogged /\ ProviderNext

TraceInit == Init /\ l = 1
TraceNext == \/ IsCommit \/ IsDispatch \/ IsTimeout \/ IsReceive \/ IsPersist
             \/ IsAck \/ IsCrash \/ IsRecover \/ IsTimer \/ IsEnd \/ ProviderStep
TraceSpec == TraceInit /\ [][TraceNext]_<<vars, l>>
=============================================================================

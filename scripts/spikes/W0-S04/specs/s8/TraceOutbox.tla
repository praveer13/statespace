----------------------------- MODULE TraceOutbox -----------------------------
(* W0-S04 coverage probe only: the shape of LAB-8.6's trace module (a line
   counter l, a log read through TLC's bundled Json module, one disjunct per
   logged event, and a stuttering disjunct). Trace validation itself is
   W0-S05's spike; this module exists to show what Spectacle does with it. *)
EXTENDS Outbox, Json, Sequences, TLC
VARIABLE l

TraceLog == ndJsonDeserialize("TraceOutbox.ndjson")
CmdOf(e) == CHOOSE c \in Cmds : ToString(c) = e.cmd

TraceInit == Init /\ l = 1

IsCommit == /\ l <= Len(TraceLog)
            /\ TraceLog[l].event = "Commit"
            /\ Commit(CmdOf(TraceLog[l]))
            /\ l' = l + 1

IsStutter == /\ l <= Len(TraceLog)
             /\ TraceLog[l].event = "TimerArmed"
             /\ UNCHANGED vars
             /\ l' = l + 1

TraceNext == IsCommit \/ IsStutter
TraceAccepted == l <= Len(TraceLog)
=============================================================================

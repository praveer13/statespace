--------------------------- MODULE TraceValidation ---------------------------
(***************************************************************************)
(* LAB-8's pinned trace-validation module: the part of a trace module that *)
(* does not depend on your spec. Course-supplied and read-only; its hash   *)
(* goes into every LAB-8.1 and LAB-8.6 receipt. After Cirstea, Kuppe,      *)
(* Loillier and Merz (arXiv 2404.16075 v2, section 4.2), as tested in      *)
(* docs/spikes/W0-S13.md:                                                  *)
(*   - the log's path is a constant, TraceFile, that `statespace trace     *)
(*     validate` writes into the config it makes for each trace;          *)
(*   - the verdict comes from the line counter, not from TLC's search      *)
(*     depth, because the provider's unlogged steps consume no line.       *)
(*                                                                         *)
(* Your trace module (spec/OutboxTrace.tla) EXTENDS your spec and this     *)
(* module and defines TraceSpec. The config names SPECIFICATION TraceSpec, *)
(* CONSTRAINT TraceReach, POSTCONDITION TraceVerdict and CHECK_DEADLOCK    *)
(* FALSE, and TLC runs with -workers 1.                                    *)
(***************************************************************************)
EXTENDS Naturals, Sequences, Json, TLC, TLCExt

CONSTANT TraceFile      \* the NDJSON log: one JSON object per line
VARIABLE l              \* the next line to match, 1-based

TraceLog == ndJsonDeserialize(TraceFile)
Line == TraceLog[l]
Logged(f) == f \in DOMAIN Line     \* the line records field f

\* A logged step: the line names the event, and matching it consumes the line.
IsEvent(e) == /\ l \in 1..Len(TraceLog)
              /\ Line.event = e
              /\ l' = l + 1

\* A step the log does not show: it consumes no line, and it may happen only
\* while lines remain to be matched.
Unlogged == /\ l \in 1..Len(TraceLog)
            /\ l' = l

\* A complete log ends with an end record, which only the last line may be.
IsLast == l = Len(TraceLog)
EndRecord == Len(TraceLog) > 0 /\ TraceLog[Len(TraceLog)].event = "End"

-----------------------------------------------------------------------------
(***************************************************************************)
(* The verdict. TraceReach is a state constraint that is always TRUE: it   *)
(* keeps the highest l of any state TLC generates in a named register, one *)
(* per worker (TLC 1.8.0 names them "s:..."). The postcondition reads the  *)
(* registers once the search is over.                                      *)
(***************************************************************************)
ReachMax(a, b) == IF a > b THEN a ELSE b
TraceReach == TLCSet("s:reach", ReachMax(TLCGetOrDefault("s:reach", 0), l))

RECURSIVE ReachOf(_, _)
ReachOf(s, i) == IF i > Len(s) THEN 0 ELSE ReachMax(s[i], ReachOf(s, i + 1))

\* Some behavior of the spec matches lines 1..Reached-1; none matches line
\* Reached, when that line exists.
Reached == ReachOf(TLCGet("all:named")["s:reach"], 1)

Verdict == CASE Reached <= Len(TraceLog) -> "rejected"
             [] EndRecord                -> "accepted"
             [] OTHER                    -> "partial"

\* The paper's postcondition, printed for comparison only: it is exact only
\* when every step of the trace module consumes a line.
PaperAccepted == TLCGet("stats").diameter - 1 = Len(TraceLog)

TraceVerdict ==
  /\ PrintT(<<"trace-validation",
              [verdict |-> Verdict,
               lines |-> Len(TraceLog),
               matched |-> Reached - 1,
               first_unmatched |-> IF Reached <= Len(TraceLog) THEN Reached ELSE 0,
               end_record |-> EndRecord,
               diameter |-> TLCGet("stats").diameter,
               paper_accepted |-> PaperAccepted]>>)
  /\ Verdict = "accepted"

\* Two other ways to ask the same question, tested beside the verdict above.
\* As an INVARIANT, TraceUnconsumed is violated by a behavior that consumes
\* every line, and TLC prints that behavior. As _POSSIBLE, TraceConsumed is
\* reported "never witnessed" when no behavior consumes every line.
TraceUnconsumed == l <= Len(TraceLog)
TraceConsumed == l = Len(TraceLog) + 1
=============================================================================

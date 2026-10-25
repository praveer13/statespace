----------------------------- MODULE PaperIOEnv -----------------------------
(***************************************************************************)
(* W0-S13 probe: the paper's and CCF's way to name the log, through the    *)
(* environment variable IOEnv reads. IOEnv is defined in the IOUtils       *)
(* module of the TLA+ CommunityModules, which the pinned tla2tools does    *)
(* not bundle, so this module is expected to fail to parse.                *)
(***************************************************************************)
EXTENDS ToyOutbox, Json, IOUtils, Sequences, TLC

VARIABLE l

TraceLog == ndJsonDeserialize(IOEnv.TRACE_PATH)
TraceInit == Init /\ l = 1
TraceNext == l \in 1..Len(TraceLog) /\ l' = l + 1 /\ UNCHANGED vars
TraceSpec == TraceInit /\ [][TraceNext]_<<vars, l>>
=============================================================================

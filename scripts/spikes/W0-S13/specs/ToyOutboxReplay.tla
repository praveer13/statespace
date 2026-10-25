---------------------------- MODULE ToyOutboxReplay ----------------------------
(***************************************************************************)
(* W0-S13 probe for -loadTrace: an invariant that the first acknowledgement *)
(* violates, so TLC writes a counterexample that the probe then loads back. *)
(***************************************************************************)
EXTENDS ToyOutbox

NothingAcked == \A c \in Cmds : status[c] # "acked"
=============================================================================

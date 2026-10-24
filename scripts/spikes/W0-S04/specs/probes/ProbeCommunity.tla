--------------------------- MODULE ProbeCommunity ---------------------------
(* W0-S04 probe: a module that EXTENDS a TLA+ community module. Spectacle at
   the pinned commit resolves community modules by fetching them from a fixed
   third-party URL; this probe records that request. *)
EXTENDS Naturals, SequencesExt
VARIABLE x
Init == x = <<>>
Next == x' = Append(x, 1) /\ Len(x) < 2
=============================================================================

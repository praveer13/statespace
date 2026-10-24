--------------------------- MODULE ProbeLargeInit ---------------------------
(* W0-S04 probe: NX * NY distinct initial states and only stuttering steps,
   to count distinct states by Spectacle's 32-bit fingerprints against the
   exact number. *)
EXTENDS Naturals
CONSTANTS NX, NY
VARIABLES x, y
Init == x \in 0..(NX - 1) /\ y \in 0..(NY - 1)
Next == UNCHANGED <<x, y>>
=============================================================================

---------------------------- MODULE ProbeMissing ----------------------------
(* W0-S04 probe: EXTENDS a module that is not served. The parse must fail
   loudly rather than continue with a partial module table. *)
EXTENDS Naturals, NoSuchModule
VARIABLE x
Init == x = 0
Next == x' = x
=============================================================================

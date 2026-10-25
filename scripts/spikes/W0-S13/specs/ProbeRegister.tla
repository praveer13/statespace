---------------------------- MODULE ProbeRegister ----------------------------
(***************************************************************************)
(* W0-S13 probe: which names TLCSet accepts for a named register, and what *)
(* TLCGet("all:named") returns in a postcondition. TraceValidation keeps    *)
(* the highest line counter in such a register. Name is set in the config. *)
(***************************************************************************)
EXTENDS Naturals, TLC, TLCExt

CONSTANT Name
VARIABLE x

Init == x = 0 /\ TLCSet(Name, 1)
Next == x < 2 /\ x' = x + 1 /\ TLCSet(Name, TLCGetOrDefault(Name, 0) + 1)
Registers == PrintT(<<"registers", TLCGet("all:named")>>)
=============================================================================

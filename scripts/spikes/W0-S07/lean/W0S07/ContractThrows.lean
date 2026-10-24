/-
W0-S07 probe: a contract whose rejection is part of the specification, through a
`throws (e : Err) => R` clause. On 4.35.0 the clause is expected not to parse (exit 1); on a
toolchain whose contracts have `throws`, the contract is expected to elaborate (exit 0). The
exception type is ascribed: `throws e => …` cannot find the slot of a custom exception
postcondition type.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true
set_option experimental.intrinsic true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmd Spec.ite

def transferContractThrows : Cmd
    requires ρ s => 0 < ρ.num "amount" ∧ NonNeg s
    ensures _ _ s => NonNeg s
    throws (e : Err) => e = .guardFailed "Transfer"
  := ⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)],
      .ge (.balance (.var "from")) (.var "amount"),
      .move (.var "amount") (.var "from") (.var "to")⟩
where finally
  | spec => all_goals grind [NonNeg]

#check @transferContractThrows.spec

end W0S07

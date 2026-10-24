/-
W0-S07 probe: the same `throws` contract as `ContractThrows.lean`, without the exception type
ascribed: `throws e => R`. On 4.35.0 the clause is expected not to parse; on later toolchains the
clause is expected to fail to find the exception slot of the custom postcondition type `Err → Prop`.
The file is expected to exit 1 everywhere.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true
set_option experimental.intrinsic true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmd Spec.ite

def transferContractThrowsBare : Cmd
    requires ρ s => 0 < ρ.num "amount" ∧ NonNeg s
    ensures _ _ s => NonNeg s
    throws e => e = .guardFailed "Transfer"
  := ⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)],
      .ge (.balance (.var "from")) (.var "amount"),
      .move (.var "amount") (.var "from") (.var "to")⟩
where finally
  | spec => all_goals grind [NonNeg]

end W0S07

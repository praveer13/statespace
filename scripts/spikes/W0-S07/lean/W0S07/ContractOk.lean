/-
W0-S07 probe: a `def … requires … ensures` contract on a `Cmd`-valued definition.
The value is written out as a `Cmd.mk` literal, the lattice-style specs are active, and the
`requires` clause includes the guard: in 4.35.0 a contract has no `throws` clause, so its exception
postcondition is `⊥` and a reachable rejection could not be proved. The file is expected to exit 0.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true
set_option experimental.intrinsic true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmd Spec.ite

def transferContract : Cmd
    requires ρ s => 0 < ρ.num "amount" ∧ ρ.num "amount" ≤ s.bal (ρ.acct "from") ∧ NonNeg s
    ensures _ _ s => NonNeg s
  := ⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)],
      .ge (.balance (.var "from")) (.var "amount"),
      .move (.var "amount") (.var "from") (.var "to")⟩
where finally
  | spec => all_goals grind [NonNeg]

#check @transferContract.spec
#print axioms transferContract.spec

end W0S07

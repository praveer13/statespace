/-
W0-S07 probe: where contracts stop on a command type. Each definition below fails to elaborate,
so the file is expected to exit 1.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true
set_option experimental.intrinsic true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmd Spec.ite

/-! ## F1. The weakened guard as a contract

The deep-embedded twin of the measured shallow probe: `requires 0 < amt ∧ 0 ≤ a`,
`ensures r => 0 ≤ r.1`, with the command's guard weakened to `balance(from) >= 0`. -/

def transferWeakContract : Cmd
    requires ρ s => 0 < ρ.num "amount" ∧ 0 ≤ s.bal (ρ.acct "from")
    ensures _ ρ s => 0 ≤ s.bal (ρ.acct "from")
  := ⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)],
      .ge (.balance (.var "from")) (.lit 0),
      .move (.var "amount") (.var "from") (.var "to")⟩

/-! ## F2. A reachable rejection: with no `throws` clause the exception postcondition is `⊥` -/

def transferContractRejects : Cmd
    requires ρ s => 0 < ρ.num "amount" ∧ NonNeg s
    ensures _ _ s => NonNeg s
  := ⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)],
      .ge (.balance (.var "from")) (.var "amount"),
      .move (.var "amount") (.var "from") (.var "to")⟩
where finally
  | spec => case vc1 => grind [NonNeg]

/-! ## F3. The value is the constant `Transfer`: a contract cannot pass unfolding hints -/

def transferContractConst : Cmd
    requires ρ s => 0 < ρ.num "amount" ∧ ρ.num "amount" ≤ s.bal (ρ.acct "from") ∧ NonNeg s
    ensures _ _ s => NonNeg s
  := Transfer

/-! ## F4. A monadic wrapper that runs the semantics: the interpreter call has no spec -/

def runTransfer (ρ : Env) (s : State) : Except Err State
    requires 0 < ρ.num "amount" ∧ NonNeg s
    ensures s' => NonNeg s'
  := Transfer.exec ρ s

end W0S07

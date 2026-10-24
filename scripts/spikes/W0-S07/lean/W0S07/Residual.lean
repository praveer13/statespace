/-
W0-S07 probe: the obligations `vcgen` leaves when a command is wrong.
Each theorem below is false (`Proved.lean` refutes each one with a witness), so `vcgen` cannot
finish it and the file is expected to exit 1, printing each unproved verification condition as an
unsolved goal.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmd Spec.ite

/-! ## R1. The weakened guard, in the shape of the measured shallow probe

Precondition `0 < amount ∧ 0 ≤ balance(from)`, guard `balance(from) >= 0`, postcondition
`0 ≤ balance(from)`: the deep-embedded counterpart of `requires 0 < amt ∧ 0 ≤ a` with
`ensures r => 0 ≤ r.1`. -/

theorem transferWeakGuard_from_nonneg :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ 0 ≤ s.bal (ρ.acct "from") ⦄ TransferWeakGuard
    ⦃ fun _ ρ s => 0 ≤ s.bal (ρ.acct "from"); fun _ => True ⦄ := by
  vcgen [TransferWeakGuard]

/-! ## R2. The weakened guard against the invariant `NonNeg` -/

theorem transferWeakGuard_nonneg :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ NonNeg s ⦄ TransferWeakGuard
    ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "Transfer" ⦄ := by
  vcgen [TransferWeakGuard]

/-! ## R3. Two debits behind two pre-state guards (aliasing) -/

theorem payTwo_nonneg :
    ⦃ fun ρ s => 0 < ρ.num "n" ∧ 0 < ρ.num "m" ∧ NonNeg s ⦄ PayTwo
    ⦃ fun _ _ s => NonNeg s; fun _ => True ⦄ := by
  vcgen [PayTwo]

end W0S07

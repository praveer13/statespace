/-
W0-S07 probe: the guard written in the upstream IMP example's style, an `if` in the precondition
(`Spec.cmdIf`, `Spec.iteIf`). `vcgen` applies the spec but does not split the `if`, so the
verification condition still holds `wp` of the body; `trace_state` prints it. Unfolding the `wp`
equations by hand then lets `grind` finish, so the file exits 0.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmdIf Spec.iteIf

theorem transfer_nonneg_ifStyle :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ NonNeg s ⦄ Transfer
    ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "Transfer" ⦄ := by
  vcgen [Transfer]
  trace_state
  all_goals simp only [wp_move]
  all_goals grind [NonNeg]

theorem feeTransfer_nonneg_ifStyle :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ 0 < ρ.num "fee" ∧ NonNeg s ⦄ FeeTransfer
    ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "FeeTransfer" ⦄ := by
  vcgen [FeeTransfer]
  trace_state
  all_goals simp only [wp_seq, wp_move, wp_ite, wp_skip, wp_set]
  all_goals grind [NonNeg]

end W0S07

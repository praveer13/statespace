/-
W0-S07 probe: what `vcgen` proves on the Mini-Plinth-style command type.
The guard and `ite` use the lattice style (`Spec.cmd`, `Spec.ite`). Every declaration here
elaborates, so the file is expected to exit 0; `trace_state` prints the verification conditions
`vcgen` leaves before they are discharged.
-/
import W0S07.Cmd

set_option autoImplicit false
set_option experimental.vcgen true

open Std.WP Lean.Order

namespace W0S07

attribute [local spec] Spec.cmd Spec.ite

/-! ## P1. The roadmap's Transfer keeps balances non-negative -/

/-- `vcgen` reduces the triple to one verification condition, printed by `trace_state`;
`grind` closes it. -/
theorem transfer_nonneg :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ NonNeg s ⦄ Transfer
    ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "Transfer" ⦄ := by
  vcgen [Transfer]
  trace_state
  all_goals grind [NonNeg]

/-- The same triple with no step after `vcgen`: `with finish` runs `grind` on the conditions.
The only help is unfolding the invariant's definition first. -/
theorem transfer_nonneg_auto :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ NonNeg s ⦄ Transfer
    ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "Transfer" ⦄ := by
  unfold NonNeg
  vcgen [Transfer] with finish

/-! ## P2. A false guard rejects with `guardFailed` and never commits -/

theorem transfer_rejects :
    ⦃ fun ρ s => s.bal (ρ.acct "from") < ρ.num "amount" ⦄ Transfer
    ⦃ fun _ _ _ => False; fun e => e = .guardFailed "Transfer" ⦄ := by
  vcgen [Transfer] with finish

/-! ## P3. Conservation: the pair sum and the frame (self-transfer included) -/

theorem transfer_pair_sum (B : Int) :
    ⦃ fun ρ s => s.bal (ρ.acct "from") + s.bal (ρ.acct "to") = B ⦄ Transfer
    ⦃ fun _ ρ s => s.bal (ρ.acct "from") + s.bal (ρ.acct "to") = B; fun _ => True ⦄ := by
  vcgen [Transfer] with finish

theorem transfer_frame (s₀ : State) :
    ⦃ fun _ s => s = s₀ ⦄ Transfer
    ⦃ fun _ ρ s => ∀ a, a ≠ ρ.acct "from" → a ≠ ρ.acct "to" → s.bal a = s₀.bal a;
      fun _ => True ⦄ := by
  vcgen [Transfer] with finish

/-! ## P4. Sequencing, `if` and an integer scalar (LAB-4's additions) -/

theorem feeTransfer_nonneg :
    ⦃ fun ρ s => 0 < ρ.num "amount" ∧ 0 < ρ.num "fee" ∧ NonNeg s ⦄ FeeTransfer
    ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "FeeTransfer" ⦄ := by
  vcgen [FeeTransfer]
  trace_state
  all_goals grind [NonNeg]

/-! ## P5. The weakened commands are wrong, not just unproved

Each refutation exhibits a witness, one for every theorem in `Residual.lean`. For the weakened
guard it is the witness class `balance(from) = 0, amount = 1`. -/

/-- A witness environment: `from = "a"`, `to = "b"`, `amount = 1`. -/
def ρ₁ : Env := ⟨fun x => if x = "from" then "a" else "b", fun _ => 1⟩
/-- All balances 0. -/
def s₀ : State := ⟨fun _ => 0, fun _ _ => 0⟩

theorem transferWeakGuard_refuted :
    ¬ ⦃ fun ρ s => 0 < ρ.num "amount" ∧ 0 ≤ s.bal (ρ.acct "from") ⦄ TransferWeakGuard
      ⦃ fun _ ρ s => 0 ≤ s.bal (ρ.acct "from"); fun _ => True ⦄ := by
  intro h
  have := (Triple.iff.mp h) ρ₁ s₀ ⟨by decide, by decide⟩
  simp [TransferWeakGuard, ρ₁, s₀] at this

/-- The weakened guard breaks the invariant too, on the same witness. -/
theorem transferWeakGuard_nonneg_refuted :
    ¬ ⦃ fun ρ s => 0 < ρ.num "amount" ∧ NonNeg s ⦄ TransferWeakGuard
      ⦃ fun _ _ s => NonNeg s; fun e => e = .guardFailed "Transfer" ⦄ := by
  intro h
  have := (Triple.iff.mp h) ρ₁ s₀ ⟨by decide, fun _ _ => by simp [s₀]⟩
  simp [TransferWeakGuard, ρ₁, s₀, NonNeg] at this
  have h' := this "a" (by decide)
  simp at h'

/-- A witness environment for `PayTwo`: `x = y = "a"`, `z = "b"`, `n = m = 1`. -/
def ρ₂ : Env := ⟨fun x => if x = "z" then "b" else "a", fun _ => 1⟩
/-- Account `"a"` holds 1; every other account 0. -/
def s₁ : State := ⟨fun a => if a = "a" then 1 else 0, fun _ _ => 0⟩

theorem payTwo_refuted :
    ¬ ⦃ fun ρ s => 0 < ρ.num "n" ∧ 0 < ρ.num "m" ∧ NonNeg s ⦄ PayTwo
      ⦃ fun _ _ s => NonNeg s; fun _ => True ⦄ := by
  intro h
  have hpre : 0 < ρ₂.num "n" ∧ 0 < ρ₂.num "m" ∧ NonNeg s₁ := by
    refine ⟨by decide, by decide, ?_⟩
    intro a _
    simp only [s₁]
    split <;> decide
  have := (Triple.iff.mp h) ρ₂ s₁ hpre
  simp [PayTwo, ρ₂, s₁, NonNeg] at this
  have h' := this "a" (by decide)
  simp at h'

/-! ## Axioms -/

#print axioms transfer_nonneg
#print axioms transfer_nonneg_auto
#print axioms transfer_rejects
#print axioms transfer_pair_sum
#print axioms transfer_frame
#print axioms feeTransfer_nonneg
#print axioms transferWeakGuard_refuted
#print axioms transferWeakGuard_nonneg_refuted
#print axioms payTwo_refuted

end W0S07

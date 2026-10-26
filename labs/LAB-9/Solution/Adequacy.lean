import Course.Sim

/-!
# LAB-9.4 · the adequacy floor (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem obs_sees_aborts (s₀ : Store) (e : Err) (s : Store) : obs s₀ (.aborted e) ≠ obs s₀ (.committed s) := by
  sorry

theorem obs_sees_errors (s₀ : Store) (e₁ e₂ : Err) : obs s₀ (.aborted e₁) = obs s₀ (.aborted e₂) → e₁ = e₂ := by
  sorry

theorem obs_sees_balances (s₀ s₁ s₂ : Store) :
    obs s₀ (.committed s₁) = obs s₀ (.committed s₂) → ∀ a, s₁ a = s₂ a := by
  sorry

theorem R_init (s : Store) (regs : Regs) : R s regs s := by
  sorry

theorem R_obs (s₀ s : Store) (regs : Regs) (st : Store) :
    R s regs st → obs s₀ (.committed st) = obs s₀ (.committed s) := by
  sorry

end S9

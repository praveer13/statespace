import Course.Sim

/-!
# Pack S9B · LAB-9.4 to LAB-9.10 (read-only)

The adequacy floor for your statement module, then preservation for the fragment, case by case. Every
statement here imports your frozen `S9/Defs.lean` and `S9/Statement.lean`. Each stage's comparator
configuration (`challenge/lab9-<k>.json`) names the theorems it judges and the module of yours that proves
them.
-/

namespace S9

/-! ## LAB-9.4 · the adequacy floor -/

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

/-! ## LAB-9.5 · the expression lemma -/

theorem compE_correct (e : Expr) (r : Nat) (regs : Regs) (st : Store) :
    ∃ regs', exec (compE e r) regs st = .ok (regs', st) ∧ regs' r = evalE st e ∧
      ∀ q, q < r → regs' q = regs q := by
  sorry

/-! ## LAB-9.6 · the posting case -/

theorem move_sim (amt : Expr) (src dst : Acct) (p : List Instr) :
    compile (.move amt src dst) = some p → SimR (.move amt src dst) p := by
  sorry

/-! ## LAB-9.7 · the guard case -/

theorem require_sim (e₁ e₂ : Expr) (err : Err) (p : List Instr) :
    compile (.require e₁ e₂ err) = some p → SimR (.require e₁ e₂ err) p := by
  sorry

/-! ## LAB-9.8 · the sequence case -/

theorem exec_append (p k : List Instr) (regs : Regs) (st : Store) :
    exec (p ++ k) regs st = (exec p regs st).bind (fun rs => exec k rs.1 rs.2) := by
  sorry

theorem seq_commit (c₁ c₂ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁) (h₂ : SimR c₂ p₂)
    (s s₁ : Store) (regs : Regs) (st : Store) (hR : R s regs st) (hc : runS c₁ s = .committed s₁) :
    Follows (runS c₂ s₁) (exec (p₁ ++ p₂) regs st) := by
  sorry

/-! ## LAB-9.9 · the abort cases -/

theorem seq_abort (c₁ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁)
    (s : Store) (regs : Regs) (st : Store) (e : Err) (hR : R s regs st) (ha : runS c₁ s = .aborted e) :
    exec (p₁ ++ p₂) regs st = .error e := by
  sorry

theorem abort_sim (err : Err) (p : List Instr) : compile (.abort err) = some p → SimR (.abort err) p := by
  sorry

theorem skip_sim (p : List Instr) : compile .skip = some p → SimR .skip p := by
  sorry

/-! ## LAB-9.10 · the assembled theorem -/

theorem seq_sim (c₁ c₂ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁) (h₂ : SimR c₂ p₂) :
    SimR (.seq c₁ c₂) (p₁ ++ p₂) := by
  sorry

theorem compile_correct (c : Cmd) (p : List Instr) : compile c = some p → SimR c p := by
  sorry

theorem compile_complete (c : Cmd) : InFragment c → ∃ p, compile c = some p := by
  sorry

theorem preservation (c : Cmd) (p : List Instr) : compile c = some p →
    ∀ (s : Store) (regs : Regs), obs s (runT p regs s) = obs s (runS c s) := by
  sorry

end S9

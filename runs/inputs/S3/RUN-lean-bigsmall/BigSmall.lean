import MiniPlinthRef
open MiniPlinth MiniPlinthRef

/-- S3.L4 cell 2: from mint -100 · a 100 · b 0, `Transfer(a, b, 130)`. -/
def call130 : Call := ⟨"Transfer", [.acct a, .acct b, .int 130]⟩
def env130 : Env := [("from", .acct a), ("to", .acct b), ("amount", .int 130)]

/-- Big step: the reference evaluator answers guardFailed. -/
theorem bigstep_guardFailed : exec refProgram call130 s0 = .error (.guardFailed "Transfer") := by decide

/-- The draft relation reaches the guard configuration... -/
theorem draft_reaches_guard : DraftStep Policy.reference (.bind transfer call130.args s0) (.guard transfer env130 s0) :=
  .bind_ok (by decide) (by decide) (by decide)

/-- ...whose guard is false, and then has no rule: the configuration is stuck. -/
theorem draft_stuck : ∀ c', ¬ DraftStep Policy.reference (.guard transfer env130 s0) c' := by
  intro c' h
  cases h with
  | guard_true hg => exact absurd hg (by decide)

theorem stuck_not_final : ¬ Final (.guard transfer env130 s0) := by
  intro h; cases h

/-- The full relation has the rule from a false guard to `err`, and it agrees with the big step. -/
theorem full_steps_to_error : Step Policy.reference (.guard transfer env130 s0) (.err (.guardFailed "Transfer")) :=
  .guard_false_error (by decide) rfl

#print axioms bigstep_guardFailed
#print axioms draft_reaches_guard
#print axioms draft_stuck
#print axioms stuck_not_final
#print axioms full_steps_to_error

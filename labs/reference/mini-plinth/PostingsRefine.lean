import MiniPlinthRef
/-!
# PostingsRefine: the reference's postings refine the Stage 2 ledger (CL-3.4)

Course proof about the reference module (labs/LAB-3/reference/MiniPlinthRef), not a lab answer: no stage of
LAB-3 asks for it, and it reaches a learner's semantics only through the goldens. `Ledger` and `transfer` are
Stage 2's two-account ledger as the course's spike states them (research/spikes/lean/Ledger.lean).

For two distinct existing user accounts u₁ and u₂ and a positive amount n, `Transfer(u₁, u₂, n)` on the
reference either commits, and the two balances afterwards are Stage 2's `transfer` (here `ledgerTransfer`) of the two before, or fails
its guard exactly when Stage 2's `transfer` leaves the ledger unchanged. With u₁ = u₂ the square does not
commute: Stage 2 moves n between two fields, and the reference changes nothing (`self_transfer_outside`).
-/
namespace PostingsRefine
open MiniPlinth MiniPlinthRef

structure Ledger where
  a : Int
  b : Int
  deriving DecidableEq, Repr

/-- Stage 2's transfer: rejected (state unchanged) unless 0 ≤ n ≤ a. -/
def ledgerTransfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

/-- The two accounts' balances, as Stage 2's ledger. -/
def toLedger (u₁ u₂ : String) (s : State) : Ledger := ⟨s.bal (.user u₁), s.bal (.user u₂)⟩

def transferCall' (u₁ u₂ : String) (n : Int) : Call := ⟨"Transfer", [.acct (.user u₁), .acct (.user u₂), .int n]⟩

theorem postings_refine_ledger (s : State) (u₁ u₂ : String) (n : Int)
    (hne : u₁ ≠ u₂) (h₁ : s.hasAcct (.user u₁) = true) (h₂ : s.hasAcct (.user u₂) = true) (hn : 0 < n) :
    (n ≤ s.bal (.user u₁) →
      ∃ s', exec refProgram (transferCall' u₁ u₂ n) s = .ok (s', [], [.notify (.user u₂)]) ∧
        toLedger u₁ u₂ s' = ledgerTransfer (toLedger u₁ u₂ s) n) ∧
    (¬ n ≤ s.bal (.user u₁) →
      exec refProgram (transferCall' u₁ u₂ n) s = .error (.guardFailed "Transfer") ∧
        ledgerTransfer (toLedger u₁ u₂ s) n = toLedger u₁ u₂ s) := by
  have hne' : Acct.user u₂ ≠ Acct.user u₁ := fun h => hne (by cases h; rfl)
  constructor
  · intro hle
    refine ⟨post s (.user u₁) (.user u₂) n, ?_, ?_⟩
    · simp [exec, execWith, transferCall', refProgram, findCmd, MiniPlinthRef.transfer, Policy.reference, bindArgs, hn,
        firstMissing, h₁, h₂, evalExpr, Env.get, hle, runStmt, resolve, resolveAmount, evalInt, evalAcct, applyOp,
        opOutput, opEffects, notifyIf]
    · have h0 : (0 : Int) ≤ n := by omega
      have hne'' : Acct.user u₁ ≠ Acct.user u₂ := fun h => hne (by cases h; rfl)
      simp [toLedger, ledgerTransfer, post, State.bal_setBal_other _ _ _ _ hne', State.bal_setBal_other _ _ _ _ hne'',
        State.bal_setBal_same, hle, h0]
  · intro hlt
    refine ⟨?_, ?_⟩
    · simp [exec, execWith, transferCall', refProgram, findCmd, MiniPlinthRef.transfer, Policy.reference, bindArgs, hn,
        firstMissing, h₁, h₂, evalExpr, Env.get, hlt]
    · simp [ledgerTransfer, toLedger, hlt]

/-- Outside the square: with one account named twice, Stage 2 moves n between its two fields, and the
reference's self-transfer changes nothing. -/
theorem self_transfer_outside :
    exec refProgram (transferCall' "a" "a" 5) { bals := [(.mint, -10), (.user "a", 10)] } =
      .ok ({ bals := [(.mint, -10), (.user "a", 10)] }, [], [.notify (.user "a")]) ∧
    ledgerTransfer ⟨10, 10⟩ 5 = ⟨5, 15⟩ := by
  decide

end PostingsRefine

#print axioms PostingsRefine.postings_refine_ledger
#print axioms PostingsRefine.self_transfer_outside

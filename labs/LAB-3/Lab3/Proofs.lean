import Lab3.Eval
import Lab3Challenge.Defs
/-!
# Lab3.Proofs: the step invariant (LAB-3.4, LAB-3.5)

Each theorem's statement is pinned in `challenge/Lab3Challenge/Statements.lean`: `lake comparator` accepts a
proof here only when its statement is exactly the pinned one. Replace each `sorry` with a proof; keep the
statements as they are. LAB-3.4 proves the per-operation lemmas without `grind` (`omega` is fine); LAB-3.5
assembles the theorem over every successful step. The template's state lemmas (`setBal_wf`,
`total_setBal`, `nonneg_setBal`, `bal_nonneg`, `inv_of_bals_eq`) and guard lemmas (`evalBool_and`,
`evalBool_ge_balance`) are in `MiniPlinth/Core.lean`.
-/
namespace Lab3
open MiniPlinth

/-! ## LAB-3.4: one lemma per operation, from `post_inv` -/

theorem post_inv (s : State) (x y : Acct) (n : Int)
    (hn : 0 < n) (hcov : x = .mint ∨ n ≤ s.bal x) (hs : Inv s) :
    Inv (post s x y n) := by
  sorry  -- TODO(you)

theorem deposit_inv (s s' : State) (n : Amount) (a : Acct)
    (h : applyOp (.deposit n a) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry  -- TODO(you)

theorem move_inv (s s' : State) (n : Amount) (x y : Acct)
    (hcov : n.val ≤ s.bal x) (h : applyOp (.move n x y) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry  -- TODO(you)

theorem hold_inv (s s' : State) (n : Amount) (x : Acct)
    (hcov : n.val ≤ s.bal x) (h : applyOp (.hold n x) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry  -- TODO(you)

theorem capture_inv (s s' : State) (hid : HoldId) (y : Acct)
    (h : applyOp (.capture hid y) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry  -- TODO(you)

theorem release_inv (s s' : State) (hid : HoldId)
    (h : applyOp (.release hid) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry  -- TODO(you)

/-! ## LAB-3.5: the theorem over every successful step -/

theorem covers_sound (g x n : Expr) (env : Env) (s : State) (a : Acct) (k : Int)
    (hc : Covers g x n) (hg : evalBool env s g = true)
    (hx : evalAcct env s x = some a) (hk : evalInt env s n = some k) :
    k ≤ s.bal a := by
  sorry  -- TODO(you)

theorem step_preserves_inv (p : Program) (c : Call) (s s' : State) (o : Output) (es : List Effect)
    (hp : p.WellTyped) (hs : Inv s) (h : exec p c s = .ok (s', o, es)) :
    Inv s' := by
  sorry  -- TODO(you)

end Lab3

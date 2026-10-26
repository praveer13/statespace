import Lab3.Eval
import Lab3Challenge.Defs
/-!
# Lab3Challenge.Statements: the pinned statements of LAB-3.4 and LAB-3.5 (read-only)

Course text, hashed into every receipt (statement-hash@1). `lake comparator` checks that each theorem of the
same name in your `Lab3/Proofs.lean` proves exactly this statement, about your definitions, with no axiom
outside `propext`, `Quot.sound` and `Classical.choice`. You own the definitions these statements mention;
the goldens check that they mean what the reference means.
-/
namespace Lab3
open MiniPlinth

/-! ## LAB-3.4: one lemma per operation, from `post_inv` -/

theorem post_inv (s : State) (x y : Acct) (n : Int)
    (hn : 0 < n) (hcov : x = .mint ∨ n ≤ s.bal x) (hs : Inv s) :
    Inv (post s x y n) := by
  sorry

theorem deposit_inv (s s' : State) (n : Amount) (a : Acct)
    (h : applyOp (.deposit n a) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry

theorem move_inv (s s' : State) (n : Amount) (x y : Acct)
    (hcov : n.val ≤ s.bal x) (h : applyOp (.move n x y) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry

theorem hold_inv (s s' : State) (n : Amount) (x : Acct)
    (hcov : n.val ≤ s.bal x) (h : applyOp (.hold n x) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry

theorem capture_inv (s s' : State) (hid : HoldId) (y : Acct)
    (h : applyOp (.capture hid y) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry

theorem release_inv (s s' : State) (hid : HoldId)
    (h : applyOp (.release hid) s = .ok s') (hs : Inv s) :
    Inv s' := by
  sorry

/-! ## LAB-3.5: the theorem over every successful step -/

theorem covers_sound (g x n : Expr) (env : Env) (s : State) (a : Acct) (k : Int)
    (hc : Covers g x n) (hg : evalBool env s g = true)
    (hx : evalAcct env s x = some a) (hk : evalInt env s n = some k) :
    k ≤ s.bal a := by
  sorry

theorem step_preserves_inv (p : Program) (c : Call) (s s' : State) (o : Output) (es : List Effect)
    (hp : p.WellTyped) (hs : Inv s) (h : exec p c s = .ok (s', o, es)) :
    Inv s' := by
  sorry

end Lab3

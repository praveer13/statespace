import Std

/-! W0-S10 corpus: proof shapes that Goal Replay strips must cover. Core Lean 4 plus Std. -/

/-- The net of a sequence of postings. -/
def net : List Int → Int
  | [] => 0
  | x :: xs => x + net xs

theorem net_append (xs ys : List Int) : net (xs ++ ys) = net xs + net ys := by
  induction xs with
  | nil => simp [net]
  | cons x xs ih =>
    simp [net, ih]
    omega

theorem guard_leaves_funds (n a : Int) (h : 0 ≤ n ∧ n ≤ a) : 0 ≤ a - n := by
  obtain ⟨h0, h1⟩ := h
  omega

theorem and_swap_example (p q : Prop) (hp : p) (hq : q) : q ∧ p := by
  constructor
  · exact hq
  · exact hp

theorem add_comm_example (x y : Int) : x + y = y + x := by
  rw [Int.add_comm]

theorem std_empty_size : (Std.HashMap.emptyWithCapacity : Std.HashMap Nat Nat).size = 0 := by
  simp

theorem and_intro_example (p q : Prop) (hp : p) (hq : q) : p ∧ q := by
  exact ⟨hp,
    hq⟩

#print axioms net_append

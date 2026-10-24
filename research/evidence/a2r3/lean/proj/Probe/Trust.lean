import Std.Tactic.BVDecide
theorem by_decide : 2 ^ 10 = 1024 := by decide
theorem by_native : 2 ^ 64 % 7 = 2 := by native_decide
theorem by_bv (x : BitVec 8) : x + 0 = x := by bv_decide
theorem by_omega (x y : Int) (h : x ≤ y) : x - 1 < y := by omega
theorem by_classical (p : Prop) : p ∨ ¬p := Classical.em p

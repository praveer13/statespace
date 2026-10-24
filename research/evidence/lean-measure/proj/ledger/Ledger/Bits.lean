import Std.Tactic.BVDecide
-- 64-bit wraparound: the "proved over Int" guard fails over UInt64/BitVec 64
theorem guard_ok_int (a amt : Int) (h : amt ≤ a) : 0 ≤ a - amt ∨ a < 0 := by omega

theorem bv_sub_no_wrap (a amt : BitVec 64) (h : amt ≤ a) : a - amt ≤ a := by bv_decide

-- a false claim: subtraction never wraps (bv_decide should produce a counterexample)
-- theorem bv_sub_never_wraps (a amt : BitVec 64) : a - amt ≤ a := by bv_decide

theorem small_kernel : (List.range 50).foldl (· + ·) 0 = 1225 := by decide +kernel
theorem small_native : (List.range 5000).foldl (· + ·) 0 = 12497500 := by decide +native

#print axioms guard_ok_int
#print axioms bv_sub_no_wrap
#print axioms small_kernel
#print axioms small_native

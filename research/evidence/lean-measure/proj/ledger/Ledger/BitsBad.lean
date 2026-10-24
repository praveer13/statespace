import Std.Tactic.BVDecide
theorem bv_sub_never_wraps (a amt : BitVec 64) : a - amt ≤ a := by bv_decide

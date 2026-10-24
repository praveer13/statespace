import Std.Tactic.BVDecide
theorem bv_sat (x y : BitVec 16) : (x ^^^ y) + 2 * (x &&& y) = x + y := by bv_decide
theorem bv_sat2 (x y : BitVec 32) : x * y = y * x := by bv_decide
-- signed-overflow fact relevant to S1.4: adding a positive amount to a non-negative i64 can go negative
theorem bv_wrap : ∃ b x : BitVec 64, b.slt 0 = false ∧ (0 : BitVec 64).slt x = true ∧ (b + x).slt 0 = true :=
  ⟨BitVec.ofInt 64 (2^63 - 1), 1, by decide, by decide, by decide⟩
#print axioms bv_sat
#print axioms bv_sat2
#print axioms bv_wrap

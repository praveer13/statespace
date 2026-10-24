-- deliberately untrustworthy specimens
theorem big_native : (2^64 : Nat) % 7 = 2 := by native_decide
theorem by_decide : (2^10 : Nat) % 7 = 2 := by decide
theorem with_sorry : (1 : Nat) = 2 := by sorry
axiom cheat : False
theorem with_axiom : (1 : Nat) = 2 := cheat.elim
#print axioms big_native
#print axioms by_decide
#print axioms with_sorry
#print axioms with_axiom

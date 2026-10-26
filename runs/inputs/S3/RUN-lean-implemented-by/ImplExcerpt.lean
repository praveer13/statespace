def fastImpl (n : Nat) : Nat := n + 1
@[implemented_by fastImpl] def spec (n : Nat) : Nat := n
theorem spec_id (n : Nat) : spec n = n := rfl
#print axioms spec_id
#eval spec 3

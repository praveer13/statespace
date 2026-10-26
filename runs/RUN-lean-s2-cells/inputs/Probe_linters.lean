def net : List Int → Int
  | [] => 0
  | x :: xs => x + net xs

-- a proposition declared with `def`
def net_nil : net [] = 0 := rfl

-- an unused variable
theorem net_single (x : Int) (h : 0 ≤ x) : net [x] = x := by
  simp [net]

-- an unused simp argument
theorem net_append (xs ys : List Int) : net (xs ++ ys) = net xs + net ys := by
  induction xs with
  | nil => simp [net, Nat.add_comm]
  | cons x xs ih => simp [net, ih, Int.add_assoc]

-- a deprecated name
example (k : Nat) : 0 ≤ (k : Int) := Int.ofNat_nonneg k

def net : List Int → Int
  | [] => 0
  | x :: xs => x + net xs

theorem net_append (xs ys : List Int) : net (xs ++ ys) = net xs + net ys := by
  induction xs with
  | nil => simp [net]
  | cons x xs ih => simp [net, ih, Int.add_assoc]

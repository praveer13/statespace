def net : List Int → Int
  | [] => 0
  | x :: xs => x + net xs

theorem net_append (xs ys : List Int) : net (xs ++ ys) = net xs + net ys := by
  induction xs with
  | nil => simp [net]
  | cons x xs ih => simp [net, ih, Int.add_assoc]

theorem net_append_loop (xs ys : List Int) : net (xs ++ ys) = net xs + net ys := by
  cases xs with
  | nil => simp [net]
  | cons x xs => exact net_append_loop (x :: xs) ys

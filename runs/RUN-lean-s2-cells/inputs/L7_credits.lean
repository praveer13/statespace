def credits (acc : Int) : List Int → Int
  | [] => acc
  | x :: xs => credits (acc + x) xs

theorem credits_eq (acc : Int) (xs : List Int) :
    credits acc xs = acc + xs.sum := by
  induction xs generalizing acc with
  | nil => simp [credits]
  | cons x xs ih => sorry   -- the case in question

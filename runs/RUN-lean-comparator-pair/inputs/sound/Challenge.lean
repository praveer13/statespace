def transfer (a b amt : Int) : Int × Int :=
  if 0 < amt ∧ amt ≤ a then (a - amt, b + amt) else (a, b)

theorem conserves (a b amt : Int) :
    (transfer a b amt).1 + (transfer a b amt).2 = a + b := by
  sorry

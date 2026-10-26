def transfer (a b amt : Int) : Int × Int :=
  if 0 < amt ∧ amt ≤ a then (a - amt, b + amt) else (a, b)

-- The sequence arm of the hoisted compile, reduced to arithmetic.
example (amt bal : Int) (h : amt ≤ bal) : amt ≤ bal - amt := by
  omega

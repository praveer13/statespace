
-- The challenge's pinned statement, checked against the solution's theorem: an elaboration error means the
-- solution's step_preserves_inv is not the pinned statement.
theorem pinned (c : Cmd) (s s' : State) :
    HasType c → NonNeg s → exec c s = .ok s' → NonNeg s' :=
  step_preserves_inv c s s'

theorem step_preserves_inv (p : Program) (c : Call) (s s' : State) (o : Output) (es : List Effect)
    (hp : p.WellTyped) (hs : Inv s) (h : exec p c s = .ok (s', o, es)) :
    Inv s' := by
  simp [exec] at h


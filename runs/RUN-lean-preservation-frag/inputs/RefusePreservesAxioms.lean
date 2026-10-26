def Preserves {Cmd Prog Obs : Type} (compile : Cmd → Option Prog)
    (obsS : Cmd → Obs) (obsT : Prog → Obs) : Prop :=
  ∀ c p, compile c = some p → obsT p = obsS c

-- a "compiler" that refuses every command
def refuse {Cmd Prog : Type} : Cmd → Option Prog := fun _ => none

theorem refuse_preserves {Cmd Prog Obs : Type} (obsS : Cmd → Obs) (obsT : Prog → Obs) :
    Preserves (refuse : Cmd → Option Prog) obsS obsT := by
  unfold Preserves
  intro c p h
  simp [refuse] at h

#print axioms refuse_preserves

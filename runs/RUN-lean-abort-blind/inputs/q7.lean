
-- q7
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .add 2 1 0,
   .write .a1 2,
   .read 3 .a2,
   .sub 3 3 0,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Int := (r.err?, (view s r).1 + (view s r).2)

theorem preservation (amt : Int) (s : Store) (regs : Regs) :
    obs s (runT (compile amt) regs s) = obs s (runS amt s) := by
  obtain ⟨x, y⟩ := s
  unfold compile runS
  by_cases h1 : amt ≤ 0
  · have h1' : ¬ (0 < amt) := by omega
    simp [runT, upd, obs, view, Outcome.err?, Outcome.isAbort, bal, put, h1, h1']
  · have hp : 0 < amt := by omega
    by_cases h2 : x < amt
    · have h2' : ¬ (amt ≤ x) := by omega
      simp [runT, upd, obs, view, Outcome.err?, Outcome.isAbort, bal, put, h1, hp, h2, h2']
    · have h2' : amt ≤ x := by omega
      simp [runT, upd, obs, view, Outcome.err?, Outcome.isAbort, bal, put, h1, hp, h2, h2']
      all_goals omega

#print axioms preservation

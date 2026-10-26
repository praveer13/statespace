structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b

def noGuard (s : Ledger) (n : Int) : Ledger :=
  { a := s.a - n, b := s.b + n }

theorem noGuard_conserves (s : Ledger) (n : Int) :
    total (noGuard s n) = total s := by
  unfold noGuard total
  simp <;> omega

theorem noGuard_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :
    0 ≤ (noGuard s n).a ∧ 0 ≤ (noGuard s n).b := by
  unfold noGuard
  simp <;> omega

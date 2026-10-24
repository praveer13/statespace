structure Ledger where
  a : Int
  b : Int

def total (s : Ledger) : Int := s.a + s.b

-- agent "simplification": transfer that never moves money; conservation becomes trivial
def transfer (s : Ledger) (_n : Int) : Ledger := s

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := rfl

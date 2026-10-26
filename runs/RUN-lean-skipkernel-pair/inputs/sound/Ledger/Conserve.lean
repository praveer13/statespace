import Ledger.Transfer

theorem conserves (a b amt : Int) :
    (transfer a b amt).1 + (transfer a b amt).2 = a + b := by
  unfold transfer
  split <;> simp <;> omega

import Ledger.Transfer
import Ledger.Arith

theorem transfer_conserves (l : Ledger) (amt : Int) :
    (transfer l amt).a + (transfer l amt).b = l.a + l.b := by
  unfold transfer
  split
  · exact rebalance l.a l.b amt
  · rfl

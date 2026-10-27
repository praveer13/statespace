import Ledger.Transfer
import Ledger.Fast

theorem conserves (a b amt : Int) :
    (transfer a b amt).1 + (transfer a b amt).2 = a + b :=
  conserves_fast a b amt

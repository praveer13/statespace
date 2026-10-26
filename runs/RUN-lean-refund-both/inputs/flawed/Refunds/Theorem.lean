import Refunds.Refund

theorem refund_nonneg (s : State) (p : PaymentId) (amt : Int)
    (hInv : NonNeg s) (hPos : 0 ≤ amt) :
    0 ≤ (refund s p amt).balance (s.payments p).customer := by
  have := hInv (s.payments p).customer
  unfold refund
  split
  · simp only
    split
    · next h => rw [h]; omega
    · simp; omega
  · exact this

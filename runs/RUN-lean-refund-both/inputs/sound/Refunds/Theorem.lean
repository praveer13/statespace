import Refunds.Refund

theorem refund_nonneg (s : State) (p : PaymentId) (amt : Int)
    (hInv : NonNeg s) (hPos : 0 ≤ amt) :
    NonNeg (refund s p amt) := by
  intro j
  have := hInv j
  unfold refund
  split
  · simp only
    split
    · next hj => subst hj; omega
    · split <;> omega
  · exact this

abbrev AccountId := Nat
abbrev PaymentId := Nat

structure Payment where
  customer : AccountId
  merchant : AccountId

structure State where
  balance  : AccountId → Int
  payments : PaymentId → Payment

def NonNeg (s : State) : Prop := ∀ j, 0 ≤ s.balance j

/-- Refund `amt` of payment `p`: the merchant pays the customer back, if the merchant holds `amt`. -/
def refund (s : State) (p : PaymentId) (amt : Int) : State :=
  if amt ≤ s.balance (s.payments p).merchant then
    { s with balance := fun j =>
        if j = (s.payments p).merchant then s.balance j - amt
        else if j = (s.payments p).customer then s.balance j + amt
        else s.balance j }
  else s

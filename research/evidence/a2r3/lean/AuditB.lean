notation "ℤ" => Int   -- Mathlib provides this notation; core does not
abbrev AccountId := Nat
abbrev PaymentId := Nat
structure Payment where
  customer : AccountId
  merchant : AccountId
structure State where
  balance  : AccountId → ℤ
  payments : PaymentId → Payment
def Function.update (f : AccountId → ℤ) (k : AccountId) (g : ℤ → ℤ) : AccountId → ℤ :=
  fun j => if j = k then g (f j) else f j
def NonNeg (s : State) : Prop := ∀ a, 0 ≤ s.balance a

def refund (s : State) (p : PaymentId) (amt : ℤ) : State :=
  let pay := s.payments p
  { s with balance := s.balance.update pay.customer (· + amt)
                               .update pay.merchant (· - amt) }

theorem refund_nonneg (s : State) (p : PaymentId) (amt : ℤ)
    (hInv : NonNeg s) (hPos : 0 ≤ amt) :
    0 ≤ (refund s p amt).balance (s.payments p).customer := by
  simp [refund]; have := hInv (s.payments p).customer; omega

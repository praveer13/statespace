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
                               |>.update pay.merchant (· - amt) }

theorem refund_nonneg (s : State) (p : PaymentId) (amt : ℤ)
    (hInv : NonNeg s) (hPos : 0 ≤ amt) :
    0 ≤ (refund s p amt).balance (s.payments p).customer := by
  have h := hInv (s.payments p).customer
  simp only [refund, Function.update]
  split <;> split <;> simp_all <;> omega

-- the gap the audit wants found: the merchant is not protected
theorem refund_breaks_inv : ∃ (s : State) (p : PaymentId) (amt : ℤ),
    NonNeg s ∧ 0 ≤ amt ∧ ¬ NonNeg (refund s p amt) := by
  refine ⟨⟨fun _ => 0, fun _ => ⟨0, 1⟩⟩, 0, 50, fun _ => Int.le_refl 0, by decide, ?_⟩
  intro h
  have := h 1
  simp [refund, Function.update] at this

#print axioms refund_nonneg
#print axioms refund_breaks_inv

-- Mathlib-style VALUE update (the reading `Function.update` would force), syntax repaired.
namespace Function
def update {α : Sort u} {β : α → Sort v} [DecidableEq α] (f : ∀ a, β a) (a' : α) (v : β a') (a : α) : β a :=
  if h : a = a' then Eq.ndrec v h.symm else f a
end Function
abbrev AccountId := Nat
abbrev PaymentId := Nat
structure Payment where
  customer : AccountId
  merchant : AccountId
structure State where
  balance  : AccountId → Int
  payments : PaymentId → Payment
def NonNeg (s : State) : Prop := ∀ a, 0 ≤ s.balance a
def refund (s : State) (p : PaymentId) (amt : Int) : State :=
  let pay := s.payments p
  { s with balance := Function.update (Function.update s.balance pay.customer (s.balance pay.customer + amt))
                         pay.merchant (s.balance pay.merchant - amt) }
-- The audited statement is FALSE here: a self-refund (customer = merchant) debits without crediting.
theorem refund_nonneg_false : ¬ ∀ (s : State) (p : PaymentId) (amt : Int),
    NonNeg s → 0 ≤ amt → 0 ≤ (refund s p amt).balance (s.payments p).customer := by
  intro h
  have := h ⟨fun _ => 0, fun _ => ⟨0, 0⟩⟩ 0 5 (fun _ => Int.le_refl 0) (by decide)
  simp [refund, Function.update] at this
#print axioms refund_nonneg_false

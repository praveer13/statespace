abbrev State := List (String × Int)

def bal (s : State) (a : String) : Int := (s.lookup a).getD 0

inductive E where
  | num  : Int → E
  | acct : String → E
  | bal  : E → E
  | ge   : E → E → E
  | tt   : E
  | ff   : E

/-- One small step of an expression, left to right. -/
inductive Step (s : State) : E → E → Prop
  | bal_acct (a : String) : Step s (.bal (.acct a)) (.num (bal s a))
  | bal_cong {e e' : E} : Step s e e' → Step s (.bal e) (.bal e')
  | ge_left {e₁ e₁' e₂ : E} : Step s e₁ e₁' → Step s (.ge e₁ e₂) (.ge e₁' e₂)
  | ge_right {n : Int} {e₂ e₂' : E} : Step s e₂ e₂' → Step s (.ge (.num n) e₂) (.ge (.num n) e₂')
  | ge_num (m n : Int) : Step s (.ge (.num m) (.num n)) (if n ≤ m then .tt else .ff)

/-- `balance(30)`: no rule applies, so there is no next expression. -/
theorem balance_num_stuck (s : State) (n : Int) : ∀ e', ¬ Step s (.bal (.num n)) e' := by
  intro e' h
  cases h with
  | bal_cong h' => cases h'

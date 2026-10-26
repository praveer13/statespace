abbrev Acct := Nat
abbrev Store := Acct → Int

inductive AExp where
  | n (v : Int)
  | bal (a : Acct)
  | plus (e₁ e₂ : AExp)

def aval : AExp → Store → Int
  | .n v, _ => v
  | .bal a, s => s a
  | .plus e₁ e₂, s => aval e₁ s + aval e₂ s

inductive Instr where
  | loadi (v : Int)
  | load (a : Acct)
  | add

def exec1 (s : Store) : Instr → List Int → List Int
  | .loadi v, stk => v :: stk
  | .load a, stk => s a :: stk
  | .add, j :: i :: stk => (i + j) :: stk
  | .add, stk => stk

def exec (s : Store) : List Instr → List Int → List Int
  | [], stk => stk
  | i :: is, stk => exec s is (exec1 s i stk)

def comp : AExp → List Instr
  | .n v => [.loadi v]
  | .bal a => [.load a]
  | .plus e₁ e₂ => comp e₁ ++ comp e₂ ++ [.add]

theorem exec_append (s : Store) (p q : List Instr) (stk : List Int) :
    exec s (p ++ q) stk = exec s q (exec s p stk) := by
  induction p generalizing stk with
  | nil => rfl
  | cons i is ih => simp [exec, ih]

theorem exec_comp (s : Store) (e : AExp) (stk : List Int) :
    exec s (comp e) stk = aval e s :: stk := by
  induction e generalizing stk with
  | n v => rfl
  | bal a => rfl
  | plus e₁ e₂ ih₁ ih₂ =>
    simp only [comp]
    rw [exec_append, exec_append, ih₁, ih₂]
    rfl

-- the same induction with `generalizing stk` left out
theorem exec_comp_narrow (s : Store) (e : AExp) (stk : List Int) :
    exec s (comp e) stk = aval e s :: stk := by
  induction e with
  | n v => rfl
  | bal a => rfl
  | plus e₁ e₂ ih₁ ih₂ =>
    simp only [comp]
    rw [exec_append, exec_append, ih₁, ih₂]
    rfl

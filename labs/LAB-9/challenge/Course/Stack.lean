/-!
# LAB-9.2 · the stack machine (course module, read-only)

Isabelle HOL-IMP's `ASM` theory, ported to Lean with the stack explicit: expressions over balances, a
three-instruction stack machine and its compiler. `exec1 add` is total: on a stack with fewer than two
values it leaves the stack alone, a junk case that compiled code never reaches.

Pack S9A pins two theorems about these definitions; `Challenge/S9A.lean` states them and you prove them in
`Solution/S9A.lean`.
-/

namespace S9A

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

end S9A

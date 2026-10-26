/-
LAB-2.1's reference module: a proof of `transfer_conserves`. Reference module, earns nothing.

It is the only proof this pack ships. `statespace check lab2.1` runs it through the same pipeline as your
stages (build, `#print axioms`, `lake comparator` with stages/LAB-2.1/comparator.json, which names
`Reference` as the solution module), so that you read a receipt before you write a proof. Copied into
Solution.lean it fails LAB-2.2's manual-mode scan, because `omega` closes its arithmetic.
-/

structure Ledger where
  a : Int
  b : Int
deriving Repr, DecidableEq

def total (s : Ledger) : Int := s.a + s.b
def transfer (s : Ledger) (n : Int) : Ledger :=
  if 0 ≤ n ∧ n ≤ s.a then { a := s.a - n, b := s.b + n } else s

theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by
  unfold transfer total
  split <;> simp <;> omega

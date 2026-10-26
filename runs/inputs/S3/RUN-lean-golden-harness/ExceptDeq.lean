/-! The same goldens, after `deriving instance DecidableEq for Except`. -/
deriving instance DecidableEq for Except

inductive Err where
  | guardFailed (name : String)
  deriving DecidableEq

def exec (n : Nat) : Except Err Nat :=
  if n = 0 then .error (.guardFailed "Transfer") else .ok (n - 1)

theorem golden_ok : exec 3 = .ok 2 := by decide
theorem golden_err : exec 0 = .error (.guardFailed "Transfer") := by decide

#print axioms golden_ok
#print axioms golden_err

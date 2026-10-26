/-! Golden over an `Except` outcome, with no `DecidableEq` instance for `Except` declared. -/
inductive Err where
  | guardFailed (name : String)
  deriving DecidableEq

def exec (n : Nat) : Except Err Nat :=
  if n = 0 then .error (.guardFailed "Transfer") else .ok (n - 1)

theorem golden_ok : exec 3 = .ok 2 := by decide
theorem golden_err : exec 0 = .error (.guardFailed "Transfer") := by decide

import Course.Run

/-!
# Pack S9IR · LAB-9.3 (read-only)

Goldens for your IR semantics and your compiler, each over a decidable view of the outcome, so `decide`
closes them once `S9/Defs.lean` is right; and the determinism lemma. Prove them in `Solution/S9IR.lean`.
-/

namespace S9

/-! IR goldens, from the store (a0, a1) = (5, 0) -/

/-- A write, then `abort`: the run ends in the error, and its write is discarded. -/
theorem golden_write_then_abort :
    (runT [.ldi 0 9, .write 0 0, .abort .denied] zeroRegs (store [5, 0])).view 2 = .inl .denied := by
  sorry

/-- A failing `assertGe` returns its error before the write after it. -/
theorem golden_assert_fails :
    (runT [.ldi 0 1, .ldi 1 2, .assertGe 0 1 .insufficient, .ldi 2 9, .write 0 2] zeroRegs (store [5, 0])).view 2
      = .inl .insufficient := by
  sorry

/-- A `writeIf` whose condition fails changes nothing, and the run commits. -/
theorem golden_writeIf_silent :
    (runT [.ldi 0 1, .ldi 1 2, .ldi 2 9, .writeIf 0 1 0 2] zeroRegs (store [5, 0])).view 2 = .inr [5, 0] := by
  sorry

/-- A `writeIf` whose condition holds writes. -/
theorem golden_writeIf_writes :
    (runT [.ldi 0 2, .ldi 1 1, .ldi 2 9, .writeIf 0 1 0 2] zeroRegs (store [5, 0])).view 2 = .inr [9, 0] := by
  sorry

/-! Compiler goldens -/

/-- `transfer 30 1 2` moves the amount. -/
theorem golden_transfer :
    ((compile (transfer 30 1 2)).map fun p => (runT p zeroRegs (store [0, 50, 10])).view 3)
      = some (.inr [0, 20, 40]) := by
  sorry

/-- A self-transfer nets to zero. -/
theorem golden_self_transfer :
    ((compile (transfer 5 1 1)).map fun p => (runT p zeroRegs (store [0, 50])).view 2)
      = some (.inr [0, 50]) := by
  sorry

/-- `move (bal src) src dst` moves the whole balance: the amount is evaluated once, before the debit. -/
theorem golden_move_whole_balance :
    ((compile (.move (.bal 1) 1 2)).map fun p => (runT p zeroRegs (store [0, 7, 3])).view 3)
      = some (.inr [0, 0, 10]) := by
  sorry

/-- A non-positive amount aborts. -/
theorem golden_non_positive :
    ((compile (transfer 0 1 2)).map fun p => (runT p zeroRegs (store [0, 50, 10])).view 3)
      = some (.inl .nonPositive) := by
  sorry

/-- Insufficient funds abort. -/
theorem golden_insufficient :
    ((compile (transfer 60 1 2)).map fun p => (runT p zeroRegs (store [0, 50, 10])).view 3)
      = some (.inl .insufficient) := by
  sorry

/-- `transfer` is in your fragment, so `compile_complete` cannot hold vacuously. -/
theorem golden_transfer_in_fragment (amt : Int) (src dst : Acct) : InFragment (transfer amt src dst) := by
  sorry

/-- `exec` is a function: one program and one starting state give one outcome. -/
theorem exec_deterministic (p : List Instr) (regs : Regs) (st : Store) (o₁ o₂ : Except Err (Regs × Store)) :
    exec p regs st = o₁ → exec p regs st = o₂ → o₁ = o₂ := by
  sorry

end S9

import Course.Source

/-!
# LAB-9.3 · the IR's semantics and the compiler (yours)

The receipt of LAB-9.3 freezes this file by its statement hash: from LAB-9.4 on, the course's statements
build on it, so a later edit voids CL-9.2 until the affected checks pass again.

The lint of LAB-9.c3 refuses `native_decide`, `implemented_by`, `extern`, `partial` and `unsafe` here.
-/

namespace S9

/-- One IR instruction, run on a register file and a store. An error ends the run.

TODO(you): give each of the seven instructions its meaning (S9.L3). `assertGe r₁ r₂ err` continues when
`regs r₂ ≤ regs r₁` and fails with `err` otherwise; `writeIf r₁ r₂ a r` writes `regs r` to account `a` only
when `regs r₂ ≤ regs r₁`; `abort err` fails with `err`. The placeholder below does nothing at every step. -/
def step : Instr → Regs → Store → Except Err (Regs × Store)
  | _, regs, st => .ok (regs, st)

/-- A program runs one instruction at a time and stops at the first error. -/
def exec : List Instr → Regs → Store → Except Err (Regs × Store)
  | [], regs, st => .ok (regs, st)
  | i :: is, regs, st =>
      match step i regs st with
      | .ok (regs', st') => exec is regs' st'
      | .error e => .error e

/-- Compile an expression so that its value lands in register `r`, and only registers `r` and above change.

TODO(you): the four cases. The placeholder emits no code. -/
def compE : Expr → Nat → List Instr
  | _, _ => []

/-- The compiler. `none` means "this command is not compiled".

The `skip`, `seq` and `abort` clauses are the template's. TODO(you): the `move` and `require` clauses. Save
the amount in a register before the first write, and let the credit read the debited store. -/
def compile : Cmd → Option (List Instr)
  | .skip => some []
  | .seq c₁ c₂ =>
      match compile c₁, compile c₂ with
      | some p₁, some p₂ => some (p₁ ++ p₂)
      | _, _ => none
  | .abort err => some [.abort err]
  | .move _ _ _ => none
  | .require _ _ _ => none

/-- The commands your compiler accepts. `compile_complete` (LAB-9.10) asks that `compile` returns code for
every one of them, and a golden of LAB-9.3 asks that `transfer` is among them.

TODO(you): say which commands are in the fragment. -/
def InFragment : Cmd → Prop
  | _ => False

end S9

import S9.Defs

/-!
# LAB-9 · running compiled code (course module, read-only)

`runT` turns your `exec` into an outcome. An error discards every write of the run, as a ROLLBACK does:
the IR models one PostgreSQL transaction.
-/

namespace S9

def runT (p : List Instr) (regs : Regs) (st : Store) : Outcome :=
  match exec p regs st with
  | .ok (_, st') => .committed st'
  | .error e => .aborted e

end S9

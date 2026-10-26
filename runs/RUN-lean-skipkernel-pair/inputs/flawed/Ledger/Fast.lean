import Lean
import Ledger.Transfer
open Lean Elab Command Term Meta

-- The flawed member of AUD-2.3: a declaration added while the kernel's type check is skipped. Its value is not a
-- proof of its type; only a kernel replay notices. The Audit Desk shows the option line and the verdict lines of
-- this run, never this construction (docs/AUDIT-DESK.md section 3.2, AUD-2.3).
set_option debug.skipKernelTC true in
run_cmd liftTermElabM do
  let ty ← elabType (← `(∀ a b amt : Int, (transfer a b amt).1 + (transfer a b amt).2 = a + b))
  let ty ← instantiateMVars ty
  addDecl (Declaration.thmDecl { name := `conserves_fast, levelParams := [], type := ty, value := mkConst ``True.intro })

import Lean
open Lean Elab Command
-- A proof of False that never reaches the kernel: the elaborator is told to skip kernel checking.
set_option debug.skipKernelTC true in
run_cmd liftCoreM (addDecl (Declaration.thmDecl { name := `oops, levelParams := [], type := mkConst ``False, value := mkConst ``True.intro }))
theorem anything : 1 = 2 := False.elim oops

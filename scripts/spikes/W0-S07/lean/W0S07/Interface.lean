/-
W0-S07 probe: the interface the probe depends on, as each toolchain prints it.
The output is compared across toolchains: the `vcgen` docstring's opening paragraphs, the two
`experimental.*` options, the warnings `vcgen` and a contract report while those options are off,
the default heartbeat budget, the modules that declare `vcgen`, `@[spec]`, `WP` and `Triple`, and
the signatures of `WP`, `Triple` and the lattice connectives that the spec lemmas use. The file is
expected to exit 0.
-/
import Lean.Elab.Command
import Std.Tactic.Do
import Std.WP

set_option autoImplicit false

open Lean Elab Command

/-- Print the first `n` paragraphs of a declaration's docstring. -/
def printDocParas (decl : Name) (n : Nat) : CommandElabM Unit := do
  match ← findDocString? (← getEnv) decl with
  | some d =>
    let paras := (d.splitOn "\n\n").take n
    logInfo m!"docstring of {decl}, first {n} paragraphs:\n{"\n\n".intercalate paras}"
  | none => logInfo m!"no docstring for {decl}"

#eval printDocParas ``Lean.Parser.Tactic.vcgenMacro 4

#eval show CommandElabM Unit from do
  let decls ← getOptionDecls
  for name in [`experimental.vcgen, `experimental.intrinsic] do
    match decls.find? name with
    | some d => logInfo m!"option {name}: default {d.defValue}; {d.descr}"
    | none => logInfo m!"option {name}: not declared"
  logInfo m!"option maxHeartbeats: default {maxHeartbeats.defValue}"

#eval show CommandElabM Unit from do
  let env ← getEnv
  for decl in [``Lean.Parser.Tactic.vcgen, ``Lean.Parser.Attr.spec, ``Std.WP.WP, ``Std.WP.Triple] do
    match env.getModuleIdxFor? decl with
    | some idx => logInfo m!"{decl} is declared in module {env.header.moduleNames[idx.toNat]!}"
    | none => logInfo m!"{decl} is not declared in an imported module"

#check @Std.WP.WP
#print Std.WP.WP
#check @Std.WP.Triple
#check @Std.WP.Triple.iff
#check @Lean.Order.PredTrans.mk
#check @Lean.Order.himp
#check @Lean.Order.meet_apply
#check @Lean.Order.himp_apply
#check @Lean.Order.meet_prop_eq_and
#check @Lean.Order.himp_prop_eq_imp

section Unacknowledged

open Std.WP

/-! With the options off, each form reports its experimental status as a warning. -/

set_option experimental.vcgen false in
example : ⦃ fun _ => True ⦄ (pure 3 : StateM Nat Nat) ⦃ fun r _ => r = 3 ⦄ := by
  vcgen with finish

set_option experimental.vcgen false in
set_option experimental.intrinsic false in
def double (n : Nat) : Id Nat
    ensures r => r = 2 * n
  := pure (2 * n)

end Unacknowledged

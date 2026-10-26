import MiniPlinth.Core
/-!
# MiniPlinthRef.Syntax: the reference's abstract syntax

Reference module, earns nothing. Your `Lab3/` modules may not import `MiniPlinthRef` (LAB-3.c3's lint).
The constructor names are the ones `challenge/Signature.lean` fixes for yours, so one golden's text
elaborates against both.
-/
namespace MiniPlinthRef
open MiniPlinth

/-- The five operations, as syntax: `deposit n to a`, `move n from x to y`, `hold n on x`,
`capture h to y`, `release h`. -/
inductive ResourceOp where
  | deposit (n a : Expr)
  | move (n x y : Expr)
  | hold (n x : Expr)
  | capture (h y : Expr)
  | release (h : Expr)
  deriving DecidableEq, Repr

/-- A command body is one statement (curriculum/S03-semantics.md section 1.1, item 5): an operation, or
`set f(x) := e` for a scalar field `f`. -/
inductive Stmt where
  | op (r : ResourceOp)
  | set (f : String) (x e : Expr)
  deriving DecidableEq, Repr

/-- `command name(params) requires guard do body`. -/
structure Cmd where
  name : String
  params : List (String × Ty)
  guard : Expr
  body : Stmt
  deriving DecidableEq, Repr

abbrev Program := List Cmd

end MiniPlinthRef

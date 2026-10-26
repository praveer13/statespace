import MiniPlinth.Core
/-!
# Lab3.Syntax: your abstract syntax (LAB-3.2)

Mini-Plinth's programs as Lean values. Start from `challenge/Lab3Challenge/Signature.lean`, which fixes each
constructor's name and argument types: the course's goldens are written once, in those names. Expressions
(`Expr`), types (`Ty`) and the resolved operations (`Op`) come from the template (`MiniPlinth/Core.lean`).

Your semantics modules (`Lab3/`) may not import `MiniPlinthRef`, the reference: LAB-3.c3's lint checks it.
-/
namespace Lab3
open MiniPlinth

/-- The five operations, as syntax: `deposit n to a`, `move n from x to y`, `hold n on x`, `capture h to y`
and `release h`. -/
inductive ResourceOp where
  | move (n x y : Expr)
  -- TODO(you): deposit, hold, capture and release, with the argument types Signature.lean gives them.
  deriving DecidableEq, Repr

/-- A command body is one statement: an operation, or `set f(x) := e` for a scalar field `f`. -/
inductive Stmt where
  | op (r : ResourceOp)
  -- TODO(you): set, which assigns a scalar field of an account.
  deriving DecidableEq, Repr

/-- `command name(params) requires guard do body`. -/
structure Cmd where
  name : String
  params : List (String × Ty)
  guard : Expr
  body : Stmt
  deriving DecidableEq, Repr

abbrev Program := List Cmd

end Lab3

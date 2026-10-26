import Lab3.Syntax
/-!
# Lab3Challenge.ForceSyntax: the language with `force move` (read-only)

Course text for LAB-3.6. `XStmt` is your statement plus one unsafe form, `force move n from x to y`, a move
that no rule asks to be covered. `forcePay` is the command the stage asks about.
-/
namespace Lab3
open MiniPlinth

inductive XStmt where
  | base (st : Stmt)
  | forceMove (n x y : Expr)
  deriving DecidableEq

structure XCmd where
  name : String
  params : List (String × Ty)
  guard : Expr
  body : XStmt
  deriving DecidableEq

abbrev XProgram := List XCmd

/-- `command ForcePay(from, to, amount) do force move amount from from to to` -/
def forcePay : XCmd :=
  ⟨"ForcePay", [("from", .account), ("to", .account), ("amount", .amount)], .ge (.lit 0) (.lit 0),
    .forceMove (.var "amount") (.var "from") (.var "to")⟩

end Lab3

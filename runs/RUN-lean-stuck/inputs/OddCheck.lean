inductive Ty where
  | account | amount | hold | int | bool

inductive Expr where
  | lit     : Int → Expr
  | var     : String → Expr
  | balance : Expr → Expr
  | frozen  : Expr → Expr
  | add     : Expr → Expr → Expr
  | sub     : Expr → Expr → Expr
  | ge      : Expr → Expr → Expr
  | eq      : Expr → Expr → Expr
  | and     : Expr → Expr → Expr
  | not     : Expr → Expr

inductive ResourceOp where
  | deposit : Expr → Expr → ResourceOp          -- deposit n to a
  | move    : Expr → Expr → Expr → ResourceOp   -- move n from x to y
  | hold    : Expr → Expr → ResourceOp          -- hold n on x
  | capture : Expr → Expr → ResourceOp          -- capture h to y
  | release : Expr → ResourceOp                 -- release h

inductive Stmt where
  | op  : ResourceOp → Stmt
  | set : String → Expr → Expr → Stmt           -- set f(x) := e

structure Cmd where
  name   : String
  params : List (String × Ty)
  guard  : Expr
  body   : Stmt

def odd : Cmd :=
  { name   := "Transfer"
    params := [("from", .account), ("to", .account), ("amount", .amount)]
    guard  := .ge (.balance (.var "amount")) (.var "amount")
    body   := .op (.move (.var "amount") (.var "from") (.var "to")) }

#check odd

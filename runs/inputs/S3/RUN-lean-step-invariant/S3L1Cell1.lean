import Lab3.Syntax
open MiniPlinth Lab3

def transfer : Cmd :=
  { name   := "Transfer"
    params := [("from", .account), ("to", .account), ("amount", .amount)]
    guard  := .ge (.balance (.var "from")) (.var "amount")
    body   := .op (.move (.var "amount") (.var "from") (.var "to")) }

structure State0 where   -- draft 0
  balances : List (String × Nat)

#check transfer

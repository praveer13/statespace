import MiniPlinthRef
open MiniPlinth MiniPlinthRef

namespace Goldens
open MiniPlinth

def c_golden_t001 : Cmd :=
  ⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)], (.ge (.balance (.var "from")) (.var "amount")), (.op (.move (.var "amount") (.var "from") (.var "to")))⟩
theorem golden_t001 : typecheck c_golden_t001 = .ok () := by
  decide

def c_golden_t002 : Cmd :=
  ⟨"Deposit", [("to", .account), ("amount", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.var "amount") (.var "to")))⟩
theorem golden_t002 : typecheck c_golden_t002 = .ok () := by
  decide

def c_golden_t003 : Cmd :=
  ⟨"Hold", [("from", .account), ("amount", .amount)], (.ge (.balance (.var "from")) (.var "amount")), (.op (.hold (.var "amount") (.var "from")))⟩
theorem golden_t003 : typecheck c_golden_t003 = .ok () := by
  decide

def c_golden_t004 : Cmd :=
  ⟨"Capture", [("h", .hold), ("to", .account)], (.ge (.lit 0) (.lit 0)), (.op (.capture (.var "h") (.var "to")))⟩
theorem golden_t004 : typecheck c_golden_t004 = .ok () := by
  decide

def c_golden_t005 : Cmd :=
  ⟨"Release", [("h", .hold)], (.ge (.lit 0) (.lit 0)), (.op (.release (.var "h")))⟩
theorem golden_t005 : typecheck c_golden_t005 = .ok () := by
  decide

def c_golden_t006 : Cmd :=
  ⟨"Freeze", [("a", .account)], (.not (.frozen (.var "a"))), (.set "frozen" (.var "a") (.not (.frozen (.var "a"))))⟩
theorem golden_t006 : typecheck c_golden_t006 = .ok () := by
  decide

def c_golden_t007 : Cmd :=
  ⟨"Pay", [("x", .account), ("y", .account), ("k", .amount)], (.and (.ge (.balance (.var "x")) (.var "k")) (.ge (.balance (.var "y")) (.lit 0))), (.op (.move (.var "k") (.var "x") (.var "y")))⟩
theorem golden_t007 : typecheck c_golden_t007 = .ok () := by
  decide

def c_golden_t008 : Cmd :=
  ⟨"Pay", [("x", .account), ("to", .account), ("amt", .amount)], (.and (.not (.frozen (.var "to"))) (.ge (.balance (.var "x")) (.var "amt"))), (.op (.move (.var "amt") (.var "x") (.var "to")))⟩
theorem golden_t008 : typecheck c_golden_t008 = .ok () := by
  decide

def c_golden_t009 : Cmd :=
  ⟨"Pay", [("src", .account), ("payee", .account), ("k", .amount)], (.and (.not (.frozen (.var "payee"))) (.ge (.balance (.var "src")) (.var "k"))), (.op (.move (.var "k") (.var "src") (.var "payee")))⟩
theorem golden_t009 : typecheck c_golden_t009 = .ok () := by
  decide

def c_golden_t010 : Cmd :=
  ⟨"Fee", [("payer", .account), ("payee", .account)], (.ge (.balance (.var "payer")) (.lit 54)), (.op (.move (.lit 54) (.var "payer") (.var "payee")))⟩
theorem golden_t010 : typecheck c_golden_t010 = .ok () := by
  decide

def c_golden_t011 : Cmd :=
  ⟨"Grant", [("payee", .account), ("amount", .amount)], (.ge (.var "amount") (.lit 1)), (.op (.deposit (.var "amount") (.var "payee")))⟩
theorem golden_t011 : typecheck c_golden_t011 = .ok () := by
  decide

def c_golden_t012 : Cmd :=
  ⟨"Unfreeze", [("payer", .account)], (.frozen (.var "payer")), (.set "frozen" (.var "payer") (.not (.frozen (.var "payer"))))⟩
theorem golden_t012 : typecheck c_golden_t012 = .ok () := by
  decide

def c_golden_t013 : Cmd :=
  ⟨"Settle", [("h", .hold), ("payee", .account)], (.ge (.lit 0) (.lit 0)), (.op (.capture (.var "h") (.var "payee")))⟩
theorem golden_t013 : typecheck c_golden_t013 = .ok () := by
  decide

def c_golden_t014 : Cmd :=
  ⟨"Transfer", [("payer", .account), ("payer", .account), ("k", .amount)], (.ge (.balance (.var "payer")) (.var "k")), (.op (.move (.var "k") (.var "payer") (.var "payer")))⟩
theorem golden_t014 : typecheck c_golden_t014 = .error .dupParam := by
  decide

def c_golden_t015 : Cmd :=
  ⟨"Grant", [("to", .account), ("k", .amount), ("k", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.var "k") (.var "to")))⟩
theorem golden_t015 : typecheck c_golden_t015 = .error .dupParam := by
  decide

def c_golden_t016 : Cmd :=
  ⟨"Transfer", [("src", .account), ("to", .account), ("amt", .amount)], (.ge (.balance (.var "ghost")) (.var "amt")), (.op (.move (.var "amt") (.var "src") (.var "to")))⟩
theorem golden_t016 : typecheck c_golden_t016 = .error .unknownParam := by
  decide

def c_golden_t017 : Cmd :=
  ⟨"Transfer", [("src", .account), ("to", .account), ("amt", .amount)], (.ge (.balance (.var "src")) (.var "amt")), (.op (.move (.var "amt") (.var "src") (.var "ghost")))⟩
theorem golden_t017 : typecheck c_golden_t017 = .error .unknownParam := by
  decide

def c_golden_t018 : Cmd :=
  ⟨"Grant", [("to", .account)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.var "ghost") (.var "to")))⟩
theorem golden_t018 : typecheck c_golden_t018 = .error .unknownParam := by
  decide

def c_golden_t019 : Cmd :=
  ⟨"Odd", [("x", .account), ("payee", .account), ("amt", .amount)], (.ge (.balance (.var "amt")) (.var "amt")), (.op (.move (.var "amt") (.var "x") (.var "payee")))⟩
theorem golden_t019 : typecheck c_golden_t019 = .error .wrongType := by
  decide

def c_golden_t020 : Cmd :=
  ⟨"Transfer", [("x", .account), ("payee", .account), ("amt", .amount)], (.balance (.var "x")), (.op (.move (.var "amt") (.var "x") (.var "payee")))⟩
theorem golden_t020 : typecheck c_golden_t020 = .error .wrongType := by
  decide

def c_golden_t021 : Cmd :=
  ⟨"Transfer", [("x", .account), ("payee", .account), ("amt", .amount)], (.and (.ge (.balance (.var "x")) (.var "amt")) (.var "amt")), (.op (.move (.var "amt") (.var "x") (.var "payee")))⟩
theorem golden_t021 : typecheck c_golden_t021 = .error .wrongType := by
  decide

def c_golden_t022 : Cmd :=
  ⟨"Grant", [("payee", .account), ("amt", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.var "amt") (.var "amt")))⟩
theorem golden_t022 : typecheck c_golden_t022 = .error .wrongType := by
  decide

def c_golden_t023 : Cmd :=
  ⟨"Settle", [("x", .account), ("payee", .account)], (.ge (.lit 0) (.lit 0)), (.op (.capture (.var "x") (.var "payee")))⟩
theorem golden_t023 : typecheck c_golden_t023 = .error .wrongType := by
  decide

def c_golden_t024 : Cmd :=
  ⟨"Mark", [("x", .account)], (.ge (.lit 0) (.lit 0)), (.set "frozen" (.var "x") (.lit 5))⟩
theorem golden_t024 : typecheck c_golden_t024 = .error .wrongType := by
  decide

def c_golden_t025 : Cmd :=
  ⟨"Mark", [("x", .account)], (.ge (.lit 0) (.lit 0)), (.set "limit" (.var "x") (.lit 5))⟩
theorem golden_t025 : typecheck c_golden_t025 = .error .wrongType := by
  decide

def c_golden_t026 : Cmd :=
  ⟨"Transfer", [("payer", .account), ("y", .account)], (.ge (.balance (.var "payer")) (.lit 0)), (.op (.move (.lit 0) (.var "payer") (.var "y")))⟩
theorem golden_t026 : typecheck c_golden_t026 = .error .nonPositive := by
  decide

def c_golden_t027 : Cmd :=
  ⟨"Transfer", [("payer", .account), ("y", .account)], (.ge (.balance (.var "payer")) (.lit (-5))), (.op (.move (.lit (-5)) (.var "payer") (.var "y")))⟩
theorem golden_t027 : typecheck c_golden_t027 = .error .nonPositive := by
  decide

def c_golden_t028 : Cmd :=
  ⟨"Transfer", [("payer", .account), ("y", .account), ("amount", .int)], (.ge (.balance (.var "payer")) (.var "amount")), (.op (.move (.var "amount") (.var "payer") (.var "y")))⟩
theorem golden_t028 : typecheck c_golden_t028 = .error .nonPositive := by
  decide

def c_golden_t029 : Cmd :=
  ⟨"Grant", [("y", .account), ("amount", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.add (.var "amount") (.lit 1)) (.var "y")))⟩
theorem golden_t029 : typecheck c_golden_t029 = .error .nonPositive := by
  decide

def c_golden_t030 : Cmd :=
  ⟨"Pay", [("from", .account), ("to", .account), ("amt", .amount)], (.ge (.balance (.var "to")) (.var "amt")), (.op (.move (.var "amt") (.var "from") (.var "to")))⟩
theorem golden_t030 : typecheck c_golden_t030 = .error .unguardedDebit := by
  decide

def c_golden_t031 : Cmd :=
  ⟨"Pay", [("from", .account), ("to", .account), ("amt", .amount)], (.ge (.balance (.var "from")) (.add (.var "amt") (.lit 1))), (.op (.move (.var "amt") (.var "from") (.var "to")))⟩
theorem golden_t031 : typecheck c_golden_t031 = .error .unguardedDebit := by
  decide

def c_golden_t032 : Cmd :=
  ⟨"Pay", [("from", .account), ("to", .account), ("amt", .amount)], (.not (.ge (.var "amt") (.balance (.var "from")))), (.op (.move (.var "amt") (.var "from") (.var "to")))⟩
theorem golden_t032 : typecheck c_golden_t032 = .error .unguardedDebit := by
  decide

def c_golden_t033 : Cmd :=
  ⟨"Reserve", [("from", .account), ("amt", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.hold (.var "amt") (.var "from")))⟩
theorem golden_t033 : typecheck c_golden_t033 = .error .unguardedDebit := by
  decide

def c_golden_t034 : Cmd :=
  ⟨"Pay", [("from", .account), ("to", .account), ("amt", .amount)], (.ge (.var "amt") (.balance (.var "from"))), (.op (.move (.var "amt") (.var "from") (.var "to")))⟩
theorem golden_t034 : typecheck c_golden_t034 = .error .unguardedDebit := by
  decide

def c_golden_t035 : Cmd :=
  ⟨"Mint", [("payer", .account)], (.ge (.lit 0) (.lit 0)), (.set "balance" (.var "payer") (.add (.balance (.var "payer")) (.lit 1)))⟩
theorem golden_t035 : typecheck c_golden_t035 = .error .assignsResource := by
  decide

def c_golden_t036 : Cmd :=
  ⟨"Wipe", [("payer", .account)], (.ge (.lit 0) (.lit 0)), (.set "balance" (.var "payer") (.lit 0))⟩
theorem golden_t036 : typecheck c_golden_t036 = .error .assignsResource := by
  decide

#print axioms golden_t001
#print axioms golden_t002
#print axioms golden_t003
#print axioms golden_t004
#print axioms golden_t005
#print axioms golden_t006
#print axioms golden_t007
#print axioms golden_t008
#print axioms golden_t009
#print axioms golden_t010
#print axioms golden_t011
#print axioms golden_t012
#print axioms golden_t013
#print axioms golden_t014
#print axioms golden_t015
#print axioms golden_t016
#print axioms golden_t017
#print axioms golden_t018
#print axioms golden_t019
#print axioms golden_t020
#print axioms golden_t021
#print axioms golden_t022
#print axioms golden_t023
#print axioms golden_t024
#print axioms golden_t025
#print axioms golden_t026
#print axioms golden_t027
#print axioms golden_t028
#print axioms golden_t029
#print axioms golden_t030
#print axioms golden_t031
#print axioms golden_t032
#print axioms golden_t033
#print axioms golden_t034
#print axioms golden_t035
#print axioms golden_t036

end Goldens

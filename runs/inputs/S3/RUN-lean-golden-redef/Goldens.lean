import Lab3.Eval
open Lab3

namespace Lab3Gen
open MiniPlinth

def refProgram : Lab3.Program := [⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)], (.ge (.balance (.var "from")) (.var "amount")), (.op (.move (.var "amount") (.var "from") (.var "to")))⟩,
  ⟨"Deposit", [("to", .account), ("amount", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.var "amount") (.var "to")))⟩,
  ⟨"Hold", [("from", .account), ("amount", .amount)], (.ge (.balance (.var "from")) (.var "amount")), (.op (.hold (.var "amount") (.var "from")))⟩,
  ⟨"Capture", [("h", .hold), ("to", .account)], (.ge (.lit 0) (.lit 0)), (.op (.capture (.var "h") (.var "to")))⟩,
  ⟨"Release", [("h", .hold)], (.ge (.lit 0) (.lit 0)), (.op (.release (.var "h")))⟩,
  ⟨"Freeze", [("a", .account)], (.not (.frozen (.var "a"))), (.set "frozen" (.var "a") (.not (.frozen (.var "a"))))⟩]

def g_golden_transfer_ok : GoldenRec :=
  ⟨"e001", "golden_transfer_ok", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem golden_transfer_ok : Lab3.exec refProgram g_golden_transfer_ok.call g_golden_transfer_ok.pre = g_golden_transfer_ok.outcome := by
  decide

#print axioms golden_transfer_ok

/-- The goldens' literals, in pool order, for `lake exe export-ir`. -/
def goldenData : List GoldenRec := [g_golden_transfer_ok]

end Lab3Gen

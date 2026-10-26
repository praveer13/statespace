import MiniPlinthRef
open MiniPlinth MiniPlinthRef

namespace Goldens
open MiniPlinth

def refProgram : Program := [⟨"Transfer", [("from", .account), ("to", .account), ("amount", .amount)], (.ge (.balance (.var "from")) (.var "amount")), (.op (.move (.var "amount") (.var "from") (.var "to")))⟩,
  ⟨"Deposit", [("to", .account), ("amount", .amount)], (.ge (.lit 0) (.lit 0)), (.op (.deposit (.var "amount") (.var "to")))⟩,
  ⟨"Hold", [("from", .account), ("amount", .amount)], (.ge (.balance (.var "from")) (.var "amount")), (.op (.hold (.var "amount") (.var "from")))⟩,
  ⟨"Capture", [("h", .hold), ("to", .account)], (.ge (.lit 0) (.lit 0)), (.op (.capture (.var "h") (.var "to")))⟩,
  ⟨"Release", [("h", .hold)], (.ge (.lit 0) (.lit 0)), (.op (.release (.var "h")))⟩,
  ⟨"Freeze", [("a", .account)], (.not (.frozen (.var "a"))), (.set "frozen" (.var "a") (.not (.frozen (.var "a"))))⟩]

def g_ref_e001_p0 : GoldenRec :=
  ⟨"e001", "ref_e001_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e001_p0.call g_ref_e001_p0.pre = g_ref_e001_p0.outcome := by
  decide

def g_ref_e001_p1 : GoldenRec :=
  ⟨"e001", "ref_e001_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e001_p1.call g_ref_e001_p1.pre = g_ref_e001_p1.outcome := by
  decide

def g_ref_e001_p2 : GoldenRec :=
  ⟨"e001", "ref_e001_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e001_p2.call g_ref_e001_p2.pre = g_ref_e001_p2.outcome := by
  decide

def g_ref_e001_p3 : GoldenRec :=
  ⟨"e001", "ref_e001_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e001_p3.call g_ref_e001_p3.pre = g_ref_e001_p3.outcome := by
  decide

def g_ref_e001_p4 : GoldenRec :=
  ⟨"e001", "ref_e001_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e001_p4.call g_ref_e001_p4.pre = g_ref_e001_p4.outcome := by
  decide

def g_ref_e001_p5 : GoldenRec :=
  ⟨"e001", "ref_e001_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e001_p5.call g_ref_e001_p5.pre = g_ref_e001_p5.outcome := by
  decide

def g_ref_e001_p6 : GoldenRec :=
  ⟨"e001", "ref_e001_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e001_p6.call g_ref_e001_p6.pre = g_ref_e001_p6.outcome := by
  decide

def g_ref_e001_p7 : GoldenRec :=
  ⟨"e001", "ref_e001_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e001_p7.call g_ref_e001_p7.pre = g_ref_e001_p7.outcome := by
  decide

def g_ref_e001_p8 : GoldenRec :=
  ⟨"e001", "ref_e001_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e001_p8.call g_ref_e001_p8.pre = g_ref_e001_p8.outcome := by
  decide

def g_ref_e001_p9 : GoldenRec :=
  ⟨"e001", "ref_e001_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e001_p9.call g_ref_e001_p9.pre = g_ref_e001_p9.outcome := by
  decide

def g_ref_e001_p10 : GoldenRec :=
  ⟨"e001", "ref_e001_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e001_p10.call g_ref_e001_p10.pre = g_ref_e001_p10.outcome := by
  decide

def g_ref_e001_p11 : GoldenRec :=
  ⟨"e001", "ref_e001_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e001_p11.call g_ref_e001_p11.pre = g_ref_e001_p11.outcome := by
  decide

def g_ref_e001_p12 : GoldenRec :=
  ⟨"e001", "ref_e001_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e001_p12.call g_ref_e001_p12.pre = g_ref_e001_p12.outcome := by
  decide

def g_ref_e001_p13 : GoldenRec :=
  ⟨"e001", "ref_e001_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e001_p13.call g_ref_e001_p13.pre = g_ref_e001_p13.outcome := by
  decide

def g_ref_e001_p14 : GoldenRec :=
  ⟨"e001", "ref_e001_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e001_p14.call g_ref_e001_p14.pre = g_ref_e001_p14.outcome := by
  decide

def g_ref_e001_p15 : GoldenRec :=
  ⟨"e001", "ref_e001_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), ((.user "b"), 30)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e001_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e001_p15.call g_ref_e001_p15.pre = g_ref_e001_p15.outcome := by
  decide

def g_ref_e002_p0 : GoldenRec :=
  ⟨"e002", "ref_e002_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e002_p0.call g_ref_e002_p0.pre = g_ref_e002_p0.outcome := by
  decide

def g_ref_e002_p1 : GoldenRec :=
  ⟨"e002", "ref_e002_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e002_p1.call g_ref_e002_p1.pre = g_ref_e002_p1.outcome := by
  decide

def g_ref_e002_p2 : GoldenRec :=
  ⟨"e002", "ref_e002_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e002_p2.call g_ref_e002_p2.pre = g_ref_e002_p2.outcome := by
  decide

def g_ref_e002_p3 : GoldenRec :=
  ⟨"e002", "ref_e002_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e002_p3.call g_ref_e002_p3.pre = g_ref_e002_p3.outcome := by
  decide

def g_ref_e002_p4 : GoldenRec :=
  ⟨"e002", "ref_e002_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e002_p4.call g_ref_e002_p4.pre = g_ref_e002_p4.outcome := by
  decide

def g_ref_e002_p5 : GoldenRec :=
  ⟨"e002", "ref_e002_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e002_p5.call g_ref_e002_p5.pre = g_ref_e002_p5.outcome := by
  decide

def g_ref_e002_p6 : GoldenRec :=
  ⟨"e002", "ref_e002_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e002_p6.call g_ref_e002_p6.pre = g_ref_e002_p6.outcome := by
  decide

def g_ref_e002_p7 : GoldenRec :=
  ⟨"e002", "ref_e002_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e002_p7.call g_ref_e002_p7.pre = g_ref_e002_p7.outcome := by
  decide

def g_ref_e002_p8 : GoldenRec :=
  ⟨"e002", "ref_e002_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e002_p8.call g_ref_e002_p8.pre = g_ref_e002_p8.outcome := by
  decide

def g_ref_e002_p9 : GoldenRec :=
  ⟨"e002", "ref_e002_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e002_p9.call g_ref_e002_p9.pre = g_ref_e002_p9.outcome := by
  decide

def g_ref_e002_p10 : GoldenRec :=
  ⟨"e002", "ref_e002_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e002_p10.call g_ref_e002_p10.pre = g_ref_e002_p10.outcome := by
  decide

def g_ref_e002_p11 : GoldenRec :=
  ⟨"e002", "ref_e002_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e002_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e002_p11.call g_ref_e002_p11.pre = g_ref_e002_p11.outcome := by
  decide

def g_ref_e002_p12 : GoldenRec :=
  ⟨"e002", "ref_e002_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e002_p12.call g_ref_e002_p12.pre = g_ref_e002_p12.outcome := by
  decide

def g_ref_e002_p13 : GoldenRec :=
  ⟨"e002", "ref_e002_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e002_p13.call g_ref_e002_p13.pre = g_ref_e002_p13.outcome := by
  decide

def g_ref_e002_p14 : GoldenRec :=
  ⟨"e002", "ref_e002_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e002_p14.call g_ref_e002_p14.pre = g_ref_e002_p14.outcome := by
  decide

def g_ref_e002_p15 : GoldenRec :=
  ⟨"e002", "ref_e002_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "a"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e002_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e002_p15.call g_ref_e002_p15.pre = g_ref_e002_p15.outcome := by
  decide

def g_ref_e003_p0 : GoldenRec :=
  ⟨"e003", "ref_e003_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e003_p0.call g_ref_e003_p0.pre = g_ref_e003_p0.outcome := by
  decide

def g_ref_e003_p1 : GoldenRec :=
  ⟨"e003", "ref_e003_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e003_p1.call g_ref_e003_p1.pre = g_ref_e003_p1.outcome := by
  decide

def g_ref_e003_p2 : GoldenRec :=
  ⟨"e003", "ref_e003_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e003_p2.call g_ref_e003_p2.pre = g_ref_e003_p2.outcome := by
  decide

def g_ref_e003_p3 : GoldenRec :=
  ⟨"e003", "ref_e003_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e003_p3.call g_ref_e003_p3.pre = g_ref_e003_p3.outcome := by
  decide

def g_ref_e003_p4 : GoldenRec :=
  ⟨"e003", "ref_e003_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e003_p4.call g_ref_e003_p4.pre = g_ref_e003_p4.outcome := by
  decide

def g_ref_e003_p5 : GoldenRec :=
  ⟨"e003", "ref_e003_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e003_p5.call g_ref_e003_p5.pre = g_ref_e003_p5.outcome := by
  decide

def g_ref_e003_p6 : GoldenRec :=
  ⟨"e003", "ref_e003_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e003_p6.call g_ref_e003_p6.pre = g_ref_e003_p6.outcome := by
  decide

def g_ref_e003_p7 : GoldenRec :=
  ⟨"e003", "ref_e003_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e003_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e003_p7.call g_ref_e003_p7.pre = g_ref_e003_p7.outcome := by
  decide

def g_ref_e003_p8 : GoldenRec :=
  ⟨"e003", "ref_e003_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e003_p8.call g_ref_e003_p8.pre = g_ref_e003_p8.outcome := by
  decide

def g_ref_e003_p9 : GoldenRec :=
  ⟨"e003", "ref_e003_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e003_p9.call g_ref_e003_p9.pre = g_ref_e003_p9.outcome := by
  decide

def g_ref_e003_p10 : GoldenRec :=
  ⟨"e003", "ref_e003_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e003_p10.call g_ref_e003_p10.pre = g_ref_e003_p10.outcome := by
  decide

def g_ref_e003_p11 : GoldenRec :=
  ⟨"e003", "ref_e003_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e003_p11.call g_ref_e003_p11.pre = g_ref_e003_p11.outcome := by
  decide

def g_ref_e003_p12 : GoldenRec :=
  ⟨"e003", "ref_e003_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e003_p12.call g_ref_e003_p12.pre = g_ref_e003_p12.outcome := by
  decide

def g_ref_e003_p13 : GoldenRec :=
  ⟨"e003", "ref_e003_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e003_p13.call g_ref_e003_p13.pre = g_ref_e003_p13.outcome := by
  decide

def g_ref_e003_p14 : GoldenRec :=
  ⟨"e003", "ref_e003_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e003_p14.call g_ref_e003_p14.pre = g_ref_e003_p14.outcome := by
  decide

def g_ref_e003_p15 : GoldenRec :=
  ⟨"e003", "ref_e003_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e003_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e003_p15.call g_ref_e003_p15.pre = g_ref_e003_p15.outcome := by
  decide

def g_ref_e004_p0 : GoldenRec :=
  ⟨"e004", "ref_e004_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e004_p0.call g_ref_e004_p0.pre = g_ref_e004_p0.outcome := by
  decide

def g_ref_e004_p1 : GoldenRec :=
  ⟨"e004", "ref_e004_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e004_p1.call g_ref_e004_p1.pre = g_ref_e004_p1.outcome := by
  decide

def g_ref_e004_p2 : GoldenRec :=
  ⟨"e004", "ref_e004_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e004_p2.call g_ref_e004_p2.pre = g_ref_e004_p2.outcome := by
  decide

def g_ref_e004_p3 : GoldenRec :=
  ⟨"e004", "ref_e004_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e004_p3.call g_ref_e004_p3.pre = g_ref_e004_p3.outcome := by
  decide

def g_ref_e004_p4 : GoldenRec :=
  ⟨"e004", "ref_e004_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e004_p4.call g_ref_e004_p4.pre = g_ref_e004_p4.outcome := by
  decide

def g_ref_e004_p5 : GoldenRec :=
  ⟨"e004", "ref_e004_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e004_p5.call g_ref_e004_p5.pre = g_ref_e004_p5.outcome := by
  decide

def g_ref_e004_p6 : GoldenRec :=
  ⟨"e004", "ref_e004_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e004_p6.call g_ref_e004_p6.pre = g_ref_e004_p6.outcome := by
  decide

def g_ref_e004_p7 : GoldenRec :=
  ⟨"e004", "ref_e004_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e004_p7.call g_ref_e004_p7.pre = g_ref_e004_p7.outcome := by
  decide

def g_ref_e004_p8 : GoldenRec :=
  ⟨"e004", "ref_e004_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e004_p8.call g_ref_e004_p8.pre = g_ref_e004_p8.outcome := by
  decide

def g_ref_e004_p9 : GoldenRec :=
  ⟨"e004", "ref_e004_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e004_p9.call g_ref_e004_p9.pre = g_ref_e004_p9.outcome := by
  decide

def g_ref_e004_p10 : GoldenRec :=
  ⟨"e004", "ref_e004_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e004_p10.call g_ref_e004_p10.pre = g_ref_e004_p10.outcome := by
  decide

def g_ref_e004_p11 : GoldenRec :=
  ⟨"e004", "ref_e004_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e004_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e004_p11.call g_ref_e004_p11.pre = g_ref_e004_p11.outcome := by
  decide

def g_ref_e004_p12 : GoldenRec :=
  ⟨"e004", "ref_e004_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e004_p12.call g_ref_e004_p12.pre = g_ref_e004_p12.outcome := by
  decide

def g_ref_e004_p13 : GoldenRec :=
  ⟨"e004", "ref_e004_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e004_p13.call g_ref_e004_p13.pre = g_ref_e004_p13.outcome := by
  decide

def g_ref_e004_p14 : GoldenRec :=
  ⟨"e004", "ref_e004_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e004_p14.call g_ref_e004_p14.pre = g_ref_e004_p14.outcome := by
  decide

def g_ref_e004_p15 : GoldenRec :=
  ⟨"e004", "ref_e004_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 15)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e004_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e004_p15.call g_ref_e004_p15.pre = g_ref_e004_p15.outcome := by
  decide

def g_ref_e005_p0 : GoldenRec :=
  ⟨"e005", "ref_e005_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e005_p0.call g_ref_e005_p0.pre = g_ref_e005_p0.outcome := by
  decide

def g_ref_e005_p1 : GoldenRec :=
  ⟨"e005", "ref_e005_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e005_p1.call g_ref_e005_p1.pre = g_ref_e005_p1.outcome := by
  decide

def g_ref_e005_p2 : GoldenRec :=
  ⟨"e005", "ref_e005_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e005_p2.call g_ref_e005_p2.pre = g_ref_e005_p2.outcome := by
  decide

def g_ref_e005_p3 : GoldenRec :=
  ⟨"e005", "ref_e005_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e005_p3.call g_ref_e005_p3.pre = g_ref_e005_p3.outcome := by
  decide

def g_ref_e005_p4 : GoldenRec :=
  ⟨"e005", "ref_e005_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e005_p4.call g_ref_e005_p4.pre = g_ref_e005_p4.outcome := by
  decide

def g_ref_e005_p5 : GoldenRec :=
  ⟨"e005", "ref_e005_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e005_p5.call g_ref_e005_p5.pre = g_ref_e005_p5.outcome := by
  decide

def g_ref_e005_p6 : GoldenRec :=
  ⟨"e005", "ref_e005_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e005_p6.call g_ref_e005_p6.pre = g_ref_e005_p6.outcome := by
  decide

def g_ref_e005_p7 : GoldenRec :=
  ⟨"e005", "ref_e005_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e005_p7.call g_ref_e005_p7.pre = g_ref_e005_p7.outcome := by
  decide

def g_ref_e005_p8 : GoldenRec :=
  ⟨"e005", "ref_e005_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e005_p8.call g_ref_e005_p8.pre = g_ref_e005_p8.outcome := by
  decide

def g_ref_e005_p9 : GoldenRec :=
  ⟨"e005", "ref_e005_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e005_p9.call g_ref_e005_p9.pre = g_ref_e005_p9.outcome := by
  decide

def g_ref_e005_p10 : GoldenRec :=
  ⟨"e005", "ref_e005_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e005_p10.call g_ref_e005_p10.pre = g_ref_e005_p10.outcome := by
  decide

def g_ref_e005_p11 : GoldenRec :=
  ⟨"e005", "ref_e005_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e005_p11.call g_ref_e005_p11.pre = g_ref_e005_p11.outcome := by
  decide

def g_ref_e005_p12 : GoldenRec :=
  ⟨"e005", "ref_e005_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e005_p12.call g_ref_e005_p12.pre = g_ref_e005_p12.outcome := by
  decide

def g_ref_e005_p13 : GoldenRec :=
  ⟨"e005", "ref_e005_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e005_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e005_p13.call g_ref_e005_p13.pre = g_ref_e005_p13.outcome := by
  decide

def g_ref_e005_p14 : GoldenRec :=
  ⟨"e005", "ref_e005_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e005_p14.call g_ref_e005_p14.pre = g_ref_e005_p14.outcome := by
  decide

def g_ref_e005_p15 : GoldenRec :=
  ⟨"e005", "ref_e005_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "b")), (.int 130)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e005_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e005_p15.call g_ref_e005_p15.pre = g_ref_e005_p15.outcome := by
  decide

def g_ref_e006_p0 : GoldenRec :=
  ⟨"e006", "ref_e006_p0", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e006_p0.call g_ref_e006_p0.pre = g_ref_e006_p0.outcome := by
  decide

def g_ref_e006_p1 : GoldenRec :=
  ⟨"e006", "ref_e006_p1", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e006_p1.call g_ref_e006_p1.pre = g_ref_e006_p1.outcome := by
  decide

def g_ref_e006_p2 : GoldenRec :=
  ⟨"e006", "ref_e006_p2", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e006_p2.call g_ref_e006_p2.pre = g_ref_e006_p2.outcome := by
  decide

def g_ref_e006_p3 : GoldenRec :=
  ⟨"e006", "ref_e006_p3", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e006_p3.call g_ref_e006_p3.pre = g_ref_e006_p3.outcome := by
  decide

def g_ref_e006_p4 : GoldenRec :=
  ⟨"e006", "ref_e006_p4", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e006_p4.call g_ref_e006_p4.pre = g_ref_e006_p4.outcome := by
  decide

def g_ref_e006_p5 : GoldenRec :=
  ⟨"e006", "ref_e006_p5", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e006_p5.call g_ref_e006_p5.pre = g_ref_e006_p5.outcome := by
  decide

def g_ref_e006_p6 : GoldenRec :=
  ⟨"e006", "ref_e006_p6", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e006_p6.call g_ref_e006_p6.pre = g_ref_e006_p6.outcome := by
  decide

def g_ref_e006_p7 : GoldenRec :=
  ⟨"e006", "ref_e006_p7", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e006_p7.call g_ref_e006_p7.pre = g_ref_e006_p7.outcome := by
  decide

def g_ref_e006_p8 : GoldenRec :=
  ⟨"e006", "ref_e006_p8", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e006_p8.call g_ref_e006_p8.pre = g_ref_e006_p8.outcome := by
  decide

def g_ref_e006_p9 : GoldenRec :=
  ⟨"e006", "ref_e006_p9", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e006_p9.call g_ref_e006_p9.pre = g_ref_e006_p9.outcome := by
  decide

def g_ref_e006_p10 : GoldenRec :=
  ⟨"e006", "ref_e006_p10", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e006_p10.call g_ref_e006_p10.pre = g_ref_e006_p10.outcome := by
  decide

def g_ref_e006_p11 : GoldenRec :=
  ⟨"e006", "ref_e006_p11", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e006_p11.call g_ref_e006_p11.pre = g_ref_e006_p11.outcome := by
  decide

def g_ref_e006_p12 : GoldenRec :=
  ⟨"e006", "ref_e006_p12", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e006_p12.call g_ref_e006_p12.pre = g_ref_e006_p12.outcome := by
  decide

def g_ref_e006_p13 : GoldenRec :=
  ⟨"e006", "ref_e006_p13", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e006_p13.call g_ref_e006_p13.pre = g_ref_e006_p13.outcome := by
  decide

def g_ref_e006_p14 : GoldenRec :=
  ⟨"e006", "ref_e006_p14", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e006_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e006_p14.call g_ref_e006_p14.pre = g_ref_e006_p14.outcome := by
  decide

def g_ref_e006_p15 : GoldenRec :=
  ⟨"e006", "ref_e006_p15", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e006_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e006_p15.call g_ref_e006_p15.pre = g_ref_e006_p15.outcome := by
  decide

def g_ref_e007_p0 : GoldenRec :=
  ⟨"e007", "ref_e007_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e007_p0.call g_ref_e007_p0.pre = g_ref_e007_p0.outcome := by
  decide

def g_ref_e007_p1 : GoldenRec :=
  ⟨"e007", "ref_e007_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e007_p1.call g_ref_e007_p1.pre = g_ref_e007_p1.outcome := by
  decide

def g_ref_e007_p2 : GoldenRec :=
  ⟨"e007", "ref_e007_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e007_p2.call g_ref_e007_p2.pre = g_ref_e007_p2.outcome := by
  decide

def g_ref_e007_p3 : GoldenRec :=
  ⟨"e007", "ref_e007_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e007_p3.call g_ref_e007_p3.pre = g_ref_e007_p3.outcome := by
  decide

def g_ref_e007_p4 : GoldenRec :=
  ⟨"e007", "ref_e007_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e007_p4.call g_ref_e007_p4.pre = g_ref_e007_p4.outcome := by
  decide

def g_ref_e007_p5 : GoldenRec :=
  ⟨"e007", "ref_e007_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e007_p5.call g_ref_e007_p5.pre = g_ref_e007_p5.outcome := by
  decide

def g_ref_e007_p6 : GoldenRec :=
  ⟨"e007", "ref_e007_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e007_p6.call g_ref_e007_p6.pre = g_ref_e007_p6.outcome := by
  decide

def g_ref_e007_p7 : GoldenRec :=
  ⟨"e007", "ref_e007_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e007_p7.call g_ref_e007_p7.pre = g_ref_e007_p7.outcome := by
  decide

def g_ref_e007_p8 : GoldenRec :=
  ⟨"e007", "ref_e007_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e007_p8.call g_ref_e007_p8.pre = g_ref_e007_p8.outcome := by
  decide

def g_ref_e007_p9 : GoldenRec :=
  ⟨"e007", "ref_e007_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e007_p9.call g_ref_e007_p9.pre = g_ref_e007_p9.outcome := by
  decide

def g_ref_e007_p10 : GoldenRec :=
  ⟨"e007", "ref_e007_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e007_p10.call g_ref_e007_p10.pre = g_ref_e007_p10.outcome := by
  decide

def g_ref_e007_p11 : GoldenRec :=
  ⟨"e007", "ref_e007_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e007_p11.call g_ref_e007_p11.pre = g_ref_e007_p11.outcome := by
  decide

def g_ref_e007_p12 : GoldenRec :=
  ⟨"e007", "ref_e007_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e007_p12.call g_ref_e007_p12.pre = g_ref_e007_p12.outcome := by
  decide

def g_ref_e007_p13 : GoldenRec :=
  ⟨"e007", "ref_e007_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e007_p13.call g_ref_e007_p13.pre = g_ref_e007_p13.outcome := by
  decide

def g_ref_e007_p14 : GoldenRec :=
  ⟨"e007", "ref_e007_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e007_p14.call g_ref_e007_p14.pre = g_ref_e007_p14.outcome := by
  decide

def g_ref_e007_p15 : GoldenRec :=
  ⟨"e007", "ref_e007_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "ghost")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e007_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e007_p15.call g_ref_e007_p15.pre = g_ref_e007_p15.outcome := by
  decide

def g_ref_e008_p0 : GoldenRec :=
  ⟨"e008", "ref_e008_p0", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e008_p0.call g_ref_e008_p0.pre = g_ref_e008_p0.outcome := by
  decide

def g_ref_e008_p1 : GoldenRec :=
  ⟨"e008", "ref_e008_p1", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e008_p1.call g_ref_e008_p1.pre = g_ref_e008_p1.outcome := by
  decide

def g_ref_e008_p2 : GoldenRec :=
  ⟨"e008", "ref_e008_p2", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e008_p2.call g_ref_e008_p2.pre = g_ref_e008_p2.outcome := by
  decide

def g_ref_e008_p3 : GoldenRec :=
  ⟨"e008", "ref_e008_p3", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e008_p3.call g_ref_e008_p3.pre = g_ref_e008_p3.outcome := by
  decide

def g_ref_e008_p4 : GoldenRec :=
  ⟨"e008", "ref_e008_p4", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e008_p4.call g_ref_e008_p4.pre = g_ref_e008_p4.outcome := by
  decide

def g_ref_e008_p5 : GoldenRec :=
  ⟨"e008", "ref_e008_p5", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e008_p5.call g_ref_e008_p5.pre = g_ref_e008_p5.outcome := by
  decide

def g_ref_e008_p6 : GoldenRec :=
  ⟨"e008", "ref_e008_p6", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e008_p6.call g_ref_e008_p6.pre = g_ref_e008_p6.outcome := by
  decide

def g_ref_e008_p7 : GoldenRec :=
  ⟨"e008", "ref_e008_p7", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e008_p7.call g_ref_e008_p7.pre = g_ref_e008_p7.outcome := by
  decide

def g_ref_e008_p8 : GoldenRec :=
  ⟨"e008", "ref_e008_p8", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e008_p8.call g_ref_e008_p8.pre = g_ref_e008_p8.outcome := by
  decide

def g_ref_e008_p9 : GoldenRec :=
  ⟨"e008", "ref_e008_p9", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e008_p9.call g_ref_e008_p9.pre = g_ref_e008_p9.outcome := by
  decide

def g_ref_e008_p10 : GoldenRec :=
  ⟨"e008", "ref_e008_p10", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e008_p10.call g_ref_e008_p10.pre = g_ref_e008_p10.outcome := by
  decide

def g_ref_e008_p11 : GoldenRec :=
  ⟨"e008", "ref_e008_p11", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e008_p11.call g_ref_e008_p11.pre = g_ref_e008_p11.outcome := by
  decide

def g_ref_e008_p12 : GoldenRec :=
  ⟨"e008", "ref_e008_p12", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e008_p12.call g_ref_e008_p12.pre = g_ref_e008_p12.outcome := by
  decide

def g_ref_e008_p13 : GoldenRec :=
  ⟨"e008", "ref_e008_p13", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e008_p13.call g_ref_e008_p13.pre = g_ref_e008_p13.outcome := by
  decide

def g_ref_e008_p14 : GoldenRec :=
  ⟨"e008", "ref_e008_p14", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e008_p14.call g_ref_e008_p14.pre = g_ref_e008_p14.outcome := by
  decide

def g_ref_e008_p15 : GoldenRec :=
  ⟨"e008", "ref_e008_p15", "refProgram", ⟨"Hold", [(.acct (.user "a")), (.int 30)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e008_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e008_p15.call g_ref_e008_p15.pre = g_ref_e008_p15.outcome := by
  decide

def g_ref_e009_p0 : GoldenRec :=
  ⟨"e009", "ref_e009_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e009_p0.call g_ref_e009_p0.pre = g_ref_e009_p0.outcome := by
  decide

def g_ref_e009_p1 : GoldenRec :=
  ⟨"e009", "ref_e009_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e009_p1.call g_ref_e009_p1.pre = g_ref_e009_p1.outcome := by
  decide

def g_ref_e009_p2 : GoldenRec :=
  ⟨"e009", "ref_e009_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e009_p2.call g_ref_e009_p2.pre = g_ref_e009_p2.outcome := by
  decide

def g_ref_e009_p3 : GoldenRec :=
  ⟨"e009", "ref_e009_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e009_p3.call g_ref_e009_p3.pre = g_ref_e009_p3.outcome := by
  decide

def g_ref_e009_p4 : GoldenRec :=
  ⟨"e009", "ref_e009_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e009_p4.call g_ref_e009_p4.pre = g_ref_e009_p4.outcome := by
  decide

def g_ref_e009_p5 : GoldenRec :=
  ⟨"e009", "ref_e009_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e009_p5.call g_ref_e009_p5.pre = g_ref_e009_p5.outcome := by
  decide

def g_ref_e009_p6 : GoldenRec :=
  ⟨"e009", "ref_e009_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e009_p6.call g_ref_e009_p6.pre = g_ref_e009_p6.outcome := by
  decide

def g_ref_e009_p7 : GoldenRec :=
  ⟨"e009", "ref_e009_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e009_p7.call g_ref_e009_p7.pre = g_ref_e009_p7.outcome := by
  decide

def g_ref_e009_p8 : GoldenRec :=
  ⟨"e009", "ref_e009_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e009_p8.call g_ref_e009_p8.pre = g_ref_e009_p8.outcome := by
  decide

def g_ref_e009_p9 : GoldenRec :=
  ⟨"e009", "ref_e009_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e009_p9.call g_ref_e009_p9.pre = g_ref_e009_p9.outcome := by
  decide

def g_ref_e009_p10 : GoldenRec :=
  ⟨"e009", "ref_e009_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e009_p10.call g_ref_e009_p10.pre = g_ref_e009_p10.outcome := by
  decide

def g_ref_e009_p11 : GoldenRec :=
  ⟨"e009", "ref_e009_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e009_p11.call g_ref_e009_p11.pre = g_ref_e009_p11.outcome := by
  decide

def g_ref_e009_p12 : GoldenRec :=
  ⟨"e009", "ref_e009_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e009_p12.call g_ref_e009_p12.pre = g_ref_e009_p12.outcome := by
  decide

def g_ref_e009_p13 : GoldenRec :=
  ⟨"e009", "ref_e009_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e009_p13.call g_ref_e009_p13.pre = g_ref_e009_p13.outcome := by
  decide

def g_ref_e009_p14 : GoldenRec :=
  ⟨"e009", "ref_e009_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e009_p14.call g_ref_e009_p14.pre = g_ref_e009_p14.outcome := by
  decide

def g_ref_e009_p15 : GoldenRec :=
  ⟨"e009", "ref_e009_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct .sink)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 0), ((.escrow 0), 30)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [])⟩
theorem ref_e009_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e009_p15.call g_ref_e009_p15.pre = g_ref_e009_p15.outcome := by
  decide

def g_ref_e010_p0 : GoldenRec :=
  ⟨"e010", "ref_e010_p0", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e010_p0.call g_ref_e010_p0.pre = g_ref_e010_p0.outcome := by
  decide

def g_ref_e010_p1 : GoldenRec :=
  ⟨"e010", "ref_e010_p1", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e010_p1.call g_ref_e010_p1.pre = g_ref_e010_p1.outcome := by
  decide

def g_ref_e010_p2 : GoldenRec :=
  ⟨"e010", "ref_e010_p2", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e010_p2.call g_ref_e010_p2.pre = g_ref_e010_p2.outcome := by
  decide

def g_ref_e010_p3 : GoldenRec :=
  ⟨"e010", "ref_e010_p3", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e010_p3.call g_ref_e010_p3.pre = g_ref_e010_p3.outcome := by
  decide

def g_ref_e010_p4 : GoldenRec :=
  ⟨"e010", "ref_e010_p4", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e010_p4.call g_ref_e010_p4.pre = g_ref_e010_p4.outcome := by
  decide

def g_ref_e010_p5 : GoldenRec :=
  ⟨"e010", "ref_e010_p5", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e010_p5.call g_ref_e010_p5.pre = g_ref_e010_p5.outcome := by
  decide

def g_ref_e010_p6 : GoldenRec :=
  ⟨"e010", "ref_e010_p6", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e010_p6.call g_ref_e010_p6.pre = g_ref_e010_p6.outcome := by
  decide

def g_ref_e010_p7 : GoldenRec :=
  ⟨"e010", "ref_e010_p7", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e010_p7.call g_ref_e010_p7.pre = g_ref_e010_p7.outcome := by
  decide

def g_ref_e010_p8 : GoldenRec :=
  ⟨"e010", "ref_e010_p8", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e010_p8.call g_ref_e010_p8.pre = g_ref_e010_p8.outcome := by
  decide

def g_ref_e010_p9 : GoldenRec :=
  ⟨"e010", "ref_e010_p9", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e010_p9.call g_ref_e010_p9.pre = g_ref_e010_p9.outcome := by
  decide

def g_ref_e010_p10 : GoldenRec :=
  ⟨"e010", "ref_e010_p10", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e010_p10.call g_ref_e010_p10.pre = g_ref_e010_p10.outcome := by
  decide

def g_ref_e010_p11 : GoldenRec :=
  ⟨"e010", "ref_e010_p11", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e010_p11.call g_ref_e010_p11.pre = g_ref_e010_p11.outcome := by
  decide

def g_ref_e010_p12 : GoldenRec :=
  ⟨"e010", "ref_e010_p12", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e010_p12.call g_ref_e010_p12.pre = g_ref_e010_p12.outcome := by
  decide

def g_ref_e010_p13 : GoldenRec :=
  ⟨"e010", "ref_e010_p13", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e010_p13.call g_ref_e010_p13.pre = g_ref_e010_p13.outcome := by
  decide

def g_ref_e010_p14 : GoldenRec :=
  ⟨"e010", "ref_e010_p14", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e010_p14.call g_ref_e010_p14.pre = g_ref_e010_p14.outcome := by
  decide

def g_ref_e010_p15 : GoldenRec :=
  ⟨"e010", "ref_e010_p15", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 70), (.sink, 30), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨30, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e010_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e010_p15.call g_ref_e010_p15.pre = g_ref_e010_p15.outcome := by
  decide

def g_ref_e011_p0 : GoldenRec :=
  ⟨"e011", "ref_e011_p0", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e011_p0.call g_ref_e011_p0.pre = g_ref_e011_p0.outcome := by
  decide

def g_ref_e011_p1 : GoldenRec :=
  ⟨"e011", "ref_e011_p1", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e011_p1.call g_ref_e011_p1.pre = g_ref_e011_p1.outcome := by
  decide

def g_ref_e011_p2 : GoldenRec :=
  ⟨"e011", "ref_e011_p2", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e011_p2.call g_ref_e011_p2.pre = g_ref_e011_p2.outcome := by
  decide

def g_ref_e011_p3 : GoldenRec :=
  ⟨"e011", "ref_e011_p3", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e011_p3.call g_ref_e011_p3.pre = g_ref_e011_p3.outcome := by
  decide

def g_ref_e011_p4 : GoldenRec :=
  ⟨"e011", "ref_e011_p4", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e011_p4.call g_ref_e011_p4.pre = g_ref_e011_p4.outcome := by
  decide

def g_ref_e011_p5 : GoldenRec :=
  ⟨"e011", "ref_e011_p5", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e011_p5.call g_ref_e011_p5.pre = g_ref_e011_p5.outcome := by
  decide

def g_ref_e011_p6 : GoldenRec :=
  ⟨"e011", "ref_e011_p6", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e011_p6.call g_ref_e011_p6.pre = g_ref_e011_p6.outcome := by
  decide

def g_ref_e011_p7 : GoldenRec :=
  ⟨"e011", "ref_e011_p7", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e011_p7.call g_ref_e011_p7.pre = g_ref_e011_p7.outcome := by
  decide

def g_ref_e011_p8 : GoldenRec :=
  ⟨"e011", "ref_e011_p8", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e011_p8.call g_ref_e011_p8.pre = g_ref_e011_p8.outcome := by
  decide

def g_ref_e011_p9 : GoldenRec :=
  ⟨"e011", "ref_e011_p9", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e011_p9.call g_ref_e011_p9.pre = g_ref_e011_p9.outcome := by
  decide

def g_ref_e011_p10 : GoldenRec :=
  ⟨"e011", "ref_e011_p10", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e011_p10.call g_ref_e011_p10.pre = g_ref_e011_p10.outcome := by
  decide

def g_ref_e011_p11 : GoldenRec :=
  ⟨"e011", "ref_e011_p11", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e011_p11.call g_ref_e011_p11.pre = g_ref_e011_p11.outcome := by
  decide

def g_ref_e011_p12 : GoldenRec :=
  ⟨"e011", "ref_e011_p12", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e011_p12.call g_ref_e011_p12.pre = g_ref_e011_p12.outcome := by
  decide

def g_ref_e011_p13 : GoldenRec :=
  ⟨"e011", "ref_e011_p13", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e011_p13.call g_ref_e011_p13.pre = g_ref_e011_p13.outcome := by
  decide

def g_ref_e011_p14 : GoldenRec :=
  ⟨"e011", "ref_e011_p14", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e011_p14.call g_ref_e011_p14.pre = g_ref_e011_p14.outcome := by
  decide

def g_ref_e011_p15 : GoldenRec :=
  ⟨"e011", "ref_e011_p15", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 67)]⟩,
   { bals := [(.mint, (-468)), ((.user "b"), 279), ((.user "erin"), 189)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-468)), ((.user "b"), 212), ((.user "erin"), 256)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e011_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e011_p15.call g_ref_e011_p15.pre = g_ref_e011_p15.outcome := by
  decide

def g_ref_e012_p0 : GoldenRec :=
  ⟨"e012", "ref_e012_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e012_p0.call g_ref_e012_p0.pre = g_ref_e012_p0.outcome := by
  decide

def g_ref_e012_p1 : GoldenRec :=
  ⟨"e012", "ref_e012_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e012_p1.call g_ref_e012_p1.pre = g_ref_e012_p1.outcome := by
  decide

def g_ref_e012_p2 : GoldenRec :=
  ⟨"e012", "ref_e012_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e012_p2.call g_ref_e012_p2.pre = g_ref_e012_p2.outcome := by
  decide

def g_ref_e012_p3 : GoldenRec :=
  ⟨"e012", "ref_e012_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e012_p3.call g_ref_e012_p3.pre = g_ref_e012_p3.outcome := by
  decide

def g_ref_e012_p4 : GoldenRec :=
  ⟨"e012", "ref_e012_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e012_p4.call g_ref_e012_p4.pre = g_ref_e012_p4.outcome := by
  decide

def g_ref_e012_p5 : GoldenRec :=
  ⟨"e012", "ref_e012_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e012_p5.call g_ref_e012_p5.pre = g_ref_e012_p5.outcome := by
  decide

def g_ref_e012_p6 : GoldenRec :=
  ⟨"e012", "ref_e012_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e012_p6.call g_ref_e012_p6.pre = g_ref_e012_p6.outcome := by
  decide

def g_ref_e012_p7 : GoldenRec :=
  ⟨"e012", "ref_e012_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e012_p7.call g_ref_e012_p7.pre = g_ref_e012_p7.outcome := by
  decide

def g_ref_e012_p8 : GoldenRec :=
  ⟨"e012", "ref_e012_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e012_p8.call g_ref_e012_p8.pre = g_ref_e012_p8.outcome := by
  decide

def g_ref_e012_p9 : GoldenRec :=
  ⟨"e012", "ref_e012_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e012_p9.call g_ref_e012_p9.pre = g_ref_e012_p9.outcome := by
  decide

def g_ref_e012_p10 : GoldenRec :=
  ⟨"e012", "ref_e012_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e012_p10.call g_ref_e012_p10.pre = g_ref_e012_p10.outcome := by
  decide

def g_ref_e012_p11 : GoldenRec :=
  ⟨"e012", "ref_e012_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e012_p11.call g_ref_e012_p11.pre = g_ref_e012_p11.outcome := by
  decide

def g_ref_e012_p12 : GoldenRec :=
  ⟨"e012", "ref_e012_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e012_p12.call g_ref_e012_p12.pre = g_ref_e012_p12.outcome := by
  decide

def g_ref_e012_p13 : GoldenRec :=
  ⟨"e012", "ref_e012_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e012_p13.call g_ref_e012_p13.pre = g_ref_e012_p13.outcome := by
  decide

def g_ref_e012_p14 : GoldenRec :=
  ⟨"e012", "ref_e012_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e012_p14.call g_ref_e012_p14.pre = g_ref_e012_p14.outcome := by
  decide

def g_ref_e012_p15 : GoldenRec :=
  ⟨"e012", "ref_e012_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "d")), (.int 298)]⟩,
   { bals := [(.mint, (-354)), ((.user "erin"), 321), ((.user "d"), 33)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-354)), ((.user "erin"), 23), ((.user "d"), 331)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e012_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e012_p15.call g_ref_e012_p15.pre = g_ref_e012_p15.outcome := by
  decide

def g_ref_e013_p0 : GoldenRec :=
  ⟨"e013", "ref_e013_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e013_p0.call g_ref_e013_p0.pre = g_ref_e013_p0.outcome := by
  decide

def g_ref_e013_p1 : GoldenRec :=
  ⟨"e013", "ref_e013_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e013_p1.call g_ref_e013_p1.pre = g_ref_e013_p1.outcome := by
  decide

def g_ref_e013_p2 : GoldenRec :=
  ⟨"e013", "ref_e013_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e013_p2.call g_ref_e013_p2.pre = g_ref_e013_p2.outcome := by
  decide

def g_ref_e013_p3 : GoldenRec :=
  ⟨"e013", "ref_e013_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e013_p3.call g_ref_e013_p3.pre = g_ref_e013_p3.outcome := by
  decide

def g_ref_e013_p4 : GoldenRec :=
  ⟨"e013", "ref_e013_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e013_p4.call g_ref_e013_p4.pre = g_ref_e013_p4.outcome := by
  decide

def g_ref_e013_p5 : GoldenRec :=
  ⟨"e013", "ref_e013_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e013_p5.call g_ref_e013_p5.pre = g_ref_e013_p5.outcome := by
  decide

def g_ref_e013_p6 : GoldenRec :=
  ⟨"e013", "ref_e013_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e013_p6.call g_ref_e013_p6.pre = g_ref_e013_p6.outcome := by
  decide

def g_ref_e013_p7 : GoldenRec :=
  ⟨"e013", "ref_e013_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e013_p7.call g_ref_e013_p7.pre = g_ref_e013_p7.outcome := by
  decide

def g_ref_e013_p8 : GoldenRec :=
  ⟨"e013", "ref_e013_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e013_p8.call g_ref_e013_p8.pre = g_ref_e013_p8.outcome := by
  decide

def g_ref_e013_p9 : GoldenRec :=
  ⟨"e013", "ref_e013_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e013_p9.call g_ref_e013_p9.pre = g_ref_e013_p9.outcome := by
  decide

def g_ref_e013_p10 : GoldenRec :=
  ⟨"e013", "ref_e013_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e013_p10.call g_ref_e013_p10.pre = g_ref_e013_p10.outcome := by
  decide

def g_ref_e013_p11 : GoldenRec :=
  ⟨"e013", "ref_e013_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e013_p11.call g_ref_e013_p11.pre = g_ref_e013_p11.outcome := by
  decide

def g_ref_e013_p12 : GoldenRec :=
  ⟨"e013", "ref_e013_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e013_p12.call g_ref_e013_p12.pre = g_ref_e013_p12.outcome := by
  decide

def g_ref_e013_p13 : GoldenRec :=
  ⟨"e013", "ref_e013_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e013_p13.call g_ref_e013_p13.pre = g_ref_e013_p13.outcome := by
  decide

def g_ref_e013_p14 : GoldenRec :=
  ⟨"e013", "ref_e013_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e013_p14.call g_ref_e013_p14.pre = g_ref_e013_p14.outcome := by
  decide

def g_ref_e013_p15 : GoldenRec :=
  ⟨"e013", "ref_e013_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "a")), (.int 429)]⟩,
   { bals := [(.mint, (-706)), ((.user "erin"), 466), ((.user "a"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-706)), ((.user "erin"), 37), ((.user "a"), 669)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e013_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e013_p15.call g_ref_e013_p15.pre = g_ref_e013_p15.outcome := by
  decide

def g_ref_e014_p0 : GoldenRec :=
  ⟨"e014", "ref_e014_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e014_p0.call g_ref_e014_p0.pre = g_ref_e014_p0.outcome := by
  decide

def g_ref_e014_p1 : GoldenRec :=
  ⟨"e014", "ref_e014_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e014_p1.call g_ref_e014_p1.pre = g_ref_e014_p1.outcome := by
  decide

def g_ref_e014_p2 : GoldenRec :=
  ⟨"e014", "ref_e014_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e014_p2.call g_ref_e014_p2.pre = g_ref_e014_p2.outcome := by
  decide

def g_ref_e014_p3 : GoldenRec :=
  ⟨"e014", "ref_e014_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e014_p3.call g_ref_e014_p3.pre = g_ref_e014_p3.outcome := by
  decide

def g_ref_e014_p4 : GoldenRec :=
  ⟨"e014", "ref_e014_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e014_p4.call g_ref_e014_p4.pre = g_ref_e014_p4.outcome := by
  decide

def g_ref_e014_p5 : GoldenRec :=
  ⟨"e014", "ref_e014_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e014_p5.call g_ref_e014_p5.pre = g_ref_e014_p5.outcome := by
  decide

def g_ref_e014_p6 : GoldenRec :=
  ⟨"e014", "ref_e014_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e014_p6.call g_ref_e014_p6.pre = g_ref_e014_p6.outcome := by
  decide

def g_ref_e014_p7 : GoldenRec :=
  ⟨"e014", "ref_e014_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e014_p7.call g_ref_e014_p7.pre = g_ref_e014_p7.outcome := by
  decide

def g_ref_e014_p8 : GoldenRec :=
  ⟨"e014", "ref_e014_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e014_p8.call g_ref_e014_p8.pre = g_ref_e014_p8.outcome := by
  decide

def g_ref_e014_p9 : GoldenRec :=
  ⟨"e014", "ref_e014_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e014_p9.call g_ref_e014_p9.pre = g_ref_e014_p9.outcome := by
  decide

def g_ref_e014_p10 : GoldenRec :=
  ⟨"e014", "ref_e014_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e014_p10.call g_ref_e014_p10.pre = g_ref_e014_p10.outcome := by
  decide

def g_ref_e014_p11 : GoldenRec :=
  ⟨"e014", "ref_e014_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e014_p11.call g_ref_e014_p11.pre = g_ref_e014_p11.outcome := by
  decide

def g_ref_e014_p12 : GoldenRec :=
  ⟨"e014", "ref_e014_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e014_p12.call g_ref_e014_p12.pre = g_ref_e014_p12.outcome := by
  decide

def g_ref_e014_p13 : GoldenRec :=
  ⟨"e014", "ref_e014_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e014_p13.call g_ref_e014_p13.pre = g_ref_e014_p13.outcome := by
  decide

def g_ref_e014_p14 : GoldenRec :=
  ⟨"e014", "ref_e014_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e014_p14.call g_ref_e014_p14.pre = g_ref_e014_p14.outcome := by
  decide

def g_ref_e014_p15 : GoldenRec :=
  ⟨"e014", "ref_e014_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 25)]⟩,
   { bals := [(.mint, (-360)), ((.user "c"), 120), ((.user "erin"), 240)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-360)), ((.user "c"), 95), ((.user "erin"), 265)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e014_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e014_p15.call g_ref_e014_p15.pre = g_ref_e014_p15.outcome := by
  decide

def g_ref_e015_p0 : GoldenRec :=
  ⟨"e015", "ref_e015_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e015_p0.call g_ref_e015_p0.pre = g_ref_e015_p0.outcome := by
  decide

def g_ref_e015_p1 : GoldenRec :=
  ⟨"e015", "ref_e015_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e015_p1.call g_ref_e015_p1.pre = g_ref_e015_p1.outcome := by
  decide

def g_ref_e015_p2 : GoldenRec :=
  ⟨"e015", "ref_e015_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e015_p2.call g_ref_e015_p2.pre = g_ref_e015_p2.outcome := by
  decide

def g_ref_e015_p3 : GoldenRec :=
  ⟨"e015", "ref_e015_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e015_p3.call g_ref_e015_p3.pre = g_ref_e015_p3.outcome := by
  decide

def g_ref_e015_p4 : GoldenRec :=
  ⟨"e015", "ref_e015_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e015_p4.call g_ref_e015_p4.pre = g_ref_e015_p4.outcome := by
  decide

def g_ref_e015_p5 : GoldenRec :=
  ⟨"e015", "ref_e015_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e015_p5.call g_ref_e015_p5.pre = g_ref_e015_p5.outcome := by
  decide

def g_ref_e015_p6 : GoldenRec :=
  ⟨"e015", "ref_e015_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e015_p6.call g_ref_e015_p6.pre = g_ref_e015_p6.outcome := by
  decide

def g_ref_e015_p7 : GoldenRec :=
  ⟨"e015", "ref_e015_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e015_p7.call g_ref_e015_p7.pre = g_ref_e015_p7.outcome := by
  decide

def g_ref_e015_p8 : GoldenRec :=
  ⟨"e015", "ref_e015_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e015_p8.call g_ref_e015_p8.pre = g_ref_e015_p8.outcome := by
  decide

def g_ref_e015_p9 : GoldenRec :=
  ⟨"e015", "ref_e015_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e015_p9.call g_ref_e015_p9.pre = g_ref_e015_p9.outcome := by
  decide

def g_ref_e015_p10 : GoldenRec :=
  ⟨"e015", "ref_e015_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e015_p10.call g_ref_e015_p10.pre = g_ref_e015_p10.outcome := by
  decide

def g_ref_e015_p11 : GoldenRec :=
  ⟨"e015", "ref_e015_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e015_p11.call g_ref_e015_p11.pre = g_ref_e015_p11.outcome := by
  decide

def g_ref_e015_p12 : GoldenRec :=
  ⟨"e015", "ref_e015_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e015_p12.call g_ref_e015_p12.pre = g_ref_e015_p12.outcome := by
  decide

def g_ref_e015_p13 : GoldenRec :=
  ⟨"e015", "ref_e015_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e015_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e015_p13.call g_ref_e015_p13.pre = g_ref_e015_p13.outcome := by
  decide

def g_ref_e015_p14 : GoldenRec :=
  ⟨"e015", "ref_e015_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e015_p14.call g_ref_e015_p14.pre = g_ref_e015_p14.outcome := by
  decide

def g_ref_e015_p15 : GoldenRec :=
  ⟨"e015", "ref_e015_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 203)]⟩,
   { bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-146)), ((.user "erin"), 121), ((.user "fay"), 25)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e015_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e015_p15.call g_ref_e015_p15.pre = g_ref_e015_p15.outcome := by
  decide

def g_ref_e016_p0 : GoldenRec :=
  ⟨"e016", "ref_e016_p0", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e016_p0.call g_ref_e016_p0.pre = g_ref_e016_p0.outcome := by
  decide

def g_ref_e016_p1 : GoldenRec :=
  ⟨"e016", "ref_e016_p1", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e016_p1.call g_ref_e016_p1.pre = g_ref_e016_p1.outcome := by
  decide

def g_ref_e016_p2 : GoldenRec :=
  ⟨"e016", "ref_e016_p2", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e016_p2.call g_ref_e016_p2.pre = g_ref_e016_p2.outcome := by
  decide

def g_ref_e016_p3 : GoldenRec :=
  ⟨"e016", "ref_e016_p3", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e016_p3.call g_ref_e016_p3.pre = g_ref_e016_p3.outcome := by
  decide

def g_ref_e016_p4 : GoldenRec :=
  ⟨"e016", "ref_e016_p4", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e016_p4.call g_ref_e016_p4.pre = g_ref_e016_p4.outcome := by
  decide

def g_ref_e016_p5 : GoldenRec :=
  ⟨"e016", "ref_e016_p5", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e016_p5.call g_ref_e016_p5.pre = g_ref_e016_p5.outcome := by
  decide

def g_ref_e016_p6 : GoldenRec :=
  ⟨"e016", "ref_e016_p6", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e016_p6.call g_ref_e016_p6.pre = g_ref_e016_p6.outcome := by
  decide

def g_ref_e016_p7 : GoldenRec :=
  ⟨"e016", "ref_e016_p7", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e016_p7.call g_ref_e016_p7.pre = g_ref_e016_p7.outcome := by
  decide

def g_ref_e016_p8 : GoldenRec :=
  ⟨"e016", "ref_e016_p8", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e016_p8.call g_ref_e016_p8.pre = g_ref_e016_p8.outcome := by
  decide

def g_ref_e016_p9 : GoldenRec :=
  ⟨"e016", "ref_e016_p9", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e016_p9.call g_ref_e016_p9.pre = g_ref_e016_p9.outcome := by
  decide

def g_ref_e016_p10 : GoldenRec :=
  ⟨"e016", "ref_e016_p10", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e016_p10.call g_ref_e016_p10.pre = g_ref_e016_p10.outcome := by
  decide

def g_ref_e016_p11 : GoldenRec :=
  ⟨"e016", "ref_e016_p11", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e016_p11.call g_ref_e016_p11.pre = g_ref_e016_p11.outcome := by
  decide

def g_ref_e016_p12 : GoldenRec :=
  ⟨"e016", "ref_e016_p12", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e016_p12.call g_ref_e016_p12.pre = g_ref_e016_p12.outcome := by
  decide

def g_ref_e016_p13 : GoldenRec :=
  ⟨"e016", "ref_e016_p13", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e016_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e016_p13.call g_ref_e016_p13.pre = g_ref_e016_p13.outcome := by
  decide

def g_ref_e016_p14 : GoldenRec :=
  ⟨"e016", "ref_e016_p14", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e016_p14.call g_ref_e016_p14.pre = g_ref_e016_p14.outcome := by
  decide

def g_ref_e016_p15 : GoldenRec :=
  ⟨"e016", "ref_e016_p15", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "fay")), (.int 229)]⟩,
   { bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-171)), ((.user "b"), 162), ((.user "fay"), 9)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e016_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e016_p15.call g_ref_e016_p15.pre = g_ref_e016_p15.outcome := by
  decide

def g_ref_e017_p0 : GoldenRec :=
  ⟨"e017", "ref_e017_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e017_p0.call g_ref_e017_p0.pre = g_ref_e017_p0.outcome := by
  decide

def g_ref_e017_p1 : GoldenRec :=
  ⟨"e017", "ref_e017_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e017_p1.call g_ref_e017_p1.pre = g_ref_e017_p1.outcome := by
  decide

def g_ref_e017_p2 : GoldenRec :=
  ⟨"e017", "ref_e017_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e017_p2.call g_ref_e017_p2.pre = g_ref_e017_p2.outcome := by
  decide

def g_ref_e017_p3 : GoldenRec :=
  ⟨"e017", "ref_e017_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e017_p3.call g_ref_e017_p3.pre = g_ref_e017_p3.outcome := by
  decide

def g_ref_e017_p4 : GoldenRec :=
  ⟨"e017", "ref_e017_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e017_p4.call g_ref_e017_p4.pre = g_ref_e017_p4.outcome := by
  decide

def g_ref_e017_p5 : GoldenRec :=
  ⟨"e017", "ref_e017_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e017_p5.call g_ref_e017_p5.pre = g_ref_e017_p5.outcome := by
  decide

def g_ref_e017_p6 : GoldenRec :=
  ⟨"e017", "ref_e017_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e017_p6.call g_ref_e017_p6.pre = g_ref_e017_p6.outcome := by
  decide

def g_ref_e017_p7 : GoldenRec :=
  ⟨"e017", "ref_e017_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e017_p7.call g_ref_e017_p7.pre = g_ref_e017_p7.outcome := by
  decide

def g_ref_e017_p8 : GoldenRec :=
  ⟨"e017", "ref_e017_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e017_p8.call g_ref_e017_p8.pre = g_ref_e017_p8.outcome := by
  decide

def g_ref_e017_p9 : GoldenRec :=
  ⟨"e017", "ref_e017_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e017_p9.call g_ref_e017_p9.pre = g_ref_e017_p9.outcome := by
  decide

def g_ref_e017_p10 : GoldenRec :=
  ⟨"e017", "ref_e017_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e017_p10.call g_ref_e017_p10.pre = g_ref_e017_p10.outcome := by
  decide

def g_ref_e017_p11 : GoldenRec :=
  ⟨"e017", "ref_e017_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e017_p11.call g_ref_e017_p11.pre = g_ref_e017_p11.outcome := by
  decide

def g_ref_e017_p12 : GoldenRec :=
  ⟨"e017", "ref_e017_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e017_p12.call g_ref_e017_p12.pre = g_ref_e017_p12.outcome := by
  decide

def g_ref_e017_p13 : GoldenRec :=
  ⟨"e017", "ref_e017_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e017_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e017_p13.call g_ref_e017_p13.pre = g_ref_e017_p13.outcome := by
  decide

def g_ref_e017_p14 : GoldenRec :=
  ⟨"e017", "ref_e017_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e017_p14.call g_ref_e017_p14.pre = g_ref_e017_p14.outcome := by
  decide

def g_ref_e017_p15 : GoldenRec :=
  ⟨"e017", "ref_e017_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "a")), (.int 180)]⟩,
   { bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-220)), ((.user "d"), 171), ((.user "a"), 49)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e017_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e017_p15.call g_ref_e017_p15.pre = g_ref_e017_p15.outcome := by
  decide

def g_ref_e018_p0 : GoldenRec :=
  ⟨"e018", "ref_e018_p0", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e018_p0.call g_ref_e018_p0.pre = g_ref_e018_p0.outcome := by
  decide

def g_ref_e018_p1 : GoldenRec :=
  ⟨"e018", "ref_e018_p1", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e018_p1.call g_ref_e018_p1.pre = g_ref_e018_p1.outcome := by
  decide

def g_ref_e018_p2 : GoldenRec :=
  ⟨"e018", "ref_e018_p2", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e018_p2.call g_ref_e018_p2.pre = g_ref_e018_p2.outcome := by
  decide

def g_ref_e018_p3 : GoldenRec :=
  ⟨"e018", "ref_e018_p3", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e018_p3.call g_ref_e018_p3.pre = g_ref_e018_p3.outcome := by
  decide

def g_ref_e018_p4 : GoldenRec :=
  ⟨"e018", "ref_e018_p4", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e018_p4.call g_ref_e018_p4.pre = g_ref_e018_p4.outcome := by
  decide

def g_ref_e018_p5 : GoldenRec :=
  ⟨"e018", "ref_e018_p5", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e018_p5.call g_ref_e018_p5.pre = g_ref_e018_p5.outcome := by
  decide

def g_ref_e018_p6 : GoldenRec :=
  ⟨"e018", "ref_e018_p6", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e018_p6.call g_ref_e018_p6.pre = g_ref_e018_p6.outcome := by
  decide

def g_ref_e018_p7 : GoldenRec :=
  ⟨"e018", "ref_e018_p7", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e018_p7.call g_ref_e018_p7.pre = g_ref_e018_p7.outcome := by
  decide

def g_ref_e018_p8 : GoldenRec :=
  ⟨"e018", "ref_e018_p8", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e018_p8.call g_ref_e018_p8.pre = g_ref_e018_p8.outcome := by
  decide

def g_ref_e018_p9 : GoldenRec :=
  ⟨"e018", "ref_e018_p9", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e018_p9.call g_ref_e018_p9.pre = g_ref_e018_p9.outcome := by
  decide

def g_ref_e018_p10 : GoldenRec :=
  ⟨"e018", "ref_e018_p10", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e018_p10.call g_ref_e018_p10.pre = g_ref_e018_p10.outcome := by
  decide

def g_ref_e018_p11 : GoldenRec :=
  ⟨"e018", "ref_e018_p11", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e018_p11.call g_ref_e018_p11.pre = g_ref_e018_p11.outcome := by
  decide

def g_ref_e018_p12 : GoldenRec :=
  ⟨"e018", "ref_e018_p12", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e018_p12.call g_ref_e018_p12.pre = g_ref_e018_p12.outcome := by
  decide

def g_ref_e018_p13 : GoldenRec :=
  ⟨"e018", "ref_e018_p13", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e018_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e018_p13.call g_ref_e018_p13.pre = g_ref_e018_p13.outcome := by
  decide

def g_ref_e018_p14 : GoldenRec :=
  ⟨"e018", "ref_e018_p14", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e018_p14.call g_ref_e018_p14.pre = g_ref_e018_p14.outcome := by
  decide

def g_ref_e018_p15 : GoldenRec :=
  ⟨"e018", "ref_e018_p15", "refProgram", ⟨"Transfer", [(.acct (.user "b")), (.acct (.user "erin")), (.int 7)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-6)), ((.user "b"), 6), ((.user "erin"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e018_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e018_p15.call g_ref_e018_p15.pre = g_ref_e018_p15.outcome := by
  decide

def g_ref_e019_p0 : GoldenRec :=
  ⟨"e019", "ref_e019_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e019_p0.call g_ref_e019_p0.pre = g_ref_e019_p0.outcome := by
  decide

def g_ref_e019_p1 : GoldenRec :=
  ⟨"e019", "ref_e019_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e019_p1.call g_ref_e019_p1.pre = g_ref_e019_p1.outcome := by
  decide

def g_ref_e019_p2 : GoldenRec :=
  ⟨"e019", "ref_e019_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e019_p2.call g_ref_e019_p2.pre = g_ref_e019_p2.outcome := by
  decide

def g_ref_e019_p3 : GoldenRec :=
  ⟨"e019", "ref_e019_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e019_p3.call g_ref_e019_p3.pre = g_ref_e019_p3.outcome := by
  decide

def g_ref_e019_p4 : GoldenRec :=
  ⟨"e019", "ref_e019_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e019_p4.call g_ref_e019_p4.pre = g_ref_e019_p4.outcome := by
  decide

def g_ref_e019_p5 : GoldenRec :=
  ⟨"e019", "ref_e019_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e019_p5.call g_ref_e019_p5.pre = g_ref_e019_p5.outcome := by
  decide

def g_ref_e019_p6 : GoldenRec :=
  ⟨"e019", "ref_e019_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e019_p6.call g_ref_e019_p6.pre = g_ref_e019_p6.outcome := by
  decide

def g_ref_e019_p7 : GoldenRec :=
  ⟨"e019", "ref_e019_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e019_p7.call g_ref_e019_p7.pre = g_ref_e019_p7.outcome := by
  decide

def g_ref_e019_p8 : GoldenRec :=
  ⟨"e019", "ref_e019_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e019_p8.call g_ref_e019_p8.pre = g_ref_e019_p8.outcome := by
  decide

def g_ref_e019_p9 : GoldenRec :=
  ⟨"e019", "ref_e019_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e019_p9.call g_ref_e019_p9.pre = g_ref_e019_p9.outcome := by
  decide

def g_ref_e019_p10 : GoldenRec :=
  ⟨"e019", "ref_e019_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e019_p10.call g_ref_e019_p10.pre = g_ref_e019_p10.outcome := by
  decide

def g_ref_e019_p11 : GoldenRec :=
  ⟨"e019", "ref_e019_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e019_p11.call g_ref_e019_p11.pre = g_ref_e019_p11.outcome := by
  decide

def g_ref_e019_p12 : GoldenRec :=
  ⟨"e019", "ref_e019_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e019_p12.call g_ref_e019_p12.pre = g_ref_e019_p12.outcome := by
  decide

def g_ref_e019_p13 : GoldenRec :=
  ⟨"e019", "ref_e019_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e019_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e019_p13.call g_ref_e019_p13.pre = g_ref_e019_p13.outcome := by
  decide

def g_ref_e019_p14 : GoldenRec :=
  ⟨"e019", "ref_e019_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e019_p14.call g_ref_e019_p14.pre = g_ref_e019_p14.outcome := by
  decide

def g_ref_e019_p15 : GoldenRec :=
  ⟨"e019", "ref_e019_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 36)]⟩,
   { bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-35)), ((.user "c"), 35), ((.user "a"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e019_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e019_p15.call g_ref_e019_p15.pre = g_ref_e019_p15.outcome := by
  decide

def g_ref_e020_p0 : GoldenRec :=
  ⟨"e020", "ref_e020_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e020_p0.call g_ref_e020_p0.pre = g_ref_e020_p0.outcome := by
  decide

def g_ref_e020_p1 : GoldenRec :=
  ⟨"e020", "ref_e020_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e020_p1.call g_ref_e020_p1.pre = g_ref_e020_p1.outcome := by
  decide

def g_ref_e020_p2 : GoldenRec :=
  ⟨"e020", "ref_e020_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e020_p2.call g_ref_e020_p2.pre = g_ref_e020_p2.outcome := by
  decide

def g_ref_e020_p3 : GoldenRec :=
  ⟨"e020", "ref_e020_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e020_p3.call g_ref_e020_p3.pre = g_ref_e020_p3.outcome := by
  decide

def g_ref_e020_p4 : GoldenRec :=
  ⟨"e020", "ref_e020_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e020_p4.call g_ref_e020_p4.pre = g_ref_e020_p4.outcome := by
  decide

def g_ref_e020_p5 : GoldenRec :=
  ⟨"e020", "ref_e020_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e020_p5.call g_ref_e020_p5.pre = g_ref_e020_p5.outcome := by
  decide

def g_ref_e020_p6 : GoldenRec :=
  ⟨"e020", "ref_e020_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e020_p6.call g_ref_e020_p6.pre = g_ref_e020_p6.outcome := by
  decide

def g_ref_e020_p7 : GoldenRec :=
  ⟨"e020", "ref_e020_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e020_p7.call g_ref_e020_p7.pre = g_ref_e020_p7.outcome := by
  decide

def g_ref_e020_p8 : GoldenRec :=
  ⟨"e020", "ref_e020_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e020_p8.call g_ref_e020_p8.pre = g_ref_e020_p8.outcome := by
  decide

def g_ref_e020_p9 : GoldenRec :=
  ⟨"e020", "ref_e020_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e020_p9.call g_ref_e020_p9.pre = g_ref_e020_p9.outcome := by
  decide

def g_ref_e020_p10 : GoldenRec :=
  ⟨"e020", "ref_e020_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e020_p10.call g_ref_e020_p10.pre = g_ref_e020_p10.outcome := by
  decide

def g_ref_e020_p11 : GoldenRec :=
  ⟨"e020", "ref_e020_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e020_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e020_p11.call g_ref_e020_p11.pre = g_ref_e020_p11.outcome := by
  decide

def g_ref_e020_p12 : GoldenRec :=
  ⟨"e020", "ref_e020_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e020_p12.call g_ref_e020_p12.pre = g_ref_e020_p12.outcome := by
  decide

def g_ref_e020_p13 : GoldenRec :=
  ⟨"e020", "ref_e020_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e020_p13.call g_ref_e020_p13.pre = g_ref_e020_p13.outcome := by
  decide

def g_ref_e020_p14 : GoldenRec :=
  ⟨"e020", "ref_e020_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e020_p14.call g_ref_e020_p14.pre = g_ref_e020_p14.outcome := by
  decide

def g_ref_e020_p15 : GoldenRec :=
  ⟨"e020", "ref_e020_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 183)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e020_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e020_p15.call g_ref_e020_p15.pre = g_ref_e020_p15.outcome := by
  decide

def g_ref_e021_p0 : GoldenRec :=
  ⟨"e021", "ref_e021_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e021_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e021_p0.call g_ref_e021_p0.pre = g_ref_e021_p0.outcome := by
  decide

def g_ref_e021_p1 : GoldenRec :=
  ⟨"e021", "ref_e021_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e021_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e021_p1.call g_ref_e021_p1.pre = g_ref_e021_p1.outcome := by
  decide

def g_ref_e021_p2 : GoldenRec :=
  ⟨"e021", "ref_e021_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e021_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e021_p2.call g_ref_e021_p2.pre = g_ref_e021_p2.outcome := by
  decide

def g_ref_e021_p3 : GoldenRec :=
  ⟨"e021", "ref_e021_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e021_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e021_p3.call g_ref_e021_p3.pre = g_ref_e021_p3.outcome := by
  decide

def g_ref_e021_p4 : GoldenRec :=
  ⟨"e021", "ref_e021_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e021_p4.call g_ref_e021_p4.pre = g_ref_e021_p4.outcome := by
  decide

def g_ref_e021_p5 : GoldenRec :=
  ⟨"e021", "ref_e021_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e021_p5.call g_ref_e021_p5.pre = g_ref_e021_p5.outcome := by
  decide

def g_ref_e021_p6 : GoldenRec :=
  ⟨"e021", "ref_e021_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e021_p6.call g_ref_e021_p6.pre = g_ref_e021_p6.outcome := by
  decide

def g_ref_e021_p7 : GoldenRec :=
  ⟨"e021", "ref_e021_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e021_p7.call g_ref_e021_p7.pre = g_ref_e021_p7.outcome := by
  decide

def g_ref_e021_p8 : GoldenRec :=
  ⟨"e021", "ref_e021_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e021_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e021_p8.call g_ref_e021_p8.pre = g_ref_e021_p8.outcome := by
  decide

def g_ref_e021_p9 : GoldenRec :=
  ⟨"e021", "ref_e021_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e021_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e021_p9.call g_ref_e021_p9.pre = g_ref_e021_p9.outcome := by
  decide

def g_ref_e021_p10 : GoldenRec :=
  ⟨"e021", "ref_e021_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e021_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e021_p10.call g_ref_e021_p10.pre = g_ref_e021_p10.outcome := by
  decide

def g_ref_e021_p11 : GoldenRec :=
  ⟨"e021", "ref_e021_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e021_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e021_p11.call g_ref_e021_p11.pre = g_ref_e021_p11.outcome := by
  decide

def g_ref_e021_p12 : GoldenRec :=
  ⟨"e021", "ref_e021_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e021_p12.call g_ref_e021_p12.pre = g_ref_e021_p12.outcome := by
  decide

def g_ref_e021_p13 : GoldenRec :=
  ⟨"e021", "ref_e021_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e021_p13.call g_ref_e021_p13.pre = g_ref_e021_p13.outcome := by
  decide

def g_ref_e021_p14 : GoldenRec :=
  ⟨"e021", "ref_e021_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e021_p14.call g_ref_e021_p14.pre = g_ref_e021_p14.outcome := by
  decide

def g_ref_e021_p15 : GoldenRec :=
  ⟨"e021", "ref_e021_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 206)]⟩,
   { bals := [(.mint, (-199)), ((.user "d"), 199)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e021_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e021_p15.call g_ref_e021_p15.pre = g_ref_e021_p15.outcome := by
  decide

def g_ref_e022_p0 : GoldenRec :=
  ⟨"e022", "ref_e022_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e022_p0.call g_ref_e022_p0.pre = g_ref_e022_p0.outcome := by
  decide

def g_ref_e022_p1 : GoldenRec :=
  ⟨"e022", "ref_e022_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e022_p1.call g_ref_e022_p1.pre = g_ref_e022_p1.outcome := by
  decide

def g_ref_e022_p2 : GoldenRec :=
  ⟨"e022", "ref_e022_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e022_p2.call g_ref_e022_p2.pre = g_ref_e022_p2.outcome := by
  decide

def g_ref_e022_p3 : GoldenRec :=
  ⟨"e022", "ref_e022_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e022_p3.call g_ref_e022_p3.pre = g_ref_e022_p3.outcome := by
  decide

def g_ref_e022_p4 : GoldenRec :=
  ⟨"e022", "ref_e022_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e022_p4.call g_ref_e022_p4.pre = g_ref_e022_p4.outcome := by
  decide

def g_ref_e022_p5 : GoldenRec :=
  ⟨"e022", "ref_e022_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e022_p5.call g_ref_e022_p5.pre = g_ref_e022_p5.outcome := by
  decide

def g_ref_e022_p6 : GoldenRec :=
  ⟨"e022", "ref_e022_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e022_p6.call g_ref_e022_p6.pre = g_ref_e022_p6.outcome := by
  decide

def g_ref_e022_p7 : GoldenRec :=
  ⟨"e022", "ref_e022_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e022_p7.call g_ref_e022_p7.pre = g_ref_e022_p7.outcome := by
  decide

def g_ref_e022_p8 : GoldenRec :=
  ⟨"e022", "ref_e022_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e022_p8.call g_ref_e022_p8.pre = g_ref_e022_p8.outcome := by
  decide

def g_ref_e022_p9 : GoldenRec :=
  ⟨"e022", "ref_e022_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e022_p9.call g_ref_e022_p9.pre = g_ref_e022_p9.outcome := by
  decide

def g_ref_e022_p10 : GoldenRec :=
  ⟨"e022", "ref_e022_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e022_p10.call g_ref_e022_p10.pre = g_ref_e022_p10.outcome := by
  decide

def g_ref_e022_p11 : GoldenRec :=
  ⟨"e022", "ref_e022_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e022_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e022_p11.call g_ref_e022_p11.pre = g_ref_e022_p11.outcome := by
  decide

def g_ref_e022_p12 : GoldenRec :=
  ⟨"e022", "ref_e022_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e022_p12.call g_ref_e022_p12.pre = g_ref_e022_p12.outcome := by
  decide

def g_ref_e022_p13 : GoldenRec :=
  ⟨"e022", "ref_e022_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e022_p13.call g_ref_e022_p13.pre = g_ref_e022_p13.outcome := by
  decide

def g_ref_e022_p14 : GoldenRec :=
  ⟨"e022", "ref_e022_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e022_p14.call g_ref_e022_p14.pre = g_ref_e022_p14.outcome := by
  decide

def g_ref_e022_p15 : GoldenRec :=
  ⟨"e022", "ref_e022_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 35)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e022_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e022_p15.call g_ref_e022_p15.pre = g_ref_e022_p15.outcome := by
  decide

def g_ref_e023_p0 : GoldenRec :=
  ⟨"e023", "ref_e023_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e023_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e023_p0.call g_ref_e023_p0.pre = g_ref_e023_p0.outcome := by
  decide

def g_ref_e023_p1 : GoldenRec :=
  ⟨"e023", "ref_e023_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e023_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e023_p1.call g_ref_e023_p1.pre = g_ref_e023_p1.outcome := by
  decide

def g_ref_e023_p2 : GoldenRec :=
  ⟨"e023", "ref_e023_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e023_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e023_p2.call g_ref_e023_p2.pre = g_ref_e023_p2.outcome := by
  decide

def g_ref_e023_p3 : GoldenRec :=
  ⟨"e023", "ref_e023_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e023_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e023_p3.call g_ref_e023_p3.pre = g_ref_e023_p3.outcome := by
  decide

def g_ref_e023_p4 : GoldenRec :=
  ⟨"e023", "ref_e023_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e023_p4.call g_ref_e023_p4.pre = g_ref_e023_p4.outcome := by
  decide

def g_ref_e023_p5 : GoldenRec :=
  ⟨"e023", "ref_e023_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e023_p5.call g_ref_e023_p5.pre = g_ref_e023_p5.outcome := by
  decide

def g_ref_e023_p6 : GoldenRec :=
  ⟨"e023", "ref_e023_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e023_p6.call g_ref_e023_p6.pre = g_ref_e023_p6.outcome := by
  decide

def g_ref_e023_p7 : GoldenRec :=
  ⟨"e023", "ref_e023_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e023_p7.call g_ref_e023_p7.pre = g_ref_e023_p7.outcome := by
  decide

def g_ref_e023_p8 : GoldenRec :=
  ⟨"e023", "ref_e023_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e023_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e023_p8.call g_ref_e023_p8.pre = g_ref_e023_p8.outcome := by
  decide

def g_ref_e023_p9 : GoldenRec :=
  ⟨"e023", "ref_e023_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e023_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e023_p9.call g_ref_e023_p9.pre = g_ref_e023_p9.outcome := by
  decide

def g_ref_e023_p10 : GoldenRec :=
  ⟨"e023", "ref_e023_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e023_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e023_p10.call g_ref_e023_p10.pre = g_ref_e023_p10.outcome := by
  decide

def g_ref_e023_p11 : GoldenRec :=
  ⟨"e023", "ref_e023_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e023_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e023_p11.call g_ref_e023_p11.pre = g_ref_e023_p11.outcome := by
  decide

def g_ref_e023_p12 : GoldenRec :=
  ⟨"e023", "ref_e023_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e023_p12.call g_ref_e023_p12.pre = g_ref_e023_p12.outcome := by
  decide

def g_ref_e023_p13 : GoldenRec :=
  ⟨"e023", "ref_e023_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e023_p13.call g_ref_e023_p13.pre = g_ref_e023_p13.outcome := by
  decide

def g_ref_e023_p14 : GoldenRec :=
  ⟨"e023", "ref_e023_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e023_p14.call g_ref_e023_p14.pre = g_ref_e023_p14.outcome := by
  decide

def g_ref_e023_p15 : GoldenRec :=
  ⟨"e023", "ref_e023_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "d")), (.int 234)]⟩,
   { bals := [(.mint, (-228)), ((.user "d"), 228)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e023_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e023_p15.call g_ref_e023_p15.pre = g_ref_e023_p15.outcome := by
  decide

def g_ref_e024_p0 : GoldenRec :=
  ⟨"e024", "ref_e024_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e024_p0.call g_ref_e024_p0.pre = g_ref_e024_p0.outcome := by
  decide

def g_ref_e024_p1 : GoldenRec :=
  ⟨"e024", "ref_e024_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e024_p1.call g_ref_e024_p1.pre = g_ref_e024_p1.outcome := by
  decide

def g_ref_e024_p2 : GoldenRec :=
  ⟨"e024", "ref_e024_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e024_p2.call g_ref_e024_p2.pre = g_ref_e024_p2.outcome := by
  decide

def g_ref_e024_p3 : GoldenRec :=
  ⟨"e024", "ref_e024_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e024_p3.call g_ref_e024_p3.pre = g_ref_e024_p3.outcome := by
  decide

def g_ref_e024_p4 : GoldenRec :=
  ⟨"e024", "ref_e024_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e024_p4.call g_ref_e024_p4.pre = g_ref_e024_p4.outcome := by
  decide

def g_ref_e024_p5 : GoldenRec :=
  ⟨"e024", "ref_e024_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e024_p5.call g_ref_e024_p5.pre = g_ref_e024_p5.outcome := by
  decide

def g_ref_e024_p6 : GoldenRec :=
  ⟨"e024", "ref_e024_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e024_p6.call g_ref_e024_p6.pre = g_ref_e024_p6.outcome := by
  decide

def g_ref_e024_p7 : GoldenRec :=
  ⟨"e024", "ref_e024_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e024_p7.call g_ref_e024_p7.pre = g_ref_e024_p7.outcome := by
  decide

def g_ref_e024_p8 : GoldenRec :=
  ⟨"e024", "ref_e024_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e024_p8.call g_ref_e024_p8.pre = g_ref_e024_p8.outcome := by
  decide

def g_ref_e024_p9 : GoldenRec :=
  ⟨"e024", "ref_e024_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e024_p9.call g_ref_e024_p9.pre = g_ref_e024_p9.outcome := by
  decide

def g_ref_e024_p10 : GoldenRec :=
  ⟨"e024", "ref_e024_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e024_p10.call g_ref_e024_p10.pre = g_ref_e024_p10.outcome := by
  decide

def g_ref_e024_p11 : GoldenRec :=
  ⟨"e024", "ref_e024_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e024_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e024_p11.call g_ref_e024_p11.pre = g_ref_e024_p11.outcome := by
  decide

def g_ref_e024_p12 : GoldenRec :=
  ⟨"e024", "ref_e024_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e024_p12.call g_ref_e024_p12.pre = g_ref_e024_p12.outcome := by
  decide

def g_ref_e024_p13 : GoldenRec :=
  ⟨"e024", "ref_e024_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e024_p13.call g_ref_e024_p13.pre = g_ref_e024_p13.outcome := by
  decide

def g_ref_e024_p14 : GoldenRec :=
  ⟨"e024", "ref_e024_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e024_p14.call g_ref_e024_p14.pre = g_ref_e024_p14.outcome := by
  decide

def g_ref_e024_p15 : GoldenRec :=
  ⟨"e024", "ref_e024_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 64)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e024_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e024_p15.call g_ref_e024_p15.pre = g_ref_e024_p15.outcome := by
  decide

def g_ref_e025_p0 : GoldenRec :=
  ⟨"e025", "ref_e025_p0", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e025_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e025_p0.call g_ref_e025_p0.pre = g_ref_e025_p0.outcome := by
  decide

def g_ref_e025_p1 : GoldenRec :=
  ⟨"e025", "ref_e025_p1", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e025_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e025_p1.call g_ref_e025_p1.pre = g_ref_e025_p1.outcome := by
  decide

def g_ref_e025_p2 : GoldenRec :=
  ⟨"e025", "ref_e025_p2", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e025_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e025_p2.call g_ref_e025_p2.pre = g_ref_e025_p2.outcome := by
  decide

def g_ref_e025_p3 : GoldenRec :=
  ⟨"e025", "ref_e025_p3", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e025_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e025_p3.call g_ref_e025_p3.pre = g_ref_e025_p3.outcome := by
  decide

def g_ref_e025_p4 : GoldenRec :=
  ⟨"e025", "ref_e025_p4", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e025_p4.call g_ref_e025_p4.pre = g_ref_e025_p4.outcome := by
  decide

def g_ref_e025_p5 : GoldenRec :=
  ⟨"e025", "ref_e025_p5", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e025_p5.call g_ref_e025_p5.pre = g_ref_e025_p5.outcome := by
  decide

def g_ref_e025_p6 : GoldenRec :=
  ⟨"e025", "ref_e025_p6", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e025_p6.call g_ref_e025_p6.pre = g_ref_e025_p6.outcome := by
  decide

def g_ref_e025_p7 : GoldenRec :=
  ⟨"e025", "ref_e025_p7", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e025_p7.call g_ref_e025_p7.pre = g_ref_e025_p7.outcome := by
  decide

def g_ref_e025_p8 : GoldenRec :=
  ⟨"e025", "ref_e025_p8", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e025_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e025_p8.call g_ref_e025_p8.pre = g_ref_e025_p8.outcome := by
  decide

def g_ref_e025_p9 : GoldenRec :=
  ⟨"e025", "ref_e025_p9", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Transfer")⟩
theorem ref_e025_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e025_p9.call g_ref_e025_p9.pre = g_ref_e025_p9.outcome := by
  decide

def g_ref_e025_p10 : GoldenRec :=
  ⟨"e025", "ref_e025_p10", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e025_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e025_p10.call g_ref_e025_p10.pre = g_ref_e025_p10.outcome := by
  decide

def g_ref_e025_p11 : GoldenRec :=
  ⟨"e025", "ref_e025_p11", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e025_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e025_p11.call g_ref_e025_p11.pre = g_ref_e025_p11.outcome := by
  decide

def g_ref_e025_p12 : GoldenRec :=
  ⟨"e025", "ref_e025_p12", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e025_p12.call g_ref_e025_p12.pre = g_ref_e025_p12.outcome := by
  decide

def g_ref_e025_p13 : GoldenRec :=
  ⟨"e025", "ref_e025_p13", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e025_p13.call g_ref_e025_p13.pre = g_ref_e025_p13.outcome := by
  decide

def g_ref_e025_p14 : GoldenRec :=
  ⟨"e025", "ref_e025_p14", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e025_p14.call g_ref_e025_p14.pre = g_ref_e025_p14.outcome := by
  decide

def g_ref_e025_p15 : GoldenRec :=
  ⟨"e025", "ref_e025_p15", "refProgram", ⟨"Transfer", [(.acct (.user "a")), (.acct (.user "a")), (.int 74)]⟩,
   { bals := [(.mint, (-70)), ((.user "a"), 70)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e025_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e025_p15.call g_ref_e025_p15.pre = g_ref_e025_p15.outcome := by
  decide

def g_ref_e026_p0 : GoldenRec :=
  ⟨"e026", "ref_e026_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e026_p0.call g_ref_e026_p0.pre = g_ref_e026_p0.outcome := by
  decide

def g_ref_e026_p1 : GoldenRec :=
  ⟨"e026", "ref_e026_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e026_p1.call g_ref_e026_p1.pre = g_ref_e026_p1.outcome := by
  decide

def g_ref_e026_p2 : GoldenRec :=
  ⟨"e026", "ref_e026_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e026_p2.call g_ref_e026_p2.pre = g_ref_e026_p2.outcome := by
  decide

def g_ref_e026_p3 : GoldenRec :=
  ⟨"e026", "ref_e026_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e026_p3.call g_ref_e026_p3.pre = g_ref_e026_p3.outcome := by
  decide

def g_ref_e026_p4 : GoldenRec :=
  ⟨"e026", "ref_e026_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e026_p4.call g_ref_e026_p4.pre = g_ref_e026_p4.outcome := by
  decide

def g_ref_e026_p5 : GoldenRec :=
  ⟨"e026", "ref_e026_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e026_p5.call g_ref_e026_p5.pre = g_ref_e026_p5.outcome := by
  decide

def g_ref_e026_p6 : GoldenRec :=
  ⟨"e026", "ref_e026_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e026_p6.call g_ref_e026_p6.pre = g_ref_e026_p6.outcome := by
  decide

def g_ref_e026_p7 : GoldenRec :=
  ⟨"e026", "ref_e026_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e026_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e026_p7.call g_ref_e026_p7.pre = g_ref_e026_p7.outcome := by
  decide

def g_ref_e026_p8 : GoldenRec :=
  ⟨"e026", "ref_e026_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e026_p8.call g_ref_e026_p8.pre = g_ref_e026_p8.outcome := by
  decide

def g_ref_e026_p9 : GoldenRec :=
  ⟨"e026", "ref_e026_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e026_p9.call g_ref_e026_p9.pre = g_ref_e026_p9.outcome := by
  decide

def g_ref_e026_p10 : GoldenRec :=
  ⟨"e026", "ref_e026_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e026_p10.call g_ref_e026_p10.pre = g_ref_e026_p10.outcome := by
  decide

def g_ref_e026_p11 : GoldenRec :=
  ⟨"e026", "ref_e026_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e026_p11.call g_ref_e026_p11.pre = g_ref_e026_p11.outcome := by
  decide

def g_ref_e026_p12 : GoldenRec :=
  ⟨"e026", "ref_e026_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e026_p12.call g_ref_e026_p12.pre = g_ref_e026_p12.outcome := by
  decide

def g_ref_e026_p13 : GoldenRec :=
  ⟨"e026", "ref_e026_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e026_p13.call g_ref_e026_p13.pre = g_ref_e026_p13.outcome := by
  decide

def g_ref_e026_p14 : GoldenRec :=
  ⟨"e026", "ref_e026_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e026_p14.call g_ref_e026_p14.pre = g_ref_e026_p14.outcome := by
  decide

def g_ref_e026_p15 : GoldenRec :=
  ⟨"e026", "ref_e026_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-49)), ((.user "c"), 49), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e026_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e026_p15.call g_ref_e026_p15.pre = g_ref_e026_p15.outcome := by
  decide

def g_ref_e027_p0 : GoldenRec :=
  ⟨"e027", "ref_e027_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e027_p0.call g_ref_e027_p0.pre = g_ref_e027_p0.outcome := by
  decide

def g_ref_e027_p1 : GoldenRec :=
  ⟨"e027", "ref_e027_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e027_p1.call g_ref_e027_p1.pre = g_ref_e027_p1.outcome := by
  decide

def g_ref_e027_p2 : GoldenRec :=
  ⟨"e027", "ref_e027_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e027_p2.call g_ref_e027_p2.pre = g_ref_e027_p2.outcome := by
  decide

def g_ref_e027_p3 : GoldenRec :=
  ⟨"e027", "ref_e027_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e027_p3.call g_ref_e027_p3.pre = g_ref_e027_p3.outcome := by
  decide

def g_ref_e027_p4 : GoldenRec :=
  ⟨"e027", "ref_e027_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e027_p4.call g_ref_e027_p4.pre = g_ref_e027_p4.outcome := by
  decide

def g_ref_e027_p5 : GoldenRec :=
  ⟨"e027", "ref_e027_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e027_p5.call g_ref_e027_p5.pre = g_ref_e027_p5.outcome := by
  decide

def g_ref_e027_p6 : GoldenRec :=
  ⟨"e027", "ref_e027_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e027_p6.call g_ref_e027_p6.pre = g_ref_e027_p6.outcome := by
  decide

def g_ref_e027_p7 : GoldenRec :=
  ⟨"e027", "ref_e027_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e027_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e027_p7.call g_ref_e027_p7.pre = g_ref_e027_p7.outcome := by
  decide

def g_ref_e027_p8 : GoldenRec :=
  ⟨"e027", "ref_e027_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e027_p8.call g_ref_e027_p8.pre = g_ref_e027_p8.outcome := by
  decide

def g_ref_e027_p9 : GoldenRec :=
  ⟨"e027", "ref_e027_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e027_p9.call g_ref_e027_p9.pre = g_ref_e027_p9.outcome := by
  decide

def g_ref_e027_p10 : GoldenRec :=
  ⟨"e027", "ref_e027_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e027_p10.call g_ref_e027_p10.pre = g_ref_e027_p10.outcome := by
  decide

def g_ref_e027_p11 : GoldenRec :=
  ⟨"e027", "ref_e027_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e027_p11.call g_ref_e027_p11.pre = g_ref_e027_p11.outcome := by
  decide

def g_ref_e027_p12 : GoldenRec :=
  ⟨"e027", "ref_e027_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e027_p12.call g_ref_e027_p12.pre = g_ref_e027_p12.outcome := by
  decide

def g_ref_e027_p13 : GoldenRec :=
  ⟨"e027", "ref_e027_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e027_p13.call g_ref_e027_p13.pre = g_ref_e027_p13.outcome := by
  decide

def g_ref_e027_p14 : GoldenRec :=
  ⟨"e027", "ref_e027_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e027_p14.call g_ref_e027_p14.pre = g_ref_e027_p14.outcome := by
  decide

def g_ref_e027_p15 : GoldenRec :=
  ⟨"e027", "ref_e027_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e027_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e027_p15.call g_ref_e027_p15.pre = g_ref_e027_p15.outcome := by
  decide

def g_ref_e028_p0 : GoldenRec :=
  ⟨"e028", "ref_e028_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e028_p0.call g_ref_e028_p0.pre = g_ref_e028_p0.outcome := by
  decide

def g_ref_e028_p1 : GoldenRec :=
  ⟨"e028", "ref_e028_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e028_p1.call g_ref_e028_p1.pre = g_ref_e028_p1.outcome := by
  decide

def g_ref_e028_p2 : GoldenRec :=
  ⟨"e028", "ref_e028_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e028_p2.call g_ref_e028_p2.pre = g_ref_e028_p2.outcome := by
  decide

def g_ref_e028_p3 : GoldenRec :=
  ⟨"e028", "ref_e028_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e028_p3.call g_ref_e028_p3.pre = g_ref_e028_p3.outcome := by
  decide

def g_ref_e028_p4 : GoldenRec :=
  ⟨"e028", "ref_e028_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e028_p4.call g_ref_e028_p4.pre = g_ref_e028_p4.outcome := by
  decide

def g_ref_e028_p5 : GoldenRec :=
  ⟨"e028", "ref_e028_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e028_p5.call g_ref_e028_p5.pre = g_ref_e028_p5.outcome := by
  decide

def g_ref_e028_p6 : GoldenRec :=
  ⟨"e028", "ref_e028_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e028_p6.call g_ref_e028_p6.pre = g_ref_e028_p6.outcome := by
  decide

def g_ref_e028_p7 : GoldenRec :=
  ⟨"e028", "ref_e028_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e028_p7.call g_ref_e028_p7.pre = g_ref_e028_p7.outcome := by
  decide

def g_ref_e028_p8 : GoldenRec :=
  ⟨"e028", "ref_e028_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e028_p8.call g_ref_e028_p8.pre = g_ref_e028_p8.outcome := by
  decide

def g_ref_e028_p9 : GoldenRec :=
  ⟨"e028", "ref_e028_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e028_p9.call g_ref_e028_p9.pre = g_ref_e028_p9.outcome := by
  decide

def g_ref_e028_p10 : GoldenRec :=
  ⟨"e028", "ref_e028_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e028_p10.call g_ref_e028_p10.pre = g_ref_e028_p10.outcome := by
  decide

def g_ref_e028_p11 : GoldenRec :=
  ⟨"e028", "ref_e028_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e028_p11.call g_ref_e028_p11.pre = g_ref_e028_p11.outcome := by
  decide

def g_ref_e028_p12 : GoldenRec :=
  ⟨"e028", "ref_e028_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e028_p12.call g_ref_e028_p12.pre = g_ref_e028_p12.outcome := by
  decide

def g_ref_e028_p13 : GoldenRec :=
  ⟨"e028", "ref_e028_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e028_p13.call g_ref_e028_p13.pre = g_ref_e028_p13.outcome := by
  decide

def g_ref_e028_p14 : GoldenRec :=
  ⟨"e028", "ref_e028_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e028_p14.call g_ref_e028_p14.pre = g_ref_e028_p14.outcome := by
  decide

def g_ref_e028_p15 : GoldenRec :=
  ⟨"e028", "ref_e028_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-41))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e028_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e028_p15.call g_ref_e028_p15.pre = g_ref_e028_p15.outcome := by
  decide

def g_ref_e029_p0 : GoldenRec :=
  ⟨"e029", "ref_e029_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e029_p0.call g_ref_e029_p0.pre = g_ref_e029_p0.outcome := by
  decide

def g_ref_e029_p1 : GoldenRec :=
  ⟨"e029", "ref_e029_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e029_p1.call g_ref_e029_p1.pre = g_ref_e029_p1.outcome := by
  decide

def g_ref_e029_p2 : GoldenRec :=
  ⟨"e029", "ref_e029_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e029_p2.call g_ref_e029_p2.pre = g_ref_e029_p2.outcome := by
  decide

def g_ref_e029_p3 : GoldenRec :=
  ⟨"e029", "ref_e029_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e029_p3.call g_ref_e029_p3.pre = g_ref_e029_p3.outcome := by
  decide

def g_ref_e029_p4 : GoldenRec :=
  ⟨"e029", "ref_e029_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e029_p4.call g_ref_e029_p4.pre = g_ref_e029_p4.outcome := by
  decide

def g_ref_e029_p5 : GoldenRec :=
  ⟨"e029", "ref_e029_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e029_p5.call g_ref_e029_p5.pre = g_ref_e029_p5.outcome := by
  decide

def g_ref_e029_p6 : GoldenRec :=
  ⟨"e029", "ref_e029_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e029_p6.call g_ref_e029_p6.pre = g_ref_e029_p6.outcome := by
  decide

def g_ref_e029_p7 : GoldenRec :=
  ⟨"e029", "ref_e029_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e029_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e029_p7.call g_ref_e029_p7.pre = g_ref_e029_p7.outcome := by
  decide

def g_ref_e029_p8 : GoldenRec :=
  ⟨"e029", "ref_e029_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e029_p8.call g_ref_e029_p8.pre = g_ref_e029_p8.outcome := by
  decide

def g_ref_e029_p9 : GoldenRec :=
  ⟨"e029", "ref_e029_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e029_p9.call g_ref_e029_p9.pre = g_ref_e029_p9.outcome := by
  decide

def g_ref_e029_p10 : GoldenRec :=
  ⟨"e029", "ref_e029_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e029_p10.call g_ref_e029_p10.pre = g_ref_e029_p10.outcome := by
  decide

def g_ref_e029_p11 : GoldenRec :=
  ⟨"e029", "ref_e029_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e029_p11.call g_ref_e029_p11.pre = g_ref_e029_p11.outcome := by
  decide

def g_ref_e029_p12 : GoldenRec :=
  ⟨"e029", "ref_e029_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e029_p12.call g_ref_e029_p12.pre = g_ref_e029_p12.outcome := by
  decide

def g_ref_e029_p13 : GoldenRec :=
  ⟨"e029", "ref_e029_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e029_p13.call g_ref_e029_p13.pre = g_ref_e029_p13.outcome := by
  decide

def g_ref_e029_p14 : GoldenRec :=
  ⟨"e029", "ref_e029_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e029_p14.call g_ref_e029_p14.pre = g_ref_e029_p14.outcome := by
  decide

def g_ref_e029_p15 : GoldenRec :=
  ⟨"e029", "ref_e029_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int 0)]⟩,
   { bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-32)), ((.user "c"), 32), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e029_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e029_p15.call g_ref_e029_p15.pre = g_ref_e029_p15.outcome := by
  decide

def g_ref_e030_p0 : GoldenRec :=
  ⟨"e030", "ref_e030_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e030_p0.call g_ref_e030_p0.pre = g_ref_e030_p0.outcome := by
  decide

def g_ref_e030_p1 : GoldenRec :=
  ⟨"e030", "ref_e030_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e030_p1.call g_ref_e030_p1.pre = g_ref_e030_p1.outcome := by
  decide

def g_ref_e030_p2 : GoldenRec :=
  ⟨"e030", "ref_e030_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e030_p2.call g_ref_e030_p2.pre = g_ref_e030_p2.outcome := by
  decide

def g_ref_e030_p3 : GoldenRec :=
  ⟨"e030", "ref_e030_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e030_p3.call g_ref_e030_p3.pre = g_ref_e030_p3.outcome := by
  decide

def g_ref_e030_p4 : GoldenRec :=
  ⟨"e030", "ref_e030_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e030_p4.call g_ref_e030_p4.pre = g_ref_e030_p4.outcome := by
  decide

def g_ref_e030_p5 : GoldenRec :=
  ⟨"e030", "ref_e030_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e030_p5.call g_ref_e030_p5.pre = g_ref_e030_p5.outcome := by
  decide

def g_ref_e030_p6 : GoldenRec :=
  ⟨"e030", "ref_e030_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e030_p6.call g_ref_e030_p6.pre = g_ref_e030_p6.outcome := by
  decide

def g_ref_e030_p7 : GoldenRec :=
  ⟨"e030", "ref_e030_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e030_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e030_p7.call g_ref_e030_p7.pre = g_ref_e030_p7.outcome := by
  decide

def g_ref_e030_p8 : GoldenRec :=
  ⟨"e030", "ref_e030_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e030_p8.call g_ref_e030_p8.pre = g_ref_e030_p8.outcome := by
  decide

def g_ref_e030_p9 : GoldenRec :=
  ⟨"e030", "ref_e030_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e030_p9.call g_ref_e030_p9.pre = g_ref_e030_p9.outcome := by
  decide

def g_ref_e030_p10 : GoldenRec :=
  ⟨"e030", "ref_e030_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e030_p10.call g_ref_e030_p10.pre = g_ref_e030_p10.outcome := by
  decide

def g_ref_e030_p11 : GoldenRec :=
  ⟨"e030", "ref_e030_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e030_p11.call g_ref_e030_p11.pre = g_ref_e030_p11.outcome := by
  decide

def g_ref_e030_p12 : GoldenRec :=
  ⟨"e030", "ref_e030_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e030_p12.call g_ref_e030_p12.pre = g_ref_e030_p12.outcome := by
  decide

def g_ref_e030_p13 : GoldenRec :=
  ⟨"e030", "ref_e030_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e030_p13.call g_ref_e030_p13.pre = g_ref_e030_p13.outcome := by
  decide

def g_ref_e030_p14 : GoldenRec :=
  ⟨"e030", "ref_e030_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e030_p14.call g_ref_e030_p14.pre = g_ref_e030_p14.outcome := by
  decide

def g_ref_e030_p15 : GoldenRec :=
  ⟨"e030", "ref_e030_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "ghost")), (.int 0)]⟩,
   { bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-5)), ((.user "c"), 5)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e030_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e030_p15.call g_ref_e030_p15.pre = g_ref_e030_p15.outcome := by
  decide

def g_ref_e031_p0 : GoldenRec :=
  ⟨"e031", "ref_e031_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e031_p0.call g_ref_e031_p0.pre = g_ref_e031_p0.outcome := by
  decide

def g_ref_e031_p1 : GoldenRec :=
  ⟨"e031", "ref_e031_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e031_p1.call g_ref_e031_p1.pre = g_ref_e031_p1.outcome := by
  decide

def g_ref_e031_p2 : GoldenRec :=
  ⟨"e031", "ref_e031_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e031_p2.call g_ref_e031_p2.pre = g_ref_e031_p2.outcome := by
  decide

def g_ref_e031_p3 : GoldenRec :=
  ⟨"e031", "ref_e031_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e031_p3.call g_ref_e031_p3.pre = g_ref_e031_p3.outcome := by
  decide

def g_ref_e031_p4 : GoldenRec :=
  ⟨"e031", "ref_e031_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e031_p4.call g_ref_e031_p4.pre = g_ref_e031_p4.outcome := by
  decide

def g_ref_e031_p5 : GoldenRec :=
  ⟨"e031", "ref_e031_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e031_p5.call g_ref_e031_p5.pre = g_ref_e031_p5.outcome := by
  decide

def g_ref_e031_p6 : GoldenRec :=
  ⟨"e031", "ref_e031_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e031_p6.call g_ref_e031_p6.pre = g_ref_e031_p6.outcome := by
  decide

def g_ref_e031_p7 : GoldenRec :=
  ⟨"e031", "ref_e031_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e031_p7.call g_ref_e031_p7.pre = g_ref_e031_p7.outcome := by
  decide

def g_ref_e031_p8 : GoldenRec :=
  ⟨"e031", "ref_e031_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e031_p8.call g_ref_e031_p8.pre = g_ref_e031_p8.outcome := by
  decide

def g_ref_e031_p9 : GoldenRec :=
  ⟨"e031", "ref_e031_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e031_p9.call g_ref_e031_p9.pre = g_ref_e031_p9.outcome := by
  decide

def g_ref_e031_p10 : GoldenRec :=
  ⟨"e031", "ref_e031_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e031_p10.call g_ref_e031_p10.pre = g_ref_e031_p10.outcome := by
  decide

def g_ref_e031_p11 : GoldenRec :=
  ⟨"e031", "ref_e031_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e031_p11.call g_ref_e031_p11.pre = g_ref_e031_p11.outcome := by
  decide

def g_ref_e031_p12 : GoldenRec :=
  ⟨"e031", "ref_e031_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e031_p12.call g_ref_e031_p12.pre = g_ref_e031_p12.outcome := by
  decide

def g_ref_e031_p13 : GoldenRec :=
  ⟨"e031", "ref_e031_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e031_p13.call g_ref_e031_p13.pre = g_ref_e031_p13.outcome := by
  decide

def g_ref_e031_p14 : GoldenRec :=
  ⟨"e031", "ref_e031_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e031_p14.call g_ref_e031_p14.pre = g_ref_e031_p14.outcome := by
  decide

def g_ref_e031_p15 : GoldenRec :=
  ⟨"e031", "ref_e031_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "d")), (.int (-25))]⟩,
   { bals := [(.mint, (-50)), ((.user "c"), 50), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e031_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e031_p15.call g_ref_e031_p15.pre = g_ref_e031_p15.outcome := by
  decide

def g_ref_e032_p0 : GoldenRec :=
  ⟨"e032", "ref_e032_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e032_p0.call g_ref_e032_p0.pre = g_ref_e032_p0.outcome := by
  decide

def g_ref_e032_p1 : GoldenRec :=
  ⟨"e032", "ref_e032_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e032_p1.call g_ref_e032_p1.pre = g_ref_e032_p1.outcome := by
  decide

def g_ref_e032_p2 : GoldenRec :=
  ⟨"e032", "ref_e032_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e032_p2.call g_ref_e032_p2.pre = g_ref_e032_p2.outcome := by
  decide

def g_ref_e032_p3 : GoldenRec :=
  ⟨"e032", "ref_e032_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e032_p3.call g_ref_e032_p3.pre = g_ref_e032_p3.outcome := by
  decide

def g_ref_e032_p4 : GoldenRec :=
  ⟨"e032", "ref_e032_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e032_p4.call g_ref_e032_p4.pre = g_ref_e032_p4.outcome := by
  decide

def g_ref_e032_p5 : GoldenRec :=
  ⟨"e032", "ref_e032_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e032_p5.call g_ref_e032_p5.pre = g_ref_e032_p5.outcome := by
  decide

def g_ref_e032_p6 : GoldenRec :=
  ⟨"e032", "ref_e032_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e032_p6.call g_ref_e032_p6.pre = g_ref_e032_p6.outcome := by
  decide

def g_ref_e032_p7 : GoldenRec :=
  ⟨"e032", "ref_e032_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e032_p7.call g_ref_e032_p7.pre = g_ref_e032_p7.outcome := by
  decide

def g_ref_e032_p8 : GoldenRec :=
  ⟨"e032", "ref_e032_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e032_p8.call g_ref_e032_p8.pre = g_ref_e032_p8.outcome := by
  decide

def g_ref_e032_p9 : GoldenRec :=
  ⟨"e032", "ref_e032_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e032_p9.call g_ref_e032_p9.pre = g_ref_e032_p9.outcome := by
  decide

def g_ref_e032_p10 : GoldenRec :=
  ⟨"e032", "ref_e032_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e032_p10.call g_ref_e032_p10.pre = g_ref_e032_p10.outcome := by
  decide

def g_ref_e032_p11 : GoldenRec :=
  ⟨"e032", "ref_e032_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e032_p11.call g_ref_e032_p11.pre = g_ref_e032_p11.outcome := by
  decide

def g_ref_e032_p12 : GoldenRec :=
  ⟨"e032", "ref_e032_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e032_p12.call g_ref_e032_p12.pre = g_ref_e032_p12.outcome := by
  decide

def g_ref_e032_p13 : GoldenRec :=
  ⟨"e032", "ref_e032_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e032_p13.call g_ref_e032_p13.pre = g_ref_e032_p13.outcome := by
  decide

def g_ref_e032_p14 : GoldenRec :=
  ⟨"e032", "ref_e032_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e032_p14.call g_ref_e032_p14.pre = g_ref_e032_p14.outcome := by
  decide

def g_ref_e032_p15 : GoldenRec :=
  ⟨"e032", "ref_e032_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.bool true)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e032_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e032_p15.call g_ref_e032_p15.pre = g_ref_e032_p15.outcome := by
  decide

def g_ref_e033_p0 : GoldenRec :=
  ⟨"e033", "ref_e033_p0", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e033_p0.call g_ref_e033_p0.pre = g_ref_e033_p0.outcome := by
  decide

def g_ref_e033_p1 : GoldenRec :=
  ⟨"e033", "ref_e033_p1", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e033_p1.call g_ref_e033_p1.pre = g_ref_e033_p1.outcome := by
  decide

def g_ref_e033_p2 : GoldenRec :=
  ⟨"e033", "ref_e033_p2", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e033_p2.call g_ref_e033_p2.pre = g_ref_e033_p2.outcome := by
  decide

def g_ref_e033_p3 : GoldenRec :=
  ⟨"e033", "ref_e033_p3", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e033_p3.call g_ref_e033_p3.pre = g_ref_e033_p3.outcome := by
  decide

def g_ref_e033_p4 : GoldenRec :=
  ⟨"e033", "ref_e033_p4", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e033_p4.call g_ref_e033_p4.pre = g_ref_e033_p4.outcome := by
  decide

def g_ref_e033_p5 : GoldenRec :=
  ⟨"e033", "ref_e033_p5", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e033_p5.call g_ref_e033_p5.pre = g_ref_e033_p5.outcome := by
  decide

def g_ref_e033_p6 : GoldenRec :=
  ⟨"e033", "ref_e033_p6", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e033_p6.call g_ref_e033_p6.pre = g_ref_e033_p6.outcome := by
  decide

def g_ref_e033_p7 : GoldenRec :=
  ⟨"e033", "ref_e033_p7", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e033_p7.call g_ref_e033_p7.pre = g_ref_e033_p7.outcome := by
  decide

def g_ref_e033_p8 : GoldenRec :=
  ⟨"e033", "ref_e033_p8", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e033_p8.call g_ref_e033_p8.pre = g_ref_e033_p8.outcome := by
  decide

def g_ref_e033_p9 : GoldenRec :=
  ⟨"e033", "ref_e033_p9", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e033_p9.call g_ref_e033_p9.pre = g_ref_e033_p9.outcome := by
  decide

def g_ref_e033_p10 : GoldenRec :=
  ⟨"e033", "ref_e033_p10", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e033_p10.call g_ref_e033_p10.pre = g_ref_e033_p10.outcome := by
  decide

def g_ref_e033_p11 : GoldenRec :=
  ⟨"e033", "ref_e033_p11", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e033_p11.call g_ref_e033_p11.pre = g_ref_e033_p11.outcome := by
  decide

def g_ref_e033_p12 : GoldenRec :=
  ⟨"e033", "ref_e033_p12", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e033_p12.call g_ref_e033_p12.pre = g_ref_e033_p12.outcome := by
  decide

def g_ref_e033_p13 : GoldenRec :=
  ⟨"e033", "ref_e033_p13", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e033_p13.call g_ref_e033_p13.pre = g_ref_e033_p13.outcome := by
  decide

def g_ref_e033_p14 : GoldenRec :=
  ⟨"e033", "ref_e033_p14", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e033_p14.call g_ref_e033_p14.pre = g_ref_e033_p14.outcome := by
  decide

def g_ref_e033_p15 : GoldenRec :=
  ⟨"e033", "ref_e033_p15", "refProgram", ⟨"Transfer", [(.int 1), (.acct (.user "c")), (.int 5)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "from")⟩
theorem ref_e033_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e033_p15.call g_ref_e033_p15.pre = g_ref_e033_p15.outcome := by
  decide

def g_ref_e034_p0 : GoldenRec :=
  ⟨"e034", "ref_e034_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e034_p0.call g_ref_e034_p0.pre = g_ref_e034_p0.outcome := by
  decide

def g_ref_e034_p1 : GoldenRec :=
  ⟨"e034", "ref_e034_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e034_p1.call g_ref_e034_p1.pre = g_ref_e034_p1.outcome := by
  decide

def g_ref_e034_p2 : GoldenRec :=
  ⟨"e034", "ref_e034_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e034_p2.call g_ref_e034_p2.pre = g_ref_e034_p2.outcome := by
  decide

def g_ref_e034_p3 : GoldenRec :=
  ⟨"e034", "ref_e034_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e034_p3.call g_ref_e034_p3.pre = g_ref_e034_p3.outcome := by
  decide

def g_ref_e034_p4 : GoldenRec :=
  ⟨"e034", "ref_e034_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e034_p4.call g_ref_e034_p4.pre = g_ref_e034_p4.outcome := by
  decide

def g_ref_e034_p5 : GoldenRec :=
  ⟨"e034", "ref_e034_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e034_p5.call g_ref_e034_p5.pre = g_ref_e034_p5.outcome := by
  decide

def g_ref_e034_p6 : GoldenRec :=
  ⟨"e034", "ref_e034_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e034_p6.call g_ref_e034_p6.pre = g_ref_e034_p6.outcome := by
  decide

def g_ref_e034_p7 : GoldenRec :=
  ⟨"e034", "ref_e034_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e034_p7.call g_ref_e034_p7.pre = g_ref_e034_p7.outcome := by
  decide

def g_ref_e034_p8 : GoldenRec :=
  ⟨"e034", "ref_e034_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e034_p8.call g_ref_e034_p8.pre = g_ref_e034_p8.outcome := by
  decide

def g_ref_e034_p9 : GoldenRec :=
  ⟨"e034", "ref_e034_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e034_p9.call g_ref_e034_p9.pre = g_ref_e034_p9.outcome := by
  decide

def g_ref_e034_p10 : GoldenRec :=
  ⟨"e034", "ref_e034_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e034_p10.call g_ref_e034_p10.pre = g_ref_e034_p10.outcome := by
  decide

def g_ref_e034_p11 : GoldenRec :=
  ⟨"e034", "ref_e034_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e034_p11.call g_ref_e034_p11.pre = g_ref_e034_p11.outcome := by
  decide

def g_ref_e034_p12 : GoldenRec :=
  ⟨"e034", "ref_e034_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e034_p12.call g_ref_e034_p12.pre = g_ref_e034_p12.outcome := by
  decide

def g_ref_e034_p13 : GoldenRec :=
  ⟨"e034", "ref_e034_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e034_p13.call g_ref_e034_p13.pre = g_ref_e034_p13.outcome := by
  decide

def g_ref_e034_p14 : GoldenRec :=
  ⟨"e034", "ref_e034_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e034_p14.call g_ref_e034_p14.pre = g_ref_e034_p14.outcome := by
  decide

def g_ref_e034_p15 : GoldenRec :=
  ⟨"e034", "ref_e034_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c"))]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e034_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e034_p15.call g_ref_e034_p15.pre = g_ref_e034_p15.outcome := by
  decide

def g_ref_e035_p0 : GoldenRec :=
  ⟨"e035", "ref_e035_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e035_p0.call g_ref_e035_p0.pre = g_ref_e035_p0.outcome := by
  decide

def g_ref_e035_p1 : GoldenRec :=
  ⟨"e035", "ref_e035_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e035_p1.call g_ref_e035_p1.pre = g_ref_e035_p1.outcome := by
  decide

def g_ref_e035_p2 : GoldenRec :=
  ⟨"e035", "ref_e035_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e035_p2.call g_ref_e035_p2.pre = g_ref_e035_p2.outcome := by
  decide

def g_ref_e035_p3 : GoldenRec :=
  ⟨"e035", "ref_e035_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e035_p3.call g_ref_e035_p3.pre = g_ref_e035_p3.outcome := by
  decide

def g_ref_e035_p4 : GoldenRec :=
  ⟨"e035", "ref_e035_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e035_p4.call g_ref_e035_p4.pre = g_ref_e035_p4.outcome := by
  decide

def g_ref_e035_p5 : GoldenRec :=
  ⟨"e035", "ref_e035_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e035_p5.call g_ref_e035_p5.pre = g_ref_e035_p5.outcome := by
  decide

def g_ref_e035_p6 : GoldenRec :=
  ⟨"e035", "ref_e035_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e035_p6.call g_ref_e035_p6.pre = g_ref_e035_p6.outcome := by
  decide

def g_ref_e035_p7 : GoldenRec :=
  ⟨"e035", "ref_e035_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e035_p7.call g_ref_e035_p7.pre = g_ref_e035_p7.outcome := by
  decide

def g_ref_e035_p8 : GoldenRec :=
  ⟨"e035", "ref_e035_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e035_p8.call g_ref_e035_p8.pre = g_ref_e035_p8.outcome := by
  decide

def g_ref_e035_p9 : GoldenRec :=
  ⟨"e035", "ref_e035_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e035_p9.call g_ref_e035_p9.pre = g_ref_e035_p9.outcome := by
  decide

def g_ref_e035_p10 : GoldenRec :=
  ⟨"e035", "ref_e035_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e035_p10.call g_ref_e035_p10.pre = g_ref_e035_p10.outcome := by
  decide

def g_ref_e035_p11 : GoldenRec :=
  ⟨"e035", "ref_e035_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e035_p11.call g_ref_e035_p11.pre = g_ref_e035_p11.outcome := by
  decide

def g_ref_e035_p12 : GoldenRec :=
  ⟨"e035", "ref_e035_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e035_p12.call g_ref_e035_p12.pre = g_ref_e035_p12.outcome := by
  decide

def g_ref_e035_p13 : GoldenRec :=
  ⟨"e035", "ref_e035_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e035_p13.call g_ref_e035_p13.pre = g_ref_e035_p13.outcome := by
  decide

def g_ref_e035_p14 : GoldenRec :=
  ⟨"e035", "ref_e035_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e035_p14.call g_ref_e035_p14.pre = g_ref_e035_p14.outcome := by
  decide

def g_ref_e035_p15 : GoldenRec :=
  ⟨"e035", "ref_e035_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "c")), (.int 5), (.int 6)]⟩,
   { bals := [(.mint, (-50)), ((.user "erin"), 50), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "arity")⟩
theorem ref_e035_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e035_p15.call g_ref_e035_p15.pre = g_ref_e035_p15.outcome := by
  decide

def g_ref_e036_p0 : GoldenRec :=
  ⟨"e036", "ref_e036_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e036_p0.call g_ref_e036_p0.pre = g_ref_e036_p0.outcome := by
  decide

def g_ref_e036_p1 : GoldenRec :=
  ⟨"e036", "ref_e036_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e036_p1.call g_ref_e036_p1.pre = g_ref_e036_p1.outcome := by
  decide

def g_ref_e036_p2 : GoldenRec :=
  ⟨"e036", "ref_e036_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e036_p2.call g_ref_e036_p2.pre = g_ref_e036_p2.outcome := by
  decide

def g_ref_e036_p3 : GoldenRec :=
  ⟨"e036", "ref_e036_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e036_p3.call g_ref_e036_p3.pre = g_ref_e036_p3.outcome := by
  decide

def g_ref_e036_p4 : GoldenRec :=
  ⟨"e036", "ref_e036_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e036_p4.call g_ref_e036_p4.pre = g_ref_e036_p4.outcome := by
  decide

def g_ref_e036_p5 : GoldenRec :=
  ⟨"e036", "ref_e036_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e036_p5.call g_ref_e036_p5.pre = g_ref_e036_p5.outcome := by
  decide

def g_ref_e036_p6 : GoldenRec :=
  ⟨"e036", "ref_e036_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e036_p6.call g_ref_e036_p6.pre = g_ref_e036_p6.outcome := by
  decide

def g_ref_e036_p7 : GoldenRec :=
  ⟨"e036", "ref_e036_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e036_p7.call g_ref_e036_p7.pre = g_ref_e036_p7.outcome := by
  decide

def g_ref_e036_p8 : GoldenRec :=
  ⟨"e036", "ref_e036_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e036_p8.call g_ref_e036_p8.pre = g_ref_e036_p8.outcome := by
  decide

def g_ref_e036_p9 : GoldenRec :=
  ⟨"e036", "ref_e036_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e036_p9.call g_ref_e036_p9.pre = g_ref_e036_p9.outcome := by
  decide

def g_ref_e036_p10 : GoldenRec :=
  ⟨"e036", "ref_e036_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e036_p10.call g_ref_e036_p10.pre = g_ref_e036_p10.outcome := by
  decide

def g_ref_e036_p11 : GoldenRec :=
  ⟨"e036", "ref_e036_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e036_p11.call g_ref_e036_p11.pre = g_ref_e036_p11.outcome := by
  decide

def g_ref_e036_p12 : GoldenRec :=
  ⟨"e036", "ref_e036_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e036_p12.call g_ref_e036_p12.pre = g_ref_e036_p12.outcome := by
  decide

def g_ref_e036_p13 : GoldenRec :=
  ⟨"e036", "ref_e036_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e036_p13.call g_ref_e036_p13.pre = g_ref_e036_p13.outcome := by
  decide

def g_ref_e036_p14 : GoldenRec :=
  ⟨"e036", "ref_e036_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e036_p14.call g_ref_e036_p14.pre = g_ref_e036_p14.outcome := by
  decide

def g_ref_e036_p15 : GoldenRec :=
  ⟨"e036", "ref_e036_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e036_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e036_p15.call g_ref_e036_p15.pre = g_ref_e036_p15.outcome := by
  decide

def g_ref_e037_p0 : GoldenRec :=
  ⟨"e037", "ref_e037_p0", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e037_p0.call g_ref_e037_p0.pre = g_ref_e037_p0.outcome := by
  decide

def g_ref_e037_p1 : GoldenRec :=
  ⟨"e037", "ref_e037_p1", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e037_p1.call g_ref_e037_p1.pre = g_ref_e037_p1.outcome := by
  decide

def g_ref_e037_p2 : GoldenRec :=
  ⟨"e037", "ref_e037_p2", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e037_p2.call g_ref_e037_p2.pre = g_ref_e037_p2.outcome := by
  decide

def g_ref_e037_p3 : GoldenRec :=
  ⟨"e037", "ref_e037_p3", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e037_p3.call g_ref_e037_p3.pre = g_ref_e037_p3.outcome := by
  decide

def g_ref_e037_p4 : GoldenRec :=
  ⟨"e037", "ref_e037_p4", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e037_p4.call g_ref_e037_p4.pre = g_ref_e037_p4.outcome := by
  decide

def g_ref_e037_p5 : GoldenRec :=
  ⟨"e037", "ref_e037_p5", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e037_p5.call g_ref_e037_p5.pre = g_ref_e037_p5.outcome := by
  decide

def g_ref_e037_p6 : GoldenRec :=
  ⟨"e037", "ref_e037_p6", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e037_p6.call g_ref_e037_p6.pre = g_ref_e037_p6.outcome := by
  decide

def g_ref_e037_p7 : GoldenRec :=
  ⟨"e037", "ref_e037_p7", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e037_p7.call g_ref_e037_p7.pre = g_ref_e037_p7.outcome := by
  decide

def g_ref_e037_p8 : GoldenRec :=
  ⟨"e037", "ref_e037_p8", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e037_p8.call g_ref_e037_p8.pre = g_ref_e037_p8.outcome := by
  decide

def g_ref_e037_p9 : GoldenRec :=
  ⟨"e037", "ref_e037_p9", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e037_p9.call g_ref_e037_p9.pre = g_ref_e037_p9.outcome := by
  decide

def g_ref_e037_p10 : GoldenRec :=
  ⟨"e037", "ref_e037_p10", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e037_p10.call g_ref_e037_p10.pre = g_ref_e037_p10.outcome := by
  decide

def g_ref_e037_p11 : GoldenRec :=
  ⟨"e037", "ref_e037_p11", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e037_p11.call g_ref_e037_p11.pre = g_ref_e037_p11.outcome := by
  decide

def g_ref_e037_p12 : GoldenRec :=
  ⟨"e037", "ref_e037_p12", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e037_p12.call g_ref_e037_p12.pre = g_ref_e037_p12.outcome := by
  decide

def g_ref_e037_p13 : GoldenRec :=
  ⟨"e037", "ref_e037_p13", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e037_p13.call g_ref_e037_p13.pre = g_ref_e037_p13.outcome := by
  decide

def g_ref_e037_p14 : GoldenRec :=
  ⟨"e037", "ref_e037_p14", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e037_p14.call g_ref_e037_p14.pre = g_ref_e037_p14.outcome := by
  decide

def g_ref_e037_p15 : GoldenRec :=
  ⟨"e037", "ref_e037_p15", "refProgram", ⟨"Transfer", [(.acct (.user "erin")), (.acct (.user "fay")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "fay"))⟩
theorem ref_e037_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e037_p15.call g_ref_e037_p15.pre = g_ref_e037_p15.outcome := by
  decide

def g_ref_e038_p0 : GoldenRec :=
  ⟨"e038", "ref_e038_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e038_p0.call g_ref_e038_p0.pre = g_ref_e038_p0.outcome := by
  decide

def g_ref_e038_p1 : GoldenRec :=
  ⟨"e038", "ref_e038_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e038_p1.call g_ref_e038_p1.pre = g_ref_e038_p1.outcome := by
  decide

def g_ref_e038_p2 : GoldenRec :=
  ⟨"e038", "ref_e038_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e038_p2.call g_ref_e038_p2.pre = g_ref_e038_p2.outcome := by
  decide

def g_ref_e038_p3 : GoldenRec :=
  ⟨"e038", "ref_e038_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e038_p3.call g_ref_e038_p3.pre = g_ref_e038_p3.outcome := by
  decide

def g_ref_e038_p4 : GoldenRec :=
  ⟨"e038", "ref_e038_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e038_p4.call g_ref_e038_p4.pre = g_ref_e038_p4.outcome := by
  decide

def g_ref_e038_p5 : GoldenRec :=
  ⟨"e038", "ref_e038_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e038_p5.call g_ref_e038_p5.pre = g_ref_e038_p5.outcome := by
  decide

def g_ref_e038_p6 : GoldenRec :=
  ⟨"e038", "ref_e038_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e038_p6.call g_ref_e038_p6.pre = g_ref_e038_p6.outcome := by
  decide

def g_ref_e038_p7 : GoldenRec :=
  ⟨"e038", "ref_e038_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e038_p7.call g_ref_e038_p7.pre = g_ref_e038_p7.outcome := by
  decide

def g_ref_e038_p8 : GoldenRec :=
  ⟨"e038", "ref_e038_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e038_p8.call g_ref_e038_p8.pre = g_ref_e038_p8.outcome := by
  decide

def g_ref_e038_p9 : GoldenRec :=
  ⟨"e038", "ref_e038_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e038_p9.call g_ref_e038_p9.pre = g_ref_e038_p9.outcome := by
  decide

def g_ref_e038_p10 : GoldenRec :=
  ⟨"e038", "ref_e038_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e038_p10.call g_ref_e038_p10.pre = g_ref_e038_p10.outcome := by
  decide

def g_ref_e038_p11 : GoldenRec :=
  ⟨"e038", "ref_e038_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e038_p11.call g_ref_e038_p11.pre = g_ref_e038_p11.outcome := by
  decide

def g_ref_e038_p12 : GoldenRec :=
  ⟨"e038", "ref_e038_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e038_p12.call g_ref_e038_p12.pre = g_ref_e038_p12.outcome := by
  decide

def g_ref_e038_p13 : GoldenRec :=
  ⟨"e038", "ref_e038_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e038_p13.call g_ref_e038_p13.pre = g_ref_e038_p13.outcome := by
  decide

def g_ref_e038_p14 : GoldenRec :=
  ⟨"e038", "ref_e038_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e038_p14.call g_ref_e038_p14.pre = g_ref_e038_p14.outcome := by
  decide

def g_ref_e038_p15 : GoldenRec :=
  ⟨"e038", "ref_e038_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 5)]⟩,
   { bals := [(.mint, (-10)), ((.user "erin"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e038_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e038_p15.call g_ref_e038_p15.pre = g_ref_e038_p15.outcome := by
  decide

def g_ref_e039_p0 : GoldenRec :=
  ⟨"e039", "ref_e039_p0", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e039_p0.call g_ref_e039_p0.pre = g_ref_e039_p0.outcome := by
  decide

def g_ref_e039_p1 : GoldenRec :=
  ⟨"e039", "ref_e039_p1", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e039_p1.call g_ref_e039_p1.pre = g_ref_e039_p1.outcome := by
  decide

def g_ref_e039_p2 : GoldenRec :=
  ⟨"e039", "ref_e039_p2", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e039_p2.call g_ref_e039_p2.pre = g_ref_e039_p2.outcome := by
  decide

def g_ref_e039_p3 : GoldenRec :=
  ⟨"e039", "ref_e039_p3", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e039_p3.call g_ref_e039_p3.pre = g_ref_e039_p3.outcome := by
  decide

def g_ref_e039_p4 : GoldenRec :=
  ⟨"e039", "ref_e039_p4", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e039_p4.call g_ref_e039_p4.pre = g_ref_e039_p4.outcome := by
  decide

def g_ref_e039_p5 : GoldenRec :=
  ⟨"e039", "ref_e039_p5", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e039_p5.call g_ref_e039_p5.pre = g_ref_e039_p5.outcome := by
  decide

def g_ref_e039_p6 : GoldenRec :=
  ⟨"e039", "ref_e039_p6", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e039_p6.call g_ref_e039_p6.pre = g_ref_e039_p6.outcome := by
  decide

def g_ref_e039_p7 : GoldenRec :=
  ⟨"e039", "ref_e039_p7", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e039_p7.call g_ref_e039_p7.pre = g_ref_e039_p7.outcome := by
  decide

def g_ref_e039_p8 : GoldenRec :=
  ⟨"e039", "ref_e039_p8", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e039_p8.call g_ref_e039_p8.pre = g_ref_e039_p8.outcome := by
  decide

def g_ref_e039_p9 : GoldenRec :=
  ⟨"e039", "ref_e039_p9", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e039_p9.call g_ref_e039_p9.pre = g_ref_e039_p9.outcome := by
  decide

def g_ref_e039_p10 : GoldenRec :=
  ⟨"e039", "ref_e039_p10", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e039_p10.call g_ref_e039_p10.pre = g_ref_e039_p10.outcome := by
  decide

def g_ref_e039_p11 : GoldenRec :=
  ⟨"e039", "ref_e039_p11", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e039_p11.call g_ref_e039_p11.pre = g_ref_e039_p11.outcome := by
  decide

def g_ref_e039_p12 : GoldenRec :=
  ⟨"e039", "ref_e039_p12", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e039_p12.call g_ref_e039_p12.pre = g_ref_e039_p12.outcome := by
  decide

def g_ref_e039_p13 : GoldenRec :=
  ⟨"e039", "ref_e039_p13", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e039_p13.call g_ref_e039_p13.pre = g_ref_e039_p13.outcome := by
  decide

def g_ref_e039_p14 : GoldenRec :=
  ⟨"e039", "ref_e039_p14", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e039_p14.call g_ref_e039_p14.pre = g_ref_e039_p14.outcome := by
  decide

def g_ref_e039_p15 : GoldenRec :=
  ⟨"e039", "ref_e039_p15", "refProgram", ⟨"Transfer", [(.acct (.user "d")), (.acct (.user "erin")), (.int 20)]⟩,
   { bals := [(.mint, (-10)), ((.user "d"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e039_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e039_p15.call g_ref_e039_p15.pre = g_ref_e039_p15.outcome := by
  decide

def g_ref_e040_p0 : GoldenRec :=
  ⟨"e040", "ref_e040_p0", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e040_p0.call g_ref_e040_p0.pre = g_ref_e040_p0.outcome := by
  decide

def g_ref_e040_p1 : GoldenRec :=
  ⟨"e040", "ref_e040_p1", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e040_p1.call g_ref_e040_p1.pre = g_ref_e040_p1.outcome := by
  decide

def g_ref_e040_p2 : GoldenRec :=
  ⟨"e040", "ref_e040_p2", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e040_p2.call g_ref_e040_p2.pre = g_ref_e040_p2.outcome := by
  decide

def g_ref_e040_p3 : GoldenRec :=
  ⟨"e040", "ref_e040_p3", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e040_p3.call g_ref_e040_p3.pre = g_ref_e040_p3.outcome := by
  decide

def g_ref_e040_p4 : GoldenRec :=
  ⟨"e040", "ref_e040_p4", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e040_p4.call g_ref_e040_p4.pre = g_ref_e040_p4.outcome := by
  decide

def g_ref_e040_p5 : GoldenRec :=
  ⟨"e040", "ref_e040_p5", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e040_p5.call g_ref_e040_p5.pre = g_ref_e040_p5.outcome := by
  decide

def g_ref_e040_p6 : GoldenRec :=
  ⟨"e040", "ref_e040_p6", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e040_p6.call g_ref_e040_p6.pre = g_ref_e040_p6.outcome := by
  decide

def g_ref_e040_p7 : GoldenRec :=
  ⟨"e040", "ref_e040_p7", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e040_p7.call g_ref_e040_p7.pre = g_ref_e040_p7.outcome := by
  decide

def g_ref_e040_p8 : GoldenRec :=
  ⟨"e040", "ref_e040_p8", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e040_p8.call g_ref_e040_p8.pre = g_ref_e040_p8.outcome := by
  decide

def g_ref_e040_p9 : GoldenRec :=
  ⟨"e040", "ref_e040_p9", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e040_p9.call g_ref_e040_p9.pre = g_ref_e040_p9.outcome := by
  decide

def g_ref_e040_p10 : GoldenRec :=
  ⟨"e040", "ref_e040_p10", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e040_p10.call g_ref_e040_p10.pre = g_ref_e040_p10.outcome := by
  decide

def g_ref_e040_p11 : GoldenRec :=
  ⟨"e040", "ref_e040_p11", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e040_p11.call g_ref_e040_p11.pre = g_ref_e040_p11.outcome := by
  decide

def g_ref_e040_p12 : GoldenRec :=
  ⟨"e040", "ref_e040_p12", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e040_p12.call g_ref_e040_p12.pre = g_ref_e040_p12.outcome := by
  decide

def g_ref_e040_p13 : GoldenRec :=
  ⟨"e040", "ref_e040_p13", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e040_p13.call g_ref_e040_p13.pre = g_ref_e040_p13.outcome := by
  decide

def g_ref_e040_p14 : GoldenRec :=
  ⟨"e040", "ref_e040_p14", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e040_p14.call g_ref_e040_p14.pre = g_ref_e040_p14.outcome := by
  decide

def g_ref_e040_p15 : GoldenRec :=
  ⟨"e040", "ref_e040_p15", "refProgram", ⟨"Transfr", [(.acct (.user "a")), (.acct (.user "b")), (.int 5)]⟩,
   { bals := [(.mint, (-100)), ((.user "a"), 100), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownCommand "Transfr")⟩
theorem ref_e040_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e040_p15.call g_ref_e040_p15.pre = g_ref_e040_p15.outcome := by
  decide

def g_ref_e041_p0 : GoldenRec :=
  ⟨"e041", "ref_e041_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e041_p0.call g_ref_e041_p0.pre = g_ref_e041_p0.outcome := by
  decide

def g_ref_e041_p1 : GoldenRec :=
  ⟨"e041", "ref_e041_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e041_p1.call g_ref_e041_p1.pre = g_ref_e041_p1.outcome := by
  decide

def g_ref_e041_p2 : GoldenRec :=
  ⟨"e041", "ref_e041_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e041_p2.call g_ref_e041_p2.pre = g_ref_e041_p2.outcome := by
  decide

def g_ref_e041_p3 : GoldenRec :=
  ⟨"e041", "ref_e041_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e041_p3.call g_ref_e041_p3.pre = g_ref_e041_p3.outcome := by
  decide

def g_ref_e041_p4 : GoldenRec :=
  ⟨"e041", "ref_e041_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e041_p4.call g_ref_e041_p4.pre = g_ref_e041_p4.outcome := by
  decide

def g_ref_e041_p5 : GoldenRec :=
  ⟨"e041", "ref_e041_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e041_p5.call g_ref_e041_p5.pre = g_ref_e041_p5.outcome := by
  decide

def g_ref_e041_p6 : GoldenRec :=
  ⟨"e041", "ref_e041_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e041_p6.call g_ref_e041_p6.pre = g_ref_e041_p6.outcome := by
  decide

def g_ref_e041_p7 : GoldenRec :=
  ⟨"e041", "ref_e041_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e041_p7.call g_ref_e041_p7.pre = g_ref_e041_p7.outcome := by
  decide

def g_ref_e041_p8 : GoldenRec :=
  ⟨"e041", "ref_e041_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e041_p8.call g_ref_e041_p8.pre = g_ref_e041_p8.outcome := by
  decide

def g_ref_e041_p9 : GoldenRec :=
  ⟨"e041", "ref_e041_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e041_p9.call g_ref_e041_p9.pre = g_ref_e041_p9.outcome := by
  decide

def g_ref_e041_p10 : GoldenRec :=
  ⟨"e041", "ref_e041_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e041_p10.call g_ref_e041_p10.pre = g_ref_e041_p10.outcome := by
  decide

def g_ref_e041_p11 : GoldenRec :=
  ⟨"e041", "ref_e041_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e041_p11.call g_ref_e041_p11.pre = g_ref_e041_p11.outcome := by
  decide

def g_ref_e041_p12 : GoldenRec :=
  ⟨"e041", "ref_e041_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e041_p12.call g_ref_e041_p12.pre = g_ref_e041_p12.outcome := by
  decide

def g_ref_e041_p13 : GoldenRec :=
  ⟨"e041", "ref_e041_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e041_p13.call g_ref_e041_p13.pre = g_ref_e041_p13.outcome := by
  decide

def g_ref_e041_p14 : GoldenRec :=
  ⟨"e041", "ref_e041_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e041_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e041_p14.call g_ref_e041_p14.pre = g_ref_e041_p14.outcome := by
  decide

def g_ref_e041_p15 : GoldenRec :=
  ⟨"e041", "ref_e041_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 1), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e041_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e041_p15.call g_ref_e041_p15.pre = g_ref_e041_p15.outcome := by
  decide

def g_ref_e042_p0 : GoldenRec :=
  ⟨"e042", "ref_e042_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e042_p0.call g_ref_e042_p0.pre = g_ref_e042_p0.outcome := by
  decide

def g_ref_e042_p1 : GoldenRec :=
  ⟨"e042", "ref_e042_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e042_p1.call g_ref_e042_p1.pre = g_ref_e042_p1.outcome := by
  decide

def g_ref_e042_p2 : GoldenRec :=
  ⟨"e042", "ref_e042_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e042_p2.call g_ref_e042_p2.pre = g_ref_e042_p2.outcome := by
  decide

def g_ref_e042_p3 : GoldenRec :=
  ⟨"e042", "ref_e042_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e042_p3.call g_ref_e042_p3.pre = g_ref_e042_p3.outcome := by
  decide

def g_ref_e042_p4 : GoldenRec :=
  ⟨"e042", "ref_e042_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e042_p4.call g_ref_e042_p4.pre = g_ref_e042_p4.outcome := by
  decide

def g_ref_e042_p5 : GoldenRec :=
  ⟨"e042", "ref_e042_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e042_p5.call g_ref_e042_p5.pre = g_ref_e042_p5.outcome := by
  decide

def g_ref_e042_p6 : GoldenRec :=
  ⟨"e042", "ref_e042_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e042_p6.call g_ref_e042_p6.pre = g_ref_e042_p6.outcome := by
  decide

def g_ref_e042_p7 : GoldenRec :=
  ⟨"e042", "ref_e042_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e042_p7.call g_ref_e042_p7.pre = g_ref_e042_p7.outcome := by
  decide

def g_ref_e042_p8 : GoldenRec :=
  ⟨"e042", "ref_e042_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e042_p8.call g_ref_e042_p8.pre = g_ref_e042_p8.outcome := by
  decide

def g_ref_e042_p9 : GoldenRec :=
  ⟨"e042", "ref_e042_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e042_p9.call g_ref_e042_p9.pre = g_ref_e042_p9.outcome := by
  decide

def g_ref_e042_p10 : GoldenRec :=
  ⟨"e042", "ref_e042_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e042_p10.call g_ref_e042_p10.pre = g_ref_e042_p10.outcome := by
  decide

def g_ref_e042_p11 : GoldenRec :=
  ⟨"e042", "ref_e042_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e042_p11.call g_ref_e042_p11.pre = g_ref_e042_p11.outcome := by
  decide

def g_ref_e042_p12 : GoldenRec :=
  ⟨"e042", "ref_e042_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e042_p12.call g_ref_e042_p12.pre = g_ref_e042_p12.outcome := by
  decide

def g_ref_e042_p13 : GoldenRec :=
  ⟨"e042", "ref_e042_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e042_p13.call g_ref_e042_p13.pre = g_ref_e042_p13.outcome := by
  decide

def g_ref_e042_p14 : GoldenRec :=
  ⟨"e042", "ref_e042_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e042_p14.call g_ref_e042_p14.pre = g_ref_e042_p14.outcome := by
  decide

def g_ref_e042_p15 : GoldenRec :=
  ⟨"e042", "ref_e042_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 1), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e042_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e042_p15.call g_ref_e042_p15.pre = g_ref_e042_p15.outcome := by
  decide

def g_ref_e043_p0 : GoldenRec :=
  ⟨"e043", "ref_e043_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e043_p0.call g_ref_e043_p0.pre = g_ref_e043_p0.outcome := by
  decide

def g_ref_e043_p1 : GoldenRec :=
  ⟨"e043", "ref_e043_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e043_p1.call g_ref_e043_p1.pre = g_ref_e043_p1.outcome := by
  decide

def g_ref_e043_p2 : GoldenRec :=
  ⟨"e043", "ref_e043_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e043_p2.call g_ref_e043_p2.pre = g_ref_e043_p2.outcome := by
  decide

def g_ref_e043_p3 : GoldenRec :=
  ⟨"e043", "ref_e043_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e043_p3.call g_ref_e043_p3.pre = g_ref_e043_p3.outcome := by
  decide

def g_ref_e043_p4 : GoldenRec :=
  ⟨"e043", "ref_e043_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e043_p4.call g_ref_e043_p4.pre = g_ref_e043_p4.outcome := by
  decide

def g_ref_e043_p5 : GoldenRec :=
  ⟨"e043", "ref_e043_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e043_p5.call g_ref_e043_p5.pre = g_ref_e043_p5.outcome := by
  decide

def g_ref_e043_p6 : GoldenRec :=
  ⟨"e043", "ref_e043_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e043_p6.call g_ref_e043_p6.pre = g_ref_e043_p6.outcome := by
  decide

def g_ref_e043_p7 : GoldenRec :=
  ⟨"e043", "ref_e043_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e043_p7.call g_ref_e043_p7.pre = g_ref_e043_p7.outcome := by
  decide

def g_ref_e043_p8 : GoldenRec :=
  ⟨"e043", "ref_e043_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e043_p8.call g_ref_e043_p8.pre = g_ref_e043_p8.outcome := by
  decide

def g_ref_e043_p9 : GoldenRec :=
  ⟨"e043", "ref_e043_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e043_p9.call g_ref_e043_p9.pre = g_ref_e043_p9.outcome := by
  decide

def g_ref_e043_p10 : GoldenRec :=
  ⟨"e043", "ref_e043_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e043_p10.call g_ref_e043_p10.pre = g_ref_e043_p10.outcome := by
  decide

def g_ref_e043_p11 : GoldenRec :=
  ⟨"e043", "ref_e043_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e043_p11.call g_ref_e043_p11.pre = g_ref_e043_p11.outcome := by
  decide

def g_ref_e043_p12 : GoldenRec :=
  ⟨"e043", "ref_e043_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e043_p12.call g_ref_e043_p12.pre = g_ref_e043_p12.outcome := by
  decide

def g_ref_e043_p13 : GoldenRec :=
  ⟨"e043", "ref_e043_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e043_p13.call g_ref_e043_p13.pre = g_ref_e043_p13.outcome := by
  decide

def g_ref_e043_p14 : GoldenRec :=
  ⟨"e043", "ref_e043_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "erin"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e043_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e043_p14.call g_ref_e043_p14.pre = g_ref_e043_p14.outcome := by
  decide

def g_ref_e043_p15 : GoldenRec :=
  ⟨"e043", "ref_e043_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 2), ((.user "erin"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "erin"))⟩
theorem ref_e043_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e043_p15.call g_ref_e043_p15.pre = g_ref_e043_p15.outcome := by
  decide

def g_ref_e044_p0 : GoldenRec :=
  ⟨"e044", "ref_e044_p0", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e044_p0.call g_ref_e044_p0.pre = g_ref_e044_p0.outcome := by
  decide

def g_ref_e044_p1 : GoldenRec :=
  ⟨"e044", "ref_e044_p1", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e044_p1.call g_ref_e044_p1.pre = g_ref_e044_p1.outcome := by
  decide

def g_ref_e044_p2 : GoldenRec :=
  ⟨"e044", "ref_e044_p2", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e044_p2.call g_ref_e044_p2.pre = g_ref_e044_p2.outcome := by
  decide

def g_ref_e044_p3 : GoldenRec :=
  ⟨"e044", "ref_e044_p3", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e044_p3.call g_ref_e044_p3.pre = g_ref_e044_p3.outcome := by
  decide

def g_ref_e044_p4 : GoldenRec :=
  ⟨"e044", "ref_e044_p4", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e044_p4.call g_ref_e044_p4.pre = g_ref_e044_p4.outcome := by
  decide

def g_ref_e044_p5 : GoldenRec :=
  ⟨"e044", "ref_e044_p5", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e044_p5.call g_ref_e044_p5.pre = g_ref_e044_p5.outcome := by
  decide

def g_ref_e044_p6 : GoldenRec :=
  ⟨"e044", "ref_e044_p6", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e044_p6.call g_ref_e044_p6.pre = g_ref_e044_p6.outcome := by
  decide

def g_ref_e044_p7 : GoldenRec :=
  ⟨"e044", "ref_e044_p7", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e044_p7.call g_ref_e044_p7.pre = g_ref_e044_p7.outcome := by
  decide

def g_ref_e044_p8 : GoldenRec :=
  ⟨"e044", "ref_e044_p8", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e044_p8.call g_ref_e044_p8.pre = g_ref_e044_p8.outcome := by
  decide

def g_ref_e044_p9 : GoldenRec :=
  ⟨"e044", "ref_e044_p9", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e044_p9.call g_ref_e044_p9.pre = g_ref_e044_p9.outcome := by
  decide

def g_ref_e044_p10 : GoldenRec :=
  ⟨"e044", "ref_e044_p10", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e044_p10.call g_ref_e044_p10.pre = g_ref_e044_p10.outcome := by
  decide

def g_ref_e044_p11 : GoldenRec :=
  ⟨"e044", "ref_e044_p11", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e044_p11.call g_ref_e044_p11.pre = g_ref_e044_p11.outcome := by
  decide

def g_ref_e044_p12 : GoldenRec :=
  ⟨"e044", "ref_e044_p12", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e044_p12.call g_ref_e044_p12.pre = g_ref_e044_p12.outcome := by
  decide

def g_ref_e044_p13 : GoldenRec :=
  ⟨"e044", "ref_e044_p13", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e044_p13.call g_ref_e044_p13.pre = g_ref_e044_p13.outcome := by
  decide

def g_ref_e044_p14 : GoldenRec :=
  ⟨"e044", "ref_e044_p14", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e044_p14.call g_ref_e044_p14.pre = g_ref_e044_p14.outcome := by
  decide

def g_ref_e044_p15 : GoldenRec :=
  ⟨"e044", "ref_e044_p15", "refProgram", ⟨"Transfer", [(.acct (.user "c")), (.acct (.user "erin")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "c"), 2), ((.user "erin"), 9223372036854775805)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "c"), 0), ((.user "erin"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e044_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e044_p15.call g_ref_e044_p15.pre = g_ref_e044_p15.outcome := by
  decide

def g_ref_e045_p0 : GoldenRec :=
  ⟨"e045", "ref_e045_p0", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e045_p0.call g_ref_e045_p0.pre = g_ref_e045_p0.outcome := by
  decide

def g_ref_e045_p1 : GoldenRec :=
  ⟨"e045", "ref_e045_p1", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e045_p1.call g_ref_e045_p1.pre = g_ref_e045_p1.outcome := by
  decide

def g_ref_e045_p2 : GoldenRec :=
  ⟨"e045", "ref_e045_p2", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e045_p2.call g_ref_e045_p2.pre = g_ref_e045_p2.outcome := by
  decide

def g_ref_e045_p3 : GoldenRec :=
  ⟨"e045", "ref_e045_p3", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e045_p3.call g_ref_e045_p3.pre = g_ref_e045_p3.outcome := by
  decide

def g_ref_e045_p4 : GoldenRec :=
  ⟨"e045", "ref_e045_p4", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e045_p4.call g_ref_e045_p4.pre = g_ref_e045_p4.outcome := by
  decide

def g_ref_e045_p5 : GoldenRec :=
  ⟨"e045", "ref_e045_p5", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e045_p5.call g_ref_e045_p5.pre = g_ref_e045_p5.outcome := by
  decide

def g_ref_e045_p6 : GoldenRec :=
  ⟨"e045", "ref_e045_p6", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e045_p6.call g_ref_e045_p6.pre = g_ref_e045_p6.outcome := by
  decide

def g_ref_e045_p7 : GoldenRec :=
  ⟨"e045", "ref_e045_p7", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e045_p7.call g_ref_e045_p7.pre = g_ref_e045_p7.outcome := by
  decide

def g_ref_e045_p8 : GoldenRec :=
  ⟨"e045", "ref_e045_p8", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e045_p8.call g_ref_e045_p8.pre = g_ref_e045_p8.outcome := by
  decide

def g_ref_e045_p9 : GoldenRec :=
  ⟨"e045", "ref_e045_p9", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e045_p9.call g_ref_e045_p9.pre = g_ref_e045_p9.outcome := by
  decide

def g_ref_e045_p10 : GoldenRec :=
  ⟨"e045", "ref_e045_p10", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e045_p10.call g_ref_e045_p10.pre = g_ref_e045_p10.outcome := by
  decide

def g_ref_e045_p11 : GoldenRec :=
  ⟨"e045", "ref_e045_p11", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e045_p11.call g_ref_e045_p11.pre = g_ref_e045_p11.outcome := by
  decide

def g_ref_e045_p12 : GoldenRec :=
  ⟨"e045", "ref_e045_p12", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e045_p12.call g_ref_e045_p12.pre = g_ref_e045_p12.outcome := by
  decide

def g_ref_e045_p13 : GoldenRec :=
  ⟨"e045", "ref_e045_p13", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e045_p13.call g_ref_e045_p13.pre = g_ref_e045_p13.outcome := by
  decide

def g_ref_e045_p14 : GoldenRec :=
  ⟨"e045", "ref_e045_p14", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 0), ((.user "b"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e045_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e045_p14.call g_ref_e045_p14.pre = g_ref_e045_p14.outcome := by
  decide

def g_ref_e045_p15 : GoldenRec :=
  ⟨"e045", "ref_e045_p15", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "fay"), 240), ((.user "b"), 9223372036854775568)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "b"))⟩
theorem ref_e045_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e045_p15.call g_ref_e045_p15.pre = g_ref_e045_p15.outcome := by
  decide

def g_ref_e046_p0 : GoldenRec :=
  ⟨"e046", "ref_e046_p0", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e046_p0.call g_ref_e046_p0.pre = g_ref_e046_p0.outcome := by
  decide

def g_ref_e046_p1 : GoldenRec :=
  ⟨"e046", "ref_e046_p1", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e046_p1.call g_ref_e046_p1.pre = g_ref_e046_p1.outcome := by
  decide

def g_ref_e046_p2 : GoldenRec :=
  ⟨"e046", "ref_e046_p2", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e046_p2.call g_ref_e046_p2.pre = g_ref_e046_p2.outcome := by
  decide

def g_ref_e046_p3 : GoldenRec :=
  ⟨"e046", "ref_e046_p3", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e046_p3.call g_ref_e046_p3.pre = g_ref_e046_p3.outcome := by
  decide

def g_ref_e046_p4 : GoldenRec :=
  ⟨"e046", "ref_e046_p4", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e046_p4.call g_ref_e046_p4.pre = g_ref_e046_p4.outcome := by
  decide

def g_ref_e046_p5 : GoldenRec :=
  ⟨"e046", "ref_e046_p5", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e046_p5.call g_ref_e046_p5.pre = g_ref_e046_p5.outcome := by
  decide

def g_ref_e046_p6 : GoldenRec :=
  ⟨"e046", "ref_e046_p6", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e046_p6.call g_ref_e046_p6.pre = g_ref_e046_p6.outcome := by
  decide

def g_ref_e046_p7 : GoldenRec :=
  ⟨"e046", "ref_e046_p7", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e046_p7.call g_ref_e046_p7.pre = g_ref_e046_p7.outcome := by
  decide

def g_ref_e046_p8 : GoldenRec :=
  ⟨"e046", "ref_e046_p8", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e046_p8.call g_ref_e046_p8.pre = g_ref_e046_p8.outcome := by
  decide

def g_ref_e046_p9 : GoldenRec :=
  ⟨"e046", "ref_e046_p9", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e046_p9.call g_ref_e046_p9.pre = g_ref_e046_p9.outcome := by
  decide

def g_ref_e046_p10 : GoldenRec :=
  ⟨"e046", "ref_e046_p10", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e046_p10.call g_ref_e046_p10.pre = g_ref_e046_p10.outcome := by
  decide

def g_ref_e046_p11 : GoldenRec :=
  ⟨"e046", "ref_e046_p11", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e046_p11.call g_ref_e046_p11.pre = g_ref_e046_p11.outcome := by
  decide

def g_ref_e046_p12 : GoldenRec :=
  ⟨"e046", "ref_e046_p12", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e046_p12.call g_ref_e046_p12.pre = g_ref_e046_p12.outcome := by
  decide

def g_ref_e046_p13 : GoldenRec :=
  ⟨"e046", "ref_e046_p13", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e046_p13.call g_ref_e046_p13.pre = g_ref_e046_p13.outcome := by
  decide

def g_ref_e046_p14 : GoldenRec :=
  ⟨"e046", "ref_e046_p14", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e046_p14.call g_ref_e046_p14.pre = g_ref_e046_p14.outcome := by
  decide

def g_ref_e046_p15 : GoldenRec :=
  ⟨"e046", "ref_e046_p15", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "b")), (.int 240)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 240), ((.user "b"), 9223372036854775567)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "b"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "b"))])⟩
theorem ref_e046_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e046_p15.call g_ref_e046_p15.pre = g_ref_e046_p15.outcome := by
  decide

def g_ref_e047_p0 : GoldenRec :=
  ⟨"e047", "ref_e047_p0", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e047_p0.call g_ref_e047_p0.pre = g_ref_e047_p0.outcome := by
  decide

def g_ref_e047_p1 : GoldenRec :=
  ⟨"e047", "ref_e047_p1", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e047_p1.call g_ref_e047_p1.pre = g_ref_e047_p1.outcome := by
  decide

def g_ref_e047_p2 : GoldenRec :=
  ⟨"e047", "ref_e047_p2", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e047_p2.call g_ref_e047_p2.pre = g_ref_e047_p2.outcome := by
  decide

def g_ref_e047_p3 : GoldenRec :=
  ⟨"e047", "ref_e047_p3", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e047_p3.call g_ref_e047_p3.pre = g_ref_e047_p3.outcome := by
  decide

def g_ref_e047_p4 : GoldenRec :=
  ⟨"e047", "ref_e047_p4", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e047_p4.call g_ref_e047_p4.pre = g_ref_e047_p4.outcome := by
  decide

def g_ref_e047_p5 : GoldenRec :=
  ⟨"e047", "ref_e047_p5", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e047_p5.call g_ref_e047_p5.pre = g_ref_e047_p5.outcome := by
  decide

def g_ref_e047_p6 : GoldenRec :=
  ⟨"e047", "ref_e047_p6", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e047_p6.call g_ref_e047_p6.pre = g_ref_e047_p6.outcome := by
  decide

def g_ref_e047_p7 : GoldenRec :=
  ⟨"e047", "ref_e047_p7", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e047_p7.call g_ref_e047_p7.pre = g_ref_e047_p7.outcome := by
  decide

def g_ref_e047_p8 : GoldenRec :=
  ⟨"e047", "ref_e047_p8", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e047_p8.call g_ref_e047_p8.pre = g_ref_e047_p8.outcome := by
  decide

def g_ref_e047_p9 : GoldenRec :=
  ⟨"e047", "ref_e047_p9", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e047_p9.call g_ref_e047_p9.pre = g_ref_e047_p9.outcome := by
  decide

def g_ref_e047_p10 : GoldenRec :=
  ⟨"e047", "ref_e047_p10", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e047_p10.call g_ref_e047_p10.pre = g_ref_e047_p10.outcome := by
  decide

def g_ref_e047_p11 : GoldenRec :=
  ⟨"e047", "ref_e047_p11", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e047_p11.call g_ref_e047_p11.pre = g_ref_e047_p11.outcome := by
  decide

def g_ref_e047_p12 : GoldenRec :=
  ⟨"e047", "ref_e047_p12", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e047_p12.call g_ref_e047_p12.pre = g_ref_e047_p12.outcome := by
  decide

def g_ref_e047_p13 : GoldenRec :=
  ⟨"e047", "ref_e047_p13", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e047_p13.call g_ref_e047_p13.pre = g_ref_e047_p13.outcome := by
  decide

def g_ref_e047_p14 : GoldenRec :=
  ⟨"e047", "ref_e047_p14", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e047_p14.call g_ref_e047_p14.pre = g_ref_e047_p14.outcome := by
  decide

def g_ref_e047_p15 : GoldenRec :=
  ⟨"e047", "ref_e047_p15", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "c")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807), ((.user "c"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.user "c"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "c"))])⟩
theorem ref_e047_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e047_p15.call g_ref_e047_p15.pre = g_ref_e047_p15.outcome := by
  decide

def g_ref_e048_p0 : GoldenRec :=
  ⟨"e048", "ref_e048_p0", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e048_p0.call g_ref_e048_p0.pre = g_ref_e048_p0.outcome := by
  decide

def g_ref_e048_p1 : GoldenRec :=
  ⟨"e048", "ref_e048_p1", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e048_p1.call g_ref_e048_p1.pre = g_ref_e048_p1.outcome := by
  decide

def g_ref_e048_p2 : GoldenRec :=
  ⟨"e048", "ref_e048_p2", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e048_p2.call g_ref_e048_p2.pre = g_ref_e048_p2.outcome := by
  decide

def g_ref_e048_p3 : GoldenRec :=
  ⟨"e048", "ref_e048_p3", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e048_p3.call g_ref_e048_p3.pre = g_ref_e048_p3.outcome := by
  decide

def g_ref_e048_p4 : GoldenRec :=
  ⟨"e048", "ref_e048_p4", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e048_p4.call g_ref_e048_p4.pre = g_ref_e048_p4.outcome := by
  decide

def g_ref_e048_p5 : GoldenRec :=
  ⟨"e048", "ref_e048_p5", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e048_p5.call g_ref_e048_p5.pre = g_ref_e048_p5.outcome := by
  decide

def g_ref_e048_p6 : GoldenRec :=
  ⟨"e048", "ref_e048_p6", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e048_p6.call g_ref_e048_p6.pre = g_ref_e048_p6.outcome := by
  decide

def g_ref_e048_p7 : GoldenRec :=
  ⟨"e048", "ref_e048_p7", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e048_p7.call g_ref_e048_p7.pre = g_ref_e048_p7.outcome := by
  decide

def g_ref_e048_p8 : GoldenRec :=
  ⟨"e048", "ref_e048_p8", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e048_p8.call g_ref_e048_p8.pre = g_ref_e048_p8.outcome := by
  decide

def g_ref_e048_p9 : GoldenRec :=
  ⟨"e048", "ref_e048_p9", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e048_p9.call g_ref_e048_p9.pre = g_ref_e048_p9.outcome := by
  decide

def g_ref_e048_p10 : GoldenRec :=
  ⟨"e048", "ref_e048_p10", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e048_p10.call g_ref_e048_p10.pre = g_ref_e048_p10.outcome := by
  decide

def g_ref_e048_p11 : GoldenRec :=
  ⟨"e048", "ref_e048_p11", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e048_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e048_p11.call g_ref_e048_p11.pre = g_ref_e048_p11.outcome := by
  decide

def g_ref_e048_p12 : GoldenRec :=
  ⟨"e048", "ref_e048_p12", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e048_p12.call g_ref_e048_p12.pre = g_ref_e048_p12.outcome := by
  decide

def g_ref_e048_p13 : GoldenRec :=
  ⟨"e048", "ref_e048_p13", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e048_p13.call g_ref_e048_p13.pre = g_ref_e048_p13.outcome := by
  decide

def g_ref_e048_p14 : GoldenRec :=
  ⟨"e048", "ref_e048_p14", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e048_p14.call g_ref_e048_p14.pre = g_ref_e048_p14.outcome := by
  decide

def g_ref_e048_p15 : GoldenRec :=
  ⟨"e048", "ref_e048_p15", "refProgram", ⟨"Transfer", [(.acct (.user "fay")), (.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .error .selfTransfer⟩
theorem ref_e048_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e048_p15.call g_ref_e048_p15.pre = g_ref_e048_p15.outcome := by
  decide

def g_ref_e049_p0 : GoldenRec :=
  ⟨"e049", "ref_e049_p0", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e049_p0.call g_ref_e049_p0.pre = g_ref_e049_p0.outcome := by
  decide

def g_ref_e049_p1 : GoldenRec :=
  ⟨"e049", "ref_e049_p1", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e049_p1.call g_ref_e049_p1.pre = g_ref_e049_p1.outcome := by
  decide

def g_ref_e049_p2 : GoldenRec :=
  ⟨"e049", "ref_e049_p2", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e049_p2.call g_ref_e049_p2.pre = g_ref_e049_p2.outcome := by
  decide

def g_ref_e049_p3 : GoldenRec :=
  ⟨"e049", "ref_e049_p3", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e049_p3.call g_ref_e049_p3.pre = g_ref_e049_p3.outcome := by
  decide

def g_ref_e049_p4 : GoldenRec :=
  ⟨"e049", "ref_e049_p4", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e049_p4.call g_ref_e049_p4.pre = g_ref_e049_p4.outcome := by
  decide

def g_ref_e049_p5 : GoldenRec :=
  ⟨"e049", "ref_e049_p5", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e049_p5.call g_ref_e049_p5.pre = g_ref_e049_p5.outcome := by
  decide

def g_ref_e049_p6 : GoldenRec :=
  ⟨"e049", "ref_e049_p6", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e049_p6.call g_ref_e049_p6.pre = g_ref_e049_p6.outcome := by
  decide

def g_ref_e049_p7 : GoldenRec :=
  ⟨"e049", "ref_e049_p7", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e049_p7.call g_ref_e049_p7.pre = g_ref_e049_p7.outcome := by
  decide

def g_ref_e049_p8 : GoldenRec :=
  ⟨"e049", "ref_e049_p8", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e049_p8.call g_ref_e049_p8.pre = g_ref_e049_p8.outcome := by
  decide

def g_ref_e049_p9 : GoldenRec :=
  ⟨"e049", "ref_e049_p9", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e049_p9.call g_ref_e049_p9.pre = g_ref_e049_p9.outcome := by
  decide

def g_ref_e049_p10 : GoldenRec :=
  ⟨"e049", "ref_e049_p10", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e049_p10.call g_ref_e049_p10.pre = g_ref_e049_p10.outcome := by
  decide

def g_ref_e049_p11 : GoldenRec :=
  ⟨"e049", "ref_e049_p11", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e049_p11.call g_ref_e049_p11.pre = g_ref_e049_p11.outcome := by
  decide

def g_ref_e049_p12 : GoldenRec :=
  ⟨"e049", "ref_e049_p12", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e049_p12.call g_ref_e049_p12.pre = g_ref_e049_p12.outcome := by
  decide

def g_ref_e049_p13 : GoldenRec :=
  ⟨"e049", "ref_e049_p13", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e049_p13.call g_ref_e049_p13.pre = g_ref_e049_p13.outcome := by
  decide

def g_ref_e049_p14 : GoldenRec :=
  ⟨"e049", "ref_e049_p14", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e049_p14.call g_ref_e049_p14.pre = g_ref_e049_p14.outcome := by
  decide

def g_ref_e049_p15 : GoldenRec :=
  ⟨"e049", "ref_e049_p15", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 107)]⟩,
   { bals := [(.mint, (-294)), ((.user "erin"), 291), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-401)), ((.user "erin"), 398), ((.user "fay"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e049_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e049_p15.call g_ref_e049_p15.pre = g_ref_e049_p15.outcome := by
  decide

def g_ref_e050_p0 : GoldenRec :=
  ⟨"e050", "ref_e050_p0", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e050_p0.call g_ref_e050_p0.pre = g_ref_e050_p0.outcome := by
  decide

def g_ref_e050_p1 : GoldenRec :=
  ⟨"e050", "ref_e050_p1", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e050_p1.call g_ref_e050_p1.pre = g_ref_e050_p1.outcome := by
  decide

def g_ref_e050_p2 : GoldenRec :=
  ⟨"e050", "ref_e050_p2", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e050_p2.call g_ref_e050_p2.pre = g_ref_e050_p2.outcome := by
  decide

def g_ref_e050_p3 : GoldenRec :=
  ⟨"e050", "ref_e050_p3", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e050_p3.call g_ref_e050_p3.pre = g_ref_e050_p3.outcome := by
  decide

def g_ref_e050_p4 : GoldenRec :=
  ⟨"e050", "ref_e050_p4", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e050_p4.call g_ref_e050_p4.pre = g_ref_e050_p4.outcome := by
  decide

def g_ref_e050_p5 : GoldenRec :=
  ⟨"e050", "ref_e050_p5", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e050_p5.call g_ref_e050_p5.pre = g_ref_e050_p5.outcome := by
  decide

def g_ref_e050_p6 : GoldenRec :=
  ⟨"e050", "ref_e050_p6", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e050_p6.call g_ref_e050_p6.pre = g_ref_e050_p6.outcome := by
  decide

def g_ref_e050_p7 : GoldenRec :=
  ⟨"e050", "ref_e050_p7", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e050_p7.call g_ref_e050_p7.pre = g_ref_e050_p7.outcome := by
  decide

def g_ref_e050_p8 : GoldenRec :=
  ⟨"e050", "ref_e050_p8", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e050_p8.call g_ref_e050_p8.pre = g_ref_e050_p8.outcome := by
  decide

def g_ref_e050_p9 : GoldenRec :=
  ⟨"e050", "ref_e050_p9", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e050_p9.call g_ref_e050_p9.pre = g_ref_e050_p9.outcome := by
  decide

def g_ref_e050_p10 : GoldenRec :=
  ⟨"e050", "ref_e050_p10", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e050_p10.call g_ref_e050_p10.pre = g_ref_e050_p10.outcome := by
  decide

def g_ref_e050_p11 : GoldenRec :=
  ⟨"e050", "ref_e050_p11", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e050_p11.call g_ref_e050_p11.pre = g_ref_e050_p11.outcome := by
  decide

def g_ref_e050_p12 : GoldenRec :=
  ⟨"e050", "ref_e050_p12", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e050_p12.call g_ref_e050_p12.pre = g_ref_e050_p12.outcome := by
  decide

def g_ref_e050_p13 : GoldenRec :=
  ⟨"e050", "ref_e050_p13", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e050_p13.call g_ref_e050_p13.pre = g_ref_e050_p13.outcome := by
  decide

def g_ref_e050_p14 : GoldenRec :=
  ⟨"e050", "ref_e050_p14", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e050_p14.call g_ref_e050_p14.pre = g_ref_e050_p14.outcome := by
  decide

def g_ref_e050_p15 : GoldenRec :=
  ⟨"e050", "ref_e050_p15", "refProgram", ⟨"Deposit", [(.acct (.user "fay")), (.int 852)]⟩,
   { bals := [(.mint, (-327)), ((.user "fay"), 324), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-1179)), ((.user "fay"), 1176), ((.user "b"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e050_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e050_p15.call g_ref_e050_p15.pre = g_ref_e050_p15.outcome := by
  decide

def g_ref_e051_p0 : GoldenRec :=
  ⟨"e051", "ref_e051_p0", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e051_p0.call g_ref_e051_p0.pre = g_ref_e051_p0.outcome := by
  decide

def g_ref_e051_p1 : GoldenRec :=
  ⟨"e051", "ref_e051_p1", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e051_p1.call g_ref_e051_p1.pre = g_ref_e051_p1.outcome := by
  decide

def g_ref_e051_p2 : GoldenRec :=
  ⟨"e051", "ref_e051_p2", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e051_p2.call g_ref_e051_p2.pre = g_ref_e051_p2.outcome := by
  decide

def g_ref_e051_p3 : GoldenRec :=
  ⟨"e051", "ref_e051_p3", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e051_p3.call g_ref_e051_p3.pre = g_ref_e051_p3.outcome := by
  decide

def g_ref_e051_p4 : GoldenRec :=
  ⟨"e051", "ref_e051_p4", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e051_p4.call g_ref_e051_p4.pre = g_ref_e051_p4.outcome := by
  decide

def g_ref_e051_p5 : GoldenRec :=
  ⟨"e051", "ref_e051_p5", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e051_p5.call g_ref_e051_p5.pre = g_ref_e051_p5.outcome := by
  decide

def g_ref_e051_p6 : GoldenRec :=
  ⟨"e051", "ref_e051_p6", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e051_p6.call g_ref_e051_p6.pre = g_ref_e051_p6.outcome := by
  decide

def g_ref_e051_p7 : GoldenRec :=
  ⟨"e051", "ref_e051_p7", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e051_p7.call g_ref_e051_p7.pre = g_ref_e051_p7.outcome := by
  decide

def g_ref_e051_p8 : GoldenRec :=
  ⟨"e051", "ref_e051_p8", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e051_p8.call g_ref_e051_p8.pre = g_ref_e051_p8.outcome := by
  decide

def g_ref_e051_p9 : GoldenRec :=
  ⟨"e051", "ref_e051_p9", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e051_p9.call g_ref_e051_p9.pre = g_ref_e051_p9.outcome := by
  decide

def g_ref_e051_p10 : GoldenRec :=
  ⟨"e051", "ref_e051_p10", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e051_p10.call g_ref_e051_p10.pre = g_ref_e051_p10.outcome := by
  decide

def g_ref_e051_p11 : GoldenRec :=
  ⟨"e051", "ref_e051_p11", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e051_p11.call g_ref_e051_p11.pre = g_ref_e051_p11.outcome := by
  decide

def g_ref_e051_p12 : GoldenRec :=
  ⟨"e051", "ref_e051_p12", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e051_p12.call g_ref_e051_p12.pre = g_ref_e051_p12.outcome := by
  decide

def g_ref_e051_p13 : GoldenRec :=
  ⟨"e051", "ref_e051_p13", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e051_p13.call g_ref_e051_p13.pre = g_ref_e051_p13.outcome := by
  decide

def g_ref_e051_p14 : GoldenRec :=
  ⟨"e051", "ref_e051_p14", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e051_p14.call g_ref_e051_p14.pre = g_ref_e051_p14.outcome := by
  decide

def g_ref_e051_p15 : GoldenRec :=
  ⟨"e051", "ref_e051_p15", "refProgram", ⟨"Deposit", [(.acct (.user "erin")), (.int 128)]⟩,
   { bals := [(.mint, (-148)), ((.user "erin"), 145), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-276)), ((.user "erin"), 273), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e051_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e051_p15.call g_ref_e051_p15.pre = g_ref_e051_p15.outcome := by
  decide

def g_ref_e052_p0 : GoldenRec :=
  ⟨"e052", "ref_e052_p0", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e052_p0.call g_ref_e052_p0.pre = g_ref_e052_p0.outcome := by
  decide

def g_ref_e052_p1 : GoldenRec :=
  ⟨"e052", "ref_e052_p1", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e052_p1.call g_ref_e052_p1.pre = g_ref_e052_p1.outcome := by
  decide

def g_ref_e052_p2 : GoldenRec :=
  ⟨"e052", "ref_e052_p2", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e052_p2.call g_ref_e052_p2.pre = g_ref_e052_p2.outcome := by
  decide

def g_ref_e052_p3 : GoldenRec :=
  ⟨"e052", "ref_e052_p3", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e052_p3.call g_ref_e052_p3.pre = g_ref_e052_p3.outcome := by
  decide

def g_ref_e052_p4 : GoldenRec :=
  ⟨"e052", "ref_e052_p4", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e052_p4.call g_ref_e052_p4.pre = g_ref_e052_p4.outcome := by
  decide

def g_ref_e052_p5 : GoldenRec :=
  ⟨"e052", "ref_e052_p5", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e052_p5.call g_ref_e052_p5.pre = g_ref_e052_p5.outcome := by
  decide

def g_ref_e052_p6 : GoldenRec :=
  ⟨"e052", "ref_e052_p6", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e052_p6.call g_ref_e052_p6.pre = g_ref_e052_p6.outcome := by
  decide

def g_ref_e052_p7 : GoldenRec :=
  ⟨"e052", "ref_e052_p7", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e052_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e052_p7.call g_ref_e052_p7.pre = g_ref_e052_p7.outcome := by
  decide

def g_ref_e052_p8 : GoldenRec :=
  ⟨"e052", "ref_e052_p8", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e052_p8.call g_ref_e052_p8.pre = g_ref_e052_p8.outcome := by
  decide

def g_ref_e052_p9 : GoldenRec :=
  ⟨"e052", "ref_e052_p9", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e052_p9.call g_ref_e052_p9.pre = g_ref_e052_p9.outcome := by
  decide

def g_ref_e052_p10 : GoldenRec :=
  ⟨"e052", "ref_e052_p10", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e052_p10.call g_ref_e052_p10.pre = g_ref_e052_p10.outcome := by
  decide

def g_ref_e052_p11 : GoldenRec :=
  ⟨"e052", "ref_e052_p11", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e052_p11.call g_ref_e052_p11.pre = g_ref_e052_p11.outcome := by
  decide

def g_ref_e052_p12 : GoldenRec :=
  ⟨"e052", "ref_e052_p12", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e052_p12.call g_ref_e052_p12.pre = g_ref_e052_p12.outcome := by
  decide

def g_ref_e052_p13 : GoldenRec :=
  ⟨"e052", "ref_e052_p13", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e052_p13.call g_ref_e052_p13.pre = g_ref_e052_p13.outcome := by
  decide

def g_ref_e052_p14 : GoldenRec :=
  ⟨"e052", "ref_e052_p14", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e052_p14.call g_ref_e052_p14.pre = g_ref_e052_p14.outcome := by
  decide

def g_ref_e052_p15 : GoldenRec :=
  ⟨"e052", "ref_e052_p15", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 0)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e052_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e052_p15.call g_ref_e052_p15.pre = g_ref_e052_p15.outcome := by
  decide

def g_ref_e053_p0 : GoldenRec :=
  ⟨"e053", "ref_e053_p0", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e053_p0.call g_ref_e053_p0.pre = g_ref_e053_p0.outcome := by
  decide

def g_ref_e053_p1 : GoldenRec :=
  ⟨"e053", "ref_e053_p1", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e053_p1.call g_ref_e053_p1.pre = g_ref_e053_p1.outcome := by
  decide

def g_ref_e053_p2 : GoldenRec :=
  ⟨"e053", "ref_e053_p2", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e053_p2.call g_ref_e053_p2.pre = g_ref_e053_p2.outcome := by
  decide

def g_ref_e053_p3 : GoldenRec :=
  ⟨"e053", "ref_e053_p3", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e053_p3.call g_ref_e053_p3.pre = g_ref_e053_p3.outcome := by
  decide

def g_ref_e053_p4 : GoldenRec :=
  ⟨"e053", "ref_e053_p4", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e053_p4.call g_ref_e053_p4.pre = g_ref_e053_p4.outcome := by
  decide

def g_ref_e053_p5 : GoldenRec :=
  ⟨"e053", "ref_e053_p5", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e053_p5.call g_ref_e053_p5.pre = g_ref_e053_p5.outcome := by
  decide

def g_ref_e053_p6 : GoldenRec :=
  ⟨"e053", "ref_e053_p6", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e053_p6.call g_ref_e053_p6.pre = g_ref_e053_p6.outcome := by
  decide

def g_ref_e053_p7 : GoldenRec :=
  ⟨"e053", "ref_e053_p7", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e053_p7.call g_ref_e053_p7.pre = g_ref_e053_p7.outcome := by
  decide

def g_ref_e053_p8 : GoldenRec :=
  ⟨"e053", "ref_e053_p8", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e053_p8.call g_ref_e053_p8.pre = g_ref_e053_p8.outcome := by
  decide

def g_ref_e053_p9 : GoldenRec :=
  ⟨"e053", "ref_e053_p9", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e053_p9.call g_ref_e053_p9.pre = g_ref_e053_p9.outcome := by
  decide

def g_ref_e053_p10 : GoldenRec :=
  ⟨"e053", "ref_e053_p10", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e053_p10.call g_ref_e053_p10.pre = g_ref_e053_p10.outcome := by
  decide

def g_ref_e053_p11 : GoldenRec :=
  ⟨"e053", "ref_e053_p11", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e053_p11.call g_ref_e053_p11.pre = g_ref_e053_p11.outcome := by
  decide

def g_ref_e053_p12 : GoldenRec :=
  ⟨"e053", "ref_e053_p12", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e053_p12.call g_ref_e053_p12.pre = g_ref_e053_p12.outcome := by
  decide

def g_ref_e053_p13 : GoldenRec :=
  ⟨"e053", "ref_e053_p13", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e053_p13.call g_ref_e053_p13.pre = g_ref_e053_p13.outcome := by
  decide

def g_ref_e053_p14 : GoldenRec :=
  ⟨"e053", "ref_e053_p14", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e053_p14.call g_ref_e053_p14.pre = g_ref_e053_p14.outcome := by
  decide

def g_ref_e053_p15 : GoldenRec :=
  ⟨"e053", "ref_e053_p15", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "d"))⟩
theorem ref_e053_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e053_p15.call g_ref_e053_p15.pre = g_ref_e053_p15.outcome := by
  decide

def g_ref_e054_p0 : GoldenRec :=
  ⟨"e054", "ref_e054_p0", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e054_p0.call g_ref_e054_p0.pre = g_ref_e054_p0.outcome := by
  decide

def g_ref_e054_p1 : GoldenRec :=
  ⟨"e054", "ref_e054_p1", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e054_p1.call g_ref_e054_p1.pre = g_ref_e054_p1.outcome := by
  decide

def g_ref_e054_p2 : GoldenRec :=
  ⟨"e054", "ref_e054_p2", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e054_p2.call g_ref_e054_p2.pre = g_ref_e054_p2.outcome := by
  decide

def g_ref_e054_p3 : GoldenRec :=
  ⟨"e054", "ref_e054_p3", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e054_p3.call g_ref_e054_p3.pre = g_ref_e054_p3.outcome := by
  decide

def g_ref_e054_p4 : GoldenRec :=
  ⟨"e054", "ref_e054_p4", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e054_p4.call g_ref_e054_p4.pre = g_ref_e054_p4.outcome := by
  decide

def g_ref_e054_p5 : GoldenRec :=
  ⟨"e054", "ref_e054_p5", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e054_p5.call g_ref_e054_p5.pre = g_ref_e054_p5.outcome := by
  decide

def g_ref_e054_p6 : GoldenRec :=
  ⟨"e054", "ref_e054_p6", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e054_p6.call g_ref_e054_p6.pre = g_ref_e054_p6.outcome := by
  decide

def g_ref_e054_p7 : GoldenRec :=
  ⟨"e054", "ref_e054_p7", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e054_p7.call g_ref_e054_p7.pre = g_ref_e054_p7.outcome := by
  decide

def g_ref_e054_p8 : GoldenRec :=
  ⟨"e054", "ref_e054_p8", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e054_p8.call g_ref_e054_p8.pre = g_ref_e054_p8.outcome := by
  decide

def g_ref_e054_p9 : GoldenRec :=
  ⟨"e054", "ref_e054_p9", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e054_p9.call g_ref_e054_p9.pre = g_ref_e054_p9.outcome := by
  decide

def g_ref_e054_p10 : GoldenRec :=
  ⟨"e054", "ref_e054_p10", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e054_p10.call g_ref_e054_p10.pre = g_ref_e054_p10.outcome := by
  decide

def g_ref_e054_p11 : GoldenRec :=
  ⟨"e054", "ref_e054_p11", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e054_p11.call g_ref_e054_p11.pre = g_ref_e054_p11.outcome := by
  decide

def g_ref_e054_p12 : GoldenRec :=
  ⟨"e054", "ref_e054_p12", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e054_p12.call g_ref_e054_p12.pre = g_ref_e054_p12.outcome := by
  decide

def g_ref_e054_p13 : GoldenRec :=
  ⟨"e054", "ref_e054_p13", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e054_p13.call g_ref_e054_p13.pre = g_ref_e054_p13.outcome := by
  decide

def g_ref_e054_p14 : GoldenRec :=
  ⟨"e054", "ref_e054_p14", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e054_p14.call g_ref_e054_p14.pre = g_ref_e054_p14.outcome := by
  decide

def g_ref_e054_p15 : GoldenRec :=
  ⟨"e054", "ref_e054_p15", "refProgram", ⟨"Deposit", [(.acct .sink), (.int 3)]⟩,
   { bals := [(.mint, (-4)), ((.user "a"), 4), (.sink, 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-7)), ((.user "a"), 4), (.sink, 3)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e054_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e054_p15.call g_ref_e054_p15.pre = g_ref_e054_p15.outcome := by
  decide

def g_ref_e055_p0 : GoldenRec :=
  ⟨"e055", "ref_e055_p0", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e055_p0.call g_ref_e055_p0.pre = g_ref_e055_p0.outcome := by
  decide

def g_ref_e055_p1 : GoldenRec :=
  ⟨"e055", "ref_e055_p1", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e055_p1.call g_ref_e055_p1.pre = g_ref_e055_p1.outcome := by
  decide

def g_ref_e055_p2 : GoldenRec :=
  ⟨"e055", "ref_e055_p2", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e055_p2.call g_ref_e055_p2.pre = g_ref_e055_p2.outcome := by
  decide

def g_ref_e055_p3 : GoldenRec :=
  ⟨"e055", "ref_e055_p3", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e055_p3.call g_ref_e055_p3.pre = g_ref_e055_p3.outcome := by
  decide

def g_ref_e055_p4 : GoldenRec :=
  ⟨"e055", "ref_e055_p4", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e055_p4.call g_ref_e055_p4.pre = g_ref_e055_p4.outcome := by
  decide

def g_ref_e055_p5 : GoldenRec :=
  ⟨"e055", "ref_e055_p5", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e055_p5.call g_ref_e055_p5.pre = g_ref_e055_p5.outcome := by
  decide

def g_ref_e055_p6 : GoldenRec :=
  ⟨"e055", "ref_e055_p6", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e055_p6.call g_ref_e055_p6.pre = g_ref_e055_p6.outcome := by
  decide

def g_ref_e055_p7 : GoldenRec :=
  ⟨"e055", "ref_e055_p7", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e055_p7.call g_ref_e055_p7.pre = g_ref_e055_p7.outcome := by
  decide

def g_ref_e055_p8 : GoldenRec :=
  ⟨"e055", "ref_e055_p8", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e055_p8.call g_ref_e055_p8.pre = g_ref_e055_p8.outcome := by
  decide

def g_ref_e055_p9 : GoldenRec :=
  ⟨"e055", "ref_e055_p9", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e055_p9.call g_ref_e055_p9.pre = g_ref_e055_p9.outcome := by
  decide

def g_ref_e055_p10 : GoldenRec :=
  ⟨"e055", "ref_e055_p10", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e055_p10.call g_ref_e055_p10.pre = g_ref_e055_p10.outcome := by
  decide

def g_ref_e055_p11 : GoldenRec :=
  ⟨"e055", "ref_e055_p11", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e055_p11.call g_ref_e055_p11.pre = g_ref_e055_p11.outcome := by
  decide

def g_ref_e055_p12 : GoldenRec :=
  ⟨"e055", "ref_e055_p12", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e055_p12.call g_ref_e055_p12.pre = g_ref_e055_p12.outcome := by
  decide

def g_ref_e055_p13 : GoldenRec :=
  ⟨"e055", "ref_e055_p13", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e055_p13.call g_ref_e055_p13.pre = g_ref_e055_p13.outcome := by
  decide

def g_ref_e055_p14 : GoldenRec :=
  ⟨"e055", "ref_e055_p14", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775808)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e055_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e055_p14.call g_ref_e055_p14.pre = g_ref_e055_p14.outcome := by
  decide

def g_ref_e055_p15 : GoldenRec :=
  ⟨"e055", "ref_e055_p15", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 2)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow (.user "a"))⟩
theorem ref_e055_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e055_p15.call g_ref_e055_p15.pre = g_ref_e055_p15.outcome := by
  decide

def g_ref_e056_p0 : GoldenRec :=
  ⟨"e056", "ref_e056_p0", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e056_p0.call g_ref_e056_p0.pre = g_ref_e056_p0.outcome := by
  decide

def g_ref_e056_p1 : GoldenRec :=
  ⟨"e056", "ref_e056_p1", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e056_p1.call g_ref_e056_p1.pre = g_ref_e056_p1.outcome := by
  decide

def g_ref_e056_p2 : GoldenRec :=
  ⟨"e056", "ref_e056_p2", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e056_p2.call g_ref_e056_p2.pre = g_ref_e056_p2.outcome := by
  decide

def g_ref_e056_p3 : GoldenRec :=
  ⟨"e056", "ref_e056_p3", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e056_p3.call g_ref_e056_p3.pre = g_ref_e056_p3.outcome := by
  decide

def g_ref_e056_p4 : GoldenRec :=
  ⟨"e056", "ref_e056_p4", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e056_p4.call g_ref_e056_p4.pre = g_ref_e056_p4.outcome := by
  decide

def g_ref_e056_p5 : GoldenRec :=
  ⟨"e056", "ref_e056_p5", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e056_p5.call g_ref_e056_p5.pre = g_ref_e056_p5.outcome := by
  decide

def g_ref_e056_p6 : GoldenRec :=
  ⟨"e056", "ref_e056_p6", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e056_p6.call g_ref_e056_p6.pre = g_ref_e056_p6.outcome := by
  decide

def g_ref_e056_p7 : GoldenRec :=
  ⟨"e056", "ref_e056_p7", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e056_p7.call g_ref_e056_p7.pre = g_ref_e056_p7.outcome := by
  decide

def g_ref_e056_p8 : GoldenRec :=
  ⟨"e056", "ref_e056_p8", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e056_p8.call g_ref_e056_p8.pre = g_ref_e056_p8.outcome := by
  decide

def g_ref_e056_p9 : GoldenRec :=
  ⟨"e056", "ref_e056_p9", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e056_p9.call g_ref_e056_p9.pre = g_ref_e056_p9.outcome := by
  decide

def g_ref_e056_p10 : GoldenRec :=
  ⟨"e056", "ref_e056_p10", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e056_p10.call g_ref_e056_p10.pre = g_ref_e056_p10.outcome := by
  decide

def g_ref_e056_p11 : GoldenRec :=
  ⟨"e056", "ref_e056_p11", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e056_p11.call g_ref_e056_p11.pre = g_ref_e056_p11.outcome := by
  decide

def g_ref_e056_p12 : GoldenRec :=
  ⟨"e056", "ref_e056_p12", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e056_p12.call g_ref_e056_p12.pre = g_ref_e056_p12.outcome := by
  decide

def g_ref_e056_p13 : GoldenRec :=
  ⟨"e056", "ref_e056_p13", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e056_p13.call g_ref_e056_p13.pre = g_ref_e056_p13.outcome := by
  decide

def g_ref_e056_p14 : GoldenRec :=
  ⟨"e056", "ref_e056_p14", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e056_p14.call g_ref_e056_p14.pre = g_ref_e056_p14.outcome := by
  decide

def g_ref_e056_p15 : GoldenRec :=
  ⟨"e056", "ref_e056_p15", "refProgram", ⟨"Deposit", [(.acct (.user "a")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775806)), ((.user "a"), 9223372036854775806)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e056_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e056_p15.call g_ref_e056_p15.pre = g_ref_e056_p15.outcome := by
  decide

def g_ref_e057_p0 : GoldenRec :=
  ⟨"e057", "ref_e057_p0", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e057_p0.call g_ref_e057_p0.pre = g_ref_e057_p0.outcome := by
  decide

def g_ref_e057_p1 : GoldenRec :=
  ⟨"e057", "ref_e057_p1", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e057_p1.call g_ref_e057_p1.pre = g_ref_e057_p1.outcome := by
  decide

def g_ref_e057_p2 : GoldenRec :=
  ⟨"e057", "ref_e057_p2", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e057_p2.call g_ref_e057_p2.pre = g_ref_e057_p2.outcome := by
  decide

def g_ref_e057_p3 : GoldenRec :=
  ⟨"e057", "ref_e057_p3", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e057_p3.call g_ref_e057_p3.pre = g_ref_e057_p3.outcome := by
  decide

def g_ref_e057_p4 : GoldenRec :=
  ⟨"e057", "ref_e057_p4", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e057_p4.call g_ref_e057_p4.pre = g_ref_e057_p4.outcome := by
  decide

def g_ref_e057_p5 : GoldenRec :=
  ⟨"e057", "ref_e057_p5", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e057_p5.call g_ref_e057_p5.pre = g_ref_e057_p5.outcome := by
  decide

def g_ref_e057_p6 : GoldenRec :=
  ⟨"e057", "ref_e057_p6", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e057_p6.call g_ref_e057_p6.pre = g_ref_e057_p6.outcome := by
  decide

def g_ref_e057_p7 : GoldenRec :=
  ⟨"e057", "ref_e057_p7", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e057_p7.call g_ref_e057_p7.pre = g_ref_e057_p7.outcome := by
  decide

def g_ref_e057_p8 : GoldenRec :=
  ⟨"e057", "ref_e057_p8", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e057_p8.call g_ref_e057_p8.pre = g_ref_e057_p8.outcome := by
  decide

def g_ref_e057_p9 : GoldenRec :=
  ⟨"e057", "ref_e057_p9", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e057_p9.call g_ref_e057_p9.pre = g_ref_e057_p9.outcome := by
  decide

def g_ref_e057_p10 : GoldenRec :=
  ⟨"e057", "ref_e057_p10", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e057_p10.call g_ref_e057_p10.pre = g_ref_e057_p10.outcome := by
  decide

def g_ref_e057_p11 : GoldenRec :=
  ⟨"e057", "ref_e057_p11", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e057_p11.call g_ref_e057_p11.pre = g_ref_e057_p11.outcome := by
  decide

def g_ref_e057_p12 : GoldenRec :=
  ⟨"e057", "ref_e057_p12", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e057_p12.call g_ref_e057_p12.pre = g_ref_e057_p12.outcome := by
  decide

def g_ref_e057_p13 : GoldenRec :=
  ⟨"e057", "ref_e057_p13", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e057_p13.call g_ref_e057_p13.pre = g_ref_e057_p13.outcome := by
  decide

def g_ref_e057_p14 : GoldenRec :=
  ⟨"e057", "ref_e057_p14", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "a"), 9223372036854775807), ((.user "d"), 1)], holds := [], nextHold := 0, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e057_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e057_p14.call g_ref_e057_p14.pre = g_ref_e057_p14.outcome := by
  decide

def g_ref_e057_p15 : GoldenRec :=
  ⟨"e057", "ref_e057_p15", "refProgram", ⟨"Deposit", [(.acct (.user "d")), (.int 1)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "a"), 9223372036854775807), ((.user "d"), 0)], holds := [], nextHold := 0, frozen := [] },
   .error (.overflow .mint)⟩
theorem ref_e057_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e057_p15.call g_ref_e057_p15.pre = g_ref_e057_p15.outcome := by
  decide

def g_ref_e058_p0 : GoldenRec :=
  ⟨"e058", "ref_e058_p0", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e058_p0.call g_ref_e058_p0.pre = g_ref_e058_p0.outcome := by
  decide

def g_ref_e058_p1 : GoldenRec :=
  ⟨"e058", "ref_e058_p1", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e058_p1.call g_ref_e058_p1.pre = g_ref_e058_p1.outcome := by
  decide

def g_ref_e058_p2 : GoldenRec :=
  ⟨"e058", "ref_e058_p2", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e058_p2.call g_ref_e058_p2.pre = g_ref_e058_p2.outcome := by
  decide

def g_ref_e058_p3 : GoldenRec :=
  ⟨"e058", "ref_e058_p3", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e058_p3.call g_ref_e058_p3.pre = g_ref_e058_p3.outcome := by
  decide

def g_ref_e058_p4 : GoldenRec :=
  ⟨"e058", "ref_e058_p4", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e058_p4.call g_ref_e058_p4.pre = g_ref_e058_p4.outcome := by
  decide

def g_ref_e058_p5 : GoldenRec :=
  ⟨"e058", "ref_e058_p5", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e058_p5.call g_ref_e058_p5.pre = g_ref_e058_p5.outcome := by
  decide

def g_ref_e058_p6 : GoldenRec :=
  ⟨"e058", "ref_e058_p6", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e058_p6.call g_ref_e058_p6.pre = g_ref_e058_p6.outcome := by
  decide

def g_ref_e058_p7 : GoldenRec :=
  ⟨"e058", "ref_e058_p7", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e058_p7.call g_ref_e058_p7.pre = g_ref_e058_p7.outcome := by
  decide

def g_ref_e058_p8 : GoldenRec :=
  ⟨"e058", "ref_e058_p8", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e058_p8.call g_ref_e058_p8.pre = g_ref_e058_p8.outcome := by
  decide

def g_ref_e058_p9 : GoldenRec :=
  ⟨"e058", "ref_e058_p9", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e058_p9.call g_ref_e058_p9.pre = g_ref_e058_p9.outcome := by
  decide

def g_ref_e058_p10 : GoldenRec :=
  ⟨"e058", "ref_e058_p10", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e058_p10.call g_ref_e058_p10.pre = g_ref_e058_p10.outcome := by
  decide

def g_ref_e058_p11 : GoldenRec :=
  ⟨"e058", "ref_e058_p11", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e058_p11.call g_ref_e058_p11.pre = g_ref_e058_p11.outcome := by
  decide

def g_ref_e058_p12 : GoldenRec :=
  ⟨"e058", "ref_e058_p12", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e058_p12.call g_ref_e058_p12.pre = g_ref_e058_p12.outcome := by
  decide

def g_ref_e058_p13 : GoldenRec :=
  ⟨"e058", "ref_e058_p13", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e058_p13.call g_ref_e058_p13.pre = g_ref_e058_p13.outcome := by
  decide

def g_ref_e058_p14 : GoldenRec :=
  ⟨"e058", "ref_e058_p14", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e058_p14.call g_ref_e058_p14.pre = g_ref_e058_p14.outcome := by
  decide

def g_ref_e058_p15 : GoldenRec :=
  ⟨"e058", "ref_e058_p15", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 5)]⟩,
   { bals := [(.mint, (-47)), ((.user "fay"), 46), ((.user "d"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-47)), ((.user "fay"), 41), ((.user "d"), 1), ((.escrow 2), 5)], holds := [(2, ⟨(.user "fay"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e058_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e058_p15.call g_ref_e058_p15.pre = g_ref_e058_p15.outcome := by
  decide

def g_ref_e059_p0 : GoldenRec :=
  ⟨"e059", "ref_e059_p0", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e059_p0.call g_ref_e059_p0.pre = g_ref_e059_p0.outcome := by
  decide

def g_ref_e059_p1 : GoldenRec :=
  ⟨"e059", "ref_e059_p1", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e059_p1.call g_ref_e059_p1.pre = g_ref_e059_p1.outcome := by
  decide

def g_ref_e059_p2 : GoldenRec :=
  ⟨"e059", "ref_e059_p2", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e059_p2.call g_ref_e059_p2.pre = g_ref_e059_p2.outcome := by
  decide

def g_ref_e059_p3 : GoldenRec :=
  ⟨"e059", "ref_e059_p3", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e059_p3.call g_ref_e059_p3.pre = g_ref_e059_p3.outcome := by
  decide

def g_ref_e059_p4 : GoldenRec :=
  ⟨"e059", "ref_e059_p4", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e059_p4.call g_ref_e059_p4.pre = g_ref_e059_p4.outcome := by
  decide

def g_ref_e059_p5 : GoldenRec :=
  ⟨"e059", "ref_e059_p5", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e059_p5.call g_ref_e059_p5.pre = g_ref_e059_p5.outcome := by
  decide

def g_ref_e059_p6 : GoldenRec :=
  ⟨"e059", "ref_e059_p6", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e059_p6.call g_ref_e059_p6.pre = g_ref_e059_p6.outcome := by
  decide

def g_ref_e059_p7 : GoldenRec :=
  ⟨"e059", "ref_e059_p7", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e059_p7.call g_ref_e059_p7.pre = g_ref_e059_p7.outcome := by
  decide

def g_ref_e059_p8 : GoldenRec :=
  ⟨"e059", "ref_e059_p8", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e059_p8.call g_ref_e059_p8.pre = g_ref_e059_p8.outcome := by
  decide

def g_ref_e059_p9 : GoldenRec :=
  ⟨"e059", "ref_e059_p9", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e059_p9.call g_ref_e059_p9.pre = g_ref_e059_p9.outcome := by
  decide

def g_ref_e059_p10 : GoldenRec :=
  ⟨"e059", "ref_e059_p10", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e059_p10.call g_ref_e059_p10.pre = g_ref_e059_p10.outcome := by
  decide

def g_ref_e059_p11 : GoldenRec :=
  ⟨"e059", "ref_e059_p11", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e059_p11.call g_ref_e059_p11.pre = g_ref_e059_p11.outcome := by
  decide

def g_ref_e059_p12 : GoldenRec :=
  ⟨"e059", "ref_e059_p12", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e059_p12.call g_ref_e059_p12.pre = g_ref_e059_p12.outcome := by
  decide

def g_ref_e059_p13 : GoldenRec :=
  ⟨"e059", "ref_e059_p13", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e059_p13.call g_ref_e059_p13.pre = g_ref_e059_p13.outcome := by
  decide

def g_ref_e059_p14 : GoldenRec :=
  ⟨"e059", "ref_e059_p14", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e059_p14.call g_ref_e059_p14.pre = g_ref_e059_p14.outcome := by
  decide

def g_ref_e059_p15 : GoldenRec :=
  ⟨"e059", "ref_e059_p15", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 7)]⟩,
   { bals := [(.mint, (-12)), ((.user "d"), 11), ((.user "b"), 1)], holds := [], nextHold := 2, frozen := [] },
   .ok ({ bals := [(.mint, (-12)), ((.user "d"), 4), ((.user "b"), 1), ((.escrow 2), 7)], holds := [(2, ⟨(.user "d"), ⟨7, by decide⟩, .held⟩)], nextHold := 3, frozen := [] }, [2], [])⟩
theorem ref_e059_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e059_p15.call g_ref_e059_p15.pre = g_ref_e059_p15.outcome := by
  decide

def g_ref_e060_p0 : GoldenRec :=
  ⟨"e060", "ref_e060_p0", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e060_p0.call g_ref_e060_p0.pre = g_ref_e060_p0.outcome := by
  decide

def g_ref_e060_p1 : GoldenRec :=
  ⟨"e060", "ref_e060_p1", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e060_p1.call g_ref_e060_p1.pre = g_ref_e060_p1.outcome := by
  decide

def g_ref_e060_p2 : GoldenRec :=
  ⟨"e060", "ref_e060_p2", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e060_p2.call g_ref_e060_p2.pre = g_ref_e060_p2.outcome := by
  decide

def g_ref_e060_p3 : GoldenRec :=
  ⟨"e060", "ref_e060_p3", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e060_p3.call g_ref_e060_p3.pre = g_ref_e060_p3.outcome := by
  decide

def g_ref_e060_p4 : GoldenRec :=
  ⟨"e060", "ref_e060_p4", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e060_p4.call g_ref_e060_p4.pre = g_ref_e060_p4.outcome := by
  decide

def g_ref_e060_p5 : GoldenRec :=
  ⟨"e060", "ref_e060_p5", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e060_p5.call g_ref_e060_p5.pre = g_ref_e060_p5.outcome := by
  decide

def g_ref_e060_p6 : GoldenRec :=
  ⟨"e060", "ref_e060_p6", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e060_p6.call g_ref_e060_p6.pre = g_ref_e060_p6.outcome := by
  decide

def g_ref_e060_p7 : GoldenRec :=
  ⟨"e060", "ref_e060_p7", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e060_p7.call g_ref_e060_p7.pre = g_ref_e060_p7.outcome := by
  decide

def g_ref_e060_p8 : GoldenRec :=
  ⟨"e060", "ref_e060_p8", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e060_p8.call g_ref_e060_p8.pre = g_ref_e060_p8.outcome := by
  decide

def g_ref_e060_p9 : GoldenRec :=
  ⟨"e060", "ref_e060_p9", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e060_p9.call g_ref_e060_p9.pre = g_ref_e060_p9.outcome := by
  decide

def g_ref_e060_p10 : GoldenRec :=
  ⟨"e060", "ref_e060_p10", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e060_p10.call g_ref_e060_p10.pre = g_ref_e060_p10.outcome := by
  decide

def g_ref_e060_p11 : GoldenRec :=
  ⟨"e060", "ref_e060_p11", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e060_p11.call g_ref_e060_p11.pre = g_ref_e060_p11.outcome := by
  decide

def g_ref_e060_p12 : GoldenRec :=
  ⟨"e060", "ref_e060_p12", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e060_p12.call g_ref_e060_p12.pre = g_ref_e060_p12.outcome := by
  decide

def g_ref_e060_p13 : GoldenRec :=
  ⟨"e060", "ref_e060_p13", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e060_p13.call g_ref_e060_p13.pre = g_ref_e060_p13.outcome := by
  decide

def g_ref_e060_p14 : GoldenRec :=
  ⟨"e060", "ref_e060_p14", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e060_p14.call g_ref_e060_p14.pre = g_ref_e060_p14.outcome := by
  decide

def g_ref_e060_p15 : GoldenRec :=
  ⟨"e060", "ref_e060_p15", "refProgram", ⟨"Hold", [(.acct (.user "d")), (.int 13)]⟩,
   { bals := [(.mint, (-24)), ((.user "d"), 23), ((.user "a"), 1)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-24)), ((.user "d"), 10), ((.user "a"), 1), ((.escrow 0), 13)], holds := [(0, ⟨(.user "d"), ⟨13, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e060_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e060_p15.call g_ref_e060_p15.pre = g_ref_e060_p15.outcome := by
  decide

def g_ref_e061_p0 : GoldenRec :=
  ⟨"e061", "ref_e061_p0", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e061_p0.call g_ref_e061_p0.pre = g_ref_e061_p0.outcome := by
  decide

def g_ref_e061_p1 : GoldenRec :=
  ⟨"e061", "ref_e061_p1", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e061_p1.call g_ref_e061_p1.pre = g_ref_e061_p1.outcome := by
  decide

def g_ref_e061_p2 : GoldenRec :=
  ⟨"e061", "ref_e061_p2", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e061_p2.call g_ref_e061_p2.pre = g_ref_e061_p2.outcome := by
  decide

def g_ref_e061_p3 : GoldenRec :=
  ⟨"e061", "ref_e061_p3", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e061_p3.call g_ref_e061_p3.pre = g_ref_e061_p3.outcome := by
  decide

def g_ref_e061_p4 : GoldenRec :=
  ⟨"e061", "ref_e061_p4", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e061_p4.call g_ref_e061_p4.pre = g_ref_e061_p4.outcome := by
  decide

def g_ref_e061_p5 : GoldenRec :=
  ⟨"e061", "ref_e061_p5", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e061_p5.call g_ref_e061_p5.pre = g_ref_e061_p5.outcome := by
  decide

def g_ref_e061_p6 : GoldenRec :=
  ⟨"e061", "ref_e061_p6", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e061_p6.call g_ref_e061_p6.pre = g_ref_e061_p6.outcome := by
  decide

def g_ref_e061_p7 : GoldenRec :=
  ⟨"e061", "ref_e061_p7", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e061_p7.call g_ref_e061_p7.pre = g_ref_e061_p7.outcome := by
  decide

def g_ref_e061_p8 : GoldenRec :=
  ⟨"e061", "ref_e061_p8", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e061_p8.call g_ref_e061_p8.pre = g_ref_e061_p8.outcome := by
  decide

def g_ref_e061_p9 : GoldenRec :=
  ⟨"e061", "ref_e061_p9", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e061_p9.call g_ref_e061_p9.pre = g_ref_e061_p9.outcome := by
  decide

def g_ref_e061_p10 : GoldenRec :=
  ⟨"e061", "ref_e061_p10", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e061_p10.call g_ref_e061_p10.pre = g_ref_e061_p10.outcome := by
  decide

def g_ref_e061_p11 : GoldenRec :=
  ⟨"e061", "ref_e061_p11", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e061_p11.call g_ref_e061_p11.pre = g_ref_e061_p11.outcome := by
  decide

def g_ref_e061_p12 : GoldenRec :=
  ⟨"e061", "ref_e061_p12", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e061_p12.call g_ref_e061_p12.pre = g_ref_e061_p12.outcome := by
  decide

def g_ref_e061_p13 : GoldenRec :=
  ⟨"e061", "ref_e061_p13", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.guardFailed "Hold")⟩
theorem ref_e061_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e061_p13.call g_ref_e061_p13.pre = g_ref_e061_p13.outcome := by
  decide

def g_ref_e061_p14 : GoldenRec :=
  ⟨"e061", "ref_e061_p14", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e061_p14.call g_ref_e061_p14.pre = g_ref_e061_p14.outcome := by
  decide

def g_ref_e061_p15 : GoldenRec :=
  ⟨"e061", "ref_e061_p15", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 11)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e061_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e061_p15.call g_ref_e061_p15.pre = g_ref_e061_p15.outcome := by
  decide

def g_ref_e062_p0 : GoldenRec :=
  ⟨"e062", "ref_e062_p0", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e062_p0.call g_ref_e062_p0.pre = g_ref_e062_p0.outcome := by
  decide

def g_ref_e062_p1 : GoldenRec :=
  ⟨"e062", "ref_e062_p1", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e062_p1.call g_ref_e062_p1.pre = g_ref_e062_p1.outcome := by
  decide

def g_ref_e062_p2 : GoldenRec :=
  ⟨"e062", "ref_e062_p2", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e062_p2.call g_ref_e062_p2.pre = g_ref_e062_p2.outcome := by
  decide

def g_ref_e062_p3 : GoldenRec :=
  ⟨"e062", "ref_e062_p3", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e062_p3.call g_ref_e062_p3.pre = g_ref_e062_p3.outcome := by
  decide

def g_ref_e062_p4 : GoldenRec :=
  ⟨"e062", "ref_e062_p4", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e062_p4.call g_ref_e062_p4.pre = g_ref_e062_p4.outcome := by
  decide

def g_ref_e062_p5 : GoldenRec :=
  ⟨"e062", "ref_e062_p5", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e062_p5.call g_ref_e062_p5.pre = g_ref_e062_p5.outcome := by
  decide

def g_ref_e062_p6 : GoldenRec :=
  ⟨"e062", "ref_e062_p6", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e062_p6.call g_ref_e062_p6.pre = g_ref_e062_p6.outcome := by
  decide

def g_ref_e062_p7 : GoldenRec :=
  ⟨"e062", "ref_e062_p7", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.badArgument "amount")⟩
theorem ref_e062_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e062_p7.call g_ref_e062_p7.pre = g_ref_e062_p7.outcome := by
  decide

def g_ref_e062_p8 : GoldenRec :=
  ⟨"e062", "ref_e062_p8", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e062_p8.call g_ref_e062_p8.pre = g_ref_e062_p8.outcome := by
  decide

def g_ref_e062_p9 : GoldenRec :=
  ⟨"e062", "ref_e062_p9", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e062_p9.call g_ref_e062_p9.pre = g_ref_e062_p9.outcome := by
  decide

def g_ref_e062_p10 : GoldenRec :=
  ⟨"e062", "ref_e062_p10", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e062_p10.call g_ref_e062_p10.pre = g_ref_e062_p10.outcome := by
  decide

def g_ref_e062_p11 : GoldenRec :=
  ⟨"e062", "ref_e062_p11", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e062_p11.call g_ref_e062_p11.pre = g_ref_e062_p11.outcome := by
  decide

def g_ref_e062_p12 : GoldenRec :=
  ⟨"e062", "ref_e062_p12", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e062_p12.call g_ref_e062_p12.pre = g_ref_e062_p12.outcome := by
  decide

def g_ref_e062_p13 : GoldenRec :=
  ⟨"e062", "ref_e062_p13", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e062_p13.call g_ref_e062_p13.pre = g_ref_e062_p13.outcome := by
  decide

def g_ref_e062_p14 : GoldenRec :=
  ⟨"e062", "ref_e062_p14", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e062_p14.call g_ref_e062_p14.pre = g_ref_e062_p14.outcome := by
  decide

def g_ref_e062_p15 : GoldenRec :=
  ⟨"e062", "ref_e062_p15", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 0)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] }, [], [])⟩
theorem ref_e062_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e062_p15.call g_ref_e062_p15.pre = g_ref_e062_p15.outcome := by
  decide

def g_ref_e063_p0 : GoldenRec :=
  ⟨"e063", "ref_e063_p0", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e063_p0.call g_ref_e063_p0.pre = g_ref_e063_p0.outcome := by
  decide

def g_ref_e063_p1 : GoldenRec :=
  ⟨"e063", "ref_e063_p1", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e063_p1.call g_ref_e063_p1.pre = g_ref_e063_p1.outcome := by
  decide

def g_ref_e063_p2 : GoldenRec :=
  ⟨"e063", "ref_e063_p2", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e063_p2.call g_ref_e063_p2.pre = g_ref_e063_p2.outcome := by
  decide

def g_ref_e063_p3 : GoldenRec :=
  ⟨"e063", "ref_e063_p3", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e063_p3.call g_ref_e063_p3.pre = g_ref_e063_p3.outcome := by
  decide

def g_ref_e063_p4 : GoldenRec :=
  ⟨"e063", "ref_e063_p4", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e063_p4.call g_ref_e063_p4.pre = g_ref_e063_p4.outcome := by
  decide

def g_ref_e063_p5 : GoldenRec :=
  ⟨"e063", "ref_e063_p5", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e063_p5.call g_ref_e063_p5.pre = g_ref_e063_p5.outcome := by
  decide

def g_ref_e063_p6 : GoldenRec :=
  ⟨"e063", "ref_e063_p6", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e063_p6.call g_ref_e063_p6.pre = g_ref_e063_p6.outcome := by
  decide

def g_ref_e063_p7 : GoldenRec :=
  ⟨"e063", "ref_e063_p7", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e063_p7.call g_ref_e063_p7.pre = g_ref_e063_p7.outcome := by
  decide

def g_ref_e063_p8 : GoldenRec :=
  ⟨"e063", "ref_e063_p8", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e063_p8.call g_ref_e063_p8.pre = g_ref_e063_p8.outcome := by
  decide

def g_ref_e063_p9 : GoldenRec :=
  ⟨"e063", "ref_e063_p9", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e063_p9.call g_ref_e063_p9.pre = g_ref_e063_p9.outcome := by
  decide

def g_ref_e063_p10 : GoldenRec :=
  ⟨"e063", "ref_e063_p10", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e063_p10.call g_ref_e063_p10.pre = g_ref_e063_p10.outcome := by
  decide

def g_ref_e063_p11 : GoldenRec :=
  ⟨"e063", "ref_e063_p11", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e063_p11.call g_ref_e063_p11.pre = g_ref_e063_p11.outcome := by
  decide

def g_ref_e063_p12 : GoldenRec :=
  ⟨"e063", "ref_e063_p12", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e063_p12.call g_ref_e063_p12.pre = g_ref_e063_p12.outcome := by
  decide

def g_ref_e063_p13 : GoldenRec :=
  ⟨"e063", "ref_e063_p13", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e063_p13.call g_ref_e063_p13.pre = g_ref_e063_p13.outcome := by
  decide

def g_ref_e063_p14 : GoldenRec :=
  ⟨"e063", "ref_e063_p14", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e063_p14.call g_ref_e063_p14.pre = g_ref_e063_p14.outcome := by
  decide

def g_ref_e063_p15 : GoldenRec :=
  ⟨"e063", "ref_e063_p15", "refProgram", ⟨"Hold", [(.acct (.user "erin")), (.int 1)]⟩,
   { bals := [(.mint, (-10)), ((.user "fay"), 10)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "erin"))⟩
theorem ref_e063_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e063_p15.call g_ref_e063_p15.pre = g_ref_e063_p15.outcome := by
  decide

def g_ref_e064_p0 : GoldenRec :=
  ⟨"e064", "ref_e064_p0", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e064_p0.call g_ref_e064_p0.pre = g_ref_e064_p0.outcome := by
  decide

def g_ref_e064_p1 : GoldenRec :=
  ⟨"e064", "ref_e064_p1", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e064_p1.call g_ref_e064_p1.pre = g_ref_e064_p1.outcome := by
  decide

def g_ref_e064_p2 : GoldenRec :=
  ⟨"e064", "ref_e064_p2", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e064_p2.call g_ref_e064_p2.pre = g_ref_e064_p2.outcome := by
  decide

def g_ref_e064_p3 : GoldenRec :=
  ⟨"e064", "ref_e064_p3", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e064_p3.call g_ref_e064_p3.pre = g_ref_e064_p3.outcome := by
  decide

def g_ref_e064_p4 : GoldenRec :=
  ⟨"e064", "ref_e064_p4", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e064_p4.call g_ref_e064_p4.pre = g_ref_e064_p4.outcome := by
  decide

def g_ref_e064_p5 : GoldenRec :=
  ⟨"e064", "ref_e064_p5", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e064_p5.call g_ref_e064_p5.pre = g_ref_e064_p5.outcome := by
  decide

def g_ref_e064_p6 : GoldenRec :=
  ⟨"e064", "ref_e064_p6", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e064_p6.call g_ref_e064_p6.pre = g_ref_e064_p6.outcome := by
  decide

def g_ref_e064_p7 : GoldenRec :=
  ⟨"e064", "ref_e064_p7", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e064_p7.call g_ref_e064_p7.pre = g_ref_e064_p7.outcome := by
  decide

def g_ref_e064_p8 : GoldenRec :=
  ⟨"e064", "ref_e064_p8", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e064_p8.call g_ref_e064_p8.pre = g_ref_e064_p8.outcome := by
  decide

def g_ref_e064_p9 : GoldenRec :=
  ⟨"e064", "ref_e064_p9", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e064_p9.call g_ref_e064_p9.pre = g_ref_e064_p9.outcome := by
  decide

def g_ref_e064_p10 : GoldenRec :=
  ⟨"e064", "ref_e064_p10", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e064_p10.call g_ref_e064_p10.pre = g_ref_e064_p10.outcome := by
  decide

def g_ref_e064_p11 : GoldenRec :=
  ⟨"e064", "ref_e064_p11", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e064_p11.call g_ref_e064_p11.pre = g_ref_e064_p11.outcome := by
  decide

def g_ref_e064_p12 : GoldenRec :=
  ⟨"e064", "ref_e064_p12", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e064_p12.call g_ref_e064_p12.pre = g_ref_e064_p12.outcome := by
  decide

def g_ref_e064_p13 : GoldenRec :=
  ⟨"e064", "ref_e064_p13", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e064_p13.call g_ref_e064_p13.pre = g_ref_e064_p13.outcome := by
  decide

def g_ref_e064_p14 : GoldenRec :=
  ⟨"e064", "ref_e064_p14", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e064_p14.call g_ref_e064_p14.pre = g_ref_e064_p14.outcome := by
  decide

def g_ref_e064_p15 : GoldenRec :=
  ⟨"e064", "ref_e064_p15", "refProgram", ⟨"Hold", [(.acct (.user "fay")), (.int 9223372036854775807)]⟩,
   { bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 9223372036854775807)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775807)), ((.user "fay"), 0), ((.escrow 0), 9223372036854775807)], holds := [(0, ⟨(.user "fay"), ⟨9223372036854775807, by decide⟩, .held⟩)], nextHold := 1, frozen := [] }, [0], [])⟩
theorem ref_e064_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e064_p15.call g_ref_e064_p15.pre = g_ref_e064_p15.outcome := by
  decide

def g_ref_e065_p0 : GoldenRec :=
  ⟨"e065", "ref_e065_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e065_p0.call g_ref_e065_p0.pre = g_ref_e065_p0.outcome := by
  decide

def g_ref_e065_p1 : GoldenRec :=
  ⟨"e065", "ref_e065_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e065_p1.call g_ref_e065_p1.pre = g_ref_e065_p1.outcome := by
  decide

def g_ref_e065_p2 : GoldenRec :=
  ⟨"e065", "ref_e065_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e065_p2.call g_ref_e065_p2.pre = g_ref_e065_p2.outcome := by
  decide

def g_ref_e065_p3 : GoldenRec :=
  ⟨"e065", "ref_e065_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e065_p3.call g_ref_e065_p3.pre = g_ref_e065_p3.outcome := by
  decide

def g_ref_e065_p4 : GoldenRec :=
  ⟨"e065", "ref_e065_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e065_p4.call g_ref_e065_p4.pre = g_ref_e065_p4.outcome := by
  decide

def g_ref_e065_p5 : GoldenRec :=
  ⟨"e065", "ref_e065_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e065_p5.call g_ref_e065_p5.pre = g_ref_e065_p5.outcome := by
  decide

def g_ref_e065_p6 : GoldenRec :=
  ⟨"e065", "ref_e065_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e065_p6.call g_ref_e065_p6.pre = g_ref_e065_p6.outcome := by
  decide

def g_ref_e065_p7 : GoldenRec :=
  ⟨"e065", "ref_e065_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e065_p7.call g_ref_e065_p7.pre = g_ref_e065_p7.outcome := by
  decide

def g_ref_e065_p8 : GoldenRec :=
  ⟨"e065", "ref_e065_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e065_p8.call g_ref_e065_p8.pre = g_ref_e065_p8.outcome := by
  decide

def g_ref_e065_p9 : GoldenRec :=
  ⟨"e065", "ref_e065_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e065_p9.call g_ref_e065_p9.pre = g_ref_e065_p9.outcome := by
  decide

def g_ref_e065_p10 : GoldenRec :=
  ⟨"e065", "ref_e065_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e065_p10.call g_ref_e065_p10.pre = g_ref_e065_p10.outcome := by
  decide

def g_ref_e065_p11 : GoldenRec :=
  ⟨"e065", "ref_e065_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e065_p11.call g_ref_e065_p11.pre = g_ref_e065_p11.outcome := by
  decide

def g_ref_e065_p12 : GoldenRec :=
  ⟨"e065", "ref_e065_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e065_p12.call g_ref_e065_p12.pre = g_ref_e065_p12.outcome := by
  decide

def g_ref_e065_p13 : GoldenRec :=
  ⟨"e065", "ref_e065_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e065_p13.call g_ref_e065_p13.pre = g_ref_e065_p13.outcome := by
  decide

def g_ref_e065_p14 : GoldenRec :=
  ⟨"e065", "ref_e065_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e065_p14.call g_ref_e065_p14.pre = g_ref_e065_p14.outcome := by
  decide

def g_ref_e065_p15 : GoldenRec :=
  ⟨"e065", "ref_e065_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "erin"))]⟩,
   { bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 5), (.sink, 0), ((.escrow 0), 72)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-141)), ((.user "c"), 64), ((.user "erin"), 77), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨72, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e065_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e065_p15.call g_ref_e065_p15.pre = g_ref_e065_p15.outcome := by
  decide

def g_ref_e066_p0 : GoldenRec :=
  ⟨"e066", "ref_e066_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e066_p0.call g_ref_e066_p0.pre = g_ref_e066_p0.outcome := by
  decide

def g_ref_e066_p1 : GoldenRec :=
  ⟨"e066", "ref_e066_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e066_p1.call g_ref_e066_p1.pre = g_ref_e066_p1.outcome := by
  decide

def g_ref_e066_p2 : GoldenRec :=
  ⟨"e066", "ref_e066_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e066_p2.call g_ref_e066_p2.pre = g_ref_e066_p2.outcome := by
  decide

def g_ref_e066_p3 : GoldenRec :=
  ⟨"e066", "ref_e066_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e066_p3.call g_ref_e066_p3.pre = g_ref_e066_p3.outcome := by
  decide

def g_ref_e066_p4 : GoldenRec :=
  ⟨"e066", "ref_e066_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e066_p4.call g_ref_e066_p4.pre = g_ref_e066_p4.outcome := by
  decide

def g_ref_e066_p5 : GoldenRec :=
  ⟨"e066", "ref_e066_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e066_p5.call g_ref_e066_p5.pre = g_ref_e066_p5.outcome := by
  decide

def g_ref_e066_p6 : GoldenRec :=
  ⟨"e066", "ref_e066_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e066_p6.call g_ref_e066_p6.pre = g_ref_e066_p6.outcome := by
  decide

def g_ref_e066_p7 : GoldenRec :=
  ⟨"e066", "ref_e066_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e066_p7.call g_ref_e066_p7.pre = g_ref_e066_p7.outcome := by
  decide

def g_ref_e066_p8 : GoldenRec :=
  ⟨"e066", "ref_e066_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e066_p8.call g_ref_e066_p8.pre = g_ref_e066_p8.outcome := by
  decide

def g_ref_e066_p9 : GoldenRec :=
  ⟨"e066", "ref_e066_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e066_p9.call g_ref_e066_p9.pre = g_ref_e066_p9.outcome := by
  decide

def g_ref_e066_p10 : GoldenRec :=
  ⟨"e066", "ref_e066_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e066_p10.call g_ref_e066_p10.pre = g_ref_e066_p10.outcome := by
  decide

def g_ref_e066_p11 : GoldenRec :=
  ⟨"e066", "ref_e066_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e066_p11.call g_ref_e066_p11.pre = g_ref_e066_p11.outcome := by
  decide

def g_ref_e066_p12 : GoldenRec :=
  ⟨"e066", "ref_e066_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e066_p12.call g_ref_e066_p12.pre = g_ref_e066_p12.outcome := by
  decide

def g_ref_e066_p13 : GoldenRec :=
  ⟨"e066", "ref_e066_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e066_p13.call g_ref_e066_p13.pre = g_ref_e066_p13.outcome := by
  decide

def g_ref_e066_p14 : GoldenRec :=
  ⟨"e066", "ref_e066_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e066_p14.call g_ref_e066_p14.pre = g_ref_e066_p14.outcome := by
  decide

def g_ref_e066_p15 : GoldenRec :=
  ⟨"e066", "ref_e066_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "a"))]⟩,
   { bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 80)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-85)), ((.user "b"), 0), ((.user "a"), 85), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨80, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "a"))])⟩
theorem ref_e066_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e066_p15.call g_ref_e066_p15.pre = g_ref_e066_p15.outcome := by
  decide

def g_ref_e067_p0 : GoldenRec :=
  ⟨"e067", "ref_e067_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e067_p0.call g_ref_e067_p0.pre = g_ref_e067_p0.outcome := by
  decide

def g_ref_e067_p1 : GoldenRec :=
  ⟨"e067", "ref_e067_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e067_p1.call g_ref_e067_p1.pre = g_ref_e067_p1.outcome := by
  decide

def g_ref_e067_p2 : GoldenRec :=
  ⟨"e067", "ref_e067_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e067_p2.call g_ref_e067_p2.pre = g_ref_e067_p2.outcome := by
  decide

def g_ref_e067_p3 : GoldenRec :=
  ⟨"e067", "ref_e067_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e067_p3.call g_ref_e067_p3.pre = g_ref_e067_p3.outcome := by
  decide

def g_ref_e067_p4 : GoldenRec :=
  ⟨"e067", "ref_e067_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e067_p4.call g_ref_e067_p4.pre = g_ref_e067_p4.outcome := by
  decide

def g_ref_e067_p5 : GoldenRec :=
  ⟨"e067", "ref_e067_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e067_p5.call g_ref_e067_p5.pre = g_ref_e067_p5.outcome := by
  decide

def g_ref_e067_p6 : GoldenRec :=
  ⟨"e067", "ref_e067_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e067_p6.call g_ref_e067_p6.pre = g_ref_e067_p6.outcome := by
  decide

def g_ref_e067_p7 : GoldenRec :=
  ⟨"e067", "ref_e067_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e067_p7.call g_ref_e067_p7.pre = g_ref_e067_p7.outcome := by
  decide

def g_ref_e067_p8 : GoldenRec :=
  ⟨"e067", "ref_e067_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e067_p8.call g_ref_e067_p8.pre = g_ref_e067_p8.outcome := by
  decide

def g_ref_e067_p9 : GoldenRec :=
  ⟨"e067", "ref_e067_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e067_p9.call g_ref_e067_p9.pre = g_ref_e067_p9.outcome := by
  decide

def g_ref_e067_p10 : GoldenRec :=
  ⟨"e067", "ref_e067_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e067_p10.call g_ref_e067_p10.pre = g_ref_e067_p10.outcome := by
  decide

def g_ref_e067_p11 : GoldenRec :=
  ⟨"e067", "ref_e067_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e067_p11.call g_ref_e067_p11.pre = g_ref_e067_p11.outcome := by
  decide

def g_ref_e067_p12 : GoldenRec :=
  ⟨"e067", "ref_e067_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e067_p12.call g_ref_e067_p12.pre = g_ref_e067_p12.outcome := by
  decide

def g_ref_e067_p13 : GoldenRec :=
  ⟨"e067", "ref_e067_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e067_p13.call g_ref_e067_p13.pre = g_ref_e067_p13.outcome := by
  decide

def g_ref_e067_p14 : GoldenRec :=
  ⟨"e067", "ref_e067_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e067_p14.call g_ref_e067_p14.pre = g_ref_e067_p14.outcome := by
  decide

def g_ref_e067_p15 : GoldenRec :=
  ⟨"e067", "ref_e067_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 0)⟩
theorem ref_e067_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e067_p15.call g_ref_e067_p15.pre = g_ref_e067_p15.outcome := by
  decide

def g_ref_e068_p0 : GoldenRec :=
  ⟨"e068", "ref_e068_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e068_p0.call g_ref_e068_p0.pre = g_ref_e068_p0.outcome := by
  decide

def g_ref_e068_p1 : GoldenRec :=
  ⟨"e068", "ref_e068_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e068_p1.call g_ref_e068_p1.pre = g_ref_e068_p1.outcome := by
  decide

def g_ref_e068_p2 : GoldenRec :=
  ⟨"e068", "ref_e068_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e068_p2.call g_ref_e068_p2.pre = g_ref_e068_p2.outcome := by
  decide

def g_ref_e068_p3 : GoldenRec :=
  ⟨"e068", "ref_e068_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e068_p3.call g_ref_e068_p3.pre = g_ref_e068_p3.outcome := by
  decide

def g_ref_e068_p4 : GoldenRec :=
  ⟨"e068", "ref_e068_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e068_p4.call g_ref_e068_p4.pre = g_ref_e068_p4.outcome := by
  decide

def g_ref_e068_p5 : GoldenRec :=
  ⟨"e068", "ref_e068_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e068_p5.call g_ref_e068_p5.pre = g_ref_e068_p5.outcome := by
  decide

def g_ref_e068_p6 : GoldenRec :=
  ⟨"e068", "ref_e068_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e068_p6.call g_ref_e068_p6.pre = g_ref_e068_p6.outcome := by
  decide

def g_ref_e068_p7 : GoldenRec :=
  ⟨"e068", "ref_e068_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e068_p7.call g_ref_e068_p7.pre = g_ref_e068_p7.outcome := by
  decide

def g_ref_e068_p8 : GoldenRec :=
  ⟨"e068", "ref_e068_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e068_p8.call g_ref_e068_p8.pre = g_ref_e068_p8.outcome := by
  decide

def g_ref_e068_p9 : GoldenRec :=
  ⟨"e068", "ref_e068_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e068_p9.call g_ref_e068_p9.pre = g_ref_e068_p9.outcome := by
  decide

def g_ref_e068_p10 : GoldenRec :=
  ⟨"e068", "ref_e068_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e068_p10.call g_ref_e068_p10.pre = g_ref_e068_p10.outcome := by
  decide

def g_ref_e068_p11 : GoldenRec :=
  ⟨"e068", "ref_e068_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e068_p11.call g_ref_e068_p11.pre = g_ref_e068_p11.outcome := by
  decide

def g_ref_e068_p12 : GoldenRec :=
  ⟨"e068", "ref_e068_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e068_p12.call g_ref_e068_p12.pre = g_ref_e068_p12.outcome := by
  decide

def g_ref_e068_p13 : GoldenRec :=
  ⟨"e068", "ref_e068_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e068_p13.call g_ref_e068_p13.pre = g_ref_e068_p13.outcome := by
  decide

def g_ref_e068_p14 : GoldenRec :=
  ⟨"e068", "ref_e068_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e068_p14.call g_ref_e068_p14.pre = g_ref_e068_p14.outcome := by
  decide

def g_ref_e068_p15 : GoldenRec :=
  ⟨"e068", "ref_e068_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e068_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e068_p15.call g_ref_e068_p15.pre = g_ref_e068_p15.outcome := by
  decide

def g_ref_e069_p0 : GoldenRec :=
  ⟨"e069", "ref_e069_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e069_p0.call g_ref_e069_p0.pre = g_ref_e069_p0.outcome := by
  decide

def g_ref_e069_p1 : GoldenRec :=
  ⟨"e069", "ref_e069_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e069_p1.call g_ref_e069_p1.pre = g_ref_e069_p1.outcome := by
  decide

def g_ref_e069_p2 : GoldenRec :=
  ⟨"e069", "ref_e069_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e069_p2.call g_ref_e069_p2.pre = g_ref_e069_p2.outcome := by
  decide

def g_ref_e069_p3 : GoldenRec :=
  ⟨"e069", "ref_e069_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e069_p3.call g_ref_e069_p3.pre = g_ref_e069_p3.outcome := by
  decide

def g_ref_e069_p4 : GoldenRec :=
  ⟨"e069", "ref_e069_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e069_p4.call g_ref_e069_p4.pre = g_ref_e069_p4.outcome := by
  decide

def g_ref_e069_p5 : GoldenRec :=
  ⟨"e069", "ref_e069_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e069_p5.call g_ref_e069_p5.pre = g_ref_e069_p5.outcome := by
  decide

def g_ref_e069_p6 : GoldenRec :=
  ⟨"e069", "ref_e069_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e069_p6.call g_ref_e069_p6.pre = g_ref_e069_p6.outcome := by
  decide

def g_ref_e069_p7 : GoldenRec :=
  ⟨"e069", "ref_e069_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e069_p7.call g_ref_e069_p7.pre = g_ref_e069_p7.outcome := by
  decide

def g_ref_e069_p8 : GoldenRec :=
  ⟨"e069", "ref_e069_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e069_p8.call g_ref_e069_p8.pre = g_ref_e069_p8.outcome := by
  decide

def g_ref_e069_p9 : GoldenRec :=
  ⟨"e069", "ref_e069_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e069_p9.call g_ref_e069_p9.pre = g_ref_e069_p9.outcome := by
  decide

def g_ref_e069_p10 : GoldenRec :=
  ⟨"e069", "ref_e069_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e069_p10.call g_ref_e069_p10.pre = g_ref_e069_p10.outcome := by
  decide

def g_ref_e069_p11 : GoldenRec :=
  ⟨"e069", "ref_e069_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e069_p11.call g_ref_e069_p11.pre = g_ref_e069_p11.outcome := by
  decide

def g_ref_e069_p12 : GoldenRec :=
  ⟨"e069", "ref_e069_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e069_p12.call g_ref_e069_p12.pre = g_ref_e069_p12.outcome := by
  decide

def g_ref_e069_p13 : GoldenRec :=
  ⟨"e069", "ref_e069_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e069_p13.call g_ref_e069_p13.pre = g_ref_e069_p13.outcome := by
  decide

def g_ref_e069_p14 : GoldenRec :=
  ⟨"e069", "ref_e069_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e069_p14.call g_ref_e069_p14.pre = g_ref_e069_p14.outcome := by
  decide

def g_ref_e069_p15 : GoldenRec :=
  ⟨"e069", "ref_e069_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-6)), ((.user "a"), 1), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e069_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e069_p15.call g_ref_e069_p15.pre = g_ref_e069_p15.outcome := by
  decide

def g_ref_e070_p0 : GoldenRec :=
  ⟨"e070", "ref_e070_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e070_p0.call g_ref_e070_p0.pre = g_ref_e070_p0.outcome := by
  decide

def g_ref_e070_p1 : GoldenRec :=
  ⟨"e070", "ref_e070_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e070_p1.call g_ref_e070_p1.pre = g_ref_e070_p1.outcome := by
  decide

def g_ref_e070_p2 : GoldenRec :=
  ⟨"e070", "ref_e070_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e070_p2.call g_ref_e070_p2.pre = g_ref_e070_p2.outcome := by
  decide

def g_ref_e070_p3 : GoldenRec :=
  ⟨"e070", "ref_e070_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e070_p3.call g_ref_e070_p3.pre = g_ref_e070_p3.outcome := by
  decide

def g_ref_e070_p4 : GoldenRec :=
  ⟨"e070", "ref_e070_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e070_p4.call g_ref_e070_p4.pre = g_ref_e070_p4.outcome := by
  decide

def g_ref_e070_p5 : GoldenRec :=
  ⟨"e070", "ref_e070_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e070_p5.call g_ref_e070_p5.pre = g_ref_e070_p5.outcome := by
  decide

def g_ref_e070_p6 : GoldenRec :=
  ⟨"e070", "ref_e070_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e070_p6.call g_ref_e070_p6.pre = g_ref_e070_p6.outcome := by
  decide

def g_ref_e070_p7 : GoldenRec :=
  ⟨"e070", "ref_e070_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e070_p7.call g_ref_e070_p7.pre = g_ref_e070_p7.outcome := by
  decide

def g_ref_e070_p8 : GoldenRec :=
  ⟨"e070", "ref_e070_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e070_p8.call g_ref_e070_p8.pre = g_ref_e070_p8.outcome := by
  decide

def g_ref_e070_p9 : GoldenRec :=
  ⟨"e070", "ref_e070_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e070_p9.call g_ref_e070_p9.pre = g_ref_e070_p9.outcome := by
  decide

def g_ref_e070_p10 : GoldenRec :=
  ⟨"e070", "ref_e070_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e070_p10.call g_ref_e070_p10.pre = g_ref_e070_p10.outcome := by
  decide

def g_ref_e070_p11 : GoldenRec :=
  ⟨"e070", "ref_e070_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e070_p11.call g_ref_e070_p11.pre = g_ref_e070_p11.outcome := by
  decide

def g_ref_e070_p12 : GoldenRec :=
  ⟨"e070", "ref_e070_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e070_p12.call g_ref_e070_p12.pre = g_ref_e070_p12.outcome := by
  decide

def g_ref_e070_p13 : GoldenRec :=
  ⟨"e070", "ref_e070_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e070_p13.call g_ref_e070_p13.pre = g_ref_e070_p13.outcome := by
  decide

def g_ref_e070_p14 : GoldenRec :=
  ⟨"e070", "ref_e070_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e070_p14.call g_ref_e070_p14.pre = g_ref_e070_p14.outcome := by
  decide

def g_ref_e070_p15 : GoldenRec :=
  ⟨"e070", "ref_e070_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-45)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e070_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e070_p15.call g_ref_e070_p15.pre = g_ref_e070_p15.outcome := by
  decide

def g_ref_e071_p0 : GoldenRec :=
  ⟨"e071", "ref_e071_p0", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e071_p0.call g_ref_e071_p0.pre = g_ref_e071_p0.outcome := by
  decide

def g_ref_e071_p1 : GoldenRec :=
  ⟨"e071", "ref_e071_p1", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e071_p1.call g_ref_e071_p1.pre = g_ref_e071_p1.outcome := by
  decide

def g_ref_e071_p2 : GoldenRec :=
  ⟨"e071", "ref_e071_p2", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e071_p2.call g_ref_e071_p2.pre = g_ref_e071_p2.outcome := by
  decide

def g_ref_e071_p3 : GoldenRec :=
  ⟨"e071", "ref_e071_p3", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e071_p3.call g_ref_e071_p3.pre = g_ref_e071_p3.outcome := by
  decide

def g_ref_e071_p4 : GoldenRec :=
  ⟨"e071", "ref_e071_p4", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e071_p4.call g_ref_e071_p4.pre = g_ref_e071_p4.outcome := by
  decide

def g_ref_e071_p5 : GoldenRec :=
  ⟨"e071", "ref_e071_p5", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e071_p5.call g_ref_e071_p5.pre = g_ref_e071_p5.outcome := by
  decide

def g_ref_e071_p6 : GoldenRec :=
  ⟨"e071", "ref_e071_p6", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e071_p6.call g_ref_e071_p6.pre = g_ref_e071_p6.outcome := by
  decide

def g_ref_e071_p7 : GoldenRec :=
  ⟨"e071", "ref_e071_p7", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e071_p7.call g_ref_e071_p7.pre = g_ref_e071_p7.outcome := by
  decide

def g_ref_e071_p8 : GoldenRec :=
  ⟨"e071", "ref_e071_p8", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e071_p8.call g_ref_e071_p8.pre = g_ref_e071_p8.outcome := by
  decide

def g_ref_e071_p9 : GoldenRec :=
  ⟨"e071", "ref_e071_p9", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e071_p9.call g_ref_e071_p9.pre = g_ref_e071_p9.outcome := by
  decide

def g_ref_e071_p10 : GoldenRec :=
  ⟨"e071", "ref_e071_p10", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e071_p10.call g_ref_e071_p10.pre = g_ref_e071_p10.outcome := by
  decide

def g_ref_e071_p11 : GoldenRec :=
  ⟨"e071", "ref_e071_p11", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e071_p11.call g_ref_e071_p11.pre = g_ref_e071_p11.outcome := by
  decide

def g_ref_e071_p12 : GoldenRec :=
  ⟨"e071", "ref_e071_p12", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e071_p12.call g_ref_e071_p12.pre = g_ref_e071_p12.outcome := by
  decide

def g_ref_e071_p13 : GoldenRec :=
  ⟨"e071", "ref_e071_p13", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e071_p13.call g_ref_e071_p13.pre = g_ref_e071_p13.outcome := by
  decide

def g_ref_e071_p14 : GoldenRec :=
  ⟨"e071", "ref_e071_p14", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e071_p14.call g_ref_e071_p14.pre = g_ref_e071_p14.outcome := by
  decide

def g_ref_e071_p15 : GoldenRec :=
  ⟨"e071", "ref_e071_p15", "refProgram", ⟨"Capture", [(.int 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-46)), ((.user "a"), 1), ((.user "fay"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "a"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e071_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e071_p15.call g_ref_e071_p15.pre = g_ref_e071_p15.outcome := by
  decide

def g_ref_e072_p0 : GoldenRec :=
  ⟨"e072", "ref_e072_p0", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e072_p0.call g_ref_e072_p0.pre = g_ref_e072_p0.outcome := by
  decide

def g_ref_e072_p1 : GoldenRec :=
  ⟨"e072", "ref_e072_p1", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e072_p1.call g_ref_e072_p1.pre = g_ref_e072_p1.outcome := by
  decide

def g_ref_e072_p2 : GoldenRec :=
  ⟨"e072", "ref_e072_p2", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e072_p2.call g_ref_e072_p2.pre = g_ref_e072_p2.outcome := by
  decide

def g_ref_e072_p3 : GoldenRec :=
  ⟨"e072", "ref_e072_p3", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e072_p3.call g_ref_e072_p3.pre = g_ref_e072_p3.outcome := by
  decide

def g_ref_e072_p4 : GoldenRec :=
  ⟨"e072", "ref_e072_p4", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e072_p4.call g_ref_e072_p4.pre = g_ref_e072_p4.outcome := by
  decide

def g_ref_e072_p5 : GoldenRec :=
  ⟨"e072", "ref_e072_p5", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e072_p5.call g_ref_e072_p5.pre = g_ref_e072_p5.outcome := by
  decide

def g_ref_e072_p6 : GoldenRec :=
  ⟨"e072", "ref_e072_p6", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e072_p6.call g_ref_e072_p6.pre = g_ref_e072_p6.outcome := by
  decide

def g_ref_e072_p7 : GoldenRec :=
  ⟨"e072", "ref_e072_p7", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e072_p7.call g_ref_e072_p7.pre = g_ref_e072_p7.outcome := by
  decide

def g_ref_e072_p8 : GoldenRec :=
  ⟨"e072", "ref_e072_p8", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e072_p8.call g_ref_e072_p8.pre = g_ref_e072_p8.outcome := by
  decide

def g_ref_e072_p9 : GoldenRec :=
  ⟨"e072", "ref_e072_p9", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e072_p9.call g_ref_e072_p9.pre = g_ref_e072_p9.outcome := by
  decide

def g_ref_e072_p10 : GoldenRec :=
  ⟨"e072", "ref_e072_p10", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e072_p10.call g_ref_e072_p10.pre = g_ref_e072_p10.outcome := by
  decide

def g_ref_e072_p11 : GoldenRec :=
  ⟨"e072", "ref_e072_p11", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e072_p11.call g_ref_e072_p11.pre = g_ref_e072_p11.outcome := by
  decide

def g_ref_e072_p12 : GoldenRec :=
  ⟨"e072", "ref_e072_p12", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e072_p12.call g_ref_e072_p12.pre = g_ref_e072_p12.outcome := by
  decide

def g_ref_e072_p13 : GoldenRec :=
  ⟨"e072", "ref_e072_p13", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e072_p13.call g_ref_e072_p13.pre = g_ref_e072_p13.outcome := by
  decide

def g_ref_e072_p14 : GoldenRec :=
  ⟨"e072", "ref_e072_p14", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e072_p14.call g_ref_e072_p14.pre = g_ref_e072_p14.outcome := by
  decide

def g_ref_e072_p15 : GoldenRec :=
  ⟨"e072", "ref_e072_p15", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-39)), ((.user "erin"), 25), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 9)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-39)), ((.user "erin"), 34), ((.user "fay"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "erin"), ⟨9, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "erin"))])⟩
theorem ref_e072_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e072_p15.call g_ref_e072_p15.pre = g_ref_e072_p15.outcome := by
  decide

def g_ref_e073_p0 : GoldenRec :=
  ⟨"e073", "ref_e073_p0", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e073_p0.call g_ref_e073_p0.pre = g_ref_e073_p0.outcome := by
  decide

def g_ref_e073_p1 : GoldenRec :=
  ⟨"e073", "ref_e073_p1", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e073_p1.call g_ref_e073_p1.pre = g_ref_e073_p1.outcome := by
  decide

def g_ref_e073_p2 : GoldenRec :=
  ⟨"e073", "ref_e073_p2", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e073_p2.call g_ref_e073_p2.pre = g_ref_e073_p2.outcome := by
  decide

def g_ref_e073_p3 : GoldenRec :=
  ⟨"e073", "ref_e073_p3", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e073_p3.call g_ref_e073_p3.pre = g_ref_e073_p3.outcome := by
  decide

def g_ref_e073_p4 : GoldenRec :=
  ⟨"e073", "ref_e073_p4", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e073_p4.call g_ref_e073_p4.pre = g_ref_e073_p4.outcome := by
  decide

def g_ref_e073_p5 : GoldenRec :=
  ⟨"e073", "ref_e073_p5", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e073_p5.call g_ref_e073_p5.pre = g_ref_e073_p5.outcome := by
  decide

def g_ref_e073_p6 : GoldenRec :=
  ⟨"e073", "ref_e073_p6", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e073_p6.call g_ref_e073_p6.pre = g_ref_e073_p6.outcome := by
  decide

def g_ref_e073_p7 : GoldenRec :=
  ⟨"e073", "ref_e073_p7", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e073_p7.call g_ref_e073_p7.pre = g_ref_e073_p7.outcome := by
  decide

def g_ref_e073_p8 : GoldenRec :=
  ⟨"e073", "ref_e073_p8", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e073_p8.call g_ref_e073_p8.pre = g_ref_e073_p8.outcome := by
  decide

def g_ref_e073_p9 : GoldenRec :=
  ⟨"e073", "ref_e073_p9", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e073_p9.call g_ref_e073_p9.pre = g_ref_e073_p9.outcome := by
  decide

def g_ref_e073_p10 : GoldenRec :=
  ⟨"e073", "ref_e073_p10", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e073_p10.call g_ref_e073_p10.pre = g_ref_e073_p10.outcome := by
  decide

def g_ref_e073_p11 : GoldenRec :=
  ⟨"e073", "ref_e073_p11", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e073_p11.call g_ref_e073_p11.pre = g_ref_e073_p11.outcome := by
  decide

def g_ref_e073_p12 : GoldenRec :=
  ⟨"e073", "ref_e073_p12", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e073_p12.call g_ref_e073_p12.pre = g_ref_e073_p12.outcome := by
  decide

def g_ref_e073_p13 : GoldenRec :=
  ⟨"e073", "ref_e073_p13", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e073_p13.call g_ref_e073_p13.pre = g_ref_e073_p13.outcome := by
  decide

def g_ref_e073_p14 : GoldenRec :=
  ⟨"e073", "ref_e073_p14", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e073_p14.call g_ref_e073_p14.pre = g_ref_e073_p14.outcome := by
  decide

def g_ref_e073_p15 : GoldenRec :=
  ⟨"e073", "ref_e073_p15", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-195)), ((.user "d"), 33), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 157)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-195)), ((.user "d"), 190), ((.user "c"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "d"), ⟨157, by decide⟩, .released⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "d"))])⟩
theorem ref_e073_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e073_p15.call g_ref_e073_p15.pre = g_ref_e073_p15.outcome := by
  decide

def g_ref_e074_p0 : GoldenRec :=
  ⟨"e074", "ref_e074_p0", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e074_p0.call g_ref_e074_p0.pre = g_ref_e074_p0.outcome := by
  decide

def g_ref_e074_p1 : GoldenRec :=
  ⟨"e074", "ref_e074_p1", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e074_p1.call g_ref_e074_p1.pre = g_ref_e074_p1.outcome := by
  decide

def g_ref_e074_p2 : GoldenRec :=
  ⟨"e074", "ref_e074_p2", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e074_p2.call g_ref_e074_p2.pre = g_ref_e074_p2.outcome := by
  decide

def g_ref_e074_p3 : GoldenRec :=
  ⟨"e074", "ref_e074_p3", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e074_p3.call g_ref_e074_p3.pre = g_ref_e074_p3.outcome := by
  decide

def g_ref_e074_p4 : GoldenRec :=
  ⟨"e074", "ref_e074_p4", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e074_p4.call g_ref_e074_p4.pre = g_ref_e074_p4.outcome := by
  decide

def g_ref_e074_p5 : GoldenRec :=
  ⟨"e074", "ref_e074_p5", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e074_p5.call g_ref_e074_p5.pre = g_ref_e074_p5.outcome := by
  decide

def g_ref_e074_p6 : GoldenRec :=
  ⟨"e074", "ref_e074_p6", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e074_p6.call g_ref_e074_p6.pre = g_ref_e074_p6.outcome := by
  decide

def g_ref_e074_p7 : GoldenRec :=
  ⟨"e074", "ref_e074_p7", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e074_p7.call g_ref_e074_p7.pre = g_ref_e074_p7.outcome := by
  decide

def g_ref_e074_p8 : GoldenRec :=
  ⟨"e074", "ref_e074_p8", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e074_p8.call g_ref_e074_p8.pre = g_ref_e074_p8.outcome := by
  decide

def g_ref_e074_p9 : GoldenRec :=
  ⟨"e074", "ref_e074_p9", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e074_p9.call g_ref_e074_p9.pre = g_ref_e074_p9.outcome := by
  decide

def g_ref_e074_p10 : GoldenRec :=
  ⟨"e074", "ref_e074_p10", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e074_p10.call g_ref_e074_p10.pre = g_ref_e074_p10.outcome := by
  decide

def g_ref_e074_p11 : GoldenRec :=
  ⟨"e074", "ref_e074_p11", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e074_p11.call g_ref_e074_p11.pre = g_ref_e074_p11.outcome := by
  decide

def g_ref_e074_p12 : GoldenRec :=
  ⟨"e074", "ref_e074_p12", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e074_p12.call g_ref_e074_p12.pre = g_ref_e074_p12.outcome := by
  decide

def g_ref_e074_p13 : GoldenRec :=
  ⟨"e074", "ref_e074_p13", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e074_p13.call g_ref_e074_p13.pre = g_ref_e074_p13.outcome := by
  decide

def g_ref_e074_p14 : GoldenRec :=
  ⟨"e074", "ref_e074_p14", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e074_p14.call g_ref_e074_p14.pre = g_ref_e074_p14.outcome := by
  decide

def g_ref_e074_p15 : GoldenRec :=
  ⟨"e074", "ref_e074_p15", "refProgram", ⟨"Release", [(.hold 7)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 1), 40)], holds := [(1, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 2, frozen := [] },
   .error (.unknownHold 7)⟩
theorem ref_e074_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e074_p15.call g_ref_e074_p15.pre = g_ref_e074_p15.outcome := by
  decide

def g_ref_e075_p0 : GoldenRec :=
  ⟨"e075", "ref_e075_p0", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e075_p0.call g_ref_e075_p0.pre = g_ref_e075_p0.outcome := by
  decide

def g_ref_e075_p1 : GoldenRec :=
  ⟨"e075", "ref_e075_p1", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e075_p1.call g_ref_e075_p1.pre = g_ref_e075_p1.outcome := by
  decide

def g_ref_e075_p2 : GoldenRec :=
  ⟨"e075", "ref_e075_p2", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e075_p2.call g_ref_e075_p2.pre = g_ref_e075_p2.outcome := by
  decide

def g_ref_e075_p3 : GoldenRec :=
  ⟨"e075", "ref_e075_p3", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e075_p3.call g_ref_e075_p3.pre = g_ref_e075_p3.outcome := by
  decide

def g_ref_e075_p4 : GoldenRec :=
  ⟨"e075", "ref_e075_p4", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e075_p4.call g_ref_e075_p4.pre = g_ref_e075_p4.outcome := by
  decide

def g_ref_e075_p5 : GoldenRec :=
  ⟨"e075", "ref_e075_p5", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e075_p5.call g_ref_e075_p5.pre = g_ref_e075_p5.outcome := by
  decide

def g_ref_e075_p6 : GoldenRec :=
  ⟨"e075", "ref_e075_p6", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e075_p6.call g_ref_e075_p6.pre = g_ref_e075_p6.outcome := by
  decide

def g_ref_e075_p7 : GoldenRec :=
  ⟨"e075", "ref_e075_p7", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e075_p7.call g_ref_e075_p7.pre = g_ref_e075_p7.outcome := by
  decide

def g_ref_e075_p8 : GoldenRec :=
  ⟨"e075", "ref_e075_p8", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e075_p8.call g_ref_e075_p8.pre = g_ref_e075_p8.outcome := by
  decide

def g_ref_e075_p9 : GoldenRec :=
  ⟨"e075", "ref_e075_p9", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e075_p9.call g_ref_e075_p9.pre = g_ref_e075_p9.outcome := by
  decide

def g_ref_e075_p10 : GoldenRec :=
  ⟨"e075", "ref_e075_p10", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e075_p10.call g_ref_e075_p10.pre = g_ref_e075_p10.outcome := by
  decide

def g_ref_e075_p11 : GoldenRec :=
  ⟨"e075", "ref_e075_p11", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e075_p11.call g_ref_e075_p11.pre = g_ref_e075_p11.outcome := by
  decide

def g_ref_e075_p12 : GoldenRec :=
  ⟨"e075", "ref_e075_p12", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e075_p12.call g_ref_e075_p12.pre = g_ref_e075_p12.outcome := by
  decide

def g_ref_e075_p13 : GoldenRec :=
  ⟨"e075", "ref_e075_p13", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e075_p13.call g_ref_e075_p13.pre = g_ref_e075_p13.outcome := by
  decide

def g_ref_e075_p14 : GoldenRec :=
  ⟨"e075", "ref_e075_p14", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e075_p14.call g_ref_e075_p14.pre = g_ref_e075_p14.outcome := by
  decide

def g_ref_e075_p15 : GoldenRec :=
  ⟨"e075", "ref_e075_p15", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 40), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e075_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e075_p15.call g_ref_e075_p15.pre = g_ref_e075_p15.outcome := by
  decide

def g_ref_e076_p0 : GoldenRec :=
  ⟨"e076", "ref_e076_p0", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e076_p0.call g_ref_e076_p0.pre = g_ref_e076_p0.outcome := by
  decide

def g_ref_e076_p1 : GoldenRec :=
  ⟨"e076", "ref_e076_p1", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e076_p1.call g_ref_e076_p1.pre = g_ref_e076_p1.outcome := by
  decide

def g_ref_e076_p2 : GoldenRec :=
  ⟨"e076", "ref_e076_p2", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e076_p2.call g_ref_e076_p2.pre = g_ref_e076_p2.outcome := by
  decide

def g_ref_e076_p3 : GoldenRec :=
  ⟨"e076", "ref_e076_p3", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e076_p3.call g_ref_e076_p3.pre = g_ref_e076_p3.outcome := by
  decide

def g_ref_e076_p4 : GoldenRec :=
  ⟨"e076", "ref_e076_p4", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e076_p4.call g_ref_e076_p4.pre = g_ref_e076_p4.outcome := by
  decide

def g_ref_e076_p5 : GoldenRec :=
  ⟨"e076", "ref_e076_p5", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e076_p5.call g_ref_e076_p5.pre = g_ref_e076_p5.outcome := by
  decide

def g_ref_e076_p6 : GoldenRec :=
  ⟨"e076", "ref_e076_p6", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e076_p6.call g_ref_e076_p6.pre = g_ref_e076_p6.outcome := by
  decide

def g_ref_e076_p7 : GoldenRec :=
  ⟨"e076", "ref_e076_p7", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e076_p7.call g_ref_e076_p7.pre = g_ref_e076_p7.outcome := by
  decide

def g_ref_e076_p8 : GoldenRec :=
  ⟨"e076", "ref_e076_p8", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e076_p8.call g_ref_e076_p8.pre = g_ref_e076_p8.outcome := by
  decide

def g_ref_e076_p9 : GoldenRec :=
  ⟨"e076", "ref_e076_p9", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e076_p9.call g_ref_e076_p9.pre = g_ref_e076_p9.outcome := by
  decide

def g_ref_e076_p10 : GoldenRec :=
  ⟨"e076", "ref_e076_p10", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e076_p10.call g_ref_e076_p10.pre = g_ref_e076_p10.outcome := by
  decide

def g_ref_e076_p11 : GoldenRec :=
  ⟨"e076", "ref_e076_p11", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e076_p11.call g_ref_e076_p11.pre = g_ref_e076_p11.outcome := by
  decide

def g_ref_e076_p12 : GoldenRec :=
  ⟨"e076", "ref_e076_p12", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e076_p12.call g_ref_e076_p12.pre = g_ref_e076_p12.outcome := by
  decide

def g_ref_e076_p13 : GoldenRec :=
  ⟨"e076", "ref_e076_p13", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e076_p13.call g_ref_e076_p13.pre = g_ref_e076_p13.outcome := by
  decide

def g_ref_e076_p14 : GoldenRec :=
  ⟨"e076", "ref_e076_p14", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e076_p14.call g_ref_e076_p14.pre = g_ref_e076_p14.outcome := by
  decide

def g_ref_e076_p15 : GoldenRec :=
  ⟨"e076", "ref_e076_p15", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-6)), ((.user "b"), 1), ((.user "a"), 5), (.sink, 0), ((.escrow 0), 0)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .released⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e076_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e076_p15.call g_ref_e076_p15.pre = g_ref_e076_p15.outcome := by
  decide

def g_ref_e077_p0 : GoldenRec :=
  ⟨"e077", "ref_e077_p0", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e077_p0.call g_ref_e077_p0.pre = g_ref_e077_p0.outcome := by
  decide

def g_ref_e077_p1 : GoldenRec :=
  ⟨"e077", "ref_e077_p1", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e077_p1.call g_ref_e077_p1.pre = g_ref_e077_p1.outcome := by
  decide

def g_ref_e077_p2 : GoldenRec :=
  ⟨"e077", "ref_e077_p2", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e077_p2.call g_ref_e077_p2.pre = g_ref_e077_p2.outcome := by
  decide

def g_ref_e077_p3 : GoldenRec :=
  ⟨"e077", "ref_e077_p3", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e077_p3.call g_ref_e077_p3.pre = g_ref_e077_p3.outcome := by
  decide

def g_ref_e077_p4 : GoldenRec :=
  ⟨"e077", "ref_e077_p4", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e077_p4.call g_ref_e077_p4.pre = g_ref_e077_p4.outcome := by
  decide

def g_ref_e077_p5 : GoldenRec :=
  ⟨"e077", "ref_e077_p5", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e077_p5.call g_ref_e077_p5.pre = g_ref_e077_p5.outcome := by
  decide

def g_ref_e077_p6 : GoldenRec :=
  ⟨"e077", "ref_e077_p6", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e077_p6.call g_ref_e077_p6.pre = g_ref_e077_p6.outcome := by
  decide

def g_ref_e077_p7 : GoldenRec :=
  ⟨"e077", "ref_e077_p7", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e077_p7.call g_ref_e077_p7.pre = g_ref_e077_p7.outcome := by
  decide

def g_ref_e077_p8 : GoldenRec :=
  ⟨"e077", "ref_e077_p8", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e077_p8.call g_ref_e077_p8.pre = g_ref_e077_p8.outcome := by
  decide

def g_ref_e077_p9 : GoldenRec :=
  ⟨"e077", "ref_e077_p9", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e077_p9.call g_ref_e077_p9.pre = g_ref_e077_p9.outcome := by
  decide

def g_ref_e077_p10 : GoldenRec :=
  ⟨"e077", "ref_e077_p10", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e077_p10.call g_ref_e077_p10.pre = g_ref_e077_p10.outcome := by
  decide

def g_ref_e077_p11 : GoldenRec :=
  ⟨"e077", "ref_e077_p11", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e077_p11.call g_ref_e077_p11.pre = g_ref_e077_p11.outcome := by
  decide

def g_ref_e077_p12 : GoldenRec :=
  ⟨"e077", "ref_e077_p12", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e077_p12.call g_ref_e077_p12.pre = g_ref_e077_p12.outcome := by
  decide

def g_ref_e077_p13 : GoldenRec :=
  ⟨"e077", "ref_e077_p13", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e077_p13.call g_ref_e077_p13.pre = g_ref_e077_p13.outcome := by
  decide

def g_ref_e077_p14 : GoldenRec :=
  ⟨"e077", "ref_e077_p14", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e077_p14.call g_ref_e077_p14.pre = g_ref_e077_p14.outcome := by
  decide

def g_ref_e077_p15 : GoldenRec :=
  ⟨"e077", "ref_e077_p15", "refProgram", ⟨"Release", [(.hold 0)]⟩,
   { bals := [(.mint, (-45)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 39)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.holdNotOpen 0)⟩
theorem ref_e077_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e077_p15.call g_ref_e077_p15.pre = g_ref_e077_p15.outcome := by
  decide

def g_ref_e078_p0 : GoldenRec :=
  ⟨"e078", "ref_e078_p0", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e078_p0.call g_ref_e078_p0.pre = g_ref_e078_p0.outcome := by
  decide

def g_ref_e078_p1 : GoldenRec :=
  ⟨"e078", "ref_e078_p1", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e078_p1.call g_ref_e078_p1.pre = g_ref_e078_p1.outcome := by
  decide

def g_ref_e078_p2 : GoldenRec :=
  ⟨"e078", "ref_e078_p2", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e078_p2.call g_ref_e078_p2.pre = g_ref_e078_p2.outcome := by
  decide

def g_ref_e078_p3 : GoldenRec :=
  ⟨"e078", "ref_e078_p3", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e078_p3.call g_ref_e078_p3.pre = g_ref_e078_p3.outcome := by
  decide

def g_ref_e078_p4 : GoldenRec :=
  ⟨"e078", "ref_e078_p4", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e078_p4.call g_ref_e078_p4.pre = g_ref_e078_p4.outcome := by
  decide

def g_ref_e078_p5 : GoldenRec :=
  ⟨"e078", "ref_e078_p5", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e078_p5.call g_ref_e078_p5.pre = g_ref_e078_p5.outcome := by
  decide

def g_ref_e078_p6 : GoldenRec :=
  ⟨"e078", "ref_e078_p6", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e078_p6.call g_ref_e078_p6.pre = g_ref_e078_p6.outcome := by
  decide

def g_ref_e078_p7 : GoldenRec :=
  ⟨"e078", "ref_e078_p7", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e078_p7.call g_ref_e078_p7.pre = g_ref_e078_p7.outcome := by
  decide

def g_ref_e078_p8 : GoldenRec :=
  ⟨"e078", "ref_e078_p8", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e078_p8.call g_ref_e078_p8.pre = g_ref_e078_p8.outcome := by
  decide

def g_ref_e078_p9 : GoldenRec :=
  ⟨"e078", "ref_e078_p9", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e078_p9.call g_ref_e078_p9.pre = g_ref_e078_p9.outcome := by
  decide

def g_ref_e078_p10 : GoldenRec :=
  ⟨"e078", "ref_e078_p10", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e078_p10.call g_ref_e078_p10.pre = g_ref_e078_p10.outcome := by
  decide

def g_ref_e078_p11 : GoldenRec :=
  ⟨"e078", "ref_e078_p11", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e078_p11.call g_ref_e078_p11.pre = g_ref_e078_p11.outcome := by
  decide

def g_ref_e078_p12 : GoldenRec :=
  ⟨"e078", "ref_e078_p12", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e078_p12.call g_ref_e078_p12.pre = g_ref_e078_p12.outcome := by
  decide

def g_ref_e078_p13 : GoldenRec :=
  ⟨"e078", "ref_e078_p13", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e078_p13.call g_ref_e078_p13.pre = g_ref_e078_p13.outcome := by
  decide

def g_ref_e078_p14 : GoldenRec :=
  ⟨"e078", "ref_e078_p14", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e078_p14.call g_ref_e078_p14.pre = g_ref_e078_p14.outcome := by
  decide

def g_ref_e078_p15 : GoldenRec :=
  ⟨"e078", "ref_e078_p15", "refProgram", ⟨"Release", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-46)), ((.user "b"), 1), ((.user "a"), 5), ((.escrow 0), 40)], holds := [(0, ⟨(.user "b"), ⟨40, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.badArgument "h")⟩
theorem ref_e078_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e078_p15.call g_ref_e078_p15.pre = g_ref_e078_p15.outcome := by
  decide

def g_ref_e079_p0 : GoldenRec :=
  ⟨"e079", "ref_e079_p0", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e079_p0.call g_ref_e079_p0.pre = g_ref_e079_p0.outcome := by
  decide

def g_ref_e079_p1 : GoldenRec :=
  ⟨"e079", "ref_e079_p1", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e079_p1.call g_ref_e079_p1.pre = g_ref_e079_p1.outcome := by
  decide

def g_ref_e079_p2 : GoldenRec :=
  ⟨"e079", "ref_e079_p2", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e079_p2.call g_ref_e079_p2.pre = g_ref_e079_p2.outcome := by
  decide

def g_ref_e079_p3 : GoldenRec :=
  ⟨"e079", "ref_e079_p3", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e079_p3.call g_ref_e079_p3.pre = g_ref_e079_p3.outcome := by
  decide

def g_ref_e079_p4 : GoldenRec :=
  ⟨"e079", "ref_e079_p4", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e079_p4.call g_ref_e079_p4.pre = g_ref_e079_p4.outcome := by
  decide

def g_ref_e079_p5 : GoldenRec :=
  ⟨"e079", "ref_e079_p5", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e079_p5.call g_ref_e079_p5.pre = g_ref_e079_p5.outcome := by
  decide

def g_ref_e079_p6 : GoldenRec :=
  ⟨"e079", "ref_e079_p6", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e079_p6.call g_ref_e079_p6.pre = g_ref_e079_p6.outcome := by
  decide

def g_ref_e079_p7 : GoldenRec :=
  ⟨"e079", "ref_e079_p7", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e079_p7.call g_ref_e079_p7.pre = g_ref_e079_p7.outcome := by
  decide

def g_ref_e079_p8 : GoldenRec :=
  ⟨"e079", "ref_e079_p8", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e079_p8.call g_ref_e079_p8.pre = g_ref_e079_p8.outcome := by
  decide

def g_ref_e079_p9 : GoldenRec :=
  ⟨"e079", "ref_e079_p9", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e079_p9.call g_ref_e079_p9.pre = g_ref_e079_p9.outcome := by
  decide

def g_ref_e079_p10 : GoldenRec :=
  ⟨"e079", "ref_e079_p10", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e079_p10.call g_ref_e079_p10.pre = g_ref_e079_p10.outcome := by
  decide

def g_ref_e079_p11 : GoldenRec :=
  ⟨"e079", "ref_e079_p11", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e079_p11.call g_ref_e079_p11.pre = g_ref_e079_p11.outcome := by
  decide

def g_ref_e079_p12 : GoldenRec :=
  ⟨"e079", "ref_e079_p12", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e079_p12.call g_ref_e079_p12.pre = g_ref_e079_p12.outcome := by
  decide

def g_ref_e079_p13 : GoldenRec :=
  ⟨"e079", "ref_e079_p13", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e079_p13.call g_ref_e079_p13.pre = g_ref_e079_p13.outcome := by
  decide

def g_ref_e079_p14 : GoldenRec :=
  ⟨"e079", "ref_e079_p14", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .ok ({ bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775808), ((.escrow 0), 0)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 1, frozen := [] }, [], [(.notify (.user "fay"))])⟩
theorem ref_e079_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e079_p14.call g_ref_e079_p14.pre = g_ref_e079_p14.outcome := by
  decide

def g_ref_e079_p15 : GoldenRec :=
  ⟨"e079", "ref_e079_p15", "refProgram", ⟨"Capture", [(.hold 0), (.acct (.user "fay"))]⟩,
   { bals := [(.mint, (-9223372036854775808)), ((.user "c"), 0), ((.user "fay"), 9223372036854775803), ((.escrow 0), 5)], holds := [(0, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 1, frozen := [] },
   .error (.overflow (.user "fay"))⟩
theorem ref_e079_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e079_p15.call g_ref_e079_p15.pre = g_ref_e079_p15.outcome := by
  decide

def g_ref_e080_p0 : GoldenRec :=
  ⟨"e080", "ref_e080_p0", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e080_p0.call g_ref_e080_p0.pre = g_ref_e080_p0.outcome := by
  decide

def g_ref_e080_p1 : GoldenRec :=
  ⟨"e080", "ref_e080_p1", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e080_p1.call g_ref_e080_p1.pre = g_ref_e080_p1.outcome := by
  decide

def g_ref_e080_p2 : GoldenRec :=
  ⟨"e080", "ref_e080_p2", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e080_p2.call g_ref_e080_p2.pre = g_ref_e080_p2.outcome := by
  decide

def g_ref_e080_p3 : GoldenRec :=
  ⟨"e080", "ref_e080_p3", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e080_p3.call g_ref_e080_p3.pre = g_ref_e080_p3.outcome := by
  decide

def g_ref_e080_p4 : GoldenRec :=
  ⟨"e080", "ref_e080_p4", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e080_p4.call g_ref_e080_p4.pre = g_ref_e080_p4.outcome := by
  decide

def g_ref_e080_p5 : GoldenRec :=
  ⟨"e080", "ref_e080_p5", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e080_p5.call g_ref_e080_p5.pre = g_ref_e080_p5.outcome := by
  decide

def g_ref_e080_p6 : GoldenRec :=
  ⟨"e080", "ref_e080_p6", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e080_p6.call g_ref_e080_p6.pre = g_ref_e080_p6.outcome := by
  decide

def g_ref_e080_p7 : GoldenRec :=
  ⟨"e080", "ref_e080_p7", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e080_p7.call g_ref_e080_p7.pre = g_ref_e080_p7.outcome := by
  decide

def g_ref_e080_p8 : GoldenRec :=
  ⟨"e080", "ref_e080_p8", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e080_p8.call g_ref_e080_p8.pre = g_ref_e080_p8.outcome := by
  decide

def g_ref_e080_p9 : GoldenRec :=
  ⟨"e080", "ref_e080_p9", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e080_p9.call g_ref_e080_p9.pre = g_ref_e080_p9.outcome := by
  decide

def g_ref_e080_p10 : GoldenRec :=
  ⟨"e080", "ref_e080_p10", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e080_p10.call g_ref_e080_p10.pre = g_ref_e080_p10.outcome := by
  decide

def g_ref_e080_p11 : GoldenRec :=
  ⟨"e080", "ref_e080_p11", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e080_p11.call g_ref_e080_p11.pre = g_ref_e080_p11.outcome := by
  decide

def g_ref_e080_p12 : GoldenRec :=
  ⟨"e080", "ref_e080_p12", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e080_p12.call g_ref_e080_p12.pre = g_ref_e080_p12.outcome := by
  decide

def g_ref_e080_p13 : GoldenRec :=
  ⟨"e080", "ref_e080_p13", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e080_p13.call g_ref_e080_p13.pre = g_ref_e080_p13.outcome := by
  decide

def g_ref_e080_p14 : GoldenRec :=
  ⟨"e080", "ref_e080_p14", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e080_p14.call g_ref_e080_p14.pre = g_ref_e080_p14.outcome := by
  decide

def g_ref_e080_p15 : GoldenRec :=
  ⟨"e080", "ref_e080_p15", "refProgram", ⟨"Capture", [(.hold 2), (.acct .sink)]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .ok ({ bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 5), ((.escrow 2), 0)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .captured⟩)], nextHold := 3, frozen := [] }, [], [])⟩
theorem ref_e080_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e080_p15.call g_ref_e080_p15.pre = g_ref_e080_p15.outcome := by
  decide

def g_ref_e081_p0 : GoldenRec :=
  ⟨"e081", "ref_e081_p0", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e081_p0.call g_ref_e081_p0.pre = g_ref_e081_p0.outcome := by
  decide

def g_ref_e081_p1 : GoldenRec :=
  ⟨"e081", "ref_e081_p1", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e081_p1.call g_ref_e081_p1.pre = g_ref_e081_p1.outcome := by
  decide

def g_ref_e081_p2 : GoldenRec :=
  ⟨"e081", "ref_e081_p2", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e081_p2.call g_ref_e081_p2.pre = g_ref_e081_p2.outcome := by
  decide

def g_ref_e081_p3 : GoldenRec :=
  ⟨"e081", "ref_e081_p3", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e081_p3.call g_ref_e081_p3.pre = g_ref_e081_p3.outcome := by
  decide

def g_ref_e081_p4 : GoldenRec :=
  ⟨"e081", "ref_e081_p4", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e081_p4.call g_ref_e081_p4.pre = g_ref_e081_p4.outcome := by
  decide

def g_ref_e081_p5 : GoldenRec :=
  ⟨"e081", "ref_e081_p5", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e081_p5.call g_ref_e081_p5.pre = g_ref_e081_p5.outcome := by
  decide

def g_ref_e081_p6 : GoldenRec :=
  ⟨"e081", "ref_e081_p6", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e081_p6.call g_ref_e081_p6.pre = g_ref_e081_p6.outcome := by
  decide

def g_ref_e081_p7 : GoldenRec :=
  ⟨"e081", "ref_e081_p7", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e081_p7.call g_ref_e081_p7.pre = g_ref_e081_p7.outcome := by
  decide

def g_ref_e081_p8 : GoldenRec :=
  ⟨"e081", "ref_e081_p8", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e081_p8.call g_ref_e081_p8.pre = g_ref_e081_p8.outcome := by
  decide

def g_ref_e081_p9 : GoldenRec :=
  ⟨"e081", "ref_e081_p9", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e081_p9.call g_ref_e081_p9.pre = g_ref_e081_p9.outcome := by
  decide

def g_ref_e081_p10 : GoldenRec :=
  ⟨"e081", "ref_e081_p10", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e081_p10.call g_ref_e081_p10.pre = g_ref_e081_p10.outcome := by
  decide

def g_ref_e081_p11 : GoldenRec :=
  ⟨"e081", "ref_e081_p11", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e081_p11.call g_ref_e081_p11.pre = g_ref_e081_p11.outcome := by
  decide

def g_ref_e081_p12 : GoldenRec :=
  ⟨"e081", "ref_e081_p12", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e081_p12.call g_ref_e081_p12.pre = g_ref_e081_p12.outcome := by
  decide

def g_ref_e081_p13 : GoldenRec :=
  ⟨"e081", "ref_e081_p13", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e081_p13.call g_ref_e081_p13.pre = g_ref_e081_p13.outcome := by
  decide

def g_ref_e081_p14 : GoldenRec :=
  ⟨"e081", "ref_e081_p14", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e081_p14.call g_ref_e081_p14.pre = g_ref_e081_p14.outcome := by
  decide

def g_ref_e081_p15 : GoldenRec :=
  ⟨"e081", "ref_e081_p15", "refProgram", ⟨"Capture", [(.hold 2), (.acct (.user "ghost"))]⟩,
   { bals := [(.mint, (-8)), ((.user "c"), 0), ((.user "fay"), 3), (.sink, 0), ((.escrow 2), 5)], holds := [(2, ⟨(.user "c"), ⟨5, by decide⟩, .held⟩)], nextHold := 3, frozen := [] },
   .error (.unknownAccount (.user "ghost"))⟩
theorem ref_e081_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e081_p15.call g_ref_e081_p15.pre = g_ref_e081_p15.outcome := by
  decide

def g_ref_e082_p0 : GoldenRec :=
  ⟨"e082", "ref_e082_p0", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e082_p0.call g_ref_e082_p0.pre = g_ref_e082_p0.outcome := by
  decide

def g_ref_e082_p1 : GoldenRec :=
  ⟨"e082", "ref_e082_p1", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e082_p1.call g_ref_e082_p1.pre = g_ref_e082_p1.outcome := by
  decide

def g_ref_e082_p2 : GoldenRec :=
  ⟨"e082", "ref_e082_p2", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e082_p2.call g_ref_e082_p2.pre = g_ref_e082_p2.outcome := by
  decide

def g_ref_e082_p3 : GoldenRec :=
  ⟨"e082", "ref_e082_p3", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e082_p3.call g_ref_e082_p3.pre = g_ref_e082_p3.outcome := by
  decide

def g_ref_e082_p4 : GoldenRec :=
  ⟨"e082", "ref_e082_p4", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e082_p4.call g_ref_e082_p4.pre = g_ref_e082_p4.outcome := by
  decide

def g_ref_e082_p5 : GoldenRec :=
  ⟨"e082", "ref_e082_p5", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e082_p5.call g_ref_e082_p5.pre = g_ref_e082_p5.outcome := by
  decide

def g_ref_e082_p6 : GoldenRec :=
  ⟨"e082", "ref_e082_p6", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e082_p6.call g_ref_e082_p6.pre = g_ref_e082_p6.outcome := by
  decide

def g_ref_e082_p7 : GoldenRec :=
  ⟨"e082", "ref_e082_p7", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e082_p7.call g_ref_e082_p7.pre = g_ref_e082_p7.outcome := by
  decide

def g_ref_e082_p8 : GoldenRec :=
  ⟨"e082", "ref_e082_p8", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e082_p8.call g_ref_e082_p8.pre = g_ref_e082_p8.outcome := by
  decide

def g_ref_e082_p9 : GoldenRec :=
  ⟨"e082", "ref_e082_p9", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e082_p9.call g_ref_e082_p9.pre = g_ref_e082_p9.outcome := by
  decide

def g_ref_e082_p10 : GoldenRec :=
  ⟨"e082", "ref_e082_p10", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e082_p10.call g_ref_e082_p10.pre = g_ref_e082_p10.outcome := by
  decide

def g_ref_e082_p11 : GoldenRec :=
  ⟨"e082", "ref_e082_p11", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e082_p11.call g_ref_e082_p11.pre = g_ref_e082_p11.outcome := by
  decide

def g_ref_e082_p12 : GoldenRec :=
  ⟨"e082", "ref_e082_p12", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e082_p12.call g_ref_e082_p12.pre = g_ref_e082_p12.outcome := by
  decide

def g_ref_e082_p13 : GoldenRec :=
  ⟨"e082", "ref_e082_p13", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e082_p13.call g_ref_e082_p13.pre = g_ref_e082_p13.outcome := by
  decide

def g_ref_e082_p14 : GoldenRec :=
  ⟨"e082", "ref_e082_p14", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e082_p14.call g_ref_e082_p14.pre = g_ref_e082_p14.outcome := by
  decide

def g_ref_e082_p15 : GoldenRec :=
  ⟨"e082", "ref_e082_p15", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e082_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e082_p15.call g_ref_e082_p15.pre = g_ref_e082_p15.outcome := by
  decide

def g_ref_e083_p0 : GoldenRec :=
  ⟨"e083", "ref_e083_p0", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e083_p0.call g_ref_e083_p0.pre = g_ref_e083_p0.outcome := by
  decide

def g_ref_e083_p1 : GoldenRec :=
  ⟨"e083", "ref_e083_p1", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e083_p1.call g_ref_e083_p1.pre = g_ref_e083_p1.outcome := by
  decide

def g_ref_e083_p2 : GoldenRec :=
  ⟨"e083", "ref_e083_p2", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e083_p2.call g_ref_e083_p2.pre = g_ref_e083_p2.outcome := by
  decide

def g_ref_e083_p3 : GoldenRec :=
  ⟨"e083", "ref_e083_p3", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e083_p3.call g_ref_e083_p3.pre = g_ref_e083_p3.outcome := by
  decide

def g_ref_e083_p4 : GoldenRec :=
  ⟨"e083", "ref_e083_p4", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e083_p4.call g_ref_e083_p4.pre = g_ref_e083_p4.outcome := by
  decide

def g_ref_e083_p5 : GoldenRec :=
  ⟨"e083", "ref_e083_p5", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e083_p5.call g_ref_e083_p5.pre = g_ref_e083_p5.outcome := by
  decide

def g_ref_e083_p6 : GoldenRec :=
  ⟨"e083", "ref_e083_p6", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e083_p6.call g_ref_e083_p6.pre = g_ref_e083_p6.outcome := by
  decide

def g_ref_e083_p7 : GoldenRec :=
  ⟨"e083", "ref_e083_p7", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e083_p7.call g_ref_e083_p7.pre = g_ref_e083_p7.outcome := by
  decide

def g_ref_e083_p8 : GoldenRec :=
  ⟨"e083", "ref_e083_p8", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e083_p8.call g_ref_e083_p8.pre = g_ref_e083_p8.outcome := by
  decide

def g_ref_e083_p9 : GoldenRec :=
  ⟨"e083", "ref_e083_p9", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e083_p9.call g_ref_e083_p9.pre = g_ref_e083_p9.outcome := by
  decide

def g_ref_e083_p10 : GoldenRec :=
  ⟨"e083", "ref_e083_p10", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e083_p10.call g_ref_e083_p10.pre = g_ref_e083_p10.outcome := by
  decide

def g_ref_e083_p11 : GoldenRec :=
  ⟨"e083", "ref_e083_p11", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e083_p11.call g_ref_e083_p11.pre = g_ref_e083_p11.outcome := by
  decide

def g_ref_e083_p12 : GoldenRec :=
  ⟨"e083", "ref_e083_p12", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e083_p12.call g_ref_e083_p12.pre = g_ref_e083_p12.outcome := by
  decide

def g_ref_e083_p13 : GoldenRec :=
  ⟨"e083", "ref_e083_p13", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .error (.guardFailed "Freeze")⟩
theorem ref_e083_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e083_p13.call g_ref_e083_p13.pre = g_ref_e083_p13.outcome := by
  decide

def g_ref_e083_p14 : GoldenRec :=
  ⟨"e083", "ref_e083_p14", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e083_p14.call g_ref_e083_p14.pre = g_ref_e083_p14.outcome := by
  decide

def g_ref_e083_p15 : GoldenRec :=
  ⟨"e083", "ref_e083_p15", "refProgram", ⟨"Freeze", [(.acct (.user "c"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] },
   .ok ({ bals := [(.mint, (-3)), ((.user "c"), 3), ((.user "b"), 0)], holds := [], nextHold := 0, frozen := [(.user "c")] }, [], [])⟩
theorem ref_e083_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e083_p15.call g_ref_e083_p15.pre = g_ref_e083_p15.outcome := by
  decide

def g_ref_e084_p0 : GoldenRec :=
  ⟨"e084", "ref_e084_p0", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p0 : execWith ⟨.reject, .allow, .error, .unbounded⟩ refProgram g_ref_e084_p0.call g_ref_e084_p0.pre = g_ref_e084_p0.outcome := by
  decide

def g_ref_e084_p1 : GoldenRec :=
  ⟨"e084", "ref_e084_p1", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p1 : execWith ⟨.reject, .allow, .error, .bounded⟩ refProgram g_ref_e084_p1.call g_ref_e084_p1.pre = g_ref_e084_p1.outcome := by
  decide

def g_ref_e084_p2 : GoldenRec :=
  ⟨"e084", "ref_e084_p2", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p2 : execWith ⟨.reject, .allow, .silent, .unbounded⟩ refProgram g_ref_e084_p2.call g_ref_e084_p2.pre = g_ref_e084_p2.outcome := by
  decide

def g_ref_e084_p3 : GoldenRec :=
  ⟨"e084", "ref_e084_p3", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p3 : execWith ⟨.reject, .allow, .silent, .bounded⟩ refProgram g_ref_e084_p3.call g_ref_e084_p3.pre = g_ref_e084_p3.outcome := by
  decide

def g_ref_e084_p4 : GoldenRec :=
  ⟨"e084", "ref_e084_p4", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p4 : execWith ⟨.reject, .reject, .error, .unbounded⟩ refProgram g_ref_e084_p4.call g_ref_e084_p4.pre = g_ref_e084_p4.outcome := by
  decide

def g_ref_e084_p5 : GoldenRec :=
  ⟨"e084", "ref_e084_p5", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p5 : execWith ⟨.reject, .reject, .error, .bounded⟩ refProgram g_ref_e084_p5.call g_ref_e084_p5.pre = g_ref_e084_p5.outcome := by
  decide

def g_ref_e084_p6 : GoldenRec :=
  ⟨"e084", "ref_e084_p6", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p6 : execWith ⟨.reject, .reject, .silent, .unbounded⟩ refProgram g_ref_e084_p6.call g_ref_e084_p6.pre = g_ref_e084_p6.outcome := by
  decide

def g_ref_e084_p7 : GoldenRec :=
  ⟨"e084", "ref_e084_p7", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p7 : execWith ⟨.reject, .reject, .silent, .bounded⟩ refProgram g_ref_e084_p7.call g_ref_e084_p7.pre = g_ref_e084_p7.outcome := by
  decide

def g_ref_e084_p8 : GoldenRec :=
  ⟨"e084", "ref_e084_p8", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p8 : execWith ⟨.noop, .allow, .error, .unbounded⟩ refProgram g_ref_e084_p8.call g_ref_e084_p8.pre = g_ref_e084_p8.outcome := by
  decide

def g_ref_e084_p9 : GoldenRec :=
  ⟨"e084", "ref_e084_p9", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p9 : execWith ⟨.noop, .allow, .error, .bounded⟩ refProgram g_ref_e084_p9.call g_ref_e084_p9.pre = g_ref_e084_p9.outcome := by
  decide

def g_ref_e084_p10 : GoldenRec :=
  ⟨"e084", "ref_e084_p10", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p10 : execWith ⟨.noop, .allow, .silent, .unbounded⟩ refProgram g_ref_e084_p10.call g_ref_e084_p10.pre = g_ref_e084_p10.outcome := by
  decide

def g_ref_e084_p11 : GoldenRec :=
  ⟨"e084", "ref_e084_p11", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p11 : execWith ⟨.noop, .allow, .silent, .bounded⟩ refProgram g_ref_e084_p11.call g_ref_e084_p11.pre = g_ref_e084_p11.outcome := by
  decide

def g_ref_e084_p12 : GoldenRec :=
  ⟨"e084", "ref_e084_p12", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p12 : execWith ⟨.noop, .reject, .error, .unbounded⟩ refProgram g_ref_e084_p12.call g_ref_e084_p12.pre = g_ref_e084_p12.outcome := by
  decide

def g_ref_e084_p13 : GoldenRec :=
  ⟨"e084", "ref_e084_p13", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p13 : execWith ⟨.noop, .reject, .error, .bounded⟩ refProgram g_ref_e084_p13.call g_ref_e084_p13.pre = g_ref_e084_p13.outcome := by
  decide

def g_ref_e084_p14 : GoldenRec :=
  ⟨"e084", "ref_e084_p14", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p14 : execWith ⟨.noop, .reject, .silent, .unbounded⟩ refProgram g_ref_e084_p14.call g_ref_e084_p14.pre = g_ref_e084_p14.outcome := by
  decide

def g_ref_e084_p15 : GoldenRec :=
  ⟨"e084", "ref_e084_p15", "refProgram", ⟨"Freeze", [(.acct (.user "b"))]⟩,
   { bals := [(.mint, (-3)), ((.user "c"), 3)], holds := [], nextHold := 0, frozen := [] },
   .error (.unknownAccount (.user "b"))⟩
theorem ref_e084_p15 : execWith ⟨.noop, .reject, .silent, .bounded⟩ refProgram g_ref_e084_p15.call g_ref_e084_p15.pre = g_ref_e084_p15.outcome := by
  decide

#print axioms ref_e001_p0
#print axioms ref_e001_p1
#print axioms ref_e001_p2
#print axioms ref_e001_p3
#print axioms ref_e001_p4
#print axioms ref_e001_p5
#print axioms ref_e001_p6
#print axioms ref_e001_p7
#print axioms ref_e001_p8
#print axioms ref_e001_p9
#print axioms ref_e001_p10
#print axioms ref_e001_p11
#print axioms ref_e001_p12
#print axioms ref_e001_p13
#print axioms ref_e001_p14
#print axioms ref_e001_p15
#print axioms ref_e002_p0
#print axioms ref_e002_p1
#print axioms ref_e002_p2
#print axioms ref_e002_p3
#print axioms ref_e002_p4
#print axioms ref_e002_p5
#print axioms ref_e002_p6
#print axioms ref_e002_p7
#print axioms ref_e002_p8
#print axioms ref_e002_p9
#print axioms ref_e002_p10
#print axioms ref_e002_p11
#print axioms ref_e002_p12
#print axioms ref_e002_p13
#print axioms ref_e002_p14
#print axioms ref_e002_p15
#print axioms ref_e003_p0
#print axioms ref_e003_p1
#print axioms ref_e003_p2
#print axioms ref_e003_p3
#print axioms ref_e003_p4
#print axioms ref_e003_p5
#print axioms ref_e003_p6
#print axioms ref_e003_p7
#print axioms ref_e003_p8
#print axioms ref_e003_p9
#print axioms ref_e003_p10
#print axioms ref_e003_p11
#print axioms ref_e003_p12
#print axioms ref_e003_p13
#print axioms ref_e003_p14
#print axioms ref_e003_p15
#print axioms ref_e004_p0
#print axioms ref_e004_p1
#print axioms ref_e004_p2
#print axioms ref_e004_p3
#print axioms ref_e004_p4
#print axioms ref_e004_p5
#print axioms ref_e004_p6
#print axioms ref_e004_p7
#print axioms ref_e004_p8
#print axioms ref_e004_p9
#print axioms ref_e004_p10
#print axioms ref_e004_p11
#print axioms ref_e004_p12
#print axioms ref_e004_p13
#print axioms ref_e004_p14
#print axioms ref_e004_p15
#print axioms ref_e005_p0
#print axioms ref_e005_p1
#print axioms ref_e005_p2
#print axioms ref_e005_p3
#print axioms ref_e005_p4
#print axioms ref_e005_p5
#print axioms ref_e005_p6
#print axioms ref_e005_p7
#print axioms ref_e005_p8
#print axioms ref_e005_p9
#print axioms ref_e005_p10
#print axioms ref_e005_p11
#print axioms ref_e005_p12
#print axioms ref_e005_p13
#print axioms ref_e005_p14
#print axioms ref_e005_p15
#print axioms ref_e006_p0
#print axioms ref_e006_p1
#print axioms ref_e006_p2
#print axioms ref_e006_p3
#print axioms ref_e006_p4
#print axioms ref_e006_p5
#print axioms ref_e006_p6
#print axioms ref_e006_p7
#print axioms ref_e006_p8
#print axioms ref_e006_p9
#print axioms ref_e006_p10
#print axioms ref_e006_p11
#print axioms ref_e006_p12
#print axioms ref_e006_p13
#print axioms ref_e006_p14
#print axioms ref_e006_p15
#print axioms ref_e007_p0
#print axioms ref_e007_p1
#print axioms ref_e007_p2
#print axioms ref_e007_p3
#print axioms ref_e007_p4
#print axioms ref_e007_p5
#print axioms ref_e007_p6
#print axioms ref_e007_p7
#print axioms ref_e007_p8
#print axioms ref_e007_p9
#print axioms ref_e007_p10
#print axioms ref_e007_p11
#print axioms ref_e007_p12
#print axioms ref_e007_p13
#print axioms ref_e007_p14
#print axioms ref_e007_p15
#print axioms ref_e008_p0
#print axioms ref_e008_p1
#print axioms ref_e008_p2
#print axioms ref_e008_p3
#print axioms ref_e008_p4
#print axioms ref_e008_p5
#print axioms ref_e008_p6
#print axioms ref_e008_p7
#print axioms ref_e008_p8
#print axioms ref_e008_p9
#print axioms ref_e008_p10
#print axioms ref_e008_p11
#print axioms ref_e008_p12
#print axioms ref_e008_p13
#print axioms ref_e008_p14
#print axioms ref_e008_p15
#print axioms ref_e009_p0
#print axioms ref_e009_p1
#print axioms ref_e009_p2
#print axioms ref_e009_p3
#print axioms ref_e009_p4
#print axioms ref_e009_p5
#print axioms ref_e009_p6
#print axioms ref_e009_p7
#print axioms ref_e009_p8
#print axioms ref_e009_p9
#print axioms ref_e009_p10
#print axioms ref_e009_p11
#print axioms ref_e009_p12
#print axioms ref_e009_p13
#print axioms ref_e009_p14
#print axioms ref_e009_p15
#print axioms ref_e010_p0
#print axioms ref_e010_p1
#print axioms ref_e010_p2
#print axioms ref_e010_p3
#print axioms ref_e010_p4
#print axioms ref_e010_p5
#print axioms ref_e010_p6
#print axioms ref_e010_p7
#print axioms ref_e010_p8
#print axioms ref_e010_p9
#print axioms ref_e010_p10
#print axioms ref_e010_p11
#print axioms ref_e010_p12
#print axioms ref_e010_p13
#print axioms ref_e010_p14
#print axioms ref_e010_p15
#print axioms ref_e011_p0
#print axioms ref_e011_p1
#print axioms ref_e011_p2
#print axioms ref_e011_p3
#print axioms ref_e011_p4
#print axioms ref_e011_p5
#print axioms ref_e011_p6
#print axioms ref_e011_p7
#print axioms ref_e011_p8
#print axioms ref_e011_p9
#print axioms ref_e011_p10
#print axioms ref_e011_p11
#print axioms ref_e011_p12
#print axioms ref_e011_p13
#print axioms ref_e011_p14
#print axioms ref_e011_p15
#print axioms ref_e012_p0
#print axioms ref_e012_p1
#print axioms ref_e012_p2
#print axioms ref_e012_p3
#print axioms ref_e012_p4
#print axioms ref_e012_p5
#print axioms ref_e012_p6
#print axioms ref_e012_p7
#print axioms ref_e012_p8
#print axioms ref_e012_p9
#print axioms ref_e012_p10
#print axioms ref_e012_p11
#print axioms ref_e012_p12
#print axioms ref_e012_p13
#print axioms ref_e012_p14
#print axioms ref_e012_p15
#print axioms ref_e013_p0
#print axioms ref_e013_p1
#print axioms ref_e013_p2
#print axioms ref_e013_p3
#print axioms ref_e013_p4
#print axioms ref_e013_p5
#print axioms ref_e013_p6
#print axioms ref_e013_p7
#print axioms ref_e013_p8
#print axioms ref_e013_p9
#print axioms ref_e013_p10
#print axioms ref_e013_p11
#print axioms ref_e013_p12
#print axioms ref_e013_p13
#print axioms ref_e013_p14
#print axioms ref_e013_p15
#print axioms ref_e014_p0
#print axioms ref_e014_p1
#print axioms ref_e014_p2
#print axioms ref_e014_p3
#print axioms ref_e014_p4
#print axioms ref_e014_p5
#print axioms ref_e014_p6
#print axioms ref_e014_p7
#print axioms ref_e014_p8
#print axioms ref_e014_p9
#print axioms ref_e014_p10
#print axioms ref_e014_p11
#print axioms ref_e014_p12
#print axioms ref_e014_p13
#print axioms ref_e014_p14
#print axioms ref_e014_p15
#print axioms ref_e015_p0
#print axioms ref_e015_p1
#print axioms ref_e015_p2
#print axioms ref_e015_p3
#print axioms ref_e015_p4
#print axioms ref_e015_p5
#print axioms ref_e015_p6
#print axioms ref_e015_p7
#print axioms ref_e015_p8
#print axioms ref_e015_p9
#print axioms ref_e015_p10
#print axioms ref_e015_p11
#print axioms ref_e015_p12
#print axioms ref_e015_p13
#print axioms ref_e015_p14
#print axioms ref_e015_p15
#print axioms ref_e016_p0
#print axioms ref_e016_p1
#print axioms ref_e016_p2
#print axioms ref_e016_p3
#print axioms ref_e016_p4
#print axioms ref_e016_p5
#print axioms ref_e016_p6
#print axioms ref_e016_p7
#print axioms ref_e016_p8
#print axioms ref_e016_p9
#print axioms ref_e016_p10
#print axioms ref_e016_p11
#print axioms ref_e016_p12
#print axioms ref_e016_p13
#print axioms ref_e016_p14
#print axioms ref_e016_p15
#print axioms ref_e017_p0
#print axioms ref_e017_p1
#print axioms ref_e017_p2
#print axioms ref_e017_p3
#print axioms ref_e017_p4
#print axioms ref_e017_p5
#print axioms ref_e017_p6
#print axioms ref_e017_p7
#print axioms ref_e017_p8
#print axioms ref_e017_p9
#print axioms ref_e017_p10
#print axioms ref_e017_p11
#print axioms ref_e017_p12
#print axioms ref_e017_p13
#print axioms ref_e017_p14
#print axioms ref_e017_p15
#print axioms ref_e018_p0
#print axioms ref_e018_p1
#print axioms ref_e018_p2
#print axioms ref_e018_p3
#print axioms ref_e018_p4
#print axioms ref_e018_p5
#print axioms ref_e018_p6
#print axioms ref_e018_p7
#print axioms ref_e018_p8
#print axioms ref_e018_p9
#print axioms ref_e018_p10
#print axioms ref_e018_p11
#print axioms ref_e018_p12
#print axioms ref_e018_p13
#print axioms ref_e018_p14
#print axioms ref_e018_p15
#print axioms ref_e019_p0
#print axioms ref_e019_p1
#print axioms ref_e019_p2
#print axioms ref_e019_p3
#print axioms ref_e019_p4
#print axioms ref_e019_p5
#print axioms ref_e019_p6
#print axioms ref_e019_p7
#print axioms ref_e019_p8
#print axioms ref_e019_p9
#print axioms ref_e019_p10
#print axioms ref_e019_p11
#print axioms ref_e019_p12
#print axioms ref_e019_p13
#print axioms ref_e019_p14
#print axioms ref_e019_p15
#print axioms ref_e020_p0
#print axioms ref_e020_p1
#print axioms ref_e020_p2
#print axioms ref_e020_p3
#print axioms ref_e020_p4
#print axioms ref_e020_p5
#print axioms ref_e020_p6
#print axioms ref_e020_p7
#print axioms ref_e020_p8
#print axioms ref_e020_p9
#print axioms ref_e020_p10
#print axioms ref_e020_p11
#print axioms ref_e020_p12
#print axioms ref_e020_p13
#print axioms ref_e020_p14
#print axioms ref_e020_p15
#print axioms ref_e021_p0
#print axioms ref_e021_p1
#print axioms ref_e021_p2
#print axioms ref_e021_p3
#print axioms ref_e021_p4
#print axioms ref_e021_p5
#print axioms ref_e021_p6
#print axioms ref_e021_p7
#print axioms ref_e021_p8
#print axioms ref_e021_p9
#print axioms ref_e021_p10
#print axioms ref_e021_p11
#print axioms ref_e021_p12
#print axioms ref_e021_p13
#print axioms ref_e021_p14
#print axioms ref_e021_p15
#print axioms ref_e022_p0
#print axioms ref_e022_p1
#print axioms ref_e022_p2
#print axioms ref_e022_p3
#print axioms ref_e022_p4
#print axioms ref_e022_p5
#print axioms ref_e022_p6
#print axioms ref_e022_p7
#print axioms ref_e022_p8
#print axioms ref_e022_p9
#print axioms ref_e022_p10
#print axioms ref_e022_p11
#print axioms ref_e022_p12
#print axioms ref_e022_p13
#print axioms ref_e022_p14
#print axioms ref_e022_p15
#print axioms ref_e023_p0
#print axioms ref_e023_p1
#print axioms ref_e023_p2
#print axioms ref_e023_p3
#print axioms ref_e023_p4
#print axioms ref_e023_p5
#print axioms ref_e023_p6
#print axioms ref_e023_p7
#print axioms ref_e023_p8
#print axioms ref_e023_p9
#print axioms ref_e023_p10
#print axioms ref_e023_p11
#print axioms ref_e023_p12
#print axioms ref_e023_p13
#print axioms ref_e023_p14
#print axioms ref_e023_p15
#print axioms ref_e024_p0
#print axioms ref_e024_p1
#print axioms ref_e024_p2
#print axioms ref_e024_p3
#print axioms ref_e024_p4
#print axioms ref_e024_p5
#print axioms ref_e024_p6
#print axioms ref_e024_p7
#print axioms ref_e024_p8
#print axioms ref_e024_p9
#print axioms ref_e024_p10
#print axioms ref_e024_p11
#print axioms ref_e024_p12
#print axioms ref_e024_p13
#print axioms ref_e024_p14
#print axioms ref_e024_p15
#print axioms ref_e025_p0
#print axioms ref_e025_p1
#print axioms ref_e025_p2
#print axioms ref_e025_p3
#print axioms ref_e025_p4
#print axioms ref_e025_p5
#print axioms ref_e025_p6
#print axioms ref_e025_p7
#print axioms ref_e025_p8
#print axioms ref_e025_p9
#print axioms ref_e025_p10
#print axioms ref_e025_p11
#print axioms ref_e025_p12
#print axioms ref_e025_p13
#print axioms ref_e025_p14
#print axioms ref_e025_p15
#print axioms ref_e026_p0
#print axioms ref_e026_p1
#print axioms ref_e026_p2
#print axioms ref_e026_p3
#print axioms ref_e026_p4
#print axioms ref_e026_p5
#print axioms ref_e026_p6
#print axioms ref_e026_p7
#print axioms ref_e026_p8
#print axioms ref_e026_p9
#print axioms ref_e026_p10
#print axioms ref_e026_p11
#print axioms ref_e026_p12
#print axioms ref_e026_p13
#print axioms ref_e026_p14
#print axioms ref_e026_p15
#print axioms ref_e027_p0
#print axioms ref_e027_p1
#print axioms ref_e027_p2
#print axioms ref_e027_p3
#print axioms ref_e027_p4
#print axioms ref_e027_p5
#print axioms ref_e027_p6
#print axioms ref_e027_p7
#print axioms ref_e027_p8
#print axioms ref_e027_p9
#print axioms ref_e027_p10
#print axioms ref_e027_p11
#print axioms ref_e027_p12
#print axioms ref_e027_p13
#print axioms ref_e027_p14
#print axioms ref_e027_p15
#print axioms ref_e028_p0
#print axioms ref_e028_p1
#print axioms ref_e028_p2
#print axioms ref_e028_p3
#print axioms ref_e028_p4
#print axioms ref_e028_p5
#print axioms ref_e028_p6
#print axioms ref_e028_p7
#print axioms ref_e028_p8
#print axioms ref_e028_p9
#print axioms ref_e028_p10
#print axioms ref_e028_p11
#print axioms ref_e028_p12
#print axioms ref_e028_p13
#print axioms ref_e028_p14
#print axioms ref_e028_p15
#print axioms ref_e029_p0
#print axioms ref_e029_p1
#print axioms ref_e029_p2
#print axioms ref_e029_p3
#print axioms ref_e029_p4
#print axioms ref_e029_p5
#print axioms ref_e029_p6
#print axioms ref_e029_p7
#print axioms ref_e029_p8
#print axioms ref_e029_p9
#print axioms ref_e029_p10
#print axioms ref_e029_p11
#print axioms ref_e029_p12
#print axioms ref_e029_p13
#print axioms ref_e029_p14
#print axioms ref_e029_p15
#print axioms ref_e030_p0
#print axioms ref_e030_p1
#print axioms ref_e030_p2
#print axioms ref_e030_p3
#print axioms ref_e030_p4
#print axioms ref_e030_p5
#print axioms ref_e030_p6
#print axioms ref_e030_p7
#print axioms ref_e030_p8
#print axioms ref_e030_p9
#print axioms ref_e030_p10
#print axioms ref_e030_p11
#print axioms ref_e030_p12
#print axioms ref_e030_p13
#print axioms ref_e030_p14
#print axioms ref_e030_p15
#print axioms ref_e031_p0
#print axioms ref_e031_p1
#print axioms ref_e031_p2
#print axioms ref_e031_p3
#print axioms ref_e031_p4
#print axioms ref_e031_p5
#print axioms ref_e031_p6
#print axioms ref_e031_p7
#print axioms ref_e031_p8
#print axioms ref_e031_p9
#print axioms ref_e031_p10
#print axioms ref_e031_p11
#print axioms ref_e031_p12
#print axioms ref_e031_p13
#print axioms ref_e031_p14
#print axioms ref_e031_p15
#print axioms ref_e032_p0
#print axioms ref_e032_p1
#print axioms ref_e032_p2
#print axioms ref_e032_p3
#print axioms ref_e032_p4
#print axioms ref_e032_p5
#print axioms ref_e032_p6
#print axioms ref_e032_p7
#print axioms ref_e032_p8
#print axioms ref_e032_p9
#print axioms ref_e032_p10
#print axioms ref_e032_p11
#print axioms ref_e032_p12
#print axioms ref_e032_p13
#print axioms ref_e032_p14
#print axioms ref_e032_p15
#print axioms ref_e033_p0
#print axioms ref_e033_p1
#print axioms ref_e033_p2
#print axioms ref_e033_p3
#print axioms ref_e033_p4
#print axioms ref_e033_p5
#print axioms ref_e033_p6
#print axioms ref_e033_p7
#print axioms ref_e033_p8
#print axioms ref_e033_p9
#print axioms ref_e033_p10
#print axioms ref_e033_p11
#print axioms ref_e033_p12
#print axioms ref_e033_p13
#print axioms ref_e033_p14
#print axioms ref_e033_p15
#print axioms ref_e034_p0
#print axioms ref_e034_p1
#print axioms ref_e034_p2
#print axioms ref_e034_p3
#print axioms ref_e034_p4
#print axioms ref_e034_p5
#print axioms ref_e034_p6
#print axioms ref_e034_p7
#print axioms ref_e034_p8
#print axioms ref_e034_p9
#print axioms ref_e034_p10
#print axioms ref_e034_p11
#print axioms ref_e034_p12
#print axioms ref_e034_p13
#print axioms ref_e034_p14
#print axioms ref_e034_p15
#print axioms ref_e035_p0
#print axioms ref_e035_p1
#print axioms ref_e035_p2
#print axioms ref_e035_p3
#print axioms ref_e035_p4
#print axioms ref_e035_p5
#print axioms ref_e035_p6
#print axioms ref_e035_p7
#print axioms ref_e035_p8
#print axioms ref_e035_p9
#print axioms ref_e035_p10
#print axioms ref_e035_p11
#print axioms ref_e035_p12
#print axioms ref_e035_p13
#print axioms ref_e035_p14
#print axioms ref_e035_p15
#print axioms ref_e036_p0
#print axioms ref_e036_p1
#print axioms ref_e036_p2
#print axioms ref_e036_p3
#print axioms ref_e036_p4
#print axioms ref_e036_p5
#print axioms ref_e036_p6
#print axioms ref_e036_p7
#print axioms ref_e036_p8
#print axioms ref_e036_p9
#print axioms ref_e036_p10
#print axioms ref_e036_p11
#print axioms ref_e036_p12
#print axioms ref_e036_p13
#print axioms ref_e036_p14
#print axioms ref_e036_p15
#print axioms ref_e037_p0
#print axioms ref_e037_p1
#print axioms ref_e037_p2
#print axioms ref_e037_p3
#print axioms ref_e037_p4
#print axioms ref_e037_p5
#print axioms ref_e037_p6
#print axioms ref_e037_p7
#print axioms ref_e037_p8
#print axioms ref_e037_p9
#print axioms ref_e037_p10
#print axioms ref_e037_p11
#print axioms ref_e037_p12
#print axioms ref_e037_p13
#print axioms ref_e037_p14
#print axioms ref_e037_p15
#print axioms ref_e038_p0
#print axioms ref_e038_p1
#print axioms ref_e038_p2
#print axioms ref_e038_p3
#print axioms ref_e038_p4
#print axioms ref_e038_p5
#print axioms ref_e038_p6
#print axioms ref_e038_p7
#print axioms ref_e038_p8
#print axioms ref_e038_p9
#print axioms ref_e038_p10
#print axioms ref_e038_p11
#print axioms ref_e038_p12
#print axioms ref_e038_p13
#print axioms ref_e038_p14
#print axioms ref_e038_p15
#print axioms ref_e039_p0
#print axioms ref_e039_p1
#print axioms ref_e039_p2
#print axioms ref_e039_p3
#print axioms ref_e039_p4
#print axioms ref_e039_p5
#print axioms ref_e039_p6
#print axioms ref_e039_p7
#print axioms ref_e039_p8
#print axioms ref_e039_p9
#print axioms ref_e039_p10
#print axioms ref_e039_p11
#print axioms ref_e039_p12
#print axioms ref_e039_p13
#print axioms ref_e039_p14
#print axioms ref_e039_p15
#print axioms ref_e040_p0
#print axioms ref_e040_p1
#print axioms ref_e040_p2
#print axioms ref_e040_p3
#print axioms ref_e040_p4
#print axioms ref_e040_p5
#print axioms ref_e040_p6
#print axioms ref_e040_p7
#print axioms ref_e040_p8
#print axioms ref_e040_p9
#print axioms ref_e040_p10
#print axioms ref_e040_p11
#print axioms ref_e040_p12
#print axioms ref_e040_p13
#print axioms ref_e040_p14
#print axioms ref_e040_p15
#print axioms ref_e041_p0
#print axioms ref_e041_p1
#print axioms ref_e041_p2
#print axioms ref_e041_p3
#print axioms ref_e041_p4
#print axioms ref_e041_p5
#print axioms ref_e041_p6
#print axioms ref_e041_p7
#print axioms ref_e041_p8
#print axioms ref_e041_p9
#print axioms ref_e041_p10
#print axioms ref_e041_p11
#print axioms ref_e041_p12
#print axioms ref_e041_p13
#print axioms ref_e041_p14
#print axioms ref_e041_p15
#print axioms ref_e042_p0
#print axioms ref_e042_p1
#print axioms ref_e042_p2
#print axioms ref_e042_p3
#print axioms ref_e042_p4
#print axioms ref_e042_p5
#print axioms ref_e042_p6
#print axioms ref_e042_p7
#print axioms ref_e042_p8
#print axioms ref_e042_p9
#print axioms ref_e042_p10
#print axioms ref_e042_p11
#print axioms ref_e042_p12
#print axioms ref_e042_p13
#print axioms ref_e042_p14
#print axioms ref_e042_p15
#print axioms ref_e043_p0
#print axioms ref_e043_p1
#print axioms ref_e043_p2
#print axioms ref_e043_p3
#print axioms ref_e043_p4
#print axioms ref_e043_p5
#print axioms ref_e043_p6
#print axioms ref_e043_p7
#print axioms ref_e043_p8
#print axioms ref_e043_p9
#print axioms ref_e043_p10
#print axioms ref_e043_p11
#print axioms ref_e043_p12
#print axioms ref_e043_p13
#print axioms ref_e043_p14
#print axioms ref_e043_p15
#print axioms ref_e044_p0
#print axioms ref_e044_p1
#print axioms ref_e044_p2
#print axioms ref_e044_p3
#print axioms ref_e044_p4
#print axioms ref_e044_p5
#print axioms ref_e044_p6
#print axioms ref_e044_p7
#print axioms ref_e044_p8
#print axioms ref_e044_p9
#print axioms ref_e044_p10
#print axioms ref_e044_p11
#print axioms ref_e044_p12
#print axioms ref_e044_p13
#print axioms ref_e044_p14
#print axioms ref_e044_p15
#print axioms ref_e045_p0
#print axioms ref_e045_p1
#print axioms ref_e045_p2
#print axioms ref_e045_p3
#print axioms ref_e045_p4
#print axioms ref_e045_p5
#print axioms ref_e045_p6
#print axioms ref_e045_p7
#print axioms ref_e045_p8
#print axioms ref_e045_p9
#print axioms ref_e045_p10
#print axioms ref_e045_p11
#print axioms ref_e045_p12
#print axioms ref_e045_p13
#print axioms ref_e045_p14
#print axioms ref_e045_p15
#print axioms ref_e046_p0
#print axioms ref_e046_p1
#print axioms ref_e046_p2
#print axioms ref_e046_p3
#print axioms ref_e046_p4
#print axioms ref_e046_p5
#print axioms ref_e046_p6
#print axioms ref_e046_p7
#print axioms ref_e046_p8
#print axioms ref_e046_p9
#print axioms ref_e046_p10
#print axioms ref_e046_p11
#print axioms ref_e046_p12
#print axioms ref_e046_p13
#print axioms ref_e046_p14
#print axioms ref_e046_p15
#print axioms ref_e047_p0
#print axioms ref_e047_p1
#print axioms ref_e047_p2
#print axioms ref_e047_p3
#print axioms ref_e047_p4
#print axioms ref_e047_p5
#print axioms ref_e047_p6
#print axioms ref_e047_p7
#print axioms ref_e047_p8
#print axioms ref_e047_p9
#print axioms ref_e047_p10
#print axioms ref_e047_p11
#print axioms ref_e047_p12
#print axioms ref_e047_p13
#print axioms ref_e047_p14
#print axioms ref_e047_p15
#print axioms ref_e048_p0
#print axioms ref_e048_p1
#print axioms ref_e048_p2
#print axioms ref_e048_p3
#print axioms ref_e048_p4
#print axioms ref_e048_p5
#print axioms ref_e048_p6
#print axioms ref_e048_p7
#print axioms ref_e048_p8
#print axioms ref_e048_p9
#print axioms ref_e048_p10
#print axioms ref_e048_p11
#print axioms ref_e048_p12
#print axioms ref_e048_p13
#print axioms ref_e048_p14
#print axioms ref_e048_p15
#print axioms ref_e049_p0
#print axioms ref_e049_p1
#print axioms ref_e049_p2
#print axioms ref_e049_p3
#print axioms ref_e049_p4
#print axioms ref_e049_p5
#print axioms ref_e049_p6
#print axioms ref_e049_p7
#print axioms ref_e049_p8
#print axioms ref_e049_p9
#print axioms ref_e049_p10
#print axioms ref_e049_p11
#print axioms ref_e049_p12
#print axioms ref_e049_p13
#print axioms ref_e049_p14
#print axioms ref_e049_p15
#print axioms ref_e050_p0
#print axioms ref_e050_p1
#print axioms ref_e050_p2
#print axioms ref_e050_p3
#print axioms ref_e050_p4
#print axioms ref_e050_p5
#print axioms ref_e050_p6
#print axioms ref_e050_p7
#print axioms ref_e050_p8
#print axioms ref_e050_p9
#print axioms ref_e050_p10
#print axioms ref_e050_p11
#print axioms ref_e050_p12
#print axioms ref_e050_p13
#print axioms ref_e050_p14
#print axioms ref_e050_p15
#print axioms ref_e051_p0
#print axioms ref_e051_p1
#print axioms ref_e051_p2
#print axioms ref_e051_p3
#print axioms ref_e051_p4
#print axioms ref_e051_p5
#print axioms ref_e051_p6
#print axioms ref_e051_p7
#print axioms ref_e051_p8
#print axioms ref_e051_p9
#print axioms ref_e051_p10
#print axioms ref_e051_p11
#print axioms ref_e051_p12
#print axioms ref_e051_p13
#print axioms ref_e051_p14
#print axioms ref_e051_p15
#print axioms ref_e052_p0
#print axioms ref_e052_p1
#print axioms ref_e052_p2
#print axioms ref_e052_p3
#print axioms ref_e052_p4
#print axioms ref_e052_p5
#print axioms ref_e052_p6
#print axioms ref_e052_p7
#print axioms ref_e052_p8
#print axioms ref_e052_p9
#print axioms ref_e052_p10
#print axioms ref_e052_p11
#print axioms ref_e052_p12
#print axioms ref_e052_p13
#print axioms ref_e052_p14
#print axioms ref_e052_p15
#print axioms ref_e053_p0
#print axioms ref_e053_p1
#print axioms ref_e053_p2
#print axioms ref_e053_p3
#print axioms ref_e053_p4
#print axioms ref_e053_p5
#print axioms ref_e053_p6
#print axioms ref_e053_p7
#print axioms ref_e053_p8
#print axioms ref_e053_p9
#print axioms ref_e053_p10
#print axioms ref_e053_p11
#print axioms ref_e053_p12
#print axioms ref_e053_p13
#print axioms ref_e053_p14
#print axioms ref_e053_p15
#print axioms ref_e054_p0
#print axioms ref_e054_p1
#print axioms ref_e054_p2
#print axioms ref_e054_p3
#print axioms ref_e054_p4
#print axioms ref_e054_p5
#print axioms ref_e054_p6
#print axioms ref_e054_p7
#print axioms ref_e054_p8
#print axioms ref_e054_p9
#print axioms ref_e054_p10
#print axioms ref_e054_p11
#print axioms ref_e054_p12
#print axioms ref_e054_p13
#print axioms ref_e054_p14
#print axioms ref_e054_p15
#print axioms ref_e055_p0
#print axioms ref_e055_p1
#print axioms ref_e055_p2
#print axioms ref_e055_p3
#print axioms ref_e055_p4
#print axioms ref_e055_p5
#print axioms ref_e055_p6
#print axioms ref_e055_p7
#print axioms ref_e055_p8
#print axioms ref_e055_p9
#print axioms ref_e055_p10
#print axioms ref_e055_p11
#print axioms ref_e055_p12
#print axioms ref_e055_p13
#print axioms ref_e055_p14
#print axioms ref_e055_p15
#print axioms ref_e056_p0
#print axioms ref_e056_p1
#print axioms ref_e056_p2
#print axioms ref_e056_p3
#print axioms ref_e056_p4
#print axioms ref_e056_p5
#print axioms ref_e056_p6
#print axioms ref_e056_p7
#print axioms ref_e056_p8
#print axioms ref_e056_p9
#print axioms ref_e056_p10
#print axioms ref_e056_p11
#print axioms ref_e056_p12
#print axioms ref_e056_p13
#print axioms ref_e056_p14
#print axioms ref_e056_p15
#print axioms ref_e057_p0
#print axioms ref_e057_p1
#print axioms ref_e057_p2
#print axioms ref_e057_p3
#print axioms ref_e057_p4
#print axioms ref_e057_p5
#print axioms ref_e057_p6
#print axioms ref_e057_p7
#print axioms ref_e057_p8
#print axioms ref_e057_p9
#print axioms ref_e057_p10
#print axioms ref_e057_p11
#print axioms ref_e057_p12
#print axioms ref_e057_p13
#print axioms ref_e057_p14
#print axioms ref_e057_p15
#print axioms ref_e058_p0
#print axioms ref_e058_p1
#print axioms ref_e058_p2
#print axioms ref_e058_p3
#print axioms ref_e058_p4
#print axioms ref_e058_p5
#print axioms ref_e058_p6
#print axioms ref_e058_p7
#print axioms ref_e058_p8
#print axioms ref_e058_p9
#print axioms ref_e058_p10
#print axioms ref_e058_p11
#print axioms ref_e058_p12
#print axioms ref_e058_p13
#print axioms ref_e058_p14
#print axioms ref_e058_p15
#print axioms ref_e059_p0
#print axioms ref_e059_p1
#print axioms ref_e059_p2
#print axioms ref_e059_p3
#print axioms ref_e059_p4
#print axioms ref_e059_p5
#print axioms ref_e059_p6
#print axioms ref_e059_p7
#print axioms ref_e059_p8
#print axioms ref_e059_p9
#print axioms ref_e059_p10
#print axioms ref_e059_p11
#print axioms ref_e059_p12
#print axioms ref_e059_p13
#print axioms ref_e059_p14
#print axioms ref_e059_p15
#print axioms ref_e060_p0
#print axioms ref_e060_p1
#print axioms ref_e060_p2
#print axioms ref_e060_p3
#print axioms ref_e060_p4
#print axioms ref_e060_p5
#print axioms ref_e060_p6
#print axioms ref_e060_p7
#print axioms ref_e060_p8
#print axioms ref_e060_p9
#print axioms ref_e060_p10
#print axioms ref_e060_p11
#print axioms ref_e060_p12
#print axioms ref_e060_p13
#print axioms ref_e060_p14
#print axioms ref_e060_p15
#print axioms ref_e061_p0
#print axioms ref_e061_p1
#print axioms ref_e061_p2
#print axioms ref_e061_p3
#print axioms ref_e061_p4
#print axioms ref_e061_p5
#print axioms ref_e061_p6
#print axioms ref_e061_p7
#print axioms ref_e061_p8
#print axioms ref_e061_p9
#print axioms ref_e061_p10
#print axioms ref_e061_p11
#print axioms ref_e061_p12
#print axioms ref_e061_p13
#print axioms ref_e061_p14
#print axioms ref_e061_p15
#print axioms ref_e062_p0
#print axioms ref_e062_p1
#print axioms ref_e062_p2
#print axioms ref_e062_p3
#print axioms ref_e062_p4
#print axioms ref_e062_p5
#print axioms ref_e062_p6
#print axioms ref_e062_p7
#print axioms ref_e062_p8
#print axioms ref_e062_p9
#print axioms ref_e062_p10
#print axioms ref_e062_p11
#print axioms ref_e062_p12
#print axioms ref_e062_p13
#print axioms ref_e062_p14
#print axioms ref_e062_p15
#print axioms ref_e063_p0
#print axioms ref_e063_p1
#print axioms ref_e063_p2
#print axioms ref_e063_p3
#print axioms ref_e063_p4
#print axioms ref_e063_p5
#print axioms ref_e063_p6
#print axioms ref_e063_p7
#print axioms ref_e063_p8
#print axioms ref_e063_p9
#print axioms ref_e063_p10
#print axioms ref_e063_p11
#print axioms ref_e063_p12
#print axioms ref_e063_p13
#print axioms ref_e063_p14
#print axioms ref_e063_p15
#print axioms ref_e064_p0
#print axioms ref_e064_p1
#print axioms ref_e064_p2
#print axioms ref_e064_p3
#print axioms ref_e064_p4
#print axioms ref_e064_p5
#print axioms ref_e064_p6
#print axioms ref_e064_p7
#print axioms ref_e064_p8
#print axioms ref_e064_p9
#print axioms ref_e064_p10
#print axioms ref_e064_p11
#print axioms ref_e064_p12
#print axioms ref_e064_p13
#print axioms ref_e064_p14
#print axioms ref_e064_p15
#print axioms ref_e065_p0
#print axioms ref_e065_p1
#print axioms ref_e065_p2
#print axioms ref_e065_p3
#print axioms ref_e065_p4
#print axioms ref_e065_p5
#print axioms ref_e065_p6
#print axioms ref_e065_p7
#print axioms ref_e065_p8
#print axioms ref_e065_p9
#print axioms ref_e065_p10
#print axioms ref_e065_p11
#print axioms ref_e065_p12
#print axioms ref_e065_p13
#print axioms ref_e065_p14
#print axioms ref_e065_p15
#print axioms ref_e066_p0
#print axioms ref_e066_p1
#print axioms ref_e066_p2
#print axioms ref_e066_p3
#print axioms ref_e066_p4
#print axioms ref_e066_p5
#print axioms ref_e066_p6
#print axioms ref_e066_p7
#print axioms ref_e066_p8
#print axioms ref_e066_p9
#print axioms ref_e066_p10
#print axioms ref_e066_p11
#print axioms ref_e066_p12
#print axioms ref_e066_p13
#print axioms ref_e066_p14
#print axioms ref_e066_p15
#print axioms ref_e067_p0
#print axioms ref_e067_p1
#print axioms ref_e067_p2
#print axioms ref_e067_p3
#print axioms ref_e067_p4
#print axioms ref_e067_p5
#print axioms ref_e067_p6
#print axioms ref_e067_p7
#print axioms ref_e067_p8
#print axioms ref_e067_p9
#print axioms ref_e067_p10
#print axioms ref_e067_p11
#print axioms ref_e067_p12
#print axioms ref_e067_p13
#print axioms ref_e067_p14
#print axioms ref_e067_p15
#print axioms ref_e068_p0
#print axioms ref_e068_p1
#print axioms ref_e068_p2
#print axioms ref_e068_p3
#print axioms ref_e068_p4
#print axioms ref_e068_p5
#print axioms ref_e068_p6
#print axioms ref_e068_p7
#print axioms ref_e068_p8
#print axioms ref_e068_p9
#print axioms ref_e068_p10
#print axioms ref_e068_p11
#print axioms ref_e068_p12
#print axioms ref_e068_p13
#print axioms ref_e068_p14
#print axioms ref_e068_p15
#print axioms ref_e069_p0
#print axioms ref_e069_p1
#print axioms ref_e069_p2
#print axioms ref_e069_p3
#print axioms ref_e069_p4
#print axioms ref_e069_p5
#print axioms ref_e069_p6
#print axioms ref_e069_p7
#print axioms ref_e069_p8
#print axioms ref_e069_p9
#print axioms ref_e069_p10
#print axioms ref_e069_p11
#print axioms ref_e069_p12
#print axioms ref_e069_p13
#print axioms ref_e069_p14
#print axioms ref_e069_p15
#print axioms ref_e070_p0
#print axioms ref_e070_p1
#print axioms ref_e070_p2
#print axioms ref_e070_p3
#print axioms ref_e070_p4
#print axioms ref_e070_p5
#print axioms ref_e070_p6
#print axioms ref_e070_p7
#print axioms ref_e070_p8
#print axioms ref_e070_p9
#print axioms ref_e070_p10
#print axioms ref_e070_p11
#print axioms ref_e070_p12
#print axioms ref_e070_p13
#print axioms ref_e070_p14
#print axioms ref_e070_p15
#print axioms ref_e071_p0
#print axioms ref_e071_p1
#print axioms ref_e071_p2
#print axioms ref_e071_p3
#print axioms ref_e071_p4
#print axioms ref_e071_p5
#print axioms ref_e071_p6
#print axioms ref_e071_p7
#print axioms ref_e071_p8
#print axioms ref_e071_p9
#print axioms ref_e071_p10
#print axioms ref_e071_p11
#print axioms ref_e071_p12
#print axioms ref_e071_p13
#print axioms ref_e071_p14
#print axioms ref_e071_p15
#print axioms ref_e072_p0
#print axioms ref_e072_p1
#print axioms ref_e072_p2
#print axioms ref_e072_p3
#print axioms ref_e072_p4
#print axioms ref_e072_p5
#print axioms ref_e072_p6
#print axioms ref_e072_p7
#print axioms ref_e072_p8
#print axioms ref_e072_p9
#print axioms ref_e072_p10
#print axioms ref_e072_p11
#print axioms ref_e072_p12
#print axioms ref_e072_p13
#print axioms ref_e072_p14
#print axioms ref_e072_p15
#print axioms ref_e073_p0
#print axioms ref_e073_p1
#print axioms ref_e073_p2
#print axioms ref_e073_p3
#print axioms ref_e073_p4
#print axioms ref_e073_p5
#print axioms ref_e073_p6
#print axioms ref_e073_p7
#print axioms ref_e073_p8
#print axioms ref_e073_p9
#print axioms ref_e073_p10
#print axioms ref_e073_p11
#print axioms ref_e073_p12
#print axioms ref_e073_p13
#print axioms ref_e073_p14
#print axioms ref_e073_p15
#print axioms ref_e074_p0
#print axioms ref_e074_p1
#print axioms ref_e074_p2
#print axioms ref_e074_p3
#print axioms ref_e074_p4
#print axioms ref_e074_p5
#print axioms ref_e074_p6
#print axioms ref_e074_p7
#print axioms ref_e074_p8
#print axioms ref_e074_p9
#print axioms ref_e074_p10
#print axioms ref_e074_p11
#print axioms ref_e074_p12
#print axioms ref_e074_p13
#print axioms ref_e074_p14
#print axioms ref_e074_p15
#print axioms ref_e075_p0
#print axioms ref_e075_p1
#print axioms ref_e075_p2
#print axioms ref_e075_p3
#print axioms ref_e075_p4
#print axioms ref_e075_p5
#print axioms ref_e075_p6
#print axioms ref_e075_p7
#print axioms ref_e075_p8
#print axioms ref_e075_p9
#print axioms ref_e075_p10
#print axioms ref_e075_p11
#print axioms ref_e075_p12
#print axioms ref_e075_p13
#print axioms ref_e075_p14
#print axioms ref_e075_p15
#print axioms ref_e076_p0
#print axioms ref_e076_p1
#print axioms ref_e076_p2
#print axioms ref_e076_p3
#print axioms ref_e076_p4
#print axioms ref_e076_p5
#print axioms ref_e076_p6
#print axioms ref_e076_p7
#print axioms ref_e076_p8
#print axioms ref_e076_p9
#print axioms ref_e076_p10
#print axioms ref_e076_p11
#print axioms ref_e076_p12
#print axioms ref_e076_p13
#print axioms ref_e076_p14
#print axioms ref_e076_p15
#print axioms ref_e077_p0
#print axioms ref_e077_p1
#print axioms ref_e077_p2
#print axioms ref_e077_p3
#print axioms ref_e077_p4
#print axioms ref_e077_p5
#print axioms ref_e077_p6
#print axioms ref_e077_p7
#print axioms ref_e077_p8
#print axioms ref_e077_p9
#print axioms ref_e077_p10
#print axioms ref_e077_p11
#print axioms ref_e077_p12
#print axioms ref_e077_p13
#print axioms ref_e077_p14
#print axioms ref_e077_p15
#print axioms ref_e078_p0
#print axioms ref_e078_p1
#print axioms ref_e078_p2
#print axioms ref_e078_p3
#print axioms ref_e078_p4
#print axioms ref_e078_p5
#print axioms ref_e078_p6
#print axioms ref_e078_p7
#print axioms ref_e078_p8
#print axioms ref_e078_p9
#print axioms ref_e078_p10
#print axioms ref_e078_p11
#print axioms ref_e078_p12
#print axioms ref_e078_p13
#print axioms ref_e078_p14
#print axioms ref_e078_p15
#print axioms ref_e079_p0
#print axioms ref_e079_p1
#print axioms ref_e079_p2
#print axioms ref_e079_p3
#print axioms ref_e079_p4
#print axioms ref_e079_p5
#print axioms ref_e079_p6
#print axioms ref_e079_p7
#print axioms ref_e079_p8
#print axioms ref_e079_p9
#print axioms ref_e079_p10
#print axioms ref_e079_p11
#print axioms ref_e079_p12
#print axioms ref_e079_p13
#print axioms ref_e079_p14
#print axioms ref_e079_p15
#print axioms ref_e080_p0
#print axioms ref_e080_p1
#print axioms ref_e080_p2
#print axioms ref_e080_p3
#print axioms ref_e080_p4
#print axioms ref_e080_p5
#print axioms ref_e080_p6
#print axioms ref_e080_p7
#print axioms ref_e080_p8
#print axioms ref_e080_p9
#print axioms ref_e080_p10
#print axioms ref_e080_p11
#print axioms ref_e080_p12
#print axioms ref_e080_p13
#print axioms ref_e080_p14
#print axioms ref_e080_p15
#print axioms ref_e081_p0
#print axioms ref_e081_p1
#print axioms ref_e081_p2
#print axioms ref_e081_p3
#print axioms ref_e081_p4
#print axioms ref_e081_p5
#print axioms ref_e081_p6
#print axioms ref_e081_p7
#print axioms ref_e081_p8
#print axioms ref_e081_p9
#print axioms ref_e081_p10
#print axioms ref_e081_p11
#print axioms ref_e081_p12
#print axioms ref_e081_p13
#print axioms ref_e081_p14
#print axioms ref_e081_p15
#print axioms ref_e082_p0
#print axioms ref_e082_p1
#print axioms ref_e082_p2
#print axioms ref_e082_p3
#print axioms ref_e082_p4
#print axioms ref_e082_p5
#print axioms ref_e082_p6
#print axioms ref_e082_p7
#print axioms ref_e082_p8
#print axioms ref_e082_p9
#print axioms ref_e082_p10
#print axioms ref_e082_p11
#print axioms ref_e082_p12
#print axioms ref_e082_p13
#print axioms ref_e082_p14
#print axioms ref_e082_p15
#print axioms ref_e083_p0
#print axioms ref_e083_p1
#print axioms ref_e083_p2
#print axioms ref_e083_p3
#print axioms ref_e083_p4
#print axioms ref_e083_p5
#print axioms ref_e083_p6
#print axioms ref_e083_p7
#print axioms ref_e083_p8
#print axioms ref_e083_p9
#print axioms ref_e083_p10
#print axioms ref_e083_p11
#print axioms ref_e083_p12
#print axioms ref_e083_p13
#print axioms ref_e083_p14
#print axioms ref_e083_p15
#print axioms ref_e084_p0
#print axioms ref_e084_p1
#print axioms ref_e084_p2
#print axioms ref_e084_p3
#print axioms ref_e084_p4
#print axioms ref_e084_p5
#print axioms ref_e084_p6
#print axioms ref_e084_p7
#print axioms ref_e084_p8
#print axioms ref_e084_p9
#print axioms ref_e084_p10
#print axioms ref_e084_p11
#print axioms ref_e084_p12
#print axioms ref_e084_p13
#print axioms ref_e084_p14
#print axioms ref_e084_p15

/-- The goldens' literals, in pool order, for `lake exe export-ir`. -/
def goldenData : List GoldenRec := [g_ref_e001_p0, g_ref_e001_p1, g_ref_e001_p2, g_ref_e001_p3, g_ref_e001_p4, g_ref_e001_p5, g_ref_e001_p6, g_ref_e001_p7, g_ref_e001_p8, g_ref_e001_p9, g_ref_e001_p10, g_ref_e001_p11, g_ref_e001_p12, g_ref_e001_p13, g_ref_e001_p14, g_ref_e001_p15, g_ref_e002_p0, g_ref_e002_p1, g_ref_e002_p2, g_ref_e002_p3, g_ref_e002_p4, g_ref_e002_p5, g_ref_e002_p6, g_ref_e002_p7, g_ref_e002_p8, g_ref_e002_p9, g_ref_e002_p10, g_ref_e002_p11, g_ref_e002_p12, g_ref_e002_p13, g_ref_e002_p14, g_ref_e002_p15, g_ref_e003_p0, g_ref_e003_p1, g_ref_e003_p2, g_ref_e003_p3, g_ref_e003_p4, g_ref_e003_p5, g_ref_e003_p6, g_ref_e003_p7, g_ref_e003_p8, g_ref_e003_p9, g_ref_e003_p10, g_ref_e003_p11, g_ref_e003_p12, g_ref_e003_p13, g_ref_e003_p14, g_ref_e003_p15, g_ref_e004_p0, g_ref_e004_p1, g_ref_e004_p2, g_ref_e004_p3, g_ref_e004_p4, g_ref_e004_p5, g_ref_e004_p6, g_ref_e004_p7, g_ref_e004_p8, g_ref_e004_p9, g_ref_e004_p10, g_ref_e004_p11, g_ref_e004_p12, g_ref_e004_p13, g_ref_e004_p14, g_ref_e004_p15, g_ref_e005_p0, g_ref_e005_p1, g_ref_e005_p2, g_ref_e005_p3, g_ref_e005_p4, g_ref_e005_p5, g_ref_e005_p6, g_ref_e005_p7, g_ref_e005_p8, g_ref_e005_p9, g_ref_e005_p10, g_ref_e005_p11, g_ref_e005_p12, g_ref_e005_p13, g_ref_e005_p14, g_ref_e005_p15, g_ref_e006_p0, g_ref_e006_p1, g_ref_e006_p2, g_ref_e006_p3, g_ref_e006_p4, g_ref_e006_p5, g_ref_e006_p6, g_ref_e006_p7, g_ref_e006_p8, g_ref_e006_p9, g_ref_e006_p10, g_ref_e006_p11, g_ref_e006_p12, g_ref_e006_p13, g_ref_e006_p14, g_ref_e006_p15, g_ref_e007_p0, g_ref_e007_p1, g_ref_e007_p2, g_ref_e007_p3, g_ref_e007_p4, g_ref_e007_p5, g_ref_e007_p6, g_ref_e007_p7, g_ref_e007_p8, g_ref_e007_p9, g_ref_e007_p10, g_ref_e007_p11, g_ref_e007_p12, g_ref_e007_p13, g_ref_e007_p14, g_ref_e007_p15, g_ref_e008_p0, g_ref_e008_p1, g_ref_e008_p2, g_ref_e008_p3, g_ref_e008_p4, g_ref_e008_p5, g_ref_e008_p6, g_ref_e008_p7, g_ref_e008_p8, g_ref_e008_p9, g_ref_e008_p10, g_ref_e008_p11, g_ref_e008_p12, g_ref_e008_p13, g_ref_e008_p14, g_ref_e008_p15, g_ref_e009_p0, g_ref_e009_p1, g_ref_e009_p2, g_ref_e009_p3, g_ref_e009_p4, g_ref_e009_p5, g_ref_e009_p6, g_ref_e009_p7, g_ref_e009_p8, g_ref_e009_p9, g_ref_e009_p10, g_ref_e009_p11, g_ref_e009_p12, g_ref_e009_p13, g_ref_e009_p14, g_ref_e009_p15, g_ref_e010_p0, g_ref_e010_p1, g_ref_e010_p2, g_ref_e010_p3, g_ref_e010_p4, g_ref_e010_p5, g_ref_e010_p6, g_ref_e010_p7, g_ref_e010_p8, g_ref_e010_p9, g_ref_e010_p10, g_ref_e010_p11, g_ref_e010_p12, g_ref_e010_p13, g_ref_e010_p14, g_ref_e010_p15, g_ref_e011_p0, g_ref_e011_p1, g_ref_e011_p2, g_ref_e011_p3, g_ref_e011_p4, g_ref_e011_p5, g_ref_e011_p6, g_ref_e011_p7, g_ref_e011_p8, g_ref_e011_p9, g_ref_e011_p10, g_ref_e011_p11, g_ref_e011_p12, g_ref_e011_p13, g_ref_e011_p14, g_ref_e011_p15, g_ref_e012_p0, g_ref_e012_p1, g_ref_e012_p2, g_ref_e012_p3, g_ref_e012_p4, g_ref_e012_p5, g_ref_e012_p6, g_ref_e012_p7, g_ref_e012_p8, g_ref_e012_p9, g_ref_e012_p10, g_ref_e012_p11, g_ref_e012_p12, g_ref_e012_p13, g_ref_e012_p14, g_ref_e012_p15, g_ref_e013_p0, g_ref_e013_p1, g_ref_e013_p2, g_ref_e013_p3, g_ref_e013_p4, g_ref_e013_p5, g_ref_e013_p6, g_ref_e013_p7, g_ref_e013_p8, g_ref_e013_p9, g_ref_e013_p10, g_ref_e013_p11, g_ref_e013_p12, g_ref_e013_p13, g_ref_e013_p14, g_ref_e013_p15, g_ref_e014_p0, g_ref_e014_p1, g_ref_e014_p2, g_ref_e014_p3, g_ref_e014_p4, g_ref_e014_p5, g_ref_e014_p6, g_ref_e014_p7, g_ref_e014_p8, g_ref_e014_p9, g_ref_e014_p10, g_ref_e014_p11, g_ref_e014_p12, g_ref_e014_p13, g_ref_e014_p14, g_ref_e014_p15, g_ref_e015_p0, g_ref_e015_p1, g_ref_e015_p2, g_ref_e015_p3, g_ref_e015_p4, g_ref_e015_p5, g_ref_e015_p6, g_ref_e015_p7, g_ref_e015_p8, g_ref_e015_p9, g_ref_e015_p10, g_ref_e015_p11, g_ref_e015_p12, g_ref_e015_p13, g_ref_e015_p14, g_ref_e015_p15, g_ref_e016_p0, g_ref_e016_p1, g_ref_e016_p2, g_ref_e016_p3, g_ref_e016_p4, g_ref_e016_p5, g_ref_e016_p6, g_ref_e016_p7, g_ref_e016_p8, g_ref_e016_p9, g_ref_e016_p10, g_ref_e016_p11, g_ref_e016_p12, g_ref_e016_p13, g_ref_e016_p14, g_ref_e016_p15, g_ref_e017_p0, g_ref_e017_p1, g_ref_e017_p2, g_ref_e017_p3, g_ref_e017_p4, g_ref_e017_p5, g_ref_e017_p6, g_ref_e017_p7, g_ref_e017_p8, g_ref_e017_p9, g_ref_e017_p10, g_ref_e017_p11, g_ref_e017_p12, g_ref_e017_p13, g_ref_e017_p14, g_ref_e017_p15, g_ref_e018_p0, g_ref_e018_p1, g_ref_e018_p2, g_ref_e018_p3, g_ref_e018_p4, g_ref_e018_p5, g_ref_e018_p6, g_ref_e018_p7, g_ref_e018_p8, g_ref_e018_p9, g_ref_e018_p10, g_ref_e018_p11, g_ref_e018_p12, g_ref_e018_p13, g_ref_e018_p14, g_ref_e018_p15, g_ref_e019_p0, g_ref_e019_p1, g_ref_e019_p2, g_ref_e019_p3, g_ref_e019_p4, g_ref_e019_p5, g_ref_e019_p6, g_ref_e019_p7, g_ref_e019_p8, g_ref_e019_p9, g_ref_e019_p10, g_ref_e019_p11, g_ref_e019_p12, g_ref_e019_p13, g_ref_e019_p14, g_ref_e019_p15, g_ref_e020_p0, g_ref_e020_p1, g_ref_e020_p2, g_ref_e020_p3, g_ref_e020_p4, g_ref_e020_p5, g_ref_e020_p6, g_ref_e020_p7, g_ref_e020_p8, g_ref_e020_p9, g_ref_e020_p10, g_ref_e020_p11, g_ref_e020_p12, g_ref_e020_p13, g_ref_e020_p14, g_ref_e020_p15, g_ref_e021_p0, g_ref_e021_p1, g_ref_e021_p2, g_ref_e021_p3, g_ref_e021_p4, g_ref_e021_p5, g_ref_e021_p6, g_ref_e021_p7, g_ref_e021_p8, g_ref_e021_p9, g_ref_e021_p10, g_ref_e021_p11, g_ref_e021_p12, g_ref_e021_p13, g_ref_e021_p14, g_ref_e021_p15, g_ref_e022_p0, g_ref_e022_p1, g_ref_e022_p2, g_ref_e022_p3, g_ref_e022_p4, g_ref_e022_p5, g_ref_e022_p6, g_ref_e022_p7, g_ref_e022_p8, g_ref_e022_p9, g_ref_e022_p10, g_ref_e022_p11, g_ref_e022_p12, g_ref_e022_p13, g_ref_e022_p14, g_ref_e022_p15, g_ref_e023_p0, g_ref_e023_p1, g_ref_e023_p2, g_ref_e023_p3, g_ref_e023_p4, g_ref_e023_p5, g_ref_e023_p6, g_ref_e023_p7, g_ref_e023_p8, g_ref_e023_p9, g_ref_e023_p10, g_ref_e023_p11, g_ref_e023_p12, g_ref_e023_p13, g_ref_e023_p14, g_ref_e023_p15, g_ref_e024_p0, g_ref_e024_p1, g_ref_e024_p2, g_ref_e024_p3, g_ref_e024_p4, g_ref_e024_p5, g_ref_e024_p6, g_ref_e024_p7, g_ref_e024_p8, g_ref_e024_p9, g_ref_e024_p10, g_ref_e024_p11, g_ref_e024_p12, g_ref_e024_p13, g_ref_e024_p14, g_ref_e024_p15, g_ref_e025_p0, g_ref_e025_p1, g_ref_e025_p2, g_ref_e025_p3, g_ref_e025_p4, g_ref_e025_p5, g_ref_e025_p6, g_ref_e025_p7, g_ref_e025_p8, g_ref_e025_p9, g_ref_e025_p10, g_ref_e025_p11, g_ref_e025_p12, g_ref_e025_p13, g_ref_e025_p14, g_ref_e025_p15, g_ref_e026_p0, g_ref_e026_p1, g_ref_e026_p2, g_ref_e026_p3, g_ref_e026_p4, g_ref_e026_p5, g_ref_e026_p6, g_ref_e026_p7, g_ref_e026_p8, g_ref_e026_p9, g_ref_e026_p10, g_ref_e026_p11, g_ref_e026_p12, g_ref_e026_p13, g_ref_e026_p14, g_ref_e026_p15, g_ref_e027_p0, g_ref_e027_p1, g_ref_e027_p2, g_ref_e027_p3, g_ref_e027_p4, g_ref_e027_p5, g_ref_e027_p6, g_ref_e027_p7, g_ref_e027_p8, g_ref_e027_p9, g_ref_e027_p10, g_ref_e027_p11, g_ref_e027_p12, g_ref_e027_p13, g_ref_e027_p14, g_ref_e027_p15, g_ref_e028_p0, g_ref_e028_p1, g_ref_e028_p2, g_ref_e028_p3, g_ref_e028_p4, g_ref_e028_p5, g_ref_e028_p6, g_ref_e028_p7, g_ref_e028_p8, g_ref_e028_p9, g_ref_e028_p10, g_ref_e028_p11, g_ref_e028_p12, g_ref_e028_p13, g_ref_e028_p14, g_ref_e028_p15, g_ref_e029_p0, g_ref_e029_p1, g_ref_e029_p2, g_ref_e029_p3, g_ref_e029_p4, g_ref_e029_p5, g_ref_e029_p6, g_ref_e029_p7, g_ref_e029_p8, g_ref_e029_p9, g_ref_e029_p10, g_ref_e029_p11, g_ref_e029_p12, g_ref_e029_p13, g_ref_e029_p14, g_ref_e029_p15, g_ref_e030_p0, g_ref_e030_p1, g_ref_e030_p2, g_ref_e030_p3, g_ref_e030_p4, g_ref_e030_p5, g_ref_e030_p6, g_ref_e030_p7, g_ref_e030_p8, g_ref_e030_p9, g_ref_e030_p10, g_ref_e030_p11, g_ref_e030_p12, g_ref_e030_p13, g_ref_e030_p14, g_ref_e030_p15, g_ref_e031_p0, g_ref_e031_p1, g_ref_e031_p2, g_ref_e031_p3, g_ref_e031_p4, g_ref_e031_p5, g_ref_e031_p6, g_ref_e031_p7, g_ref_e031_p8, g_ref_e031_p9, g_ref_e031_p10, g_ref_e031_p11, g_ref_e031_p12, g_ref_e031_p13, g_ref_e031_p14, g_ref_e031_p15, g_ref_e032_p0, g_ref_e032_p1, g_ref_e032_p2, g_ref_e032_p3, g_ref_e032_p4, g_ref_e032_p5, g_ref_e032_p6, g_ref_e032_p7, g_ref_e032_p8, g_ref_e032_p9, g_ref_e032_p10, g_ref_e032_p11, g_ref_e032_p12, g_ref_e032_p13, g_ref_e032_p14, g_ref_e032_p15, g_ref_e033_p0, g_ref_e033_p1, g_ref_e033_p2, g_ref_e033_p3, g_ref_e033_p4, g_ref_e033_p5, g_ref_e033_p6, g_ref_e033_p7, g_ref_e033_p8, g_ref_e033_p9, g_ref_e033_p10, g_ref_e033_p11, g_ref_e033_p12, g_ref_e033_p13, g_ref_e033_p14, g_ref_e033_p15, g_ref_e034_p0, g_ref_e034_p1, g_ref_e034_p2, g_ref_e034_p3, g_ref_e034_p4, g_ref_e034_p5, g_ref_e034_p6, g_ref_e034_p7, g_ref_e034_p8, g_ref_e034_p9, g_ref_e034_p10, g_ref_e034_p11, g_ref_e034_p12, g_ref_e034_p13, g_ref_e034_p14, g_ref_e034_p15, g_ref_e035_p0, g_ref_e035_p1, g_ref_e035_p2, g_ref_e035_p3, g_ref_e035_p4, g_ref_e035_p5, g_ref_e035_p6, g_ref_e035_p7, g_ref_e035_p8, g_ref_e035_p9, g_ref_e035_p10, g_ref_e035_p11, g_ref_e035_p12, g_ref_e035_p13, g_ref_e035_p14, g_ref_e035_p15, g_ref_e036_p0, g_ref_e036_p1, g_ref_e036_p2, g_ref_e036_p3, g_ref_e036_p4, g_ref_e036_p5, g_ref_e036_p6, g_ref_e036_p7, g_ref_e036_p8, g_ref_e036_p9, g_ref_e036_p10, g_ref_e036_p11, g_ref_e036_p12, g_ref_e036_p13, g_ref_e036_p14, g_ref_e036_p15, g_ref_e037_p0, g_ref_e037_p1, g_ref_e037_p2, g_ref_e037_p3, g_ref_e037_p4, g_ref_e037_p5, g_ref_e037_p6, g_ref_e037_p7, g_ref_e037_p8, g_ref_e037_p9, g_ref_e037_p10, g_ref_e037_p11, g_ref_e037_p12, g_ref_e037_p13, g_ref_e037_p14, g_ref_e037_p15, g_ref_e038_p0, g_ref_e038_p1, g_ref_e038_p2, g_ref_e038_p3, g_ref_e038_p4, g_ref_e038_p5, g_ref_e038_p6, g_ref_e038_p7, g_ref_e038_p8, g_ref_e038_p9, g_ref_e038_p10, g_ref_e038_p11, g_ref_e038_p12, g_ref_e038_p13, g_ref_e038_p14, g_ref_e038_p15, g_ref_e039_p0, g_ref_e039_p1, g_ref_e039_p2, g_ref_e039_p3, g_ref_e039_p4, g_ref_e039_p5, g_ref_e039_p6, g_ref_e039_p7, g_ref_e039_p8, g_ref_e039_p9, g_ref_e039_p10, g_ref_e039_p11, g_ref_e039_p12, g_ref_e039_p13, g_ref_e039_p14, g_ref_e039_p15, g_ref_e040_p0, g_ref_e040_p1, g_ref_e040_p2, g_ref_e040_p3, g_ref_e040_p4, g_ref_e040_p5, g_ref_e040_p6, g_ref_e040_p7, g_ref_e040_p8, g_ref_e040_p9, g_ref_e040_p10, g_ref_e040_p11, g_ref_e040_p12, g_ref_e040_p13, g_ref_e040_p14, g_ref_e040_p15, g_ref_e041_p0, g_ref_e041_p1, g_ref_e041_p2, g_ref_e041_p3, g_ref_e041_p4, g_ref_e041_p5, g_ref_e041_p6, g_ref_e041_p7, g_ref_e041_p8, g_ref_e041_p9, g_ref_e041_p10, g_ref_e041_p11, g_ref_e041_p12, g_ref_e041_p13, g_ref_e041_p14, g_ref_e041_p15, g_ref_e042_p0, g_ref_e042_p1, g_ref_e042_p2, g_ref_e042_p3, g_ref_e042_p4, g_ref_e042_p5, g_ref_e042_p6, g_ref_e042_p7, g_ref_e042_p8, g_ref_e042_p9, g_ref_e042_p10, g_ref_e042_p11, g_ref_e042_p12, g_ref_e042_p13, g_ref_e042_p14, g_ref_e042_p15, g_ref_e043_p0, g_ref_e043_p1, g_ref_e043_p2, g_ref_e043_p3, g_ref_e043_p4, g_ref_e043_p5, g_ref_e043_p6, g_ref_e043_p7, g_ref_e043_p8, g_ref_e043_p9, g_ref_e043_p10, g_ref_e043_p11, g_ref_e043_p12, g_ref_e043_p13, g_ref_e043_p14, g_ref_e043_p15, g_ref_e044_p0, g_ref_e044_p1, g_ref_e044_p2, g_ref_e044_p3, g_ref_e044_p4, g_ref_e044_p5, g_ref_e044_p6, g_ref_e044_p7, g_ref_e044_p8, g_ref_e044_p9, g_ref_e044_p10, g_ref_e044_p11, g_ref_e044_p12, g_ref_e044_p13, g_ref_e044_p14, g_ref_e044_p15, g_ref_e045_p0, g_ref_e045_p1, g_ref_e045_p2, g_ref_e045_p3, g_ref_e045_p4, g_ref_e045_p5, g_ref_e045_p6, g_ref_e045_p7, g_ref_e045_p8, g_ref_e045_p9, g_ref_e045_p10, g_ref_e045_p11, g_ref_e045_p12, g_ref_e045_p13, g_ref_e045_p14, g_ref_e045_p15, g_ref_e046_p0, g_ref_e046_p1, g_ref_e046_p2, g_ref_e046_p3, g_ref_e046_p4, g_ref_e046_p5, g_ref_e046_p6, g_ref_e046_p7, g_ref_e046_p8, g_ref_e046_p9, g_ref_e046_p10, g_ref_e046_p11, g_ref_e046_p12, g_ref_e046_p13, g_ref_e046_p14, g_ref_e046_p15, g_ref_e047_p0, g_ref_e047_p1, g_ref_e047_p2, g_ref_e047_p3, g_ref_e047_p4, g_ref_e047_p5, g_ref_e047_p6, g_ref_e047_p7, g_ref_e047_p8, g_ref_e047_p9, g_ref_e047_p10, g_ref_e047_p11, g_ref_e047_p12, g_ref_e047_p13, g_ref_e047_p14, g_ref_e047_p15, g_ref_e048_p0, g_ref_e048_p1, g_ref_e048_p2, g_ref_e048_p3, g_ref_e048_p4, g_ref_e048_p5, g_ref_e048_p6, g_ref_e048_p7, g_ref_e048_p8, g_ref_e048_p9, g_ref_e048_p10, g_ref_e048_p11, g_ref_e048_p12, g_ref_e048_p13, g_ref_e048_p14, g_ref_e048_p15, g_ref_e049_p0, g_ref_e049_p1, g_ref_e049_p2, g_ref_e049_p3, g_ref_e049_p4, g_ref_e049_p5, g_ref_e049_p6, g_ref_e049_p7, g_ref_e049_p8, g_ref_e049_p9, g_ref_e049_p10, g_ref_e049_p11, g_ref_e049_p12, g_ref_e049_p13, g_ref_e049_p14, g_ref_e049_p15, g_ref_e050_p0, g_ref_e050_p1, g_ref_e050_p2, g_ref_e050_p3, g_ref_e050_p4, g_ref_e050_p5, g_ref_e050_p6, g_ref_e050_p7, g_ref_e050_p8, g_ref_e050_p9, g_ref_e050_p10, g_ref_e050_p11, g_ref_e050_p12, g_ref_e050_p13, g_ref_e050_p14, g_ref_e050_p15, g_ref_e051_p0, g_ref_e051_p1, g_ref_e051_p2, g_ref_e051_p3, g_ref_e051_p4, g_ref_e051_p5, g_ref_e051_p6, g_ref_e051_p7, g_ref_e051_p8, g_ref_e051_p9, g_ref_e051_p10, g_ref_e051_p11, g_ref_e051_p12, g_ref_e051_p13, g_ref_e051_p14, g_ref_e051_p15, g_ref_e052_p0, g_ref_e052_p1, g_ref_e052_p2, g_ref_e052_p3, g_ref_e052_p4, g_ref_e052_p5, g_ref_e052_p6, g_ref_e052_p7, g_ref_e052_p8, g_ref_e052_p9, g_ref_e052_p10, g_ref_e052_p11, g_ref_e052_p12, g_ref_e052_p13, g_ref_e052_p14, g_ref_e052_p15, g_ref_e053_p0, g_ref_e053_p1, g_ref_e053_p2, g_ref_e053_p3, g_ref_e053_p4, g_ref_e053_p5, g_ref_e053_p6, g_ref_e053_p7, g_ref_e053_p8, g_ref_e053_p9, g_ref_e053_p10, g_ref_e053_p11, g_ref_e053_p12, g_ref_e053_p13, g_ref_e053_p14, g_ref_e053_p15, g_ref_e054_p0, g_ref_e054_p1, g_ref_e054_p2, g_ref_e054_p3, g_ref_e054_p4, g_ref_e054_p5, g_ref_e054_p6, g_ref_e054_p7, g_ref_e054_p8, g_ref_e054_p9, g_ref_e054_p10, g_ref_e054_p11, g_ref_e054_p12, g_ref_e054_p13, g_ref_e054_p14, g_ref_e054_p15, g_ref_e055_p0, g_ref_e055_p1, g_ref_e055_p2, g_ref_e055_p3, g_ref_e055_p4, g_ref_e055_p5, g_ref_e055_p6, g_ref_e055_p7, g_ref_e055_p8, g_ref_e055_p9, g_ref_e055_p10, g_ref_e055_p11, g_ref_e055_p12, g_ref_e055_p13, g_ref_e055_p14, g_ref_e055_p15, g_ref_e056_p0, g_ref_e056_p1, g_ref_e056_p2, g_ref_e056_p3, g_ref_e056_p4, g_ref_e056_p5, g_ref_e056_p6, g_ref_e056_p7, g_ref_e056_p8, g_ref_e056_p9, g_ref_e056_p10, g_ref_e056_p11, g_ref_e056_p12, g_ref_e056_p13, g_ref_e056_p14, g_ref_e056_p15, g_ref_e057_p0, g_ref_e057_p1, g_ref_e057_p2, g_ref_e057_p3, g_ref_e057_p4, g_ref_e057_p5, g_ref_e057_p6, g_ref_e057_p7, g_ref_e057_p8, g_ref_e057_p9, g_ref_e057_p10, g_ref_e057_p11, g_ref_e057_p12, g_ref_e057_p13, g_ref_e057_p14, g_ref_e057_p15, g_ref_e058_p0, g_ref_e058_p1, g_ref_e058_p2, g_ref_e058_p3, g_ref_e058_p4, g_ref_e058_p5, g_ref_e058_p6, g_ref_e058_p7, g_ref_e058_p8, g_ref_e058_p9, g_ref_e058_p10, g_ref_e058_p11, g_ref_e058_p12, g_ref_e058_p13, g_ref_e058_p14, g_ref_e058_p15, g_ref_e059_p0, g_ref_e059_p1, g_ref_e059_p2, g_ref_e059_p3, g_ref_e059_p4, g_ref_e059_p5, g_ref_e059_p6, g_ref_e059_p7, g_ref_e059_p8, g_ref_e059_p9, g_ref_e059_p10, g_ref_e059_p11, g_ref_e059_p12, g_ref_e059_p13, g_ref_e059_p14, g_ref_e059_p15, g_ref_e060_p0, g_ref_e060_p1, g_ref_e060_p2, g_ref_e060_p3, g_ref_e060_p4, g_ref_e060_p5, g_ref_e060_p6, g_ref_e060_p7, g_ref_e060_p8, g_ref_e060_p9, g_ref_e060_p10, g_ref_e060_p11, g_ref_e060_p12, g_ref_e060_p13, g_ref_e060_p14, g_ref_e060_p15, g_ref_e061_p0, g_ref_e061_p1, g_ref_e061_p2, g_ref_e061_p3, g_ref_e061_p4, g_ref_e061_p5, g_ref_e061_p6, g_ref_e061_p7, g_ref_e061_p8, g_ref_e061_p9, g_ref_e061_p10, g_ref_e061_p11, g_ref_e061_p12, g_ref_e061_p13, g_ref_e061_p14, g_ref_e061_p15, g_ref_e062_p0, g_ref_e062_p1, g_ref_e062_p2, g_ref_e062_p3, g_ref_e062_p4, g_ref_e062_p5, g_ref_e062_p6, g_ref_e062_p7, g_ref_e062_p8, g_ref_e062_p9, g_ref_e062_p10, g_ref_e062_p11, g_ref_e062_p12, g_ref_e062_p13, g_ref_e062_p14, g_ref_e062_p15, g_ref_e063_p0, g_ref_e063_p1, g_ref_e063_p2, g_ref_e063_p3, g_ref_e063_p4, g_ref_e063_p5, g_ref_e063_p6, g_ref_e063_p7, g_ref_e063_p8, g_ref_e063_p9, g_ref_e063_p10, g_ref_e063_p11, g_ref_e063_p12, g_ref_e063_p13, g_ref_e063_p14, g_ref_e063_p15, g_ref_e064_p0, g_ref_e064_p1, g_ref_e064_p2, g_ref_e064_p3, g_ref_e064_p4, g_ref_e064_p5, g_ref_e064_p6, g_ref_e064_p7, g_ref_e064_p8, g_ref_e064_p9, g_ref_e064_p10, g_ref_e064_p11, g_ref_e064_p12, g_ref_e064_p13, g_ref_e064_p14, g_ref_e064_p15, g_ref_e065_p0, g_ref_e065_p1, g_ref_e065_p2, g_ref_e065_p3, g_ref_e065_p4, g_ref_e065_p5, g_ref_e065_p6, g_ref_e065_p7, g_ref_e065_p8, g_ref_e065_p9, g_ref_e065_p10, g_ref_e065_p11, g_ref_e065_p12, g_ref_e065_p13, g_ref_e065_p14, g_ref_e065_p15, g_ref_e066_p0, g_ref_e066_p1, g_ref_e066_p2, g_ref_e066_p3, g_ref_e066_p4, g_ref_e066_p5, g_ref_e066_p6, g_ref_e066_p7, g_ref_e066_p8, g_ref_e066_p9, g_ref_e066_p10, g_ref_e066_p11, g_ref_e066_p12, g_ref_e066_p13, g_ref_e066_p14, g_ref_e066_p15, g_ref_e067_p0, g_ref_e067_p1, g_ref_e067_p2, g_ref_e067_p3, g_ref_e067_p4, g_ref_e067_p5, g_ref_e067_p6, g_ref_e067_p7, g_ref_e067_p8, g_ref_e067_p9, g_ref_e067_p10, g_ref_e067_p11, g_ref_e067_p12, g_ref_e067_p13, g_ref_e067_p14, g_ref_e067_p15, g_ref_e068_p0, g_ref_e068_p1, g_ref_e068_p2, g_ref_e068_p3, g_ref_e068_p4, g_ref_e068_p5, g_ref_e068_p6, g_ref_e068_p7, g_ref_e068_p8, g_ref_e068_p9, g_ref_e068_p10, g_ref_e068_p11, g_ref_e068_p12, g_ref_e068_p13, g_ref_e068_p14, g_ref_e068_p15, g_ref_e069_p0, g_ref_e069_p1, g_ref_e069_p2, g_ref_e069_p3, g_ref_e069_p4, g_ref_e069_p5, g_ref_e069_p6, g_ref_e069_p7, g_ref_e069_p8, g_ref_e069_p9, g_ref_e069_p10, g_ref_e069_p11, g_ref_e069_p12, g_ref_e069_p13, g_ref_e069_p14, g_ref_e069_p15, g_ref_e070_p0, g_ref_e070_p1, g_ref_e070_p2, g_ref_e070_p3, g_ref_e070_p4, g_ref_e070_p5, g_ref_e070_p6, g_ref_e070_p7, g_ref_e070_p8, g_ref_e070_p9, g_ref_e070_p10, g_ref_e070_p11, g_ref_e070_p12, g_ref_e070_p13, g_ref_e070_p14, g_ref_e070_p15, g_ref_e071_p0, g_ref_e071_p1, g_ref_e071_p2, g_ref_e071_p3, g_ref_e071_p4, g_ref_e071_p5, g_ref_e071_p6, g_ref_e071_p7, g_ref_e071_p8, g_ref_e071_p9, g_ref_e071_p10, g_ref_e071_p11, g_ref_e071_p12, g_ref_e071_p13, g_ref_e071_p14, g_ref_e071_p15, g_ref_e072_p0, g_ref_e072_p1, g_ref_e072_p2, g_ref_e072_p3, g_ref_e072_p4, g_ref_e072_p5, g_ref_e072_p6, g_ref_e072_p7, g_ref_e072_p8, g_ref_e072_p9, g_ref_e072_p10, g_ref_e072_p11, g_ref_e072_p12, g_ref_e072_p13, g_ref_e072_p14, g_ref_e072_p15, g_ref_e073_p0, g_ref_e073_p1, g_ref_e073_p2, g_ref_e073_p3, g_ref_e073_p4, g_ref_e073_p5, g_ref_e073_p6, g_ref_e073_p7, g_ref_e073_p8, g_ref_e073_p9, g_ref_e073_p10, g_ref_e073_p11, g_ref_e073_p12, g_ref_e073_p13, g_ref_e073_p14, g_ref_e073_p15, g_ref_e074_p0, g_ref_e074_p1, g_ref_e074_p2, g_ref_e074_p3, g_ref_e074_p4, g_ref_e074_p5, g_ref_e074_p6, g_ref_e074_p7, g_ref_e074_p8, g_ref_e074_p9, g_ref_e074_p10, g_ref_e074_p11, g_ref_e074_p12, g_ref_e074_p13, g_ref_e074_p14, g_ref_e074_p15, g_ref_e075_p0, g_ref_e075_p1, g_ref_e075_p2, g_ref_e075_p3, g_ref_e075_p4, g_ref_e075_p5, g_ref_e075_p6, g_ref_e075_p7, g_ref_e075_p8, g_ref_e075_p9, g_ref_e075_p10, g_ref_e075_p11, g_ref_e075_p12, g_ref_e075_p13, g_ref_e075_p14, g_ref_e075_p15, g_ref_e076_p0, g_ref_e076_p1, g_ref_e076_p2, g_ref_e076_p3, g_ref_e076_p4, g_ref_e076_p5, g_ref_e076_p6, g_ref_e076_p7, g_ref_e076_p8, g_ref_e076_p9, g_ref_e076_p10, g_ref_e076_p11, g_ref_e076_p12, g_ref_e076_p13, g_ref_e076_p14, g_ref_e076_p15, g_ref_e077_p0, g_ref_e077_p1, g_ref_e077_p2, g_ref_e077_p3, g_ref_e077_p4, g_ref_e077_p5, g_ref_e077_p6, g_ref_e077_p7, g_ref_e077_p8, g_ref_e077_p9, g_ref_e077_p10, g_ref_e077_p11, g_ref_e077_p12, g_ref_e077_p13, g_ref_e077_p14, g_ref_e077_p15, g_ref_e078_p0, g_ref_e078_p1, g_ref_e078_p2, g_ref_e078_p3, g_ref_e078_p4, g_ref_e078_p5, g_ref_e078_p6, g_ref_e078_p7, g_ref_e078_p8, g_ref_e078_p9, g_ref_e078_p10, g_ref_e078_p11, g_ref_e078_p12, g_ref_e078_p13, g_ref_e078_p14, g_ref_e078_p15, g_ref_e079_p0, g_ref_e079_p1, g_ref_e079_p2, g_ref_e079_p3, g_ref_e079_p4, g_ref_e079_p5, g_ref_e079_p6, g_ref_e079_p7, g_ref_e079_p8, g_ref_e079_p9, g_ref_e079_p10, g_ref_e079_p11, g_ref_e079_p12, g_ref_e079_p13, g_ref_e079_p14, g_ref_e079_p15, g_ref_e080_p0, g_ref_e080_p1, g_ref_e080_p2, g_ref_e080_p3, g_ref_e080_p4, g_ref_e080_p5, g_ref_e080_p6, g_ref_e080_p7, g_ref_e080_p8, g_ref_e080_p9, g_ref_e080_p10, g_ref_e080_p11, g_ref_e080_p12, g_ref_e080_p13, g_ref_e080_p14, g_ref_e080_p15, g_ref_e081_p0, g_ref_e081_p1, g_ref_e081_p2, g_ref_e081_p3, g_ref_e081_p4, g_ref_e081_p5, g_ref_e081_p6, g_ref_e081_p7, g_ref_e081_p8, g_ref_e081_p9, g_ref_e081_p10, g_ref_e081_p11, g_ref_e081_p12, g_ref_e081_p13, g_ref_e081_p14, g_ref_e081_p15, g_ref_e082_p0, g_ref_e082_p1, g_ref_e082_p2, g_ref_e082_p3, g_ref_e082_p4, g_ref_e082_p5, g_ref_e082_p6, g_ref_e082_p7, g_ref_e082_p8, g_ref_e082_p9, g_ref_e082_p10, g_ref_e082_p11, g_ref_e082_p12, g_ref_e082_p13, g_ref_e082_p14, g_ref_e082_p15, g_ref_e083_p0, g_ref_e083_p1, g_ref_e083_p2, g_ref_e083_p3, g_ref_e083_p4, g_ref_e083_p5, g_ref_e083_p6, g_ref_e083_p7, g_ref_e083_p8, g_ref_e083_p9, g_ref_e083_p10, g_ref_e083_p11, g_ref_e083_p12, g_ref_e083_p13, g_ref_e083_p14, g_ref_e083_p15, g_ref_e084_p0, g_ref_e084_p1, g_ref_e084_p2, g_ref_e084_p3, g_ref_e084_p4, g_ref_e084_p5, g_ref_e084_p6, g_ref_e084_p7, g_ref_e084_p8, g_ref_e084_p9, g_ref_e084_p10, g_ref_e084_p11, g_ref_e084_p12, g_ref_e084_p13, g_ref_e084_p14, g_ref_e084_p15]

end Goldens

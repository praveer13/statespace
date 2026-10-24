--------------------------- MODULE DoubleSpendInd ---------------------------
(* W0-S04 spike representative of curriculum S05.L9's inductive check on M2:
   TLC checks Inv as an invariant of ISpec == Inv /\ [][Next]_vars, with Inv
   led by TypeOK so that TLC can enumerate its initial states. WeakInv is
   NoOverspend alone, which is not inductive (a counterexample to induction). *)
EXTENDS DoubleSpendAtomic
TypeOK == /\ bal \in 0..Init
          /\ spent \in 0..Init
          /\ pc \in [Workers -> {"go", "done"}]
Inv == TypeOK /\ bal + spent = Init /\ bal >= 0 /\ spent >= 0
WeakInv == TypeOK /\ NoOverspend
ISpec == Inv /\ [][Next]_vars
=============================================================================

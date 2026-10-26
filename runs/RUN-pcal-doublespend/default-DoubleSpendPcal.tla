--------------------------- MODULE DoubleSpendPcal ---------------------------
(* W0-S04 spike representative of the PlusCal form of curriculum S05 M1 shown
   beside the hand-written spec in S5.L2. The translation is generated at build
   time by pcal.trans from tla2tools 1.8.0; Spectacle reads only the TLA+.
   The balance constant is InitBal because the translation defines Init. *)
EXTENDS Naturals
CONSTANTS InitBal, Amount, Workers

(* --algorithm DoubleSpendPcal
variables bal = InitBal, spent = 0;

process worker \in Workers
variables seen = 0;
begin
  Read:
    seen := bal;
    if seen < Amount then
      goto Done;
    end if;
  Write:
    bal := seen - Amount;
    spent := spent + Amount;
end process;
end algorithm; *)
\* BEGIN TRANSLATION
VARIABLES pc, bal, spent, seen

vars == << pc, bal, spent, seen >>

ProcSet == (Workers)

Init == (* Global variables *)
        /\ bal = InitBal
        /\ spent = 0
        (* Process worker *)
        /\ seen = [self \in Workers |-> 0]
        /\ pc = [self \in ProcSet |-> "Read"]

Read(self) == /\ pc[self] = "Read"
              /\ seen' = [seen EXCEPT ![self] = bal]
              /\ IF seen'[self] < Amount
                    THEN /\ pc' = [pc EXCEPT ![self] = "Done"]
                    ELSE /\ pc' = [pc EXCEPT ![self] = "Write"]
              /\ UNCHANGED << bal, spent >>

Write(self) == /\ pc[self] = "Write"
               /\ bal' = seen[self] - Amount
               /\ spent' = spent + Amount
               /\ pc' = [pc EXCEPT ![self] = "Done"]
               /\ seen' = seen

worker(self) == Read(self) \/ Write(self)

(* Allow infinite stuttering to prevent deadlock on termination. *)
Terminating == /\ \A self \in ProcSet: pc[self] = "Done"
               /\ UNCHANGED vars

Next == (\E self \in Workers: worker(self))
           \/ Terminating

Spec == Init /\ [][Next]_vars

Termination == <>(\A self \in ProcSet: pc[self] = "Done")

\* END TRANSLATION

NoOverspend == spent <= InitBal
=============================================================================

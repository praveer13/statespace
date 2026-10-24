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
\* END TRANSLATION

NoOverspend == spent <= InitBal
=============================================================================

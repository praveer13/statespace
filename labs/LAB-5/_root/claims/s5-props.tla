\* claims/s5-props.tla: the statements LAB-5 pins (curriculum S5, LAB-5).
\*
\* statespace check reads each definition below and checks it, by name, against your spec: it writes a
\* small module MC.tla that EXTENDS your module and defines each property as Pin_<name>, copied from this
\* file, so the property TLC checks is the one stated here and not one your spec redefines. Each receipt
\* records this file's statement hash; when the file changes after a receipt, the claim that rests on it
\* voids to [?]. This file is the course's statement of the requirements; your fairness, SysFairness, is
\* stated in your own live/HoldLive.tla. Neither you nor your agent edits it to make a check pass.

\* CL-5.1: no account pays out more than it holds (DoubleSpend, LAB-5.1 and LAB-5.2).
NoOverspend == spent <= Init

\* The witness of LAB-5.2: checked as an invariant, it must be violated, so a spend is reachable.
NoSpend == spent = 0

\* CL-5.2: funds held for a payment are released or captured once (LAB-5.3 and LAB-5.4).
NeverTwice == res <= 1

\* The witnesses of LAB-5.3 and LAB-5.4: each must be violated, so each outcome is reachable.
NotCaptured == hst # "captured"
NotReleased == hst # "released"

\* CL-5.3: no hold stays reserved for ever (LAB-5.5).
EventuallyResolves == <>(st \in {"captured", "released"})

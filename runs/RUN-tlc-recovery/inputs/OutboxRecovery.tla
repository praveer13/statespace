---- MODULE OutboxRecovery ----
EXTENDS OutboxLive, Integers
\* S8.L5 cell 2, verbatim
RecoverFair == WF_vars(Recover)
LiveSpec2   == Init /\ [][Next]_vars /\ WorkerFair /\ ProviderFair /\ RecoverFair

\* S8.L5 cell 3, verbatim
WorkerStrong == \A c \in Cmds : /\ SF_vars(Dispatch(c)) /\ SF_vars(Receive(c))
                                /\ SF_vars(Persist(c))  /\ SF_vars(Ack(c))
LiveSpec3    == Init /\ [][Next]_vars /\ WorkerStrong /\ ProviderFair /\ RecoverFair

\* Recorder: LiveSpec2 without the provider's fairness (curriculum S08's drop-one row)
LiveSpecNoProvider == Init /\ [][Next]_vars /\ WorkerFair /\ RecoverFair
\* Recorder: the cells' MaxCrashes = -1, which a TLC config cannot write as a literal
Unbounded == -1
====

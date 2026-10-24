------------------------------ MODULE NoOutbox ------------------------------
(* W0-S04 spike representative of curriculum S08.L1's contrast designs: the
   intent lives in the worker's memory, so a crash can lose it.
   Design "commitThenSend": commit the record, then call the provider.
   Design "sendThenCommit": call the provider, then commit the record. *)
EXTENDS Naturals
CONSTANTS Cmds, MaxCrashes, Design
VARIABLES committed, intent, charges, up, crashes
vars == <<committed, intent, charges, up, crashes>>

Init == /\ committed = {}
        /\ intent = {}
        /\ charges = [c \in Cmds |-> 0]
        /\ up = TRUE
        /\ crashes = 0

\* The handler starts work on a command: the intent is volatile.
Start(c) == /\ up
            /\ c \notin committed
            /\ c \notin intent
            /\ charges[c] = 0
            /\ intent' = intent \cup {c}
            /\ UNCHANGED <<committed, charges, up, crashes>>

CommitStep(c) == /\ up
                 /\ c \in intent
                 /\ c \notin committed
                 /\ Design = "commitThenSend" \/ charges[c] > 0
                 /\ committed' = committed \cup {c}
                 /\ intent' = IF Design = "commitThenSend" THEN intent ELSE intent \ {c}
                 /\ UNCHANGED <<charges, up, crashes>>

SendStep(c) == /\ up
               /\ c \in intent
               /\ charges[c] = 0
               /\ Design = "sendThenCommit" \/ c \in committed
               /\ charges' = [charges EXCEPT ![c] = @ + 1]
               /\ intent' = IF Design = "sendThenCommit" THEN intent ELSE intent \ {c}
               /\ UNCHANGED <<committed, up, crashes>>

Crash == /\ up
         /\ crashes < MaxCrashes
         /\ up' = FALSE
         /\ intent' = {}
         /\ crashes' = crashes + 1
         /\ UNCHANGED <<committed, charges>>

Recover == /\ ~up
           /\ up' = TRUE
           /\ UNCHANGED <<committed, intent, charges, crashes>>

Next == \/ \E c \in Cmds : Start(c)
        \/ \E c \in Cmds : CommitStep(c)
        \/ \E c \in Cmds : SendStep(c)
        \/ Crash
        \/ Recover

Spec == Init /\ [][Next]_vars

\* A committed record whose effect is neither done nor still intended.
NoLostIntent == \A c \in committed : charges[c] > 0 \/ c \in intent
\* An effect with no record and no intent left to write one.
NoEffectWithoutRecord == \A c \in Cmds : charges[c] > 0 => (c \in committed \/ c \in intent)
=============================================================================

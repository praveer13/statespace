---- MODULE Lifecycle ----
EXTENDS Naturals
VARIABLES hst, res
vars == <<hst, res>>
Init == hst = "available" /\ res = 0
Place   == hst = "available" /\ hst' = "held"     /\ UNCHANGED res
Capture == hst = "held"      /\ hst' = "captured" /\ res' = res + 1
Release == hst = "held"      /\ hst' = "released" /\ res' = res + 1
Next == Place \/ Capture \/ Release
Spec == Init /\ [][Next]_vars

Resolved == hst \in {"captured", "released"}
Avail == hst = "available"
\* Then try, one at a time:  []Avail   <>Avail   <>Resolved
Responds == (hst = "held") ~> Resolved
====

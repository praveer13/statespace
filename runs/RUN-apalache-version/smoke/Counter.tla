---- MODULE Counter ----
EXTENDS Integers

VARIABLE
  \* @type: Int;
  n

Init == n = 0
Next == n' = IF n < 3 THEN n + 1 ELSE n
Inv == n <= 3
====

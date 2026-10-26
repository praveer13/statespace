import Ledger
-- AUD-2.3's step-3 scenarios: does the theorem, as written, rule out this result of `transfer a b amt`? It does
-- exactly when the result's two balances do not sum to a + b. Each line prints the scenario, the verdict, and
-- what `transfer` actually returns on those inputs.
def rulesOut (a b _amt x y : Int) : Bool := !(decide (x + y = a + b))
#eval ("s1", rulesOut 5 3 2 3 5, transfer 5 3 2)
#eval ("s2", rulesOut 5 3 2 3 6, transfer 5 3 2)
#eval ("s3", rulesOut 5 3 9 (-4) 12, transfer 5 3 9)
#eval ("s4", rulesOut 5 3 9 5 3, transfer 5 3 9)
#eval ("s5", rulesOut 5 3 2 5 3, transfer 5 3 2)

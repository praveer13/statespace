import Solution
-- AUD-2.4's step-3 scenarios: does the solution's conserves, as written, rule out this result of transfer a b amt?
-- It does exactly when its premises hold (h : 0 < amt ∧ amt ≤ a) and the result's two balances do not sum to
-- a + b. Each line prints the scenario, the verdict, and what transfer actually returns.
def rulesOut (a b amt x y : Int) : Bool := decide (0 < amt ∧ amt ≤ a) && !(decide (x + y = a + b))
#eval ("s1", rulesOut 5 3 2 3 6, transfer 5 3 2)
#eval ("s2", rulesOut 5 3 9 (-4) 13, transfer 5 3 9)
#eval ("s3", rulesOut 5 3 2 3 5, transfer 5 3 2)
#eval ("s4", rulesOut 5 3 0 5 4, transfer 5 3 0)

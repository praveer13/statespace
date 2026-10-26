import Ledger
-- AUD-2.2's step-3 scenarios: does transfer_conserves, as written, rule out this result of `transfer l amt`? It does
-- exactly when the result's two balances do not sum to l.a + l.b. Each line prints the scenario, the verdict, and
-- what `transfer` actually returns on those inputs.
def rulesOut (l : Ledger) (_amt : Int) (r : Ledger) : Bool := !(decide (r.a + r.b = l.a + l.b))
#eval ("s1", rulesOut ⟨5, 3⟩ 2 ⟨3, 5⟩, transfer ⟨5, 3⟩ 2)
#eval ("s2", rulesOut ⟨5, 3⟩ 2 ⟨3, 6⟩, transfer ⟨5, 3⟩ 2)
#eval ("s3", rulesOut ⟨5, 3⟩ 9 ⟨-4, 12⟩, transfer ⟨5, 3⟩ 9)
#eval ("s4", rulesOut ⟨5, 3⟩ 0 ⟨5, 3⟩, transfer ⟨5, 3⟩ 0)

import Refunds
-- AUD-2.1's step-3 scenarios: does refund_nonneg, as written, rule out this outcome? It does exactly when its
-- premises hold (every balance at zero or above before, 0 ≤ amt) and its conclusion fails on the outcome; here the
-- conclusion says that the payment's customer is at zero or above. Each line prints the scenario and the verdict, and what refund returns for the
-- customer (account 1) and the merchant (account 2) of payment 0.
def rulesOut (cBefore mBefore amt cAfter _mAfter : Int) : Bool :=
  decide (0 ≤ cBefore ∧ 0 ≤ mBefore ∧ 0 ≤ amt) && !(decide (0 ≤ cAfter))
def start (c m : Int) : State :=
  { balance := fun j => if j = 1 then c else if j = 2 then m else 0, payments := fun _ => ⟨1, 2⟩ }
def outcome (c m amt : Int) : Int × Int :=
  let s := refund (start c m) 0 amt
  (s.balance 1, s.balance 2)
#eval ("s1", rulesOut 0 30 50 50 (-20), outcome 0 30 50)
#eval ("s2", rulesOut 10 100 50 (-40) 150, outcome 10 100 50)
#eval ("s3", rulesOut 0 100 50 50 50, outcome 0 100 50)
#eval ("s4", rulesOut 0 100 (-10) (-10) 110, outcome 0 100 (-10))

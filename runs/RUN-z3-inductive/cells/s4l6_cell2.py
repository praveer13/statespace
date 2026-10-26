from z3 import *

bal, held, n, bal2, held2 = Ints('bal held n bal2 held2')
step = And(n > 0, Or(
    And(n <= bal - held, held2 == held + n, bal2 == bal),     # Hold(n)
    And(n <= held, held2 == held - n, bal2 == bal - n),       # Capture(n)
    And(n <= held, held2 == held - n, bal2 == bal)))          # Release(n)

init = And(bal >= 0, held == 0)
inv  = lambda b, h: And(0 <= h, h <= b)       # I2, the strengthened invariant
safe = lambda b, h: b >= 0                    # the property you set out to establish

def verdict(label, *claims):
    s = Solver()
    s.add(*claims)
    print(f'{label}: {s.check()}')

verdict('Inv, step, not Inv after ', inv(bal, held), step, Not(inv(bal2, held2)))
verdict('Init and not Inv         ', init, Not(inv(bal, held)))
verdict('Inv and not Safe         ', inv(bal, held), Not(safe(bal, held)))
verdict('premise: Inv and a step  ', inv(bal, held), step)

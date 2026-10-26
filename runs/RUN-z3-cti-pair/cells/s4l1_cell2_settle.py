from z3 import *

def settle(fuel, pending, bal):
    """Unrolled once per unit of fuel: each turn captures one pending hold."""
    for _ in range(fuel):
        working = pending > 0
        bal = If(working, bal - 1, bal)
        pending = If(working, pending - 1, pending)
    return pending == 0, bal            # did the run finish? and the ending balance

bal = Int('bal')
pending = IntVal(3)
pre = bal >= pending                    # Inv before: every pending hold is covered
for fuel in (2, 3):
    finished, bal_end = settle(fuel, pending, bal)
    post = bal_end >= 0                 # Inv after
    partial = Solver(); partial.add(pre, finished, Not(post))
    total = Solver();   total.add(pre, Not(And(finished, post)))
    print('fuel', fuel, '| finished run breaks Inv:', partial.check(), '| total triple fails:', total.check())

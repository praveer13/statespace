from z3 import *

def report(name, premises, violation):
    q = Solver()
    q.add(*premises, violation)
    p = Solver()
    p.add(*premises)
    print(f'{name}: violation query {q.check()}, premise witness {p.check()}')

a, a2, amount = Ints('a a2 amount')
inv = lambda x: x >= 0

# 1. Withdraw with no guard, and an over-broad frame planted: "a is unchanged" beside "a is debited".
report('over-broad frame  ', [inv(a), amount > 0, a2 == a - amount, a2 == a], Not(inv(a2)))

# 2. The source's guard is amount <= a + 1; the translation emits amount < a + 1.
report('guard strengthened', [inv(a), amount > 0, amount < a + 1, a2 == a - amount], Not(inv(a2)))

# 3. The source as written: a known-false fixture, whose reference verdict is a violation.
report('source as written ', [inv(a), amount > 0, amount <= a + 1, a2 == a - amount], Not(inv(a2)))

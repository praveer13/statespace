from z3 import *
a, b, amount = Ints('a b amount')
s = Solver(); s.add(a >= 0, b >= 0, amount <= a, b + amount < 0)   # guard present, no amount > 0
print("[negative amount passes the guard, drains recipient]", s.check(), s.model())

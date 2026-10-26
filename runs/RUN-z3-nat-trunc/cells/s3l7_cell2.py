from z3 import *

a, b, n = Ints('a b n')
after_a = If(n <= a, a - n, 0)   # Nat subtraction stops at 0
after_b = b + n
base = [a >= 0, b >= 0, n > 0]   # Nat balances, a positive amount

s = Solver()
s.add(*base, Or(after_a < 0, after_b < 0))
print('negative balance:', s.check())

t = Solver()
t.add(*base, after_a + after_b != a + b)
print('total changed:   ', t.check())

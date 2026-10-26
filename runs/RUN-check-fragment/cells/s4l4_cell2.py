from z3 import *

a, b, c, amount = Ints('a b c amount')
a_p, b_p, c_p = Ints('a_p b_p c_p')

Inv     = lambda a, b, c: And(a >= 0, b >= 0, c >= 0)
typing  = amount > 0
guard   = amount <= a
wp_move = Inv(a - amount, b + amount, c)                        # route 1: substitution
step    = And(a_p == a - amount, b_p == b + amount, c_p == c)   # route 2: forward, frame included

def check(*facts):
    s = Solver(); s.add(*facts); return s.check()

print('routes differ   :', check(typing, guard, step, Not(Inv(a_p, b_p, c_p) == wp_move)))
print('obligation      :', check(typing, Inv(a, b, c), guard, step, Not(Inv(a_p, b_p, c_p))))
print('premise witness :', check(typing, Inv(a, b, c), guard, step))

from z3 import *

a, b, c, amount = Ints('a b c amount')           # state before, and the parameter
a_p, b_p, c_p = Ints('a_p b_p c_p')              # state after

Inv     = lambda a, b, c: And(a >= 0, b >= 0, c >= 0)
typing  = amount > 0                             # amounts are positive
guard   = amount <= a                            # requires bal(from) >= amount
wp_move = Inv(a - amount, b + amount, c)         # substitute the move into Inv
wp_transfer = And(Implies(guard, wp_move), Implies(Not(guard), Inv(a, b, c)))   # reject reading

def check(*facts):
    s = Solver(); s.add(*facts); return s.check()

print('1 reduction     :', check(typing, Inv(a, b, c), Not(wp_transfer == Implies(guard, wp_move))))
print('2 obligation    :', check(typing, Inv(a, b, c), Not(wp_transfer)))
print('3 premise       :', check(typing, Inv(a, b, c), guard))
print('4 reject branch :', check(typing, Inv(a, b, c), Not(guard),
                                  a_p == a, b_p == b, c_p == c, Not(Inv(a_p, b_p, c_p))))

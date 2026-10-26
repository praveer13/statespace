from z3 import *

a, b, c, p_amount = Ints('a b c p_amount')       # state before, and the parameter
a_p, b_p, c_p = Ints('a_p b_p c_p')              # state after

inv_pre      = And(a >= 0, b >= 0, c >= 0)
guard        = And(p_amount > 0, p_amount <= a)
step         = And(a_p == a - p_amount, b_p == b + p_amount)
frame_c      = c_p == c                          # left out below
neg_inv_post = Not(And(a_p >= 0, b_p >= 0, c_p >= 0))

s = Solver()
s.add(inv_pre, guard, step, neg_inv_post)        # no frame_c
print(s.sexpr())
print(s.check())
print(s.model())

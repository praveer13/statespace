# RUN-z3-missing-frame: the two facts the S4 spec states about S4.L5 cell 1's model beyond the cell itself
# (curriculum/S04-obligations.md, SP-4.1 and Run 1): an Optimize objective on |c_p - c| over the frame-less
# violation query, and the witness checked against the step relation with the frame stated.
# The premises are S4.L5 cell 1's, copied from s4l5_cell1.py.
from z3 import *

RLIMIT = 5000000
a, b, c, p_amount = Ints('a b c p_amount')
a_p, b_p, c_p = Ints('a_p b_p c_p')
inv_pre      = And(a >= 0, b >= 0, c >= 0)
guard        = And(p_amount > 0, p_amount <= a)
step         = And(a_p == a - p_amount, b_p == b + p_amount)
frame_c      = c_p == c
neg_inv_post = Not(And(a_p >= 0, b_p >= 0, c_p >= 0))

o = Optimize()
o.set('rlimit', RLIMIT)
o.add(inv_pre, guard, step, neg_inv_post)
d = If(c_p >= c, c_p - c, c - c_p)
h = o.minimize(d)
r = o.check()
print('Optimize, minimum |c_p - c| over the frame-less violation query:', r, o.lower(h) if r == sat else '')
m = o.model() if r == sat else None
if m is not None:
    w = {v: m.eval(v, model_completion=True) for v in (a, b, c, p_amount, a_p, b_p, c_p)}
    print('  model:', {str(k): str(v) for k, v in w.items()})
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.add(inv_pre, guard, step, frame_c, neg_inv_post, *[v == w[v] for v in w])
    print('the witness against the step relation with frame_c stated:', s.check())

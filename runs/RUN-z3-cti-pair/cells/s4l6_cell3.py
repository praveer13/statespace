from z3 import *

def inv(bal, h1, h2):
    return And(bal >= 0)             # the invariant; add conjuncts here to strengthen it

def step(s, t, n):
    (bal, h1, h2), (bal2, h1b, h2b) = s, t
    free = bal - h1 - h2
    return And(n > 0, Or(
        And(n <= free, h1b == h1 + n, h2b == h2, bal2 == bal),           # Hold on slot 1
        And(n <= free, h2b == h2 + n, h1b == h1, bal2 == bal),           # Hold on slot 2
        And(n <= h1, h1b == h1 - n, h2b == h2, bal2 == bal - n),         # Capture slot 1
        And(n <= h2, h2b == h2 - n, h1b == h1, bal2 == bal - n),         # Capture slot 2
        And(n <= h1, h1b == h1 - n, h2b == h2, bal2 == bal),             # Release slot 1
        And(n <= h2, h2b == h2 - n, h1b == h1, bal2 == bal)))            # Release slot 2

def fresh(i):
    return Int(f'bal{i}'), Int(f'h1_{i}'), Int(f'h2_{i}')

# The three checks: Init => Inv, Inv and a step => Inv after, and Inv => Safe.
s0, s1, n = fresh(0), fresh(1), Int('n')
init = And(s0[0] >= 0, s0[1] == 0, s0[2] == 0)
checks = [
    ('Init and not Inv', [init, Not(inv(*s0))]),
    ('Inv, step, not Inv after', [inv(*s0), step(s0, s1, n), Not(inv(*s1))]),
    ('Inv and not Safe', [inv(*s0), Not(s0[0] >= 0)])]
for label, claims in checks:
    q = Solver()
    q.add(*claims)
    r = q.check()
    print(f'{label:26}', r)
    if r == sat:                     # read the state in the model: which fact does it break?
        m = q.model()
        print('   state:', {str(v): m.eval(v, model_completion=True).as_long() for v in s0})

# Bounded search from Init: a run of k steps that ends with bal < 0.
bound = 6
for k in range(bound + 1):
    s = [fresh(i) for i in range(k + 1)]
    q = Solver()
    q.add(s[0][0] >= 0, s[0][1] == 0, s[0][2] == 0)
    for i in range(k):
        q.add(step(s[i], s[i + 1], Int(f'n{i}')))
    q.add(s[k][0] < 0)
    if q.check() == sat:
        print('reachable in', k, 'steps')
        break
else:
    print('none within', bound, 'steps')

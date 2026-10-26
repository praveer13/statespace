from z3 import *

N = 6                                            # the search bound, which you print

def step(s, t, n):                               # the agent's commands: one step from s to t
    (bal, held), (bal2, held2) = s, t
    return And(n > 0, Or(
        And(n <= bal - held, held2 == held + n, bal2 == bal),    # Hold(n)
        And(n <= held, held2 == held - n, bal2 == bal - n),      # Capture(n)
        And(n <= held, held2 == held - n, bal2 == bal)))         # Release(n)

bal, held, bal2, held2, n = Ints('bal held bal2 held2 n')

# 1. The inductive step for bal >= 0: from any state that meets it, can one step break it?
q = Solver()
q.add(bal >= 0, step((bal, held), (bal2, held2), n), bal2 < 0)
print('step of bal >= 0:', q.check())
m = q.model()
print('  the pre-state has held above bal:', m[held].as_long() > m[bal].as_long())

# 2. A search from Init: a run of k steps that ends with bal < 0, for k up to N.
found = None
for k in range(N + 1):
    s = [(Int(f'bal{i}'), Int(f'held{i}')) for i in range(k + 1)]
    search = Solver()
    search.add(s[0][0] >= 0, s[0][1] == 0)                       # Init
    for i in range(k):
        search.add(step(s[i], s[i + 1], Int(f'n{i}')))
    search.add(s[k][0] < 0)                                      # the invariant fails at step k
    if search.check() == sat:
        found = k
        break
print('violation reachable within', N, 'steps:', 'no' if found is None else f'yes, at step {found}')

# 3. Strengthen the invariant to 0 <= held <= bal, and check that it closes.
inv = lambda b, h: And(0 <= h, h <= b)
q2 = Solver()
q2.add(inv(bal, held), step((bal, held), (bal2, held2), n), Not(inv(bal2, held2)))
print('step of the strengthened invariant:', q2.check())
i0 = Solver()
i0.add(bal >= 0, held == 0, Not(inv(bal, held)))
print('Init implies the strengthened invariant, as a violation query:', i0.check())
sf = Solver()
sf.add(inv(bal, held), Not(bal >= 0))
print('the strengthened invariant implies bal >= 0, as a violation query:', sf.check())

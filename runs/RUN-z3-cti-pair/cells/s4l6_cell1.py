from z3 import *

def explore(name, hold_guard, bound=6):
    # One step of the holds model, from (bal, held) to (bal2, held2).
    def step(s, t, n):
        (bal, held), (bal2, held2) = s, t
        return And(n > 0, Or(
            And(hold_guard(bal, held, n), held2 == held + n, bal2 == bal),   # Hold(n)
            And(n <= held, held2 == held - n, bal2 == bal - n),              # Capture(n)
            And(n <= held, held2 == held - n, bal2 == bal)))                 # Release(n)

    # The inductive step for bal >= 0: a state with bal >= 0, one step, then bal < 0.
    bal, held, bal2, held2, n = Ints('bal held bal2 held2 n')
    q = Solver()
    q.add(bal >= 0, step((bal, held), (bal2, held2), n), bal2 < 0)
    print(name, '- inductive step:', q.check())
    m = q.model()
    print('  held > bal in the pre-state:', m[held].as_long() > m[bal].as_long())

    # Bounded search from Init: a run of k steps that ends with bal < 0.
    for k in range(bound + 1):
        s = [(Int(f'bal{i}'), Int(f'held{i}')) for i in range(k + 1)]
        search = Solver()
        search.add(s[0][0] >= 0, s[0][1] == 0)                  # Init
        for i in range(k):
            search.add(step(s[i], s[i + 1], Int(f'n{i}')))
        search.add(s[k][0] < 0)                                  # the invariant fails at step k
        if search.check() == sat:
            m = search.model()
            ops = []
            for i in range(k):
                h0, h1 = m[s[i][1]].as_long(), m[s[i + 1][1]].as_long()
                b0, b1 = m[s[i][0]].as_long(), m[s[i + 1][0]].as_long()
                ops.append('Hold' if h1 > h0 else 'Capture' if b1 < b0 else 'Release')
            print(f'  reachable in {k} steps:', ', '.join(ops))
            return
    print(f'  none within {bound} steps')

explore('twin', lambda bal, held, n: n <= bal)
explore('good', lambda bal, held, n: n <= bal - held)

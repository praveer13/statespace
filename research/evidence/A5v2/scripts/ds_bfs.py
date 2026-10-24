# Independent explicit-state BFS of the DoubleSpend model (same semantics as the TLA+ spec).
from collections import deque
def run(n, init=100, amount=80):
    W = range(n)
    s0 = (init, tuple(['read']*n), tuple([0]*n), 0)
    seen = {s0: None}; q = deque([s0]); viol = None
    while q:
        s = q.popleft(); bal, pc, sn, spent = s
        if viol is None and not (spent <= init): viol = s
        for w in W:
            if pc[w] == 'read':
                sn2 = list(sn); sn2[w] = bal
                pc2 = list(pc); pc2[w] = 'write' if bal >= amount else 'done'
                t = (bal, tuple(pc2), tuple(sn2), spent)
            elif pc[w] == 'write':
                pc2 = list(pc); pc2[w] = 'done'
                t = (sn[w] - amount, tuple(pc2), sn, spent + amount)
            else:
                continue
            if t not in seen: seen[t] = s; q.append(t)
    depth = None
    if viol is not None:
        depth = 0; x = viol
        while x is not None: depth += 1; x = seen[x]
    return len(seen), depth
for n in (2, 3, 4, 5, 6):
    print(n, *run(n))

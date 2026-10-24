import z3, json, time
def php(n, m):
    p = [[z3.Bool(f"p_{i}_{j}") for j in range(m)] for i in range(n)]
    s = z3.Solver()
    for i in range(n): s.add(z3.Or(p[i]))
    for j in range(m):
        for i in range(n):
            for k in range(i + 1, n): s.add(z3.Or(z3.Not(p[i][j]), z3.Not(p[k][j])))
    return s
res = {}
for rl in (1000000, 1500000, 2000000, 3000000, 4000000):
    s = php(11, 10); s.set('rlimit', rl); t = time.time(); r = s.check()
    res[rl] = [str(r), s.reason_unknown() if r == z3.unknown else '', round(time.time() - t, 2)]
print(json.dumps(res))

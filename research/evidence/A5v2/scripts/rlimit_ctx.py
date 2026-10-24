import z3, json
def php(n, m, ctx=None):
    p = [[z3.Bool(f"p_{i}_{j}", ctx) for j in range(m)] for i in range(n)]
    s = z3.Solver(ctx=ctx)
    for i in range(n): s.add(z3.Or(p[i]))
    for j in range(m):
        for i in range(n):
            for k in range(i + 1, n): s.add(z3.Or(z3.Not(p[i][j]), z3.Not(p[k][j])))
    return s
out = {}
x, y, zz = z3.Ints('x y z')
for rl in (100000, 1000000, 5000000):
    s = z3.Solver(); s.set('rlimit', rl); s.add(x > 2, y > 2, zz > 2, x*x*x + y*y*y == zz*zz*zz); s.check()
s = php(11, 10); s.set('rlimit', 2000000); r = s.check(); out['same_ctx_after_history'] = [str(r), s.reason_unknown() if r == z3.unknown else '']
c = z3.Context()
s = php(11, 10, c); s.set('rlimit', 2000000); r = s.check(); out['fresh_ctx_after_history'] = [str(r), s.reason_unknown() if r == z3.unknown else '']
print(json.dumps(out))

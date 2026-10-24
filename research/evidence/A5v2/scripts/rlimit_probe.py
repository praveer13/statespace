import z3, json
def stats_count(s):
    st = s.statistics()
    for k in st.keys():
        if k == 'rlimit count': return st.get_key_value(k)
    return None
out = {'version': z3.get_version_string()}
# 1. solved instances: compare rlimit consumption
def php(n, m):
    p = [[z3.Bool(f"p_{i}_{j}") for j in range(m)] for i in range(n)]
    s = z3.Solver()
    for i in range(n): s.add(z3.Or(p[i]))
    for j in range(m):
        for i in range(n):
            for k in range(i + 1, n): s.add(z3.Or(z3.Not(p[i][j]), z3.Not(p[k][j])))
    return s
s = php(8, 7); r = s.check(); out['php87'] = [str(r), stats_count(s)]
a, b, amount = z3.Ints('a b amount')
s = z3.Solver(); s.add(a >= 0, b >= 0, amount > 0, a - amount < 0); r = s.check(); out['starter'] = [str(r), stats_count(s)]
A, AMT = z3.BitVecs('A AMT', 64)
s = z3.Solver(); s.add(A >= 0, AMT > 0, AMT <= A, A + AMT < 0); r = s.check(); out['bv'] = [str(r), stats_count(s)]
# 2. verdicts at fixed rlimits on a hard query
x, y, zz = z3.Ints('x y z')
for rl in (100000, 1000000, 5000000):
    s = z3.Solver(); s.set('rlimit', rl); s.add(x > 2, y > 2, zz > 2, x*x*x + y*y*y == zz*zz*zz)
    r = s.check(); out[f'nl_rl{rl}'] = [str(r), s.reason_unknown() if r == z3.unknown else '']
for rl in (200000, 2000000):
    s = php(11, 10); s.set('rlimit', rl); r = s.check(); out[f'php1110_rl{rl}'] = [str(r), s.reason_unknown() if r == z3.unknown else '', stats_count(s)]
print(json.dumps(out))

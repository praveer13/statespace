import z3, json
fp = z3.Fixedpoint(); fp.set(engine='datalog')
S = z3.BitVecSort(8)
member, owns, shared, revoked, canread = (z3.Function(n, S, S, z3.BoolSort()) for n in ('member','owns','shared','revoked','canread'))
for r in (member, owns, shared, revoked, canread): fp.register_relation(r)
u, t, d = z3.BitVecs('u t d', 8); fp.declare_var(u, t, d)
fp.rule(canread(u, d), [member(u, t), owns(t, d)])
fp.rule(canread(u, d), [shared(u, d), z3.Not(revoked(u, d))])   # stratified negation
V = lambda n: z3.BitVecVal(n, 8)
fp.fact(member(V(1), V(7))); fp.fact(owns(V(7), V(3)))
fp.fact(shared(V(2), V(4))); fp.fact(shared(V(2), V(5))); fp.fact(revoked(V(2), V(5)))
out = {q: str(fp.query(canread(V(a), V(b)))) for q, (a, b) in {'1->3': (1, 3), '2->4': (2, 4), '2->5 (revoked)': (2, 5), '1->4': (1, 4)}.items()}
print(json.dumps(out))

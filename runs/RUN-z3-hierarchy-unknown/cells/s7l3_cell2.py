from z3 import *

User, Team, Doc, Tenant = [DeclareSort(n) for n in ("User", "Team", "Doc", "Tenant")]
member   = Function("member", User, Team, BoolSort())
subteam  = Function("subteam", Team, Team, BoolSort())   # subteam(s, t): s is nested directly in t
nested   = Function("nested", Team, Team, BoolSort())    # nested at any depth
mid      = Function("mid", Team, Team, Team)             # a team between s and t
owns     = Function("owns", Team, Doc, BoolSort())
tenant_u = Function("tenant_u", User, Tenant)
tenant_t = Function("tenant_t", Team, Tenant)

u, x = Consts("u x", User)
s, m, t = Consts("s m t", Team)
d = Const("d", Doc)

wf1 = ForAll([x, t], Implies(member(x, t), tenant_u(x) == tenant_t(t)))
wf2 = ForAll([s, t], Implies(subteam(s, t), tenant_t(s) == tenant_t(t)))

# nested is the transitive closure of subteam, written as quantified rules
closure = [
    ForAll([s, t], Implies(subteam(s, t), nested(s, t))),
    ForAll([s, m, t], Implies(And(nested(s, m), nested(m, t)), nested(s, t))),
    ForAll([s, t], Implies(nested(s, t), Or(subteam(s, t), And(nested(s, mid(s, t)), nested(mid(s, t), t))))),
]
acyclic = ForAll([t], Not(nested(t, t)))                 # WF3: no team nests in itself

# the violation: u reaches team t by membership or nesting, t owns d, and the tenants differ
reach = Or(member(u, t), Exists([s], And(member(u, s), nested(s, t))))
violation = And(reach, owns(t, d), tenant_u(u) != tenant_t(t))

def verdict(*facts):
    sv = Solver()
    sv.set("rlimit", 1000000)
    sv.add(*facts)
    r = sv.check()
    return str(r) + (" (" + sv.reason_unknown() + ")" if r == unknown else "")

print("unconstrained:", verdict(wf1, wf2, *closure, violation))
print("quantified   :", verdict(wf1, wf2, *closure, acyclic, violation))

# grounded: the hierarchy is data. Only the teams the query mentions get constraints,
# and nesting runs two levels deep.
T = [Const("t%d" % i, Team) for i in range(3)]
def in_team(user, team):
    return Or(member(user, team),
              *[And(member(user, a), subteam(a, team)) for a in T],
              *[And(member(user, a), subteam(a, b), subteam(b, team)) for a in T for b in T])
g_wf1 = And(*[Implies(member(u, a), tenant_u(u) == tenant_t(a)) for a in T])
g_wf2 = And(*[Implies(subteam(a, b), tenant_t(a) == tenant_t(b)) for a in T for b in T])
g_violation = Or(*[And(in_team(u, a), owns(a, d), tenant_u(u) != tenant_t(a)) for a in T])
print("grounded     :", verdict(g_wf1, g_wf2, g_violation))

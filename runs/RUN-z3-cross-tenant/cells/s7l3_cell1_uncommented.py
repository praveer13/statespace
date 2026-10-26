from z3 import *

User, Team, Doc, Tenant = [DeclareSort(n) for n in ("User", "Team", "Doc", "Tenant")]
member     = Function("member", User, Team, BoolSort())
owns       = Function("owns", Team, Doc, BoolSort())
share_user = Function("share_user", Doc, User, BoolSort())
share_team = Function("share_team", Doc, Team, BoolSort())
revoked    = Function("revoked", Doc, User, BoolSort())
tenant_u   = Function("tenant_u", User, Tenant)   # a user's tenant
tenant_t   = Function("tenant_t", Team, Tenant)   # a team's tenant, and so its documents'

u, d, t1, t2 = Const("u", User), Const("d", Doc), Const("t1", Team), Const("t2", Team)

rule1 = And(member(u, t1), owns(t1, d))             # a member of the owning team t1
rule2 = And(share_user(d, u), Not(revoked(d, u)))   # shared with the user, not revoked
rule3 = And(member(u, t2), share_team(d, t2))       # shared with one of the user's teams
canread = Or(rule1, rule2, rule3)

# the violation: a read across tenants that no explicit share explains
violation = And(canread, Not(rule2), Not(rule3), tenant_u(u) != tenant_t(t1))

# WF1: a member belongs to the team's tenant
x, y = Const("x", User), Const("y", Team)
wf1 = ForAll([x, y], Implies(member(x, y), tenant_u(x) == tenant_t(y)))

def verdict(*facts):
    s = Solver()
    s.set("rlimit", 1000000)
    s.add(*facts)
    return s.check()

print("no invariants :", verdict(violation))
# after your call, remove the # marks and run again
print("with WF1      :", verdict(violation, wf1))
print("premises      :", verdict(wf1, canread))   # the premises hold together
print("non-vacuity   :", verdict(wf1, rule1))     # some read is allowed at all

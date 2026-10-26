# AUD-4.3's runs beyond RUN-z3-cti-pair (content/audit/AUD-4.3.yaml): the step-3 scenarios of the pair (is this state
# reachable from Init within N steps?), and the variant pair on the merchant model of S4.L6: the inductive step, its
# pre-state, a bounded search from Init, the strengthened invariant, and the agent's edit. Query tags are neutral:
# q1 the holds model with Hold(n) requiring n <= bal - held, q2 its twin with n <= bal; q3 the merchant model whose
# Payout(n) requires only n <= merch, q4 the one whose Payout(n) requires n <= merch - paid.
import z3
from z3 import Solver, Int, Ints, And, Or, Not, sat

N = 6                                            # the search bound, printed with every search
print('z3', z3.get_version_string(), 'bound N =', N)

def holds_step(hold_guard):
    def step(s, t, n):
        (bal, held), (bal2, held2) = s, t
        return And(n > 0, Or(
            And(hold_guard(bal, held, n), held2 == held + n, bal2 == bal),   # Hold(n)
            And(n <= held, held2 == held - n, bal2 == bal - n),              # Capture(n)
            And(n <= held, held2 == held - n, bal2 == bal)))                 # Release(n)
    return step

def merchant_step(payout_guard, refund_extra=lambda c, m, p, n: True):
    def step(s, t, n):
        (cust, merch, paid), (cust2, merch2, paid2) = s, t
        return And(n > 0, Or(
            And(n <= cust, cust2 == cust - n, merch2 == merch + n, paid2 == paid + n),                   # Pay(n)
            And(n <= paid, refund_extra(cust, merch, paid, n),
                cust2 == cust + n, merch2 == merch - n, paid2 == paid - n),                              # Refund(n)
            And(payout_guard(cust, merch, paid, n), cust2 == cust, merch2 == merch - n, paid2 == paid))) # Payout(n)
    return step

def reach(step, width, init, goal, bound=N):
    """The smallest k <= bound with a run of k steps from Init that ends where goal holds, or None."""
    for k in range(bound + 1):
        s = [tuple(Int(f'v{i}_{j}') for j in range(width)) for i in range(k + 1)]
        q = Solver(); q.add(init(*s[0]))
        for i in range(k):
            q.add(step(s[i], s[i + 1], Int(f'n{i}')))
        q.add(goal(*s[k]))
        if q.check() == sat:
            return k
    return None

holds_init = lambda bal, held: And(bal >= 0, held == 0)
merch_init = lambda cust, merch, paid: And(cust >= 0, merch == 0, paid == 0)

# 1. The pair's step-3 scenarios: is this state reachable from Init within N steps?
for tag, guard in (('q1', lambda b, h, n: n <= b - h), ('q2', lambda b, h, n: n <= b)):
    for sid, B, H in (('s1', 1, 2), ('s2', 5, 2), ('s3', -1, 0), ('s4', 3, 3)):
        k = reach(holds_step(guard), 2, holds_init, lambda b, h: And(b == B, h == H))
        print(f'[{tag} {sid} bal={B} held={H}] reachable within {N}: ' + ('no' if k is None else f'yes, in {k} steps'))

# 2. The variant pair: the merchant model, before and after the agent's edit to Refund.
for tag, pg in (('q3', lambda c, m, p, n: n <= m), ('q4', lambda c, m, p, n: n <= m - p)):
    step = merchant_step(pg)
    cust, merch, paid, cust2, merch2, paid2, n = Ints('cust merch paid cust2 merch2 paid2 n')
    q = Solver(); q.add(merch >= 0, step((cust, merch, paid), (cust2, merch2, paid2), n), merch2 < 0)
    r = q.check(); print(f'[{tag} step of merch >= 0] {r}')
    if r == sat:
        m = q.model(); print(f'[{tag} pre-state] paid above merch: {m[paid].as_long() > m[merch].as_long()}')
    k = reach(step, 3, merch_init, lambda c, m, p: m < 0)
    print(f'[{tag} search] violation reachable within {N} steps: ' + ('no' if k is None else f'yes, at step {k}'))
    inv = lambda c, m, p: And(0 <= p, p <= m)
    q2 = Solver(); q2.add(inv(cust, merch, paid), step((cust, merch, paid), (cust2, merch2, paid2), n), Not(inv(cust2, merch2, paid2)))
    print(f'[{tag} step of 0 <= paid <= merch] {q2.check()}')
    edited = merchant_step(pg, refund_extra=lambda c, m, p, n: n <= m)
    q3 = Solver(); q3.add(merch >= 0, edited((cust, merch, paid), (cust2, merch2, paid2), n), merch2 < 0)
    print(f'[{tag} edited, step of merch >= 0] {q3.check()}')
    k2 = reach(edited, 3, merch_init, lambda c, m, p: m < 0)
    print(f'[{tag} edited, search] violation reachable within {N} steps: ' + ('no' if k2 is None else f'yes, at step {k2}'))

# 3. The variant pair's step-3 scenarios.
for tag, pg in (('q3', lambda c, m, p, n: n <= m), ('q4', lambda c, m, p, n: n <= m - p)):
    for sid, C, M, P in (('s1', 0, 0, 1), ('s2', 2, 1, 1), ('s3', 1, -1, 0), ('s4', 0, 2, 2)):
        k = reach(merchant_step(pg), 3, merch_init, lambda c, m, p: And(c == C, m == M, p == P))
        print(f'[{tag} {sid} cust={C} merch={M} paid={P}] reachable within {N}: ' + ('no' if k is None else f'yes, in {k} steps'))

# 4. The pair after the agent's edit to Capture (n <= bal added): the step of bal >= 0, on both models.
for tag, guard in (('q1', lambda b, h, n: n <= b - h), ('q2', lambda b, h, n: n <= b)):
    def edited(s, t, n, guard=guard):
        (bal, held), (bal2, held2) = s, t
        return And(n > 0, Or(
            And(guard(bal, held, n), held2 == held + n, bal2 == bal),
            And(n <= held, n <= bal, held2 == held - n, bal2 == bal - n),
            And(n <= held, held2 == held - n, bal2 == bal)))
    bal, held, bal2, held2, n = Ints('bal held bal2 held2 n')
    q = Solver(); q.add(bal >= 0, edited((bal, held), (bal2, held2), n), bal2 < 0)
    print(f'[{tag} edited, step of bal >= 0] {q.check()}')

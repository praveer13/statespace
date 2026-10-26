# RUN-z3-vacuous-variants: the keys of AUD-1.1's cases on the Audit Desk (docs/AUDIT-DESK.md sections 3.2 and 4.3,
# step 4, non-vacuity). For every case: the violation query (premises plus the negated property), the premises
# alone (the non-vacuity check: sat means some transfer meets them), the minimal unsat core of the premises when
# they are unsat (the load-bearing lines), and each step-3 scenario: the premises plus the scenario's values,
# where sat means the statement covers that transfer and unsat means it says nothing about it. Queries are tagged
# q1 to q6, a neutral name the Desk can show in a receipt (content/audit/AUD-1.1.yaml maps each case to its tag).
from z3 import *

RLIMIT = 5000000
print('z3', get_version_string(), f'rlimit={RLIMIT}')

def solver():
    s = Solver()
    s.set('rlimit', RLIMIT)
    return s

def show(m):
    return '[' + ', '.join(f'{d.name()} = {m[d]}' for d in sorted(m.decls(), key=lambda d: d.name())) + ']'

a, b, amount = Ints('a b amount')
bal, w = Ints('bal w')

# Each case: its premises as (label, text, formula), the violation, the variables a scenario fixes, the scenarios.
TRANSFER = [('a >= 0', a >= 0), ('b >= 0', b >= 0), ('amount > 0', amount > 0)]
LIMIT = 500
WITHDRAW = [('bal >= 0', bal >= 0), ('w >= 0', w >= 0), ('amount > 0', amount > 0), ('amount <= bal', amount <= bal),
            (f'w + amount <= {LIMIT}', w + amount <= LIMIT)]
MEMBER_SCEN = [('s1', {a: 10, b: 0, amount: 3}), ('s2', {a: 10, b: 0, amount: 150}), ('s3', {a: 2, b: 0, amount: 5}),
               ('s4', {a: 500, b: 7, amount: 100})]
V1_SCEN = [('s1', {a: 10, b: 0, amount: 3}), ('s2', {a: 2, b: 0, amount: 5}), ('s3', {a: 4, b: 4, amount: 4})]
V2_SCEN = [('s1', {bal: 100, w: 0, amount: 50}), ('s2', {bal: 100, w: 480, amount: 50}), ('s3', {bal: 20, w: 0, amount: 50}),
           ('s4', {bal: 1000, w: 499, amount: 1})]

CASES = [
    ('q1', TRANSFER + [('amount <= MAX_TRANSFER (100)', amount <= 100), ('amount <= a', amount <= a)], a - amount < 0, MEMBER_SCEN),
    ('q2', TRANSFER + [('amount <= MAX_TRANSFER (0)', amount <= 0), ('amount <= a', amount <= a)], a - amount < 0, MEMBER_SCEN),
    ('q4', TRANSFER + [('amount <= a', amount <= a), ('amount >= 1', amount >= 1)], a - amount < 0, V1_SCEN),
    ('q3', TRANSFER + [('amount <= a', amount <= a), ('a < amount', a < amount)], a - amount < 0, V1_SCEN),
    ('q5', WITHDRAW + [(f'w <= {LIMIT}', w <= LIMIT)], bal - amount < 0, V2_SCEN),
    ('q6', WITHDRAW + [(f'w >= {LIMIT}', w >= LIMIT)], bal - amount < 0, V2_SCEN),
]

for cid, premises, violation, scenarios in CASES:
    s = solver(); s.add(*[f for _, f in premises]); s.add(violation)
    print(f'[{cid} violation] {s.check()}')
    s = solver(); s.add(*[f for _, f in premises])
    r = s.check()
    print(f'[{cid} premises] {r}' + (f' {show(s.model())}' if r == sat else ''))
    if r == unsat:
        c = solver(); c.set('core.minimize', True)
        for label, f in premises:
            c.assert_and_track(f, Bool(label))
        c.check()
        core = sorted(str(x) for x in c.unsat_core())
        print(f'[{cid} core] unsat_core={core}')
    for sid, values in scenarios:
        s = solver(); s.add(*[f for _, f in premises]); s.add(*[v == n for v, n in values.items()])
        r = s.check()
        text = ' '.join(f'{v}={n}' for v, n in values.items())
        print(f'[{cid} {sid} {text}] {r} ({"covered" if r == sat else "not covered"})')

# RUN-z3-vacuous-exemplars: the keys of AUD-1.1's variant pairs v3 to v5 (content/audit/AUD-1.1.yaml), as
# variants.py (RUN-z3-vacuous-variants) computes v1 and v2: for every case the violation query (premises plus the
# negated property), the premises alone (the non-vacuity check: sat means some case meets them), the minimal unsat
# core of the premises when they are unsat (the load-bearing lines), and each step-3 scenario: the premises plus
# the scenario's values, sat meaning the statement covers it. Tags are neutral: q7 to q12. q9 and q10 are SMT-LIB
# files, read assertion by assertion with parse_smt2_string so that each premise keeps its own text.
from z3 import *

RLIMIT = 5000000
print('z3', get_version_string(), f'rlimit={RLIMIT}')

def solver():
    s = Solver()
    s.set('rlimit', RLIMIT)
    return s

def show(m):
    return '[' + ', '.join(f'{d.name()} = {m[d]}' for d in sorted(m.decls(), key=lambda d: d.name())) + ']'

paid, refund, days = Ints('paid refund days')
bal, used, amount, fee = Ints('bal used amount fee')
WINDOW, LIMIT = 30, 500

REFUND = [('paid >= 0', paid >= 0), ('refund > 0', refund > 0), ('refund <= paid', refund <= paid),
          ('days >= 0', days >= 0), (f'days <= {WINDOW}', days <= WINDOW)]
REFUND_SCEN = [('s1', {paid: 100, refund: 40, days: 3}), ('s2', {paid: 100, refund: 40, days: 45}),
               ('s3', {paid: 100, refund: 100, days: 30}), ('s4', {paid: 20, refund: 40, days: 3})]

def smt(tag):
    text = open(f'{tag}.smt2').read()
    decls = '\n'.join(l for l in text.splitlines() if l.startswith('(declare-const'))
    asserts = [l.split(';')[0].strip() for l in text.splitlines() if l.startswith('(assert')]
    forms = [(a[len('(assert '):-1], parse_smt2_string(decls + '\n' + a)[0]) for a in asserts]
    return forms[:-1], forms[-1][1]     # the last assertion is the violation

FEE_SCEN = [('s1', {bal: 1000, amount: 500}), ('s2', {bal: 1000, amount: 1000}), ('s3', {bal: 50, amount: 50}),
            ('s4', {bal: 1000, amount: 99})]
CAP = [('bal >= 0', bal >= 0), ('used >= 0', used >= 0), ('amount > 0', amount > 0), ('amount <= bal', amount <= bal)]
CAP_SCEN = [('s1', {bal: 300, used: 0, amount: 200}), ('s2', {bal: 300, used: 450, amount: 100}),
            ('s3', {bal: 1000, used: 100, amount: 400}), ('s4', {bal: 100, used: 0, amount: 150})]

q9p, q9v = smt('q9')
q10p, q10v = smt('q10')
CASES = [
    ('q7', REFUND + [(f'days < {WINDOW + 1}', days < WINDOW + 1)], paid - refund < 0, REFUND_SCEN),
    ('q8', REFUND + [(f'days > {WINDOW}', days > WINDOW)], paid - refund < 0, REFUND_SCEN),
    ('q9', q9p, q9v, FEE_SCEN),
    ('q10', q10p, q10v, FEE_SCEN),
    ('q11', CAP + [(f'amount <= -(used - {LIMIT})', amount <= -(used - LIMIT))], bal - amount < 0, CAP_SCEN),
    ('q12', CAP + [(f'amount <= -used - {LIMIT}', amount <= -used - LIMIT)], bal - amount < 0, CAP_SCEN),
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

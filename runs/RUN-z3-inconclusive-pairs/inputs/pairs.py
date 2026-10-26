# RUN-z3-inconclusive-pairs: the keys of AUD-1.3's cases on the Audit Desk (docs/AUDIT-DESK.md sections 3.2 and
# 4.3, step 3, verdict honesty). Each case is a violation query run exactly as the case states it, budget
# included, and the run prints Z3's answer with its reason when the answer is unknown. Each step-3 scenario then
# asks whether the recorded result establishes the property for those values: it does only when the check answered
# unsat and the values meet every premise (the premises plus the values are sat). Queries are tagged q1 to q10, a
# neutral name the Desk can show in a receipt (content/audit/AUD-1.3.yaml maps each case to its tag). q7 and q8 are
# the SMT-LIB pair, run through the z3 command line by run.sh; their scenarios are read back here from the files.
from z3 import *

print('z3', get_version_string())


def answer(s):
    r = s.check()
    return r, (s.reason_unknown() if r == unknown else '')


def scenarios(cid, verdict, premises, rlimit, values_list):
    for sid, values in values_list:
        text = ' '.join(f'{k}={v}' for k, v in values.items())
        if verdict != unsat:
            print(f'[{cid} {sid} {text}] not established (the check answered {verdict})')
            continue
        s = Solver()
        s.set('rlimit', 5000000)
        s.add(*premises)
        s.add(*[Int(k) == v for k, v in values.items()])
        r = s.check()
        print(f'[{cid} {sid} {text}] {"established" if r == sat else "not established (the values fail a premise)"}')


# q1/q2: the pair. The fee query, with a budget: q1 at 5000000, q2 at 20000.
a, amount, rate, fee = Ints('a amount rate fee')
FEE_PREMISES = [a >= 0, amount > 0, rate >= 0, rate <= 500,
                fee * 10000 <= amount * rate, amount * rate < fee * 10000 + 10000,
                amount + fee <= a]
FEE_SCEN = [('s1', dict(a=1000, amount=400, rate=250)), ('s2', dict(a=100, amount=100, rate=100)),
            ('s3', dict(a=5000, amount=5000, rate=0)), ('s4', dict(a=10, amount=20, rate=0))]
for cid, rl in [('q1', 5000000), ('q2', 20000)]:
    s = Solver()
    s.set('rlimit', rl)
    s.add(*FEE_PREMISES)
    s.add(a - amount - fee < 0)
    r, why = answer(s)
    print(f'[{cid} violation] {r}' + (f' {why}' if why else ''))
    if cid == 'q1':
        p = Solver()
        p.set('rlimit', rl)
        p.add(*FEE_PREMISES)
        print(f'[{cid} premises] {p.check()}')
    scenarios(cid, r, FEE_PREMISES, rl, FEE_SCEN)

# q3/q4: variant pair v1. Shard counts fanout ** depth with depth > 3: q3 reads fanout >= 2, q4 fanout != 0.
fanout, depth = Ints('fanout depth')
SHARD_SCEN = [('s1', dict(fanout=2, depth=4)), ('s2', dict(fanout=3, depth=5)), ('s3', dict(fanout=1, depth=6)),
              ('s4', dict(fanout=2, depth=3))]
for cid, bound in [('q3', fanout >= 2), ('q4', fanout != 0)]:
    prem = [depth > 3, bound]
    s = Solver()
    s.set('rlimit', 5000000)
    s.add(*prem)
    s.add(fanout ** depth == 8)
    r, why = answer(s)
    print(f'[{cid} violation] {r}' + (f' {why}' if why else ''))
    scenarios(cid, r, prem, 5000000, SHARD_SCEN)

# q5/q6: variant pair v2. A fee schedule over days: q5 floors every day at day 0's fee, q6 never lets the fee fall
# from one day to the next. The violation: some day d >= 0 has a negative fee.
fee_on = Function('fee_on', IntSort(), IntSort())
k, d = Ints('k d')
DAY_SCEN = [('s1', dict(d=0)), ('s2', dict(d=30)), ('s3', dict(d=-1))]
for cid, rule in [('q5', ForAll([k], Implies(k >= 0, fee_on(k) >= fee_on(0)))),
                  ('q6', ForAll([k], Implies(k >= 0, fee_on(k + 1) >= fee_on(k))))]:
    prem = [rule, fee_on(0) >= 0, d >= 0]
    s = Solver()
    s.set('rlimit', 5000000)
    s.add(*prem)
    s.add(fee_on(d) < 0)
    r, why = answer(s)
    print(f'[{cid} violation] {r}' + (f' {why}' if why else ''))
    scenarios(cid, r, prem, 5000000, DAY_SCEN)

# q7/q8: the SMT-LIB pair (v3-q7.smt2 at rlimit 5000000, v3-q8.smt2 at 20000), the fee query of q1/q2 as a file.
for cid, path in [('q7', 'v3-q7.smt2'), ('q8', 'v3-q8.smt2')]:
    s = Solver()
    s.set('rlimit', 5000000 if cid == 'q7' else 20000)
    s.from_file(path)
    r, why = answer(s)
    print(f'[{cid} violation] {r}' + (f' {why}' if why else ''))
    prem = list(s.assertions())[:-1]
    scenarios(cid, r, prem, 5000000, FEE_SCEN)

# q9/q10: variant pair v4. The cube-sum check of the tab's budget run (RUN-z3-budget-pyodide's rlimit-case), at the
# same rlimit, natively: q9 reads z > 2, as the tab's query does; q10 reads z <= 3.
x, y, z = Ints('x y z')
CUBE_SCEN = [('s1', dict(x=3, y=3, z=3)), ('s2', dict(x=3, y=4, z=5)), ('s3', dict(x=1, y=2, z=9))]
for cid, bound in [('q9', z > 2), ('q10', z <= 3)]:
    prem = [x > 2, y > 2, bound]
    s = Solver()
    s.set('rlimit', 5000000)
    s.add(*prem)
    s.add(x * x * x + y * y * y == z * z * z)
    r, why = answer(s)
    print(f'[{cid} violation] {r}' + (f' {why}' if why else ''))
    scenarios(cid, r, prem, 5000000, CUBE_SCEN)

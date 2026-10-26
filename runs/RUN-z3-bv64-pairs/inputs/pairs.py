# RUN-z3-bv64-pairs: the keys of AUD-1.2's cases on the Audit Desk (docs/AUDIT-DESK.md sections 3.2 and 4.3, step 5,
# semantics). Every case is an Int query written for code that runs on int64 (ledger.go). For each case the run
# prints the query as the case states it, over Int (what the agent ran), then the same premises and violation
# rendered over signed 64-bit bit-vectors (what the service computes), with a witness when that is sat, and each
# step-3 scenario: whether the Int premises admit those values (covered), with the int64 results the service would
# compute for them. Queries are tagged q1 to q8, a neutral name the Desk can show in a receipt
# (content/audit/AUD-1.2.yaml maps each case to its tag).
from z3 import *

RLIMIT = 5000000
I64_MAX = 2**63 - 1
print('z3', get_version_string(), f'rlimit={RLIMIT}')


def solver():
    s = Solver()
    s.set('rlimit', RLIMIT)
    return s


def signed(m, v):
    return m.eval(v, model_completion=True).as_signed_long()


def check(tag, label, fs):
    s = solver()
    s.add(*fs)
    r = s.check()
    return s, r


# Each case: Int variables, the bit-vector variables the service runs on, and a function from either set to
# (premises, violation, observed results). `widen` maps a bit-vector variable to its int64 value: amount may be a
# uint32 widened to int64 in ledger.go.
def transfer_pair(bounded):
    def build(a, b, amount, i64):
        ps = [a >= 0, b >= 0, amount > 0, amount <= a]
        if bounded:
            ps.append(amount <= I64_MAX - b)
        return ps, Or(a - amount < 0, b + amount < 0), [('a-amount', a - amount), ('b+amount', b + amount)]
    return build


def negative_amount(uint32):
    def build(a, b, amount, i64):
        ps = [a >= 0]
        if uint32:
            ps.append(amount >= 0)
        ps.append(amount <= a)
        return ps, a - amount < 0, [('a-amount', a - amount)]
    return build


CASES = []

# q1/q2: the pair. Recipient added to the violation; q1 keeps the recipient's overflow check, q2 does not.
# q3/q4: variant pair v1. amount > 0 dropped; q3's amount is an int64, q4's a uint32 widened to int64.
# q5/q6: variant pair v2, in SMT-LIB (inputs/v2-*.smt2): the pair's statement, written as SMT-LIB.
# q7/q8: variant pair v3. A fee in basis points; q8 caps the amount, q7 does not.
PAIR_SCEN = [('s1', dict(a=10, b=0, amount=3)), ('s2', dict(a=10, b=9223372036854775800, amount=10)),
             ('s3', dict(a=2, b=0, amount=5)), ('s4', dict(a=5, b=9223372036854775802, amount=5))]
V1_SCEN = [('s1', dict(a=10, amount=3)), ('s2', dict(a=10, amount=-5)),
           ('s3', dict(a=10, amount=-9223372036854775808)), ('s4', dict(a=2, amount=5))]
V3_SCEN = [('s1', dict(amount=10000, rate=50)), ('s2', dict(amount=10**15, rate=10000)),
           ('s3', dict(amount=10**12, rate=10000)), ('s4', dict(amount=5, rate=20000))]


def run_transfer(cid, build, scenarios, amount32=False):
    a, b, amount = Ints('a b amount')
    ps, viol, obs = build(a, b, amount, False)
    s, r = check(cid, 'violation', ps + [viol])
    print(f'[{cid} violation] {r}')
    A, B = BitVecs('a b', 64)
    if amount32:
        X32 = BitVec('amount', 32)
        X = ZeroExt(32, X32)
    else:
        X = BitVec('amount', 64)
    bps, bviol, bobs = build(A, B, X, True)
    s, r = check(cid, 'violation i64', bps + [bviol])
    print(f'[{cid} violation i64] {r}')
    if r == sat:
        m = s.model()
        vals = ' '.join(f'{n}={signed(m, v)}' for n, v in [('a', A), ('b', B), ('amount', X)])
        res = ' '.join(f'{n}={signed(m, e)}' for n, e in bobs)
        print(f'[{cid} witness i64] {vals}: {res}')
    for sid, values in scenarios:
        ivars = {'a': a, 'b': b, 'amount': amount}
        s, r = check(cid, sid, ps + [ivars[k] == v for k, v in values.items()])
        text = ' '.join(f'{k}={v}' for k, v in values.items())
        # the int64 results: the same expressions over 64-bit two's complement, as ledger.go computes them
        env = {'a': 0, 'b': 0, 'amount': 0, **values}
        bvals = {k: BitVecVal(v, 64) for k, v in env.items()}
        _, _, eobs = build(bvals['a'], bvals['b'], bvals['amount'], True)
        res = ', '.join(f'{n} = {simplify(e).as_signed_long()}' for n, e in eobs)
        print(f'[{cid} {sid} {text}] {r} ({"covered" if r == sat else "not covered"}); int64: {res}')


run_transfer('q1', transfer_pair(True), PAIR_SCEN)
run_transfer('q2', transfer_pair(False), PAIR_SCEN)
run_transfer('q3', negative_amount(False), V1_SCEN)
run_transfer('q4', negative_amount(True), V1_SCEN, amount32=True)

# v2 in SMT-LIB: the Int query is the file itself; its int64 rendering is the same assertions over bit-vectors.
for cid, path, bounded in [('q5', 'v2-q5.smt2', True), ('q6', 'v2-q6.smt2', False)]:
    s = solver()
    s.from_file(path)
    print(f'[{cid} violation] {s.check()}')
    A, B, X = BitVecs('a b amount', 64)
    bps, bviol, bobs = transfer_pair(bounded)(A, B, X, True)
    s, r = check(cid, 'violation i64', bps + [bviol])
    print(f'[{cid} violation i64] {r}')
    if r == sat:
        m = s.model()
        vals = ' '.join(f'{n}={signed(m, v)}' for n, v in [('a', A), ('b', B), ('amount', X)])
        res = ' '.join(f'{n}={signed(m, e)}' for n, e in bobs)
        print(f'[{cid} witness i64] {vals}: {res}')
    a, b, amount = Ints('a b amount')
    for sid, values in PAIR_SCEN:
        s = solver()
        s.from_file(path)
        ivars = {'a': a, 'b': b, 'amount': amount}
        # the file asserts the violation too; coverage asks about the premises alone, so read them back without it
        prem = solver()
        for f in s.assertions()[:-1]:
            prem.add(f)
        prem.add(*[ivars[k] == v for k, v in values.items()])
        r = prem.check()
        text = ' '.join(f'{k}={v}' for k, v in values.items())
        bv = {k: BitVecVal(v, 64) for k, v in values.items()}
        _, _, eobs = transfer_pair(bounded)(bv['a'], bv['b'], bv['amount'], True)
        res = ', '.join(f'{n} = {simplify(e).as_signed_long()}' for n, e in eobs)
        print(f'[{cid} {sid} {text}] {r} ({"covered" if r == sat else "not covered"}); int64: {res}')


# v3: the fee in basis points, fee = amount * rate / 10000.
def fee_case(cid, capped):
    def build(amount, rate, fee):
        ps = [amount > 0]
        if capped:
            ps.append(amount <= 10**12)
        ps += [rate >= 0, rate <= 10000, fee == amount * rate / 10000]
        return ps, fee < 0, [('amount*rate', amount * rate), ('fee', amount * rate / 10000)]
    amount, rate, fee = Ints('amount rate fee')
    ps, viol, _ = build(amount, rate, fee)
    s, r = check(cid, 'violation', ps + [viol])
    print(f'[{cid} violation] {r}')
    X, R, F = BitVecs('amount rate fee', 64)
    bps, bviol, bobs = build(X, R, F)
    s, r = check(cid, 'violation i64', bps + [bviol])
    print(f'[{cid} violation i64] {r}')
    if r == sat:
        m = s.model()
        vals = ' '.join(f'{n}={signed(m, v)}' for n, v in [('amount', X), ('rate', R)])
        res = ' '.join(f'{n}={signed(m, e)}' for n, e in bobs)
        print(f'[{cid} witness i64] {vals}: {res}')
    for sid, values in V3_SCEN:
        s, r = check(cid, sid, ps + [amount == values['amount'], rate == values['rate']])
        text = ' '.join(f'{k}={v}' for k, v in values.items())
        _, _, eobs = build(BitVecVal(values['amount'], 64), BitVecVal(values['rate'], 64), BitVecVal(0, 64))
        res = ', '.join(f'{n} = {simplify(e).as_signed_long()}' for n, e in eobs)
        print(f'[{cid} {sid} {text}] {r} ({"covered" if r == sat else "not covered"}); int64: {res}')


fee_case('q7', False)
fee_case('q8', True)

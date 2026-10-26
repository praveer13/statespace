# ---- helper block: identical text in every Python script of runs/inputs/S1, except the SMT-LIB tour ----------
# (scripts/spikes/W1-T12/record.mjs check compares the blocks). A plain query goes through run(): a fresh
# Solver with an rlimit; the verdict and the model or the reason, as Z3 prints them; a replay of each
# witness in plain Python integers (witnesses are checked by property, never compared by value across
# engines); and the query's SMT-LIB text under smt2/ (let names renamed by canon; the hash of the raw text is
# kept too). An Optimize query goes through optimize(): an Optimize with the same rlimit, the verdict, the
# model and the minimum, the same replay, and no SMT-LIB text. One "@@" line per query carries the same facts
# as JSON, for the recording script; a bit-vector witness is given as Z3 prints it (unsigned) and as the
# signed integer it stands for.
import hashlib, json, os, re, time
from z3 import *

RLIMIT = 5000000    # the budget of every solver call (spine section 9.1: an rlimit on every call)
FAILED = []         # queries whose witness did not replay

def iv(m, x):       # a model value as a Python integer (a bit-vector reads as unsigned)
    return m.eval(x, model_completion=True).as_long()

def sv(m, x):       # a bit-vector model value as a signed (two's complement) Python integer
    return m.eval(x, model_completion=True).as_signed_long()

def wrap(n, bits):  # a Python integer reduced to a signed `bits`-bit integer, as hardware adds
    n &= (1 << bits) - 1
    return n - (1 << bits) if n >> (bits - 1) else n

def canon(text):    # Z3 names the let-bound terms of an export after AST ids (?x60, $x34), and the ids are not the
    seen = {}       # same in every process (see raw_exports_identical in the run records); the names are reused
    def name(mo):   # in order of appearance, so that one query is one text
        tok = mo.group(0)
        if tok not in seen:
            seen[tok] = f'{tok[0]}x{sum(1 for k in seen if k[0] == tok[0]) + 1}'
        return seen[tok]
    return re.sub(r'[?$]x\d+', name, text)

def show(m):        # Z3's model print, on one line
    return '[' + ', '.join(f'{d.name()} = {m[d]}' for d in m.decls()) + ']'

def model_facts(m, rec):  # the model as strings (big values exceed what JSON keeps exact); bit-vectors also signed
    rec['model'] = {d.name(): str(m[d]) for d in m.decls()}
    signed = {d.name(): str(m[d].as_signed_long()) for d in m.decls() if is_bv_value(m[d])}
    if signed:
        rec['model_signed'] = signed

def judge(prefix, checks):  # (all hold, one line that names each check and whether it held)
    return all(ok for _, ok in checks), prefix + ': ' + ', '.join(f'{label} {"ok" if ok else "FAILS"}' for label, ok in checks)

def emit(qid, rec, replay_result):
    if replay_result is not None:
        ok, text = replay_result
        rec['replays'], rec['replay'] = bool(ok), text
        print(f'  replay {"ok" if ok else "FAILED"}: {text}')
        if not ok:
            FAILED.append(qid)
    print('@@', json.dumps(rec, sort_keys=True))

def run(qid, formulas, replay=None):
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.add(*formulas)
    t = time.perf_counter()
    r = s.check()
    rec = {'q': qid, 'verdict': str(r), 'rlimit': RLIMIT, 'ms': round((time.perf_counter() - t) * 1000, 2)}
    out = None
    if r == sat:
        m = s.model()
        model_facts(m, rec)
        print(f'[{qid}] sat {show(m)}')
        out = replay(m) if replay else None
    elif r == unknown:
        rec['reason_unknown'] = s.reason_unknown()
        print(f'[{qid}] unknown {rec["reason_unknown"]}')
    else:
        print(f'[{qid}] unsat')
    raw = s.to_smt2()
    text = canon(raw)
    rec['smt2_raw_sha256'] = hashlib.sha256(raw.encode()).hexdigest()
    rec['smt2_sha256'] = hashlib.sha256(text.encode()).hexdigest()
    os.makedirs('smt2', exist_ok=True)
    with open(f'smt2/{qid}.smt2', 'w') as f:
        f.write(text)
    emit(qid, rec, out)
    return r

def optimize(qid, formulas, objective, name, replay=None):  # the smallest value of `objective` among the models
    o = Optimize()
    o.set('rlimit', RLIMIT)
    o.add(*formulas)
    handle = o.minimize(objective)
    t = time.perf_counter()
    r = o.check()
    rec = {'q': qid, 'verdict': str(r), 'rlimit': RLIMIT, 'ms': round((time.perf_counter() - t) * 1000, 2),
           'objective': name, 'smt2_sha256': None}
    out = None
    if r == sat:
        m = o.model()
        model_facts(m, rec)
        rec['minimum'] = str(o.lower(handle))
        print(f'[{qid}] sat minimum {name} = {rec["minimum"]} {show(m)}')
        out = replay(m) if replay else None
    else:
        print(f'[{qid}] {r}')
    emit(qid, rec, out)
    return r

print('z3', get_version_string(), f'rlimit={RLIMIT}')
# ---- end of the helper block ---------------------------------------------------------------------------

# RUN-z3-vacuous-unsat. S1.L3, D-02, SP-1.6, CL-1.1, AUD-1.1.
#
# Part 1, CL-1.1's method field: the guarded violation query (unsat) and, beside it, the premise query
# (the premises and the guard without the negated property), whose model is the premise witness.
#
# Part 2, the config cell: a default config sets MAX_TRANSFER = 0 beside `amount > 0` and
# `amount <= MAX_TRANSFER`. Three queries on it: the violation of "the sender ends at zero or above",
# the violation of the absurd property "the sender ends 1,000,000 richer", and the premises alone.
# MAX_TRANSFER is a Python constant of the encoding (the config's default), so the premises that
# contradict each other are `amount > 0` and `amount <= 0`. Two premise sets are run: the config
# range alone ("range"), and the range beside the sufficient-funds guard ("guarded"). MAX_TRANSFER = 100
# is the control: the same queries on a config that does not empty the range.
a, b, amount = Ints('a b amount')
SENDER_VIOLATION = a - amount < 0                       # the property "a - amount >= 0", negated
ABSURD_VIOLATION = Not(a - amount == a + 1000000)       # the property "the sender ends 1,000,000 richer", negated

PREMISE = {   # label -> (text, formula for a given MAX_TRANSFER, Python check on a witness (A, B, X, M))
    'a_nonneg': ('a >= 0', lambda M: a >= 0, lambda A, B, X, M: A >= 0),
    'b_nonneg': ('b >= 0', lambda M: b >= 0, lambda A, B, X, M: B >= 0),
    'amount_positive': ('amount > 0', lambda M: amount > 0, lambda A, B, X, M: X > 0),
    'amount_le_max_transfer': ('amount <= MAX_TRANSFER', lambda M: amount <= M, lambda A, B, X, M: X <= M),
    'amount_le_a': ('amount <= a', lambda M: amount <= a, lambda A, B, X, M: X <= A),
}
VIOLATION = {
    'sender': ('a - amount < 0', SENDER_VIOLATION, lambda A, X: A - X < 0),
    'absurd': ('a - amount != a + 1000000', ABSURD_VIOLATION, lambda A, X: A - X != A + 1000000),
}

def replayer(labels, M, violation):
    def f(m):
        A, B, X = iv(m, a), iv(m, b), iv(m, amount)
        checks = [(PREMISE[l][0], PREMISE[l][2](A, B, X, M)) for l in labels]
        if violation:
            text, _, fn = VIOLATION[violation]
            checks.append((text, fn(A, X)))
        return judge(f'a={A} b={B} amount={X}' + (f' MAX_TRANSFER={M}' if M is not None else ''), checks)
    return f

def core(qid, labels, M):
    """The unsat core of a premise set, minimised, and a check that it is minimal."""
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.set('core.minimize', True)
    for l in labels:
        s.assert_and_track(PREMISE[l][1](M), Bool(l))
    r = s.check()
    found = sorted(str(c) for c in s.unsat_core()) if r == unsat else []
    def solver_of(ls):
        t = Solver()
        t.set('rlimit', RLIMIT)
        t.add(*[PREMISE[l][1](M) for l in ls])
        return t
    alone = solver_of(found).check() == unsat
    minimal = all(solver_of([k for k in found if k != l]).check() == sat for l in found)
    print(f'[{qid}] {r} unsat_core={found}')
    print(f'  core check: the core alone is {"unsat" if alone else "NOT unsat"}; dropping any one member leaves it {"sat" if minimal else "NOT sat"}')
    emit(qid, {'q': qid, 'verdict': str(r), 'rlimit': RLIMIT, 'unsat_core': found,
               'core_constraints': [PREMISE[l][0] for l in found], 'core_alone_unsat': alone, 'core_minimal': minimal,
               'smt2_sha256': None}, None)

# Part 1. CL-1.1: a, b >= 0, amount > 0, the sufficient-funds guard amount <= a.
cl11 = ['a_nonneg', 'b_nonneg', 'amount_positive', 'amount_le_a']
cl11_formulas = [PREMISE[l][1](None) for l in cl11]
run('cl11_violation', cl11_formulas + [SENDER_VIOLATION])
run('cl11_premises', cl11_formulas, replayer(cl11, None, None))

# Part 2. The config cell, MAX_TRANSFER = 0, and the control, MAX_TRANSFER = 100.
for M in (0, 100):
    for scenario, labels in (('range', ['a_nonneg', 'b_nonneg', 'amount_positive', 'amount_le_max_transfer']),
                             ('guarded', ['a_nonneg', 'b_nonneg', 'amount_positive', 'amount_le_max_transfer', 'amount_le_a'])):
        premises = [PREMISE[l][1](M) for l in labels]
        tag = f'max{M}_{scenario}'
        run(f'{tag}_violation', premises + [SENDER_VIOLATION], replayer(labels, M, 'sender'))
        run(f'{tag}_absurd', premises + [ABSURD_VIOLATION], replayer(labels, M, 'absurd'))
        run(f'{tag}_premises', premises, replayer(labels, M, None))
        if M == 0:
            core(f'{tag}_core', labels, M)

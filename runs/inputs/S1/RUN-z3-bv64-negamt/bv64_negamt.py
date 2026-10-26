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

# RUN-z3-bv64-negamt. S1.L5 segment 1 and the Defence's "what changes if amount may be zero or negative":
# the guarded transfer without the `amount > 0` premise, over signed BitVec 64 and over Int.
# Z3's `<`, `<=` and `-` on bit-vectors are signed comparisons and wrapping subtraction, so A - X wraps.
A, B, X = BitVecs('A B X', 64)
bv_premises = [A >= 0, B >= 0, X <= A]            # no X > 0: the guard alone is X <= A
bv_violation = A - X < 0                          # the sender ends below zero (signed)

def replay_bv_sender(with_positive):
    def f(m):
        a, b, x = sv(m, A), sv(m, B), sv(m, X)
        after = wrap(a - x, 64)
        checks = [('A >= 0', a >= 0), ('B >= 0', b >= 0), ('X <= A', x <= a)] + ([('X > 0', x > 0)] if with_positive else []) + \
                 [(f'A - X wraps to {after} < 0 (the integers give {a - x})', after < 0)]
        return judge(f'A={a} B={b} X={x} (signed 64-bit)', checks)
    return f

# The sender over BitVec 64 with the guard and no X > 0: a negative amount makes A - X overflow.
run('bv64_sender_noguard', bv_premises + [bv_violation], replay_bv_sender(False))
# The control, [X RUN-z3-bv64]: with X > 0 the same violation is unsat.
run('bv64_sender_positive', bv_premises + [X > 0, bv_violation])

# The Int twin of research/evidence/a2r3/scripts/z3_negamt.py, which was never run for the record.
a, b, amount = Ints('a b amount')
int_premises = [a >= 0, b >= 0, amount <= a]      # the guard, and no amount > 0

def replay_int_drain(m):
    A_, B_, M_ = iv(m, a), iv(m, b), iv(m, amount)
    return judge(f'a={A_} b={B_} amount={M_}', [('a >= 0', A_ >= 0), ('b >= 0', B_ >= 0), ('amount <= a', M_ <= A_), (f'b + amount = {B_ + M_} < 0', B_ + M_ < 0)])

# Over Int a negative amount makes the sender richer, never poorer: the sender's violation is unsat.
run('int_sender_noguard', int_premises + [a - amount < 0])
# And the same guard, with a negative amount, drains the recipient: the query z3_negamt.py asks.
run('int_recipient_drain', int_premises + [b + amount < 0], replay_int_drain)
# A zero amount is a no-op over Int: no state changes.
run('int_zero_noop', int_premises + [amount == 0, Or(a - amount != a, b + amount != b)])

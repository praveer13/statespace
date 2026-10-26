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

# RUN-z3-btc2010. SP-1.9, a toy model of Bitcoin CVE-2010-5139 (a dated incident): a transaction whose
# outputs "overflowed when summed". This is a toy, not a model of Bitcoin's code.
# I is the value of the inputs and O1, O2 are two outputs, all signed 64-bit amounts. The buggy check sums
# the outputs in 64-bit arithmetic and tests the wrapped sum against the input. "No transaction creates
# value" means the true sum of the outputs (sign-extended, so it cannot wrap) does not exceed the input.
# MAX_MONEY is 21 million coins of 100,000,000 units each, the bound that the SP-1.9 row of the S1 spec gives
# for the 2010 fix, applied here to every output and to the total.
I, O1, O2 = BitVecs('I O1 O2', 64)
MAX_MONEY = 21000000 * 100000000
ext = lambda v: SignExt(1, v)                              # 65 bits: the sum of two 64-bit values cannot wrap
true_sum = ext(O1) + ext(O2)
creates_value = true_sum > ext(I)                          # the violation of "no transaction creates value"
output_exceeds_input = Or(O1 > I, O2 > I)                  # a stronger shape of the same violation

buggy_check = [I >= 0, O1 >= 0, O2 >= 0, O1 + O2 <= I]    # the wrapped sum is tested against the input
fix_each_output = [I >= 0, O1 >= 0, O1 <= MAX_MONEY, O2 >= 0, O2 <= MAX_MONEY, O1 + O2 <= I]
fix_2010 = fix_each_output + [O1 + O2 >= 0, O1 + O2 <= MAX_MONEY]   # every output and the total in range

def replay_creates(extra=None):
    def f(m):
        i, o1, o2 = sv(m, I), sv(m, O1), sv(m, O2)
        wrapped = wrap(o1 + o2, 64)
        checks = [('I >= 0', i >= 0), ('O1 >= 0', o1 >= 0), ('O2 >= 0', o2 >= 0),
                  (f'wrapped sum {wrapped} <= I', wrapped <= i), (f'true sum {o1 + o2} > I', o1 + o2 > i)]
        if extra:
            checks.append(extra(i, o1, o2))
        return judge(f'I={i} O1={o1} O2={o2} (signed 64-bit)', checks)
    return f

def replay_accepts(m):
    i, o1, o2 = sv(m, I), sv(m, O1), sv(m, O2)
    ok = all([i >= 0, 0 <= o1 <= MAX_MONEY, 0 <= o2 <= MAX_MONEY, o1 + o2 <= i, 0 <= o1 + o2 <= MAX_MONEY])
    return judge(f'I={i} O1={o1} O2={o2}', [('the 2010 check accepts it', ok)])

# The buggy check passes a transaction whose outputs sum to more than its inputs.
run('buggy_creates_value', buggy_check + [creates_value], replay_creates())
# The same, with one output larger than the whole input.
run('buggy_output_exceeds_input', buggy_check + [output_exceeds_input],
    replay_creates(lambda i, o1, o2: (f'an output exceeds I', o1 > i or o2 > i)))
# The cures: a range check on each output before summing, and the 2010 fix (every output and the total in range).
run('fix_each_output', fix_each_output + [creates_value])
run('fix_2010', fix_2010 + [creates_value])
# The fixed check is not vacuous: some transaction passes it.
run('fix_2010_accepts_some', fix_2010, replay_accepts)

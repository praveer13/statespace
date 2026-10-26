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

# RUN-z3-double-capture. S1.L4 cell 2, SP-1.2, CL-1.3: one hold captured twice.
#
# A state is (avail, held, merchant, status): `held` is the pooled balance of all holds, `status` is the
# status of the one hold under test, whose amount is h. Post-state constants carry the suffixes _p
# (S') and _pp (S''). A capture is a relation between a state and its successor:
#     held' = held - h, merchant' = merchant + h, avail' = avail, status' = CAPTURED.
# The buggy capture has no guard; the tempting patch requires held >= h (the pooled balance); the fixed
# capture requires status = HELD. Two captures chain S -> S' -> S''.
Status, (HELD, CAPTURED) = EnumSort('Status', ['HELD', 'CAPTURED'])
h = Int('h')

class State:
    def __init__(self, suffix):
        self.avail, self.held, self.merchant = Int('avail' + suffix), Int('held' + suffix), Int('merchant' + suffix)
        self.status = Const('status' + suffix, Status)

    def total(self):
        return self.avail + self.held + self.merchant

S, S1, S2 = State(''), State('_p'), State('_pp')

def capture(x, y, guard=None):
    body = And(y.held == x.held - h, y.merchant == x.merchant + h, y.avail == x.avail, y.status == CAPTURED)
    return body if guard is None else And(guard(x), body)

buggy = lambda x, y: capture(x, y)
patched = lambda x, y: capture(x, y, lambda x: x.held >= h)       # the pooled balance, not the hold
fixed = lambda x, y: capture(x, y, lambda x: x.status == HELD)    # the hold's own status

# The state before: balances at zero or above, a positive hold that the pool covers, still HELD.
start = [S.avail >= 0, S.held >= 0, S.merchant >= 0, h > 0, S.held >= h, S.status == HELD]
twice = lambda step: [step(S, S1), step(S1, S2)]
AT_MOST_ONCE_VIOLATION = S2.merchant - S.merchant > h          # the merchant gains more than the hold

def vals(m):
    return {n: iv(m, v) for n, v in [('avail', S.avail), ('held', S.held), ('merchant', S.merchant), ('h', h),
                                      ('merchant_pp', S2.merchant), ('held_pp', S2.held), ('merchant_p', S1.merchant), ('held_p', S1.held)]}

def replay_twice(guard, prop):    # replays the chain in Python: each capture, then the violation
    def f(m):
        v = vals(m)
        st = str(m.eval(S.status, model_completion=True))
        held1, merch1 = v['held'] - v['h'], v['merchant'] + v['h']
        held2, merch2 = held1 - v['h'], merch1 + v['h']
        text, holds = prop(v, held2, merch2)
        checks = [('state before: balances >= 0, h > 0, held >= h, status HELD',
                   min(v['avail'], v['held'], v['merchant']) >= 0 and v['h'] > 0 and v['held'] >= v['h'] and st == 'HELD'),
                  ('first capture allowed', guard(v['held'], 'HELD', v['h'])),
                  ('second capture allowed', guard(held1, 'CAPTURED', v['h'])),
                  (text, holds)]
        return judge(f'held={v["held"]} h={v["h"]} merchant={v["merchant"]}', checks)
    return f

# what a witness must show, computed from the replayed chain: the merchant gains more than h, or held ends below zero
gains_more = lambda v, held2, merch2: (f'merchant gains {merch2 - v["merchant"]} > h={v["h"]}', merch2 - v['merchant'] > v['h'])
held_below_zero = lambda v, held2, merch2: (f'held ends at {held2} < 0', held2 < 0)

no_guard = lambda held, status, hold: True
patch_guard = lambda held, status, hold: held >= hold
fixed_guard = lambda held, status, hold: status == 'HELD'

# (i) Conservation of avail + held + merchant from S to S'' under the buggy capture, twice: it holds.
run('conservation_buggy_twice', start + twice(buggy) + [S2.total() != S.total()])
# (ii) At most once: the merchant gains no more than h. The buggy capture breaks it: the merchant gains 2h.
run('at_most_once_buggy', start + twice(buggy) + [AT_MOST_ONCE_VIOLATION], replay_twice(no_guard, gains_more))
# (iii) The patch "capture requires held >= h". With one hold in the pool (held = h) the second capture is
# refused, so the instance is fixed; with other holds pooled in `held` the class lives on.
run('at_most_once_patched_one_hold', start + [S.held == h] + twice(patched) + [AT_MOST_ONCE_VIOLATION])
run('at_most_once_patched_pooled', start + twice(patched) + [AT_MOST_ONCE_VIOLATION], replay_twice(patch_guard, gains_more))
# (iv) The fixed capture (requires status = HELD): the second capture is refused whatever else is held.
run('at_most_once_fixed', start + twice(fixed) + [AT_MOST_ONCE_VIOLATION])
# (v) The premise witness: one fixed capture succeeds.
def replay_once(m):
    v = vals(m)
    st = str(m.eval(S.status, model_completion=True))
    return judge(f'held={v["held"]} h={v["h"]} merchant={v["merchant"]}',
                 [('status HELD', st == 'HELD'), (f'merchant_p = merchant + h = {v["merchant"] + v["h"]}', v['merchant_p'] == v['merchant'] + v['h']),
                  (f'held_p = held - h = {v["held"] - v["h"]}', v['held_p'] == v['held'] - v['h'])])
run('fixed_one_capture', start + [fixed(S, S1)], replay_once)

# Optimize on the hold amount: the smallest hold whose double capture breaks at-most-once, and the smallest
# pooled balance with which the patch still lets a second capture of the same hold through.
optimize('minimize_hold', start + twice(buggy) + [AT_MOST_ONCE_VIOLATION], h, 'h', replay_twice(no_guard, gains_more))
optimize('minimize_pool_patched', start + twice(patched) + [AT_MOST_ONCE_VIOLATION], S.held, 'held', replay_twice(patch_guard, gains_more))
# Nothing smaller exists: the plain queries that an Optimize answer is checked by (a second solver can run them).
run('no_smaller_hold', start + twice(buggy) + [AT_MOST_ONCE_VIOLATION, h < 1])
run('no_smaller_pool_patched', start + twice(patched) + [AT_MOST_ONCE_VIOLATION, S.held < 2])

# The prequestion's option C, "the held balance never goes below zero": the buggy double capture drives
# `held` below zero when this hold is the only one in the pool, and not when other holds are pooled with it.
run('held_nonneg_one_hold', start + [S.held == h] + twice(buggy) + [S2.held < 0],
    replay_twice(no_guard, held_below_zero))
run('held_nonneg_pooled', start + [S.held >= 2 * h] + twice(buggy) + [S2.held < 0])

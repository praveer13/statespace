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

# RUN-z3-refund-mint. S1.L4's refund variant, LAB-1.4, SP-1.3, CL-1.4: a refund rule that mints money.
#
# A refund moves r from the merchant to the customer: customer c, merchant m, refund r > 0. A rule returns
# the new customer balance, the new merchant balance and whether the refund was accepted; a rejected
# refund leaves the state unchanged. The rules are written in expression form, without primed variables.
# The clamp (SP-1.3) credits the customer in full and floors the merchant at zero, so a refund above the
# merchant's balance mints the difference. The fixed rule rejects it and debits exactly what it credits.
# The patches kill one witness each: they fix the instance, not the class.
c, m, r = Ints('c m r')
premises = [c >= 0, m >= 0, r > 0]

def clamp(c, m, r):                       # the buggy rule: the merchant is clamped at 0, the customer is credited in full
    return c + r, If(m - r > 0, m - r, 0), BoolVal(True)

def patched(special):                     # the clamp, with one special case rejected
    def rule(c, m, r):
        rejected = special(c, m, r)
        c2, m2, ok = clamp(c, m, r)
        return If(rejected, c, c2), If(rejected, m, m2), Not(rejected)
    return rule

patch_empty_merchant = patched(lambda c, m, r: m == 0)          # "reject when the merchant has nothing"
patch_exact_witness = patched(lambda c, m, r: r == m + 1)       # "reject the smallest overdrawing refund"

def fixed(c, m, r):                       # the cure: reject when r > m, and debit what is credited
    ok = r <= m
    return If(ok, c + r, c), If(ok, m - r, m), ok

def minted(rule):                         # the money the rule creates: the new total less the old
    c2, m2, ok = rule(c, m, r)
    return c2 + m2 - (c + m)

# the same rules in plain Python, to replay a witness
def clamp_py(C, M, R): return C + R, max(M - R, 0), True
def patch_m0_py(C, M, R): return (C, M, False) if M == 0 else clamp_py(C, M, R)
def patch_r_py(C, M, R): return (C, M, False) if R == M + 1 else clamp_py(C, M, R)
def fixed_py(C, M, R): return (C + R, M - R, True) if R <= M else (C, M, False)

def replay_mint(rule_py):
    def f(mod):
        C, M, R = iv(mod, c), iv(mod, m), iv(mod, r)
        C2, M2, ok = rule_py(C, M, R)
        return judge(f'c={C} m={M} r={R} gives c2={C2} m2={M2}',
                     [('c >= 0, m >= 0, r > 0', C >= 0 and M >= 0 and R > 0), ('refund accepted', ok),
                      (f'minted {C2 + M2 - (C + M)} > 0', C2 + M2 - (C + M) > 0)])
    return f

def replay_accepted(mod):
    C, M, R = iv(mod, c), iv(mod, m), iv(mod, r)
    return judge(f'c={C} m={M} r={R}', [('c >= 0, m >= 0, r > 0', C >= 0 and M >= 0 and R > 0), ('r <= m, so the refund is accepted', R <= M)])

# The clamp mints: some refund leaves the pair holding more than it did.
run('clamp_mint', premises + [minted(clamp) > 0], replay_mint(clamp_py))
# The clamp protects non-negativity, which is why it looks like a fix: the merchant never goes below zero.
run('clamp_merchant_nonneg', premises + [clamp(c, m, r)[1] < 0])
# The smallest amount minted: Optimize on the minted amount.
optimize('minimize_minted', premises + [minted(clamp) > 0], minted(clamp), 'minted', replay_mint(clamp_py))
# The special-case patches: each has a witness. The second patch removes every smallest witness, so its
# smallest witness mints more.
run('patch_empty_merchant_mint', premises + [minted(patch_empty_merchant) > 0], replay_mint(patch_m0_py))
run('patch_exact_witness_mint', premises + [minted(patch_exact_witness) > 0], replay_mint(patch_r_py))
optimize('minimize_minted_patch_exact', premises + [minted(patch_exact_witness) > 0], minted(patch_exact_witness), 'minted', replay_mint(patch_r_py))
# Nothing smaller exists: the plain queries that an Optimize answer is checked by (a second solver can run them).
# The first is unsat over the integers whatever the rule, since no integer lies strictly between 0 and 1; the
# second needs the patch, which rejects r = m + 1, the one refund the clamp turns into a mint of 1.
run('no_smaller_mint', premises + [minted(clamp) > 0, minted(clamp) < 1])
run('no_smaller_mint_patch_exact', premises + [minted(patch_exact_witness) > 0, minted(patch_exact_witness) < 2])
# The fixed rule: the mint query is unsat; it is not vacuous (some refund is accepted); a rejected refund
# changes nothing.
run('fixed_mint', premises + [minted(fixed) > 0])
run('fixed_premises', premises + [fixed(c, m, r)[2]], replay_accepted)
run('fixed_rejected_unchanged', premises + [Not(fixed(c, m, r)[2]), Or(fixed(c, m, r)[0] != c, fixed(c, m, r)[1] != m)])

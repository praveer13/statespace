# RUN-z3-declassify-exemplars: AUD-7.2's variant pairs v2 to v5 (content/audit/AUD-7.2.yaml), in the Bench image.
# Tags are neutral: q5/q6 v2, q7/q8 v3, q9/q10 v4, q11/q12 v5, each sound/flawed. As in RUN-z3-declassify-pairs,
# [qN proof] is the self-composition query the agent ran; [qN premises] is the relation plus "Birch's data differs",
# so that the proof is not vacuous; each [qN sK] evaluates the case's relation on one concrete change from world L
# to world R: the statement "allows" it when the worlds are not related, and "forbids" it when they are.
# The Z3Py statements (q5, q6, q9, q10) are the blocks between their "--- qN" markers, run with exec as written (the
# untagged line each prints is its own check); q5's open_doc and related() are S7.L6 cell 2's open_v1 and related().
# q7 is runs/RUN-z3-selfcomp/cells/s7l6_cell3.smt2, copied verbatim; q8, q11 and q12 are SMT-LIB files of the
# same form: every assertion but the last is the relation, and the last is the negated conclusion.
import re
from z3 import *

RLIMIT = 5000000
HIDDEN = -1
print(f"z3 {get_version_string()} rlimit={RLIMIT}")
SRC = open(__file__).read()

def solver():
    s = Solver(); s.set('rlimit', RLIMIT); return s

def block(tag):
    return re.search(rf'# --- {tag} begin\n(.*?)# --- {tag} end\n', SRC, re.S).group(1)

# ------------------------------------------------------------------ v2: Open, by name (S7.L6 cell 2's model)
# --- q5 begin
def open_doc(exists, mayread, body):          # one answer for both refusals
    code = If(And(exists, mayread), 2, 0)
    return code, If(code == 2, body, 0)

def related():
    eL, eR = Bools('exists_L exists_R')
    mL, mR = Bools('mayread_L mayread_R')
    bL, bR = Ints('body_L body_R')
    # Rel: the worlds agree on what Acme may know.
    rel = And(mL == mR, Implies(mL, And(eL == eR, bL == bR)))
    return (eL, mL, bL), (eR, mR, bR), rel

L, R, rel = related()
(cL, xL), (cR, xR) = open_doc(*L), open_doc(*R)
s = Solver()
s.add(rel, Or(cL != cR, xL != xR))           # the negated conclusion: frank's responses differ
print(s.check())
# --- q5 end
# --- q6 begin
def open_doc(exists, mayread, body):          # one answer for every request
    code = IntVal(0)
    return code, If(code == 2, body, 0)

def related():
    eL, eR = Bools('exists_L exists_R')
    mL, mR = Bools('mayread_L mayread_R')
    bL, bR = Ints('body_L body_R')
    # Rel: the worlds agree on what Acme may know.
    rel = And(mL == mR)                       # nothing of Birch's document reaches frank
    return (eL, mL, bL), (eR, mR, bR), rel

L, R, rel = related()
(cL, xL), (cR, xR) = open_doc(*L), open_doc(*R)
s = Solver()
s.add(rel, Or(cL != cR, xL != xR))           # the negated conclusion: frank's responses differ
print(s.check())
# --- q6 end

OPEN_CHANGES = [  # (id, world L, world R): (exists, frank may read it, body)
    ('s1', (True, True, 10), (True, True, 11)),     # Birch edits layoffs-memo, which it shares with Acme
    ('s2', (False, False, 0), (True, False, 10)),   # Birch creates layoffs-memo without sharing it
    ('s3', (True, False, 10), (True, True, 10)),    # Birch shares layoffs-memo with Acme
    ('s4', (True, False, 10), (True, False, 11)),   # Birch edits layoffs-memo while it is not shared
]
for tag in ('q5', 'q6'):
    ns = {**globals()}
    exec(block(tag), ns)
    L, R, rel = ns['related']()
    (cL, xL), (cR, xR) = ns['open_doc'](*L), ns['open_doc'](*R)
    s = solver(); s.add(rel, Or(cL != cR, xL != xR))
    print(f'[{tag} proof] {s.check()}')
    s = solver(); s.add(rel, Or(L[0] != R[0], L[2] != R[2]))
    print(f'[{tag} premises] {s.check()}')
    for sid, l, r in OPEN_CHANGES:
        s = solver(); s.add(rel, *[v == w for v, w in zip(L + R, l + r)])
        print(f'[{tag} {sid}] {"forbids" if s.check() == sat else "allows"}')

# ------------------------------------------------------------------ v3: the share rule written inline
class World:
    def __init__(self, side):
        self.own_A = Int(f'own_A_{side}')                                   # Acme's own document
        self.docs_B = [(Int(f'body{i}_{side}'), Bool(f'shared{i}_{side}')) for i in range(2)]   # Birch's documents
# --- q9 begin
def view_A(W):                                   # what Acme's client receives
    return [W.own_A] + [If(sh, c, HIDDEN) for c, sh in W.docs_B]

def rel(L, R):                                   # what Acme may know: DCL-7.1, written inline
    return And(L.own_A == R.own_A, And([And(shL == shR, Implies(shL, cL == cR))
                                        for (cL, shL), (cR, shR) in zip(L.docs_B, R.docs_B)]))

L, R = World('L'), World('R')                    # Acme's document; two of Birch's, each maybe shared
s = Solver()
s.add(rel(L, R))
s.add(Or([a != b for a, b in zip(view_A(L), view_A(R))]))
print(s.check())
# --- q9 end
# --- q10 begin
def view_A(W):                                   # what Acme's client receives
    return [W.own_A] + [If(Or([s for _, s in W.docs_B]), c, HIDDEN) for c, sh in W.docs_B]

def rel(L, R):                                   # what Acme may know: DCL-7.1, written inline
    return And(L.own_A == R.own_A, And([And(shL == shR, Implies(Or([s for _, s in L.docs_B]), cL == cR))
                                        for (cL, shL), (cR, shR) in zip(L.docs_B, R.docs_B)]))

L, R = World('L'), World('R')                    # Acme's document; two of Birch's, each maybe shared
s = Solver()
s.add(rel(L, R))
s.add(Or([a != b for a, b in zip(view_A(L), view_A(R))]))
print(s.check())
# --- q10 end
SHARE_CHANGES = [  # (id, world L, world R): (Acme's own body, [(Birch body, shared with Acme)])
    ('s1', (5, [(10, True), (20, False)]), (5, [(11, True), (20, False)])),   # Birch edits a shared document
    ('s2', (5, [(10, True), (20, False)]), (5, [(10, True), (21, False)])),   # Birch edits a private document
    ('s3', (5, [(10, False), (20, False)]), (5, [(10, False), (21, False)])), # Birch edits a document, sharing nothing
    ('s4', (5, [(10, True), (20, False)]), (6, [(10, True), (20, False)])),   # Acme edits its own document
]
def concrete(W, own, docs):
    return And(W.own_A == own, *[And(c == b, sh == BoolVal(x)) for (c, sh), (b, x) in zip(W.docs_B, docs)])
for tag in ('q9', 'q10'):
    ns = {**globals()}
    exec(block(tag), ns)
    L, R = World('L'), World('R')
    s = solver(); s.add(ns['rel'](L, R), Or([a != b for a, b in zip(ns['view_A'](L), ns['view_A'](R))]))
    print(f'[{tag} proof] {s.check()}')
    s = solver(); s.add(ns['rel'](L, R), Or([Or(cL != cR, shL != shR) for (cL, shL), (cR, shR) in zip(L.docs_B, R.docs_B)]))
    print(f'[{tag} premises] {s.check()}')
    for sid, l, r in SHARE_CHANGES:
        s = solver(); s.add(concrete(L, *l), concrete(R, *r), ns['rel'](L, R))
        print(f'[{tag} {sid}] {"forbids" if s.check() == sat else "allows"}')

# ------------------------------------------------------------------ v4 and v5: SMT-LIB self-compositions
def smt_parts(tag):
    text = open(f'{tag}.smt2').read()
    lines = text.splitlines()
    head = '\n'.join(l for l in lines if l.startswith('(declare-const') or l.startswith('(define-fun'))
    asserts, cur, depth = [], '', 0
    for l in lines:
        if not cur and not l.startswith('(assert'):
            continue
        code = l.split(';')[0]
        cur += code + '\n'; depth += code.count('(') - code.count(')')
        if depth == 0:
            asserts.append(cur); cur = ''
    return text, head, asserts[:-1], asserts[-1]

def smt_judge(tag, changes, birch_differs):
    text, head, rel, _ = smt_parts(tag)
    s = solver(); s.from_string(text); print(f'[{tag} proof] {s.check()}')
    s = solver(); s.from_string(head + '\n' + ''.join(rel) + f'(assert {birch_differs})'); print(f'[{tag} premises] {s.check()}')
    for sid, values in changes:
        eqs = ''.join(f'(assert (= {k} {v}))\n' for k, v in values.items())
        s = solver(); s.from_string(head + '\n' + ''.join(rel) + eqs)
        print(f'[{tag} {sid}] {"forbids" if s.check() == sat else "allows"}')

B = lambda x: 'true' if x else 'false'
def open_vals(l, r):
    return {'exists_L': B(l[0]), 'mayread_L': B(l[1]), 'body_L': l[2], 'exists_R': B(r[0]), 'mayread_R': B(r[1]), 'body_R': r[2]}
for tag in ('q7', 'q8'):
    smt_judge(tag, [(sid, open_vals(l, r)) for sid, l, r in OPEN_CHANGES], '(or (distinct exists_L exists_R) (distinct body_L body_R))')

USAGE_CHANGES = [  # (id, world L, world R): (Acme's own body, [(Birch document present, its body)])
    ('s1', (5, [(True, 10), (False, 0)]), (5, [(True, 10), (True, 20)])),    # Birch creates a private document
    ('s2', (5, [(True, 10), (False, 0)]), (5, [(True, 11), (False, 0)])),    # Birch edits a private document
    ('s3', (5, [(True, 10), (False, 0)]), (5, [(False, 10), (True, 0)])),    # Birch deletes one document and creates another
    ('s4', (5, [(True, 10), (False, 0)]), (6, [(True, 10), (False, 0)])),    # Acme edits its own document
]
def usage_vals(l, r):
    out = {}
    for side, (own, docs) in (('L', l), ('R', r)):
        out[f'own_{side}'] = own
        for i, (ex, body) in enumerate(docs):
            out[f'ex{i}_{side}'] = B(ex); out[f'body{i}_{side}'] = body
    return out
for tag in ('q11', 'q12'):
    smt_judge(tag, [(sid, usage_vals(l, r)) for sid, l, r in USAGE_CHANGES],
              '(or (distinct ex0_L ex0_R) (distinct ex1_L ex1_R) (distinct body0_L body0_R) (distinct body1_L body1_R))')

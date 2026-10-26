# RUN-z3-observer-pairs: the queries behind AUD-7.1 (content/audit/AUD-7.1.yaml), in the Bench image.
# Tags are neutral so that a receipt line never names a case's key:
#   q1, q2  the pair: Search(frank, "layoffs") with a result count (q1 one member, q2 the other)
#   q3, q4  variant pair v1: Open(frank, "layoffs-memo") with two refusal codes or one
# For each case: [qN proof] is the self-composition query with the case's own observer (what the agent ran);
# [qN premises] is Rel plus "the secret differs", so the proof is not vacuous; [qN client] is the same query with
# the observer a client of frank's actually has: the whole response. Each [qN sK ...] line evaluates the case's
# observer on one concrete pair of responses: "apart" when the observer tells them apart, "equal" when it does not.
from z3 import *

RLIMIT = 5000000
N = 3  # document slots per world; slot 0 stands for Birch's private layoffs-memo
print(f"z3 {get_version_string()} rlimit={RLIMIT}")

count = lambda bs: Sum([If(b, 1, 0) for b in bs])

def world(side):
    return [(Bool(f'exists{i}_{side}'), Bool(f'readable{i}_{side}'), Bool(f'matches{i}_{side}')) for i in range(N)]

def rel(L, R):  # the worlds agree on what Acme may know: which slots frank can read, and those slots' contents
    return And([And(rL == rR, Implies(rL, And(eL == eR, mL == mR))) for (eL, rL, mL), (eR, rR, mR) in zip(L, R)])

def secret_differs(L, R):
    return Or([Or(eL != eR, mL != mR) for (eL, rL, mL), (eR, rR, mR) in zip(L, R)])

# ---- the pair: Search(frank, "layoffs") returns {hits, total}
def search_q1(W):
    hits = count([And(e, r, m) for e, r, m in W])     # readable matches: the JSON body
    total = count([And(e, r, m) for e, r, m in W])    # the result count
    return hits, total

def observe_q1(hits, total):
    return [hits, total]

def search_q2(W):
    hits = count([And(e, r, m) for e, r, m in W])     # readable matches: the JSON body
    total = count([And(e, m) for e, r, m in W])       # the result count
    return hits, total

def observe_q2(hits, total):
    return [hits]

def client_search(hits, total):                       # a client reads the whole response
    return [hits, total]

def selfcomp(tag, what, search, observe):
    L, R = world('L'), world('R')
    oL, oR = observe(*search(L)), observe(*search(R))
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), Or([a != b for a, b in zip(oL, oR)]))
    r = s.check()
    line = f'[{tag} {what}] {r}'
    if r == sat:
        m = s.model(); ev = lambda v: m.eval(v, model_completion=True)
        (hL, tL), (hR, tR) = search(L), search(R)
        line += f' | hits L={ev(hL)} R={ev(hR)} | total L={ev(tL)} R={ev(tR)}'
    print(line)

def premises(tag):
    L, R = world('L'), world('R')
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), secret_differs(L, R))
    print(f'[{tag} premises] {s.check()}')

SEARCH_PAIRS = [  # (id, hits L, total L, hits R, total R)
    ('s1', 0, 1, 0, 0),
    ('s2', 1, 1, 0, 0),
    ('s3', 1, 2, 1, 2),
    ('s4', 2, 3, 2, 2),
]

def scenarios(tag, observe):
    for sid, hL, tL, hR, tR in SEARCH_PAIRS:
        a, b = observe(IntVal(hL), IntVal(tL)), observe(IntVal(hR), IntVal(tR))
        apart = simplify(Or([x != y for x, y in zip(a, b)]))
        print(f'[{tag} {sid} L hits={hL} total={tL} R hits={hR} total={tR}] {"apart" if is_true(apart) else "equal"}')

for tag, search, observe in [('q1', search_q1, observe_q1), ('q2', search_q2, observe_q2)]:
    selfcomp(tag, 'proof', search, observe)
    premises(tag)
    selfcomp(tag, 'client', search, client_search)
    scenarios(tag, observe)

# ---- variant pair v1: Open(frank, "layoffs-memo") returns (code, body); code 0 not_found, 1 forbidden, 2 page
def open_related():
    eL, eR = Bools('exists_L exists_R')
    mL, mR = Bools('mayread_L mayread_R')
    bL, bR = Ints('body_L body_R')
    return (eL, mL, bL), (eR, mR, bR), And(mL == mR, Implies(mL, And(eL == eR, bL == bR)))

def open_q3(exists, mayread, body):
    code = If(Not(exists), 0, If(Not(mayread), 1, 2))
    return code, If(code == 2, body, 0)

def view_q3(code, body):
    return [body]

def open_q4(exists, mayread, body):
    code = If(And(exists, mayread), 2, 0)
    return code, If(code == 2, body, 0)

def view_q4(code, body):
    return [code, body]

def client_open(code, body):
    return [code, body]

def open_selfcomp(tag, what, impl, view):
    L, R, rel_o = open_related()
    (cL, xL), (cR, xR) = impl(*L), impl(*R)
    oL, oR = view(cL, xL), view(cR, xR)
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel_o, Or([a != b for a, b in zip(oL, oR)]))
    r = s.check()
    line = f'[{tag} {what}] {r}'
    if r == sat:
        m = s.model(); ev = lambda v: m.eval(v, model_completion=True)
        line += f' | code L={ev(cL)} R={ev(cR)} | body L={ev(xL)} R={ev(xR)}'
    print(line)

def open_premises(tag):
    L, R, rel_o = open_related()
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel_o, L[0] != R[0])
    print(f'[{tag} premises] {s.check()}')

OPEN_PAIRS = [  # (id, code L, body L, code R, body R)
    ('s1', 1, 0, 0, 0),
    ('s2', 2, 7, 2, 7),
    ('s3', 2, 7, 0, 0),
]

def open_scenarios(tag, view):
    for sid, cL, bL, cR, bR in OPEN_PAIRS:
        a, b = view(IntVal(cL), IntVal(bL)), view(IntVal(cR), IntVal(bR))
        apart = simplify(Or([x != y for x, y in zip(a, b)]))
        print(f'[{tag} {sid} L code={cL} body={bL} R code={cR} body={bR}] {"apart" if is_true(apart) else "equal"}')

for tag, impl, view in [('q3', open_q3, view_q3), ('q4', open_q4, view_q4)]:
    open_selfcomp(tag, 'proof', impl, view)
    open_premises(tag)
    open_selfcomp(tag, 'client', impl, client_open)
    open_scenarios(tag, view)

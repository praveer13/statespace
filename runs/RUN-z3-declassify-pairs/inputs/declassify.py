# RUN-z3-declassify-pairs: the queries behind AUD-7.2 (content/audit/AUD-7.2.yaml), in the Bench image.
# Tags are neutral so that a receipt line never names a case's key:
#   q1, q2  the pair: tenant isolation for the sharing release (Birch shares documents with Acme)
#   q3, q4  variant pair v1: tenant isolation for the usage panel (Acme sees the platform-wide document count)
# [qN proof] is the self-composition query with the case's own view and relation (what the agent ran);
# [qN premises] is the relation plus "Birch's data differs", so the proof is not vacuous. Each [qN sK] line
# evaluates the case's relation on one concrete change from world L to world R, a change Acme's view shows:
# the statement "allows" it when the two worlds are not related (Acme may learn the difference), and "forbids"
# it when they are related (the statement requires Acme's view to stay the same).
from z3 import *

RLIMIT = 5000000
HIDDEN = -1
print(f"z3 {get_version_string()} rlimit={RLIMIT}")

class World:
    def __init__(self, side):
        self.own_A = Int(f'own_A_{side}')                                   # Acme's own document
        self.docs_B = [(Int(f'body{i}_{side}'), Bool(f'shared{i}_{side}')) for i in range(2)]   # Birch's documents

def shares_agree(L, R):  # DCL-7.1: the title and body of each document Birch shares with Acme, while shared
    return And([And(shL == shR, Implies(shL, cL == cR)) for (cL, shL), (cR, shR) in zip(L.docs_B, R.docs_B)])

# ---- the pair
def view_q1(W):
    return [W.own_A] + [If(sh, c, HIDDEN) for c, sh in W.docs_B]

def rel_q1(L, R):
    return And(L.own_A == R.own_A, shares_agree(L, R))

def view_q2(W):
    return [W.own_A] + [HIDDEN for c, sh in W.docs_B]

def rel_q2(L, R):
    return And(L.own_A == R.own_A)

def birch_differs(L, R):
    return Or([Or(cL != cR, shL != shR) for (cL, shL), (cR, shR) in zip(L.docs_B, R.docs_B)])

def proof(tag, view, rel):
    L, R = World('L'), World('R')
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), Or([a != b for a, b in zip(view(L), view(R))]))
    print(f'[{tag} proof] {s.check()}')

def premises(tag, rel):
    L, R = World('L'), World('R')
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), birch_differs(L, R))
    print(f'[{tag} premises] {s.check()}')

SHARE_CHANGES = [  # (id, world L, world R): (Acme's own body, [(Birch body, shared with Acme)])
    ('s1', (5, [(10, True), (20, False)]), (5, [(11, True), (20, False)])),   # Birch edits a shared document
    ('s2', (5, [(10, True), (20, False)]), (5, [(10, True), (21, False)])),   # Birch edits a private document
    ('s3', (5, [(10, True), (20, False)]), (5, [(10, True), (20, True)])),    # Birch shares a second document
    ('s4', (5, [(10, True), (20, False)]), (6, [(10, True), (20, False)])),   # Acme edits its own document
]

def judge(tag, rel, changes, mk):
    for sid, l, r in changes:
        L, cl = mk(*l)
        R, cr = mk(*r)
        s = Solver(); s.set('rlimit', RLIMIT)
        s.add(cl, cr, rel(L, R))
        related = s.check() == sat
        print(f'[{tag} {sid}] {"forbids" if related else "allows"}')

for tag, view, rel in [('q1', view_q1, rel_q1), ('q2', view_q2, rel_q2)]:
    proof(tag, view, rel)
    premises(tag, rel)

class Pair:  # fresh variables for each side of a concrete change
    n = 0
    @classmethod
    def share(cls, own, docs):
        cls.n += 1
        W = World(f'k{cls.n}')
        return W, And(W.own_A == own, *[And(c == body, sh == BoolVal(shared)) for (c, sh), (body, shared) in zip(W.docs_B, docs)])

for tag, rel in [('q1', rel_q1), ('q2', rel_q2)]:
    judge(tag, rel, SHARE_CHANGES, Pair.share)

# ---- variant pair v1: the usage panel
class Usage:
    def __init__(self, side):
        self.own_A = Int(f'u_own_A_{side}')
        self.exists_B = [Bool(f'u_exists{i}_{side}') for i in range(2)]   # Birch's private documents
        self.body_B = [Int(f'u_body{i}_{side}') for i in range(2)]

count = lambda bs: Sum([If(b, 1, 0) for b in bs])

def view_q3(W):
    return [W.own_A, 1 + count(W.exists_B)]          # Acme's document, and the platform-wide document count

def rel_q3(L, R):
    return And(L.own_A == R.own_A, count(L.exists_B) == count(R.exists_B))   # DCL-7.2: the platform-wide count

def view_q4(W):
    return [W.own_A, 1]

def rel_q4(L, R):
    return And(L.own_A == R.own_A)

def usage_differs(L, R):
    return Or([Or(a != b, x != y) for a, b, x, y in zip(L.exists_B, R.exists_B, L.body_B, R.body_B)])

def uproof(tag, view, rel):
    L, R = Usage('L'), Usage('R')
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), Or([a != b for a, b in zip(view(L), view(R))]))
    print(f'[{tag} proof] {s.check()}')

def upremises(tag, rel):
    L, R = Usage('L'), Usage('R')
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), usage_differs(L, R))
    print(f'[{tag} premises] {s.check()}')

USAGE_CHANGES = [  # (id, world L, world R): (Acme's own body, [(Birch document exists, its body)])
    ('s1', (5, [(True, 10), (False, 0)]), (5, [(True, 10), (True, 20)])),    # Birch creates a private document
    ('s2', (5, [(True, 10), (False, 0)]), (5, [(True, 11), (False, 0)])),    # Birch edits a private document
    ('s3', (5, [(True, 10), (False, 0)]), (6, [(True, 10), (False, 0)])),    # Acme edits its own document
]

class UPair:
    n = 0
    @classmethod
    def usage(cls, own, docs):
        cls.n += 1
        W = Usage(f'k{cls.n}')
        return W, And(W.own_A == own, *[And(e == BoolVal(ex), b == body) for e, b, (ex, body) in zip(W.exists_B, W.body_B, docs)])

for tag, view, rel in [('q3', view_q3, rel_q3), ('q4', view_q4, rel_q4)]:
    uproof(tag, view, rel)
    upremises(tag, rel)
for tag, rel in [('q3', rel_q3), ('q4', rel_q4)]:
    judge(tag, rel, USAGE_CHANGES, UPair.usage)

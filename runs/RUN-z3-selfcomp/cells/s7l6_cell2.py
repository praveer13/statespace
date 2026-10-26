from z3 import *

# One request: Open(frank, "layoffs-memo"). Per world, the view reads three facts:
#   exists: is there such a document?  mayread: may frank read it?  body: its text.
# A response is a pair (code, body): code 0 = not_found, 1 = forbidden, 2 = page.

def open_v0(exists, mayread, body):
    code = If(Not(exists), 0, If(Not(mayread), 1, 2))
    return code, If(code == 2, body, 0)

def open_v1(exists, mayread, body):          # one answer for both refusals
    code = If(And(exists, mayread), 2, 0)
    return code, If(code == 2, body, 0)

def related():
    eL, eR = Bools('exists_L exists_R')
    mL, mR = Bools('mayread_L mayread_R')
    bL, bR = Ints('body_L body_R')
    # Rel: the worlds agree on what Acme may know.
    rel = And(mL == mR, Implies(mL, And(eL == eR, bL == bR)))
    return (eL, mL, bL), (eR, mR, bR), rel

def leak(view):
    L, R, rel = related()
    (cL, xL), (cR, xR) = view(*L), view(*R)
    s = Solver()
    s.add(rel, Or(cL != cR, xL != xR))       # the negated conclusion: the responses differ
    return s.check()

def premise_witness():
    L, R, rel = related()
    s = Solver()
    s.add(rel, L[0] != R[0])                 # Rel holds and the secret differs
    return s.check()

print('v0', leak(open_v0))
print('v1', leak(open_v1))
print('premise witness', premise_witness())

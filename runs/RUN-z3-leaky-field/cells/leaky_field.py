# RUN-z3-leaky-field: the self-composition query behind S7.L7 cell 1 (s7l7_cell1.txt, copied verbatim from the
# lesson). The cell is in the pair notation, which no engine reads yet, so this script states it in Z3 the way
# S7.L6's cell 2 states Open: one copy of the state per world, the view once per world, the negated conclusion.
# Per world, the view reads contract's facts: exists, mayread (dana may read it: contract is shared with her),
# and the page fields title, body, owner_team, internal_notes (Ints standing for their text).
# Rel (~Acme with the release): the worlds agree on mayread, and where dana may read contract they agree on its
# existence and on the released title and body. A response is (code, title, body, owner_team, internal_notes):
# code 0 = not_found, 2 = page; a not_found response carries zeros.
from z3 import *

RLIMIT = 5000000
FIELDS = ['title', 'body', 'owner_team', 'internal_notes']

def world(side):
    e, m = Bools(f'exists_{side} mayread_{side}')
    fs = {f: Int(f'{f}_{side}') for f in FIELDS}
    return e, m, fs

def open_view(e, m, fs, shown):
    code = If(And(e, m), 2, 0)
    return [code] + [If(code == 2, fs[f], 0) for f in shown]

def rel(L, R):
    (eL, mL, fL), (eR, mR, fR) = L, R
    return And(mL == mR, Implies(mL, And(eL == eR, fL['title'] == fR['title'], fL['body'] == fR['body'])))

def ask(label, shown, extra=lambda L, R: True):
    L, R = world('L'), world('R')
    oL, oR = open_view(*L, shown), open_view(*R, shown)
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.add(rel(L, R), extra(L, R), Or([x != y for x, y in zip(oL, oR)]))
    r = s.check()
    line = f'{label}: {r}'
    if r == sat:
        m = s.model()
        ev = lambda v: m.eval(v, model_completion=True)
        differ = [f for f in FIELDS if ev(L[2][f]).as_long() != ev(R[2][f]).as_long()]
        line += f' | both pages shown: {is_true(ev(And(L[0], L[1], R[0], R[1])))} | state fields that differ: {differ}'
        line += f' | responses differ in: {[n for n, x, y in zip(["code"] + shown, oL, oR) if ev(x).as_long() != ev(y).as_long()]}'
    elif r == unknown:
        line += f' ({s.reason_unknown()})'
    print(line)

def lesson_pair(L, R):                    # right = left with a different contract.internal_notes, contract shared
    (eL, mL, fL), (eR, mR, fR) = L, R
    return And(eL, mL, eR == eL, mR == mL, *[fL[f] == fR[f] for f in FIELDS if f != 'internal_notes'],
               fL['internal_notes'] != fR['internal_notes'])

def premise(label):                       # Rel holds and an unreleased field differs
    L, R = world('L'), world('R')
    s = Solver(); s.set('rlimit', RLIMIT)
    s.add(rel(L, R), L[2]['internal_notes'] != R[2]['internal_notes'])
    print(f'{label}: {s.check()}')

ask('self-composition, page with internal_notes', FIELDS)
ask('the lesson pair, page with internal_notes', FIELDS, lesson_pair)
ask('the lesson pair, internal_notes dropped from the page', [f for f in FIELDS if f != 'internal_notes'], lesson_pair)
ask('self-composition, internal_notes dropped from the page', [f for f in FIELDS if f != 'internal_notes'])
premise('premise witness: Rel and a different internal_notes')

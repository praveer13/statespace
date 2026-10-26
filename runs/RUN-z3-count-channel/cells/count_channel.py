# RUN-z3-count-channel: the self-composition query behind S7.L7 cell 3 (s7l7_cell3.txt, copied verbatim from the
# lesson). The cell is in the pair notation, which no engine reads yet, so this script states it in Z3 the way
# S7.L6's cell 2 states Open. The world holds three document slots; slot 0 stands for Birch's private
# layoffs-memo. Per slot: exists, readable (frank can read it), matches (its title matches "layoffs").
# Rel (~Acme): the worlds agree on which slots frank can read, and on the existence and title match of those.
# Search(frank, "layoffs") answers {hits, total}: hits counts readable matches, total counts every match
# (counted before the filter), as the cell's view says.
from z3 import *

RLIMIT = 5000000
N = 3

def world(side):
    return [(Bool(f'exists{i}_{side}'), Bool(f'readable{i}_{side}'), Bool(f'matches{i}_{side}')) for i in range(N)]

count = lambda bs: Sum([If(b, 1, 0) for b in bs])

def search(W, total_after_filter=False):
    hits = count([And(e, r, m) for e, r, m in W])
    total = hits if total_after_filter else count([And(e, m) for e, r, m in W])
    return hits, total

def rel(L, R):
    return And([And(rL == rR, Implies(rL, And(eL == eR, mL == mR))) for (eL, rL, mL), (eR, rR, mR) in zip(L, R)])

def lesson_pair(L, R):                    # left W0, right W0 without layoffs-memo (slot 0: Birch private, a match)
    (e0L, r0L, m0L), (e0R, r0R, m0R) = L[0], R[0]
    same = [And(eL == eR, rL == rR, mL == mR) for (eL, rL, mL), (eR, rR, mR) in zip(L[1:], R[1:])]
    return And(e0L, Not(e0R), Not(r0L), Not(r0R), m0L, m0R, *same)

def ask(label, after_filter=False, extra=lambda L, R: True):
    L, R = world('L'), world('R')
    (hL, tL), (hR, tR) = search(L, after_filter), search(R, after_filter)
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.add(rel(L, R), extra(L, R), Or(hL != hR, tL != tR))
    r = s.check()
    line = f'{label}: {r}'
    if r == sat:
        m = s.model()
        ev = lambda v: m.eval(v, model_completion=True)
        line += f' | hits L={ev(hL)} R={ev(hR)} | total L={ev(tL)} R={ev(tR)}'
    elif r == unknown:
        line += f' ({s.reason_unknown()})'
    print(line)

ask('self-composition, total counted before the filter')
ask('the lesson pair, total counted before the filter', extra=lesson_pair)
ask('the lesson pair, total counted after the filter', True, lesson_pair)
ask('self-composition, total counted after the filter', True)
L, R = world('L'), world('R')
s = Solver(); s.set('rlimit', RLIMIT)
s.add(rel(L, R), lesson_pair(L, R))
print('premise witness: Rel and the lesson pair, layoffs-memo in one world only:', s.check())

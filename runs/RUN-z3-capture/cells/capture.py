# RUN-z3-capture: the Derivation Board cell 3 of S4.L2 (s4l2_cell3.txt, copied verbatim from the lesson), one Z3
# query per line. No engine reads the derivation notation yet, so this script states each line as the cell's
# @direction describes: line 3 asks for a state where line 1 and line 2 disagree, lines 4 and 5 for a state where
# the implication fails; unsat makes the line valid, sat prints the state. Line 2 is also checked against the
# capture-free substitution done by Z3 (bal replaced by Store(bal, k, bal[k] - amt) under a renamed bound j).
from z3 import *

RLIMIT = 5000000
bal = Array('bal', IntSort(), IntSort())
k, amt = Ints('k amt')
kb, j = Int('k'), Int('j')                        # the post's bound k (same name as the parameter), and the renamed j
given = amt > 0
post_bound = lambda B, v: ForAll([v], B[v] >= 0)

naive = ForAll([kb], bal[kb] - amt >= 0)                         # line 1: the parameter k falls under the quantifier
free = And(bal[k] - amt >= 0, ForAll([j], Implies(j != k, bal[j] >= 0)))   # line 2, as written
reference = post_bound(Store(bal, k, bal[k] - amt), j)           # rename k to j, then substitute

def q(label, *facts, show_bal=False):
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.add(given, *facts)
    r = s.check()
    line = f'{label}: {r}'
    if r == sat:
        m = s.model()
        K, A = m.eval(k, model_completion=True), m.eval(amt, model_completion=True)
        line += f' [k = {K}, amt = {A}' + (f', bal = {m.eval(bal, model_completion=True)}' if show_bal else '') + ']'
    elif r == unknown:
        line += f' ({s.reason_unknown()})'
    print(line)
    return s, r

q('line 2 against the capture-free substitution, a state where they differ', free != reference)
q('line 3 equivalence, a state where line 1 and line 2 disagree', naive != free)
q('line 4 consequence, line 1 => line 2 fails', naive, Not(free))
s, r = q('line 5 consequence reverse, line 2 => line 1 fails', free, Not(naive), show_bal=True)
if r == sat:                                       # replay the witness: an account other than k with 0 <= bal(j) < amt
    m = s.model()
    w = Int('w')
    t = Solver(); t.set('rlimit', RLIMIT)
    t.add(w != m.eval(k, model_completion=True),
          m.eval(bal[w], model_completion=True) >= 0, m.eval(bal[w], model_completion=True) < m.eval(amt, model_completion=True))
    print('  witness has an account j != k with 0 <= bal(j) < amt:', t.check())

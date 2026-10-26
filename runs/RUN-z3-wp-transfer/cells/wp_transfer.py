# RUN-z3-wp-transfer: the Derivation Board cells of S4.L2 (cells 1 and 2) and S4.L3 (cell 1), one Z3 query per line.
# The cells are plain-text derivations (s4l2_cell1.txt, s4l2_cell2.txt, s4l3_cell1.txt, copied verbatim from the
# lessons); no engine reads that notation yet, so this script states each line as the cell's @direction describes:
# an assignment or substitution line asks for a state where it and the line before disagree; a consequence line
# P => P' asks for a state where the implication fails. unsat makes the line valid; sat prints the state.
# Substitution is Z3's own substitute(), so the rule is applied by the tool and the cell's text is checked against it.
from z3 import *

RLIMIT = 5000000

def q(label, *facts):
    s = Solver()
    s.set('rlimit', RLIMIT)
    s.add(*facts)
    r = s.check()
    line = f'{label}: {r}'
    if r == sat:
        m = s.model()
        line += ' ' + str(sorted((d.name(), str(m[d])) for d in m.decls() if m[d].sort_kind() != Z3_ARRAY_SORT))
    elif r == unknown:
        line += f' ({s.reason_unknown()})'
    print(line)
    return r

# ---- S4.L2 cell 1: fee := fee + 2, post fee <= 10, claim fee <= 7 ----
fee = Int('fee')
post = fee <= 10
claim = fee <= 7
l1 = substitute(post, (fee, fee + 2))             # (fee <= 10)[fee -> fee + 2]
l2 = fee + 2 <= 10                                # the cell's line 2, as written
print('S4.L2 cell 1')
q('  line 1-2 substitute, a state where line 2 differs from the substitution', l1 != l2)
q('  line 3 consequence, claim => line 2 fails', claim, Not(l2))
q('  line 4 consequence reverse, line 2 => claim fails', l2, Not(claim))

# ---- S4.L2 cell 2: sequential (A) and simultaneous (B) update of bal ----
bal = Array('bal', IntSort(), IntSort())
f, t, x, y, z, amt, S = Ints('f t x y z amt S')
given = And(Or(f == x, f == y, f == z), Or(t == x, t == y, t == z), amt > 0)
postf = lambda B: B[x] + B[y] + B[z] == S
debited = Store(bal, f, bal[f] - amt)
upd_A = Store(debited, t, debited[t] + amt)       # second update reads the function the first produced
upd_B = Store(debited, t, bal[t] + amt)           # both new values read from the old bal
wpA, wpB = postf(upd_A), postf(upd_B)
print('S4.L2 cell 2')
q('  line 3 equivalence, a state where wp(A) and wp(B) disagree', given, wpA != wpB)
q('  the same, with f != t', given, f != t, wpA != wpB)
q('  the same, with f == t', given, f == t, wpA != wpB)

# ---- S4.L3 cell 1: Transfer, requires amount <= a; a := a - amount; b := b + amount; Inv = a >= 0 and b >= 0 ----
a, b, amount = Ints('a b amount')
Inv = And(a >= 0, b >= 0)
g = amount <= a
r1 = substitute(Inv, (b, b + amount))
c1 = And(a >= 0, b + amount >= 0)                 # the cell's line 1, as written
r2 = substitute(c1, (a, a - amount))
c2 = And(a - amount >= 0, b + amount >= 0)        # the cell's line 2, as written
c3 = And(Implies(g, c2), Implies(Not(g), Inv))    # line 3, guard, reject reading
c4 = Implies(g, c2)                               # line 4, candidate, assume reading
print('S4.L3 cell 1')
q('  line 1 assignment, a state where line 1 differs from the substitution', r1 != c1)
q('  line 2 sequence then assignment, a state where line 2 differs from the substitution', r2 != c2)
q('  line 5 equivalence, a state where line 4 and line 3 disagree', c4 != c3)
q('  line 5, a disagreement where the guard holds', c4 != c3, g)
q('  line 5, a disagreement where Inv holds', c4 != c3, Inv)
q('  line 5, a disagreement where the guard fails and Inv fails', c4 != c3, Not(g), Not(Inv))

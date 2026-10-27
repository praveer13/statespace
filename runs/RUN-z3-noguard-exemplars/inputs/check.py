# RUN-z3-noguard-exemplars: AUD-4.2's variant pairs v2 to v4 (content/audit/AUD-4.2.yaml). For each case: the query
# as checked; the same step with every conjunct of the declared Inv after it ([qN full]); one probe per pair of what
# the checked conclusion still catches; and the step-3 scenarios. A query "rules out" a result when the result meets
# the query's assertions about the post-state, that is, when it is one of the violations the unsat excludes. Tags are
# neutral: q5/q6 v2 (sound/flawed), q7/q8 v3 (sound/flawed), q9/q10 v4 (sound/flawed).
import z3
from z3 import Solver, Ints, Int, And, Not, Function, IntSort, parse_smt2_string, sat

print('z3', z3.get_version_string())

def text(tag):
    return open(f'{tag}.smt2').read()

def check_text(t):
    s = Solver(); s.from_string(t); return s.check()

def last_assert(t):
    return [l for l in t.splitlines() if l.startswith('(assert')][-1]

def decls(t):
    return '\n'.join(l for l in t.splitlines() if l.startswith('(declare') or l.startswith('(define-fun'))

for tag in ('q5', 'q6', 'q7', 'q8'):
    print(f'[{tag} check] {check_text(text(tag))}')

# v2 (q5, q6): the declared Inv after the step, and the same query with the guard (<= amt (bal x)) dropped.
INV_P = '(assert (not (forall ((i Int)) (=> (and (<= 1 i) (<= i 2)) (>= (bal_p i) 0)))))'
for tag in ('q5', 'q6'):
    t = text(tag)
    print(f'[{tag} full] {check_text(t.replace(last_assert(t), INV_P))}')
    print(f'[{tag} without guard] {check_text(t.replace("(assert (and (> amt 0) (<= amt (bal x))))", "(assert (> amt 0))"))}')

# v3 (q7, q8): every conjunct of Inv after the step, and whether the dropped conjunct follows from the ones kept.
a_p, b_p, f_p = Ints('a_p b_p f_p')
FULL = '(assert (not (Inv a_p b_p f_p)))'
for tag, kept, dropped in (('q7', [a_p >= 0, b_p >= 0, f_p >= 0, a_p + b_p + f_p == 100], f_p <= 100),
                           ('q8', [b_p >= 0, f_p >= 0, f_p <= 100, a_p + b_p + f_p == 100], a_p >= 0)):
    t = text(tag)
    print(f'[{tag} full] {check_text(t.replace(last_assert(t), FULL))}')
    s = Solver(); s.add(*kept, Not(dropped)); r = s.check()
    print(f'[{tag} implied] {r}' + (f' a_p={s.model()[a_p]} b_p={s.model()[b_p]} f_p={s.model()[f_p]}' if r == sat else ''))

# v4 (q9, q10): the Z3Py queries, the declared Inv after the step, and the same query on a step that creates one unit.
a, b, amount = Ints('a b amount')
Inv = lambda x, y: And(x >= 0, y >= 0, x + y == 100)
POSTS = {
    'q9': lambda: [Not(And(a_p >= 0, b_p >= 0, a_p + b_p == 100))],
    'q10': lambda: [Not(And(a_p >= 0, b_p >= 0)), a_p + b_p == 100],
}
def q(tag, step_b):
    s = Solver()
    s.add(Inv(a, b))
    s.add(amount > 0, amount <= a)
    s.add(a_p == a - amount, b_p == step_b)
    s.add(*POSTS[tag]())
    return s.check()
for tag in ('q9', 'q10'):
    print(f'[{tag} check] {q(tag, b + amount)}')
    s = Solver(); s.add(Inv(a, b), amount > 0, amount <= a, a_p == a - amount, b_p == b + amount, Not(Inv(a_p, b_p)))
    print(f'[{tag} full] {s.check()}')
    print(f'[{tag} step b_p == b + amount + 1] {q(tag, b + amount + 1)}')

# Step-3 scenarios.
for tag, results in (('q5', None), ('q6', None)):
    t = text(tag)
    for sid, x, y in (('s1', 50, 30), ('s2', -10, 90), ('s3', -5, -5), ('s4', 0, 80)):
        s = Solver(); s.from_string(decls(t) + f'\n(assert (= (bal_p 1) {x}))\n(assert (= (bal_p 2) {y}))\n' + last_assert(t))
        print(f'[{tag} {sid} bal_p(1)={x} bal_p(2)={y}] ruled out: {"yes" if s.check() == sat else "no"}')
for tag in ('q7', 'q8'):
    t = text(tag)
    for sid, x, y, z in (('s1', 60, 39, 1), ('s2', -5, 100, 5), ('s3', 50, 40, 20), ('s4', 30, 60, 0)):
        s = Solver(); s.from_string(decls(t) + f'\n(assert (= a_p {x}))\n(assert (= b_p {y}))\n(assert (= f_p {z}))\n' + last_assert(t))
        print(f'[{tag} {sid} a_p={x} b_p={y} f_p={z}] ruled out: {"yes" if s.check() == sat else "no"}')
for tag in ('q9', 'q10'):
    for sid, x, y in (('s1', 50, 50), ('s2', 50, 60), ('s3', -20, 120), ('s4', -20, 130)):
        s = Solver(); s.add(a_p == x, b_p == y, *POSTS[tag]())
        print(f'[{tag} {sid} a_p={x} b_p={y}] ruled out: {"yes" if s.check() == sat else "no"}')

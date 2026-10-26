# AUD-4.2's queries (content/audit/AUD-4.2.yaml): each obligation as checked, the same obligation with every conjunct
# of the declared Inv after the step, and the step-3 scenarios. Query tags are neutral.
import z3
from z3 import Solver, Optimize, Int, Ints, And, Not, sat

print('z3', z3.get_version_string())

def run(tag):
    s = Solver(); s.from_file(f'{tag}.smt2')
    print(f'[{tag} check] {s.check()}')

def full(tag, text):
    """The same file with its last assertion replaced by the negation of every conjunct the comment or Inv names."""
    s = Solver(); s.from_string(text)
    r = s.check(); print(f'[{tag} full] {r}')
    return r

for tag in ('q1', 'q2', 'q3', 'q4'):
    run(tag)

# Transfer (q1, q2): the declared Inv after the step.
for tag in ('q1', 'q2'):
    text = open(f'{tag}.smt2').read().replace('(assert (not (= (+ a_p b_p) 100)))', '(assert (not (Inv a_p b_p)))')
    if full(tag, text) == sat:
        o = Optimize(); o.from_string(text.replace('(check-sat)', ''))
        amount = Int('amount'); o.minimize(amount)
        o.check(); m = o.model()
        print(f'[{tag} full min amount] {m[amount]} (a={m[Int("a")]} b={m[Int("b")]} a_p={m[Int("a_p")]} b_p={m[Int("b_p")]})')

# Capture (q3, q4): every conjunct of Inv after the step, and whether the dropped conjunct follows from the other two.
bal_p, held_p = Ints('bal_p held_p')
for tag, kept, dropped in (('q3', [0 <= held_p, held_p <= bal_p], 0 <= bal_p), ('q4', [0 <= held_p, 0 <= bal_p], held_p <= bal_p)):
    text = open(f'{tag}.smt2').read()
    text = text.replace(text.splitlines()[-2], '(assert (not (and (<= 0 held_p) (<= held_p bal_p) (<= 0 bal_p))))')
    full(tag, text)
    s = Solver(); s.add(*kept, Not(dropped))
    r = s.check()
    print(f'[{tag} implied] {r}' + (f' held_p={s.model()[held_p]} bal_p={s.model()[bal_p]}' if r == sat else ''))

# Step-3 scenarios: does the checked query rule out this result? It does when the conclusion it checks is false there.
a_p, b_p = Ints('a_p b_p')
for tag in ('q1', 'q2'):
    for sid, x, y in (('s1', 50, 50), ('s2', -20, 120), ('s3', 50, 60), ('s4', -20, 130)):
        s = Solver(); s.add(a_p == x, b_p == y, a_p + b_p == 100)
        out = s.check() != sat
        print(f'[{tag} {sid} a_p={x} b_p={y}] ruled out: {"yes" if out else "no"}')
for tag, post in (('q3', lambda b, h: And(0 <= h, h <= b)), ('q4', lambda b, h: And(0 <= h, 0 <= b))):
    for sid, b, h in (('s1', 5, 2), ('s2', 3, 5), ('s3', -1, 0), ('s4', 2, -1)):
        s = Solver(); s.add(bal_p == b, held_p == h, post(bal_p, held_p))
        print(f'[{tag} {sid} bal_p={b} held_p={h}] ruled out: {"yes" if s.check() != sat else "no"}')

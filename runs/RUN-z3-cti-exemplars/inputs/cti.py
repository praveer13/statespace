# RUN-z3-cti-exemplars: AUD-4.3's variant pairs v2 to v5 (content/audit/AUD-4.3.yaml), as cti.py of
# RUN-z3-cti-variants computes v1. Each pair is one model in two forms that differ in one command: in one form a
# command breaks the auxiliary fact the invariant needs, so the violation is reachable; in the other nothing does.
# For each form: the inductive step of the invariant and, when it is sat, whether its pre-state breaks that fact; a
# bounded search from Init (N = 6) for a violation; the step of the strengthened invariant; the same two checks after
# the agent's edit; and the step-3 scenarios, each a state searched for from Init. Each case's statement is the block
# between its "--- qN" markers below, verbatim. q11 and q12 are SMT-LIB: their inductive step is the file itself
# (q11.smt2, q12.smt2, and the edited q11e.smt2, q12e.smt2), and the search runs the same commands in Z3Py.
# Tags are neutral: q5/q6 v2, q7/q8 v3, q9/q10 v4, q11/q12 v5, each sound/flawed.
import inspect
import z3
from z3 import Solver, Int, Ints, And, Or, Not, sat

N = 6
print('z3', z3.get_version_string(), 'bound N =', N)

def reach(step, width, init, goal, bound=N):
    """The smallest k <= bound with a run of k steps from Init that ends where goal holds, or None."""
    takes_n = len(inspect.signature(step).parameters) == 3
    for k in range(bound + 1):
        s = [tuple(Int(f'v{i}_{j}') for j in range(width)) for i in range(k + 1)]
        q = Solver(); q.add(init(*s[0]))
        for i in range(k):
            q.add(step(s[i], s[i + 1], Int(f'n{i}')) if takes_n else step(s[i], s[i + 1]))
        q.add(goal(*s[k]))
        if q.check() == sat:
            return k
    return None

def found(k):
    return 'no' if k is None else f'yes, at step {k}'

def inductive(step, width, pre, post):
    a = [Int(f'a{j}') for j in range(width)]; b = [Int(f'b{j}') for j in range(width)]
    takes_n = len(inspect.signature(step).parameters) == 3
    q = Solver(); q.add(pre(*a), step(a, b, Int('n')) if takes_n else step(a, b), Not(post(*b)))
    r = q.check()
    return r, (q.model(), a) if r == sat else None

# ------------------------------------------------------------------ v2: seats on a flight
# --- q5 begin
# Init: cap >= 0, free == cap and booked == 0. The invariant to keep: free >= 0.
def step(s, t):
    (free, booked, cap), (free2, booked2, cap2) = s, t
    return Or(
        And(free > 0, free2 == free - 1, booked2 == booked + 1, cap2 == cap),         # Book
        And(booked > 0, free2 == free, booked2 == booked - 1, cap2 == cap),           # Cancel
        And(cap > booked, free2 == free - 1, booked2 == booked, cap2 == cap - 1))     # Shrink
# --- q5 end
seats_q5 = step
# --- q6 begin
# Init: cap >= 0, free == cap and booked == 0. The invariant to keep: free >= 0.
def step(s, t):
    (free, booked, cap), (free2, booked2, cap2) = s, t
    return Or(
        And(free > 0, free2 == free - 1, booked2 == booked + 1, cap2 == cap),         # Book
        And(booked > 0, free2 == free + 1, booked2 == booked - 1, cap2 == cap),       # Cancel
        And(cap > booked, free2 == free - 1, booked2 == booked, cap2 == cap - 1))     # Shrink
# --- q6 end
seats_q6 = step
def seats_edit(step):   # the agent's edit: Shrink also requires free > 0
    def edited(s, t):
        (free, booked, cap), (free2, booked2, cap2) = s, t
        return Or(And(step(s, t), Not(And(cap > booked, free2 == free - 1, booked2 == booked, cap2 == cap - 1))),
                  And(cap > booked, free > 0, free2 == free - 1, booked2 == booked, cap2 == cap - 1))
    return edited

# ------------------------------------------------------------------ v3: an escrow with disputes
# --- q7 begin
# Init: escrow >= 0 and disputed == 0. The invariant to keep: escrow >= 0.
def step(s, t, n):
    (escrow, disputed), (escrow2, disputed2) = s, t
    return And(n > 0, Or(
        And(n <= escrow - disputed, disputed2 == disputed + n, escrow2 == escrow),      # Dispute(n)
        And(n <= escrow, escrow2 == escrow - n, disputed2 == disputed),                 # Release(n)
        And(n <= disputed, disputed2 == disputed - n, escrow2 == escrow - n)))          # Refund(n)
# --- q7 end
escrow_q7 = step
# --- q8 begin
# Init: escrow >= 0 and disputed == 0. The invariant to keep: escrow >= 0.
def step(s, t, n):
    (escrow, disputed), (escrow2, disputed2) = s, t
    return And(n > 0, Or(
        And(n <= escrow - disputed, disputed2 == disputed + n, escrow2 == escrow),      # Dispute(n)
        And(n <= escrow - disputed, escrow2 == escrow - n, disputed2 == disputed),      # Release(n)
        And(n <= disputed, disputed2 == disputed - n, escrow2 == escrow - n)))          # Refund(n)
# --- q8 end
escrow_q8 = step
def escrow_edit(release_guard):   # the agent's edit: Refund also requires n <= escrow
    def edited(s, t, n):
        (escrow, disputed), (escrow2, disputed2) = s, t
        return And(n > 0, Or(
            And(n <= escrow - disputed, disputed2 == disputed + n, escrow2 == escrow),
            And(release_guard(escrow, disputed, n), escrow2 == escrow - n, disputed2 == disputed),
            And(n <= disputed, n <= escrow, disputed2 == disputed - n, escrow2 == escrow - n)))
    return edited

# ------------------------------------------------------------------ v4: a settlement batch
# --- q9 begin
# Init: queued == 0, settled == 0 and total == 0. The invariant to keep: settled <= total.
def step(s, t, n):
    (queued, settled, total), (queued2, settled2, total2) = s, t
    return And(n > 0, Or(
        And(queued2 == queued + n, total2 == total + n, settled2 == settled),            # Enqueue(n)
        And(n <= queued, queued2 == queued - n, settled2 == settled + n, total2 == total),  # Settle(n)
        And(n <= settled, settled2 == settled - n, queued2 == queued + 2 * n, total2 == total)))  # Requeue(n)
# --- q9 end
batch_q9 = step
# --- q10 begin
# Init: queued == 0, settled == 0 and total == 0. The invariant to keep: settled <= total.
def step(s, t, n):
    (queued, settled, total), (queued2, settled2, total2) = s, t
    return And(n > 0, Or(
        And(queued2 == queued + n, total2 == total + n, settled2 == settled),            # Enqueue(n)
        And(n <= queued, queued2 == queued - n, settled2 == settled + n, total2 == total),  # Settle(n)
        And(n <= settled, settled2 == settled - n, queued2 == queued + n, total2 == total)))      # Requeue(n)
# --- q10 end
batch_q10 = step
def batch_edit(requeue_k):   # the agent's edit: Settle also requires settled + n <= total
    def edited(s, t, n):
        (queued, settled, total), (queued2, settled2, total2) = s, t
        return And(n > 0, Or(
            And(queued2 == queued + n, total2 == total + n, settled2 == settled),
            And(n <= queued, settled + n <= total, queued2 == queued - n, settled2 == settled + n, total2 == total),
            And(n <= settled, settled2 == settled - n, queued2 == queued + requeue_k * n, total2 == total)))
    return edited

# ------------------------------------------------------------------ v5: vouchers (SMT-LIB), the same commands in Z3Py
def vouchers(split_issues, redeem_checked=False):
    def step(s, t):
        (issued, redeemed, out), (issued2, redeemed2, out2) = s, t
        return Or(
            And(issued2 == issued + 1, out2 == out + 1, redeemed2 == redeemed),                        # Issue
            And(out > 0, *([redeemed < issued] if redeem_checked else []),
                redeemed2 == redeemed + 1, out2 == out - 1, issued2 == issued),                       # Redeem
            And(out > 0, out2 == out + 1, issued2 == issued + (1 if split_issues else 0), redeemed2 == redeemed))  # Split
    return step

def smt_check(name):
    q = Solver(); q.from_file(name); return q.check()

# ------------------------------------------------------------------ the checks
MODELS = [
    # tag, step, width, init, P, P text, Q (the fact the step's pre-state breaks), Q text, edited step, scenarios
    ('q5', seats_q5, 3, lambda f, b, c: And(c >= 0, f == c, b == 0), lambda f, b, c: f >= 0, 'free >= 0',
     lambda f, b, c: And(b >= 0, f == c - b), 'free == cap - booked', seats_edit(seats_q5),
     [('s1', (0, 0, 1)), ('s2', (1, 1, 2)), ('s3', (-1, 0, 0)), ('s4', (2, 0, 2))], ('free', 'booked', 'cap')),
    ('q6', seats_q6, 3, lambda f, b, c: And(c >= 0, f == c, b == 0), lambda f, b, c: f >= 0, 'free >= 0',
     lambda f, b, c: And(b >= 0, f == c - b), 'free == cap - booked', seats_edit(seats_q6),
     [('s1', (0, 0, 1)), ('s2', (1, 1, 2)), ('s3', (-1, 0, 0)), ('s4', (2, 0, 2))], ('free', 'booked', 'cap')),
    ('q7', escrow_q7, 2, lambda e, d: And(e >= 0, d == 0), lambda e, d: e >= 0, 'escrow >= 0',
     lambda e, d: And(0 <= d, d <= e), '0 <= disputed <= escrow', escrow_edit(lambda e, d, n: n <= e),
     [('s1', (0, 2)), ('s2', (3, 1)), ('s3', (-2, 0)), ('s4', (5, 0))], ('escrow', 'disputed')),
    ('q8', escrow_q8, 2, lambda e, d: And(e >= 0, d == 0), lambda e, d: e >= 0, 'escrow >= 0',
     lambda e, d: And(0 <= d, d <= e), '0 <= disputed <= escrow', escrow_edit(lambda e, d, n: n <= e - d),
     [('s1', (0, 2)), ('s2', (3, 1)), ('s3', (-2, 0)), ('s4', (5, 0))], ('escrow', 'disputed')),
    ('q9', batch_q9, 3, lambda q, s, t: And(q == 0, s == 0, t == 0), lambda q, s, t: s <= t, 'settled <= total',
     lambda q, s, t: And(q >= 0, s >= 0, q + s == t), 'queued + settled == total', batch_edit(2),
     [('s1', (2, 0, 1)), ('s2', (1, 1, 2)), ('s3', (0, 2, 1)), ('s4', (0, 3, 3))], ('queued', 'settled', 'total')),
    ('q10', batch_q10, 3, lambda q, s, t: And(q == 0, s == 0, t == 0), lambda q, s, t: s <= t, 'settled <= total',
     lambda q, s, t: And(q >= 0, s >= 0, q + s == t), 'queued + settled == total', batch_edit(1),
     [('s1', (2, 0, 1)), ('s2', (1, 1, 2)), ('s3', (0, 2, 1)), ('s4', (0, 3, 3))], ('queued', 'settled', 'total')),
    ('q11', vouchers(False), 3, lambda i, r, o: And(i == 0, r == 0, o == 0), lambda i, r, o: r <= i, 'redeemed <= issued',
     lambda i, r, o: And(o >= 0, o == i - r), 'outstanding == issued - redeemed', vouchers(False, True),
     [('s1', (1, 1, 1)), ('s2', (2, 1, 1)), ('s3', (1, 2, 0)), ('s4', (3, 3, 0))], ('issued', 'redeemed', 'outstanding')),
    ('q12', vouchers(True), 3, lambda i, r, o: And(i == 0, r == 0, o == 0), lambda i, r, o: r <= i, 'redeemed <= issued',
     lambda i, r, o: And(o >= 0, o == i - r), 'outstanding == issued - redeemed', vouchers(True, True),
     [('s1', (1, 1, 1)), ('s2', (2, 1, 1)), ('s3', (1, 2, 0)), ('s4', (3, 3, 0))], ('issued', 'redeemed', 'outstanding')),
]

for tag, step, width, init, P, ptext, Q, qtext, edited, scen, names in MODELS:
    if tag in ('q11', 'q12'):
        print(f'[{tag} file {tag}.smt2] {smt_check(f"{tag}.smt2")}')
    r, m = inductive(step, width, P, P)
    print(f'[{tag} step of {ptext}] {r}')
    if r == sat:
        model, a = m
        q = Solver(); q.add(*[x == model.eval(x, model_completion=True) for x in a], Q(*a))
        print(f'[{tag} pre-state] {qtext}: {q.check() == sat}')
    print(f'[{tag} search] violation reachable within {N} steps: {found(reach(step, width, init, lambda *v: Not(P(*v))))}')
    r2, _ = inductive(step, width, lambda *v: And(P(*v), Q(*v)), lambda *v: And(P(*v), Q(*v)))
    print(f'[{tag} step of {ptext} and {qtext}] {r2}')
    if tag in ('q11', 'q12'):
        print(f'[{tag} edited, file {tag}e.smt2] {smt_check(f"{tag}e.smt2")}')
    r3, _ = inductive(edited, width, P, P)
    print(f'[{tag} edited, step of {ptext}] {r3}')
    print(f'[{tag} edited, search] violation reachable within {N} steps: {found(reach(edited, width, init, lambda *v: Not(P(*v))))}')
    for sid, vals in scen:
        k = reach(step, width, init, lambda *v, vals=vals: And(*[x == y for x, y in zip(v, vals)]))
        text = ' '.join(f'{n}={v}' for n, v in zip(names, vals))
        print(f'[{tag} {sid} {text}] reachable within {N}: ' + ('no' if k is None else f'yes, in {k} steps'))

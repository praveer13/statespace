# AUD-4.1's queries (content/audit/AUD-4.1.yaml): q1 and q2 as the VC generator emitted them in SMT-LIB, q3 and q4
# through Z3Py. Each verdict and model, and the model replayed in the interpreter of the command it was generated from. Tags are neutral.
import z3
from z3 import Solver, Int, Ints, And, Not, sat

print('z3', z3.get_version_string())

# The interpreter, in miniature: the command each query was generated from (a failed guard leaves the state alone).
def transfer_fee(st, amount):        # q2: a pays b; the fee of 1 comes out of c
    if not (0 < amount <= st['a']):
        return 'Err', st
    return 'ok', {'a': st['a'] - amount, 'b': st['b'] + amount, 'c': st['c'] - 1}

def transfer(st, amount):            # q1: a pays b; c is untouched
    if not (0 < amount <= st['a']):
        return 'Err', st
    return 'ok', {**st, 'a': st['a'] - amount, 'b': st['b'] + amount}

def scalar(tag, cmd):
    s = Solver(); s.from_file(f'{tag}.smt2')
    r = s.check(); print(f'[{tag} check] {r}')
    if r != sat:
        return
    m = s.model(); v = lambda n: m.eval(Int(n), model_completion=True).as_long()
    names = ['a', 'b', 'c', 'p_amount', 'a_p', 'b_p', 'c_p']
    print(f'[{tag} model] ' + ' '.join(f'{n}={v(n)}' for n in names))
    out, after = cmd({'a': v('a'), 'b': v('b'), 'c': v('c')}, v('p_amount'))
    neg = [k for k in ('a', 'b', 'c') if after[k] < 0]
    print(f'[{tag} replay] ' + (f'{out}, ends a={after["a"]} b={after["b"]} c={after["c"]}: ' + ('a run of the command that breaks Inv' if neg else 'no run of the command breaks Inv here')))

scalar('q1', transfer)
scalar('q2', transfer_fee)

# Step-3 scenarios: is this a run of the command that ends with an account below zero?
for tag, cmd in (('q1', transfer), ('q2', transfer_fee)):
    for sid, a, b, c, amount in (('s1', 1, 0, 0, 1), ('s2', 5, 0, 3, 2), ('s3', 3, 2, 0, 3), ('s4', 0, 0, 0, 1)):
        out, after = cmd({'a': a, 'b': b, 'c': c}, amount)
        below = out == 'ok' and min(after.values()) < 0
        print(f'[{tag} {sid} a={a} b={b} c={c} amount={amount}] {out}, ends a={after["a"]} b={after["b"]} c={after["c"]}: below zero {"yes" if below else "no"}')

# q3 and q4: Refund's obligation, as the generator emits it through Z3Py (refund_q3 and refund_q4 below), its model, and
# the model replayed in the interpreter of the command it was generated from.
def refund_fee(st, n):               # q3: the merchant refunds n; the refund fee of 1 comes out of fees
    if not (0 < n <= st['merch']):
        return 'Err', st
    return 'ok', {'cust': st['cust'] + n, 'merch': st['merch'] - n, 'fees': st['fees'] - 1}

def refund(st, n):                   # q4: the merchant refunds n; fees is untouched
    if not (0 < n <= st['merch']):
        return 'Err', st
    return 'ok', {**st, 'cust': st['cust'] + n, 'merch': st['merch'] - n}

cust, merch, fees, n, cust_p, merch_p, fees_p = Ints('cust merch fees n cust_p merch_p fees_p')

def refund_q3():
    s = Solver()
    s.add(And(cust >= 0, merch >= 0, fees >= 0))                  # Inv before
    s.add(And(n > 0, n <= merch))                                 # typing and guard
    s.add(And(cust_p == cust + n, merch_p == merch - n))          # the step
    s.add(fees_p == fees - 1)                                     # the refund fee
    s.add(Not(And(cust_p >= 0, merch_p >= 0, fees_p >= 0)))       # Inv after, negated
    return s

def refund_q4():
    s = Solver()
    s.add(And(cust >= 0, merch >= 0, fees >= 0))                  # Inv before
    s.add(And(n > 0, n <= merch))                                 # typing and guard
    s.add(And(cust_p == cust + n, merch_p == merch - n))          # the step
    s.add(Not(And(cust_p >= 0, merch_p >= 0, fees_p >= 0)))       # Inv after, negated
    return s

for tag, q, cmd in (('q3', refund_q3, refund_fee), ('q4', refund_q4, refund)):
    s = q(); r = s.check(); print(f'[{tag} check] {r}')
    m = s.model(); v = lambda x: m.eval(x, model_completion=True).as_long()
    print(f'[{tag} model] cust={v(cust)} merch={v(merch)} fees={v(fees)} n={v(n)} cust_p={v(cust_p)} merch_p={v(merch_p)} fees_p={v(fees_p)}')
    out, after = cmd({'cust': v(cust), 'merch': v(merch), 'fees': v(fees)}, v(n))
    neg = min(after.values()) < 0
    print(f'[{tag} replay] {out}, ends cust={after["cust"]} merch={after["merch"]} fees={after["fees"]}: ' + ('a run of the command that breaks Inv' if neg else 'no run of the command breaks Inv here'))

for tag, cmd in (('q3', refund_fee), ('q4', refund)):
    for sid, c, m_, f, k in (('s1', 0, 4, 0, 2), ('s2', 1, 5, 2, 5), ('s3', 0, 1, 0, 3), ('s4', 2, 3, 0, 3)):
        out, after = cmd({'cust': c, 'merch': m_, 'fees': f}, k)
        below = out == 'ok' and min(after.values()) < 0
        print(f'[{tag} {sid} cust={c} merch={m_} fees={f} n={k}] {out}, ends cust={after["cust"]} merch={after["merch"]} fees={after["fees"]}: below zero {"yes" if below else "no"}')

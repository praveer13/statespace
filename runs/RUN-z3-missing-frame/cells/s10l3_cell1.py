from z3 import *

def transfer(state, n):                          # the interpreter, in miniature
    if not (0 < n <= state['a']):
        return 'Err', state                      # a failed guard leaves the state alone
    return 'ok', {**state, 'a': state['a'] - n, 'b': state['b'] + n}    # c is untouched

def check(with_frame):
    a, b, c, n = Ints('a b c n')
    a2, b2, c2 = Ints('a2 b2 c2')
    premises = [a >= 0, b >= 0, c >= 0,          # Inv
                n > 0, n <= a,                   # the type of n, and the guard
                a2 == a - n, b2 == b + n]        # the step
    if with_frame:
        premises.append(c2 == c)                 # the frame: c is untouched
    s = Solver()
    s.add(*premises, Not(And(a2 >= 0, b2 >= 0, c2 >= 0)))
    verdict = s.check()
    print('with the frame:' if with_frame else 'without the frame:', verdict)
    if verdict == sat:                           # decode the model, then replay it
        m = s.model()
        val = lambda x: m.eval(x, model_completion=True).as_long()
        outcome, after = transfer({'a': val(a), 'b': val(b), 'c': val(c)}, val(n))
        if outcome == 'ok' and min(after.values()) < 0:
            return 'REFUTED [R]'
        return 'no stamp: the witness does not replay'
    if verdict == unsat:
        p = Solver()
        p.add(*premises)                         # the premise witness
        return 'PROVED [P]' if p.check() == sat else 'no stamp: the premises contradict'
    return 'UNKNOWN [?]'

print(check(with_frame=False))
print(check(with_frame=True))

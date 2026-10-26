from z3 import *

def step(b, h, n, b2, h2):
    hold    = And(n <= b - h, h2 == h + n, b2 == b)
    capture = And(n <= h,     h2 == h - n, b2 == b - n)
    release = And(n <= h,     h2 == h - n, b2 == b)
    return And(n > 0, Or(hold, capture, release))

init = lambda b, h: And(b >= 0, h == 0)
preds = {
    'I1': lambda b, h: b >= 0,
    'I2': lambda b, h: And(b >= 0, h >= 0, h <= b),
    'I3': lambda b, h: h == 0,
    'I4': lambda b, h: And(b < 0, h == 0),
}

def check(*facts):
    s = Solver(); s.add(*facts); return s.check()

def search(I, k):                       # any violation within k steps of Init?
    b = [Int(f'b{i}') for i in range(k + 1)]
    h = [Int(f'h{i}') for i in range(k + 1)]
    n = [Int(f'n{i}') for i in range(k)]
    run = [init(b[0], h[0])]
    for i in range(k):
        stay = And(b[i+1] == b[i], h[i+1] == h[i])
        run.append(Or(step(b[i], h[i], n[i], b[i+1], h[i+1]), stay))
    return check(*run, Or([Not(I(b[i], h[i])) for i in range(k + 1)]))

bal, held, n, bal2, held2 = Ints('bal held n bal2 held2')
for name, I in preds.items():
    print(name,
          '| fails at Init:', check(init(bal, held), Not(I(bal, held))),
          '| inductive step fails:', check(I(bal, held), step(bal, held, n, bal2, held2), Not(I(bal2, held2))),
          '| violated within 6 steps:', search(I, 6))

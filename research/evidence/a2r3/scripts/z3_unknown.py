"""Find an `unknown` that is reproducible (reason != timeout) for lesson 1.1."""
import time
from z3 import *
print("z3 version:", get_version_string())

def run(tag, cs, to=5000):
    s = Solver(); s.set("timeout", to); s.add(*cs)
    t0 = time.time(); r = s.check(); dt = time.time() - t0
    why = s.reason_unknown() if r == unknown else ""
    mdl = str(s.model()) if r == sat else ""
    print(f"[{tag}] {r} ({dt:.2f}s) {why} {mdl}")

x, y, z = Ints('x y z')
p, q = Reals('p q')
run("Real 2**p == 3", [2**p == 3])
run("Real p**q == 2, p>0", [p**q == 2, p > 0])
run("Int 2**x == y, x>=0, y==5", [2**x == y, x >= 0, y == 5])
run("Int x**y == 8, y>1", [x**y == 8, y > 1])
f = Function('f', IntSort(), IntSort())
k = Int('k')
run("Quantified: forall k. f(k) > f(k+1), f(0)=0", [ForAll([k], f(k) > f(k + 1)), f(0) == 0])
run("Quantified: forall k. k*k != y", [ForAll([k], k*k != y), y > 0])
run("NIA Fermat n=3", [x > 0, y > 0, z > 0, x*x*x + y*y*y == z*z*z], to=2000)
run("NIA Fermat n=3, 20s", [x > 0, y > 0, z > 0, x*x*x + y*y*y == z*z*z], to=20000)

# Model of the starter, to compare across versions
a, b, amount = Ints('a b amount')
s = Solver(); s.add(a >= 0, b >= 0, amount > 0, a - amount < 0)
print("[starter model]", s.check(), s.model())

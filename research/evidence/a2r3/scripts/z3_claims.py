"""Re-run every Z3 claim in PLAN.md / mockups against a pinned z3-solver.
Usage: uv run --with z3-solver==<v> python -I z3_claims.py
"""
import time
from z3 import *

print("z3 version:", get_version_string())

def show(tag, s, timeout_ms=None):
    if timeout_ms is not None:
        s.set("timeout", timeout_ms)
    t0 = time.time()
    r = s.check()
    dt = time.time() - t0
    extra = ""
    if r == sat:
        extra = str(s.model())
    elif r == unknown:
        extra = "reason_unknown=" + s.reason_unknown()
    print(f"[{tag}] {r} ({dt:.2f}s) {extra}")
    return r

# --- 1. Roadmap starter / Lesson 1.2 mockup --------------------------------
a, b, amount = Ints('a b amount')
s = Solver()
s.add(a >= 0, b >= 0, amount > 0)
s.add(a - amount < 0)
show("1.2 starter: overdraft search", s)
s.add(amount <= a)
show("1.3 guard added", s)

# --- 2. Main sheet S1.2 says amount = 40 and 'Minimal? Yes' ----------------
o = Optimize()
o.add(a >= 0, b >= 0, amount > 0, a - amount < 0)
o.minimize(amount)
print("[S1.2 minimal amount via Optimize]", o.check(), o.model())

# --- 3. Main sheet claim card: 'Drop Allowed -> S1.2 balance -40' ----------
#     Conservation does not depend on the guard at all over Int.
amt = Int('amt')
print("[conservation without any guard, Int]", end=" ")
prove((a - amt) + (b + amt) == a + b)

# --- 4. Lesson 1.5: 'Re-encode with BitVec(64); watch a proved guard wrap' --
A, B, X = BitVecs('A B X', 64)
s = Solver()
s.add(A >= 0, B >= 0, X > 0, X <= A)           # signed comparisons in Z3Py
s.add(A - X < 0)                                  # source overdraft
show("1.5 BitVec64 signed: guarded SOURCE overdraft", s)
s = Solver()
s.add(A >= 0, B >= 0, X > 0, X <= A)
s.add(B + X < 0)                                  # destination wraps
show("1.5 BitVec64 signed: guarded DESTINATION wrap", s)
print("[1.5 BitVec64 conservation mod 2^64]", end=" ")
prove((A - X) + (B + X) == A + B)
s = Solver()                                      # unsigned confusion
s.add(UGT(X, 0), ULE(X, A))
s.add(A - X < 0)                                  # signed test on unsigned-guarded values
show("1.5 BitVec64 unsigned guard, signed check", s)

# --- 5. Lesson 1.1: 'force an unknown with nonlinear arithmetic' ------------
x, y, z = Ints('x y z')
cands = {
    "x^3+y^3=z^3 (x,y,z>0)": [x > 0, y > 0, z > 0, x*x*x + y*y*y == z*z*z],
    "x*x == 2 (Int)": [x*x == 2],
    "x*y == 7, x>1, y>1": [x*y == 7, x > 1, y > 1],
    "2**x == 3 (Int power)": [2**x == 3],
    "x*x*x - 3*y*y == 1 ... (cubic)": [x*x*x - 3*y*y*y == 1, x > 1],
}
for k, cs in cands.items():
    s = Solver(); s.add(*cs)
    show("1.1 NIA " + k, s, timeout_ms=5000)

# --- 6. Audit A2.1 in SMT: refund debits merchant with no guard --------------
Bal = Array('Bal', IntSort(), IntSort())
c, m, r = Ints('c m r')
k = Int('k')
inv = ForAll([k], Bal[k] >= 0)
modify = Store(Store(Bal, c, Bal[c] + r), m, Store(Bal, c, Bal[c] + r)[m] - r)
value = Store(Store(Bal, c, Bal[c] + r), m, Bal[m] - r)     # reads ORIGINAL map
s = Solver(); s.add(inv, r >= 0, Not(modify[c] >= 0))
show("A2.1 stated theorem (customer >= 0), modify-update", s)
s = Solver(); s.add(inv, r >= 0, Not(value[c] >= 0))
show("A2.1 stated theorem (customer >= 0), value-update", s)
s = Solver(); s.add(inv, r >= 0, Not(modify[m] >= 0))
show("A2.1 the gap: merchant >= 0 after refund", s)

# --- 7. S2.1 self-transfer mints money (read-both-then-write-both) ----------
f, t, n = Ints('f t n')
total_before = Bal[f] + Bal[t]
buggy = Store(Store(Bal, f, Bal[f] - n), t, Bal[t] + n)
s = Solver(); s.add(f == t, n > 0, buggy[f] != Bal[f])
show("S2.1 self-transfer changes balance (buggy update)", s)

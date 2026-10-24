"""Reproduce Z3 issue #11179 (incorrect UNSAT, Real exponentiation, base < 1)."""
from z3 import *
print("z3", get_version_string())
cases = {
 "lower-bound (sat: y=2)": "(declare-const y Real)(assert (>= y 1))(assert (< (^ (/ 1 2) y) (/ 1 2)))",
 "upper-bound (sat: y=1/2)": "(declare-const y Real)(assert (> y 0))(assert (<= y 1))(assert (> (^ (/ 1 2) y) (/ 1 2)))",
 "lower-bound + pin y=2": "(declare-const y Real)(assert (= y 2))(assert (>= y 1))(assert (< (^ (/ 1 2) y) (/ 1 2)))",
}
for k, src in cases.items():
    s = Solver(); s.set("timeout", 10000); s.from_string(src)
    r = s.check()
    print(f"[{k}] {r}", s.reason_unknown() if r == unknown else "")

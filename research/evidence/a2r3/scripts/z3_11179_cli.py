"""Replay issue #11179's exact SMT-LIB scripts through Z3's SMT-LIB2 command interpreter."""
from z3 import *
print("z3", get_version_string())
scripts = {
 "issue input 1 (truth: sat, y=2)": """(set-logic ALL)
(declare-const y Real)
(push 1)
(assert (>= y 1))
(assert (< (^ (/ 1 2) y) (/ 1 2)))
(check-sat)""",
 "issue input 2 (truth: sat, y=1/2)": """(set-logic ALL)
(declare-const y Real)
(push 1)
(assert (> y 0))
(assert (<= y 1))
(assert (> (^ (/ 1 2) y) (/ 1 2)))
(check-sat)""",
}
for k, src in scripts.items():
    ctx = Context()
    out = Z3_eval_smtlib2_string(ctx.ref(), src)
    print(f"[{k}] -> {out.strip()}")

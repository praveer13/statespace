# LAB-1.1: the roadmap's starter. Run it with `uv run python -I labs/LAB-1/starter.py`,
# then check the stage with `uv run statespace check lab1.1`.
#
# Call it first: what does Z3 answer to the overdraft search, and what once the guard is in?
from z3 import *

a, b, amount = Ints('a b amount')
s = Solver()
s.add(a >= 0, b >= 0, amount > 0)
s.add(a - amount < 0)          # the negated property: the sender ends below zero
print(s.check())
print(s.model())

# TODO(you): add the sufficient-funds guard here, as one s.add(...) line.
print(s.check())

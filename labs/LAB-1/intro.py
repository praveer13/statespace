# LAB-1.1: the introductory example of Z3's Python guide, unchanged. Run it first:
#
#     uv run python -I labs/LAB-1/intro.py
#
# `statespace check lab1.1` runs it too and logs its question in the receipt; it is not graded.
from z3 import Int, solve

x = Int("x")
y = Int("y")
solve(x > 2, y < 10, x + 2 * y == 7)

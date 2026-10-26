# LAB-1.5: holds, captures and the double capture (specimen SP-1.2), as two-state properties.
#
# A state is (avail, held, merchant, status). `held` is the pooled balance of every hold, and `status` is
# the status of the one hold under test, whose amount is h. A capture is a relation between a state and
# the next one, written with primed variables: the constants of S1 carry the suffix _p and those of S2 the
# suffix _pp. Two captures chain S0 -> S1 -> S2.
#
# `statespace check lab1.5` imports this file in a subprocess. It builds the state before itself (balances
# non-negative, a positive hold that the pool covers), on the base model and on three settings drawn when
# you run it: the hold's amount, other holds pooled in `held`, and the hold's status. Keep the given names:
# a witness is replayed by them. Run the file yourself with `uv run python -I labs/LAB-1/holds.py`.
from z3 import And, BoolVal, Const, EnumSort, Int, Solver

Status, (HELD, CAPTURED) = EnumSort("Status", ["HELD", "CAPTURED"])
h = Int("h")  # the amount of the hold under test


class State:
    def __init__(self, suffix):
        self.avail = Int("avail" + suffix)
        self.held = Int("held" + suffix)
        self.merchant = Int("merchant" + suffix)
        self.status = Const("status" + suffix, Status)


S0, S1, S2 = State(""), State("_p"), State("_pp")


def capture_effect(x, y):
    """What a capture does to the state: the hold's amount moves from the pool to the merchant."""
    return And(y.held == x.held - h, y.merchant == x.merchant + h, y.avail == x.avail, y.status == CAPTURED)


def buggy_capture(x, y):
    """The capture of SP-1.2: it has no guard."""
    return capture_effect(x, y)


def fixed_capture(x, y):
    """Your capture: one that cannot pay the same hold out twice, whatever else is held."""
    # TODO(you): guard the capture.
    return buggy_capture(x, y)


def at_most_once_violation(s0, s2):
    """The negated property over two steps: from s0 to s2 the merchant gains more than the hold."""
    # TODO(you): return one Boolean expression over s0, s2 and h.
    return BoolVal(False)


if __name__ == "__main__":
    start = [S0.avail >= 0, S0.held >= 0, S0.merchant >= 0, h > 0, S0.held >= h, S0.status == HELD]
    for name, capture in (("buggy", buggy_capture), ("fixed", fixed_capture)):
        s = Solver()
        s.add(*start, capture(S0, S1), capture(S1, S2), at_most_once_violation(S0, S2))
        answer = s.check()
        print(name, "captured twice:", answer, s.model() if str(answer) == "sat" else "")
    s = Solver()
    s.add(*start, fixed_capture(S0, S1))
    print("one fixed capture:", s.check())

# LAB-1.2, LAB-1.3 and LAB-1.5: one transfer from a sender to a recipient, over Z3's Int.
#
# `statespace check lab1.2`, `lab1.3` and `lab1.5` import this file in a subprocess and call the functions
# below. Each returns Z3 expressions, never a verdict: the check builds the questions from them, asks Z3,
# and reads Z3's own answer lines. Run the file yourself with `uv run python -I labs/LAB-1/transfer.py`
# to see what your queries answer while you work; that writes no receipt.
#
# Keep the names of the given constants (a, b, amount, a_p, b_p): a witness is replayed by those names.
from z3 import And, BoolVal, Ints, Not, Solver

a, b, amount = Ints("a b amount")  # the state before the transfer, and the amount moved
a_p, b_p = Ints("a_p b_p")  # the state after it (primed), for LAB-1.5


def premises():
    """What every allowed input satisfies: both balances non-negative, and a positive amount."""
    return [a >= 0, b >= 0, amount > 0]


def sender_after():
    """The encoding: the sender's balance after the transfer."""
    return a - amount


def prop():
    """The property: the transfer does not leave the sender below zero."""
    return sender_after() >= 0


def violation_query():
    """LAB-1.2: the constraints whose model is an allowed input that breaks prop().

    Return a list of Z3 Boolean expressions. A model of them is your counterexample."""
    # TODO(you): return the premises and the negation of the property.
    return []


def guard():
    """LAB-1.3: the sufficient-funds guard, one Boolean expression over a, b and amount that is true
    exactly when the transfer may go ahead."""
    # TODO(you): return the guard.
    return BoolVal(True)


def guarded_violation_query():
    """LAB-1.3: the violation query once the guard is in: the premises, the guard and the negated
    property, nothing more and nothing less."""
    # TODO(you): return the constraints.
    return violation_query()


def step():
    """LAB-1.5: the transfer as a relation between the state before (a, b) and the state after
    (a_p, b_p), written with primed variables and no guard. One Boolean expression."""
    # TODO(you): return the step relation.
    return BoolVal(True)


if __name__ == "__main__":
    for name, query in [("violation", violation_query()), ("guarded violation", guarded_violation_query()), ("premises and guard", premises() + [guard()])]:
        s = Solver()
        s.add(*query)
        answer = s.check()
        print(name, answer, s.model() if str(answer) == "sat" else "")
    s = Solver()
    s.add(step(), Not(a_p + b_p == a + b))
    print("conservation, negated:", s.check())
    s = Solver()
    s.add(And(step()))
    print("the step relation:", s.check())

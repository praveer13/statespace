# LAB-1.4: the mint query. `statespace check lab1.4` calls mint_query with a refund rule, first the clamp
# in broken/refund.py and then your fixed/refund.py, and asks Z3 for a model of what you return. On the
# clamp the model is your second counterexample, and the check writes it to specimens/.
#
# Keep the names c, m and r: a witness is replayed by those names.
from z3 import Ints, Solver

c, m, r = Ints("c m r")  # customer balance, merchant balance, refund amount


def premises():
    """Every refund the rule is asked about: balances non-negative, a positive refund."""
    return [c >= 0, m >= 0, r > 0]


def mint_query(refund):
    """The constraints whose model is a refund, under `refund`, that leaves the pair holding more money
    than before. `refund(c, m, r)` returns (new c, new m, accepted)."""
    # TODO(you): return a list of Z3 Boolean expressions.
    return []


if __name__ == "__main__":
    import importlib.util
    from pathlib import Path

    for which in ("broken", "fixed"):
        spec = importlib.util.spec_from_file_location(f"{which}_refund", Path(__file__).parent / which / "refund.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        s = Solver()
        s.add(*mint_query(module.refund))
        answer = s.check()
        print(which, answer, s.model() if str(answer) == "sat" else "")

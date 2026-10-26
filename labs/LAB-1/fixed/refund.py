# LAB-1.4: your fix of the clamp refund rule (broken/refund.py). Same interface, same parameters: return
# (new customer balance, new merchant balance, accepted). A rejected refund leaves both balances as they
# were.
#
# `statespace check lab1.4` asks your mint query (mint.py) of this rule for the default parameters and
# for two parameter sets drawn when you run it, checks that some refund is still accepted, and replays a
# larger witness of the clamp's class that you have not seen. Fix the class, not the instance.
from z3 import BoolVal, If


def refund(c, m, r, floor=0, reserved=0, fee=0):
    # TODO(you): this is still the clamp. Rewrite it so that no accepted refund creates money.
    keep = floor + reserved
    after = m - r - fee
    return c + r, If(after > keep, after, keep), BoolVal(True)

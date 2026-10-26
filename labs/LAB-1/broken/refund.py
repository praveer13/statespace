# LAB-1.4: the clamp refund rule (specimen SP-1.3), given. Keep this file as it is: a broken rule stays
# beside its fix (roadmap rule 2), and nothing in broken/ is deleted.
#
# A refund moves r from the merchant to the customer: customer balance c, merchant balance m, refund
# r > 0. A rule returns the new customer balance, the new merchant balance and whether the refund was
# accepted; a rejected refund leaves both balances as they were.
#
# The parameters describe the rule's setting. The check uses the defaults, and then parameter sets drawn
# when you run it:
#   floor     the merchant's balance may not end below this
#   reserved  an earlier partial refund still reserved on the merchant's balance, kept on top of the floor
#   fee       what the refund also costs the merchant; it leaves the pair (to the card network)
#
# The clamp credits the customer in full and floors the merchant at what it must keep.
from z3 import BoolVal, If


def refund(c, m, r, floor=0, reserved=0, fee=0):
    keep = floor + reserved
    after = m - r - fee
    return c + r, If(after > keep, after, keep), BoolVal(True)

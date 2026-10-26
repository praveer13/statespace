"""The reference semantics of a transfer: a stand-in for the course's reference interpreter, which is not built yet.

transfer(bal, src, dst, amt) takes the balances (account id -> integer) and returns (outcome, reason, balances):
('ok', None, new balances), or ('refused', reason, the same balances).
"""

def transfer(bal, src, dst, amt):
    if amt is None or amt <= 0:
        return 'refused', 'bad-amount', bal
    if src not in bal or dst not in bal:
        return 'refused', 'no-such-account', bal
    if src == dst:
        return 'refused', 'self-transfer', bal
    if bal[src] < amt:
        return 'refused', 'insufficient', bal
    new = dict(bal)
    new[src] -= amt
    new[dst] += amt
    return 'ok', None, new

"""What the differential harness compares after each command. m and d are the reference's and the database's
results: each has an outcome class (ok, zero-rows, partial or sqlstate:XXXXX) and the balances."""

def agree_q1(m, d):
    return (m.outcome, m.balances) == (d.outcome, d.balances)

def agree_q2(m, d):
    return m.balances == d.balances

def agree_q3(m, d):
    return m.outcome == d.outcome and m.balances == d.balances

def agree_q4(m, d):
    return (m.outcome == "ok") == (d.outcome == "ok") and m.balances == d.balances

ACTION, SETUP = 'place_hold', 'holds_setup.sql'
FINAL, FINAL_NAME, SPENT_NAME = 'SELECT coalesce(sum(amt), 0) FROM holds', 'held', 'placed'
# --- q10 begin
def place_hold(conn, acct, amount):
    with conn.transaction():
        (bal,) = conn.execute("SELECT bal FROM acct WHERE id = %s", (acct,)).fetchone()
        (held,) = conn.execute("SELECT coalesce(sum(amt), 0) FROM holds WHERE acct = %s", (acct,)).fetchone()
        if bal - held < amount:
            return False
        conn.execute("INSERT INTO holds (acct, amt) VALUES (%s, %s)", (acct, amount))
        return True
# --- q10 end

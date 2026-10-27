ACTION, SETUP = 'spend', 'limits_setup.sql'
FINAL, FINAL_NAME, SPENT_NAME = 'SELECT used FROM limits WHERE acct = 1', 'used', 'spent'
# --- q12 begin
def spend(conn, acct, amount):          # the caller retries a whole spend on SQLSTATE 40001
    with conn.transaction():
        conn.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
        (used,) = conn.execute("SELECT used FROM limits WHERE acct = %s", (acct,)).fetchone()
        if used + amount > 100:
            return False
        conn.execute("UPDATE limits SET used = %s WHERE acct = %s", (used + amount, acct))
        return True
# --- q12 end

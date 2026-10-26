def withdraw(conn, acct, amount):
    with conn.transaction():
        (bal,) = conn.execute(
            "SELECT bal FROM acct WHERE id = %s", (acct,)).fetchone()
        if bal < amount:
            return False
        conn.execute("UPDATE acct SET bal = %s WHERE id = %s", (bal - amount, acct))
        return True

def withdraw(conn, acct, amount):
    with conn.transaction():
        cur = conn.execute(
            "UPDATE acct SET bal = bal - %s WHERE id = %s AND bal >= %s",
            (amount, acct, amount))
        return cur.rowcount == 1

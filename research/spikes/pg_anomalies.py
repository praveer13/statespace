import os, psycopg, threading, time
DSN = os.environ.get("PG_DSN", "postgresql://postgres@localhost:55432/postgres")  # set PG_DSN, or PGPASSWORD, for your local server
def reset():
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("drop table if exists acct; create table acct(id int primary key, bal bigint, team int)")
        c.execute("insert into acct values (1,100,1),(2,100,1)")
def bal(i):
    with psycopg.connect(DSN, autocommit=True) as c:
        return c.execute("select bal from acct where id=%s",(i,)).fetchone()[0]
def two(level, stmt1, stmt2):
    """T1 runs stmt1 and holds its txn open; T2 runs stmt2 concurrently; T1 commits, then T2."""
    out = {}
    c1 = psycopg.connect(DSN); c2 = psycopg.connect(DSN)
    for c in (c1, c2): c.execute(f"set transaction isolation level {level}")
    def run(name, c, stmts):
        try:
            for s in stmts: r = c.execute(s); 
            out[name] = "ok"
        except Exception as e:
            out[name] = type(e).__name__ + ":" + str(e).splitlines()[0]
    run("t1", c1, stmt1)
    t = threading.Thread(target=run, args=("t2", c2, stmt2)); t.start()
    time.sleep(0.5); 
    try: c1.commit()
    except Exception as e: out["t1commit"] = str(e).splitlines()[0]
    t.join()
    try: c2.commit()
    except Exception as e: out["t2commit"] = type(e).__name__ + ":" + str(e).splitlines()[0]
    c1.close(); c2.close()
    return out
# 1. single-statement conditional update, READ COMMITTED: two withdrawals of 80 from 100
reset(); o = two("read committed",
  ["update acct set bal = bal - 80 where id=1 and bal >= 80"],
  ["update acct set bal = bal - 80 where id=1 and bal >= 80"])
print("RC conditional UPDATE x2:", o, "final bal", bal(1))
# 2. app-level read-modify-write, READ COMMITTED: both read 100, both write 20
reset()
c1 = psycopg.connect(DSN); c2 = psycopg.connect(DSN)
b1 = c1.execute("select bal from acct where id=1").fetchone()[0]
b2 = c2.execute("select bal from acct where id=1").fetchone()[0]
c1.execute("update acct set bal=%s where id=1", (b1-80,)); c1.commit()
c2.execute("update acct set bal=%s where id=1", (b2-80,)); c2.commit()
print("RC read-modify-write x2: read", b1, b2, "final bal", bal(1), "(spent 160 from 100)")
c1.close(); c2.close()
# 3. same RMW under REPEATABLE READ: second writer should get 40001
reset()
c1 = psycopg.connect(DSN); c2 = psycopg.connect(DSN)
for c in (c1,c2): c.execute("set transaction isolation level repeatable read")
b1 = c1.execute("select bal from acct where id=1").fetchone()[0]
b2 = c2.execute("select bal from acct where id=1").fetchone()[0]
c1.execute("update acct set bal=%s where id=1", (b1-80,)); c1.commit()
try:
    c2.execute("update acct set bal=%s where id=1", (b2-80,)); c2.commit(); print("RR RMW: no error, final", bal(1))
except Exception as e:
    print("RR RMW second writer:", type(e).__name__, getattr(e, 'sqlstate', None), "final", bal(1))
c1.close(); c2.close()
# 4. write skew under REPEATABLE READ: constraint "team total >= 0", each withdraws 150 from a different account after checking the sum
def skew(level):
    reset()
    c1 = psycopg.connect(DSN); c2 = psycopg.connect(DSN)
    for c in (c1,c2): c.execute(f"set transaction isolation level {level}")
    s1 = c1.execute("select sum(bal) from acct where team=1").fetchone()[0]
    s2 = c2.execute("select sum(bal) from acct where team=1").fetchone()[0]
    res = []
    try:
        if s1 - 150 >= 0: c1.execute("update acct set bal = bal - 150 where id=1")
        c1.commit(); res.append("t1 commit")
    except Exception as e: res.append("t1 " + str(getattr(e,'sqlstate',e)))
    try:
        if s2 - 150 >= 0: c2.execute("update acct set bal = bal - 150 where id=2")
        c2.commit(); res.append("t2 commit")
    except Exception as e: res.append("t2 " + str(getattr(e,'sqlstate',e)))
    with psycopg.connect(DSN, autocommit=True) as c:
        tot = c.execute("select sum(bal) from acct where team=1").fetchone()[0]
    c1.close(); c2.close()
    return res, tot
print("write skew RR:", skew("repeatable read"))
print("write skew SERIALIZABLE:", skew("serializable"))
# 5. NULL vs CHECK
with psycopg.connect(DSN, autocommit=True) as c:
    c.execute("drop table if exists t; create table t(id int, bal bigint check (bal >= 0))")
    c.execute("insert into t values (1, null)")
    print("CHECK (bal>=0) accepts NULL:", c.execute("select count(*) from t where bal is null").fetchone()[0] == 1)
    c.execute("insert into t values (2, 50)")
    r = c.execute("update t set bal = bal - 10 where bal >= 10 returning id").fetchall()
    print("conditional UPDATE skips NULL row; updated ids:", r)
    try:
        c.execute("select 9223372036854775807::bigint + 1")
    except Exception as e: print("bigint overflow:", getattr(e,'sqlstate',None), str(e).splitlines()[0])

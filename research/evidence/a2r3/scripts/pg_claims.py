"""Deterministic two-session experiments for Course 06 claims.
usage: python -I pg_claims.py <port>
Blocking is detected by polling pg_stat_activity (no sleeps-as-synchronisation).
"""
import sys, threading, time
import psycopg

PORT = int(sys.argv[1])
DSN = f"host=127.0.0.1 port={PORT} user=postgres dbname=postgres"  # libpq reads the password, if the server needs one, from PGPASSWORD

def conn():
    c = psycopg.connect(DSN, autocommit=True)
    return c

mon = conn()
print("server:", mon.execute("select version()").fetchone()[0].split(" on ")[0])

def reset(sql):
    mon.execute(sql)

def begin(c, level):
    c.execute("BEGIN ISOLATION LEVEL " + level)

def wait_blocked(c):
    pid = c.info.backend_pid
    for _ in range(2000):
        r = mon.execute("select wait_event_type from pg_stat_activity where pid=%s", (pid,)).fetchone()
        if r and r[0] == "Lock":
            return True
        time.sleep(0.005)
    return False

def bg(c, sql, params, out):
    def run():
        try:
            cur = c.execute(sql, params)
            out["rowcount"] = cur.rowcount
            out["rows"] = cur.fetchall() if cur.description else None
        except Exception as e:
            out["err"] = f"{type(e).__name__} [{getattr(e, 'sqlstate', '')}] {str(e).splitlines()[0]}"
    t = threading.Thread(target=run); t.start(); return t

def try_exec(c, sql, params=()):
    try:
        cur = c.execute(sql, params)
        return ("ok", cur.rowcount, cur.fetchall() if cur.description else None)
    except Exception as e:
        return ("ERR", f"{type(e).__name__} [{getattr(e, 'sqlstate', '')}] {str(e).splitlines()[0]}", None)

SETUP = """drop table if exists acct, holds;
create table acct(id int primary key, bal bigint not null);
create table holds(acct int, amt bigint);
insert into acct values (1, 100), (2, 0);"""

# E1: compiled conditional UPDATE (PLAN 6.2) under each level
COND = "update acct set bal = bal - %s where id = 1 and bal >= %s returning bal"
for level in ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]:
    reset(SETUP)
    a, b = conn(), conn()
    begin(a, level); begin(b, level)
    ra = try_exec(a, COND, (80, 80))
    out = {}; t = bg(b, COND, (80, 80), out)
    blocked = wait_blocked(b)
    a.execute("COMMIT"); t.join()
    if "err" not in out:
        try_exec(b, "COMMIT")
    else:
        b.execute("ROLLBACK")
    fin = mon.execute("select bal from acct where id=1").fetchone()[0]
    print(f"[E1 conditional UPDATE, {level}] A={ra[1]} row(s); B blocked={blocked}; B -> {out.get('err') or str(out.get('rowcount')) + ' row(s)'}; final bal={fin}")
    a.close(); b.close()

# E2: application read-modify-write (SELECT, compute in app, write constant)
for level in ["READ COMMITTED", "REPEATABLE READ"]:
    reset(SETUP)
    a, b = conn(), conn()
    begin(a, level); begin(b, level)
    va = a.execute("select bal from acct where id=1").fetchone()[0]
    vb = b.execute("select bal from acct where id=1").fetchone()[0]
    ok_a = va >= 80; ok_b = vb >= 80
    a.execute("update acct set bal = %s where id=1", (va - 80,))
    out = {}; t = bg(b, "update acct set bal = %s where id=1", (vb - 80,), out)
    blocked = wait_blocked(b)
    a.execute("COMMIT"); t.join()
    if "err" in out:
        b.execute("ROLLBACK"); res = out["err"]
    else:
        b.execute("COMMIT"); res = "committed"
    fin = mon.execute("select bal from acct where id=1").fetchone()[0]
    print(f"[E2 app RMW, {level}] both read {va},{vb}; B blocked={blocked}; B -> {res}; final bal={fin}; spent={80*ok_a + (80*ok_b if res=='committed' else 0)} of 100")
    a.close(); b.close()

# E3: write skew with a multi-row invariant (holds): bal - sum(holds) >= amt, then insert a hold
CHK = "select a.bal - coalesce((select sum(amt) from holds h where h.acct = 1),0) from acct a where a.id = 1"
for level in ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]:
    reset(SETUP)
    a, b = conn(), conn()
    begin(a, level); begin(b, level)
    av_a = a.execute(CHK).fetchone()[0]; av_b = b.execute(CHK).fetchone()[0]
    a.execute("insert into holds values (1, 80)"); b.execute("insert into holds values (1, 80)")
    ca = try_exec(a, "COMMIT"); cb = try_exec(b, "COMMIT")
    if cb[0] == "ERR":
        try_exec(b, "ROLLBACK")
    held = mon.execute("select coalesce(sum(amt),0) from holds").fetchone()[0]
    print(f"[E3 holds write-skew, {level}] avail seen {av_a},{av_b}; A commit={ca[0]} {ca[1] if ca[0]=='ERR' else ''}; B commit={cb[0]} {cb[1] if cb[0]=='ERR' else ''}; total held={held} vs bal 100")
    a.close(); b.close()

# E4: opposite-direction transfers (two statements each) -> deadlock?
reset(SETUP + "update acct set bal = 100 where id = 2;")
a, b = conn(), conn()
begin(a, "READ COMMITTED"); begin(b, "READ COMMITTED")
a.execute("update acct set bal = bal - 10 where id = 1 and bal >= 10")
b.execute("update acct set bal = bal - 10 where id = 2 and bal >= 10")
oa, ob = {}, {}
ta = bg(a, "update acct set bal = bal + 10 where id = 2", (), oa)
wait_blocked(a)
tb = bg(b, "update acct set bal = bal + 10 where id = 1", (), ob)
ta.join(); tb.join()
for c, o, n in ((a, oa, "A"), (b, ob, "B")):
    if "err" in o: c.execute("ROLLBACK")
    else: c.execute("COMMIT")
print(f"[E4 opposite transfers, RC] A -> {oa.get('err','ok')}; B -> {ob.get('err','ok')}")
a.close(); b.close()

# E5: NULL in WHERE vs CHECK
mon.execute("drop table if exists nacct; create table nacct(id int primary key, bal bigint check (bal >= 0))")
print("[E5 CHECK (bal >= 0) accepts NULL]", try_exec(mon, "insert into nacct values (1, NULL)")[:2])
print("[E5 guarded UPDATE on NULL bal]", try_exec(mon, "update nacct set bal = bal - 10 where id = 1 and bal >= 10")[:2])
print("[E5 guard with NULL amount]", try_exec(mon, "update acct set bal = bal - %s where id = 1 and bal >= %s", (None, None))[:2])
print("[E5 unknown account]", try_exec(mon, "update acct set bal = bal - 10 where id = 999 and bal >= 10")[:2])

# E6: bigint overflow: error, not wrap; SUM(bigint) is numeric
mon.execute("drop table if exists big; create table big(id int primary key, bal bigint not null check (bal >= 0))")
mon.execute("insert into big values (1, 9223372036854775807), (2, 5)")
print("[E6 credit past 2^63-1]", try_exec(mon, "update big set bal = bal + 1 where id = 1")[:2])
print("[E6 sum(bigint) type/value]", mon.execute("select pg_typeof(sum(bal)), sum(bal) from big").fetchone())
print("[E6 bal after failed credit]", mon.execute("select bal from big where id = 1").fetchone()[0])

# E7: self-transfer under two common compilations
reset(SETUP)
print("[E7 self-transfer, single UPDATE with CASE]", try_exec(mon, """update acct set bal = case when id = %(f)s then bal - %(n)s when id = %(t)s then bal + %(n)s end
  where id in (%(f)s, %(t)s) and (id <> %(f)s or bal >= %(n)s) returning id, bal""", {"f": 1, "t": 1, "n": 30}))
reset(SETUP)
r1 = try_exec(mon, "update acct set bal = bal - 30 where id = 1 and bal >= 30")
r2 = try_exec(mon, "update acct set bal = bal + 30 where id = 1")
print("[E7 self-transfer, two UPDATEs]", r1[:2], r2[:2], "final", mon.execute("select bal from acct where id=1").fetchone()[0])

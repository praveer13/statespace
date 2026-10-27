"""pools.py TAG: AUD-6.3's variant pairs v2 and v3 (content/audit/AUD-6.3.yaml) on PostgreSQL 18.6. TAG.sql is the
case's statement, verbatim. Its SQL lines run as written: a line before "-- each pool's connection" is the deployment
(an ALTER DATABASE, run by an admin connection) or the pools' on_connect hook (run once on each new connection, in
autocommit); the UPDATE after it is the team debit each writer pool runs, $1 being its account. A "-- deploy:" line says
when the migration runs: "recycle" opens the pools' connections after it, anything else before it.

Each case runs two histories from a fresh table, sessions a (account 1) and b (account 2), team 1 at 200: p1 interleaves
the two debits (a BEGIN, a debit, b BEGIN, b debit, a COMMIT, b COMMIT), p2 runs a to its commit and then b. Every
statement's result, every notice, each session's isolation level as it reads it back, and the final team total are
printed with the tag. Standard library plus psycopg 3.
"""
import os, sys
import psycopg

TAG = sys.argv[1]
TEXT = open(f'{TAG}.sql').read()
LINES = [l for l in TEXT.splitlines()]
cut = next(i for i, l in enumerate(LINES) if l.startswith("-- each pool's connection"))
HEAD = [l.split('--')[0].strip() for l in LINES[:cut] if l.strip() and not l.startswith('--')]
DEBIT = next(l for l in LINES[cut:] if l.startswith('UPDATE')).split('--')[0].strip()
DEPLOY = next((l for l in LINES if l.startswith('-- deploy:')), '')

def connect(name, log):
    c = psycopg.connect(host=os.environ['PGHOST'], user=os.environ.get('PGUSER', 'postgres'),
                        password=os.environ.get('PGPASSWORD'), dbname='postgres', autocommit=True)
    c.add_notice_handler(lambda d: log(f"{name}: {d.severity} {d.sqlstate}: {d.message_primary}"))
    return c

def run(conn, name, sql, log, params=None):
    try:
        cur = conn.execute(sql, params)
        rows = cur.fetchall() if cur.description else None
        log(f"{name}: {' '.join(sql.split())} -> {cur.statusmessage}{'' if rows is None else ' ' + str([list(r) for r in rows])}")
        return True
    except psycopg.Error as e:
        log(f"{name}: {' '.join(sql.split())} -> ERROR {e.diag.sqlstate}: {e.diag.message_primary}")
        return False

def history(perm):
    out = lambda line: print(f"[{TAG} {perm}] {line}", flush=True)
    with connect('admin', out) as admin:
        admin.execute("ALTER DATABASE postgres RESET default_transaction_isolation")
        admin.execute("DROP TABLE IF EXISTS acct; CREATE TABLE acct (id int PRIMARY KEY, team int NOT NULL, bal bigint NOT NULL);"
                      "INSERT INTO acct VALUES (1, 1, 100), (2, 1, 100)")
        migration = [s for s in HEAD if s.upper().startswith('ALTER DATABASE')]
        hook = [s for s in HEAD if s not in migration]
        before = 'recycle' in DEPLOY
        if before:
            for s in migration: run(admin, 'admin', s, out)
        pools = {n: connect(n, out) for n in ('a', 'b')}
        for n, c in pools.items():
            for s in hook: run(c, n, s, out)
        if not before:
            for s in migration: run(admin, 'admin', s, out)
        acct = {'a': 1, 'b': 2}
        sql = DEBIT.replace('$1', '%s')
        steps = (['a:BEGIN', 'a:SHOW', 'a:DEBIT', 'b:BEGIN', 'b:SHOW', 'b:DEBIT', 'a:COMMIT', 'b:COMMIT'] if perm == 'p1'
                 else ['a:BEGIN', 'a:SHOW', 'a:DEBIT', 'a:COMMIT', 'b:BEGIN', 'b:SHOW', 'b:DEBIT', 'b:COMMIT'])
        for st in steps:
            n, what = st.split(':')
            c = pools[n]
            if what == 'BEGIN': run(c, n, 'BEGIN', out)
            elif what == 'SHOW': run(c, n, 'SHOW transaction_isolation', out)
            elif what == 'DEBIT': run(c, n, sql, out, (acct[n],))
            else:
                run(c, n, 'COMMIT', out)
        for c in pools.values(): c.close()
        total = admin.execute("SELECT sum(bal) FROM acct WHERE team = 1").fetchone()[0]
        bals = admin.execute("SELECT id, bal FROM acct ORDER BY id").fetchall()
        out(f"check: {[list(r) for r in bals]}; team total {total}")
        admin.execute("ALTER DATABASE postgres RESET default_transaction_isolation")

with psycopg.connect(host=os.environ['PGHOST'], user=os.environ.get('PGUSER', 'postgres'), password=os.environ.get('PGPASSWORD'), dbname='postgres') as c:
    print(f"[{TAG}] server: {c.execute('SHOW server_version').fetchone()[0]}; default level: {c.execute('SHOW default_transaction_isolation').fetchone()[0]}")
for p in ('p1', 'p2'):
    history(p)

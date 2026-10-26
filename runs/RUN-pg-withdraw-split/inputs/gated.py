"""gated.py MODULE TAG: run MODULE.withdraw(conn, 1, 80) in two sessions, a and b, on PostgreSQL at READ COMMITTED,
with every statement and every commit gated on a schedule, and print what each step returned.

p1 interleaves the sessions step by step (a, b, a, b, ...); p2 runs a to its commit, then b. A session that has
finished gives up its turns. A step still running 1 s after it started is reported as waiting and the schedule moves
on (isolationtester's rule); it is reported again when it completes. Standard library plus psycopg 3.
"""
import importlib, os, sys, threading
import psycopg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I leaves the script's folder off the path
mod = importlib.import_module(sys.argv[1])
TAG = sys.argv[2]
AMOUNT = 80
SCHEDULES = {'p1': ['a', 'b'] * 6, 'p2': ['a'] * 6 + ['b'] * 6}

def connect():
    return psycopg.connect(host=os.environ['PGHOST'], user=os.environ.get('PGUSER', 'postgres'),
                           password=os.environ.get('PGPASSWORD'), dbname='postgres', autocommit=True)

class Schedule:
    def __init__(self, order):
        self.order, self.pos, self.done, self.cv = order, 0, set(), threading.Condition()
    def wait_turn(self, s):
        with self.cv:
            while True:
                while self.pos < len(self.order) and self.order[self.pos] in self.done:
                    self.pos += 1
                if self.pos >= len(self.order) or self.order[self.pos] == s:
                    return
                self.cv.wait()
    def advance(self):
        with self.cv:
            self.pos += 1
            self.cv.notify_all()
    def finish(self, s):
        with self.cv:
            self.done.add(s)
            self.cv.notify_all()

class Gated:
    """The connection withdraw() sees: execute() and the commit at the end of transaction() wait for their turn."""
    def __init__(self, name, conn, sched, log):
        self.name, self.conn, self.sched, self.log = name, conn, sched, log
    def step(self, what, call):
        self.sched.wait_turn(self.name)
        state = {'waited': False, 'over': False}
        lock = threading.Lock()
        def blocked():
            with lock:
                if state['over']:
                    return
                state['waited'] = True
            self.log(f"{self.name}: {what} <waiting ...>")
            self.sched.advance()
        timer = threading.Timer(1.0, blocked)
        timer.start()
        try:
            result = call()
            text = result if isinstance(result, str) else None
        except Exception as e:
            text = f"ERROR {getattr(getattr(e, 'diag', None), 'sqlstate', None)}: {e}"
            raise
        finally:
            timer.cancel()
            with lock:
                state['over'] = True
                waited = state['waited']
            if text is None:
                text = getattr(self, '_last', '')
            self.log(f"{self.name}: {what}{' <... completed>' if waited else ''} -> {text}")
            if not waited:
                self.sched.advance()
        return result
    def execute(self, sql, params=()):
        def run():
            cur = self.conn.execute(sql, params)
            rows = cur.fetchall() if cur.description else None
            self._last = f"{cur.statusmessage}{'' if rows is None else ' ' + str([list(r) for r in rows])}"
            return _Replay(cur, rows)
        return self.step(' '.join(sql.split()), run)
    def transaction(self):
        gated = self
        class Tx:
            def __enter__(self):
                self.tx = gated.conn.transaction()
                self.tx.__enter__()
                return self
            def __exit__(self, *exc):
                def commit():
                    self.tx.__exit__(*exc)
                    return 'COMMIT' if exc[0] is None else 'ROLLBACK'
                gated.step('COMMIT', commit)
                return False
        return Tx()

class _Replay:
    """The cursor withdraw() gets back: its rowcount, and the rows already fetched for the log."""
    def __init__(self, cur, rows):
        self.rowcount, self._rows = cur.rowcount, rows
    def fetchone(self):
        return tuple(self._rows[0]) if self._rows else None

def history(perm):
    with connect() as c:
        c.execute(open('setup.sql').read())
    sched = Schedule(SCHEDULES[perm])
    out, lock, returned = [], threading.Lock(), {}
    def log(line):
        with lock:
            out.append(line)
            print(f"[{TAG} {perm}] {line}", flush=True)
    def session(name):
        conn = connect()
        try:
            returned[name] = mod.withdraw(Gated(name, conn, sched, log), 1, AMOUNT)
        except Exception as e:
            returned[name] = f"error {e}"
        finally:
            sched.finish(name)
            conn.close()
    ts = [threading.Thread(target=session, args=(n,)) for n in ('a', 'b')]
    for t in ts:
        t.start()
    for t in ts:
        t.join(30)
    with connect() as c:
        bal = c.execute('SELECT bal FROM acct WHERE id = 1').fetchone()[0]
    spent = AMOUNT * sum(1 for v in returned.values() if v is True)
    print(f"[{TAG} {perm}] a returned {returned.get('a')}, b returned {returned.get('b')}")
    print(f"[{TAG} {perm}] final bal={bal}; spent={spent} of 100")

with connect() as c:
    print(f"[{TAG}] server: {c.execute('SHOW server_version').fetchone()[0]}; transaction_isolation: {c.execute('SHOW transaction_isolation').fetchone()[0]}")
for p in ('p1', 'p2'):
    history(p)

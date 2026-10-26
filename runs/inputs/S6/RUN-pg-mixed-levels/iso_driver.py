"""iso_driver.py: replay isolationtester-style cells with psycopg, one connection per session.

usage: python iso_driver.py --spec CELL --setup SQLFILE --check SQL [--sessions a,b] [--perm "steps..."]... [--all-interleavings]
       [--subst 'step:old=>new']... --out OUT.json

Semantics follow isolationtester: each step runs in its session's connection (autocommit; BEGIN and COMMIT are steps);
a step still running after it is seen blocked (pg_isolation_test_session_is_blocked) is reported as waiting and the
permutation moves on; a step of a session whose previous step is still waiting cannot be issued, so such a permutation
is reported as not runnable and rolled back. Each permutation starts from a fresh setup; --check runs on a separate
connection after every session has finished. Standard library plus psycopg 3.
"""
import argparse, itertools, json, os, re, threading, time, queue
import psycopg

ap = argparse.ArgumentParser()
ap.add_argument('--spec', required=True); ap.add_argument('--setup', required=True); ap.add_argument('--check', required=True)
ap.add_argument('--sessions'); ap.add_argument('--perm', action='append', default=[]); ap.add_argument('--all-interleavings', action='store_true')
ap.add_argument('--subst', action='append', default=[]); ap.add_argument('--label', default=''); ap.add_argument('--out', required=True)
a = ap.parse_args()

text = open(a.spec).read()
sessions, steps, perms, cur = {}, {}, [], None
for line in text.splitlines():
    s = line.strip()
    m = re.match(r'session\s+(\w+)', s)
    if m: cur = m.group(1); sessions[cur] = []; continue
    m = re.match(r'step\s+(\w+)\s*\{(.*)\}', s)
    if m: steps[m.group(1)] = (cur, m.group(2).strip()); sessions[cur].append(m.group(1)); continue
    m = re.match(r'permutation\s+(.*)', s)
    if m: perms.append(m.group(1).split())
for sub in a.subst:
    name, rest = sub.split(':', 1); old, new = rest.split('=>')
    sess, sql = steps[name]
    assert old in sql, (name, old)
    steps[name] = (sess, sql.replace(old, new))
use = a.sessions.split(',') if a.sessions else list(sessions)
if a.perm: perms = [p.split() for p in a.perm]
if a.all_interleavings:
    seqs = [sessions[x] for x in use]
    n = [len(q) for q in seqs]
    perms = []
    for pos in itertools.combinations(range(sum(n)), n[0]):
        it0, it1 = iter(seqs[0]), iter(seqs[1])
        perms.append([next(it0) if i in pos else next(it1) for i in range(sum(n))])
perms = [p for p in perms if all(steps[x][0] in use for x in p)]
setup_sql = open(a.setup).read()
host = os.environ.get('PGHOST')

def connect():
    return psycopg.connect(host=host, user=os.environ.get('PGUSER', 'postgres'), password=os.environ.get('PGPASSWORD'), dbname='postgres', autocommit=True)

def run_sql(conn, sql):
    out = []
    try:
        with conn.cursor() as c:
            c.execute(sql)
            while True:
                r = {'status': c.statusmessage}
                if c.description:
                    r['columns'] = [d.name for d in c.description]
                    r['rows'] = [[None if v is None else (int(v) if isinstance(v, int) else str(v)) for v in row] for row in c.fetchall()]
                out.append(r)
                if not c.nextset(): break
        return {'results': out}
    except psycopg.Error as e:
        d = e.diag
        return {'results': out, 'error': {'sqlstate': d.sqlstate, 'message': d.message_primary, 'detail': d.message_detail}}

class Session:
    def __init__(self, name):
        self.name = name; self.conn = connect(); self.pid = self.conn.info.backend_pid
        self.q = queue.Queue(); self.done = queue.Queue(); self.busy = None
        self.t = threading.Thread(target=self.loop, daemon=True); self.t.start()
    def loop(self):
        while True:
            item = self.q.get()
            if item is None: return
            step, sql = item
            self.done.put((step, run_sql(self.conn, sql)))

def history(perm):
    with connect() as c0:
        c0.execute('DROP TABLE IF EXISTS acct CASCADE')
        c0.execute(setup_sql)
    mon = connect()
    ss = {x: Session(x) for x in use}
    pids = [s.pid for s in ss.values()]
    events, ok = [], True
    def collect(block_wait):
        for s in ss.values():
            if s.busy:
                try:
                    step, res = s.done.get(timeout=block_wait)
                    events.append({'step': step, 'session': s.name, 'completed_after_wait': s.busy[1], **res}); s.busy = None
                except queue.Empty:
                    pass
    for step in perm:
        sess = ss[steps[step][0]]
        if sess.busy:
            ok = False; events.append({'step': step, 'not_issued': f'session {sess.name} is still waiting on {sess.busy[0]}'}); break
        sess.q.put((step, steps[step][1])); sess.busy = (step, False)
        while True:
            try:
                st, res = sess.done.get(timeout=0.05)
                events.append({'step': st, 'session': sess.name, 'completed_after_wait': False, **res}); sess.busy = None; break
            except queue.Empty:
                others = [p for p in pids if p != sess.pid]
                blocked = mon.execute('SELECT pg_isolation_test_session_is_blocked(%s, %s)', (sess.pid, others)).fetchone()[0]
                if blocked:
                    sess.busy = (step, True); events.append({'step': step, 'session': sess.name, 'waiting': True}); break
        collect(0.3)
    # let every waiting step finish (a deadlock resolves within deadlock_timeout)
    deadline = time.time() + 15
    while any(s.busy for s in ss.values()) and time.time() < deadline:
        collect(0.5)
    hung = [s.name for s in ss.values() if s.busy]
    for s in ss.values():
        try:
            if s.busy: s.conn.cancel()
        except Exception: pass
        s.q.put(None)
        try: s.conn.execute('ROLLBACK')
        except Exception: pass
        s.conn.close()
    check = run_sql(mon, a.check) if ok and not hung else None
    mon.close()
    return {'permutation': ' '.join(perm), 'runnable': ok and not hung, 'events': events, 'check': check}

started = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()); t0 = time.time()
with connect() as c:
    version = c.execute('select version()').fetchone()[0]
hs = [history(p) for p in perms]
res = {'label': a.label, 'server_version': version, 'psycopg': psycopg.__version__, 'started_at': started, 'duration_s': round(time.time() - t0, 3),
       'steps': {k: {'session': v[0], 'sql': v[1]} for k, v in steps.items() if v[0] in use}, 'setup': setup_sql, 'check_sql': a.check, 'histories': hs}
json.dump(res, open(a.out, 'w'), indent=1)
for h in hs:
    print('permutation', h['permutation'], '' if h['runnable'] else '(not runnable)')
    for e in h['events']:
        if e.get('waiting'): print(f"  step {e['step']}: <waiting ...>"); continue
        if 'not_issued' in e: print(f"  step {e['step']}: not issued: {e['not_issued']}"); continue
        tag = ' <... completed>' if e['completed_after_wait'] else ''
        body = '; '.join((r['status'] or '') + (' ' + json.dumps(r['rows']) if 'rows' in r else '') for r in e['results'])
        err = f" ERROR {e['error']['sqlstate']}: {e['error']['message']}" if e.get('error') else ''
        print(f"  step {e['step']}:{tag} {body}{err}")
    if h['check']:
        print('  check: ' + '; '.join(json.dumps(r.get('rows')) for r in h['check']['results']))

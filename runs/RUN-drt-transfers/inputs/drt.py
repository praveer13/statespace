"""drt.py: differential random testing of the compiled transfer (compiled.py) on PostgreSQL against the reference
semantics (reference.py). One seeded sequence of N commands runs through the reference and through each compiler on
the database, each on the state the previous command left; every observer in observers.py then counts the commands
on which the two agree, and names the first on which they do not. Last, the fixture test: one command on the
fixture database. Standard library plus psycopg 3."""
import os, random, sys
from collections import Counter, namedtuple
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I leaves the script's folder off the path
import psycopg
import reference, compiled, observers

N, SEED = 200, 7
START = {1: 100, 2: 50, 3: 0}
IDS = [1, 2, 3, 9]  # 9 is no account
Result = namedtuple('Result', 'outcome balances')

def commands(n, seed):
    rng = random.Random(seed)
    out = []
    for _ in range(n):
        r = rng.random()
        amt = None if r < 0.05 else 0 if r < 0.10 else -5 if r < 0.15 else rng.randint(1, 150)
        out.append((rng.choice(IDS), rng.choice(IDS), amt))
    return out

def model_run(cmds):
    bal, out, reasons = dict(START), [], Counter()
    for src, dst, amt in cmds:
        outcome, reason, bal = reference.transfer(bal, src, dst, amt)
        reasons[reason or 'ok'] += 1
        out.append(Result('ok' if outcome == 'ok' else 'zero-rows', dict(bal)))
    return out, reasons

def connect():
    return psycopg.connect(host=os.environ['PGHOST'], user=os.environ.get('PGUSER', 'postgres'),
                           password=os.environ.get('PGPASSWORD'), dbname='postgres', autocommit=True)

def reset(conn, start):
    conn.execute('DROP TABLE IF EXISTS acct')
    conn.execute('CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL)')
    for k, v in start.items():
        conn.execute('INSERT INTO acct VALUES (%s, %s)', (k, v))

def balances(conn):
    return {k: v for k, v in conn.execute('SELECT id, bal FROM acct ORDER BY id').fetchall()}

def db_run(conn, sql, rule, cmds, start):
    reset(conn, start)
    out = []
    for src, dst, amt in cmds:
        try:
            with conn.transaction():
                cur = conn.execute(sql, {'src': src, 'dst': dst, 'amt': amt})
                outcome = rule(cur.rowcount)
                if outcome not in ('ok', 'zero-rows') and rule is compiled.outcome_of:
                    raise psycopg.Rollback()
        except psycopg.Error as e:
            outcome = f'sqlstate:{e.diag.sqlstate}'
        out.append(Result(outcome, balances(conn)))
    return out

def show(cmd):
    src, dst, amt = cmd
    return f'transfer({src} -> {dst}, {amt})'

conn = connect()
print('server: ' + conn.execute('SELECT version()').fetchone()[0])
cmds = commands(N, SEED)
model, reasons = model_run(cmds)
print(f"generator n={N} seed={SEED}: " + ', '.join(f'{k} {reasons[k]}' for k in ('ok', 'insufficient', 'no-such-account', 'self-transfer', 'bad-amount')))
print('generator outcome classes: ' + ', '.join(f'{k} {v}' for k, v in sorted(Counter(r.outcome for r in model).items())))
for name, (what, sql, rule) in compiled.COMPILERS.items():
    db = db_run(conn, sql, rule, cmds, START)
    print(f'[{name}] compiler: {what}')
    for q in ('q1', 'q2', 'q3', 'q4'):
        agree = getattr(observers, f'agree_{q}')
        ok = [agree(m, d) for m, d in zip(model, db)]
        line = f'[{q} {name}] agree {sum(ok)} of {N}'
        if not all(ok):
            i = ok.index(False)
            line += f'; first disagreement, command {i + 1}: {show(cmds[i])}: reference {model[i].outcome} {model[i].balances}, database {db[i].outcome} {db[i].balances}'
        print(line)
# the fixture test: one command on the fixture database
fixture, cmd = {1: 100, 2: 50}, (1, 2, 30)
o, _, b = reference.transfer(dict(fixture), *cmd)
m = Result('ok' if o == 'ok' else 'zero-rows', b)
d = db_run(conn, compiled.SHIPPED, compiled.outcome_of, [cmd], fixture)[0]
print(f'[fixture] {show(cmd)} on {fixture}: reference {m.outcome} {m.balances}, database {d.outcome} {d.balances}; agree {int(observers.agree_q1(m, d))} of 1')

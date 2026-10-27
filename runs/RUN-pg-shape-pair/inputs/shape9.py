"""shape9.py: AUD-9.2's variant pair v6 (content/audit/AUD-9.2.yaml) on PostgreSQL 18.6. Two plans of LAB-9.11's suite,
written with SP-9.2's parameters ($1 from, $2 to, $3 amount) as labs/reference/sql-validator/record.py writes them:
q13 is the shape-only mutant (its credit names the source account), q14 the honest plan whose two writes are swapped.
For each: its lines, the shape check and the semantic validator of labs/reference/sql-validator/validators.py, and the
step-3 scenarios, each one instance replayed twice, the plan on PostgreSQL in one transaction and the source transfer in
the course's interpreter (statespace.labs.lab9), as RUN-sql-shape-validator replays its rejection. Tags are neutral.
"""
import os, sys
sys.path.insert(0, '/r/labs/reference/sql-validator')
os.environ.setdefault('STATESPACE_PG_DSN', f"postgresql://{os.environ.get('PGUSER', 'postgres')}:{os.environ.get('PGPASSWORD', '')}@{os.environ['PGHOST']}:5432/postgres")

from validators import BOUND, TOTAL, semantic, shape, show_instance
from statespace.labs.lab9 import SqlCase, pg_connect, replay_plan, show_class, source_transfer

ROLES = {"F": 1, "T": 2, "A": 3}
CASES = {'q13': 'wrong-account', 'q14': 'credit-first'}
SCENARIOS = [  # (id, accounts, from, to, amount)
    ('s1', {1: 3, 2: 0}, 1, 2, 1),
    ('s2', {1: 3, 2: 0}, 1, 2, 0),
    ('s3', {1: 2}, 1, 1, 1),
    ('s4', {1: 0, 2: 1}, 2, 1, 1),
]
conn, version = pg_connect()
print(f"[q0] server: {version}")
print(f"[q0] bound: {BOUND}; {TOTAL} instances")
for tag, name in CASES.items():
    case = SqlCase(name, name, dict(ROLES))
    lines = case.lines()
    for l in lines:
        print(f"[{tag} plan] {l}")
    ok, why = shape(lines)
    print(f"[{tag} shape] {'accepted' if ok else 'rejected'} ({why})")
    ok, n, witness = semantic(lines, ROLES)
    print(f"[{tag} semantic] " + (f"accepted, {n} of {TOTAL} instances" if ok else f"rejected at instance {n} of {TOTAL}: {show_instance(*witness)}"))
    for sid, accounts, frm, to, amount in SCENARIOS:
        plan = replay_plan(conn, lines, accounts, {1: frm, 2: to, 3: amount})
        src = source_transfer(accounts, frm, to, amount)
        print(f"[{tag} {sid}] {show_instance(accounts, frm, to, amount)}: PostgreSQL {show_class(plan)} | interpreter {show_class(src)} | {'same' if plan == src else 'differ'}")
conn.close()

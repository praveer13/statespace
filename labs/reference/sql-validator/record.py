"""Run the reference SQL validators on the LAB-9.11 suite and replay every rejection (RUN-sql-shape-validator,
RUN-sql-validation). It prints the lines the run records; nothing here grades a learner.

    PYTHONPATH=bench STATESPACE_PG_DSN=postgresql://... python labs/reference/sql-validator/record.py shape-vs-semantic
    PYTHONPATH=bench STATESPACE_PG_DSN=postgresql://... python labs/reference/sql-validator/record.py suite

`shape-vs-semantic` runs both validators on SP-9.2's wrong-account plan; `suite` runs the semantic validator on
every plan of the suite, honest and wrong, with the parameters in their canonical order ($1 from, $2 to, $3
amount), and replays each rejection on PostgreSQL (the plan) and in the course's interpreter (the source).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from validators import BOUND, TOTAL, semantic, shape, show_instance  # noqa: E402

from statespace.labs.lab9 import PLANS, SHAPE_ONLY, SqlCase, pg_connect, replay_plan, show_class, source_transfer  # noqa: E402

ROLES = {"F": 1, "T": 2, "A": 3}


def replay(conn, case: SqlCase, witness: tuple) -> str:
    table, frm, to, amount = witness
    plan = replay_plan(conn, case.lines(), table, {1: frm, 2: to, 3: amount})
    src = source_transfer(table, frm, to, amount)
    return f"  replay {show_instance(*witness)}: PostgreSQL {show_class(plan)} | interpreter {show_class(src)} | {'diverges' if plan != src else 'agrees'}"


def main(argv: list[str]) -> int:
    mode = argv[1] if len(argv) > 1 else "suite"
    conn, version = pg_connect()
    print(f"server: {version}")
    print(f"bound: {BOUND}; {TOTAL} instances")
    names = [SHAPE_ONLY] if mode == "shape-vs-semantic" else list(PLANS)
    for name in names:
        case = SqlCase(name, name, dict(ROLES))
        honest = "honest" if PLANS[name][0] else "wrong"
        lines = case.lines()
        if mode == "shape-vs-semantic":
            ok, why = shape(lines)
            print(f"[{name}] shape check: {'accepted' if ok else 'rejected'} ({why})")
        ok, n, witness = semantic(lines, ROLES)
        if ok:
            print(f"[{name}] ({honest}) semantic validator: accepted, {n} of {TOTAL} instances")
        else:
            print(f"[{name}] ({honest}) semantic validator: rejected at instance {n} of {TOTAL}: {show_instance(*witness)}")
            print(replay(conn, case, witness))
        if mode == "suite":
            ok_s, why = shape(lines)
            print(f"[{name}] shape check: {'accepted' if ok_s else 'rejected'} ({why})")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

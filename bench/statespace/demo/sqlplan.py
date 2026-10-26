"""The reference compiler from the IR to a SQL plan, and the reference runtime that runs a plan on
PostgreSQL (reference modules, earn nothing; LAB-6's compiler and runtime are the learner's).

The schema is one table, `lab10.account(id text primary key, balance bigint, frozen boolean)`. A plan is
JSON, so a learner's runtime can run the reference's plans and the other way round:

    {"schema": "statespace/lab10-plan@1", "command": name, "params": {name: type}, "steps": [step]}
    step  {"kind": "arguments", "amounts": [param]}                      badArgument when an amount is not above 0
          {"kind": "exists", "accounts": [param]}                        unknownAccount when one is missing
          {"kind": "guard", "sql": "SELECT (...)"}                        guardFailed when it is false
          {"kind": "update", "sql": "UPDATE ...", "rowcount": 1}          unknownAccount when the count differs

SQL text names parameters as `%(p_<name>)s`, the psycopg form. The runtime runs a plan in one transaction
at SERIALIZABLE, reads `transaction_isolation` back inside it, retries serialization failures and deadlocks
(SQLSTATE 40001 and 40P01) up to a budget, and never retries anything else: a value out of range is a final
outcome, never a reason to try again (LAB-10.c3). Every attempt is logged with its SQLSTATE.

Outcome classes (LAB-10.c3): success; a typed error (zero rows mapped to unknownAccount, a false guard to
guardFailed); or an SQLSTATE.
"""

from __future__ import annotations

from typing import Any

from .lang import LITERAL_ACCOUNTS

__all__ = ["compile_plan", "execute", "reset", "read_state", "server_info", "connect", "SCHEMA_SQL", "RETRYABLE"]

RETRYABLE = ("40001", "40P01")
MAX_ATTEMPTS = 5  # [D]
SCHEMA_SQL = (
    "CREATE SCHEMA IF NOT EXISTS lab10",
    "CREATE TABLE IF NOT EXISTS lab10.account (id text PRIMARY KEY, balance bigint NOT NULL, frozen boolean NOT NULL DEFAULT false)",
)


def _acct(e: dict[str, Any]) -> str:
    if "account" in e:
        assert e["account"] in LITERAL_ACCOUNTS
        return f"'{e['account']}'"
    return f"%(p_{e['var']})s::text"


def _sql(e: dict[str, Any]) -> str:
    if "int" in e:
        return f"({e['int']})::bigint"
    if "var" in e:
        return f"%(p_{e['var']})s"
    if "account" in e:
        return _acct(e)
    if "balance" in e:
        return f"(SELECT balance FROM lab10.account WHERE id = {_acct(e['balance'])})"
    if "frozen" in e:
        return f"(SELECT frozen FROM lab10.account WHERE id = {_acct(e['frozen'])})"
    if "not" in e:
        return f"(NOT {_sql(e['not'])})"
    op = {"&&": "AND", "||": "OR", "!=": "<>"}.get(e["op"], e["op"])
    a, b = (_sql(x) for x in e["args"])
    return f"({a} {op} {b})"


def compile_plan(program: dict[str, Any], types: dict[str, str]) -> dict[str, Any]:
    """The plan of one command: existence, guard, then each posting as two UPDATEs with a rowcount check."""
    steps: list[dict[str, Any]] = []
    # Every account argument exists before the guard is read (S3 section 2.4, step 3): one count, the
    # plan's rowcount check, and then each UPDATE must touch exactly one row.
    accounts = [p["name"] for p in program["params"] if types[p["name"]] == "account"]
    amounts = [p["name"] for p in program["params"] if types[p["name"]] == "amount"]
    if amounts:
        steps.append({"kind": "arguments", "amounts": amounts})
    if accounts:
        steps.append({"kind": "exists", "accounts": accounts})
    steps.append({"kind": "guard", "sql": f"SELECT COALESCE({_sql(program['requires'])}, false)"})
    for st in program["body"]:
        kind, part = next(iter(st.items()))
        if kind == "move":
            n = _sql(part["amount"])
            steps.append({"kind": "update", "sql": f"UPDATE lab10.account SET balance = balance - {n} WHERE id = {_acct(part['from'])}", "rowcount": 1})
            steps.append({"kind": "update", "sql": f"UPDATE lab10.account SET balance = balance + {n} WHERE id = {_acct(part['to'])}", "rowcount": 1})
        elif kind == "deposit":
            n = _sql(part["amount"])
            steps.append({"kind": "update", "sql": f"UPDATE lab10.account SET balance = balance - {n} WHERE id = 'mint'", "rowcount": 1})
            steps.append({"kind": "update", "sql": f"UPDATE lab10.account SET balance = balance + {n} WHERE id = {_acct(part['to'])}", "rowcount": 1})
        else:
            steps.append({"kind": "update", "sql": f"UPDATE lab10.account SET frozen = {_sql(part['value'])} WHERE id = {_acct(part['of'])}", "rowcount": 1})
    return {"schema": "statespace/lab10-plan@1", "command": program["name"], "params": dict(types), "steps": steps}


def connect(dsn: str) -> Any:
    try:
        import psycopg  # pyright: ignore[reportMissingImports]
    except ImportError as error:
        raise RuntimeError("psycopg is not in this environment: the repository's pyproject.toml pins psycopg[binary]==3.3.6; run `uv sync`, then `uv run statespace ...`") from error
    return psycopg.connect(dsn, autocommit=True, connect_timeout=10)


def reset(conn: Any, state: dict[str, Any]) -> None:
    for sql in SCHEMA_SQL:
        conn.execute(sql)
    conn.execute("DELETE FROM lab10.account")
    frozen = state.get("frozen", {})
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO lab10.account (id, balance, frozen) VALUES (%s, %s, %s)",
            [(a, int(v), bool(frozen.get(a, False))) for a, v in sorted(state["balances"].items())],
        )


def read_state(conn: Any) -> dict[str, Any]:
    rows = conn.execute("SELECT id, balance, frozen FROM lab10.account ORDER BY id").fetchall()
    state: dict[str, Any] = {"balances": {r[0]: int(r[1]) for r in rows}}
    frozen = {r[0]: True for r in rows if r[2]}
    if frozen:
        state["frozen"] = frozen
    return state


def server_info(conn: Any) -> dict[str, str]:
    version = conn.execute("SELECT version()").fetchone()[0]
    number = conn.execute("SHOW server_version").fetchone()[0]
    return {"version": str(version), "server_version": str(number)}


def execute(conn: Any, plan: dict[str, Any], args: dict[str, Any], *, max_attempts: int = MAX_ATTEMPTS) -> dict[str, Any]:
    """Run one call of a plan. Returns {"outcome", "isolation", "attempts"}."""
    import psycopg  # pyright: ignore[reportMissingImports]

    params = {f"p_{k}": v for k, v in args.items()}
    attempts: list[dict[str, Any]] = []
    isolation = None
    for attempt in range(1, max_attempts + 1):
        try:
            conn.execute("BEGIN ISOLATION LEVEL SERIALIZABLE")
            isolation = conn.execute("SHOW transaction_isolation").fetchone()[0]
            err = None
            for step in plan["steps"]:
                if step["kind"] == "arguments":
                    if any(isinstance(args[a], bool) or not isinstance(args[a], int) or args[a] <= 0 for a in step["amounts"]):
                        err = "badArgument"
                        break
                elif step["kind"] == "exists":
                    ids = sorted({str(args[a]) for a in step["accounts"]})
                    found = conn.execute("SELECT count(*) FROM lab10.account WHERE id = ANY(%s)", (ids,)).fetchone()[0]
                    if found != len(ids):
                        err = "unknownAccount"
                        break
                elif step["kind"] == "guard":
                    if not conn.execute(step["sql"], params).fetchone()[0]:
                        err = "guardFailed"
                        break
                else:
                    cur = conn.execute(step["sql"], params)
                    if cur.rowcount != step.get("rowcount", 1):
                        err = "unknownAccount"
                        break
            if err is not None:
                conn.execute("ROLLBACK")
                attempts.append({"attempt": attempt, "sqlstate": None, "result": err})
                return {"outcome": {"ok": False, "err": err}, "isolation": isolation, "attempts": attempts}
            conn.execute("COMMIT")
            attempts.append({"attempt": attempt, "sqlstate": None, "result": "commit"})
            return {"outcome": {"ok": True}, "isolation": isolation, "attempts": attempts}
        except psycopg.Error as error:
            try:
                conn.execute("ROLLBACK")
            except psycopg.Error:
                pass
            code = getattr(error, "sqlstate", None) or "XX000"
            attempts.append({"attempt": attempt, "sqlstate": code, "result": "retry" if code in RETRYABLE and attempt < max_attempts else "fail"})
            if code in RETRYABLE and attempt < max_attempts:
                continue
            return {"outcome": {"ok": False, "sqlstate": code}, "isolation": isolation, "attempts": attempts}
    return {"outcome": {"ok": False, "err": "gaveUp"}, "isolation": isolation, "attempts": attempts}

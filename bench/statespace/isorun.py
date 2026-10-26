"""`statespace isorun <spec>`: run an isolationtester-format spec against PostgreSQL and write a history.

ARCHITECTURE.md section 11.3; labs/README.md section 7; curriculum/S06-correspondence.md section 0. The
course supplies it ("reference module, earns nothing"); LAB-6 uses it in LAB-6.1, LAB-6.5, LAB-6.7 and
LAB-6.8.

A spec is PostgreSQL's own isolationtester format (src/test/isolation/README on REL_18_STABLE): `setup`
and `teardown` blocks, `session <name>` blocks holding `step <name> { <sql> }`, and `permutation` lines
that name steps in the order they are sent. With no permutation line, every interleaving that keeps each
session's steps in order is run.

How a permutation runs. Each session is its own connection. A step is sent, and isorun then waits until
the step has either finished or is seen waiting on a lock held by another session of the permutation: a
monitor connection asks `pg_isolation_test_session_is_blocked(pid, other pids)`, the function
isolationtester itself uses. Only then does it send the next step. A step that waits is printed
`<waiting ...>`, and its later completion `<... completed>`. Nothing is advanced by sleeping: a step that
is still running (neither finished nor blocked) is polled until it is one or the other. A step sent on a
session whose previous step still waits first waits for that step; if nothing else can run, the
permutation would hang, and isorun cancels it and records it as hung.

What it writes. A history@1 file (JSON): the spec's hash, the server's version string as the server
reports it, and for each permutation the steps, every result (columns and rows, the command tag, the row
count), every error with its SQLSTATE, the steps that waited, each session's isolation level as its
BEGIN states it, each session's outcome per transaction (commit, or abort with the SQLSTATE of the error
that ended it) and the outcome signature, written as the catalog writes it (content/pg-catalog):
`s1=commit s2=abort:40001  [40001]`. A session named `obs` reads the state and is left out of the
signature, as in the catalog.

Where it connects. To the server that libpq's variables name (PGHOST, PGPORT, PGUSER, PGPASSWORD), or to
`--dsn`. Each run creates a scratch database, runs every permutation in it with the setup before and the
teardown after each one, and drops it at the end. It needs psycopg 3 (`psycopg[binary]==3.3.6`, the
Bench's pin, labs/TOOLS.md section 2.5).

Exit status: 0 every permutation ran; 1 a permutation hung or a setup failed; 2 usage or a spec that
cannot be read; 3 no server, or no psycopg.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
import re
import secrets
import select
import sys
import time
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

__all__ = [
    "HISTORY_SCHEMA",
    "IsorunUnavailable",
    "Permutation",
    "Spec",
    "SpecError",
    "Step",
    "connect_admin",
    "main",
    "parse_spec",
    "run_spec",
    "signature",
    "verdict_lines",
]

HISTORY_SCHEMA = "statespace/history@1"
POLL_S = 0.005  # how long one wait on a session's socket lasts before isorun asks whether the step is blocked
HANG_S = 20.0  # a step sent on a waiting session gives up after this long with no session able to move [D]
STEP_S = 120.0  # a single step that neither finishes nor blocks for this long stops the permutation [D]
MAX_PERMUTATIONS = 500  # an enumerated spec with more interleavings than this is refused [D]
OBSERVER = "obs"
_LEVEL_WORDS = {"READ UNCOMMITTED": "read committed", "READ COMMITTED": "read committed", "REPEATABLE READ": "repeatable read", "SERIALIZABLE": "serializable"}


class SpecError(ValueError):
    """The spec cannot be read as an isolationtester spec."""


class IsorunUnavailable(RuntimeError):
    """No server to run on, or no psycopg: nothing was run."""


# ------------------------------------------------------------------------------------------ the spec
@dataclass(frozen=True)
class Step:
    name: str
    session: str
    sql: str


@dataclass
class Spec:
    setup: list[str] = field(default_factory=list[str])
    teardown: list[str] = field(default_factory=list[str])
    sessions: list[str] = field(default_factory=list[str])
    session_setup: dict[str, list[str]] = field(default_factory=dict[str, list[str]])
    session_teardown: dict[str, list[str]] = field(default_factory=dict[str, list[str]])
    steps: dict[str, Step] = field(default_factory=dict[str, Step])
    permutations: list[list[str]] = field(default_factory=list[list[str]])

    def session_steps(self, session: str) -> list[str]:
        return [s.name for s in self.steps.values() if s.session == session]

    def all_permutations(self) -> list[list[str]]:
        """The permutations to run: the spec's own lines, or every interleaving of the sessions' steps."""
        if self.permutations:
            return [list(p) for p in self.permutations]
        lanes = [self.session_steps(s) for s in self.sessions]
        out: list[list[str]] = []

        def grow(prefix: list[str], left: list[list[str]]) -> None:
            if len(out) > MAX_PERMUTATIONS:
                return
            if not any(left):
                out.append(list(prefix))
                return
            for i, lane in enumerate(left):
                if lane:
                    grow(prefix + [lane[0]], [l[1:] if j == i else l for j, l in enumerate(left)])

        grow([], lanes)
        if len(out) > MAX_PERMUTATIONS:
            raise SpecError(f"the spec has no permutation line and more than {MAX_PERMUTATIONS} interleavings; write the permutations to run")
        return out


_TOKEN = re.compile(r'\s*(?:(#[^\n]*)|(\{)|("(?:[^"]|"")*")|([A-Za-z_][A-Za-z0-9_]*)|(\S))', re.S)


def _braced(text: str, start: int) -> tuple[str, int]:
    """The SQL between the brace at `start` and its match, skipping quoted strings and comments."""
    depth, i, n = 0, start, len(text)
    while i < n:
        c = text[i]
        if c == "'":
            j = text.find("'", i + 1)
            while j != -1 and text[j + 1 : j + 2] == "'":
                j = text.find("'", j + 2)
            i = n if j == -1 else j + 1
            continue
        if c == "-" and text[i : i + 2] == "--":
            j = text.find("\n", i)
            i = n if j == -1 else j
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1 : i].strip(), i + 1
        i += 1
    raise SpecError("a { block is not closed")


def _tokens(text: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    i = 0
    while i < len(text):
        m = _TOKEN.match(text, i)
        if m is None or m.end() == i:
            if text[i:].strip():
                raise SpecError(f"cannot read the spec at {text[i:i + 30]!r}")
            break
        if m.group(1) is not None:
            i = m.end()
            continue
        if m.group(2) is not None:
            sql, i = _braced(text, m.start(2))
            out.append(("sql", sql))
            continue
        if m.group(3) is not None:
            out.append(("name", m.group(3)[1:-1].replace('""', '"')))
        elif m.group(4) is not None:
            out.append(("word", m.group(4)))
        else:
            raise SpecError(f"unexpected {m.group(5)!r} in the spec")
        i = m.end()
    return out


def parse_spec(text: str) -> Spec:
    """Read an isolationtester spec. Raises SpecError when it cannot."""
    spec = Spec()
    tokens = _tokens(text)
    i = 0
    session: str | None = None

    def take(kind: str) -> str:
        nonlocal i
        if i >= len(tokens) or (tokens[i][0] != kind and not (kind == "name" and tokens[i][0] == "word")):
            raise SpecError(f"expected {'a { block' if kind == 'sql' else 'a name'} after {tokens[i - 1][1] if i else 'the start'}")
        i += 1
        return tokens[i - 1][1]

    while i < len(tokens):
        kind, word = tokens[i]
        i += 1
        if kind != "word":
            raise SpecError(f"unexpected {word!r}: a spec is setup, teardown, session, step and permutation lines")
        if word == "setup":
            (spec.session_setup.setdefault(session, []) if session else spec.setup).append(take("sql"))
        elif word == "teardown":
            (spec.session_teardown.setdefault(session, []) if session else spec.teardown).append(take("sql"))
        elif word == "session":
            session = take("name")
            if session in spec.sessions:
                raise SpecError(f"session {session} is declared twice")
            spec.sessions.append(session)
        elif word == "step":
            if session is None:
                raise SpecError("a step comes before any session")
            name = take("name")
            if name in spec.steps:
                raise SpecError(f"step {name} is declared twice")
            spec.steps[name] = Step(name, session, take("sql"))
        elif word == "permutation":
            session = None
            names: list[str] = []
            while i < len(tokens) and tokens[i][0] in ("word", "name") and tokens[i][1] not in ("permutation", "session", "setup", "teardown", "step"):
                names.append(tokens[i][1])
                i += 1
            if not names:
                raise SpecError("a permutation line names no steps")
            for name in names:
                if name not in spec.steps:
                    raise SpecError(f"the permutation names {name}, which no session declares")
            spec.permutations.append(names)
        else:
            raise SpecError(f"unexpected {word!r}: a spec is setup, teardown, session, step and permutation lines")
    if not spec.sessions:
        raise SpecError("the spec declares no session")
    return spec


# ------------------------------------------------------------------------------------------ outcomes
def _level_of(sql: str) -> str | None:
    m = re.search(r"\b(?:BEGIN|START\s+TRANSACTION)\b[^;]*?\bISOLATION\s+LEVEL\s+(READ\s+UNCOMMITTED|READ\s+COMMITTED|REPEATABLE\s+READ|SERIALIZABLE)", sql, re.I)
    if m:
        return _LEVEL_WORDS[re.sub(r"\s+", " ", m.group(1).upper())]
    m = re.search(r"\bSET\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+(READ\s+UNCOMMITTED|READ\s+COMMITTED|REPEATABLE\s+READ|SERIALIZABLE)", sql, re.I)
    if m:
        return _LEVEL_WORDS[re.sub(r"\s+", " ", m.group(1).upper())]
    if re.match(r"\s*(BEGIN|START\s+TRANSACTION)\b", sql, re.I):
        return "default"
    return None


def signature(outcome: dict[str, list[str]], errors: Sequence[dict[str, Any]]) -> str:
    """The catalog's outcome signature: each session but obs, by name, with its transactions' outcomes
    joined by +, then the distinct SQLSTATEs of every error, sorted, in brackets."""
    parts = [f"{s}={'+'.join(o)}" for s, o in sorted(outcome.items()) if s != OBSERVER and o]
    codes = sorted({str(e["sqlstate"]) for e in errors if e.get("session") != OBSERVER and e.get("sqlstate")})
    return " ".join(parts) + (f"  [{', '.join(codes)}]" if codes else "")


# ------------------------------------------------------------------------------------------ running
def _psycopg() -> Any:
    try:
        import psycopg
    except ImportError as error:
        raise IsorunUnavailable("psycopg is not installed in this environment; isorun needs psycopg[binary]==3.3.6 (labs/TOOLS.md section 2.5): uv add 'psycopg[binary]==3.3.6'") from error
    return psycopg


def connect_admin(dsn: str | None) -> Any:
    psycopg = _psycopg()
    try:
        return psycopg.connect(dsn or "", autocommit=True, connect_timeout=10)
    except psycopg.OperationalError as error:
        where = dsn or ", ".join(f"{k}={os.environ[k]}" for k in ("PGHOST", "PGPORT", "PGUSER", "PGDATABASE") if os.environ.get(k)) or "libpq's defaults"
        first = str(error).strip().splitlines()[0] if str(error).strip() else type(error).__name__
        raise IsorunUnavailable(f"no PostgreSQL server answered at {where}: {first}") from error


def _conninfo(admin: Any, dbname: str) -> str:
    psycopg = _psycopg()
    params = dict(admin.info.get_parameters())
    params["dbname"] = dbname
    if admin.info.password:
        params["password"] = admin.info.password
    return psycopg.conninfo.make_conninfo(**params)


def _decode(value: bytes | None) -> str | None:
    return None if value is None else value.decode("utf-8", errors="replace")


class _Session:
    """One session's connection, driven through libpq's asynchronous interface."""

    def __init__(self, name: str, conninfo: str) -> None:
        psycopg = _psycopg()
        self.name = name
        self.conn = psycopg.connect(conninfo, autocommit=True)
        self.pg = self.conn.pgconn
        self.pid: int = self.pg.backend_pid
        self.step: Step | None = None  # the step in flight
        self.started = 0.0

    def send(self, step: Step) -> None:
        self.step = step
        self.started = time.monotonic()
        self.pg.send_query(step.sql.encode("utf-8"))  # raises psycopg.OperationalError when it cannot send

    def ready(self, wait_s: float) -> bool:
        """True when the step in flight has every result ready."""
        if self.pg.is_busy():
            select.select([self.pg.socket], [], [], wait_s)
            self.pg.consume_input()
        return not self.pg.is_busy()

    def collect(self) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        from psycopg import pq

        results: list[dict[str, Any]] = []
        error: dict[str, Any] | None = None
        while True:
            res = self.pg.get_result()
            if res is None:
                break
            status = res.status
            if status == pq.ExecStatus.TUPLES_OK:
                cols = [_decode(res.fname(c)) or "" for c in range(res.nfields)]
                rows = [[_decode(res.get_value(r, c)) for c in range(res.nfields)] for r in range(res.ntuples)]
                results.append({"command": _decode(res.command_status) or "", "columns": cols, "rows": rows, "rowcount": res.ntuples})
            elif status == pq.ExecStatus.COMMAND_OK:
                tag = _decode(res.command_status) or ""
                count = res.command_tuples
                results.append({"command": tag, "rowcount": count if count is not None else None})
            elif status in (pq.ExecStatus.FATAL_ERROR, pq.ExecStatus.NONFATAL_ERROR):
                if error is None:
                    error = {
                        "sqlstate": _decode(res.error_field(pq.DiagnosticField.SQLSTATE)) or "",
                        "message": _decode(res.error_field(pq.DiagnosticField.MESSAGE_PRIMARY)) or "",
                    }
            else:
                results.append({"command": _decode(res.command_status) or status.name, "rowcount": None})
        self.step = None
        return results, error

    def close(self) -> None:
        try:
            self.conn.close()
        except Exception:  # noqa: BLE001 - closing a broken connection is best effort
            pass


def _blocked(monitor: Any, session: _Session, others: list[int]) -> bool:
    row = monitor.execute("SELECT pg_catalog.pg_isolation_test_session_is_blocked(%s::int, %s::int[])", (session.pid, others)).fetchone()
    return bool(row and row[0])


def _run_sql(conninfo: str, sqls: Sequence[str]) -> dict[str, Any] | None:
    """Run setup or teardown blocks in autocommit; the first error, or None."""
    psycopg = _psycopg()
    with psycopg.connect(conninfo, autocommit=True) as conn:
        for sql in sqls:
            try:
                conn.execute(sql.encode("utf-8"))  # type: ignore[arg-type] - bytes run as a simple query
            except psycopg.Error as error:
                return {"sqlstate": getattr(error, "sqlstate", None) or "", "message": str(error).strip().splitlines()[0] if str(error).strip() else ""}
    return None


@dataclass
class Permutation:
    index: int
    steps: list[str]
    events: list[dict[str, Any]] = field(default_factory=list[dict[str, Any]])
    waits: list[str] = field(default_factory=list[str])
    errors: list[dict[str, Any]] = field(default_factory=list[dict[str, Any]])
    levels: dict[str, str] = field(default_factory=dict[str, str])
    outcome: dict[str, list[str]] = field(default_factory=dict[str, list[str]])
    hung: str | None = None
    setup_error: dict[str, Any] | None = None

    def as_json(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "index": self.index,
            "permutation": self.steps,
            "levels": self.levels,
            "events": self.events,
            "waits": self.waits,
            "errors": self.errors,
            "outcome": self.outcome,
            "signature": signature(self.outcome, self.errors),
        }
        if self.hung:
            out["hung"] = self.hung
        if self.setup_error:
            out["setupError"] = self.setup_error
        return out


class _Txn:
    """Per-session transaction tracking, for the outcome."""

    def __init__(self) -> None:
        self.open = False
        self.failed: str | None = None

    def feed(self, sql: str, error: dict[str, Any] | None, results: list[dict[str, Any]], out: list[str]) -> None:
        commands = [str(r.get("command", "")).split(" ")[0].upper() for r in results]
        begins = bool(re.match(r"\s*(BEGIN|START\s+TRANSACTION)\b", sql, re.I))
        if begins and not self.open:
            self.open, self.failed = True, None
        if error is not None:
            if self.open:
                if self.failed is None:
                    self.failed = error["sqlstate"]
                if re.match(r"\s*(COMMIT|END)\b", sql, re.I):
                    out.append(f"abort:{self.failed}")
                    self.open, self.failed = False, None
            else:
                out.append(f"abort:{error['sqlstate']}")
            return
        if self.open and ("COMMIT" in commands or "ROLLBACK" in commands):
            if "ROLLBACK" in commands and self.failed is None and not re.match(r"\s*ROLLBACK\b", sql, re.I):
                out.append("abort")  # COMMIT answered ROLLBACK with no error recorded
            elif re.match(r"\s*ROLLBACK\b", sql, re.I) and self.failed is None:
                out.append("rollback")
            else:
                out.append("commit" if self.failed is None else f"abort:{self.failed}")
            self.open, self.failed = False, None
        elif not self.open and not begins:
            out.append("commit")


def run_permutation(conninfo: str, monitor: Any, spec: Spec, steps: list[str], index: int) -> Permutation:
    perm = Permutation(index, list(steps))
    perm.setup_error = _run_sql(conninfo, spec.setup)
    if perm.setup_error:
        return perm
    sessions = {name: _Session(name, conninfo) for name in spec.sessions}
    txns = {name: _Txn() for name in spec.sessions}
    perm.outcome = {name: [] for name in spec.sessions}
    waiting: dict[str, _Session] = {}  # session name -> its session, while its step waits on a lock

    def others(s: _Session) -> list[int]:
        return [o.pid for o in sessions.values() if o is not s]

    def finish(s: _Session, completed: bool) -> None:
        step = s.step
        assert step is not None
        results, error = s.collect()
        event: dict[str, Any] = {"step": step.name, "session": s.name, "status": "completed" if completed else "done", "results": results}
        if error:
            event["error"] = error
            perm.errors.append({"step": step.name, "session": s.name, **error})
        perm.events.append(event)
        txns[s.name].feed(step.sql, error, results, perm.outcome[s.name])

    def settle(s: _Session) -> str:
        """Wait until the step in flight on `s` is done or blocked: 'done' or 'blocked'."""
        while True:
            if s.ready(POLL_S):
                return "done"
            if _blocked(monitor, s, others(s)):
                return "blocked"
            if time.monotonic() - s.started > STEP_S:
                return "stuck"

    def sweep() -> None:
        """Complete every waiting step that has finished, and let each running one settle."""
        moved = True
        while moved:
            moved = False
            for name in list(waiting):
                s = waiting[name]
                state = settle(s)
                if state == "done":
                    del waiting[name]
                    finish(s, completed=True)
                    moved = True

    try:
        for name in spec.sessions:
            for sql in spec.session_setup.get(name, []):
                sessions[name].conn.execute(sql.encode("utf-8"))  # type: ignore[arg-type]
        for step_name in steps:
            step = spec.steps[step_name]
            s = sessions[step.session]
            if step.session in waiting:
                deadline = time.monotonic() + HANG_S
                while step.session in waiting:
                    sweep()
                    if step.session in waiting and time.monotonic() > deadline:
                        perm.hung = f"step {step_name} was to run on session {step.session}, whose step {waiting[step.session].step.name if waiting[step.session].step else '?'} still waits and nothing else can run"
                        return perm
            if step.session not in perm.levels:
                level = _level_of(step.sql)
                if level:
                    perm.levels[step.session] = level
            s.send(step)
            state = settle(s)
            if state == "done":
                finish(s, completed=False)
            elif state == "blocked":
                perm.events.append({"step": step.name, "session": s.name, "status": "waiting"})
                perm.waits.append(step.name)
                waiting[step.session] = s
            else:
                perm.hung = f"step {step_name} neither finished nor waited on a lock within {int(STEP_S)} s"
                return perm
            sweep()
        deadline = time.monotonic() + HANG_S
        while waiting:
            sweep()
            if waiting and time.monotonic() > deadline:
                perm.hung = "steps still wait at the end of the permutation: " + ", ".join(w.step.name for w in waiting.values() if w.step)
                return perm
        return perm
    finally:
        for s in sessions.values():
            if s.step is not None:
                try:
                    s.conn.cancel()
                except Exception:  # noqa: BLE001
                    pass
            s.close()
        for name in spec.sessions:
            if spec.session_teardown.get(name):
                _run_sql(conninfo, spec.session_teardown[name])
        _run_sql(conninfo, spec.teardown)
        for name, level in list(perm.levels.items()):
            if level == "default":
                perm.levels[name] = "read committed"


def run_spec(text: str, *, dsn: str | None = None, spec_path: str = "<spec>", only: Sequence[int] | None = None) -> dict[str, Any]:
    """Run every permutation of the spec and return the history@1 document."""
    spec = parse_spec(text)
    permutations = spec.all_permutations()
    admin = connect_admin(dsn)
    try:
        version = admin.execute("SELECT version()").fetchone()[0]
        dbname = f"isorun_{secrets.token_hex(6)}"
        admin.execute(f'CREATE DATABASE "{dbname}"')
        try:
            conninfo = _conninfo(admin, dbname)
            psycopg = _psycopg()
            with psycopg.connect(conninfo, autocommit=True) as monitor:
                done = [
                    run_permutation(conninfo, monitor, spec, steps, k).as_json()
                    for k, steps in enumerate(permutations, start=1)
                    if only is None or k in only
                ]
        finally:
            admin.execute(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)')
    finally:
        admin.close()
    from . import __version__

    return {
        "schema": HISTORY_SCHEMA,
        "spec": {"path": spec_path, "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(), "sessions": spec.sessions, "permutations": len(permutations), "enumerated": not spec.permutations},
        "server": {"version": version},
        "isorun": {"name": "statespace isorun", "version": __version__},
        "permutations": done,
    }


def verdict_lines(history: dict[str, Any]) -> list[str]:
    """The lines a receipt keeps for an isorun run: the server, one line per permutation, a summary."""
    lines = [f"server: {history['server']['version']}"]
    hung = 0
    for p in history["permutations"]:
        if p.get("setupError"):
            lines.append(f"setup failed: permutation {p['index']}: {p['setupError'].get('sqlstate', '')} {p['setupError'].get('message', '')}".rstrip())
            hung += 1
        elif p.get("hung"):
            lines.append(f"hung: permutation {p['index']}: {p['hung']}")
            hung += 1
        else:
            lines.append(f"permutation {p['index']}: {p['signature']}")
    lines.append(f"summary: {len(history['permutations'])} permutations, {hung} did not run to the end")
    return lines


def transcript(history: dict[str, Any], spec: Spec) -> str:
    """An isolationtester-style text of the history, for people (not compared byte for byte)."""
    out = [f"Parsed test spec with {len(spec.sessions)} sessions"]
    for p in history["permutations"]:
        out.append("")
        out.append(f"starting permutation: {' '.join(p['permutation'])}")
        for e in p["events"]:
            step = spec.steps[e["step"]]
            if e["status"] == "waiting":
                out.append(f"step {e['step']}: {step.sql} <waiting ...>")
                continue
            out.append(f"step {e['step']}: {'<... completed>' if e['status'] == 'completed' else step.sql}")
            for r in e.get("results", []):
                if "columns" in r:
                    out.append("|".join(r["columns"]))
                    out.append("+".join("-" * max(1, len(c)) for c in r["columns"]))
                    out.extend("|".join("" if v is None else v for v in row) for row in r["rows"])
                    out.append(f"({r['rowcount']} row{'s' if r['rowcount'] != 1 else ''})")
                    out.append("")
            if e.get("error"):
                out.append(f"ERROR:  {e['error']['message']}  (SQLSTATE {e['error']['sqlstate']})")
        if p.get("hung"):
            out.append(f"HUNG: {p['hung']}")
        out.append(f"signature: {p['signature']}")
    return "\n".join(out) + "\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="statespace isorun",
        description="Run an isolationtester-format spec on PostgreSQL, advancing a step only when the previous one finished or is seen waiting on a lock, and write a history@1 file. "
        "Exit status: 0 every permutation ran, 1 one hung or a setup failed, 2 usage or an unreadable spec, 3 no server or no psycopg.",
    )
    parser.add_argument("spec", type=Path, help="the isolationtester spec")
    parser.add_argument("--out", type=Path, default=None, help="the history file to write (default: <spec>.history.json beside the spec)")
    parser.add_argument("--dsn", default=None, help="a libpq connection string; default: PGHOST, PGPORT, PGUSER and PGPASSWORD")
    parser.add_argument("--permutation", type=int, action="append", default=None, help="run only the permutation with this number (1-based); repeat for more")
    parser.add_argument("--quiet", action="store_true", help="print only the verdict lines, not the transcript")
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        text = args.spec.read_bytes().decode("utf-8")
    except (OSError, UnicodeDecodeError) as error:
        sys.stderr.write(f"statespace isorun: cannot read {args.spec}: {error}\n")
        return 2
    try:
        spec = parse_spec(text)
        history = run_spec(text, dsn=args.dsn, spec_path=args.spec.as_posix(), only=args.permutation)
    except SpecError as error:
        sys.stderr.write(f"statespace isorun: {args.spec}: {error}\n")
        return 2
    except IsorunUnavailable as error:
        sys.stderr.write(f"statespace isorun: {error}\n")
        return 3
    out = args.out or args.spec.with_name(args.spec.name + ".history.json")
    out.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if not args.quiet:
        sys.stdout.write(transcript(history, spec))
        sys.stdout.write("\n")
    lines = verdict_lines(history)
    sys.stdout.write("\n".join(lines) + "\n")
    sys.stdout.write(f"history: {out}\n")
    bad = any(p.get("hung") or p.get("setupError") for p in history["permutations"])
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())

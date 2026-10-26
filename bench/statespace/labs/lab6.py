"""LAB-6, pg-refinement (curriculum/S06-correspondence.md section 3; content/stages/S6/lab.yaml).

The learner's work is in labs/LAB-6/: a dependency-free Rust crate, `pgref` (compile.rs, decision.rs, gen.rs,
retry.rs, refine.rs, runtime.rs; model.rs and main.rs are the course's glue), the isolationtester specs under
specs/ and histories/, and at the repository root the pinned statements claims/schema.sql and
claims/refinement.yaml and the claim cards claims/cl-6-*.yaml. The course supplies `statespace isorun`
(statespace/isorun.py), the abstract-serializability checker and the reference semantics
(statespace/history.py), the catalog rows with their recorded outputs (labs/LAB-6/catalog/), the attempt
fixtures and the fixture manifest (labs/LAB-6/fixtures/), and the mutation operators below.

Every check that needs PostgreSQL connects to the server libpq's variables name (PGHOST, PGPORT, PGUSER,
PGPASSWORD), or STATESPACE_PG_DSN; with no server, or no psycopg, the stage writes no receipt and says why.
Every database a check uses is a scratch database, created for the check and dropped after it. The checks the
design grades in the tab (LAB-6.2, LAB-6.3, the tab half of LAB-6.4, the LAB-6.6 classifier and LAB-6.7) run
here on the Bench's PostgreSQL, and the receipt says so; the tab re-checks them on PGlite.

How each check decides, in one line each:

- LAB-6.c1: `isorun` on labs/LAB-6/histories/rmw.spec: the server reads back PostgreSQL 18.6, B's write waited
  and then committed, A committed, and 160 was spent from 100, leaving 20, as RUN-pg-claims recorded.
- LAB-6.c2: 200 commands drawn when the check runs, with quotas for refusals and missing accounts, through
  the learner's plans on claims/schema.sql: every outcome class and every state alpha(D') equals the
  reference interpreter's; the first divergence prints its seed.
- LAB-6.c3: fresh self-transfers follow decision.rs and leave the state unchanged; the three typed refusals
  come back distinct; the case-merge mutation of the learner's plan (SP-6.7) is rolled back on a fresh
  self-transfer, because the plan's own expectations reject the merged statement's single row.
- LAB-6.c4: the learner's generator and comparison: the learner's plan passes, and the three course mutants
  (a guard left to the CHECK, an unchecked credit, the case-merge) are each caught; the statistics go on the
  receipt.
- LAB-6.c5: the four specs under labs/LAB-6/specs/ through `isorun`: every permutation's outcome signature
  at its level is one the matching catalog row recorded, and each spec reaches its row's defining outcome.
- LAB-6.c6: the attempt fixtures through retry.rs, against the course's rule at the learner's K, and one live
  serialization failure on PostgreSQL retried from BEGIN, with each attempt's SQLSTATE logged.
- LAB-6.c7: the checker classifies every fixture of the pinned manifest with the learner's alpha and R as the
  reference did, and rejects the two R-mutant fixtures.
- LAB-6.c8: the runtime (runtime.rs, the compiler, retry.rs): the LAB-6.4 suite through it with no outcome
  divergence and every session reading back serializable; `isorun` histories of the holds spec and of two
  compiled transfers at the runtime's level, each accepted by the LAB-6.7 checker with the learner's R; and
  the deferred constraint triggers of claims/schema.sql, named on the receipt.
- LAB-6.c9: claims/cl-6-1.yaml to cl-6-5.yaml pass claim@1's schema, name their templates, carry no TODO(you),
  pin statements that exist and cite specimens or receipts that exist.

PROVE_IT lists the Prove-it mutants of lab.yaml as operators on what the learner's crate answers, for
`statespace defend` (not built yet) and for the course's own proof that each key holds on its solution.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import re
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-6"
CRATE = f"{LAB_DIR}/pgref"
SCHEMA = "claims/schema.sql"
REFINEMENT = "claims/refinement.yaml"
MANIFEST = f"{LAB_DIR}/fixtures/manifest.yaml"
ATTEMPTS = f"{LAB_DIR}/fixtures/attempts.txt"
RMW_SPEC = f"{LAB_DIR}/histories/rmw.spec"
CATALOG = f"{LAB_DIR}/catalog/rows.json"
ACCOUNTS = ((1, 100), (2, 50), (3, 0), (4, 250), (5, 1000))  # model.rs ACCOUNTS
MISSING = (6, 7)
SAMPLE_N = 200  # LAB-6.c2's sample [D]
QUOTAS = {"Insufficient": 0.10, "NoSuchAccount(from)": 0.05, "NoSuchAccount(to)": 0.05, "Exact": 0.05}  # at least [D]; Exact debits the whole balance
MIN_SUITE = 200  # LAB-6.c4: your suite's n, at least [D]
K_RANGE = (2, 10)  # LAB-6.c6: a declared budget in this range [D]
STATEMENT_TIMEOUT = "10s"  # each statement a check sends [D]
PGREF_TIMEOUT_S = 60.0

# LAB-6.c1: the outcome RUN-pg-claims recorded for the read-modify-write history at READ COMMITTED
# ("B blocked=True; B -> committed; final bal=20; spent=160 of 100"), and RUN-pg-anomalies#values.rmw_rc_spent.
RMW_FINAL, RMW_SPENT, RMW_START = 20, 160, 100

# LAB-6.c5: each spec, the catalog row it reproduces, the levels it must cover, and the outcome that row is
# about, which some permutation at that level must reach.
SPECS = {
    "lost-update": ("H01-lost-update-rmw.spec", {"read committed": "s1=commit s2=commit", "serializable": "abort:40001"}),
    "write-skew": ("H05-write-skew-team-sum.spec", {"repeatable read": "s1=commit s2=commit", "serializable": "abort:40001"}),
    "deadlock": ("H22a-opposite-order-moves.spec", {"read committed": "abort:40P01"}),
    "conditional": ("H02-conditional-update.spec", {"read committed": "s1=commit s2=commit"}),
}

CL = ("CL-6.1", "CL-6.2", "CL-6.3", "CL-6.4", "CL-6.5")


# ------------------------------------------------------------------------------------------ shared state
@dataclass
class _Lab6:
    pg: Any = None
    pgref: "Pgref | None" = None
    build_error: str | None = None
    level: str | None = None
    facts: dict[str, Any] = field(default_factory=dict[str, Any])


def _state(ctx: CheckContext) -> _Lab6:
    found = getattr(ctx, "_lab6", None)
    if found is None:
        found = _Lab6()
        setattr(ctx, "_lab6", found)
    return found


def _pg(ctx: CheckContext) -> Any:
    st = _state(ctx)
    if st.pg is None:
        from statespace.lanes.pg import PgSession

        st.pg = PgSession(root=ctx.root, workdir=ctx.workdir, sink=ctx.runs.append, dsn=os.environ.get("STATESPACE_PG_DSN") or None)
        st.pg.connect().close()  # ToolUnavailable when there is no server or no psycopg
        ctx.tcb(f"PostgreSQL {st.pg.server_version}", "trusted")
        ctx.tcb("statespace isorun and the LAB-6 plan executor (reference modules)", "trusted")
    return st.pg


def _publish(ctx: CheckContext, **facts: Any) -> None:
    """Put the stage's pg block and LAB-6 facts where the runner carries them: ext (the runner assembles
    engine sections only from its own lane sessions)."""
    st = _state(ctx)
    st.facts.update(facts)
    if st.pg is not None:
        ctx.ext["pg"] = st.pg.section(st.level)
    if st.facts:
        ctx.ext["lab6"] = dict(st.facts)


# ------------------------------------------------------------------------------------------ the learner's crate
class BuildFailed(Exception):
    pass


class Pgref:
    """The learner's crate, built once per stage, driven through `pgref <subcommand>`."""

    def __init__(self, binary: Path, root: Path) -> None:
        self.binary = binary
        self.root = root
        self.sha256 = hashlib.sha256(binary.read_bytes()).hexdigest()

    def call(self, *args: str, stdin: str = "") -> list[str]:
        try:
            done = subprocess.run([str(self.binary), *args], input=stdin.encode("utf-8"), capture_output=True, timeout=PGREF_TIMEOUT_S, cwd=self.root)
        except subprocess.TimeoutExpired as error:
            raise BuildFailed(f"pgref {args[0]} ran past {int(PGREF_TIMEOUT_S)} s") from error
        if done.returncode != 0:
            err = done.stderr.decode("utf-8", errors="replace").strip().splitlines()
            raise BuildFailed(f"pgref {args[0]} exited {done.returncode}: {err[-1] if err else 'no message'}")
        return [line for line in done.stdout.decode("utf-8", errors="replace").splitlines() if line.strip()]

    def compile(self, cmds: list[tuple[int, int, int]]) -> list[dict[str, Any]]:
        lines = self.call("compile", stdin="".join(f"transfer {f} {t} {a}\n" for f, t, a in cmds))
        plans: list[dict[str, Any]] = []
        cur: dict[str, Any] | None = None
        for line in lines:
            if line.startswith("plan "):
                f, t, a = (int(x) for x in line.split()[1:4])
                cur = {"cmd": (f, t, a), "decided": None, "steps": []}
            elif line.startswith("decided ") and cur is not None:
                cur["decided"] = line.split(" ", 1)[1].strip()
            elif line.startswith("step ") and cur is not None:
                parts = line.split(" ", 5)
                if len(parts) < 6:
                    raise BuildFailed(f"pgref compile printed a step it cannot read: {line}")
                _, role, expect, on_mismatch, params, sql = parts
                cur["steps"].append({"role": role, "expect": expect, "on_mismatch": on_mismatch, "params": [] if params == "-" else [int(p) for p in params.split(",")], "sql": sql})
            elif line == "end" and cur is not None:
                plans.append(cur)
                cur = None
        if len(plans) != len(cmds):
            raise BuildFailed(f"pgref compile printed {len(plans)} plans for {len(cmds)} commands")
        return _mutate_plans(plans)

    def decision(self) -> str:
        return self.call("decision")[0].strip()

    def gen(self, seed: int, n: int) -> list[tuple[int, int, int]]:
        out = []
        for line in self.call("gen", str(seed), str(n)):
            parts = line.split()
            if len(parts) != 4 or parts[0] != "transfer":
                raise BuildFailed(f"pgref gen printed a line that is not a transfer: {line}")
            out.append((int(parts[1]), int(parts[2]), int(parts[3])))
        return out

    def compare(self, pairs: list[tuple[tuple[str, dict[int, int]], tuple[str, dict[int, int]]]]) -> list[bool]:
        def bal(b: dict[int, int]) -> str:
            return ",".join(f"{k}={v}" for k, v in sorted(b.items())) or "-"

        stdin = "".join(f"{r[0]} {bal(r[1])} {g[0]} {bal(g[1])}\n" for r, g in pairs)
        out = self.call("compare", stdin=stdin)
        if len(out) != len(pairs):
            raise BuildFailed(f"pgref compare printed {len(out)} answers for {len(pairs)} comparisons")
        return [line.strip() == "same" for line in out]

    def retry(self, cases: list[tuple[str, bool, list[str]]]) -> tuple[int, dict[str, list[str]]]:
        stdin = "".join(f"case {cid} {'yes' if rereads else 'no'}\n" + "".join(f"attempt {a}\n" for a in attempts) + "end\n" for cid, rereads, attempts in cases)
        lines = self.call("retry", stdin=stdin)
        k = int(lines[0].split()[1])
        out: dict[str, list[str]] = {}
        for line in lines[1:]:
            _, cid, _, word = line.split()
            out.setdefault(cid, []).append(word)
        return k, _mutate_retry(cases, out)

    def refine(self, queries: list[tuple[str, list[str]]]) -> list[tuple[list[str], bool]]:
        stdin = "".join(f"{kind}\n" + "".join(f"{l}\n" for l in body) + "end\n" for kind, body in queries)
        lines = self.call("refine", stdin=stdin)
        out: list[tuple[list[str], bool]] = []
        cur: list[str] = []
        ok = False
        for line in lines:
            if line.startswith("result "):
                cur, ok = [], False
            elif line.startswith("r "):
                ok = line.split()[1] == "yes"
            elif line == "end":
                out.append((cur, ok))
            else:
                cur.append(line)
        if len(out) != len(queries):
            raise BuildFailed(f"pgref refine answered {len(out)} of {len(queries)} queries")
        return _mutate_refine(queries, out)

    def begin(self) -> list[str]:
        if _MUTANT == "rc-pool":
            return ["BEGIN"]
        return self.call("begin")

    def level_ok(self, word: str) -> bool:
        return self.call("level-ok", word)[0].strip() == "yes"


def _pgref(ctx: CheckContext) -> Pgref:
    st = _state(ctx)
    if st.pgref is not None:
        return st.pgref
    if st.build_error is not None:
        raise BuildFailed(st.build_error)
    crate = ctx.path(CRATE)
    if not (crate / "Cargo.toml").is_file():
        raise InputRefused(f"{CRATE}/Cargo.toml is not in your lab repository")
    cargo = shutil.which("cargo")
    if cargo is None:
        raise ToolUnavailable("cargo is not installed here; LAB-6 builds your crate with Rust 1.96 (labs/TOOLS.md section 2.6)")
    started = time.monotonic()
    done = subprocess.run([cargo, "build", "--release", "--offline", "--quiet"], cwd=crate, capture_output=True, timeout=600)
    ms = int(round((time.monotonic() - started) * 1000))
    output = (done.stdout + done.stderr).decode("utf-8", errors="replace").splitlines()
    errors = [l for l in output if l.startswith("error")]
    version = subprocess.run([cargo, "--version"], capture_output=True).stdout.decode().strip() or "cargo"
    lines = (errors[:8] or ["Finished release build"]) if done.returncode == 0 or errors else output[-3:]
    ctx.runs.append(
        {
            "step": "cargo-build",
            "engine": "cargo",
            "version": version,
            "argv": ["cargo", "build", "--release", "--offline", "--quiet"],
            "inputSha256": _tree_sha(crate / "src"),
            "budget": {},
            "exitCode": done.returncode,
            "verdictLines": lines if done.returncode != 0 else ["Finished release build"],
            "verdict": "passed" if done.returncode == 0 else "failed",
            "ms": ms,
        }
    )
    if done.returncode != 0:
        st.build_error = "your crate did not build: " + (errors[0] if errors else (output[-1] if output else f"cargo exited {done.returncode}"))
        raise BuildFailed(st.build_error)
    st.pgref = Pgref(crate / "target" / "release" / "pgref", ctx.root)
    ctx.tcb(f"{version}", "trusted")
    ctx.tcb(f"your pgref binary, sha256 {st.pgref.sha256[:12]}", "tested")
    _publish(ctx, pgrefSha256=st.pgref.sha256)
    return st.pgref


def _tree_sha(directory: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(directory.rglob("*")):
        if path.is_file():
            digest.update(path.relative_to(directory).as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()


def _guard(fn):  # noqa: ANN001, ANN202 - a decorator for check functions
    """A crate that does not build, or a pgref that fails, fails the check and names the implementation."""

    def run(ctx: CheckContext) -> CheckResult:
        try:
            return fn(ctx)
        except BuildFailed as error:
            _publish(ctx)
            return CheckResult(False, str(error), "implementation", (f"build it yourself: cd {CRATE} && cargo build --release --offline",))

    run.__name__ = fn.__name__
    run.__doc__ = fn.__doc__
    return run


# ------------------------------------------------------------------------------------------ the reference
def _ref(cmd: tuple[int, int, int], bal: dict[int, int], decision: str) -> tuple[str, dict[int, int]]:
    """The reference interpreter on a transfer: (outcome class, the state after)."""
    from statespace.history import State, interp

    f, t, a = cmd
    outcome, _out, after = interp({"op": "transfer", "from": f, "to": t, "amount": a}, State.of(bal), self_transfer="noop" if decision == "noop" else "refuse")
    word = "Committed" if outcome == "ok" else outcome.split(":", 1)[1]
    return word, after.balances()


# ------------------------------------------------------------------------------------------ PostgreSQL
class _Db:
    """A scratch database with the learner's schema and the opening accounts."""

    def __init__(self, ctx: CheckContext, schema_text: str) -> None:
        import psycopg

        self.pg = _pg(ctx)
        self.admin, self.name, self.conninfo = self.pg.scratch_db()
        try:
            with psycopg.connect(self.conninfo, autocommit=True) as conn:
                try:
                    conn.execute(schema_text.encode("utf-8"))  # type: ignore[arg-type]
                except psycopg.Error as error:
                    raise InputRefused(f"{SCHEMA} does not run on PostgreSQL: {_first_line(error)}") from error
                try:
                    conn.execute(("INSERT INTO acct (id, bal) VALUES " + ", ".join(f"({i}, {b})" for i, b in ACCOUNTS)).encode())  # type: ignore[arg-type]
                except psycopg.Error as error:
                    raise InputRefused(f"the opening accounts do not insert into your acct(id, bal): {_first_line(error)}") from error
        except BaseException:
            self.close()
            raise
        self.conn = psycopg.connect(self.conninfo, autocommit=True)
        self.conn.execute(f"SET statement_timeout = '{STATEMENT_TIMEOUT}'".encode())  # type: ignore[arg-type]

    def alpha(self) -> dict[int, int]:
        rows = self.conn.execute(b"SELECT id, bal FROM acct ORDER BY id").fetchall()
        return {int(i): (None if b is None else int(b)) for i, b in rows}

    def close(self) -> None:
        conn = getattr(self, "conn", None)
        if conn is not None:
            conn.close()
        self.pg.drop_db(self.admin, self.name)


def _first_line(error: BaseException) -> str:
    text = str(error).strip()
    return text.splitlines()[0] if text else type(error).__name__


def _rows(result: Any) -> int:
    from psycopg import pq

    if result.status == pq.ExecStatus.TUPLES_OK:
        return int(result.ntuples)
    n = result.command_tuples
    return int(n) if n is not None else 0


def _expect_ok(expect: str, rows: int) -> bool:
    if expect == "any":
        return True
    kind, _, n = expect.partition(":")
    if kind == "exactly":
        return rows == int(n)
    if kind == "atmost":
        return rows <= int(n)
    return False


def _sqlstate(result: Any) -> str:
    from psycopg import pq

    code = result.error_field(pq.DiagnosticField.SQLSTATE)
    return code.decode() if code else "XX000"


def _simple(conn: Any, sql: str) -> str | None:
    """Run SQL as a simple query; the SQLSTATE of its error, or None."""
    from psycopg import pq

    res = conn.pgconn.exec_(sql.encode("utf-8"))
    if res.status in (pq.ExecStatus.FATAL_ERROR, pq.ExecStatus.NONFATAL_ERROR):
        return _sqlstate(res)
    return None


def run_plan(conn: Any, plan: dict[str, Any], begin: list[str] | None = None, *, level_check: Any = None) -> tuple[str, list[str]]:
    """Run one plan on `conn` as model.rs says: (outcome class, log). `level_check(read_back)` returns an
    error text when the runtime refuses the session's level; the plan is then not run."""
    from psycopg import pq

    log: list[str] = []
    if plan["decided"] is not None:
        return str(plan["decided"]), ["decided before SQL"]
    for statement in begin or ["BEGIN"]:
        code = _simple(conn, statement)
        if code:
            _simple(conn, "ROLLBACK")
            return f"sqlstate:{code}", [f"begin: {code}"]
    if level_check is not None:
        level = conn.pgconn.exec_(b"SHOW transaction_isolation").get_value(0, 0).decode()
        log.append(f"level {level}")
        refused = level_check(level)
        if refused:
            _simple(conn, "ROLLBACK")
            return "sqlstate:runtime-refused-level", log + [refused]
    for step in plan["steps"]:
        res = conn.pgconn.exec_params(step["sql"].encode("utf-8"), [str(p).encode() for p in step["params"]])
        if res.status in (pq.ExecStatus.FATAL_ERROR, pq.ExecStatus.NONFATAL_ERROR):
            code = _sqlstate(res)
            _simple(conn, "ROLLBACK")
            return f"sqlstate:{code}", log + [f"{step['role']}: {code}"]
        rows = _rows(res)
        if not _expect_ok(step["expect"], rows):
            _simple(conn, "ROLLBACK")
            return str(step["on_mismatch"]), log + [f"{step['role']}: {rows} rows, expected {step['expect']}"]
    code = _simple(conn, "COMMIT")
    if code:
        return f"sqlstate:{code}", log + [f"commit: {code}"]
    return "Committed", log


# ------------------------------------------------------------------------------------------ mutation operators
def _combine(a: str, b: str) -> str:
    if a == "any" or b == "any":
        return "any"
    ka, _, na = a.partition(":")
    kb, _, nb = b.partition(":")
    kind = "exactly" if ka == kb == "exactly" else "atmost"
    return f"{kind}:{int(na) + int(nb)}"


def _template_plan(pgref: Pgref, cmd: tuple[int, int, int]) -> dict[str, Any]:
    """The learner's plan for a transfer, compiled with a different `to` when it is a self-transfer and
    rewritten back to it, so a mutation operator sees the debit and the credit the plan would send."""
    f, t, a = cmd
    if f != t:
        return pgref.compile([cmd])[0]
    other = next(i for i, _ in ACCOUNTS if i != f)
    plan = pgref.compile([(f, other, a)])[0]
    for step in plan["steps"]:
        step["params"] = [f if p == other else p for p in step["params"]]
    plan["cmd"] = cmd
    return plan


def mutate_case_merge(pgref: Pgref, cmd: tuple[int, int, int]) -> dict[str, Any]:
    """SP-6.7: the debit and the credit become one CASE statement, which expects the rows the two did, and
    the self-transfer decision is dropped, so a self-transfer reaches the SQL."""
    f, t, a = cmd
    plan = _template_plan(pgref, cmd)
    debit = next((s for s in plan["steps"] if s["role"] == "debit"), None)
    credit = next((s for s in plan["steps"] if s["role"] == "credit"), None)
    if debit is None or credit is None:
        return plan
    merged = {
        "role": "debit",
        "expect": _combine(debit["expect"], credit["expect"]),
        "on_mismatch": debit["on_mismatch"],
        "params": [f, t, a],
        "sql": "UPDATE acct SET bal = CASE WHEN id = $1 THEN bal - $3 WHEN id = $2 THEN bal + $3 END WHERE id IN ($1, $2)",
    }
    steps = []
    for s in plan["steps"]:
        if s is debit:
            steps.append(merged)
        elif s is not credit:
            steps.append(s)
    return {"cmd": cmd, "decided": None, "steps": steps}


def mutate_check_only(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The debit's guard is left to the CHECK constraint: `UPDATE acct SET bal = bal - $2 WHERE id = $1`."""
    out = []
    for p in plans:
        q = json.loads(json.dumps(p))
        for s in q["steps"]:
            if s["role"] == "debit":
                f, _t, a = p["cmd"]
                s["sql"], s["params"] = "UPDATE acct SET bal = bal - $2 WHERE id = $1", [f, a]
        out.append(q)
    return out


def mutate_unchecked_credit(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The credit is unchecked: it expects any number of rows, and the plan's checks of `to` alone are
    dropped, so a missing `to` commits the debit."""
    out = []
    for p in plans:
        q = json.loads(json.dumps(p))
        to = p["cmd"][1]
        q["steps"] = [s for s in q["steps"] if not (s["role"] == "check" and s["params"] == [to] and to != p["cmd"][0])]
        for s in q["steps"]:
            if s["role"] == "credit":
                s["expect"] = "any"
        out.append(q)
    return out


# ------------------------------------------------------------------------------------------ helpers
def _sample(rng: random.Random, n: int) -> list[tuple[int, int, int]]:
    """LAB-6.c2's sample: n transfers between distinct accounts, with the quotas met, drawn against the
    reference state so that each refusal is one when it runs."""
    kinds = [k for k, share in QUOTAS.items() for _ in range(int(n * share + 0.999))]
    kinds += ["Committed"] * (n - len(kinds))
    rng.shuffle(kinds)
    bal = dict(ACCOUNTS)
    ids = [i for i, _ in ACCOUNTS]
    out = []
    for kind in kinds:
        if kind == "NoSuchAccount(from)":
            cmd = (rng.choice(MISSING), rng.choice(ids), rng.randint(1, 50))
        elif kind == "NoSuchAccount(to)":
            cmd = (rng.choice(ids), rng.choice(MISSING), rng.randint(1, 50))
        else:
            f = rng.choice(ids)
            t = rng.choice([i for i in ids if i != f])
            if kind == "Insufficient":
                cmd = (f, t, bal[f] + rng.randint(1, 50))
            elif kind == "Exact" and bal[f] > 0:
                cmd = (f, t, bal[f])
            else:
                if bal[f] == 0:
                    f = max(bal, key=lambda i: bal[i])
                    t = rng.choice([i for i in ids if i != f])
                cmd = (f, t, rng.randint(1, max(1, bal[f])))
        _, bal = _ref(cmd, bal, "refuse")
        out.append(cmd)
    return out


def _bal(b: dict[int, Any]) -> str:
    return ",".join(f"{k}={v}" for k, v in sorted(b.items()))


def _suite(ctx: CheckContext, plans: list[dict[str, Any]], decision: str, *, step: str, schema: str, begin: list[str] | None = None, level_check: Any = None, retry: Any = None) -> dict[str, Any]:
    """Run the plans in order on a fresh database; compare each with the reference. Returns the records."""
    db = _Db(ctx, schema)
    started = time.monotonic()
    records = []
    ref_bal = dict(ACCOUNTS)
    attempts_log: dict[str, int] = {}
    try:
        for i, plan in enumerate(plans):
            before = db.alpha()
            want, ref_after = _ref(plan["cmd"], ref_bal, decision)
            attempts = 0
            history: list[str] = []
            while True:
                attempts += 1
                got, log = run_plan(db.conn, plan, begin, level_check=level_check)
                history.append(got)
                code = got.split(":", 1)[1] if got.startswith("sqlstate:") else None
                attempts_log[code or got] = attempts_log.get(code or got, 0) + 1
                if retry is None or not code or code == "runtime-refused-level":
                    break
                if retry(history) != "retry":
                    break
            after = db.alpha()
            records.append({"i": i, "cmd": plan["cmd"], "want": want, "got": got, "ref_after": dict(ref_after), "before": before, "after": after, "log": log, "attempts": attempts})
            ref_bal = dict(ref_after)
    finally:
        db.close()
    ms = int(round((time.monotonic() - started) * 1000))
    classes: dict[str, int] = {}
    for r in records:
        classes[r["got"]] = classes.get(r["got"], 0) + 1
    _pg(ctx).record(
        step=step,
        input_text="".join(json.dumps({"cmd": p["cmd"], "decided": p["decided"], "steps": p["steps"]}) + "\n" for p in plans),
        lines=[f"executed: {len(records)} commands", "classes: " + ", ".join(f"{k}={v}" for k, v in sorted(classes.items())), "attempt: " + ", ".join(f"{k}={v}" for k, v in sorted(attempts_log.items()))],
        ms=ms,
        seed=ctx.seed,
        extension="plans.ndjson",
    )
    return {"records": records, "classes": classes, "attempts": attempts_log}


def _divergence(records: list[dict[str, Any]]) -> dict[str, Any] | None:
    for r in records:
        if r["got"] != r["want"] or r["after"] != r["ref_after"]:
            return r
    return None


def _show(r: dict[str, Any], seed: int) -> tuple[str, ...]:
    f, t, a = r["cmd"]
    return (
        f"first divergence: command {r['i'] + 1}, transfer {a} from {f} to {t} (seed {seed})",
        f"reference: {r['want']}, state after {_bal(r['ref_after'])}",
        f"your plan: {r['got']}, state after {_bal(r['after'])}" + (f" ({'; '.join(r['log'])})" if r["log"] else ""),
    )


def _schema(ctx: CheckContext) -> str:
    text = ctx.statement(SCHEMA, "sql")
    if "TODO(you)" in text:
        ctx.note(f"{SCHEMA} still carries TODO(you)")
    return text


# ------------------------------------------------------------------------------------------ the checks
def c1(ctx: CheckContext) -> CheckResult:
    """LAB-6.c1: the read-modify-write history replays as recorded."""
    pg = _pg(ctx)
    text = ctx.statement(RMW_SPEC, "sql")
    h = pg.isorun(text, step="rmw", spec_label=RMW_SPEC)
    st = _state(ctx)
    st.level = "read committed"
    version = pg.version_string or ""
    _publish(ctx, rmwSignatures=[p["signature"] for p in h["permutations"]])
    if not version.startswith("PostgreSQL 18.6"):
        return CheckResult(False, f"the server reads back {version.split(' on ')[0] or 'nothing'}, not PostgreSQL 18.6", "tool", ("LAB-6 pins PostgreSQL 18.6 (labs/TOOLS.md section 2.5): the devcontainer's service container runs it",))
    perms = h["permutations"]
    if len(perms) != 1:
        return CheckResult(False, f"{RMW_SPEC} runs {len(perms)} permutations; write exactly one permutation line, the interleaving the stage asks for", "spec")
    p = perms[0]
    if p.get("hung") or p.get("setupError"):
        return CheckResult(False, f"the permutation did not run to the end: {p.get('hung') or p.get('setupError')}", "spec")
    # what each session believes it debited: its read minus what it wrote
    debited: dict[str, dict[str, int]] = {}
    for e in p["events"]:
        if e["status"] == "waiting":
            continue
        for r in e.get("results", []):
            if r.get("columns") == ["bal"] and r["rows"]:
                debited.setdefault(e["session"], {})["read"] = int(r["rows"][0][0])
            if r.get("columns") == ["old_bal", "new_bal"] and r["rows"]:
                debited.setdefault(e["session"], {})["new"] = int(r["rows"][0][1])
    spent = sum(v["read"] - v["new"] for v in debited.values() if "read" in v and "new" in v)
    final = None
    for e in p["events"]:
        if e["session"] == "obs":
            for r in e.get("results", []):
                for row in r.get("rows", []):
                    if row and str(row[0]) == "1":
                        final = int(row[1])
    detail = (f"permutation: {' '.join(p['permutation'])}", f"signature: {p['signature']}; waited: {', '.join(p['waits']) or 'none'}", f"each session's debit, read minus written: {spent}; final balance of account 1: {final}")
    if "s2w" not in p["waits"]:
        return CheckResult(False, "session s2's write did not wait for s1's: this is not the interleaving the stage asks for", "spec", detail)
    if p["outcome"].get("s1") != ["commit"] or p["outcome"].get("s2") != ["commit"]:
        return CheckResult(False, f"the sessions did not both commit ({p['signature']})", "spec", detail)
    if final != RMW_FINAL or spent != RMW_SPENT:
        return CheckResult(False, f"spent {spent} from {RMW_START} with a final balance of {final}; RUN-pg-claims recorded {RMW_SPENT} and {RMW_FINAL}", "tool", detail)
    return CheckResult(True, f"{version.split(' on ')[0]}: s2's write waited, then both committed; {spent} spent from {RMW_START}, final balance {final}, as RUN-pg-claims recorded", details=detail)


@_guard
def c2(ctx: CheckContext) -> CheckResult:
    """LAB-6.c2: your plan's outcomes equal the reference's."""
    schema = _schema(ctx)
    pgref = _pgref(ctx)
    decision = pgref.decision()
    cmds = _sample(ctx.rng, SAMPLE_N)
    plans = pgref.compile(cmds)
    out = _suite(ctx, plans, decision, step="sample", schema=schema)
    ctx.tcb("the reference interpreter (statespace.history.interp, the pinned integers)", "trusted")
    ctx.note(f"run here on the Bench's PostgreSQL; the tab re-checks the same plans on PGlite (lane: re-checked here)")
    _publish(ctx, c2={"n": len(cmds), "seed": ctx.seed, "classes": out["classes"]})
    bad = _divergence(out["records"])
    if bad is not None:
        return CheckResult(False, f"command {bad['i'] + 1} of {len(cmds)} diverges from the reference", "implementation", _show(bad, ctx.seed))
    return CheckResult(True, f"{len(cmds)} commands (seed {ctx.seed}): every outcome class and every state equals the reference interpreter's", details=("observed classes: " + ", ".join(f"{k} {v}" for k, v in sorted(out["classes"].items())),))


@_guard
def c3(ctx: CheckContext) -> CheckResult:
    """LAB-6.c3: typed errors are distinct, and the self-transfer follows your decision."""
    schema = _schema(ctx)
    pgref = _pgref(ctx)
    decision = pgref.decision()
    if decision not in ("refuse", "noop"):
        return CheckResult(False, f"decision.rs states {decision!r}; it is refuse or noop", "spec")
    rng = ctx.rng
    ids = [i for i, _ in ACCOUNTS]
    selfs = [(a, a, rng.randint(1, 60)) for a in rng.sample(ids, 3)]
    typed = [(1, 2, 100 + rng.randint(1, 50)), (rng.choice(MISSING), 2, rng.randint(1, 50)), (4, rng.choice(MISSING), rng.randint(1, 50))]
    plans = pgref.compile(selfs + typed)
    out = _suite(ctx, plans, decision, step="typed", schema=schema)
    want_self = "SelfTransfer" if decision == "refuse" else "Committed"
    for r in out["records"][:3]:
        if r["got"] != want_self or r["after"] != r["before"]:
            return CheckResult(False, f"a self-transfer returned {r['got']} and left {_bal(r['after'])}; your decision ({decision}) says {want_self} with the state unchanged", "implementation", _show(r, ctx.seed))
    got = [r["got"] for r in out["records"][3:]]
    want = ["Insufficient", "NoSuchAccount(from)", "NoSuchAccount(to)"]
    if got != want or len(set(got)) != 3:
        r = next(r for r, g, w in zip(out["records"][3:], got, want) if g != w) if got != want else out["records"][3]
        return CheckResult(False, f"the three refusals came back as {', '.join(got)}, not {', '.join(want)}", "implementation", _show(r, ctx.seed))
    # (iii) the case-merge mutation on a fresh self-transfer
    a = rng.choice([i for i, b in ACCOUNTS if b > 0])
    amount = rng.randint(1, dict(ACCOUNTS)[a])
    mutant = mutate_case_merge(pgref, (a, a, amount))
    db = _Db(ctx, schema)
    try:
        before = db.alpha()
        got_m, log = run_plan(db.conn, mutant)
        after = db.alpha()
    finally:
        db.close()
    _pg(ctx).record(step="case-merge", input_text=json.dumps(mutant) + "\n", lines=[f"executed: 1 commands", f"classes: {got_m}=1"], ms=0, seed=ctx.seed, extension="plan.json")
    _publish(ctx, c3={"decision": decision, "caseMerge": {"command": [a, a, amount], "outcome": got_m, "log": log}})
    if got_m == "Committed" or after != before:
        return CheckResult(
            False,
            f"the case-merge mutation of your plan committed a self-transfer of {amount} on account {a}: {before.get(a)} -> {after.get(a)}",
            "implementation",
            (f"merged statement expected {mutant['steps'][0]['expect'] if mutant['steps'] else '-'} rows; a self-transfer touches one row", "exact expectations make a merged statement fail loudly"),
        )
    return CheckResult(True, f"self-transfers return {want_self} and change nothing; the three refusals are distinct; the case-merge mutant was rolled back ({'; '.join(log)})")


@_guard
def c4(ctx: CheckContext) -> CheckResult:
    """LAB-6.c4: your suite runs and catches the course's mutants."""
    schema = _schema(ctx)
    pgref = _pgref(ctx)
    decision = pgref.decision()
    cmds = pgref.gen(ctx.seed, MIN_SUITE)
    if len(cmds) < MIN_SUITE:
        return CheckResult(False, f"your generator drew {len(cmds)} commands for n = {MIN_SUITE}", "implementation")
    plans = pgref.compile(cmds)
    variants = {
        "your plan": plans,
        "CHECK-only guard": mutate_check_only(plans),
        "unchecked credit": mutate_unchecked_credit(plans),
        "case-merge": [mutate_case_merge(pgref, c) for c in cmds],
    }
    results: dict[str, Any] = {}
    for name, ps in variants.items():
        out = _suite(ctx, ps, decision, step=re.sub(r"[^a-z]+", "-", name.lower()).strip("-"), schema=schema)
        verdicts = pgref.compare([((r["want"], r["ref_after"]), (r["got"], r["after"])) for r in out["records"]])
        first = next((r for r, same in zip(out["records"], verdicts) if not same), None)
        results[name] = (out, first)
    # statistics, from the reference run of your commands
    own = results["your plan"][0]["records"]
    shares: dict[str, int] = {}
    largest = max(b for _, b in ACCOUNTS)
    for r in own:
        shares[r["want"]] = shares.get(r["want"], 0) + 1
        largest = max([largest, *r["ref_after"].values()])
    n = len(own)
    selfs = sum(1 for c in cmds if c[0] == c[1])
    stats = {"n": n, "classShare": {k: round(v / n, 3) for k, v in sorted(shares.items())}, "selfTransferShare": round(selfs / n, 3), "largestBalance": largest, "engines": [_pg(ctx).version_string], "pglite": "the tab half runs on PGlite in the tab, not here"}
    kills = {name: (first is not None) for name, (_out, first) in results.items() if name != "your plan"}
    _publish(ctx, c4={"stats": stats, "killed": kills})
    detail = (
        f"n {n}; outcome shares: " + ", ".join(f"{k} {v:.1%}" for k, v in stats["classShare"].items()),
        f"self-transfer share {selfs / n:.1%}; largest balance {largest}",
        "engines: " + (_pg(ctx).version_string or "?") + "; PGlite: the tab half, re-checked there",
    )
    own_first = results["your plan"][1]
    if own_first is not None:
        return CheckResult(False, "your comparison reports a difference on your own plan", "implementation", (*_show(own_first, ctx.seed), *detail))
    true_div = _divergence(own)
    if true_div is not None:
        return CheckResult(False, "your plan diverges from the reference, and your comparison did not see it", "implementation", (*_show(true_div, ctx.seed), *detail))
    missed = [name for name, killed in kills.items() if not killed]
    if missed:
        return CheckResult(False, f"your suite did not catch: {', '.join(missed)}", "implementation", (*detail, "a test reaches only what its generator draws, and sees only what its comparison compares"))
    ctx.claim("CL-6.1")
    ctx.tcb("your generator and comparison (gen.rs)", "tested")
    lines = [f"{name}: caught at command {first['i'] + 1}" for name, (_o, first) in results.items() if first is not None]
    return CheckResult(True, f"your suite of {n} commands passes your plan and catches all three course mutants", details=(*detail, *lines))


def _catalog(ctx: CheckContext) -> dict[str, Any]:
    return json.loads(ctx.text(CATALOG))


@_guard
def c5(ctx: CheckContext) -> CheckResult:
    """LAB-6.c5: each spec reproduces the matching catalog row."""
    pg = _pg(ctx)
    catalog = _catalog(ctx)
    problems: list[str] = []
    lines: list[str] = []
    levels_seen: set[str] = set()
    for name, (row_spec, required) in SPECS.items():
        rel = f"{LAB_DIR}/specs/{name}.spec"
        text = ctx.statement(rel, "sql")
        row = catalog["rows"].get(row_spec)
        if row is None:
            raise ToolUnavailable(f"{CATALOG} has no row {row_spec}; unpack the LAB-6 zip again")
        h = pg.isorun(text, step=name, spec_label=rel)
        got: dict[str, set[str]] = {}
        for p in h["permutations"]:
            if p.get("hung") or p.get("setupError"):
                problems.append(f"{name}: permutation {p['index']} did not run to the end ({p.get('hung') or p.get('setupError')})")
                continue
            levels = {lv for s, lv in p["levels"].items() if s != "obs"}
            level = levels.pop() if len(levels) == 1 else "mixed"
            levels_seen.add(level)
            allowed = set(row["signatures"].get(level, []))
            if p["signature"] not in allowed:
                problems.append(f"{name}: permutation {p['index']} ({' '.join(p['permutation'])}) at {level} gave {p['signature'] or 'no outcome'}, which {row_spec} never recorded at that level")
            got.setdefault(level, set()).add(p["signature"])
        for level, needle in required.items():
            if not any(needle in sig for sig in got.get(level, set())):
                problems.append(f"{name}: no permutation at {level} reaches {needle!r}, the outcome {row_spec} is about")
        lines.append(f"{name} ({row_spec}): " + "; ".join(f"{lv}: {', '.join(sorted(s))}" for lv, s in sorted(got.items())))
    st = _state(ctx)
    st.level = "mixed" if len(levels_seen) > 1 else (levels_seen.pop() if levels_seen else None)
    _publish(ctx, c5={"specs": lines})
    if problems:
        return CheckResult(False, problems[0], "spec", (*problems[1:6], *lines))
    ctx.claim("CL-6.2")
    ctx.tcb("the catalog rows' recorded outcomes (RUN-pg-catalog)", "trusted")
    return CheckResult(True, "every permutation of your four specs gives an outcome its catalog row recorded, and each reaches the row's outcome", details=tuple(lines))


def _attempt_cases(ctx: CheckContext) -> list[tuple[str, bool, list[str]]]:
    cases: list[tuple[str, bool, list[str]]] = []
    for raw in ctx.text(ATTEMPTS).splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if parts[0] != "case" or len(parts) < 4:
            raise ToolUnavailable(f"{ATTEMPTS} has a line it cannot read: {raw}; unpack the LAB-6 zip again")
        cases.append((parts[1], parts[2] == "rereads", parts[3:]))
    return cases


def expected_decisions(k: int, rereads: bool, attempts: list[str]) -> list[str]:
    """The course's rule (curriculum/S06-correspondence.md section 2, S6.L7): retry the whole command on 40001
    and 40P01; on 23505 and 23P01 only for a command that re-reads the key before it writes; never on 22003, a
    typed refusal or another error; stop with GaveUp when the k-th attempt would be retried."""
    out = []
    for i, a in enumerate(attempts, start=1):
        code = a.split(":", 1)[1] if a.startswith("sqlstate:") else None
        retryable = code in ("40001", "40P01") or (rereads and code in ("23505", "23P01"))
        if not retryable:
            out.append("stop")
            break
        if i >= k:
            out.append("gaveup")
            break
        out.append("retry")
    return out


@_guard
def c6(ctx: CheckContext) -> CheckResult:
    """LAB-6.c6: the classifier retries the right failures and stops."""
    pgref = _pgref(ctx)
    cases = _attempt_cases(ctx)
    k, decided = pgref.retry(cases)
    if not (K_RANGE[0] <= k <= K_RANGE[1]):
        return CheckResult(False, f"retry.rs declares K = {k}; a budget from {K_RANGE[0]} to {K_RANGE[1]} attempts is what LAB-6.6 asks for", "spec")
    for cid, rereads, attempts in cases:
        want = expected_decisions(k, rereads, attempts)
        got = decided.get(cid, [])[: len(want)]
        if got != want:
            at = next((i for i, (g, w) in enumerate(zip(got, want)) if g != w), min(len(got), len(want)))
            return CheckResult(
                False,
                f"attempt fixture {cid}: after attempt {at + 1} ({attempts[at]}) your policy decides {got[at] if at < len(got) else 'nothing'}; the rule says {want[at]}",
                "implementation",
                (f"attempts: {' '.join(attempts)}; re-reads its key: {'yes' if rereads else 'no'}; K = {k}", "retry the decision, not the statement: 40001 and 40P01 retry the whole command; 22003 and typed refusals are final"),
            )
    # the live loop: the holds check-then-insert at SERIALIZABLE, B retried from BEGIN
    live = _live_retry(ctx, pgref)
    _publish(ctx, c6={"k": k, "cases": len(cases), "live": live})
    if live["decisions"] != ["retry", "stop"] or live["held"] != 80:
        return CheckResult(False, f"on PostgreSQL, B's attempts were {', '.join(live['attempts'])} and your policy decided {', '.join(live['decisions'])}; the whole command should run again after 40001, then stop on the guard's refusal", "implementation", tuple(live["log"]))
    ctx.claim("CL-6.5")
    return CheckResult(True, f"all {len(cases)} attempt fixtures decided by the rule at K = {k}; on PostgreSQL B retried from BEGIN after {live['attempts'][0]} and stopped on {live['attempts'][1]}", details=tuple(live["log"]))


def _live_retry(ctx: CheckContext, pgref: Pgref) -> dict[str, Any]:
    import psycopg

    pg = _pg(ctx)
    admin, name, conninfo = pg.scratch_db()
    started = time.monotonic()
    log: list[str] = []
    attempts: list[str] = []
    decisions: list[str] = []
    held = None
    read = "CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1"
    write = "INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80"
    try:
        with psycopg.connect(conninfo, autocommit=True) as a, psycopg.connect(conninfo, autocommit=True) as b:
            a.execute(b"CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL); INSERT INTO acct VALUES (1, 100); CREATE TABLE holds(acct int, amt bigint)")  # type: ignore[arg-type]
            for conn in (a, b):
                _simple(conn, "BEGIN ISOLATION LEVEL SERIALIZABLE")
                _simple(conn, read)
            _simple(a, write)
            _simple(b, write)
            ca = _simple(a, "COMMIT")
            cb = _simple(b, "COMMIT")
            log.append(f"A: COMMIT {'ok' if ca is None else ca}; B: COMMIT {'ok' if cb is None else cb}")
            attempts.append(f"sqlstate:{cb}" if cb else "Committed")
            for _ in range(5):
                _k, d = pgref.retry([("live", False, attempts)])
                decisions = d.get("live", [])
                if not decisions or decisions[-1] != "retry":
                    break
                _simple(b, "BEGIN ISOLATION LEVEL SERIALIZABLE")
                _simple(b, read)
                res = b.pgconn.exec_(write.encode())
                rows = _rows(res)
                if rows != 1:
                    _simple(b, "ROLLBACK")
                    attempts.append("Insufficient")
                else:
                    code = _simple(b, "COMMIT")
                    attempts.append(f"sqlstate:{code}" if code else "Committed")
            held = int(a.execute(b"SELECT coalesce(sum(amt), 0) FROM holds").fetchone()[0])  # type: ignore[index]
    finally:
        pg.drop_db(admin, name)
    for i, (att, dec) in enumerate(zip(attempts, decisions), start=1):
        log.append(f"B attempt {i}: {att} -> {dec}")
    log.append(f"held on account 1 at the end: {held}")
    pg.record(step="retry-live", input_text=f"{read};\n{write};\n", lines=[f"attempt: {i} {att} -> {dec}" for i, (att, dec) in enumerate(zip(attempts, decisions), start=1)] or ["attempt: none"], ms=int(round((time.monotonic() - started) * 1000)))
    if cb:
        pg.sqlstates[cb] = pg.sqlstates.get(cb, 0) + 1
    _state(ctx).level = "serializable"
    return {"attempts": attempts, "decisions": decisions, "held": held, "log": log}


# ---- LAB-6.7
def _manifest(ctx: CheckContext) -> list[dict[str, Any]]:
    import yaml

    text = ctx.statement(MANIFEST, "yaml")
    data = yaml.safe_load(text)
    return list(data["fixtures"])


def learner_classify(ctx: CheckContext, pgref: Pgref, histories: dict[str, dict[str, Any]], semantics_of: dict[str, list[str]]) -> dict[tuple[str, str], Any]:
    """Classify histories with the learner's alpha and R, in two batched calls of `pgref refine`."""
    from statespace import history

    names = list(histories)
    starts = pgref.refine([("start", history.d_lines(histories[n]["d0"])) for n in names])
    s0 = {}
    for n, (lines, ok) in zip(names, starts):
        try:
            s0[n] = (history.state_from_lines(lines), ok)
        except ValueError as error:
            raise BuildFailed(f"pgref refine printed a state it cannot read: {error}") from error
    pending: list[tuple[str, str, Any]] = []
    for n in names:
        for sem in semantics_of[n]:
            found = history.search(histories[n], s0[n][0], semantics=sem)
            pending.append((n, sem, found))
    queries = [("r", history.state_lines(state) + history.d_lines(histories[n]["dfinal"])) for n, _sem, found in pending for _order, state in found.ends]
    answers = iter(ok for _lines, ok in (pgref.refine(queries) if queries else []))
    verdicts: dict[tuple[str, str], Any] = {}
    for n, sem, found in pending:
        related = [next(answers) for _ in found.ends]
        verdicts[(n, sem)] = history.classify(
            histories[n],
            start=lambda _d, n=n: s0[n],
            relate=lambda pairs, related=related: related[: len(pairs)],
            semantics=sem,
        )
    return verdicts


@_guard
def c7(ctx: CheckContext) -> CheckResult:
    """LAB-6.c7: your R classifies the fixtures as the reference does."""
    import yaml

    from statespace import history

    refinement = ctx.statement(REFINEMENT, "yaml")
    try:
        stated = yaml.safe_load(refinement) or {}
    except yaml.YAMLError as error:
        raise InputRefused(f"{REFINEMENT} is not YAML: {error}") from error
    if "TODO(you)" in refinement or not all(stated.get(k) for k in ("alpha", "wf", "relation", "bound")):
        return CheckResult(False, f"{REFINEMENT} does not yet state alpha, wf, the relation and the search bound", "spec", ("fill in each field and remove the TODO(you) lines",))
    if int(stated.get("bound", 0)) != history.BOUND:
        return CheckResult(False, f"{REFINEMENT} states a search bound of {stated.get('bound')}; the checker's is {history.BOUND} transactions", "spec")
    pgref = _pgref(ctx)
    fixtures = _manifest(ctx)
    histories = {f["id"]: json.loads(ctx.text(f"{LAB_DIR}/fixtures/{f['history']}")) for f in fixtures}
    semantics_of = {f["id"]: sorted(f["expect"]) for f in fixtures}
    verdicts = learner_classify(ctx, pgref, histories, semantics_of)
    ctx.tcb(f"the abstract-serializability checker (statespace.history), bound {history.BOUND}", "trusted")
    ctx.tcb("your alpha and R (refine.rs)", "tested")
    lines: list[str] = []
    wrong: list[str] = []
    for f in fixtures:
        for sem, want in sorted(f["expect"].items()):
            v = verdicts[(f["id"], sem)]
            mark = "ok" if v.verdict == want else "MISCLASSIFIED"
            lines.append(f"{mark} {f['id']} [{sem}]: {v.line()}")
            if v.verdict != want:
                wrong.append(f"{f['id']} under {sem}: yours {v.verdict}, the reference {want} ({v.reason})")
    _publish(ctx, c7={"fixtures": len(fixtures), "bound": history.BOUND, "verdicts": lines})
    if wrong:
        mutants = [f["id"] for f in fixtures if f.get("rMutant")]
        hint = "an R-mutant fixture is accepted: your R lets through a database it should not relate to S" if any(w.split(" ")[0] in mutants for w in wrong) else "some serial order, not the commit order"
        return CheckResult(False, wrong[0], "implementation", (*wrong[1:4], hint, *lines))
    ctx.claim("CL-6.3")
    return CheckResult(True, f"with your alpha and R the checker classifies all {len(fixtures)} fixtures as the reference does, and rejects both R-mutants (bound {history.BOUND})", details=tuple(lines))


# ---- LAB-6.8
HOLDS_RUNTIME = """# The holds check-then-insert at your runtime's level (LAB-6.8), written by statespace check.
setup
{{
  CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL);
  INSERT INTO acct VALUES (1, 100);
  CREATE TABLE holds(acct int, amt bigint);
}}

teardown
{{
  DROP TABLE acct, holds;
}}

session s1
step s1b {{ {begin} }}
step s1r {{ CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }}
step s1w {{ INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }}
step s1c {{ COMMIT; }}

session s2
step s2b {{ {begin} }}
step s2r {{ CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail FROM acct a WHERE a.id = 1; SELECT avail FROM seen; }}
step s2w {{ INSERT INTO holds SELECT 1, 80 WHERE (SELECT avail FROM seen) >= 80 RETURNING acct, amt; }}
step s2c {{ COMMIT; }}

session obs
step d0 {{ SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }}
step chk {{ SELECT 'acct' AS t, id AS k, bal AS v FROM acct UNION ALL SELECT 'hold', acct, amt FROM holds ORDER BY 1, 2, 3; }}

# @d0 d0
# @dfinal chk
# @tx s1 {{"op": "hold", "account": 1, "amount": 80}} outputs=s1r,s1w write=s1w
# @tx s2 {{"op": "hold", "account": 1, "amount": 80}} outputs=s2r,s2w write=s2w

{permutations}
"""


def _interleavings(a: list[str], b: list[str]) -> list[list[str]]:
    if not a:
        return [list(b)]
    if not b:
        return [list(a)]
    return [[a[0], *rest] for rest in _interleavings(a[1:], b)] + [[b[0], *rest] for rest in _interleavings(a, b[1:])]


def _cannot_hang(perm: list[str]) -> bool:
    """For two compiled transfers that both lock their source account in their first step: True when no step
    is sent to a session whose first step still waits for the other session's lock (isorun would hang)."""
    holder: str | None = None
    waiting: set[str] = set()
    for step in perm:
        s = step[:2]
        if step.endswith("p1"):
            if holder is None:
                holder = s
            elif holder != s:
                waiting.add(s)
            continue
        if s in waiting:
            return False
        if step.endswith("c") and holder == s:
            holder = next(iter(waiting), None)
            waiting.clear()
    return True


def _literal(sql: str, params: list[int]) -> str:
    for i in sorted(range(len(params)), reverse=True):
        sql = re.sub(rf"\${i + 1}(?![0-9])", str(params[i]), sql)
    return sql


def _transfer_spec(schema: str, begin: list[str], plans: list[dict[str, Any]], perms: list[list[str]]) -> str:
    sessions = []
    notes = []
    for k, plan in enumerate(plans, start=1):
        s = f"s{k}"
        steps = [f"step {s}b {{ {'; '.join(begin)}; }}"]
        names = []
        for j, step in enumerate(plan["steps"], start=1):
            steps.append(f"step {s}p{j} {{ {_literal(step['sql'], step['params'])}; }}")
            names.append(f"{s}p{j}")
        steps.append(f"step {s}c {{ COMMIT; }}")
        sessions.append(f"session {s}\n" + "\n".join(steps))
        f, t, a = plan["cmd"]
        notes.append(f'# @tx {s} {{"op": "transfer", "from": {f}, "to": {t}, "amount": {a}, "quiet": true}} outputs= write=')
    accounts = ", ".join(f"({i}, {b})" for i, b in ACCOUNTS)
    return (
        "# Two compiled transfers at your runtime's level (LAB-6.8), written by statespace check.\nsetup\n{\n"
        + schema.strip()
        + f"\n}}\nsetup\n{{\n  INSERT INTO acct (id, bal) VALUES {accounts};\n}}\n\nteardown\n{{\n  DROP SCHEMA public CASCADE; CREATE SCHEMA public;\n}}\n\n"
        + "\n\n".join(sessions)
        + "\n\nsession obs\nstep d0 { SELECT 'acct' AS t, id AS k, bal AS v FROM acct ORDER BY 1, 2, 3; }\nstep chk { SELECT 'acct' AS t, id AS k, bal AS v FROM acct ORDER BY 1, 2, 3; }\n\n# @d0 d0\n# @dfinal chk\n"
        + "\n".join(notes)
        + "\n\n"
        + "\n".join("permutation " + " ".join(["d0", *p, "chk"]) for p in perms)
        + "\n"
    )


@_guard
def c8(ctx: CheckContext) -> CheckResult:
    """LAB-6.c8: the runtime passes your suite and its histories are accepted."""
    from statespace import history, isorun

    schema = _schema(ctx)
    pgref = _pgref(ctx)
    pg = _pg(ctx)
    decision = pgref.decision()
    begin = pgref.begin()
    if not begin:
        return CheckResult(False, "runtime.rs begin() returns no statement", "implementation")
    st = _state(ctx)
    read_backs: list[str] = []

    def level_check(level: str) -> str | None:
        read_backs.append(level)
        if not pgref.level_ok(level):
            return f"your runtime refused the level {level}"
        return None

    k, _ = pgref.retry([])

    def retry(hist: list[str]) -> str:
        _k, d = pgref.retry([("x", False, hist)])
        return (d.get("x") or ["stop"])[-1]

    cmds = pgref.gen(ctx.seed, MIN_SUITE)
    plans = pgref.compile(cmds)
    out = _suite(ctx, plans, decision, step="runtime-suite", schema=schema, begin=begin, level_check=level_check, retry=retry)
    levels = sorted(set(read_backs))
    st.level = levels[0] if len(levels) == 1 else "mixed"
    problems: list[str] = []
    if levels != ["serializable"]:
        problems.append(f"sessions read back {', '.join(levels) or 'nothing'}, not serializable")
    bad = _divergence(out["records"])
    if bad is not None and not problems:
        problems.append(f"command {bad['i'] + 1} diverges from the reference through your runtime: {bad['want']} against {bad['got']}")
    # concurrent histories, at the runtime's level, checked with your R
    hold_perms = _interleavings(["s1b", "s1r", "s1w", "s1c"], ["s2b", "s2r", "s2w", "s2c"])
    spec_text = HOLDS_RUNTIME.format(begin="; ".join(begin) + ";", permutations="\n".join("permutation " + " ".join(["d0", *p, "chk"]) for p in hold_perms))
    histories: dict[str, dict[str, Any]] = {}
    h = pg.isorun(spec_text, step="runtime-holds", spec_label="holds at your runtime's level")
    for p in h["permutations"]:
        if not (p.get("hung") or p.get("setupError")):
            histories[f"holds-{p['index']}"] = history.extract(spec_text, p, label=f"holds permutation {p['index']}")
    pair = pgref.compile([(1, 2, 30), (1, 4, 40)])
    steps1 = [f"s1b", *[f"s1p{j}" for j in range(1, len(pair[0]["steps"]) + 1)], "s1c"]
    steps2 = [f"s2b", *[f"s2p{j}" for j in range(1, len(pair[1]["steps"]) + 1)], "s2c"]
    all_perms = [p for p in _interleavings(steps1, steps2) if _cannot_hang(p)]
    rng = random.Random(ctx.seed)
    chosen = [steps1 + steps2, steps2 + steps1] + rng.sample(all_perms, min(10, len(all_perms)))
    tspec = _transfer_spec(schema, begin, pair, chosen)
    try:
        isorun.parse_spec(tspec)
    except isorun.SpecError as error:
        return CheckResult(False, f"your compiled plans do not make an isolationtester spec: {error}", "implementation")
    th = pg.isorun(tspec, step="runtime-transfers", spec_label="two compiled transfers at your runtime's level")
    for p in th["permutations"]:
        if not (p.get("hung") or p.get("setupError")):
            histories[f"transfers-{p['index']}"] = history.extract(tspec, p, label=f"transfers permutation {p['index']}")
    hung = [p["index"] for p in [*h["permutations"], *th["permutations"]] if p.get("hung") or p.get("setupError")]
    verdicts = learner_classify(ctx, pgref, histories, {n: ["z"] for n in histories})
    rejected = [(n, v) for (n, _s), v in verdicts.items() if v.verdict != "accept"]
    if rejected and not problems:
        n, v = rejected[0]
        problems.append(f"the checker rejects the {histories[n]['label']} ({histories[n]['signature']}): {v.reason}")
    if hung and not problems:
        problems.append(f"{len(hung)} concurrent permutation(s) did not run to the end")
    # the commit-time check in the schema
    triggers = _deferred_triggers(ctx, schema)
    if not triggers and not problems:
        problems.append(f"{SCHEMA} declares no DEFERRABLE INITIALLY DEFERRED constraint trigger: the S6.L5 check at commit is not in the schema")
    _publish(ctx, c8={"readBack": levels, "k": k, "attempts": out["attempts"], "histories": len(histories), "accepted": len(histories) - len(rejected), "deferredTriggers": triggers})
    detail = (
        f"suite: {len(out['records'])} commands through your runtime; sessions read back {', '.join(levels)}; attempts by result: " + ", ".join(f"{a} {n}" for a, n in sorted(out["attempts"].items())),
        f"concurrent histories: {len(histories)} ({len(hold_perms)} holds permutations, {len(chosen)} compiled-transfer permutations), {len(histories) - len(rejected)} accepted by the checker with your R",
        "deferred constraint triggers: " + (", ".join(triggers) or "none"),
    )
    if problems:
        suspect = "spec" if "declares no" in problems[0] else "implementation"
        return CheckResult(False, problems[0], suspect, detail)
    ctx.claim("CL-6.4")
    ctx.tcb("your runtime (runtime.rs), compiler and retry policy", "tested")
    ctx.tcb("deferred constraint triggers: " + ", ".join(triggers), "trusted")
    return CheckResult(True, "your suite passes through the runtime, every session reads back serializable, and every concurrent history is accepted with your R", details=detail)


def _deferred_triggers(ctx: CheckContext, schema: str) -> list[str]:
    db = _Db(ctx, schema)
    try:
        rows = db.conn.execute(
            b"SELECT t.tgname || ' on ' || c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid "
            b"WHERE t.tgconstraint <> 0 AND t.tgdeferrable AND t.tginitdeferred AND NOT t.tgisinternal ORDER BY 1"
        ).fetchall()
    finally:
        db.close()
    return [str(r[0]) for r in rows]


# ---- LAB-6.9
def c9(ctx: CheckContext) -> CheckResult:
    """LAB-6.c9: your claim cards pass validation."""
    import yaml

    from statespace.schema.validation import validate

    problems: list[str] = []
    ok: list[str] = []
    for n, template in enumerate(CL, start=1):
        rel = f"claims/cl-6-{n}.yaml"
        text = ctx.text(rel)
        if "TODO(you)" in text:
            problems.append(f"{rel} still carries TODO(you)")
            continue
        try:
            card = yaml.safe_load(text)
        except yaml.YAMLError as error:
            problems.append(f"{rel} is not YAML: {str(error).splitlines()[0]}")
            continue
        issues = validate("claim", card)
        if issues:
            problems.append(f"{rel}: {issues[0]['instancePath'] or '/'} {issues[0]['message']}")
            continue
        if card.get("template") != template:
            problems.append(f"{rel} names template {card.get('template')}, not {template}")
            continue
        stmt = (card.get("statement") or {}).get("path")
        if stmt:
            if not ctx.path(stmt).is_file():
                problems.append(f"{rel} pins {stmt}, which is not in your repository")
                continue
            kind = {".sql": "sql", ".yaml": "yaml", ".yml": "yaml", ".tla": "tla", ".smt2": "smt2"}.get(Path(stmt).suffix, "yaml")
            ctx.statement(stmt, kind)
        for key in ("specimen",):
            ref = (card.get("if_weakened") or {}).get(key)
            if ref and not ctx.path(ref).is_file():
                problems.append(f"{rel}: its if_weakened specimen {ref} is not in your repository")
        receipt = (card.get("method") or {}).get("receipt")
        if receipt and not ctx.path(receipt).is_file():
            problems.append(f"{rel}: its method names {receipt}, which is not in your repository")
        weakened = card.get("if_weakened") or {}
        if not (weakened.get("text") or weakened.get("specimen")):
            problems.append(f"{rel}: the if_weakened field names no witness")
        if not problems or not problems[-1].startswith(rel):
            ok.append(f"{rel}: {template}, claim@1")
    ctx.tcb("claim@1 (schemas/claim.schema.json)", "validated")
    if problems:
        return CheckResult(False, problems[0], "spec", tuple(problems[1:6]))
    return CheckResult(True, "CL-6.1 to CL-6.5 pass claim@1 validation, and their pinned statements are on the receipt", details=tuple(ok))


# ------------------------------------------------------------------------------------------ Prove-it
# The Prove-it mutants of content/stages/S6/lab.yaml (curriculum/S06-correspondence.md section 3), as operators
# on what the learner's crate answers. `prove_it(id)` applies one to every pgref call in this process, so the
# checks then grade the mutant of the learner's own artifact. `statespace defend` (not built yet) is to apply
# them after the learner predicts; the course applies them to its private solution, where each key holds.
# Nothing a learner's files or environment set switches one on.
PROVE_IT: dict[str, dict[str, str]] = {
    "rmw-compile": {"template": "t4", "check": "LAB-6.c8", "key": "at READ COMMITTED (with rc-pool) the compiled pair commits both and the checker rejects the history; at SERIALIZABLE a session fails with 40001 and the history is accepted"},
    "drop-credit-check": {"template": "t1", "check": "LAB-6.c2", "key": "the outcome classes diverge on a missing to"},
    "retry-40001-only": {"template": "t2", "check": "LAB-6.c6", "key": "the opposite-order attempt fixture surfaces 40P01 as a final outcome"},
    "rc-pool": {"template": "t3", "check": "LAB-6.c8", "key": "sessions read back read committed; the holds history commits both and the checker rejects it"},
    "strict-guard": {"template": "t2", "check": "LAB-6.c2", "key": "a debit equal to the balance is refused"},
    "r-totals-only": {"template": "t4", "check": "LAB-6.c7", "key": "the wrong-account fixture is accepted"},
}
_MUTANT: str | None = None


class prove_it:  # noqa: N801 - used as a context manager: with prove_it("strict-guard"): ...
    def __init__(self, mutant: str) -> None:
        if mutant not in PROVE_IT:
            raise KeyError(mutant)
        self.mutant = mutant

    def __enter__(self) -> "prove_it":
        global _MUTANT
        _MUTANT = self.mutant
        return self

    def __exit__(self, *_exc: object) -> None:
        global _MUTANT
        _MUTANT = None


def _mutate_plans(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if _MUTANT == "drop-credit-check":
        return mutate_unchecked_credit(plans)
    if _MUTANT == "strict-guard":
        out = json.loads(json.dumps(plans))
        for p in out:
            for st in p["steps"]:
                if st["role"] == "debit":
                    st["sql"] = re.sub(r"bal\s*>=", "bal >", st["sql"])
        return out
    if _MUTANT == "rmw-compile":
        out = json.loads(json.dumps(plans))
        for p in out:
            steps = []
            for st in p["steps"]:
                if st["role"] == "debit":
                    f, _t, a = p["cmd"]
                    steps.append({"role": "check", "expect": "exactly:1", "on_mismatch": "NoSuchAccount(from)", "params": [f], "sql": "CREATE TEMP TABLE IF NOT EXISTS seen ON COMMIT DROP AS SELECT bal FROM acct WHERE id = $1"})
                    steps.append({**st, "params": [f, a], "sql": "UPDATE acct SET bal = (SELECT bal FROM seen) - $2 WHERE id = $1 AND (SELECT bal FROM seen) >= $2"})
                else:
                    steps.append(st)
            p["steps"] = steps
        return out
    return plans


def _mutate_retry(cases: list[tuple[str, bool, list[str]]], decided: dict[str, list[str]]) -> dict[str, list[str]]:
    if _MUTANT != "retry-40001-only":
        return decided
    out = {}
    for cid, _rereads, attempts in cases:
        words = list(decided.get(cid, []))
        for i, a in enumerate(attempts[: len(words)]):
            if a == "sqlstate:40P01":
                words[i] = "stop"
        out[cid] = words
    return out


def _mutate_refine(queries: list[tuple[str, list[str]]], answers: list[tuple[list[str], bool]]) -> list[tuple[list[str], bool]]:
    if _MUTANT != "r-totals-only":
        return answers
    out = []
    for (kind, body), (lines, ok) in zip(queries, answers):
        if kind == "r":
            s_total = sum(int(l.split()[2]) for l in body if l.startswith("bal "))
            d_total = sum(int(l.split()[2]) for l in body if l.startswith("acct ") and l.split()[2] != "null")
            ok = s_total == d_total
        else:
            ok = True
        out.append((lines, ok))
    return out


# ------------------------------------------------------------------------------------------ the lab
LAB = Lab(
    "LAB-6",
    "pg-refinement",
    stages=(
        Stage("LAB-6.1", "statespace doctor, then isorun replays the read-modify-write history", (CheckSpec("LAB-6.c1", "The recorded history replays as recorded.", c1),)),
        Stage("LAB-6.2", "Compile Transfer into a plan with exact expectations", (CheckSpec("LAB-6.c2", "Your plan's outcomes equal the reference's.", c2),)),
        Stage("LAB-6.3", "Typed errors, and the self-transfer decision in SQL", (CheckSpec("LAB-6.c3", "Typed errors are distinct, and the self-transfer follows your decision.", c3),)),
        Stage("LAB-6.4", "A differential harness: your generator, classes and statistics", (CheckSpec("LAB-6.c4", "Your suite runs on both engines and catches the course's mutants.", c4),), claims=("CL-6.1",)),
        Stage("LAB-6.5", "Specs for the lost update, write skew, a deadlock and the conditional twin", (CheckSpec("LAB-6.c5", "Each spec reproduces the matching catalog row.", c5),), claims=("CL-6.2",)),
        Stage("LAB-6.6", "A retry policy for serialization failures and deadlocks", (CheckSpec("LAB-6.c6", "The classifier retries the right failures and stops.", c6),), claims=("CL-6.5",)),
        Stage("LAB-6.7", "alpha, wf and R, and the abstract-serializability check", (CheckSpec("LAB-6.c7", "Your R classifies the fixtures as the reference does.", c7),), claims=("CL-6.3",)),
        Stage("LAB-6.8", "A transaction runtime wired to your compiler (capstone S10.L4)", (CheckSpec("LAB-6.c8", "The runtime passes your suite and its histories are accepted.", c8),), claims=("CL-6.4",)),
        Stage("LAB-6.9", "Claim cards CL-6.1 to CL-6.5 and their assumed clauses", (CheckSpec("LAB-6.c9", "Your claim cards pass validation.", c9),)),
    ),
)

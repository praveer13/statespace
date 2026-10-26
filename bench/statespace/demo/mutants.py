"""LAB-10's Prove-it mutants, applied to the reference components, each graded by the rule of the LAB-10
check that owns it (content/stages/S10/lab.yaml `proveIt`; labs/README.md section 13).

`statespace defend lab10` (W2-T31's command, not built yet) seeds these into a copy of the learner's Core
and report; this module shows that every mutant runs and that its key holds against the reference, which
GATE-labs asks of every mutant. Run it with a PostgreSQL:

    python -m statespace.demo.mutants --dsn postgresql://...

It prints one line per mutant, `killed` or `SURVIVED`, with what killed it, and exits 0 when every mutant is
killed. The report mutants need no database.
"""

from __future__ import annotations

import argparse
import copy
import sys
import tempfile
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from . import corpus, obligations, pipeline, sqlplan
from .obligations import Answer

__all__ = ["MUTANTS", "main"]


def _z3_ask(root: Path) -> Any:
    from statespace.lanes.z3 import Z3Session

    return pipeline.z3_ask(Z3Session(root=root, workdir=root / "runs"))


def skip_premise_witness(ask: Any, _conn: Any) -> tuple[bool, str]:
    """The checker drops the premise query: classify sees a premise that is always sat."""
    fid, source, expected = next(c for c in corpus.CHECKER if c[0] == "ck-contradictory-premises")
    program, types, _ = pipeline.front(source)
    obs = obligations.obligations(program, types)
    got = obligations.classify(ask(obs[0].query, "mut-skip-premise"), Answer("sat"))
    return got != expected["nonneg"], f"{fid}: the mutant reports {got} where the key is {expected['nonneg']} (SP-4.4's class), LAB-10.c2"


def _compile_without_rowcount(program: dict[str, Any], types: dict[str, str]) -> dict[str, Any]:
    plan = sqlplan.compile_plan(program, types)
    plan["steps"] = [dict(s, rowcount=None) if s["kind"] == "update" else s for s in plan["steps"] if s["kind"] != "exists"]
    return plan


def _execute_no_rowcount(conn: Any, plan: dict[str, Any], args: dict[str, Any], **kw: Any) -> dict[str, Any]:
    plan = copy.deepcopy(plan)
    for s in plan["steps"]:
        if s["kind"] == "update" and s.get("rowcount") is None:
            s["rowcount"] = -1  # never compared: any rowcount passes
    import psycopg  # pyright: ignore[reportMissingImports]

    params = {f"p_{k}": v for k, v in args.items()}
    conn.execute("BEGIN ISOLATION LEVEL SERIALIZABLE")
    iso = conn.execute("SHOW transaction_isolation").fetchone()[0]
    try:
        for s in plan["steps"]:
            if s["kind"] == "guard" and not conn.execute(s["sql"], params).fetchone()[0]:
                conn.execute("ROLLBACK")
                return {"outcome": {"ok": False, "err": "guardFailed"}, "isolation": iso, "attempts": [{"attempt": 1, "sqlstate": None, "result": "guardFailed"}]}
            if s["kind"] == "update":
                conn.execute(s["sql"], params)
        conn.execute("COMMIT")
        return {"outcome": {"ok": True}, "isolation": iso, "attempts": [{"attempt": 1, "sqlstate": None, "result": "commit"}]}
    except psycopg.Error as error:
        conn.execute("ROLLBACK")
        return {"outcome": {"ok": False, "sqlstate": error.sqlstate}, "isolation": iso, "attempts": [{"attempt": 1, "sqlstate": error.sqlstate, "result": "fail"}]}


def drop_rowcount_check(_ask: Any, conn: Any) -> tuple[bool, str]:
    cases = pipeline.run_pg_corpus(conn, _compile_without_rowcount, _execute_no_rowcount)
    bad = [c for c in cases if not c["agrees"]]
    shown = ", ".join(f"{c['id']} ({c['pg']} where the interpreter gives {c['interp']})" for c in bad)
    return bool(bad), f"LAB-10.c3 fixtures that diverge: {shown or 'none'}"


def rc_pool(_ask: Any, conn: Any) -> tuple[bool, str]:
    def execute(c: Any, plan: dict[str, Any], args: dict[str, Any], **kw: Any) -> dict[str, Any]:
        out = sqlplan.execute(c, plan, args)
        c.execute("BEGIN ISOLATION LEVEL READ COMMITTED")
        out["isolation"] = c.execute("SHOW transaction_isolation").fetchone()[0]
        c.execute("ROLLBACK")
        return out

    cases = pipeline.run_pg_corpus(conn, None, execute)
    iso = sorted({str(c["isolation"]) for c in cases})
    return iso != ["serializable"], f"transaction_isolation reads back {', '.join(iso)}, LAB-10.c3"


def retry_out_of_range(_ask: Any, conn: Any) -> tuple[bool, str]:
    saved = sqlplan.RETRYABLE
    sqlplan.RETRYABLE = (*saved, "22003")
    try:
        cases = pipeline.run_pg_corpus(conn)
    finally:
        sqlplan.RETRYABLE = saved
    ov = next(c for c in cases if c["id"] == "edge-overflow")
    retried = [a for a in ov["attempts"] if a.get("sqlstate") == "22003" and a.get("result") == "retry"]
    return bool(retried) or len(ov["attempts"]) != 1, f"edge-overflow's attempt log holds {len(ov['attempts'])} attempts, {len(retried)} of them retries of 22003, LAB-10.c3"


class _Ctx:
    def __init__(self, root: Path) -> None:
        self.root = root

    def path(self, rel: str) -> Path:
        return self.root / rel

    def text(self, rel: str) -> str:
        return (self.root / rel).read_text(encoding="utf-8")


def _report_fixture(root: Path, *, restamp: bool, edit: bool) -> list[str]:
    from statespace.labs.lab10 import _report_problems
    from statespace.schema.statement_hash import statement_hash_file

    stmt = root / "claims" / "s.smt2"
    stmt.parent.mkdir(parents=True, exist_ok=True)
    stmt.write_text("(assert true)\n", encoding="utf-8")
    h = statement_hash_file(stmt)
    from statespace.receipt import assemble, seal, write_receipt

    receipt = seal(assemble(lab="LAB-10", stage="LAB-10.6", lane="reported",
                            environment={"devcontainer": None, "os": {"name": "Linux", "arch": "x86_64"}, "sandbox": "off"},
                            tools=[], statements=[], checks=[{"id": "LAB-10.c6", "pass": True}],
                            runs=[{"step": "diff-0", "engine": "postgres", "version": "18.6", "argv": ["statespace-runtime"], "inputSha256": "0" * 64,
                                   "budget": {}, "exitCode": 0, "verdictLines": ["diff-0: postgres success, interpreter success"], "verdict": "passed"}],
                            provenance={"assisted": "none", "agent": False, "guard": "on"}))
    write_receipt(receipt, root / "receipts" / "LAB-10.6" / "t.json")
    cite = "receipt: receipts/LAB-10.6/t.json"
    sections = {s: "None." for s in pipeline.SECTIONS}
    sections["Theorem statements with hashes"] = f"- `{h}` `claims/s.smt2`"
    sections["TESTED"] = f"- [T] n = 5 · C-1 · {cite} · statement: `{h}` `claims/s.smt2`"
    sections["Doubt log"] = "- C-1 0|1"
    if restamp:
        sections["TESTED"] = "None."
        sections["PROVED"] = f"- [P] C-1 · {cite} · statement: `{h}` `claims/s.smt2`"
    text = "# Report\n\n" + "\n\n".join(f"## {k}\n\n{v}" for k, v in sections.items()) + "\n"
    (root / "report").mkdir(exist_ok=True)
    (root / "report" / "report.md").write_text(text, encoding="utf-8")
    if edit:
        stmt.write_text("(assert false)\n", encoding="utf-8")
    problems, _ = _report_problems(_Ctx(root), "report/report.md")  # type: ignore[arg-type]
    return problems


def restamp_test(_ask: Any, _conn: Any) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory() as d:
        clean = _report_fixture(Path(d) / "clean", restamp=False, edit=False)
        if clean:
            return False, f"the unmutated fixture already fails: {clean[0]}"
        problems = _report_fixture(Path(d) / "mutant", restamp=True, edit=False)
    hit = [p for p in problems if "re-derives as" in p]
    return bool(hit), (hit[0] if hit else "the validator reports nothing") + ", LAB-10.c8"


def edit_after_receipt(_ask: Any, _conn: Any) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory() as d:
        problems = _report_fixture(Path(d), restamp=False, edit=True)
    hit = [p for p in problems if "statement mismatch" in p]
    return bool(hit), (hit[0] if hit else "the validator reports nothing") + ", LAB-10.c8"


MUTANTS = {
    "skip-premise-witness": skip_premise_witness,
    "drop-rowcount-check": drop_rowcount_check,
    "rc-pool": rc_pool,
    "retry-out-of-range": retry_out_of_range,
    "restamp-test": restamp_test,
    "edit-after-receipt": edit_after_receipt,
}


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m statespace.demo.mutants")
    parser.add_argument("--dsn", required=True)
    args = parser.parse_args(list(argv) if argv is not None else None)
    conn = sqlplan.connect(args.dsn)
    survived = 0
    with tempfile.TemporaryDirectory() as d:
        ask = _z3_ask(Path(d))
        for name, fn in MUTANTS.items():
            killed, why = fn(ask, conn)
            survived += not killed
            sys.stdout.write(f"{'killed  ' if killed else 'SURVIVED'}  {name}: {why}\n")
    conn.close()
    return 1 if survived else 0


if __name__ == "__main__":
    raise SystemExit(main())

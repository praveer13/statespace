"""Shared pieces of the tests: a lab repository in a scratch directory, a two-stage test lab that runs real
Z3 queries, and a way to run the `statespace` command as a learner would."""

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, Lab, Stage

BENCH = Path(__file__).resolve().parents[3]
REPO = BENCH.parent
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
RECEIPT_FIXTURES = REPO / "schemas" / "fixtures" / "receipt"


def z3_available() -> bool:
    if importlib.util.find_spec("z3") is None:
        return False
    try:
        from statespace.lanes.z3 import find_cli

        find_cli()
    except Exception:  # noqa: BLE001
        return False
    return True


Z3 = z3_available()
UV = shutil.which("uv") is not None

STARTER = """; the roadmap's starter: can a transfer leave the sender below zero?
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (>= a 0))
(assert (>= b 0))
(assert (> amount 0))
(assert (< (- a amount) 0))
(check-sat)
(get-info :reason-unknown)


"""
GUARD = STARTER.replace("(assert (< (- a amount) 0))", "(assert (<= amount a))\n(assert (< (- a amount) 0))")
PREMISES = GUARD.replace("(assert (< (- a amount) 0))\n", "")


def make_repo(root: Path, *, lab: str = "LAB-90") -> Path:
    """A lab repository: the lab's directory and two statements under claims/."""
    (root / "labs" / lab).mkdir(parents=True)
    (root / "claims").mkdir()
    (root / "claims" / "starter.smt2").write_text(STARTER, encoding="utf-8")
    (root / "claims" / "guard.smt2").write_text(GUARD, encoding="utf-8")
    return root


def c1(ctx: CheckContext) -> CheckResult:
    """LAB-90.c1: the starter finds an overdraft, and its witness replays."""
    starter = ctx.statement("claims/starter.smt2", "smt2")  # read as Z3 reads it, never with read_text
    run = ctx.z3().run(starter, step="starter", rlimit=5_000_000)
    ctx.z3().headline(run)
    if run.verdict != "sat" or run.model is None:
        return CheckResult(False, f"the starter's verdict is {run.verdict}, not sat", "spec")
    values = {name: run.model.value(name) for name in ("a", "b", "amount")}
    a, b, amount = (values["a"], values["b"], values["amount"])
    if not all(isinstance(v, int) for v in (a, b, amount)):
        return CheckResult(False, "the witness has values that are not integers", "tool")
    assert isinstance(a, int) and isinstance(b, int) and isinstance(amount, int)
    replays = a >= 0 and b >= 0 and amount > 0 and a - amount < 0
    ctx.note(f"witness a = {a}, b = {b}, amount = {amount}")
    return CheckResult(replays, "the witness leaves the sender below zero" if replays else "the witness does not replay", None if replays else "tool")


def c2(ctx: CheckContext) -> CheckResult:
    """LAB-90.c2: the guarded query is unsat through the command line, and its premises are sat through the API."""
    guard = ctx.statement("claims/guard.smt2", "smt2")
    z3 = ctx.z3()
    violation = z3.run(guard, step="violation", rlimit=5_000_000, entry="cli")
    premises = z3.run(PREMISES, step="premises", rlimit=5_000_000, entry="api", seed=ctx.seed)
    if violation.verdict in ("sat", "unsat", "unknown"):
        z3.headline(violation)
    ctx.tcb("Z3 5.3.1", "trusted")
    ctx.tcb("the SMT-LIB encoding of the guard", "trusted")
    ok = violation.verdict == "unsat" and premises.verdict == "sat"
    if ok:
        ctx.claim("CL-90.1")
    return CheckResult(ok, f"violation {violation.verdict}, premises {premises.verdict}", None if ok else "spec")


def c3(ctx: CheckContext) -> CheckResult:
    """LAB-90.c3: asks for a claim and then fails, so the claim must not reach the receipt."""
    ctx.claim("CL-90.2")
    return CheckResult(False, "this check always fails", "implementation", ("a detail line",))


TEST_LAB = Lab(
    "LAB-90",
    "A test lab",
    stages=(
        Stage("LAB-90.1", "Find the overdraft", (CheckSpec("LAB-90.c1", "the starter", c1),)),
        Stage("LAB-90.2", "Add the guard", (CheckSpec("LAB-90.c2", "the guard", c2), CheckSpec("LAB-90.c3", "always fails", c3)), claims=("CL-90.1", "CL-90.2")),
    ),
)

PROVENANCE: dict[str, Any] = {"assisted": "none", "agent": False, "guard": "on"}


def cli(*args: str, cwd: Path, env: dict[str, str] | None = None, stdin: bytes | None = None) -> subprocess.CompletedProcess[str]:
    """Run `python -m statespace ...` as a separate process, with this source tree first on the path."""
    environment = dict(os.environ if env is None else env)
    environment["PYTHONPATH"] = str(BENCH) + (os.pathsep + environment["PYTHONPATH"] if environment.get("PYTHONPATH") else "")
    return subprocess.run(
        [sys.executable, "-m", "statespace", *args],
        cwd=cwd,
        env=environment,
        input=stdin.decode("utf-8", errors="surrogateescape") if stdin is not None else None,
        capture_output=True,
        text=True,
        timeout=600,
    )


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

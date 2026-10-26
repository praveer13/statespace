"""`statespace check <lab>[.<stage>]`: run a stage's checks and write its receipt.

Spine section 9.6; ARCHITECTURE.md section 11.3; labs/README.md sections 6 to 8. `lab1` runs every stage
of LAB-1 in order and `lab1.3` runs LAB-1.3; each stage writes one receipt@1 to
`receipts/LAB-<n>.<k>/<UTC time>.json` in the lab repository, with the inputs and output of each engine
run in the folder of the same name beside it. Run it from the lab repository (it looks upward for the
lab's directory, labs/LAB-<n>), or pass --root.

Each check runs its engines through a lane, which records every run with its verdict lines; the check
decides pass or fail from what the lanes read, and a failing check names what it suspects. A receipt is
written only when every check reached a result: if an engine is missing or a check itself breaks,
nothing was judged and the stage writes nothing. Before it is written, the receipt is checked the way
`statespace receipt verify` checks it.

Provenance is self-reported (OD-8): --assisted none|explain|code and --agent yes|no, or the variables
STATESPACE_ASSISTED and STATESPACE_AGENT. When you declare nothing, the receipt records the most help,
assisted: code and agent: yes, because a declaration that is unsure should declare more help, not less
(labs/README.md section 14). STATESPACE_GUARD=off, the agent-guard opt-out, is recorded as guard: off.

Exit status: 0 every check passed; 1 a check failed; 2 a usage error; 3 a stage could not run.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import secrets
import shutil
import sys
import traceback
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

from .context import CheckContext
from .lanes import InputRefused, ToolUnavailable
from .model import SUSPECTS, CheckResult, CheckSpec, Lab, Stage

__all__ = ["StageOutcome", "find_root", "main", "resolve_provenance", "run_stage"]

ASSISTED = ("none", "explain", "code")
EXIT_PASS, EXIT_FAIL, EXIT_USAGE, EXIT_NOT_RUN = 0, 1, 2, 3


@dataclass
class StageOutcome:
    lab: Lab
    stage: Stage
    results: list[tuple[CheckSpec, CheckResult, list[str]]] = field(default_factory=list[tuple[CheckSpec, CheckResult, list[str]]])
    receipt: dict[str, Any] | None = None
    receipt_path: Path | None = None
    problem: str | None = None  # why the stage wrote no receipt

    @property
    def status(self) -> int:
        if self.problem is not None:
            return EXIT_NOT_RUN
        return EXIT_PASS if all(r.passed for _, r, _ in self.results) else EXIT_FAIL


def find_root(directory: str, start: Path) -> Path | None:
    """The nearest directory, from `start` upward, that holds the lab's directory (labs/LAB-<n>)."""
    here = start.resolve()
    for candidate in (here, *here.parents):
        if (candidate / directory).is_dir():
            return candidate
    return None


def resolve_provenance(assisted: str | None, agent: str | None, environ: dict[str, str] | None = None) -> tuple[dict[str, Any], list[str]]:
    """The receipt's provenance block, and a note for anything that was not declared."""
    env = os.environ if environ is None else environ
    notes: list[str] = []
    assisted = assisted or (env.get("STATESPACE_ASSISTED") or "").strip().lower() or None
    agent = agent or (env.get("STATESPACE_AGENT") or "").strip().lower() or None
    if assisted is not None and assisted not in ASSISTED:
        raise ValueError(f"assisted is none, explain or code, not {assisted!r}")
    if agent is not None and agent not in ("yes", "no"):
        raise ValueError(f"agent is yes or no, not {agent!r}")
    undeclared = [name for name, value in (("assisted", assisted), ("agent", agent)) if value is None]
    if undeclared:
        notes.append(
            f"provenance: {' and '.join(undeclared)} not declared, so the receipt records the most help (assisted: code, agent: yes); "
            "declare it with --assisted none|explain|code and --agent yes|no"
        )
    guard = "off" if (env.get("STATESPACE_GUARD") or "").strip().lower() == "off" else "on"
    return {"assisted": assisted or "code", "agent": (agent or "yes") == "yes", "guard": guard}, notes


def environment_block(sessions: Sequence[Any]) -> dict[str, Any]:
    """Where the checks ran: statespace doctor's description of this machine. The sandbox is off unless
    a lane ran inside it; Z3 stages never do (spine section 9.2: recorded, never required)."""
    from statespace import doctor

    digest, _note = doctor.image_digest()
    block: dict[str, Any] = {
        "devcontainer": digest,
        "os": {"name": platform.system() or "unknown", "version": platform.release() or "unknown", "arch": doctor.architecture()},
        "sandbox": "off",
    }
    for session in sessions:
        raw: object = getattr(session, "sandbox", None)
        state = cast(tuple[Any, ...], raw) if isinstance(raw, tuple) else ()
        if state and state[0] in ("on", "off", "failed"):
            block["sandbox"] = str(state[0])
            if state[0] == "failed" and len(state) > 1 and state[1]:
                block["sandboxDetail"] = str(state[1])
    return block


def _stem(directory: Path, when: datetime) -> str:
    base = when.strftime("%Y%m%dT%H%M%SZ")
    stem, n = base, 1
    while (directory / f"{stem}.json").exists() or (directory / stem).exists():
        n += 1
        stem = f"{base}-{n}"
    return stem


def run_stage(
    lab: Lab,
    stage: Stage,
    *,
    root: Path,
    provenance: dict[str, Any],
    seed: int | None = None,
    wall_clock_s: float | None = None,
    write: bool = True,
) -> StageOutcome:
    """Run every check of `stage` and, when each reached a result, write the stage's receipt."""
    from statespace.receipt import assemble, now_instant, seal, verify, write_receipt
    from statespace.schema.statement_hash import statement_hash_file

    outcome = StageOutcome(lab, stage)
    directory = root / "receipts" / stage.id
    stem = _stem(directory, datetime.now(timezone.utc))
    workdir = directory / stem
    ctx = CheckContext(root=root, lab=lab, stage=stage, workdir=workdir, seed=secrets.randbits(32) if seed is None else seed, wall_clock_s=wall_clock_s)

    def abandon(problem: str) -> StageOutcome:
        shutil.rmtree(workdir, ignore_errors=True)
        outcome.problem = problem
        return outcome

    for spec in stage.checks:
        ctx.check_id = spec.id
        start = len(ctx.lines)
        try:
            result = cast(object, spec.run(ctx))  # a lab module is not type-checked: look at what came back
        except ToolUnavailable as error:
            return abandon(f"{spec.id} could not run, so nothing was judged: {error}")
        except InputRefused as error:
            result = CheckResult(False, str(error), "spec")
        except Exception as error:  # noqa: BLE001 - a broken check must not pass, and must not look like your fault
            where = traceback.extract_tb(error.__traceback__)[-1]
            return abandon(f"the check {spec.id} itself broke ({type(error).__name__}: {error}, at {Path(where.filename).name}:{where.lineno}); this is a fault in statespace, not in your work")
        if not isinstance(result, CheckResult):
            return abandon(f"the check {spec.id} returned {type(result).__name__}, not a CheckResult; this is a fault in statespace")
        outcome.results.append((spec, result, ctx.lines[start:]))
    ctx.check_id = None
    passed = {spec.id for spec, result, _ in outcome.results if result.passed}
    sessions = ctx.sessions()
    tools: list[dict[str, Any]] = []
    sections: dict[str, Any] = {}
    for session in sessions:
        for tool in session.receipt_tools():
            if tool not in tools:
                tools.append(tool)
        section = session.receipt_section()
        if section is not None:
            sections[session.SECTION] = section
    try:
        statements = ctx.statement_entries(statement_hash_file)
    except Exception as error:  # noqa: BLE001 - a statement that cannot be hashed is reported, not raised
        return abandon(f"a pinned statement could not be hashed: {error}")
    receipt = seal(
        assemble(
            lab=lab.id,
            stage=stage.id,
            lane="reported",
            environment=environment_block(sessions),
            tools=tools,
            statements=statements,
            runs=ctx.runs,
            checks=[{"id": spec.id, "pass": result.passed} for spec, result, _ in outcome.results],
            provenance=provenance,
            claims=ctx.claim_entries(passed),
            tcb=ctx.tcb_entries(),
            sections=sections,
            ext=ctx.ext or None,
            created_at=now_instant(),
        )
    )
    verification = verify(receipt, root=root)
    if not verification.ok:
        problems = "; ".join(f"{f.where or '/'}: {f.message}" for f in verification.findings if f.level == "fail")
        return abandon(f"the receipt statespace built does not verify ({problems}); this is a fault in statespace")
    outcome.receipt = receipt
    if write:
        path = directory / f"{stem}.json"
        write_receipt(receipt, path)
        outcome.receipt_path = path
    return outcome


def render(outcome: StageOutcome, root: Path) -> str:
    out = [f"{outcome.stage.id} · {outcome.stage.title}"]
    width = max((len(spec.id) for spec, _, _ in outcome.results), default=0)
    for spec, result, lines in outcome.results:
        out.append(f"  {'pass' if result.passed else 'FAIL'}  {spec.id.ljust(width)}  {result.message}")
        pad = " " * (8 + width)
        if not result.passed and result.suspect:
            out.append(f"{pad}suspects: {SUSPECTS[result.suspect]}")
        out.extend(f"{pad}{line}" for line in (*result.details, *lines))
    if outcome.problem is not None:
        out.append(f"  not run: {outcome.problem}")
        out.append("  no receipt was written")
    elif outcome.receipt_path is not None and outcome.receipt is not None:
        runs = outcome.receipt["runs"]
        engines = sorted({f"{r['engine']} {r['version']}" for r in runs})
        where = outcome.receipt_path.relative_to(root).as_posix() if root in outcome.receipt_path.parents else str(outcome.receipt_path)
        out.append(f"  receipt  {where} (reported from your machine; {len(runs)} run{'s' if len(runs) != 1 else ''}{'; ' + ', '.join(engines) if engines else ''})")
    return "\n".join(out) + "\n"


def outcome_json(outcome: StageOutcome, root: Path) -> dict[str, Any]:
    path = outcome.receipt_path
    return {
        "stage": outcome.stage.id,
        "status": outcome.status,
        "checks": [
            {"id": spec.id, "passed": result.passed, "message": result.message, "suspect": result.suspect, "details": [*result.details, *lines]}
            for spec, result, lines in outcome.results
        ],
        "receipt": path.relative_to(root).as_posix() if path is not None and root in path.parents else (str(path) if path else None),
        "problem": outcome.problem,
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="statespace check",
        description="Run a lab stage's checks with the real tools and write its receipt under receipts/. "
        "Exit status: 0 every check passed, 1 a check failed, 2 a usage error, 3 a stage could not run.",
    )
    parser.add_argument("target", help="lab1 for every stage of LAB-1, or lab1.3 for the stage LAB-1.3")
    parser.add_argument("--root", type=Path, default=None, help="the lab repository; default: the nearest directory upward that holds labs/LAB-<n>")
    parser.add_argument("--assisted", choices=ASSISTED, default=None, help="the help you had on this stage, self-reported (default: STATESPACE_ASSISTED, else code)")
    parser.add_argument("--agent", choices=("yes", "no"), default=None, help="whether a coding agent worked in the repository, self-reported (default: STATESPACE_AGENT, else yes)")
    parser.add_argument("--json", action="store_true", help="print the results as JSON")
    args = parser.parse_args(list(argv) if argv is not None else None)

    from . import labs

    try:
        target = labs.parse_target(args.target)
        provenance, notes = resolve_provenance(args.assisted, args.agent)
    except ValueError as error:
        parser.error(str(error))
    try:
        lab, stages = labs.stages_for(target)
    except labs.LabUnavailable as error:
        sys.stderr.write(f"statespace check: {error}\n")
        return EXIT_NOT_RUN
    except Exception as error:  # noqa: BLE001 - a lab module that does not import is reported plainly
        sys.stderr.write(f"statespace check: the checks of {target.lab} could not load ({type(error).__name__}: {error})\n")
        return EXIT_NOT_RUN
    root = args.root.resolve() if args.root is not None else find_root(lab.directory, Path.cwd())
    if root is None or not (root / lab.directory).is_dir():
        sys.stderr.write(f"statespace check: no {lab.directory}/ here or above; run it from your lab repository, or pass --root\n")
        return EXIT_USAGE
    outcomes: list[StageOutcome] = []
    for stage in stages:
        outcome = run_stage(lab, stage, root=root, provenance=provenance)
        outcomes.append(outcome)
        if not args.json:
            sys.stdout.write(render(outcome, root))
            sys.stdout.flush()
    status = max((o.status for o in outcomes), default=EXIT_PASS)
    if args.json:
        sys.stdout.write(json.dumps({"lab": lab.id, "status": status, "notes": notes, "stages": [outcome_json(o, root) for o in outcomes]}, indent=2, ensure_ascii=False) + "\n")
    else:
        for note in notes:
            sys.stdout.write(f"note: {note}\n")
    return status

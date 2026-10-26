"""`statespace run <RUN-id>...`: re-execute a registry run and diff its verdict lines (course repository).

Spine section 9.5 ("a tool bump re-runs everything and opens a reviewable diff"); ARCHITECTURE.md
sections 9.4 and 11.3; runs/README.md. It reads `runs/<RUN-id>.json` (run@1), asks the lane of the run's
engine how the run was executed, checks that every input on disk still has the SHA-256 the record gives,
runs the command, and compares the output with the recorded verdict lines the way that lane reads them:
for Z3, a verdict line by its label and its verdict words, a witness replay by whether it held, because
model values and timings are not canonical (spine section 9.1), and any other line verbatim. When the
record gives an exit code, a re-run that exits with another one differs as well.

A record with several configurations is re-executed as its primary configuration unless --config names
another, since the top level repeats the primary one's argv and verdict lines while its inputs are those of
every configuration. A command that names its inputs relative to where it runs (`sh tour_cli.sh`, which
reads `smtlib/starter.smt2`) runs in a scratch directory holding the inputs laid out the same way
(`layout`).

A run is re-executed only when its lane can do so faithfully. A run of an engine with no lane in this CLI
yet, a run recorded inside a container or with placeholders in its argv, or a run whose inputs changed is
refused with the reason, never approximated. `--engine-version` re-runs under another version of the
engine (a tool bump) and reports what changed.

Exit status: 0 every run named reproduced its verdict lines; 1 one differs; 2 a usage error (no such run,
no course repository); 3 a run could not be re-executed. With --all, refusals are listed and do not
change the exit status, except that a lane module that cannot load (a fault in statespace) exits 3.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from . import proc
from .lanes import LineComparison, Refusal, RerunPlan, RunView, as_list, as_map, broken_reason, lane_for

__all__ = ["RunOutcome", "find_repo", "layout", "load_record", "main", "rerun", "view_of"]

Status = Literal["reproduced", "differs", "refused"]
SCRUBBED_ENV = ("VIRTUAL_ENV", "UV_PROJECT_ENVIRONMENT", "PYTHONPATH", "PYTHONHOME")


class RunError(ValueError):
    """The run cannot be looked up: no such record, or a record that is not run@1."""


def find_repo(start: Path) -> Path | None:
    """The course repository: the nearest directory upward holding runs/ and schemas/run.schema.json."""
    here = start.resolve()
    for candidate in (here, *here.parents):
        if (candidate / "runs").is_dir() and (candidate / "schemas" / "run.schema.json").is_file():
            return candidate
    return None


def load_record(repo: Path, run_id: str) -> dict[str, Any]:
    from statespace.receipt import ReceiptReadError, load_json
    from statespace.schema import validate

    path = repo / "runs" / f"{run_id}.json"
    if not path.is_file():
        raise RunError(f"there is no runs/{run_id}.json")
    try:
        record = load_json(path.read_bytes())
    except ReceiptReadError as error:
        raise RunError(f"runs/{run_id}.json is not JSON the registry can read: {error}") from error
    issues = validate("run", record)
    if issues:
        raise RunError(f"runs/{run_id}.json is not a valid run@1 record: " + "; ".join(f"{i['instancePath'] or '/'} {i['keyword']}" for i in issues[:5]))
    if record.get("id") != run_id:
        raise RunError(f"runs/{run_id}.json names itself {record.get('id')!r}")
    out: dict[str, Any] = record
    return out


def view_of(record: Mapping[str, Any], config: str | None = None) -> RunView:
    """The record's configuration `config` laid over its top level; without one, its primary
    configuration when it names one (run@1's primary_config), else its top level."""
    fields: dict[str, Any] = {key: record.get(key) for key in ("engine", "version", "argv", "inputs", "image", "verdict_lines", "exit_code", "budget")}
    configs = [m for m in (as_map(c) for c in as_list(record.get("configs"))) if m is not None]
    primary = record.get("primary_config")
    if config is None and isinstance(primary, str) and any(c.get("id") == primary for c in configs):
        config = primary
    if config is not None:
        chosen = next((c for c in configs if c.get("id") == config), None)
        if chosen is None:
            known = ", ".join(str(c.get("id")) for c in configs) or "none"
            raise RunError(f"{record.get('id')} has no configuration {config!r} (its configurations: {known})")
        for key in fields:
            if key in chosen:
                fields[key] = chosen[key]
    unrecorded = {str(m.get("field")): str(m.get("reason")) for m in (as_map(u) for u in as_list(record.get("unrecorded"))) if m is not None}
    return RunView(
        run_id=str(record.get("id")),
        config=config,
        engine=str(fields["engine"]),
        version=str(fields["version"]),
        argv=fields["argv"],
        inputs=[m for m in (as_map(i) for i in as_list(fields["inputs"])) if m is not None],
        image=fields["image"],
        verdict_lines=[str(line) for line in as_list(fields["verdict_lines"])],
        exit_code=fields["exit_code"],
        budget=as_map(fields["budget"]) or {},
        unrecorded=unrecorded,
    )


@dataclass
class RunOutcome:
    run_id: str
    title: str
    status: Status
    view: RunView | None = None
    plan: RerunPlan | None = None
    reason: str | None = None  # why it was refused
    exit_code: int | None = None
    ms: int | None = None
    timed_out: bool = False
    inputs: list[tuple[str, str]] = field(default_factory=list[tuple[str, str]])  # (path, sha256) checked
    staged: dict[str, str] = field(default_factory=dict[str, str])  # input path -> its place in the scratch directory
    comparisons: list[LineComparison] = field(default_factory=list[LineComparison])
    output: str = ""
    fault: bool = False  # refused because statespace itself is broken (a lane module that cannot load)
    primary: bool = False  # the view is the record's primary configuration, chosen because --config named none

    @property
    def exit_differs(self) -> bool:
        """The re-run exited with another code than the record gives (when the record gives one)."""
        recorded = self.view.exit_code if self.view is not None else None
        return self.exit_code is not None and recorded is not None and self.exit_code != recorded

    def as_json(self) -> dict[str, Any]:
        return {
            "run": self.run_id,
            "config": self.view.config if self.view else None,
            "status": self.status,
            "reason": self.reason,
            "fault": self.fault,
            "argv": self.plan.argv if self.plan else None,
            "cwd": self.plan.cwd if self.plan else None,
            "how": self.plan.how if self.plan else None,
            "notes": list(self.plan.notes) if self.plan else [],
            "exit_code": self.exit_code,
            "recorded_exit_code": self.view.exit_code if self.view else None,
            "exit_code_differs": self.exit_differs,
            "ms": self.ms,
            "timed_out": self.timed_out,
            "inputs": [{"path": p, "sha256": s, "staged_as": self.staged.get(p)} for p, s in self.inputs],
            "lines": [{"status": c.status, "recorded": c.recorded, "found": c.found, "note": c.note} for c in self.comparisons],
        }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _inside(repo: Path, relative: str) -> Path | None:
    base = repo.resolve()
    candidate = (base / relative).resolve()
    return candidate if base in candidate.parents else None


def _names(path: str, arg: str) -> bool:
    """Whether a command argument names the input at `path`: the path itself, or its end."""
    return bool(arg) and not arg.startswith("-") and (path == arg or path.endswith("/" + arg))


def layout(argv: Sequence[str], paths: Sequence[str]) -> dict[str, str] | str:
    """Where each input goes in the scratch directory of a command that names its inputs relative to where
    it runs: {input path: place in the scratch directory}. The anchor is the first input the command names,
    by its file name or by the end of its path (tour_cli.sh, original/z3_negamt.py). Every input under the
    anchor's directory keeps its place relative to it (smtlib/starter.smt2 beside tour_cli.sh); an input
    elsewhere is staged under the name the command gives it; the rest are not staged, since a record's
    inputs can include those of its other configurations. A str says why the inputs cannot be laid out:
    the command names no input, it names one that two inputs end with, or two inputs would land in one place."""
    anchor: tuple[str, str] | None = None
    for arg in argv:
        hits = sorted({p for p in paths if _names(p, arg)})
        if len(hits) > 1:
            return f"the command names {arg}, and {len(hits)} inputs end that way ({', '.join(hits)}), so it cannot tell which one it read"
        if hits:
            anchor = (hits[0], arg)
            break
    if anchor is None:
        return "the command names none of the inputs, so they cannot be laid out where it looks for them"
    base = anchor[0][: len(anchor[0]) - len(anchor[1])]  # "" or a directory ending in /
    placed: dict[str, str] = {}
    taken: dict[str, str] = {}
    for path in dict.fromkeys(paths):
        if base and path.startswith(base):
            place = path[len(base) :]
        else:
            place = next((a for a in argv if _names(path, a)), "")
            if not place:
                continue
        if place in taken:
            return f"{taken[place]} and {path} would both be staged as {place}"
        taken[place] = path
        placed[path] = place
    return placed


def rerun(repo: Path, run_id: str, *, config: str | None = None, engine_version: str | None = None, timeout_s: float = 600.0) -> RunOutcome:
    """Re-execute one run and compare its output with the recorded verdict lines."""
    record = load_record(repo, run_id)
    title = str(record.get("title", ""))
    view = view_of(record, config)
    outcome = RunOutcome(run_id, title, "refused", view, primary=config is None and view.config is not None)
    broken = broken_reason()
    if broken is not None:
        outcome.reason, outcome.fault = broken, True
        return outcome
    lane = lane_for(view.engine)
    if lane is None:
        outcome.reason = f"no lane in this CLI reads the engine {view.engine!r} yet"
        return outcome
    planner: Any = getattr(lane, "rerun_plan", None)
    compare: Any = getattr(lane, "compare_output", None)
    if planner is None or compare is None:
        outcome.reason = f"the {view.engine} lane cannot re-execute registry runs"
        return outcome
    if not view.verdict_lines:
        outcome.reason = "the record holds no verdict lines to compare"
        return outcome
    plan: RerunPlan | Refusal = planner(view, repo=repo, engine_version=engine_version)
    if isinstance(plan, Refusal):
        outcome.reason = plan.reason
        return outcome
    outcome.plan = plan
    files: dict[str, Path] = {}
    for item in view.inputs:
        path = item.get("path")
        if not isinstance(path, str):
            continue
        file = _inside(repo, path)
        if file is None or not file.is_file():
            outcome.reason = f"the input {path} is not in the repository"
            return outcome
        now = _sha256(file)
        if now != item.get("sha256"):
            outcome.reason = f"the input {path} changed since the run (SHA-256 {now[:16]}..., recorded {str(item.get('sha256'))[:16]}...), so re-running it would not re-execute the recorded run"
            return outcome
        outcome.inputs.append((path, now))
        files[path] = file
    if plan.cwd == "stage":
        placed = layout(plan.argv, list(files))
        if isinstance(placed, str):
            outcome.reason = placed
            return outcome
        outcome.staged = placed
    env = {key: value for key, value in os.environ.items() if key not in SCRUBBED_ENV}
    with tempfile.TemporaryDirectory(prefix="statespace-run-") as scratch:
        cwd = repo
        if plan.cwd == "stage":
            cwd = Path(scratch).resolve()
            for path, place in outcome.staged.items():
                target = (cwd / place).resolve()
                if cwd not in target.parents:
                    outcome.reason = f"the input {path} would be staged outside the scratch directory, as {place}"
                    return outcome
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(files[path], target)
        done = proc.run(plan.argv, cwd=cwd, timeout_s=timeout_s, env=env)
    if done.returncode is None:
        outcome.reason = f"{plan.argv[0]} did not start: {done.error}"
        return outcome
    outcome.exit_code, outcome.ms, outcome.timed_out, outcome.output = done.returncode, done.ms, done.timed_out, done.output
    found = done.output.splitlines()
    comparisons: list[LineComparison] = compare(view.verdict_lines, found, version=view.version, engine_version=engine_version)
    outcome.comparisons = comparisons
    # A recorded exit code is compared too: a script that reports a witness that does not replay, or a
    # failed check, by its exit status must not pass as reproduced.
    same = all(c.status in ("same", "skipped") for c in comparisons) and not done.timed_out and not outcome.exit_differs
    outcome.status = "reproduced" if same else "differs"
    return outcome


def render(outcome: RunOutcome) -> str:
    out = [f"{outcome.run_id}" + (f" · {outcome.title}" if outcome.title else "")]
    view = outcome.view
    if view is not None and view.config:
        out.append(f"  config    {view.config}" + ("   (the record's primary configuration)" if outcome.primary else ""))
    if outcome.status == "refused":
        out.append(f"  not re-executed: {outcome.reason}")
        return "\n".join(out) + "\n"
    plan = outcome.plan
    assert plan is not None
    out.append(f"  how       {plan.how}")
    out.append(f"  argv      {' '.join(plan.argv)}" + ("   (in a scratch directory holding the inputs)" if plan.cwd == "stage" else "   (from the repository root)"))
    for path, sha in outcome.inputs:
        where = ""
        if plan.cwd == "stage":
            place = outcome.staged.get(path)
            where = f", staged as {place}" if place is not None else ", not staged: the command does not name it"
        out.append(f"  input     {path} (sha256 {sha[:16]}..., as recorded{where})")
    for note in plan.notes:
        out.append(f"  note      {note}")
    seconds = (outcome.ms or 0) / 1000
    recorded_exit = view.exit_code if view is not None else None
    out.append(
        f"  exit      {outcome.exit_code} after {seconds:.1f} s"
        + (" (stopped by the time limit)" if outcome.timed_out else "")
        + (f"; recorded {recorded_exit}" if recorded_exit is not None else "")
        + (", which DIFFERS" if outcome.exit_differs else "")
    )
    for c in outcome.comparisons:
        out.append(f"  {c.status.ljust(8)}  {c.recorded if c.recorded else '(no recorded line)'}")
        if c.status == "differs" and c.found is not None:
            out.append(f"  {'now'.rjust(8)}  {c.found}")
        if c.note and not (c.status == "skipped" and c.recorded[:1].isspace()):
            out.append(f"  {''.ljust(8)}  ({c.note})")
    counted = [c for c in outcome.comparisons if c.status != "skipped" and c.recorded]
    extra = sum(1 for c in outcome.comparisons if not c.recorded)
    same = sum(1 for c in counted if c.status == "same")
    summary = f": {same} of {len(counted)} verdict lines" + (f", and {extra} verdict line{'s' if extra != 1 else ''} the record does not have" if extra else "")
    if outcome.exit_differs:
        summary += f"; the exit code differs (recorded {recorded_exit}, now {outcome.exit_code})"
    if outcome.timed_out:
        summary += "; the run was stopped by the time limit"
    out.append(("reproduced" if outcome.status == "reproduced" else "DIFFERS") + summary)
    return "\n".join(out) + "\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="statespace run",
        description="Re-execute registry runs (runs/<RUN-id>.json) and compare their output with the recorded verdict lines. "
        "Exit status: 0 reproduced, 1 a verdict line differs, 2 a usage error, 3 a run could not be re-executed.",
    )
    parser.add_argument("runs", nargs="*", metavar="RUN-id")
    parser.add_argument("--all", action="store_true", help="every run in runs/ (with --engine, every run of that engine)")
    parser.add_argument("--engine", default=None, help="with --all: only runs of this engine")
    parser.add_argument("--config", default=None, help="re-execute this configuration of the run instead of its top level")
    parser.add_argument("--engine-version", default=None, help="re-run under this engine version instead of the recorded one (a tool bump)")
    parser.add_argument("--timeout", type=float, default=600.0, help="wall-clock seconds per run (default 600)")
    parser.add_argument("--repo", type=Path, default=None, help="the course repository; default: the nearest directory upward with runs/")
    parser.add_argument("--save", type=Path, default=None, help="write each run's output and its comparison as JSON into this directory")
    parser.add_argument("--json", action="store_true", help="print the outcomes as JSON")
    args = parser.parse_args(list(argv) if argv is not None else None)
    repo = args.repo.resolve() if args.repo is not None else find_repo(Path.cwd())
    if repo is None:
        sys.stderr.write("statespace run: no runs/ registry here or above; run it in the course repository, or pass --repo\n")
        return 2
    names: list[str] = list(args.runs)
    if args.all:
        for path in sorted((repo / "runs").glob("RUN-*.json")):
            if args.engine is not None:
                try:
                    engine = json.loads(path.read_text(encoding="utf-8")).get("engine")
                except (OSError, ValueError):
                    engine = None
                if engine != args.engine:
                    continue
            names.append(path.stem)
    if not names:
        parser.error("name a RUN-id, or pass --all")
    outcomes: list[RunOutcome] = []
    for name in names:
        try:
            outcome = rerun(repo, name, config=args.config, engine_version=args.engine_version, timeout_s=args.timeout)
        except RunError as error:
            if not args.all:
                sys.stderr.write(f"statespace run: {error}\n")
                return 2
            outcome = RunOutcome(name, "", "refused", reason=str(error))  # one unreadable record does not stop the rest
        outcomes.append(outcome)
        if args.save is not None:
            args.save.mkdir(parents=True, exist_ok=True)
            (args.save / f"{name}.out").write_text(outcome.output, encoding="utf-8")
            (args.save / f"{name}.json").write_text(json.dumps(outcome.as_json(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        if not args.json:
            sys.stdout.write(render(outcome))
            sys.stdout.flush()
    if args.json:
        sys.stdout.write(json.dumps([o.as_json() for o in outcomes], indent=2, ensure_ascii=False) + "\n")
    elif len(outcomes) > 1:
        counts = {status: sum(1 for o in outcomes if o.status == status) for status in ("reproduced", "differs", "refused")}
        sys.stdout.write(f"{counts['reproduced']} reproduced, {counts['differs']} differ, {counts['refused']} not re-executed by this CLI\n")
    if any(o.fault for o in outcomes):
        sys.stderr.write("statespace run: a lane module could not load, so no run of its engines was re-executed; this is a fault in statespace\n")
        return 3
    if any(o.status == "differs" for o in outcomes):
        return 1
    if not args.all and any(o.status == "refused" for o in outcomes):
        return 3
    return 0

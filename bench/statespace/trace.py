"""`statespace trace validate <spec> <traces>`: NDJSON traces checked as behaviors of a TLA+ spec, by TLC.

W5-T14 on docs/spikes/W0-S13.md section 6, ported from scripts/spikes/W0-S13/tv.mjs, which RUN-tlc-tracemodule
tested. Course-supplied harness (labs/README.md section 2); LAB-8.1 and LAB-8.6 run it.

For each trace: lint it as trace@1 (below); write the TLC config for it, the trace constants plus the log's path
as the constant TraceFile; run the pinned tla2tools 1.8.0 jar with one worker on the trace module, which is
`<Spec>Trace.tla` beside the spec; and read the verdict from the record the pinned TraceValidation.tla prints, never
from TLC's exit code (it exits 0 when accepted, 10 when rejected or partial, 75 or 150 on an error
[X RUN-tlc-tracemodule]). One line per trace:

    trace <path>: accepted (N of N lines)
    trace <path>: rejected at line k of N: <line k, verbatim> (lines 1-(k-1) match)
    trace <path>: partial (N of N lines conform; no End record, so the log may be cut short)
    trace <path>: error at line k: <lint problem>   |   trace <path>: error: <SANY's or TLC's message>

then a summary that counts accepted traces only, and the exit status: 0 when every trace is accepted, 1 when one
is not, 2 for a usage error, 3 when TLC could not run.

**trace@1** [D] (W0-S13 section 6): one JSON object per line, no blank line, a string `event` on every line, and
the fields each event's trace disjunct constrains: Dispatch carries `cmd`, `key` and `att`; Commit, Timeout,
TimerArmed, Receive, Persist and Ack carry `cmd`; Crash, Recover and End carry nothing more. The last line of a
complete log is `{"event":"End"}`, which only the last line may be. Other events are the spec's business: a
stuttering disjunct may accept them.

The modules TLC reads are staged in a scratch folder: the spec's folder's `.tla` files, then the pinned ones of
the lab's `challenge/` folder (beside the spec's folder), so a copy of a pinned module beside the spec cannot
shadow it. `TlcSession` is the receipt side: every TLC run, with its argv, input hash, budget, exit code and
verdict lines, and the receipt's `tlc` and `traces` sections. It stands in for the TLC lane (W3-T05) until that
lane exists; runs of engine `tlc` are then shown as reported by `statespace receipt verify`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

__all__ = [
    "END_EVENT",
    "TRACE_FIELDS",
    "Lint",
    "ModelRun",
    "TlcSession",
    "TlcUnavailable",
    "TraceResult",
    "cfg_text",
    "lint",
    "main",
    "parse_tlc",
    "tlc_problem",
    "tool_line",
]

END_EVENT = "End"
RELEASE = "1.8.0"
WALL_CLOCK_S = 300.0  # a backstop per TLC run [D]; a trace module that explodes is stopped, with no verdict

# trace@1: the fields each event's trace disjunct constrains (W0-S13 section 4.5).
TRACE_FIELDS: dict[str, tuple[str, ...]] = {
    "Commit": ("cmd",),
    "Dispatch": ("cmd", "key", "att"),
    "Timeout": ("cmd",),
    "TimerArmed": ("cmd",),
    "Receive": ("cmd",),
    "Persist": ("cmd",),
    "Ack": ("cmd",),
    "Crash": (),
    "Recover": (),
    "End": (),
}


class TlcUnavailable(RuntimeError):
    """Java or the pinned jar is not on this machine, so nothing was judged."""


# ------------------------------------------------------------------------------------------ the lint
@dataclass
class Lint:
    lines: int
    end_record: bool
    problems: list[tuple[int, str]] = field(default_factory=list[tuple[int, str]])
    rows: list[str] = field(default_factory=list[str])
    events: list[dict[str, Any]] = field(default_factory=list[dict[str, Any]])


def lint(data: bytes) -> Lint:
    """Check an NDJSON trace before TLC reads it, and name the line of the first problems (1-based)."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        return Lint(0, False, [(1, f"not UTF-8 (byte {error.start})")])
    rows = text.split("\n")
    if rows and rows[-1] == "":
        rows.pop()  # the newline that ends the last line
    out = Lint(len(rows), False, rows=rows)
    for i, row in enumerate(rows, start=1):
        if row.strip() == "":
            out.problems.append((i, "blank line"))
            continue
        try:
            value = json.loads(row)
        except json.JSONDecodeError as error:
            out.problems.append((i, f"not JSON ({error.msg} at column {error.colno})"))
            continue
        if not isinstance(value, dict):
            out.problems.append((i, "not a JSON object"))
            continue
        out.events.append(value)
        event = value.get("event")
        if not isinstance(event, str):
            out.problems.append((i, 'no string field "event"'))
            continue
        missing = [f for f in TRACE_FIELDS.get(event, ()) if f not in value]
        if missing:
            out.problems.append((i, f"a {event} line must carry {', '.join(missing)} (trace@1): the {event} disjunct constrains {'it' if len(missing) == 1 else 'them'}"))
        if event == END_EVENT and i != len(rows):
            out.problems.append((i, "an End record before the last line: only the last line may be End"))
        if i == len(rows):
            out.end_record = event == END_EVENT
    if not rows:
        out.problems.append((1, "the trace is empty"))
    return out


# ------------------------------------------------------------------------------------------ TLC's output
_FIELD = re.compile(r'(\w+) \|-> ("(?:[^"\\]|\\.)*"|TRUE|FALSE|-?\d+)')
_RECORD = re.compile(r'^<<"trace-validation", \[(.*)\]>>$', re.M)
_LOCATION = re.compile(r"^line \d+, col \d+ to line \d+, col \d+ of module \S+$")


def _scalar(v: str) -> Any:
    if v == "TRUE":
        return True
    if v == "FALSE":
        return False
    if v.startswith('"'):
        return json.loads(v)
    return int(v)


def tlc_problem(stdout: str) -> str:
    """The message to quote when TLC stops without a verdict line (W0-S13 section 4.9): SANY's message or the
    exception's, with its location, rather than TLC's generic first `Error:` line."""
    rows = [r.rstrip() for r in stdout.split("\n")]

    def find(pattern: str, start: int = 0) -> int:
        rx = re.compile(pattern)
        return next((i for i in range(start, len(rows)) if rx.search(rows[i])), -1)

    def next_text(i: int) -> int:
        return find(r"\S", i + 1)

    def located(message: str, where: str | None) -> str:
        return f"{message} ({where})" if where and _LOCATION.match(where) else message

    if find(r"^Error: Parsing or semantic analysis failed\.$") >= 0:
        parse = find(r"^\*\*\*Parse Error\*\*\*$")
        encountered = find(r"^Encountered ", parse) if parse >= 0 else -1
        if encountered >= 0:
            module = re.search(r"^Could not parse module (\S+) from file ", stdout, re.M)
            return f"{rows[encountered]} (module {module.group(1)})" if module else rows[encountered]
        header = find(r"^\*\*\* (Errors|Abort messages): \d+$")
        where = next_text(header) if header >= 0 else -1
        message = next_text(where) if where >= 0 else -1
        if message >= 0:
            return located(rows[message], rows[where])
    exception = find(r"^The exception was a ")
    if exception >= 0 and exception + 1 < len(rows) and rows[exception + 1].startswith(": "):
        block: list[str] = []
        for i in range(exception + 1, len(rows)):
            if rows[i] == "" or rows[i].startswith("Error: "):
                break
            block.append(rows[i])
        if "but it produced the following error:" in block:
            k = block.index("but it produced the following error:")
            if k + 1 < len(block):
                return block[k + 1]
        block[0] = block[0][2:]
        where = block.pop() if len(block) > 1 and _LOCATION.match(block[-1]) else None
        return located(" ".join(block), where)
    first = find(r"^Error: ")
    if first < 0:
        return "TLC printed no verdict"
    message = rows[first][len("Error: ") :]
    return f"{message} {rows[first + 1]}" if message.endswith(":") and first + 1 < len(rows) and rows[first + 1] else message


def parse_tlc(stdout: str) -> dict[str, Any]:
    """TLC's stdout: the trace-validation record (or None), the statistics, the result, the errors."""
    row = _RECORD.search(stdout)
    record: dict[str, Any] | None = None
    if row:
        record = {m.group(1): _scalar(m.group(2)) for m in _FIELD.finditer(row.group(1))}
    stats = re.search(r"^(\d+) states? generated, (\d+) distinct states? found, (\d+) states? left on queue\.", stdout, re.M)
    depth = re.search(r"^The depth of the complete state graph search is (\d+)\.", stdout, re.M)
    violated = re.search(r"^Error: (?:Invariant|Temporal property|Action property) (\S+) (?:is|was) violated", stdout, re.M)
    no_error = re.search(r"^Model checking completed\. No error has been found\.$", stdout, re.M) is not None
    deadlock = re.search(r"^Error: Deadlock reached\.$", stdout, re.M) is not None
    return {
        "banner": next((line for line in stdout.split("\n") if line.startswith("TLC2 Version ")), None),
        "record": record,
        "generated": int(stats.group(1)) if stats else None,
        "distinct": int(stats.group(2)) if stats else None,
        "left": int(stats.group(3)) if stats else None,
        "depth": int(depth.group(1)) if depth else None,
        "violated": violated.group(1) if violated else None,
        "no_error": no_error,
        "deadlock": deadlock,
        "lasso": re.search(r"^State \d+: (Stuttering|Back to state)", stdout, re.M) is not None,
        "errors": [line for line in stdout.split("\n") if line.startswith("Error: ")],
        "problem": None if (record or no_error or violated or deadlock) else tlc_problem(stdout),
    }


def verdict_lines(stdout: str) -> list[str]:
    """The lines a receipt keeps, verbatim: the banner, the trace-validation record, TLC's result and its error
    lines, the counterexample's state headers, the statistics and the depth."""
    keep = re.compile(
        r'^(TLC2 Version |<<"trace-validation", |Model checking completed\.|Error: |State \d+: |\d+ states? generated, |The depth of the complete state graph search is |Finished computing initial states)'
    )
    lines = [line.rstrip() for line in stdout.split("\n") if keep.match(line)]
    return lines or ["statespace: TLC printed no line a receipt keeps"]


def tool_line(path: str, checked: Lint, parsed: dict[str, Any] | None) -> str:
    """The line the command prints for one trace."""
    if checked.problems:
        line, message = checked.problems[0]
        return f"trace {path}: error at line {line}: {message}"
    record = parsed.get("record") if parsed else None
    if not record:
        return f"trace {path}: error: {(parsed or {}).get('problem') or 'TLC printed no verdict'}"
    if record.get("verdict") == "accepted":
        return f"trace {path}: accepted ({record['matched']} of {record['lines']} lines)"
    if record.get("verdict") == "rejected":
        k = int(record["first_unmatched"])
        span = f"lines 1-{record['matched']} match" if record["matched"] > 0 else "no line matches"
        quoted = checked.rows[k - 1] if 0 < k <= len(checked.rows) else "?"
        return f"trace {path}: rejected at line {k} of {record['lines']}: {quoted} ({span})"
    return f"trace {path}: partial ({record['matched']} of {record['lines']} lines conform; no {END_EVENT} record, so the log may be cut short)"


def cfg_text(constants: str, trace_file: str) -> str:
    """The TLC config for one trace: the pinned constants, the log's path, and the verdict machinery."""
    body = constants.rstrip() + "\n" if constants.strip() else ""
    return body + f"CONSTANT TraceFile = {json.dumps(trace_file)}\nSPECIFICATION TraceSpec\nCONSTRAINT TraceReach\nPOSTCONDITION TraceVerdict\nCHECK_DEADLOCK FALSE\n"


# ------------------------------------------------------------------------------------------ the session
@dataclass
class TraceResult:
    trace: str  # the trace's path in the lab repository
    verdict: str  # accepted | rejected | partial | error
    line: str  # the line the command prints
    lines: int = 0
    matched: int = 0
    first_unmatched: int | None = None
    end_record: bool = False
    sha256: str = ""
    seed: int | None = None
    distinct: int | None = None
    run_index: int | None = None


@dataclass
class ModelRun:
    step: str
    config: str
    module: str
    argv: list[str]
    exit_code: int | None
    output: str
    parsed: dict[str, Any]
    verdict: str
    constants: dict[str, str]
    flags: list[str]
    spec_sha256: str
    config_sha256: str
    run_index: int


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _statement_sha(data: bytes) -> str:
    from statespace.schema.statement_hash import statement_hash_bytes

    return statement_hash_bytes(data)


def constants_of(cfg: str) -> dict[str, str]:
    """`CONSTANTS a = 1  b = {"x"}` as the config writes them, verbatim."""
    body: list[str] = []
    on = False
    for raw in cfg.split("\n"):
        line = re.sub(r"\\\*.*$", "", raw).strip()
        if re.match(r"^CONSTANTS?\b", line):
            on = True
            line = re.sub(r"^CONSTANTS?\s*", "", line)
        elif re.match(r"^[A-Z_]+\b", line) and not re.match(r"^[A-Za-z_]\w*\s*=", line):
            on = False
        if on and line:
            body.append(line)
    text = " ".join(body)
    out: dict[str, str] = {}
    for m in re.finditer(r'([A-Za-z_]\w*)\s*=\s*((?:\{[^}]*\}|"[^"]*"|[^\s{}"]+))', text):
        out[m.group(1)] = m.group(2)
    return out


class TlcSession:
    """TLC runs for one stage: each run recorded through `sink` in the order it ran, the tools that ran, and the
    receipt's `tlc` section (the model-check run marked to report) and `traces` section."""

    SECTION = "tlc"

    def __init__(self, *, root: Path, workdir: Path, sink: Callable[[dict[str, Any]], None], wall_clock_s: float = WALL_CLOCK_S) -> None:
        self.root = root
        self.workdir = workdir
        self.sink = sink
        self.wall_clock_s = wall_clock_s
        self._java: Any = None
        self._jar: Path | None = None
        self._jar_sha: str | None = None
        self._version: str | None = None
        self._steps: set[str] = set()
        self.model_runs: list[ModelRun] = []
        self.reported: ModelRun | None = None
        self.traces: list[TraceResult] = []
        self.trace_seeds: list[int] = []
        self.extra_tools: list[dict[str, Any]] = []
        self.count = 0  # runs this session made, so a check can find them

    # -- the engine
    def _ensure(self) -> None:
        if self._jar is not None:
            return
        from statespace import doctor

        java = doctor.which("java")
        if java is None:
            raise TlcUnavailable("there is no java on this machine; TLC needs Java 21 (labs/TOOLS.md section 2.4)")
        directory = Path(os.environ.get("STATESPACE_TLA2TOOLS_DIR", "/opt/tla2tools"))
        jar = directory / f"tla2tools-{RELEASE}.jar"
        if not jar.is_file():
            raise TlcUnavailable(f"the pinned tla2tools {RELEASE} jar is not at {jar}; set STATESPACE_TLA2TOOLS_DIR to its folder (labs/TOOLS.md section 2.4)")
        self._java = doctor.probe("java", "tlc", "java", java, [str(java), "-version"], prefix="OpenJDK 64-Bit Server VM", tool="java")
        self._jar = jar
        self._jar_sha = doctor.sha256_file(jar)

    @property
    def jar_sha256(self) -> str | None:
        self._ensure()
        return self._jar_sha

    @property
    def jar_pinned(self) -> bool:
        from statespace.doctor import PINS

        return self.jar_sha256 == PINS["tlc-1.8.0"].sha256

    def _step(self, step: str) -> str:
        name, n = step, 1
        while name in self._steps:
            n += 1
            name = f"{step}-{n}"
        self._steps.add(name)
        return name

    def _tlc(self, stage: Path, module: str, cfg: str) -> tuple[list[str], Any]:
        from statespace.check import proc

        self._ensure()
        assert self._jar is not None
        argv = ["java", "-XX:+UseParallelGC", "-cp", str(self._jar), "tlc2.TLC", "-workers", "1", "-metadir", "states", "-config", cfg, f"{module}.tla"]
        done = proc.run([str(self._java.path), *argv[1:]], cwd=stage, timeout_s=self.wall_clock_s)
        shown = [*argv[:3], f"tla2tools-{RELEASE}.jar", *argv[4:]]  # no path of this machine enters a receipt
        return shown, done

    def _record(self, step: str, argv: list[str], input_sha: str, done: Any, verdict: str, lines: list[str], seed: int | None) -> int:
        budget: dict[str, int] = {"workers": 1}
        if seed is not None:
            budget["seed"] = seed
        version = self._version or "1.8.0"
        run: dict[str, Any] = {
            "step": step,
            "engine": "tlc",
            "version": version,
            "argv": argv,
            "inputSha256": input_sha,
            "budget": budget,
            "exitCode": done.returncode if done.returncode is not None else -1,
            "verdictLines": lines,
            "verdict": verdict,
            "ms": done.ms,
        }
        self.sink(run)
        self.count += 1
        return self.count - 1

    def _stage(self, name: str, modules: Sequence[Path]) -> Path:
        stage = self.workdir / name
        if stage.exists():
            shutil.rmtree(stage)
        stage.mkdir(parents=True)
        for path in modules:
            shutil.copyfile(path, stage / path.name)
        return stage

    @staticmethod
    def modules(spec_dir: Path, extra: Sequence[Path] = ()) -> list[Path]:
        """The modules TLC reads: the spec's folder, then `extra` files, then the lab's pinned challenge/ folder
        last, so a pinned module always wins."""
        found: dict[str, Path] = {}
        for p in sorted(spec_dir.glob("*.tla")):
            found[p.name] = p
        for p in extra:
            found[p.name] = p
        challenge = spec_dir.parent / "challenge"
        if challenge.is_dir():
            for p in sorted(challenge.glob("*.tla")):
                found[p.name] = p
        return list(found.values())

    # -- model checking (LAB-8.2, LAB-8.3)
    def model_check(self, *, modules: Sequence[Path], module: str, config: Path, step: str, spec_for_hash: Path) -> ModelRun:
        step = self._step(step)
        stage = self._stage(step, [*modules, config])
        argv, done = self._tlc(stage, module, config.name)
        out = done.output
        (self.workdir / f"{step}.out").write_text(out, encoding="utf-8")
        parsed = parse_tlc(out)
        if parsed["banner"]:
            self._version = parsed["banner"].removeprefix("TLC2 Version ").strip()
        if done.timed_out:
            verdict = "stopped"
        elif parsed["violated"]:
            verdict = "violated"
        elif parsed["deadlock"]:
            verdict = "deadlock"
        elif parsed["no_error"]:
            verdict = "no-error"
        else:
            verdict = "error"
        lines = verdict_lines(out)
        if done.timed_out:
            lines.append(f"statespace: TLC was stopped after {int(self.wall_clock_s)} s of wall-clock time, so it reached no verdict")
        cfg_text_ = config.read_text(encoding="utf-8")
        index = self._record(step, argv, _statement_sha(spec_for_hash.read_bytes()), done, verdict, lines, None)
        run = ModelRun(step, config.name, module, argv, done.returncode, out, parsed, verdict, constants_of(cfg_text_), ["-workers", "1", "-config", config.name], _statement_sha(spec_for_hash.read_bytes()), _sha(config.read_bytes()), index)
        self.model_runs.append(run)
        return run

    def report(self, run: ModelRun) -> None:
        """The model-check run the receipt's tlc section describes."""
        self.reported = run

    # -- trace validation (LAB-8.1, LAB-8.6)
    def validate(self, spec: Path, trace: Path, *, constants: Path | None, seed: int | None = None, step: str | None = None, lint_first: bool = True) -> TraceResult:
        """Validate one trace against `spec` (a path in the lab repository); the trace module is
        `<Spec>Trace.tla` beside it. `lint_first=False` lets TLC read a trace the lint refuses, which only
        Prove-it does, to show what an under-logged trace lets through."""
        rel = trace.resolve().relative_to(self.root).as_posix() if self.root in trace.resolve().parents else str(trace)
        data = trace.read_bytes()
        checked = lint(data)
        result = TraceResult(trace=rel, verdict="error", line="", lines=checked.lines, end_record=checked.end_record, sha256=_sha(data), seed=seed)
        if checked.problems and lint_first:
            result.line = tool_line(rel, checked, None)
            self.traces.append(result)
            return result
        if checked.problems:
            checked = Lint(checked.lines, checked.end_record, [], checked.rows, checked.events)
        module = f"{spec.stem}Trace"
        trace_module = spec.parent / f"{module}.tla"
        if not trace_module.is_file():
            result.line = f"trace {rel}: error: no trace module {module}.tla beside {spec.name}"
            self.traces.append(result)
            return result
        name = self._step(step or f"trace-{trace.stem}")
        stage = self._stage(name, self.modules(spec.parent))
        shutil.copyfile(trace, stage / trace.name)
        const_text = ""
        if constants is not None:
            const_text = "\n".join(line for line in constants.read_text(encoding="utf-8").split("\n") if not line.strip().startswith("\\*"))
        cfg = cfg_text(const_text, trace.name)
        (stage / f"{module}.cfg").write_text(cfg, encoding="utf-8")
        (self.workdir / f"{name}.cfg").write_text(cfg, encoding="utf-8")
        argv, done = self._tlc(stage, module, f"{module}.cfg")
        out = done.output
        (self.workdir / f"{name}.out").write_text(out, encoding="utf-8")
        parsed = parse_tlc(out)
        if parsed["banner"]:
            self._version = parsed["banner"].removeprefix("TLC2 Version ").strip()
        record = parsed["record"]
        lines = verdict_lines(out)
        if done.timed_out:
            lines.append(f"statespace: TLC was stopped after {int(self.wall_clock_s)} s of wall-clock time, so it reached no verdict")
            record = None
            parsed["problem"] = f"TLC was stopped after {int(self.wall_clock_s)} s of wall-clock time"
        if record:
            result.verdict = str(record.get("verdict"))
            result.matched = int(record.get("matched", 0))
            first = int(record.get("first_unmatched", 0))
            result.first_unmatched = first or None
            result.end_record = bool(record.get("end_record"))
        result.distinct = parsed["distinct"]
        result.line = tool_line(rel, checked, parsed)
        run_verdict = {"accepted": "accepted", "rejected": "rejected", "partial": "rejected"}.get(result.verdict, "error")
        result.run_index = self._record(name, argv, _sha(cfg.encode("utf-8")), done, run_verdict, lines, seed)
        self.traces.append(result)
        return result

    # -- the receipt
    def receipt_tools(self) -> list[dict[str, Any]]:
        if self._jar is None or self.count == 0:
            return list(self.extra_tools)
        from statespace.doctor import OK, PINS

        java = self._java
        tools: list[dict[str, Any]] = []
        if java is not None and java.sha256:
            tools.append({"name": "java", "version": java.version or "unknown", "sha256": java.sha256, "pinned": java.sha256 == PINS["java"].sha256 and java.status == OK})
        tools.append({"name": "tlc", "version": f"TLC2 Version {self._version}" if self._version else f"tla2tools {RELEASE}", "sha256": self._jar_sha, "pinned": self._jar_sha == PINS["tlc-1.8.0"].sha256})
        for t in self.extra_tools:
            if t not in tools:
                tools.append(t)
        return tools

    def receipt_section(self) -> dict[str, Any] | None:
        run = self.reported
        if run is None:
            return None
        parsed = run.parsed
        result = run.verdict if run.verdict in ("no-error", "violated", "deadlock", "stopped") else "stopped"
        return {
            "specSha256": run.spec_sha256,
            "configSha256": run.config_sha256,
            "constants": run.constants,
            "flags": run.flags,
            "distinctStates": parsed["distinct"] or 0,
            "depth": parsed["depth"] or 0,
            "result": result,
            "complete": bool(result == "no-error" and parsed["left"] == 0),
        }

    def traces_section(self) -> dict[str, Any] | None:
        judged = [t for t in self.traces if t.verdict in ("accepted", "rejected", "partial")]
        if not judged:
            return None
        seeds = "\n".join(str(t.seed) for t in judged if t.seed is not None) + "\n"
        verdicts: list[dict[str, Any]] = []
        for t in judged:
            entry: dict[str, Any] = {"trace": t.trace, "verdict": t.verdict, "firstNonConformingLine": t.first_unmatched if t.verdict == "rejected" else None}
            if t.seed is not None:
                entry["seed"] = t.seed
            verdicts.append(entry)
        return {"n": sum(1 for t in judged if t.verdict == "accepted"), "seedListSha256": _sha(seeds.encode("utf-8")), "verdicts": verdicts}


class TracesSection:
    """The receipt's traces section, as a session the runner reads (it names one section per session)."""

    SECTION = "traces"

    def __init__(self, session: TlcSession) -> None:
        self.session = session

    def receipt_tools(self) -> list[dict[str, Any]]:
        return []

    def receipt_section(self) -> dict[str, Any] | None:
        return self.session.traces_section()


# ------------------------------------------------------------------------------------------ the command
def _default_constants(spec: Path) -> Path | None:
    for candidate in (spec.parent / "TraceConstants.cfg", spec.parent.parent / "challenge" / "TraceConstants.cfg"):
        if candidate.is_file():
            return candidate
    return None


def _expand(paths: Sequence[str]) -> list[Path]:
    out: list[Path] = []
    for p in paths:
        path = Path(p)
        if path.is_dir():
            out.extend(sorted(path.glob("*.ndjson")))
        else:
            out.append(path)
    return out


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="statespace trace",
        description="trace validate <spec> <traces...>: check NDJSON traces as behaviors of a TLA+ spec with TLC. "
        "Exit status: 0 every trace accepted, 1 one was not, 2 a usage error, 3 TLC could not run.",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    v = sub.add_parser("validate", help="validate traces against a spec; its trace module is <Spec>Trace.tla beside it")
    v.add_argument("spec", type=Path, help="the spec, such as labs/LAB-8/spec/Outbox.tla")
    v.add_argument("traces", nargs="+", help="NDJSON traces, or folders of *.ndjson files")
    v.add_argument("--constants", type=Path, default=None, help="the trace configuration's constants (default: TraceConstants.cfg beside the spec, else in ../challenge/)")
    v.add_argument("--json", action="store_true", help="print the results as JSON")
    args = parser.parse_args(list(argv) if argv is not None else None)

    spec: Path = args.spec.resolve()
    if not spec.is_file():
        parser.error(f"no spec at {args.spec}")
    traces = _expand(args.traces)
    missing = [str(t) for t in traces if not t.is_file()]
    if missing or not traces:
        parser.error(f"no trace at {', '.join(missing) or ' '.join(args.traces)}")
    constants = args.constants.resolve() if args.constants is not None else _default_constants(spec)
    root = Path.cwd().resolve()
    with tempfile.TemporaryDirectory(prefix="statespace-trace-") as work:
        session = TlcSession(root=root, workdir=Path(work), sink=lambda run: None)
        results: list[TraceResult] = []
        try:
            for t in traces:
                results.append(session.validate(spec, t.resolve(), constants=constants))
        except TlcUnavailable as error:
            sys.stderr.write(f"statespace trace: {error}; nothing was judged\n")
            return 3
    accepted = sum(1 for r in results if r.verdict == "accepted")
    if args.json:
        sys.stdout.write(json.dumps({"accepted": accepted, "traces": [r.__dict__ for r in results]}, indent=2) + "\n")
    else:
        for r in results:
            sys.stdout.write(r.line + "\n")
        sys.stdout.write(f"{accepted} of {len(results)} trace{'s' if len(results) != 1 else ''} accepted against {args.spec}; n counts accepted traces only\n")
    return 0 if accepted == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

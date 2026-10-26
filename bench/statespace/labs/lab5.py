"""LAB-5, the holds spec: TLA+ checked with TLC (curriculum/S05-time.md section 3; content/stages/S5/lab.yaml).

W3-T32 and W3-T33 own this module. Every stage is declared with its check and the claim templates it mints, so
that `statespace receipt verify` compares a receipt with the lab's own list. LAB-5.7 is the stretch stage and its
check is not built yet: it writes no receipt and says so.

How a check runs TLC. Until the TLC lane exists (W3-T05, `statespace/lanes/tlc.py`), this module carries a small
TLC session of its own, `TlcSession`, with the lane's shape: it runs the pinned jar under Java with one worker,
records every run in the receipt in the order it ran (argv, the hash of the learner's module, workers, exit code
and verdict lines, copied verbatim), adds `java` and `tlc` to the receipt's tools with their hashes, and writes
the receipt's `tlc` section for the stage's headline run. A verdict comes from TLC's own lines, never from an
exit code. Each run is staged in its own folder beside the receipt (`receipts/LAB-5.<k>/<stem>/<step>/`), which
keeps TLC's whole output (`tlc.out`), the inputs as TLC read them and, where asked for, its JSON trace.

The statements are pinned. A learner's module is checked through a module the check writes, `MC.tla`, which
EXTENDS it and copies each property it checks from `claims/s5-props.tla` as `Pin_<name>`, and through a
configuration the check writes, `MC.cfg`, with the course's constants. So the property TLC checks is the stated
one, the constants are the course's, and the fairness of LAB-5.5 is exactly the learner's `SysFairness`: the
spec is built as `Init /\\ [][Next]_vars /\\ SysFairness`.

Prove-it (labs/README.md section 13): `python -m statespace.labs.lab5 defend` reads the learner's predictions
from `labs/LAB-5/prove-it/predictions.yaml`, seeds the six mutations of lab.yaml's proveIt list into copies of
the learner's own modules, and lets TLC grade each one. It writes nothing under receipts/. Nothing in this
module runs at import time.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-5"
PROPS = "claims/s5-props.tla"
CHALLENGE = f"{LAB_DIR}/challenge"
DOUBLESPEND_TLA = f"{CHALLENGE}/DoubleSpend.tla"
DOUBLESPEND_CFG = f"{CHALLENGE}/DoubleSpend.cfg"
HOLDS_ENV = f"{CHALLENGE}/HoldsEnv.tla"
LIVE_ENV = f"{CHALLENGE}/HoldLiveEnv.tla"
READING = f"{LAB_DIR}/reading.yaml"
ATOMIC = f"{LAB_DIR}/atomic/DoubleSpendAtomic.tla"
LIFECYCLE = f"{LAB_DIR}/lifecycle/HoldsLifecycle.tla"
UNSAFE = f"{LAB_DIR}/broken/HoldsUnsafe.tla"
FIXED = f"{LAB_DIR}/fixed/Holds.tla"
LIVE = f"{LAB_DIR}/live/HoldLive.tla"
STARVE = f"{LAB_DIR}/live/HoldStarve.tla"
PREDICTIONS = f"{LAB_DIR}/prove-it/predictions.yaml"
CARDS = {"CL-5.1": "claims/cl-5-1.yaml", "CL-5.2": "claims/cl-5-2.yaml", "CL-5.3": "claims/cl-5-3.yaml"}
BOUND = "claims/s5-bound.md"

# The provided DoubleSpend files, as the course ships them: the inputs of RUN-tlc-doublespend.
DOUBLESPEND_HASHES = {
    DOUBLESPEND_TLA: "2dd02b13ef0381398044662e06ab3dd74083a2bdfd5d4eb32722721339c3bc97",
    DOUBLESPEND_CFG: "8f509a37e9582f12b8097df139697600c35b7ddab2a904990bb5c166b4babc69",
}

# The course's constants for each model. A bound belongs to the claim, so the check, not the learner, sets it.
DOUBLESPEND_CONSTANTS = {"Init": "100", "Amount": "80", "Workers": "{w1, w2}"}
HOLDS_CONSTANTS = {"MaxTries": "2", "CrashesOn": "TRUE"}

JAR_RELEASE = "1.8.0"
WORKERS = 1  # one worker: minimal safety traces (labs/TOOLS.md section 2.4)
WALL_CLOCK_S = 300.0  # a backstop for a run, never a verdict [D]
ENV_ACTIONS = ("Reply", "Crash")  # HoldsEnv's environment actions, which LAB-5.c4 requires to be taken
RESOLVED = ("captured", "released")


# ------------------------------------------------------------------------------------------- TLC runs
@dataclass
class TlcRun:
    step: str
    folder: Path  # the run's folder, beside the receipt
    rel_folder: str  # the same, relative to the lab repository
    argv: list[str]
    exit_code: int | None
    output: str
    verdict_lines: list[str]
    verdict: str  # no-error | violated | deadlock | stopped | error
    version: str | None
    constants: dict[str, str]
    flags: list[str]
    spec_sha256: str
    config_sha256: str
    generated: int | None = None
    distinct: int | None = None
    left: int | None = None
    depth: int | None = None
    violated: str | None = None  # the invariant or property TLC names
    trace: list[str] = field(default_factory=list[str])  # action names from the text trace
    back_to: int | None = None  # "Back to state n" of a lasso
    stuttering: bool = False
    coverage: dict[str, tuple[int, int]] = field(default_factory=dict[str, tuple[int, int]])  # action -> (distinct, found), for env actions
    trace_json: Any = None
    trace_file: str | None = None  # repository-relative path of the JSON trace

    @property
    def complete(self) -> bool:
        """The exploration covered the whole reachable state space: no error and nothing left on the queue."""
        return self.verdict == "no-error" and self.left == 0

    def counts(self) -> str:
        if self.distinct is None:
            return "no state counts printed"
        return f"{self.generated} states generated, {self.distinct} distinct, {self.left} left on the queue, depth {self.depth}"

    def first_error(self) -> str:
        for line in self.verdict_lines:
            if not line.startswith(("TLC2 Version", "State ", "Back to state", "Semantic errors", "*** Errors", "Parsing or semantic analysis failed")):
                return line
        return next((line for line in self.verdict_lines if not line.startswith("TLC2 Version")), "TLC printed no verdict line")


_VERDICT_PREFIXES = (
    "TLC2 Version",
    "Error:",
    "Warning:",
    "Model checking completed.",
    "State ",
    "Back to state",
    "***",
    "Semantic error",
    "Parsing or semantic analysis failed",
    "Unknown operator",
    "Lexical error",
    "The depth of the complete state graph search is",
    "TLC threw an unexpected exception",
    "statespace: ",
)
_COUNTS = re.compile(r"^(\d+) states generated, (\d+) distinct states found, (\d+) states left on queue\.$")
_DEPTH = re.compile(r"^The depth of the complete state graph search is (\d+)\.$")
_STATE = re.compile(r"^State \d+: <(.+?)(?: line \d+, col \d+ to line \d+, col \d+ of module \w+)?>$")
_COVER = re.compile(r"^<(\w+)(?:\(.*\))? line \d+, col \d+ to line \d+, col \d+ of module (\w+)>: (\d+):(\d+)$")


def verdict_lines(output: str) -> list[str]:
    """The lines of TLC's output that carry its verdict, verbatim and in order."""
    out: list[str] = []
    for raw in output.splitlines():
        line = raw.rstrip()
        if line.startswith(_VERDICT_PREFIXES) or _COUNTS.match(line) or line == "Stuttering" or line.endswith("Stuttering"):
            out.append(line)
    return out


def derive_verdict(lines: Sequence[str]) -> str:
    """TLC's verdict from its verdict lines; an exit code is never read."""
    text = list(lines)
    if any(line.startswith("statespace: ") for line in text):
        return "stopped"
    if any(re.match(r"^Error: Invariant \S+ is violated", line) for line in text):
        return "violated"
    if any(re.match(r"^Error: (Temporal property|Action property) \S+ was violated", line) for line in text):
        return "violated"
    if any(line.startswith("Error: Deadlock reached") for line in text):
        return "deadlock"
    if "Model checking completed. No error has been found." in text and not any(line.startswith("Error:") for line in text):
        return "no-error"
    return "error"


class TlcSession:
    """The stage's TLC runs, in the shape of a lane session: the runner reads receipt_tools() and
    receipt_section() from every session the context lists."""

    SECTION = "tlc"

    def __init__(self, ctx: CheckContext) -> None:
        from statespace import doctor

        self.ctx = ctx
        self.java = doctor.which("java")
        directory = Path(os.environ.get("STATESPACE_TLA2TOOLS_DIR", "/opt/tla2tools"))
        self.jar = directory / f"tla2tools-{JAR_RELEASE}.jar"
        if self.java is None:
            raise ToolUnavailable("there is no java on this machine; LAB-5 runs TLC under Java 21 (labs/TOOLS.md section 2.4). Open the repository in the devcontainer, or install Java 21")
        if not self.jar.is_file():
            raise ToolUnavailable(f"the TLC jar tla2tools-{JAR_RELEASE}.jar is not in {directory}; set STATESPACE_TLA2TOOLS_DIR to the folder that holds it (labs/TOOLS.md section 2.4)")
        self.jar_sha256 = doctor.sha256_file(self.jar)
        self.jar_pinned = self.jar_sha256 == doctor.PINS[f"tlc-{JAR_RELEASE}"].sha256
        self.java_sha256 = doctor.sha256_file(self.java)
        done = doctor.run([str(self.java), "-version"], timeout=60)
        self.java_version = doctor.first_line(done.out, "OpenJDK 64-Bit Server VM") or doctor.first_line(done.out) or "unknown"
        self.tlc_version: str | None = None
        self.headline_run: TlcRun | None = None

    # -- the receipt
    def receipt_tools(self) -> list[dict[str, Any]]:
        from statespace import doctor

        tools: list[dict[str, Any]] = [{"name": "java", "version": self.java_version, "sha256": self.java_sha256, "pinned": self.java_sha256 == doctor.PINS["java"].sha256}]
        if self.tlc_version:
            tools.append({"name": "tlc", "version": self.tlc_version, "sha256": self.jar_sha256, "pinned": self.jar_pinned})
        return tools

    def receipt_section(self) -> dict[str, Any] | None:
        run = self.headline_run
        if run is None or run.distinct is None or run.depth is None or run.verdict not in ("no-error", "violated", "deadlock", "stopped"):
            return None
        section: dict[str, Any] = {
            "specSha256": run.spec_sha256,
            "configSha256": run.config_sha256,
            "constants": dict(run.constants),
            "flags": list(run.flags),
            "distinctStates": run.distinct,
            "depth": run.depth,
            "result": run.verdict,
            "complete": run.complete,
        }
        if run.trace_file:
            section["traceFile"] = run.trace_file
        return section

    def headline(self, run: TlcRun) -> None:
        """The run the receipt's tlc section describes."""
        self.headline_run = run

    # -- running
    def run(
        self,
        *,
        step: str,
        module_path: str,
        files: Sequence[str] = (),
        cfg: str | None = None,
        props: Sequence[str] = (),
        invariants: Sequence[str] = (),
        properties: Sequence[str] = (),
        fairness: bool = False,
        constants: Mapping[str, str] | None = None,
        deadlock_off: bool = True,
        coverage: bool = False,
        trace: bool = False,
        module_text: str | None = None,
        extra_defs: Sequence[str] = (),
        next_op: str = "Next",
        init_op: str = "Init",
        extra_cfg: str = "",
    ) -> TlcRun:
        """Run TLC once. With `cfg`, the module at `module_path` runs as it is, under that configuration file
        of the repository. Otherwise the check writes MC.tla, which EXTENDS the module and defines Pin_<name>
        for each of `props` (copied from claims/s5-props.tla) and Pin_Spec, and MC.cfg with `constants`,
        Pin_Spec and the named invariants and properties. `module_text` replaces the module's text (Prove-it
        mutants); `files` are the other modules it EXTENDS, staged beside it."""
        from statespace.check import proc
        from statespace.schema.statement_hash import statement_hash_text

        ctx = self.ctx
        folder = ctx.workdir / step
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True)
        text = module_text if module_text is not None else ctx.text(module_path)
        module = Path(module_path).stem
        declared = re.search(r"^-*\s*MODULE\s+(\w+)", text, re.M)
        if declared is None or declared.group(1) != module:
            raise InputRefused(f"{module_path} must declare MODULE {module}, its file name, for TLC to read it")
        (folder / f"{module}.tla").write_bytes(text.encode("utf-8"))
        for other in files:
            (folder / Path(other).name).write_bytes(ctx.text(other).encode("utf-8"))
        defined: dict[str, str] = {}
        if cfg is not None:
            cfg_text = ctx.text(cfg)
            (folder / Path(cfg).name).write_bytes(cfg_text.encode("utf-8"))
            config_name, target = Path(cfg).name, module
            consts = parse_cfg_constants(cfg_text)
        else:
            stated = pinned_props(ctx)
            for name in props:
                if name not in stated:
                    raise InputRefused(f"{PROPS} does not define {name}, which this check pins; restore the file from the lab zip")
                defined[name] = stated[name]
            spec = f"{init_op} /\\ [][{next_op}]_vars" + (" /\\ SysFairness" if fairness else "")
            lines = [
                "---- MODULE MC ----",
                f"EXTENDS {module}",
                f"\\* Written by statespace check for {ctx.stage.id}. The properties are copied from {PROPS}.",
                *[f"Pin_{name} == {body}" for name, body in defined.items()],
                *extra_defs,
                f"Pin_Spec == {spec}",
                "====",
            ]
            (folder / "MC.tla").write_text("\n".join(lines) + "\n", encoding="utf-8")
            consts = dict(constants or {})
            cfg_lines = []
            if consts:
                cfg_lines.append("CONSTANTS")
                cfg_lines.extend(f"  {k} = {v}" for k, v in consts.items())
            cfg_lines.append("SPECIFICATION Pin_Spec")
            cfg_lines.extend(f"INVARIANT {name}" for name in invariants)
            cfg_lines.extend(f"PROPERTY {name}" for name in properties)
            if extra_cfg:
                cfg_lines.append(extra_cfg)
            cfg_text = "\n".join(cfg_lines) + "\n"
            (folder / "MC.cfg").write_text(cfg_text, encoding="utf-8")
            config_name, target = "MC.cfg", "MC"
        flags = ["-workers", str(WORKERS)] + (["-deadlock"] if deadlock_off else []) + (["-coverage", "1"] if coverage else [])
        trace_name = f"{module}.trace.json"
        tail = (["-dumpTrace", "json", trace_name] if trace else []) + ["-metadir", "states", "-config", config_name, target]
        argv = [str(self.java), "-XX:+UseParallelGC", "-cp", str(self.jar), "tlc2.TLC", *flags, *tail]
        shown = ["java", "-XX:+UseParallelGC", "-cp", self.jar.name, "tlc2.TLC", *flags, *tail]
        done = proc.run(argv, cwd=folder, timeout_s=ctx.wall_clock_s or WALL_CLOCK_S)
        shutil.rmtree(folder / "states", ignore_errors=True)
        output = done.output
        if done.error is not None:
            raise ToolUnavailable(f"java did not start: {done.error}")
        (folder / "tlc.out").write_text(output, encoding="utf-8")
        lines_out = verdict_lines(output)
        if done.timed_out:
            lines_out.append(f"statespace: TLC was stopped after {int(ctx.wall_clock_s or WALL_CLOCK_S)} s of wall-clock time, so nothing was judged")
        if not lines_out:
            lines_out = ["statespace: TLC printed no verdict line"]
        version = next((line for line in lines_out if line.startswith("TLC2 Version")), None)
        if version:
            self.tlc_version = version
        verdict = derive_verdict(lines_out)
        rel_folder = folder.relative_to(ctx.root).as_posix()
        pretty_flags = [" ".join(flags[i : i + 2]) if flags[i] in ("-workers", "-coverage") else flags[i] for i in range(len(flags)) if not flags[i].isdigit()]
        run = TlcRun(
            step=step,
            folder=folder,
            rel_folder=rel_folder,
            argv=shown,
            exit_code=done.returncode,
            output=output,
            verdict_lines=lines_out,
            verdict=verdict,
            version=version,
            constants=consts,
            flags=pretty_flags,
            spec_sha256=statement_hash_text(text),
            config_sha256=_sha256(cfg_text.encode("utf-8")),
        )
        parse_output(run)
        if trace and (folder / trace_name).is_file():
            run.trace_file = f"{rel_folder}/{trace_name}"
            try:
                run.trace_json = json.loads((folder / trace_name).read_text(encoding="utf-8"))
            except (OSError, ValueError):
                run.trace_json = None
        record: dict[str, Any] = {
            "step": _local_id(f"{ctx.stage.id.split('.', 1)[1]}-{step}"),
            "engine": "tlc",
            "version": version or "unknown",
            "argv": shown,
            "inputSha256": run.spec_sha256,
            "budget": {"workers": WORKERS},
            "exitCode": done.returncode if done.returncode is not None else -1,
            "verdictLines": lines_out,
            "verdict": verdict,
            "ms": done.ms,
        }
        ctx.runs.append(record)
        return run


def _local_id(text: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "-", text)
    return cleaned[:64] if cleaned[:1].isalnum() else ("r" + cleaned)[:64]


def _sha256(data: bytes) -> str:
    import hashlib

    return hashlib.sha256(data).hexdigest()


def parse_cfg_constants(text: str) -> dict[str, str]:
    """The constants a TLC configuration assigns, verbatim: `CONSTANTS Init = 100  Amount = 80 ...`."""
    out: dict[str, str] = {}
    body = re.split(r"\b(?:INIT|NEXT|SPECIFICATION|INVARIANTS?|PROPERTY|PROPERTIES|CONSTRAINTS?|SYMMETRY|CHECK_DEADLOCK|VIEW)\b", text)[0]
    body = re.sub(r"\bCONSTANTS?\b", " ", body)
    for m in re.finditer(r"(\w+)\s*=\s*(\{[^}]*\}|\S+)", body):
        out[m.group(1)] = m.group(2)
    return out


def parse_output(run: TlcRun) -> None:
    """Counts, the violated property, the text trace and coverage of the environment's actions."""
    for raw in run.output.splitlines():
        line = raw.rstrip()
        if m := _COUNTS.match(line):
            run.generated, run.distinct, run.left = int(m.group(1)), int(m.group(2)), int(m.group(3))
        elif m := _DEPTH.match(line):
            run.depth = int(m.group(1))
        elif m := re.match(r"^Error: Invariant (\S+) is violated", line):
            run.violated = m.group(1)
        elif m := re.match(r"^Error: (?:Temporal|Action) property (\S+) was violated", line):
            run.violated = m.group(1)
        elif m := _STATE.match(line):
            name = m.group(1)
            if name != "Initial predicate":
                run.trace.append(name)
        elif line.endswith("Stuttering") and line.startswith("State "):
            run.stuttering = True
            run.trace.append("Stuttering")
        elif m := re.match(r"^Back to state (\d+)(?:: <(.+?)(?: line \d+, col \d+ to line \d+, col \d+ of module \w+)?>)?", line):
            run.back_to = int(m.group(1))
            if m.group(2):
                run.trace.append(m.group(2))
        elif m := _COVER.match(line):
            if m.group(2) in ("HoldsEnv", "HoldLiveEnv"):
                run.coverage[m.group(1)] = (int(m.group(3)), int(m.group(4)))


def pinned_props(ctx: CheckContext) -> dict[str, str]:
    """The definitions of claims/s5-props.tla, by name, pinned in the receipt."""
    text = ctx.statement(PROPS, "tla")
    ctx.tcb(f"the statements in {PROPS}", "trusted")
    out: dict[str, str] = {}
    for line in text.splitlines():
        if m := re.match(r"^(\w+)\s*==\s*(.+?)\s*$", line):
            out[m.group(1)] = m.group(2)
    return out


def session(ctx: CheckContext) -> TlcSession:
    """The stage's TLC session, added to the sessions the runner reads tools and sections from."""
    existing = getattr(ctx, "_lab5_tlc", None)
    if isinstance(existing, TlcSession):
        return existing
    tlc = TlcSession(ctx)
    setattr(ctx, "_lab5_tlc", tlc)
    listed = ctx.sessions
    setattr(ctx, "sessions", lambda: [*listed(), tlc])
    return tlc


def trusted_base(ctx: CheckContext) -> None:
    ctx.tcb(f"TLC tla2tools {JAR_RELEASE} (pinned by SHA-256)", "trusted")
    ctx.tcb("Java 21", "trusted")


def definitions(text: str) -> dict[str, str]:
    """The top-level definitions of a TLA+ module, by name, with comments removed: `Name(args) == body`."""
    clean = re.sub(r"\(\*.*?\*\)", " ", text, flags=re.S)
    clean = "\n".join(line.split("\\*", 1)[0] for line in clean.splitlines())
    out: dict[str, str] = {}
    current: str | None = None
    for line in clean.splitlines():
        if re.match(r"^[-=]{4,}", line):
            current = None
            continue
        if m := re.match(r"^(\w+)(?:\([^)]*\))?\s*==(.*)$", line):
            current = m.group(1)
            out[current] = m.group(2).strip()
        elif current is not None and line.strip() and line[:1].isspace():
            out[current] += " " + line.strip()
        elif line.strip():
            current = None
    return out


def conjuncts(body: str) -> list[str]:
    """The top-level conjuncts of a definition's body, as written."""
    parts = [p.strip() for p in re.split(r"/\\", body) if p.strip()]
    return [re.sub(r"\s+", " ", p) for p in parts]


def _fail(message: str, suspect: str, *details: str) -> CheckResult:
    return CheckResult(False, message, suspect, tuple(details))


def _tlc_failed(run: TlcRun, what: str) -> CheckResult:
    """TLC did not reach the verdict a check needs because it could not read or run the module."""
    return _fail(f"TLC could not check {what}: {run.first_error()}", "spec", f"TLC's whole output: {run.rel_folder}/tlc.out")


def _base(name: str) -> str:
    return re.sub(r"\(.*\)$", "", name.strip())


# ---------------------------------------------------------------------------------------------- checks
def c1(ctx: CheckContext) -> CheckResult:
    """LAB-5.c1: the deadlock-off run of the provided configuration, read by the learner."""
    import yaml

    tlc = session(ctx)
    trusted_base(ctx)
    from statespace.schema.statement_hash import statement_hash_text

    ctx.statement(DOUBLESPEND_TLA, "tla")  # the configuration's hash is the tlc section's configSha256

    changed = [p for p, h in DOUBLESPEND_HASHES.items() if statement_hash_text(ctx.text(p)) != h]
    run = tlc.run(step="doublespend", module_path=DOUBLESPEND_TLA, cfg=DOUBLESPEND_CFG, deadlock_off=True, trace=True)
    tlc.headline(run)
    if changed:
        return _fail(f"{', '.join(changed)} differ from the provided files; LAB-5.1 runs the provided configuration unchanged", "spec", "restore them from the lab zip")
    if not tlc.jar_pinned:
        return _fail(f"the TLC jar's SHA-256 {tlc.jar_sha256} is not the course's pin", "tool", "labs/TOOLS.md section 2.4 lists the pinned jar")
    if run.verdict != "violated" or run.violated != "NoOverspend":
        return _fail(f"TLC's verdict on the provided configuration was {run.verdict}, not NoOverspend violated", "tool", *run.verdict_lines[-4:])
    steps = _json_steps(run.trace_json)
    names = [_base(n) for n in (steps or run.trace)]
    reads = [i for i, n in enumerate(names) if n == "Read"]
    writes = [i for i, n in enumerate(names) if n == "Write"]
    if not (len(reads) == 2 and len(writes) == 2 and max(reads) < min(writes)):
        return _fail(f"the trace TLC printed is {', '.join(names)}, not both reads before both writes", "tool")
    # What the learner read off the run.
    try:
        reading = yaml.safe_load(ctx.text(READING)) or {}
    except yaml.YAMLError as error:
        raise InputRefused(f"{READING} is not YAML: {error}") from error
    if not isinstance(reading, dict):
        raise InputRefused(f"{READING} must be a mapping of the fields it lists")
    wrong: list[str] = []
    flags = {re.sub(r"\s+", " ", str(f)).strip() for f in (reading.get("flags") or [])}
    if flags != set(run.flags):
        wrong.append("flags")
    expected_result = next((line[len("Error: "):] for line in run.verdict_lines if line.startswith("Error: Invariant")), "")
    if str(reading.get("result") or "").strip().rstrip(".") != expected_result.rstrip("."):
        wrong.append("result")
    if reading.get("distinct_states") != run.distinct:
        wrong.append("distinct_states")
    if reading.get("depth") != run.depth:
        wrong.append("depth")
    if [_base(str(n)) for n in (reading.get("trace") or [])] != names:
        wrong.append("trace")
    if wrong:
        return _fail(
            f"{READING} does not match what TLC printed in {len(wrong)} field{'s' if len(wrong) != 1 else ''}: {', '.join(wrong)}",
            "spec",
            f"read the receipt's argv and tlc section, and TLC's output in {run.rel_folder}/tlc.out, then copy what it printed",
        )
    return CheckResult(True, f"NoOverspend violated in the provided configuration ({run.counts()}), a trace of {len(names)} actions with both reads before both writes, and {READING} matches it")


def _json_steps(trace: Any) -> list[str]:
    """The action names of a TLC 1.8.0 JSON trace, in order (lasso@1's `action` steps)."""
    try:
        return [str(step[1]["name"]) for step in trace["counterexample"]["action"]]
    except (KeyError, IndexError, TypeError):
        return []


def c2(ctx: CheckContext) -> CheckResult:
    """LAB-5.c2: the atomic spec passes a complete check, and a spend is reachable."""
    tlc = session(ctx)
    trusted_base(ctx)
    text = ctx.statement(ATOMIC, "tla")
    common = dict(module_path=ATOMIC, props=("NoOverspend", "NoSpend"), constants=DOUBLESPEND_CONSTANTS, init_op="Init_")
    main = tlc.run(step="atomic", invariants=("Pin_NoOverspend",), **common)
    tlc.headline(main)
    if _same_body(text, ctx.text(DOUBLESPEND_TLA)):
        return _fail(f"{ATOMIC} is still the provided DoubleSpend: its guard and its write are separate steps", "spec")
    if main.verdict == "violated":
        return _fail(
            f"NoOverspend is violated: {' -> '.join(main.trace) or 'see the trace'} ({main.counts()})",
            "spec",
            "a worker still tests a balance it read one step earlier: one action must test and write the balance",
        )
    if main.verdict != "no-error" or not main.complete:
        return _tlc_failed(main, ATOMIC) if main.verdict == "error" else _fail(f"TLC's verdict was {main.verdict}, not a complete run with no error ({main.counts()})", "spec")
    witness = tlc.run(step="atomic-witness", invariants=("Pin_NoSpend",), **common)
    if witness.verdict != "violated" or witness.violated != "Pin_NoSpend":
        return _fail(f"NoSpend was not violated ({witness.verdict}): no spend is reachable, so NoOverspend holds vacuously", "spec", f"TLC's output: {witness.rel_folder}/tlc.out")
    ctx.claim("CL-5.1")
    return CheckResult(
        True,
        f"NoOverspend holds over the whole reachable state space ({main.counts()}), at {_show(DOUBLESPEND_CONSTANTS)}; NoSpend is violated, so a spend is reachable ({' -> '.join(witness.trace)})",
    )


def _same_body(a: str, b: str) -> bool:
    def norm(text: str) -> str:
        body = definitions(text)
        return json.dumps(sorted((k, re.sub(r"\s+", " ", v)) for k, v in body.items()))

    return norm(a) == norm(b)


def _show(constants: Mapping[str, str]) -> str:
    return ", ".join(f"{k} = {v}" for k, v in constants.items())


def _witnesses(tlc: TlcSession, step: str, common: dict[str, Any]) -> tuple[CheckResult | None, list[str]]:
    shown: list[str] = []
    for name, outcome in (("NotCaptured", "captured"), ("NotReleased", "released")):
        run = tlc.run(step=f"{step}-{outcome}", invariants=(f"Pin_{name}",), **common)
        if run.verdict != "violated" or run.violated != f"Pin_{name}":
            return _fail(f"{name} was not violated ({run.verdict}): no behavior reaches a {outcome} hold, so the check would hold vacuously", "spec", f"TLC's output: {run.rel_folder}/tlc.out"), shown
        shown.append(f"{outcome}: {' -> '.join(run.trace)}")
    return None, shown


def c3(ctx: CheckContext) -> CheckResult:
    """LAB-5.c3: NeverTwice and TypeOK hold, and both outcomes are reachable."""
    tlc = session(ctx)
    trusted_base(ctx)
    ctx.statement(LIFECYCLE, "tla")
    common = dict(module_path=LIFECYCLE, props=("NeverTwice", "NotCaptured", "NotReleased"))
    main = tlc.run(step="lifecycle", invariants=("TypeOK", "Pin_NeverTwice"), **common)
    tlc.headline(main)
    if main.verdict == "violated":
        return _fail(f"{main.violated} is violated: {' -> '.join(main.trace)} ({main.counts()})", "spec", "count every resolution in res, and resolve only a held hold")
    if not main.complete:
        return _tlc_failed(main, LIFECYCLE) if main.verdict == "error" else _fail(f"TLC's verdict was {main.verdict}, not a complete run with no error", "spec")
    problem, shown = _witnesses(tlc, "lifecycle", common)
    if problem:
        return problem
    ctx.claim("CL-5.2")
    return CheckResult(True, f"TypeOK and NeverTwice hold over the whole reachable state space ({main.counts()}); both outcomes are reachable", None, tuple(shown))


def c4(ctx: CheckContext) -> CheckResult:
    """LAB-5.c4: the unsafe variant breaks NeverTwice, and the fix holds with crashes on."""
    tlc = session(ctx)
    trusted_base(ctx)
    ctx.statement(HOLDS_ENV, "tla")
    ctx.tcb("challenge/HoldsEnv.tla, the environment (Reply, Crash)", "trusted")
    ctx.statement(UNSAFE, "tla")
    ctx.statement(FIXED, "tla")
    unsafe = tlc.run(step="broken", module_path=UNSAFE, files=(HOLDS_ENV,), props=("NeverTwice",), constants=HOLDS_CONSTANTS, invariants=("Pin_NeverTwice",), trace=True)
    if unsafe.verdict == "error":
        return _tlc_failed(unsafe, UNSAFE)
    if unsafe.verdict != "violated" or unsafe.violated != "Pin_NeverTwice":
        return _fail(f"(a) TLC found no hold that resolves twice in {UNSAFE} ({unsafe.verdict}, {unsafe.counts()})", "spec", "split handling and expiry into a read step and a write step that trusts the read")
    steps = _json_steps(unsafe.trace_json) or unsafe.trace
    if not any("Expire" in s for s in steps):
        return _fail(f"(a) NeverTwice is violated, but the trace has no expiry step: {' -> '.join(steps)}", "spec", "the hold must resolve twice through the worker and the expiry job")
    common = dict(module_path=FIXED, files=(HOLDS_ENV,), props=("NeverTwice", "NotCaptured", "NotReleased"), constants=HOLDS_CONSTANTS)
    fixed = tlc.run(step="fixed", invariants=("TypeOK", "Pin_NeverTwice"), coverage=True, **common)
    tlc.headline(fixed)
    if fixed.verdict == "violated":
        return _fail(f"(b) {fixed.violated} is violated in {FIXED}: {' -> '.join(fixed.trace)}", "spec", "every resolution must test and write hst in one action")
    if not fixed.complete:
        return _tlc_failed(fixed, FIXED) if fixed.verdict == "error" else _fail(f"(b) TLC's verdict on {FIXED} was {fixed.verdict}, not a complete run with no error", "spec")
    untaken = [a for a in ENV_ACTIONS if fixed.coverage.get(a, (0, 0))[1] == 0]
    if untaken:
        return _fail(f"(b) the environment's {' and '.join(untaken)} {'is' if len(untaken) == 1 else 'are'} never taken in the explored graph, so the check says nothing about {'it' if len(untaken) == 1 else 'them'}", "spec", "keep Reply and Crash in Next; crash actions stay on")
    problem, shown = _witnesses(tlc, "fixed", common)
    if problem:
        return problem
    ctx.claim("CL-5.2")
    taken = ", ".join(f"{a} {fixed.coverage[a][1]} times" for a in ENV_ACTIONS)
    return CheckResult(
        True,
        f"(a) NeverTwice is violated in broken/ through {' -> '.join(steps)}; (b) it holds in fixed/ over the whole reachable state space ({fixed.counts()}) at {_show(HOLDS_CONSTANTS)}",
        None,
        (f"environment actions taken: {taken}", *shown),
    )


def c5(ctx: CheckContext) -> CheckResult:
    """LAB-5.c5: EventuallyResolves holds under SysFairness, and the starving lasso is valid."""
    tlc = session(ctx)
    trusted_base(ctx)
    env_text = ctx.statement(LIVE_ENV, "tla")
    live_text = ctx.statement(LIVE, "tla")
    starve_text = ctx.statement(STARVE, "tla")
    ctx.tcb("challenge/HoldLiveEnv.tla, the provider (Busy, Capture)", "trusted")
    ctx.ext["lab5"] = {"crashesOn": False, "symmetry": None, "constraint": None}
    defs = definitions(live_text)
    fairness = defs.get("SysFairness")
    if fairness is None:
        raise InputRefused(f"{LIVE} does not define SysFairness")
    env_names = set(definitions(env_text)) - {"vars", "Resolved"}
    named = sorted(n for n in env_names if re.search(rf"\b{n}\b", fairness))
    if named:
        return _fail(f"SysFairness names the provider's {', '.join(named)}: fairness on the environment is a promise nobody made", "spec", f"SysFairness == {fairness}")
    main = tlc.run(step="live", module_path=LIVE, files=(LIVE_ENV,), props=("EventuallyResolves",), properties=("Pin_EventuallyResolves",), fairness=True)
    tlc.headline(main)
    if main.verdict == "violated":
        return _fail(
            f"(a) EventuallyResolves is violated under your SysFairness: {' -> '.join(main.trace)}" + (f", back to state {main.back_to}" if main.back_to else ""),
            "spec",
            "weak fairness forces only an action that stays enabled: look at when Timeout is enabled along this lasso",
        )
    if not main.complete:
        return _tlc_failed(main, LIVE) if main.verdict == "error" else _fail(f"(a) TLC's verdict was {main.verdict}, not a complete run with no error", "spec")
    if _same_body(starve_text, live_text):
        return _fail(f"(b) {STARVE} is the same model as {LIVE}; the starving variant weakens it in one place", "spec")
    starve = tlc.run(step="starve", module_path=STARVE, files=(LIVE_ENV,), props=("EventuallyResolves",), properties=("Pin_EventuallyResolves",), fairness=True, trace=True)
    if starve.verdict == "error":
        return _tlc_failed(starve, STARVE)
    if starve.verdict != "violated":
        return _fail(f"(b) EventuallyResolves holds on {STARVE} ({starve.verdict}), so it has no starving lasso", "spec")
    problem = check_lasso(starve.trace_json)
    if problem:
        return _fail(f"(b) the starving variant's lasso is not accepted: {problem}", "spec", f"its JSON trace: {starve.trace_file or 'not written'}")
    ctx.claim("CL-5.3")
    shown = " /\\ ".join(conjuncts(fairness))
    return CheckResult(
        True,
        f"(a) EventuallyResolves holds under SysFairness over the whole reachable state space ({main.counts()}); (b) the starving lasso closes and starves: {' -> '.join(_json_steps(starve.trace_json))}",
        None,
        (f"SysFairness: {shown}", "no SYMMETRY, no CONSTRAINT; crash actions off (SEAM-8)"),
    )


def check_lasso(trace: Any) -> str | None:
    """A lasso in TLC 1.8.0's JSON trace (schemas/drafts/lasso.schema.json): it closes, the hold is unresolved
    at every state of its cycle, and the cycle takes a step that changes the state. Returns the problem, or
    None. Whether each step is an edge of the graph and the cycle is fair is TLC's own report, trusted here."""
    try:
        steps = trace["counterexample"]["action"]
        states = {int(s[0]): s[1] for s in trace["counterexample"]["state"]}
    except (KeyError, IndexError, TypeError, ValueError):
        return "no JSON trace in lasso@1's shape was written"
    if not steps or len(steps) != len(states):
        return "the trace does not close: a lasso has as many steps as states"
    start = int(steps[-1][2][0])
    if start not in states or steps[-1][2][1] != states[start]:
        return "the closing step does not return to a state of the trace"
    cycle = [i for i in sorted(states) if i >= start]
    resolved = [i for i in cycle if states[i].get("st") in RESOLVED]
    if resolved:
        return f"the hold is resolved at state {resolved[0]} of the cycle"
    if not any(int(s[0][0]) >= start and s[0][1] != s[2][1] for s in steps):
        return "its cycle only stutters: the behavior stops rather than going round a cycle"
    return None


def c6(ctx: CheckContext) -> CheckResult:
    """LAB-5.c6: the three claim cards are complete, and each rests on its passing receipt."""
    import yaml

    from statespace.receipt import verify_file
    from statespace.schema.validation import validate

    problems: list[str] = []
    stage_of = {"CL-5.1": "LAB-5.2", "CL-5.2": "LAB-5.4", "CL-5.3": "LAB-5.5"}
    witness_of = {"CL-5.1": "SP-5.1", "CL-5.2": "SP-5.4", "CL-5.3": "SP-5.3"}
    for template, path in CARDS.items():
        text = ctx.statement(path, "yaml")
        try:
            card = yaml.safe_load(text)
        except yaml.YAMLError as error:
            problems.append(f"{path}: not YAML ({error})")
            continue
        issues = validate("claim", card)
        if issues:
            empty = [i["instancePath"] for i in issues if i["keyword"] in ("minLength", "pattern") and i["message"].startswith("''")]
            if empty:
                problems.append(f"{path}: fill in {', '.join(p.lstrip('/').replace('/', '.') for p in empty)}")
            else:
                first = issues[0]
                problems.append(f"{path}: claim@1 refuses it at {first['instancePath'] or '/'}: {first['message']}")
            continue
        if card.get("template") != template:
            problems.append(f"{path}: template is {card.get('template')}, not {template}")
        method = card.get("method") or {}
        receipt_file = _receipt_file(ctx, str(method.get("receipt") or ""))
        if receipt_file is None or not receipt_file.is_file():
            problems.append(f"{path}: method.receipt names no receipt in the repository")
        else:
            verification = verify_file(receipt_file, root=ctx.root)
            receipt = json.loads(receipt_file.read_text(encoding="utf-8")) if verification.ok else None
            if receipt is None:
                failing = next((f.message for f in verification.findings if f.level == "fail"), "it does not verify")
                problems.append(f"{path}: its receipt does not verify: {failing}")
            elif receipt.get("stage") != stage_of[template] or not all(c.get("pass") for c in receipt.get("checks", [])):
                problems.append(f"{path}: its receipt is not a passing {stage_of[template]} receipt")
            else:
                tools = {t["name"]: t["version"] for t in receipt.get("tools", [])}
                if method.get("tool") != "tlc" or method.get("version") != tools.get("tlc"):
                    problems.append(f"{path}: method.tool and method.version must be tlc and the receipt's version line, {tools.get('tlc')!r}")
                statement = (card.get("statement") or {}).get("path")
                if statement not in {s["path"] for s in receipt.get("statements", [])}:
                    problems.append(f"{path}: statement.path {statement} is not a statement its receipt pins")
        seams = {a.get("seam") for a in card.get("assumptions", [])}
        if template == "CL-5.2" and "SEAM-4" not in seams:
            problems.append(f"{path}: no assumption names SEAM-4, the dispatch this card rests on")
        if template == "CL-5.3":
            if "SEAM-8" not in seams:
                problems.append(f"{path}: no assumption names SEAM-8 (crash actions off in this check)")
            fairness = definitions(ctx.text(LIVE)).get("SysFairness", "")
            said = " ".join(re.sub(r"\s+", "", a.get("text", "")) for a in card.get("assumptions", []))
            missing = [c for c in conjuncts(fairness) if re.sub(r"\s+", "", c) not in said]
            if missing:
                problems.append(f"{path}: the assumptions do not list the fairness conjunct{'s' if len(missing) != 1 else ''} {', '.join(missing)}")
        weakened = card.get("if_weakened") or {}
        specimen = str(weakened.get("specimen") or "")
        if witness_of[template] not in str(weakened.get("text") or "") and not (specimen and ctx.path(specimen).is_file()):
            problems.append(f"{path}: if_weakened names neither {witness_of[template]} nor a specimen of your own in the repository")
    bound = ctx.text(BOUND)
    needed = [f"{k} = {v}" for k, v in {**DOUBLESPEND_CONSTANTS, **HOLDS_CONSTANTS}.items()] + ["SP-5.6"]
    absent = [n for n in needed if n not in bound]
    if absent:
        problems.append(f"{BOUND}: the bound statement does not name {', '.join(absent)}")
    if problems:
        return _fail(f"{len(problems)} problem{'s' if len(problems) != 1 else ''} in the claim cards", "spec", *problems)
    for template, path in CARDS.items():
        ctx.claim(template, id=Path(path).stem)
    return CheckResult(True, "CL-5.1, CL-5.2 and CL-5.3 pass claim@1 validation, each rests on its passing receipt, and the bound statement names the constants and SP-5.6")


def _receipt_file(ctx: CheckContext, named: str) -> Path | None:
    """The receipt a card names: a receipt file, or a stage's folder (receipts/LAB-5.2) for its newest receipt,
    since a newer receipt supersedes an older one."""
    if not named:
        return None
    path = ctx.path(named)
    if path.is_dir():
        found = sorted(path.glob("*.json"))
        return found[-1] if found else None
    return path


def not_built(check_id: str):
    def run(ctx: CheckContext) -> CheckResult:
        raise ToolUnavailable(f"{check_id} (the stretch stage) is not built in this version of statespace yet")

    return run


LAB = Lab(
    "LAB-5",
    "The holds spec",
    stages=(
        Stage("LAB-5.1", "Run the provided DoubleSpend configuration and read the receipt", (CheckSpec("LAB-5.c1", "The receipt is the deadlock-off run of the provided configuration.", c1),)),
        Stage("LAB-5.2", "Make the critical step atomic; complete check", (CheckSpec("LAB-5.c2", "Your atomic spec passes a complete check, and a spend is reachable.", c2),), claims=("CL-5.1",)),
        Stage("LAB-5.3", "Holds lifecycle with NeverTwice", (CheckSpec("LAB-5.c3", "NeverTwice and TypeOK hold, and both outcomes are reachable.", c3),), claims=("CL-5.2",)),
        Stage("LAB-5.4", "Environment actions; find resolved-twice; fix it", (CheckSpec("LAB-5.c4", "The unsafe variant breaks NeverTwice, and the fix holds with crashes on.", c4),), claims=("CL-5.2",)),
        Stage("LAB-5.5", "Liveness under stated fairness; validate the starving lasso", (CheckSpec("LAB-5.c5", "EventuallyResolves holds under your fairness, and the starving lasso is valid.", c5),), claims=("CL-5.3",)),
        Stage("LAB-5.6", "Bound statement and claim cards", (CheckSpec("LAB-5.c6", "The three claim cards are complete, and each stamp prints its bound.", c6),), claims=("CL-5.1", "CL-5.2", "CL-5.3")),
        Stage("LAB-5.7", "[stretch] Inductive invariant at fixed constants, then for every N in Z3", (CheckSpec("LAB-5.c7", "Not built yet: the stretch stage.", not_built("LAB-5.c7")),), claims=("CL-5.4",)),
    ),
)


# --------------------------------------------------------------------------------------------- Prove-it
@dataclass(frozen=True)
class Mutant:
    key: str
    operator: str
    applied_to: str
    question: str


PROVE_IT = (
    Mutant("split-atomic", "Split the atomic action.", "LAB-5.2", "Is the invariant violated or not, and how long is the witness, as an interval in actions?"),
    Mutant("drop-fairness", "Drop weak fairness on the expiry action.", "LAB-5.5", "Does the property hold or fail, and what is the shape of the lasso?"),
    Mutant("duplicate-reply", "Add a duplicate-reply handler outside the compare-and-set.", "LAB-5.4", "Does NeverTwice hold?"),
    Mutant("three-workers", "Raise Workers from 2 to 3.", "LAB-5.2", "What is the verdict, and which fields of the stamp's qualifier change?"),
    Mutant("timeout-held-only", "Restrict the expiry action to the held state.", "LAB-5.5", "Does a starving lasso come back?"),
    Mutant("symmetry-liveness", "Add SYMMETRY to the liveness configuration.", "LAB-5.5", "What does TLC print about the declaration?"),
)


def _restrict(text: str, name: str, conjunct: str) -> str | None:
    """`text` with `conjunct` added to the top-level definition `name`, or None when it has none."""
    m = re.search(rf"^{name}\s*==", text, re.M)
    if m is None:
        return None
    return text[: m.end()] + f" {conjunct} /\\" + text[m.end() :]


def run_mutant(ctx: CheckContext, mutant: Mutant) -> TlcRun:
    """Seed one Prove-it mutation into a copy of the learner's module and let TLC grade it."""
    tlc = session(ctx)
    if mutant.key == "split-atomic":
        # The split form of the atomic action is the provided read-then-write pair, at the learner's constants.
        return tlc.run(step=mutant.key, module_path=DOUBLESPEND_TLA, props=("NoOverspend",), constants=DOUBLESPEND_CONSTANTS, invariants=("Pin_NoOverspend",), init_op="Init_")
    if mutant.key == "three-workers":
        return tlc.run(step=mutant.key, module_path=ATOMIC, props=("NoOverspend",), constants={**DOUBLESPEND_CONSTANTS, "Workers": "{w1, w2, w3}"}, invariants=("Pin_NoOverspend",), init_op="Init_")
    if mutant.key == "duplicate-reply":
        dup = 'HandleDup(r) == /\\ r \\in msgs /\\ up /\\ r = "ok" /\\ hst # "captured" /\\ hst\' = "captured" /\\ res\' = res + 1 /\\ UNCHANGED <<tries, msgs, sent, up>>'
        return tlc.run(step=mutant.key, module_path=FIXED, files=(HOLDS_ENV,), props=("NeverTwice",), constants=HOLDS_CONSTANTS, invariants=("Pin_NeverTwice",), extra_defs=(dup, "MutNext == Next \\/ \\E r \\in Replies : HandleDup(r)"), next_op="MutNext")
    live = dict(module_path=LIVE, files=(LIVE_ENV,), props=("EventuallyResolves",), properties=("Pin_EventuallyResolves",))
    if mutant.key == "drop-fairness":
        return tlc.run(step=mutant.key, fairness=False, **live)
    if mutant.key == "timeout-held-only":
        text = _restrict(ctx.text(LIVE), "Timeout", 'st = "held"')
        if text is None:
            raise InputRefused(f"{LIVE} defines no Timeout for this mutation to restrict")
        return tlc.run(step=mutant.key, fairness=True, module_text=text, **live)
    if mutant.key == "symmetry-liveness":
        return tlc.run(
            step=mutant.key,
            fairness=True,
            constants={"Ids": "{i1, i2}"},
            extra_defs=("LOCAL INSTANCE TLC", "CONSTANT Ids", "Pin_Sym == Permutations(Ids)"),
            extra_cfg="SYMMETRY Pin_Sym",
            **live,
        )
    raise KeyError(mutant.key)


def defend(root: Path) -> int:
    """`python -m statespace.labs.lab5 defend`: predictions first, then TLC grades each mutant."""
    import secrets

    import yaml

    ctx = CheckContext(root=root, lab=LAB, stage=LAB.stage("LAB-5.2"), workdir=root / ".statespace" / "defend" / "LAB-5", seed=secrets.randbits(32))
    try:
        predictions = yaml.safe_load(ctx.text(PREDICTIONS)) or {}
    except (InputRefused, yaml.YAMLError) as error:
        sys.stderr.write(f"statespace defend: {error}\n")
        return 2
    missing = [m.key for m in PROVE_IT if not str((predictions.get(m.key) or "")).strip()]
    if missing:
        sys.stderr.write(f"statespace defend: predict first, with your agent closed: {PREDICTIONS} has no prediction for {', '.join(missing)}\n")
        return 2
    for mutant in PROVE_IT:
        try:
            run = run_mutant(ctx, mutant)
        except (InputRefused, ToolUnavailable) as error:
            sys.stdout.write(f"{mutant.key}  ({mutant.applied_to}) {mutant.operator}\n  not run: {error}\n")
            continue
        warning = next((line for line in run.verdict_lines if line.startswith("Warning:")), None)
        sys.stdout.write(f"{mutant.key}  ({mutant.applied_to}) {mutant.operator}\n")
        sys.stdout.write(f"  you predicted: {str(predictions[mutant.key]).strip()}\n")
        sys.stdout.write(f"  TLC: {run.verdict}{' (' + run.violated + ')' if run.violated else ''}; {run.counts()}\n")
        if run.trace:
            sys.stdout.write(f"  trace: {' -> '.join(run.trace)}{f', back to state {run.back_to}' if run.back_to else ''} ({len(run.trace)} actions)\n")
        if warning:
            sys.stdout.write(f"  {warning}\n")
        sys.stdout.write(f"  TLC's output: {run.rel_folder}/tlc.out\n")
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args[:1] != ["defend"]:
        sys.stderr.write("usage: python -m statespace.labs.lab5 defend   (from your lab repository)\n")
        return 2
    from statespace.check.runner import find_root

    root = find_root(LAB.directory, Path.cwd())
    if root is None:
        sys.stderr.write(f"statespace defend: no {LAB.directory}/ here or above\n")
        return 2
    return defend(root)


if __name__ == "__main__":
    sys.exit(main())

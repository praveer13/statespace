"""LAB-8, effects-sim: the outbox spec, the sans-I/O machine under seeded faults, and trace validation
(curriculum/S08-effects.md section 3; content/stages/S8/lab.yaml).

W5-T19 and W5-T20 own this module. Every stage is declared with its check and the claim templates it mints, so
that `statespace receipt verify` compares a receipt with the lab's own list. LAB-8.9 is the stretch stage and has
no check.

What each check runs, and where:

- LAB-8.1, 8.2, 8.3 and 8.6 run TLC, the pinned tla2tools 1.8.0 jar under Java with one worker, through
  `statespace.trace.TlcSession` (it stands in for the TLC lane, W3-T05, until that lane exists). Every run is
  recorded with its argv, input hash, workers, exit code and verdict lines, copied verbatim; verdicts come from
  TLC's own lines, never from an exit code. The model checks stage the learner's spec/Outbox.tla with the pinned
  challenge/ modules and claims/OutboxProps.tla, and run the pinned configurations unchanged.
- LAB-8.4, 8.6 and 8.7 build the learner's crate, labs/LAB-8/sim/ (the course's harness, world.rs and main.rs,
  with the learner's machine.rs, faults.rs and specimen.rs), with cargo, and run it on seeds drawn when the check
  starts. Those seeds go into the receipt (`ext.sim`).
- LAB-8.5 runs the learner's reply handler, labs/LAB-8/sql/inbound.sql, on PostgreSQL 18.6, through the PostgreSQL
  lane's session, on fresh reply sequences drawn when the check starts.
- LAB-8.8 validates the five claim cards against claim@1 and the horizon rule.

The design puts LAB-8.4 and LAB-8.5 in the tab (re-checked here); until the tab's Lane A host runs the learner's
wasm machine, these Bench checks report them from the learner's machine.

Prove-it (labs/README.md section 13): `uv run python -m statespace.labs.lab8 defend` reads the learner's
predictions from labs/LAB-8/prove-it/predictions.yaml, seeds lab.yaml's proveIt mutations into copies of the
learner's own artifacts, and lets the right checker grade each one. It writes nothing under receipts/. Nothing in
this module runs at import time.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-8"
CHALLENGE = f"{LAB_DIR}/challenge"
SPEC = f"{LAB_DIR}/spec/Outbox.tla"
TRACE_MODULE = f"{LAB_DIR}/spec/OutboxTrace.tla"
PROPS = "claims/OutboxProps.tla"
PROGRESS = "claims/progress.yaml"
REFERENCE = f"{LAB_DIR}/reference/OutboxRef.tla"
SEED1_TRACE = f"{LAB_DIR}/traces/seed-1.ndjson"
CRATE = f"{LAB_DIR}/sim"
SQL = f"{LAB_DIR}/sql/inbound.sql"
PREDICTIONS = f"{LAB_DIR}/prove-it/predictions.yaml"
TRACE_CONSTANTS = f"{CHALLENGE}/TraceConstants.cfg"

# The reference simulator's seed-1 trace, as RUN-sim-determinism recorded it.
SEED1_SHA256 = "5d31a41b23728743e35ae246e4aa40ad3091359e08eda48c8f1c3b365dd16e6a"

# Grade-time parameters [D]: printed by every check that uses them, and recorded in the receipt.
SIM_SEEDS = 20  # LAB-8.4: fault schedules per check
SIM_RATE = 150  # faults per thousand choices
SIM_STEPS = 200  # the step cap of the faulty phase
SIM_COMMANDS = 2
TRACE_SEEDS = 8  # LAB-8.6: traces validated per check
TRACE_MIN = 5  # LAB-8.6: the minimum n
SPECIMEN_SEEDS = 10  # LAB-8.7: fault seeds under the planted failure
REPLAY_MAX = 3  # LAB-8.7: specimens replayed per check
BUILD_S = 600.0
RUN_S = 300.0


# ------------------------------------------------------------------------------------------ sessions
def tlc(ctx: CheckContext) -> Any:
    """The stage's TLC session, added to the sessions the runner reads tools and sections from."""
    from statespace.trace import TlcSession, TracesSection

    existing = getattr(ctx, "_lab8_tlc", None)
    if existing is not None:
        return existing
    session = TlcSession(root=ctx.root, workdir=ctx.workdir, sink=ctx.runs.append)
    setattr(ctx, "_lab8_tlc", session)
    listed = ctx.sessions
    setattr(ctx, "sessions", lambda: [*listed(), session, TracesSection(session)])
    return session


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _fail(message: str, suspect: str, *details: str) -> CheckResult:
    return CheckResult(False, message, suspect, tuple(details))


def _pin(ctx: CheckContext, *paths: str) -> None:
    for p in paths:
        ctx.statement(p, "yaml" if p.endswith((".yaml", ".yml")) else "sql" if p.endswith(".sql") else "tla")


def _tlc_trusted(ctx: CheckContext) -> None:
    ctx.tcb("TLC tla2tools 1.8.0 (pinned by SHA-256)", "trusted")
    ctx.tcb("Java 21", "trusted")


def _ensure_tlc(ctx: CheckContext) -> Any:
    from statespace.trace import TlcUnavailable

    session = tlc(ctx)
    try:
        session.jar_sha256  # noqa: B018 - finds java and the jar, or says why not
    except TlcUnavailable as error:
        raise ToolUnavailable(str(error)) from error
    return session


# ------------------------------------------------------------------------------------------ LAB-8.1
def c1(ctx: CheckContext) -> CheckResult:
    session = _ensure_tlc(ctx)
    _pin(ctx, f"{CHALLENGE}/TraceValidation.tla", f"{CHALLENGE}/OutboxIface.tla", REFERENCE, f"{LAB_DIR}/reference/OutboxRefTrace.tla", TRACE_CONSTANTS)
    _tlc_trusted(ctx)
    ctx.tcb("the reference simulator (statespace sim --reference; reference module, earns nothing)", "tested")
    trace = ctx.path(SEED1_TRACE)
    if not trace.is_file():
        return _fail(f"{SEED1_TRACE} is not there yet", "implementation", "write it with: uv run statespace sim 1 --reference --out labs/LAB-8/traces/seed-1.ndjson")
    data = trace.read_bytes()
    if _sha(data) != SEED1_SHA256:
        return _fail(
            f"{SEED1_TRACE} is not the reference simulator's seed-1 trace: its SHA-256 is {_sha(data)[:16]}..., the recorded one {SEED1_SHA256[:16]}...",
            "implementation",
            "write it again with: uv run statespace sim 1 --reference --out labs/LAB-8/traces/seed-1.ndjson, and do not edit it",
        )
    if not session.jar_pinned:
        return _fail(f"the tla2tools jar is not the pinned one (its SHA-256 is {session.jar_sha256[:16]}...)", "tool", "labs/TOOLS.md section 2.4 gives the pin")
    result = session.validate(ctx.path(REFERENCE), trace, constants=ctx.path(TRACE_CONSTANTS), seed=1, step="seed-1")
    if result.verdict != "accepted":
        return _fail(result.line, "tool" if result.verdict == "error" else "spec", "the reference spec and the reference trace are the course's: this is a fault to report")
    return CheckResult(True, result.line, details=(f"trace SHA-256 {SEED1_SHA256} equals the recorded seed-1 hash", f"tla2tools 1.8.0 SHA-256 {session.jar_sha256} is the pin"))


# ------------------------------------------------------------------------------------------ LAB-8.2 and 8.3
def _modules(ctx: CheckContext) -> list[Path]:
    session = tlc(ctx)
    return session.modules(ctx.path(SPEC).parent, (ctx.path(PROPS),))


def _model(ctx: CheckContext, config: str) -> Any:
    """One TLC run of the pinned configuration challenge/<config>.cfg on claims/OutboxProps.tla."""
    session = tlc(ctx)
    return session.model_check(modules=_modules(ctx), module="OutboxProps", config=ctx.path(f"{CHALLENGE}/{config}.cfg"), step=config, spec_for_hash=ctx.path(SPEC))


def _states(output: str) -> list[tuple[str, str]]:
    """TLC's counterexample as (action label, state text) pairs."""
    out: list[tuple[str, str]] = []
    for block in re.split(r"\n(?=State \d+: )", output):
        m = re.match(r"State \d+: (?:<(\S+)[^>]*>|(\S.*))\n?", block)
        if m:
            out.append((m.group(1) or m.group(2).strip(), block))
    return out


def _crash_in_cw3(output: str) -> bool:
    """A Crash after the provider charged and before the result was durable: CW3."""
    states = _states(output)
    for i in range(1, len(states)):
        label, text = states[i]
        before = states[i - 1][1]
        if label.startswith("Crash") and re.search(r"charges = \[[^\]]*\|-> [1-9]", before) and re.search(r"durable = \{\}", text):
            return True
    return False


def _problem(run: Any) -> str:
    return run.parsed.get("problem") or (run.parsed["errors"][0] if run.parsed["errors"] else "TLC printed no verdict")


def c2(ctx: CheckContext) -> CheckResult:
    _ensure_tlc(ctx)
    _pin(ctx, SPEC, PROPS, f"{CHALLENGE}/OutboxIface.tla", f"{CHALLENGE}/mc-unsafe.cfg", f"{CHALLENGE}/mc-full.cfg", f"{CHALLENGE}/mc-reach.cfg")
    _tlc_trusted(ctx)
    ctx.tcb(f"your spec, {SPEC}, as the model", "trusted")
    unsafe = _model(ctx, "mc-unsafe")
    full = _model(ctx, "mc-full")
    reach = _model(ctx, "mc-reach")
    tlc(ctx).report(full)
    shown = "  ".join(f"{k} = {v}" for k, v in full.constants.items())
    for run in (unsafe, full, reach):
        if run.verdict == "error":
            return _fail(f"TLC stopped without a verdict on {run.config}: {_problem(run)}", "spec", f"TLC's output is in {ctx.workdir.relative_to(ctx.root).as_posix()}/{run.step}.out")
        if run.verdict == "stopped":
            return _fail(f"TLC was stopped before it finished {run.config}", "spec", "a spec whose state space explodes under the course's constants: look for an unbounded counter")
    if unsafe.parsed["violated"] != "NoDoubleCharge":
        return _fail(
            "the unsafe variant does not double-charge: with Dedup = FALSE and CrashWindows = {\"CW3\"}, NoDoubleCharge held",
            "spec",
            f"TLC: {unsafe.parsed['distinct']} distinct states, {unsafe.verdict}",
            "a crash after the provider accepted and before the result is stored should lead to a second request: look at Crash and Recover",
        )
    if not _crash_in_cw3(unsafe.output):
        return _fail("NoDoubleCharge is violated on the unsafe variant, but not by a trace with a Crash between Accept and Persist", "spec", "read the trace TLC printed for mc-unsafe.cfg")
    if full.parsed["violated"]:
        return _fail(f"the full design violates {full.parsed['violated']}", "spec", f"constants: {shown}", f"TLC's trace is in {ctx.workdir.relative_to(ctx.root).as_posix()}/{full.step}.out")
    if not (full.verdict == "no-error" and full.parsed["left"] == 0):
        return _fail(f"the full design's check is not complete: {full.verdict}, {full.parsed['left']} states left on the queue", "spec")
    if reach.parsed["violated"] != "NeverAcked":
        return _fail(
            "under the full design no intent is ever acknowledged, so the three invariants hold vacuously",
            "spec",
            "mc-reach.cfg expects NeverAcked to be violated: write Dispatch, Receive, Persist and Ack",
        )
    ctx.claim("CL-8.1")
    ctx.claim("CL-8.2")
    return CheckResult(
        True,
        f"the unsafe variant double-charges after a crash in CW3; the full design has no error over a complete exploration ({full.parsed['distinct']} distinct states, depth {full.parsed['depth']})",
        details=(f"constants: {shown}", "invariants: TypeOK, NoLostIntent, AckedIsDurable, NoDoubleCharge", "an acknowledgement is reachable (NeverAcked is violated)"),
    )


ASSUMPTIONS = (("worker_fairness", "no-worker", "WorkerFair"), ("provider_fairness", "no-provider", "ProviderFair"), ("worker_recovery", "no-recover", "RecoverFair"))
PROPERTIES = (("EventuallyDispatched", "dispatched"), ("EventuallyAcked", "acked"))


def _yes_no(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.strip().lower() in ("yes", "no"):
        return value.strip().lower() == "yes"
    return None


def _definition(text: str, name: str) -> str | None:
    clean = re.sub(r"\(\*.*?\*\)", " ", text, flags=re.S)
    clean = "\n".join(line.split("\\*", 1)[0].rstrip() for line in clean.splitlines())
    m = re.search(rf"^{name}\s*==(.*?)(?=^\S|\Z)", clean, re.M | re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else None


def c3(ctx: CheckContext) -> CheckResult:
    import yaml

    _ensure_tlc(ctx)
    spec_text = ctx.statement(SPEC, "tla")
    _pin(ctx, PROPS, f"{CHALLENGE}/OutboxIface.tla", *(f"{CHALLENGE}/live-{a}-{p}.cfg" for a in ("all", "no-worker", "no-provider", "no-recover") for p in ("dispatched", "acked")))
    table_text = ctx.statement(PROGRESS, "yaml")
    _tlc_trusted(ctx)
    ctx.tcb("fairness and recovery, as assumptions [A]", "trusted")
    runs: dict[tuple[str, str], Any] = {}
    for drop in ("all", "no-worker", "no-provider", "no-recover"):
        for prop, short in PROPERTIES:
            runs[(drop, prop)] = _model(ctx, f"live-{drop}-{short}")
    tlc(ctx).report(runs[("all", "EventuallyAcked")])
    ctx.ext["fairness"] = {name: _definition(spec_text, name) or "" for _key, _drop, name in ASSUMPTIONS}
    ctx.ext["crashBudget"] = runs[("all", "EventuallyAcked")].constants.get("MaxCrashes", "")
    for run in runs.values():
        if run.verdict in ("error", "stopped"):
            return _fail(f"TLC reached no verdict on {run.config}: {_problem(run) if run.verdict == 'error' else 'stopped by the backstop'}", "spec")
    for prop, _short in PROPERTIES:
        run = runs[("all", prop)]
        if run.parsed["violated"]:
            return _fail(
                f"{prop} fails under the stated assumptions (LiveSpec, MaxCrashes = {ctx.ext['crashBudget']})",
                "spec",
                "TLC returned a lasso: read where it loops, and which fairness conjunct should have forced a step there",
                f"WorkerFair == {ctx.ext['fairness']['WorkerFair']}",
            )
        if not (run.verdict == "no-error" and run.parsed["left"] == 0):
            return _fail(f"{prop} under LiveSpec: the check is not complete", "spec")
    lasso = runs[("no-recover", "EventuallyAcked")]
    if not (lasso.parsed["violated"] and lasso.parsed["lasso"]):
        return _fail("without fair Recover, TLC returns no lasso for EventuallyAcked", "spec", "a crash with no recovery must leave the intent unacknowledged forever: look at RecoverFair and at Crash")
    try:
        table = yaml.safe_load(table_text) or {}
    except yaml.YAMLError as error:
        raise InputRefused(f"{PROGRESS} is not YAML: {error}") from error
    if not isinstance(table, dict):
        raise InputRefused(f"{PROGRESS} is not a mapping of properties")
    mismatches: list[str] = []
    unanswered: list[str] = []
    for prop, _short in PROPERTIES:
        row = table.get(prop) if isinstance(table.get(prop), dict) else {}
        for key, drop, _name in ASSUMPTIONS:
            said = _yes_no(row.get(key)) if isinstance(row, dict) else None
            needs = runs[(drop, prop)].parsed["violated"] is not None
            if said is None:
                unanswered.append(f"{prop}.{key}")
            elif said != needs:
                mismatches.append(f"{prop}.{key}: you wrote {'yes' if said else 'no'}; TLC {'refutes' if needs else 'keeps'} {prop} when {_name} is dropped")
    if unanswered:
        return _fail(f"{PROGRESS} does not say yes or no for {', '.join(unanswered)}", "spec", "each property row says which assumption it needs: yes or no")
    if mismatches:
        return _fail(f"{PROGRESS} disagrees with TLC on {len(mismatches)} drop-one configuration{'s' if len(mismatches) != 1 else ''}", "spec", *mismatches)
    ctx.claim("CL-8.4")
    ctx.claim("CL-8.5")
    a = runs[("all", "EventuallyAcked")]
    return CheckResult(
        True,
        f"EventuallyDispatched and EventuallyAcked hold under LiveSpec with MaxCrashes = {ctx.ext['crashBudget']} ({a.parsed['distinct']} distinct states, complete); without fair Recover TLC returns a lasso; {PROGRESS} matches TLC on all six drop-one runs",
        details=tuple(f"{name} == {ctx.ext['fairness'][name]}" for _k, _d, name in ASSUMPTIONS),
    )


# ------------------------------------------------------------------------------------------ the crate
def _rust_tools() -> list[dict[str, Any]]:
    from statespace import doctor

    out: list[dict[str, Any]] = []
    for name in ("rustc", "cargo"):
        binary = doctor.rust_binary(name)
        check = doctor.probe(name, "rust", name, binary, [str(binary), "--version"] if binary else None, tool=name)
        if check.sha256:
            out.append({"name": name, "version": check.version or "unknown", "sha256": check.sha256, "pinned": check.sha256 == doctor.PINS[name].sha256})
    return out


def _record(ctx: CheckContext, *, step: str, engine: str, version: str, argv: list[str], input_sha: str, exit_code: int | None, lines: list[str], verdict: str, ms: int, seed: int | None = None) -> None:
    budget: dict[str, int] = {} if seed is None else {"seed": seed}
    ctx.runs.append(
        {
            "step": step,
            "engine": engine,
            "version": version,
            "argv": argv,
            "inputSha256": input_sha,
            "budget": budget,
            "exitCode": exit_code if exit_code is not None else -1,
            "verdictLines": lines or ["statespace: the run printed no verdict line"],
            "verdict": verdict,
            "ms": ms,
        }
    )


def _sources_sha(ctx: CheckContext) -> str:
    h = hashlib.sha256()
    for name in ("machine.rs", "faults.rs", "specimen.rs"):
        path = ctx.path(f"{CRATE}/src/{name}")
        h.update(name.encode() + b"\0" + (path.read_bytes() if path.is_file() else b"") + b"\0")
    return h.hexdigest()


def build(ctx: CheckContext) -> Path | CheckResult:
    """Build the learner's crate once per stage; the binary, or a failing result."""
    from statespace.check import proc

    built = getattr(ctx, "_lab8_binary", None)
    if built is not None:
        return built
    cargo = shutil.which("cargo")
    if cargo is None:
        raise ToolUnavailable("there is no cargo on this machine; LAB-8's simulator needs Rust 1.96.0 (labs/TOOLS.md section 2.6)")
    crate = ctx.path(CRATE)
    if not (crate / "Cargo.toml").is_file():
        raise InputRefused(f"{CRATE}/Cargo.toml is not in your lab repository")
    session = tlc(ctx)
    for t in _rust_tools():
        if t not in session.extra_tools:
            session.extra_tools.append(t)
    ctx.tcb("the course's harness (labs/LAB-8/sim/src/world.rs) and its provider model", "trusted")
    ctx.tcb("rustc 1.96.0 and cargo", "trusted")
    env = {**os.environ, "CARGO_TERM_COLOR": "never"}
    argv = ["cargo", "build", "--release", "--offline", "--quiet"]
    done = proc.run([cargo, *argv[1:]], cwd=crate, timeout_s=BUILD_S, env=env)
    errors = [line for line in done.output.splitlines() if line.startswith(("error", "warning: unused"))][:5] if done.returncode else []
    version = next((t["version"] for t in session.extra_tools if t["name"] == "cargo"), "cargo")
    lines = [*(errors or []), "statespace: cargo build " + ("finished" if done.returncode == 0 else f"failed (exit {done.returncode})")]
    _record(ctx, step="cargo-build", engine="cargo", version=version, argv=[*argv, "--manifest-path", f"{CRATE}/Cargo.toml"], input_sha=_sources_sha(ctx), exit_code=done.returncode, lines=lines, verdict="passed" if done.returncode == 0 else "failed", ms=done.ms)
    (ctx.workdir).mkdir(parents=True, exist_ok=True)
    (ctx.workdir / "cargo-build.out").write_text(done.output, encoding="utf-8")
    if done.returncode != 0:
        first = next((line for line in done.output.splitlines() if line.startswith("error")), "cargo build failed")
        return _fail(f"your crate does not build: {first}", "implementation", *[line for line in done.output.splitlines() if line.strip().startswith("-->")][:3])
    binary = crate / "target" / "release" / "outbox-sim"
    setattr(ctx, "_lab8_binary", binary)
    return binary


def sim(ctx: CheckContext, binary: Path, args: list[str], *, step: str, seed: int | None = None) -> tuple[int | None, list[str]]:
    """Run the learner's simulator and record the run with the lines it printed."""
    from statespace.check import proc

    done = proc.run([str(binary), *args], cwd=ctx.root, timeout_s=RUN_S)
    lines = [line for line in done.output.splitlines() if line.startswith(("seed ", "window ", "suite:"))]
    if done.timed_out:
        lines.append(f"statespace: the simulator was stopped after {int(RUN_S)} s")
    (ctx.workdir / f"{step}.out").write_text(done.output, encoding="utf-8")
    _record(ctx, step=step, engine="outbox-sim", version="outbox-sim 0.1.0", argv=[f"{CRATE}/target/release/outbox-sim", *args], input_sha=_sources_sha(ctx), exit_code=done.returncode, lines=lines, verdict="passed" if done.returncode == 0 else "failed", ms=done.ms, seed=seed)
    return (None if done.timed_out else done.returncode), lines


def _draw(ctx: CheckContext, n: int) -> list[int]:
    seeds: set[int] = set()
    while len(seeds) < n:
        seeds.add(ctx.rng.randrange(1, 1 << 32))
    return sorted(seeds)


def _seed_list(seeds: Sequence[int]) -> str:
    return _sha(("\n".join(str(s) for s in seeds) + "\n").encode())


# ------------------------------------------------------------------------------------------ LAB-8.4
def c4(ctx: CheckContext) -> CheckResult:
    built = build(ctx)
    if isinstance(built, CheckResult):
        return built
    seeds = _draw(ctx, SIM_SEEDS)
    ctx.ext["sim"] = {"seeds": seeds, "seedListSha256": _seed_list(seeds), "rate": SIM_RATE, "steps": SIM_STEPS, "commands": SIM_COMMANDS}
    params = ["--rate", str(SIM_RATE), "--steps", str(SIM_STEPS), "--commands", str(SIM_COMMANDS)]
    _code, lines = sim(ctx, built, ["suite", "--seeds", ",".join(map(str, seeds)), *params], step="suite")
    _code2, windows = sim(ctx, built, ["systematic", "--commands", str(SIM_COMMANDS)], step="systematic")
    printed = f"n = {len(seeds)} schedules, step cap {SIM_STEPS}, fault rate {SIM_RATE} per thousand, {SIM_COMMANDS} commands, a deduplicating provider"
    failures = [line for line in lines if line.startswith("seed ") and ": FAIL " in line]
    summary = next((line for line in lines if line.startswith("suite:")), "")
    injected = re.search(r"(\d+) faults injected", summary)
    if not summary:
        return _fail("the simulator printed no summary line", "implementation", printed)
    if failures:
        return _fail(f"{len(failures)} of {len(seeds)} fault schedules break a property", "implementation", printed, *failures[:5])
    if injected is None or int(injected.group(1)) == 0:
        return _fail("your fault plan injected no fault on any schedule, so the suite tested the happy path only", "implementation", printed, summary, "faults.rs: draw a fault with probability rate/1000 when one is enabled")
    bad_windows = [line for line in windows if line.startswith("window ") and ": FAIL" in line]
    if bad_windows or sum(1 for line in windows if line.startswith("window ") and ": ok" in line) != 4:
        return _fail("the systematic mode fails: a crash in one of CW1 to CW4 breaks a property", "implementation", *(bad_windows or windows))
    return CheckResult(True, f"{len(seeds)} of {len(seeds)} fresh fault schedules keep the properties, each run twice to the same trace, and one crash in each of CW1 to CW4 passes", details=(printed, summary, f"seed list SHA-256 {ctx.ext['sim']['seedListSha256']}"))


# ------------------------------------------------------------------------------------------ LAB-8.5
SCHEMA_SQL = f"{CHALLENGE}/schema.sql"


def _expected(replies: list[tuple[str, str, str, int]], holds: dict[str, int], keys: dict[str, str], released: set[str]) -> list[str]:
    """The oracle: S8.L4's checks in order, for each reply (key, intent, status, cost)."""
    seen: set[str] = set()
    captured: set[str] = set()
    out: list[str] = []
    for key, intent, status, cost in replies:
        if key in seen:
            out.append("duplicate: already applied")
            continue
        seen.add(key)
        if intent not in keys or keys[intent] != key:
            out.append("rejected: unknown key")
        elif status != "ok":
            out.append("rejected: invalid")
        elif intent in released:
            out.append("rejected: late")
        elif cost > holds[intent] or intent in captured:
            out.append("rejected: over cost")
        else:
            captured.add(intent)
            out.append("captured")
    return out


def c5(ctx: CheckContext) -> CheckResult:
    import time

    from statespace.lanes.pg import PgSession

    schema = ctx.statement(SCHEMA_SQL, "sql")
    handler = ctx.text(SQL)
    pg = PgSession(root=ctx.root, workdir=ctx.workdir, sink=ctx.runs.append, dsn=os.environ.get("STATESPACE_PG_DSN"))
    admin, name, conninfo = pg.scratch_db()  # raises ToolUnavailable when there is no server or no psycopg
    ctx.tcb(f"PostgreSQL {pg.server_version}", "trusted")
    ctx.tcb("the provider's replies, as the check draws them", "tested")
    import psycopg

    rng = ctx.rng
    try:
        conn = psycopg.connect(conninfo, autocommit=True)
        try:
            conn.execute(schema)
        except psycopg.Error as error:
            return _fail(f"the course's schema did not load: {error}".splitlines()[0], "tool")
        try:
            conn.execute(handler)
        except psycopg.Error as error:
            return _fail(f"{SQL} does not load: {str(error).splitlines()[0]}", "implementation")
        lines: list[str] = []
        problems: list[str] = []
        started = time.monotonic()
        scenarios = ("duplicates", "over-cost", "invalid", "unknown-key", "late", "dropped-commit", "reordered")
        for scenario in scenarios:
            conn.execute("TRUNCATE captures, inbound_keys, reconciliations, intents, holds")
            n_intents = 2 if scenario == "reordered" else 1
            holds: dict[str, int] = {}
            keys: dict[str, str] = {}
            for i in range(1, n_intents + 1):
                intent = f"i{i}"
                amount = rng.randrange(50, 200)
                holds[intent] = amount
                conn.execute("INSERT INTO holds (intent, amount, status) VALUES (%s, %s, 'held')", (intent, amount))
                keys[intent] = str(conn.execute("INSERT INTO intents (intent) VALUES (%s) RETURNING key", (intent,)).fetchone()[0])
            released: set[str] = set()
            ok = lambda intent: (keys[intent], intent, "ok", rng.randrange(1, holds[intent] + 1))  # noqa: E731
            if scenario == "duplicates":
                r = ok("i1")
                replies = [r] * rng.randrange(2, 4)
            elif scenario == "over-cost":
                replies = [(keys["i1"], "i1", "ok", holds["i1"] + rng.randrange(1, 50))]
            elif scenario == "invalid":
                replies = [(keys["i1"], "i1", rng.choice(["error", "declined", "pending"]), rng.randrange(1, holds["i1"] + 1))]
            elif scenario == "unknown-key":
                stranger = str(conn.execute("SELECT uuidv7()").fetchone()[0])
                replies = [(stranger, "i1", "ok", 10), ok("i1")]
            elif scenario == "late":
                conn.execute("UPDATE holds SET status = 'released' WHERE intent = 'i1'")
                released.add("i1")
                replies = [ok("i1")]
            elif scenario == "dropped-commit":
                r = ok("i1")
                replies = [r, r]  # the second call is the re-run after the first COMMIT's outcome was lost
            else:
                a, b = ok("i1"), ok("i2")
                replies = [a, b, a, b, a]
                rng.shuffle(replies)
            expected = _expected(replies, holds, keys, released)
            for (key, intent, status, cost), want in zip(replies, expected):
                try:
                    with conn.transaction():
                        got = conn.execute("SELECT handle_reply(%s::uuid, %s, %s, %s)", (key, intent, status, cost)).fetchone()[0]
                except psycopg.Error as error:
                    got = f"error: {str(error).splitlines()[0]}"
                shown = f"handle_reply({'K' + intent[1:] if key == keys.get(intent) else 'U'}, {intent}, {status}, {cost})"
                lines.append(f"executed: {scenario}: {shown} -> {got}")
                if got != want:
                    problems.append(f"{scenario}: {shown} returned {got!r}; expected {want!r}")
            for intent in holds:
                count = conn.execute("SELECT count(*) FROM captures WHERE intent = %s", (intent,)).fetchone()[0]
                if count > 1:
                    problems.append(f"{scenario}: {count} captures of {intent}")
            if scenario == "late":
                recon = conn.execute("SELECT count(*) FROM reconciliations WHERE intent = 'i1'").fetchone()[0]
                lines.append(f"executed: late: reconciliations for i1 -> {recon}")
                if recon < 1:
                    problems.append("late: the late reply was rejected but not recorded in reconciliations")
        conn.close()
        ms = int(round((time.monotonic() - started) * 1000))
        pg.record(step="replies", input_text=schema + "\n" + handler, lines=lines, ms=ms, seed=ctx.seed, extension="sql")
    finally:
        PgSession.drop_db(admin, name)
    if problems:
        return _fail(f"{len(problems)} repl{'ies' if len(problems) != 1 else 'y'} handled against the specification", "implementation", *problems[:6])
    return CheckResult(True, f"{len(lines)} replies over {len(scenarios)} fresh sequences: at most one capture per intent; duplicate, late, over-cost, invalid and unknown-key replies rejected as specified; the late one reconciled; the re-run after a dropped COMMIT reports already applied", details=(f"PostgreSQL {pg.server_version}; seed {ctx.seed}",))


# ------------------------------------------------------------------------------------------ LAB-8.6
def _first_event(path: Path, event: str) -> int | None:
    for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        try:
            if json.loads(line).get("event") == event:
                return i
        except ValueError:
            return None
    return None


def c6(ctx: CheckContext) -> CheckResult:
    session = _ensure_tlc(ctx)
    _pin(ctx, SPEC, TRACE_MODULE, f"{CHALLENGE}/TraceValidation.tla", f"{CHALLENGE}/OutboxIface.tla", TRACE_CONSTANTS)
    _tlc_trusted(ctx)
    ctx.tcb(f"the trace mapping, {TRACE_MODULE}", "trusted")
    ctx.tcb("the simulated environment (labs/LAB-8/sim/src/world.rs) as the real one [A]", "trusted")
    built = build(ctx)
    if isinstance(built, CheckResult):
        return built
    seeds = _draw(ctx, TRACE_SEEDS)
    ctx.ext["sim"] = {"seeds": seeds, "seedListSha256": _seed_list(seeds), "rate": SIM_RATE, "steps": SIM_STEPS, "commands": SIM_COMMANDS}
    folder = ctx.workdir / "traces"
    folder.mkdir(parents=True, exist_ok=True)
    params = ["--rate", str(SIM_RATE), "--steps", str(SIM_STEPS), "--commands", str(SIM_COMMANDS)]
    broken: list[str] = []
    results = []
    for s in seeds:
        out = folder / f"seed-{s}.ndjson"
        _code, lines = sim(ctx, built, ["trace", "--seed", str(s), *params, "--out", out.relative_to(ctx.root).as_posix()], step=f"sim-{s}", seed=s)
        if not any(": ok" in line for line in lines):
            broken.extend(lines[:1])
            continue
        results.append(session.validate(ctx.path(SPEC), out, constants=ctx.path(TRACE_CONSTANTS), seed=s, step=f"trace-{s}"))
    if broken:
        return _fail(f"your machine breaks a property on {len(broken)} of {len(seeds)} seeds, so its traces are not the behavior to validate: pass LAB-8.4 first", "implementation", *broken[:3])
    mutant = folder / f"mutant-ack-before-store-seed-{seeds[0]}.ndjson"
    sim(ctx, built, ["trace", "--seed", str(seeds[0]), *params, "--mutant", "ack-before-store", "--out", mutant.relative_to(ctx.root).as_posix()], step="sim-mutant")
    m = session.validate(ctx.path(SPEC), mutant, constants=ctx.path(TRACE_CONSTANTS), step="trace-mutant")
    accepted = [r for r in results if r.verdict == "accepted"]
    errors = [r for r in results if r.verdict == "error"]
    if errors:
        return _fail(errors[0].line, "spec" if "error at line" not in errors[0].line else "implementation", f"{len(errors)} of {len(results)} traces could not be decided")
    if len(accepted) < len(results):
        bad = [r for r in results if r.verdict != "accepted"]
        return _fail(f"{len(bad)} of {len(results)} traces are not behaviors of your spec", "spec", *[r.line for r in bad[:3]], "the first unmatched line marks the drift: look at the disjunct for its event")
    if len(accepted) < TRACE_MIN:
        return _fail(f"only {len(accepted)} traces were accepted; the minimum is {TRACE_MIN}", "implementation")
    first_ack = _first_event(mutant, "Ack")
    if m.verdict != "rejected":
        return _fail(f"the ack-before-store mutant's trace is {m.verdict}, not rejected: {m.line}", "spec", "your Ack disjunct does not require a stored result, or a disjunct accepts more than its spec action")
    if first_ack is not None and m.first_unmatched != first_ack:
        return _fail(f"the mutant is rejected at line {m.first_unmatched}, not at its first Ack (line {first_ack})", "spec", m.line)
    ctx.claim("CL-8.3")
    return CheckResult(
        True,
        f"{len(accepted)} of {len(results)} traces accepted (n = {len(accepted)}, at least {TRACE_MIN}); the ack-before-store mutant is rejected at line {m.first_unmatched}, its first Ack",
        details=(m.line, f"seed list SHA-256 {ctx.ext['sim']['seedListSha256']}", "stamp: TESTED [T] · n seeds, composed with the spec's [M]"),
    )


# ------------------------------------------------------------------------------------------ LAB-8.7
def c7(ctx: CheckContext) -> CheckResult:
    built = build(ctx)
    if isinstance(built, CheckResult):
        return built
    seeds = _draw(ctx, SPECIMEN_SEEDS)
    params = ["--rate", str(SIM_RATE), "--steps", str(SIM_STEPS), "--commands", str(SIM_COMMANDS)]
    mount = "specimens/sim"
    ctx.path(mount).mkdir(parents=True, exist_ok=True)
    ctx.ext["sim"] = {"differentialSeeds": seeds, "faultSeeds": seeds, "seedListSha256": _seed_list(seeds), "rate": SIM_RATE, "steps": SIM_STEPS, "commands": SIM_COMMANDS, "planted": "fresh-key"}
    ctx.tcb("the specimen labels, generated from runs", "tested")
    _c, own = sim(ctx, built, ["suite", "--seeds", ",".join(map(str, seeds)), *params], step="suite-own")
    own_fail = [line for line in own if line.startswith("seed ") and ": FAIL " in line]
    _c2, planted = sim(ctx, built, ["suite", "--seeds", ",".join(map(str, seeds)), *params, "--mutant", "fresh-key", "--mount", mount], step="suite-planted")
    failing = [int(m.group(1)) for line in planted if (m := re.match(r"seed (\d+): FAIL ", line))]
    if own_fail:
        return _fail(f"your machine fails {len(own_fail)} of the {len(seeds)} seeds on its own; mount those first, then the planted failure", "implementation", *own_fail[:3])
    if not failing:
        return _fail(f"the planted failure (a fresh key per attempt) broke nothing on {len(seeds)} fault seeds", "implementation", "a fresh key matters only on a re-send: does your fault plan crash and fire timers?")
    unmounted = [s for s in failing if f"seed {s}: mounted {mount}/seed-{s}.json" not in planted]
    if unmounted:
        return _fail(f"{len(unmounted)} of {len(failing)} failing seeds were not mounted as specimens", "implementation", f"seeds: {', '.join(map(str, unmounted[:5]))}", "specimen.rs: mount returns a specimen for each failure")
    replayed: list[str] = []
    for s in failing[:REPLAY_MAX]:
        path = ctx.path(f"{mount}/seed-{s}.json")
        try:
            spec = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            return _fail(f"{mount}/seed-{s}.json cannot be read as JSON: {error}", "implementation")
        fail_line = next(line for line in planted if line.startswith(f"seed {s}: FAIL "))
        m = re.match(r"seed \d+: FAIL (\S+) at step (\d+) \(line (\d+)\)", fail_line)
        assert m is not None
        label_ok = spec.get("seed") == s and spec.get("violates") == m.group(1) and spec.get("step") == int(m.group(2)) and spec.get("mutant") == "fresh-key"
        if not label_ok:
            return _fail(f"{mount}/seed-{s}.json is not labeled from its run", "implementation", f"the run: {fail_line}", f"the specimen: seed {spec.get('seed')}, violates {spec.get('violates')}, step {spec.get('step')}, mutant {spec.get('mutant')}")
        out = ctx.workdir / f"replay-{s}.ndjson"
        _c3, again = sim(ctx, built, ["trace", "--seed", str(s), *params, "--mutant", "fresh-key", "--out", out.relative_to(ctx.root).as_posix()], step=f"replay-{s}", seed=s)
        m2 = next((re.match(r"seed \d+: FAIL (\S+) at step (\d+)", line) for line in again if ": FAIL " in line), None)
        if m2 is None or m2.group(1) != spec["violates"] or int(m2.group(2)) != spec["step"]:
            return _fail(f"replaying seed {s} does not break {spec['violates']} at step {spec['step']}", "implementation", *again[:1])
        if spec.get("trace_sha256") and _sha(out.read_bytes()) != spec["trace_sha256"]:
            return _fail(f"replaying seed {s} writes another trace than the one its specimen names", "implementation")
        replayed.append(f"seed {s}: {spec['violates']} at step {spec['step']}, replayed")
    return CheckResult(True, f"{len(failing)} of {len(seeds)} fault seeds fail under the planted failure; every one is mounted in {mount}/ and labeled from its run, and {len(replayed)} replay from their seeds", details=tuple(replayed))


# ------------------------------------------------------------------------------------------ LAB-8.8
CARDS = {
    "CL-8.1": ("claims/cl-8-1.yaml", r"NoLostIntent|lost"),
    "CL-8.2": ("claims/cl-8-2.yaml", r"NoDoubleCharge|double|at most once"),
    "CL-8.3": ("claims/cl-8-3.yaml", r"trace"),
    "CL-8.4": ("claims/cl-8-4.yaml", r"EventuallyAcked|acknowledged"),
    "CL-8.5": ("claims/cl-8-5.yaml", r"EventuallyDispatched|dispatched"),
}


def _horizon(text: str) -> list[str]:
    """What a horizon clause still lacks: the provider, API version, retention and the date read."""
    missing: list[str] = []
    if not re.search(r"\b(Stripe|provider)\b", text, re.I):
        missing.append("the provider")
    if not re.search(r"\bAPI\b[^.]*\bv?\d", text):
        missing.append("the API version")
    if not re.search(r"\b\d+\s*(hours?|days?|h\b|d\b)", text, re.I):
        missing.append("the retention")
    if not re.search(r"\b20\d\d-\d\d-\d\d\b", text):
        missing.append("the date read")
    return missing


def c8(ctx: CheckContext) -> CheckResult:
    import yaml

    from statespace.schema.validation import validate

    problems: list[str] = []
    for template, (path, topic) in CARDS.items():
        text = ctx.statement(path, "yaml")
        if "TODO(you)" in text:
            problems.append(f"{path}: still has TODO(you) in it")
            continue
        try:
            card = yaml.safe_load(text)
        except yaml.YAMLError as error:
            problems.append(f"{path}: not YAML ({str(error).splitlines()[0]})")
            continue
        issues = validate("claim", card)
        if issues:
            problems.append(f"{path}: claim@1 {issues[0]['instancePath'] or '/'} {issues[0]['message']}")
            continue
        if card.get("template") != template:
            problems.append(f"{path}: template is {card.get('template')!r}, not {template}")
        if not re.search(topic, str(card.get("proposition", "")), re.I):
            problems.append(f"{path}: the proposition does not state {template}'s property")
        weakened = card.get("if_weakened") or {}
        if "specimen" in weakened and not ctx.path(str(weakened["specimen"])).is_file():
            problems.append(f"{path}: the if-weakened specimen {weakened['specimen']} is not in your repository")
        if not str(weakened.get("text", "")).strip() and "specimen" not in weakened:
            problems.append(f"{path}: if_weakened names no witness")
        receipt = (card.get("method") or {}).get("receipt")
        if receipt and not ctx.path(str(receipt)).is_file():
            problems.append(f"{path}: method.receipt {receipt} is not in your repository")
        if template == "CL-8.2":
            texts = [str(a.get("text", "")) for a in card.get("assumptions", [])]
            if not any(re.search(r"idempoten|dedup", t, re.I) for t in texts):
                problems.append(f"{path}: no assumption states the provider's idempotency")
            assumptions = card.get("assumptions", [])
            horizon = [a for a in assumptions if a.get("seam") == "SEAM-12"] or [a for a in assumptions if re.search(r"horizon|prune", str(a.get("text", "")), re.I)]
            if not horizon:
                problems.append(f"{path}: no assumption states the provider's horizon")
            else:
                lacks = _horizon(str(horizon[0].get("text", "")))
                if lacks:
                    problems.append(f"{path}: the horizon clause does not name {', '.join(lacks)}")
        if not problems or not any(p.startswith(path) for p in problems):
            ctx.claim(template, id=str(card.get("id")))
    if problems:
        return _fail(f"{len(problems)} problem{'s' if len(problems) != 1 else ''} in the five claim cards", "spec", *problems[:8])
    return CheckResult(True, "CL-8.1 to CL-8.5 pass claim@1 validation; CL-8.2 states the provider's idempotency and its horizon (provider, API version, retention, date read)")


# ------------------------------------------------------------------------------------------ the lab
LAB = Lab(
    "LAB-8",
    "effects-sim",
    stages=(
        Stage("LAB-8.1", "Run the reference simulator on seed 1; see TLC accept its trace", (CheckSpec("LAB-8.c1", "The reference trace for seed 1 is accepted.", c1),)),
        Stage("LAB-8.2", "The outbox spec with crash, duplicate and delay actions; safety", (CheckSpec("LAB-8.c2", "The unsafe variant double-charges, and the full design passes all three invariants.", c2),), claims=("CL-8.1", "CL-8.2")),
        Stage("LAB-8.3", "Liveness under stated fairness and recovery", (CheckSpec("LAB-8.c3", "Both properties hold under the stated assumptions, and a lasso appears without recovery.", c3),), claims=("CL-8.4", "CL-8.5")),
        Stage("LAB-8.4", "A sans-I/O outbox machine under seeded faults", (CheckSpec("LAB-8.c4", "The machine keeps its safety properties on fresh fault schedules.", c4),)),
        Stage("LAB-8.5", "Inbound keys and reply validation", (CheckSpec("LAB-8.c5", "At most one capture per intent, and bad replies rejected.", c5),)),
        Stage("LAB-8.6", "NDJSON traces validated by TLC over n seeds", (CheckSpec("LAB-8.c6", "Traces over n seeds are accepted, and the mutant is rejected.", c6),), claims=("CL-8.3",)),
        Stage("LAB-8.7", "The differential and simulation suite; failures become specimens", (CheckSpec("LAB-8.c7", "Seeds are recorded, and every failure is mounted as a specimen.", c7),)),
        Stage("LAB-8.8", "Claim cards with the provider horizon", (CheckSpec("LAB-8.c8", "The five claim cards are complete, and the horizon is stated.", c8),), claims=("CL-8.1", "CL-8.2", "CL-8.3", "CL-8.4", "CL-8.5")),
        Stage("LAB-8.9", "[stretch] The key TTL and replayed 500s in the spec", ()),
    ),
)


# ------------------------------------------------------------------------------------------ Prove-it
PROVE_IT = (
    ("provider-ignores-keys", "LAB-8.2", "Make the provider ignore keys.", "In which windows does NoDoubleCharge fail?"),
    ("intent-after-commit", "LAB-8.2", "Write the intent after the commit instead of with it.", "Does NoLostIntent hold?"),
    ("no-crashes", "LAB-8.3", "Set MaxCrashes to 0.", "Does the liveness check pass, and what must its stamp say about crashes?"),
    ("no-provider-fairness", "LAB-8.3", "Remove the provider's fairness.", "Which of EventuallyDispatched and EventuallyAcked still holds?"),
    ("key-at-send", "LAB-8.4", "Mint the key at send time.", "On which seeds does the suite fail?"),
    ("resend-stored", "LAB-8.4", "Make restart re-send stored intents.", "Does the suite pass, and does LAB-8.6 accept the traces?"),
    ("key-row-after-capture", "LAB-8.5", "Write the key row in its own transaction after the capture.", "What does a re-delivery after a crash between the two commits do?"),
    ("unlogged-key", "LAB-8.6", "Drop the key from the Dispatch log lines.", "Is the fresh-key mutant accepted or rejected, and what flags it?"),
)


def _write_cfg(base: Path, target: Path, **changes: str) -> Path:
    text = base.read_text(encoding="utf-8")
    for name, value in changes.items():
        text, n = re.subn(rf"\b{name}\s*=\s*(\{{[^}}]*\}}|\"[^\"]*\"|\S+)", f"{name} = {value}", text)
        if n == 0:
            text = text.replace("CONSTANTS ", f"CONSTANTS {name} = {value}  ", 1)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    return target


def run_mutant(ctx: CheckContext, key: str) -> list[str]:
    """Seed one Prove-it mutation into a copy of the learner's artifact and let its checker grade it; the lines
    to print."""
    session = _ensure_tlc(ctx)
    work = ctx.workdir / key
    work.mkdir(parents=True, exist_ok=True)
    out: list[str] = []
    if key == "provider-ignores-keys":
        for w in ("CW1", "CW2", "CW3", "CW4"):
            cfg = _write_cfg(ctx.path(f"{CHALLENGE}/mc-full.cfg"), work / f"ignore-{w}.cfg", Dedup="FALSE", CrashWindows=f'{{"{w}"}}', Cmds='{"c1"}', Timeouts="FALSE")
            run = session.model_check(modules=_modules(ctx), module="OutboxProps", config=cfg, step=f"ignore-{w}", spec_for_hash=ctx.path(SPEC))
            out.append(f"{w}: TLC {run.verdict}{' (' + run.parsed['violated'] + ')' if run.parsed['violated'] else ''}, {run.parsed['distinct']} distinct states")
    elif key == "intent-after-commit":
        text = ctx.text(SPEC)
        mutated = re.sub(r"(Commit\(c\) ==.*?)/\\ status' = \[status EXCEPT !\[c\] = \"pending\"\]", r"\1/\\ UNCHANGED status", text, count=1, flags=re.S)
        mutated = mutated.replace("UNCHANGED <<durable, attempts, got, reqs, replies, charges, seen, up, crashes>>", "UNCHANGED <<durable, attempts, got, reqs, replies, charges, seen, up, crashes>>", 1)
        mutated = mutated.replace("Next == \\/ \\E c \\in Cmds : Commit(c)", "WriteIntent(c) == /\\ c \\in committed /\\ status[c] = \"none\" /\\ status' = [status EXCEPT ![c] = \"pending\"] /\\ UNCHANGED <<committed, durable, attempts, got, reqs, replies, charges, seen, up, crashes>>\n\nNext == \\/ \\E c \\in Cmds : Commit(c) \\/ WriteIntent(c)", 1)
        if mutated == text:
            raise InputRefused(f"{SPEC} has no Commit that sets the intent pending for this mutation to move")
        spec = work / "spec" / "Outbox.tla"
        spec.parent.mkdir(parents=True, exist_ok=True)
        spec.write_text(mutated, encoding="utf-8")
        modules = [p for p in _modules(ctx) if p.name != "Outbox.tla"] + [spec]
        run = session.model_check(modules=modules, module="OutboxProps", config=ctx.path(f"{CHALLENGE}/mc-full.cfg"), step="intent-after-commit-tlc", spec_for_hash=spec)
        out.append(f"TLC {run.verdict}{' (' + run.parsed['violated'] + ')' if run.parsed['violated'] else ''}, {run.parsed['distinct']} distinct states")
    elif key == "no-crashes":
        for prop in ("dispatched", "acked"):
            cfg = _write_cfg(ctx.path(f"{CHALLENGE}/live-all-{prop}.cfg"), work / f"live-all-{prop}.cfg", MaxCrashes="0")
            run = session.model_check(modules=_modules(ctx), module="OutboxProps", config=cfg, step=f"no-crashes-{prop}", spec_for_hash=ctx.path(SPEC))
            out.append(f"{prop}: TLC {run.verdict}{' (' + run.parsed['violated'] + ')' if run.parsed['violated'] else ''}; with MaxCrashes = 0 the stamp says crashes [N]")
    elif key == "no-provider-fairness":
        for prop in ("dispatched", "acked"):
            run = _model(ctx, f"live-no-provider-{prop}")
            out.append(f"{prop}: TLC {run.verdict}{' (' + run.parsed['violated'] + ')' if run.parsed['violated'] else ''}")
    elif key in ("key-at-send", "resend-stored", "unlogged-key"):
        built = build(ctx)
        if isinstance(built, CheckResult):
            return [f"not run: {built.message}"]
        seeds = _draw(ctx, 10)
        mutant = {"key-at-send": "fresh-key", "resend-stored": "resend-stored", "unlogged-key": "fresh-key"}[key]
        _c, lines = sim(ctx, built, ["suite", "--seeds", ",".join(map(str, seeds)), "--mutant", mutant], step=f"{key}-suite")
        out.extend(line for line in lines if ": FAIL" in line or line.startswith("suite:"))
        if key == "resend-stored":
            # the mutation acts only on a restart that finds a stored intent: one crash in CW4 forces it
            _c, windows = sim(ctx, built, ["systematic", "--mutant", mutant], step=f"{key}-systematic")
            out.extend(line for line in windows if line.startswith("suite:"))
            trace = work / "resend-stored-cw4.ndjson"
            sim(ctx, built, ["trace", "--seed", str(seeds[0]), "--crash-in", "CW4", "--mutant", mutant, "--out", trace.relative_to(ctx.root).as_posix()], step=f"{key}-trace")
            out.append(session.validate(ctx.path(SPEC), trace, constants=ctx.path(TRACE_CONSTANTS), step="resend-stored-cw4").line)
        if key == "unlogged-key":
            trace = work / f"fresh-key-{seeds[0]}.ndjson"
            sim(ctx, built, ["trace", "--seed", str(seeds[0]), "--mutant", mutant, "--out", trace.relative_to(ctx.root).as_posix()], step=f"{key}-trace")
            rows = [json.loads(line) for line in trace.read_text(encoding="utf-8").splitlines()]
            for row in rows:
                if row.get("event") == "Dispatch":
                    row.pop("key", None)
            unlogged = work / f"unlogged-{seeds[0]}.ndjson"
            unlogged.write_text("".join(json.dumps(r, separators=(",", ":")) + "\n" for r in rows), encoding="utf-8")
            keyed = session.validate(ctx.path(SPEC), trace, constants=ctx.path(TRACE_CONSTANTS), step="unlogged-keyed")
            out.append(f"with the key logged: {keyed.line}")
            from statespace.trace import lint

            checked = lint(unlogged.read_bytes())
            dropped = session.validate(ctx.path(SPEC), unlogged, constants=ctx.path(TRACE_CONSTANTS), step="unlogged-dropped", lint_first=False)
            out.append(f"with the key dropped, TLC alone: {dropped.line}")
            out.append(f"with the key dropped, the trace@1 lint: {checked.problems[0][1] if checked.problems else 'no problem'} (line {checked.problems[0][0] if checked.problems else '-'})")
    else:
        return ["not run yet: the mutation needs the LAB-8.5 replay of a crash between two commits; predict it, and check it on PostgreSQL by hand"]
    return out


def defend(root: Path) -> int:
    """`python -m statespace.labs.lab8 defend`: predictions first, then the checkers grade each mutant."""
    import secrets

    import yaml

    from statespace.check.context import CheckContext as Context

    ctx = Context(root=root, lab=LAB, stage=LAB.stage("LAB-8.2"), workdir=root / ".statespace" / "defend" / "LAB-8", seed=secrets.randbits(32))
    ctx.workdir.mkdir(parents=True, exist_ok=True)
    try:
        predictions = yaml.safe_load(ctx.text(PREDICTIONS)) or {}
    except (InputRefused, yaml.YAMLError) as error:
        sys.stderr.write(f"statespace defend: {error}\n")
        return 2
    missing = [key for key, *_ in PROVE_IT if not str(predictions.get(key) or "").strip()]
    if missing:
        sys.stderr.write(f"statespace defend: predict first, with your agent closed: {PREDICTIONS} has no prediction for {', '.join(missing)}\n")
        return 2
    for key, applied, operator, _question in PROVE_IT:
        sys.stdout.write(f"{key}  ({applied}) {operator}\n  you predicted: {str(predictions[key]).strip()}\n")
        try:
            for line in run_mutant(ctx, key):
                sys.stdout.write(f"  {line}\n")
        except (InputRefused, ToolUnavailable) as error:
            sys.stdout.write(f"  not run: {error}\n")
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args[:1] != ["defend"]:
        sys.stderr.write("usage: python -m statespace.labs.lab8 defend   (from your lab repository)\n")
        return 2
    from statespace.check.runner import find_root

    root = find_root(LAB.directory, Path.cwd())
    if root is None:
        sys.stderr.write(f"statespace defend: no {LAB.directory}/ here or above\n")
        return 2
    return defend(root)


if __name__ == "__main__":
    sys.exit(main())

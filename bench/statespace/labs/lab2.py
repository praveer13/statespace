"""LAB-2, the verified ledger (curriculum/S02-proof.md section 3; content/stages/S2/lab.yaml).

A pure two-account ledger in Lean 4.35.0, proved against a challenge pack the course pins: `challenge/Challenge.lean`
holds the definitions and the statements, `comparator.json` (whole lab) and `stages/LAB-2.<k>/comparator.json` (one
per stage) name the theorems and the permitted axioms. The learner's Lean project is the lab folder itself,
`labs/LAB-2/`, and the learner writes `Solution.lean`, the two specimen files and the cards' own fields.

Each proof stage runs the curriculum's pipeline (section 3, "Pipeline"): `lake build`, then `#print axioms` for the
stage's theorems, then `lake comparator` on the stage's configuration. LAB-2.7 runs `lake comparator --paranoid` on
the whole lab and then `lake check --paranoid` over the default targets. Every verdict is read from the tools'
verdict lines, never from an exit code (labs/README.md section 8):

- comparator accepts only when it prints "Your solution is okay!" and no `error:` line;
- `lake check` accepts only when Lean's default kernel accepts and no `error:` line follows (an axiom the policy
  rejects prints an `error:` line beside the kernel's acceptance [RUN-lean-axioms]);
- a line that starts `bwrap:` means the sandbox failed and nothing was judged, whatever else the run printed, and a
  checker killed for memory is no verdict either [RUN-bwrap-lanes]: both stop the stage with no receipt.

The sandbox is recorded, never required (labs/README.md section 4.4). It is on when bubblewrap starts; when it
cannot start, the stage writes no receipt and says why, and running without it is the learner's own recorded choice,
`STATESPACE_SANDBOX=off`, which every receipt then records as `sandbox: off` and passes to Lake as
`--inadvisably-no-sandbox`. Nothing here chooses it for them.

The frame has no Lean lane yet (bench/statespace/check/README.md section 1 names it for W2-T32 and W2-T33), so this
module carries a small session of its own: it records each run in the receipt with its argv, the SHA-256 of a list of
the files it read, its exit code and its verdict lines, and writes the receipt's `lean` section, `tools[]` and the
sandbox state. When the Lean lane lands, the session moves there.

Nothing runs at import time.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-2"
CHALLENGE = f"{LAB_DIR}/challenge/Challenge.lean"
# The published statement hash of the challenge, sha256(trimRight(Challenge.lean) + "\n"): the edition publishes it
# (labs/LAB-2/README.md), and a changed challenge voids every LAB-2 claim to [?] (I7).
CHALLENGE_SHA = "c46098c4ddd44e8040abbad342665424e76c6bacecaa9c6082c11e36cd0428d0"
# The published statement hashes of the comparator configurations: a configuration that names fewer theorems, or
# permits another axiom, judges something else.
CONFIG_SHA = {
    f"{LAB_DIR}/comparator.json": "9e86ad260d0a7acf061643c5d85830e3acc407a975067e5bb778a71a5630aa6a",
    f"{LAB_DIR}/stages/LAB-2.1/comparator.json": "26e6951e836b7a9bfcc434a26367c049e0f3df7acd5373219aa7510d0159b6cb",
    f"{LAB_DIR}/stages/LAB-2.2/comparator.json": "dfbd527fa887a6b0430e7d65266c916cf4eee32c21f9ea5a0e93c68f43e27174",
    f"{LAB_DIR}/stages/LAB-2.3/comparator.json": "e319687c5c5017a58fe30952be429f8b7ef3e24a74a3364da69e265e005ecf2c",
    f"{LAB_DIR}/stages/LAB-2.4/comparator.json": "56292fdc270d0414854bef7bfcb85a094388b1c1b1d16f8679a1953b967f3447",
    f"{LAB_DIR}/stages/LAB-2.5/comparator.json": "01cdfb95e4ea9823ca56b485c1bdbd2bc619fa37a136bbb1c130d5d3b22e0c5a",
    f"{LAB_DIR}/stages/LAB-2.6/comparator.json": "08e4f74428c422dbed02d2b447fe7bc537fb39dba04b227b34dc11f7b0ef37ef",
}
PERMITTED = ("propext", "Quot.sound", "Classical.choice")
REFERENCE_AXIOMS = ["propext", "Quot.sound"]  # transfer_conserves in the reference module [RUN-lean-ledger]
# Manual mode (curriculum/S02-proof.md section 1): the tactics the scan looks for in the taught theorem's proof.
AUTOMATION = ("grind", "omega", "lia", "simp_arith", "decide", "native_decide", "bv_decide", "try?")
PARANOID_CHECKERS = ("leanchecker-paranoid", "lean4lean", "nanoda_bin", "con-leche", "con-ron")
CALLS = f"{LAB_DIR}/calls/LAB-2.1.txt"
SANDBOX_CHOICE = "STATESPACE_SANDBOX"
TODO = "TODO(you)"

BUILD_S, COMPARATOR_S, CHECK_S = 900.0, 900.0, 1800.0  # wall-clock backstops [D]; lake check --paranoid is the slow one

# The claim cards of LAB-2.7 (curriculum section 5): template, the theorem(s) the card is about.
CARDS = {
    "CL-2.1": ("transfer_conserves",),
    "CL-2.2": ("transfer_nonneg",),
    "CL-2.3": ("transfer_rejected",),
    "CL-2.4": ("run_conserves",),
    "CL-2.5": ("xfer_frame", "xfer_pair", "xfer_self"),
}


# ----------------------------------------------------------------------------------------------- reading lines
_AXIOMS = re.compile(r"^'([^']+)' depends on axioms: \[(.*)\]$")
_NO_AXIOMS = re.compile(r"^'([^']+)' does not depend on any axioms$")
_KERNEL = re.compile(r"^(.+) kernel (accepts|rejected) the solution")
_SORRY = re.compile(r"^warning: (.+?):\d+:\d+: declaration uses `sorry`")


def _is_error(line: str) -> bool:
    return line.startswith("error") or bool(re.match(r"^\S+:\d+:\d+: error", line))


def _comparator_lines(output: str) -> list[str]:
    """The verdict lines of `lake comparator` and `lake check`: acceptance and rejection lines, errors, the sandbox's
    lines. `lake check`'s closing "Uses axioms: ..." line names the axioms of the whole environment, not of a theorem,
    so it stays in the run's output file beside the receipt; the receipt's `lean.theorems` list each theorem's own
    axioms, from `#print axioms`."""
    keep: list[str] = []
    for raw in output.splitlines():
        line = raw.rstrip()
        if (
            line.startswith(("bwrap:", "WARNING: Sandbox disabled", "Your solution is okay!"))
            or _is_error(line)
            or _KERNEL.match(line)
        ):
            keep.append(line)
    return keep


def _build_lines(output: str) -> list[str]:
    keep: list[str] = []
    for raw in output.splitlines():
        line = raw.rstrip()
        if line.startswith(("Build completed", "✖", "bwrap:")) or _is_error(line) or _SORRY.match(line):
            keep.append(line)
    return keep


def _axiom_lines(output: str) -> list[str]:
    return [line.rstrip() for line in output.splitlines() if _AXIOMS.match(line.rstrip()) or _NO_AXIOMS.match(line.rstrip()) or _is_error(line.rstrip()) or ": error" in line]


# --------------------------------------------------------------------------------------------- the Lean session
@dataclass
class LeanRun:
    step: str
    exit_code: int | None
    lines: list[str]
    verdict: str
    output: str


@dataclass
class LeanSession:
    """The stage's Lean tools: every run it makes is recorded in the receipt, in order."""

    ctx: CheckContext
    SECTION: str = "lean"
    sandbox: tuple[str, ...] = ("off",)
    lean_version: str = ""
    lake_version: str = ""
    prefix: Path | None = None
    lake: str = "lake"
    paranoid: bool = False
    theorems: dict[str, list[str]] = field(default_factory=dict[str, list[str]])
    checkers: dict[str, str] = field(default_factory=dict[str, str])
    sorry_count: int = 0
    automation: dict[str, bool] = field(default_factory=dict[str, bool])
    permitted: list[str] = field(default_factory=list[str])
    steps: dict[str, int] = field(default_factory=dict[str, int])

    # -- start
    def start(self) -> None:
        from statespace.check import proc

        lake = shutil.which("lake")
        lean = shutil.which("lean")
        if lake is None or lean is None:
            raise ToolUnavailable(
                "Lean is not on PATH here, so nothing was judged: open the lab repository in the devcontainer (labs/README.md "
                "section 4.2), or install the pinned toolchain with elan (labs/TOOLS.md section 2.2); `statespace doctor` shows what is missing"
            )
        self.lake = lake
        lab = self.ctx.lab_dir
        done = proc.run([lean, "--version"], cwd=lab, timeout_s=600)
        self.lean_version = next((line.strip() for line in done.output.splitlines() if line.startswith("Lean (version")), "")
        if not self.lean_version:
            raise ToolUnavailable(f"`lean --version` printed no version line in {LAB_DIR} (exit {done.returncode}): {done.output.strip()[-300:]}")
        done = proc.run([lake, "--version"], cwd=lab, timeout_s=120)
        self.lake_version = next((line.strip() for line in done.output.splitlines() if line.startswith("Lake version")), "") or "unknown"
        done = proc.run([lean, "--print-prefix"], cwd=lab, timeout_s=120)
        prefix = done.output.strip().splitlines()[-1].strip() if done.output.strip() else ""
        self.prefix = Path(prefix) if prefix and Path(prefix, "bin").is_dir() else None
        self.sandbox = self._sandbox()

    def _sandbox(self) -> tuple[str, ...]:
        choice = (os.environ.get(SANDBOX_CHOICE) or "").strip().lower()
        if choice == "off":
            return ("off",)
        from statespace import doctor

        probe = doctor.probe_sandbox("auto")
        if probe.state == "on":
            return ("on",)
        hint = f" ({probe.meaning}; to change it: {probe.change})" if probe.meaning else ""
        raise ToolUnavailable(
            f"Lean's sandbox could not start, so nothing was judged: {probe.detail}{hint}. Running without it is your decision, made "
            f"once and recorded: run `{SANDBOX_CHOICE}=off uv run statespace check ...` and every receipt says sandbox: off "
            "(labs/README.md section 4.4). Your agent never makes that choice"
        )

    @property
    def no_sandbox(self) -> list[str]:
        return ["--inadvisably-no-sandbox"] if self.sandbox[0] == "off" else []

    # -- runs
    def _step(self, name: str) -> str:
        n = self.steps.get(name, 0) + 1
        self.steps[name] = n
        return name if n == 1 else f"{name}-{n}"

    def _inputs(self, step: str, files: list[str]) -> str:
        """A list of the files a run read, with the SHA-256 of each, written beside the receipt; its own hash is the
        run's inputSha256."""
        lines = []
        for rel in files:
            path = self.ctx.path(rel)
            digest = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else "missing"
            lines.append(f"{digest}  {rel}")
        data = ("\n".join(lines) + "\n").encode("utf-8")
        self.ctx.workdir.mkdir(parents=True, exist_ok=True)
        (self.ctx.workdir / f"{step}.inputs").write_bytes(data)
        return hashlib.sha256(data).hexdigest()

    def run(self, name: str, argv: list[str], *, engine: str, files: list[str], timeout: float, read: Any, judge: Any, named: bool = False) -> LeanRun:
        from statespace.check import proc

        step = name if named else self._step(name)
        input_sha = self._inputs(step, files)
        executable = [self.lake if argv[0] == "lake" else argv[0], *argv[1:]]
        done = proc.run(executable, cwd=self.ctx.lab_dir, timeout_s=timeout)
        (self.ctx.workdir / f"{step}.out").write_text(done.output, encoding="utf-8")
        if done.returncode is None:
            raise ToolUnavailable(f"{' '.join(argv)} did not start ({done.error}), so nothing was judged")
        bwrap = next((line for line in done.output.splitlines() if line.startswith("bwrap:")), None)
        if bwrap is not None:
            raise ToolUnavailable(f"the sandbox failed during `{' '.join(argv)}`, so nothing was judged, whatever later lines say: {bwrap}")
        if done.timed_out or done.returncode in (137, 143, -9, -15):
            raise ToolUnavailable(
                f"`{' '.join(argv)}` was stopped (exit {done.returncode}{', after the wall-clock backstop' if done.timed_out else ''}), "
                "which is not a verdict: a checker killed for memory or time judged nothing"
            )
        lines = read(done.output)
        verdict = judge(lines)
        if not lines:
            lines = [f"statespace: {argv[0]} printed no verdict line (exit {done.returncode})"]
            verdict = "error"
        self.ctx.runs.append(
            {
                "step": step,
                "engine": engine,
                "version": self.lean_version if engine == "lean" else self.lake_version,
                "argv": argv,
                "inputSha256": input_sha,
                "budget": {},
                "exitCode": done.returncode,
                "verdictLines": lines,
                "verdict": verdict,
                "ms": done.ms,
            }
        )
        return LeanRun(step, done.returncode, lines, verdict, done.output)

    def build(self, targets: list[str], files: list[str]) -> LeanRun:
        run = self.run(
            "build", ["lake", "build", *targets], engine="lake", files=files, timeout=BUILD_S, read=_build_lines,
            judge=lambda lines: "failed" if any(_is_error(l) or l.startswith("✖") for l in lines) or not any(l.startswith("Build completed") for l in lines) else "passed",
        )
        self.sorry_count += sum(1 for line in run.lines if (m := _SORRY.match(line)) and not m.group(1).startswith("challenge/"))
        return run

    def axioms(self, module: str, theorems: list[str], files: list[str], extra: str = "") -> tuple[LeanRun, dict[str, list[str] | None]]:
        step = self._step("axioms")
        source = f"import {module}\n" + "".join(f"#print axioms {name}\n" for name in theorems) + extra
        self.ctx.workdir.mkdir(parents=True, exist_ok=True)
        path = self.ctx.workdir / f"{step}.lean"
        path.write_text(source, encoding="utf-8")
        rel = os.path.relpath(path, self.ctx.lab_dir)
        found: dict[str, list[str] | None] = {name: None for name in theorems}

        def judge(lines: list[str]) -> str:
            return "failed" if any(_is_error(l) or ": error" in l for l in lines) else "passed"

        run = self.run(step, ["lake", "env", "lean", rel], engine="lean", files=[*files, path.relative_to(self.ctx.root).as_posix()], timeout=BUILD_S, read=_axiom_lines, judge=judge, named=True)
        for line in run.lines:
            if m := _AXIOMS.match(line):
                found[m.group(1)] = [a.strip() for a in m.group(2).split(",") if a.strip()]
            elif m := _NO_AXIOMS.match(line):
                found[m.group(1)] = []
        for name, axioms in found.items():
            if axioms is not None:
                self.theorems[name] = axioms
        return run, found

    def comparator(self, config: str, *, paranoid: bool, files: list[str]) -> LeanRun:
        rel = os.path.relpath(self.ctx.path(config), self.ctx.lab_dir)
        argv = ["lake", "comparator", "--config", rel, *(["--paranoid"] if paranoid else []), *self.no_sandbox]
        run = self.run("comparator", argv, engine="lake", files=[*files, config], timeout=COMPARATOR_S, read=_comparator_lines, judge=_judge_accept)
        self._read_checkers(run.lines)
        self.paranoid = self.paranoid or paranoid
        return run

    def check(self, *, paranoid: bool, files: list[str]) -> LeanRun:
        argv = ["lake", "check", *(["--paranoid"] if paranoid else []), *self.no_sandbox]
        run = self.run("check", argv, engine="lake", files=files, timeout=CHECK_S, read=_comparator_lines, judge=_judge_check)
        self._read_checkers(run.lines)
        self.paranoid = self.paranoid or paranoid
        return run

    def _read_checkers(self, lines: list[str]) -> None:
        for line in lines:
            if m := _KERNEL.match(line):
                verdict = "accepts" if m.group(2) == "accepts" else "rejects"
                if self.checkers.get(m.group(1)) != "rejects":
                    self.checkers[m.group(1)] = verdict

    # -- the receipt's parts, read by the runner
    def receipt_tools(self) -> list[dict[str, Any]]:
        from statespace import doctor

        out: list[dict[str, Any]] = []
        names = ["lean", "lake", *(PARANOID_CHECKERS if self.paranoid else ())]
        for name in names:
            path = (self.prefix / "bin" / name) if self.prefix is not None else (Path(self.lake) if name == "lake" else None)
            if path is None or not path.is_file():
                continue
            sha = doctor.sha256_file(path)
            version = {"lean": self.lean_version, "lake": self.lake_version}.get(name) or f"bundled with {self.lean_version}"
            entry: dict[str, Any] = {"name": name, "version": version, "sha256": sha}
            pin = doctor.PINS.get(name)
            if pin is not None and pin.sha256 is not None:
                entry["pinned"] = sha == pin.sha256
            out.append(entry)
        return out

    def receipt_section(self) -> dict[str, Any] | None:
        if not self.lean_version:
            return None
        lab = self.ctx.lab_dir
        toolchain = (lab / "lean-toolchain").read_text(encoding="utf-8").strip() if (lab / "lean-toolchain").is_file() else "unknown"
        section: dict[str, Any] = {
            "toolchain": toolchain or "unknown",
            "challengeSha": _statement_sha(self.ctx.path(CHALLENGE)) if self.ctx.path(CHALLENGE).is_file() else CHALLENGE_SHA,
            "permittedAxioms": self.permitted or list(PERMITTED),
            "checkers": [{"name": name, "version": self.lean_version, "verdict": verdict} for name, verdict in self.checkers.items()],
            "theorems": [{"name": name, "axioms": axioms} for name, axioms in self.theorems.items()],
            "nativeAxioms": sorted({a for axioms in self.theorems.values() for a in axioms if "_native" in a}),
            "sorryCount": self.sorry_count,
            "statementCheck": "comparator",
        }
        if self.automation:
            section["automation"] = {k: v for k, v in self.automation.items() if k in ("manualMode", "grind", "omega", "decide")}
        return section


def _judge_accept(lines: list[str]) -> str:
    ok = "Your solution is okay!" in lines and not any(_is_error(l) for l in lines)
    return "accepted" if ok else "rejected"


def _judge_check(lines: list[str]) -> str:
    ok = any(l.startswith("Lean default kernel accepts the solution") for l in lines) and not any(_is_error(l) or "rejected the solution" in l for l in lines)
    return "accepted" if ok else "rejected"


def _statement_sha(path: Path) -> str:
    from statespace.schema.statement_hash import statement_hash_file

    return statement_hash_file(path)


def _session(ctx: CheckContext) -> LeanSession:
    """The stage's Lean session, started once. The frame's sessions() lists only the Z3 lane, so the session joins it
    here; the runner then reads its tools, its `lean` section and its sandbox state like any lane's."""
    session = getattr(ctx, "_lab2_session", None)
    if session is None:
        session = LeanSession(ctx)
        session.start()
        setattr(ctx, "_lab2_session", session)
        base = ctx.sessions
        setattr(ctx, "sessions", lambda: [*base(), session])
        _trusted_base(ctx, session)
    return session


def _trusted_base(ctx: CheckContext, session: LeanSession) -> None:
    ctx.tcb(f"the Lean kernel: {session.lean_version}", "trusted")
    ctx.tcb("leanexport and lake comparator's plumbing", "trusted")
    ctx.tcb(f"the pinned statement {CHALLENGE}", "trusted")
    if session.sandbox[0] == "on":
        ctx.tcb("the sandbox (bubblewrap) around the build and the checkers", "trusted")
    else:
        ctx.tcb("no sandbox: your project's code ran unconfined while it built (sandbox off, your recorded choice)", "trusted")
    ctx.tcb("your machine", "trusted")


# -------------------------------------------------------------------------------------------------- the pins
def _pin_challenge(ctx: CheckContext) -> CheckResult | None:
    ctx.statement(CHALLENGE, "lean-challenge")
    found = _statement_sha(ctx.path(CHALLENGE))
    if found != CHALLENGE_SHA:
        return CheckResult(
            False,
            f"challenge/Challenge.lean is not the published challenge: its statement hash is {found[:16]}..., the course published {CHALLENGE_SHA[:16]}...",
            "spec",
            ("a changed challenge judges another statement; restore the file from the lab zip (it is read-only, and every LAB-2 claim voids to [?] while it differs)",),
        )
    return None


def _pin_config(ctx: CheckContext, config: str) -> CheckResult | None:
    if not ctx.path(config).is_file():
        raise InputRefused(f"{config} is not in your lab repository: restore it from the lab zip")
    found = _statement_sha(ctx.path(config))
    ctx.ext.setdefault("lab2", {}).setdefault("comparatorConfigs", []).append({"path": config, "sha256": found, "published": found == CONFIG_SHA.get(config)})
    if found != CONFIG_SHA.get(config):
        return CheckResult(
            False,
            f"{config} is not the published configuration (statement hash {found[:16]}...)",
            "spec",
            ("a configuration that names fewer theorems or permits another axiom judges something else; restore it from the lab zip",),
        )
    return None


def _project_files(*extra: str) -> list[str]:
    return [f"{LAB_DIR}/lakefile.toml", f"{LAB_DIR}/lean-toolchain", f"{LAB_DIR}/lake-manifest.json", CHALLENGE, *(f"{LAB_DIR}/{e}" for e in extra)]


# ---------------------------------------------------------------------------------------------- reading Lean
def _strip_comments(text: str) -> str:
    out, i, depth = [], 0, 0
    while i < len(text):
        if text.startswith("/-", i):
            depth += 1
            i += 2
        elif depth and text.startswith("-/", i):
            depth -= 1
            i += 2
        elif depth:
            out.append("\n" if text[i] == "\n" else " ")
            i += 1
        elif text.startswith("--", i):
            j = text.find("\n", i)
            i = len(text) if j < 0 else j
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


def theorem_source(text: str, name: str) -> str | None:
    """The source of a top-level theorem, comments removed: its line and every following line up to the next one that
    starts in the first column."""
    lines = _strip_comments(text).split("\n")
    for i, line in enumerate(lines):
        if re.match(rf"^(?:@\[[^\]]*\]\s*)?(?:private\s+|protected\s+)?(?:theorem|lemma)\s+{re.escape(name)}(?![\w'.!?])", line):
            body = [line]
            for later in lines[i + 1 :]:
                if later and not later[0].isspace():
                    break
                body.append(later)
            return "\n".join(body)
    return None


def automation_in(source: str) -> list[str]:
    """The automation tactics a proof's source names (manual mode), in the order AUTOMATION lists them."""
    found = []
    for tactic in AUTOMATION:
        if tactic == "try?":
            hit = re.search(r"(?<![\w.'])try\?", source)
        else:
            hit = re.search(rf"(?<![\w.']){re.escape(tactic)}(?![\w'?!])", source)
        if hit:
            found.append(tactic)
    if "simp_arith" not in found and re.search(r"\bsimp\w*\s*\+arith\b", source):
        found.append("simp_arith")
    return found


# ------------------------------------------------------------------------------------------- the proof stages
def _why_rejected(comparator: LeanRun, axioms: dict[str, list[str] | None], theorems: list[str]) -> CheckResult:
    errors = [line for line in comparator.lines if _is_error(line)]
    shown = tuple(f"comparator: {line}" for line in errors[:4]) or tuple(f"comparator: {line}" for line in comparator.lines[-2:])
    sorry = [name for name in theorems if "sorryAx" in (axioms.get(name) or [])]
    missing = [name for name in theorems if axioms.get(name) is None]
    if missing:
        return CheckResult(False, f"{', '.join(missing)} is not in your solution, or does not elaborate", "proof", shown)
    if any("statement do not match" in line for line in errors):
        return CheckResult(False, "comparator: your theorem does not state the challenge's statement; prove the pinned statement as written", "spec", shown)
    if any("Const does not match" in line for line in errors):
        return CheckResult(False, "comparator: a definition in your solution is not the challenge's; restore the definitions and prove the statement about them", "spec", shown)
    if sorry:
        return CheckResult(False, f"{', '.join(sorry)} still closes with sorry: #print axioms lists sorryAx, which comparator rejects", "proof", shown)
    if any("Illegal axiom" in line or "not permitted" in line for line in errors):
        return CheckResult(False, "comparator: the proof uses an axiom outside the permitted list in comparator.json", "proof", shown)
    return CheckResult(False, "comparator did not print its acceptance line", "proof", shown)


def proof_stage(ctx: CheckContext, stage: str, theorems: list[str], *, manual: bool, claim: str) -> CheckResult:
    session = _session(ctx)
    config = f"{LAB_DIR}/stages/{stage}/comparator.json"
    for pin in (_pin_challenge(ctx), _pin_config(ctx, config)):
        if pin is not None:
            return pin
    session.permitted = list(PERMITTED)
    files = _project_files("Solution.lean")
    build = session.build(["Solution"], files)
    if build.verdict != "passed":
        errors = [line for line in build.lines if _is_error(line)][:4]
        return CheckResult(False, "Solution.lean does not build", "proof", tuple(errors) or tuple(build.lines[-2:]))
    _, axioms = session.axioms("Solution", theorems, files)
    comparator = session.comparator(config, paranoid=False, files=files)
    found_automation: dict[str, list[str]] = {}
    if manual:
        text = ctx.text(f"{LAB_DIR}/Solution.lean")
        for name in theorems:
            source = theorem_source(text, name) or ""
            found_automation[name] = automation_in(source)
        flat = sorted({t for ts in found_automation.values() for t in ts})
        session.automation = {"manualMode": True, "grind": "grind" in flat, "omega": "omega" in flat, "decide": "decide" in flat}
        ctx.ext.setdefault("lab2", {})["automationScan"] = {"theorems": theorems, "tactics": list(AUTOMATION), "found": flat}
    if comparator.verdict != "accepted":
        return _why_rejected(comparator, axioms, theorems)
    outside = {name: [a for a in (axioms.get(name) or []) if a not in PERMITTED] for name in theorems}
    if any(outside.values()):
        return CheckResult(False, "an axiom outside comparator.json's permitted list: " + "; ".join(f"{n}: {', '.join(a)}" for n, a in outside.items() if a), "proof")
    listed = "; ".join(f"{name}: [{', '.join(axioms.get(name) or [])}]" for name in theorems)
    if manual:
        hits = {name: ts for name, ts in found_automation.items() if ts}
        if hits:
            return CheckResult(
                False,
                "comparator accepts, and the manual-mode scan found automation in the taught proof: " + "; ".join(f"{n} uses {', '.join(ts)}" for n, ts in hits.items()),
                "proof",
                ("manual mode asks for this step by hand; rewrite the arithmetic with lemmas you name, then check again", f"axioms: {listed}"),
            )
    ctx.claim(claim)
    note = "; manual-mode scan: no automation" if manual else ""
    return CheckResult(True, f"comparator accepts {', '.join(theorems)} against the pinned statement (Lean default kernel){note}", None, (f"axioms: {listed}",))


# ------------------------------------------------------------------------------------------------- LAB-2.1
def _read_calls(ctx: CheckContext) -> list[str] | None:
    text = ctx.text(CALLS)
    answers = []
    for line in text.splitlines():
        if m := re.match(r"^\s*([123])\.\s.*\?\s*(.*)$", line):
            answers.append(m.group(2).strip())
    if len(answers) != 3 or any(not a or TODO in a for a in answers):
        return None
    return answers


def c1(ctx: CheckContext) -> CheckResult:
    calls = _read_calls(ctx)
    if calls is None:
        return CheckResult(
            False,
            f"make your three calls first, in {CALLS}: any axioms? which? what does this check return? Then run it again",
            "spec",
            ("nothing grades the calls; the check prints them beside what the receipt shows, so you can compare",),
        )
    session = _session(ctx)
    config = f"{LAB_DIR}/stages/LAB-2.1/comparator.json"
    for pin in (_pin_challenge(ctx), _pin_config(ctx, config)):
        if pin is not None:
            return pin
    session.permitted = list(PERMITTED)
    files = _project_files("Reference.lean")
    build = session.build(["Reference"], files)
    if build.verdict != "passed":
        return CheckResult(False, "the reference module does not build: restore Reference.lean from the lab zip", "tool", tuple(build.lines[-3:]))
    _, axioms = session.axioms("Reference", ["transfer_conserves"], files)
    comparator = session.comparator(config, paranoid=False, files=files)
    listed = axioms.get("transfer_conserves")
    shown = (
        f"you called: any axioms: {calls[0]}; which: {calls[1]}; the check returns: {calls[2]}",
        f"the receipt shows: transfer_conserves depends on [{', '.join(listed or [])}]; comparator: {' / '.join(l for l in comparator.lines if not l.startswith('WARNING')) or 'nothing'}",
    )
    kernel = any(line.startswith("Lean default kernel accepts the solution") for line in comparator.lines)
    if comparator.verdict != "accepted" or not kernel:
        return CheckResult(False, "comparator did not accept the reference module: read its verdict lines in the receipt", "tool", shown)
    if listed != REFERENCE_AXIOMS:
        return CheckResult(False, f"transfer_conserves lists [{', '.join(listed or [])}], not [propext, Quot.sound]: Reference.lean is not the shipped one", "tool", shown)
    return CheckResult(
        True,
        "comparator printed \"Your solution is okay!\" and \"Lean default kernel accepts the solution\"; transfer_conserves depends on [propext, Quot.sound]; the challenge hash is the published one",
        None,
        (*shown, "this check passes with exit status 0; the reference earns nothing"),
    )


def c2(ctx: CheckContext) -> CheckResult:
    return proof_stage(ctx, "LAB-2.2", ["transfer_conserves"], manual=True, claim="CL-2.1")


def c3(ctx: CheckContext) -> CheckResult:
    return proof_stage(ctx, "LAB-2.3", ["transfer_rejected"], manual=True, claim="CL-2.3")


def c4(ctx: CheckContext) -> CheckResult:
    return proof_stage(ctx, "LAB-2.4", ["transfer_nonneg"], manual=True, claim="CL-2.2")


def c5(ctx: CheckContext) -> CheckResult:
    return proof_stage(ctx, "LAB-2.5", ["run_conserves"], manual=False, claim="CL-2.4")


# ------------------------------------------------------------------------------------------------- LAB-2.6
SPECIMENS = (
    # module, file, theorem, the statement it must have, what it shows
    ("Broken", "broken/Broken.lean", "selftransfer_mints", "xferBuggy (fun _ => 10) 0 0 5 0 = 15", "the buggy self-transfer turns 10 into 15"),
    ("Fixed", "fixed/Fixed.lean", "selftransfer_fixed", "xfer (fun _ => 10) 0 0 5 0 = 10", "the fixed self-transfer keeps 10"),
)


def c6(ctx: CheckContext) -> CheckResult:
    result = proof_stage(ctx, "LAB-2.6", ["xfer_frame", "xfer_pair", "xfer_self"], manual=False, claim="CL-2.5")
    session = _session(ctx)
    files = _project_files("Solution.lean", "broken/Broken.lean", "fixed/Fixed.lean")
    build = session.build(["Broken", "Fixed"], files)
    problems: list[str] = []
    if build.verdict != "passed":
        problems.append("broken/Broken.lean or fixed/Fixed.lean does not build: " + "; ".join([l for l in build.lines if _is_error(l)][:2]))
    else:
        for module, rel, name, statement, shows in SPECIMENS:
            check = f"example : {statement} := {name}\n"
            run, axioms = session.axioms(module, [name], files, extra=check)
            listed = axioms.get(name)
            source = theorem_source(ctx.text(f"{LAB_DIR}/{rel}"), name)
            if listed is None or source is None:
                problems.append(f"{rel}: no theorem {name} ({shows}); state it and close it by decide")
                continue
            if run.verdict != "passed":
                problems.append(f"{rel}: {name} does not state {statement}")
                continue
            if "decide" not in automation_in(source) or "native_decide" in automation_in(source):
                problems.append(f"{rel}: {name} must close by decide (and not native_decide)")
            bad = [a for a in listed if a not in PERMITTED or "_native" in a]
            if bad:
                problems.append(f"{rel}: {name} depends on {', '.join(bad)}")
    if not result.passed:
        return CheckResult(False, result.message, result.suspect, (*result.details, *problems))
    if problems:
        ctx.ext.setdefault("lab2", {})["specimens"] = "failed"
        return CheckResult(False, f"the three theorems are accepted; the specimens are not: {problems[0]}", "proof", tuple(problems[1:]) + result.details)
    return CheckResult(True, f"{result.message}; both specimens build and close by decide, with no sorryAx, _native or custom axiom", None, result.details)


# ------------------------------------------------------------------------------------------------- LAB-2.7
def _card_problems(ctx: CheckContext, template: str, theorems: tuple[str, ...], lean_version: str) -> tuple[str | None, list[str]]:
    import yaml

    from statespace.schema.validation import validate

    rel = f"claims/{template}.yaml"
    if not ctx.path(rel).is_file():
        return None, [f"{rel} is missing: restore the card from the lab zip and write its fields"]
    text = ctx.statement(rel, "yaml")
    if TODO in text:
        return None, [f"{rel}: write the fields still marked TODO(you) (the proposition in your words, the \"if weakened\" witness, the requirement row)"]
    try:
        card = yaml.safe_load(text)
    except yaml.YAMLError as error:
        return None, [f"{rel} is not YAML: {str(error).splitlines()[0]}"]
    problems = [f"{rel}{issue['instancePath'] or ''}: {issue['message']}" for issue in validate("claim", card)]
    if problems:
        return None, problems[:3]
    card_id = str(card.get("id"))
    if card.get("template") != template:
        problems.append(f"{rel}: template is {card.get('template')!r}, not {template}")
    statement = card.get("statement") or {}
    if statement.get("path") != CHALLENGE:
        problems.append(f"{rel}: statement.path is {statement.get('path')!r}, not {CHALLENGE}")
    named = [t.strip() for t in str(statement.get("theorem", "")).replace("∧", ",").split(",") if t.strip()]
    if sorted(named) != sorted(theorems):
        problems.append(f"{rel}: statement.theorem names {', '.join(named) or 'nothing'}, not {', '.join(theorems)}")
    method = card.get("method") or {}
    version = str(method.get("version", ""))
    if method.get("tool") != "lean" or not version or f"version {version}" not in lean_version:
        problems.append(f"{rel}: method is tool {method.get('tool')!r}, version {version!r}; this receipt's Lean is {lean_version}")
    requirement = (card.get("requirement") or {}).get("text", "")
    if "[P]" in requirement:
        problems.append(f"{rel}: the requirement row reads [P]; requirement fit is never [P], since no checker reads a requirement")
    weakened = card.get("if_weakened") or {}
    if not (weakened.get("text") or weakened.get("specimen")):
        problems.append(f"{rel}: if_weakened names no witness")
    return card_id, problems


def c7(ctx: CheckContext) -> CheckResult:
    session = _session(ctx)
    for pin in (_pin_challenge(ctx), _pin_config(ctx, f"{LAB_DIR}/comparator.json")):
        if pin is not None:
            return pin
    session.permitted = list(PERMITTED)
    ids: dict[str, str] = {}
    problems: list[str] = []
    for template, theorems in CARDS.items():
        card_id, found = _card_problems(ctx, template, theorems, session.lean_version)
        problems.extend(found)
        if card_id is not None and not found:
            ids[template] = card_id
    if problems:
        return CheckResult(False, f"{len(CARDS) - len(ids)} of {len(CARDS)} claim cards do not pass claim@1 validation yet: {problems[0]}", "spec", tuple(problems[1:6]))
    files = _project_files("Solution.lean", "broken/Broken.lean", "fixed/Fixed.lean")
    build = session.build([], files)
    if build.verdict != "passed":
        return CheckResult(False, "the default targets (Solution, Broken, Fixed) do not build", "proof", tuple(l for l in build.lines if _is_error(l))[:4])
    names = [t for ts in CARDS.values() for t in ts]
    _, axioms = session.axioms("Solution", names, files)
    comparator = session.comparator(f"{LAB_DIR}/comparator.json", paranoid=True, files=files)
    if comparator.verdict != "accepted":
        result = _why_rejected(comparator, axioms, names)
        return CheckResult(False, f"whole-lab comparator --paranoid: {result.message}", result.suspect, result.details)
    check = session.check(paranoid=True, files=files)
    if check.verdict != "accepted":
        return CheckResult(False, "lake check --paranoid did not accept the whole environment", "proof", tuple(l for l in check.lines if _is_error(l) or "rejected" in l)[:4])
    if session.sorry_count:
        return CheckResult(False, f"the default targets still hold {session.sorry_count} declaration{'s' if session.sorry_count != 1 else ''} with sorry", "proof")
    for template, card_id in ids.items():
        ctx.claim(template, id=card_id)
    accepted = sorted(name for name, verdict in session.checkers.items() if verdict == "accepts")
    return CheckResult(
        True,
        f"lake comparator --paranoid and lake check --paranoid accept; {len(accepted)} checkers accept ({', '.join(accepted)}); the five cards pass claim@1 validation",
        None,
        ("the \"if weakened\" witnesses are yours: the tab replays them when you import the bundle; this check reads that each card names one",),
    )


LAB = Lab(
    "LAB-2",
    "The verified ledger",
    stages=(
        Stage("LAB-2.1", "Run the reference proof and read the receipt", (CheckSpec("LAB-2.c1", "The receipt shows acceptance and the axiom list", c1),)),
        Stage("LAB-2.2", "Prove transfer_conserves in manual mode", (CheckSpec("LAB-2.c2", "Comparator accepts a manual proof", c2),), claims=("CL-2.1",)),
        Stage("LAB-2.3", "Prove transfer_rejected in manual mode", (CheckSpec("LAB-2.c3", "Comparator accepts a manual proof", c3),), claims=("CL-2.3",)),
        Stage("LAB-2.4", "Prove transfer_nonneg in manual mode", (CheckSpec("LAB-2.c4", "Comparator accepts a manual proof", c4),), claims=("CL-2.2",)),
        Stage("LAB-2.5", "Prove run_conserves, generalizing first", (CheckSpec("LAB-2.c5", "Comparator accepts the sequence theorem", c5),), claims=("CL-2.4",)),
        Stage("LAB-2.6", "Many accounts, and the self-transfer specimen", (CheckSpec("LAB-2.c6", "The three theorems are accepted and both specimens build", c6),), claims=("CL-2.5",)),
        Stage(
            "LAB-2.7",
            "Read your receipt, then write the claim cards",
            (CheckSpec("LAB-2.c7", "The whole lab is accepted and every card passes validation", c7),),
            claims=("CL-2.1", "CL-2.2", "CL-2.3", "CL-2.4", "CL-2.5"),
        ),
        Stage("LAB-2.8", "Optional: the transfer as zero-sum postings", ()),
    ),
)

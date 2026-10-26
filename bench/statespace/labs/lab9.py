"""LAB-9, compiler, preservation proof and SQL validator (curriculum/S09-preservation.md section 4;
content/stages/S9/lab.yaml).

Twelve stages, one check each. The lab's files are `labs/LAB-9/` of the learner's repository: a Lean project
(`lakefile.toml`) whose `challenge/` holds the course's definitions, the pinned statements and one comparator
configuration per stage, `S9/` the learner's definitions, `Solution/` the learner's proofs, `reference/` the
reference translation validator, `validator/` the learner's Rust SQL validator, and `broken/`, `fixed/` and
`stage12/` for the last stage.

| Check | Reads | Passes when |
|---|---|---|
| LAB-9.c1 | reference/tv.py on two cases; stage1/counterexample.txt | the validator accepts the compiled transfer with its bound printed and rejects the edited one with a store; the store you copied replays in this module's own copies of both semantics as different observations |
| LAB-9.c2 | Solution/S9A.lean | `lake comparator` accepts `exec_append` and `exec_comp` against pack S9A; their axioms are within the permitted list |
| LAB-9.c3 | S9/Defs.lean, Solution/S9IR.lean | every golden of pack S9IR closes by `decide` on your definitions; the comparator accepts the goldens and `exec_deterministic`; the lint finds no escape hatch in S9/Defs.lean |
| LAB-9.c4 | S9/Statement.lean, Solution/Adequacy.lean | the comparator accepts the five adequacy theorems |
| LAB-9.c5–c10 | Solution/Expr, Move, Require, Seq, Abort, Assembled | the comparator accepts the stage's theorems of pack S9B |
| LAB-9.c11 | validator/ (Rust) | on plans drawn now, every wrong plan is rejected, no honest plan is, every rejection's instance replays on PostgreSQL and in the interpreter as different outcome classes, and every verdict prints its bound |
| LAB-9.c12 | broken/hoist/Hoist.lean, fixed/, stage12/tcb.md, claims/cl-9-*.yaml | SP-9.1 replays at the minimal witness and a non-minimal one, every component of the trusted base has a status, and the three cards pass claim@1 validation |

Lean runs `lake build`, `#print axioms` and `lake comparator` in the lab's folder, inside Lean's sandbox. When
the sandbox cannot start (a `bwrap:` line), nothing was judged and the stage writes no receipt; setting
STATESPACE_SANDBOX=off records your decision to run without it, and every receipt then says `sandbox: off`
(labs/README.md section 4.4). `lake check`, and `--paranoid`, run at the Defence, not here.

A stopgap until the Lean lane (W2-T32): this module records its own runs and the receipt's `lean` section
through a small session object, the way a lane would. Runs of `lake`, `lean`, `cargo`, `postgres` and the
validators are shown by `statespace receipt verify` as reported, since no lane reads their verdict lines yet.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-9"
PERMITTED = ("propext", "Quot.sound", "Classical.choice")
LEAN_TIMEOUT_S = 900.0

# ------------------------------------------------------------------------------------------- the session


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    return _sha256_bytes(path.read_bytes())


@dataclass
class _Bench:
    """What this lab's checks ran: tools, the Lean section and the sandbox state, for the runner to put in
    the receipt the way it does for a lane's session."""

    SECTION = "lean"
    tools: list[dict[str, Any]] = field(default_factory=list)
    lean: dict[str, Any] | None = None
    sandbox: tuple[str, ...] | None = None

    def receipt_tools(self) -> list[dict[str, Any]]:
        return list(self.tools)

    def receipt_section(self) -> dict[str, Any] | None:
        return self.lean

    def add_tool(self, name: str, version: str, path: Path, pin: str | None = None) -> None:
        from statespace import doctor

        sha = _sha256_file(path)
        entry: dict[str, Any] = {"name": name, "version": version, "sha256": sha}
        pinned = doctor.PINS.get(pin or name)
        if pinned is not None and pinned.sha256 is not None:
            entry["pinned"] = sha == pinned.sha256
        if all(t["name"] != name for t in self.tools):
            self.tools.append(entry)


def _bench(ctx: CheckContext) -> _Bench:
    bench = getattr(ctx, "_lab9_bench", None)
    if bench is None:
        bench = _Bench()
        setattr(ctx, "_lab9_bench", bench)
        if getattr(ctx, "_z3", None) is None:  # the stage's one session slot; LAB-9 runs no Z3
            setattr(ctx, "_z3", bench)
    return bench


def _run(
    ctx: CheckContext,
    argv: Sequence[str],
    *,
    cwd: Path,
    step: str,
    engine: str,
    version: str,
    input_sha: str,
    timeout_s: float,
    env: dict[str, str] | None = None,
    seed: int | None = None,
) -> Any:
    """Run one process and return its Completed; its output is written beside the receipt as <step>.out."""
    from statespace.check import proc

    ctx.workdir.mkdir(parents=True, exist_ok=True)
    done = proc.run(argv, cwd=cwd, timeout_s=timeout_s, env=env)
    if done.returncode is None:
        raise ToolUnavailable(f"{argv[0]} could not start: {done.error}")
    (ctx.workdir / f"{step}.out").write_text(done.output, encoding="utf-8")
    return done


def _record(ctx: CheckContext, *, step: str, engine: str, version: str, argv: Sequence[str], input_sha: str, done: Any, lines: list[str], verdict: str, seed: int | None = None) -> None:
    budget: dict[str, Any] = {}
    if seed is not None:
        budget["seed"] = seed
    if done.timed_out:
        lines = [*lines, f"statespace: stopped after {done.ms} ms by the wall-clock backstop"]
        verdict = "error"
    ctx.runs.append(
        {
            "step": step,
            "engine": engine,
            "version": version,
            "argv": list(argv),
            "inputSha256": input_sha,
            "budget": budget,
            "exitCode": done.returncode,
            "verdictLines": lines or ["statespace: the run printed no verdict line"],
            "verdict": verdict,
            "ms": done.ms,
        }
    )


# ---------------------------------------------------------------------------------------------- Lean


@dataclass
class _Toolchain:
    lean: Path
    lake: Path
    version: str  # lean --version, verbatim
    short: str  # 4.35.0


def _toolchain(ctx: CheckContext) -> _Toolchain:
    from statespace import doctor
    from statespace.check import proc

    directory = doctor.lean_toolchain()
    lean = directory / "bin" / "lean" if directory else None
    lake = directory / "bin" / "lake" if directory else None
    if lean is None or lake is None or not lake.is_file():
        raise ToolUnavailable(f"Lean's toolchain {doctor.LEAN_TOOLCHAIN} is not installed under ELAN_HOME: open the repository in the devcontainer (labs/README.md section 4.2), or install it with elan (labs/TOOLS.md)")
    done = proc.run([str(lean), "--version"], cwd=ctx.root, timeout_s=60)
    version = (done.output.strip().splitlines() or ["unknown"])[0]
    found = re.search(r"version ([0-9][^,\s]*)", version)
    short = found.group(1) if found else version
    bench = _bench(ctx)
    bench.add_tool("lean", version, lean)
    lake_version = (proc.run([str(lake), "--version"], cwd=ctx.root, timeout_s=60).output.strip().splitlines() or ["unknown"])[0]
    bench.add_tool("lake", lake_version, lake)
    return _Toolchain(lean, lake, version, short)


def _sandbox_off() -> bool:
    return (os.environ.get("STATESPACE_SANDBOX") or "").strip().lower() == "off"


def _strip_comments(text: str) -> str:
    text = re.sub(r"/-.*?-/", " ", text, flags=re.S)
    return re.sub(r"--[^\n]*", " ", text)


def _error_lines(output: str) -> list[str]:
    return [line.strip() for line in output.splitlines() if re.match(r"\s*(error|✖)|\S+\.lean:\d+:\d+: error", line) and "error: build failed" not in line][:12]


@dataclass
class _LeanStage:
    k: int
    challenge: str  # repository path of the challenge module
    solution: str  # repository path of the learner's module
    solution_module: str
    theorems: tuple[str, ...]
    manual: bool = True


STAGES_LEAN: dict[int, _LeanStage] = {}


def _lean_stage(k: int, challenge: str, solution_module: str, theorems: Sequence[str], manual: bool = True) -> _LeanStage:
    stage = _LeanStage(k, f"{LAB_DIR}/challenge/Challenge/{challenge}.lean", f"{LAB_DIR}/{solution_module.replace('.', '/')}.lean", solution_module, tuple(theorems), manual)
    STAGES_LEAN[k] = stage
    return stage


def _lean_check(ctx: CheckContext, k: int, *, before: Any = None) -> CheckResult:
    """Build, print the axioms of, and run `lake comparator` on stage k's theorems."""
    spec = STAGES_LEAN[k]
    lab = ctx.lab_dir
    tc = _toolchain(ctx)
    bench = _bench(ctx)
    config_rel = f"{LAB_DIR}/challenge/lab9-{k}.json"
    try:
        config = json.loads(ctx.text(config_rel))
    except json.JSONDecodeError as error:
        return CheckResult(False, f"{config_rel} is not JSON ({error.msg}): restore it from the lab zip", "tool")
    challenge_text = ctx.statement(spec.challenge, "lean-challenge")
    if k >= 3:
        ctx.statement(f"{LAB_DIR}/S9/Defs.lean", "lean-challenge")
    if k >= 4:
        ctx.statement(f"{LAB_DIR}/S9/Statement.lean", "lean-challenge")
    solution_text = ctx.text(spec.solution)
    from statespace.schema.statement_hash import statement_hash_text

    lean_section: dict[str, Any] = {
        "toolchain": (ctx.text(f"{LAB_DIR}/lean-toolchain").strip() or "unknown"),
        "challengeSha": statement_hash_text(challenge_text),
        "permittedAxioms": list(config.get("permitted_axioms", PERMITTED)),
        "checkers": [],
        "theorems": [],
        "nativeAxioms": [],
        "sorryCount": 0,
        "automation": {},
        "statementCheck": "comparator",
    }
    bench.lean = lean_section
    body = _strip_comments(solution_text)
    automation = {name: bool(re.search(rf"\b{name}\b", body)) for name in ("grind", "omega", "decide")}
    automation["manualMode"] = spec.manual
    lean_section["automation"] = automation
    if spec.manual and (automation["grind"] or automation["omega"]):
        used = " and ".join(n for n in ("omega", "grind") if automation[n])
        ctx.note(f"manual mode: {spec.solution} uses {used}; the check still passes, and the claim's method names what closed the goal")

    # 1. build the challenge and your module (and what it imports)
    challenge_module = str(config.get("challenge_module") or "")
    argv = [str(tc.lake), "build", challenge_module, spec.solution_module]
    shown = ["lake", "build", challenge_module, spec.solution_module]
    done = _run(ctx, argv, cwd=lab, step="build", engine="lake", version=tc.short, input_sha=_sha256_file(lab / "lakefile.toml"), timeout_s=LEAN_TIMEOUT_S)
    built = "Build completed successfully" in done.output and done.returncode == 0
    errors = _error_lines(done.output)
    _record(ctx, step="build", engine="lake", version=tc.short, argv=shown, input_sha=_sha256_file(lab / "lakefile.toml"), done=done, lines=[next(l.strip() for l in done.output.splitlines() if "Build completed" in l)] if built else errors, verdict="passed" if built else "failed")
    if before is not None:
        early = before(ctx, tc)
        if early is not None:
            return early
    if not built:
        first = errors[0] if errors else "the build failed"
        where = re.search(r"((?:S9|Solution|challenge)/[A-Za-z0-9_/]+\.lean)", first)
        file = where.group(1) if where else ""
        suspect = "implementation" if file.startswith("S9/Defs") else "spec" if file.startswith("S9/Statement") else "tool" if file.startswith("challenge/") else "proof"
        return CheckResult(False, f"lake build failed{' in ' + file if file else ''}: nothing reached the comparator", suspect, tuple(errors[:6]) + (f"the whole output is in {ctx.workdir.relative_to(ctx.root).as_posix()}/build.out",))

    # 2. #print axioms for each theorem the stage judges
    ns_theorems = list(config.get("theorem_names", spec.theorems))
    probe = ctx.workdir / "axioms.lean"
    probe.write_text(f"import {spec.solution_module}\n" + "".join(f"#print axioms {name}\n" for name in ns_theorems), encoding="utf-8")
    rel_probe = os.path.relpath(probe, lab)
    done = _run(ctx, [str(tc.lake), "env", str(tc.lean), rel_probe], cwd=lab, step="axioms", engine="lean", version=tc.short, input_sha=_sha256_file(probe), timeout_s=LEAN_TIMEOUT_S)
    axioms: dict[str, list[str]] = {}
    lines: list[str] = []
    for line in done.output.splitlines():
        m = re.match(r"'([^']+)' depends on axioms: \[(.*)\]", line.strip())
        n = re.match(r"'([^']+)' does not depend on any axioms", line.strip())
        if m:
            axioms[m.group(1)] = [a.strip() for a in m.group(2).split(",") if a.strip()]
            lines.append(line.strip())
        elif n:
            axioms[n.group(1)] = []
            lines.append(line.strip())
    missing = [t for t in ns_theorems if t not in axioms]
    bad = {t: [a for a in ax if a not in PERMITTED] for t, ax in axioms.items()}
    _record(ctx, step="axioms", engine="lean", version=tc.short, argv=["lake", "env", "lean", rel_probe], input_sha=_sha256_file(probe), done=done, lines=lines or _error_lines(done.output), verdict="passed" if not missing and not any(bad.values()) else "failed")
    lean_section["theorems"] = [{"name": t, "axioms": axioms.get(t, [])} for t in ns_theorems if t in axioms]
    lean_section["nativeAxioms"] = sorted({a for ax in axioms.values() for a in ax if "_native" in a})
    lean_section["sorryCount"] = sum(1 for ax in axioms.values() if "sorryAx" in ax)
    if missing:
        return CheckResult(False, f"{spec.solution} does not prove {', '.join(missing)}: keep each theorem's name and statement as the challenge has them", "spec", tuple(_error_lines(done.output)[:4]))

    # 3. the comparator
    config_arg = f"challenge/lab9-{k}.json"
    argv = [str(tc.lake), "comparator", "--config", config_arg]
    shown = ["lake", "comparator", "--config", config_arg]
    if _sandbox_off():
        argv.append("--inadvisably-no-sandbox")
        shown.append("--inadvisably-no-sandbox")
    done = _run(ctx, argv, cwd=lab, step="comparator", engine="lake", version=tc.short, input_sha=_sha256_file(lab / config_arg), timeout_s=LEAN_TIMEOUT_S)
    bwrap = next((line.strip() for line in done.output.splitlines() if line.strip().startswith("bwrap:")), None)
    if bwrap is not None:
        raise ToolUnavailable(
            f"Lean's sandbox could not start ({bwrap}), so the comparator judged nothing. Use the devcontainer's opt-in sandbox profile "
            "(labs/README.md section 4.4), or decide to run without it: STATESPACE_SANDBOX=off records sandbox: off on every receipt"
        )
    bench.sandbox = ("off",) if _sandbox_off() else ("on",)
    okay = any(line.strip() == "Your solution is okay!" for line in done.output.splitlines())
    verdict_lines = [line.strip() for line in done.output.splitlines() if re.match(r"\s*(error:|Your solution is okay!|Running .* kernel|.* kernel (accepts|rejects|rejected)|WARNING: Sandbox)", line)]
    _record(ctx, step="comparator", engine="lake", version=tc.short, argv=shown, input_sha=_sha256_file(lab / config_arg), done=done, lines=verdict_lines, verdict="accepted" if okay else "rejected")
    kernel = "accepts" if any("Lean default kernel accepts the solution" in line for line in done.output.splitlines()) else ("rejects" if any("kernel rejected" in line or "kernel rejects" in line for line in done.output.splitlines()) else "not-run")
    lean_section["checkers"] = [{"name": "Lean default kernel", "version": tc.version, "verdict": kernel}]
    ctx.tcb(f"Lean {tc.short} kernel", "trusted")
    ctx.tcb("lake comparator (statement matching and the axiom policy)", "trusted")
    if okay:
        return CheckResult(True, f"lake comparator accepts {', '.join(t.split('.')[-1] for t in ns_theorems)} against {spec.challenge.split('/')[-1]}; Lean {tc.short} kernel; axioms {', '.join(sorted({a for ax in axioms.values() for a in ax})) or 'none'}")
    errors = [line for line in verdict_lines if line.startswith("error:")]
    first = errors[0] if errors else "the comparator rejected the solution"
    if "sorryAx" in first:
        open_ = [t.split(".")[-1] for t, ax in axioms.items() if "sorryAx" in ax]
        return CheckResult(False, f"a goal is still open: {', '.join(open_) or 'a theorem'} {'uses' if len(open_) <= 1 else 'use'} sorry", "proof", (first, f"replace each sorry in {spec.solution}; a goal you park with statespace stuck is carried as [A]"))
    if "Illegal axiom" in first:
        return CheckResult(False, f"an axiom outside the permitted list closes a goal: {first.removeprefix('error: ')}", "proof", ("permitted: " + ", ".join(lean_section["permittedAxioms"]), "native_decide adds a _native axiom; use decide or a proof"))
    if "statement do not match" in first or "Const does not match" in first:
        return CheckResult(False, f"the comparator says your theorem is not the pinned one: {first.removeprefix('error: ')}", "spec", ("prove the statement exactly as challenge/ states it, over the definitions it imports",))
    return CheckResult(False, f"the comparator rejected the solution: {first.removeprefix('error: ')}", "proof", tuple(errors[1:4]))


def _lean(k: int, *, claim: str | None = None, before: Any = None, after: Any = None):
    def run(ctx: CheckContext) -> CheckResult:
        result = _lean_check(ctx, k, before=before)
        if result.passed:
            if claim is not None:
                ctx.claim(claim)
            if after is not None:
                after(ctx)
        return result

    return run


# LAB-9.3: the lint, the decide goldens and the frozen definitions

FORBIDDEN = ("native_decide", "implemented_by", "extern", "partial", "unsafe")


def _goldens_before(ctx: CheckContext, tc: _Toolchain) -> CheckResult | None:
    defs_rel = f"{LAB_DIR}/S9/Defs.lean"
    body = _strip_comments(ctx.text(defs_rel))
    found = [w for w in FORBIDDEN if re.search(rf"(@\[\s*)?\b{w}\b", body)]
    bench = _bench(ctx)
    if bench.lean is not None:
        bench.lean["lints"] = [f"S9/Defs.lean uses {w}" for w in found]
    if found:
        return CheckResult(False, f"S9/Defs.lean uses {', '.join(found)}, which the semantics lint refuses", "implementation", ("structural recursion, or fuel, instead; native_decide trusts the compiler",))
    challenge = ctx.text(f"{LAB_DIR}/challenge/Challenge/S9IR.lean")
    goldens = [(m.group(1), " ".join(m.group(2).split())) for m in re.finditer(r"^theorem (golden_\w+)\s*:\s*((?:.|\n)*?):= by\n  sorry", challenge, re.M)]
    probe = ctx.workdir / "goldens.lean"
    lines = ["import Course.Run", "", "namespace S9", ""]
    where: dict[int, str] = {}
    for name, stmt in goldens:
        where[len(lines) + 1] = name
        lines.append(f"theorem probe_{name} : {stmt} := by decide")
    lines += ["", "end S9", ""]
    probe.write_text("\n".join(lines), encoding="utf-8")
    rel_probe = os.path.relpath(probe, ctx.lab_dir)
    done = _run(ctx, [str(tc.lake), "env", str(tc.lean), rel_probe], cwd=ctx.lab_dir, step="goldens", engine="lean", version=tc.short, input_sha=_sha256_file(probe), timeout_s=LEAN_TIMEOUT_S)
    failed: list[str] = []
    for line in done.output.splitlines():
        m = re.match(r".*?goldens\.lean:(\d+):\d+: error", line)
        if m and where.get(int(m.group(1))) and where[int(m.group(1))] not in failed:
            failed.append(where[int(m.group(1))])
    if done.returncode != 0 and not failed:
        failed = ["(the goldens did not elaborate)"]
    verdict_lines = [f"{name}: {'fails' if name in failed else 'decide closes it'}" for name, _ in goldens]
    _record(ctx, step="goldens", engine="lean", version=tc.short, argv=["lake", "env", "lean", rel_probe], input_sha=_sha256_file(probe), done=done, lines=verdict_lines, verdict="failed" if failed else "passed")
    if bench.lean is not None:
        bench.lean["goldens"] = {"count": len(goldens), "kernelChecked": not failed}
    ctx.ext.setdefault("lab9", {})["goldens"] = {"n": len(goldens), "passed": len(goldens) - len(failed), "failed": len(failed)}
    if failed:
        hint = {
            "golden_self_transfer": "a self-transfer must net to zero: let the credit read the debited store",
            "golden_move_whole_balance": "the amount is evaluated once, before the first write: save it in a register",
            "golden_transfer": "the compiler must accept transfer and move the amount",
            "golden_write_then_abort": "an abort ends the run with its error",
            "golden_assert_fails": "a failing assertGe ends the run with its error",
            "golden_writeIf_silent": "a writeIf whose condition fails changes nothing",
            "golden_writeIf_writes": "a writeIf whose condition holds writes",
            "golden_non_positive": "a non-positive amount aborts with nonPositive",
            "golden_insufficient": "insufficient funds abort with insufficient",
        }
        return CheckResult(False, f"{len(failed)} of {len(goldens)} goldens {'fails' if len(failed) == 1 else 'fail'} by decide on your S9/Defs.lean: {', '.join(failed)}", "implementation", tuple(hint.get(f, f) for f in failed[:4]))
    return None


# LAB-9.6 to LAB-9.10: CL-9.2, minted at the first case and updated as each closes

CASES_AFTER = {6: ("require_sim", "seq_commit", "seq_abort", "abort_sim", "skip_sim", "seq_sim", "compile_correct", "compile_complete", "preservation"),
               7: ("seq_commit", "seq_abort", "abort_sim", "skip_sim", "seq_sim", "compile_correct", "compile_complete", "preservation"),
               8: ("seq_abort", "abort_sim", "skip_sim", "seq_sim", "compile_correct", "compile_complete", "preservation"),
               9: ("seq_sim", "compile_correct", "compile_complete", "preservation"),
               10: ()}


def _cl92(k: int):
    def after(ctx: CheckContext) -> None:
        remaining = CASES_AFTER[k]
        ctx.ext.setdefault("lab9", {})["cl92"] = {"remaining": list(remaining)}
        if remaining:
            ctx.note(f"CL-9.2: PROVED modulo the remaining pinned lemmas, each [A] until its stage passes: {', '.join(remaining)}")
        else:
            ctx.note("CL-9.2: every pinned lemma is accepted; the stamp is derived from this receipt (the paranoid run happens at the Defence)")
        ctx.tcb(f"{LAB_DIR}/S9/Defs.lean, the IR's semantics as a model of one transaction", "trusted")
        if not remaining:
            ctx.tcb("the IR compiler in S9/Defs.lean", "proved")

    return after


# --------------------------------------------------------------------------------------- LAB-9.1: replay


def _src_run(cmds: list[tuple], store: dict[int, int]) -> tuple:
    s = dict(store)
    for c in cmds:
        if c[0] == "require":
            if not _ev(c[2], s) <= _ev(c[1], s):
                return ("aborted", c[3])
        elif c[0] == "move":
            v = _ev(c[1], s)
            s[c[2]] = s.get(c[2], 0) - v
            s[c[3]] = s.get(c[3], 0) + v
        elif c[0] == "abort":
            return ("aborted", c[1])
    return ("committed", s)


def _ev(e: tuple, s: dict[int, int]) -> int:
    if e[0] == "lit":
        return e[1]
    if e[0] == "bal":
        return s.get(e[1], 0)
    return _ev(e[1], s) + _ev(e[2], s) if e[0] == "add" else _ev(e[1], s) - _ev(e[2], s)


def _ir_run(lines: list[str], store: dict[int, int]) -> tuple:
    regs: dict[int, int] = {}
    st = dict(store)
    num = lambda t: int(t[1:])  # noqa: E731 - r3, a2
    for raw in lines:
        t = raw.split("#", 1)[0].split()
        if not t:
            continue
        op = t[0]
        if op == "ldi":
            regs[num(t[1])] = int(t[2])
        elif op == "read":
            regs[num(t[1])] = st.get(num(t[2]), 0)
        elif op in ("add", "sub"):
            x, y = regs.get(num(t[2]), 0), regs.get(num(t[3]), 0)
            regs[num(t[1])] = x + y if op == "add" else x - y
        elif op == "write":
            st[num(t[1])] = regs.get(num(t[2]), 0)
        elif op == "writeIf":
            if regs.get(num(t[2]), 0) <= regs.get(num(t[1]), 0):
                st[num(t[3])] = regs.get(num(t[4]), 0)
        elif op == "assertGe":
            if not regs.get(num(t[2]), 0) <= regs.get(num(t[1]), 0):
                return ("aborted", t[3])
        elif op == "abort":
            return ("aborted", t[1])
    return ("committed", st)


def _case(text: str) -> tuple[str, list[str]]:
    source, body, inside = "", [], False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if inside and line.strip():
            body.append(line)
        elif line.startswith("source "):
            source = line[7:].strip()
        elif line.strip() == "output":
            inside = True
    return source, body


def _transfer(source: str) -> tuple[list[tuple], list[int]]:
    m = re.fullmatch(r"transfer (-?\d+) a(\d+) a(\d+)", source)
    if not m:
        raise ValueError(f"{source!r} is not a transfer")
    amt, src, dst = int(m.group(1)), int(m.group(2)), int(m.group(3))
    cmds = [("require", ("lit", amt), ("lit", 1), "nonPositive"), ("require", ("bal", src), ("lit", amt), "insufficient"), ("move", ("lit", amt), src, dst)]
    return cmds, sorted({src, dst})


def _observe(o: tuple, accounts: list[int]) -> tuple:
    return o if o[0] == "aborted" else ("committed", tuple(o[1].get(a, 0) for a in accounts))


def _show_obs(o: tuple, accounts: list[int]) -> str:
    if o[0] == "aborted":
        return f"aborted {o[1]}"
    return f"committed ({', '.join(f'a{a}' for a in accounts)}) = ({', '.join(str(v) for v in o[1])})"


TV = f"{LAB_DIR}/reference/tv.py"
TV_CASES = (f"{LAB_DIR}/reference/cases/transfer-30-1-2.tv", f"{LAB_DIR}/reference/cases/transfer-30-1-2.reuse.tv")
WITNESS = f"{LAB_DIR}/stage1/counterexample.txt"


def c1(ctx: CheckContext) -> CheckResult:
    ctx.tcb("the reference translation validator (reference module, earns nothing)", "tested")
    ctx.tcb("the course's interpreters for the source and the IR (INS-interp)", "tested")
    verdicts: list[tuple[str, list[str]]] = []
    for step, case in zip(("tv-compiled", "tv-edited"), TV_CASES):
        ctx.text(case)
        argv = [sys.executable, "-I", TV, "validate", case]
        done = _run(ctx, argv, cwd=ctx.root, step=step, engine="statespace-tv", version="1", input_sha=_sha256_file(ctx.path(case)), timeout_s=120)
        out = done.output.splitlines()
        version = out[0].strip() if out else "statespace-tv"
        lines = [l.strip() for l in out if re.match(r"\s*(bound:|verdict:|counterexample:|source:|output:)", l)]
        verdict = "accepted" if "verdict: accepted within the bound" in lines else "rejected" if "verdict: rejected" in lines else "error"
        _record(ctx, step=step, engine="statespace-tv", version=version.split(" (")[0].removeprefix("statespace-tv ").strip() or "1", argv=["python", "-I", TV, "validate", case], input_sha=_sha256_file(ctx.path(case)), done=done, lines=lines, verdict=verdict)
        verdicts.append((verdict, lines))
    (honest, honest_lines), (edited, edited_lines) = verdicts
    bound = next((l for l in honest_lines if l.startswith("bound:")), None)
    if honest != "accepted" or bound is None:
        return CheckResult(False, f"the reference validator did not accept the compiler's output ({honest}); restore labs/LAB-9/reference/ from the lab zip", "tool", tuple(honest_lines[:4]))
    if edited != "rejected" or not any(l.startswith("counterexample:") for l in edited_lines):
        return CheckResult(False, f"the reference validator did not reject the edited output ({edited}); restore labs/LAB-9/reference/ from the lab zip", "tool", tuple(edited_lines[:4]))
    text = ctx.text(WITNESS)
    m = re.search(r"^\s*store \(([^)]*)\) = \(([^)]*)\)\s*$", text, re.M)
    if not m or "?" in m.group(2):
        return CheckResult(False, f"{WITNESS} names no store yet: copy the counterexample store the validator printed for the edited output", "spec", (f"the validator printed: {next(l for l in edited_lines if l.startswith('counterexample:'))}", "write it as: store (a1, a2) = (<a1>, <a2>)"))
    try:
        names = [int(n.strip().removeprefix("a")) for n in m.group(1).split(",")]
        values = [int(v.strip()) for v in m.group(2).split(",")]
    except ValueError:
        return CheckResult(False, f"{WITNESS}: '{m.group(0).strip()}' is not a store such as store (a1, a2) = (30, 0)", "spec")
    if len(names) != len(values):
        return CheckResult(False, f"{WITNESS}: the store names {len(names)} accounts and gives {len(values)} balances", "spec")
    store = dict(zip(names, values))
    replays: list[str] = []
    obs = []
    for case in TV_CASES:
        source, body = _case(ctx.text(case))
        cmds, accounts = _transfer(source)
        want = _observe(_src_run(cmds, store), accounts)
        got = _observe(_ir_run(body, store), accounts)
        obs.append((want, got))
        replays.append(f"{case.split('/')[-1]}: source {_show_obs(want, accounts)}, output {_show_obs(got, accounts)}")
    (want_h, got_h), (want_e, got_e) = obs
    if want_e == got_e:
        return CheckResult(False, f"the store {m.group(0).strip()} does not tell the edited output from the source: both observe {want_e}", "spec", (*replays, "copy the store from the validator's counterexample line"))
    ctx.ext.setdefault("lab9", {})["tv"] = {"bound": bound.removeprefix("bound: "), "witness": {f"a{a}": v for a, v in store.items()}}
    return CheckResult(True, f"accepted within the {bound.removeprefix('bound: ')}; the edited output rejected, and your store replays as different observations", None, tuple(replays))


# ------------------------------------------------------------------------------------- LAB-9.11: SQL


STMT_SELECT = re.compile(r"SELECT bal FROM accounts WHERE id = \$(\d) INTO r(\d+) EXPECT 1 ELSE (\w+)")
STMT_ASSERT = re.compile(r"ASSERT (\S+) (>=|<=|<>|>|<|=) (\S+) ELSE (\w+)")
STMT_UPDATE = re.compile(r"UPDATE accounts SET bal = (\S+)(?: ([+-]) (\S+))? WHERE id = \$(\d)(?: EXPECT 1 ELSE (\w+))?")
STMT_UPSERT = re.compile(r"INSERT INTO accounts \(id, bal\) VALUES \(\$(\d), \$(\d)\) ON CONFLICT \(id\) DO UPDATE SET bal = accounts\.bal \+ \$(\d)")

# The plans of LAB-9.11, written over the roles F (from), T (to) and A (amount); each case renames the roles
# to parameters drawn at grade time. Honest plans mean what transfer means; every mutant means something else.
PLANS: dict[str, tuple[bool, str, tuple[str, ...]]] = {
    "reference": (True, "the compiled transfer", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
    "credit-first": (True, "the two writes swapped, each reading the current balance", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount")),
    "dst-checked": (True, "the destination checked after the funds guard", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "SELECT bal FROM accounts WHERE id = {T} INTO r2 EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
    "debit-from-register": (True, "the debit computed from the balance just read", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = r1 - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
    "wrong-account": (False, "the shape-only mutant: the credit names the source account", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount")),
    "flipped-debit": (False, "the debit adds", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
    "no-funds-guard": (False, "the funds guard dropped: the CHECK constraint answers instead", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
    "no-positive-guard": (False, "the positive-amount guard dropped", (
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
    "no-credit-rowcount": (False, "the credit's rowcount check dropped", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = bal + {A} WHERE id = {T}")),
    "upsert-credit": (False, "the credit rewritten as an upsert (SP-9.4)", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "UPDATE accounts SET bal = bal - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "INSERT INTO accounts (id, bal) VALUES ({T}, {A}) ON CONFLICT (id) DO UPDATE SET bal = accounts.bal + {A}")),
    "read-both-first": (False, "both balances read before either write (SP-2.1's class)", (
        "ASSERT {A} > 0 ELSE NonPositive",
        "SELECT bal FROM accounts WHERE id = {F} INTO r1 EXPECT 1 ELSE NoSuchAccount",
        "ASSERT r1 >= {A} ELSE Insufficient",
        "SELECT bal FROM accounts WHERE id = {T} INTO r2 EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = r1 - {A} WHERE id = {F} EXPECT 1 ELSE NoSuchAccount",
        "UPDATE accounts SET bal = r2 + {A} WHERE id = {T} EXPECT 1 ELSE NoSuchAccount")),
}
SHAPE_ONLY = "wrong-account"


@dataclass
class SqlCase:
    id: str
    plan: str  # a key of PLANS
    roles: dict[str, int]  # F, T, A -> parameter number

    @property
    def honest(self) -> bool:
        return PLANS[self.plan][0]

    def lines(self) -> list[str]:
        sub = {r: f"${k}" for r, k in self.roles.items()}
        return [line.format(**sub) for line in PLANS[self.plan][2]]

    def text(self) -> str:
        r = self.roles
        return "\n".join([f"case {self.id}", f"source transfer from=${r['F']} to=${r['T']} amount=${r['A']}", "plan", *self.lines(), "end"]) + "\n"


def draw_cases(rng: Any) -> list[SqlCase]:
    """Every plan once, each under a permutation of the parameters drawn now, in an order drawn now."""
    names = list(PLANS)
    rng.shuffle(names)
    out = []
    for i, name in enumerate(names, start=1):
        perm = [1, 2, 3]
        rng.shuffle(perm)
        out.append(SqlCase(f"k{i}", name, dict(zip("FTA", perm))))
    return out


def source_transfer(accounts: dict[int, int], frm: int, to: int, amount: int) -> tuple:
    """The source command's outcome class on one instance (the course's interpreter, INS-interp)."""
    if amount <= 0:
        return ("error", "NonPositive")
    if frm not in accounts:
        return ("error", "NoSuchAccount")
    if accounts[frm] < amount:
        return ("error", "Insufficient")
    s = dict(accounts)
    s[frm] -= amount
    if to not in s:
        return ("error", "NoSuchAccount")
    s[to] += amount
    return ("committed", tuple(sorted(s.items())))


BIGINT = (-(2**63), 2**63 - 1)


def _operand(token: str, params: dict[int, int], regs: dict[int, int]) -> str:
    if token == "bal":
        return "bal"
    if token.startswith("$"):
        return str(params[int(token[1:])])
    if token.startswith("r"):
        return str(regs[int(token[1:])])
    return str(int(token))


def replay_plan(conn: Any, lines: list[str], accounts: dict[int, int], params: dict[int, int]) -> tuple:
    """Run the plan on PostgreSQL in one transaction from a table holding `accounts`; its outcome class.
    Raises InputRefused when the instance cannot be inserted."""
    import psycopg

    conn.execute("DROP TABLE IF EXISTS pg_temp.accounts")
    conn.execute("CREATE TEMP TABLE accounts (id bigint PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0))")
    try:
        for k, v in sorted(accounts.items()):
            conn.execute("INSERT INTO accounts (id, bal) VALUES (%s, %s)", (k, v))
    except psycopg.Error as error:
        raise InputRefused(f"the instance cannot be inserted: {error.diag.message_primary or error}") from error
    regs: dict[int, int] = {}
    conn.execute("BEGIN")
    try:
        for line in lines:
            if m := STMT_ASSERT.fullmatch(line):
                a, b = int(_operand(m.group(1), params, regs)), int(_operand(m.group(3), params, regs))
                holds = {">": a > b, ">=": a >= b, "<": a < b, "<=": a <= b, "=": a == b, "<>": a != b}[m.group(2)]
                if not holds:
                    conn.execute("ROLLBACK")
                    return ("error", m.group(4))
            elif m := STMT_SELECT.fullmatch(line):
                rows = conn.execute(f"SELECT bal FROM accounts WHERE id = {params[int(m.group(1))]}").fetchall()
                if len(rows) != 1:
                    conn.execute("ROLLBACK")
                    return ("error", m.group(3))
                regs[int(m.group(2))] = int(rows[0][0])
            elif m := STMT_UPDATE.fullmatch(line):
                value = _operand(m.group(1), params, regs) + (f" {m.group(2)} {_operand(m.group(3), params, regs)}" if m.group(2) else "")
                cur = conn.execute(f"UPDATE accounts SET bal = {value} WHERE id = {params[int(m.group(4))]}")
                if m.group(5) and cur.rowcount != 1:
                    conn.execute("ROLLBACK")
                    return ("error", m.group(5))
            elif m := STMT_UPSERT.fullmatch(line):
                i, v, d = (params[int(m.group(n))] for n in (1, 2, 3))
                conn.execute(f"INSERT INTO accounts (id, bal) VALUES ({i}, {v}) ON CONFLICT (id) DO UPDATE SET bal = accounts.bal + {d}")
            else:
                raise ValueError(f"not a plan statement: {line}")
        conn.execute("COMMIT")
    except psycopg.Error as error:
        conn.execute("ROLLBACK")
        return ("sqlstate", error.sqlstate or "unknown")
    rows = conn.execute("SELECT id, bal FROM accounts ORDER BY id").fetchall()
    return ("committed", tuple((int(i), int(b)) for i, b in rows))


def show_class(c: tuple) -> str:
    if c[0] == "committed":
        return "committed " + (", ".join(f"{i}:{b}" for i, b in c[1]) or "(no rows)")
    return f"{c[0]} {c[1]}"


VERDICT_LINE = re.compile(r"(?P<id>\S+) (?P<verdict>accept|reject)(?P<rest>.*)")
INSTANCE = re.compile(r"instance accounts=(?P<accounts>none|-?\d+:-?\d+(?:,-?\d+:-?\d+)*) from=(?P<from>-?\d+) to=(?P<to>-?\d+) amount=(?P<amount>-?\d+)\s*$")


def pg_connect() -> tuple[Any, str]:
    try:
        import psycopg
    except ImportError as error:
        raise ToolUnavailable("LAB-9.11 replays rejections on PostgreSQL through psycopg, which is not importable here: run uv run --with 'psycopg[binary]==3.3.6' statespace check lab9.11 in the devcontainer") from error
    dsn = os.environ.get("STATESPACE_PG_DSN", "")
    if not dsn:
        raise ToolUnavailable("LAB-9.11 replays rejections on PostgreSQL 18.6, and STATESPACE_PG_DSN names no server: the devcontainer's service sets it")
    try:
        conn = psycopg.connect(dsn, autocommit=True, connect_timeout=10)
    except psycopg.Error as error:
        raise ToolUnavailable(f"PostgreSQL at STATESPACE_PG_DSN did not answer ({str(error).strip().splitlines()[0]})") from error
    version = str(conn.execute("SELECT version()").fetchone()[0])
    return conn, version


VALIDATOR = f"{LAB_DIR}/validator"


def c11(ctx: CheckContext) -> CheckResult:
    from statespace import doctor
    from statespace.check import proc

    crate = ctx.path(VALIDATOR)
    if not (crate / "Cargo.toml").is_file():
        raise InputRefused(f"{VALIDATOR}/Cargo.toml is not in your lab repository")
    cargo = doctor.rust_binary("cargo")
    if cargo is None:
        raise ToolUnavailable("cargo is not installed here: open the repository in the devcontainer (labs/README.md section 4.2)")
    cargo_version = (proc.run([str(cargo), "--version"], cwd=ctx.root, timeout_s=60).output.strip().splitlines() or ["unknown"])[0]
    _bench(ctx).add_tool("cargo", cargo_version, cargo)
    short = (re.search(r"cargo (\S+)", cargo_version) or re.search(r"(.*)", cargo_version)).group(1)
    manifest_sha = _sha256_file(crate / "Cargo.toml")
    argv = ["cargo", "build", "--release", "--offline", "--quiet"]
    done = _run(ctx, [str(cargo), *argv[1:]], cwd=crate, step="cargo-build", engine="cargo", version=short, input_sha=manifest_sha, timeout_s=600)
    errors = [l.strip() for l in done.output.splitlines() if l.startswith("error")][:6]
    _record(ctx, step="cargo-build", engine="cargo", version=short, argv=argv, input_sha=manifest_sha, done=done, lines=errors or ["Finished: the validator built"], verdict="passed" if done.returncode == 0 else "failed")
    if done.returncode != 0:
        return CheckResult(False, "cargo build --release failed for your validator", "implementation", tuple(errors[:4]))
    binary = crate / "target" / "release" / "lab9-validator"
    if not binary.is_file():
        return CheckResult(False, "cargo built no binary named lab9-validator: keep the [[bin]] name in Cargo.toml", "implementation")

    cases = draw_cases(ctx.rng)
    ctx.workdir.mkdir(parents=True, exist_ok=True)
    cases_file = ctx.workdir / "cases.txt"
    cases_file.write_text("".join(c.text() for c in cases), encoding="utf-8")
    crate_version = (re.search(r'^version = "([^"]+)"', ctx.text(f"{VALIDATOR}/Cargo.toml"), re.M) or re.search("(.*)", "0")).group(1)
    rel_cases = os.path.relpath(cases_file, ctx.root)
    done = _run(ctx, [str(binary), str(cases_file)], cwd=ctx.root, step="validator", engine="lab9-validator", version=crate_version, input_sha=_sha256_file(cases_file), timeout_s=300)
    out = {m.group("id"): m for m in (VERDICT_LINE.match(l.strip()) for l in done.output.splitlines()) if m}
    _record(ctx, step="validator", engine="lab9-validator", version=crate_version, argv=[f"{VALIDATOR}/target/release/lab9-validator", rel_cases], input_sha=_sha256_file(cases_file), done=done, lines=[l.strip() for l in done.output.splitlines() if VERDICT_LINE.match(l.strip())][:40], verdict="passed" if done.returncode == 0 else "failed", seed=ctx.seed)
    ctx.tcb("your SQL validator and its lifter", "tested")
    ctx.tcb("PostgreSQL, as the replay's semantics of the plans", "trusted")
    ctx.tcb("the course's interpreter of the source command (INS-interp)", "tested")
    if done.returncode != 0:
        return CheckResult(False, f"your validator exited {done.returncode}", "implementation", tuple(done.output.strip().splitlines()[-3:]))
    unanswered = [c.id for c in cases if c.id not in out]
    if unanswered:
        return CheckResult(False, f"your validator printed no verdict for {', '.join(unanswered)}", "implementation", ("one line per case: <id> accept|reject <bound> [instance ...]",))

    problems: list[str] = []
    details: list[str] = []
    no_bound = [c.id for c in cases if not re.search(r"\bbound\b|\bn=\d+", out[c.id].group("rest"))]
    missed = [c for c in cases if not c.honest and out[c.id].group("verdict") == "accept"]
    false_alarms = [c for c in cases if c.honest and out[c.id].group("verdict") == "reject"]
    if missed:
        problems.append(f"(1) {len(missed)} wrong plan{'s' if len(missed) != 1 else ''} accepted: " + ", ".join(f"{c.id} ({c.plan}{', the shape-only mutant' if c.plan == SHAPE_ONLY else ''})" for c in missed))
    if false_alarms:
        problems.append(f"(2) {len(false_alarms)} honest plan{'s' if len(false_alarms) != 1 else ''} rejected: " + ", ".join(f"{c.id} ({c.plan})" for c in false_alarms))
    if no_bound:
        problems.append(f"(4) {len(no_bound)} verdict{'s' if len(no_bound) != 1 else ''} print no bound or n: {', '.join(no_bound)}")

    rejected = [c for c in cases if out[c.id].group("verdict") == "reject"]
    replay_lines: list[str] = []
    pg_version = None
    if rejected:
        conn, pg_version = pg_connect()
        short_pg = (re.search(r"PostgreSQL (\S+)", pg_version) or re.search("(.*)", pg_version)).group(1)
        import time

        started = time.monotonic()
        try:
            for c in rejected:
                m = INSTANCE.search(out[c.id].group("rest"))
                if not m:
                    problems.append(f"(3) {c.id} is rejected with no instance to replay")
                    replay_lines.append(f"{c.id}: no instance")
                    continue
                accounts: dict[int, int] = {}
                if m.group("accounts") != "none":
                    for pair in m.group("accounts").split(","):
                        i, b = (int(x) for x in pair.split(":"))
                        if i in accounts:
                            problems.append(f"(3) {c.id}'s instance lists account {i} twice")
                        accounts[i] = b
                params = {c.roles["F"]: int(m.group("from")), c.roles["T"]: int(m.group("to")), c.roles["A"]: int(m.group("amount"))}
                if any(not (BIGINT[0] <= v <= BIGINT[1]) for v in [*accounts, *accounts.values(), *params.values()]):
                    problems.append(f"(3) {c.id}'s instance holds a value outside bigint, so it cannot be inserted")
                    continue
                try:
                    plan_class = replay_plan(conn, c.lines(), accounts, params)
                except InputRefused as error:
                    problems.append(f"(3) {c.id}: {error}")
                    replay_lines.append(f"{c.id}: not insertable")
                    continue
                src_class = source_transfer(accounts, int(m.group("from")), int(m.group("to")), int(m.group("amount")))
                diverges = plan_class != src_class
                line = f"{c.id}: plan {show_class(plan_class)} | source {show_class(src_class)} | {'diverges' if diverges else 'agrees'}"
                replay_lines.append(line)
                if not diverges:
                    problems.append(f"(3) {c.id}'s instance does not replay as a divergence: both {show_class(src_class)}")
        finally:
            conn.close()

        class _Done:
            returncode = 0
            timed_out = False
            ms = int(round((time.monotonic() - started) * 1000))

        _record(ctx, step="replay", engine="postgres", version=short_pg, argv=["statespace", "replay", rel_cases, "on", "STATESPACE_PG_DSN"], input_sha=_sha256_file(cases_file), done=_Done(), lines=replay_lines, verdict="failed" if any(p.startswith("(3)") for p in problems) else "passed", seed=ctx.seed)
        (ctx.workdir / "replay.out").write_text("\n".join([pg_version, *replay_lines]) + "\n", encoding="utf-8")
    counts = {"plans": len(cases), "wrong": sum(not c.honest for c in cases), "honest": sum(c.honest for c in cases), "rejected": len(rejected)}
    ctx.ext.setdefault("lab9", {})["sql"] = {"seed": ctx.seed, **counts, "server": pg_version, "verdicts": {c.id: {"plan": c.plan, "verdict": out[c.id].group("verdict")} for c in cases}}
    details += replay_lines[:12]
    if problems:
        return CheckResult(False, problems[0], "implementation", tuple(problems[1:4]) + tuple(details[:6]))
    ctx.claim("CL-9.3")
    accepted = [c for c in cases if out[c.id].group("verdict") == "accept"]
    bound = out[(accepted or cases)[0].id].group("rest").split(" instance ")[0].strip()
    return CheckResult(True, f"{counts['wrong']} of {counts['wrong']} wrong plans rejected (the shape-only mutant included), {counts['honest']} honest plans accepted, every rejection replayed on {pg_version.split(' on ')[0]} and in the interpreter; {bound}", None, tuple(details[:4]))


# ----------------------------------------------------------------------------------------- LAB-9.12


HOIST = f"{LAB_DIR}/broken/hoist/Hoist.lean"
FIXED = f"{LAB_DIR}/fixed/hoist.md"
TCB_TABLE = f"{LAB_DIR}/stage12/tcb.md"
CARDS = {"CL-9.1": ("claims/cl-9-1.yaml", "LAB-9.2"), "CL-9.2": ("claims/cl-9-2.yaml", "LAB-9.10"), "CL-9.3": ("claims/cl-9-3.yaml", "LAB-9.11")}
STATEMENTS = {"CL-9.1": f"{LAB_DIR}/challenge/Challenge/S9A.lean", "CL-9.2": f"{LAB_DIR}/challenge/Challenge/S9B.lean"}
TCB_STATUSES = ("proved", "validated", "tested", "trusted")
# SP-9.1's class is amt <= bal < 2 * amt: from (bal, 0), transfer amt 0 1 commits in the source and the hoisted code aborts.
HOIST_PROBES = (("minimal", 1, 1), ("non-minimal", 7, 4))


def _latest_receipts(root: Path) -> dict[str, tuple[str, dict[str, Any]]]:
    found: dict[str, tuple[str, dict[str, Any]]] = {}
    for path in sorted((root / "receipts").glob("LAB-9.*/*.json")):
        try:
            receipt = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        stage = receipt.get("stage")
        if isinstance(stage, str) and receipt.get("lab") == "LAB-9":
            if stage not in found or str(receipt.get("createdAt", "")) > str(found[stage][1].get("createdAt", "")):
                found[stage] = (path.relative_to(root).as_posix(), receipt)
    return found


def _card(ctx: CheckContext, template: str, tc: _Toolchain | None) -> str | None:
    import yaml  # pyright: ignore[reportMissingModuleSource]

    from statespace.receipt import verify_file
    from statespace.schema.statement_hash import statement_hash_file
    from statespace.schema.validation import validate

    rel, stage = CARDS[template]
    text = ctx.text(rel)
    if any("TODO(you)" in line for line in text.splitlines() if not line.lstrip().startswith("#")):
        return f"{rel} still has fields marked TODO(you)"
    try:
        card = yaml.safe_load(text)
    except yaml.YAMLError as error:
        return f"{rel} is not YAML: {str(error).splitlines()[0]}"
    issues = validate("claim", card)
    if issues:
        return f"{rel} is not a claim@1 card: {issues[0]['instancePath'] or '/'} {issues[0]['message']}"
    if card.get("template") != template:
        return f"{rel} names template {card.get('template')}, not {template}"
    if "[P]" in str(card["requirement"].get("text", "")):
        return f"{rel}: requirement-fit is never [P]; say in words how the claim serves the requirement"
    method = card["method"]
    receipt_rel = method.get("receipt")
    if receipt_rel and ctx.path(receipt_rel).is_dir():
        newest = _latest_receipts(ctx.root).get(stage)
        receipt_rel = newest[0] if newest and newest[0].startswith(receipt_rel.rstrip("/") + "/") else None
    if not receipt_rel or not ctx.path(receipt_rel).is_file():
        return f"{rel}: method.receipt {method.get('receipt')} is not a receipt of {stage} in your repository"
    verification = verify_file(ctx.path(receipt_rel), root=ctx.root)
    if not verification.ok:
        problem = next((f.message for f in verification.findings if f.level == "fail"), "rejected")
        return f"{rel}: its receipt {receipt_rel} does not verify: {problem}"
    receipt = json.loads(ctx.text(receipt_rel))
    if receipt.get("stage") != stage:
        return f"{rel}: its receipt is of {receipt.get('stage')}, not {stage}"
    if not all(c.get("pass") for c in receipt.get("checks", [])):
        return f"{rel}: its receipt has a failing check"
    if not any(c.get("template") == template for c in receipt.get("claims", [])):
        return f"{rel}: its receipt mints no {template}"
    engines = {(str(r.get("engine")), str(r.get("version"))) for r in receipt.get("runs", [])}
    if (str(method.get("tool", "")).lower(), str(method.get("version", ""))) not in engines:
        shown = ", ".join(sorted(f"{e} {v}" for e, v in engines)) or "no runs"
        return f"{rel}: method says {method.get('tool')} {method.get('version')}, and the receipt's runs are {shown}"
    statement = (card.get("statement") or {}).get("path")
    if template in STATEMENTS:
        if statement != STATEMENTS[template]:
            return f"{rel} pins {statement}, not {STATEMENTS[template]}"
        pinned = {s.get("path"): s.get("sha256") for s in receipt.get("statements", [])}
        if pinned.get(statement) != statement_hash_file(ctx.path(statement)):
            return f"{rel}: {statement} changed after its receipt, so the claim voids to [?]: check {stage} again"
    specimen = card["if_weakened"].get("specimen")
    if not specimen or not ctx.path(specimen).is_file():
        return f"{rel}: if_weakened names no witness file in your repository ({specimen})"
    try:
        witness = json.loads(ctx.text(specimen))
    except ValueError as error:
        return f"{rel}: {specimen} is not JSON ({error})"
    return _replay_weakened(ctx, template, rel, specimen, witness, tc)


def _replay_weakened(ctx: CheckContext, template: str, rel: str, specimen: str, witness: dict[str, Any], tc: _Toolchain | None) -> str | None:
    """Each card's if-weakened witness must refute its own proposition once the assumption is weakened."""
    if template == "CL-9.1":
        lean_file = str(witness.get("lean", ""))
        if not lean_file.startswith(f"{LAB_DIR}/") or not ctx.path(lean_file).is_file() or tc is None:
            return f"{rel}: {specimen} names no Lean file of labs/LAB-9/ to replay ({lean_file or 'none'})"
        rel_file = os.path.relpath(ctx.path(lean_file), ctx.lab_dir)
        done = _run(ctx, [str(tc.lake), "env", str(tc.lean), rel_file], cwd=ctx.lab_dir, step="weakened-cl-9-1", engine="lean", version=tc.short, input_sha=_sha256_file(ctx.path(lean_file)), timeout_s=LEAN_TIMEOUT_S)
        errors = _error_lines(done.output)
        _record(ctx, step="weakened-cl-9-1", engine="lean", version=tc.short, argv=["lake", "env", "lean", rel_file], input_sha=_sha256_file(ctx.path(lean_file)), done=done, lines=errors or ["statespace: no error: the weakened variant elaborated"], verdict="failed" if errors else "passed")
        if not errors:
            return f"{rel}: {lean_file} elaborates, so it does not show that the variant without generalizing stk fails"
        return None
    values = witness.get("values") or {}
    try:
        if template == "CL-9.2":
            bal, amt = int(values["balance"]), int(values["amount"])
            source = _src_run(_transfer(f"transfer {amt} a0 a1")[0], {0: bal, 1: 0})
            silent = _ir_run(SP93_COMPILE(amt), {0: bal, 1: 0})
            if not (source[0] == "aborted" and silent[0] == "committed" and silent[1].get(0, 0) == bal and silent[1].get(1, 0) == 0):
                return f"{rel}: at balance {bal} and amount {amt} the source {source[0]} and the conditional-write compile {silent[0]}: the witness shows no run pair a balances-only observer equates"
            return None
        if template == "CL-9.3":
            accounts = {int(k): int(v) for k, v in (values.get("accounts") or {}).items()}
            frm, to, amt = int(values["from"]), int(values["to"]), int(values["amount"])
            src = source_transfer(accounts, frm, to, amt)
            if src[0] != "committed" or frm == to:
                return f"{rel}: on {specimen}'s instance the source {show_class(src)}, so the wrong-account plan cannot differ there"
            return None
    except (KeyError, TypeError, ValueError) as error:
        return f"{rel}: {specimen} holds no witness that can be replayed ({type(error).__name__}: {error})"
    return None


def SP93_COMPILE(amt: int) -> list[str]:  # noqa: N802 - the specimen's name
    """SP-9.3's compile of transfer amt a0 a1: the funds check turned into conditional writes."""
    return [f"ldi r0 {amt}", "ldi r1 1", "assertGe r0 r1 nonPositive", "read r2 a0", "sub r3 r2 r0", "read r4 a1", "add r5 r4 r0", "writeIf r2 r0 a0 r3", "writeIf r2 r0 a1 r5"]


def c12(ctx: CheckContext) -> CheckResult:
    tc = _toolchain(ctx)
    for rel in (HOIST, FIXED, TCB_TABLE):
        ctx.text(rel)
    if any("TODO(you)" in line for line in ctx.text(FIXED).splitlines()):
        return CheckResult(False, f"{FIXED} still says TODO(you): name the fix that sits beside broken/hoist/", "spec")
    # 1. SP-9.1 replays: your two goldens, and the course's probes of your hoisted compile
    lab = ctx.lab_dir
    done = _run(ctx, [str(tc.lake), "build", "Course.Run"], cwd=lab, step="build", engine="lake", version=tc.short, input_sha=_sha256_file(lab / "lakefile.toml"), timeout_s=LEAN_TIMEOUT_S)
    _record(ctx, step="build", engine="lake", version=tc.short, argv=["lake", "build", "Course.Run"], input_sha=_sha256_file(lab / "lakefile.toml"), done=done, lines=[l.strip() for l in done.output.splitlines() if "Build completed" in l] or _error_lines(done.output), verdict="passed" if done.returncode == 0 else "failed")
    if done.returncode != 0:
        return CheckResult(False, "lake build Course.Run failed: S9/Defs.lean does not build", "implementation", tuple(_error_lines(done.output)[:4]))
    hoist = ctx.text(HOIST)
    probe = ctx.workdir / "hoist.lean"
    lines = [hoist.rstrip(), "", "-- the course's probes (statespace check lab9.12)", "namespace S9.Hoist", ""]
    marks: dict[int, str] = {}
    for name, bal, amt in HOIST_PROBES:
        marks[len(lines) + 1] = f"{name}: the source commits"
        lines.append(f"example : (runS (transfer {amt} 0 1) (store [{bal}, 0])).view 2 = .inr [{bal - amt}, {amt}] := by decide")
        marks[len(lines) + 1] = f"{name}: the hoisted code aborts with insufficient"
        lines.append(f"example : ((compileHoist (transfer {amt} 0 1)).map fun p => (runT p zeroRegs (store [{bal}, 0])).view 2) = some (.inl .insufficient) := by decide")
    lines += ["", "#print axioms sp91_minimal", "#print axioms sp91_nonminimal", "", "end S9.Hoist", ""]
    probe.write_text("\n".join(lines), encoding="utf-8")
    rel_probe = os.path.relpath(probe, lab)
    done = _run(ctx, [str(tc.lake), "env", str(tc.lean), rel_probe], cwd=lab, step="hoist", engine="lean", version=tc.short, input_sha=_sha256_file(probe), timeout_s=LEAN_TIMEOUT_S)
    failed = sorted({marks.get(int(m.group(1)), f"line {m.group(1)}") for m in re.finditer(r"hoist\.lean:(\d+):\d+: error", done.output)})
    axioms = {m.group(1).split(".")[-1]: m.group(2) for m in re.finditer(r"'([^']+)' depends on axioms: \[(.*)\]", done.output)}
    axioms.update({m.group(1).split(".")[-1]: "" for m in re.finditer(r"'([^']+)' does not depend on any axioms", done.output)})
    goldens_ok = all(n in axioms and "sorryAx" not in axioms[n] and "_native" not in axioms[n] for n in ("sp91_minimal", "sp91_nonminimal"))
    verdict_lines = [f"{label}: {'fails' if label in failed else 'decide closes it'}" for label in marks.values()] + [f"{n}: axioms [{axioms[n]}]" for n in ("sp91_minimal", "sp91_nonminimal") if n in axioms]
    _record(ctx, step="hoist", engine="lean", version=tc.short, argv=["lake", "env", "lean", rel_probe], input_sha=_sha256_file(probe), done=done, lines=verdict_lines, verdict="passed" if not failed and goldens_ok and done.returncode == 0 else "failed")
    if done.returncode != 0 and not failed:
        return CheckResult(False, f"{HOIST} does not elaborate", "implementation", tuple(_error_lines(done.output)[:4]))
    if failed:
        return CheckResult(False, f"SP-9.1 does not replay on your hoisted compile: {'; '.join(failed)}", "implementation", ("hoist the debit above the guard's read: the guard then tests the debited balance",))
    if not goldens_ok:
        return CheckResult(False, f"{HOIST} needs two goldens closed by decide, sp91_minimal and sp91_nonminimal, with no sorry", "proof", tuple(f"{n}: {axioms.get(n, 'not found')}" for n in ("sp91_minimal", "sp91_nonminimal")))
    # 2. the trusted base: every component has a status
    rows = [[cell.strip() for cell in line.strip().strip("|").split("|")] for line in ctx.text(TCB_TABLE).splitlines() if line.strip().startswith("|")]
    rows = [r for r in rows if len(r) >= 2 and not set(r[0]) <= set("-: ") and r[0].lower() != "component"]
    if len(rows) < 6:
        return CheckResult(False, f"{TCB_TABLE} lists {len(rows)} components; the trusted base of S9.L9 has more", "spec")
    unset = [r[0] for r in rows if r[1].lower() not in TCB_STATUSES]
    if unset:
        return CheckResult(False, f"{len(unset)} component{'s' if len(unset) != 1 else ''} of {TCB_TABLE} {'have' if len(unset) != 1 else 'has'} no status: {', '.join(unset[:4])}", "spec", ("a status is proved, validated, tested or trusted",))
    for r in rows:
        ctx.tcb(r[0], r[1].lower())
    # 3. the three claim cards
    for template, stmt in STATEMENTS.items():
        ctx.statement(stmt, "lean-challenge")
    for template in CARDS:
        ctx.statement(CARDS[template][0], "yaml")
        problem = _card(ctx, template, tc)
        if problem is not None:
            return CheckResult(False, problem, "spec")
    for template in CARDS:
        ctx.claim(template)
    return CheckResult(True, f"SP-9.1 replays at (1, 0) with amount 1 and at (7, 0) with amount 4; your two goldens close by decide; {len(rows)} components each have a status; CL-9.1 to CL-9.3 pass claim@1 validation")


# --------------------------------------------------------------------------------------------- the lab

_lean_stage(2, "S9A", "Solution.S9A", ("S9A.exec_append", "S9A.exec_comp"))
_lean_stage(3, "S9IR", "Solution.S9IR", ("S9.exec_deterministic",), manual=False)
_lean_stage(4, "S9B", "Solution.Adequacy", ("S9.obs_sees_aborts", "S9.obs_sees_errors", "S9.obs_sees_balances", "S9.R_init", "S9.R_obs"), manual=False)
_lean_stage(5, "S9B", "Solution.Expr", ("S9.compE_correct",))
_lean_stage(6, "S9B", "Solution.Move", ("S9.move_sim",))
_lean_stage(7, "S9B", "Solution.Require", ("S9.require_sim",))
_lean_stage(8, "S9B", "Solution.Seq", ("S9.exec_append", "S9.seq_commit"))
_lean_stage(9, "S9B", "Solution.Abort", ("S9.seq_abort", "S9.abort_sim", "S9.skip_sim"))
_lean_stage(10, "S9B", "Solution.Assembled", ("S9.seq_sim", "S9.compile_correct", "S9.compile_complete", "S9.preservation"))


def _cl91(ctx: CheckContext) -> None:
    ctx.tcb("the stack-machine port of HOL-IMP (Course/Stack.lean), as the model", "trusted")


def _stage(n: int, title: str, label: str, run: Any, claims: tuple[str, ...] = ()) -> Stage:
    return Stage(f"LAB-9.{n}", title, (CheckSpec(f"LAB-9.c{n}", label, run),), claims=claims)


LAB = Lab(
    "LAB-9",
    "Compiler, preservation proof and SQL validator",
    stages=(
        _stage(1, "Run the reference translation validator on transfer 30 1 2", "Both verdicts reproduce", c1),
        _stage(2, "Prove exec_append and exec_comp for the stack machine", "The comparator accepts both theorems", _lean(2, claim="CL-9.1", after=_cl91), claims=("CL-9.1",)),
        _stage(3, "The IR's semantics, the move and require clauses, and determinism", "The goldens pass and the determinism lemma is accepted", _lean(3, before=_goldens_before)),
        _stage(4, "Choose the observations and the matching relation", "The adequacy theorems are accepted", _lean(4)),
        _stage(5, "The expression lemma", "The comparator accepts the expression lemma", _lean(5)),
        _stage(6, "The posting case", "The posting case is accepted and CL-9.2 is minted", _lean(6, claim="CL-9.2", after=_cl92(6)), claims=("CL-9.2",)),
        _stage(7, "The guard case, a failing guard included", "The guard case is accepted", _lean(7, claim="CL-9.2", after=_cl92(7)), claims=("CL-9.2",)),
        _stage(8, "The sequence case", "The append law and the commit branch are accepted", _lean(8, claim="CL-9.2", after=_cl92(8)), claims=("CL-9.2",)),
        _stage(9, "The abort case, aborts observable", "The abort cases are accepted", _lean(9, claim="CL-9.2", after=_cl92(9)), claims=("CL-9.2",)),
        _stage(10, "Assemble the theorem", "The assembled theorem is accepted", _lean(10, claim="CL-9.2", after=_cl92(10)), claims=("CL-9.2",)),
        _stage(11, "A SQL validator on generated plans", "Wrong plans are rejected, honest plans are accepted, and every rejection replays", c11, claims=("CL-9.3",)),
        _stage(12, "Keep the bad optimization, draw the trusted base, write the cards", "The specimen replays and the cards pass", c12, claims=("CL-9.1", "CL-9.2", "CL-9.3")),
    ),
)

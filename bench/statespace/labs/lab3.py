"""LAB-3, mini-plinth-core (curriculum/S03-semantics.md section 4; content/stages/S3/lab.yaml).

You build Mini-Plinth's semantics in Lean against a reference you may not import, and check it with
kernel-checked goldens: theorems `typecheck c = r` and `exec p c s = r`, closed by `decide`, whose right-hand
sides the course computed from the reference (`MiniPlinthRef`) and kernel-checked before the pool shipped.
Then you prove the step invariant against the pinned statements in `labs/LAB-3/challenge/`, keep the
`force move` counterexample in `broken/`, record your edge-case decisions and export your semantics as IR@1.
LAB-3.8 to LAB-3.11 grade your Rust front end and interpreter against the same goldens.

Every Lean check runs the real toolchain: `lake build` on a scratch copy of `labs/LAB-3/` with the check's
generated modules beside your own, `#print axioms` for each theorem the check names, and `lake comparator`
for the proof stages. A verdict is read from Lean's own lines, never from an exit code (labs/README.md
section 8). The sandbox of `lake comparator` is recorded, never required: when bubblewrap cannot start, the
check says so and writes no receipt, unless you chose to run without it with STATESPACE_SANDBOX=off, which
every receipt then records as `sandbox: off` (labs/README.md section 4.4).

Nothing here runs at import time. The renderer below turns IR@1 values into Lean terms; the course's golden
build (labs/reference/mini-plinth/build_goldens.py) uses the same functions, so a golden's text in your
repository is the text the course kernel-checked.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-3"
POOL = "labs/LAB-3/challenge/goldens.json"
PERMITTED = ("propext", "Quot.sound", "Classical.choice")

# --------------------------------------------------------------------------------------------- IR -> Lean


def lean_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def lean_int(v: Any) -> str:
    n = int(v)
    return str(n) if n >= 0 else f"({n})"


def r_acct(a: dict[str, Any]) -> str:
    tag = a["tag"]
    if tag == "mint":
        return ".mint"
    if tag == "sink":
        return ".sink"
    if tag == "user":
        return f"(.user {lean_str(a['name'])})"
    if tag == "escrow":
        return f"(.escrow {int(a['hold'])})"
    raise ValueError(f"not an account: {a!r}")


def r_val(v: dict[str, Any]) -> str:
    tag = v["tag"]
    if tag == "acct":
        return f"(.acct {r_acct(v['acct'])})"
    if tag == "int":
        return f"(.int {lean_int(v['value'])})"
    if tag == "bool":
        return f"(.bool {'true' if v['value'] else 'false'})"
    if tag == "hold":
        return f"(.hold {int(v['hold'])})"
    raise ValueError(f"not a value: {v!r}")


def r_expr(e: dict[str, Any]) -> str:
    tag = e["tag"]
    if tag == "lit":
        return f"(.lit {lean_int(e['value'])})"
    if tag == "var":
        return f"(.var {lean_str(e['name'])})"
    if tag in ("balance", "frozen"):
        return f"(.{tag} {r_expr(e['e'])})"
    if tag in ("add", "sub", "ge", "eq", "and"):
        return f"(.{tag} {r_expr(e['a'])} {r_expr(e['b'])})"
    if tag == "not":
        return f"(.not {r_expr(e['a'])})"
    raise ValueError(f"not an expression: {e!r}")


def r_rop(r: dict[str, Any]) -> str:
    tag = r["tag"]
    if tag == "deposit":
        return f"(.deposit {r_expr(r['amount'])} {r_expr(r['to'])})"
    if tag == "move":
        return f"(.move {r_expr(r['amount'])} {r_expr(r['from'])} {r_expr(r['to'])})"
    if tag == "hold":
        return f"(.hold {r_expr(r['amount'])} {r_expr(r['on'])})"
    if tag == "capture":
        return f"(.capture {r_expr(r['hold'])} {r_expr(r['to'])})"
    if tag == "release":
        return f"(.release {r_expr(r['hold'])})"
    raise ValueError(f"not an operation: {r!r}")


def r_stmt(s: dict[str, Any]) -> str:
    tag = s["tag"]
    if tag == "op":
        return f"(.op {r_rop(s['op'])})"
    if tag == "set":
        return f"(.set {lean_str(s['field'])} {r_expr(s['target'])} {r_expr(s['value'])})"
    if tag == "forceMove":
        return f"(.forceMove {r_expr(s['amount'])} {r_expr(s['from'])} {r_expr(s['to'])})"
    raise ValueError(f"not a statement: {s!r}")


def r_cmd(c: dict[str, Any], *, stmt: Any = None) -> str:
    params = ", ".join(f"({lean_str(p['name'])}, .{p['ty']})" for p in c["params"])
    body = (stmt or r_stmt)(c["body"])
    return f"⟨{lean_str(c['name'])}, [{params}], {r_expr(c['guard'])}, {body}⟩"


def r_program(p: dict[str, Any]) -> str:
    return "[" + ",\n  ".join(r_cmd(c) for c in p["commands"]) + "]"


def r_status(s: str) -> str:
    return "." + s


def r_amount(v: Any) -> str:
    return f"⟨{lean_int(v)}, by decide⟩"


def r_state(s: dict[str, Any]) -> str:
    bals = ", ".join(f"({r_acct(b['acct'])}, {lean_int(b['bal'])})" for b in s["bals"])
    holds = ", ".join(f"({int(h['id'])}, ⟨{r_acct(h['owner'])}, {r_amount(h['amount'])}, {r_status(h['status'])}⟩)" for h in s.get("holds", []))
    frozen = ", ".join(r_acct(a) for a in s.get("frozen", []))
    return f"{{ bals := [{bals}], holds := [{holds}], nextHold := {int(s.get('nextHold', 0))}, frozen := [{frozen}] }}"


def r_call(c: dict[str, Any]) -> str:
    return f"⟨{lean_str(c['name'])}, [{', '.join(r_val(v) for v in c['args'])}]⟩"


def r_err(e: dict[str, Any]) -> str:
    tag = e["tag"]
    if tag in ("unknownCommand", "guardFailed"):
        return f"(.{tag} {lean_str(e['name'])})"
    if tag == "badArgument":
        return f"(.badArgument {lean_str(e['param'])})"
    if tag in ("unknownAccount", "overflow"):
        return f"(.{tag} {r_acct(e['acct'])})"
    if tag in ("unknownHold", "holdNotOpen"):
        return f"(.{tag} {int(e['hold'])})"
    if tag in ("selfTransfer", "typeError", "outOfFuel"):
        return f".{tag}"
    raise ValueError(f"not an error: {e!r}")


def r_effect(e: dict[str, Any]) -> str:
    return f"(.notify {r_acct(e['acct'])})"


def r_outcome(o: dict[str, Any]) -> str:
    if "ok" in o:
        ok = o["ok"]
        output = ", ".join(str(int(h)) for h in ok["output"])
        effects = ", ".join(r_effect(e) for e in ok["effects"])
        return f".ok ({r_state(ok['state'])}, [{output}], [{effects}])"
    return f".error {r_err(o['error'])}"


def r_type_outcome(o: dict[str, Any]) -> str:
    return ".ok ()" if "ok" in o else f".error .{o['error']}"


def r_policy(p: dict[str, Any]) -> str:
    return f"⟨.{p['zero']}, .{p['self']}, .{p['guard']}, .{p['overflow']['mode']}⟩"


def policy_key(p: dict[str, Any]) -> str:
    return f"{p['zero']}/{p['self']}/{p['guard']}/{p['overflow']['mode']}"


def eval_golden_statement(g: dict[str, Any], *, evaluator: str, program: str) -> str:
    """The statement of an evaluator golden: `exec p c s = r`. `evaluator` is `exec` for yours and
    `execWith <policy>` for the reference."""
    return f"{evaluator} {program} {r_call(g['call'])}\n    {r_state(g['pre'])} =\n    {r_outcome(g['outcome'])}"


def typing_golden_statement(g: dict[str, Any], *, checker: str = "typecheck") -> str:
    return f"{checker}\n    {r_cmd(g['command'])} =\n    {r_type_outcome(g['verdict'])}"


def golden_module(pool: dict[str, Any], *, kind: str, header: str, evaluator: str = "exec", program_type: str = "Program",
                  goldens: Sequence[dict[str, Any]] | None = None, namespace: str = "Goldens",
                  cmd_type: str = "Cmd") -> tuple[str, dict[int, str]]:
    """A Lean module with one theorem per golden, closed by `decide`, and `#print axioms` for each.

    Each evaluator golden is a literal, `def g_<id> : GoldenRec`, and a theorem about it,
    `exec refProgram g.call g.pre = g.outcome`, so `lake exe export-ir` reads every right-hand side from the
    literal the kernel checked. `evaluator` is `exec` for yours, or `execWith {policy}` for the reference.
    Returns the text and a map from each theorem's first line to its name, to read Lean's errors back."""
    lines: list[str] = [header.rstrip(), "", f"namespace {namespace}", "open MiniPlinth", ""]
    chosen = list(goldens if goldens is not None else (g for g in pool["goldens"] if g["pool"] == kind))
    if kind == "eval":
        for prog in pool["programs"]:
            if any(g.get("program") == prog["id"] for g in chosen):
                lines.append(f"def {prog['id']} : {program_type} := {r_program(prog)}")
                lines.append("")
    starts: dict[int, str] = {}
    for g in chosen:
        name = g["theorem"]
        if kind == "eval":
            ev = evaluator.replace("{policy}", r_policy(g["policy"]))
            d = f"g_{name}"
            lines.append(f"def {d} : GoldenRec :=\n  ⟨{lean_str(g['id'])}, {lean_str(name)}, {lean_str(g['program'])}, {r_call(g['call'])},\n   {r_state(g['pre'])},\n   {r_outcome(g['outcome'])}⟩")
            starts[len(lines) + 1] = name
            lines.append(f"theorem {name} : {ev} {g['program']} {d}.call {d}.pre = {d}.outcome := by\n  decide")
        else:
            d = f"c_{name}"
            lines.append(f"def {d} : {cmd_type} :=\n  {r_cmd(g['command'])}")
            starts[len(lines) + 1] = name
            lines.append(f"theorem {name} : {evaluator} {d} = {r_type_outcome(g['verdict'])} := by\n  decide")
        lines.append("")
    for g in chosen:
        lines.append(f"#print axioms {g['theorem']}")
    if kind == "eval":
        lines.append("")
        lines.append("/-- The goldens' literals, in pool order, for `lake exe export-ir`. -/")
        lines.append("def goldenData : List GoldenRec := [" + ", ".join(f"g_{g['theorem']}" for g in chosen) + "]")
    lines.append("")
    lines.append(f"end {namespace}")
    text = "\n".join(lines) + "\n"
    # Line numbers of the theorems, counted on the final text.
    starts = {}
    for i, line in enumerate(text.split("\n"), start=1):
        m = re.match(r"theorem (\S+) :", line)
        if m:
            starts[i] = m.group(1)
    return text, starts


def golden_hash(statement: str) -> str:
    """statement-hash@1 of a golden's statement text."""
    from statespace.schema.statement_hash import statement_hash_text

    return statement_hash_text(statement)


def golden_statement_text(g: dict[str, Any]) -> str:
    if g["pool"] == "eval":
        return eval_golden_statement(g, evaluator="exec", program=g["program"])
    return typing_golden_statement(g)


# ------------------------------------------------------------------------------------------- the pool

# The pool's statement hash, pinned: labs/reference/mini-plinth/build_goldens.py printed it when it wrote
# challenge/goldens.json, after the kernel accepted every golden against the reference with no axioms.
POOL_SHA256 = "9c50f63c6c0a7635c4950d3cacb61cf95bd81b418785c1aaaccb6e111b56c445"


def load_pool(ctx: CheckContext) -> dict[str, Any]:
    from statespace.schema.statement_hash import statement_hash_text

    text = ctx.text(POOL)
    if statement_hash_text(text) != POOL_SHA256:
        raise InputRefused(f"{POOL} is not the course's golden pool (its hash changed); restore it from the LAB-3 zip")
    return json.loads(text)


def strip_comments(text: str) -> str:
    text = re.sub(r"/-.*?-/", " ", text, flags=re.S)
    return re.sub(r"--[^\n]*", " ", text)


def lean_files(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*.lean") if ".lake" not in p.parts)


# ------------------------------------------------------------------------------------------- Lean

LEAN_ERROR = re.compile(r"^(?P<file>[^\s:][^:\n]*\.lean):(?P<line>\d+):(?P<col>\d+): (?P<sev>error|warning|info)(?:\([^)]*\))?: (?P<msg>.*)$")
LAKE_ERROR = re.compile(r"^(?P<sev>error|warning|info)(?:\([^)]*\))?: (?P<file>[^\s:][^:\n]*\.lean):(?P<line>\d+):(?P<col>\d+): (?P<msg>.*)$")


def is_error_line(line: str) -> bool:
    m = LEAN_ERROR.match(line) or LAKE_ERROR.match(line)
    return (m is not None and m.group("sev") == "error") or line.startswith("error:")
AXIOMS = re.compile(r"^'(?P<name>[^']+)' (?:does not depend on any axioms|depends on axioms: \[(?P<ax>[^\]]*)\])\s*$")
NO_VERDICT = ("failed to reduce", "maximum recursion depth", "deterministic timeout", "heartbeats", "(kernel) deep recursion")


class Message:
    def __init__(self, file: str, line: int, sev: str, text: str) -> None:
        self.file, self.line, self.sev, self.text = file, line, sev, text

    @property
    def first(self) -> str:
        return self.text.split("\n", 1)[0]


def read_messages(output: str) -> tuple[list[Message], dict[str, list[str]]]:
    """Lean's messages, each with its continuation lines, and the axioms `#print axioms` listed per theorem."""
    messages: list[Message] = []
    axioms: dict[str, list[str]] = {}
    current: Message | None = None
    for raw in output.splitlines():
        m = LEAN_ERROR.match(raw) or LAKE_ERROR.match(raw)
        a = AXIOMS.match(re.sub(r"^(?:info: )?(?:[^\s:]+\.lean:\d+:\d+: )?(?:info: )?", "", raw))
        if a is not None:
            axioms[a.group("name")] = [x.strip() for x in (a.group("ax") or "").split(",") if x.strip()]
            current = None
            continue
        if m is not None:
            current = Message(m.group("file"), int(m.group("line")), m.group("sev"), m.group("msg"))
            messages.append(current)
            continue
        if current is not None and (raw.startswith(" ") or raw == "" or not re.match(r"^(✔|✖|⚠|trace:|Some required|Build completed|error:|warning:|info:|- )", raw)):
            current.text += "\n" + raw
        else:
            current = None
    return messages, axioms


def verdict_lines(output: str, root: Path | None = None, limit: int = 400) -> list[str]:
    keep = []
    for raw in output.splitlines():
        line = raw.rstrip()
        if root is not None:
            line = line.replace(str(root) + "/", "").replace(str(root), ".")
        if is_error_line(line) or AXIOMS.match(line) \
                or line.startswith(("error:", "bwrap:")) or "Your solution is okay!" in line or "kernel accepts" in line or "kernel rejects" in line \
                or line.startswith("Build completed successfully") or "does not match" in line:
            keep.append(line)
    if len(keep) > limit:
        keep = keep[:limit] + [f"statespace: {len(keep) - limit} more verdict lines are in the run's log"]
    return keep


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def tree_sha(root: Path, rels: Iterable[str]) -> str:
    """One hash over a set of files: each repository path and its bytes, in path order."""
    h = hashlib.sha256()
    for rel in sorted(set(rels)):
        p = root / rel
        if p.is_file():
            h.update(rel.encode() + b"\0" + p.read_bytes() + b"\0")
    return h.hexdigest()


class LeanSession:
    """The stage's Lean toolchain: a scratch copy of labs/LAB-3, every run recorded in the receipt, and the
    receipt's `lean` section. The runner reads `receipt_tools`, `receipt_section` and `sandbox`."""

    SECTION = "lean"

    def __init__(self, ctx: CheckContext) -> None:
        self.ctx = ctx
        lake = shutil.which("lake")
        lean = shutil.which("lean")
        if lake is None or lean is None:
            raise ToolUnavailable("Lean is not installed here (no lake on PATH): open the repository in the devcontainer, or install Lean 4.35.0 with elan (labs/TOOLS.md)")
        from statespace.check import proc

        self.proc = proc
        done = proc.run([lean, "--version"], cwd=ctx.root, timeout_s=60)
        self.lean_version_line = done.output.strip().splitlines()[0] if done.output.strip() else ""
        m = re.search(r"version ([0-9][^,\s]*)", self.lean_version_line)
        if done.returncode != 0 or m is None:
            raise ToolUnavailable(f"lean --version did not run: {done.output.strip()[:200] or done.error}")
        self.lean_version = m.group(1)
        prefix = proc.run([lean, "--print-prefix"], cwd=ctx.lab_dir, timeout_s=60).output.strip().splitlines()
        base = Path(prefix[-1]) if prefix else None
        lake_line = proc.run([lake, "--version"], cwd=ctx.lab_dir, timeout_s=60).output.strip().splitlines()
        self.lake_version_line = lake_line[0] if lake_line else "unknown"
        self.tools: list[dict[str, Any]] = []
        for name, version in (("lean", self.lean_version_line), ("lake", self.lake_version_line)):
            binary = base / "bin" / name if base is not None else None
            if binary is not None and binary.is_file():
                self.tools.append({"name": name, "version": version, "sha256": sha256_file(binary)})
        self.choice = (os.environ.get("STATESPACE_SANDBOX") or "").strip().lower()
        self.sandbox: tuple[str, str | None] = ("off", None)
        self._project: Path | None = None
        self.theorems: dict[str, list[str]] = {}
        self.checkers: list[dict[str, str]] = []
        self.lints: list[str] = []
        self.automation: dict[str, bool] = {}
        self.statement_check: str | None = None
        self.challenge: str | None = None
        self.goldens = GoldenSession()
        self.used = False

    # -- the scratch project
    def project(self) -> Path:
        if self._project is None:
            scratch = Path(tempfile.mkdtemp(prefix="statespace-lab3-"))
            import atexit

            atexit.register(shutil.rmtree, scratch, True)
            proj = scratch / "LAB-3"
            shutil.copytree(self.ctx.lab_dir, proj, ignore=shutil.ignore_patterns("target", "__pycache__", "rust"), symlinks=False)
            self._project = proj
        return self._project

    def write(self, rel: str, text: str) -> None:
        path = self.project() / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    # -- one run
    def run(self, step: str, argv: list[str], *, inputs: Iterable[str] = (), timeout_s: float = 900.0, engine: str | None = None) -> tuple[str, int | None]:
        proj = self.project()
        self.used = True
        done = self.proc.run(argv, cwd=proj, timeout_s=timeout_s, env={**os.environ, "LEAN_ABORT_ON_PANIC": "1"})
        out = done.output.replace(str(proj) + "/", "").replace(str(proj), ".")
        self.ctx.workdir.mkdir(parents=True, exist_ok=True)
        (self.ctx.workdir / f"{step}.log").write_text(out, encoding="utf-8")
        lines = verdict_lines(out)
        if done.timed_out:
            lines.append(f"statespace: {argv[0]} was stopped after {int(timeout_s)} s with no verdict")
        if not lines:
            lines = [f"statespace: {' '.join(argv[:2])} printed no verdict line (exit {done.returncode})"]
        verdict = self.derive(step, lines, done.returncode)
        rels = list(inputs) or [p.relative_to(proj).as_posix() for p in lean_files(proj)]
        self.ctx.runs.append({
            "step": step,
            "engine": engine or ("lake" if Path(argv[0]).name == "lake" else "lean"),
            "version": self.lean_version,
            "argv": [Path(argv[0]).name, *argv[1:]],
            "inputSha256": tree_sha(proj, rels),
            "budget": {},
            "exitCode": done.returncode if done.returncode is not None else -1,
            "verdictLines": lines,
            "verdict": verdict,
            "ms": done.ms,
        })
        return out, done.returncode

    @staticmethod
    def derive(step: str, lines: list[str], rc: int | None) -> str:
        if any(line.startswith("statespace:") and "no verdict" in line for line in lines):
            return "error"
        if any(line.startswith("bwrap:") for line in lines):
            return "error"
        if step.startswith("comparator"):
            return "accepted" if any("Your solution is okay!" in line for line in lines) else "rejected"
        errors = [line for line in lines if is_error_line(line)]
        axioms = [line for line in lines if AXIOMS.match(line)]
        if errors:
            return "rejected"
        if any("depends on axioms" in line for line in axioms):
            return "rejected" if any("sorryAx" in line or "_native" in line or "ofReduceBool" in line for line in axioms) else "accepted"
        return "accepted"

    def build(self, step: str, targets: list[str]) -> tuple[bool, list[Message], str]:
        out, rc = self.run(step, ["lake", "build", *targets])
        messages, _ = read_messages(out)
        errors = [m for m in messages if m.sev == "error"]
        return (rc == 0 and not errors), errors, out

    def elaborate(self, step: str, rel: str) -> tuple[list[Message], dict[str, list[str]], str]:
        out, _rc = self.run(step, ["lake", "env", "lean", rel], engine="lean")
        messages, axioms = read_messages(out)
        self.theorems.update(axioms)
        return [m for m in messages if m.sev == "error"], axioms, out

    def comparator(self, step: str, config: dict[str, Any]) -> tuple[bool, list[str], str]:
        """`lake comparator` against the frozen challenge. Raises ToolUnavailable when the sandbox cannot
        start, because nothing was judged."""
        name = f"comparator-{step}.json"
        self.write(name, json.dumps(config, indent=2) + "\n")
        argv = ["lake", "comparator", "--config", name]
        if self.choice == "off":
            argv.append("--inadvisably-no-sandbox")
            self.sandbox = ("off", None)
        out, _rc = self.run(f"comparator-{step}", argv)
        bwrap = next((line for line in out.splitlines() if line.startswith("bwrap:")), None)
        if bwrap is not None:
            self.sandbox = ("failed", bwrap)
            raise ToolUnavailable(
                f"lake comparator's sandbox could not start, so nothing was judged ({bwrap.strip()}). `statespace doctor` says what blocks it; "
                "or choose to run without it, once and on purpose: STATESPACE_SANDBOX=off statespace check ... (every receipt then records sandbox: off)"
            )
        if self.choice != "off":
            self.sandbox = ("on", None)
        ok = "Your solution is okay!" in out
        lines = [line for line in verdict_lines(out) if "does not match" in line or line.startswith("error:") or "kernel" in line]
        for checker in re.findall(r"^(.*?) kernel (accepts|rejects) the solution", out, flags=re.M):
            row = {"name": checker[0].strip() or "Lean", "version": self.lean_version, "verdict": checker[1]}
            if row not in self.checkers:
                self.checkers.append(row)
        return ok, lines, out

    # -- the receipt
    def receipt_tools(self) -> list[dict[str, Any]]:
        return self.tools if self.used else []

    def receipt_section(self) -> dict[str, Any] | None:
        if not self.used:
            return None
        toolchain = (self.ctx.lab_dir / "lean-toolchain").read_text().strip() if (self.ctx.lab_dir / "lean-toolchain").is_file() else f"leanprover/lean4:v{self.lean_version}"
        section: dict[str, Any] = {
            "toolchain": toolchain,
            "permittedAxioms": list(PERMITTED),
            "checkers": self.checkers or [{"name": "Lean", "version": self.lean_version, "verdict": "not-run"}],
            "theorems": [{"name": n, "axioms": a} for n, a in sorted(self.theorems.items())],
            "nativeAxioms": sorted({a for ax in self.theorems.values() for a in ax if "_native" in a or "ofReduceBool" in a}),
            "sorryCount": sum(1 for ax in self.theorems.values() if "sorryAx" in ax),
        }
        if self.challenge is not None:
            section["challengeSha"] = self.challenge
        if self.automation:
            section["automation"] = dict(self.automation)
        if self.statement_check is not None:
            section["statementCheck"] = self.statement_check
        if self.goldens.n:
            section["goldens"] = {"count": self.goldens.n, "kernelChecked": self.goldens.passed == self.goldens.n}
        if self.lints:
            section["lints"] = list(self.lints)
        return section


class GoldenSession:
    """The receipt's `goldens` section: the pool's hash and the counts of the goldens this stage built."""

    SECTION = "goldens"

    def __init__(self) -> None:
        self.n = self.passed = self.failed = self.no_verdict = 0

    def add(self, passed: int, failed: int, no_verdict: int) -> None:
        self.n += passed + failed + no_verdict
        self.passed += passed
        self.failed += failed
        self.no_verdict += no_verdict

    def receipt_tools(self) -> list[dict[str, Any]]:
        return []

    def receipt_section(self) -> dict[str, Any] | None:
        if not self.n:
            return None
        return {"poolSha": POOL_SHA256, "n": self.n, "passed": self.passed, "failed": self.failed, "noVerdict": self.no_verdict}


def lean(ctx: CheckContext) -> LeanSession:
    session = getattr(ctx, "_lab3_lean", None)
    if session is None:
        session = LeanSession(ctx)
        setattr(ctx, "_lab3_lean", session)
        before = ctx.sessions

        def sessions() -> list[Any]:
            return [*before(), session, session.goldens]

        setattr(ctx, "sessions", sessions)
        ctx.tcb(f"Lean {session.lean_version} kernel", "trusted")
    return session


def pin(ctx: CheckContext, *rels: str) -> None:
    for rel in rels:
        ctx.statement(f"{LAB_DIR}/{rel}", "lean-challenge")


def show_errors(errors: Sequence[Message], limit: int = 3) -> tuple[str, ...]:
    out = []
    for m in errors[:limit]:
        out.append(f"{m.file}:{m.line}: {m.first}")
    if len(errors) > limit:
        out.append(f"... and {len(errors) - limit} more; the log is beside the receipt")
    return tuple(out)


def first_build(ctx: CheckContext, s: LeanSession, targets: list[str], what: str) -> CheckResult | None:
    ok, errors, _ = s.build("build", targets)
    if ok:
        return None
    suspect = "implementation"
    return CheckResult(False, f"{what} does not build", suspect, show_errors(errors))


# ------------------------------------------------------------------------------------------- goldens


def judge_goldens(s: LeanSession, starts: dict[int, str], errors: Sequence[Message], axioms: dict[str, list[str]],
                  rel: str) -> tuple[list[str], list[tuple[str, str]], list[tuple[str, str]], list[tuple[str, list[str]]]]:
    """Each golden's verdict: passed, failed (with Lean's line), no verdict (with Lean's line), or built
    with an axiom. A golden that fails to reduce is no verdict, never a pass."""
    lines = sorted(starts)
    owner: dict[str, list[Message]] = {}
    for m in errors:
        if not m.file.endswith(rel.split("/")[-1]):
            continue
        before = [ln for ln in lines if ln <= m.line]
        if before:
            owner.setdefault(starts[before[-1]], []).append(m)
    passed, failed, no_verdict, with_axioms = [], [], [], []
    for name in (starts[ln] for ln in lines):
        msgs = owner.get(name, [])
        if msgs:
            text = msgs[0].text
            if any(k in text for k in NO_VERDICT):
                no_verdict.append((name, msgs[0].first))
            else:
                failed.append((name, " ".join(t.strip() for t in text.splitlines()[:3])))
            continue
        ax = axioms.get(f"Lab3Gen.{name}", axioms.get(name))
        if ax is None:
            no_verdict.append((name, "no #print axioms line: the theorem was not added"))
        elif ax:
            with_axioms.append((name, ax))
        else:
            passed.append(name)
    return passed, failed, no_verdict, with_axioms


def golden_report(kind: str, n: int, passed: list[str], failed: list[tuple[str, str]], no_verdict: list[tuple[str, str]],
                  with_axioms: list[tuple[str, list[str]]], chosen: Sequence[dict[str, Any]]) -> tuple[bool, str, tuple[str, ...]]:
    by_name = {g["theorem"]: g for g in chosen}
    details: list[str] = []
    for name, line in failed[:3]:
        g = by_name.get(name, {})
        if kind == "typing":
            want = r_type_outcome(g.get("verdict", {})) if g else "?"
            details.append(f"{name} ({g.get('note', '')}) expects {want}: {line[:220]}")
        else:
            want = json.dumps(g.get("outcome"), separators=(",", ":"))[:160] if g else "?"
            details.append(f"{name} ({g.get('strata', {}).get('op', '?')}, {g.get('strata', {}).get('class', '?')}): {line[:180]}")
            details.append(f"  expected outcome: {want}")
    for name, line in no_verdict[:2]:
        details.append(f"{name}: no verdict ({line[:160]})")
    for name, ax in with_axioms[:2]:
        details.append(f"{name} uses {', '.join(ax)}: a golden uses no axiom; a match with a wildcard compiles with propext unless the lakefile keeps backward.match.sparseCases = false")
    ok = len(passed) == n and n > 0
    summary = f"{len(passed)} of {n} {kind} goldens built"
    if not ok:
        parts = []
        if failed:
            parts.append(f"{len(failed)} failed")
        if no_verdict:
            parts.append(f"{len(no_verdict)} gave no verdict")
        if with_axioms:
            parts.append(f"{len(with_axioms)} used an axiom")
        summary += "; " + ", ".join(parts)
    return ok, summary, tuple(details)


def run_goldens(ctx: CheckContext, s: LeanSession, pool: dict[str, Any], kind: str, *, policy: dict[str, Any] | None = None,
                step: str | None = None) -> tuple[bool, str, tuple[str, ...]]:
    if kind == "typing":
        chosen = [g for g in pool["goldens"] if g["pool"] == "typing"]
        text, starts = golden_module(pool, kind="typing", header="import Lab3.Typing\nopen Lab3", evaluator="Lab3.typecheck",
                                     goldens=chosen, namespace="Lab3Gen", cmd_type="Lab3.Cmd")
        rel = "Lab3Gen/Typing.lean"
    else:
        assert policy is not None
        key = policy_key(policy)
        chosen = [g for g in pool["goldens"] if g["pool"] == "eval" and policy_key(g["policy"]) == key]
        text, starts = golden_module(pool, kind="eval", header="import Lab3.Eval\nopen Lab3", evaluator="Lab3.exec", program_type="Lab3.Program",
                                     goldens=chosen, namespace="Lab3Gen", cmd_type="Lab3.Cmd")
        rel = "Lab3Gen/Goldens.lean"
    s.write(rel, text)
    (ctx.workdir).mkdir(parents=True, exist_ok=True)
    (ctx.workdir / Path(rel).name).write_text(text, encoding="utf-8")
    errors, axioms, _ = s.elaborate(step or f"goldens-{kind}", rel)
    passed, failed, no_verdict, with_axioms = judge_goldens(s, starts, errors, axioms, rel)
    s.goldens.add(len(passed), len(failed) + len(with_axioms), len(no_verdict))
    return golden_report(kind, len(chosen), passed, failed, no_verdict, with_axioms, chosen)


def read_policy(ctx: CheckContext, s: LeanSession) -> dict[str, Any]:
    s.build("build-ir", ["MiniPlinth.IR"])
    s.write("Lab3Gen/Policy.lean", "import MiniPlinth.IR\nimport Lab3.Eval\n#eval IO.println (\"policy \" ++ (MiniPlinth.IR.policy Lab3.policy).compress)\n")
    errors, _, out = s.elaborate("policy", "Lab3Gen/Policy.lean")
    line = next((ln for ln in out.splitlines() if ln.startswith("policy {")), None)
    if errors or line is None:
        raise InputRefused("Lab3.policy could not be read: " + (errors[0].first if errors else "Lean printed nothing for it"))
    return json.loads(line[len("policy "):])


def show_policy(p: dict[str, Any]) -> str:
    return f"zero {p['zero']} · self {p['self']} · guard {p['guard']} · overflow {p['overflow']['mode']}"


FORBIDDEN = ("implemented_by", "extern", "partial", "unsafe", "native_decide")


def lint_semantics(ctx: CheckContext) -> list[str]:
    found = []
    for path in lean_files(ctx.lab_dir / "Lab3"):
        rel = path.relative_to(ctx.root).as_posix()
        text = strip_comments(ctx.text(rel))
        for word in FORBIDDEN:
            if re.search(rf"(?<![\w.]){re.escape(word)}(?![\w])", text):
                found.append(f"{rel}: `{word}`")
        if re.search(r"^\s*import\s+MiniPlinthRef", text, flags=re.M):
            found.append(f"{rel}: imports MiniPlinthRef, the reference")
        if re.search(r"set_option\s+autoImplicit\s+true", text):
            found.append(f"{rel}: turns autoImplicit on")
    return found


# ------------------------------------------------------------------------------------------- the checks

CORE = ("MiniPlinth/Core.lean",)


def c1(ctx: CheckContext) -> CheckResult:
    """LAB-3.1: golden_transfer_ok, your prediction of the reference's outcome, accepted with no axioms."""
    s = lean(ctx)
    pin(ctx, *CORE, "reference/MiniPlinthRef/Programs.lean")
    text = ctx.text(f"{LAB_DIR}/Start.lean")
    if not re.search(r"theorem\s+golden_transfer_ok\s*:\s*exec\s+refProgram\s+transferCall\s+s0\s*=", text):
        return CheckResult(False, "Start.lean no longer states golden_transfer_ok as `exec refProgram transferCall s0 = ...`", "spec",
                           ("only the right-hand side is yours to write",))
    bad = first_build(ctx, s, ["MiniPlinthRef"], "the reference (reference/MiniPlinthRef)")
    if bad is not None:
        return CheckResult(False, bad.message, "tool", bad.details)
    s.write("Start.lean", text.rstrip() + "\n\n#print axioms golden_transfer_ok\n")
    errors, axioms, _ = s.elaborate("golden", "Start.lean")
    s.statement_check = "goldens"
    if errors:
        m = errors[0]
        no_verdict = any(k in m.text for k in NO_VERDICT)
        s.goldens.add(0, 0 if no_verdict else 1, 1 if no_verdict else 0)
        if "is false" in m.text:
            return CheckResult(False, "the kernel computed both sides, and your prediction is not what the reference returns", "spec",
                               (f"Start.lean:{m.line}: {m.first}", "read the outcome order in reference/MiniPlinthRef/Eval.lean, then predict again"))
        return CheckResult(False, "golden_transfer_ok gave no verdict" if no_verdict else "golden_transfer_ok does not elaborate", "spec",
                           show_errors(errors))
    ax = axioms.get("golden_transfer_ok")
    if ax is None:
        s.goldens.add(0, 0, 1)
        return CheckResult(False, "Lean printed no axioms line for golden_transfer_ok", "tool")
    if ax:
        s.goldens.add(0, 1, 0)
        return CheckResult(False, f"golden_transfer_ok depends on {', '.join(ax)}; a golden closed by decide uses no axiom", "proof")
    s.goldens.add(1, 0, 0)
    return CheckResult(True, f"the kernel accepted golden_transfer_ok with no axioms (Lean {s.lean_version}): your prediction is the reference's outcome")


def c2(ctx: CheckContext) -> CheckResult:
    """LAB-3.2: the signature file builds, autoImplicit stays off, and every typing golden builds."""
    s = lean(ctx)
    pool = load_pool(ctx)
    pin(ctx, *CORE, "challenge/Lab3Challenge/Signature.lean")
    lakefile = ctx.text(f"{LAB_DIR}/lakefile.toml")
    if not re.search(r"^autoImplicit\s*=\s*false\s*$", lakefile, flags=re.M):
        return CheckResult(False, "lakefile.toml no longer sets autoImplicit = false", "spec")
    lints = [x for x in lint_semantics(ctx) if "autoImplicit" in x]
    if lints:
        return CheckResult(False, "autoImplicit is turned on in your semantics", "spec", tuple(lints))
    bad = first_build(ctx, s, ["Lab3.Eval"], "your semantics (Lab3/)")
    if bad is not None:
        return bad
    errors, _, _ = s.elaborate("signature", "challenge/Lab3Challenge/Signature.lean")
    if errors:
        missing = [m for m in errors if "Unknown" in m.first or "unknown" in m.first]
        return CheckResult(False, f"the signature file does not build against your semantics: {len(errors)} line{'s' if len(errors) != 1 else ''} fail",
                           "implementation", show_errors(missing or errors, 5))
    ok, summary, details = run_goldens(ctx, s, pool, "typing")
    n_rules = len({g["verdict"].get("error", "accept") for g in pool["goldens"] if g["pool"] == "typing"})
    if not ok:
        return CheckResult(False, summary, "implementation", details)
    return CheckResult(True, f"{summary} with no axioms, covering an accepted command and all {n_rules - 1} rules; the signature file builds")


def c3(ctx: CheckContext) -> CheckResult:
    """LAB-3.3: the lint, then every evaluator golden under your policy."""
    s = lean(ctx)
    pool = load_pool(ctx)
    pin(ctx, *CORE, "challenge/Lab3Challenge/Signature.lean")
    found = lint_semantics(ctx)
    s.lints.extend(found)
    if found:
        return CheckResult(False, "the lint found what a golden cannot be trusted over", "implementation", tuple(found[:6]))
    bad = first_build(ctx, s, ["Lab3.Eval"], "your semantics (Lab3/)")
    if bad is not None:
        return bad
    policy = read_policy(ctx, s)
    ctx.ext["lab3"] = {**ctx.ext.get("lab3", {}), "policy": policy,
                       "sourceSha": tree_sha(ctx.root, [p.relative_to(ctx.root).as_posix() for p in lean_files(ctx.lab_dir / "Lab3")])}
    ok, summary, details = run_goldens(ctx, s, pool, "eval", policy=policy)
    s.statement_check = s.statement_check or "goldens"
    if not ok:
        return CheckResult(False, f"{summary}, under your policy ({show_policy(policy)})", "implementation", details)
    return CheckResult(True, f"{summary} with no axioms, under your policy ({show_policy(policy)}); the lint is clean")


OP_LEMMAS = ("post_inv", "deposit_inv", "move_inv", "hold_inv", "capture_inv", "release_inv")
STEP_LEMMAS = ("covers_sound", "step_preserves_inv")


def theorem_bodies(text: str, names: Iterable[str]) -> dict[str, str]:
    out = {}
    for name in names:
        m = re.search(rf"^theorem\s+{re.escape(name)}\b(.*?)(?=^theorem\s|^end\s|\Z)", text, flags=re.S | re.M)
        if m:
            out[name] = m.group(1)
    return out


def prove(ctx: CheckContext, names: Sequence[str], *, manual: bool, stage: str) -> CheckResult:
    s = lean(ctx)
    pin(ctx, *CORE, "challenge/Lab3Challenge/Defs.lean", "challenge/Lab3Challenge/Statements.lean")
    from statespace.schema.statement_hash import statement_hash_text

    s.challenge = statement_hash_text(ctx.text(f"{LAB_DIR}/challenge/Lab3Challenge/Statements.lean"))
    proofs = strip_comments(ctx.text(f"{LAB_DIR}/Lab3/Proofs.lean"))
    bodies = theorem_bodies(proofs, names)
    flags = {"manualMode": manual,
             "grind": any(re.search(r"\bgrind\b", b) for b in bodies.values()),
             "omega": any(re.search(r"\bomega\b", b) for b in bodies.values()),
             "decide": any(re.search(r"\bdecide\b", b) for b in bodies.values())}
    s.automation = {k: s.automation.get(k, False) or v for k, v in flags.items()}
    bad = first_build(ctx, s, ["Lab3.Proofs"], "Lab3/Proofs.lean")
    if bad is not None:
        return CheckResult(False, bad.message, "proof", bad.details)
    s.write("Lab3Gen/Axioms.lean", "import Lab3.Proofs\n" + "".join(f"#print axioms Lab3.{n}\n" for n in names))
    s.elaborate(f"axioms-{stage}", "Lab3Gen/Axioms.lean")
    ok, lines, _ = s.comparator(stage, {"challenge_module": "Lab3Challenge.Statements", "solution_module": "Lab3.Proofs",
                                       "theorem_names": [f"Lab3.{n}" for n in names], "permitted_axioms": list(PERMITTED)})
    s.statement_check = "comparator"
    sorried = [n for n in names if "sorryAx" in s.theorems.get(f"Lab3.{n}", [])]
    outside = [f"{n}: {a}" for n in names for a in s.theorems.get(f"Lab3.{n}", []) if a not in PERMITTED and a != "sorryAx"]
    if sorried:
        return CheckResult(False, f"{len(sorried)} of {len(names)} theorems still use sorry: {', '.join(sorried)}", "proof",
                           ("a sorry builds with exit code 0; the axioms line shows sorryAx",))
    if outside:
        return CheckResult(False, "a theorem uses an axiom outside propext, Quot.sound and Classical.choice", "proof", tuple(outside[:4]))
    if not ok:
        mismatch = [ln for ln in lines if "do not match" in ln or "does not match" in ln]
        return CheckResult(False, "comparator rejected the solution" + (": a statement is not the pinned one" if mismatch else ""),
                           "spec" if mismatch else "proof", tuple((mismatch or lines)[:4]))
    if manual and flags["grind"]:
        used = [n for n, b in bodies.items() if re.search(r"\bgrind\b", b)]
        return CheckResult(False, f"manual mode: grind closes {', '.join(used)}; prove the case analysis yourself (omega is allowed)", "proof")
    return CheckResult(True, f"comparator accepted {', '.join(names)} against the pinned statements, axioms within {', '.join(PERMITTED)}"
                       + (f"; sandbox {s.sandbox[0]}" if s.sandbox[0] != "on" else ""))


def c4(ctx: CheckContext) -> CheckResult:
    return prove(ctx, OP_LEMMAS, manual=True, stage="ops")


def c5(ctx: CheckContext) -> CheckResult:
    result = prove(ctx, STEP_LEMMAS, manual=True, stage="step")
    if not result.passed:
        return result
    golden = c3(ctx)
    if not golden.passed:
        return CheckResult(False, "comparator accepted the step theorem, but your evaluator's goldens fail at the same source: " + golden.message,
                           "implementation", golden.details)
    ctx.claim("CL-3.3")
    src = ctx.ext.get("lab3", {}).get("sourceSha", "")
    return CheckResult(True, f"{result.message}; and on the same receipt, at source {src[:12]}, {golden.message}")


def pinned_check_module(statements: str, imports: str, names: Sequence[str]) -> str:
    """The pinned statements, each restated as `theorem pinned_<name> : <pinned statement> := Lab3.<name>`:
    it elaborates only when your theorem's type is the pinned statement, over your definitions."""
    body = re.sub(r"^import .*\n", "", statements, flags=re.M)
    for name in names:
        pattern = re.compile(rf"theorem\s+{re.escape(name)}\b(.*?):=\s*by\s*\n\s*sorry", re.S)
        body = pattern.sub(lambda m, n=name: f"theorem pinned_{n}{m.group(1)}:= Lab3.{n}", body, count=1)
    return imports + "\n" + body


def c6(ctx: CheckContext) -> CheckResult:
    s = lean(ctx)
    pin(ctx, *CORE, "challenge/Lab3Challenge/ForceSyntax.lean", "challenge/Lab3Challenge/ForceDefs.lean", "challenge/Lab3Challenge/ForceStatements.lean")
    bad = first_build(ctx, s, ["Lab3Broken.Cex"], "broken/ (Lab3Broken)")
    if bad is not None:
        return CheckResult(False, bad.message, "proof", bad.details)
    names = ("force_typechecks", "cex_force")
    statements = ctx.text(f"{LAB_DIR}/challenge/Lab3Challenge/ForceStatements.lean")
    s.write("Lab3Gen/ForceCheck.lean", pinned_check_module(statements, "import Lab3Broken.Cex", names)
            + "".join(f"#print axioms Lab3.{n}\n" for n in names))
    errors, _, _ = s.elaborate("statements-force", "Lab3Gen/ForceCheck.lean")
    s.statement_check = "weak"
    s.lints.append("LAB-3.6: the statements were matched in-process (pinned text := your theorem), not by lake comparator, whose export replay "
                   "cannot reduce decide over String equality in Lean 4.35.0 (RUN-lean-unsafe-cmd)")
    sorried = [n for n in names if "sorryAx" in s.theorems.get(f"Lab3.{n}", [])]
    if sorried:
        return CheckResult(False, f"{', '.join(sorried)} still use{'s' if len(sorried) == 1 else ''} sorry", "proof")
    if errors:
        return CheckResult(False, "a theorem in broken/ does not prove its pinned statement", "spec", show_errors(errors))
    outside = [f"{n}: {a}" for n in names for a in s.theorems.get(f"Lab3.{n}", []) if a not in PERMITTED]
    if outside:
        return CheckResult(False, "a theorem in broken/ uses an axiom outside the permitted list", "proof", tuple(outside))
    fixed = prove(ctx, STEP_LEMMAS, manual=False, stage="fixed")
    if not fixed.passed:
        return CheckResult(False, "the counterexample is kernel-checked, but your fixed semantics (Lab3/) no longer passes LAB-3.c5: " + fixed.message,
                           fixed.suspect, fixed.details)
    return CheckResult(True, "in broken/, forcePay type-checks and cex_force, the negation of the step theorem, proves its pinned statement with "
                       + (", ".join(sorted({a for n in names for a in s.theorems.get(f"Lab3.{n}", [])})) or "no axioms")
                       + "; Lab3/ still proves step_preserves_inv, accepted by comparator")


DECISIONS = (("zero", "zero.md"), ("self", "self-transfer.md"), ("guard", "failed-guard.md"), ("overflow", "overflow.md"))
SECTIONS = ("Decision", "Alternative considered", "Consequence", "Downstream")


def read_record(text: str) -> tuple[dict[str, str], str | None]:
    sections: dict[str, str] = {}
    current = None
    for line in text.splitlines():
        h = re.match(r"^#{1,6}\s+(.*?)\s*$", line)
        if h:
            current = h.group(1).strip()
            sections[current] = ""
        elif current is not None:
            sections[current] += line + "\n"
    choice = re.search(r"^\s*choice:\s*`?([A-Za-z]+)`?\s*$", text, flags=re.M)
    return sections, choice.group(1) if choice else None


def c7(ctx: CheckContext) -> CheckResult:
    s = lean(ctx)
    pool = load_pool(ctx)
    pin(ctx, *CORE)
    bad = first_build(ctx, s, ["Lab3.Eval"], "your semantics (Lab3/)")
    if bad is not None:
        return bad
    policy = read_policy(ctx, s)
    problems: list[str] = []
    for field, name in DECISIONS:
        rel = f"decisions/{name}"
        if not ctx.path(rel).is_file():
            problems.append(f"{rel} is missing")
            continue
        text = ctx.text(rel)
        sections, choice = read_record(text)
        for want in SECTIONS:
            body = next((v for k, v in sections.items() if k.lower() == want.lower()), None)
            if body is None:
                problems.append(f"{rel}: no \"{want}\" section")
            elif not body.strip() or "TODO(you)" in body:
                problems.append(f"{rel}: the \"{want}\" section is not written yet")
        declared = policy[field]["mode"] if field == "overflow" else policy[field]
        if choice is None:
            problems.append(f"{rel}: no `choice:` line")
        elif choice != declared:
            problems.append(f"{rel}: choice: {choice}, but Lab3.policy has {field} = {declared}")
    if problems:
        return CheckResult(False, f"{len(problems)} problem{'s' if len(problems) != 1 else ''} in your decision records", "spec", tuple(problems[:6]))
    key = policy_key(policy)
    chosen = [g for g in pool["goldens"] if g["pool"] == "eval" and policy_key(g["policy"]) == key]
    text, _ = golden_module(pool, kind="eval", header="import Lab3.Eval\nopen Lab3", evaluator="Lab3.exec", program_type="Lab3.Program",
                            goldens=chosen, namespace="Lab3Gen", cmd_type="Lab3.Cmd")
    s.write("Lab3Gen/Goldens.lean", text)
    ok, errors, _ = s.build("build-export", ["export-ir"])
    if not ok:
        return CheckResult(False, "lake build export-ir fails: the golden module or your Lab3/Export.lean does not build", "implementation", show_errors(errors))
    out, rc = s.run("export-ir", ["lake", "exe", "export-ir"])
    line = next((ln for ln in out.splitlines() if ln.startswith("{")), None)
    try:
        doc = json.loads(line or "")
    except ValueError:
        return CheckResult(False, f"lake exe export-ir printed no JSON (exit {rc})", "implementation")
    (ctx.workdir / "export-ir.json").write_text(json.dumps(doc, indent=1) + "\n", encoding="utf-8")
    from statespace.schema.validation import validate

    issues = validate("ir", doc)
    if issues:
        return CheckResult(False, f"the export does not validate against IR@1: {len(issues)} issue{'s' if len(issues) != 1 else ''}", "implementation",
                           tuple(f"{i['instancePath'] or '/'}: {i['message'][:160]}" for i in issues[:4]))
    want = next(p for p in pool["programs"] if p["id"] == "refProgram")
    got = next((p for p in doc.get("programs", []) if p.get("id") == "refProgram"), None)
    if got is None or canonical(got.get("commands")) != canonical(want["commands"]):
        diff = ""
        if got is not None:
            for a, b in zip(got.get("commands", []), want["commands"]):
                if canonical(a) != canonical(b):
                    diff = f"first difference in command {b['name']}: yours {canonical(a)[:120]} · the course's {canonical(b)[:120]}"
                    break
        return CheckResult(False, "your export of the reference program is not the course's", "implementation", (diff,) if diff else ())
    exported = {g.get("theorem"): g for g in doc.get("goldens", [])}
    off = [g["theorem"] for g in chosen if canonical(exported.get(g["theorem"], {}).get("outcome")) != canonical(g["outcome"])]
    if off or len(exported) != len(chosen):
        return CheckResult(False, f"{len(off)} exported goldens differ from the pool's literals", "tool", tuple(off[:4]))
    return CheckResult(True, f"four decision records match Lab3.policy ({show_policy(policy)}); the export validates against IR@1, "
                       f"with the reference program as the course's and {len(chosen)} golden right-hand sides from the golden module's literals")


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)



# ------------------------------------------------------------------------------------------- Rust (LAB-3.8 to LAB-3.11)

RUST_DIR = "labs/LAB-3/rust"


class RustSession:
    """The stage's cargo: one release build of labs/LAB-3/rust into a scratch target directory, and the `mp3`
    driver run on batches of JSON requests. Every run is recorded in the receipt."""

    SECTION = "rust"

    def __init__(self, ctx: CheckContext) -> None:
        self.ctx = ctx
        cargo = shutil.which("cargo")
        if cargo is None:
            raise ToolUnavailable("cargo is not installed here: open the repository in the devcontainer, or install the pinned Rust toolchain (labs/TOOLS.md)")
        from statespace.check import proc

        self.proc = proc
        self.cargo = cargo
        line = proc.run([cargo, "--version"], cwd=ctx.root, timeout_s=60).output.strip().splitlines()
        self.cargo_version = line[0] if line else "cargo"
        rustc = shutil.which("rustc")
        rline = proc.run([rustc, "--version"], cwd=ctx.root, timeout_s=60).output.strip().splitlines() if rustc else []
        self.rustc_version = rline[0] if rline else "rustc"
        m = re.search(r"(\d+\.\d+\.\d+)", self.rustc_version)
        self.version = m.group(1) if m else self.rustc_version
        self.tools = []
        for name, path, version in (("cargo", cargo, self.cargo_version), ("rustc", rustc, self.rustc_version)):
            if path:
                real = Path(os.path.realpath(path))
                self.tools.append({"name": name, "version": version, "sha256": sha256_file(real)})
        self.target = Path(tempfile.mkdtemp(prefix="statespace-lab3-target-"))
        import atexit

        atexit.register(shutil.rmtree, self.target, True)
        self.binary: Path | None = None
        self.sandbox = ("off", None)
        self.used = False

    def sources(self) -> list[str]:
        root = self.ctx.path(RUST_DIR)
        return sorted(p.relative_to(self.ctx.root).as_posix() for p in root.rglob("*") if p.is_file() and "target" not in p.parts)

    def build(self) -> CheckResult | None:
        if self.binary is not None:
            return None
        self.used = True
        if not self.ctx.path(f"{RUST_DIR}/Cargo.toml").is_file():
            raise InputRefused(f"{RUST_DIR}/Cargo.toml is not in your lab repository")
        argv = [self.cargo, "build", "--release", "--offline", "--manifest-path", f"{RUST_DIR}/Cargo.toml", "--target-dir", str(self.target)]
        done = self.proc.run(argv, cwd=self.ctx.root, timeout_s=900)
        out = done.output.replace(str(self.target), "<target>")
        self.ctx.workdir.mkdir(parents=True, exist_ok=True)
        (self.ctx.workdir / "cargo-build.log").write_text(out, encoding="utf-8")
        errors = [ln for ln in out.splitlines() if ln.startswith("error")]
        ok = done.returncode == 0 and (self.target / "release" / "mp3").is_file()
        lines = errors[:40] or ([ln for ln in out.splitlines() if ln.strip().startswith("Finished")] or [f"statespace: cargo build exited {done.returncode}"])
        self.ctx.runs.append({"step": "cargo-build", "engine": "cargo", "version": self.version,
                              "argv": ["cargo", *argv[1:-1], "<target>"], "inputSha256": tree_sha(self.ctx.root, self.sources()),
                              "budget": {}, "exitCode": done.returncode if done.returncode is not None else -1,
                              "verdictLines": lines, "verdict": "passed" if ok else "failed", "ms": done.ms})
        if not ok:
            return CheckResult(False, "your crate does not build: cargo build --release --offline failed", "implementation", tuple(errors[:4]))
        self.binary = self.target / "release" / "mp3"
        return None

    def ask(self, step: str, requests: list[dict[str, Any]], seed: int | None = None) -> dict[str, dict[str, Any]]:
        """Run the driver on a batch of requests; returns each answer by request id."""
        assert self.binary is not None
        text = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in requests)
        (self.ctx.workdir / f"{step}.requests.jsonl").write_text(text, encoding="utf-8")
        done = self.proc.run([str(self.binary)], cwd=self.ctx.root, timeout_s=300, stdin=text.encode("utf-8"))
        (self.ctx.workdir / f"{step}.answers.jsonl").write_text(done.output, encoding="utf-8")
        answers: dict[str, dict[str, Any]] = {}
        for line in done.output.splitlines():
            try:
                a = json.loads(line)
            except ValueError:
                continue
            if isinstance(a, dict) and "id" in a:
                answers[str(a["id"])] = a
        faults = sum(1 for a in answers.values() if "fault" in a)
        missing = len(requests) - len(answers)
        verdict = "passed" if not faults and not missing and done.returncode == 0 else "failed"
        budget = {"seed": seed} if seed is not None else {}
        self.ctx.runs.append({"step": step, "engine": "mp3", "version": self.version, "argv": ["target/release/mp3"],
                              "inputSha256": hashlib.sha256(text.encode("utf-8")).hexdigest(), "budget": budget,
                              "exitCode": done.returncode if done.returncode is not None else -1,
                              "verdictLines": [f"statespace: {len(requests)} requests, {len(answers)} answers, {faults} faults"],
                              "verdict": verdict, "ms": done.ms})
        return answers

    def receipt_tools(self) -> list[dict[str, Any]]:
        return self.tools if self.used else []

    def receipt_section(self) -> None:
        return None


def rust(ctx: CheckContext) -> RustSession:
    session = getattr(ctx, "_lab3_rust", None)
    if session is None:
        session = RustSession(ctx)
        setattr(ctx, "_lab3_rust", session)
        before = ctx.sessions

        def sessions() -> list[Any]:
            return [*before(), session]

        setattr(ctx, "sessions", sessions)
        ctx.tcb(f"rustc {session.version}", "trusted")
    return session


def goldens_of(ctx: CheckContext) -> GoldenSession:
    session = getattr(ctx, "_lab3_goldens", None)
    lean_session = getattr(ctx, "_lab3_lean", None)
    if lean_session is not None:
        return lean_session.goldens
    if session is None:
        session = GoldenSession()
        setattr(ctx, "_lab3_goldens", session)
        before = ctx.sessions
        setattr(ctx, "sessions", lambda: [*before(), session])
    return session


def c8(ctx: CheckContext) -> CheckResult:
    pool = load_pool(ctx)
    r = rust(ctx)
    bad = r.build()
    if bad is not None:
        return bad
    corpus = ctx.path(f"{LAB_DIR}/corpus")
    requests, expected = [], {}
    for f in sorted((corpus / "pos").glob("*.mp")):
        rel = f.relative_to(ctx.root).as_posix()
        requests.append({"op": "parse", "id": f"pos/{f.name}", "text": ctx.text(rel)})
        expected[f"pos/{f.name}"] = ("pos", json.loads(ctx.text(rel[:-3] + ".json")))
    for f in sorted((corpus / "neg").glob("*.mp")):
        rel = f.relative_to(ctx.root).as_posix()
        text = ctx.text(rel)
        m = re.match(r"-- expect: line (\d+)", text)
        requests.append({"op": "parse", "id": f"neg/{f.name}", "text": text})
        expected[f"neg/{f.name}"] = ("neg", int(m.group(1)) if m else None)
    answers = r.ask("parse-corpus", requests)
    problems = []
    for rid, (kind, want) in expected.items():
        a = answers.get(rid, {})
        if "fault" in a or not a:
            problems.append(f"{rid}: {a.get('fault', 'no answer')}")
        elif kind == "pos":
            if "ok" not in a:
                e = a.get("error", {})
                problems.append(f"{rid}: rejected at line {e.get('line')}, column {e.get('column')}: {e.get('message', '')[:120]}")
            elif canonical(a["ok"].get("commands")) != canonical(want["commands"]):
                got = a["ok"].get("commands", [])
                which = next((w["name"] for g, w in zip(got, want["commands"]) if canonical(g) != canonical(w)), "the list of commands")
                problems.append(f"{rid}: the IR differs from the course's at {which}")
        else:
            if "ok" in a:
                problems.append(f"{rid}: accepted; it should be rejected")
            elif want is not None and a.get("error", {}).get("line") != want:
                problems.append(f"{rid}: rejected at line {a['error'].get('line')}, but the error is on line {want}")
            elif not isinstance(a.get("error", {}).get("column"), int) or a["error"]["column"] < 1:
                problems.append(f"{rid}: the error names no column")
    n_pos = sum(1 for k in expected.values() if k[0] == "pos")
    n_neg = len(expected) - n_pos
    ref = answers.get("pos/reference.mp", {})
    lean_equal = "ok" in ref and canonical(ref["ok"].get("commands")) == canonical(pool["programs"][0]["commands"])
    if problems or not lean_equal:
        return CheckResult(False, f"{len(problems)} of {len(expected)} corpus files are not read as they should be", "implementation",
                           tuple(problems[:6]) + (() if lean_equal else ("reference.mp does not give the Lean export of refProgram",)))
    return CheckResult(True, f"all {n_pos} positive files parse to the course's IR, the roadmap's text verbatim included and reference.mp equal to the Lean export; "
                       f"all {n_neg} negative files are rejected at their line, with a column")


def sample(ctx: CheckContext, items: list[dict[str, Any]], key: Any, n: int) -> list[dict[str, Any]]:
    """At least one item of every stratum, then more drawn by the grade-time seed, up to n."""
    strata: dict[Any, list[dict[str, Any]]] = {}
    for g in items:
        strata.setdefault(key(g), []).append(g)
    chosen = [ctx.rng.choice(group) for _k, group in sorted(strata.items(), key=lambda kv: str(kv[0]))]
    rest = [g for g in items if g not in chosen]
    ctx.rng.shuffle(rest)
    chosen += rest[: max(0, n - len(chosen))]
    return chosen


def c9(ctx: CheckContext) -> CheckResult:
    pool = load_pool(ctx)
    r = rust(ctx)
    bad = r.build()
    if bad is not None:
        return bad
    typing = [g for g in pool["goldens"] if g["pool"] == "typing"]
    chosen = sample(ctx, typing, lambda g: g["verdict"].get("error", "accept"), 24)
    answers = r.ask("typecheck-goldens", [{"op": "typecheck", "id": g["theorem"], "command": g["command"]} for g in chosen], seed=ctx.seed)
    wrong = [(g, answers.get(g["theorem"], {})) for g in chosen if canonical(answers.get(g["theorem"], {}).get("verdict")) != canonical(g["verdict"])]
    goldens_of(ctx).add(len(chosen) - len(wrong), len(wrong), 0)
    if wrong:
        details = tuple(f"{g['theorem']} ({g['note']}): the golden says {g['verdict'].get('error', 'accept')}, yours "
                        f"{a.get('verdict', {}).get('error', 'accept') if 'verdict' in a else a.get('fault', 'no answer')}" for g, a in wrong[:5])
        return CheckResult(False, f"{len(wrong)} of {len(chosen)} sampled typing goldens disagree (seed {ctx.seed})", "implementation", details)
    rules = sorted({g["verdict"].get("error", "accept") for g in chosen})
    return CheckResult(True, f"n = {len(chosen)} typing goldens sampled by seed {ctx.seed}, every verdict equal to the golden's ({', '.join(rules)})")


def learner_policy(ctx: CheckContext) -> dict[str, Any]:
    s = lean(ctx)
    bad = first_build(ctx, s, ["Lab3.Eval"], "your semantics (Lab3/)")
    if bad is not None:
        raise InputRefused("your policy is read from Lab3.policy, and Lab3/ does not build: " + bad.message)
    return read_policy(ctx, s)


def c10(ctx: CheckContext) -> CheckResult:
    pool = load_pool(ctx)
    r = rust(ctx)
    bad = r.build()
    if bad is not None:
        return bad
    policy = learner_policy(ctx)
    key = policy_key(policy)
    programs = {p["id"]: {"commands": p["commands"]} for p in pool["programs"]}
    evals = [g for g in pool["goldens"] if g["pool"] == "eval" and policy_key(g["policy"]) == key]
    chosen = sample(ctx, evals, lambda g: (g["strata"]["op"], g["strata"]["class"], g["strata"]["boundary"]), 48)
    reqs = [{"op": "exec", "id": g["theorem"], "policy": g["policy"], "program": programs[g["program"]], "call": g["call"], "pre": g["pre"]} for g in chosen]
    answers = r.ask("exec-goldens", reqs, seed=ctx.seed)
    wrong = [(g, answers.get(g["theorem"], {})) for g in chosen if canonical(answers.get(g["theorem"], {}).get("outcome")) != canonical(g["outcome"])]
    goldens_of(ctx).add(len(chosen) - len(wrong), len(wrong), 0)
    counts: dict[str, int] = {}
    for g in chosen:
        k = f"{g['strata']['op']}/{g['strata']['class']}{'/boundary' if g['strata']['boundary'] else ''}"
        counts[k] = counts.get(k, 0) + 1
    shown = " · ".join(f"{k} {v}" for k, v in sorted(counts.items()))
    if wrong:
        details = []
        for g, a in wrong[:4]:
            details.append(f"{g['theorem']} ({g['strata']['op']}, {g['strata']['class']}{', boundary' if g['strata']['boundary'] else ''}):")
            details.append(f"  golden {canonical(g['outcome'])[:150]}")
            details.append(f"  yours  {canonical(a.get('outcome', a.get('fault', 'no answer')))[:150]}")
        return CheckResult(False, f"{len(wrong)} of {len(chosen)} sampled evaluator goldens disagree (seed {ctx.seed}, policy {show_policy(policy)})", "implementation",
                           tuple(details) + (f"strata: {shown}",))
    ctx.claim("CL-3.5")
    return CheckResult(True, f"n = {len(chosen)} evaluator goldens sampled by seed {ctx.seed} under your policy ({show_policy(policy)}), every outcome equal to the golden's; "
                       f"{len(counts)} strata, {sum(1 for g in chosen if g['strata']['boundary'])} with boundary values",
                       details=(f"per stratum: {shown}",))


# -- LAB-3.11: fresh programs, run by your interpreter and by the reference


def fresh_program(rng: Any, i: int) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """A random well-typed command, a state and a call of it."""
    names = ["a", "b", "c", "d"]
    P = rng.choice(["src", "from", "payer", "x"]), rng.choice(["dst", "to", "payee", "y"]), rng.choice(["n", "amount", "k"])
    f, t, n = P

    def v(x: str) -> dict[str, Any]:
        return {"tag": "var", "name": x}

    def ge(a: Any, b: Any) -> dict[str, Any]:
        return {"tag": "ge", "a": a, "b": b}

    cover = ge({"tag": "balance", "e": v(f)}, v(n))
    extra = rng.choice([None, {"tag": "not", "a": {"tag": "frozen", "e": v(f)}}, ge({"tag": "balance", "e": v(t)}, {"tag": "lit", "value": str(rng.randint(0, 50))})])
    guard = cover if extra is None else ({"tag": "and", "a": cover, "b": extra} if rng.random() < 0.5 else {"tag": "and", "a": extra, "b": cover})
    kind = rng.choice(["move", "move", "hold", "deposit", "freeze"])
    users = rng.sample(names, rng.randint(2, 4))
    bals = {u: rng.choice([0, rng.randint(1, 300), rng.randint(1, 300), 9223372036854775807 - rng.randint(0, 3)]) for u in users}
    total = sum(bals.values())
    state = {"bals": [{"acct": {"tag": "mint"}, "bal": str(-total)}] + [{"acct": {"tag": "user", "name": u}, "bal": str(b)} for u, b in bals.items()],
             "holds": [], "nextHold": rng.randint(0, 3), "frozen": [{"tag": "user", "name": u} for u in users if rng.random() < 0.15]}
    pick = lambda: {"tag": "acct", "acct": {"tag": "user", "name": rng.choice(users + ["ghost"] if rng.random() < 0.1 else users)}}
    amt = {"tag": "int", "value": str(rng.choice([0, 1, rng.randint(1, 400), rng.randint(1, 400), 9223372036854775807]))}
    name = f"Fresh{i}"
    if kind == "move":
        cmd = {"name": name, "params": [{"name": f, "ty": "account"}, {"name": t, "ty": "account"}, {"name": n, "ty": "amount"}], "guard": guard,
               "body": {"tag": "op", "op": {"tag": "move", "amount": v(n), "from": v(f), "to": v(t)}}}
        args = [pick(), pick(), amt]
    elif kind == "hold":
        cmd = {"name": name, "params": [{"name": f, "ty": "account"}, {"name": n, "ty": "amount"}], "guard": ge({"tag": "balance", "e": v(f)}, v(n)),
               "body": {"tag": "op", "op": {"tag": "hold", "amount": v(n), "on": v(f)}}}
        args = [pick(), amt]
    elif kind == "deposit":
        cmd = {"name": name, "params": [{"name": t, "ty": "account"}, {"name": n, "ty": "amount"}], "guard": {"tag": "not", "a": {"tag": "frozen", "e": v(t)}},
               "body": {"tag": "op", "op": {"tag": "deposit", "amount": v(n), "to": v(t)}}}
        args = [pick(), amt]
    else:
        cmd = {"name": name, "params": [{"name": f, "ty": "account"}], "guard": {"tag": "not", "a": {"tag": "frozen", "e": v(f)}},
               "body": {"tag": "set", "field": "frozen", "target": v(f), "value": {"tag": "not", "a": {"tag": "frozen", "e": v(f)}}}}
        args = [pick()]
    return {"commands": [cmd]}, state, {"name": name, "args": args}


def c11(ctx: CheckContext) -> CheckResult:
    load_pool(ctx)
    problems = []
    import yaml  # the template's pinned PyYAML

    from statespace.schema.validation import validate

    for template, rel in (("CL-3.3", "claims/cl-3-3.yaml"), ("CL-3.4", "claims/cl-3-4.yaml"), ("CL-3.5", "claims/cl-3-5.yaml")):
        if not ctx.path(rel).is_file():
            problems.append(f"{rel} is missing")
            continue
        text = ctx.statement(rel, "yaml")
        if "TODO(you)" in text:
            problems.append(f"{rel}: a field still says TODO(you)")
        try:
            card = yaml.safe_load(text)
        except yaml.YAMLError as error:
            problems.append(f"{rel} is not YAML: {str(error).splitlines()[0]}")
            continue
        issues = validate("claim", card)
        problems += [f"{rel}: {i['instancePath'] or '/'} {i['message'][:120]}" for i in issues[:3]]
        if isinstance(card, dict):
            if card.get("template") != template:
                problems.append(f"{rel}: template is {card.get('template')}, not {template}")
            receipt = (card.get("method") or {}).get("receipt")
            if receipt and not ctx.path(receipt).exists():
                problems.append(f"{rel}: method.receipt names {receipt}, which is not in your repository")
    if problems:
        return CheckResult(False, f"{len(problems)} problem{'s' if len(problems) != 1 else ''} in your claim cards", "spec", tuple(problems[:6]))
    r = rust(ctx)
    bad = r.build()
    if bad is not None:
        return bad
    policy = learner_policy(ctx)
    s = lean(ctx)
    m = 24
    items = [fresh_program(ctx.rng, i) for i in range(m)]
    lines = ["import MiniPlinthRef", "open MiniPlinth MiniPlinthRef", ""]
    for i, (prog, pre, call) in enumerate(items):
        lines.append(f"#eval IO.println (\"F{i} \" ++ (MiniPlinth.IR.outcome (execWith {r_policy(policy)} {r_program(prog)} {r_call(call)} {r_state(pre)})).compress)")
    s.build("build-reference", ["MiniPlinthRef"])
    s.write("Lab3Gen/Fresh.lean", "\n".join(lines) + "\n")
    _errors, _ax, out = s.elaborate("reference-fresh", "Lab3Gen/Fresh.lean")
    ref = {ln.split(" ", 1)[0][1:]: json.loads(ln.split(" ", 1)[1]) for ln in out.splitlines() if re.match(r"^F\d+ \{", ln)}
    if len(ref) != m:
        raise ToolUnavailable(f"the reference evaluator answered {len(ref)} of {m} fresh programs; its log is beside the receipt")
    answers = r.ask("exec-fresh", [{"op": "exec", "id": str(i), "policy": policy, "program": prog, "call": call, "pre": pre}
                                   for i, (prog, pre, call) in enumerate(items)], seed=ctx.seed)
    stats: dict[str, int] = {}
    triage = []
    for i, (prog, _pre, _call) in enumerate(items):
        want = ref[str(i)]
        a = answers.get(str(i), {})
        cls = want["error"]["tag"] if "error" in want else "ok"
        kind = prog["commands"][0]["body"]["op"]["tag"] if prog["commands"][0]["body"]["tag"] == "op" else "set"
        stats[f"{kind}/{cls}"] = stats.get(f"{kind}/{cls}", 0) + 1
        if canonical(a.get("outcome")) != canonical(want):
            why = "tool" if "fault" in a and "panicked" not in a.get("fault", "") else "implementation"
            triage.append(f"fresh {i} ({kind}): {why} error: the reference says {canonical(want)[:90]}, yours {canonical(a.get('outcome', a.get('fault')))[:90]}")
    shown = " · ".join(f"{k} {v}" for k, v in sorted(stats.items()))
    if triage:
        return CheckResult(False, f"m = {m} fresh programs (seed {ctx.seed}); {len(triage)} disagree with the course's reference, each triaged below", "implementation",
                           tuple(triage[:5]) + (f"generator statistics: {shown}",))
    return CheckResult(True, f"the three claim cards are valid claim@1; m = {m} fresh programs (seed {ctx.seed}) run by your interpreter and the course's "
                       f"reference evaluator, 0 disagreements to triage", details=(f"generator statistics: {shown}",))


def stretch(ctx: CheckContext, name: str, template: str) -> CheckResult:
    s = lean(ctx)
    pin(ctx, *CORE, "reference/MiniPlinthRef/Step.lean", "challenge/Lab3Challenge/Stretch.lean")
    from statespace.schema.statement_hash import statement_hash_text

    s.challenge = statement_hash_text(ctx.text(f"{LAB_DIR}/challenge/Lab3Challenge/Stretch.lean"))
    bad = first_build(ctx, s, ["Lab3Stretch.Safety"], "stretch/Lab3Stretch/Safety.lean")
    if bad is not None:
        return CheckResult(False, bad.message, "proof", bad.details)
    s.write("Lab3Gen/StretchAxioms.lean", f"import Lab3Stretch.Safety\n#print axioms Lab3Stretch.{name}\n")
    s.elaborate(f"axioms-{name}", "Lab3Gen/StretchAxioms.lean")
    ax = s.theorems.get(f"Lab3Stretch.{name}", [])
    if "sorryAx" in ax:
        return CheckResult(False, f"{name} still uses sorry", "proof", ("a sorry builds with exit code 0; the axioms line shows sorryAx",))
    ok, lines, _ = s.comparator(name, {"challenge_module": "Lab3Challenge.Stretch", "solution_module": "Lab3Stretch.Safety",
                                       "theorem_names": [f"Lab3Stretch.{name}"], "permitted_axioms": list(PERMITTED)})
    s.statement_check = "comparator"
    if not ok:
        mismatch = [ln for ln in lines if "match" in ln]
        return CheckResult(False, f"comparator rejected {name}" + (": its statement is not the pinned one" if mismatch else ""),
                           "spec" if mismatch else "proof", tuple((mismatch or lines)[:4]))
    ctx.claim(template)
    return CheckResult(True, f"comparator accepted {name} for the template's small-step relation, axioms {', '.join(ax) or 'none'}"
                       + (f"; sandbox {s.sandbox[0]}" if s.sandbox[0] != "on" else ""))


def c12(ctx: CheckContext) -> CheckResult:
    return stretch(ctx, "progress", "CL-3.1")


def c13(ctx: CheckContext) -> CheckResult:
    return stretch(ctx, "preservation", "CL-3.2")

def not_built(check_id: str):
    def run(ctx: CheckContext) -> CheckResult:
        raise ToolUnavailable(f"{check_id} is not built in this version of statespace yet")

    return run


LAB = Lab(
    "LAB-3",
    "mini-plinth-core",
    stages=(
        Stage("LAB-3.1", "Run the reference evaluator; see a golden pass", (CheckSpec("LAB-3.c1", "One golden passes on the template", c1),)),
        Stage("LAB-3.2", "Your AST, ResourceOp and HasType", (CheckSpec("LAB-3.c2", "Typing goldens build", c2),)),
        Stage("LAB-3.3", "An evaluator whose every failure is a value", (CheckSpec("LAB-3.c3", "Evaluator goldens build", c3),)),
        Stage("LAB-3.4", "Step invariant (a): the per-operation lemmas", (CheckSpec("LAB-3.c4", "The operation lemmas are accepted", c4),)),
        Stage("LAB-3.5", "Step invariant (b): the theorem over every successful step", (CheckSpec("LAB-3.c5", "The step-invariant theorem is accepted", c5),), claims=("CL-3.3",)),
        Stage("LAB-3.6", "The unsafe command, kept in broken/", (CheckSpec("LAB-3.c6", "The counterexample is kernel-checked", c6),)),
        Stage("LAB-3.7", "Decision records and the IR export", (CheckSpec("LAB-3.c7", "Four records and a valid export", c7),)),
        Stage("LAB-3.8", "A Rust parser for the toy syntax", (CheckSpec("LAB-3.c8", "The parser reads the corpus", c8),)),
        Stage("LAB-3.9", "A Rust typechecker that mirrors HasType", (CheckSpec("LAB-3.c9", "The typechecker agrees with the typing goldens", c9),)),
        Stage("LAB-3.10", "A Rust reference interpreter", (CheckSpec("LAB-3.c10", "The interpreter agrees with the evaluator goldens", c10),), claims=("CL-3.5",)),
        Stage("LAB-3.11", "A differential run and claim cards", (CheckSpec("LAB-3.c11", "Claim cards and a triaged differential run", c11),)),
        Stage("LAB-3.12", "Stretch: progress", (CheckSpec("LAB-3.c12", "Progress is accepted", c12),), claims=("CL-3.1",)),
        Stage("LAB-3.13", "Stretch: preservation", (CheckSpec("LAB-3.c13", "Preservation is accepted", c13),), claims=("CL-3.2",)),
    ),
)

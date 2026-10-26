"""The cvc5 lane of the Bench (INS-bench-smt; W3-T22; curriculum/S04-obligations.md section 2.3, LAB-4.8).

It runs one SMT-LIB query per run under a resource limit and reads the verdict from the lines cvc5 prints,
never from the exit code alone: cvc5 exits 0 after printing an ``(error ...)`` line for a ``get-info`` it
cannot answer, as it does after ``unsat`` for ``(get-info :reason-unknown)``.

Its purpose is the cross-check: an ``unsat`` you authored is put to a second solver, and a disagreement is
never overridden (it becomes a specimen candidate). Two solvers agreeing is still uncertified: both can
answer the same wrong question, because the encoding is yours (labs/TOOLS.md section 2.3).

The command, as a receipt records it: ``cvc5 --rlimit=<n> <input>``. The binary is the first ``cvc5`` on
PATH, the Bench's static build, whose ``--version`` line is recorded verbatim in ``tools[]`` with the
SHA-256 of the binary, and ``pinned`` is true when that hash is ``statespace doctor``'s pin.

A script is held to the Z3 lane's rules (``statespace.lanes.z3.check_script``: one question, no echo, no
budget options, no annotation in the question), so the two solvers answer the same question and a check
can put one text through both.

Verdict lines, the grammar this lane writes into ``runs[].verdictLines`` for engine ``cvc5``:

* an answer: exactly ``sat``, ``unsat`` or ``unknown``;
* an error: a line that starts ``(error "``, continued on following lines until one ends ``")``;
* a note from the CLI itself: a line that starts ``statespace: ``.

Other output, such as cvc5's warning that no ``set-logic`` was given, is not a verdict line and is kept
only in the run's log. The verdict is ``error`` when a note is present, when an error line comes before
the answer, or when there is not exactly one answer; otherwise it is the answer.
"""

from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from statespace.check.lanes import Derivation, ToolUnavailable
from statespace.schema.statement_hash import statement_preimage

__all__ = ["ENGINES", "Cvc5Run", "Cvc5Session", "Cvc5Tool", "DEFAULT_RLIMIT", "derive_verdict", "find_cvc5", "verdict_lines"]

ENGINES = ("cvc5",)
ANSWERS = ("sat", "unsat", "unknown")
DEFAULT_RLIMIT = 5_000_000  # a design value [D]; the receipt records whatever rlimit ran
WALL_CLOCK_S = 120.0  # a backstop [D]; a run stopped here has no verdict
CLI_NOTE = "statespace: "
_STEP = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")


def _error_complete(line: str) -> bool:
    return line.rstrip().endswith('")')


def verdict_lines(output: str) -> list[str]:
    """The verdict lines in what cvc5 printed: answers, error blocks and nothing else."""
    out: list[str] = []
    open_error = False
    for raw in output.splitlines():
        line = raw.rstrip("\r")
        if open_error:
            out.append(line)
            open_error = not _error_complete(line)
            continue
        if line in ANSWERS:
            out.append(line)
        elif line.startswith('(error "'):
            out.append(line)
            open_error = not _error_complete(line)
    return out


def derive_verdict(lines: Sequence[str]) -> Derivation:
    """The verdict cvc5's verdict lines carry. An exit code is never an input."""
    answers: list[str] = []
    problems: list[str] = []
    error_before = False
    note = False
    open_error = False
    for line in lines:
        if open_error:
            open_error = not _error_complete(line)
            continue
        if line in ANSWERS:
            answers.append(line)
        elif line.startswith('(error "'):
            if not answers:
                error_before = True
            open_error = not _error_complete(line)
        elif line.startswith(CLI_NOTE):
            note = True
        else:
            problems.append(f"{line!r} is not a cvc5 verdict line")
    if problems:
        return Derivation(None, None, tuple(problems))
    if note or error_before or len(answers) != 1:
        return Derivation("error")
    return Derivation(answers[0])


@dataclass(frozen=True)
class Cvc5Tool:
    name: str
    version: str  # the --version line, verbatim
    short_version: str  # such as 1.4.2
    sha256: str
    pinned: bool
    path: Path

    def receipt_entry(self) -> dict[str, Any]:
        return {"name": self.name, "version": self.version, "sha256": self.sha256, "pinned": self.pinned}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def find_cvc5() -> Cvc5Tool:
    """The first cvc5 on PATH. Raises ToolUnavailable when there is none, or it does not start."""
    found = shutil.which("cvc5")
    if not found:
        raise ToolUnavailable("cvc5 is not installed here; it is on the Bench (the devcontainer), or install cvc5 1.4.2 (labs/TOOLS.md section 2.3)")
    binary = Path(found).resolve()
    try:
        done = subprocess.run([str(binary), "--version"], capture_output=True, text=True, errors="replace", timeout=30, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ToolUnavailable(f"cvc5 did not start: {error}") from error
    line = next((l.strip() for l in (done.stdout + done.stderr).splitlines() if l.strip()), "")
    match = re.match(r"(?:This is )?cvc5 (?:version )?(\S+)", line)
    if done.returncode != 0 or match is None:
        raise ToolUnavailable(f"`cvc5 --version` printed {line!r} with exit code {done.returncode}, not a cvc5 version line")
    sha = _sha256(binary)
    try:
        from statespace.doctor import pin_for

        pin = pin_for("cvc5")
        pinned = bool(pin.sha256) and sha == pin.sha256
    except Exception:  # noqa: BLE001 - no pin known here: the tool is recorded as unpinned
        pinned = False
    return Cvc5Tool("cvc5", line, match.group(1), sha, pinned, binary)


@dataclass(frozen=True)
class Cvc5Run:
    step: str
    version: str
    argv: tuple[str, ...]
    input_path: str
    input_sha256: str
    rlimit: int
    exit_code: int
    timed_out: bool
    output: str
    verdict_lines: tuple[str, ...]
    verdict: str
    ms: int

    def receipt_run(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "engine": "cvc5",
            "version": self.version,
            "argv": list(self.argv),
            "inputSha256": self.input_sha256,
            "budget": {"rlimit": self.rlimit},
            "exitCode": self.exit_code,
            "verdictLines": list(self.verdict_lines),
            "verdict": self.verdict,
            "ms": self.ms,
        }


class Cvc5Session:
    """The cvc5 runs of one lab stage, written beside the receipt and read by their verdict lines."""

    SECTION = "cvc5"  # receipt@1 has no cvc5 block; receipt_section() returns None

    def __init__(self, *, root: Path, workdir: Path, sink: Callable[[dict[str, Any]], None] | None = None, wall_clock_s: float = WALL_CLOCK_S) -> None:
        self.root = root.resolve()
        self.workdir = workdir.resolve()
        if self.root != self.workdir and self.root not in self.workdir.parents:
            raise ValueError("the session's directory must be inside the lab repository")
        self.sink = sink
        self.wall_clock_s = wall_clock_s
        self.runs: list[Cvc5Run] = []
        self._tool: Cvc5Tool | None = None
        self._steps: set[str] = set()

    def tool(self) -> Cvc5Tool:
        if self._tool is None:
            self._tool = find_cvc5()
        return self._tool

    def receipt_tools(self) -> list[dict[str, Any]]:
        return [self._tool.receipt_entry()] if self._tool is not None and self.runs else []

    def receipt_section(self) -> dict[str, Any] | None:
        return None

    def _step(self, step: str) -> str:
        if not _STEP.fullmatch(step):
            raise ValueError(f"step {step!r} is not a local id")
        name, n = step, 1
        while name in self._steps:
            n += 1
            suffix = f"-{n}"
            name = step[: 64 - len(suffix)] + suffix
        self._steps.add(name)
        return name

    def run(self, text: str, *, step: str, rlimit: int = DEFAULT_RLIMIT) -> Cvc5Run:
        """Run one query. Raises ScriptRefused (an InputRefused) for a script that is not one question."""
        from statespace.check import proc
        from statespace.lanes.z3 import check_script

        if type(rlimit) is not int or rlimit <= 0:
            raise ValueError("a cvc5 run needs a positive rlimit")
        data = statement_preimage(text)
        check_script(data.decode("utf-8"))
        tool = self.tool()
        name = self._step(step)
        self.workdir.mkdir(parents=True, exist_ok=True)
        source = self.workdir / f"cvc5-{name}.smt2"  # beside the Z3 run of the same step, never over it
        source.write_bytes(data)
        relative = source.relative_to(self.root).as_posix()
        shown = ["cvc5", f"--rlimit={rlimit}", relative]
        done = proc.run([str(tool.path), *shown[1:]], cwd=self.root, timeout_s=self.wall_clock_s)
        if done.returncode is None:
            raise ToolUnavailable(f"cvc5 did not start: {done.error}")
        lines = verdict_lines(done.output)
        if done.timed_out:
            lines.append(f"{CLI_NOTE}cvc5 gave no answer within {self.wall_clock_s:g} s of wall-clock time and was stopped")
        elif not lines:
            lines.append(f"{CLI_NOTE}cvc5 printed no verdict line (exit code {done.returncode})")
        verdict = derive_verdict(lines).verdict or "error"
        (self.workdir / f"cvc5-{name}.out").write_bytes(done.output.encode("utf-8"))
        result = Cvc5Run(name, tool.short_version, tuple(shown), relative, hashlib.sha256(data).hexdigest(), rlimit, done.returncode, done.timed_out, done.output, tuple(lines), verdict, done.ms)
        self.runs.append(result)
        if self.sink is not None:
            self.sink(result.receipt_run())
        return result

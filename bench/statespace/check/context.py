"""What a check works with: the lab repository, the stage, seeded randomness, the lanes, and the parts of
the receipt it may add to (statements, claims, the trusted base).

A check reads the learner's files through `statement` or `text`, which read them as an engine does, runs
engines through a lane session such as `z3()`, and returns a CheckResult. Every run a lane makes is
recorded in the receipt in the order it ran, with its argv, input hash, budget, exit code and verdict
lines; a check never writes runs itself.
"""

from __future__ import annotations

import random
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Any

from .lanes import InputRefused
from .model import Lab, Stage

if TYPE_CHECKING:
    from statespace.lanes.z3 import Z3Session

__all__ = ["CheckContext"]

STATEMENT_KINDS = ("lean-challenge", "tla", "smt2", "yaml", "sql")
TCB_STATUSES = ("proved", "validated", "tested", "trusted")


class CheckContext:
    """The context of one stage's run. The runner makes one per stage and passes it to every check."""

    def __init__(self, *, root: Path, lab: Lab, stage: Stage, workdir: Path, seed: int, wall_clock_s: float | None = None) -> None:
        self.root = root.resolve()
        self.lab = lab
        self.stage = stage
        self.workdir = workdir  # receipts/<stage>/<receipt name>/: inputs and logs of this stage's runs
        self.seed = seed  # drawn when the check starts; checks that draw parameters record it on their runs
        self.rng = random.Random(seed)
        self.wall_clock_s = wall_clock_s
        self.check_id: str | None = None  # the check that is running
        self.runs: list[dict[str, Any]] = []
        self._z3: Z3Session | None = None
        self._statements: dict[str, str] = {}  # path -> kind
        self._claims: list[tuple[str | None, dict[str, str]]] = []  # (check id, claim)
        self._tcb: list[dict[str, str]] = []
        self.ext: dict[str, Any] = {}  # forward-compatible extras for the receipt's ext (the stamp deriver ignores them)
        self.lines: list[str] = []  # notes a check printed, in order

    # -- files
    def path(self, relative: str) -> Path:
        """A file of the lab repository, by its repository-relative path. Raises ValueError for a path
        that leaves the repository."""
        candidate = (self.root / relative).resolve()
        if candidate != self.root and self.root not in candidate.parents:
            raise ValueError(f"{relative} is outside the lab repository")
        return candidate

    @property
    def lab_dir(self) -> Path:
        return self.path(self.lab.directory)

    def text(self, relative: str) -> str:
        """A file of the lab repository as text, read as the engines and the statement hash read it: its
        bytes as strict UTF-8, with no line-ending translation. `Path.read_text` would turn a bare \\r and
        \\r\\n into \\n, which Z3 reads differently (it ends a ; comment only at \\n), so a run would answer a
        question your file does not ask. Raises InputRefused when the file is missing, cannot be read or is
        not UTF-8."""
        path = self.path(relative)
        if not path.is_file():
            raise InputRefused(f"{relative} is not in your lab repository")
        try:
            data = path.read_bytes()
        except OSError as error:
            raise InputRefused(f"{relative} could not be read ({error.strerror or error})") from error
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError as error:
            raise InputRefused(f"{relative} is not UTF-8 text (byte {error.start} cannot be read): save it as UTF-8") from error

    # -- lanes
    def z3(self) -> Z3Session:
        """The stage's Z3 lane: queries run under an rlimit and are read by their verdict lines."""
        if self._z3 is None:
            from statespace.lanes.z3 import WALL_CLOCK_S, Z3Session

            self._z3 = Z3Session(root=self.root, workdir=self.workdir, sink=self.runs.append, wall_clock_s=self.wall_clock_s or WALL_CLOCK_S)
        return self._z3

    def sessions(self) -> list[Any]:
        return [s for s in (self._z3,) if s is not None]

    # -- the receipt's parts
    def statement(self, relative: str, kind: str) -> str:
        """Pin a statement: its hash goes into the receipt (I7), so a later change voids its claim to [?].
        Returns its text as `text` reads it, the text to give a lane: run as it is, it is the pinned file,
        and the run's input hash is the statement's hash. A statement missing from the repository, or not
        UTF-8, fails the check (InputRefused), naming the learner's spec."""
        if kind not in STATEMENT_KINDS:
            raise ValueError(f"a statement's kind is one of {', '.join(STATEMENT_KINDS)}, not {kind!r}")
        if not self.path(relative).is_file():
            raise InputRefused(f"the statement {relative} is not in your lab repository")
        text = self.text(relative)
        self._statements[Path(relative).as_posix()] = kind
        return text

    def claim(self, template: str | None = None, *, id: str | None = None) -> None:
        """Ask the receipt to mint or update a claim card. It is kept only if the check asking passes,
        because a passing check is what mints a card (labs/README.md section 1)."""
        if template is None and id is None:
            raise ValueError("a claim names a template, the learner's card id, or both")
        if template is not None and template not in self.stage.claims:
            raise ValueError(f"{self.stage.id} does not mint {template}; its templates: {', '.join(self.stage.claims) or 'none'}")
        entry: dict[str, str] = {}
        if template is not None:
            entry["template"] = template
        if id is not None:
            entry["id"] = id
        self._claims.append((self.check_id, entry))

    def tcb(self, component: str, status: str) -> None:
        """Add a component of the stage's trusted computing base, and how it is backed."""
        if status not in TCB_STATUSES:
            raise ValueError(f"a TCB status is one of {', '.join(TCB_STATUSES)}, not {status!r}")
        entry = {"component": component, "status": status}
        if entry not in self._tcb:
            self._tcb.append(entry)

    def note(self, text: str) -> None:
        """A line printed under the running check."""
        self.lines.append(text)

    # -- read by the runner
    def statement_entries(self, hasher: Callable[[Path], str]) -> list[dict[str, str]]:
        return [{"path": path, "kind": kind, "sha256": hasher(self.path(path))} for path, kind in self._statements.items()]

    def claim_entries(self, passed: set[str]) -> list[dict[str, str]]:
        out: list[dict[str, str]] = []
        for check, claim in self._claims:
            if check in passed and claim not in out:
                out.append(claim)
        return out

    def tcb_entries(self) -> list[dict[str, str]]:
        return list(self._tcb)

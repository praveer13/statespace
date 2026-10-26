"""The shapes a lab module declares: a lab, its stages, their checks, and a check's result.

A lab module is `statespace/labs/lab<n>.py` (LAB-1's is W1-T30's) and defines `LAB`, a `Lab`. Nothing in
it runs at import time: `statespace receipt verify` imports it to compare a receipt with the lab.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .context import CheckContext

__all__ = ["SUSPECTS", "CheckResult", "CheckSpec", "Lab", "Stage"]

# What a failing check may name as the likely fault (labs/README.md sections 3 and 6).
SUSPECTS = {"spec": "your spec", "implementation": "your implementation", "tool": "the tool", "proof": "the proof"}

_LAB = re.compile(r"LAB-[0-9]+")
_STAGE = re.compile(r"LAB-[0-9]+\.[0-9]+")
_CHECK = re.compile(r"LAB-[0-9]+\.c[0-9]+")
_TEMPLATE = re.compile(r"CL-[0-9]+\.[0-9]+")


@dataclass(frozen=True)
class CheckResult:
    """A check's outcome. `message` is one line; `suspect` (when it failed) is a key of SUSPECTS;
    `details` are further lines, such as a distinguishing state or a witness."""

    passed: bool
    message: str
    suspect: str | None = None
    details: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if self.suspect is not None and self.suspect not in SUSPECTS:
            raise ValueError(f"suspect is one of {', '.join(SUSPECTS)}, not {self.suspect!r}")


@dataclass(frozen=True)
class CheckSpec:
    """One check of a stage, such as LAB-1.c3. `run` receives the stage's context and returns a result."""

    id: str
    title: str
    run: Callable[["CheckContext"], CheckResult]

    def __post_init__(self) -> None:
        if not _CHECK.fullmatch(self.id):
            raise ValueError(f"{self.id!r} is not a check id such as LAB-1.c3")


@dataclass(frozen=True)
class Stage:
    """A lab stage, such as LAB-1.3: its checks in the order they run, and the claim templates a passing
    check of it may mint (a check names them through its context)."""

    id: str
    title: str
    checks: tuple[CheckSpec, ...]
    claims: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not _STAGE.fullmatch(self.id):
            raise ValueError(f"{self.id!r} is not a stage id such as LAB-1.3")
        lab = self.id.split(".", 1)[0]
        for check in self.checks:
            if not check.id.startswith(lab + ".c"):
                raise ValueError(f"{check.id} does not belong to {lab}")
        for template in self.claims:
            if not _TEMPLATE.fullmatch(template):
                raise ValueError(f"{template!r} is not a claim template such as CL-1.1")
        if len({c.id for c in self.checks}) != len(self.checks):
            raise ValueError(f"{self.id} lists a check twice")


@dataclass(frozen=True)
class Lab:
    """A lab: its stages in order, and the directory its files live in, relative to the lab repository
    (labs/LAB-<n> by default). `statespace check` finds the repository by looking for that directory."""

    id: str
    title: str
    stages: tuple[Stage, ...]
    directory: str = field(default="")

    def __post_init__(self) -> None:
        if not _LAB.fullmatch(self.id):
            raise ValueError(f"{self.id!r} is not a lab id such as LAB-1")
        for stage in self.stages:
            if not stage.id.startswith(self.id + "."):
                raise ValueError(f"{stage.id} does not belong to {self.id}")
        if len({s.id for s in self.stages}) != len(self.stages):
            raise ValueError(f"{self.id} lists a stage twice")
        if not self.directory:
            object.__setattr__(self, "directory", f"labs/{self.id}")

    def stage(self, stage_id: str) -> Stage:
        for stage in self.stages:
            if stage.id == stage_id:
                return stage
        raise KeyError(stage_id)

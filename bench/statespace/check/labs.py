"""Finding a lab: the short names of `statespace check`, and the lab modules that define the checks.

`lab1` is LAB-1 and `lab2.2` is stage LAB-2.2 (spine section 9.6); `LAB-1.3` works too. A lab's checks
live in `statespace/labs/lab<n>.py`, which defines `LAB`; `available()` lists those modules by directory,
and `repo_labs(root)` lists the labs a lab repository holds, by its directories `labs/LAB-<n>/`. `register`
adds a lab without a module, for tests and for course tooling that builds a lab in memory.
"""

from __future__ import annotations

import importlib
import re
from dataclasses import dataclass
from pathlib import Path

from .model import Lab, Stage

__all__ = ["LabUnavailable", "Target", "available", "find_lab", "parse_target", "register", "repo_labs", "unregister"]

_registered: dict[str, Lab] = {}
_TARGET = re.compile(r"(?i)lab-?0*([0-9]+)(?:\.0*([0-9]+))?")
_DIR = re.compile(r"LAB-([1-9][0-9]*)")


class LabUnavailable(LookupError):
    """This CLI holds no checks for the lab, or no such stage."""


@dataclass(frozen=True)
class Target:
    lab: str  # LAB-1
    stage: str | None  # LAB-1.3, or None for every stage


def parse_target(text: str) -> Target:
    """`lab1` -> LAB-1, `lab1.3` -> LAB-1.3; also `LAB-1.3`. Raises ValueError for anything else."""
    found = _TARGET.fullmatch(text.strip())
    if found is None:
        raise ValueError(f"{text!r} is not a lab or stage: write lab1 for LAB-1, or lab1.3 for its stage LAB-1.3")
    lab = f"LAB-{int(found.group(1))}"
    return Target(lab, f"{lab}.{int(found.group(2))}" if found.group(2) is not None else None)


def register(lab: Lab) -> None:
    _registered[lab.id] = lab


def unregister(lab_id: str) -> None:
    _registered.pop(lab_id, None)


def available() -> list[str]:
    """Every lab this CLI can check: the modules in statespace/labs/, found by directory, and registered labs."""
    from statespace import labs as package

    return sorted({*package.available(), *_registered}, key=lambda lab: int(lab.split("-", 1)[1]))


def repo_labs(root: Path) -> list[str]:
    """The labs unpacked in a lab repository: its directories labs/LAB-<n>/, in lab order."""
    base = root / "labs"
    found = [int(m.group(1)) for p in (base.iterdir() if base.is_dir() else ()) if p.is_dir() and (m := _DIR.fullmatch(p.name))]
    return [f"LAB-{n}" for n in sorted(found)]


def find_lab(lab_id: str) -> Lab:
    """The lab's definition: a registered one, else `statespace.labs.lab<n>`'s LAB."""
    if lab_id in _registered:
        return _registered[lab_id]
    number = lab_id.split("-", 1)[1]
    name = f"statespace.labs.lab{number}"
    try:
        module = importlib.import_module(name)
    except ModuleNotFoundError as error:
        if error.name is not None and (name == error.name or name.startswith(error.name + ".")):
            held = ", ".join(available()) or "none"
            raise LabUnavailable(f"this version of statespace holds no checks for {lab_id} (it holds: {held}); unpack the lab's zip, which carries them") from error
        raise
    lab = getattr(module, "LAB", None)
    if not isinstance(lab, Lab) or lab.id != lab_id:
        raise LabUnavailable(f"{name} defines no LAB for {lab_id}")
    return lab


def stages_for(target: Target) -> tuple[Lab, tuple[Stage, ...]]:
    lab = find_lab(target.lab)
    if target.stage is None:
        return lab, lab.stages
    try:
        return lab, (lab.stage(target.stage),)
    except KeyError:
        known = ", ".join(s.id for s in lab.stages) or "none"
        raise LabUnavailable(f"{target.lab} has no stage {target.stage} (its stages: {known})") from None

"""The lane protocol: what a module under `statespace/lanes/` provides, and how the CLI finds it.

A lane is one engine family, such as Z3 (`statespace/lanes/z3.py`, W1-T29). Later tasks add the Lean
(W2-T32, W2-T33), TLC (W3-T05), cvc5 (W3-T22), PostgreSQL (W4-T16) and trace (W5-T14) lanes by adding a
module beside it; nothing here needs editing, because lanes are discovered by the names they declare.

A lane module defines, at import time and without importing its engine:

``ENGINES``
    A tuple of the ``runs[].engine`` values it reads, such as ``("z3",)``.
``derive_verdict(lines) -> Derivation``
    The verdict that a run's verdict lines carry. `statespace receipt verify` re-derives every run's
    verdict with it and rejects a receipt whose stored verdict differs; the lane derives its own
    verdicts with the same function, so the two cannot drift. An exit code is never an input.

and may define:

``verify_receipt(receipt, root) -> list[Finding]``
    Checks of the lane's own receipt section (the ``z3`` block, say) against the runs.
``rerun_plan(view, repo=..., engine_version=...) -> RerunPlan | Refusal``
    How `statespace run` re-executes a registry run of this engine.
``compare_output(recorded, found, version=..., engine_version=...) -> list[LineComparison]``
    How a re-execution's output is compared with the recorded verdict lines.

A lane module that fails to import does not take the other lanes down, but it is never silent either:
`broken()` names it, `statespace receipt verify` then rejects every receipt and `statespace run` refuses
every run with that reason, because nothing can tell which engines the broken module would have read.
"""

from __future__ import annotations

import importlib
import pkgutil
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from types import ModuleType
from typing import Any, Literal, cast

__all__ = [
    "as_list",
    "as_map",
    "Derivation",
    "Finding",
    "InputRefused",
    "LineComparison",
    "Refusal",
    "RerunPlan",
    "RunView",
    "ToolUnavailable",
    "broken",
    "broken_reason",
    "discover",
    "lane_for",
    "lane_names",
]

# Every verdict receipt@1 allows (schemas/receipt.schema.json, $defs/run/verdict).
VERDICTS = ("accepted", "rejected", "sat", "unsat", "unknown", "no-error", "violated", "deadlock", "stopped", "passed", "failed", "error")


def as_map(value: object) -> Mapping[str, Any] | None:
    """`value` as a JSON object, or None: a typed view of parsed JSON."""
    return cast(Mapping[str, Any], value) if isinstance(value, Mapping) else None


def as_list(value: object) -> list[Any]:
    """`value` as a JSON array, or an empty list."""
    return list(cast(list[Any], value)) if isinstance(value, list) else []


class ToolUnavailable(RuntimeError):
    """An engine is not installed where the CLI runs, or will not start. Nothing was judged, so the
    stage writes no receipt."""


class InputRefused(ValueError):
    """The learner's input cannot be run as given (a script that asks no question, say). The check that
    passed it fails, naming the learner's spec, and the stage goes on."""


@dataclass(frozen=True)
class Derivation:
    """The verdict a run's verdict lines carry. `verdict` is None when the lines cannot be read at all,
    and `problems` then says why; a receipt with such a run is rejected."""

    verdict: str | None
    reason: str | None = None  # an engine's reason for `unknown`, verbatim, when the lines carry one
    problems: tuple[str, ...] = ()


@dataclass(frozen=True)
class Finding:
    """One result of a receipt check. `fail` rejects the receipt; `note` is reported and accepted."""

    level: Literal["fail", "note"]
    where: str  # a JSON Pointer into the receipt, such as /runs/0/verdict, or "" for the whole file
    message: str


@dataclass(frozen=True)
class RunView:
    """One configuration of a run record, as `statespace run` re-executes it: the record's top level,
    or a named entry of its configs[] laid over the top level."""

    run_id: str
    config: str | None
    engine: str
    version: str
    argv: list[str] | list[list[str]] | None
    inputs: list[Mapping[str, Any]]
    image: str | None
    verdict_lines: list[str]
    exit_code: int | None
    budget: Mapping[str, Any]
    unrecorded: Mapping[str, str] = field(default_factory=dict[str, str])  # field -> reason


@dataclass(frozen=True)
class RerunPlan:
    """How to re-execute a run: the command, where it runs, and in words where the command came from."""

    argv: list[str]
    # stage: a scratch directory holding the inputs laid out where the command looks for them
    # (statespace.check.runs.layout); repo: the course repository's root
    cwd: Literal["stage", "repo"]
    how: str
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class Refusal:
    """Why a lane cannot re-execute a run faithfully."""

    reason: str


Status = Literal["same", "differs", "missing", "skipped"]


@dataclass(frozen=True)
class LineComparison:
    """One recorded verdict line against the re-execution's output."""

    status: Status
    recorded: str
    found: str | None = None
    note: str | None = None


_cache: dict[str, str] | None = None
_broken: dict[str, str] = {}


def discover(refresh: bool = False) -> dict[str, str]:
    """Map each engine name to the lane module that reads it, by importing every module under
    `statespace/lanes/` and reading its ENGINES. A module without ENGINES is a helper, not a lane. A module
    that fails to import is recorded in broken() rather than raised, so the other lanes still load; since
    nothing can tell which engines it would have read, every command that relies on lanes then fails
    closed (broken_reason)."""
    global _cache
    if _cache is not None and not refresh:
        return dict(_cache)
    found: dict[str, str] = {}
    _broken.clear()
    try:
        package = importlib.import_module("statespace.lanes")
    except Exception as error:  # noqa: BLE001 - the package itself is broken: no lane can be trusted
        _broken["statespace.lanes"] = f"{type(error).__name__}: {error}"
        package = None
    paths: Sequence[str] = list(getattr(package, "__path__", [])) if package is not None else []
    for info in sorted(pkgutil.iter_modules(paths), key=lambda m: m.name):
        if info.ispkg or info.name.startswith("_"):
            continue
        name = f"statespace.lanes.{info.name}"
        try:
            module = importlib.import_module(name)
        except Exception as error:  # noqa: BLE001 - recorded in broken(), so callers fail closed
            _broken[name] = f"{type(error).__name__}: {error}"
            continue
        engines = getattr(module, "ENGINES", None)
        if isinstance(engines, tuple):
            for engine in engines:  # pyright: ignore[reportUnknownVariableType]
                if isinstance(engine, str):
                    found.setdefault(engine, name)
    _cache = found
    return dict(found)


def broken() -> Mapping[str, str]:
    """Each lane module that failed to import at discovery, with its error. Empty when every lane loaded."""
    discover()
    return dict(_broken)


def broken_reason() -> str | None:
    """Why lanes cannot be trusted right now, or None: a lane module could not load, so verdicts that it
    might have read were not re-derived. This is a fault in statespace, never in the learner's work."""
    failed = broken()
    if not failed:
        return None
    # Learners read this (statespace receipt verify, statespace check), so it names the module, not the lane.
    return "; ".join(f"the statespace module {name} could not load ({error}), so verdicts were not re-derived; this is a fault in statespace" for name, error in sorted(failed.items()))


def lane_for(engine: str) -> ModuleType | None:
    """The lane module that reads `engine`, or None when no lane in this CLI reads it."""
    name = discover().get(engine)
    return importlib.import_module(name) if name else None


def lane_names() -> Mapping[str, str]:
    return discover()

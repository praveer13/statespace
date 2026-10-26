"""The reference simulator and the trace lint (reference module, earns nothing; LAB-8's simulator is the
learner's, and `statespace trace validate` with TLC is LAB-8's harness).

The simulator runs a sequence of calls under a seeded fault schedule: before a call commits, the process
may crash; it then recovers and runs the call again. It writes one NDJSON record per event:

    {"seq": k, "event": "Init", "state": S}
    {"seq": k, "event": "Call", "call": i, "args": {...}}
    {"seq": k, "event": "Crash", "call": i}          then {"seq": k, "event": "Recover", "call": i}
    {"seq": k, "event": "Commit", "call": i, "state": S} or {"seq": k, "event": "Reject", "call": i, "err": e}
    {"seq": k, "event": "End", "state": S}

`lint` is the schema lint of LAB-8.c6 (an End record, each event's fields, `seq` counting from 0) plus a
replay of every call through the reference interpreter: each Commit's state and each Reject's error must
be the interpreter's, and no call commits twice. It is not TLC: the trace's acceptance by the learner's
TLA+ spec is LAB-8's `statespace trace validate`, which LAB-10 calls once it ships.
"""

from __future__ import annotations

import random
from typing import Any

from . import semantics

__all__ = ["simulate", "lint", "FIELDS"]

FIELDS = {
    "Init": ("state",),
    "Call": ("call", "args"),
    "Crash": ("call",),
    "Recover": ("call",),
    "Commit": ("call", "state"),
    "Reject": ("call", "err"),
    "End": ("state",),
}
CRASH_P = 0.25  # [D]


def simulate(program: dict[str, Any], types: dict[str, str], state: dict[str, Any], calls: list[dict[str, Any]], seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    out: list[dict[str, Any]] = []

    def emit(record: dict[str, Any]) -> None:
        out.append({"seq": len(out), **record})

    emit({"event": "Init", "state": state})
    current = state
    for i, args in enumerate(calls):
        emit({"event": "Call", "call": i, "args": args})
        while rng.random() < CRASH_P:
            emit({"event": "Crash", "call": i})
            emit({"event": "Recover", "call": i})
        result = semantics.run(program, types, current, args)
        if result["ok"]:
            current = result["state"]
            emit({"event": "Commit", "call": i, "state": current})
        else:
            emit({"event": "Reject", "call": i, "err": result["err"]})
    emit({"event": "End", "state": current})
    return out


def lint(trace: list[Any], program: dict[str, Any], types: dict[str, str], state: dict[str, Any], calls: list[dict[str, Any]]) -> list[str]:
    """Problems with a trace, first one first; an empty list means the trace passes the lint and replays."""
    problems: list[str] = []
    if not trace:
        return ["the trace is empty"]
    for k, rec in enumerate(trace):
        if not isinstance(rec, dict):
            return [f"line {k + 1} is not a JSON object"]
        if rec.get("seq") != k:
            return [f"line {k + 1}: seq is {rec.get('seq')!r}, not {k}"]
        event = rec.get("event")
        if event not in FIELDS:
            return [f"line {k + 1}: unknown event {event!r}"]
        missing = [f for f in FIELDS[event] if f not in rec]
        if missing:
            return [f"line {k + 1}: {event} lacks {', '.join(missing)}"]
    if trace[0]["event"] != "Init" or trace[0]["state"] != state:
        problems.append("line 1 is not an Init record with the starting state")
    if trace[-1]["event"] != "End":
        problems.append("the last line is not an End record")
    current = state
    decided: set[int] = set()
    for k, rec in enumerate(trace):
        event = rec["event"]
        if event in ("Commit", "Reject"):
            i = rec["call"]
            if not isinstance(i, int) or not 0 <= i < len(calls):
                problems.append(f"line {k + 1}: call {i!r} was never made")
                break
            if i in decided:
                problems.append(f"line {k + 1}: call {i} is decided twice")
                break
            decided.add(i)
            expected = semantics.run(program, types, current, calls[i])
            if event == "Commit":
                if not expected["ok"] or expected["state"] != rec["state"]:
                    problems.append(f"line {k + 1}: call {i} commits {rec['state']}, the interpreter gives {expected}")
                    break
                current = rec["state"]
            elif expected["ok"] or expected["err"] != rec["err"]:
                problems.append(f"line {k + 1}: call {i} is rejected with {rec['err']}, the interpreter gives {expected}")
                break
    if not problems and decided != set(range(len(calls))):
        problems.append(f"calls {sorted(set(range(len(calls))) - decided)} are never decided")
    if not problems and trace[-1]["state"] != current:
        problems.append("the End state is not the state after the last commit")
    return problems

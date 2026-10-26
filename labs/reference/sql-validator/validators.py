"""The course's reference SQL validators for LAB-9.11 and S9.L8 (reference modules, earn nothing; W5-T04).

Two validators over the plans of `statespace.labs.lab9.PLANS`, the suite that LAB-9.c11 draws its cases from:

* `shape`: what a shape check asks (S9.L8 cell 2): two writes that are UPDATEs, each `WHERE id = $k`, each
  expecting one row, and the two guards present. It never asks which parameter a WHERE names, so it accepts
  SP-9.2's wrong-account plan.
* `semantic`: lifts each statement to a step over a model of the table (a SELECT reads one row; an UPDATE
  writes the rows its WHERE matches and reports the rowcount; the CHECK on bal >= 0 raises 23514; an upsert
  inserts or updates), runs the plan and the source command over every instance within its bound, and
  compares outcome classes: committed with the same table, a typed error, or a SQLSTATE. A rejection carries
  the first instance on which the classes differ.

A rejection is a counterexample to replay, not a verdict on its own: `record.py` replays every one on
PostgreSQL through `statespace.labs.lab9.replay_plan`, and the source through the course's interpreter.
These modules live in the course repository; the learner writes their own validator in Rust (LAB-9.11).
"""

from __future__ import annotations

import itertools
import re

from statespace.labs.lab9 import STMT_ASSERT, STMT_SELECT, STMT_UPDATE, STMT_UPSERT, source_transfer

IDS = (1, 2, 3)  # account 3 never exists, so a parameter can name a missing row
BALANCES = range(0, 4)
AMOUNTS = range(-1, 4)
BOUND = "ids 1..3 (rows 1 and 2 present or absent), balances 0..3, amounts -1..3"


def shape(lines: list[str]) -> tuple[bool, str]:
    updates = [STMT_UPDATE.fullmatch(l) for l in lines]
    writes = [m for m in updates if m]
    asserts = [STMT_ASSERT.fullmatch(l) for l in lines]
    if any(STMT_UPSERT.fullmatch(l) for l in lines):
        return False, "a write is not an UPDATE"
    if len(writes) != 2:
        return False, f"{len(writes)} UPDATEs, not two"
    if not all(m.group(5) for m in writes):
        return False, "an UPDATE does not expect one row"
    if sum(1 for m in asserts if m) < 2:
        return False, "a guard is missing"
    return True, "two UPDATEs, each WHERE id = <parameter>, each expecting one row; both guards present"


def _value(token: str, params: dict[int, int], regs: dict[int, int], row: int | None) -> int:
    if token == "bal":
        assert row is not None
        return row
    if token.startswith("$"):
        return params[int(token[1:])]
    if token.startswith("r"):
        return regs[int(token[1:])]
    return int(token)


def run_model(lines: list[str], table: dict[int, int], params: dict[int, int]) -> tuple:
    t = dict(table)
    regs: dict[int, int] = {}
    for line in lines:
        if m := STMT_ASSERT.fullmatch(line):
            a, b = _value(m.group(1), params, regs, None), _value(m.group(3), params, regs, None)
            if not {">": a > b, ">=": a >= b, "<": a < b, "<=": a <= b, "=": a == b, "<>": a != b}[m.group(2)]:
                return ("error", m.group(4))
        elif m := STMT_SELECT.fullmatch(line):
            key = params[int(m.group(1))]
            if key not in t:
                return ("error", m.group(3))
            regs[int(m.group(2))] = t[key]
        elif m := STMT_UPDATE.fullmatch(line):
            key = params[int(m.group(4))]
            rows = 0
            if key in t:
                v = _value(m.group(1), params, regs, t[key])
                if m.group(2):
                    w = _value(m.group(3), params, regs, t[key])
                    v = v + w if m.group(2) == "+" else v - w
                if v < 0:
                    return ("sqlstate", "23514")
                t[key] = v
                rows = 1
            if m.group(5) and rows != 1:
                return ("error", m.group(5))
        elif m := STMT_UPSERT.fullmatch(line):
            key, value, delta = (params[int(m.group(n))] for n in (1, 2, 3))
            new = t[key] + delta if key in t else value
            if new < 0:
                return ("sqlstate", "23514")
            t[key] = new
        else:
            raise ValueError(f"not a plan statement: {line}")
    return ("committed", tuple(sorted(t.items())))


def instances():
    for a1, a2 in itertools.product([*BALANCES, None], repeat=2):  # full tables first, then missing rows
        table = {k: v for k, v in ((1, a1), (2, a2)) if v is not None}
        for frm, to, amount in itertools.product(IDS, IDS, AMOUNTS):
            yield table, frm, to, amount


def semantic(lines: list[str], roles: dict[str, int]) -> tuple[bool, int, tuple | None]:
    """(accepted, instances enumerated, the first divergence or None)."""
    n = 0
    for table, frm, to, amount in instances():
        n += 1
        params = {roles["F"]: frm, roles["T"]: to, roles["A"]: amount}
        if run_model(lines, table, params) != source_transfer(table, frm, to, amount):
            return False, n, (table, frm, to, amount)
    return True, n, None


TOTAL = sum(1 for _ in instances())


def show_instance(table: dict[int, int], frm: int, to: int, amount: int) -> str:
    rows = ",".join(f"{k}:{v}" for k, v in sorted(table.items())) or "none"
    return f"accounts={rows} from={frm} to={to} amount={amount}"


def plan_name_ok(name: str) -> bool:
    return re.fullmatch(r"[a-z-]+", name) is not None

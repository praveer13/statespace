"""Build LAB-3's golden pool from the reference semantics, and kernel-check it.

    python3 labs/reference/mini-plinth/build_goldens.py [--seed N] [--image IMAGE] [--check-only]

1. Draws the pool's inputs from a seed: evaluator inputs stratified by command, outcome class and
   boundary values near ±(2^63 - 1), the lesson cells' own calls, and typing inputs holding an accepted
   command and a rejection for every rule (curriculum/S03-semantics.md section 4.5).
2. Computes every right-hand side with the reference (`MiniPlinthRef`, labs/LAB-3/reference/) in the
   Bench image: `lake env lean` on a generated file of `#eval` lines, one per input and policy.
3. Writes each golden as a theorem over the reference, `execWith <policy> p c s = r := by decide` and
   `typecheck c = r := by decide`, builds them, and reads `#print axioms` for every theorem: a golden ships
   only when the kernel accepted it with no axioms.
4. Writes the pool, IR@1 with its goldens, to labs/LAB-3/challenge/goldens.json, and prints its hash.

The renderer is the one `statespace check lab3.<k>` uses (bench/statespace/labs/lab3.py), so the text the
learner's check builds is the text kernel-checked here. Every number this prints is the build's own.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "bench"))

from statespace.labs import lab3  # noqa: E402

IMAGE = "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a"
MAX = 9223372036854775807
POLICIES = [
    {"zero": z, "self": s, "guard": g, "overflow": ({"mode": "unbounded"} if o == "unbounded" else {"mode": "bounded", "maxBal": str(MAX)})}
    for z in ("reject", "noop") for s in ("allow", "reject") for g in ("error", "silent") for o in ("unbounded", "bounded")
]
REFERENCE_POLICY = POLICIES[0]

# --------------------------------------------------------------------------------------- IR builders


def user(n: str) -> dict[str, Any]:
    return {"tag": "user", "name": n}


MINT = {"tag": "mint"}
SINK = {"tag": "sink"}


def acct(a: dict[str, Any]) -> dict[str, Any]:
    return {"tag": "acct", "acct": a}


def vint(n: int) -> dict[str, Any]:
    return {"tag": "int", "value": str(n)}


def vbool(b: bool) -> dict[str, Any]:
    return {"tag": "bool", "value": b}


def vhold(h: int) -> dict[str, Any]:
    return {"tag": "hold", "hold": h}


def var(x: str) -> dict[str, Any]:
    return {"tag": "var", "name": x}


def lit(n: int) -> dict[str, Any]:
    return {"tag": "lit", "value": str(n)}


def bal(e: dict[str, Any]) -> dict[str, Any]:
    return {"tag": "balance", "e": e}


def frozen(e: dict[str, Any]) -> dict[str, Any]:
    return {"tag": "frozen", "e": e}


def bin_(tag: str, a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    return {"tag": tag, "a": a, "b": b}


def ge(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    return bin_("ge", a, b)


def and_(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    return bin_("and", a, b)


def not_(a: dict[str, Any]) -> dict[str, Any]:
    return {"tag": "not", "a": a}


TRUE = ge(lit(0), lit(0))


def op(r: dict[str, Any]) -> dict[str, Any]:
    return {"tag": "op", "op": r}


def move(n: Any, x: Any, y: Any) -> dict[str, Any]:
    return op({"tag": "move", "amount": n, "from": x, "to": y})


def deposit(n: Any, a: Any) -> dict[str, Any]:
    return op({"tag": "deposit", "amount": n, "to": a})


def hold(n: Any, x: Any) -> dict[str, Any]:
    return op({"tag": "hold", "amount": n, "on": x})


def capture(h: Any, y: Any) -> dict[str, Any]:
    return op({"tag": "capture", "hold": h, "to": y})


def release(h: Any) -> dict[str, Any]:
    return op({"tag": "release", "hold": h})


def set_(f: str, x: Any, e: Any) -> dict[str, Any]:
    return {"tag": "set", "field": f, "target": x, "value": e}


def cmd(name: str, params: list[tuple[str, str]], guard: Any, body: Any) -> dict[str, Any]:
    return {"name": name, "params": [{"name": p, "ty": t} for p, t in params], "guard": guard, "body": body}


TRANSFER = cmd("Transfer", [("from", "account"), ("to", "account"), ("amount", "amount")], ge(bal(var("from")), var("amount")), move(var("amount"), var("from"), var("to")))
DEPOSIT = cmd("Deposit", [("to", "account"), ("amount", "amount")], TRUE, deposit(var("amount"), var("to")))
HOLD = cmd("Hold", [("from", "account"), ("amount", "amount")], ge(bal(var("from")), var("amount")), hold(var("amount"), var("from")))
CAPTURE = cmd("Capture", [("h", "hold"), ("to", "account")], TRUE, capture(var("h"), var("to")))
RELEASE = cmd("Release", [("h", "hold")], TRUE, release(var("h")))
FREEZE = cmd("Freeze", [("a", "account")], not_(frozen(var("a"))), set_("frozen", var("a"), not_(frozen(var("a")))))
REF_PROGRAM = {"id": "refProgram", "commands": [TRANSFER, DEPOSIT, HOLD, CAPTURE, RELEASE, FREEZE]}


def state(users: dict[str, int], *, holds: list[tuple[int, str, int, str]] = (), escrow: dict[int, int] | None = None,
          sink: int | None = None, frozen_: list[str] = (), next_hold: int | None = None, mint: int | None = None) -> dict[str, Any]:
    """A state that keeps Inv unless told otherwise: the mint holds minus everything else."""
    escrow = dict(escrow or {})
    for h, _owner, amount, status in holds:
        escrow.setdefault(h, amount if status == "held" else 0)
    rows: list[tuple[dict[str, Any], int]] = []
    others = sum(users.values()) + sum(escrow.values()) + (sink or 0)
    rows.append((MINT, -others if mint is None else mint))
    rows += [(user(n), v) for n, v in users.items()]
    if sink is not None:
        rows.append((SINK, sink))
    rows += [({"tag": "escrow", "hold": h}, v) for h, v in sorted(escrow.items())]
    return {
        "bals": [{"acct": a, "bal": str(v)} for a, v in rows],
        "holds": [{"id": h, "owner": user(o), "amount": str(n), "status": s} for h, o, n, s in holds],
        "nextHold": next_hold if next_hold is not None else (max([h for h, *_ in holds], default=-1) + 1),
        "frozen": [user(n) for n in frozen_],
    }


def call(name: str, *args: dict[str, Any]) -> dict[str, Any]:
    return {"name": name, "args": list(args)}


NAMES = ["a", "b", "c", "d", "erin", "fay"]

# ------------------------------------------------------------------------------------- eval inputs


def eval_inputs(rng: random.Random) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    def add(op_: str, cls: str, pre: dict[str, Any], c: dict[str, Any], *, boundary: bool = False, source: str = "generated") -> None:
        out.append({"op": op_, "class": cls, "boundary": boundary, "pre": pre, "call": c, "source": source})

    def two() -> tuple[str, str]:
        x, y = rng.sample(NAMES, 2)
        return x, y

    # The lesson cells' calls, verbatim (S3.L3 cells 1-2, S3.L7 cells 1 and 3, S3.L9's golden_transfer_ok).
    s100 = state({"a": 100, "b": 0})
    add("Transfer", "ok", s100, call("Transfer", acct(user("a")), acct(user("b")), vint(30)), source="S3.L9 golden_transfer_ok; S3.L3")
    add("Transfer", "self", state({"a": 10}), call("Transfer", acct(user("a")), acct(user("a")), vint(5)), source="S3.L3 cell 1")
    add("Transfer", "zero", s100, call("Transfer", acct(user("a")), acct(user("b")), vint(0)), source="S3.L3 cell 2; S3.L7 cell 1")
    add("Transfer", "self", s100, call("Transfer", acct(user("a")), acct(user("a")), vint(15)), source="S3.L7 cell 1")
    add("Transfer", "guardFailed", s100, call("Transfer", acct(user("a")), acct(user("b")), vint(130)), source="S3.L7 cells 1 and 3; S3.L4 cell 2")
    add("Deposit", "overflow", state({"a": MAX, "b": 0}), call("Deposit", acct(user("a")), vint(1)), boundary=True, source="S3.L7 cell 1")
    add("Transfer", "unknownAccount", s100, call("Transfer", acct(user("a")), acct(user("ghost")), vint(30)), source="S3 section 2.4")
    # S3.L2 cell 2: hold 30 on a, capture h to sink, release h, one call at a time.
    s_l2 = state({"a": 100}, sink=0)
    add("Hold", "ok", s_l2, call("Hold", acct(user("a")), vint(30)), source="S3.L2 cell 2, step 1")
    s_l2b = state({"a": 70}, sink=0, holds=[(0, "a", 30, "held")])
    add("Capture", "ok", s_l2b, call("Capture", vhold(0), acct(SINK)), source="S3.L2 cell 2, step 2")
    s_l2c = state({"a": 70}, sink=30, holds=[(0, "a", 30, "captured")])
    add("Release", "holdNotOpen", s_l2c, call("Release", vhold(0)), source="S3.L2 cell 2, step 3")

    for _ in range(4):
        x, y = two()
        b = rng.randint(1, 500)
        n = rng.randint(1, b)
        add("Transfer", "ok", state({x: b, y: rng.randint(0, 300)}), call("Transfer", acct(user(x)), acct(user(y)), vint(n)))
    for _ in range(3):
        x, y = two()
        b = rng.randint(0, 200)
        add("Transfer", "guardFailed", state({x: b, y: rng.randint(0, 50)}), call("Transfer", acct(user(x)), acct(user(y)), vint(b + rng.randint(1, 100))))
    for _ in range(2):
        x, y = two()
        b = rng.randint(1, 100)
        add("Transfer", "guardFailed", state({x: b, y: 0}), call("Transfer", acct(user(x)), acct(user(y)), vint(b + 1)), boundary=False)
    for _ in range(3):
        x, _y = two()
        b = rng.randint(1, 300)
        add("Transfer", "self", state({x: b}), call("Transfer", acct(user(x)), acct(user(x)), vint(rng.randint(1, b))))
        add("Transfer", "self", state({x: b}), call("Transfer", acct(user(x)), acct(user(x)), vint(b + rng.randint(1, 9))))
    for _ in range(2):
        x, y = two()
        add("Transfer", "zero", state({x: rng.randint(0, 50), y: 0}), call("Transfer", acct(user(x)), acct(user(y)), vint(0)))
        add("Transfer", "zero", state({x: 5}), call("Transfer", acct(user(x)), acct(user("ghost")), vint(0)))
        add("Transfer", "badArgument", state({x: 50, y: 0}), call("Transfer", acct(user(x)), acct(user(y)), vint(-rng.randint(1, 50))))
    x, y = two()
    add("Transfer", "badArgument", state({x: 50, y: 0}), call("Transfer", acct(user(x)), acct(user(y)), vbool(True)))
    add("Transfer", "badArgument", state({x: 50, y: 0}), call("Transfer", vint(1), acct(user(y)), vint(5)))
    add("Transfer", "badArgument", state({x: 50, y: 0}), call("Transfer", acct(user(x)), acct(user(y))))
    add("Transfer", "badArgument", state({x: 50, y: 0}), call("Transfer", acct(user(x)), acct(user(y)), vint(5), vint(6)))
    for _ in range(2):
        x, y = two()
        add("Transfer", "unknownAccount", state({y: 10}), call("Transfer", acct(user(x)), acct(user(y)), vint(5)))
        add("Transfer", "unknownAccount", state({x: 10}), call("Transfer", acct(user(x)), acct(user(y)), vint(20)))
    add("Transfer", "unknownCommand", s100, call("Transfr", acct(user("a")), acct(user("b")), vint(5)))
    # Boundary values: credits that cross maxBal under the bounded decision, and debits from maxBal.
    for k in (1, 2, rng.randint(3, 1000)):
        x, y = two()
        add("Transfer", "overflow", state({x: k, y: MAX - k + 1}), call("Transfer", acct(user(x)), acct(user(y)), vint(k)), boundary=True)
        add("Transfer", "ok", state({x: k, y: MAX - k}), call("Transfer", acct(user(x)), acct(user(y)), vint(k)), boundary=True)
    x, y = two()
    add("Transfer", "ok", state({x: MAX, y: 0}), call("Transfer", acct(user(x)), acct(user(y)), vint(MAX)), boundary=True)
    add("Transfer", "self", state({x: MAX}), call("Transfer", acct(user(x)), acct(user(x)), vint(MAX)), boundary=True)
    # Deposit.
    for _ in range(3):
        x, y = two()
        add("Deposit", "ok", state({x: rng.randint(0, 400), y: 3}), call("Deposit", acct(user(x)), vint(rng.randint(1, 900))))
    x, y = two()
    add("Deposit", "zero", state({x: 4}), call("Deposit", acct(user(x)), vint(0)))
    add("Deposit", "unknownAccount", state({x: 4}), call("Deposit", acct(user(y)), vint(3)))
    add("Deposit", "ok", state({x: 4}, sink=0), call("Deposit", acct(SINK), vint(3)))
    add("Deposit", "overflow", state({x: MAX - 1}), call("Deposit", acct(user(x)), vint(2)), boundary=True)
    add("Deposit", "ok", state({x: MAX - 1}), call("Deposit", acct(user(x)), vint(1)), boundary=True)
    add("Deposit", "overflow", state({x: MAX, y: 0}), call("Deposit", acct(user(y)), vint(1)), boundary=True)
    # Hold.
    for _ in range(3):
        x, y = two()
        b = rng.randint(1, 300)
        nh = rng.randint(0, 3)
        add("Hold", "ok", state({x: b, y: 1}, next_hold=nh), call("Hold", acct(user(x)), vint(rng.randint(1, b))))
    x, y = two()
    add("Hold", "guardFailed", state({x: 10}), call("Hold", acct(user(x)), vint(11)))
    add("Hold", "zero", state({x: 10}), call("Hold", acct(user(x)), vint(0)))
    add("Hold", "unknownAccount", state({x: 10}), call("Hold", acct(user(y)), vint(1)))
    add("Hold", "ok", state({x: MAX}), call("Hold", acct(user(x)), vint(MAX)), boundary=True)
    # Capture and release.
    for name in ("Capture", "Release"):
        for _ in range(2):
            x, y = two()
            n = rng.randint(1, 200)
            pre = state({x: rng.randint(0, 100), y: 5}, holds=[(0, x, n, "held")], sink=0)
            c = call("Capture", vhold(0), acct(user(y))) if name == "Capture" else call("Release", vhold(0))
            add(name, "ok", pre, c)
        x, y = two()
        pre = state({x: 1, y: 5}, holds=[(1, x, 40, "held")], sink=0)
        add(name, "unknownHold", pre, call("Capture", vhold(0), acct(user(y))) if name == "Capture" else call("Release", vhold(7)))
        for status in ("captured", "released"):
            pre = state({x: 1, y: 5}, holds=[(0, x, 40, status)], sink=40 if status == "captured" else 0)
            add(name, "holdNotOpen", pre, call("Capture", vhold(0), acct(user(y))) if name == "Capture" else call("Release", vhold(0)))
        pre = state({x: 1, y: 5}, holds=[(0, x, 40, "held")], escrow={0: 39})
        add(name, "holdNotOpen", pre, call("Capture", vhold(0), acct(user(y))) if name == "Capture" else call("Release", vhold(0)))
        pre = state({x: 1, y: 5}, holds=[(0, x, 40, "held")])
        add(name, "badArgument", pre, call("Capture", vint(0), acct(user(y))) if name == "Capture" else call("Release", acct(user(x))))
    x, y = two()
    pre = state({x: 0, y: MAX - 4}, holds=[(0, x, 5, "held")])
    add("Capture", "overflow", pre, call("Capture", vhold(0), acct(user(y))), boundary=True)
    pre = state({x: 0, y: 3}, holds=[(2, x, 5, "held")], sink=0)
    add("Capture", "ok", pre, call("Capture", vhold(2), acct(SINK)))
    add("Capture", "unknownAccount", pre, call("Capture", vhold(2), acct(user("ghost"))))
    # Freeze.
    x, y = two()
    add("Freeze", "ok", state({x: 3, y: 0}), call("Freeze", acct(user(x))))
    add("Freeze", "guardFailed", state({x: 3, y: 0}, frozen_=[x]), call("Freeze", acct(user(x))))
    add("Freeze", "unknownAccount", state({x: 3}), call("Freeze", acct(user(y))))
    for i, item in enumerate(out, start=1):
        item["id"] = f"e{i:03d}"
    return out


# ------------------------------------------------------------------------------------- typing inputs


def typing_inputs(rng: random.Random) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    def add(rule: str, c: dict[str, Any], note: str) -> None:
        out.append({"rule": rule, "command": c, "note": note})

    def names() -> tuple[str, str, str]:
        pools = (["from", "src", "payer", "x"], ["to", "dst", "payee", "y"], ["amount", "n", "amt", "k"])
        return tuple(rng.choice(p) for p in pools)  # type: ignore[return-value]

    for c in REF_PROGRAM["commands"]:
        add("accept", c, f"the reference's {c['name']}")
    for _ in range(3):
        f, t, n = names()
        g = rng.choice([
            and_(ge(bal(var(f)), var(n)), not_(frozen(var(f)))),
            and_(not_(frozen(var(t))), ge(bal(var(f)), var(n))),
            and_(ge(bal(var(f)), var(n)), ge(bal(var(t)), lit(0))),
        ])
        add("accept", cmd("Pay", [(f, "account"), (t, "account"), (n, "amount")], g, move(var(n), var(f), var(t))), "a guard whose conjunct covers the debit")
    f, t, n = names()
    k = rng.randint(1, 99)
    add("accept", cmd("Fee", [(f, "account"), (t, "account")], ge(bal(var(f)), lit(k)), move(lit(k), var(f), var(t))), "a positive literal amount, covered")
    add("accept", cmd("Grant", [(t, "account"), (n, "amount")], ge(var(n), lit(1)), deposit(var(n), var(t))), "a deposit needs no cover")
    add("accept", cmd("Unfreeze", [(f, "account")], frozen(var(f)), set_("frozen", var(f), not_(frozen(var(f))))), "R-set on the scalar field")
    add("accept", cmd("Settle", [("h", "hold"), (t, "account")], TRUE, capture(var("h"), var(t))), "capture to an account parameter")
    # R-param
    f, t, n = names()
    add("dupParam", cmd("Transfer", [(f, "account"), (f, "account"), (n, "amount")], ge(bal(var(f)), var(n)), move(var(n), var(f), var(f))), "two parameters share a name")
    add("dupParam", cmd("Grant", [(t, "account"), (n, "amount"), (n, "amount")], TRUE, deposit(var(n), var(t))), "two parameters share a name")
    # R-var
    f, t, n = names()
    add("unknownParam", cmd("Transfer", [(f, "account"), (t, "account"), (n, "amount")], ge(bal(var("ghost")), var(n)), move(var(n), var(f), var(t))), "the guard names a variable that is not a parameter")
    add("unknownParam", cmd("Transfer", [(f, "account"), (t, "account"), (n, "amount")], ge(bal(var(f)), var(n)), move(var(n), var(f), var("ghost"))), "the statement names a variable that is not a parameter")
    add("unknownParam", cmd("Grant", [(t, "account")], TRUE, deposit(var("ghost"), var(t))), "the amount is not a parameter")
    # R-expr
    f, t, n = names()
    add("wrongType", cmd("Odd", [(f, "account"), (t, "account"), (n, "amount")], ge(bal(var(n)), var(n)), move(var(n), var(f), var(t))), "balance of an amount: SP-3.1")
    add("wrongType", cmd("Transfer", [(f, "account"), (t, "account"), (n, "amount")], bal(var(f)), move(var(n), var(f), var(t))), "the guard is an int, not a bool")
    add("wrongType", cmd("Transfer", [(f, "account"), (t, "account"), (n, "amount")], and_(ge(bal(var(f)), var(n)), var(n)), move(var(n), var(f), var(t))), "&& of a bool and an amount")
    add("wrongType", cmd("Grant", [(t, "account"), (n, "amount")], TRUE, deposit(var(n), var(n))), "deposit to an amount")
    add("wrongType", cmd("Settle", [(f, "account"), (t, "account")], TRUE, capture(var(f), var(t))), "capture of an account: R-hold")
    add("wrongType", cmd("Mark", [(f, "account")], TRUE, set_("frozen", var(f), lit(5))), "frozen set to an int")
    add("wrongType", cmd("Mark", [(f, "account")], TRUE, set_("limit", var(f), lit(5))), "a field that does not exist")
    # R-amount
    f, t, n = names()
    add("nonPositive", cmd("Transfer", [(f, "account"), (t, "account")], ge(bal(var(f)), lit(0)), move(lit(0), var(f), var(t))), "a zero literal amount")
    add("nonPositive", cmd("Transfer", [(f, "account"), (t, "account")], ge(bal(var(f)), lit(-5)), move(lit(-5), var(f), var(t))), "a negative literal amount debits the recipient")
    add("nonPositive", cmd("Transfer", [(f, "account"), (t, "account"), (n, "int")], ge(bal(var(f)), var(n)), move(var(n), var(f), var(t))), "an int parameter as the amount")
    add("nonPositive", cmd("Grant", [(t, "account"), (n, "amount")], TRUE, deposit(bin_("add", var(n), lit(1)), var(t))), "an expression as the amount")
    # R-cover
    f, t, n = names()
    add("unguardedDebit", cmd("Pay", [(f, "account"), (t, "account"), (n, "amount")], ge(bal(var(t)), var(n)), move(var(n), var(f), var(t))), "the guard covers the credited account: S3.L2 segment 1")
    add("unguardedDebit", cmd("Pay", [(f, "account"), (t, "account"), (n, "amount")], ge(bal(var(f)), bin_("add", var(n), lit(1))), move(var(n), var(f), var(t))), "sound and incomplete: n + 1 is not n")
    add("unguardedDebit", cmd("Pay", [(f, "account"), (t, "account"), (n, "amount")], not_(ge(var(n), bal(var(f)))), move(var(n), var(f), var(t))), "a negation never covers")
    add("unguardedDebit", cmd("Reserve", [(f, "account"), (n, "amount")], TRUE, hold(var(n), var(f))), "a hold needs a cover too")
    add("unguardedDebit", cmd("Pay", [(f, "account"), (t, "account"), (n, "amount")], ge(var(n), bal(var(f))), move(var(n), var(f), var(t))), "a reversed guard: B3")
    # R-set
    f, t, n = names()
    add("assignsResource", cmd("Mint", [(f, "account")], TRUE, set_("balance", var(f), bin_("add", bal(var(f)), lit(1)))), "set balance(a) := balance(a) + 1")
    add("assignsResource", cmd("Wipe", [(f, "account")], TRUE, set_("balance", var(f), lit(0))), "a resource has no assignment rule")
    for i, item in enumerate(out, start=1):
        item["id"] = f"t{i:03d}"
    return out


# --------------------------------------------------------------------------------------------- Lean


def lean_project(scratch: Path) -> Path:
    proj = scratch / "proj"
    src = REPO / "labs" / "LAB-3"
    shutil.copytree(src, proj, ignore=shutil.ignore_patterns(".lake", "target", "__pycache__"))
    return proj


def docker(proj: Path, script: str, image: str, name: str) -> tuple[int, str, float]:
    argv = ["docker", "run", "--rm", "--name", name, "--memory=6g", "--network", "none", "-v", f"{proj}:/w", "-w", "/w", image, "sh", "-c", script]
    t0 = time.monotonic()
    done = subprocess.run(argv, capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr, time.monotonic() - t0


HEADER_REF = """import MiniPlinthRef
open MiniPlinth MiniPlinthRef
"""


def outcomes_file(evals: list[dict[str, Any]], typings: list[dict[str, Any]]) -> str:
    lines = [HEADER_REF.rstrip(), "", f"def refProgram' : Program := {lab3.r_program(REF_PROGRAM)}", ""]
    for e in evals:
        for i, p in enumerate(POLICIES):
            lines.append(f"#eval IO.println (\"E {e['id']} {i} \" ++ (MiniPlinth.IR.outcome (execWith {lab3.r_policy(p)} refProgram' {lab3.r_call(e['call'])} {lab3.r_state(e['pre'])})).compress)")
    for t in typings:
        lines.append(f"#eval IO.println (\"T {t['id']} \" ++ (MiniPlinth.IR.typeOutcome (typecheck {lab3.r_cmd(t['command'])})).compress)")
    lines.append("#eval IO.println (\"P \" ++ (MiniPlinthRef.IR.program refProgram').compress)")
    lines.append("#eval IO.println (\"R \" ++ toString (decide (refProgram' = refProgram)))")
    return "\n".join(lines) + "\n"


def classify(outcome: dict[str, Any], pre: dict[str, Any]) -> str:
    if "error" in outcome:
        return outcome["error"]["tag"]
    if outcome["ok"]["state"] == {**pre, "holds": pre.get("holds", []), "frozen": pre.get("frozen", [])} and not outcome["ok"]["effects"]:
        return "unchanged"
    return "ok"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--image", default=IMAGE)
    ap.add_argument("--out", type=Path, default=REPO / "labs" / "LAB-3" / "challenge" / "goldens.json")
    ap.add_argument("--keep", action="store_true")
    args = ap.parse_args(argv)
    rng = random.Random(args.seed)
    evals = eval_inputs(rng)
    typings = typing_inputs(rng)
    scratch = Path(tempfile.mkdtemp(prefix="lab3-goldens-"))
    try:
        proj = lean_project(scratch)
        (proj / "Gen").mkdir()
        (proj / "Gen" / "Outcomes.lean").write_text(outcomes_file(evals, typings))
        rc, out, secs = docker(proj, "lake build MiniPlinth MiniPlinthRef >/dev/null && lake env lean Gen/Outcomes.lean", args.image, "lab3-goldens-eval")
        if rc != 0:
            sys.stderr.write(out[-4000:])
            return 1
        print(f"reference outcomes: {len(evals)} evaluator inputs x {len(POLICIES)} policies and {len(typings)} typing inputs in {secs:.1f} s")
        got_e: dict[tuple[str, int], dict[str, Any]] = {}
        got_t: dict[str, dict[str, Any]] = {}
        program = None
        same = None
        for line in out.splitlines():
            if line.startswith("E "):
                _, gid, i, js = line.split(" ", 3)
                got_e[(gid, int(i))] = json.loads(js)
            elif line.startswith("T "):
                _, tid, js = line.split(" ", 2)
                got_t[tid] = json.loads(js)
            elif line.startswith("P "):
                program = json.loads(line[2:])
            elif line.startswith("R "):
                same = line[2:].strip()
        if same != "true" or program is None:
            sys.stderr.write(f"the generator's refProgram is not the reference's (decide: {same})\n")
            return 1
        goldens: list[dict[str, Any]] = []
        for e in evals:
            for i, p in enumerate(POLICIES):
                o = got_e[(e["id"], i)]
                g = {"pool": "eval", "id": e["id"], "theorem": f"golden_{e['id']}", "program": "refProgram", "policy": p,
                     "pre": e["pre"], "call": e["call"], "outcome": o,
                     "strata": {"op": e["op"], "class": classify(o, e["pre"]), "boundary": e["boundary"]}, "source": e["source"]}
                g["statementSha256"] = lab3.golden_hash(lab3.eval_golden_statement(g, evaluator="exec", program="refProgram"))
                goldens.append(g)
        for t in typings:
            v = got_t[t["id"]]
            expected = {"ok": True} if t["rule"] == "accept" else {"error": t["rule"]}
            if v != expected:
                sys.stderr.write(f"typing input {t['id']} ({t['note']}): the reference says {v}, the generator meant {expected}\n")
                return 1
            g = {"pool": "typing", "id": t["id"], "theorem": f"golden_{t['id']}", "command": t["command"], "verdict": v, "note": t["note"]}
            g["statementSha256"] = lab3.golden_hash(lab3.typing_golden_statement(g))
            goldens.append(g)
        pool = {"schema": "statespace/ir@1", "programs": [REF_PROGRAM], "policy": REFERENCE_POLICY, "goldens": goldens}
        # Kernel-check every golden against the reference.
        ref_eval = [dict(g, theorem=f"ref_{g['id']}_p{POLICIES.index(g['policy'])}") for g in goldens if g["pool"] == "eval"]
        text_e, _ = lab3.golden_module(pool, kind="eval", header=HEADER_REF, evaluator="execWith {policy}", goldens=ref_eval)
        text_t, _ = lab3.golden_module(pool, kind="typing", header=HEADER_REF, evaluator="typecheck")
        (proj / "Gen" / "RefEval.lean").write_text(text_e)
        (proj / "Gen" / "RefTyping.lean").write_text(text_t)
        rc, out, secs = docker(proj, "lake env lean Gen/RefEval.lean && lake env lean Gen/RefTyping.lean", args.image, "lab3-goldens-kernel")
        clean = [ln for ln in out.splitlines() if "does not depend on any axioms" in ln]
        bad = [ln for ln in out.splitlines() if ("error" in ln or "depends on axioms" in ln)]
        n = len(ref_eval) + sum(1 for g in goldens if g["pool"] == "typing")
        print(f"kernel check: {len(clean)} of {n} goldens accepted with no axioms in {secs:.1f} s (exit {rc})")
        if rc != 0 or bad or len(clean) != n:
            sys.stderr.write("\n".join(bad[:20]) + "\n" + out[-2000:])
            return 1
        text = json.dumps(pool, indent=1, ensure_ascii=False) + "\n"
        args.out.write_text(text)
        from statespace.schema.statement_hash import statement_hash_text

        n_eval = sum(1 for g in goldens if g["pool"] == "eval")
        print(f"wrote {args.out.relative_to(REPO)}: {n_eval} evaluator goldens ({len(evals)} inputs x {len(POLICIES)} policies), "
              f"{len(typings)} typing goldens; pool hash {statement_hash_text(text)}")
        return 0
    finally:
        if args.keep:
            print(f"kept {scratch}")
        else:
            shutil.rmtree(scratch, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())

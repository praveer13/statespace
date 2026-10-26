"""The reference interpreter of Mini-Plinth over the LAB-10 fragment (reference module, earns nothing).

curriculum/S03-semantics.md sections 2.3 and 2.4: every operation is a posting pair, debit then credit, the
credit reading the updated state, so a self-posting changes nothing; the reference policy is zero reject,
self allow, guard error and overflow unbounded (decision 6). The outcome order is: arguments decode (an
amount is a positive integer, else badArgument), every account the command names exists (else
unknownAccount), the guard holds (else guardFailed), then the body runs.

A state is {"balances": {account: int}, "frozen": {account: bool}}; an account is a string, and `mint` and
`sink` are accounts of every state. `Inv` is total zero and every account but mint non-negative (S3 section
1.1, item 7).
"""

from __future__ import annotations

import copy
from typing import Any

from .lang import LITERAL_ACCOUNTS

__all__ = ["run", "inv_violations", "outcome_class", "eval_expr", "POLICY"]

POLICY = {"zero": "reject", "self": "allow", "guard": "error", "overflow": {"mode": "unbounded"}}


class _Err(Exception):
    def __init__(self, err: str) -> None:
        self.err = err


def _account(e: dict[str, Any], env: dict[str, Any]) -> str:
    if "account" in e:
        return str(e["account"])
    if "var" in e:
        return str(env[e["var"]])
    raise _Err("badArgument")


def eval_expr(e: dict[str, Any], env: dict[str, Any], state: dict[str, Any]) -> Any:
    if "int" in e:
        return e["int"]
    if "var" in e:
        return env[e["var"]]
    if "account" in e:
        return e["account"]
    if "balance" in e:
        return state["balances"][_account(e["balance"], env)]
    if "frozen" in e:
        return bool(state.get("frozen", {}).get(_account(e["frozen"], env), False))
    if "not" in e:
        return not eval_expr(e["not"], env, state)
    op = e["op"]
    a = eval_expr(e["args"][0], env, state)
    if op == "&&":
        return bool(a) and bool(eval_expr(e["args"][1], env, state))
    if op == "||":
        return bool(a) or bool(eval_expr(e["args"][1], env, state))
    b = eval_expr(e["args"][1], env, state)
    return {"+": lambda: a + b, "-": lambda: a - b, ">=": lambda: a >= b, "<=": lambda: a <= b, ">": lambda: a > b,
            "<": lambda: a < b, "=": lambda: a == b, "!=": lambda: a != b}[op]()


def run(program: dict[str, Any], types: dict[str, str], state: dict[str, Any], args: dict[str, Any]) -> dict[str, Any]:
    """One call. Returns {"ok": true, "state": ...} or {"ok": false, "err": ...}; never raises on input."""
    s = copy.deepcopy(state)
    s.setdefault("frozen", {})
    for name in LITERAL_ACCOUNTS:
        s["balances"].setdefault(name, 0)
    try:
        env: dict[str, Any] = {}
        for p in program["params"]:
            name, ty = p["name"], types[p["name"]]
            if name not in args:
                raise _Err("badArgument")
            v = args[name]
            if ty == "account":
                if not isinstance(v, str):
                    raise _Err("badArgument")
            elif ty == "bool":
                if not isinstance(v, bool):
                    raise _Err("badArgument")
            else:
                if isinstance(v, bool) or not isinstance(v, int):
                    raise _Err("badArgument")
                if ty == "amount" and v <= 0:
                    raise _Err("badArgument")  # zero: reject
            env[name] = v
        for p in program["params"]:
            if types[p["name"]] == "account" and env[p["name"]] not in s["balances"]:
                raise _Err("unknownAccount")
        if not eval_expr(program["requires"], env, s):
            raise _Err("guardFailed")
        for st in program["body"]:
            kind, part = next(iter(st.items()))
            if kind == "move":
                n = eval_expr(part["amount"], env, s)
                x, y = _account(part["from"], env), _account(part["to"], env)
                s["balances"][x] -= n
                s["balances"][y] += n  # reads the updated state: a self-move changes nothing
            elif kind == "deposit":
                n = eval_expr(part["amount"], env, s)
                y = _account(part["to"], env)
                s["balances"]["mint"] -= n
                s["balances"][y] += n
            else:
                s["frozen"][_account(part["of"], env)] = bool(eval_expr(part["value"], env, s))
    except _Err as err:
        return {"ok": False, "err": err.err}
    except KeyError:
        return {"ok": False, "err": "unknownAccount"}
    if not s["frozen"]:
        s.pop("frozen")
    return {"ok": True, "state": s}


def inv_violations(state: dict[str, Any]) -> list[str]:
    """The conjuncts of Inv the state breaks: `conserve` (total not zero) and `nonneg(<account>)`."""
    out: list[str] = []
    balances = state["balances"]
    if sum(balances.values()) != 0:
        out.append("conserve")
    out.extend(f"nonneg({a})" for a, v in sorted(balances.items()) if a != "mint" and v < 0)
    return out


def outcome_class(outcome: dict[str, Any]) -> str:
    """success, error:<typed error> or sqlstate:<code> (LAB-10.c3's outcome classes)."""
    if "sqlstate" in outcome and outcome["sqlstate"]:
        return f"sqlstate:{outcome['sqlstate']}"
    return "success" if outcome.get("ok") else f"error:{outcome.get('err')}"

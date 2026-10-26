"""LAB-4, `miniplinth check`: a verification-condition generator that emits SMT-LIB (curriculum/S04-obligations.md
section 2; content/stages/S4/lab.yaml). W3-T21 (LAB-4.1 to LAB-4.4) and W3-T22 (LAB-4.5 to LAB-4.9).

The learner's crate is `labs/LAB-4/miniplinth-check/`: pure functions over JSON (`wp_emit`, `vc_emit`,
`model_decode`, `bmc_emit`, `verdict_compose`) behind a host binary the template supplies, which reads one
request per line on standard input and writes one reply per line. The design grades LAB-4.2 to LAB-4.7 in the
tab on a wasm build (Lane A, D-14); until that host exists, `statespace check` builds the crate natively with
cargo and grades it here, on seeds drawn at grade time, against the reference below. Every query goes
through the Z3 lane, so each one is in the receipt with its rlimit and Z3's own verdict lines.

This module holds the course's reference semantics for LAB-4's command format (an interpreter, the
weakest-precondition and forward generators, bounded unrolling) and the checks. It is public: the oracles
are "unseen, not secret" (labs/README.md section 3); what is unseen is the seed.

The command format, `statespace/lab4-program@1`, is JSON (labs/LAB-4/README.md section 2):

    Expr  {"num": n} | {"var": x} | {"add": [e, e]} | {"sub": [e, e]}
    Form  {"bool": b} | {"le"|"lt"|"ge"|"gt"|"eq": [e, e]} | {"and"|"or": [f...]} | {"not": f}
          | {"implies": [f, f]} | {"forall": y, "body": f}
    Cmd   {"skip": {}} | {"assign": x, "expr": e} | {"move": {"from": x, "to": y, "amount": e}}
          | {"seq": [c...]} | {"if": f, "then": c, "else": c}
          | {"guard": f, "reading": "abort"|"assert"|"assume"|"reject", "body": c}
    Program  {"accounts": [x...], "init": f?, "commands": [{"name", "params", "requires", "body"}]}

A name resolves to the innermost bound variable, else a parameter, else an account. Vocabulary in SMT-LIB:
an account `x` is `x` before the step and `x_p` after it, a parameter `amount` is `p_amount`, and in a
bounded unrolling the state after step i is `x_<i>` and step i's parameter `p_amount_<i>`.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

RLIMIT = 5_000_000  # per query [D]
SEEDS = 20  # LAB-4.c2 to LAB-4.c4 [D]
FRESH_C5 = 10  # LAB-4.c5 [D]
CTI_SEEDS = 10  # LAB-4.c6 [D]
BOUND_N = 4  # LAB-4.c6's search bound [D]
CHAIN = 12  # LAB-4.c3's chain of sequential ifs [D]
SIZE_LIMIT = 65_536  # characters of SMT-LIB a reply may hold [D]
REDRAWS = 5  # unknown seeds redrawn per check, at most [D]
CRATE = "labs/LAB-4/miniplinth-check"
FIXTURES = "labs/LAB-4/fixtures"
READING = "labs/LAB-4/reading.json"
TEMPLATE_FILES = ("src/json.rs", "src/ir.rs", "src/smt.rs", "src/main.rs")  # the semantics both builds share

Json = Any


class Outside(ValueError):
    """A command outside the fragment the route handles."""


# =========================================================================================== the format
def _num(n: int) -> Json:
    return {"num": n}


def _var(x: str) -> Json:
    return {"var": x}


def _add(a: Json, b: Json) -> Json:
    return {"add": [a, b]}


def _sub(a: Json, b: Json) -> Json:
    return {"sub": [a, b]}


def _and(*fs: Json) -> Json:
    return {"and": list(fs)}


def _or(*fs: Json) -> Json:
    return {"or": list(fs)}


def _not(f: Json) -> Json:
    return {"not": f}


def _imp(a: Json, b: Json) -> Json:
    return {"implies": [a, b]}


def _cmp(op: str, a: Json, b: Json) -> Json:
    return {op: [a, b]}


CMP = {"le": "<=", "lt": "<", "ge": ">=", "gt": ">", "eq": "="}


def e_vars(e: Json) -> set[str]:
    if "num" in e:
        return set()
    if "var" in e:
        return {e["var"]}
    a, b = e.get("add") or e["sub"]
    return e_vars(a) | e_vars(b)


def f_free(f: Json) -> set[str]:
    if "bool" in f:
        return set()
    for op in CMP:
        if op in f:
            return e_vars(f[op][0]) | e_vars(f[op][1])
    if "and" in f or "or" in f:
        return set().union(*(f_free(g) for g in (f.get("and") if "and" in f else f["or"])))
    if "not" in f:
        return f_free(f["not"])
    if "implies" in f:
        return f_free(f["implies"][0]) | f_free(f["implies"][1])
    if "forall" in f:
        return f_free(f["body"]) - {f["forall"]}
    if "app" in f:
        return set().union(*(e_vars(a) for a in f["args"]))
    raise ValueError(f"not a formula: {json.dumps(f)[:80]}")


def e_subst(e: Json, m: dict[str, Json]) -> Json:
    if "num" in e:
        return e
    if "var" in e:
        return m.get(e["var"], e)
    key = "add" if "add" in e else "sub"
    return {key: [e_subst(e[key][0], m), e_subst(e[key][1], m)]}


def _fresh(base: str, avoid: set[str]) -> str:
    i = 1
    while f"{base}_{i}" in avoid:
        i += 1
    return f"{base}_{i}"


def f_subst(f: Json, m: dict[str, Json], reserved: set[str] = frozenset()) -> Json:  # type: ignore[assignment]
    """Simultaneous, capture-avoiding substitution: a bound variable that would capture a free name of a
    substituted expression is renamed first."""
    if not m or "bool" in f:
        return f
    for op in CMP:
        if op in f:
            return {op: [e_subst(f[op][0], m), e_subst(f[op][1], m)]}
    if "and" in f:
        return {"and": [f_subst(g, m, reserved) for g in f["and"]]}
    if "or" in f:
        return {"or": [f_subst(g, m, reserved) for g in f["or"]]}
    if "not" in f:
        return {"not": f_subst(f["not"], m, reserved)}
    if "implies" in f:
        return {"implies": [f_subst(f["implies"][0], m, reserved), f_subst(f["implies"][1], m, reserved)]}
    if "app" in f:
        return {"app": f["app"], "args": [e_subst(a, m) for a in f["args"]]}
    if "forall" in f:
        y, body = f["forall"], f["body"]
        live = {x: e for x, e in m.items() if x != y and x in f_free(body)}
        if not live:
            return f
        incoming = set().union(*(e_vars(e) for e in live.values()))
        if y in incoming:
            y2 = _fresh(y, incoming | f_free(body) | set(reserved) | set(live))
            body = f_subst(body, {y: _var(y2)}, reserved)
            y = y2
        return {"forall": y, "body": f_subst(body, live, reserved)}
    raise ValueError(f"not a formula: {json.dumps(f)[:80]}")


def writes(c: Json) -> list[str]:
    """The accounts a command may write, in order of first write."""
    out: list[str] = []

    def go(c: Json) -> None:
        if "assign" in c:
            out.append(c["assign"])
        elif "move" in c:
            out.extend([c["move"]["from"], c["move"]["to"]])
        elif "seq" in c:
            for d in c["seq"]:
                go(d)
        elif "if" in c:
            go(c["then"])
            go(c["else"])
        elif "guard" in c:
            go(c["body"])

    go(c)
    return list(dict.fromkeys(out))


# ======================================================================================== the interpreter
def ev(e: Json, s: dict[str, int], env: dict[str, int], bound: dict[str, int] | None = None) -> int:
    if "num" in e:
        return int(e["num"])
    if "var" in e:
        x = e["var"]
        if bound and x in bound:
            return bound[x]
        if x in env:
            return env[x]
        return s[x]
    if "add" in e:
        return ev(e["add"][0], s, env, bound) + ev(e["add"][1], s, env, bound)
    return ev(e["sub"][0], s, env, bound) - ev(e["sub"][1], s, env, bound)


def holds(f: Json, s: dict[str, int], env: dict[str, int]) -> bool:
    if "bool" in f:
        return bool(f["bool"])
    for op, sym in CMP.items():
        if op in f:
            a, b = ev(f[op][0], s, env), ev(f[op][1], s, env)
            return {"le": a <= b, "lt": a < b, "ge": a >= b, "gt": a > b, "eq": a == b}[op]
    if "and" in f:
        return all(holds(g, s, env) for g in f["and"])
    if "or" in f:
        return any(holds(g, s, env) for g in f["or"])
    if "not" in f:
        return not holds(f["not"], s, env)
    if "implies" in f:
        return (not holds(f["implies"][0], s, env)) or holds(f["implies"][1], s, env)
    raise ValueError("the interpreter evaluates quantifier-free formulas only")


def exec_cmd(c: Json, s: dict[str, int], env: dict[str, int]) -> tuple[str, dict[str, int]]:
    """Run a command body. Outcomes: ok, abort, error (a failed assert), ignored (a failed assume). A failed
    reject guard leaves the state as it was at the guard, and the command goes on."""
    if "skip" in c:
        return "ok", s
    if "assign" in c:
        return "ok", {**s, c["assign"]: ev(c["expr"], s, env)}
    if "move" in c:
        m = c["move"]
        v = ev(m["amount"], s, env)
        s1 = {**s, m["from"]: s[m["from"]] - v}
        return "ok", {**s1, m["to"]: s1[m["to"]] + v}
    if "seq" in c:
        for d in c["seq"]:
            kind, s = exec_cmd(d, s, env)
            if kind != "ok":
                return kind, s
        return "ok", s
    if "if" in c:
        return exec_cmd(c["then"] if holds(c["if"], s, env) else c["else"], s, env)
    if "guard" in c:
        if holds(c["guard"], s, env):
            return exec_cmd(c["body"], s, env)
        return {"abort": "abort", "assert": "error", "assume": "ignored", "reject": "ok"}[c["reading"]], s
    raise ValueError(f"not a command: {json.dumps(c)[:80]}")


def run_command(cmd: Json, s: dict[str, int], params: dict[str, int]) -> tuple[str, dict[str, int]]:
    """A Mini-Plinth step: rejected (state unchanged) when `requires` fails, else the body's outcome."""
    if not holds(cmd["requires"], s, params):
        return "rejected", s
    return exec_cmd(cmd["body"], s, params)


# ============================================================================================ SMT-LIB
@dataclass(frozen=True)
class Names:
    accounts: tuple[str, ...]
    params: tuple[str, ...]
    acct_sfx: str = ""
    param_sfx: str = ""
    acct_terms: dict[str, str] | None = None  # an account's term, overriding its name (symbolic execution)

    def name(self, x: str, bound: frozenset[str]) -> str:
        if x in bound:
            return x
        if x in self.params:
            return f"p_{x}{self.param_sfx}"
        if x in self.accounts:
            return self.acct_terms[x] if self.acct_terms is not None else f"{x}{self.acct_sfx}"
        raise ValueError(f"the name {x!r} is not an account, a parameter or a bound variable")


def p_num(n: int) -> str:
    return str(n) if n >= 0 else f"(- {-n})"


def p_expr(e: Json, n: Names, bound: frozenset[str] = frozenset()) -> str:
    if "num" in e:
        return p_num(int(e["num"]))
    if "var" in e:
        return n.name(e["var"], bound)
    key = "add" if "add" in e else "sub"
    return f"({'+' if key == 'add' else '-'} {p_expr(e[key][0], n, bound)} {p_expr(e[key][1], n, bound)})"


def p_form(f: Json, n: Names, bound: frozenset[str] = frozenset()) -> str:
    if "bool" in f:
        return "true" if f["bool"] else "false"
    for op, sym in CMP.items():
        if op in f:
            return f"({sym} {p_expr(f[op][0], n, bound)} {p_expr(f[op][1], n, bound)})"
    for op, unit in (("and", "true"), ("or", "false")):
        if op in f:
            parts = [p_form(g, n, bound) for g in f[op]]
            return unit if not parts else parts[0] if len(parts) == 1 else f"({op} {' '.join(parts)})"
    if "not" in f:
        return f"(not {p_form(f['not'], n, bound)})"
    if "implies" in f:
        return f"(=> {p_form(f['implies'][0], n, bound)} {p_form(f['implies'][1], n, bound)})"
    if "forall" in f:
        y = f["forall"]
        return f"(forall (({y} Int)) {p_form(f['body'], n, bound | {y})})"
    if "app" in f:
        args = [p_expr(a, n, bound) for a in f["args"]]
        return f"({f['app']} {' '.join(args)})" if args else f["app"]
    raise ValueError(f"not a formula: {json.dumps(f)[:80]}")


def named(term: str, name: str) -> str:
    return f"(! {term} :named {name})"


# ======================================================================= weakest preconditions (reference)
@dataclass
class Defs:
    accounts: tuple[str, ...]
    params: tuple[str, ...]
    prefix: str = "ref_q"
    texts: list[str] = field(default_factory=list[str])

    def name(self, q: Json) -> Json:
        """Name a formula over the state with define-fun, so that a branch applies it instead of copying it."""
        if "app" in q or "bool" in q:
            return q
        fn = f"{self.prefix}{len(self.texts)}"
        formals = " ".join(f"({a} Int)" for a in self.accounts)
        self.texts.append(f"(define-fun {fn} ({formals}) Bool {p_form(q, Names(self.accounts, self.params))})")
        return {"app": fn, "args": [_var(a) for a in self.accounts]}


def wp(c: Json, q: Json, d: Defs) -> Json:
    reserved = set(d.accounts) | set(d.params)
    if "skip" in c:
        return q
    if "assign" in c:
        return f_subst(q, {c["assign"]: c["expr"]}, reserved)
    if "move" in c:
        m = c["move"]
        if m["from"] == m["to"]:
            return q
        return f_subst(q, {m["from"]: _sub(_var(m["from"]), m["amount"]), m["to"]: _add(_var(m["to"]), m["amount"])}, reserved)
    if "seq" in c:
        for step in reversed(c["seq"]):
            q = wp(step, q, d)
        return q
    if "if" in c:
        q = d.name(q)
        return _and(_imp(c["if"], wp(c["then"], q, d)), _imp(_not(c["if"]), wp(c["else"], q, d)))
    if "guard" in c:
        g, reading = c["guard"], c["reading"]
        if reading in ("abort", "assert"):
            return _and(g, wp(c["body"], q, d))
        if reading == "assume":
            return _imp(g, wp(c["body"], q, d))
        q = d.name(q)
        return _and(_imp(g, wp(c["body"], q, d)), _imp(_not(g), q))
    raise ValueError(f"not a command: {json.dumps(c)[:80]}")


# ======================================================================= forward symbolic execution
def forward(c: Json, n: Names, terms: dict[str, str]) -> dict[str, str]:
    """The post-state of a body as SMT-LIB terms over the pre-state, with `ite` at each `if`."""
    here = Names(n.accounts, n.params, n.acct_sfx, n.param_sfx, terms)
    if "skip" in c:
        return terms
    if "assign" in c:
        return {**terms, c["assign"]: p_expr(c["expr"], here)}
    if "move" in c:
        m = c["move"]
        v = p_expr(m["amount"], here)
        t1 = {**terms, m["from"]: f"(- {terms[m['from']]} {v})"}
        return {**t1, m["to"]: f"(+ {t1[m['to']]} {v})"}
    if "seq" in c:
        for step in c["seq"]:
            terms = forward(step, n, terms)
        return terms
    if "if" in c:
        cond = p_form(c["if"], here)
        a, b = forward(c["then"], n, terms), forward(c["else"], n, terms)
        return {x: a[x] if a[x] == b[x] else f"(ite {cond} {a[x]} {b[x]})" for x in terms}
    raise Outside("a guard inside a command body is outside the forward route's fragment")


def command(program: Json, name: str) -> Json:
    for cmd in program["commands"]:
        if cmd["name"] == name:
            return cmd
    raise ValueError(f"the program has no command {name}")


def vc_reference(program: Json, name: str, inv: Json, route: str = "forward") -> tuple[list[str], str]:
    """Inv ∧ Guard ∧ Step ∧ ¬Inv′ with its named conjuncts: the reference obligation."""
    cmd = command(program, name)
    accts, params = tuple(program["accounts"]), tuple(cmd["params"])
    pre = Names(accts, params)
    parts = [named(p_form(inv, pre), "inv_pre"), named(p_form(cmd["requires"], pre), "guard")]
    if route == "wp":
        d = Defs(accts, params)
        w = wp(cmd["body"], inv, d)
        parts.append(named(f"(not {p_form(w, pre)})", "neg_inv_post"))
        return d.texts, f"(and {' '.join(parts)})"
    post = forward(cmd["body"], pre, {a: a for a in accts})
    written = set(writes(cmd["body"]))
    i = 0
    for a in accts:
        if a in written:
            parts.append(named(f"(= {a}_p {post[a]})", f"step_{i}"))
            i += 1
    parts.extend(named(f"(= {a}_p {a})", f"frame_{a}") for a in accts if a not in written)
    parts.append(named(f"(not {p_form(inv, Names(accts, params, acct_sfx='_p'))})", "neg_inv_post"))
    return [], f"(and {' '.join(parts)})"


def declarations(accounts: Iterable[str], params: Iterable[str], post: bool = True) -> list[str]:
    accounts = list(accounts)
    out = [f"(declare-const {a} Int)" for a in accounts]
    if post:
        out += [f"(declare-const {a}_p Int)" for a in accounts]
    out += [f"(declare-const p_{x} Int)" for x in params]
    return out


def script(decls: list[str], defs: list[str], assertion: str) -> str:
    return "\n".join(["(set-logic ALL)", *decls, *defs, f"(assert {assertion})", "(check-sat)"]) + "\n"


def all_params(program: Json) -> list[str]:
    return list(dict.fromkeys(p for c in program["commands"] for p in c["params"]))


def bmc_reference(program: Json, inv: Json, k: int) -> tuple[list[str], str]:
    """Init(s0) ∧ T(s0,s1) ∧ … ∧ T(sk−1,sk) ∧ ¬Inv(sk); a failed guard is a stutter step."""
    accts = tuple(program["accounts"])
    params = tuple(all_params(program))
    parts = [p_form(program["init"], Names(accts, params, acct_sfx="_0"))]
    m = len(program["commands"])
    for i in range(1, k + 1):
        pre = Names(accts, params, acct_sfx=f"_{i - 1}", param_sfx=f"_{i}")
        step = [f"(<= 0 cmd_{i})", f"(< cmd_{i} {m})"]
        for j, cmd in enumerate(program["commands"]):
            post = forward(cmd["body"], pre, {a: f"{a}_{i - 1}" for a in accts})
            moved = " ".join(f"(= {a}_{i} {post[a]})" for a in accts)
            stay = " ".join(f"(= {a}_{i} {a}_{i - 1})" for a in accts)
            step.append(f"(=> (= cmd_{i} {j}) (ite {p_form(cmd['requires'], pre)} (and {moved}) (and {stay})))")
        parts.append(f"(and {' '.join(step)})")
    parts.append(f"(not {p_form(inv, Names(accts, params, acct_sfx=f'_{k}'))})")
    return [], f"(and {' '.join(parts)})"


def bmc_declarations(program: Json, k: int) -> list[str]:
    accts = program["accounts"]
    out = [f"(declare-const {a}_{i} Int)" for i in range(k + 1) for a in accts]
    out += [f"(declare-const p_{x}_{i} Int)" for i in range(1, k + 1) for x in all_params(program)]
    out += [f"(declare-const cmd_{i} Int)" for i in range(1, k + 1)]
    return out


# ============================================================================= named conjuncts in a text
def _sexprs(text: str) -> list[Any]:
    from statespace.lanes.z3 import parse_sexprs

    return parse_sexprs(text)


def _render(x: Any) -> str:
    from statespace.lanes.z3 import render

    return render(x)


def conjunct_names(text: str) -> list[str]:
    out: list[str] = []

    def walk(x: Any) -> None:
        if isinstance(x, list):
            if len(x) >= 4 and x[0] == "!" and ":named" in x:
                i = x.index(":named")
                if i + 1 < len(x) and isinstance(x[i + 1], str):
                    out.append(x[i + 1])
            for y in x:
                walk(y)

    for form in _sexprs(text):
        walk(form)
    return out


def delete_named(text: str, name: str, replacement: str = "true") -> str:
    """The text with the named conjunct `name` replaced by `true` (or `replacement`): how a check mutates
    a learner's query whatever the code's structure (curriculum/S04 section 2.2)."""

    def walk(x: Any) -> Any:
        if isinstance(x, list):
            if len(x) >= 4 and x[0] == "!" and ":named" in x and x[x.index(":named") + 1 : x.index(":named") + 2] == [name]:
                return replacement
            return [walk(y) for y in x]
        return x

    return "\n".join(_render(walk(f)) for f in _sexprs(text)) + "\n"


# ============================================================================================ models
def model_ints(run: Any) -> dict[str, int]:
    from statespace.lanes.z3 import term_value

    out: dict[str, int] = {}
    if run.model is None:
        return out
    for name, term in run.model.constants.items():
        v = term_value(term)
        if isinstance(v, int) and not isinstance(v, bool):
            out[name] = v
    return out


def model_raw(run: Any) -> dict[str, str]:
    return dict(run.model.constants) if run.model is not None else {}


def decode_step(program: Json, name: str, model: dict[str, int]) -> dict[str, dict[str, int]]:
    cmd = command(program, name)
    return {
        "pre": {a: model.get(a, 0) for a in program["accounts"]},
        "params": {x: model.get(f"p_{x}", 0) for x in cmd["params"]},
        "post": {a: model.get(f"{a}_p", model.get(a, 0)) for a in program["accounts"]},
    }


def _ints(d: Any, keys: Iterable[str]) -> dict[str, int] | None:
    if not isinstance(d, dict):
        return None
    out: dict[str, int] = {}
    for k in keys:
        v = d.get(k)
        if not isinstance(v, int) or isinstance(v, bool):
            return None
        out[k] = v
    return out


def replay_violation(program: Json, name: str, inv: Json, w: Any) -> tuple[bool, str]:
    """A decoded counterexample replays when the step runs from its pre-state, reaches its post-state, and
    the pre-state satisfies Inv while the post-state does not."""
    cmd = command(program, name)
    pre, params = _ints(w.get("pre") if isinstance(w, dict) else None, program["accounts"]), _ints(w.get("params") if isinstance(w, dict) else None, cmd["params"])
    post = _ints(w.get("post") if isinstance(w, dict) else None, program["accounts"])
    if pre is None or params is None or post is None:
        return False, "the decoded witness lacks an integer for some account or parameter"
    if not holds(inv, pre, params):
        return False, f"Inv fails in the decoded pre-state {_show(pre)}"
    kind, after = run_command(cmd, pre, params)
    if kind != "ok":
        return False, f"the interpreter's step from {_show(pre)} with {_show(params)} is {kind}, not a step that runs"
    if after != post:
        return False, f"the interpreter reaches {_show(after)}, not the decoded post-state {_show(post)}"
    if holds(inv, after, params):
        return False, f"Inv holds after the step, at {_show(after)}"
    return True, f"{name}({_show(params)}) from {_show(pre)} reaches {_show(after)}, where Inv fails"


def replay_success(program: Json, name: str, inv: Json, w: Any) -> tuple[bool, str]:
    cmd = command(program, name)
    pre, params = _ints(w.get("pre") if isinstance(w, dict) else None, program["accounts"]), _ints(w.get("params") if isinstance(w, dict) else None, cmd["params"])
    post = _ints(w.get("post") if isinstance(w, dict) else None, program["accounts"])
    if pre is None or params is None or post is None:
        return False, "the decoded witness lacks an integer for some account or parameter"
    if not holds(inv, pre, params):
        return False, f"Inv fails in the witness's pre-state {_show(pre)}"
    kind, after = run_command(cmd, pre, params)
    if kind != "ok":
        return False, f"the step from {_show(pre)} with {_show(params)} is {kind}"
    if after != post:
        return False, f"the interpreter reaches {_show(after)}, not the witness's post-state {_show(post)}"
    return True, f"{name}({_show(params)}) from {_show(pre)} runs to {_show(after)}"


def replay_trace(program: Json, inv: Json, trace: Any, k: int) -> tuple[bool, str]:
    if not isinstance(trace, dict):
        return False, "no trace"
    init = _ints(trace.get("init"), program["accounts"])
    steps = trace.get("steps")
    if init is None or not isinstance(steps, list):
        return False, "the trace needs init (an integer per account) and steps"
    if len(steps) != k:
        return False, f"the trace has {len(steps)} steps, and the verdict says {k}"
    if not holds(program["init"], init, {}):
        return False, f"Init fails at {_show(init)}"
    s = init
    for i, step in enumerate(steps, 1):
        try:
            cmd = command(program, step.get("command"))
        except (ValueError, AttributeError):
            return False, f"step {i} names no command of the system"
        params = _ints(step.get("params"), cmd["params"])
        if params is None:
            return False, f"step {i} lacks its parameters"
        kind, s = run_command(cmd, s, params)
        if kind not in ("ok", "rejected"):
            return False, f"step {i} ({cmd['name']}) is {kind}"
    if holds(inv, s, {}):
        return False, f"Inv still holds at the end, {_show(s)}"
    return True, f"{len(steps)} steps from {_show(init)} reach {_show(s)}, where Inv fails"


def _show(d: dict[str, int]) -> str:
    return " ".join(f"{k}={v}" for k, v in d.items()) or "(nothing)"


# ======================================================================================= fixtures, seeds
def fixture(ctx: CheckContext, name: str) -> Json:
    rel = f"{FIXTURES}/{name}.json"
    try:
        return json.loads(ctx.text(rel))
    except json.JSONDecodeError as error:
        raise InputRefused(f"{rel} is not JSON ({error})") from error


INV3 = ("a", "b", "c")


def inv_nonneg(accts: Iterable[str]) -> Json:
    return _and(*(_cmp("ge", _var(a), _num(0)) for a in accts))


def _lin(rng: Any, names: list[str]) -> Json:
    k = rng.randint(1, 2)
    picked = rng.sample(names, k)
    e: Json = _var(picked[0])
    for x in picked[1:]:
        e = _add(e, _var(x)) if rng.random() < 0.6 else _sub(e, _var(x))
    c = rng.randint(-2, 3)
    return _add(e, _num(c)) if c > 0 else _sub(e, _num(-c)) if c < 0 else e


def _atom(rng: Any, names: list[str]) -> Json:
    return _cmp(rng.choice(["le", "lt", "ge", "gt", "eq"]), _lin(rng, names), _num(rng.randint(-2, 4)))


def _post(rng: Any, names: list[str]) -> Json:
    return _and(*(_atom(rng, names) for _ in range(rng.randint(1, 3))))


def seeds_t1(rng: Any, count: int) -> list[tuple[str, Json]]:
    """GEN-wp-it t1 shapes: assignments and ResourceOps, aliasing and capture-prone seeds included."""
    accts, params = list(INV3), ["amount", "k"]
    names = accts + params
    kinds = ["move-alias", "move-mentions-from", "capture", "swap"]
    kinds += [rng.choice(["assign", "move", "assign", "move-alias", "capture", "swap", "move-mentions-from"]) for _ in range(count - len(kinds))]
    out: list[tuple[str, Json]] = []
    for kind in kinds:
        x, y, z = rng.sample(accts, 3)
        post = _post(rng, names)
        if kind == "assign":
            cmd: Json = {"assign": x, "expr": _lin(rng, names)}
        elif kind == "move":
            cmd = {"move": {"from": x, "to": y, "amount": _lin(rng, ["amount", "k"])}}
        elif kind == "move-alias":
            cmd = {"move": {"from": x, "to": x, "amount": _var("amount")}}
            post = _and(_cmp("ge", _var(x), _num(rng.randint(0, 2))), _post(rng, names))
        elif kind == "move-mentions-from":
            cmd = {"move": {"from": x, "to": y, "amount": _sub(_var(x), _num(rng.randint(0, 1)))}}
            post = _and(_cmp("ge", _var(y), _num(rng.randint(0, 3))), _cmp("le", _var(x), _num(1)))
        elif kind == "swap":
            cmd = {"seq": [{"assign": x, "expr": _var(y)}, {"assign": y, "expr": _var(x)}]}
            post = _and(_cmp("eq", _sub(_var(x), _var(y)), _num(0)), _post(rng, [x, y, z]))
        else:  # capture: Q binds a name that the assigned expression mentions
            cmd = {"assign": x, "expr": _add(_var(x), _var(y))}
            post = {"forall": y, "body": _imp(_cmp("ge", _var(y), _num(0)), _cmp("ge", _add(_var(x), _var(y)), _num(rng.randint(-1, 2))))}
        out.append((kind, {"accounts": accts, "params": params, "cmd": cmd, "post": post}))
    return out


def _small_cmd(rng: Any, accts: list[str]) -> Json:
    x, y = rng.sample(accts, 2)
    return rng.choice([
        {"assign": x, "expr": _add(_var(x), _var("amount"))},
        {"assign": x, "expr": _sub(_var(y), _num(rng.randint(0, 2)))},
        {"move": {"from": x, "to": y, "amount": _var("amount")}},
        {"skip": {}},
    ])


def seeds_t23(rng: Any, count: int) -> list[tuple[str, Json]]:
    """GEN-wp-it t2 and t3 shapes: sequences, conditionals, and a guard under each of its four readings."""
    accts, params = list(INV3), ["amount"]
    names = accts + params
    readings = ["abort", "assert", "assume", "reject"]
    kinds = [f"guard-{r}" for r in readings]
    kinds += [rng.choice(["seq-if", "nested-if", "guard-seq", "guard-abort", "guard-assume", "guard-reject", "guard-assert"]) for _ in range(count - len(kinds))]
    out: list[tuple[str, Json]] = []
    for kind in kinds:
        post = _post(rng, names)
        cond = _atom(rng, names)
        if kind.startswith("guard-") and kind != "guard-seq":
            cmd: Json = {"guard": cond, "reading": kind.split("-", 1)[1], "body": _small_cmd(rng, accts)}
        elif kind == "seq-if":
            cmd = {"seq": [_small_cmd(rng, accts), {"if": cond, "then": _small_cmd(rng, accts), "else": _small_cmd(rng, accts)}]}
        elif kind == "nested-if":
            cmd = {"if": cond, "then": {"if": _atom(rng, names), "then": _small_cmd(rng, accts), "else": _small_cmd(rng, accts)}, "else": _small_cmd(rng, accts)}
        else:
            cmd = {"seq": [{"guard": cond, "reading": rng.choice(readings), "body": _small_cmd(rng, accts)}, _small_cmd(rng, accts)]}
        out.append((kind, {"accounts": accts, "params": params, "cmd": cmd, "post": post}))
    return out


def chain_seed(rng: Any) -> Json:
    accts = list(INV3)
    steps = [
        {"if": _cmp("gt", _var("a"), _num(rng.randint(-3, 3))), "then": {"assign": "a", "expr": _sub(_var("a"), _num(1))}, "else": {"assign": "b", "expr": _add(_var("b"), _var("amount"))}}
        for _ in range(CHAIN)
    ]
    post = _and(_cmp("ge", _add(_var("a"), _var("b")), _num(0)), _cmp("le", _var("c"), _add(_var("a"), _num(5))))
    return {"accounts": accts, "params": ["amount"], "cmd": {"seq": steps}, "post": post}


ACCTS4 = ["a", "b", "c", "d"]


def obligation_seed(rng: Any, true: bool) -> tuple[str, Json, str, Json]:
    """A Mini-Plinth command over four accounts, known to preserve Inv (true) or known to break it."""
    f, t, u = rng.sample(ACCTS4, 3)
    pos = _cmp("gt", _var("amount"), _num(0))
    covered = _and(pos, _cmp("le", _var("amount"), _var(f)))
    mv = {"move": {"from": f, "to": t, "amount": _var("amount")}}
    if true:
        family = rng.choice(["transfer", "deposit", "if-transfer", "two-hop", "withdraw", "fee"])
        req, body = {
            "transfer": (covered, mv),
            "deposit": (pos, {"assign": t, "expr": _add(_var(t), _var("amount"))}),
            "if-transfer": (pos, {"if": _cmp("le", _var("amount"), _var(f)), "then": mv, "else": {"skip": {}}}),
            "two-hop": (covered, {"seq": [mv, {"move": {"from": t, "to": u, "amount": _var("amount")}}]}),
            "withdraw": (covered, {"assign": f, "expr": _sub(_var(f), _var("amount"))}),
            "fee": (_and(pos, _cmp("le", _add(_var("amount"), _num(1)), _var(f))), {"seq": [mv, {"move": {"from": f, "to": u, "amount": _num(1)}}]}),
        }[family]
    else:
        family = rng.choice(["unguarded-withdraw", "off-by-one", "third-account-fee", "wrong-direction"])
        req, body = {
            "unguarded-withdraw": (pos, {"assign": f, "expr": _sub(_var(f), _var("amount"))}),
            "off-by-one": (_and(pos, _cmp("le", _var("amount"), _add(_var(f), _num(1)))), mv),
            "third-account-fee": (covered, {"seq": [mv, {"assign": u, "expr": _sub(_var(u), _num(1))}]}),
            "wrong-direction": (covered, {"move": {"from": t, "to": f, "amount": _var("amount")}}),
        }[family]
    name = "".join(w.capitalize() for w in family.split("-"))
    program = {"accounts": ACCTS4, "commands": [{"name": name, "params": ["amount"], "requires": req, "body": body}]}
    return family, program, name, inv_nonneg(ACCTS4)


def holds_system(twin: bool) -> Json:
    pos = _cmp("gt", _var("n"), _num(0))
    hold_guard = _cmp("le", _var("n"), _var("bal")) if twin else _cmp("le", _var("n"), _sub(_var("bal"), _var("held")))
    return {
        "accounts": ["bal", "held"],
        "init": _and(_cmp("ge", _var("bal"), _num(0)), _cmp("eq", _var("held"), _num(0))),
        "commands": [
            {"name": "Hold", "params": ["n"], "requires": _and(pos, hold_guard), "body": {"assign": "held", "expr": _add(_var("held"), _var("n"))}},
            {"name": "Capture", "params": ["n"], "requires": _and(pos, _cmp("le", _var("n"), _var("held"))), "body": {"seq": [{"assign": "held", "expr": _sub(_var("held"), _var("n"))}, {"assign": "bal", "expr": _sub(_var("bal"), _var("n"))}]}},
            {"name": "Release", "params": ["n"], "requires": _and(pos, _cmp("le", _var("n"), _var("held"))), "body": {"assign": "held", "expr": _sub(_var("held"), _var("n"))}},
        ],
    }


def cti_seed(rng: Any) -> tuple[str, Json, Json]:
    twin = rng.random() < 0.5
    c = rng.randint(0, 3)
    bal, held = _var("bal"), _var("held")
    family = rng.choice(["bal-nonneg", "strengthened", "held-zero", "held-bounded", "bal-above", "sum", "bal-covers-held"])
    inv = {
        "bal-nonneg": _cmp("ge", bal, _num(0)),
        "strengthened": _and(_cmp("ge", bal, _num(0)), _cmp("le", _num(0), held), _cmp("le", held, bal)),
        "held-zero": _cmp("eq", held, _num(0)),
        "held-bounded": _cmp("le", held, _num(c)),
        "bal-above": _cmp("ge", bal, _num(-c)),
        "sum": _cmp("ge", _add(bal, held), _num(0)),
        "bal-covers-held": _and(_cmp("ge", held, _num(0)), _cmp("ge", bal, held)),
    }[family]
    return f"{family}{' (twin)' if twin else ''}", holds_system(twin), inv


# =================================================================================== the learner's crate
@dataclass
class Crate:
    rel: str
    binary: Path


def _cargo() -> str:
    found = shutil.which("cargo")
    if not found:
        raise ToolUnavailable("cargo is not installed here; Rust 1.96 is on the Bench (the devcontainer), or install it (labs/TOOLS.md)")
    return found


def build(ctx: CheckContext, rel: str, *, root: Path | None = None) -> Crate | CheckResult:
    """Build a crate with cargo (release, offline: the crate has no dependencies). A build that fails is the
    learner's implementation; a cargo that is missing is ToolUnavailable."""
    base = root if root is not None else ctx.root
    crate = (base / rel).resolve() if root is not None else ctx.path(rel)
    if not (crate / "Cargo.toml").is_file():
        return CheckResult(False, f"{rel}/Cargo.toml is not there: the crate this stage builds", "implementation")
    cargo = _cargo()
    target = crate / "target"
    try:
        done = subprocess.run([cargo, "build", "--release", "--offline", "--quiet", "--manifest-path", str(crate / "Cargo.toml"), "--target-dir", str(target)], capture_output=True, text=True, errors="replace", timeout=900, stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired:
        return CheckResult(False, f"cargo build of {rel} took longer than 900 s", "implementation")
    if done.returncode != 0:
        errors = [l for l in done.stderr.splitlines() if l.startswith("error")][:4] or done.stderr.strip().splitlines()[-4:]
        return CheckResult(False, f"cargo build of {rel} failed", "implementation", tuple(errors))
    binary = target / "release" / ("miniplinth-check.exe" if os.name == "nt" else "miniplinth-check")
    if not binary.is_file():
        return CheckResult(False, f"cargo built {rel} but no binary miniplinth-check came out: keep the template's [[bin]] and src/main.rs", "implementation")
    ctx.tcb(f"your VC generator ({rel}), compiled by cargo", "tested")
    return Crate(rel, binary)


class Call:
    """One reply of the learner's host binary: ok with a value, or an error message."""

    def __init__(self, raw: Any) -> None:
        self.ok = isinstance(raw, dict) and "ok" in raw
        self.value = raw.get("ok") if self.ok else None
        self.error = None if self.ok else (str(raw.get("error")) if isinstance(raw, dict) and "error" in raw else f"no reply ({json.dumps(raw)[:80]})")


def call(crate: Crate, fn: str, args: list[Json]) -> list[Call]:
    """Send a batch of requests to a fresh process of the learner's binary: one JSON line per request."""
    if not args:
        return []
    stdin = "".join(json.dumps({"fn": fn, "arg": a}) + "\n" for a in args)
    try:
        done = subprocess.run([str(crate.binary)], input=stdin, capture_output=True, text=True, errors="replace", timeout=120)
    except subprocess.TimeoutExpired:
        return [Call({"error": f"{fn} took longer than 120 s"}) for _ in args]
    replies: list[Any] = []
    for line in done.stdout.splitlines():
        try:
            replies.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    if len(replies) < len(args):
        tail = (done.stderr.strip().splitlines() or ["no output"])[-1]
        replies += [{"error": f"the binary stopped before replying ({tail[:160]})"}] * (len(args) - len(replies))
    return [Call(r) for r in replies[: len(args)]]


def _defs(value: Any, key: str) -> tuple[list[str], str] | str:
    """A reply's define-funs and its term, or why it is not one."""
    if not isinstance(value, dict) or not isinstance(value.get(key), str):
        return f"the reply is not an object with a string {key!r}"
    defs = value.get("defs", [])
    if not isinstance(defs, list) or not all(isinstance(d, str) for d in defs):
        return "defs is not a list of strings"
    for d in defs:
        try:
            parsed = _sexprs(d)
        except Exception:  # noqa: BLE001 - the learner's text
            return f"a def does not parse as SMT-LIB: {d[:80]}"
        if len(parsed) != 1 or not isinstance(parsed[0], list) or parsed[0][:1] != ["define-fun"]:
            return f"each def is one (define-fun ...), and this is not: {d[:80]}"
        if isinstance(parsed[0][1], str) and parsed[0][1].startswith("ref_"):
            return f"names that start ref_ are the reference's: {parsed[0][1]}"
    return defs, value[key]


def _size(defs: list[str], term: str) -> int:
    return sum(len(d) for d in defs) + len(term)


# ======================================================================================== check helpers
def _z3_name(ctx: CheckContext) -> str:
    return ctx.z3().tool("cli").short_version


def _stamp(version: str) -> str:
    return f"PROVED [P] · Z3 {version} unsat · uncertified · rlimit {RLIMIT}"


def _fail(message: str, suspect: str = "implementation", details: Iterable[str] = ()) -> CheckResult:
    return CheckResult(False, message, suspect, tuple(details))


def _crate_or_fail(ctx: CheckContext, rel: str = CRATE) -> Crate | CheckResult:
    return build(ctx, rel)


@dataclass
class WpCase:
    label: str
    seed: Json


def _wp_equivalence(ctx: CheckContext, crate: Crate, cases: list[WpCase], prefix: str, redraw: Callable[[], WpCase] | None) -> CheckResult:
    """Each seed: the learner's wp_emit against the reference, Z3-equivalent over a fixed vocabulary."""
    z3 = ctx.z3()
    redrawn = 0
    i = 0
    queue = list(cases)
    passed = 0
    while queue:
        case = queue.pop(0)
        i += 1
        seed = case.seed
        reply = call(crate, "wp_emit", [{"program": {"accounts": seed["accounts"], "commands": []}, "params": seed["params"], "cmd": seed["cmd"], "post": seed["post"]}])[0]
        if not reply.ok:
            return _fail(f"seed {i} ({case.label}): wp_emit replied with an error: {reply.error}")
        got = _defs(reply.value, "formula")
        if isinstance(got, str):
            return _fail(f"seed {i} ({case.label}): {got}", "implementation")
        defs, term = got
        size = _size(defs, term)
        if size > SIZE_LIMIT:
            return _fail(
                f"seed {i} ({case.label}): your query is {size} characters, over the check's limit of {SIZE_LIMIT} [D]",
                "implementation",
                ("copying Q at every if doubles it each time; name the intermediate formula with define-fun",),
            )
        d = Defs(tuple(seed["accounts"]), tuple(seed["params"]))
        ref = p_form(wp(seed["cmd"], seed["post"], d), Names(tuple(seed["accounts"]), tuple(seed["params"])))
        text = script(declarations(seed["accounts"], seed["params"], post=False), [*d.texts, *defs], f"(not (= {term} {ref}))")
        try:
            run = z3.run(text, step=f"{prefix}-seed{i}", rlimit=RLIMIT, seed=ctx.seed)
        except InputRefused as error:
            return _fail(f"seed {i} ({case.label}): the equivalence query with your formula cannot run: {error}")
        ctx.note(f"seed {i} ({case.label}): {run.verdict} · rlimit {RLIMIT}")
        if run.verdict == "unknown" and redraw is not None and redrawn < REDRAWS:
            redrawn += 1
            queue.append(redraw())
            continue
        if run.verdict == "sat":
            state = model_ints(run)
            shown = _show({k: state[k] for k in [*seed["accounts"], *(f"p_{p}" for p in seed["params"])] if k in state})
            return _fail(f"seed {i} ({case.label}): your weakest precondition and the reference differ", "implementation", (f"a state where they disagree: {shown}", f"the command: {json.dumps(seed['cmd'])}", f"the postcondition: {json.dumps(seed['post'])}"))
        if run.verdict != "unsat":
            return _fail(f"seed {i} ({case.label}): Z3 answered {run.verdict}", "tool", run.verdict_lines)
        passed += 1
    tail = f"; {redrawn} seed{'s' if redrawn != 1 else ''} Z3 could not decide {'were' if redrawn != 1 else 'was'} redrawn" if redrawn else ""
    return CheckResult(True, f"{passed} seeds: your wp_emit is Z3-equivalent to the reference on every one (rlimit {RLIMIT} each{tail})")


def _obligation(ctx: CheckContext, crate: Crate, program: Json, name: str, inv: Json, route: str) -> tuple[list[str], str] | str:
    reply = call(crate, "vc_emit", [{"program": program, "command": name, "inv": inv, "route": route}])[0]
    if not reply.ok:
        return f"vc_emit ({route}) replied with an error: {reply.error}"
    return _defs(reply.value, "assert")


def _vc_script(program: Json, name: str, defs: list[str], term: str) -> str:
    return script(declarations(program["accounts"], command(program, name)["params"]), defs, term)


@dataclass
class Pipeline:
    verdict: str  # what the learner's verdict_compose reported
    detail: str
    obligation: str  # Z3's answer on the obligation
    premise: str | None = None
    reply: Json = None


def _pipeline(ctx: CheckContext, crate: Crate, program: Json, name: str, inv: Json, step: str, mutate: Callable[[str], str] | None = None) -> Pipeline | str:
    """The learner's checker on one command: vc_emit (forward), Z3, model_decode, replay in the course's
    interpreter, then verdict_compose. Returns why it could not run, as a string."""
    z3 = ctx.z3()
    got = _obligation(ctx, crate, program, name, inv, "forward")
    if isinstance(got, str):
        return got
    defs, term = got
    text = _vc_script(program, name, defs, term)
    if mutate is not None:
        text = mutate(text)
    try:
        run = z3.run(text, step=step, rlimit=RLIMIT)
    except InputRefused as error:
        return f"your obligation cannot run: {error}"
    obligation: dict[str, Any] = {"verdict": run.verdict, "replay": None}
    premise: dict[str, Any] = {"verdict": None, "replay": None}
    detail = ""
    if run.verdict == "sat":
        dec = call(crate, "model_decode", [{"program": program, "command": name, "model": model_raw(run)}])[0]
        if not dec.ok:
            return f"model_decode replied with an error: {dec.error}"
        ok, why = replay_violation(program, name, inv, dec.value)
        obligation["replay"] = "violation" if ok else "no-replay"
        detail = why
    elif run.verdict == "unsat":
        try:
            prun = z3.run(delete_named(text, "neg_inv_post"), step=f"{step}-premise", rlimit=RLIMIT)
        except Exception as error:  # noqa: BLE001 - the learner's text
            return f"the premise query (your obligation without neg_inv_post) cannot run: {error}"
        premise["verdict"] = prun.verdict
        if prun.verdict == "sat":
            dec = call(crate, "model_decode", [{"program": program, "command": name, "model": model_raw(prun)}])[0]
            if not dec.ok:
                return f"model_decode replied with an error: {dec.error}"
            ok, why = replay_success(program, name, inv, dec.value)
            premise["replay"] = "success" if ok else "no-replay"
            detail = why
    compose = call(crate, "verdict_compose", [{"mode": "check", "command": name, "obligation": obligation, "premise": premise, "solver": {"name": "Z3", "version": run.version, "rlimit": RLIMIT}}])[0]
    if not compose.ok:
        return f"verdict_compose replied with an error: {compose.error}"
    value = compose.value if isinstance(compose.value, dict) else {}
    return Pipeline(str(value.get("verdict")), detail, run.verdict, premise["verdict"], value)


def _reference_verdict(ctx: CheckContext, program: Json, name: str, inv: Json, step: str) -> str:
    defs, term = vc_reference(program, name, inv)
    run = ctx.z3().run(_vc_script(program, name, defs, term), step=step, rlimit=RLIMIT)
    return {"sat": "REFUTED", "unsat": "PROVED"}.get(run.verdict, "UNKNOWN")


# ============================================================================================== checks
@dataclass
class Report:
    """What the reference checker reports on one command (S4.L7's table)."""

    lines: list[str]
    verdict: str  # Z3's answer on the obligation
    stamp: str
    run: Any


def _flat(w: dict[str, dict[str, int]]) -> str:
    return " ".join(f"{k}={v}" for k, v in {**w["pre"], **{f"p_{p}": v for p, v in w["params"].items()}, **{f"{a}_p": v for a, v in w["post"].items()}}.items())


def reference_report(z3: Any, program: Json, name: str, inv: Json, label: str, step: str, cvc5: Any = None) -> Report:
    """The reference miniplinth check on one command: the obligation, its premise witness or its
    counterexample replayed in the interpreter, the stamp and the defeaters, as output lines."""
    defs, term = vc_reference(program, name, inv)
    text = _vc_script(program, name, defs, term)
    run = z3.run(text, step=f"violation-{step}", rlimit=RLIMIT)
    lines = [
        f"command   {name} ({label})",
        "fragment  in: assignments, moves and ifs under one reject guard, over Int",
        f"query     sha256 {run.input_sha256}",
        f"solver    Z3 {run.version} · rlimit {RLIMIT} · entry {run.entry}",
        f"verdict   {run.verdict}",
    ]
    stamp = "none"
    if run.verdict == "unsat":
        prun = z3.run(delete_named(text, "neg_inv_post"), step=f"premise-{step}", rlimit=RLIMIT)
        witness = decode_step(program, name, model_ints(prun)) if prun.verdict == "sat" else None
        ok, why = replay_success(program, name, inv, witness) if witness else (False, "no premise witness: the proof is vacuous")
        lines.append(f"premise   {prun.verdict} · {_flat(witness) if witness else 'no witness'} · {'replays as a successful step' if ok else why}")
        stamp = _stamp(run.version) if ok else "none"
    elif run.verdict == "sat":
        witness = decode_step(program, name, model_ints(run))
        ok, why = replay_violation(program, name, inv, witness)
        lines.append(f"witness   {_flat(witness)} · {why if ok else 'does not replay: ' + why}")
        stamp = "REFUTED [R] · 1 step" if ok else "none (spurious: a defect in the VC generator)"
    if cvc5 is not None:
        crun = cvc5.run(text, step=f"violation-{step}", rlimit=RLIMIT)
        agree = "agrees" if crun.verdict == run.verdict else "DISAGREES: keep the query as a specimen candidate"
        lines.append(f"cross     cvc5 {crun.version} {crun.verdict} · rlimit {RLIMIT} · {agree}")
    lines.append(f"stamp     {stamp}")
    lines.append("defeaters encoding unverified (open); solver soundness (SEAM-7); one command at a time (SEAM-2)")
    return Report(lines, run.verdict, stamp, run)


def c1(ctx: CheckContext) -> CheckResult:
    """LAB-4.1: the reference checker on the guarded Transfer, and the learner's reading of it."""
    fx = fixture(ctx, "transfer")
    program, name, inv = fx["program"], fx["command"], fx["inv"]
    z3 = ctx.z3()
    report = reference_report(z3, program, name, inv, f"{FIXTURES}/transfer.json", "transfer")
    run, stamp, lines = report.run, report.stamp, report.lines
    if run.verdict in ("sat", "unsat", "unknown"):
        z3.headline(run)
    ctx.tcb(f"Z3 {run.version}", "trusted")
    ctx.tcb("the course's reference VC generator and interpreter (statespace/labs/lab4.py)", "tested")
    for line in lines:
        ctx.note(line)
    try:
        reading = json.loads(ctx.text(READING))
    except json.JSONDecodeError as error:
        return _fail(f"{READING} is not JSON ({error})", "spec")
    if not isinstance(reading, dict):
        return _fail(f"{READING} is not a JSON object", "spec")
    problems: list[str] = []
    if reading.get("verdict") != run.verdict:
        problems.append(f"verdict: you wrote {reading.get('verdict')!r}; read the verdict line above")
    if reading.get("stamp") != stamp:
        problems.append(f"stamp: you wrote {reading.get('stamp')!r}; copy the stamp line above")
    w = reading.get("premise")
    flat = w if isinstance(w, dict) else {}
    mine = {
        "pre": {a: flat.get(a) for a in program["accounts"]},
        "params": {p: flat.get(f"p_{p}") for p in command(program, name)["params"]},
        "post": {a: flat.get(f"{a}_p") for a in program["accounts"]},
    }
    ok, why = replay_success(program, name, inv, mine)
    if not ok:
        problems.append(f"premise: your witness does not replay as a successful step ({why}); it is checked by running it, so any witness that runs will do")
    if problems:
        return _fail("your reading of the reference output does not hold yet", "spec", problems)
    return CheckResult(True, f"verdict {run.verdict}, the stamp, and a premise witness that replays: {why}")


def c2(ctx: CheckContext) -> CheckResult:
    crate = _crate_or_fail(ctx)
    if isinstance(crate, CheckResult):
        return crate
    fx = fixture(ctx, "capture")
    cases = [WpCase("capture fixture", {"accounts": fx["program"]["accounts"], "params": fx["params"], "cmd": fx["cmd"], "post": fx["post"]})]
    cases += [WpCase(k, s) for k, s in seeds_t1(ctx.rng, SEEDS)]
    return _wp_equivalence(ctx, crate, cases, "wp", lambda: WpCase(*seeds_t1(ctx.rng, 5)[-1]))


def c3(ctx: CheckContext) -> CheckResult:
    crate = _crate_or_fail(ctx)
    if isinstance(crate, CheckResult):
        return crate
    cases = [WpCase(k, s) for k, s in seeds_t23(ctx.rng, SEEDS)]
    cases.append(WpCase(f"chain of {CHAIN} sequential ifs", chain_seed(ctx.rng)))
    result = _wp_equivalence(ctx, crate, cases, "wp-cond", lambda: WpCase(*seeds_t23(ctx.rng, 5)[-1]))
    if result.passed:
        return CheckResult(True, result.message + f"; the chain of {CHAIN} ifs stays within {SIZE_LIMIT} characters")
    return result


def c4(ctx: CheckContext) -> CheckResult:
    crate = _crate_or_fail(ctx)
    if isinstance(crate, CheckResult):
        return crate
    z3 = ctx.z3()
    frames_tested = 0
    for i in range(1, SEEDS + 1):
        family, program, name, inv = obligation_seed(ctx.rng, True)
        cmd = command(program, name)
        fwd = _obligation(ctx, crate, program, name, inv, "forward")
        if isinstance(fwd, str):
            return _fail(f"seed {i} ({family}): {fwd}")
        text = _vc_script(program, name, *fwd)
        try:
            run = z3.run(text, step=f"vc-seed{i}-forward", rlimit=RLIMIT)
        except InputRefused as error:
            return _fail(f"seed {i} ({family}): your forward obligation cannot run: {error}")
        if run.verdict != "unsat":
            state = model_ints(run)
            return _fail(f"seed {i} ({family}): your forward obligation is {run.verdict} on a command known to preserve Inv", "implementation", (f"Z3's model: {_show(state)}", f"the command: {json.dumps(cmd)}"))
        names = conjunct_names(text)
        missing = [n for n in ("inv_pre", "guard", "neg_inv_post") if n not in names]
        if missing:
            return _fail(f"seed {i} ({family}): your obligation names no {', '.join(missing)}", "implementation", ("name conjuncts with (! term :named name)",))
        prun = z3.run(delete_named(text, "neg_inv_post"), step=f"vc-seed{i}-premise", rlimit=RLIMIT)
        if prun.verdict != "sat":
            return _fail(f"seed {i} ({family}): the premise Inv ∧ Guard ∧ Step is {prun.verdict}, so the proof is vacuous", "implementation")
        ok, why = replay_success(program, name, inv, decode_step(program, name, model_ints(prun)))
        if not ok:
            return _fail(f"seed {i} ({family}): the premise witness does not replay: {why}", "implementation")
        want = [a for a in program["accounts"] if a not in set(writes(cmd["body"]))]
        frames = sorted(n[len("frame_") :] for n in names if n.startswith("frame_"))
        if frames != sorted(want):
            return _fail(f"seed {i} ({family}): your frames are frame_{', frame_'.join(frames) or '(none)'}; the command leaves {', '.join(want)} alone", "implementation", ("state one frame_<k> per untouched account k",))
        if i <= 5:
            for k in want:
                mrun = z3.run(delete_named(text, f"frame_{k}"), step=f"vc-seed{i}-noframe-{k}", rlimit=RLIMIT)
                vals = model_ints(mrun)
                if mrun.verdict != "sat" or vals.get(f"{k}_p") == vals.get(k):
                    return _fail(f"seed {i} ({family}): deleting frame_{k} left the query {mrun.verdict}{'' if mrun.verdict != 'sat' else ' with ' + k + ' unchanged'}: the frame is not load-bearing", "implementation", ("another conjunct pins the account; state each untouched location once, in its frame",))
                frames_tested += 1
        wpr = _obligation(ctx, crate, program, name, inv, "wp")
        if isinstance(wpr, str):
            return _fail(f"seed {i} ({family}): {wpr}")
        try:
            wrun = z3.run(_vc_script(program, name, *wpr), step=f"vc-seed{i}-wp", rlimit=RLIMIT)
        except InputRefused as error:
            return _fail(f"seed {i} ({family}): your wp-route obligation cannot run: {error}")
        if wrun.verdict != run.verdict:
            return _fail(f"seed {i} ({family}): the routes disagree, forward {run.verdict} and wp {wrun.verdict}", "implementation")
        ctx.note(f"seed {i} ({family}): forward unsat, premise sat and replays, wp unsat · rlimit {RLIMIT}")
    return CheckResult(True, f"{SEEDS} obligations: proved with a replaying premise witness, both routes agree, and {frames_tested} deleted frames each turned unsat into sat with the account changing")


def c5(ctx: CheckContext) -> CheckResult:
    crate = _crate_or_fail(ctx)
    if isinstance(crate, CheckResult):
        return crate
    cases: list[tuple[str, Json, str, Json]] = []
    for fx_name in ("transfer", "deposit", "withdraw-off-by-one", "fee"):
        fx = fixture(ctx, fx_name)
        cases.append((f"fixture {fx_name}", fx["program"], fx["command"], fx["inv"]))
    for _ in range(FRESH_C5):
        family, program, name, inv = obligation_seed(ctx.rng, ctx.rng.random() < 0.5)
        cases.append((family, program, name, inv))
    version = _z3_name(ctx)
    for i, (label, program, name, inv) in enumerate(cases, 1):
        want = _reference_verdict(ctx, program, name, inv, f"decode-{i}-reference")
        got = _pipeline(ctx, crate, program, name, inv, f"decode-{i}")
        if isinstance(got, str):
            return _fail(f"case {i} ({label}): {got}")
        if got.verdict != want:
            return _fail(f"case {i} ({label}): your checker reports {got.verdict}; the reference reports {want}", "implementation", (f"Z3 on your obligation: {got.obligation}", f"replay: {got.detail or 'nothing replayed'}"))
        if want == "PROVED" and got.reply.get("stamp") != _stamp(version):
            return _fail(f"case {i} ({label}): your stamp is {got.reply.get('stamp')!r}", "implementation", (f"expected: {_stamp(version)}",))
        ctx.note(f"case {i} ({label}): {got.verdict} · {got.detail}")
    fx = fixture(ctx, "transfer")
    program, name, inv = fx["program"], fx["command"], fx["inv"]
    frame = next((a for a in program["accounts"] if a not in writes(command(program, name)["body"])), None)
    if frame is None:
        return _fail("the transfer fixture touches every account, so no frame can be injected", "tool")
    got = _pipeline(ctx, crate, program, name, inv, "decode-injected", mutate=lambda t: delete_named(t, f"frame_{frame}"))
    if isinstance(got, str):
        return _fail(f"injected frame-less query: {got}")
    if got.verdict != "SPURIOUS":
        return _fail(f"with frame_{frame} deleted, your checker reports {got.verdict}; a model that does not replay is spurious, a defect in the generator, never REFUTED", "implementation", (f"replay: {got.detail}",))
    ctx.note(f"injected: frame_{frame} deleted → sat, the witness does not replay ({got.detail}) → SPURIOUS")
    vac = _pipeline(ctx, crate, program, name, inv, "decode-vacuous", mutate=lambda t: delete_named(t, "guard", "false"))
    if isinstance(vac, str):
        return _fail(f"injected contradictory guard: {vac}")
    if vac.verdict != "VACUOUS":
        return _fail(f"with the guard replaced by false, the obligation and the premise are both {vac.obligation} and your checker reports {vac.verdict}; an unsat whose premises have no model is vacuous, never PROVED", "implementation")
    ctx.note("injected: guard replaced by false → unsat, premise unsat → VACUOUS")
    return CheckResult(True, f"{len(cases)} cases match the reference, every REFUTED replays, every premise witness replays, the frame-less query is reported spurious and the contradictory one vacuous")


def _cti_learner(ctx: CheckContext, crate: Crate, system: Json, inv: Json, tag: str) -> tuple[Json, list[dict[str, Any]], list[dict[str, Any]]] | str:
    z3 = ctx.z3()
    steps: list[dict[str, Any]] = []
    for cmd in system["commands"]:
        got = _obligation(ctx, crate, system, cmd["name"], inv, "forward")
        if isinstance(got, str):
            return got
        run = z3.run(_vc_script(system, cmd["name"], *got), step=f"{tag}-step-{cmd['name']}", rlimit=RLIMIT)
        steps.append({"command": cmd["name"], "verdict": run.verdict})
    bmc: list[dict[str, Any]] = []
    for k in range(BOUND_N + 1):
        reply = call(crate, "bmc_emit", [{"system": system, "inv": inv, "k": k}])[0]
        if not reply.ok:
            return f"bmc_emit replied with an error: {reply.error}"
        got = _defs(reply.value, "assert")
        if isinstance(got, str):
            return f"bmc_emit: {got}"
        try:
            run = z3.run(script(bmc_declarations(system, k), got[0], got[1]), step=f"{tag}-bmc{k}", rlimit=RLIMIT)
        except InputRefused as error:
            return f"your bmc query at k={k} cannot run: {error}"
        bmc.append({"k": k, "verdict": run.verdict, "model": model_raw(run)})
        if run.verdict == "sat" or (k == 0 and all(s["verdict"] == "unsat" for s in steps)):
            break
    compose = call(crate, "verdict_compose", [{"mode": "cti", "system": system, "inv": inv, "n": BOUND_N, "steps": steps, "bmc": bmc}])[0]
    if not compose.ok:
        return f"verdict_compose (cti) replied with an error: {compose.error}"
    return compose.value, steps, bmc


def _cti_reference(ctx: CheckContext, system: Json, inv: Json, tag: str) -> tuple[str, str | None]:
    z3 = ctx.z3()
    steps = []
    for cmd in system["commands"]:
        steps.append(z3.run(_vc_script(system, cmd["name"], *vc_reference(system, cmd["name"], inv)), step=f"{tag}-ref-step-{cmd['name']}", rlimit=RLIMIT).verdict)
    for k in range(BOUND_N + 1):
        run = z3.run(script(bmc_declarations(system, k), *bmc_reference(system, inv, k)), step=f"{tag}-ref-bmc{k}", rlimit=RLIMIT)
        if run.verdict == "sat":
            return f"REACHABLE in {k}", None
        if k == 0 and all(v == "unsat" for v in steps):
            return "inductive", "CL-4.4"
    return f"CTI: none within {BOUND_N}", "CL-4.5"


def c6(ctx: CheckContext) -> CheckResult:
    crate = _crate_or_fail(ctx)
    if isinstance(crate, CheckResult):
        return crate
    for i in range(1, CTI_SEEDS + 1):
        label, system, inv = cti_seed(ctx.rng)
        want, claim = _cti_reference(ctx, system, inv, f"cti{i}")
        got = _cti_learner(ctx, crate, system, inv, f"cti{i}")
        if isinstance(got, str):
            return _fail(f"seed {i} ({label}): {got}")
        value = got[0] if isinstance(got[0], dict) else {}
        verdict = value.get("verdict")
        if verdict != want:
            return _fail(f"seed {i} ({label}): your driver says {verdict!r}; the reference says {want!r}", "implementation", (f"the invariant: {p_form(inv, Names(('bal', 'held'), ('n',)))}", f"steps: {', '.join(s['command'] + ' ' + s['verdict'] for s in got[1])}"))
        if value.get("claim") != claim:
            return _fail(f"seed {i} ({label}): you chose claim {value.get('claim')!r}; the stamp rules choose {claim!r} for {want}", "implementation")
        if want.startswith("REACHABLE"):
            k = int(want.rsplit(" ", 1)[1])
            ok, why = replay_trace(system, inv, value.get("trace"), k)
            if not ok:
                return _fail(f"seed {i} ({label}): your REACHABLE trace does not replay: {why}", "implementation")
            ctx.note(f"seed {i} ({label}): {want}, k ≤ {BOUND_N}; {why}")
        else:
            ctx.note(f"seed {i} ({label}): {want} · {claim}")
    return CheckResult(True, f"{CTI_SEEDS} invariants: every verdict matches the reference, every REACHABLE trace replays with k ≤ {BOUND_N}, and every claim is the one the stamp rules choose")


def _rs_files(crate: Path) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for p in sorted([crate / "Cargo.toml", *(crate / "src").rglob("*.rs")]):
        if p.is_file():
            out[p.relative_to(crate).as_posix()] = p.read_bytes().decode("utf-8", errors="replace").splitlines(keepends=True)
    return out


def c7(ctx: CheckContext) -> CheckResult:
    broken_rel, fixed_rel = "labs/LAB-4/broken", "labs/LAB-4/fixed"
    for rel in (broken_rel, fixed_rel):
        if not (ctx.path(rel) / "Cargo.toml").is_file():
            return _fail(f"{rel}/ holds no crate yet: copy your miniplinth-check there, miscompile broken/, keep fixed/", "implementation")
    broken_dir, fixed_dir = ctx.path(broken_rel), ctx.path(fixed_rel)
    # Four: the semantics both builds read are the same bytes, and the fixtures are the course's.
    for f in TEMPLATE_FILES:
        a, b = broken_dir / f, fixed_dir / f
        if not a.is_file() or not b.is_file() or hashlib.sha256(a.read_bytes()).digest() != hashlib.sha256(b.read_bytes()).digest():
            return _fail(f"{f} differs between broken/ and fixed/ (or is missing): the template's reader, printer and host must be the same in both builds", "implementation")
    fixtures = {n: fixture(ctx, n) for n in ("fee", "withdraw-off-by-one")}
    ctx.note("fixture hashes: " + ", ".join(f"{n} {hashlib.sha256(ctx.path(f'{FIXTURES}/{n}.json').read_bytes()).hexdigest()[:12]}" for n in fixtures))
    # Five, located: the hunk tagged MISCOMPILE.
    bf, ff = _rs_files(broken_dir), _rs_files(fixed_dir)
    tagged: list[tuple[str, int, int, int, int]] = []
    for path in sorted(set(bf) | set(ff)):
        sm = difflib.SequenceMatcher(a=bf.get(path, []), b=ff.get(path, []), autojunk=False)
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op != "equal" and any("MISCOMPILE" in line for line in bf.get(path, [])[i1:i2]):
                tagged.append((path, i1, i2, j1, j2))
    if not tagged:
        return _fail("no hunk of broken/ that differs from fixed/ carries the tag MISCOMPILE", "implementation", ("tag the miscompiled line with a comment // MISCOMPILE",))
    built: dict[str, Crate] = {}
    for rel in (broken_rel, fixed_rel):
        crate = build(ctx, rel)
        if isinstance(crate, CheckResult):
            return crate
        built[rel] = crate
    version = _z3_name(ctx)
    # One and two: broken reports PROVED on a fixture whose reference verdict is REFUTED.
    false_proof: tuple[str, Pipeline] | None = None
    for n, fx in fixtures.items():
        want = _reference_verdict(ctx, fx["program"], fx["command"], fx["inv"], f"miscompile-{n}-reference")
        if want != "REFUTED":
            return _fail(f"the reference does not refute fixture {n} ({want})", "tool")
        got = _pipeline(ctx, built[broken_rel], fx["program"], fx["command"], fx["inv"], f"broken-{n}")
        if isinstance(got, str):
            return _fail(f"broken/ on {n}: {got}")
        ctx.note(f"broken/ on {n}: {got.verdict} (Z3 {got.obligation}; premise {got.premise or 'not asked'})")
        if got.verdict == "PROVED" or (got.obligation == "unsat" and got.verdict == "VACUOUS"):
            false_proof = (n, got)
    if false_proof is None:
        return _fail("broken/ reports no PROVED on the fee or the off-by-one fixture; a dropped frame only gives a false alarm, so over-constrain instead", "implementation", ("strengthen a guard, drop an effect or widen a frame",))
    n, got = false_proof
    status = "sat: the false proof is not vacuous" if got.premise == "sat" else "unsat: the false proof is vacuous"
    ctx.note(f"premise witness of broken/ on {n}: {status}")
    # Three: fixed/ refutes it with a witness that replays.
    fx = fixtures[n]
    fixed = _pipeline(ctx, built[fixed_rel], fx["program"], fx["command"], fx["inv"], f"fixed-{n}")
    if isinstance(fixed, str):
        return _fail(f"fixed/ on {n}: {fixed}")
    if fixed.verdict != "REFUTED":
        return _fail(f"fixed/ reports {fixed.verdict} on {n}; the reference refutes it", "implementation", (fixed.detail,))
    # Five: revert only the tagged hunk(s) in a copy of broken/, and REFUTED comes back.
    scratch = Path(tempfile.mkdtemp(prefix="lab4-revert-"))
    try:
        copy = scratch / "reverted"
        shutil.copytree(broken_dir, copy, ignore=shutil.ignore_patterns("target"))
        for path in sorted({t[0] for t in tagged}):
            lines = list(bf.get(path, []))
            for _, i1, i2, j1, j2 in sorted((t for t in tagged if t[0] == path), key=lambda t: -t[1]):
                lines[i1:i2] = ff.get(path, [])[j1:j2]
            (copy / path).write_text("".join(lines), encoding="utf-8")
        reverted = build(ctx, "reverted", root=scratch)
        if isinstance(reverted, CheckResult):
            return _fail(f"broken/ with the MISCOMPILE hunk reverted does not build: {reverted.message}", "implementation", reverted.details)
        back = _pipeline(ctx, reverted, fx["program"], fx["command"], fx["inv"], f"reverted-{n}")
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
    if isinstance(back, str):
        return _fail(f"broken/ with the MISCOMPILE hunk reverted: {back}")
    if back.verdict != "REFUTED":
        return _fail(f"reverting the MISCOMPILE hunk gives {back.verdict}, not REFUTED: the tag is not on the faulty translation", "implementation")
    return CheckResult(True, f"broken/ reports PROVED on {n} (premise {status}); fixed/ and the reverted hunk report REFUTED, and {fixed.detail}")


def _cvc5(ctx: CheckContext) -> Any:
    """The stage's cvc5 session, recorded in the receipt beside the Z3 runs."""
    session = getattr(ctx, "_lab4_cvc5", None)
    if session is None:
        from statespace.lanes.cvc5 import Cvc5Session

        session = Cvc5Session(root=ctx.root, workdir=ctx.workdir, sink=ctx.runs.append)
        session.tool()  # ToolUnavailable before anything is judged
        setattr(ctx, "_lab4_cvc5", session)
        base = ctx.sessions
        setattr(ctx, "sessions", lambda: [*base(), session])
    return session


def _card(ctx: CheckContext, rel: str) -> Json:
    import yaml

    from statespace.schema.validation import validate

    try:
        card = yaml.safe_load(ctx.text(rel))
    except yaml.YAMLError as error:
        raise InputRefused(f"{rel} is not YAML ({error})") from error
    issues = validate("claim", card)
    if issues:
        raise InputRefused(f"{rel} is not a claim@1 card: {issues[0]['instancePath'] or '/'} {issues[0]['message']}")
    return card


def c8(ctx: CheckContext) -> CheckResult:
    cvc5 = _cvc5(ctx)
    z3 = ctx.z3()
    crate = _crate_or_fail(ctx)
    if isinstance(crate, CheckResult):
        return crate
    second = "claims/cl-4-4" if ctx.path("claims/cl-4-4.yaml").is_file() else "claims/cl-4-5"
    cards = [("CL-4.2", "claims/cl-4-2"), ("CL-4.4" if second.endswith("4-4") else "CL-4.5", second)]
    authored: list[tuple[str, str, str]] = []  # (label, text, the step's name: violation-<name> pairs with premise-<name>)
    for template, base in cards:
        authored.append((f"{base}.smt2", ctx.statement(f"{base}.smt2", "smt2"), base.split("/")[-1]))
    for n in ("transfer", "deposit"):
        fx = fixture(ctx, n)
        got = _obligation(ctx, crate, fx["program"], fx["command"], fx["inv"], "forward")
        if isinstance(got, str):
            return _fail(f"fixture {n}: {got}")
        authored.append((f"your obligation for fixture {n}", _vc_script(fx["program"], fx["command"], *got), f"fixture-{n}"))
    headline = None
    for label, text, step in authored:
        zr = z3.run(text, step=f"violation-{step}", rlimit=RLIMIT)
        cr = cvc5.run(text, step=f"violation-{step}", rlimit=RLIMIT)
        ctx.note(f"{label}: Z3 {zr.version} {zr.verdict}, cvc5 {cr.version} {cr.verdict} · rlimit {RLIMIT} · sha256 {zr.input_sha256[:16]}")
        if zr.verdict != cr.verdict:
            return _fail(f"{label}: Z3 answered {zr.verdict} and cvc5 {cr.verdict}; a disagreement is never overridden: keep the query as a specimen candidate", "tool", (f"query sha256 {zr.input_sha256}",))
        if zr.verdict != "unsat":
            return _fail(f"{label}: both solvers answered {zr.verdict}, and an authored statement must be unsat", "spec" if label.startswith("claims/") else "implementation")
        if "neg_inv_post" in conjunct_names(text):
            premise_text = delete_named(text, "neg_inv_post")
            zp, cp = z3.run(premise_text, step=f"premise-{step}", rlimit=RLIMIT), cvc5.run(premise_text, step=f"premise-{step}", rlimit=RLIMIT)
            ctx.note(f"{label}, premise without neg_inv_post: Z3 {zp.verdict}, cvc5 {cp.verdict}")
            if zp.verdict != "sat" or cp.verdict != "sat":
                return _fail(f"{label}: the premise (the query without neg_inv_post) is Z3 {zp.verdict}, cvc5 {cp.verdict}; an unsat beside unsat premises is vacuous", "spec" if label.startswith("claims/") else "implementation")
        headline = headline or zr
    if headline is not None:
        z3.headline(headline)
    ctx.tcb(f"Z3 {headline.version if headline else ''}".strip(), "trusted")
    ctx.tcb(f"cvc5 {cvc5.tool().short_version}", "trusted")
    ctx.tcb("the printer and the encoding: unverified (encoding unverified stays open)", "trusted")
    zv, cv = _z3_name(ctx), cvc5.tool().short_version
    for template, base in cards:
        card = _card(ctx, f"{base}.yaml")
        if card.get("template") != template:
            return _fail(f"{base}.yaml names template {card.get('template')!r}, not {template}", "spec")
        if (card.get("statement") or {}).get("path") != f"{base}.smt2":
            return _fail(f"{base}.yaml pins {(card.get('statement') or {}).get('path')!r}, not {base}.smt2", "spec")
        method = card.get("method") or {}
        tool, version = str(method.get("tool", "")).lower(), str(method.get("version", ""))
        if "z3" not in tool or "cvc5" not in tool or zv not in version or cv not in version:
            return _fail(f"{base}.yaml's method must name the tools and versions this run used: Z3 {zv} and cvc5 {cv}", "spec", (f"you wrote tool {method.get('tool')!r}, version {method.get('version')!r}",))
        weakened = f"{base}.weakened.smt2"
        wtext = ctx.statement(weakened, "smt2")
        wz = z3.run(wtext, step=f"violation-{base.split('/')[-1]}-weakened", rlimit=RLIMIT)
        ctx.note(f"{weakened}: Z3 {wz.verdict}")
        if wz.verdict != "sat":
            return _fail(f"{weakened}: Z3 answered {wz.verdict}; the \"if weakened\" witness must be sat, refuting the card's proposition once its assumption is weakened", "spec")
        ctx.claim(template)
    return CheckResult(True, f"Z3 {zv} and cvc5 {cv} agree unsat on {len(authored)} authored queries; {cards[0][0]} and {cards[1][0]} validate, pin their statements, and each weakened witness is sat")


def not_built(check_id: str) -> Callable[[CheckContext], CheckResult]:
    def run(ctx: CheckContext) -> CheckResult:
        raise ToolUnavailable(f"{check_id} is not built in this version of statespace yet")

    return run


LAB = Lab(
    "LAB-4",
    "miniplinth check",
    stages=(
        Stage("LAB-4.1", "Run the reference checker on the guarded Transfer", (CheckSpec("LAB-4.c1", "The reference output, reproduced", c1),)),
        Stage("LAB-4.2", "The weakest precondition of assignments and ResourceOps", (CheckSpec("LAB-4.c2", "Weakest preconditions match the reference", c2),)),
        Stage("LAB-4.3", "Conditionals and guards", (CheckSpec("LAB-4.c3", "Conditionals and guards match the reference", c3),)),
        Stage("LAB-4.4", "Frame conditions and the forward route", (CheckSpec("LAB-4.c4", "Frames are stated, and every one is needed", c4),)),
        Stage("LAB-4.5", "Decode models and replay them (capstone S10.L3)", (CheckSpec("LAB-4.c5", "Every refutation replays", c5),)),
        Stage("LAB-4.6", "CTI or reachable", (CheckSpec("LAB-4.c6", "Verdicts match the reference", c6),)),
        Stage("LAB-4.7", "Miscompile your own checker", (CheckSpec("LAB-4.c7", "A false proof, located and fixed", c7),)),
        Stage("LAB-4.8", "The cvc5 cross-check and the claim cards", (CheckSpec("LAB-4.c8", "Two solvers agree, and the cards hold", c8),), claims=("CL-4.2", "CL-4.4", "CL-4.5")),
        Stage("LAB-4.9", "VC-generator soundness in Lean (stretch)", (CheckSpec("LAB-4.c9", "subst_sound and wp_sound", not_built("LAB-4.c9")),)),
    ),
)


def main(argv: list[str] | None = None) -> int:
    """`python -m statespace.labs.lab4 <fixture.json> [--cvc5]`: the reference miniplinth check on an
    obligation fixture, printed as its output lines. It writes its queries to a scratch folder."""
    import argparse
    import sys

    from statespace.lanes.z3 import Z3Session

    parser = argparse.ArgumentParser(prog="python -m statespace.labs.lab4", description="the reference miniplinth check on an obligation fixture")
    parser.add_argument("fixture", type=Path)
    parser.add_argument("--cvc5", action="store_true", help="cross-check the obligation with cvc5 as well")
    args = parser.parse_args(argv)
    fx = json.loads(args.fixture.read_bytes().decode("utf-8"))
    if fx.get("kind") != "obligation":
        sys.stderr.write(f"{args.fixture} is a {fx.get('kind')} fixture; the reference checker reads obligation fixtures\n")
        return 2
    scratch = Path(tempfile.mkdtemp(prefix="lab4-reference-"))
    try:
        z3 = Z3Session(root=scratch, workdir=scratch / "runs")
        cvc5 = None
        if args.cvc5:
            from statespace.lanes.cvc5 import Cvc5Session

            cvc5 = Cvc5Session(root=scratch, workdir=scratch / "runs")
        report = reference_report(z3, fx["program"], fx["command"], fx["inv"], args.fixture.as_posix(), args.fixture.stem, cvc5)
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
    sys.stdout.write("\n".join(report.lines) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

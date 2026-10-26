"""The reference front end of Mini-Plinth: the toy syntax, its IR, and the typechecker (reference module,
earns nothing).

curriculum/S03-semantics.md section 2.1 gives the syntax and section 2.2 the named typing rules; S4 adds
sequencing (curriculum/S04-obligations.md, "the fragment S4 reasons about"). This module covers the part of
the language the LAB-10 pipeline needs: `move`, `deposit` and `set` statements in a sequence, guards over
`balance(e)`, `frozen(e)`, integer arithmetic, comparisons and the Boolean connectives. Holds (`hold`,
`capture`, `release`) are LAB-3's and are not in this pipeline's fragment [D].

The concrete syntax, as the roadmap writes it:

    entity Account;
    command TransferWithFee(from, to, amount, fee)
      requires balance(from) >= amount
      do move amount from from to to; move fee from from to sink

Keywords are contextual, so `from` and `to` are parameter names as well as words of `move`. Parameters may
be written untyped; the typechecker infers each type from its uses and reports a conflict (S10.L1). The IR
is the program part of IR@1 (schemas/ir.schema.json, whose program encoding is still open): plain JSON,
so it travels through a learner's Core unchanged.

    program  {"name": str, "params": [{"name": str, "type": str | null}], "requires": expr, "body": [stmt]}
    expr     {"int": n} | {"var": x} | {"account": "sink" | "mint"} | {"balance": expr} | {"frozen": expr}
             | {"op": "+" | "-" | ">=" | "<=" | ">" | "<" | "=" | "!=" | "&&" | "||", "args": [expr, expr]}
             | {"not": expr}
    stmt     {"move": {"amount": expr, "from": expr, "to": expr}} | {"deposit": {"amount": expr, "to": expr}}
             | {"set": {"field": str, "of": expr, "value": expr}}
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

__all__ = ["ParseError", "TypeErr", "parse", "parse_command", "render", "typecheck", "account_terms", "LITERAL_ACCOUNTS"]

LITERAL_ACCOUNTS = ("mint", "sink")
SCALAR_FIELDS = ("frozen",)
RESOURCE_FIELDS = ("balance",)
TYPES = ("account", "amount", "int", "bool")

_TOKEN = re.compile(r"\s*(?:(?P<int>[0-9]+)|(?P<id>[A-Za-z_][A-Za-z0-9_]*)|(?P<op>:=|>=|<=|!=|&&|\|\||[-+<>=!(),;:.]))")


class ParseError(ValueError):
    """A syntax error, at a character offset of the source."""

    def __init__(self, message: str, at: int) -> None:
        super().__init__(f"{message} (at offset {at})")
        self.message = message
        self.at = at


@dataclass(frozen=True)
class TypeErr(Exception):
    """A typing rejection, named by its rule (S3 section 2.2): dupParam, unknownParam, wrongType,
    nonPositive, unguardedDebit or assignsResource."""

    rule: str
    detail: str

    def __str__(self) -> str:
        return f"{self.rule}: {self.detail}"


def _tokens(source: str) -> list[tuple[str, str, int]]:
    out: list[tuple[str, str, int]] = []
    pos = 0
    text = re.sub(r"--[^\n]*", lambda m: " " * len(m.group(0)), source)  # `-- comment` to the end of the line
    while pos < len(text):
        if text[pos:].strip() == "":
            break
        m = _TOKEN.match(text, pos)
        if m is None or m.end() == pos:
            at = pos + (len(text[pos:]) - len(text[pos:].lstrip()))
            raise ParseError(f"unexpected character {text[at]!r}", at)
        kind = m.lastgroup or "op"
        out.append((kind, m.group(kind), m.start(kind)))
        pos = m.end()
    out.append(("eof", "", len(text)))
    return out


class _Parser:
    def __init__(self, source: str) -> None:
        self.toks = _tokens(source)
        self.i = 0

    def peek(self, k: int = 0) -> tuple[str, str, int]:
        return self.toks[min(self.i + k, len(self.toks) - 1)]

    def at(self, value: str) -> bool:
        kind, text, _ = self.peek()
        return kind in ("id", "op") and text == value

    def take(self, value: str) -> None:
        kind, text, at = self.peek()
        if kind in ("id", "op") and text == value:
            self.i += 1
            return
        raise ParseError(f"expected {value!r}, found {text or 'the end'!r}", at)

    def ident(self) -> str:
        kind, text, at = self.peek()
        if kind != "id":
            raise ParseError(f"expected a name, found {text or 'the end'!r}", at)
        self.i += 1
        return text

    # program := ("entity" NAME ";")* command+
    def program(self) -> list[dict[str, Any]]:
        commands: list[dict[str, Any]] = []
        while self.peek()[0] != "eof":
            if self.at("entity"):
                self.i += 1
                self.ident()
                if self.at(";"):
                    self.i += 1
                continue
            commands.append(self.command())
        if not commands:
            raise ParseError("no command", self.peek()[2])
        return commands

    def command(self) -> dict[str, Any]:
        self.take("command")
        name = self.ident()
        self.take("(")
        params: list[dict[str, Any]] = []
        if not self.at(")"):
            while True:
                pname = self.ident()
                ptype: str | None = None
                if self.at(":"):
                    self.i += 1
                    kind, text, at = self.peek()
                    if text not in TYPES:
                        raise ParseError(f"unknown type {text!r}", at)
                    self.i += 1
                    ptype = text
                params.append({"name": pname, "type": ptype})
                if self.at(","):
                    self.i += 1
                    continue
                break
        self.take(")")
        if self.at(";"):
            self.i += 1
        requires: dict[str, Any] = {"op": "=", "args": [{"int": 0}, {"int": 0}]}
        if self.at("requires"):
            self.i += 1
            requires = self.expr()
            if self.at(";"):
                self.i += 1
        self.take("do")
        body = [self.stmt()]
        while self.at(";"):
            self.i += 1
            if self.peek()[0] == "eof" or self.at("command") or self.at("entity"):
                break
            body.append(self.stmt())
        if self.at("."):
            self.i += 1
        return {"name": name, "params": params, "requires": requires, "body": body}

    def stmt(self) -> dict[str, Any]:
        kind, text, at = self.peek()
        if text == "move":
            self.i += 1
            amount = self.expr()
            self.take("from")
            src = self.expr()
            self.take("to")
            dst = self.expr()
            return {"move": {"amount": amount, "from": src, "to": dst}}
        if text == "deposit":
            self.i += 1
            amount = self.expr()
            self.take("to")
            return {"deposit": {"amount": amount, "to": self.expr()}}
        if text == "set":
            self.i += 1
            field = self.ident()
            self.take("(")
            of = self.expr()
            self.take(")")
            self.take(":=")
            return {"set": {"field": field, "of": of, "value": self.expr()}}
        raise ParseError(f"expected a statement (move, deposit or set), found {text or 'the end'!r}", at)

    def expr(self) -> dict[str, Any]:
        left = self.conj()
        while self.at("||"):
            self.i += 1
            left = {"op": "||", "args": [left, self.conj()]}
        return left

    def conj(self) -> dict[str, Any]:
        left = self.neg()
        while self.at("&&"):
            self.i += 1
            left = {"op": "&&", "args": [left, self.neg()]}
        return left

    def neg(self) -> dict[str, Any]:
        if self.at("!"):
            self.i += 1
            return {"not": self.neg()}
        return self.cmp()

    def cmp(self) -> dict[str, Any]:
        left = self.add()
        for op in (">=", "<=", "!=", ">", "<", "="):
            if self.at(op):
                self.i += 1
                return {"op": op, "args": [left, self.add()]}
        return left

    def add(self) -> dict[str, Any]:
        left = self.atom()
        while self.at("+") or self.at("-"):
            op = self.peek()[1]
            self.i += 1
            left = {"op": op, "args": [left, self.atom()]}  # left-associative
        return left

    def atom(self) -> dict[str, Any]:
        kind, text, at = self.peek()
        if kind == "int":
            self.i += 1
            return {"int": int(text)}
        if self.at("("):
            self.i += 1
            inner = self.expr()
            self.take(")")
            return inner
        if kind == "id":
            self.i += 1
            if self.at("("):
                self.i += 1
                arg = self.expr()
                self.take(")")
                if text in RESOURCE_FIELDS:
                    return {"balance": arg}
                if text in SCALAR_FIELDS:
                    return {"frozen": arg}
                raise ParseError(f"unknown field {text!r}", at)
            if text in LITERAL_ACCOUNTS:
                return {"account": text}
            return {"var": text}
        raise ParseError(f"expected an expression, found {text or 'the end'!r}", at)


def parse(source: str) -> list[dict[str, Any]]:
    """Every command of a program, as IR. Raises ParseError."""
    return _Parser(source).program()


def parse_command(source: str) -> dict[str, Any]:
    """The one command of a proposal. Raises ParseError when there is not exactly one."""
    commands = parse(source)
    if len(commands) != 1:
        raise ParseError(f"a proposal holds one command, not {len(commands)}", 0)
    return commands[0]


# ------------------------------------------------------------------------------------------- render
_PREC = {"||": 1, "&&": 2, ">=": 3, "<=": 3, ">": 3, "<": 3, "=": 3, "!=": 3, "+": 4, "-": 4}


def render_expr(e: dict[str, Any], prec: int = 0) -> str:
    if "int" in e:
        return str(e["int"])
    if "var" in e:
        return str(e["var"])
    if "account" in e:
        return str(e["account"])
    if "balance" in e:
        return f"balance({render_expr(e['balance'])})"
    if "frozen" in e:
        return f"frozen({render_expr(e['frozen'])})"
    if "not" in e:
        return f"!{render_expr(e['not'], 5)}"
    op = e["op"]
    p = _PREC[op]
    left, right = e["args"]
    text = f"{render_expr(left, p)} {op} {render_expr(right, p + 1)}"
    return f"({text})" if p < prec else text


def render_stmt(s: dict[str, Any]) -> str:
    if "move" in s:
        m = s["move"]
        return f"move {render_expr(m['amount'])} from {render_expr(m['from'])} to {render_expr(m['to'])}"
    if "deposit" in s:
        d = s["deposit"]
        return f"deposit {render_expr(d['amount'])} to {render_expr(d['to'])}"
    st = s["set"]
    return f"set {st['field']}({render_expr(st['of'])}) := {render_expr(st['value'])}"


def render(program: dict[str, Any]) -> str:
    """The command in the toy syntax, on three lines."""
    params = ", ".join(p["name"] + (f": {p['type']}" if p.get("type") else "") for p in program["params"])
    body = "; ".join(render_stmt(s) for s in program["body"])
    return f"command {program['name']}({params})\n  requires {render_expr(program['requires'])}\n  do {body}\n"


# ---------------------------------------------------------------------------------------- typecheck
def _walk_exprs(program: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    def go(e: dict[str, Any]) -> None:
        out.append(e)
        for key in ("balance", "frozen", "not"):
            if key in e:
                go(e[key])
        for arg in e.get("args", []):
            go(arg)

    go(program["requires"])
    for s in program["body"]:
        for part in s.values():
            for key in ("amount", "from", "to", "of", "value"):
                if key in part:
                    go(part[key])
    return out


def account_terms(program: dict[str, Any]) -> list[str]:
    """The account terms the command mentions, in order of first mention: parameter names and the
    literal accounts (sink, mint)."""
    seen: list[str] = []

    def note(e: dict[str, Any]) -> None:
        name = e.get("var") or e.get("account")
        if name and name not in seen:
            seen.append(name)

    for e in _walk_exprs(program):
        for key in ("balance", "frozen"):
            if key in e:
                note(e[key])
    for s in program["body"]:
        part = next(iter(s.values()))
        for key in ("from", "to", "of"):
            if key in part:
                note(part[key])
    for s in program["body"]:
        if "deposit" in s and "mint" not in seen:
            seen.append("mint")
    return seen


def typecheck(program: dict[str, Any]) -> dict[str, Any]:
    """Infer each parameter's type and apply the named rules. Returns {"types": {param: type}, "notes":
    [...]}; raises TypeErr naming the rule. R-cover applies to a one-statement body (S3 section 1.1, item
    5); with a sequence, the debits are the checker's obligations (S4), and the result says so."""
    names = [p["name"] for p in program["params"]]
    for i, n in enumerate(names):
        if n in names[:i]:
            raise TypeErr("dupParam", f"parameter {n} is declared twice")
        if n in LITERAL_ACCOUNTS:
            raise TypeErr("dupParam", f"parameter {n} shadows the account {n}")
    types: dict[str, str | None] = {p["name"]: p.get("type") for p in program["params"]}
    declared = {p["name"] for p in program["params"] if p.get("type")}

    def unify(name: str, want: str) -> None:
        have = types[name]
        if name in declared and have in ("int", "amount") and want in ("int", "amount"):
            return  # a declared number keeps its type; R-amount judges an int used as an amount
        if have is None or have == want:
            types[name] = want
            return
        if {have, want} == {"amount", "int"}:
            types[name] = "amount"  # an amount is a positive int, so it is used as an int too
            return
        raise TypeErr("wrongType", f"{name} is used as {have} and as {want}")

    def constrain(e: dict[str, Any], want: str) -> None:
        if "var" in e:
            if e["var"] not in types:
                raise TypeErr("unknownParam", f"{e['var']} is not a parameter")
            unify(e["var"], want)

    # gather constraints from uses
    for e in _walk_exprs(program):
        if "var" in e and e["var"] not in types:
            raise TypeErr("unknownParam", f"{e['var']} is not a parameter")
        for key in ("balance", "frozen"):
            if key in e:
                constrain(e[key], "account")
        if e.get("op") in ("+", "-", ">=", "<=", ">", "<"):
            for arg in e["args"]:
                if "var" in arg and types.get(arg["var"]) != "amount":
                    constrain(arg, "int")
    for s in program["body"]:
        kind, part = next(iter(s.items()))
        if kind == "move":
            constrain(part["from"], "account")
            constrain(part["to"], "account")
            if "var" in part["amount"]:
                unify(part["amount"]["var"], "amount")
        elif kind == "deposit":
            constrain(part["to"], "account")
            if "var" in part["amount"]:
                unify(part["amount"]["var"], "amount")
        elif kind == "set":
            if part["field"] in RESOURCE_FIELDS:
                raise TypeErr("assignsResource", f"set {part['field']}(...) assigns a resource; balances change only by postings")
            if part["field"] not in SCALAR_FIELDS:
                raise TypeErr("wrongType", f"{part['field']} is not a field")
            constrain(part["of"], "account")
            constrain(part["value"], "bool")
    resolved = {n: (t or "int") for n, t in types.items()}

    def type_of(e: dict[str, Any]) -> str:
        if "int" in e:
            return "int"
        if "var" in e:
            return resolved[e["var"]]
        if "account" in e:
            return "account"
        if "balance" in e:
            if type_of(e["balance"]) != "account":
                raise TypeErr("wrongType", "balance(...) takes an account")
            return "int"
        if "frozen" in e:
            if type_of(e["frozen"]) != "account":
                raise TypeErr("wrongType", "frozen(...) takes an account")
            return "bool"
        if "not" in e:
            if type_of(e["not"]) != "bool":
                raise TypeErr("wrongType", "! takes a bool")
            return "bool"
        op = e["op"]
        a, b = (type_of(x) for x in e["args"])
        num = ("int", "amount")
        if op in ("+", "-"):
            if a not in num or b not in num:
                raise TypeErr("wrongType", f"{op} takes numbers")
            return "int"
        if op in (">=", "<=", ">", "<"):
            if a not in num or b not in num:
                raise TypeErr("wrongType", f"{op} takes numbers")
            return "bool"
        if op in ("=", "!="):
            if (a in num) != (b in num) or (a not in num and a != b):
                raise TypeErr("wrongType", f"{op} compares values of one type")
            return "bool"
        if a != "bool" or b != "bool":
            raise TypeErr("wrongType", f"{op} takes bools")
        return "bool"

    if type_of(program["requires"]) != "bool":
        raise TypeErr("wrongType", "the guard is not a bool")

    def positive(e: dict[str, Any]) -> bool:
        if "int" in e:
            return e["int"] > 0
        if "var" in e:
            return resolved[e["var"]] == "amount"
        return e.get("op") == "+" and all(positive(x) for x in e["args"])

    for s in program["body"]:
        kind, part = next(iter(s.items()))
        if kind in ("move", "deposit"):
            if not positive(part["amount"]):
                raise TypeErr("nonPositive", f"the amount {render_expr(part['amount'])} is not an amount parameter or a positive literal")
            for key in ("from", "to"):
                if key in part and type_of(part[key]) != "account":
                    raise TypeErr("wrongType", f"{render_expr(part[key])} is not an account")
        if kind == "move" and part["from"].get("account") == "mint":
            raise TypeErr("wrongType", "a command cannot move from mint; deposit mints")
        if kind == "set":
            type_of(part["value"])
    notes: list[str] = []
    debits = [s["move"] for s in program["body"] if "move" in s]
    if len(program["body"]) == 1 and debits:
        if not _covers(program["requires"], debits[0]["from"], debits[0]["amount"]):
            raise TypeErr("unguardedDebit", f"no top-level guard conjunct balance({render_expr(debits[0]['from'])}) >= {render_expr(debits[0]['amount'])}")
    elif debits:
        notes.append(f"R-cover: {len(program['body'])} statements, so each debit is an obligation for the checker (S4), not a typing rule")
    return {"types": resolved, "notes": notes}


def _covers(g: dict[str, Any], x: dict[str, Any], n: dict[str, Any]) -> bool:
    if g.get("op") == "&&":
        return any(_covers(a, x, n) for a in g["args"])
    return g.get("op") == ">=" and g["args"][0] == {"balance": x} and g["args"][1] == n

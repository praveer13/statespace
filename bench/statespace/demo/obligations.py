"""The reference checker over the LAB-10 fragment: verification conditions in SMT-LIB, read through the
Bench's Z3 lane (reference module, earns nothing; the LAB-4 `miniplinth check` is the learner's).

The vocabulary is fixed, so that a learner's generator and this one emit queries over the same symbols
(curriculum/S04-obligations.md, "Vocabulary"; D-14):

* `bal`, an `(Array Int Int)`, is the pre-state's balance function, and `frz`, an `(Array Int Bool)`, the
  frozen flags when the command reads or writes them;
* `p_<name>` is a parameter: an account parameter is an `Int` account id of at least 2, an amount
  parameter is an `Int` above 0 (the zero policy rejects 0); the literal accounts are `mint` = 0 and
  `sink` = 1;
* `pre_<term>` and `post_<term>` are each account term's balance before and after the call.

Two obligations per command, each asked as "is there a pre-state that satisfies the premises and breaks
the property?":

* `nonneg`: every account the command names, except mint, stays non-negative;
* `conserve`: the balances of the distinct accounts the command names sum to the same total after the call
  as before. Aliasing is taken into account: an account named twice counts once.

The premises are the pre-state's Inv on the accounts the command names, the parameter domains and the
guard. A premise witness, the same premises with no negated property, must be `sat`, or an `unsat`
obligation proves nothing (SP-4.4's class). Verdict classes: REFUTED (the obligation is `sat`; the model is
a witness), PROVED (`unsat`, and the premise witness is `sat`), VACUOUS (`unsat`, premises `unsat`; no
stamp) and UNKNOWN (no answer within the rlimit).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from .lang import account_terms

__all__ = ["Answer", "Obligation", "obligations", "premise_query", "objective_query", "decode", "classify", "minimize", "LITERAL_IDS", "OBLIGATIONS"]

LITERAL_IDS = {"mint": 0, "sink": 1}
OBLIGATIONS = ("nonneg", "conserve")


@dataclass(frozen=True)
class Answer:
    verdict: str  # sat, unsat, unknown or error
    values: dict[str, int] = field(default_factory=dict)
    run: Any = None  # the lane's run, when there is one


Ask = Callable[[str, str], Answer]  # (query text, step name) -> answer


@dataclass(frozen=True)
class Obligation:
    name: str
    query: str  # premises plus the negated property
    premise: str  # premises alone


def _int(n: int) -> str:
    return str(n) if n >= 0 else f"(- {-n})"


def _uses_frozen(program: dict[str, Any]) -> bool:
    text = repr(program)
    return "'frozen'" in text or "'set'" in text


class _Encoder:
    def __init__(self, program: dict[str, Any], types: dict[str, str]) -> None:
        self.program = program
        self.types = types
        self.terms = account_terms(program)
        self.frozen = _uses_frozen(program)
        self.defs: list[str] = []

    def term(self, name: str) -> str:
        return str(LITERAL_IDS[name]) if name in LITERAL_IDS else f"p_{name}"

    def acct(self, e: dict[str, Any]) -> str:
        if "account" in e:
            return str(LITERAL_IDS[e["account"]])
        return f"p_{e['var']}"

    def expr(self, e: dict[str, Any], bal: str, frz: str) -> str:
        if "int" in e:
            return _int(e["int"])
        if "var" in e:
            return f"p_{e['var']}"
        if "account" in e:
            return str(LITERAL_IDS[e["account"]])
        if "balance" in e:
            return f"(select {bal} {self.acct(e['balance'])})"
        if "frozen" in e:
            return f"(select {frz} {self.acct(e['frozen'])})"
        if "not" in e:
            return f"(not {self.expr(e['not'], bal, frz)})"
        op = e["op"]
        a, b = (self.expr(x, bal, frz) for x in e["args"])
        smt = {"&&": "and", "||": "or", "!=": "distinct"}.get(op, op)
        return f"({smt} {a} {b})"

    def header(self) -> list[str]:
        out = ["(set-logic QF_AUFLIA)", "(declare-const bal (Array Int Int))"]
        if self.frozen:
            out.append("(declare-const frz (Array Int Bool))")
        for p in self.program["params"]:
            ty = self.types[p["name"]]
            out.append(f"(declare-const p_{p['name']} {'Bool' if ty == 'bool' else 'Int'})")
        for p in self.program["params"]:
            ty = self.types[p["name"]]
            if ty == "account":
                out.append(f"(assert (>= p_{p['name']} 2))")
            elif ty == "amount":
                out.append(f"(assert (> p_{p['name']} 0))")
        for t in self.terms:
            out.append(f"(declare-const pre_{t} Int)")
            out.append(f"(assert (= pre_{t} (select bal {self.term(t)})))")
        for t in self.terms:
            if t != "mint":
                out.append(f"(assert (>= pre_{t} 0))")
        out.append(f"(assert {self.expr(self.program['requires'], 'bal', 'frz')})")
        bal, frz = "bal", "frz"
        for k, st in enumerate(self.program["body"], start=1):
            kind, part = next(iter(st.items()))
            if kind == "move":
                n, x, y = self.expr(part["amount"], bal, frz), self.acct(part["from"]), self.acct(part["to"])
                out.append(f"(define-fun s{k}d () (Array Int Int) (store {bal} {x} (- (select {bal} {x}) {n})))")
                out.append(f"(define-fun s{k} () (Array Int Int) (store s{k}d {y} (+ (select s{k}d {y}) {n})))")
                bal = f"s{k}"
            elif kind == "deposit":
                n, y = self.expr(part["amount"], bal, frz), self.acct(part["to"])
                out.append(f"(define-fun s{k}d () (Array Int Int) (store {bal} 0 (- (select {bal} 0) {n})))")
                out.append(f"(define-fun s{k} () (Array Int Int) (store s{k}d {y} (+ (select s{k}d {y}) {n})))")
                bal = f"s{k}"
            else:
                out.append(f"(define-fun f{k} () (Array Int Bool) (store {frz} {self.acct(part['of'])} {self.expr(part['value'], bal, frz)}))")
                frz = f"f{k}"
        for t in self.terms:
            out.append(f"(declare-const post_{t} Int)")
            out.append(f"(assert (= post_{t} (select {bal} {self.term(t)})))")
        return out

    def negated(self, name: str) -> str:
        if name == "nonneg":
            parts = [f"(< post_{t} 0)" for t in self.terms if t != "mint"]
            return f"(assert (or {' '.join(parts)} false))"
        deltas = []
        for i, t in enumerate(self.terms):
            firsts = [f"(distinct {self.term(t)} {self.term(u)})" for u in self.terms[:i]]
            cond = f"(and {' '.join(firsts)})" if len(firsts) > 1 else (firsts[0] if firsts else "true")
            deltas.append(f"(ite {cond} (- post_{t} pre_{t}) 0)")
        total = f"(+ {' '.join(deltas)})" if len(deltas) > 1 else (deltas[0] if deltas else "0")
        return f"(assert (not (= {total} 0)))"


def _script(lines: list[str]) -> str:
    return "\n".join(lines) + "\n(check-sat)\n(get-info :reason-unknown)\n"


def obligations(program: dict[str, Any], types: dict[str, str]) -> list[Obligation]:
    """The command's obligations, each with its premise query."""
    enc = _Encoder(program, types)
    head = enc.header()
    premise = _script([f"; premises of {program['name']}", *head])
    out = []
    for name in OBLIGATIONS:
        label = {"nonneg": "every account the command names, except mint, stays non-negative", "conserve": "the distinct accounts named keep their total"}[name]
        out.append(Obligation(name, _script([f"; {program['name']}: {name}: {label}; sat means a witness", *head, enc.negated(name)]), premise))
    return out


def premise_query(program: dict[str, Any], types: dict[str, str]) -> str:
    return obligations(program, types)[0].premise


def objective_terms(program: dict[str, Any], types: dict[str, str]) -> list[str]:
    """What a witness's size is: the amount parameters plus the pre-balances of the accounts named, except
    mint. Minimized under that objective, a witness is the smallest counterexample of its shape."""
    terms = [f"p_{p['name']}" for p in program["params"] if types[p["name"]] == "amount"]
    terms += [f"pre_{t}" for t in account_terms(program) if t != "mint"]
    return terms


def objective_query(obligation: Obligation, program: dict[str, Any], types: dict[str, str], below: int) -> str:
    """The obligation's query, with the objective strictly below `below`: unsat means no smaller witness."""
    terms = objective_terms(program, types)
    total = f"(+ {' '.join(terms)})" if len(terms) > 1 else terms[0]
    body = obligation.query.replace("\n(check-sat)\n(get-info :reason-unknown)\n", "")
    return body + f"\n(assert (< {total} {below}))\n(check-sat)\n(get-info :reason-unknown)\n"


def objective(witness: dict[str, Any], program: dict[str, Any], types: dict[str, str]) -> int:
    total = sum(int(witness["args"][p["name"]]) for p in program["params"] if types[p["name"]] == "amount")
    total += sum(int(v) for t, v in witness["balances"].items() if t != "mint")
    return total


def decode(answer: Answer, program: dict[str, Any], types: dict[str, str]) -> dict[str, Any]:
    """A model as a witness by role: each account term's id and pre-balance, and each other parameter."""
    ids: dict[str, int] = {}
    balances: dict[str, int] = {}
    args: dict[str, int] = {}
    for t in account_terms(program):
        ids[t] = LITERAL_IDS[t] if t in LITERAL_IDS else int(answer.values.get(f"p_{t}", 2))
        balances[t] = int(answer.values.get(f"pre_{t}", 0))
    for p in program["params"]:
        if types[p["name"]] != "account":
            args[p["name"]] = int(answer.values.get(f"p_{p['name']}", 0))
    same = [[a, b] for i, a in enumerate(ids) for b in list(ids)[i + 1:] if ids[a] == ids[b]]
    return {"balances": balances, "args": args, "ids": ids, "same": same}


def concretize(witness: dict[str, Any], program: dict[str, Any], types: dict[str, str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """A role witness as a state and a call. Each account parameter becomes an account named after it (the
    first of its names when the witness says two parameters are the same account), so a replay reads the
    same whatever ids the model chose; mint takes minus the rest, so the total is zero."""
    terms = account_terms(program)
    rep = {t: t for t in terms}
    for a, b in witness.get("same") or []:
        if a in rep and b in rep:
            keep, drop = (rep[a], rep[b]) if terms.index(rep[a]) <= terms.index(rep[b]) else (rep[b], rep[a])
            for t in terms:
                if rep[t] == drop:
                    rep[t] = keep
    balances: dict[str, int] = {"mint": 0, "sink": 0}
    for t in terms:
        if rep[t] != "mint" and rep[t] == t:
            balances[t] = int(witness["balances"].get(t, 0))
    balances["mint"] = -sum(v for k, v in balances.items() if k != "mint")
    args: dict[str, Any] = {}
    for p in program["params"]:
        args[p["name"]] = rep[p["name"]] if types[p["name"]] == "account" else int(witness["args"][p["name"]])
    return {"balances": dict(sorted(balances.items()))}, args


def classify(obligation: Answer, premise: Answer) -> str:
    if obligation.verdict == "sat":
        return "REFUTED"
    if obligation.verdict == "unsat":
        if premise.verdict == "sat":
            return "PROVED"
        if premise.verdict == "unsat":
            return "VACUOUS"
    return "UNKNOWN"


def minimize(ask: Ask, obligation: Obligation, program: dict[str, Any], types: dict[str, str], first: Answer, step: str, limit: int = 64) -> tuple[Answer, int | None, int]:
    """Shrink a witness by bisection on its objective: ask for one at or below the midpoint between the
    best known witness and the lower bound, until the two meet. Returns the smallest witness, its objective
    (None when the budget of queries ran out first, so minimality is not established) and the number of
    queries asked. When the objective is returned, a query for any smaller witness was answered unsat."""
    best = first
    value = objective(decode(first, program, types), program, types)
    low = 0  # no witness has an objective below `low`
    asked = 0
    while low < value:
        if asked >= limit:
            return best, None, asked
        asked += 1
        mid = (low + value - 1) // 2
        answer = ask(objective_query(obligation, program, types, mid + 1), f"{step}-min{asked}")
        if answer.verdict == "sat":
            best = answer
            value = objective(decode(answer, program, types), program, types)
        elif answer.verdict == "unsat":
            low = mid + 1
        else:
            return best, None, asked
    return best, value, asked

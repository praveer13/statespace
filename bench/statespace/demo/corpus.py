"""The LAB-10 fixture corpus (course-supplied; curriculum/S10-assembly.md section 3.1): the toy syntax's
goldens, the typing goldens, the checker fixtures, and the four decision-record edge cases (zero,
self-transfer, failed guard, overflow).

Expected outcomes are not stored: the reference pipeline computes them when a check runs, so a fixture can
never disagree with the reference by a typing slip. What is stored is the input, and for the typing goldens
the rule that must reject them, and for the checker fixtures the verdict class each obligation must get,
which the reference pipeline must reproduce too. The overflow fixture records the one place where the
interpreter and PostgreSQL are meant to differ: the reference policy is overflow unbounded (S3, decision 6),
and PostgreSQL's bigint is bounded, so the credit fails with a value out of range; that SQLSTATE is the
fixture's expected class on PostgreSQL, and the runtime must never retry it. Its mint balance is clamped to
bigint's range, so that state's total is not zero: the fixture is about the bound, not about Inv.
"""

from __future__ import annotations

from typing import Any

__all__ = ["PROGRAMS", "RUN_FIXTURES", "TYPING", "CHECKER", "BIGINT_MAX"]

BIGINT_MAX = 9223372036854775807

PROGRAMS: dict[str, str] = {
    "Transfer": "entity Account;\ncommand Transfer(from, to, amount);\nrequires balance(from) >= amount;\ndo move amount from from to to.\n",
    "TransferWithFee": "command TransferWithFee(from, to, amount, fee)\n  requires balance(from) >= amount + fee\n  do move amount from from to to; move fee from from to sink\n",
    "Deposit": "command Deposit(to, amount)\n  requires amount > 0\n  do deposit amount to to\n",
    "Freeze": "command Freeze(acct: account)\n  requires !frozen(acct)\n  do set frozen(acct) := 0 = 0\n",
    "SplitPayout": "command SplitPayout(src, a, b, x, y)\n  requires balance(src) >= x + y\n  do move x from src to a; move y from src to b\n",
}


def _state(**balances: int) -> dict[str, Any]:
    b = {"sink": 0, **balances}
    b["mint"] = -sum(b.values())
    return {"balances": dict(sorted(b.items()))}


# (fixture id, program, state, args, expected class on PostgreSQL when it is not the interpreter's)
RUN_FIXTURES: list[tuple[str, str, dict[str, Any], dict[str, Any], str | None]] = [
    ("transfer-ok", "Transfer", _state(alice=100, bob=5), {"from": "alice", "to": "bob", "amount": 30}, None),
    ("transfer-all", "Transfer", _state(alice=30, bob=0), {"from": "alice", "to": "bob", "amount": 30}, None),
    ("edge-zero", "Transfer", _state(alice=100, bob=5), {"from": "alice", "to": "bob", "amount": 0}, None),
    ("edge-self-transfer", "Transfer", _state(alice=100), {"from": "alice", "to": "alice", "amount": 30}, None),
    ("edge-failed-guard", "Transfer", _state(alice=10, bob=0), {"from": "alice", "to": "bob", "amount": 11}, None),
    ("edge-overflow", "Transfer", {"balances": {"alice": 100, "bob": BIGINT_MAX - 50, "mint": -BIGINT_MAX, "sink": 0}}, {"from": "alice", "to": "bob", "amount": 100}, "sqlstate:22003"),
    ("unknown-account", "Transfer", _state(alice=100), {"from": "alice", "to": "carol", "amount": 10}, None),
    ("fee-ok", "TransferWithFee", _state(alice=100, bob=0), {"from": "alice", "to": "bob", "amount": 90, "fee": 10}, None),
    ("fee-guard", "TransferWithFee", _state(alice=100, bob=0), {"from": "alice", "to": "bob", "amount": 95, "fee": 10}, None),
    ("deposit-ok", "Deposit", _state(bob=0), {"to": "bob", "amount": 7}, None),
    ("freeze-ok", "Freeze", _state(alice=1), {"acct": "alice"}, None),
    ("split-ok", "SplitPayout", _state(src=50, a=0, b=0), {"src": "src", "a": "a", "b": "b", "x": 20, "y": 30}, None),
    ("split-alias", "SplitPayout", _state(src=50, a=0), {"src": "src", "a": "a", "b": "a", "x": 20, "y": 30}, None),
]

# (fixture id, source, the rule that rejects it, or None for well typed)
TYPING: list[tuple[str, str, str | None]] = [
    ("ty-transfer", PROGRAMS["Transfer"], None),
    ("ty-fee", PROGRAMS["TransferWithFee"], None),
    ("ty-dup-param", "command T(a, a, n) requires balance(a) >= n do move n from a to a", "dupParam"),
    ("ty-unknown-param", "command T(a, b, n) requires balance(c) >= n do move n from a to b", "unknownParam"),
    ("ty-wrong-type", "command T(a, b, n) requires balance(n) >= n do move n from a to b", "wrongType"),
    ("ty-non-positive", "command T(a, b, n: int) requires balance(a) >= n do move n from a to b", "nonPositive"),
    ("ty-unguarded-debit", "command Pay(from, to, amount) requires balance(to) >= amount do move amount from from to to", "unguardedDebit"),
    ("ty-assigns-resource", "command Mint(a, n) requires n > 0 do set balance(a) := balance(a) + n", "assignsResource"),
]

# (fixture id, source, {obligation: expected verdict class})
CHECKER: list[tuple[str, str, dict[str, str]]] = [
    ("ck-transfer", PROGRAMS["Transfer"], {"nonneg": "PROVED", "conserve": "PROVED"}),
    ("ck-fee-guarded", PROGRAMS["TransferWithFee"], {"nonneg": "PROVED", "conserve": "PROVED"}),
    ("ck-fee-outside-guard", "command TransferWithFee(from, to, amount, fee)\n  requires balance(from) >= amount\n  do move amount from from to to; move fee from from to sink\n", {"nonneg": "REFUTED", "conserve": "PROVED"}),
    ("ck-per-leg-guards", "command SplitPayout(src, a, b, x, y)\n  requires balance(src) >= x && balance(src) >= y\n  do move x from src to a; move y from src to b\n", {"nonneg": "REFUTED", "conserve": "PROVED"}),
    ("ck-contradictory-premises", "command Never(from, to, amount)\n  requires balance(from) >= amount && 0 > 1\n  do move amount from from to to; move amount from from to sink\n", {"nonneg": "VACUOUS", "conserve": "VACUOUS"}),
    ("ck-third-account-fee", "command FeeFromThird(from, to, payer, amount, fee)\n  requires balance(from) >= amount && balance(payer) >= fee\n  do move amount from from to to; move fee from payer to sink\n", {"nonneg": "REFUTED", "conserve": "PROVED"}),
]

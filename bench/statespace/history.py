"""The abstract-serializability checker (INS-history on the Bench) and the reference semantics it replays.

curriculum/S06-correspondence.md sections 2 (S6.L8) and 3 (LAB-6.7); spine section 3.6. Course-supplied:
"reference module, earns nothing". LAB-6.7 and LAB-6.8 grade the learner's R(S, D) with it.

A history here is abstract: the database state before (D0) and after (D_final), as rows, and the
transactions that ran, each with the command it carried, what it observed (its outputs, in order: the
values its reads and its RETURNING clauses printed) and how it ended (`ok`, a typed refusal such as
`refused:Insufficient` when its guarded write touched no row, or `abort:<SQLSTATE>`). `extract` builds
one from a history@1 file that `statespace isorun` wrote, by the annotations in the spec's comments.

The question it answers. Is there a serial order of the transactions that, replayed from S0 = alpha(D0)
through the reference semantics, gives every transaction its observed outcome and outputs, and ends in a
state S with R(S, D_final)? R(S0, D0) must hold too. Aborts with 40001 or 40P01 are stutters: no abstract
step. Any other abort is a refusal by the database, which the semantics must make too: 22003 is the typed
refusal `Overflow`, which only the Except Overflow remedy's semantics makes; under the unbounded
integers of the pinned semantics the model commits, and the history is rejected (direction (ii)).

The search keeps each session's transactions in their order and tries every interleaving of the
sessions, pruning a prefix as soon as a transaction's outcome or outputs differ. It is bounded: at most
BOUND transactions that take a step [D]; beyond that the verdict is `beyond-bound`. Every verdict prints
its bound. An accept shows that this history had a serial explanation, under this semantics and this R.
A reject shows that the anomaly is present in this history. Neither says anything about histories that
were not checked.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

__all__ = [
    "BOUND",
    "BIGINT_MAX",
    "SEMANTICS",
    "STUTTERS",
    "State",
    "Verdict",
    "classify",
    "extract",
    "interp",
    "search",
    "state_from_lines",
    "state_lines",
    "d_lines",
]

BOUND = 8  # transactions that take a step [D] (curriculum/S06-correspondence.md section 2, S6.L8)
SEMANTICS = ("z", "except-overflow")  # the pinned unbounded integers; remedy 2, Except Overflow
STUTTERS = ("40001", "40P01")  # aborts that take no abstract step
BIGINT_MAX = 2**63 - 1
SQLSTATE_REFUSALS = {"22003": "Overflow"}  # a database refusal and the typed refusal it is


@dataclass(frozen=True)
class State:
    """An abstract state S: each account's balance, and the amount held against it."""

    bal: tuple[tuple[int, int], ...]
    held: tuple[tuple[int, int], ...] = ()

    @staticmethod
    def of(bal: Mapping[int, int], held: Mapping[int, int] | None = None) -> "State":
        return State(tuple(sorted(bal.items())), tuple(sorted((k, v) for k, v in (held or {}).items() if v)))

    def balances(self) -> dict[int, int]:
        return dict(self.bal)

    def holds(self) -> dict[int, int]:
        return dict(self.held)


def state_lines(s: State) -> list[str]:
    """S in the text form the learner's tools read: `bal <id> <n>` and `held <id> <n>` lines."""
    return [f"bal {k} {v}" for k, v in s.bal] + [f"held {k} {v}" for k, v in s.held]


def state_from_lines(lines: Iterable[str]) -> State:
    bal: dict[int, int] = {}
    held: dict[int, int] = {}
    for line in lines:
        parts = line.split()
        if len(parts) != 3 or parts[0] not in ("bal", "held"):
            raise ValueError(f"{line!r} is not a line of a state: bal <id> <n> or held <id> <n>")
        (bal if parts[0] == "bal" else held)[int(parts[1])] = int(parts[2])
    return State.of(bal, held)


def d_lines(d: Mapping[str, Any]) -> list[str]:
    """D in the text form the learner's tools read: `acct <id> <bal|null>` and `hold <acct> <amt|null>`."""
    fmt = lambda v: "null" if v is None else str(v)  # noqa: E731
    return [f"acct {fmt(i)} {fmt(b)}" for i, b in d.get("acct", [])] + [f"hold {fmt(a)} {fmt(m)}" for a, m in d.get("holds", [])]


# ------------------------------------------------------------------------------------------ semantics
def interp(command: Mapping[str, Any], s: State, *, semantics: str = "z", self_transfer: str = "refuse") -> tuple[str, list[int | None], State]:
    """The reference semantics of one command: (outcome, outputs, S'). Outcome is `ok` or
    `refused:<Name>`; a refusal leaves S unchanged. `self_transfer` is the LAB-3.7 decision: `refuse`
    (SelfTransfer) or `noop` (commits and changes nothing)."""
    outcome, outputs, after = _interp(command, s, semantics=semantics, self_transfer=self_transfer)
    return outcome, ([] if command.get("quiet") else outputs), after


def _interp(command: Mapping[str, Any], s: State, *, semantics: str, self_transfer: str) -> tuple[str, list[int | None], State]:
    if semantics not in SEMANTICS:
        raise ValueError(f"semantics is one of {', '.join(SEMANTICS)}")
    bal, held = s.balances(), s.holds()
    op = command["op"]

    def fits(n: int) -> bool:
        return semantics == "z" or -BIGINT_MAX - 1 <= n <= BIGINT_MAX

    if op == "transfer":
        f, t, m = int(command["from"]), int(command["to"]), int(command["amount"])
        if f == t:
            return ("refused:SelfTransfer", [], s) if self_transfer == "refuse" else ("ok", [], s)
        if f not in bal:
            return "refused:NoSuchAccount(from)", [], s
        if t not in bal:
            return "refused:NoSuchAccount(to)", [], s
        if bal[f] < m:
            return "refused:Insufficient", [], s
        if not fits(bal[t] + m):
            return "refused:Overflow", [], s
        out = [bal[f], bal[f] - m, bal[t], bal[t] + m]
        bal[f] -= m
        bal[t] += m
        return "ok", out, State.of(bal, held)
    if op in ("debit", "rmw-debit"):
        a, m = int(command["account"]), int(command["amount"])
        if a not in bal:
            return "refused:NoSuchAccount", [], s
        read = [bal[a]] if op == "rmw-debit" else []
        if bal[a] < m:
            return "refused:Insufficient", read, s
        out = read + [bal[a], bal[a] - m]
        bal[a] -= m
        return "ok", out, State.of(bal, held)
    if op == "credit":
        a, m = int(command["account"]), int(command["amount"])
        if a not in bal:
            return "refused:NoSuchAccount", [], s
        if not fits(bal[a] + m):
            return "refused:Overflow", [], s
        out = [bal[a], bal[a] + m]
        bal[a] += m
        return "ok", out, State.of(bal, held)
    if op == "hold":
        a, m = int(command["account"]), int(command["amount"])
        if a not in bal:
            return "refused:NoSuchAccount", [], s
        avail = bal[a] - held.get(a, 0)
        if avail < m:
            return "refused:Insufficient", [avail], s
        held[a] = held.get(a, 0) + m
        return "ok", [avail, a, m], State.of(bal, held)
    if op == "read":
        accounts = [int(a) for a in command["accounts"]]
        if any(a not in bal for a in accounts):
            return "refused:NoSuchAccount", [], s
        return "ok", [bal[a] for a in accounts], s
    if op == "team-debit":
        team = [int(a) for a in command["team"]]
        a, m = int(command["account"]), int(command["amount"])
        if a not in bal or any(x not in bal for x in team):
            return "refused:NoSuchAccount", [], s
        reads = [bal[x] for x in team]
        if sum(reads) - m < 0:
            return "refused:Insufficient", reads, s
        out = reads + [bal[a], bal[a] - m]
        bal[a] -= m
        return "ok", out, State.of(bal, held)
    if op == "open":
        a = int(command["account"])
        if a in bal:
            return "refused:Exists", [], s
        bal[a] = 0
        return "ok", [], State.of(bal, held)
    raise ValueError(f"the reference semantics has no command {op!r}")


# ------------------------------------------------------------------------------------------ search
@dataclass
class Verdict:
    verdict: str  # accept, reject or beyond-bound
    reason: str
    order: list[str] | None = None  # for an accept: the serial order the replay confirmed
    commit_order: list[str] = field(default_factory=list[str])
    explored: int = 0  # prefixes the search tried
    stepping: int = 0  # transactions that take a step
    bound: int = BOUND
    semantics: str = "z"

    def line(self) -> str:
        head = f"{self.verdict} (semantics {self.semantics}; {self.stepping} transaction{'s take' if self.stepping != 1 else ' takes'} a step; bound {self.bound}; {self.explored} prefix{'es' if self.explored != 1 else ''} tried)"
        if self.order is not None:
            head += f": order {' '.join(self.order)}"
        return head


@dataclass
class Search:
    """What the replay found: every order that reproduced each outcome and output, with its end state."""

    ends: list[tuple[list[str], State]]
    explored: int
    stepping: int
    beyond: bool
    closest: tuple[list[str], str] | None  # the longest prefix that replayed, and why the next step failed


def _observed(tx: Mapping[str, Any]) -> tuple[str, list[int | None]] | None:
    """(outcome, outputs) the semantics must reproduce, or None for a stutter."""
    outcome = str(tx["outcome"])
    if outcome.startswith("abort"):
        code = outcome.split(":", 1)[1] if ":" in outcome else ""
        if code in STUTTERS or outcome == "gaveup":
            return None
        return f"refused:{SQLSTATE_REFUSALS.get(code, code or 'Aborted')}", []
    if outcome == "gaveup":
        return None
    return outcome, list(tx.get("outputs", []))


def search(history: Mapping[str, Any], s0: State, *, semantics: str = "z", bound: int = BOUND, self_transfer: str = "refuse", limit_ends: int = 64) -> Search:
    txs = list(history["transactions"])
    stepping = [t for t in txs if _observed(t) is not None]
    if len(stepping) > bound:
        return Search([], 0, len(stepping), True, None)
    sessions: dict[str, list[Mapping[str, Any]]] = {}
    for t in stepping:
        sessions.setdefault(str(t.get("session", t["id"])), []).append(t)
    lanes = list(sessions.values())
    ends: list[tuple[list[str], State]] = []
    explored = 0
    closest: tuple[list[str], str] | None = None

    def go(state: State, positions: list[int], order: list[str]) -> None:
        nonlocal explored, closest
        if len(ends) >= limit_ends:
            return
        if all(p == len(l) for p, l in zip(positions, lanes)):
            ends.append((list(order), state))
            return
        for i, lane in enumerate(lanes):
            if positions[i] == len(lane):
                continue
            tx = lane[positions[i]]
            explored += 1
            want = _observed(tx)
            assert want is not None
            outcome, outputs, nxt = interp(tx["command"], state, semantics=semantics, self_transfer=self_transfer)
            if (outcome, outputs) != want:
                if closest is None or len(order) >= len(closest[0]):
                    closest = (list(order), f"{tx['id']} gave {outcome} {outputs} in the replay, but {want[0]} {want[1]} in the history")
                continue
            positions[i] += 1
            order.append(str(tx["id"]))
            go(nxt, positions, order)
            order.pop()
            positions[i] -= 1

    go(s0, [0] * len(lanes), [])
    return Search(ends, explored, len(stepping), False, closest)


def classify(
    history: Mapping[str, Any],
    *,
    start: Callable[[Mapping[str, Any]], tuple[State | None, bool]],
    relate: Callable[[Sequence[tuple[State, Mapping[str, Any]]]], list[bool]],
    semantics: str = "z",
    bound: int = BOUND,
    self_transfer: str = "refuse",
) -> Verdict:
    """Classify one abstract history under an R given as two functions: `start(D)` returns (alpha(D),
    R(alpha(D), D)), and `relate([(S, D), ...])` returns R(S, D) for each pair (batched, because a
    learner's R runs as a separate process)."""
    stepping_ids = {str(t["id"]) for t in history["transactions"] if _observed(t) is not None}
    commit_order = [i for i in history.get("commit_order", [str(t["id"]) for t in history["transactions"]]) if i in stepping_ids]
    s0, ok0 = start(history["d0"])
    if s0 is None or not ok0:
        return Verdict("reject", "R(alpha(D0), D0) does not hold: the history starts outside R", None, commit_order, 0, 0, bound, semantics)
    found = search(history, s0, semantics=semantics, bound=bound, self_transfer=self_transfer)
    if found.beyond:
        return Verdict("beyond-bound", f"{found.stepping} transactions take a step, more than the bound of {bound}; nothing was judged", None, commit_order, 0, found.stepping, bound, semantics)
    if not found.ends:
        why = "no serial order reproduces every committed outcome and output"
        if found.closest is not None:
            prefix = " ".join(found.closest[0]) or "(empty)"
            why += f"; the longest replayed prefix is {prefix}, then {found.closest[1]}"
        return Verdict("reject", why, None, commit_order, found.explored, found.stepping, bound, semantics)
    related = relate([(state, history["dfinal"]) for _, state in found.ends])
    for (order, _state), ok in zip(found.ends, related):
        if ok:
            note = "the serial order is the commit order" if order == commit_order else f"the serial order differs from the commit order ({' '.join(commit_order)})"
            return Verdict("accept", note, order, commit_order, found.explored, found.stepping, bound, semantics)
    return Verdict("reject", f"{len(found.ends)} serial order(s) reproduce every output, and none ends in a state that R relates to D_final", None, commit_order, found.explored, found.stepping, bound, semantics)


# ------------------------------------------------------------------------------------------ extraction
_ANNOTATION = re.compile(r"^#\s*@(d0|dfinal|tx)\s+(.*)$", re.M)


def _int(v: str | None) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        return int(float(v))


def _rows(event: Mapping[str, Any]) -> list[list[str | None]]:
    rows: list[list[str | None]] = []
    for r in event.get("results", []):
        rows.extend(r.get("rows", []))
    return rows


def annotations(spec_text: str) -> dict[str, Any]:
    """The abstract reading of a spec, from its comments:

        # @d0 <obs step>        the step that reads D before (rows: table, key, value)
        # @dfinal <obs step>    the step that reads D after
        # @tx <session>[#k] <command as JSON> outputs=<step>,<step> write=<step>

    `#k` names a session's k-th transaction (1 when left out); `outputs` lists the steps whose printed
    values are the transaction's outputs, in order; `write` is its guarded write, whose zero rows make
    the outcome `refused:Insufficient`."""
    out: dict[str, Any] = {"tx": []}
    for kind, rest in _ANNOTATION.findall(spec_text):
        if kind in ("d0", "dfinal"):
            out[kind] = rest.strip()
            continue
        m = re.match(r"(\S+)\s+(\{.*\})\s*(.*)$", rest.strip())
        if not m:
            raise ValueError(f"cannot read the annotation @tx {rest}")
        who, command, tail = m.groups()
        session, _, k = who.partition("#")
        fields = dict(part.split("=", 1) for part in tail.split() if "=" in part)
        out["tx"].append(
            {
                "session": session,
                "k": int(k or 1),
                "command": json.loads(command),
                "outputs": [s for s in fields.get("outputs", "").split(",") if s],
                "write": fields.get("write"),
            }
        )
    return out


def read_d(event: Mapping[str, Any] | None) -> dict[str, Any]:
    d: dict[str, Any] = {"acct": [], "holds": []}
    for row in _rows(event or {}):
        table, key, value = row[0], _int(row[1]), _int(row[2])
        if table == "acct":
            d["acct"].append([key, value])
        elif table == "hold":
            d["holds"].append([key, value])
    return d


def extract(spec_text: str, permutation: Mapping[str, Any], *, label: str = "") -> dict[str, Any]:
    """The abstract history of one isorun permutation, read by the spec's annotations."""
    from .isorun import parse_spec

    notes = annotations(spec_text)
    sql_of = {name: step.sql for name, step in parse_spec(spec_text).steps.items()}
    events = {e["step"]: e for e in permutation["events"] if e["status"] != "waiting"}
    ends: list[tuple[str, int]] = []  # (session, its k-th transaction ended), in the order they ended
    count: dict[str, int] = {}
    for e in permutation["events"]:
        if e["status"] == "waiting":
            continue
        tags = [str(r.get("command", "")).split(" ")[0].upper() for r in e.get("results", [])]
        if "COMMIT" in tags or "ROLLBACK" in tags or (e.get("error") and re.match(r"\s*(COMMIT|END)\b", sql_of.get(e["step"], ""), re.I)):
            count[e["session"]] = count.get(e["session"], 0) + 1
            ends.append((e["session"], count[e["session"]]))
    txs: list[dict[str, Any]] = []
    for t in notes["tx"]:
        outcomes = permutation["outcome"].get(t["session"], [])
        outcome = outcomes[t["k"] - 1] if len(outcomes) >= t["k"] else "not-run"
        outputs: list[int | None] = []
        for step in t["outputs"]:
            if step in events and not events[step].get("error"):
                outputs.extend(_int(v) for row in _rows(events[step]) for v in row)
        tx_outcome = outcome
        if outcome == "commit":
            tx_outcome = "ok"
            write = events.get(t["write"]) if t["write"] else None
            results = (write or {}).get("results", [])
            if write is not None and results and results[-1].get("rowcount") == 0:
                tx_outcome = "refused:Insufficient"
        txs.append({"id": f"{t['session']}" + (f"#{t['k']}" if any(o['session'] == t['session'] and o['k'] > 1 for o in notes['tx']) else ""), "session": t["session"], "command": t["command"], "outcome": tx_outcome, "outputs": outputs})
    ids = {(t["session"], t["k"]): f"{t['session']}" + (f"#{t['k']}" if any(o["session"] == t["session"] and o["k"] > 1 for o in notes["tx"]) else "") for t in notes["tx"]}
    commit_order = [ids[e] for e in ends if e in ids]
    commit_order += [t["id"] for t in txs if t["id"] not in commit_order]
    return {
        "label": label,
        "commit_order": commit_order,
        "permutation": permutation["permutation"],
        "signature": permutation["signature"],
        "levels": permutation.get("levels", {}),
        "d0": read_d(events.get(notes.get("d0", ""))),
        "dfinal": read_d(events.get(notes.get("dfinal", ""))),
        "transactions": txs,
    }

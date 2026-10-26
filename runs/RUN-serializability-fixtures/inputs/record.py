"""Record RUN-serializability-fixtures: the LAB-6.7 fixture manifest with the reference classifications.

Run inside the statespace-bench image, beside a PostgreSQL 18.6 container (PGHOST and friends set), from the
course repository's root:

    python3 -I runs/RUN-serializability-fixtures/inputs/record.py <out-dir>

For each fixture spec in labs/LAB-6/fixtures/specs/ it runs `statespace isorun` (bench/statespace/isorun.py),
keeps the history@1 file, reads the abstract history by the spec's @ annotations (statespace.history.extract),
and classifies it with the abstract-serializability checker (statespace.history.classify) under the reference R
below, once per semantics: the pinned unbounded integers (z) and the Except Overflow remedy. The toy G2-item
history has no database run: it is written here, in the shape of the anomaly Jepsen reported for PostgreSQL 12.3
(https://jepsen.io/analyses/postgresql-12.3, read 2026-10-23), as RUN-history-g2item's h1 is.

The reference R is the course's, as curriculum/S06-correspondence.md section 2 (S6.L8) defines it:
alpha(D) = each account's balance and the holds summed per account; wf(D) = every balance non-null and >= 0, every
hold non-null and > 0; R(S, D) = wf(D) and S = alpha(D). It lives in this recording script, not in the lab: the
learner writes their own alpha, wf and R in LAB-6.7.

It writes, under <out-dir>: <name>.history.json (isorun's history), abstract/<name>.json (the abstract history),
classify.log (one verdict line per fixture and semantics) and results.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path("bench").resolve()))

from statespace import history, isorun  # noqa: E402

SPECS = Path("labs/LAB-6/fixtures/specs")

G2_TOY = {
    "label": "g2-toy",
    "note": "A toy history in the shape of the G2-item anomaly Jepsen reported for PostgreSQL 12.3 under SERIALIZABLE: two transactions each read both accounts at their initial balances, each debits one of them, and both commit. Written by hand; there is no database run.",
    "commit_order": ["t1", "t2"],
    "d0": {"acct": [[1, 100], [2, 100]], "holds": []},
    "dfinal": {"acct": [[1, 70], [2, 70]], "holds": []},
    "transactions": [
        {"id": "t1", "session": "t1", "command": {"op": "team-debit", "team": [1, 2], "account": 1, "amount": 30}, "outcome": "ok", "outputs": [100, 100, 100, 70]},
        {"id": "t2", "session": "t2", "command": {"op": "team-debit", "team": [1, 2], "account": 2, "amount": 30}, "outcome": "ok", "outputs": [100, 100, 100, 70]},
    ],
}


def alpha(d):
    bal, held = {}, {}
    for key, value in d.get("acct", []):
        if key is None or value is None:
            return None
        bal[int(key)] = int(value)
    for key, value in d.get("holds", []):
        if key is None or value is None:
            return None
        held[int(key)] = held.get(int(key), 0) + int(value)
    return history.State.of(bal, held)


def wf(d):
    return all(v is not None and v >= 0 for _, v in d.get("acct", [])) and all(v is not None and v > 0 for _, v in d.get("holds", []))


def r(s, d):
    return wf(d) and alpha(d) == s


def start(d):
    s = alpha(d)
    return s, s is not None and r(s, d)


def relate(pairs):
    return [r(s, d) for s, d in pairs]


def main(out: Path) -> int:
    (out / "abstract").mkdir(parents=True, exist_ok=True)
    results = []
    log = []
    abstracts = {}
    for spec_path in sorted(SPECS.glob("*.spec")):
        name = spec_path.stem
        text = spec_path.read_bytes().decode("utf-8")
        h = isorun.run_spec(text, spec_path=spec_path.as_posix())
        (out / f"{name}.history.json").write_text(json.dumps(h, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        assert len(h["permutations"]) == 1, name
        p = h["permutations"][0]
        for line in isorun.verdict_lines(h):
            log.append(f"[{name}] {line}")
        abstracts[name] = history.extract(text, p, label=name)
    abstracts["g2-toy"] = G2_TOY
    for name, a in sorted(abstracts.items()):
        (out / "abstract" / f"{name}.json").write_text(json.dumps(a, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        entry = {"fixture": name, "verdicts": {}}
        for semantics in history.SEMANTICS:
            v = history.classify(a, start=start, relate=relate, semantics=semantics)
            entry["verdicts"][semantics] = {"verdict": v.verdict, "order": v.order, "commit_order": v.commit_order, "reason": v.reason, "line": v.line()}
            log.append(f"[{name}] {semantics}: {v.line()}; {v.reason}")
        results.append(entry)
    (out / "classify.log").write_text("\n".join(log) + "\n", encoding="utf-8")
    (out / "results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print("\n".join(log))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(Path(sys.argv[1])))

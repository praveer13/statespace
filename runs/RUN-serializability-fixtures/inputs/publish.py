"""Publish RUN-serializability-fixtures into the LAB-6 template: copy each abstract history to
labs/LAB-6/fixtures/histories/ and write labs/LAB-6/fixtures/manifest.yaml from results.json, so every
classification in the manifest is copied from the run, never typed.

    python3 runs/RUN-serializability-fixtures/inputs/publish.py <out-dir of record.py>
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

FIXTURES = Path("labs/LAB-6/fixtures")
R_MUTANTS = ("r-mutant-null", "r-mutant-wrong-account")
TITLES = {
    "rmw-rc": "read-modify-write at READ COMMITTED",
    "cond-rc": "conditional UPDATE at READ COMMITTED",
    "cond-ser-retry": "conditional UPDATE at SERIALIZABLE with a retry",
    "holds-rr": "holds at REPEATABLE READ",
    "holds-ser-retry": "holds at SERIALIZABLE with a retry",
    "opposite-retry": "opposite-order moves with a deadlock and a retry",
    "read-skew-rc": "read skew at READ COMMITTED",
    "report-before-transfer-ser": "report before transfer at SERIALIZABLE, where the serial order differs from the commit order",
    "overflow-22003": "an overflow history, accepted only under the Except Overflow remedy",
    "mixed-levels": "mixed isolation levels",
    "g2-toy": "the toy G2-item history",
    "r-mutant-null": "R-mutant, a NULL balance outside wf",
    "r-mutant-wrong-account": "R-mutant, equal totals with money on the wrong account",
}


def q(text: str) -> str:
    return json.dumps(text, ensure_ascii=False)


def main(out: Path) -> int:
    results = json.loads((out / "results.json").read_text(encoding="utf-8"))
    (FIXTURES / "histories").mkdir(parents=True, exist_ok=True)
    lines = [
        "# LAB-6.7's fixture manifest (curriculum/S06-correspondence.md section 3). A pinned statement: its hash is on the",
        "# LAB-6.7 receipt. Each fixture is an abstract history (histories/<id>.json) read from a statespace isorun",
        "# history of specs/<id>.spec on PostgreSQL 18.6, except the toy G2-item history, which is written by hand.",
        "# expect is the reference classification under each semantics (z: the pinned unbounded integers;",
        "# except-overflow: remedy 2), copied from RUN-serializability-fixtures; order is the reference's serial order",
        "# for an accept. rMutant marks the two fixtures that test R itself.",
        "schema: statespace/lab6-fixtures@1",
        "run: RUN-serializability-fixtures",
        "bound: 8",
        "fixtures:",
    ]
    for entry in results:
        name = entry["fixture"]
        shutil.copy(out / "abstract" / f"{name}.json", FIXTURES / "histories" / f"{name}.json")
        verdicts = entry["verdicts"]
        semantics = ["z", "except-overflow"] if name == "overflow-22003" else ["z"]
        lines.append(f"  - id: {name}")
        lines.append(f"    title: {q(TITLES.get(name, name))}")
        lines.append(f"    history: histories/{name}.json")
        spec = FIXTURES / "specs" / f"{name}.spec"
        lines.append(f"    spec: {'specs/' + name + '.spec' if spec.is_file() else 'null'}")
        lines.append("    expect: {" + ", ".join(f"{s}: {verdicts[s]['verdict']}" for s in semantics) + "}")
        order = verdicts["z"]["order"] or verdicts.get("except-overflow", {}).get("order")
        if order:
            lines.append("    order: [" + ", ".join(q(o) for o in order) + "]")
        if name in R_MUTANTS:
            lines.append("    rMutant: true")
    (FIXTURES / "manifest.yaml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"published {len(results)} fixtures to {FIXTURES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(Path(sys.argv[1])))

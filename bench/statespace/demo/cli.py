"""`statespace demo`: run the reference pipeline on the provided agent proposal (LAB-10.1), and
`statespace demo record`: record the demonstration (LAB-10.7).

    statespace demo [--root DIR] [--dsn DSN] [--json]
    statespace demo record [--root DIR] [--explain]

`statespace demo` runs the reference parser, typechecker, checker (Z3 through the Bench's lane, under an
rlimit), interpreter, compiler and runtime on PostgreSQL (the database at --dsn, else STATESPACE_PG_DSN,
which the devcontainer sets) on the proposal `TransferWithFee`, and writes the report skeleton to
`report/skeleton.json` and `report/skeleton.md`, with every Z3 query and its output under
`report/demo-runs/<UTC time>/`. It then compares the skeleton's section list, verdict lines and statement
hashes with the recorded one (`labs/LAB-10/challenge/RUN-core-demo.skeleton.json`) and prints the first
difference. Nothing it writes is a receipt; `statespace check lab10.1` runs the same pipeline and writes one.

Exit status: 0 written and equal to the recording; 1 written and different; 2 usage; 3 not run (Z3 is not
installed, or no lab repository).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RECORDED = "labs/LAB-10/challenge/RUN-core-demo.skeleton.json"


def find_root(start: Path) -> Path | None:
    here = start.resolve()
    return next((c for c in (here, *here.parents) if (c / "labs" / "LAB-10").is_dir()), None)


def first_difference(found: dict[str, Any], recorded: dict[str, Any]) -> str | None:
    from .pipeline import COMPARED

    for key in COMPARED:
        a, b = found.get(key) or [], recorded.get(key) or []
        for i in range(max(len(a), len(b))):
            x = a[i] if i < len(a) else None
            y = b[i] if i < len(b) else None
            if x != y:
                return f"{key}[{i}]: this run has {json.dumps(x)}, the recording {json.dumps(y)}"
    return None


def run_demo(root: Path, dsn: str | None) -> tuple[dict[str, Any], list[str]]:
    from statespace.lanes.z3 import Z3Session

    from . import pipeline, sqlplan
    from .proposals import DEFAULT

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    session = Z3Session(root=root, workdir=root / "report" / "demo-runs" / stamp)
    notes: list[str] = []
    conn = None
    if dsn:
        try:
            conn = sqlplan.connect(dsn)
        except Exception as error:  # noqa: BLE001 - a database that is not there is reported, not raised
            notes.append(f"PostgreSQL not reached at the DSN given: {error}")
    else:
        notes.append("no PostgreSQL: pass --dsn or set STATESPACE_PG_DSN (the devcontainer sets it)")
    try:
        sk = pipeline.skeleton(pipeline.z3_ask(session), DEFAULT.source, DEFAULT.claim, conn)
    finally:
        if conn is not None:
            conn.close()
    sk["environment"]["z3"] = session.runs[0].version if session.runs else None
    sk["environment"]["z3Runs"] = len(session.runs)
    return sk, notes


def main(argv: Sequence[str] | None = None) -> int:
    args_in = list(sys.argv[1:] if argv is None else argv)
    if args_in[:1] == ["record"]:
        return record_main(args_in[1:])
    parser = argparse.ArgumentParser(prog="statespace demo", description="Run the reference pipeline on the provided agent proposal and write the report skeleton (LAB-10.1). `statespace demo record` records the demonstration (LAB-10.7).")
    parser.add_argument("--root", type=Path, default=None, help="the lab repository (default: the nearest directory upward holding labs/LAB-10)")
    parser.add_argument("--dsn", default=None, help="the PostgreSQL to run on (default: STATESPACE_PG_DSN)")
    parser.add_argument("--json", action="store_true", help="print the skeleton as JSON")
    args = parser.parse_args(args_in)
    root = args.root.resolve() if args.root else find_root(Path.cwd())
    if root is None:
        sys.stderr.write("statespace demo: no labs/LAB-10/ here or above; run it from your lab repository, or pass --root\n")
        return 3
    from statespace.check.lanes import ToolUnavailable

    try:
        sk, notes = run_demo(root, args.dsn or os.environ.get("STATESPACE_PG_DSN"))
    except ToolUnavailable as error:
        sys.stderr.write(f"statespace demo: not run: {error}\n")
        return 3
    out = root / "report"
    out.mkdir(exist_ok=True)
    from .pipeline import skeleton_markdown

    (out / "skeleton.json").write_text(json.dumps(sk, indent=2) + "\n", encoding="utf-8")
    (out / "skeleton.md").write_text(skeleton_markdown(sk), encoding="utf-8")
    if args.json:
        sys.stdout.write(json.dumps(sk, indent=2) + "\n")
    else:
        sys.stdout.write("statespace demo: the reference pipeline on TransferWithFee (reference modules, earn nothing)\n")
        for line in sk["verdictLines"]:
            sys.stdout.write(f"  {line}\n")
        for note in notes:
            sys.stdout.write(f"note: {note}\n")
        sys.stdout.write("wrote report/skeleton.json and report/skeleton.md\n")
    recorded_path = root / RECORDED
    if not recorded_path.is_file():
        sys.stdout.write(f"no recorded skeleton at {RECORDED} to compare with\n")
        return 1
    diff = first_difference(sk, json.loads(recorded_path.read_text(encoding="utf-8")))
    if diff is None:
        sys.stdout.write("the section list, verdict lines and statement hashes equal the recorded skeleton (RUN-core-demo)\n")
        return 0
    sys.stdout.write(f"differs from the recorded skeleton (RUN-core-demo) first at {diff}\n")
    return 1


def record_main(argv: Sequence[str]) -> int:
    parser = argparse.ArgumentParser(prog="statespace demo record", description="Record the demonstration in demo/ (LAB-10.7): every artifact by hash, every run by receipt and step, every statement by hash.")
    parser.add_argument("--root", type=Path, default=None)
    parser.add_argument("--explain", action="store_true", help="say what each artifact is and where it comes from")
    args = parser.parse_args(list(argv))
    root = args.root.resolve() if args.root else find_root(Path.cwd())
    if root is None:
        sys.stderr.write("statespace demo record: no labs/LAB-10/ here or above\n")
        return 3
    from .record import build

    manifest, lines = build(root, explain=args.explain)
    for line in lines:
        sys.stdout.write(line + "\n")
    return 0 if manifest is not None else 1


if __name__ == "__main__":
    raise SystemExit(main())

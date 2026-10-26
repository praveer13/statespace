"""Write the fixture lab repository: real receipts written by `statespace check`, with their inputs.

Writes bench/statespace/check/fixtures/lab-repo/: the test lab of bench/statespace/check/tests/support.py
(LAB-90, two stages that run the pinned Z3 through both entries) checked once, so that
`statespace receipt verify` has receipts with an integrity digest, pinned statements and run inputs to
accept, and to reject once tampered, without Z3 installed; the tab's importer (W1-T14) can read the same
files. LAB-90 and CL-90.x are test identifiers, not course IDs.

    uv run --project bench --locked --group image python -I scripts/spikes/W1-T29/make-fixture-receipts.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "bench" / "statespace" / "check" / "fixtures" / "lab-repo"


def main() -> int:
    sys.path.insert(0, str(ROOT / "bench"))
    from statespace.check import register
    from statespace.check.runner import run_stage
    from statespace.check.tests.support import PROVENANCE, TEST_LAB, make_repo

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    make_repo(OUT)
    (OUT / "labs" / "LAB-90" / "README.md").write_text("The test lab of the Bench CLI's tests: not a course lab.\n", encoding="utf-8")
    register(TEST_LAB)
    for stage in TEST_LAB.stages:
        outcome = run_stage(TEST_LAB, stage, root=OUT, provenance=PROVENANCE, seed=2026)
        if outcome.problem is not None or outcome.receipt_path is None:
            print(f"{stage.id}: {outcome.problem}", file=sys.stderr)
            return 1
        print(f"wrote {outcome.receipt_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

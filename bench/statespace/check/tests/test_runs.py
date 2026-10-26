"""`statespace run`: RUN-z3-starter reproduces its recorded verdict, and what the command refuses.

The synthetic records live in a scratch copy of a registry and run a small Python script, so the
re-execution machinery is tested without Z3 or uv; the acceptance test re-executes the real record."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

from statespace.check import lanes
from statespace.check.runs import RunError, find_repo, layout, load_record, rerun, view_of

from .support import BENCH, REPO, UV, cli

SCRIPT = """import sys
print("z3 version: 5.3.1")
print("[q1] sat (0.01s) [x = 7]")
print("[q2] " + (sys.argv[1] if len(sys.argv) > 1 else "unsat") + " (0.00s) ")
"""

# W1-T12's shape: each witness replayed and each unsat core re-checked on an indented line, one @@ line per
# query, and an exit status. The argument changes one thing, as a tool bump might.
CHECKED = """import sys
change = sys.argv[1] if len(sys.argv) > 1 else ""
print("z3 5.3.1 rlimit=5000000")
print("[q] sat [x = 2]")
print("  replay " + ("FAILED: x=2: x > 0 ok, x < 2 FAILS" if change == "replay" else "ok: x=2: x > 0 ok, x < 3 ok"))
print('@@ {"q": "q", "verdict": "sat"}')
print("[c] unsat unsat_core=['a', 'b']")
print("  core check: the core alone is " + ("NOT unsat" if change == "core" else "unsat") + "; dropping any one member leaves it sat")
if change == "twice":
    print("[q] unsat")
sys.exit(1 if change == "exit" else 0)
"""
CHECKED_LINES = [
    "z3 5.3.1 rlimit=5000000",
    "[q] sat [x = 1]",
    "  replay ok: x=1: x > 0 ok, x < 3 ok",
    "[c] unsat unsat_core=['a', 'b']",
    "  core check: the core alone is unsat; dropping any one member leaves it sat",
]


class Acceptance(unittest.TestCase):
    def rerun_recorded(self, run_id: str, config: str | None = None) -> Any:
        """Re-execute a registry run of another task. A run whose input changed since it was recorded is
        refused, rightly, and leaves nothing to re-execute: its task is re-recording it (GATE-runs reports
        the stale input), so the test skips with the refusal. Any other refusal, or a difference, fails."""
        outcome = rerun(REPO, run_id, config=config)
        if outcome.status == "refused" and "changed since the run" in (outcome.reason or ""):
            self.skipTest(f"{run_id} is stale in this tree, so statespace run refused it: {outcome.reason}")
        return outcome

    @unittest.skipUnless(UV, "needs uv, which runs the record's pinned z3-solver")
    def test_run_z3_starter_reproduces_its_recorded_verdict(self) -> None:
        outcome = rerun(REPO, "RUN-z3-starter")
        self.assertEqual(outcome.status, "reproduced", outcome.output[-2000:])
        assert outcome.plan is not None
        self.assertEqual(outcome.plan.argv, ["uv", "run", "--no-project", "--quiet", "--with", "z3-solver==5.3.1", "python", "-I", "z3_claims.py"])
        self.assertEqual(outcome.exit_code, 0)
        statuses = [(c.status, c.recorded.split("]")[0]) for c in outcome.comparisons]
        self.assertEqual(statuses, [("same", "z3 version: 5.3.1"), ("same", "[1.2 starter: overdraft search"), ("same", "[1.3 guard added")])
        self.assertEqual(outcome.inputs, [("research/evidence/a2r3/scripts/z3_claims.py", "a558596e31782a8d3f0dc3a2062cb7cb713d71a93417d453b0818b6434cc592d")])

    def test_the_record_is_read_and_viewed(self) -> None:
        record = load_record(REPO, "RUN-z3-starter")
        view = view_of(record)
        self.assertEqual((view.engine, view.version, view.argv), ("z3", "5.3.1", None))
        self.assertIn("argv", view.unrecorded)
        self.assertEqual(find_repo(REPO / "bench" / "statespace"), REPO)
        with self.assertRaises(RunError):
            view_of(record, "no-such-config")
        self.assertEqual(view_of(record, "results-2026-10-20").config, "results-2026-10-20")

    @unittest.skipUnless(UV, "needs uv, which runs the record's pinned z3-solver")
    def test_run_z3_smtlib_tour_keeps_its_layout(self) -> None:
        # tour_cli.sh reads smtlib/<name>.smt2 beside itself: staged by bare file names, z3 could open none.
        outcome = self.rerun_recorded("RUN-z3-smtlib-tour")
        self.assertEqual(outcome.status, "reproduced", outcome.output[-2000:])
        self.assertTrue(outcome.primary)
        assert outcome.view is not None
        self.assertEqual(outcome.view.config, "cli-native")
        self.assertEqual(outcome.staged["runs/inputs/S1/RUN-z3-smtlib-tour/smtlib/starter.smt2"], "smtlib/starter.smt2")
        counted = [c for c in outcome.comparisons if c.status != "skipped"]
        self.assertEqual((len(counted), sum(1 for c in counted if c.status == "same")), (16, 16))

    @unittest.skipUnless(UV, "needs uv, which runs the record's pinned z3-solver")
    def test_run_z3_bv64_negamt_is_reexecuted(self) -> None:
        # Its inputs hold two files named z3_negamt.py; the primary configuration reads neither.
        outcome = self.rerun_recorded("RUN-z3-bv64-negamt")
        self.assertEqual(outcome.status, "reproduced", outcome.output[-2000:])
        original = self.rerun_recorded("RUN-z3-bv64-negamt", config="int-twin-original")
        self.assertEqual(original.status, "reproduced", original.output[-2000:])
        self.assertEqual(original.staged, {"runs/inputs/S1/RUN-z3-bv64-negamt/original/z3_negamt.py": "original/z3_negamt.py"})


class Synthetic(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        (self.repo / "runs").mkdir()
        (self.repo / "schemas").mkdir()
        (self.repo / "schemas" / "run.schema.json").write_text("{}", encoding="utf-8")  # find_repo's marker; the CLI validates with its own copy
        (self.repo / "scripts").mkdir()
        self.script = self.repo / "scripts" / "fake.py"
        self.script.write_text(SCRIPT, encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def record(self, run_id: str, **overrides: Any) -> None:
        sha = hashlib.sha256(self.script.read_bytes()).hexdigest()
        doc: dict[str, Any] = {
            "id": run_id,
            "title": "a synthetic run",
            "engine": "z3",
            "version": "5.3.1",
            "binary": None,
            "binary_sha256": None,
            "image": None,
            "recorded_at": "2026-10-25T00:00:00Z",
            "started_at": None,
            "duration_s": None,
            "argv": [sys.executable, "-I", "fake.py"],
            "inputs": [{"path": "scripts/fake.py", "sha256": sha, "role": "script"}],
            "budget": {},
            "exit_code": 0,
            "verdict_lines": ["z3 version: 5.3.1", "[q1] sat (0.00s) [x = 1]", "[q2] unsat (0.00s) "],
            "outputs": [],
            "environment": {"os": None, "cpu_count": None},
            "notes": [],
        }
        doc.update(overrides)
        (self.repo / "runs" / f"{run_id}.json").write_text(json.dumps(doc), encoding="utf-8")

    def test_reproduced_when_only_models_and_timings_differ(self) -> None:
        self.record("RUN-fake")
        outcome = rerun(self.repo, "RUN-fake")
        self.assertEqual(outcome.status, "reproduced")
        assert outcome.plan is not None
        self.assertEqual(outcome.plan.cwd, "stage")
        self.assertEqual([c.status for c in outcome.comparisons], ["same", "same", "same"])

    def test_a_changed_verdict_differs(self) -> None:
        self.record("RUN-fake", argv=[sys.executable, "-I", "fake.py", "sat"])
        outcome = rerun(self.repo, "RUN-fake")
        self.assertEqual(outcome.status, "differs")
        self.assertEqual(outcome.comparisons[2].status, "differs")
        self.assertEqual(outcome.comparisons[2].note, "recorded unsat, now sat")

    def test_a_witness_that_stops_replaying_differs(self) -> None:
        # Spine section 9.5: a tool bump must produce a reviewable diff, so a re-run whose witness no longer
        # replays, whose core check no longer holds, which answers a recorded label twice, or which exits
        # with another code than the record gives, differs.
        checked = self.repo / "scripts" / "checked.py"
        checked.write_text(CHECKED, encoding="utf-8")
        inputs = [{"path": "scripts/checked.py", "sha256": hashlib.sha256(checked.read_bytes()).hexdigest(), "role": "script"}]
        expected = {"": "reproduced", "replay": "differs", "core": "differs", "twice": "differs", "exit": "differs"}
        for change, status in expected.items():
            with self.subTest(change or "no change"):
                run_id = f"RUN-checked-{change or 'same'}"
                self.record(run_id, argv=[sys.executable, "-I", "checked.py", *([change] if change else [])], inputs=inputs, verdict_lines=CHECKED_LINES, exit_code=0)
                outcome = rerun(self.repo, run_id)
                self.assertEqual(outcome.status, status, [(c.status, c.recorded, c.found) for c in outcome.comparisons])
                shown = cli("run", run_id, cwd=self.repo)
                self.assertEqual(shown.returncode, 0 if status == "reproduced" else 1, shown.stdout)
                self.assertTrue(shown.stdout.splitlines()[-1].startswith("reproduced" if status == "reproduced" else "DIFFERS"), shown.stdout)
                if change == "exit":
                    self.assertTrue(outcome.exit_differs)
                    self.assertEqual([c.status for c in outcome.comparisons], ["same", "same", "same", "same", "same"], "only the exit code changed")
                    self.assertIn("the exit code differs (recorded 0, now 1)", shown.stdout)
                    self.assertIn("recorded 0, which DIFFERS", shown.stdout)
                if change == "replay":
                    self.assertEqual([c.note for c in outcome.comparisons if c.status == "differs"], ["recorded replay ok, now replay FAILED"])
                if change == "twice":
                    self.assertEqual([c.found for c in outcome.comparisons if c.status == "differs"], ["[q] unsat"])
        # The exit code is compared only when the record gives one.
        self.record("RUN-checked-unrecorded", argv=[sys.executable, "-I", "checked.py", "exit"], inputs=inputs, verdict_lines=CHECKED_LINES, exit_code=None)
        unrecorded = rerun(self.repo, "RUN-checked-unrecorded")
        self.assertEqual((unrecorded.status, unrecorded.exit_differs), ("reproduced", False))

    def test_repository_paths_run_from_the_root(self) -> None:
        self.record("RUN-fake", argv=[sys.executable, "-I", "scripts/fake.py"])
        outcome = rerun(self.repo, "RUN-fake")
        assert outcome.plan is not None
        self.assertEqual(outcome.plan.cwd, "repo")
        self.assertEqual(outcome.status, "reproduced")

    def test_inputs_keep_their_layout_beside_the_script(self) -> None:
        (self.repo / "scripts" / "sub").mkdir()
        data = self.repo / "scripts" / "sub" / "data.txt"
        data.write_text("unsat\n", encoding="utf-8")
        reader = self.repo / "scripts" / "reader.py"
        reader.write_text('print("[q1] sat (0.01s)")\nprint("[q2] " + open("sub/data.txt").read().strip())\n', encoding="utf-8")
        sha = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (data, reader)}
        elsewhere = self.repo / "harness.mjs"  # another configuration's input, which this command does not read
        elsewhere.write_text("// not read\n", encoding="utf-8")
        self.record(
            "RUN-layout",
            argv=[sys.executable, "-I", "reader.py"],
            inputs=[
                {"path": "scripts/reader.py", "sha256": sha[reader], "role": "script"},
                {"path": "scripts/sub/data.txt", "sha256": sha[data], "role": "fixture"},
                {"path": "harness.mjs", "sha256": hashlib.sha256(elsewhere.read_bytes()).hexdigest(), "role": "harness"},
            ],
            verdict_lines=["[q1] sat (0.00s)", "[q2] unsat"],
        )
        outcome = rerun(self.repo, "RUN-layout")
        self.assertEqual(outcome.status, "reproduced", outcome.output)
        self.assertEqual(outcome.staged, {"scripts/reader.py": "reader.py", "scripts/sub/data.txt": "sub/data.txt"})
        shown = [line for line in cli("run", "RUN-layout", cwd=self.repo).stdout.splitlines() if line.strip().startswith("input")]
        self.assertEqual([("staged as" in line, "not staged" in line) for line in shown], [(True, False), (True, False), (False, True)], shown)

    def test_layout(self) -> None:
        tour = ["runs/x/tour_cli.sh", "runs/x/smtlib/a.smt2", "runs/x/smtlib/b.smt2", "scripts/harness.mjs"]
        self.assertEqual(layout(["uv", "run", "sh", "tour_cli.sh"], tour), {"runs/x/tour_cli.sh": "tour_cli.sh", "runs/x/smtlib/a.smt2": "smtlib/a.smt2", "runs/x/smtlib/b.smt2": "smtlib/b.smt2"})
        twins = ["runs/y/original/t.py", "research/scripts/t.py", "runs/y/main.py"]
        self.assertEqual(layout(["python", "-I", "original/t.py"], twins), {"runs/y/original/t.py": "original/t.py", "runs/y/main.py": "main.py"})
        self.assertIn("2 inputs end that way", str(layout(["python", "-I", "t.py"], twins)))
        self.assertEqual(layout(["python", "-I", "main.py", "data.csv"], ["runs/y/main.py", "elsewhere/data.csv"]), {"runs/y/main.py": "main.py", "elsewhere/data.csv": "data.csv"})
        self.assertIn("both be staged as", str(layout(["python", "-I", "main.py", "x/data.csv"], ["runs/y/main.py", "runs/y/x/data.csv", "z/x/data.csv"])))
        self.assertIn("names none of the inputs", str(layout(["python", "-c", "pass"], ["runs/y/main.py"])))

    def test_the_primary_configuration_is_the_default_view(self) -> None:
        self.record(
            "RUN-configs",
            argv=[sys.executable, "-I", "fake.py"],
            inputs=[{"path": "scripts/fake.py", "sha256": hashlib.sha256(self.script.read_bytes()).hexdigest()}, {"path": "scripts/gone.mjs", "sha256": "0" * 64}],
            primary_config="native",
            configs=[
                {"id": "native", "argv": [sys.executable, "-I", "fake.py"], "inputs": [{"path": "scripts/fake.py", "sha256": hashlib.sha256(self.script.read_bytes()).hexdigest()}]},
                {"id": "browser", "argv": ["node", "scripts/gone.mjs"], "inputs": [{"path": "scripts/gone.mjs", "sha256": "0" * 64}]},
            ],
        )
        outcome = rerun(self.repo, "RUN-configs")
        self.assertEqual(outcome.status, "reproduced", outcome.reason)
        self.assertTrue(outcome.primary)
        self.assertEqual([p for p, _ in outcome.inputs], ["scripts/fake.py"], "the top level's inputs are every configuration's")
        browser = rerun(self.repo, "RUN-configs", config="browser")
        self.assertEqual((browser.status, browser.primary), ("refused", False))

    def test_a_lane_that_cannot_load_refuses_every_run_and_fails_the_command(self) -> None:
        self.record("RUN-good")
        saved = sys.modules.pop("statespace.lanes.z3", None)
        sys.modules["statespace.lanes.z3"] = None  # type: ignore[assignment]  # import now fails: a planted fault
        try:
            lanes.discover(refresh=True)
            outcome = rerun(self.repo, "RUN-good")
            self.assertEqual((outcome.status, outcome.fault), ("refused", True))
            self.assertIn("statespace.lanes.z3 could not load", outcome.reason or "")
        finally:
            del sys.modules["statespace.lanes.z3"]
            if saved is not None:
                sys.modules["statespace.lanes.z3"] = saved
            lanes.discover(refresh=True)
        self.assertEqual(lanes.broken(), {})
        plant = "import sys; sys.modules['statespace.lanes.z3'] = None; from statespace.cli import main; sys.exit(main(sys.argv[1:]))"
        env = {**os.environ, "PYTHONPATH": str(BENCH)}
        done = subprocess.run([sys.executable, "-c", plant, "run", "--all"], cwd=self.repo, env=env, capture_output=True, text=True, timeout=120)
        self.assertEqual(done.returncode, 3, "with --all, a refusal does not change the exit status, but a broken lane does")
        self.assertIn("could not load", done.stdout)

    def test_refusals(self) -> None:
        cases: dict[str, dict[str, Any]] = {
            "RUN-other-engine": {"engine": "nonesuch"},
            "RUN-in-an-image": {"image": "example@sha256:" + "0" * 64},
            "RUN-placeholders": {"argv": ["node", "<sandbox>/x.mjs"]},
            "RUN-changed-input": {"inputs": [{"path": "scripts/fake.py", "sha256": "0" * 64, "role": "script"}]},
            "RUN-missing-input": {"inputs": [{"path": "scripts/gone.py", "sha256": "0" * 64}]},
            "RUN-no-lines": {"verdict_lines": []},
            "RUN-two-scripts": {"argv": None, "inputs": [{"path": "scripts/fake.py", "sha256": "0" * 64, "role": "script"}, {"path": "scripts/b.py", "sha256": "0" * 64, "role": "script"}]},
        }
        for run_id, overrides in cases.items():
            with self.subTest(run_id):
                self.record(run_id, **overrides)
                outcome = rerun(self.repo, run_id)
                self.assertEqual(outcome.status, "refused")
                self.assertTrue(outcome.reason)

    def test_records_that_are_not_run_at_1(self) -> None:
        with self.assertRaises(RunError):
            rerun(self.repo, "RUN-absent")
        self.record("RUN-broken", recorded_at="yesterday")
        with self.assertRaisesRegex(RunError, "not a valid run@1"):
            rerun(self.repo, "RUN-broken")
        (self.repo / "runs" / "RUN-dup.json").write_text('{"id": "RUN-dup", "id": "RUN-dup"}', encoding="utf-8")
        with self.assertRaisesRegex(RunError, "twice"):
            rerun(self.repo, "RUN-dup")

    def test_the_command_and_its_exit_status(self) -> None:
        self.record("RUN-good")
        self.record("RUN-bad", argv=[sys.executable, "-I", "fake.py", "unknown"])
        self.record("RUN-other", engine="nonesuch")
        good = cli("run", "RUN-good", cwd=self.repo)
        self.assertEqual(good.returncode, 0, good.stdout + good.stderr)
        self.assertIn("reproduced: 3 of 3 verdict lines", good.stdout)
        bad = cli("run", "RUN-bad", cwd=self.repo)
        self.assertEqual(bad.returncode, 1)
        self.assertIn("DIFFERS", bad.stdout)
        self.assertEqual(cli("run", "RUN-other", cwd=self.repo).returncode, 3)
        self.assertEqual(cli("run", "RUN-absent", cwd=self.repo).returncode, 2)
        (self.repo / "runs" / "RUN-unreadable.json").write_text("{", encoding="utf-8")
        everything = cli("run", "--all", "--json", "--save", str(self.repo / "out"), cwd=self.repo)
        self.assertEqual(everything.returncode, 1, "one run differs")
        statuses = {o["run"]: o["status"] for o in json.loads(everything.stdout)}
        self.assertEqual(statuses, {"RUN-bad": "differs", "RUN-good": "reproduced", "RUN-other": "refused", "RUN-unreadable": "refused"})
        self.assertTrue((self.repo / "out" / "RUN-good.out").read_text().startswith("z3 version: 5.3.1"))
        with tempfile.TemporaryDirectory() as elsewhere:
            self.assertEqual(cli("run", "RUN-good", cwd=Path(elsewhere)).returncode, 2)


if __name__ == "__main__":
    unittest.main()

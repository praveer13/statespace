"""The lab system's frame: lab discovery by directory, the listing `statespace check` prints with no target,
the Z3Py capture, and LAB-1's starter failing LAB-1.c1 with a named suspect. No reference solution is here:
GATE-labs runs the private ones (ARCHITECTURE.md section 13.5)."""

from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path

from statespace.check import labs
from statespace.check.runner import listing, run_stage
from statespace.check.z3py import capture

from .support import REPO, Z3


class Discovery(unittest.TestCase):
    def test_modules_are_found_by_directory(self) -> None:
        self.assertIn("LAB-1", labs.available())

    def test_repo_labs_are_found_by_directory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("LAB-10", "LAB-2", "LAB-x", "lab-3"):
                (root / "labs" / name).mkdir(parents=True)
            (root / "labs" / "LAB-4").write_text("a file, not a lab\n")
            self.assertEqual(labs.repo_labs(root), ["LAB-2", "LAB-10"])

    def test_listing_names_each_stage_and_check(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "labs" / "LAB-1").mkdir(parents=True)
            text = listing(root)
            self.assertIn("labs here: LAB-1", text)
            self.assertIn("lab1.1", text)
            self.assertIn("LAB-1.c1  The answer pair reproduces.", text)
            self.assertIn("LAB-1.c6", text)

    def test_a_missing_module_names_what_is_held(self) -> None:
        with self.assertRaises(labs.LabUnavailable) as caught:
            labs.find_lab("LAB-99")
        self.assertIn("it holds: LAB-1", str(caught.exception))


@unittest.skipUnless(Z3, "needs z3-solver 5.3.1")
class Capture(unittest.TestCase):
    def test_each_question_is_captured_as_smtlib(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "q.py").write_text(
                "from z3 import *\nx = Int('x')\ns = Solver()\ns.add(x > 0)\nprint(s.check())\nprint(s.check(x < 0))\n", encoding="utf-8"
            )
            got = capture(root=root, workdir=root / "work", script="q.py", prefix="q")
            self.assertIsNone(got.error)
            self.assertEqual([q.answer for q in got.queries], ["sat", "unsat"])
            self.assertIn("(check-sat)", got.queries[0].text)
            self.assertIn("(check-sat-assuming ((< x 0)))", got.queries[1].text)
            self.assertEqual(got.output_lines, ("sat", "unsat"))

    def test_a_script_that_raises_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "q.py").write_text("raise ValueError('nope')\n", encoding="utf-8")
            got = capture(root=root, workdir=root / "work", script="q.py", prefix="q")
            self.assertEqual(got.error, "ValueError: nope")


@unittest.skipUnless(Z3, "needs z3-solver 5.3.1")
class Lab1Starter(unittest.TestCase):
    def test_the_starter_fails_c1_and_names_the_spec(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "labs" / "LAB-1").mkdir(parents=True)
            shutil.copy(REPO / "labs" / "LAB-1" / "starter.py", root / "labs" / "LAB-1" / "starter.py")
            lab = labs.find_lab("LAB-1")
            outcome = run_stage(lab, lab.stage("LAB-1.1"), root=root, provenance={"assisted": "none", "agent": False, "guard": "on"})
            self.assertIsNone(outcome.problem)
            [(spec, result, _lines)] = outcome.results
            self.assertEqual(spec.id, "LAB-1.c1")
            self.assertFalse(result.passed)
            self.assertEqual(result.suspect, "spec")
            self.assertIsNotNone(outcome.receipt_path)
            assert outcome.receipt is not None
            self.assertEqual([r["verdict"] for r in outcome.receipt["runs"]], ["sat", "sat"])
            self.assertEqual(outcome.receipt["checks"], [{"id": "LAB-1.c1", "pass": False}])


if __name__ == "__main__":
    unittest.main()

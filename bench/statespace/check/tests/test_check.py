"""`statespace check`: the runner, end to end on the test lab with the pinned Z3, and what it refuses."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from statespace import receipt as receipts
from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable, parse_target, register, unregister
from statespace.check.labs import LabUnavailable, find_lab
from statespace.check.runner import find_root, resolve_provenance, run_stage

from .support import PROVENANCE, TEST_LAB, Z3, cli, make_repo


class Targets(unittest.TestCase):
    def test_short_names(self) -> None:
        self.assertEqual((parse_target("lab1").lab, parse_target("lab1").stage), ("LAB-1", None))
        self.assertEqual(parse_target("lab2.2").stage, "LAB-2.2")
        self.assertEqual(parse_target("LAB-1.3").stage, "LAB-1.3")
        self.assertEqual(parse_target("lab01.03").stage, "LAB-1.3")
        for bad in ("lab", "lab1.", "S1", "lab1.2.3", "LAB-1.c3"):
            with self.subTest(bad), self.assertRaises(ValueError):
                parse_target(bad)

    def test_unknown_labs(self) -> None:
        with self.assertRaises(LabUnavailable):
            find_lab("LAB-77")

    def test_model_validation(self) -> None:
        with self.assertRaises(ValueError):
            Stage("LAB-90.1", "x", (CheckSpec("LAB-91.c1", "x", lambda ctx: CheckResult(True, "")),))
        with self.assertRaises(ValueError):
            Lab("LAB-90", "x", (Stage("LAB-91.1", "x", ()),))
        with self.assertRaises(ValueError):
            CheckResult(False, "x", "someone else")
        self.assertEqual(Lab("LAB-90", "x", ()).directory, "labs/LAB-90")


class Provenance(unittest.TestCase):
    def test_declared(self) -> None:
        block, notes = resolve_provenance("explain", "no", {})
        self.assertEqual(block, {"assisted": "explain", "agent": False, "guard": "on"})
        self.assertEqual(notes, [])

    def test_undeclared_records_the_most_help(self) -> None:
        block, notes = resolve_provenance(None, None, {})
        self.assertEqual(block, {"assisted": "code", "agent": True, "guard": "on"})
        self.assertEqual(len(notes), 1)

    def test_environment_and_guard(self) -> None:
        block, _ = resolve_provenance(None, None, {"STATESPACE_ASSISTED": "none", "STATESPACE_AGENT": "no", "STATESPACE_GUARD": "off"})
        self.assertEqual(block, {"assisted": "none", "agent": False, "guard": "off"})
        with self.assertRaises(ValueError):
            resolve_provenance(None, None, {"STATESPACE_ASSISTED": "a lot"})


class Root(unittest.TestCase):
    def test_found_upward_from_a_subdirectory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = make_repo(Path(tmp))
            deep = root / "labs" / "LAB-90" / "src"
            deep.mkdir()
            self.assertEqual(find_root("labs/LAB-90", deep), root.resolve())
            self.assertIsNone(find_root("labs/LAB-91", deep))


class Runner(unittest.TestCase):
    def setUp(self) -> None:
        register(TEST_LAB)
        self.tmp = tempfile.TemporaryDirectory()
        self.root = make_repo(Path(self.tmp.name)).resolve()

    def tearDown(self) -> None:
        unregister(TEST_LAB.id)
        self.tmp.cleanup()

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_a_stage_writes_a_receipt_that_verifies(self) -> None:
        outcome = run_stage(TEST_LAB, TEST_LAB.stages[1], root=self.root, provenance=PROVENANCE, seed=11)
        self.assertIsNone(outcome.problem)
        assert outcome.receipt_path is not None and outcome.receipt is not None
        self.assertEqual(outcome.receipt_path.parent, self.root / "receipts" / "LAB-90.2")
        receipt = json.loads(outcome.receipt_path.read_text(encoding="utf-8"))
        self.assertEqual(receipt, outcome.receipt)
        self.assertEqual(receipt["checks"], [{"id": "LAB-90.c2", "pass": True}, {"id": "LAB-90.c3", "pass": False}])
        self.assertEqual(receipt["claims"], [{"template": "CL-90.1"}], "a failing check mints nothing")
        self.assertEqual([r["step"] for r in receipt["runs"]], ["violation", "premises"])
        self.assertEqual(receipt["runs"][1]["budget"]["seed"], 11)
        self.assertEqual(receipt["z3"]["verdict"], "unsat")
        self.assertEqual(receipt["environment"]["sandbox"], "off")
        self.assertEqual(receipt["lane"], "reported")
        self.assertEqual(outcome.status, 1)
        result = receipts.verify_file(outcome.receipt_path)
        self.assertTrue(result.ok, [f.message for f in result.findings if f.level == "fail"])
        for run in receipt["runs"]:
            self.assertTrue((self.root / run["argv"][-1]).is_file(), "each run's input is kept beside the receipt")

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_two_receipts_in_one_second_do_not_collide(self) -> None:
        first = run_stage(TEST_LAB, TEST_LAB.stages[0], root=self.root, provenance=PROVENANCE)
        second = run_stage(TEST_LAB, TEST_LAB.stages[0], root=self.root, provenance=PROVENANCE)
        assert first.receipt_path is not None and second.receipt_path is not None
        self.assertNotEqual(first.receipt_path, second.receipt_path)
        self.assertTrue(receipts.verify_file(second.receipt_path).ok)

    def test_a_missing_engine_writes_no_receipt(self) -> None:
        def needs_a_tool(ctx: CheckContext) -> CheckResult:
            (ctx.workdir).mkdir(parents=True, exist_ok=True)
            raise ToolUnavailable("z3 is not installed here")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", needs_a_tool),)),))
        outcome = run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE)
        self.assertIn("nothing was judged", outcome.problem or "")
        self.assertEqual(outcome.status, 3)
        self.assertFalse(any((self.root / "receipts" / "LAB-90.1").glob("*")), "no receipt and no orphan folder")

    def test_a_broken_check_is_not_your_fault_and_writes_no_receipt(self) -> None:
        def broken(ctx: CheckContext) -> CheckResult:
            raise KeyError("oops")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", broken),)),))
        outcome = run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE)
        self.assertIn("fault in statespace, not in your work", outcome.problem or "")
        self.assertIsNone(outcome.receipt_path)

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_a_receipt_that_does_not_verify_is_never_written(self) -> None:
        # A receipt is verified the way `statespace receipt verify` verifies it before it is written. This check
        # rewrites its run's input after Z3 read it, so the receipt would name an input the run did not read: the
        # stage writes nothing, and says that the fault is in statespace.
        def rewrites_its_input(ctx: CheckContext) -> CheckResult:
            run = ctx.z3().run(ctx.statement("claims/starter.smt2", "smt2"), step="starter")
            ctx.path(run.input_path).write_bytes(b"(check-sat)\n")
            return CheckResult(True, "ok")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", rewrites_its_input),)),))
        outcome = run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE)
        problem = outcome.problem or ""
        self.assertIn("the receipt statespace built does not verify", problem)
        self.assertIn("is not the file this run read", problem)
        self.assertIn("fault in statespace", problem)
        self.assertIsNone(outcome.receipt_path)
        self.assertEqual(outcome.status, 3)
        self.assertFalse(any((self.root / "receipts" / "LAB-90.1").glob("*")), "no receipt and no orphan folder")

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_the_witness_is_read_after_what_the_starter_prints(self) -> None:
        # The verifier's case: LAB-90.c1 reads its witness from run.model, as README section 3 shows. The z3 command
        # prints its model after what the commands after the question print, and the first block after sat was read
        # as the model: on a correct starter that asks for values, the check failed and suspected the tool.
        from .support import STARTER

        for tail in ("(get-value (a b amount))", "(eval (- a amount))", "(get-info :version)\n(exit)", "(get-model)", ""):
            with self.subTest(tail):
                (self.root / "claims" / "starter.smt2").write_text(STARTER.rstrip() + "\n" + tail + "\n", encoding="utf-8")
                outcome = run_stage(TEST_LAB, TEST_LAB.stages[0], root=self.root, provenance=PROVENANCE)
                self.assertIsNone(outcome.problem)
                spec, result, _ = outcome.results[0]
                self.assertEqual((spec.id, result.passed, result.suspect), ("LAB-90.c1", True, None), result.message)
                assert outcome.receipt is not None and outcome.receipt_path is not None
                self.assertEqual(outcome.receipt["z3"]["verdict"], "sat")
                self.assertTrue(receipts.verify_file(outcome.receipt_path).ok)

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_a_statement_the_lane_cannot_read_mints_nothing(self) -> None:
        # The verifier's case: a guard.smt2 that echoes "unsat" and ends in a stray ) once passed LAB-90.c2,
        # minted CL-90.1, and gave a receipt whose z3 section said unsat. Now the check fails on your spec,
        # Z3 never runs it, and the receipt holds no claim.
        for doctored in ('(declare-const a Int)\n(assert (> a 0))\n(echo "unsat")\n(exit)\n)\n', '#| a | b |#\n(echo "unsat")\n| (check-sat)\n'):
            with self.subTest(doctored):
                (self.root / "claims" / "guard.smt2").write_text(doctored, encoding="utf-8")
                outcome = run_stage(TEST_LAB, TEST_LAB.stages[1], root=self.root, provenance=PROVENANCE, seed=11)
                self.assertIsNone(outcome.problem)
                spec, result, _ = outcome.results[0]
                self.assertEqual((spec.id, result.passed, result.suspect), ("LAB-90.c2", False, "spec"))
                self.assertIn("cannot be read as SMT-LIB", result.message)
                assert outcome.receipt is not None and outcome.receipt_path is not None
                self.assertEqual(outcome.receipt.get("claims", []), [], "no claim is minted")
                self.assertNotIn("z3", outcome.receipt)
                self.assertEqual(outcome.receipt.get("runs", []), [], "the refused statement never reached Z3")
                self.assertTrue(receipts.verify_file(outcome.receipt_path).ok)

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_statements_run_as_the_bytes_of_your_files(self) -> None:
        # README section 3's pattern: the guarded query through the z3 command, the premises through Z3's
        # Python API, each read from your files with ctx.statement. The verifier's lab read them with
        # Path.read_text and put the second premise after a NUL in a comment: the API read only up to the NUL,
        # so premises that contradict each other passed as premises with a model and CL-90.1 was minted.
        from .support import GUARD, PREMISES

        def guarded(ctx: CheckContext) -> CheckResult:
            guard = ctx.statement("claims/guard.smt2", "smt2")
            premises = ctx.statement("claims/premises.smt2", "smt2")
            z3 = ctx.z3()
            violation = z3.run(guard, step="violation", rlimit=5_000_000)
            held = z3.run(premises, step="premises", rlimit=5_000_000, entry="api")
            if violation.verdict in ("sat", "unsat", "unknown"):
                z3.headline(violation)
            ok = violation.verdict == "unsat" and held.verdict == "sat"
            if ok:
                ctx.claim("CL-90.1")
            return CheckResult(ok, f"violation {violation.verdict}, premises {held.verdict}", None if ok else "spec")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", guarded),), claims=("CL-90.1",)),))
        hidden_guard = GUARD.replace("(assert (<= amount a))", "; guard\r(assert (<= amount a))")
        contradiction = PREMISES.replace("(check-sat)", "; MAX_TRANSFER = 0 \x00\n(assert (<= amount 0))\n(check-sat)")
        # The verifier's next case: the premises contradict each other, the second assumed under a name with unsat
        # cores on. The z3 command answers unsat; the API read the named assumption as (=> under-max (<= amount 0)),
        # answered sat, and CL-90.1 was minted.
        named = (
            "(set-option :produce-unsat-cores true)\n(declare-const a Int)\n(declare-const amount Int)\n(define-fun MAX_TRANSFER () Int 0)\n"
            "(assert (> amount 0))\n(assert (<= amount a))\n(check-sat-assuming ((! (<= amount MAX_TRANSFER) :named under-max)))\n(get-unsat-core)\n"
        )
        for name, guard, premises, passes, message in (
            ("as written", GUARD.encode(), PREMISES.encode(), True, "violation unsat, premises sat"),
            ("a CRLF file", GUARD.replace("\n", "\r\n").encode(), PREMISES.replace("\n", "\r\n").encode(), True, "violation unsat, premises sat"),
            # Z3 ends a ; comment only at \n: this guard is part of the comment, so the violation is reachable.
            # Read with Path.read_text, the \r became \n and the check passed on a guard Z3 never sees.
            ("a guard after a bare CR in a comment", hidden_guard.encode(), PREMISES.encode(), False, "violation sat, premises sat"),
            ("a premise after a NUL", GUARD.encode(), contradiction.encode(), False, "NUL character"),
            ("a named assumption", GUARD.encode(), named.encode(), False, "holds the annotation (! (<= amount MAX_TRANSFER) :named under-max)"),
        ):
            with self.subTest(name):
                (self.root / "claims" / "guard.smt2").write_bytes(guard)
                (self.root / "claims" / "premises.smt2").write_bytes(premises)
                outcome = run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE, seed=11)
                self.assertIsNone(outcome.problem)
                result = outcome.results[0][1]
                self.assertEqual(result.passed, passes, result.message)
                self.assertIn(message, result.message)
                assert outcome.receipt is not None and outcome.receipt_path is not None
                self.assertEqual(outcome.receipt.get("claims", []), [{"template": "CL-90.1"}] if passes else [])
                self.assertTrue(receipts.verify_file(outcome.receipt_path).ok)
                # The run read the pinned file: its input hash is the statement's hash, and z3.smtlibSha256 names both.
                pinned = {s["path"]: s["sha256"] for s in outcome.receipt["statements"]}
                runs = {r["step"]: r for r in outcome.receipt["runs"]}
                self.assertEqual(runs["violation"]["inputSha256"], pinned["claims/guard.smt2"])
                if "premises" in runs:
                    self.assertEqual(runs["premises"]["inputSha256"], pinned["claims/premises.smt2"])
                    self.assertEqual(outcome.receipt["z3"]["smtlibSha256"], pinned["claims/guard.smt2"])
                else:
                    # The refused premise set never ran, and the check stopped before it named its headline run.
                    self.assertFalse(passes)
                    self.assertNotIn("z3", outcome.receipt)

    def test_text_reads_your_files_as_an_engine_does(self) -> None:
        ctx = CheckContext(root=self.root, lab=TEST_LAB, stage=TEST_LAB.stages[0], workdir=self.root / "w", seed=1)
        (self.root / "claims" / "crlf.smt2").write_bytes(b"(check-sat)\r\n; a\rb\r\n")
        self.assertEqual(ctx.text("claims/crlf.smt2"), "(check-sat)\r\n; a\rb\r\n", "no line-ending translation")
        self.assertEqual(ctx.statement("claims/crlf.smt2", "smt2"), "(check-sat)\r\n; a\rb\r\n")
        (self.root / "claims" / "latin1.smt2").write_bytes(b"; caf\xe9\n(check-sat)\n")
        with self.assertRaisesRegex(InputRefused, "claims/latin1.smt2 is not UTF-8 text \\(byte 5"):
            ctx.statement("claims/latin1.smt2", "smt2")
        with self.assertRaisesRegex(InputRefused, "not in your lab repository"):
            ctx.text("claims/missing.smt2")
        locked = self.root / "claims" / "locked.smt2"
        locked.write_bytes(b"(check-sat)\n")
        locked.chmod(0)
        try:
            if not os.access(locked, os.R_OK):  # a superuser reads it anyway
                with self.assertRaisesRegex(InputRefused, "claims/locked.smt2 could not be read"):
                    ctx.text("claims/locked.smt2")
        finally:
            locked.chmod(0o644)
        self.assertEqual([e["path"] for e in ctx.statement_entries(lambda p: "0" * 64)], ["claims/crlf.smt2"], "a statement that cannot be read is not pinned")

    def test_refused_input_fails_the_check_and_names_your_spec(self) -> None:
        def refused(ctx: CheckContext) -> CheckResult:
            raise InputRefused("your statement asks two questions")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", refused),)),))
        outcome = run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE)
        self.assertIsNone(outcome.problem)
        self.assertEqual(outcome.results[0][1], CheckResult(False, "your statement asks two questions", "spec"))
        assert outcome.receipt_path is not None
        self.assertTrue(receipts.verify_file(outcome.receipt_path).ok, "a receipt with no runs is still a receipt")

    def test_a_missing_statement_fails_the_check(self) -> None:
        def pins(ctx: CheckContext) -> CheckResult:
            ctx.statement("claims/missing.smt2", "smt2")
            return CheckResult(True, "ok")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", pins),)),))
        outcome = run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE)
        self.assertIsNone(outcome.problem)
        self.assertEqual(outcome.results[0][1], CheckResult(False, "the statement claims/missing.smt2 is not in your lab repository", "spec"))

    def test_a_claim_the_stage_does_not_mint_is_a_fault_in_the_check(self) -> None:
        def greedy(ctx: CheckContext) -> CheckResult:
            ctx.claim("CL-1.1")
            return CheckResult(True, "ok")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", greedy),)),))
        self.assertIn("fault in statespace", run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE).problem or "")

    def test_paths_stay_inside_the_repository(self) -> None:
        def escape(ctx: CheckContext) -> CheckResult:
            ctx.path("../outside")
            return CheckResult(True, "ok")

        lab = Lab("LAB-90", "x", (Stage("LAB-90.1", "x", (CheckSpec("LAB-90.c1", "x", escape),)),))
        self.assertIsNotNone(run_stage(lab, lab.stages[0], root=self.root, provenance=PROVENANCE).problem)


class Command(unittest.TestCase):
    """`statespace check` as a separate process. The test lab is registered by a small launcher, because a
    real lab is a module under statespace/labs/."""

    LAUNCH = (
        "import sys; from statespace.check import register; from statespace.check.tests.support import TEST_LAB; "
        "register(TEST_LAB); from statespace.cli import main; sys.exit(main(sys.argv[1:]))"
    )

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = make_repo(Path(self.tmp.name)).resolve()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def launch(self, *args: str, cwd: Path) -> tuple[int, str, str]:
        import os
        import subprocess
        import sys

        from .support import BENCH

        env = dict(os.environ)
        env["PYTHONPATH"] = str(BENCH)
        done = subprocess.run([sys.executable, "-c", self.LAUNCH, *args], cwd=cwd, env=env, capture_output=True, text=True, timeout=600)
        return done.returncode, done.stdout, done.stderr

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_a_whole_lab_from_a_subdirectory(self) -> None:
        sub = self.root / "labs" / "LAB-90"
        status, out, err = self.launch("check", "lab90", "--assisted", "none", "--agent", "no", cwd=sub)
        self.assertEqual(status, 1, out + err)  # LAB-90.c3 always fails
        self.assertIn("pass  LAB-90.c1", out)
        self.assertIn("FAIL  LAB-90.c3", out)
        self.assertIn("suspects: your implementation", out)
        self.assertIn("receipt  receipts/LAB-90.2/", out)
        self.assertNotIn("provenance:", out)
        self.assertEqual(len(list((self.root / "receipts").glob("LAB-90.*/*.json"))), 2)

    @unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
    def test_one_stage_as_json(self) -> None:
        status, out, err = self.launch("check", "lab90.1", "--json", cwd=self.root)
        self.assertEqual(status, 0, out + err)
        report = json.loads(out)
        self.assertEqual(report["stages"][0]["checks"][0]["passed"], True)
        self.assertTrue(report["stages"][0]["receipt"].startswith("receipts/LAB-90.1/"))
        self.assertEqual(len(report["notes"]), 1, "undeclared provenance is noted")
        receipt = json.loads((self.root / report["stages"][0]["receipt"]).read_text(encoding="utf-8"))
        self.assertEqual(receipt["provenance"], {"assisted": "code", "agent": True, "guard": "on"})

    def test_usage_errors(self) -> None:
        self.assertEqual(self.launch("check", "nonsense", cwd=self.root)[0], 2)
        status, _, err = self.launch("check", "lab90", "--root", str(self.root / "labs"), cwd=self.root)
        self.assertEqual(status, 2)
        self.assertIn("no labs/LAB-90/", err)
        status, _, err = self.launch("check", "lab90.9", cwd=self.root)
        self.assertEqual(status, 3)
        self.assertIn("no stage LAB-90.9", err)
        done = cli("check", "lab77", cwd=self.root)
        self.assertEqual(done.returncode, 3)
        self.assertIn("no checks for LAB-77", done.stderr)


if __name__ == "__main__":
    unittest.main()

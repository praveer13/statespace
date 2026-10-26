"""`statespace receipt verify` accepts fixture receipts and rejects tampered ones.

The fixture receipts are W0-S11's valid receipt@1 fixtures (schemas/fixtures/receipt/valid/) and the
receipts `statespace check` wrote into the fixture lab repository (fixtures/lab-repo/). Each tampering
below is one edit a person or an agent could make by hand after the CLI wrote the file."""

from __future__ import annotations

import copy
import json
import re
import shutil
import sys
import tempfile
import unittest
from collections.abc import Callable
from pathlib import Path
from typing import Any

from statespace import __version__
from statespace import receipt as receipts
from statespace.check import lanes, register, unregister

from .support import FIXTURES, RECEIPT_FIXTURES, TEST_LAB, cli

LAB_REPO = FIXTURES / "lab-repo"
VALID = sorted((RECEIPT_FIXTURES / "valid").glob("*.json"))
INVALID = json.loads((RECEIPT_FIXTURES / "invalid" / "index.json").read_text(encoding="utf-8"))


def fails(result: receipts.Verification) -> list[str]:
    return [f"{f.where} {f.message}" for f in result.findings if f.level == "fail"]


class Fixtures(unittest.TestCase):
    def setUp(self) -> None:
        register(TEST_LAB)

    def tearDown(self) -> None:
        unregister(TEST_LAB.id)

    def test_w0_valid_fixtures_are_accepted(self) -> None:
        self.assertEqual(len(VALID), 7)
        for path in VALID:
            with self.subTest(path.name):
                result = receipts.verify_file(path)
                self.assertTrue(result.ok, fails(result))
                with tempfile.TemporaryDirectory() as empty:
                    self.assertTrue(receipts.verify_file(path, root=Path(empty)).ok)

    def test_w0_invalid_fixtures_are_rejected_at_the_right_place(self) -> None:
        for item in INVALID:
            with self.subTest(item["file"]):
                result = receipts.verify_file(RECEIPT_FIXTURES / "invalid" / item["file"])
                self.assertFalse(result.ok)
                self.assertIn(item["instancePath"], [f.where for f in result.findings if f.level == "fail"])

    def test_receipts_statespace_check_wrote_are_accepted(self) -> None:
        paths = sorted((LAB_REPO / "receipts").glob("LAB-*/*.json"))
        self.assertEqual(len(paths), 2)
        for path in paths:
            with self.subTest(path.name):
                result = receipts.verify_file(path)  # the root is inferred from receipts/LAB-n.k/
                self.assertTrue(result.ok, fails(result))
                self.assertEqual(result.facts["integrity"], "matches")
                self.assertEqual(result.facts["verdictsRederived"], result.facts["runs"])
                self.assertEqual(result.facts["statementsRecomputed"], 1)
                self.assertFalse([f for f in result.findings if f.level == "note" and "/runs/" in f.where], "every input is on disk")

    def test_the_command_accepts_them_too(self) -> None:
        paths = [str(p) for p in VALID] + [str(p) for p in sorted((LAB_REPO / "receipts").glob("LAB-*/*.json"))]
        done = cli("receipt", "verify", *paths, cwd=LAB_REPO)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertEqual(done.stdout.count("\nverified: "), len(paths))


class Tampering(unittest.TestCase):
    """Each edit is made to a copy of the fixture lab repository."""

    def setUp(self) -> None:
        register(TEST_LAB)
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / "lab"
        shutil.copytree(LAB_REPO, self.root)
        self.path = next(iter(sorted((self.root / "receipts" / "LAB-90.2").glob("*.json"))))
        self.original: dict[str, Any] = json.loads(self.path.read_text(encoding="utf-8"))

    def tearDown(self) -> None:
        unregister(TEST_LAB.id)
        self.tmp.cleanup()

    def tampered(self, edit: Callable[[dict[str, Any]], None], *, reseal: bool = False) -> receipts.Verification:
        doc = copy.deepcopy(self.original)
        edit(doc)
        if reseal:  # a careful tamperer recomputes the digest, which anyone can
            doc = receipts.seal(doc)
        self.path.write_text(json.dumps(doc, indent=2), encoding="utf-8")
        return receipts.verify_file(self.path)

    def assert_rejected(self, result: receipts.Verification, where: str) -> None:
        self.assertFalse(result.ok)
        self.assertIn(where, [f.where for f in result.findings if f.level == "fail"], fails(result))

    def test_untouched_copy_is_accepted(self) -> None:
        self.assertTrue(receipts.verify_file(self.path).ok)

    def test_a_flipped_check_is_caught_by_the_digest(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["checks"][1]["pass"] = True

        self.assert_rejected(self.tampered(edit), "/ext/integrity")

    def test_a_flipped_verdict_is_caught_by_its_verdict_lines_even_when_resealed(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["runs"][0]["verdict"] = "sat"

        result = self.tampered(edit, reseal=True)
        self.assert_rejected(result, "/runs/0/verdict")
        self.assert_rejected(result, "/z3")

    def test_flipped_lines_and_verdict_still_disagree_with_the_input_and_the_z3_section(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["runs"][0]["verdict"] = "sat"
            d["runs"][0]["verdictLines"] = ["sat"]

        self.assert_rejected(self.tampered(edit, reseal=True), "/z3")

    def test_an_edited_statement_voids_its_claim(self) -> None:
        statement = self.root / "claims" / "guard.smt2"
        statement.write_text(statement.read_text(encoding="utf-8").replace("(<= amount a)", "(<= amount (+ a 1))"), encoding="utf-8")
        result = receipts.verify_file(self.path)
        self.assert_rejected(result, "/statements/0/sha256")
        self.assertIn("voids to [?]", " ".join(fails(result)))

    def test_trailing_white_space_does_not_change_a_statement(self) -> None:
        statement = self.root / "claims" / "guard.smt2"
        statement.write_text(statement.read_text(encoding="utf-8").rstrip() + "\r\n\t  \n\n", encoding="utf-8")
        self.assertTrue(receipts.verify_file(self.path).ok)

    def test_an_edited_statement_hash(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["statements"][0]["sha256"] = "0" * 64

        self.assert_rejected(self.tampered(edit, reseal=True), "/statements/0/sha256")

    def test_an_edited_run_input(self) -> None:
        source = self.root / self.original["runs"][0]["argv"][-1]
        source.write_text(source.read_text(encoding="utf-8").replace("(<= amount a)", "false"), encoding="utf-8")
        self.assert_rejected(receipts.verify_file(self.path), "/runs/0/inputSha256")

    def test_an_edited_budget(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["runs"][0]["budget"]["rlimit"] = 50
            d["z3"]["rlimit"] = 50

        self.assert_rejected(self.tampered(edit, reseal=True), "/runs/0/budget")

    def test_an_edited_z3_section(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["z3"]["verdict"] = "sat"

        self.assert_rejected(self.tampered(edit, reseal=True), "/z3")

        def reason(d: dict[str, Any]) -> None:
            d["z3"]["reason_unknown"] = "canceled"

        self.assert_rejected(self.tampered(reason, reseal=True), "/z3/reason_unknown")

        def other(d: dict[str, Any]) -> None:
            d["z3"]["smtlibSha256"] = d["statements"][0]["sha256"][::-1]

        self.assert_rejected(self.tampered(other, reseal=True), "/z3/smtlibSha256")

        def entry(d: dict[str, Any]) -> None:
            d["z3"]["entry"] = "api"  # the run it describes went through the z3 command

        result = self.tampered(entry, reseal=True)
        self.assert_rejected(result, "/z3/entry")
        self.assertIn("the z3 section says entry api, but the run it describes went through the z3 command", " ".join(fails(result)))

        def through_api(d: dict[str, Any]) -> None:
            premises = d["runs"][1]  # this run went through Z3's Python API
            d["z3"].update({"smtlibSha256": premises["inputSha256"], "verdict": premises["verdict"], "entry": "cli"})

        result = self.tampered(through_api, reseal=True)
        self.assert_rejected(result, "/z3/entry")
        self.assertIn("the z3 section says entry cli, but the run it describes went through Z3's Python API", " ".join(fails(result)))

        def unknown(reason: str) -> Callable[[dict[str, Any]], None]:
            def edit(d: dict[str, Any]) -> None:
                d["runs"][0].update({"verdictLines": ["unknown", '(:reason-unknown "canceled")'], "verdict": "unknown"})
                d["z3"].update({"verdict": "unknown", "reason_unknown": reason})

            return edit

        result = self.tampered(unknown("incomplete"), reseal=True)
        self.assert_rejected(result, "/z3/reason_unknown")
        self.assertIn("the reason differs from the reason line of the run it describes", " ".join(fails(result)))
        self.assertNotIn("/z3/reason_unknown", [f.where for f in self.tampered(unknown("canceled"), reseal=True).findings if f.level == "fail"])

        def unnamed(d: dict[str, Any]) -> None:
            d["z3"]["entry"] = "api"
            d["runs"][0]["argv"] = ["solver-of-another-tool", d["runs"][0]["argv"][-1]]

        # A command line that names neither entry cannot contradict the section: no entry finding.
        self.assertNotIn("/z3/entry", [f.where for f in self.tampered(unnamed, reseal=True).findings])

    def test_the_lane_cannot_claim_rechecked_here(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["lane"] = "re-checked here"

        self.assert_rejected(self.tampered(edit, reseal=True), "/lane")

    def test_a_typed_in_stamp_is_refused(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["stamp"] = "PROVED"

        self.assert_rejected(self.tampered(edit, reseal=True), "")

    def test_a_pinned_flag(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["tools"][0]["sha256"] = "1" * 64

        result = self.tampered(edit, reseal=True)
        if self.original["cli"]["version"] == __version__:
            self.assert_rejected(result, "/tools/0/pinned")
        else:  # another version's pins are not this one's to judge
            self.assertTrue(result.ok)

    def test_stage_check_and_claim_must_be_the_labs(self) -> None:
        def stage(d: dict[str, Any]) -> None:
            d["stage"] = "LAB-90.7"

        self.assert_rejected(self.tampered(stage, reseal=True), "/stage")

        def foreign(d: dict[str, Any]) -> None:
            d["stage"] = "LAB-1.2"

        self.assert_rejected(self.tampered(foreign, reseal=True), "/stage")

        def check(d: dict[str, Any]) -> None:
            d["checks"].append({"id": "LAB-90.c1", "pass": True})

        self.assert_rejected(self.tampered(check, reseal=True), "/checks/2/id")

        def twice(d: dict[str, Any]) -> None:
            d["checks"].append({"id": "LAB-90.c2", "pass": False})

        self.assert_rejected(self.tampered(twice, reseal=True), "/checks/2/id")

        def claim(d: dict[str, Any]) -> None:
            d["claims"].append({"template": "CL-1.1"})

        self.assert_rejected(self.tampered(claim, reseal=True), "/claims/1/template")

    def test_bytes_the_tab_would_read_differently(self) -> None:
        text = self.path.read_text(encoding="utf-8")
        cases = {
            "duplicate key": text.replace('"lane": "reported",', '"lane": "reported",\n  "lane": "self-assessed",', 1).encode(),
            "NaN": text.replace('"exitCode": 0', '"exitCode": NaN', 1).encode(),
            "byte order mark": b"\xef\xbb\xbf" + text.encode(),
            "not UTF-8": text.encode().replace(b"reported", b"report\xffd", 1),
            "not JSON": text.encode()[:-20],
            "larger than a receipt can be": text.encode() + b" " * receipts.MAX_BYTES,
        }
        for name, data in cases.items():
            with self.subTest(name):
                self.path.write_bytes(data)
                result = receipts.verify_file(self.path)
                self.assertFalse(result.ok)
                self.assertEqual(result.findings[0].where, "")

    def test_a_lane_that_cannot_load_rejects_the_receipt(self) -> None:
        # The planted fault: the Z3 lane cannot be imported, and the verdict was flipped and resealed. Before
        # this check the receipt verified, with a note that this CLI did not read z3's verdict lines yet.
        def edit(d: dict[str, Any]) -> None:
            d["runs"][0]["verdict"] = "sat"
            d["z3"]["verdict"] = "sat"

        saved = sys.modules.pop("statespace.lanes.z3", None)
        sys.modules["statespace.lanes.z3"] = None  # type: ignore[assignment]
        try:
            lanes.discover(refresh=True)
            self.assertIn("statespace.lanes.z3", lanes.broken())
            result = self.tampered(edit, reseal=True)
            self.assert_rejected(result, "/runs")
            self.assertIn("the statespace module statespace.lanes.z3 could not load", " ".join(fails(result)))
            # Learners read this message, and "lane" is a name that stays out of learner copy (content/glossary.yaml).
            words = re.sub(r"statespace(?:\.\w+)+", "", " ".join(fails(result)))
            self.assertIsNone(re.search(r"\blanes?\b", words), words)
            self.assertFalse([f for f in result.findings if "does not read" in f.message], "a broken lane is not a lane that is not written yet")
            self.assertFalse(receipts.verify_file(next(iter(sorted((LAB_REPO / "receipts" / "LAB-90.1").glob("*.json"))))).ok, "an untouched receipt is rejected too")
        finally:
            del sys.modules["statespace.lanes.z3"]
            if saved is not None:
                sys.modules["statespace.lanes.z3"] = saved
            lanes.discover(refresh=True)
        self.assertTrue(receipts.verify_file(next(iter(sorted((LAB_REPO / "receipts" / "LAB-90.1").glob("*.json"))))).ok)

    def test_the_command_rejects_with_exit_1_and_names_the_problem(self) -> None:
        def edit(d: dict[str, Any]) -> None:
            d["runs"][0]["verdict"] = "sat"

        self.tampered(edit)
        done = cli("receipt", "verify", str(self.path), cwd=self.root)
        self.assertEqual(done.returncode, 1)
        self.assertIn("REJECTED", done.stdout)
        self.assertIn("/runs/0/verdict", done.stdout)
        report = json.loads(cli("receipt", "verify", "--json", str(self.path), cwd=self.root).stdout)
        self.assertFalse(report[0]["verified"])
        self.assertEqual(cli("receipt", "verify", str(self.root / "missing.json"), cwd=self.root).returncode, 2)


class StaticFixtureTampering(unittest.TestCase):
    """Tampering of W0-S11's z3 fixture, which needs no files on disk."""

    def setUp(self) -> None:
        self.doc: dict[str, Any] = json.loads((RECEIPT_FIXTURES / "valid" / "z3-unsat-cross-checked.json").read_text(encoding="utf-8"))

    def check(self, edit: Callable[[dict[str, Any]], None]) -> receipts.Verification:
        doc = copy.deepcopy(self.doc)
        edit(doc)
        return receipts.verify(doc, root=None)

    def test_untouched(self) -> None:
        self.assertTrue(receipts.verify(self.doc, root=None).ok)

    def test_edits(self) -> None:
        def verdict(d: dict[str, Any]) -> None:
            d["runs"][0]["verdict"] = "sat"

        def lines(d: dict[str, Any]) -> None:
            d["runs"][0]["verdictLines"] = ["UNSAT"]

        def argv(d: dict[str, Any]) -> None:
            d["runs"][0]["budget"]["rlimit"] = 1

        def section(d: dict[str, Any]) -> None:
            d["z3"]["verdict"] = "unknown"

        for name, edit, where in (("verdict", verdict, "/runs/0/verdict"), ("lines", lines, "/runs/0/verdictLines"), ("argv", argv, "/runs/0/budget"), ("section", section, "/z3")):
            with self.subTest(name):
                result = self.check(edit)
                self.assertFalse(result.ok)
                self.assertIn(where, [f.where for f in result.findings if f.level == "fail"])

    def test_statement_on_disk_that_differs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "claims").mkdir()
            (Path(tmp) / "claims" / "guard.smt2").write_text("(check-sat)\n", encoding="utf-8")
            result = receipts.verify(self.doc, root=Path(tmp))
            self.assertFalse(result.ok)
            self.assertIn("/statements/0/sha256", [f.where for f in result.findings if f.level == "fail"])


class Integrity(unittest.TestCase):
    def test_digest_is_stable_and_covers_everything_but_itself(self) -> None:
        doc = json.loads((RECEIPT_FIXTURES / "valid" / "self-assessed-minimal.json").read_text(encoding="utf-8"))
        sealed = receipts.seal(doc)
        self.assertEqual(sealed["ext"]["integrity"]["scheme"], receipts.INTEGRITY_SCHEME)
        self.assertEqual(receipts.integrity_digest(sealed), receipts.integrity_digest(doc))
        self.assertEqual(receipts.seal(sealed), sealed)
        self.assertEqual(list(sealed)[-1], "ext")
        moved = json.loads(json.dumps(sealed, sort_keys=True))  # key order does not matter
        self.assertTrue(receipts.verify(moved, root=None).ok)
        doc["checks"][0]["pass"] = True
        self.assertNotEqual(receipts.integrity_digest(doc), sealed["ext"]["integrity"]["sha256"])

    def test_canonical_json_escapes_non_ascii(self) -> None:
        self.assertEqual(receipts.canonical_json({"b": "é", "a": [1, True, None]}), b'{"a":[1,true,null],"b":"\\u00e9"}')


if __name__ == "__main__":
    unittest.main()

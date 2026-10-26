"""`statespace export`: the lab bundle carries claims, statement texts with their hashes, specimens and
receipts, and leaves out what it cannot carry as text."""

from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from statespace.check.export import collect, find_root
from statespace.schema import SCHEMA_NAMES, validate
from statespace.schema.statement_hash import statement_hash_file

from .support import FIXTURES, cli


class Bundle(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / "lab"
        shutil.copytree(FIXTURES / "lab-repo", self.root)
        (self.root / "claims" / "guard.yaml").write_text("schema: statespace/claim@1\nid: guard\n", encoding="utf-8")
        (self.root / "specimens").mkdir()
        (self.root / "specimens" / "sp-1.yaml").write_text("witness: {a: 0, amount: 1}\n", encoding="utf-8")
        (self.root / "specimens" / "blob.bin").write_bytes(b"\xff\xfe\x00")
        (self.root / "labs" / "LAB-90" / "challenge").mkdir()
        (self.root / "labs" / "LAB-90" / "challenge" / "Challenge.lean").write_text("theorem t : True := trivial\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_what_the_bundle_holds(self) -> None:
        bundle, notes = collect(self.root)
        self.assertEqual(bundle["schema"], "statespace/labbundle@1")
        self.assertEqual([c["path"] for c in bundle["claims"]], ["claims/guard.yaml"])
        statements = {s["path"]: s for s in bundle["statements"]}
        self.assertEqual(set(statements), {"claims/guard.smt2", "claims/starter.smt2", "labs/LAB-90/challenge/Challenge.lean"})
        for path, entry in statements.items():
            self.assertEqual(entry["sha256"], statement_hash_file(self.root / path))
        self.assertEqual(statements["labs/LAB-90/challenge/Challenge.lean"]["kind"], "lean-challenge")
        self.assertEqual([s["path"] for s in bundle["specimens"]], ["specimens/sp-1.yaml"])
        self.assertIn("specimens/blob.bin is not UTF-8, so it is left out", notes)
        self.assertEqual(len(bundle["receipts"]), 2)
        receipt = bundle["receipts"][0]["receipt"]
        self.assertEqual(receipt["schema"], "statespace/receipt@1")
        self.assertIsNone(bundle["commit"], "a scratch copy is not a git repository")
        if "labbundle" in SCHEMA_NAMES:
            self.assertEqual(validate("labbundle", bundle), [])

    def test_the_command(self) -> None:
        sub = self.root / "claims"
        self.assertEqual(find_root(sub), self.root.resolve())
        done = cli("export", "--out", str(self.root.parent / "bundle.json"), cwd=sub)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("2 receipts", done.stdout)
        written = json.loads((self.root.parent / "bundle.json").read_text(encoding="utf-8"))
        self.assertEqual(len(written["statements"]), 3)
        piped = cli("export", "--out", "-", cwd=self.root)
        self.assertEqual(json.loads(piped.stdout)["schema"], "statespace/labbundle@1")
        with tempfile.TemporaryDirectory() as nowhere:
            self.assertEqual(cli("export", cwd=Path(nowhere)).returncode, 2)


if __name__ == "__main__":
    unittest.main()

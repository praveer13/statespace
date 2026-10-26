"""`statespace hash` against the shared statement-hash vectors (schemas/vectors/statement-hash.json),
whose expected values come from the TypeScript side's oracle (the engine's own trimEnd and node:crypto)
and which GATE-schema runs through both implementations."""

from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from statespace import hash as hash_command

from .support import REPO, cli

VECTORS = json.loads((REPO / "schemas" / "vectors" / "statement-hash.json").read_text(encoding="utf-8"))
BYTE_VECTORS = [v for v in VECTORS["vectors"] if "bytesHex" in v]


class SharedVectors(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def write_vectors(self) -> list[tuple[dict[str, str], Path]]:
        files: list[tuple[dict[str, str], Path]] = []
        for index, vector in enumerate(BYTE_VECTORS):
            path = self.dir / f"v{index:03d}.txt"
            path.write_bytes(bytes.fromhex(vector["bytesHex"]))
            files.append((vector, path))
        return files

    def test_every_vector_through_the_command(self) -> None:
        """The real `statespace hash` process, run once over a file per vector."""
        self.assertGreater(len(BYTE_VECTORS), 80)
        files = self.write_vectors()
        done = cli("hash", "--json", *(p.name for _, p in files), cwd=self.dir)
        rows = [json.loads(line) for line in done.stdout.splitlines()]
        self.assertEqual(len(rows), len(files))
        errors = 0
        for (vector, path), row in zip(files, rows):
            with self.subTest(vector["id"]):
                self.assertEqual(row["file"], path.name)
                self.assertEqual(row["scheme"], "statement-hash@1")
                if "error" in vector:
                    errors += 1
                    self.assertEqual(row.get("error"), vector["error"])
                else:
                    self.assertEqual(row.get("sha256"), vector["sha256"])
        self.assertGreater(errors, 0)
        self.assertEqual(done.returncode, 1, "a file that cannot be hashed makes the exit status 1")

    def test_plain_output_is_sha256sum_shaped(self) -> None:
        vector = next(v for v in BYTE_VECTORS if v["id"] == "empty")
        path = self.dir / "empty.smt2"
        path.write_bytes(b"")
        out = io.StringIO()
        with redirect_stdout(out):
            status = hash_command.main([str(path)])
        self.assertEqual(status, 0)
        self.assertEqual(out.getvalue(), f"{vector['sha256']}  {path}\n")

    def test_standard_input(self) -> None:
        text = "(assert (> a 0))\r\n\t \n"
        expected = next((v["sha256"] for v in VECTORS["vectors"] if v.get("text") == text), None)
        done = cli("hash", "-", cwd=self.dir, stdin=text.encode("utf-8"))
        self.assertEqual(done.returncode, 0, done.stderr)
        digest = done.stdout.split()[0]
        self.assertEqual(len(digest), 64)
        if expected is not None:
            self.assertEqual(digest, expected)
        file = self.dir / "same.smt2"
        file.write_text("(assert (> a 0))\n", encoding="utf-8")
        self.assertEqual(cli("hash", str(file), cwd=self.dir).stdout.split()[0], digest, "trailing white space and line ends do not change the hash")

    def test_missing_files_and_directories_are_errors(self) -> None:
        err = io.StringIO()
        with redirect_stderr(err), redirect_stdout(io.StringIO()):
            status = hash_command.main([str(self.dir / "nope.smt2"), str(self.dir)])
        self.assertEqual(status, 1)
        self.assertIn("nope.smt2", err.getvalue())
        self.assertIn("is a directory", err.getvalue())


if __name__ == "__main__":
    unittest.main()

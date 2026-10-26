"""The `statespace` command table: every command is reachable and documents itself."""

from __future__ import annotations

import importlib
import tempfile
import unittest
from pathlib import Path

from statespace import __main__ as entry
from statespace import cli as table

from .support import cli


class Dispatcher(unittest.TestCase):
    def test_the_entry_point_is_the_table(self) -> None:
        self.assertIs(entry.main, table.main)
        self.assertEqual(set(table.COMMANDS), {"doctor", "check", "receipt", "hash", "run", "export"})
        for name, (module, _what) in table.COMMANDS.items():
            with self.subTest(name):
                self.assertTrue(callable(getattr(importlib.import_module(module), "main", None)))

    def test_help_version_and_unknown(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            here = Path(tmp)
            done = cli("--help", cwd=here)
            self.assertEqual(done.returncode, 0)
            for name in table.COMMANDS:
                self.assertIn(f"  {name}", done.stdout)
            self.assertEqual(cli(cwd=here).returncode, 2)
            self.assertTrue(cli("--version", cwd=here).stdout.startswith("statespace "))
            unknown = cli("nonesuch", cwd=here)
            self.assertEqual(unknown.returncode, 2)
            self.assertIn("unknown command", unknown.stderr)
            for args in (("check", "--help"), ("receipt", "verify", "--help"), ("hash", "--help"), ("run", "--help"), ("export", "--help"), ("doctor", "--help")):
                with self.subTest(args):
                    done = cli(*args, cwd=here)
                    self.assertEqual(done.returncode, 0, done.stderr)
                    self.assertIn("usage: statespace", done.stdout)
            self.assertEqual(cli("receipt", cwd=here).returncode, 2)

    def test_nothing_heavy_loads_with_the_table(self) -> None:
        import subprocess
        import sys

        from .support import BENCH

        probe = "import sys, statespace.cli, statespace.hash, statespace.check, statespace.receipt; print(sorted(m for m in ('z3', 'jsonschema', 'yaml', 'psycopg') if m in sys.modules))"
        done = subprocess.run([sys.executable, "-P", "-s", "-c", probe], capture_output=True, text=True, env={"PYTHONPATH": str(BENCH)})
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(done.stdout.strip(), "[]")


if __name__ == "__main__":
    unittest.main()

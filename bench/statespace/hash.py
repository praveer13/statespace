"""`statespace hash <file>...`: the comparator-style statement hash (statement-hash@1).

SHA-256 over the file's text with trailing whitespace removed plus one newline, the rule of Comparator
Live's challenge hash, `sha256(challenge.trimRight() + "\\n")` (spine section 9.4; labs/README.md
section 9.1). The rule is written once, as `x-statementHash` in schemas/defs.schema.json; this command
is a thin layer over `statespace.schema.statement_hash`, which GATE-schema runs on the shared vectors
(schemas/vectors/statement-hash.json) beside the TypeScript implementation.

The file is read as bytes and decoded as strict UTF-8, so line endings are never translated and a file
that is not UTF-8 is an error, never a hash of replacement characters. `-` reads standard input.

Output, one line per file as `sha256sum` prints it: `<64 hex digits>  <file>`. Exit status: 0 every file
hashed, 1 one could not be (missing, unreadable or not UTF-8), 2 a usage error.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from .schema.statement_hash import STATEMENT_HASH_SPEC_ID, StatementHashError, statement_hash_bytes

__all__ = ["hash_file", "main"]

REASONS = {
    "invalid-utf8": "not valid UTF-8, which the statement hash refuses rather than guessing",
    "ill-formed-text": "holds a lone surrogate, which the statement hash refuses",
}


def hash_file(name: str) -> str:
    """The statement hash of a file, or of standard input for `-`. Raises OSError or StatementHashError."""
    data = sys.stdin.buffer.read() if name == "-" else Path(name).read_bytes()
    return statement_hash_bytes(data)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="statespace hash",
        description=f"Print the comparator-style statement hash ({STATEMENT_HASH_SPEC_ID}) of each file: SHA-256 over the text with trailing whitespace removed plus one newline.",
    )
    parser.add_argument("files", nargs="+", metavar="FILE", help="a statement file; - reads standard input")
    parser.add_argument("--json", action="store_true", help="print one JSON object per file")
    args = parser.parse_args(list(argv) if argv is not None else None)
    status = 0
    rows: list[dict[str, Any]] = []
    for name in args.files:
        try:
            digest = hash_file(name)
        except StatementHashError as error:
            status = 1
            rows.append({"file": name, "error": error.code})
            sys.stderr.write(f"statespace hash: {name}: {REASONS.get(error.code, error.code)} ({error.code})\n")
            continue
        except IsADirectoryError:
            status = 1
            rows.append({"file": name, "error": "is-a-directory"})
            sys.stderr.write(f"statespace hash: {name}: is a directory\n")
            continue
        except OSError as error:
            status = 1
            rows.append({"file": name, "error": "unreadable"})
            sys.stderr.write(f"statespace hash: {name}: {error.strerror or error}\n")
            continue
        rows.append({"file": name, "sha256": digest})
        if not args.json:
            sys.stdout.write(f"{digest}  {name}\n")
    if args.json:
        for row in rows:
            sys.stdout.write(json.dumps({"scheme": STATEMENT_HASH_SPEC_ID, **row}, ensure_ascii=False) + "\n")
    return status

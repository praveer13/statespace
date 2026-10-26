"""`statespace export`: write the lab bundle (labbundle@1) that the tab imports into its read-only mirror.

ARCHITECTURE.md section 8.3: the bundle holds the claim files, the statement texts with their hashes,
the specimens, the receipts and the repository's commit hash. The learner imports it on the Bench page
as a file; the instrument origin parses and validates it and recomputes each statement's hash from the
bundled text (W1-T14 imports it and publishes schemas/labbundle.schema.json). The report export
(report@1) is W5-T06's.

What it collects, from the lab repository:

* claims: `claims/*.yaml` (claim@1 cards), as text;
* statements: `claims/*.smt2`, `claims/*.tla`, `claims/*.sql`, each lab's `labs/LAB-*/challenge/*.lean`,
  and every statement a receipt pins, as text with the statement hash (statement-hash@1);
* specimens: every file under `specimens/`, as text;
* receipts: every `receipts/LAB-*/*.json`, parsed.

A file that is not UTF-8 cannot be carried as text, and is left out with a note. The bundle is
validated against labbundle@1 when this CLI's schema package holds it.

Exit status: 0 written; 2 a usage error (no lab repository); 3 the bundle does not validate.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from .lanes import as_list, as_map

__all__ = ["SCHEMA_TAG", "collect", "find_root", "main"]

SCHEMA_TAG = "statespace/labbundle@1"
STATEMENT_SUFFIXES = {".smt2": "smt2", ".tla": "tla", ".sql": "sql", ".lean": "lean-challenge", ".yaml": "yaml", ".yml": "yaml"}
_STAGE_DIR = re.compile(r"LAB-[0-9]+\.[0-9]+")
_LAB_DIR = re.compile(r"LAB-[0-9]+")


def find_root(start: Path) -> Path | None:
    """The lab repository: the nearest directory upward that holds claims/ or receipts/."""
    here = start.resolve()
    for candidate in (here, *here.parents):
        if (candidate / "claims").is_dir() or (candidate / "receipts").is_dir():
            return candidate
    return None


def _commit(root: Path) -> str | None:
    try:
        done = subprocess.run(["git", "rev-parse", "--verify", "HEAD"], cwd=root, capture_output=True, text=True, timeout=30, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired):
        return None
    sha = done.stdout.strip()
    return sha if done.returncode == 0 and re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", sha) else None


def _relative(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def collect(root: Path) -> tuple[dict[str, Any], list[str]]:
    """The bundle of the lab repository at `root`, and a note for each file left out."""
    from statespace import __version__
    from statespace.receipt import ReceiptReadError, load_json, now_instant
    from statespace.schema.statement_hash import StatementHashError, statement_hash_text

    notes: list[str] = []

    def text_of(path: Path) -> str | None:
        try:
            return path.read_bytes().decode("utf-8")
        except UnicodeDecodeError:
            notes.append(f"{_relative(root, path)} is not UTF-8, so it is left out")
        except OSError as error:
            notes.append(f"{_relative(root, path)} could not be read ({error.strerror or error}), so it is left out")
        return None

    claims: list[dict[str, Any]] = []
    statements: dict[str, dict[str, Any]] = {}
    specimens: list[dict[str, Any]] = []
    receipts: list[dict[str, Any]] = []

    def add_statement(path: Path, kind: str) -> None:
        relative = _relative(root, path)
        if relative in statements or not path.is_file():
            return
        text = text_of(path)
        if text is None:
            return
        try:
            digest = statement_hash_text(text)
        except StatementHashError as error:
            notes.append(f"{relative} cannot be hashed ({error.code}), so it is left out")
            return
        statements[relative] = {"path": relative, "kind": kind, "sha256": digest, "text": text}

    claims_dir = root / "claims"
    if claims_dir.is_dir():
        for path in sorted(p for p in claims_dir.iterdir() if p.is_file()):
            if path.suffix in (".yaml", ".yml"):
                text = text_of(path)
                if text is not None:
                    claims.append({"path": _relative(root, path), "text": text})
            elif path.suffix in (".smt2", ".tla", ".sql"):
                add_statement(path, STATEMENT_SUFFIXES[path.suffix])
    labs_dir = root / "labs"
    if labs_dir.is_dir():
        for lab in sorted(p for p in labs_dir.iterdir() if p.is_dir() and _LAB_DIR.fullmatch(p.name)):
            for path in sorted((lab / "challenge").glob("*.lean")):
                add_statement(path, "lean-challenge")
    specimens_dir = root / "specimens"
    if specimens_dir.is_dir():
        for path in sorted(p for p in specimens_dir.rglob("*") if p.is_file() and not p.name.startswith(".")):
            text = text_of(path)
            if text is not None:
                specimens.append({"path": _relative(root, path), "text": text})
    receipts_dir = root / "receipts"
    if receipts_dir.is_dir():
        for stage in sorted(p for p in receipts_dir.iterdir() if p.is_dir() and _STAGE_DIR.fullmatch(p.name)):
            for path in sorted(stage.glob("*.json")):
                try:
                    receipt = load_json(path.read_bytes())
                except (ReceiptReadError, OSError) as error:
                    notes.append(f"{_relative(root, path)} is not a readable receipt ({error}), so it is left out")
                    continue
                receipts.append({"path": _relative(root, path), "receipt": receipt})
                document = as_map(receipt) or {}
                for item in as_list(document.get("statements")):
                    entry = as_map(item) or {}
                    where, kind = entry.get("path"), entry.get("kind")
                    if isinstance(where, str) and isinstance(kind, str):
                        candidate = (root / where).resolve()
                        if root.resolve() in candidate.parents:
                            add_statement(candidate, kind)
    bundle: dict[str, Any] = {
        "schema": SCHEMA_TAG,
        "createdAt": now_instant(),
        "cli": {"name": "statespace", "version": __version__},
        "commit": _commit(root),
        "claims": claims,
        "statements": [statements[k] for k in sorted(statements)],
        "specimens": specimens,
        "receipts": receipts,
    }
    return bundle, notes


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="statespace export",
        description="Write the lab bundle (labbundle@1): claims, statement texts with their hashes, specimens and receipts, for the tab to import. "
        "Exit status: 0 written, 2 a usage error, 3 the bundle does not validate.",
    )
    parser.add_argument("--root", type=Path, default=None, help="the lab repository; default: the nearest directory upward with claims/ or receipts/")
    parser.add_argument("--out", default="labbundle.json", help="the file to write (default labbundle.json); - writes to standard output")
    args = parser.parse_args(list(argv) if argv is not None else None)
    root = args.root.resolve() if args.root is not None else find_root(Path.cwd())
    if root is None or not root.is_dir():
        sys.stderr.write("statespace export: no claims/ or receipts/ here or above; run it from your lab repository, or pass --root\n")
        return 2
    bundle, notes = collect(root)
    from statespace.schema import SCHEMA_NAMES, validate

    if "labbundle" in SCHEMA_NAMES:
        issues = validate("labbundle", bundle)
        if issues:
            for issue in issues[:10]:
                sys.stderr.write(f"statespace export: labbundle@1 {issue['instancePath'] or '/'} {issue['keyword']}: {issue['message']}\n")
            return 3
    else:
        notes.append("labbundle@1 is not in this CLI's schema package yet, so the bundle was not validated (the tab validates it on import)")
    text = json.dumps(bundle, indent=2, ensure_ascii=False) + "\n"
    if args.out == "-":
        sys.stdout.write(text)
    else:
        out = Path(args.out)
        out.write_text(text, encoding="utf-8")
        counts = f"{len(bundle['claims'])} claims, {len(bundle['statements'])} statements, {len(bundle['specimens'])} specimen files, {len(bundle['receipts'])} receipts"
        sys.stdout.write(f"wrote {out} ({counts}); import it on the Bench page\n")
    for note in notes:
        sys.stderr.write(f"note: {note}\n")
    return 0

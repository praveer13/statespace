"""Receipts (receipt@1): writing one, and `statespace receipt verify <file>`.

Spine section 9.4; ARCHITECTURE.md sections 10 and 11.3; labs/README.md section 8.

`statespace receipt verify` validates a receipt against receipt@1 and recomputes its statement hashes,
as the spine words it, and checks what else a file can show about itself, in the order the tab's
importer uses (ARCHITECTURE.md section 10.3):

1. the bytes: UTF-8 JSON, with no duplicate key and no NaN or Infinity, which the tab's parser refuses;
2. the schema, receipt@1;
3. consistency: the stage and every check belong to the lab, no check is listed twice, and where this
   CLI knows the lab, the stage, its checks and its claim templates are the lab's;
4. every run's verdict, re-derived from its verdict lines by the lane that reads its engine; a stored
   verdict that its lines do not carry rejects the receipt, and an exit code is never read. A lane module
   that cannot load rejects every receipt, since it might be the lane of these runs;
5. each lane's own section, such as the z3 block against the runs it describes;
6. every statement hash, recomputed from the file in the lab repository (statement-hash@1): a statement
   that changed after the receipt voids its claim to [?];
7. the tools' `pinned` flags, against this CLI's pins, when this version of the CLI wrote the receipt;
8. the integrity digest that `statespace check` writes into `ext.integrity`.

A receipt is not signed. The integrity digest is a checksum that anyone can recompute, so it catches an
edit made after the CLI wrote the file without recomputing it, and nothing more: a receipt records what
was reported, never that it ran (labs/README.md section 8).
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import importlib
import json
import os
import re
import sys
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import __version__
from .check.lanes import Finding, as_map

__all__ = [
    "INTEGRITY_SCHEME",
    "ReceiptReadError",
    "Verification",
    "assemble",
    "canonical_json",
    "integrity_digest",
    "load_json",
    "main",
    "now_instant",
    "seal",
    "verify",
    "verify_file",
    "write_receipt",
]

SCHEMA_TAG = "statespace/receipt@1"
INTEGRITY_SCHEME = "statespace-receipt-integrity@1"
MAX_BYTES = 16 * 1024 * 1024  # a receipt is a few kilobytes; a larger file is refused unread [D]
FIELD_ORDER = (
    "schema", "lab", "stage", "lane", "createdAt", "cli", "environment", "tools", "statements", "runs",
    "lean", "goldens", "tlc", "z3", "pg", "traces", "datalog", "pairs", "checks", "provenance", "claims", "tcb",
    "attestation", "ext",
)  # receipt@1's own order, so a receipt reads in the order the schema documents it
LANE_WORDS = {"reported": "reported from your machine", "self-assessed": "self-assessed"}
STAGE_DIR = re.compile(r"LAB-[0-9]+\.[0-9]+")
# A receipt tool name, and the `statespace doctor` pins its hash may equal (doctor.PINS).
TOOL_PINS: dict[str, tuple[str, ...]] = {
    "lean": ("lean",), "lake": ("lake",), "elan": ("elan",), "java": ("java",), "tlc": ("tlc-1.8.0", "tlc-1.7.4"),
    "z3": ("z3",), "z3-cli": ("z3-cli",), "cvc5": ("cvc5",), "souffle": ("souffle",), "rustc": ("rustc",),
    "cargo": ("cargo",), "uv": ("uv",),
}


class ReceiptReadError(ValueError):
    """The bytes are not a JSON document the tab would read the same way."""


# ------------------------------------------------------------------------------------------ JSON
def _no_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise ReceiptReadError(f"the key {key!r} appears twice in one object; JSON readers disagree on which one counts")
        out[key] = value
    return out


def _no_constant(name: str) -> Any:
    raise ReceiptReadError(f"{name} is not JSON")


def load_json(data: bytes) -> Any:
    """Parse JSON as strictly as the tab does: UTF-8 without a byte order mark, no duplicate keys, no
    NaN or Infinity (Python's own parser accepts both)."""
    if len(data) > MAX_BYTES:
        raise ReceiptReadError(f"the file is {len(data)} bytes, more than a receipt can be ({MAX_BYTES})")
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ReceiptReadError(f"the file is not UTF-8 (byte {error.start})") from error
    if text.startswith("\ufeff"):
        raise ReceiptReadError("the file starts with a byte order mark, which JSON does not allow")
    try:
        return json.loads(text, object_pairs_hook=_no_duplicates, parse_constant=_no_constant)
    except json.JSONDecodeError as error:
        raise ReceiptReadError(f"not JSON: {error.msg} at line {error.lineno}, column {error.colno}") from error


def canonical_json(value: Any) -> bytes:
    """The bytes the integrity digest is taken over: keys sorted by code point, no white space, every
    non-ASCII character escaped as \\uXXXX (lowercase hexadecimal), integers in decimal."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode("ascii")


def _without_integrity(receipt: Mapping[str, Any]) -> dict[str, Any]:
    body = copy.deepcopy(dict(receipt))
    ext = body.get("ext")
    if isinstance(ext, dict):
        ext.pop("integrity", None)  # pyright: ignore[reportUnknownMemberType]
        if not ext:
            del body["ext"]
    return body


def integrity_digest(receipt: Mapping[str, Any]) -> str:
    """statespace-receipt-integrity@1: SHA-256 of the canonical JSON of the receipt without
    ext.integrity (and without ext, when nothing else is in it)."""
    return hashlib.sha256(canonical_json(_without_integrity(receipt))).hexdigest()


def seal(receipt: Mapping[str, Any]) -> dict[str, Any]:
    """A copy of `receipt` with its integrity digest in ext.integrity."""
    sealed = _without_integrity(receipt)
    digest = integrity_digest(sealed)
    ext: dict[str, Any] = dict(sealed.get("ext") or {})
    ext["integrity"] = {"scheme": INTEGRITY_SCHEME, "sha256": digest}
    sealed["ext"] = ext
    return _ordered(sealed)


def _ordered(receipt: Mapping[str, Any]) -> dict[str, Any]:
    known = {key: receipt[key] for key in FIELD_ORDER if key in receipt}
    known.update({key: value for key, value in receipt.items() if key not in known})
    return known


# --------------------------------------------------------------------------------------- writing
def now_instant() -> str:
    """The current UTC time as receipt@1's instant, to the second."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def assemble(
    *,
    lab: str,
    stage: str,
    lane: str,
    environment: Mapping[str, Any],
    tools: Sequence[Mapping[str, Any]],
    statements: Sequence[Mapping[str, Any]],
    runs: Sequence[Mapping[str, Any]],
    checks: Sequence[Mapping[str, Any]],
    provenance: Mapping[str, Any],
    claims: Sequence[Mapping[str, Any]] = (),
    tcb: Sequence[Mapping[str, Any]] = (),
    sections: Mapping[str, Any] | None = None,
    ext: Mapping[str, Any] | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    """A receipt@1 from its parts, in the schema's order. `sections` holds the engine blocks (z3, lean,
    tlc, ...), each written by its lane."""
    receipt: dict[str, Any] = {
        "schema": SCHEMA_TAG,
        "lab": lab,
        "stage": stage,
        "lane": lane,
        "createdAt": created_at or now_instant(),
        "cli": {"name": "statespace", "version": __version__},
        "environment": dict(environment),
        "tools": [dict(t) for t in tools],
        "statements": [dict(s) for s in statements],
        "runs": [dict(r) for r in runs],
        "checks": [dict(c) for c in checks],
        "provenance": dict(provenance),
    }
    for name, section in (sections or {}).items():
        if section is not None:
            receipt[name] = section
    if claims:
        receipt["claims"] = [dict(c) for c in claims]
    if tcb:
        receipt["tcb"] = [dict(t) for t in tcb]
    if ext:
        receipt["ext"] = dict(ext)
    return _ordered(receipt)


def dumps(receipt: Mapping[str, Any]) -> str:
    return json.dumps(receipt, indent=2, ensure_ascii=False) + "\n"


def write_receipt(receipt: Mapping[str, Any], path: Path) -> None:
    """Write atomically: the file appears whole or not at all."""
    path.parent.mkdir(parents=True, exist_ok=True)
    partial = path.with_name(f".{path.name}.partial")
    partial.write_text(dumps(receipt), encoding="utf-8")
    os.replace(partial, path)


# ------------------------------------------------------------------------------------ verification
@dataclass
class Verification:
    """What `receipt verify` found. The receipt is verified when no finding is a failure."""

    source: str
    findings: list[Finding] = field(default_factory=list[Finding])
    facts: dict[str, Any] = field(default_factory=dict[str, Any])

    @property
    def ok(self) -> bool:
        return not any(f.level == "fail" for f in self.findings)

    def fail(self, where: str, message: str) -> None:
        self.findings.append(Finding("fail", where, message))

    def note(self, where: str, message: str) -> None:
        self.findings.append(Finding("note", where, message))

    def as_json(self) -> dict[str, Any]:
        return {
            "file": self.source,
            "verified": self.ok,
            "facts": self.facts,
            "findings": [{"level": f.level, "where": f.where, "message": f.message} for f in self.findings],
        }


def _inside(root: Path, relative: str) -> Path | None:
    base = root.resolve()
    candidate = (base / relative).resolve()
    return candidate if candidate == base or base in candidate.parents else None


def _lab_definition(lab: str) -> Any:
    from .check import labs

    try:
        return labs.find_lab(lab)
    except labs.LabUnavailable:
        return None


def _check_structure(receipt: Mapping[str, Any], result: Verification) -> None:
    lab, stage = str(receipt["lab"]), str(receipt["stage"])
    if not stage.startswith(lab + "."):
        result.fail("/stage", f"the stage {stage} does not belong to the lab {lab}")
    seen: set[str] = set()
    for index, check in enumerate(receipt["checks"]):
        check_id = str(check["id"])
        if not check_id.startswith(lab + ".c"):
            result.fail(f"/checks/{index}/id", f"the check {check_id} does not belong to the lab {lab}")
        if check_id in seen:
            result.fail(f"/checks/{index}/id", f"the check {check_id} is listed twice")
        seen.add(check_id)
    claims: list[Any] = list(receipt.get("claims") or [])
    if len({json.dumps(c, sort_keys=True) for c in claims}) != len(claims):
        result.note("/claims", "a claim is listed twice")
    try:
        definition = _lab_definition(lab)
    except Exception as error:  # noqa: BLE001 - a broken lab module is reported, not raised
        result.note("/lab", f"this CLI's definition of {lab} could not load ({type(error).__name__}: {error}), so the stage was not compared with it")
        return
    if definition is None:
        result.note("/lab", f"this CLI holds no checks for {lab}, so the stage was not compared with the lab's own list")
        return
    known = {s.id: s for s in definition.stages}
    if stage not in known:
        result.fail("/stage", f"{lab} has no stage {stage} in this CLI")
        return
    spec = known[stage]
    ids = {c.id for c in spec.checks}
    for index, check in enumerate(receipt["checks"]):
        if check["id"] not in ids:
            result.fail(f"/checks/{index}/id", f"{check['id']} is not a check of {stage}")
    missing = sorted(ids - seen)
    if missing:
        result.note("/checks", f"the receipt does not report {', '.join(missing)}, which {stage} also runs")
    if spec.claims:
        for index, claim in enumerate(claims):
            template = (as_map(claim) or {}).get("template")
            if template is not None and template not in spec.claims:
                result.fail(f"/claims/{index}/template", f"{stage} does not mint {template}")


def _check_runs(receipt: Mapping[str, Any], root: Path | None, result: Verification) -> None:
    from .check import lanes

    broken = lanes.broken_reason()
    if broken is not None:
        # Fail closed: a lane that cannot load might be the one that reads these runs or checks a
        # section of this receipt, and nothing can tell which engines it would have read.
        result.fail("/runs", broken)
    derived = 0
    engines_without: set[str] = set()
    for index, run in enumerate(receipt["runs"]):
        engine = str(run["engine"])
        lane = lanes.lane_for(engine)
        if lane is None:
            engines_without.add(engine)
            continue
        derivation = lane.derive_verdict(list(run["verdictLines"]))
        if derivation.verdict is None:
            result.fail(f"/runs/{index}/verdictLines", "the verdict lines cannot be read: " + "; ".join(derivation.problems))
        elif derivation.verdict != run["verdict"]:
            result.fail(f"/runs/{index}/verdict", f"the stored verdict is {run['verdict']}, but its verdict lines say {derivation.verdict}")
        else:
            derived += 1
    for engine in sorted(engines_without if broken is None else ()):
        result.note("/runs", f"{engine} runs were not re-derived: this version of statespace does not read {engine}'s verdict lines yet, so their verdicts are shown as reported")
    result.facts["runs"] = len(receipt["runs"])
    result.facts["verdictsRederived"] = derived
    seen: set[str] = set()
    for name in sorted(set(lanes.lane_names().values())):
        if name in seen:
            continue
        seen.add(name)
        module = importlib.import_module(name)
        check: Any = getattr(module, "verify_receipt", None)
        if check is not None:
            found: Iterable[Finding] = check(receipt, root)
            result.findings.extend(found)


def _check_statements(receipt: Mapping[str, Any], root: Path | None, result: Verification) -> None:
    from .schema.statement_hash import StatementHashError, statement_hash_file

    statements: list[Any] = list(receipt["statements"])
    if not statements:
        return
    if root is None:
        result.note("/statements", "no lab repository was given (--root), so the statement hashes were not recomputed")
        return
    equal = 0
    for index, statement in enumerate(statements):
        path = str(statement["path"])
        file = _inside(root, path)
        if file is None:
            result.note(f"/statements/{index}", f"{path} is outside the repository, so its hash is shown as reported")
            continue
        if not file.is_file():
            result.note(f"/statements/{index}", f"{path} is not in the repository, so its hash is shown as reported")
            continue
        try:
            now = statement_hash_file(file)
        except StatementHashError as error:
            result.fail(f"/statements/{index}/sha256", f"{path} can no longer be hashed ({error.code}); its claim voids to [?]")
            continue
        if now != statement["sha256"]:
            result.fail(f"/statements/{index}/sha256", f"{path} changed after this receipt (its statement hash is now {now[:12]}...); its claim voids to [?]")
        else:
            equal += 1
    result.facts["statementsRecomputed"] = equal


def _check_pins(receipt: Mapping[str, Any], result: Verification) -> None:
    if receipt["cli"]["version"] != __version__:
        return  # the pins of another version of the CLI are not this one's
    from .doctor import PINS

    for index, tool in enumerate(receipt["tools"]):
        ids = TOOL_PINS.get(str(tool["name"]))
        if ids is None or "pinned" not in tool:
            continue
        pins = {PINS[i].sha256 for i in ids if i in PINS and PINS[i].sha256}
        if bool(tool["pinned"]) != (tool["sha256"] in pins):
            said = "pinned" if tool["pinned"] else "not pinned"
            result.fail(f"/tools/{index}/pinned", f"{tool['name']} is marked {said}, but its SHA-256 {'is not' if tool['pinned'] else 'is'} this CLI's pin")


def _check_integrity(receipt: Mapping[str, Any], result: Verification) -> None:
    integrity = (as_map(receipt.get("ext")) or {}).get("integrity")
    if integrity is None:
        result.note("/ext", "no integrity digest: the receipt was written by another tool or by hand")
        result.facts["integrity"] = "absent"
        return
    stated = as_map(integrity)
    if stated is None or stated.get("scheme") != INTEGRITY_SCHEME or not isinstance(stated.get("sha256"), str):
        result.fail("/ext/integrity", f"the integrity digest is not a {INTEGRITY_SCHEME} digest")
        return
    if integrity_digest(receipt) != stated["sha256"]:
        result.fail("/ext/integrity", "the integrity digest does not match: the receipt was edited after statespace check wrote it")
        result.facts["integrity"] = "mismatch"
    else:
        result.facts["integrity"] = "matches"


def verify(receipt: Any, *, root: Path | None, source: str = "<receipt>") -> Verification:
    """Verify a parsed receipt. `root` is the lab repository its paths are relative to, or None."""
    result = Verification(source)
    if not isinstance(receipt, dict):
        result.fail("", "a receipt is a JSON object")
        return result
    receipt_map: dict[str, Any] = receipt  # pyright: ignore[reportUnknownVariableType]
    from .schema import validate

    issues = validate("receipt", receipt_map)
    for issue in issues:
        result.fail(issue["instancePath"], f"receipt@1 ({issue['keyword']}): {issue['message']}")
    if issues:
        return result
    result.facts.update({"lab": receipt_map["lab"], "stage": receipt_map["stage"], "lane": receipt_map["lane"], "cli": receipt_map["cli"]["version"], "createdAt": receipt_map["createdAt"]})
    _check_structure(receipt_map, result)
    _check_runs(receipt_map, root, result)
    _check_statements(receipt_map, root, result)
    _check_pins(receipt_map, result)
    _check_integrity(receipt_map, result)
    return result


def infer_root(path: Path) -> Path | None:
    """The lab repository of a receipt kept where `statespace check` writes it, receipts/LAB-n.k/<file>."""
    resolved = path.resolve()
    if STAGE_DIR.fullmatch(resolved.parent.name) and resolved.parent.parent.name == "receipts":
        return resolved.parent.parent.parent
    return None


def verify_file(path: Path, *, root: Path | None = None) -> Verification:
    """Read and verify one receipt file. Raises OSError when it cannot be read."""
    data = path.read_bytes()
    base = root if root is not None else infer_root(path)
    try:
        receipt = load_json(data)
    except ReceiptReadError as error:
        result = Verification(str(path))
        result.fail("", str(error))
        return result
    return verify(receipt, root=base, source=str(path))


# ------------------------------------------------------------------------------------------ command
def render(result: Verification) -> str:
    facts = result.facts
    out = [result.source]
    if "lab" in facts:
        out.append(f"  receipt   {facts['stage']} of {facts['lab']}, {LANE_WORDS.get(facts['lane'], facts['lane'])}, written by statespace {facts['cli']} at {facts['createdAt']}")
        out.append("  schema    valid against receipt@1")
        line = f"  runs      {facts.get('runs', 0)}, {facts.get('verdictsRederived', 0)} re-derived from their verdict lines"
        out.append(line)
        if "statementsRecomputed" in facts:
            out.append(f"  statements {facts['statementsRecomputed']} recomputed and equal")
        if "integrity" in facts:
            out.append(f"  integrity {facts['integrity']}")
    for finding in result.findings:
        where = finding.where or "/"
        out.append(f"  {'FAIL' if finding.level == 'fail' else 'note'}  {where}: {finding.message}")
    fails = sum(1 for f in result.findings if f.level == "fail")
    if result.ok:
        out.append("verified: well formed and consistent (a receipt is not signed: it records what was reported, not that it ran)")
    else:
        out.append(f"REJECTED: {fails} problem{'s' if fails != 1 else ''}")
    return "\n".join(out) + "\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="statespace receipt", description="Work with receipts (receipt@1).")
    commands = parser.add_subparsers(dest="command", metavar="verify")
    check = commands.add_parser("verify", help="validate a receipt against receipt@1 and recompute its statement hashes", description="Validate receipts against receipt@1, re-derive every verdict from its verdict lines and recompute the statement hashes. Exit status: 0 every receipt verified, 1 one was rejected, 2 a usage error or an unreadable file.")
    check.add_argument("files", nargs="+", metavar="FILE")
    check.add_argument("--root", type=Path, default=None, help="the lab repository the receipt's paths are relative to; default: the repository of a file under receipts/LAB-n.k/")
    check.add_argument("--json", action="store_true", help="print the findings as JSON")
    args = parser.parse_args(list(argv) if argv is not None else None)
    if args.command != "verify":
        parser.print_help(sys.stderr)
        return 2
    results: list[Verification] = []
    status = 0
    for name in args.files:
        path = Path(name)
        try:
            results.append(verify_file(path, root=args.root))
        except OSError as error:
            sys.stderr.write(f"statespace receipt verify: {name}: {error.strerror or error}\n")
            status = 2
    if args.json:
        sys.stdout.write(json.dumps([r.as_json() for r in results], indent=2, ensure_ascii=False) + "\n")
    else:
        sys.stdout.write("".join(render(r) for r in results))
    if status == 2:
        return 2
    return 0 if all(r.ok for r in results) else 1

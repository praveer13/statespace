"""The demonstration recorder behind `statespace demo record` (LAB-10.7), and the replay of a recording
that LAB-10.c7 runs.

A recording is the folder `demo/`, self-contained so it can be published and replayed:

    demo/manifest.json      statespace/lab10-demo@1: every artifact with its SHA-256, every statement with
                            its statement hash, every receipt with the steps of its runs
    demo/proposal.yaml      the drawn proposal, as drawn
    demo/triage.yaml        your triage plan
    demo/verdict.yaml       your verdict, invariant, witness and class
    demo/specimen.yaml      the specimen your witness is mounted as (a flawed proposal)
    demo/corrected.mp       the corrected command (or the accepted proposal), and demo/fix.diff against it
    demo/cl-10-1.yaml       your CL-10.1 claim card
    demo/receipts/LAB-10.<k>.json   the newest receipt of LAB-10.3 to LAB-10.6, copied

Each artifact is cited by its path and SHA-256, each run by `<receipt>#<step>`, and each statement (the
proposal's command, the corrected command and every obligation the reference checker asks of them) by its
statement hash.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

__all__ = ["ARTIFACTS", "RECEIPT_STAGES", "build", "replay", "load_yaml", "latest_receipt"]

ARTIFACTS = {
    "proposal": ("labs/LAB-10/intake/proposal.yaml", "demo/proposal.yaml", "the drawn proposal (statespace proposal draw)"),
    "triage": ("labs/LAB-10/intake/triage.yaml", "demo/triage.yaml", "your triage plan (LAB-10.4)"),
    "verdict": ("labs/LAB-10/intake/verdict.yaml", "demo/verdict.yaml", "your verdict and witness (LAB-10.5)"),
    "corrected": ("labs/LAB-10/fix/corrected.mp", "demo/corrected.mp", "the corrected command (LAB-10.6)"),
    "claim": ("claims/cl-10-1.yaml", "demo/cl-10-1.yaml", "your CL-10.1 claim card"),
}
RECEIPT_STAGES = ("LAB-10.3", "LAB-10.4", "LAB-10.5", "LAB-10.6")
CL_FIELDS = ("proposition", "assumptions", "model", "method", "correspondence", "if_weakened")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_yaml(path: Path) -> Any:
    import yaml  # pyright: ignore[reportMissingModuleSource]

    return yaml.safe_load(path.read_text(encoding="utf-8"))


def latest_receipt(root: Path, stage: str) -> Path | None:
    folder = root / "receipts" / stage
    found = sorted(folder.glob("*.json")) if folder.is_dir() else []
    return found[-1] if found else None


def _statements(proposal_source: str, corrected_source: str | None) -> list[dict[str, str]]:
    from . import lang, obligations
    from .pipeline import statement_hash

    out = [{"name": "proposal", "sha256": statement_hash(proposal_source)}]
    sources = [("proposal", proposal_source)] + ([("corrected", corrected_source)] if corrected_source else [])
    if corrected_source:
        out.append({"name": "corrected", "sha256": statement_hash(corrected_source)})
    for label, source in sources:
        try:
            program = lang.parse_command(source)
            types = lang.typecheck(program)["types"]
        except (lang.ParseError, lang.TypeErr):
            continue
        for ob in obligations.obligations(program, types):
            out.append({"name": f"{label}.{ob.name}", "sha256": statement_hash(ob.query)})
    return out


def build(root: Path, *, explain: bool = False) -> tuple[dict[str, Any] | None, list[str]]:
    """Write demo/ from the repository. Returns the manifest (None when something is missing) and the
    lines to print: with `explain`, one per artifact, what it is and where it comes from."""
    lines: list[str] = []
    missing: list[str] = []
    for name, (src, _dst, what) in ARTIFACTS.items():
        ok = (root / src).is_file()
        if explain or not ok:
            lines.append(f"{'have' if ok else 'MISSING'}  {name:9} {src}: {what}")
        if not ok:
            missing.append(src)
    verdict = load_yaml(root / ARTIFACTS["verdict"][0]) if (root / ARTIFACTS["verdict"][0]).is_file() else {}
    specimen_src = (verdict or {}).get("specimen") if isinstance(verdict, dict) else None
    if (verdict or {}).get("verdict") == "flawed":
        ok = bool(specimen_src) and (root / str(specimen_src)).is_file()
        if explain or not ok:
            lines.append(f"{'have' if ok else 'MISSING'}  specimen  {specimen_src or '(verdict.yaml names none)'}: the specimen your witness is mounted as")
        if not ok:
            missing.append(str(specimen_src or "specimen"))
    receipts: dict[str, Path] = {}
    for stage in RECEIPT_STAGES:
        found = latest_receipt(root, stage)
        if explain or found is None:
            lines.append(f"{'have' if found else 'MISSING'}  receipt   {found.relative_to(root).as_posix() if found else 'receipts/' + stage + '/'}: the newest receipt of {stage} (statespace check lab{stage.split('-')[1]})")
        if found is None:
            missing.append(f"receipts/{stage}/")
        else:
            receipts[stage] = found
    if missing:
        lines.append("no recording written: " + ", ".join(missing) + " missing")
        return None, lines
    demo = root / "demo"
    if demo.exists():
        shutil.rmtree(demo)
    (demo / "receipts").mkdir(parents=True)
    artifacts: dict[str, Any] = {}
    for name, (src, dst, _what) in ARTIFACTS.items():
        shutil.copyfile(root / src, root / dst)
        artifacts[name] = {"path": dst, "from": src, "sha256": sha256_file(root / dst)}
    if specimen_src:
        shutil.copyfile(root / str(specimen_src), demo / "specimen.yaml")
        artifacts["specimen"] = {"path": "demo/specimen.yaml", "from": str(specimen_src), "sha256": sha256_file(demo / "specimen.yaml")}
    proposal = load_yaml(root / ARTIFACTS["proposal"][0])
    source = str(proposal.get("source", ""))
    corrected = (root / ARTIFACTS["corrected"][0]).read_text(encoding="utf-8")
    diff = "".join(difflib.unified_diff(source.splitlines(True), corrected.splitlines(True), "proposal", "corrected"))
    (demo / "fix.diff").write_text(diff, encoding="utf-8")
    artifacts["fix"] = {"path": "demo/fix.diff", "sha256": sha256_file(demo / "fix.diff")}
    cited: list[dict[str, Any]] = []
    for stage, path in receipts.items():
        dst = demo / "receipts" / f"{stage}.json"
        shutil.copyfile(path, dst)
        receipt = json.loads(dst.read_text(encoding="utf-8"))
        rel = dst.relative_to(root).as_posix()
        cited.append({"stage": stage, "path": rel, "from": path.relative_to(root).as_posix(), "sha256": sha256_file(dst),
                      "runs": [f"{rel}#{r.get('step')}" for r in receipt.get("runs", [])], "checks": receipt.get("checks", [])})
    manifest = {
        "schema": "statespace/lab10-demo@1",
        "proposal": {"seed": proposal.get("seed"), "statementSha256": _statements(source, None)[0]["sha256"]},
        "artifacts": artifacts,
        "receipts": cited,
        "statements": _statements(source, corrected),
    }
    (demo / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    lines.append(f"wrote demo/: {len(artifacts)} artifacts, {len(cited)} receipts, {sum(len(c['runs']) for c in cited)} runs cited, {len(manifest['statements'])} statements")
    return manifest, lines


def replay(root: Path) -> tuple[list[str], list[str]]:
    """Check a recording: every artifact's hash, every receipt (statespace receipt verify), every statement
    hash, the CL-10.1 card's six fields, and the witness replayed in the reference interpreter. Returns
    (problems, notes)."""
    from statespace.receipt import verify

    from . import lang, obligations, semantics
    from .proposals import draw

    problems: list[str] = []
    notes: list[str] = []
    path = root / "demo" / "manifest.json"
    if not path.is_file():
        return ["demo/manifest.json is not there: run `uv run statespace demo record`"], notes
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        return [f"demo/manifest.json is not JSON: {error}"], notes
    if manifest.get("schema") != "statespace/lab10-demo@1":
        return ["demo/manifest.json is not a statespace/lab10-demo@1 recording"], notes
    arts = manifest.get("artifacts", {})
    for name in (*ARTIFACTS, "fix"):
        a = arts.get(name)
        if not a:
            problems.append(f"the recording has no {name}")
            continue
        p = root / a["path"]
        if not p.is_file():
            problems.append(f"{a['path']} is cited and not there")
        elif sha256_file(p) != a.get("sha256"):
            problems.append(f"{a['path']} has changed since it was recorded (its SHA-256 differs)")
    for c in manifest.get("receipts", []):
        p = root / c["path"]
        if not p.is_file():
            problems.append(f"{c['path']} is cited and not there")
            continue
        if sha256_file(p) != c.get("sha256"):
            problems.append(f"{c['path']} has changed since it was recorded")
            continue
        if not c.get("runs") and c.get("stage") != "LAB-10.4":  # the intake runs no engine
            problems.append(f"{c['path']} cites no run")
        result = verify(json.loads(p.read_text(encoding="utf-8")), root=root, source=c["path"])
        if not result.ok:
            problems.append(f"{c['path']} does not verify: " + "; ".join(f.message for f in result.findings if f.level == "fail")[:200])
    stages = {c.get("stage") for c in manifest.get("receipts", [])}
    for stage in RECEIPT_STAGES:
        if stage not in stages:
            problems.append(f"the recording cites no receipt of {stage}")
    if problems:
        return problems, notes
    proposal = load_yaml(root / arts["proposal"]["path"])
    seed = proposal.get("seed")
    drawn = draw(int(seed)) if isinstance(seed, int) else None
    if drawn is None or drawn.source != proposal.get("source") or drawn.claim != proposal.get("claim"):
        problems.append("demo/proposal.yaml is not the proposal its seed draws")
        return problems, notes
    corrected = (root / arts["corrected"]["path"]).read_text(encoding="utf-8")
    want = {(s["name"], s["sha256"]) for s in _statements(drawn.source, corrected)}
    have = {(s.get("name"), s.get("sha256")) for s in manifest.get("statements", [])}
    if want - have:
        problems.append("statements not cited by their hash: " + ", ".join(sorted(n for n, _ in want - have)))
    card = load_yaml(root / arts["claim"]["path"]) or {}
    for field in CL_FIELDS:
        value = card.get(field) if isinstance(card, dict) else None
        if not value or "TODO(you)" in str(value):
            problems.append(f"CL-10.1's {field} is not written (demo/cl-10-1.yaml)")
    verdict = load_yaml(root / arts["verdict"]["path"]) or {}
    if verdict.get("verdict") == "flawed":
        try:
            program = lang.parse_command(drawn.source)
            types = lang.typecheck(program)["types"]
            state, args = obligations.concretize(verdict.get("witness") or {}, program, types)
            out = semantics.run(program, types, state, args)
            broken = semantics.inv_violations(out["state"]) if out["ok"] else []
            if not broken:
                problems.append(f"the recorded witness does not replay: the interpreter gives {semantics.outcome_class(out)} with Inv intact")
            else:
                notes.append(f"the witness replays: {semantics.outcome_class(out)}, Inv broken: {', '.join(broken)}")
        except (KeyError, TypeError, ValueError, lang.ParseError, lang.TypeErr) as error:
            problems.append(f"the recorded witness cannot be replayed: {error}")
        if "specimen" not in arts:
            problems.append("a flawed proposal's recording mounts no specimen")
    notes.append(f"{len(arts)} artifacts, {len(manifest.get('receipts', []))} receipts and {len(have)} statements checked by hash")
    return problems, notes

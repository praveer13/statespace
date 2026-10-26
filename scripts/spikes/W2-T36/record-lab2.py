"""Record LAB-2's happy path in the bench image as RUN-lab2-gate (run@1): GATE-labs on LAB-2, and the keys of
its weakening and Prove-it mutants (curriculum/S02-proof.md sections 3.1 and 3.4; ARCHITECTURE.md section 13.5).

Adapted from scripts/spikes/W1-T30/record-lab1.py. What it does, as a learner would do it:

1. builds LAB-2's zip with scripts/labs/build-zips.mjs and unpacks it into two scratch folders;
2. lays the private reference solution over the second (it never enters this repository: --solutions names
   a folder outside it, laid out as the learner repository, <dir>/LAB-2/labs/LAB-2/Solution.lean ...);
3. copies the solution once per mutant and applies the mutant's textual edits to the copy;
4. in one container of the bench image, with the learner's recorded choice STATESPACE_SANDBOX=off (Lean's
   sandbox cannot start under Docker's default confinement [X RUN-lean-bwrap-docker]), runs
   `uv run statespace check lab2` on the template (every check must fail), `statespace check lab2.<k>` for
   k = 1..7 on the solution (every check must pass), `statespace receipt verify` on each receipt it wrote,
   and, for each mutant, the stage check the mutant targets: its verdict lines are the key. One more
   configuration runs a stage without the choice, where the sandbox is wanted and cannot start.

Writes runs/RUN-lab2-gate.json and each configuration's output under runs/RUN-lab2-gate/. Paths of this
machine are written as <sandbox>. Run from the repository root, then regenerate the index:

    python3 -I scripts/spikes/W2-T36/record-lab2.py --solutions <private dir>
    node scripts/runs/build-index.mjs
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
RUN_ID = "RUN-lab2-gate"
FOLDER = ROOT / "runs" / RUN_ID
IMAGE = "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a"
CHECK = ["uv", "run", "--quiet", "statespace", "check"]
DECLARE = ["--assisted", "none", "--agent", "no"]
L = "labs/LAB-2/"
CONSERVES = "theorem transfer_conserves (s : Ledger) (n : Int) :"
REJECTED = "(h : ¬ (0 ≤ n ∧ n ≤ s.a)) :\n    transfer s n = s"
NONNEG_PROOF = "  unfold transfer\n  split\n  · next hg => exact ⟨Int.sub_nonneg_of_le hg.2, Int.add_nonneg hb hg.1⟩\n  · exact ⟨ha, hb⟩"
REJECTED_PROOF = "  unfold transfer\n  split\n  · next hg => exact absurd hg h\n  · rfl"
CONSERVES_PROOF = "  · show s.a - n + (s.b + n) = s.a + s.b\n    rw [Int.add_comm s.b n, ← Int.add_assoc, Int.sub_add_cancel]\n  · rfl"
GUARD = "if 0 ≤ n ∧ n ≤ s.a then { a"

# Mutants (content/stages/S2/lab.yaml extra.proveIt, and the weakenings comparator must reject): (id, edits as
# (file, old, new), the stage it targets, whether the learner's sandbox choice is set). Each `old` must occur
# exactly once in the reference solution's file.
MUTANTS: list[tuple[str, list[tuple[str, str, str]], str, bool]] = [
    ("hyp-same-name", [(L + "Solution.lean", REJECTED, "(h : ¬ (0 ≤ n ∧ n ≤ s.a)) (h2 : n = 0) :\n    transfer s n = s")], "lab2.3", True),
    ("noguard", [(L + "Solution.lean", GUARD, "if 0 ≤ n then { a"), (L + "Solution.lean", NONNEG_PROOF, "  sorry"), (L + "Solution.lean", REJECTED_PROOF, "  sorry")], "lab2.2", True),
    ("noguard-nonneg", [(L + "Solution.lean", GUARD, "if 0 ≤ n then { a")], "lab2.4", True),
    ("automation", [(L + "Solution.lean", CONSERVES_PROOF, "  all_goals simp\n  all_goals omega")], "lab2.2", True),
    ("ih-ungeneralised", [(L + "Solution.lean", "induction ns generalizing s with", "induction ns with")], "lab2.5", True),
    ("native-decide", [(L + "broken/Broken.lean", ":= by decide", ":= by native_decide")], "lab2.6", True),
    ("sorry-xfer-self", [(L + "Solution.lean", "xfer f k k n k = f k := by\n  unfold xfer upd\n  split <;> simp <;> omega", "xfer f k k n k = f k := by\n  sorry")], "lab2.6", True),
    ("weakened-challenge", [(L + "challenge/Challenge.lean", CONSERVES, "theorem transfer_conserves (s : Ledger) (n : Int) (h : n = 0) :"), (L + "Solution.lean", CONSERVES, "theorem transfer_conserves (s : Ledger) (n : Int) (h : n = 0) :")], "lab2.2", True),
    ("config-drops-theorems", [(L + "stages/LAB-2.6/comparator.json", '"xfer_frame",\n    "xfer_pair",\n    "xfer_self"', '"xfer_frame"')], "lab2.6", True),
    ("specimen-other-account", [(L + "broken/Broken.lean", "xferBuggy (fun _ => 10) 0 0 5 0 = 15", "xferBuggy (fun _ => 10) 0 0 5 1 = 15")], "lab2.6", True),
    ("card-typed-P", [("claims/CL-2.2.yaml", 'text: "no transfer leaves a balance negative"', 'text: "no transfer leaves a balance negative [P]"')], "lab2.7", True),
    ("sandbox-wanted", [], "lab2.2", False),
]

MANIFEST_METHOD = (
    "the SHA-256 of sha256sum's lines, '<sha256>  <path under the directory>', one per file under the directory except those under "
    "__pycache__, sorted by the path (by code point, which is LC_ALL=C sort's byte order for UTF-8), each line ended by a newline: "
    "cd <directory> && find . -type f ! -path '*/__pycache__/*' | sed 's|^\\./||' | LC_ALL=C sort | xargs -d '\\n' sha256sum | sha256sum"
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def manifest_hash(base: Path) -> tuple[str, int]:
    paths = sorted(p.relative_to(base).as_posix() for p in base.rglob("*") if p.is_file() and "__pycache__" not in p.relative_to(base).parts)
    lines = [f"{sha256((base / path).read_bytes())}  {path}\n" for path in paths]
    return sha256("".join(lines).encode("utf-8")), len(lines)


def manifest(relative: str, role: str) -> dict[str, object]:
    digest, files = manifest_hash(ROOT / relative)
    return {"path": relative.rstrip("/") + "/", "sha256": digest, "sha256_method": MANIFEST_METHOD, "files": files, "role": role}


def file_input(relative: str, role: str) -> dict[str, object]:
    data = (ROOT / relative).read_bytes()
    return {"path": relative, "sha256": sha256(data), "bytes": len(data), "role": role}


def normalise(text: str) -> str:
    text = text.replace(str(ROOT) + "/", "").replace(str(ROOT), ".")
    return re.sub(r"(?:/home|/tmp|/var/folders|/private|/w)/[^\s'\"),]*", "<sandbox>", text)


def unpack(archive: Path, into: Path) -> None:
    with zipfile.ZipFile(archive) as z:
        for info in z.infolist():
            target = into / info.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(info))
            if (info.external_attr >> 16) & 0o111:
                target.chmod(0o755)


def check_lines(output: str) -> list[str]:
    """What a stage check printed that carries its verdict: each check's pass or FAIL line, its message, and
    the suspicion; the receipt line or why none was written."""
    out: list[str] = []
    lines = output.splitlines()
    for i, line in enumerate(lines):
        if re.match(r"  (pass|FAIL)  LAB-2\.c[0-9]+ ", line):
            out.append(line)
            if i + 1 < len(lines):
                out.append(lines[i + 1])
            if i + 2 < len(lines) and lines[i + 2].strip().startswith("suspects:"):
                out.append(lines[i + 2])
        elif re.match(r"  (receipt|not run:|no receipt)", line):
            out.append(line)
    return out


def results(output: str) -> dict[str, dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}
    lines = output.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"  (pass|FAIL)  (LAB-2\.c[0-9]+) ", line)
        if m:
            suspect = lines[i + 2].strip().removeprefix("suspects: ") if i + 2 < len(lines) and lines[i + 2].strip().startswith("suspects:") else None
            found[m.group(2)] = {"pass": m.group(1) == "pass", "message": lines[i + 1].strip() if i + 1 < len(lines) else "", **({"suspect": suspect} if suspect else {})}
    return found


def main(argv: list[str]) -> int:
    if "--solutions" not in argv:
        sys.stderr.write("usage: python3 -I scripts/spikes/W2-T36/record-lab2.py --solutions <private dir>\n")
        return 2
    solutions = Path(argv[argv.index("--solutions") + 1]).resolve()
    if ROOT in solutions.parents or solutions == ROOT:
        sys.stderr.write("record-lab2: the solutions folder is inside the course repository; solutions never enter it\n")
        return 2
    source = solutions / "LAB-2"
    if not source.is_dir():
        sys.stderr.write(f"record-lab2: no {source}\n")
        return 2
    scratch = Path(tempfile.mkdtemp(prefix="statespace-lab2-gate-", dir=os.environ.get("W0S11_SCRATCH")))
    try:
        return record(source, scratch)
    finally:
        if not os.environ.get("STATESPACE_KEEP"):
            shutil.rmtree(scratch, ignore_errors=True)


def record(source: Path, scratch: Path) -> int:
    started_at, started = now(), time.monotonic()
    build = subprocess.run(["node", "scripts/labs/build-zips.mjs", "LAB-2", "--out", str(scratch / "zip")], cwd=ROOT, capture_output=True, text=True)
    if build.returncode != 0:
        sys.stderr.write(build.stderr)
        return 1
    archive = scratch / "zip" / "LAB-2.zip"
    zip_sha = sha256(archive.read_bytes())
    solution_sha, solution_files = manifest_hash(source)
    for name in ("template", "solution"):
        unpack(archive, scratch / name)
    shutil.copytree(source, scratch / "solution", dirs_exist_ok=True)
    for mid, edits, _, _ in MUTANTS:
        target = scratch / f"m-{mid}"
        shutil.copytree(scratch / "solution", target)
        for rel, old, new in edits:
            text = (target / rel).read_text(encoding="utf-8")
            if text.count(old) != 1:
                sys.stderr.write(f"record-lab2: mutant {mid}: {old!r} occurs {text.count(old)} times in {rel}\n")
                return 1
            (target / rel).write_text(text.replace(old, new), encoding="utf-8")

    # The configurations, as (id, purpose, folder, command); one container runs them in order.
    configs: list[tuple[str, str, str, list[str]]] = [
        ("versions", "the tools the image runs the lab with, from the lab's Lean project", "template/labs/LAB-2", ["sh", "-c", "lean --version; lake --version"]),
        ("template", "the zip as a learner unpacks it: every built check must fail, naming what it suspects", "template", [*CHECK, "lab2", *DECLARE]),
    ]
    for k in range(1, 8):
        configs.append((f"solution-lab2.{k}", f"the private reference solution: LAB-2.c{k} must pass and LAB-2.{k} write a receipt", "solution", [*CHECK, f"lab2.{k}", *DECLARE]))
    configs.append(("solution-receipts", "statespace receipt verify on every receipt the solution's stages wrote", "solution", ["sh", "-c", "for f in receipts/LAB-2.*/*.json; do uv run --quiet statespace receipt verify \"$f\" || exit 1; done"]))
    for mid, _, stage, choice in MUTANTS:
        command = [*CHECK, stage, *DECLARE] if choice else ["env", "-u", "STATESPACE_SANDBOX", *CHECK, stage, *DECLARE]
        what = "the sandbox wanted, with no recorded choice" if not choice else f"the stage check it targets, {stage}, on the mutated solution"
        configs.append((f"mutant-{mid}-check", f"mutant {mid}: {what}; its verdict lines are the key", f"m-{mid}", command))

    # STATESPACE_SANDBOX=off is the learner's recorded choice (labs/LAB-2/README.md): Docker's default confinement
    # stops Lean's sandbox [X RUN-lean-bwrap-docker], and one mutant runs without the choice to show what happens.
    script = ["export HOME=/tmp/home UV_CACHE_DIR=/tmp/uv-cache STATESPACE_SANDBOX=off", "mkdir -p $HOME /w/logs"]
    for cid, _, folder, command in configs:
        quoted = " ".join("'" + part.replace("'", "'\"'\"'") + "'" for part in command)
        script.append(f"cd /w/{folder} && s=$(date +%s.%N) && {quoted} > /w/logs/{cid}.log 2>&1; echo $? > /w/logs/{cid}.exit; e=$(date +%s.%N); echo \"$s $e\" > /w/logs/{cid}.time")
    (scratch / "run.sh").write_text("\n".join(script) + "\n", encoding="utf-8")
    docker = ["docker", "run", "--rm", "--memory=6g", "-u", f"{os.getuid()}:{os.getgid()}", "-v", f"{scratch}:/w", "-w", "/w", IMAGE, "sh", "/w/run.sh"]
    done = subprocess.run(docker, capture_output=True, text=True)
    if done.returncode != 0:
        sys.stderr.write(done.stdout + done.stderr)
        return 1

    FOLDER.mkdir(parents=True, exist_ok=True)
    for old in FOLDER.glob("*.log"):
        old.unlink()
    shown_docker = ["docker", "run", "--rm", "--memory=6g", "-v", "<sandbox>:/w"]
    inputs = [
        {"name": "LAB-2.zip", "sha256": zip_sha, "bytes": archive.stat().st_size, "role": "the lab zip, built by scripts/labs/build-zips.mjs from the inputs below"},
        manifest("labs/LAB-2", "the lab folder: the starter files"),
        manifest("labs/template", "the repository frame"),
        manifest("bench/statespace", "the statespace command line the zip ships"),
        file_input("bench/statespace/labs/lab2.py", "LAB-2's checks"),
        file_input("scripts/labs/build-zips.mjs", "harness"),
        file_input("scripts/spikes/W2-T36/record-lab2.py", "harness"),
        {"name": "the private reference solution of LAB-2 (not in this repository)", "sha256": solution_sha, "sha256_method": MANIFEST_METHOD, "files": solution_files, "role": "solution"},
    ]
    entries: list[dict[str, Any]] = []
    outputs: list[dict[str, Any]] = []
    values: dict[str, Any] = {"template": {}, "solution": {}, "mutants": {}}
    logs = scratch / "logs"
    for cid, purpose, folder, command in configs:
        text = normalise((logs / f"{cid}.log").read_text(encoding="utf-8", errors="replace"))
        code = int((logs / f"{cid}.exit").read_text().strip())
        t0, t1 = (float(x) for x in (logs / f"{cid}.time").read_text().split())
        path = FOLDER / f"{cid}.log"
        path.write_text(text, encoding="utf-8")
        data = path.read_bytes()
        output = {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(data), "bytes": len(data), "kind": "log"}
        outputs.append(output)
        is_check = CHECK[0] in command and command[command.index(CHECK[0]) : command.index(CHECK[0]) + 5] == CHECK
        lines = check_lines(text) if is_check else [line for line in text.splitlines() if line.strip()]
        entries.append({"id": cid, "purpose": purpose, "argv": [*shown_docker, "-w", f"/w/{folder}", IMAGE, *command], "exit_code": code, "duration_s": round(t1 - t0, 3), "verdict_lines": lines, "outputs": [output]})
        if cid == "template":
            values["template"] = results(text)
        elif cid.startswith("solution-lab2."):
            values["solution"].update(results(text))
        elif cid.startswith("mutant-"):
            mid = next(m for m, *_ in MUTANTS if cid == f"mutant-{m}-check")
            slot = values["mutants"].setdefault(mid, {})
            slot["check"] = results(text)
            slot["exit_code"] = code
            slot["lines"] = lines
        elif cid == "versions":
            values["versions"] = {"lean": next((l for l in lines if l.startswith("Lean (version")), "unknown"), "lake": next((l for l in lines if l.startswith("Lake version")), "unknown")}
    checks = [
        {"id": "template-fails-every-check", "pass": len(values["template"]) == 7 and not any(r["pass"] for r in values["template"].values())},
        {"id": "solution-passes-every-check", "pass": len(values["solution"]) == 7 and all(r["pass"] for r in values["solution"].values())},
        {"id": "solution-receipts-verify", "pass": next(e for e in entries if e["id"] == "solution-receipts")["exit_code"] == 0},
        {"id": "every-mutant-fails-its-check", "pass": all(m.get("exit_code") == 1 and m["check"] and not any(r["pass"] for r in m["check"].values()) for k, m in values["mutants"].items() if k != "sandbox-wanted")},
        {"id": "sandbox-wanted-judges-nothing", "pass": values["mutants"].get("sandbox-wanted", {}).get("exit_code") == 3 and not values["mutants"]["sandbox-wanted"]["check"]},
    ]
    record = {
        "id": RUN_ID,
        "title": "LAB-2 in the bench image: the zip's template fails each of LAB-2.c1 to LAB-2.c7, the private reference solution passes each and its receipts verify, eleven weakening and Prove-it mutants of the solution each fail their check, and a stage with the sandbox wanted and unable to start judges nothing",
        "task": "W2-T36",
        "origin": "recorded",
        "records": "GATE-labs on LAB-2 in full mode (ARCHITECTURE.md section 13.5), and the keys of the weakening and Prove-it mutants of curriculum/S02-proof.md section 3.4, computed by Lean and lake comparator on mutated copies of the reference solution",
        "engine": "statespace",
        "version": "0.1.0",
        "version_string": f"statespace 0.1.0; {values.get('versions', {}).get('lean', 'unknown')}; {values.get('versions', {}).get('lake', 'unknown')}",
        "binary": "the statespace command line the LAB-2 zip ships (.statespace/cli/statespace/, from bench/statespace/), run with uv in the bench image; Lean and Lake from the image's elan toolchain, which lean-toolchain names",
        "binary_sha256": manifest_hash(ROOT / "bench" / "statespace")[0],
        "image": IMAGE,
        "recorded_at": now(),
        "started_at": started_at,
        "duration_s": round(time.monotonic() - started, 3),
        "argv": [*shown_docker, "-w", "/w/template", IMAGE, *CHECK, "lab2", *DECLARE],
        "inputs": inputs,
        "budget": {"memory": "6g"},
        "exit_code": next(e for e in entries if e["id"] == "template")["exit_code"],
        "verdict_lines": next(e for e in entries if e["id"] == "template")["verdict_lines"],
        "outputs": outputs,
        "values": values,
        "checks": checks,
        "environment": {"os": f"{platform.system()} {platform.release()}", "cpu_count": os.cpu_count(), "cpu_architecture": platform.machine(), "container_memory": "6g"},
        "primary_config": "template",
        "configs": entries,
        "notes": [
            "Recorded by W2-T36 with scripts/spikes/W2-T36/record-lab2.py; the reference solution is private and named here only by its manifest hash.",
            "Every Lean configuration ran with STATESPACE_SANDBOX=off, the learner's recorded choice, so lake comparator and lake check ran with --inadvisably-no-sandbox and every receipt records sandbox: off; mutant sandbox-wanted runs without it.",
            "LAB-2.8 is a stretch stage with no check, so no configuration runs it.",
            "Receipt file names carry the time they were written, so a re-run prints other names.",
        ],
    }
    (ROOT / "runs" / f"{RUN_ID}.json").write_text(json.dumps(record, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for c in checks:
        print(f"{'ok  ' if c['pass'] else 'FAIL'}  {c['id']}")
    return 0 if all(c["pass"] for c in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

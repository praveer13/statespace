"""Record LAB-1's happy path in the bench image as RUN-lab1-gate (run@1): GATE-labs on LAB-1, and the keys of
its Prove-it mutants (curriculum/S01-counterexample.md sections 3.1 and 3.4; ARCHITECTURE.md section 13.5).

What it does, as a learner would do it:

1. builds LAB-1's zip with scripts/labs/build-zips.mjs and unpacks it into two scratch folders;
2. lays the private reference solution over the second (it never enters this repository: --solutions names
   a folder outside it, laid out as the learner repository, <dir>/LAB-1/labs/LAB-1/...);
3. copies the solution once per Prove-it mutant and applies the mutant's one textual edit to the copy;
4. in one container of the bench image, runs `uv run statespace check lab1` on the template (every check
   must fail), `statespace check lab1.<k>` for k = 1..6 on the solution (every check must pass) and
   `statespace receipt verify` on each receipt it wrote, and, for each mutant, the stage check the
   mutant targets and the mutated file's own `python -I <file>`, whose lines are the key: Z3's answers
   on the mutated file.

Writes runs/RUN-lab1-gate.json and each configuration's output under runs/RUN-lab1-gate/. Paths of this
machine are written as <sandbox>. Run from the repository root, then regenerate the index:

    python3 -I scripts/spikes/W1-T30/record-lab1.py --solutions <private dir>
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
RUN_ID = "RUN-lab1-gate"
FOLDER = ROOT / "runs" / RUN_ID
IMAGE = "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a"
CHECK = ["uv", "run", "--quiet", "statespace", "check"]
DECLARE = ["--assisted", "none", "--agent", "no"]

# Prove-it mutants (content/stages/S1/lab.yaml extra.proveIt): (id, file, old, new, stage, file whose
# __main__ prints the key). Each `old` must occur exactly once in the reference solution's file.
MUTANTS: list[tuple[str, list[tuple[str, str, str]], str, list[str]]] = [
    ("drop-amount-positive", [("labs/LAB-1/transfer.py", "return [a >= 0, b >= 0, amount > 0]", "return [a >= 0, b >= 0]")], "lab1.3", ["labs/LAB-1/transfer.py"]),
    ("weaken-guard", [("labs/LAB-1/transfer.py", "    return amount <= a\n", "    return amount <= a + 1\n")], "lab1.3", ["labs/LAB-1/transfer.py"]),
    ("strict-guard", [("labs/LAB-1/transfer.py", "    return amount <= a\n", "    return amount < a\n")], "lab1.3", ["labs/LAB-1/transfer.py"]),
    (
        "bitvec64",
        [
            ("labs/LAB-1/transfer.py", "from z3 import And, BoolVal, Ints, Not, Solver", "from z3 import And, BitVecs, BoolVal, Not, Solver"),
            ("labs/LAB-1/transfer.py", 'a, b, amount = Ints("a b amount")', 'a, b, amount = BitVecs("a b amount", 64)'),
            ("labs/LAB-1/transfer.py", 'a_p, b_p = Ints("a_p b_p")', 'a_p, b_p = BitVecs("a_p b_p", 64)'),
            ("labs/LAB-1/holds.py", "from z3 import And, BoolVal, Const, EnumSort, Int, Solver", "from z3 import And, BitVec, BoolVal, Const, EnumSort, Solver\n\nInt = lambda name: BitVec(name, 64)  # the mutant: every Int becomes a signed BitVec 64"),
        ],
        "lab1.3",
        ["labs/LAB-1/transfer.py", "labs/LAB-1/holds.py"],
    ),
    ("refund-credit-unguarded", [("labs/LAB-1/fixed/refund.py", "If(ok, c + r, c)", "c + r")], "lab1.4", ["labs/LAB-1/mint.py"]),
    ("refund-debit-unguarded", [("labs/LAB-1/fixed/refund.py", "If(ok, after, m)", "after")], "lab1.4", ["labs/LAB-1/mint.py"]),
    ("drop-status-check", [("labs/LAB-1/holds.py", "And(x.status == HELD, capture_effect(x, y))", "capture_effect(x, y)")], "lab1.5", ["labs/LAB-1/holds.py"]),
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
        if re.match(r"  (pass|FAIL)  LAB-1\.c[0-9]+ ", line):
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
        m = re.match(r"  (pass|FAIL)  (LAB-1\.c[0-9]+) ", line)
        if m:
            suspect = lines[i + 2].strip().removeprefix("suspects: ") if i + 2 < len(lines) and lines[i + 2].strip().startswith("suspects:") else None
            found[m.group(2)] = {"pass": m.group(1) == "pass", "message": lines[i + 1].strip() if i + 1 < len(lines) else "", **({"suspect": suspect} if suspect else {})}
    return found


def main(argv: list[str]) -> int:
    if "--solutions" not in argv:
        sys.stderr.write("usage: python3 -I scripts/spikes/W1-T30/record-lab1.py --solutions <private dir>\n")
        return 2
    solutions = Path(argv[argv.index("--solutions") + 1]).resolve()
    if ROOT in solutions.parents or solutions == ROOT:
        sys.stderr.write("record-lab1: the solutions folder is inside the course repository; solutions never enter it\n")
        return 2
    source = solutions / "LAB-1"
    if not source.is_dir():
        sys.stderr.write(f"record-lab1: no {source}\n")
        return 2
    scratch = Path(tempfile.mkdtemp(prefix="statespace-lab1-gate-", dir=os.environ.get("W0S11_SCRATCH")))
    try:
        return record(source, scratch)
    finally:
        if not os.environ.get("STATESPACE_KEEP"):
            shutil.rmtree(scratch, ignore_errors=True)


def record(source: Path, scratch: Path) -> int:
    started_at, started = now(), time.monotonic()
    build = subprocess.run(["node", "scripts/labs/build-zips.mjs", "LAB-1", "--out", str(scratch / "zip")], cwd=ROOT, capture_output=True, text=True)
    if build.returncode != 0:
        sys.stderr.write(build.stderr)
        return 1
    archive = scratch / "zip" / "LAB-1.zip"
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
                sys.stderr.write(f"record-lab1: mutant {mid}: {old!r} occurs {text.count(old)} times in {rel}\n")
                return 1
            (target / rel).write_text(text.replace(old, new), encoding="utf-8")

    # The configurations, as (id, purpose, folder, command); one container runs them in order.
    configs: list[tuple[str, str, str, list[str]]] = [
        ("versions", "the tools the image runs the lab with", "template", ["uv", "run", "--quiet", "python", "-I", "-c", "import sys, z3; print('python', sys.version.split()[0]); print('z3', z3.get_version_string())"]),
        ("template", "the zip as a learner unpacks it: every built check must fail, naming what it suspects", "template", [*CHECK, "lab1", *DECLARE]),
    ]
    for k in range(1, 7):
        configs.append((f"solution-lab1.{k}", f"the private reference solution: LAB-1.c{k} must pass and LAB-1.{k} write a receipt", "solution", [*CHECK, f"lab1.{k}", *DECLARE]))
    configs.append(("solution-receipts", "statespace receipt verify on every receipt the solution's stages wrote", "solution", ["sh", "-c", "for f in receipts/LAB-1.*/*.json; do uv run --quiet statespace receipt verify \"$f\" || exit 1; done"]))
    for mid, _, stage, keys in MUTANTS:
        configs.append((f"mutant-{mid}-check", f"Prove-it mutant {mid}: the stage check it targets, {stage}, on the mutated solution", f"m-{mid}", [*CHECK, stage, *DECLARE]))
        for rel in keys:
            configs.append((f"mutant-{mid}-{Path(rel).stem}", f"Prove-it mutant {mid}: Z3's answers on the mutated {rel}, the key", f"m-{mid}", ["uv", "run", "--quiet", "python", "-I", rel]))

    script = ["export HOME=/tmp/home UV_CACHE_DIR=/tmp/uv-cache", "mkdir -p $HOME /w/logs"]
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
        {"name": "LAB-1.zip", "sha256": zip_sha, "bytes": archive.stat().st_size, "role": "the lab zip, built by scripts/labs/build-zips.mjs from the inputs below"},
        manifest("labs/LAB-1", "the lab folder: the starter files"),
        manifest("labs/template", "the repository frame"),
        manifest("bench/statespace", "the statespace command line the zip ships"),
        file_input("bench/statespace/labs/lab1.py", "LAB-1's checks"),
        file_input("scripts/labs/build-zips.mjs", "harness"),
        file_input("scripts/spikes/W1-T30/record-lab1.py", "harness"),
        {"name": "the private reference solution of LAB-1 (not in this repository)", "sha256": solution_sha, "sha256_method": MANIFEST_METHOD, "files": solution_files, "role": "solution"},
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
        is_check = command[:5] == CHECK
        lines = check_lines(text) if is_check else [line for line in text.splitlines() if line.strip()]
        entries.append({"id": cid, "purpose": purpose, "argv": [*shown_docker, "-w", f"/w/{folder}", IMAGE, *command], "exit_code": code, "duration_s": round(t1 - t0, 3), "verdict_lines": lines, "outputs": [output]})
        if cid == "template":
            values["template"] = results(text)
        elif cid.startswith("solution-lab1."):
            values["solution"].update(results(text))
        elif cid.startswith("mutant-"):
            mid = next(m for m, *_ in MUTANTS if cid.startswith(f"mutant-{m}-"))
            slot = values["mutants"].setdefault(mid, {})
            if is_check:
                slot["check"] = results(text)
            else:
                slot[cid.removeprefix(f"mutant-{mid}-")] = {"exit_code": code, "lines": lines}
        elif cid == "versions":
            values["versions"] = dict(line.split(" ", 1) for line in lines if " " in line)
    checks = [
        {"id": "template-fails-every-check", "pass": len(values["template"]) == 6 and not any(r["pass"] for r in values["template"].values())},
        {"id": "solution-passes-every-check", "pass": len(values["solution"]) == 6 and all(r["pass"] for r in values["solution"].values())},
        {"id": "solution-receipts-verify", "pass": next(e for e in entries if e["id"] == "solution-receipts")["exit_code"] == 0},
        {"id": "every-mutant-runs", "pass": all(e["exit_code"] == 0 for e in entries if e["id"].startswith("mutant-") and not e["id"].endswith("-check"))},
    ]
    record = {
        "id": RUN_ID,
        "title": "LAB-1 in the bench image: the zip's template fails each of LAB-1.c1 to LAB-1.c6, the private reference solution passes each and its six receipts verify, and seven Prove-it mutants of the solution run and give their keys",
        "task": "W1-T30",
        "origin": "recorded",
        "records": "GATE-labs on LAB-1 in full mode (ARCHITECTURE.md section 13.5), and the Prove-it keys of curriculum/S01-counterexample.md section 3.4, computed by Z3 on mutated copies of the reference solution",
        "engine": "statespace",
        "version": "0.1.0",
        "version_string": f"statespace 0.1.0; z3 {values.get('versions', {}).get('z3', 'unknown')}; python {values.get('versions', {}).get('python', 'unknown')}",
        "binary": "the statespace command line the LAB-1 zip ships (.statespace/cli/statespace/, from bench/statespace/), run with uv in the bench image; z3-solver as the zip's pyproject.toml pins it",
        "binary_sha256": manifest_hash(ROOT / "bench" / "statespace")[0],
        "image": IMAGE,
        "recorded_at": now(),
        "started_at": started_at,
        "duration_s": round(time.monotonic() - started, 3),
        "argv": [*shown_docker, "-w", "/w/template", IMAGE, *CHECK, "lab1", *DECLARE],
        "inputs": inputs,
        "budget": {"rlimit": 5000000, "memory": "6g"},
        "exit_code": next(e for e in entries if e["id"] == "template")["exit_code"],
        "verdict_lines": next(e for e in entries if e["id"] == "template")["verdict_lines"],
        "outputs": outputs,
        "values": values,
        "checks": checks,
        "environment": {"os": f"{platform.system()} {platform.release()}", "cpu_count": os.cpu_count(), "cpu_architecture": platform.machine(), "container_memory": "6g"},
        "primary_config": "template",
        "configs": entries,
        "notes": [
            "Recorded by W1-T30 with scripts/spikes/W1-T30/record-lab1.py; the reference solution is private and named here only by its manifest hash.",
            "Model values in the logs are not canonical: a witness is graded by replay, never by its values.",
            "Receipt file names carry the time they were written, so a re-run prints other names.",
        ],
    }
    (ROOT / "runs" / f"{RUN_ID}.json").write_text(json.dumps(record, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for c in checks:
        print(f"{'ok  ' if c['pass'] else 'FAIL'}  {c['id']}")
    return 0 if all(c["pass"] for c in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

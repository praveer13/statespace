"""Record RUN-core-demo (run@1): `statespace demo`, the reference pipeline on the provided agent proposal
TransferWithFee, as a learner runs it in LAB-10.1, and `statespace check lab10.1` on the skeleton it wrote
(curriculum/S10-assembly.md section 3.3; spine section 9.5, whose RUN-core-demo lists its outputs: LAB-10.c1's
report skeleton, SP-10.1, CL-10.1's status and "if weakened" witness, and an S10.L7 cell).

What it does:

1. builds LAB-10's zip with scripts/labs/build-zips.mjs and unpacks it into a scratch folder, as a learner
   unpacks it into their repository;
2. starts a PostgreSQL 18 container by the digest the template's devcontainer pins, on a network of its own
   (unique names, removed afterwards);
3. in the bench image, on that network, runs `uv run --quiet --with psycopg[binary]==3.3.6 statespace demo`,
   then `... statespace check lab10.1 --assisted none --agent no`, then `statespace receipt verify` on the
   receipt it wrote;
4. writes runs/RUN-core-demo.json and its outputs under runs/RUN-core-demo/: the skeleton (JSON and Markdown),
   the three transcripts and the receipt. With --update-challenge it also copies the skeleton to
   labs/LAB-10/challenge/RUN-core-demo.skeleton.json, the recording LAB-10.c1 compares with; without it, the
   script fails when the skeleton's compared fields differ from that file.

Paths of this machine are written as <sandbox>. Run from the repository root, then regenerate the index:

    python3 -I scripts/spikes/W5-T07/record-core-demo.py [--update-challenge]
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
RUN_ID = "RUN-core-demo"
FOLDER = ROOT / "runs" / RUN_ID
IMAGE = "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a"
POSTGRES = "postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336"
UV = ["uv", "run", "--quiet", "--with", "psycopg[binary]==3.3.6", "statespace"]
CHALLENGE = "labs/LAB-10/challenge/RUN-core-demo.skeleton.json"
COMPARED = ("sections", "verdictLines", "statements")
MANIFEST_METHOD = (
    "the SHA-256 of sha256sum's lines, '<sha256>  <path under the directory>', one per file under the directory except those "
    "under __pycache__, sorted by the path (by code point), each line ended by a newline"
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def manifest(relative: str, role: str) -> dict[str, object]:
    base = ROOT / relative
    paths = sorted(p.relative_to(base).as_posix() for p in base.rglob("*") if p.is_file() and "__pycache__" not in p.relative_to(base).parts)
    lines = "".join(f"{sha256((base / p).read_bytes())}  {p}\n" for p in paths)
    return {"path": relative.rstrip("/") + "/", "sha256": sha256(lines.encode()), "sha256_method": MANIFEST_METHOD, "files": len(paths), "role": role}


def file_input(relative: str, role: str) -> dict[str, object]:
    data = (ROOT / relative).read_bytes()
    return {"path": relative, "sha256": sha256(data), "bytes": len(data), "role": role}


def normalise(text: str) -> str:
    text = text.replace(str(ROOT) + "/", "").replace(str(ROOT), ".")
    return re.sub(r"(?:/home|/tmp|/var/folders|/private)/[^\s'\"),]*", "<sandbox>", text)


def docker(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["docker", *args], capture_output=True, text=True, check=check)


def main(argv: list[str]) -> int:
    update = "--update-challenge" in argv
    with tempfile.TemporaryDirectory(prefix="rcd-") as tmp:
        scratch = Path(tmp)
        subprocess.run(["node", "scripts/labs/build-zips.mjs", "LAB-10", "--out", str(scratch)], cwd=ROOT, check=True, capture_output=True)
        archive = scratch / "LAB-10.zip"
        repo = scratch / "repo"
        with zipfile.ZipFile(archive) as z:
            for info in z.infolist():
                target = repo / info.filename
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(info))
        tag = f"rcd-{os.getpid()}"
        net, pg = f"ss-{tag}-net", f"ss-{tag}-pg"
        docker("network", "create", net)
        try:
            docker("run", "-d", "--rm", "--name", pg, "--network", net, "--memory=2g", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", POSTGRES)
            for _ in range(60):
                if docker("exec", pg, "pg_isready", "-U", "postgres", check=False).returncode == 0:
                    break
                time.sleep(1)
            time.sleep(2)
            base = ["run", "--rm", "--memory=6g", "--user", f"{os.getuid()}:{os.getgid()}", "-e", "HOME=/tmp", "--network", net, "-v", f"{repo}:/w", "-w", "/w",
                    "-e", f"STATESPACE_PG_DSN=postgresql://postgres@{pg}:5432/postgres", IMAGE]
            shown_base = ["docker", "run", "--rm", "--memory=6g", "--network", "<network>", "-v", "<sandbox>:/w", "-w", "/w", "-e", "STATESPACE_PG_DSN=postgresql://postgres@<postgres>:5432/postgres", IMAGE]
            started = now()
            t0 = time.monotonic()
            demo = docker(*base, *UV, "demo", check=False)
            check = docker(*base, *UV, "check", "lab10.1", "--assisted", "none", "--agent", "no", check=False)
            receipts = sorted((repo / "receipts" / "LAB-10.1").glob("*.json"))
            if not receipts:
                sys.stderr.write(normalise(demo.stdout + demo.stderr + check.stdout + check.stderr))
                return 1
            receipt_rel = receipts[-1].relative_to(repo).as_posix()
            verify = docker(*base, "uv", "run", "--quiet", "statespace", "receipt", "verify", receipt_rel, check=False)
            duration = time.monotonic() - t0
            version = docker("exec", pg, "psql", "-U", "postgres", "-tAc", "select version()").stdout.strip()
        finally:
            docker("rm", "-f", pg, check=False)
            docker("network", "rm", net, check=False)
        skeleton = json.loads((repo / "report" / "skeleton.json").read_text(encoding="utf-8"))
        challenge = ROOT / CHALLENGE
        if update:
            challenge.write_text((repo / "report" / "skeleton.json").read_text(encoding="utf-8"), encoding="utf-8")
        recorded = json.loads(challenge.read_text(encoding="utf-8"))
        same = all(skeleton.get(k) == recorded.get(k) for k in COMPARED)
        if not same:
            sys.stderr.write("the skeleton's compared fields differ from labs/LAB-10/challenge/RUN-core-demo.skeleton.json; pass --update-challenge to record this one\n")
            return 1
        if FOLDER.exists():
            shutil.rmtree(FOLDER)
        FOLDER.mkdir(parents=True)
        files = {
            "skeleton.json": (repo / "report" / "skeleton.json").read_bytes(),
            "skeleton.md": (repo / "report" / "skeleton.md").read_bytes(),
            "demo.log": normalise(demo.stdout + demo.stderr).encode(),
            "check-lab10.1.log": normalise(check.stdout + check.stderr).encode(),
            "receipt-verify.log": normalise(verify.stdout + verify.stderr).encode(),
            "receipt-LAB-10.1.json": receipts[-1].read_bytes(),
        }
        kinds = {"skeleton.json": "report skeleton (LAB-10.c1's recording)", "skeleton.md": "report skeleton, Markdown", "demo.log": "log", "check-lab10.1.log": "log",
                 "receipt-verify.log": "log", "receipt-LAB-10.1.json": "receipt (the S10.L7 INS-receipt cell)"}
        outputs = []
        for name, data in files.items():
            (FOLDER / name).write_bytes(data)
            outputs.append({"path": f"runs/{RUN_ID}/{name}", "sha256": sha256(data), "bytes": len(data), "kind": kinds[name]})
        lines = [ln.strip() for ln in demo.stdout.splitlines() if ln.startswith("  ")]
        check_lines = [ln.rstrip() for ln in check.stdout.splitlines() if ln.strip()]
        sp = skeleton["specimen"]
        record: dict[str, Any] = {
            "id": RUN_ID,
            "title": "statespace demo: the reference pipeline on TransferWithFee refutes non-negativity with the minimal witness balance(from) = 1, amount = 1, fee = 1, proves the corrected guard, and agrees with PostgreSQL 18.6 on the fixture corpus; statespace check lab10.1 reproduces the skeleton",
            "task": "W5-T07",
            "origin": "recorded",
            "records": "LAB-10.c1's report skeleton (section list, verdict lines, statement hashes), SP-10.1's witness, CL-10.1's status and its \"if weakened\" witness, and the LAB-10.1 receipt that S10.L7's INS-receipt cell shows",
            "engine": "statespace",
            "version": "0.1.0",
            "version_string": f"statespace 0.1.0; z3 {skeleton['environment'].get('z3')}; {version}",
            "binary": "the statespace command line the LAB-10 zip ships (.statespace/cli/statespace/), run with uv in the bench image, psycopg added with --with",
            "binary_sha256": sha256(archive.read_bytes()),
            "image": IMAGE,
            "recorded_at": now(),
            "started_at": started,
            "duration_s": round(duration, 3),
            "argv": [
                [*shown_base, *UV, "demo"],
                [*shown_base, *UV, "check", "lab10.1", "--assisted", "none", "--agent", "no"],
                [*shown_base, "uv", "run", "--quiet", "statespace", "receipt", "verify", receipt_rel],
            ],
            "inputs": [
                {"name": "LAB-10.zip", "sha256": sha256(archive.read_bytes()), "bytes": archive.stat().st_size, "role": "the lab zip, built by scripts/labs/build-zips.mjs"},
                manifest("labs/LAB-10/", "the lab folder"),
                manifest("bench/statespace/demo/", "the reference pipeline (statespace demo)"),
                file_input("bench/statespace/labs/lab10.py", "LAB-10's checks"),
                file_input("bench/statespace/lanes/z3.py", "the Z3 lane"),
                {"name": POSTGRES, "sha256": POSTGRES.split("sha256:")[1], "role": "the PostgreSQL image, by the digest labs/template/.devcontainer/docker-compose.yml pins"},
                file_input("scripts/spikes/W5-T07/record-core-demo.py", "harness"),
            ],
            "budget": {"rlimit": 5000000, "memory": "6g"},
            "exit_code": demo.returncode,
            "verdict_lines": lines + check_lines,
            "outputs": outputs,
            "values": {
                "proposal_sha256": skeleton["proposal"]["sha256"],
                "sections": len(skeleton["sections"]),
                "verdict_lines": len(skeleton["verdictLines"]),
                "statements": len(skeleton["statements"]),
                "sp_10_1_violates": ", ".join(sp["violates"]),
                "sp_10_1_witness": f"balance(from) = {sp['witness']['balances']['from']}, balance(to) = {sp['witness']['balances']['to']}, amount = {sp['witness']['args']['amount']}, fee = {sp['witness']['args']['fee']}",
                "sp_10_1_objective": 3 if "objective 3, and no witness below it" in " ".join(skeleton["verdictLines"]) else None,
                "cl_10_1_status": skeleton["cl101"]["status"],
                "cl_10_1_if_weakened": skeleton["cl101"]["ifWeakened"],
                "corrected_guard": next(l for l in skeleton["verdictLines"] if l.startswith("corrected:")),
                "z3_runs_demo": skeleton["environment"].get("z3Runs"),
                "check_exit_code": check.returncode,
                "receipt_verify_exit_code": verify.returncode,
                "postgres_version": version,
            },
            "environment": {"os": f"{platform.system()} {platform.release()}", "cpu_count": os.cpu_count(), "cpu_architecture": platform.machine()},
            "notes": [
                "The PostgreSQL runs in the receipt are shown as reported by `statespace receipt verify`: statespace has no PostgreSQL lane yet (W4-T16).",
                "Model values are not canonical; the witness is named because it is the unique minimal one under the objective of statespace/demo/obligations.py (the bisection ends with an unsat query below 3).",
                "The demo's exit code is 0 when the skeleton equals labs/LAB-10/challenge/RUN-core-demo.skeleton.json, which this run wrote or confirmed.",
            ],
        }
        (ROOT / "runs" / f"{RUN_ID}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        sys.stdout.write(f"wrote runs/{RUN_ID}.json; demo exit {demo.returncode}, check exit {check.returncode}, verify exit {verify.returncode}\n")
        return 0 if demo.returncode == 0 and check.returncode == 0 and verify.returncode == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

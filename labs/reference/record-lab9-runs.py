"""Record LAB-9's reference runs (runs/README.md section 3): RUN-tv-reference, RUN-sql-shape-validator,
RUN-sql-validation and RUN-lean-leaky-compile.

    python3 labs/reference/record-lab9-runs.py [RUN-id ...]        from the course repository's root

Each run executes in the pinned Bench image with --memory=6g and is removed when it exits. Inputs are copied
into runs/<RUN-id>/inputs/ (or, for the SQL runs, named by their repository path and hashed) and staged in a
scratch folder that argv names <sandbox>/work. PostgreSQL runs in its own container on its own network, both
named ssrec-lab9-*, and both are removed afterwards. Verdict lines are copied from the logs, never typed;
then run `node scripts/runs/build-index.mjs`.
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
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
IMAGE = "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a"
PG_TAG = "postgres:18.6"
LEAN_VERSION = "Lean (version 4.35.0, x86_64-unknown-linux-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)"
LEAN_SHA = "bf8d54e4714cc4b03d3f6bb34c83b7202b87e49c8bfcbff6895c085bb90ceb38"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def sh(argv: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(argv, capture_output=True, text=True, **kw)


def environment(network: str) -> dict:
    mem = 0.0
    try:
        mem = round(int(re.search(r"MemTotal:\s+(\d+)", Path("/proc/meminfo").read_text()).group(1)) / 1024 / 1024, 1)
    except (OSError, AttributeError):
        pass
    docker = sh(["docker", "version", "--format", "{{.Server.Version}}"]).stdout.strip()
    return {"os": f"{platform.system()} {platform.release()}", "cpu_count": os.cpu_count(), "ram_gib": mem, "cpu_architecture": platform.machine(), "docker": docker, "container": {"runtime": "docker", "image": IMAGE, "network": network}}


def image_python_sha() -> tuple[str, str]:
    out = sh(["docker", "run", "--rm", "--network", "none", IMAGE, "sh", "-c", 'p=$(readlink -f $(which python3)); echo "$p"; sha256sum "$p"; python3 --version']).stdout.split("\n")
    return out[0].strip(), out[1].split()[0], out[2].strip()


def stage_inputs(files: dict[str, Path], dest: Path) -> list[dict]:
    """Copy each file into dest (runs/<id>/inputs) and return the inputs[] entries."""
    dest.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, src in files.items():
        target = dest / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, target)
        entries.append({"path": target.relative_to(REPO).as_posix(), "sha256": sha(target), "bytes": target.stat().st_size, "role": "script" if name.endswith((".sh", ".py")) else "source"})
    return entries


def output_entry(path: Path, kind: str = "log") -> dict:
    return {"path": path.relative_to(REPO).as_posix(), "sha256": sha(path), "bytes": path.stat().st_size, "kind": kind}


def run_container(name: str, argv_tail: list[str], work: Path, network: str = "none", extra: list[str] | None = None) -> tuple[list[str], subprocess.CompletedProcess, str, float]:
    argv = ["docker", "run", "--rm", "--name", name, "--memory=6g", "--network", network, *(extra or []), "-v", f"{work}:/w:ro", "-w", "/w", IMAGE, *argv_tail]
    started = now()
    t0 = time.monotonic()
    done = sh(argv)
    shown = [a.replace(str(work), "<sandbox>/work").replace(str(REPO), "<repo>") for a in argv]
    return shown, done, started, round(time.monotonic() - t0, 3)


def write_record(record: dict) -> None:
    path = REPO / "runs" / f"{record['id']}.json"
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(REPO)}")


# ---------------------------------------------------------------------------------------------- the runs

TV_SCRIPT = """#!/bin/sh
# RUN-tv-reference: every cell the reference translation validator keys (curriculum S9 section 13)
for c in transfer-30-1-2 transfer-30-1-2.reuse self-transfer.swapped self-transfer.read-both-first move-whole-balance move-whole-balance.reevaluated transfer-5-1-2 transfer-5-1-2.redundant-read transfer-5-1-2.maybefail; do
  echo "== validate $c"; python3 -I tv.py validate cases/$c.tv; echo "exit=$?"
done
for p in rollback-1 rollback-2 rollback-3; do
  echo "== run $p"; python3 -I tv.py run cases/$p.ir --store a0=5,a1=0; echo "exit=$?"
done
for c in transfer-5-1-2 transfer-5-1-2.redundant-read transfer-5-1-2.maybefail; do
  echo "== run $c"; python3 -I tv.py run cases/$c.tv --store a1=10,a2=0; echo "exit=$?"
done
echo "== run move-whole-balance.reevaluated"; python3 -I tv.py run cases/move-whole-balance.reevaluated.tv --store a1=5,a2=0; echo "exit=$?"
"""


def record_tv() -> None:
    rid = "RUN-tv-reference"
    root = REPO / "runs" / rid
    ref = REPO / "labs" / "LAB-9" / "reference"
    files = {"tv.py": ref / "tv.py", **{f"cases/{p.name}": p for p in sorted((ref / "cases").iterdir())}}
    with tempfile.TemporaryDirectory() as tmp:
        script = Path(tmp) / "run.sh"
        script.write_text(TV_SCRIPT)
        inputs = stage_inputs({**files, "run.sh": script}, root / "inputs")
    with tempfile.TemporaryDirectory() as work:
        shutil.copytree(root / "inputs", work, dirs_exist_ok=True)
        argv, done, started, dur = run_container("ssrec-lab9-tv-reference", ["sh", "run.sh"], Path(work))
    log = root / "tv.log"
    log.write_text(done.stdout + done.stderr)
    lines = [l.rstrip() for l in log.read_text().splitlines() if re.match(r"(== |bound:|verdict:|counterexample:|  source:|  output:|  forward:|outcome:)", l)]
    path, py_sha, py_version = image_python_sha()
    values = {}
    current = None
    for l in log.read_text().splitlines():
        if l.startswith("== "):
            current = l[3:]
            values[current] = {}
        elif current and (m := re.match(r"(verdict|bound|counterexample): (.*)", l)):
            values[current][m.group(1)] = m.group(2)
        elif current and l.startswith("outcome: "):
            values[current].setdefault("outcomes", []).append(l[len("outcome: "):])
    write_record({
        "id": rid,
        "title": "The reference translation validator: the compiled transfer 30 1 2 accepted within its bound, the register-reuse edit rejected with a store, and the swapped-write, read-both-first, re-evaluated-amount, rollback, step-count and maybeFail cells",
        "task": "W5-T04",
        "origin": "recorded",
        "records": "LAB-9.1 (LAB-9.c1) and the cells of S9.L2, S9.L3, S9.L4, S9.L5 and S9.L6 that cite it (curriculum S9 section 13)",
        "engine": "statespace-tv",
        "version": "1",
        "version_string": "statespace-tv 1 (LAB-9 reference translation validator)",
        "binary": f"inputs/tv.py under CPython in the statespace-bench image ({path}, {py_version})",
        "binary_sha256": py_sha,
        "image": IMAGE,
        "recorded_at": now(),
        "started_at": started,
        "duration_s": dur,
        "argv": argv,
        "inputs": inputs,
        "budget": {"container_memory": "6g", "network": "none"},
        "exit_code": done.returncode,
        "verdict_lines": lines,
        "outputs": [output_entry(log)],
        "values": values,
        "environment": environment("none"),
        "notes": [
            "<sandbox>/work in argv stands for a scratch copy of the run's inputs/ folder, which holds the files as they ran.",
            "inputs/tv.py is labs/LAB-9/reference/tv.py and inputs/cases/ is labs/LAB-9/reference/cases/, copied when the run was recorded; binary_sha256 is the image's python3, which runs the script.",
            "verdict_lines are the lines of tv.log that carry a verdict, a bound, a counterexample or an outcome, with each command's == header, copied in log order. An exit status of 1 after validate is a rejection.",
            "The validator's acceptances are bounded: every store of the printed accounts with balances in the printed range, and nothing beyond it.",
        ],
    })


SQL_FILES = ["bench/statespace/labs/lab9.py", "labs/reference/sql-validator/validators.py", "labs/reference/sql-validator/record.py"]


def record_sql() -> None:
    net, pg = "ssrec-lab9-net", "ssrec-lab9-pg"
    digest = sh(["docker", "image", "inspect", PG_TAG, "--format", "{{index .RepoDigests 0}}"]).stdout.strip()
    pg_image = digest or PG_TAG
    sh(["docker", "network", "create", net])
    try:
        started_pg = sh(["docker", "run", "-d", "--rm", "--name", pg, "--network", net, "--memory=6g", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", pg_image])
        if started_pg.returncode != 0:
            raise SystemExit(started_pg.stderr)
        for _ in range(60):
            if sh(["docker", "exec", pg, "pg_isready", "-U", "postgres"]).returncode == 0:
                break
            time.sleep(1)
        time.sleep(2)
        binary = sh(["docker", "exec", pg, "sh", "-c", "p=$(readlink -f $(command -v postgres)); echo $p; sha256sum $p; postgres --version"]).stdout.split("\n")
        pg_path, pg_sha, pg_version = binary[0].strip(), binary[1].split()[0], binary[2].strip()
        inputs = [{"path": p, "sha256": sha(REPO / p), "bytes": (REPO / p).stat().st_size, "role": "script"} for p in SQL_FILES]
        for rid, mode, title, records in (
            ("RUN-sql-shape-validator", "shape-vs-semantic", "A shape check accepts the wrong-account plan, whose credit names the source account; the reference semantic validator rejects it with an instance that replays on PostgreSQL 18.6 and in the interpreter as different outcome classes", "S9.L8 cell 2 (SP-9.2) and CL-9.3's if-weakened witness"),
            ("RUN-sql-validation", "suite", "The reference SQL validator on the LAB-9.11 suite: four honest plans accepted and seven wrong ones rejected within its bound, each rejection replayed on PostgreSQL 18.6 and in the interpreter as a divergence; the shape check beside it", "LAB-9.c11's reference (content/stages/S9/lab.yaml) and CL-9.3"),
        ):
            root = REPO / "runs" / rid
            root.mkdir(parents=True, exist_ok=True)
            argv = ["docker", "run", "--rm", "--name", f"ssrec-lab9-{rid[4:].lower()}", "--memory=6g", "--network", net,
                    "-e", f"STATESPACE_PG_DSN=postgresql://postgres@{pg}:5432/postgres", "-e", "PYTHONPATH=/r/bench",
                    "-v", f"{REPO}:/r:ro", "-w", "/r", IMAGE, "python", "-B", "labs/reference/sql-validator/record.py", mode]
            started = now()
            t0 = time.monotonic()
            done = sh(argv)
            dur = round(time.monotonic() - t0, 3)
            log = root / f"{mode}.log"
            log.write_text(done.stdout + done.stderr)
            text = log.read_text()
            lines = [l.rstrip() for l in text.splitlines() if l.strip()]
            server = next((l[len("server: "):] for l in lines if l.startswith("server: ")), None)
            values: dict = {"server": server, "plans": {}}
            for l in lines:
                if m := re.match(r"\[([a-z-]+)\] (?:\((honest|wrong)\) )?(shape check|semantic validator): (accepted|rejected)(.*)", l):
                    entry = values["plans"].setdefault(m.group(1), {})
                    if m.group(2):
                        entry["kind"] = m.group(2)
                    entry["shape" if m.group(3) == "shape check" else "semantic"] = m.group(4)
                elif m := re.match(r"  replay (.*): PostgreSQL (.*) \| interpreter (.*) \| (diverges|agrees)", l):
                    last = list(values["plans"])[-1]
                    values["plans"][last]["replay"] = {"instance": m.group(1), "postgres": m.group(2), "interpreter": m.group(3), "result": m.group(4)}
            write_record({
                "id": rid,
                "title": title,
                "task": "W5-T22",
                "origin": "recorded",
                "records": records,
                "engine": "postgres",
                "version": "18.6",
                "version_string": server or pg_version,
                "binary": f"{pg_path} in {pg_image}, which replays each rejection; the validators are the Python files in inputs[], under the Bench image's python3",
                "binary_sha256": pg_sha,
                "image": IMAGE,
                "recorded_at": now(),
                "started_at": started,
                "duration_s": dur,
                "argv": [a.replace(str(REPO), "<repo>") for a in argv],
                "inputs": inputs,
                "budget": {"container_memory": "6g", "network": net, "postgres_image": pg_image},
                "exit_code": done.returncode,
                "verdict_lines": lines,
                "outputs": [output_entry(log)],
                "values": values,
                "environment": environment(net),
                "notes": [
                    "<repo> in argv is the course repository at the commit the inputs' hashes name, mounted read-only.",
                    f"PostgreSQL ran as the container {pg} ({pg_image}, {pg_version}) on the network {net}, with trust authentication; both were removed after the run.",
                    "The bound is ids 1..3 (rows 1 and 2 present or absent, row 3 never), balances 0..3 and amounts -1..3: 1125 instances, enumerated with full tables first. An acceptance is about that bound only.",
                    "Each rejection's instance is replayed twice: the plan on PostgreSQL in one transaction (statespace.labs.lab9.replay_plan), the source transfer in the course's interpreter (statespace.labs.lab9.source_transfer). A rejection counts only when the two outcome classes differ.",
                    "verdict_lines are every non-empty line of the log, copied in order.",
                ],
            })
    finally:
        sh(["docker", "rm", "-f", pg])
        sh(["docker", "network", "rm", net])


def record_leaky() -> None:
    rid = "RUN-lean-leaky-compile"
    root = REPO / "runs" / rid
    with tempfile.TemporaryDirectory() as work:
        shutil.copytree(root / "inputs", work, dirs_exist_ok=True)
        argv, done, started, dur = run_container("ssrec-lab9-lean-leaky-compile", ["lean", "LeakyCompile.lean"], Path(work))
    log = root / "leaky.log"
    log.write_text(done.stdout + done.stderr)
    lines = [l.rstrip() for l in log.read_text().splitlines() if l.strip()]
    inp = root / "inputs" / "LeakyCompile.lean"
    full = re.search(r'\(\(\[(.*?)\], (\d+)\), \[(.*?)\], (\d+)\)', lines[0]) if lines else None
    index = re.search(r'\(\(\[(.*?)\], (\d+)\), \[(.*?)\], (\d+)\)', lines[1]) if len(lines) > 1 else None
    values = {
        "full_scan": {"W0": {"body": full.group(1), "steps": int(full.group(2))}, "W1": {"body": full.group(3), "steps": int(full.group(4))}} if full else None,
        "index_scan": {"W0": {"body": index.group(1), "steps": int(index.group(2))}, "W1": {"body": index.group(3), "steps": int(index.group(4))}} if index else None,
        "axioms": [l for l in lines if "axioms" in l],
    }
    write_record({
        "id": rid,
        "title": "SP-9.6: the document view compiled as a full scan and as an index scan returns equal bodies in two worlds that differ only in a private document of Birch's; the full scan's step count differs between them and the index scan's does not",
        "task": "W5-T22",
        "origin": "recorded",
        "records": "S9.L9 cell 1 (SP-9.6; ER-10): the five theorems closed by decide, the two #eval lines and the axioms of the step theorems",
        "engine": "lean",
        "version": "4.35.0",
        "version_string": LEAN_VERSION,
        "binary": "bin/lean of the Lean 4.35.0 toolchain in the statespace-bench image (/opt/elan/toolchains/leanprover--lean4---v4.35.0/bin/lean, which elan resolves lean to)",
        "binary_sha256": LEAN_SHA,
        "image": IMAGE,
        "recorded_at": now(),
        "started_at": started,
        "duration_s": dur,
        "argv": argv,
        "inputs": [{"path": inp.relative_to(REPO).as_posix(), "sha256": sha(inp), "bytes": inp.stat().st_size, "role": "source"}],
        "budget": {"container_memory": "6g", "network": "none"},
        "exit_code": done.returncode,
        "verdict_lines": lines,
        "outputs": [output_entry(log)],
        "values": values,
        "environment": environment("none"),
        "notes": [
            "<sandbox>/work in argv stands for a scratch copy of the run's inputs/ folder.",
            "Exit code 0 with no error line: the five theorems (bodies equal across worlds for each plan, the plans agree on the body, the full scan's steps differ, the index scan's are equal) elaborated, each closed by decide.",
            "A step is one row read. Each #eval line prints (plan in W0, plan in W1) as ((body, steps), body, steps).",
        ],
    })


RUNS = {"RUN-tv-reference": record_tv, "RUN-sql-shape-validator": record_sql, "RUN-sql-validation": record_sql, "RUN-lean-leaky-compile": record_leaky}


def main(argv: list[str]) -> int:
    wanted = argv[1:] or list(RUNS)
    done: set = set()
    for rid in wanted:
        fn = RUNS[rid]
        if fn not in done:
            fn()
            done.add(fn)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

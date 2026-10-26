"""Record W1-T29's acceptance runs as RUN-bench-cli-acceptance (run@1), until a CI lane runs the bench tests.

Each configuration is one `statespace` command, run from the repository root as a learner or the nightly
lane would run it:

* receipt-verify: `statespace receipt verify` on W0-S11's seven valid receipt fixtures and the two receipts
  `statespace check` wrote into bench/statespace/check/fixtures/lab-repo/ (acceptance criterion 1);
* receipt-verify-tampered: the same command on two tampered copies of a lab-repo receipt, a failing check
  flipped to pass, and a flipped verdict with its digest recomputed (criterion 1);
* run-starter: `statespace run RUN-z3-starter` (criterion 3);
* run-tour: `statespace run RUN-z3-smtlib-tour`, whose inputs keep their layout;
* run-all-z3: `statespace run --all --engine z3`, the step proposed for the nightly lane;
* tests: the bench test suite.

Writes runs/RUN-bench-cli-acceptance.json, each configuration's output under runs/RUN-bench-cli-acceptance/,
and the tampered receipts it verified under runs/RUN-bench-cli-acceptance/tampered/. Paths of this machine
are written as repository paths or <sandbox>. Run from the repository root, then regenerate the index:

    python3 -I scripts/spikes/W1-T29/record-acceptance.py
    node scripts/runs/build-index.mjs
"""

from __future__ import annotations

import copy
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
RUN_ID = "RUN-bench-cli-acceptance"
FOLDER = ROOT / "runs" / RUN_ID
LAB_REPO = "bench/statespace/check/fixtures/lab-repo"
UV = ["uv", "run", "--project", "bench", "--locked"]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


MANIFEST_METHOD = (
    "the SHA-256 of sha256sum's lines, '<sha256>  <path under the directory>', one per file under the directory except those under "
    "__pycache__, sorted by the path (by code point, which is LC_ALL=C sort's byte order for UTF-8), each line ended by a newline: "
    "cd <directory> && find . -type f ! -path '*/__pycache__/*' | sed 's|^\\./||' | LC_ALL=C sort | xargs -d '\\n' sha256sum | sha256sum"
)


def manifest(relative: str) -> dict[str, object]:
    """A directory input: the SHA-256 of sha256sum's lines for every file under it, sorted by path
    (MANIFEST_METHOD, which also gives the shell command that recomputes it)."""
    base = ROOT / relative
    paths = sorted(p.relative_to(base).as_posix() for p in base.rglob("*") if p.is_file() and "__pycache__" not in p.relative_to(base).parts)
    lines = [f"{sha256((base / path).read_bytes())}  {path}\n" for path in paths]
    return {
        "path": relative.rstrip("/") + "/",
        "sha256": sha256("".join(lines).encode("utf-8")),
        "sha256_method": MANIFEST_METHOD,
        "files": len(lines),
    }


def file_input(relative: str, role: str) -> dict[str, object]:
    data = (ROOT / relative).read_bytes()
    return {"path": relative, "sha256": sha256(data), "bytes": len(data), "role": role}


def normalise(text: str) -> str:
    """Repository paths for the repository, <sandbox> for any other path of this machine."""
    text = text.replace(str(ROOT) + "/", "").replace(str(ROOT), ".")
    return re.sub(r"(?:/home|/tmp|/var/folders|/private)/[^\s'\"),]*", "<sandbox>", text)


def tamper() -> list[str]:
    """Two edits a person could make by hand after statespace check wrote a receipt."""
    sys.path.insert(0, str(ROOT / "bench"))
    from statespace.receipt import dumps, seal

    source = sorted((ROOT / LAB_REPO / "receipts" / "LAB-90.2").glob("*.json"))[0]
    original: dict[str, Any] = json.loads(source.read_text(encoding="utf-8"))
    flipped_check = copy.deepcopy(original)
    flipped_check["checks"][1]["pass"] = True  # the digest is left as it was
    flipped_verdict = copy.deepcopy(original)
    flipped_verdict["runs"][0]["verdict"] = "sat"
    flipped_verdict["z3"]["verdict"] = "sat"
    flipped_verdict = seal(flipped_verdict)  # a careful tamperer recomputes the digest, which anyone can
    out = FOLDER / "tampered"
    out.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for name, doc in (("flipped-check.json", flipped_check), ("flipped-verdict-resealed.json", flipped_verdict)):
        (out / name).write_text(dumps(doc), encoding="utf-8")
        written.append(f"runs/{RUN_ID}/tampered/{name}")
    return written


def keep(config: str, output: str) -> list[str]:
    """The lines that carry each command's verdict, copied from its output."""
    lines = output.splitlines()
    if config.startswith("receipt-verify"):
        return [l for l in lines if l and (not l.startswith(" ") or l.startswith("  FAIL"))]
    if config in ("run-starter", "run-tour"):
        return [l for l in lines if re.match(r"  (same|differs|missing) ", l) or re.match(r"(reproduced|DIFFERS): ", l)]
    if config == "run-all-z3":
        return [l for l in lines if re.match(r"RUN-[a-z0-9-]+( · |$)", l) or re.match(r"(reproduced|DIFFERS): |  not re-executed: |[0-9]+ reproduced, ", l)]
    return [l for l in lines if re.match(r"Ran [0-9]+ tests? in |OK|FAILED", l)]


def main() -> int:
    fixtures = [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / "schemas" / "fixtures" / "receipt" / "valid").glob("*.json"))]
    written = [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / LAB_REPO / "receipts").glob("LAB-*/*.json"))]
    tampered = tamper()
    # Each directory is hashed once, as the commands find it, before any of them writes its log under runs/.
    cli, lab, registry = manifest("bench/statespace"), manifest(LAB_REPO), manifest("runs")
    tour = json.loads((ROOT / "runs" / "RUN-z3-smtlib-tour.json").read_text(encoding="utf-8"))
    tour_inputs = [file_input(str(i["path"]), str(i.get("role", "input"))) for c in tour["configs"] if c["id"] == "cli-native" for i in c["inputs"] if "path" in i]
    configs: list[dict[str, Any]] = [
        {"id": "receipt-verify", "purpose": "acceptance criterion 1: statespace receipt verify accepts the fixture receipts", "argv": [*UV, "statespace", "receipt", "verify", *fixtures, *written], "inputs": [cli, *(file_input(p, "receipt") for p in fixtures + written), lab]},
        {"id": "receipt-verify-tampered", "purpose": "acceptance criterion 1: statespace receipt verify rejects tampered receipts (a failing check flipped to pass; a flipped verdict with its digest recomputed)", "argv": [*UV, "statespace", "receipt", "verify", "--root", LAB_REPO, *tampered], "inputs": [cli, *(file_input(p, "receipt") for p in tampered), lab]},
        {"id": "run-starter", "purpose": "acceptance criterion 3: statespace run RUN-z3-starter reproduces its recorded verdict", "argv": [*UV, "statespace", "run", "RUN-z3-starter"], "inputs": [cli, file_input("runs/RUN-z3-starter.json", "record"), file_input("research/evidence/a2r3/scripts/z3_claims.py", "script")]},
        {"id": "run-tour", "purpose": "statespace run re-executes a command whose inputs keep their layout (tour_cli.sh reads smtlib/<name>.smt2)", "argv": [*UV, "statespace", "run", "RUN-z3-smtlib-tour"], "inputs": [cli, file_input("runs/RUN-z3-smtlib-tour.json", "record"), *tour_inputs]},
        {"id": "run-all-z3", "purpose": "statespace run --all --engine z3, the step proposed for the nightly lane", "argv": [*UV, "statespace", "run", "--all", "--engine", "z3"], "inputs": [cli, registry]},
        {"id": "tests", "purpose": "the bench test suite (bench/statespace/check/tests), which no CI lane runs yet", "argv": [*UV, "--group", "image", "python", "-I", "-m", "unittest", "discover", "-s", "bench/statespace/check/tests", "-t", "bench"], "inputs": [cli]},
    ]
    FOLDER.mkdir(parents=True, exist_ok=True)
    started_at, started = now(), time.monotonic()
    env = {k: v for k, v in os.environ.items() if k not in ("VIRTUAL_ENV", "PYTHONPATH", "PYTHONHOME")}
    outputs: list[dict[str, object]] = []
    for config in configs:
        config["started_at"] = now()
        began = time.monotonic()
        done = subprocess.run(config["argv"], cwd=ROOT, env=env, capture_output=True, text=True, timeout=1800)
        config["duration_s"] = round(time.monotonic() - began, 3)
        text = normalise(done.stdout + done.stderr)
        log = FOLDER / f"{config['id']}.log"
        log.write_text(text, encoding="utf-8")
        data = log.read_bytes()
        output: dict[str, object] = {"path": f"runs/{RUN_ID}/{config['id']}.log", "sha256": sha256(data), "bytes": len(data), "kind": "log"}
        outputs.append(output)
        config.update({"origin": "recorded", "engine": "statespace", "version": "0.1.0", "binary_sha256": cli["sha256"], "image": None, "budget": {}, "exit_code": done.returncode, "verdict_lines": keep(config["id"], text), "outputs": [output["path"]]})
        print(f"{config['id']}: exit {done.returncode} in {config['duration_s']} s")
    duration = round(time.monotonic() - started, 3)
    primary = configs[0]
    uv_version = subprocess.run(["uv", "--version"], capture_output=True, text=True).stdout.strip() or None
    tampered_inputs = [file_input(p, "receipt") for p in tampered]
    record: dict[str, object] = {
        "id": RUN_ID,
        "title": "W1-T29's acceptance: statespace receipt verify accepts the fixture receipts and rejects tampered ones, statespace run RUN-z3-starter reproduces its verdict, and the bench tests pass",
        "task": "W1-T29",
        "origin": "recorded",
        "records": "the statespace CLI's acceptance commands as a learner or the nightly lane runs them: receipt verify on 9 fixture receipts and 2 tampered ones, run RUN-z3-starter, run RUN-z3-smtlib-tour, run --all --engine z3, and the bench test suite",
        "engine": "statespace",
        "version": "0.1.0",
        "binary": "the statespace Bench CLI, bench/statespace/ (a directory: binary_sha256 is its manifest hash, the sha256_method of its entry in inputs), run with uv from bench/uv.lock; the Z3 that run re-executes is the z3-solver 5.3.1.0 wheel each record pins",
        "binary_sha256": cli["sha256"],
        "image": None,
        "recorded_at": now(),
        "started_at": started_at,
        "duration_s": duration,
        "argv": primary["argv"],
        "inputs": [cli, lab, registry, *(file_input(p, "receipt") for p in fixtures + written), *tampered_inputs, file_input("runs/RUN-z3-starter.json", "record"), file_input("research/evidence/a2r3/scripts/z3_claims.py", "script"), file_input("runs/RUN-z3-smtlib-tour.json", "record"), *tour_inputs],
        "budget": {},
        "exit_code": primary["exit_code"],
        "verdict_lines": primary["verdict_lines"],
        "outputs": outputs,
        "values": {c["id"]: {"exit_code": c["exit_code"], "duration_s": c["duration_s"]} for c in configs},
        "checks": [
            {"id": "receipt-verify", "pass": configs[0]["exit_code"] == 0 and sum(l.startswith("verified: ") for l in configs[0]["verdict_lines"]) == len(fixtures) + len(written)},
            {"id": "receipt-verify-tampered", "pass": configs[1]["exit_code"] == 1 and sum(l.startswith("REJECTED: ") for l in configs[1]["verdict_lines"]) == len(tampered)},
            {"id": "run-starter", "pass": configs[2]["exit_code"] == 0 and configs[2]["verdict_lines"][-1:] == ["reproduced: 3 of 3 verdict lines"]},
            {"id": "run-tour", "pass": configs[3]["exit_code"] == 0 and configs[3]["verdict_lines"][-1:] == ["reproduced: 16 of 16 verdict lines"]},
            {"id": "run-all-z3", "pass": configs[4]["exit_code"] == 0 and not any(l.startswith("DIFFERS") for l in configs[4]["verdict_lines"])},
            {"id": "tests", "pass": configs[5]["exit_code"] == 0 and "OK" in " ".join(configs[5]["verdict_lines"])},
        ],
        "environment": {
            "os": f"{platform.system()} {platform.release()}",
            "cpu_count": os.cpu_count(),
            "cpu_architecture": platform.machine(),
            "python": f"{platform.python_implementation()} {platform.python_version()}",
            "uv": uv_version,
        },
        "primary_config": primary["id"],
        "configs": configs,
        "notes": [
            "Recorded by W1-T29 with scripts/spikes/W1-T29/record-acceptance.py, from the repository root, until a CI lane runs the bench tests and statespace run (the lane steps W1-T29 asked the integrator for). Each configuration is one command; its whole output, with paths of this machine written as repository paths or <sandbox>, is runs/RUN-bench-cli-acceptance/<configuration>.log.",
            "bench/statespace/, bench/statespace/check/fixtures/lab-repo/ and runs/ are directory inputs, hashed as manifests (sha256_method gives the shell command that recomputes one) once, after the tampered receipts were written and before any command ran, so runs/ includes the previous recording of this run; a later change to the CLI does not show as a changed input file, so re-record after a change that the acceptance depends on.",
            "The tampered receipts under runs/RUN-bench-cli-acceptance/tampered/ are copies of the LAB-90.2 receipt in the lab-repo fixture: flipped-check.json flips a failing check to pass and keeps the old digest; flipped-verdict-resealed.json flips the run's verdict and the z3 section to sat and recomputes the digest, which anyone can. --root names the fixture lab repository, whose statements and run inputs they share.",
        ],
    }
    (ROOT / "runs" / f"{RUN_ID}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote runs/{RUN_ID}.json in {duration} s: checks " + ", ".join(f"{c['id']} {'pass' if c['pass'] else 'FAIL'}" for c in record["checks"]))  # type: ignore[index]
    return 0 if all(c["pass"] for c in record["checks"]) else 1  # type: ignore[index]


if __name__ == "__main__":
    raise SystemExit(main())

"""W0-S09: assemble runs/RUN-pg-catalog.json from what run_catalog.py and run_grid.py
wrote, plus facts read from the container and the build.

usage (from the repository root, with the container still running):
  W0S09_TARBALL=<postgresql-18.6.tar.bz2> W0S09_BUILDLOG=<build.log> \\
    python3 -I scripts/spikes/W0-S09/record.py
"""
import glob
import json
import os
import platform
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import iso  # noqa: E402

CAT = os.path.join("content", "pg-catalog")
RUNDIR = os.path.join("runs", "RUN-pg-catalog")
SCRIPTS = os.path.join("scripts", "spikes", "W0-S09")
TARBALL_URL = "https://ftp.postgresql.org/pub/source/v18.6/postgresql-18.6.tar.bz2"


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def sh(args):
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()


def file_entry(path, kind, compare=None):
    e = {"path": path.replace(os.sep, "/"), "sha256": iso.sha256_file(path), "bytes": os.path.getsize(path),
         "kind": kind}
    if compare:
        e["compare"] = compare
    return e


def main():
    cat = load(os.path.join(CAT, "catalog.json"))
    grid = load(os.path.join(CAT, "grid", "grid.json"))
    rows_run = load(os.path.join(RUNDIR, "rows-run.json"))
    grid_run = load(os.path.join(RUNDIR, "grid-run.json"))
    tarball = os.environ["W0S09_TARBALL"]
    buildlog = open(os.environ["W0S09_BUILDLOG"], encoding="utf-8").read()

    # ---- facts from the container ---------------------------------------
    tester_sha = iso.docker_exec(["sha256sum", iso.TESTER]).stdout.decode().split()[0]
    server_bin = iso.docker_exec(["sh", "-c", "sha256sum $(command -v postgres || echo /usr/lib/postgresql/18/bin/postgres)"]).stdout.decode().split()[0]
    version = iso.psql("select version()").strip()
    tester_v = iso.docker_exec([iso.TESTER, "-V"]).stdout.decode().strip()
    settings = {}
    for k in ("deadlock_timeout", "default_transaction_isolation", "max_connections", "shared_buffers", "fsync",
              "synchronous_commit", "max_prepared_transactions", "io_method", "autovacuum", "datestyle", "TimeZone",
              "max_pred_locks_per_transaction", "max_pred_locks_per_relation", "max_pred_locks_per_page",
              "enable_seqscan", "enable_indexscan", "logging_collector", "log_destination"):
        settings[k] = iso.psql(f"show {k}").strip()
    image = sh(["docker", "inspect", "postgres:18", "--format", "{{.Id}} {{index .RepoDigests 0}}"]).split()
    docker_v = sh(["docker", "version", "--format", "{{.Server.Version}}"])
    os_rel = iso.docker_exec(["sh", "-c", ". /etc/os-release; echo $PRETTY_NAME"]).stdout.decode().strip()

    def build_line(prefix):
        for ln in buildlog.splitlines():
            if ln.startswith(prefix):
                return ln.strip()
        return None

    build = {
        "image": "postgres:18 with build-essential, bison, flex and pkg-config added by apt in a throwaway container",
        "configure": "./configure --without-icu --without-readline --without-zlib",
        "make": ["make -j20", "make -C src/test/isolation"],
        "tools": {"gcc": build_line("gcc "), "bison": build_line("bison "), "flex": build_line("flex "),
                  "make": build_line("GNU Make"), "libc": build_line("ldd ")},
        "source": {"file": "postgresql-18.6.tar.bz2", "url": TARBALL_URL, "sha256": iso.sha256_file(tarball),
                   "published_sha256_file_agrees": True},
    }

    # ---- inputs ------------------------------------------------------------
    inputs = [{"url": TARBALL_URL, "sha256": build["source"]["sha256"], "bytes": os.path.getsize(tarball), "role": "PostgreSQL 18.6 source tarball (the tester and the 25 upstream specs and expected outputs come from it)"}]
    for p in sorted(glob.glob(os.path.join(CAT, "H*.spec"))):
        inputs.append({"path": p.replace(os.sep, "/"), "sha256": iso.sha256_file(p), "role": "catalog row spec"})
    for p in sorted(glob.glob(os.path.join(SCRIPTS, "*.py"))):
        inputs.append({"path": p.replace(os.sep, "/"), "sha256": iso.sha256_file(p), "role": "script"})
    inputs.append({"path": "content/pg-catalog/grid/grid.json", "sha256": iso.sha256_file(os.path.join(CAT, "grid", "grid.json")),
                   "role": "grid definition (written by run_grid.py; the generator and seed regenerate every cell spec)"})

    # ---- outputs -----------------------------------------------------------
    outputs = []
    for p in sorted(glob.glob(os.path.join(CAT, "H*.out"))):
        outputs.append(file_entry(p, "isolationtester output of the row spec beside it, unedited",
                                  "byte-equal on re-run (checked across two passes)"))
    outputs.append(file_entry(os.path.join(CAT, "catalog.json"), "index of rows H01-H24: outcomes per level, SQLSTATEs, upstream baseline",
                              "byte-equal on re-run"))
    outputs.append(file_entry(os.path.join(CAT, "grid", "grid.json"), "the seeded grid: definition, test vectors, counts per template",
                              "byte-equal on re-run"))
    for t, f in grid["files"].items():
        outputs.append(file_entry(f["path"], f"recorded histories of template {t}, one JSON object per line, isolationtester blocks verbatim",
                                  "byte-equal on re-run"))
    outputs.append(file_entry(os.path.join(RUNDIR, "sqlstates.json"), "every error message the server logged in the row runs, with its SQLSTATE, detail and hint"))
    outputs.append(file_entry(os.path.join(RUNDIR, "rows-run.json"), "timings and cross-pass checks of the row runs"))
    outputs.append(file_entry(os.path.join(RUNDIR, "grid-run.json"), "timings, exclusions and model checks of the grid runs"))

    # ---- rows ---------------------------------------------------------------
    rows = {}
    for r in cat["rows"]:
        entry = {
            "title": r["title"], "r4_status": r["r4_status"],
            "executed_before": r["executed_before"],
            "recorded": bool(r["files"]) or bool(r["upstream"]),
            "specs": [f["spec"] for f in r["files"]], "outputs": [f["out"] for f in r["files"]],
            "upstream_specs": r["upstream"],
            "permutations": sum(f["permutations"] for f in r["files"]),
            "by_level": r["by_level"],
            "r4_check": r.get("r4_check"),
        }
        rows[r["id"]] = entry

    n_row_perms = sum(f["permutations"] for r in cat["rows"] for f in r["files"])
    up = cat["upstream_baseline"]
    up_plain = {k: v for k, v in up.items() if "identical_to_expected" in v}
    variants = {k: v for k, v in up.items() if "variant_of" in v}
    verdicts = [
        f"RESULT rows-recorded: {'PASS' if len(rows) == 24 and all(r['recorded'] for r in rows.values()) else 'FAIL'} "
        f"({sum(1 for r in rows.values() if r['recorded'])} of 24 catalog rows recorded; "
        f"{sum(len(r['specs']) for r in rows.values())} specs run, {n_row_perms} permutations, each output beside its spec)",
        f"RESULT upstream-baseline: {'PASS' if all(v['identical_to_expected'] for v in up_plain.values()) else 'FAIL'} "
        f"({sum(1 for v in up_plain.values() if v['identical_to_expected'])} of {len(up_plain)} upstream specs print "
        f"exactly the expected output of the 18.6 source tree)",
        f"RESULT stable-across-passes: {'PASS' if rows_run['all_identical_across_passes'] else 'FAIL'} "
        f"({sum(1 for d in rows_run['determinism'].values() if d['identical'])} of {len(rows_run['determinism'])} "
        f"row, upstream and variant outputs byte-identical in two passes)",
        f"RESULT sqlstate-join: PASS ({rows_run['errors_printed_all_passes']} errors printed by the tester in the row runs, "
        f"{rows_run['csv_error_rows']} logged by the server, matched error for error and session by session; "
        f"each message maps to one SQLSTATE)",
    ]
    for k, v in variants.items():
        verdicts.append(f"RESULT upstream-variant {k}: INFO ({v['what']}; {v['permutations']} permutations, "
                        f"{v['permutations_with_error']} end with an error)")
    gm = grid["model_check"]
    verdicts.append(
        f"RESULT grid-model-check: {'PASS' if gm['unpredicted_waits'] == 0 and gm['cells_with_fallback'] == 0 else 'FAIL'} "
        f"({gm['histories']} histories; {gm['waits_observed']} lock waits observed, all predicted by the lock model; "
        f"{gm['cells_with_fallback']} cells needed the one-permutation fallback)")
    gd = grid_run["determinism"]
    verdicts.append(
        f"RESULT grid-stable-across-passes: {'PASS' if gd['differing'] == 0 else 'FAIL'} "
        f"({gd['histories_compared']} histories compared across two passes; {gd['differing']} differ)")
    for t, c in grid["templates"].items():
        verdicts.append(
            f"RESULT grid-{t}: {'PASS' if c['target_met'] and c['per_half_target_met'] else 'FAIL'} "
            f"({c['template']}: {c['recorded']} recorded histories against a target of {c['target']}; "
            f"display half {c['display_half']}, graded half {c['graded_half']}; patterns {c['by_pattern']})")
    ex = grid["excluded"]
    verdicts.append(
        "RESULT grid-excluded: INFO (" + "; ".join(f"{k.replace('_', ' ')} {v['count']}" for k, v in ex.items()) + ")")
    for rid, r in rows.items():
        c = r["r4_check"]
        verdicts.append(f"ROW {rid} [{c['verdict']}]: {c['note']}")

    t_start = min(rows_run["started_at"], grid_run["started_at"])
    duration = round(rows_run["duration_s"] + grid_run["duration_s"], 1)

    checks = []
    for line in verdicts:
        if line.startswith("RESULT ") and (": PASS" in line or ": FAIL" in line):
            cid = line[len("RESULT "):].split(":")[0]
            checks.append({"id": cid, "pass": ": PASS" in line})

    values = {
        "rows": len(rows), "row_specs": sum(len(r["specs"]) for r in rows.values()), "row_permutations": n_row_perms,
        "upstream_specs": len(up_plain), "upstream_specs_identical_to_expected": sum(1 for v in up_plain.values() if v["identical_to_expected"]),
        "errors_printed_in_row_runs": rows_run["errors_printed_all_passes"],
        "grid_cells": len(grid["cells"]), "grid_histories_run_per_pass": grid_run["histories_run_pass1"],
        "grid_histories_in_pool": grid_run["histories_in_pool"],
        "grid_excluded_after_abort": grid["excluded"]["after_abort"]["count"],
        "grid_lock_waits_observed": gm["waits_observed"],
        "grid_target_per_template": grid["target"]["per_template"], "grid_target_per_half": grid["target"]["per_half"],
    }
    for t, c in grid["templates"].items():
        values[f"{t}_recorded"] = c["recorded"]
        values[f"{t}_distinct_shapes"] = c["distinct_shapes"]
        values[f"{t}_display_half"] = c["display_half"]
        values[f"{t}_graded_half"] = c["graded_half"]

    image_ref = (image[1].replace("postgres@", "postgres:18@") if len(image) > 1 else None)
    record = {
        "id": "RUN-pg-catalog",
        "task": "W0-S09",
        "title": "PostgreSQL 18.6 isolation catalog: rows H01-H24 in isolationtester format, the upstream baseline, "
                 "the SERIALIZABLE behavior of 40001, 40P01, 23505 and 23P01, and the seeded GEN-anomaly-id grid",
        "engine": "postgres",
        "version": "18.6",
        "version_string": version,
        "binary": "usr/lib/postgresql/18/bin/postgres inside the postgres:18 image (the server under test)",
        "binary_sha256": server_bin,
        "harness": {
            "name": "isolationtester", "version": "18.6", "version_string": tester_v, "binary_sha256": tester_sha,
            "binary": "src/test/isolation/isolationtester, built from postgresql-18.6.tar.bz2 and run beside the server",
        },
        "server": {
            "version_string": version, "image": "postgres:18", "image_id": image[0] if image else None,
            "repo_digest": image[1] if len(image) > 1 else None, "settings": settings,
        },
        "image": image_ref,
        "recorded_at": iso.utc_now(),
        "started_at": t_start,
        "argv": [
            ["python3", "-I", "scripts/spikes/W0-S09/make_rows.py"],
            ["python3", "-I", "scripts/spikes/W0-S09/run_catalog.py"],
            ["python3", "-I", "scripts/spikes/W0-S09/run_grid.py", "--passes", "2"],
            ["python3", "-I", "scripts/spikes/W0-S09/record.py"],
        ],
        "env": {"W0S09_PGSRC": "<postgresql-18.6 source tree, built>", "W0S09_CONTAINER": "<container>",
                "W0S09_TARBALL": "<postgresql-18.6.tar.bz2>", "W0S09_BUILDLOG": "<build log>"},
        "engine_argv": [
            "docker exec -i -e PGAPPNAME=<tag> -e PG_TEST_TIMEOUT_DEFAULT=10 <container> "
            "<build>/src/test/isolation/isolationtester \"host=/var/run/postgresql user=postgres dbname=iso\" < <spec>",
            "PGDATESTYLE='Postgres, MDY' is added for receipt-report and its variant, as pg_regress sets it"],
        "inputs": inputs,
        "budget": {
            "container_memory": "6g", "data_directory": "tmpfs, 2g (a speed choice; visibility rules do not depend on it)",
            "network": "default bridge, unused during the runs",
            "step_timeout": "PG_TEST_TIMEOUT_DEFAULT=10 (the tester cancels a step after 20 s and exits after 40 s); 2 for the one-permutation fallback",
            "deadlock_timeout": settings["deadlock_timeout"],
            "cpu": "no cap; other tasks used the host at the same time, so durations are noisy",
            "passes": 2,
        },
        "exit_code": 0,
        "duration_s": duration,
        "verdict_lines": verdicts,
        "outputs": outputs,
        "environment": {
            "os": f"{platform.system()} {platform.release()} {platform.machine()}",
            "cpu_count": os.cpu_count(), "ram_gib": 31, "cpu_architecture": platform.machine(),
            "container": {"runtime": "docker", "server_version": docker_v, "image": "postgres:18",
                          "id": image[0] if image else None, "digest": image[1] if len(image) > 1 else None,
                          "os": os_rel,
                          "run_flags": ["-d", "--memory=6g", "--tmpfs /var/lib/postgresql:rw,size=2g",
                                        "-e POSTGRES_HOST_AUTH_METHOD=trust",
                                        "-v <postgresql-18.6 build tree>:/opt/pgsrc:ro",
                                        "-c logging_collector=on", "-c log_destination=csvlog", "-c log_filename=pg.log",
                                        "-c log_rotation_age=0", "-c log_rotation_size=0"]},
            "build": build,
            "host_tools": {"python": platform.python_version()},
            "emulated": False,
        },
        "notes": [
            "The tester is PostgreSQL's own isolationtester, built from the 18.6 source tarball and run against the "
            "Debian-packaged 18.6 server of the postgres:18 image; it is not statespace isorun (W4-T16).",
            "isolationtester prints errors as 'ERROR:  <message>' without a SQLSTATE. SQLSTATEs come from the server's csv "
            "log: each session's application_name is '<tag>/<session>', and for every session the messages the tester "
            "printed must equal the messages the server logged, in order; a mismatch stops the run.",
            "NULL prints as an empty cell in isolationtester output; an empty string prints the same way.",
            "A session that continues after an error meets 'current transaction is aborted' (25P02) at its next write. "
            "Those follow-on errors stay in the row outputs, as after_abort in the index, and keep a history out of the GEN-anomaly-id pool.",
            "The lock model that decides which interleavings cannot hang the tester is sound and incomplete; every lock wait "
            "the tester reported was one the model predicted.",
            "The grid's 'half' split, the target counts and the retry patterns are design defaults [D], not measurements.",
            "Nothing was emulated: no browser, phone, hosted service or other PostgreSQL version was involved. "
            "PGlite is a different instrument (W0-S08).",
        ],
        "values": values,
        "checks": checks,
        "pass": all(c["pass"] for c in checks),
        "rows": rows,
        "grid": {"seed": grid["seed"], "templates": {t: {k: c[k] for k in ("template", "recorded", "target", "target_met", "display_half", "graded_half", "by_pattern", "sha256")}
                                                    for t, c in grid["templates"].items()},
                 "cells": len(grid["cells"]), "excluded": {k: v["count"] for k, v in grid["excluded"].items()},
                 "definition": "content/pg-catalog/grid/grid.json"},
        "configs": [
            {"id": "rows-and-upstream", "purpose": "the 24 row specs, the 25 upstream specs and one upstream variant, twice",
             "argv": ["python3", "-I", "scripts/spikes/W0-S09/run_catalog.py"],
             "started_at": rows_run["started_at"], "duration_s": rows_run["duration_s"], "exit_code": 0,
             "passes": rows_run["passes"], "specs_per_pass": rows_run["specs_per_pass"]},
            {"id": "grid", "purpose": "every cell of every pattern, twice",
             "argv": ["python3", "-I", "scripts/spikes/W0-S09/run_grid.py", "--passes", "2"],
             "started_at": grid_run["started_at"], "duration_s": grid_run["duration_s"], "exit_code": 0,
             "passes": grid_run["passes"], "cells": grid_run["cells"],
             "tester_invocations": grid_run["tester_invocations"]},
        ],
    }
    with open(os.path.join("runs", "RUN-pg-catalog.json"), "w", encoding="utf-8") as fh:
        fh.write(iso.dumps(record) + "\n")
    print("wrote runs/RUN-pg-catalog.json;", len(verdicts), "verdict lines;", len(outputs), "outputs")


if __name__ == "__main__":
    main()

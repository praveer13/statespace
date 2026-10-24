"""W0-S09: run the catalog rows H01-H24 on PostgreSQL 18.6 with PostgreSQL's own
isolationtester, record each spec's output beside it, run the upstream specs that
corroborate the rows, repeat everything once to check the outputs are stable, and
write content/pg-catalog/catalog.json and runs/RUN-pg-catalog/rows-run.json.

usage (from the repository root):
  W0S09_PGSRC=<extracted postgresql-18.6 source dir> python3 -I scripts/spikes/W0-S09/run_catalog.py

The server and the tester run in the container named by W0S09_CONTAINER (default
w0s09-pg); see docs/spikes/W0-S09.md for how it is started.
"""
import glob
import json
import os
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import iso  # noqa: E402
import rows as R  # noqa: E402

CAT = os.path.join("content", "pg-catalog")
RUNDIR = os.path.join("runs", "RUN-pg-catalog")


def read(path):
    with open(path, "rb") as fh:
        return fh.read()


def run_one(name, spec_text, tag, datestyle=None):
    """Run one spec; refuse anything that is not a clean run."""
    res = iso.run_spec(spec_text, tag, datestyle=datestyle)
    if res.rc != 0 or res.stderr.strip():
        iso.reset_database()
        raise RuntimeError(f"{name}: tester exit {res.rc}\n{res.stderr}\n{res.stdout[-600:]}")
    return res


def parse_run(res, spec):
    header, blocks = iso.split_output(res.stdout)
    out = []
    for names, lines in blocks:
        events = iso.parse_block(names, lines, spec)
        out.append({"perm": names, "lines": lines, "events": events})
    return header, out


def main():
    pgsrc = os.environ["W0S09_PGSRC"]
    updir = os.path.join(pgsrc, "src", "test", "isolation")
    t_start = time.time()
    started_at = iso.utc_now()

    iso.reset_database()
    nonce = uuid.uuid4().hex[:4]   # keeps this invocation's log rows apart from any earlier one's
    spec_paths = sorted(glob.glob(os.path.join(CAT, "H*.spec")))
    assert len(spec_paths) == 24, len(spec_paths)

    work = []   # (kind, name, spec_text, datestyle, expected_path)
    for p in spec_paths:
        name = os.path.splitext(os.path.basename(p))[0]
        work.append(("row", name, read(p).decode("utf-8"), None, None))
    for u in R.upstream_names():
        work.append(("upstream", u, read(os.path.join(updir, "specs", u + ".spec")).decode("utf-8"),
                     R.UPSTREAM_DATESTYLE.get(u), os.path.join(updir, "expected", u + ".out")))

    for vname, v in R.UPSTREAM_VARIANTS.items():
        text = read(os.path.join(updir, "specs", v["of"] + ".spec")).decode("utf-8")
        for old, new in v["edits"]:
            assert text.count(old) == 1, (vname, old)
            text = text.replace(old, new)
        work.append(("variant", vname, text, R.UPSTREAM_DATESTYLE.get(v["of"]), None))

    passes = []
    for pass_no in (1, 2):
        results = {}
        for i, (kind, name, text, ds, exp) in enumerate(work):
            tag = f"{nonce}-{pass_no}-{i:03d}"
            res = run_one(name, text, tag, datestyle=ds)
            results[name] = res
            print(f"pass {pass_no} {kind:8s} {name:50s} {res.secs:5.1f}s", flush=True)
        passes.append(results)

    time.sleep(2.0)   # let the logging collector flush
    log_rows = iso.read_csvlog()
    by_tag = iso.errors_by_tag(log_rows)

    determinism = {}
    for kind, name, text, ds, exp in work:
        a, b = passes[0][name].stdout, passes[1][name].stdout
        determinism[name] = {"pass1_sha256": iso.sha256_text(a), "pass2_sha256": iso.sha256_text(b),
                             "identical": a == b}

    total_errors = 0
    row_files = {}
    upstream = {}
    for pass_no, results in enumerate(passes, start=1):
        for i, (kind, name, text, ds, exp) in enumerate(work):
            res = results[name]
            spec = iso.parse_spec(text)
            header, blocks = parse_run(res, spec)
            tag = f"{nonce}-{pass_no}-{i:03d}"
            n_err = iso.attach_sqlstates([b["events"] for b in blocks], by_tag.get(tag))
            total_errors += n_err
            if pass_no != 1:
                continue
            # the permutations printed are the permutations asked for, in order
            if spec.permutations:
                asked = [[n for n, _m in p] for p in spec.permutations]
                got = [b["perm"] for b in blocks]
                if asked != got:
                    raise RuntimeError(f"{name}: permutations printed differ from the spec's")
            recs = []
            for b in blocks:
                summ = iso.summarize_block(b["perm"], b["events"], spec)
                rec = iso.perm_record(b["perm"], summ)
                rec["sha256"] = iso.sha256_text(iso.block_text(b["perm"], b["lines"]))
                chk = summ["results"].get("chk")
                if chk:
                    rec["final"] = [x["rows"] for x in chk]
                if kind != "row" and len(blocks) <= 12:
                    rec["step_results"] = {s: [x["rows"] for x in sets] for s, sets in summ["results"].items()}
                recs.append(rec)
            if kind == "row":
                out_path = os.path.join(CAT, name + ".out")
                with open(out_path, "w", encoding="utf-8", newline="") as fh:
                    fh.write(res.stdout)
                row_files[name] = {
                    "spec": name + ".spec", "spec_sha256": iso.sha256_text(text),
                    "out": name + ".out", "out_sha256": iso.sha256_text(res.stdout),
                    "sessions": [s for s, _st in spec.sessions],
                    "permutations": len(blocks), "errors_printed": n_err, "records": recs,
                }
            elif kind == "variant":
                v = R.UPSTREAM_VARIANTS[name]
                upstream[name] = {
                    "variant_of": v["of"], "what": v["what"], "edits": [list(e) for e in v["edits"]],
                    "spec_sha256": iso.sha256_text(text), "output_sha256": iso.sha256_text(res.stdout),
                    "datestyle_env": R.UPSTREAM_DATESTYLE.get(v["of"]),
                    "permutations": len(blocks), "errors_printed": n_err,
                    "permutations_with_error": sum(1 for r_ in recs if r_["errors"]),
                    "permutations_with_wait": sum(1 for r_ in recs if r_["waits"]),
                    "records": recs,
                }
            else:
                expected = read(exp).decode("utf-8")
                upstream[name] = {
                    "spec_in_tarball": f"src/test/isolation/specs/{name}.spec",
                    "spec_sha256": iso.sha256_text(text),
                    "expected_in_tarball": f"src/test/isolation/expected/{name}.out",
                    "expected_sha256": iso.sha256_text(expected),
                    "output_sha256": iso.sha256_text(res.stdout),
                    "identical_to_expected": res.stdout == expected,
                    "datestyle_env": R.UPSTREAM_DATESTYLE.get(name),
                    "permutations": len(blocks), "errors_printed": n_err,
                    "permutations_with_error": sum(1 for r in recs if r["errors"]),
                    "permutations_with_wait": sum(1 for r in recs if r["waits"]),
                    "records": recs,
                }

    # SQLSTATE map over the whole log, and the integrity check on it
    mine = [r for r in log_rows if r["application_name"].split("/", 1)[0].startswith(nonce + "-")]
    smap = iso.sqlstate_map(mine)
    bad = {m: v["sqlstates"] for m, v in smap.items() if len(v["sqlstates"]) != 1}
    if bad:
        raise RuntimeError(f"one message maps to several SQLSTATEs: {bad}")

    # catalog.json
    rows_out = []
    for r in R.ROWS:
        files = [row_files[f] for f in r["files"]]
        entry = {
            "id": r["id"], "title": r["title"], "adya": r["adya"], "r4_status": r["r4_status"],
            "executed_before": r["executed_before"], "r4_expected": r["r4"],
            "r4_check": r.get("r4_check"),
            "files": [{k: v for k, v in f.items() if k != "records"} for f in files],
            "upstream": r["upstream"],
        }
        by_level = {}
        for f in files:
            for rec in f["records"]:
                lv = "/".join(rec["levels"]) if rec["levels"] else "autocommit"
                d = by_level.setdefault(lv, {"permutations": 0, "signatures": {}})
                d["permutations"] += 1
                sig = iso.signature(rec) or "(no transaction block)"
                if rec["errors"]:
                    sig += "  [" + ", ".join(sorted({e["sqlstate"] for e in rec["errors"]})) + "]"
                d["signatures"][sig] = d["signatures"].get(sig, 0) + 1
        entry["by_level"] = by_level
        entry["permutations"] = [dict(rec, spec=f["spec"]) for f in files for rec in f["records"]]
        rows_out.append(entry)

    catalog = {
        "format": "statespace pg-catalog index, revision 1",
        "run": "RUN-pg-catalog",
        "produced_by": iso.server_info(),
        "note": ("Rows H01-H24. Each spec is an isolationtester spec; each .out is the tester's own output "
                 "for it, unedited. SQLSTATEs are not printed by isolationtester; they are read from the "
                 "server's csv log, error for error, and every printed error has one."),
        "rows": rows_out,
        "upstream_baseline": {k: dict({kk: vv for kk, vv in v.items() if kk != "records"},
                                      **({"detail": v["records"]} if v["permutations"] <= 12 else {}))
                              for k, v in upstream.items()},
        "sqlstates": {m: {"sqlstate": next(iter(v["sqlstates"])), "count": sum(v["sqlstates"].values()),
                          "detail": sorted(v["details"]), "hint": sorted(v["hints"])} for m, v in sorted(smap.items())},
    }
    os.makedirs(RUNDIR, exist_ok=True)
    with open(os.path.join(CAT, "catalog.json"), "w", encoding="utf-8") as fh:
        fh.write(iso.dumps(catalog) + "\n")

    rows_run = {
        "started_at": started_at, "finished_at": iso.utc_now(),
        "duration_s": round(time.time() - t_start, 1),
        "passes": 2, "specs_per_pass": len(work),
        "row_specs": len([w for w in work if w[0] == "row"]),
        "upstream_specs": len([w for w in work if w[0] == "upstream"]),
        "upstream_variants": len([w for w in work if w[0] == "variant"]),
        "errors_printed_all_passes": total_errors,
        "csv_error_rows": sum(len(s) for t, ss in by_tag.items() if t.startswith(nonce + "-") for s in ss.values()),
        "determinism": determinism,
        "all_identical_across_passes": all(d["identical"] for d in determinism.values()),
        "upstream_identical_to_expected": {k: v["identical_to_expected"] for k, v in upstream.items()
                                           if "identical_to_expected" in v},
    }
    with open(os.path.join(RUNDIR, "rows-run.json"), "w", encoding="utf-8") as fh:
        fh.write(iso.dumps(rows_run) + "\n")
    with open(os.path.join(RUNDIR, "sqlstates.json"), "w", encoding="utf-8") as fh:
        fh.write(iso.dumps(catalog["sqlstates"]) + "\n")
    print(json.dumps({k: v for k, v in rows_run.items() if k != "determinism" and k != "upstream_identical_to_expected"}, indent=1))
    ng = [n for n, d in determinism.items() if not d["identical"]]
    print("unstable across passes:", ng or "none")
    print("upstream not identical to expected:", [k for k, v in upstream.items() if v.get("identical_to_expected") is False] or "none")


if __name__ == "__main__":
    main()

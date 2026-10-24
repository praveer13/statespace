"""W0-S09: check, with no database, that what is committed under content/pg-catalog/
and runs/RUN-pg-catalog.json is consistent with itself and with the generator.

  - every row spec and output matches the SHA-256 in catalog.json, the output holds
    the permutations the spec asks for, and rows H01-H24 are all present;
  - every grid cell's spec regenerates, from the seed and the cell's numbers, to the
    SHA-256 grid.json records (a derived retry cell regenerates from the permutations
    its histories record);
  - every pool history's block matches its SHA-256, belongs to a cell of grid.json,
    has the half the rule gives, and the counts in grid.json equal the pool's;
  - every file runs/RUN-pg-catalog.json lists as an output matches its SHA-256.

usage (from the repository root):  python3 -I scripts/spikes/W0-S09/verify.py
Exit 0 and one line per check when all hold; exit 1 and the failures otherwise.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import iso  # noqa: E402
import patterns as P  # noqa: E402
import run_grid as RG  # noqa: E402  (only its definitions are used)
import make_rows as MR  # noqa: E402

CAT = os.path.join("content", "pg-catalog")
failures = []


def check(ok, text):
    print(("ok   " if ok else "FAIL ") + text)
    if not ok:
        failures.append(text)


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main():
    cat = load(os.path.join(CAT, "catalog.json"))
    grid = load(os.path.join(CAT, "grid", "grid.json"))

    # ---- rows ----------------------------------------------------------------
    ids = [r["id"] for r in cat["rows"]]
    check(ids == [f"H{n:02d}" for n in range(1, 25)], "catalog.json holds rows H01 to H24, once each, in order")
    bad = 0
    nfiles = 0
    for r in cat["rows"]:
        for f in r["files"]:
            nfiles += 1
            spec = open(os.path.join(CAT, f["spec"]), encoding="utf-8").read()
            out = open(os.path.join(CAT, f["out"]), encoding="utf-8", newline="").read()
            if iso.sha256_text(spec) != f["spec_sha256"] or iso.sha256_text(out) != f["out_sha256"]:
                bad += 1
                continue
            asked = [[n for n, _m in p] for p in iso.parse_spec(spec).permutations]
            _h, blocks = iso.split_output(out)
            if [b[0] for b in blocks] != asked or len(asked) != f["permutations"]:
                bad += 1
    check(bad == 0, f"{nfiles} row specs and outputs match their SHA-256 and the outputs run exactly the specs' permutations")
    stale = [row["file"] for row in MR.ROWS
             if MR.render_row(row)[0] != open(os.path.join(CAT, row["file"]), encoding="utf-8").read()]
    check(not stale, f"the {len(MR.ROWS)} pattern-backed row specs regenerate from the pattern library, byte for byte" +
          (f" (stale: {stale})" if stale else ""))
    unrun = [r["id"] for r in cat["rows"] if not r["files"] and not r["upstream"]]
    check(not unrun, "no row is without a spec or an upstream run" + (f" ({unrun})" if unrun else ""))
    up = cat["upstream_baseline"]
    plain = {k: v for k, v in up.items() if "identical_to_expected" in v}
    check(all(v["identical_to_expected"] for v in plain.values()),
          f"{len(plain)} upstream specs print exactly their expected output (per catalog.json)")

    # ---- grid ----------------------------------------------------------------
    check(grid["seed"] == P.GRID_SEED, "grid.json's seed is the generator's seed")
    check(grid["prng"]["test_vector"] == P.test_vectors(), "the generator's test vector equals the one in grid.json")
    check(grid["balances"] == P.balances(), "the three balances regenerate from the seed")

    pools = {}
    for t, f in grid["files"].items():
        path = f["path"]
        check(iso.sha256_file(path) == f["sha256"], f"{path} matches its SHA-256")
        with open(path, encoding="utf-8") as fh:
            pools[t] = [json.loads(line) for line in fh if line.strip()]

    # histories grouped by cell
    by_cell = {}
    for t, hs in pools.items():
        for h in hs:
            cid = h["id"].split("/", 1)[1].rsplit("/p", 1)[0]
            by_cell.setdefault(cid, []).append(h)
    cells = {c["id"]: c for c in grid["cells"]}
    check(set(by_cell) <= set(cells), "every history belongs to a cell of grid.json")

    regen_bad = []
    for cid, c in cells.items():
        pat = P.PATTERNS[c["pattern"]]
        lk = cid.rsplit("/", 1)[1]
        lv = dict(P.level_assignments(c["pattern"]))[lk]
        cell = c["cell"]
        # rebuild the plan exactly as run_grid.py does
        if c["derived_from"]:
            perms = [h["permutation"] for h in sorted(by_cell.get(cid, []), key=lambda h: h["id"])]
            if len(perms) != c["permutations_run"]:
                regen_bad.append((cid, "history count differs from the cell's permutations_run"))
                continue
            pl = RG.make_plan(c["pattern"], cell, lk, lv, perms=perms)
        else:
            pl = RG.make_plan(c["pattern"], cell, lk, lv)
        if pl.spec_sha256 != c["spec_sha256"]:
            regen_bad.append((cid, "spec does not regenerate"))
    check(not regen_bad, f"{len(cells)} cell specs regenerate to the SHA-256 grid.json records" +
          (f" (failures: {regen_bad[:3]})" if regen_bad else ""))

    bad_block = [h["id"] for hs in pools.values() for h in hs if iso.sha256_text(h["block"]) != h["block_sha256"]]
    check(not bad_block, f"{sum(len(h) for h in pools.values())} history blocks match their SHA-256")
    allids = [h["id"] for hs in pools.values() for h in hs]
    check(len(allids) == len(set(allids)), "history ids are unique")
    wrong_half = [h["id"] for hs in pools.values() for h in hs if RG.half_of(h["id"]) != h["half"]]
    check(not wrong_half, "every history's half is the one the rule gives")
    ok_counts = True
    for t, tc in grid["templates"].items():
        hs = pools[t]
        ok_counts &= tc["recorded"] == len(hs)
        ok_counts &= tc["display_half"] == sum(1 for h in hs if h["half"] == "display")
        ok_counts &= tc["graded_half"] == sum(1 for h in hs if h["half"] == "graded")
        pats = {}
        for h in hs:
            pats[h["pattern"]] = pats.get(h["pattern"], 0) + 1
        ok_counts &= pats == tc["by_pattern"]
    check(ok_counts, "the counts in grid.json equal the pools' (per template, per half, per pattern)")
    check(all(tc["recorded"] >= tc["target"] for tc in grid["templates"].values()),
          "every template meets its target: " + ", ".join(f"{t} {tc['recorded']}" for t, tc in grid["templates"].items()))
    check(all(min(tc["display_half"], tc["graded_half"]) >= tc["target_per_half"] for tc in grid["templates"].values()),
          "every template meets its per-half target")

    # ---- run record ------------------------------------------------------------
    rec_path = os.path.join("runs", "RUN-pg-catalog.json")
    if os.path.exists(rec_path):
        rec = load(rec_path)
        bad_out = [o["path"] for o in rec["outputs"] if iso.sha256_file(o["path"]) != o["sha256"]]
        check(not bad_out, f"{len(rec['outputs'])} outputs listed in RUN-pg-catalog.json match their SHA-256" +
              (f" (failures: {bad_out[:3]})" if bad_out else ""))
        check(sorted(rec["rows"]) == ids, "RUN-pg-catalog.json has a row entry for each of H01 to H24")
    else:
        check(False, "runs/RUN-pg-catalog.json exists")

    print()
    if failures:
        print(f"{len(failures)} check(s) failed")
        sys.exit(1)
    print("all checks passed")


if __name__ == "__main__":
    main()

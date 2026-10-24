"""W0-T07: an independent check of the keep/kill reference vectors.

    uv run --no-project --with statsmodels==0.14.4 --with mpmath==1.3.0 --with pyyaml==6.0.3 \
        python -I scripts/spikes/W0-T07/crosscheck.py <rules.yaml> <allocation-vectors.json> <interval-vectors.json>

1. Wilson and Newcombe (method 10) bounds from statsmodels, against the reference implementation's.
2. z: the double nearest to the 0.975 normal quantile, from mpmath at 50 digits, against the rules' value.
3. The allocation rule implemented again in Python, from the rules as PyYAML reads them, against the
   reference implementation's vectors.

Prints one JSON object; exits 0 when every check holds.
"""

import json
import statistics
import sys
from decimal import Decimal
from math import nextafter

import mpmath
import numpy
import scipy
import statsmodels
import yaml
from scipy.stats import norm
from statsmodels.stats.proportion import confint_proportions_2indep, proportion_confint

TOLERANCE = 1e-12


def utf16_key(s: str) -> list[int]:
    data = s.encode("utf-16-le")
    return [int.from_bytes(data[i : i + 2], "little") for i in range(0, len(data), 2)]


def hash32(s: str) -> int:
    h = 0x811C9DC5
    for c in utf16_key(s):
        h = ((h ^ c) * 0x01000193) & 0xFFFFFFFF
    return h


def fmix32(h: int) -> int:
    h &= 0xFFFFFFFF
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return h


def allocate(comparison: dict, seed: int) -> list[dict]:
    strata = sorted(comparison["units"], key=lambda s: int(s[1:]))
    order = []
    for stratum in strata:
        rows = []
        for unit in comparison["units"][stratum]:
            key = f"{comparison['id']}:{unit}:{seed}"
            rows.append({"unit": unit, "stratum": stratum, "v": fmix32(hash32(key))})
        rows.sort(key=lambda r: (r["v"], utf16_key(r["unit"])))
        order.extend(rows)
    first = order[0]["v"] & 1
    for position, row in enumerate(order):
        row["arm"] = comparison["arms"][(first + position) % 2]
    return order


def main() -> int:
    rules_path, allocation_path, interval_path = sys.argv[1:4]
    with open(rules_path, encoding="utf-8") as f:
        rules = yaml.safe_load(f)
    with open(allocation_path, encoding="utf-8") as f:
        allocation = json.load(f)
    with open(interval_path, encoding="utf-8") as f:
        intervals = json.load(f)
    checks = []

    # 1. intervals
    worst = 0.0
    rows = []
    for case in intervals["wilson"]:
        lo, hi = proportion_confint(case["x"], case["n"], alpha=0.05, method="wilson")
        diff = max(abs(lo - case["l"]), abs(hi - case["u"]))
        worst = max(worst, diff)
        rows.append({"kind": "wilson", "x": case["x"], "n": case["n"], "statsmodels": [lo, hi], "reference": [case["l"], case["u"]], "max_abs_diff": diff})
    for case in intervals["newcombe"]:
        lo, hi = confint_proportions_2indep(case["x1"], case["n1"], case["x2"], case["n2"], method="newcomb", compare="diff", alpha=0.05)
        diff = max(abs(lo - case["L"]), abs(hi - case["U"]))
        worst = max(worst, diff)
        rows.append({"kind": "newcombe", "case": f"{case['x1']}/{case['n1']} - {case['x2']}/{case['n2']}", "statsmodels": [lo, hi], "reference": [case["L"], case["U"]], "max_abs_diff": diff})
    checks.append({"name": "intervals agree with statsmodels", "ok": worst <= TOLERANCE, "detail": f"{len(rows)} intervals; the largest difference is {worst:.3g} (tolerance {TOLERANCE:g})"})

    # 2. z
    mpmath.mp.dps = 50
    q = mpmath.sqrt(2) * mpmath.erfinv(2 * mpmath.mpf("0.975") - 1)
    z = rules["parameters"]["z"]
    below, above = nextafter(z, 0.0), nextafter(z, 3.0)
    dist = {name: abs(mpmath.mpf(str(Decimal(v))) - q) for name, v in (("z", z), ("below", below), ("above", above))}
    nearest = min(dist, key=dist.get)
    checks.append({"name": "z is the nearest double", "ok": nearest == "z", "detail": f"the 0.975 quantile is {mpmath.nstr(q, 25)}; the rules' z is {Decimal(z)} exactly, {mpmath.nstr(dist['z'], 3)} away, nearer than either neighbouring double"})
    scipy_ppf = float(norm.ppf(0.975))
    scipy_isf = float(norm.isf(0.025))
    stdlib_inv_cdf = statistics.NormalDist().inv_cdf(0.975)
    library_values = {"python statistics.NormalDist().inv_cdf(0.975)": stdlib_inv_cdf, "scipy.stats.norm.ppf(0.975)": scipy_ppf, "scipy.stats.norm.isf(0.025)": scipy_isf}
    differing = sorted({repr(v) for v in library_values.values()} | {repr(z)})
    checks.append({"name": "libraries differ in the last digits", "ok": len(differing) > 1, "detail": "; ".join(f"{k} = {v!r}" for k, v in library_values.items()) + f"; the rules' z = {z!r}"})

    # 3. allocation, implemented again
    comparisons = {c["number"]: c for c in rules["comparisons"]}
    mismatches = 0
    compared = 0
    for entry in allocation["comparisons"]:
        if "per_seed" not in entry:
            continue
        comparison = comparisons[entry["number"]]
        for per_seed in entry["per_seed"]:
            mine = allocate(comparison, per_seed["seed"])
            theirs = per_seed["units"]
            for a, b in zip(mine, theirs, strict=True):
                compared += 1
                if a["unit"] != b["unit"] or a["arm"] != b["arm"] or f"0x{a['v']:08x}" != b["v"]:
                    mismatches += 1
    window = next(e for e in allocation["comparisons"] if e["number"] == 4)
    for w in window["first_window"]:
        compared += 1
        v = fmix32(hash32(f"reserve-weeks:window-1:{w['seed']}"))
        if comparisons[4]["arms"][v & 1] != w["window_1"] or f"0x{v:08x}" != w["v"]:
            mismatches += 1
    hash_vectors_ok = all(f"0x{hash32(h['input']):08x}" == h["hash32"] for h in allocation["hash32_vectors"])
    fmix_vectors_ok = all(f"0x{fmix32(int(f['input'], 16)):08x}" == f["fmix32"] for f in allocation["fmix32_vectors"])
    checks.append({"name": "allocation implemented again in Python", "ok": mismatches == 0 and hash_vectors_ok and fmix_vectors_ok, "detail": f"{compared} unit arms and window draws compared, {mismatches} differ; hash32 and fmix32 vectors {'agree' if hash_vectors_ok and fmix_vectors_ok else 'differ'}"})

    print(json.dumps({
        "ok": all(c["ok"] for c in checks),
        "checks": checks,
        "versions": {"python": sys.version.split()[0], "statsmodels": statsmodels.__version__, "scipy": scipy.__version__, "numpy": numpy.__version__, "mpmath": mpmath.__version__, "pyyaml": yaml.__version__},
        "z": {"rules": z, "rules_exact": str(Decimal(z)), "quantile_50_digits": mpmath.nstr(q, 50), "nearest_double": nearest, "scipy_norm_ppf_0975": scipy_ppf, "scipy_norm_isf_0025": scipy_isf},
        "intervals": rows,
    }, indent=2))
    return 0 if all(c["ok"] for c in checks) else 1


if __name__ == "__main__":
    sys.exit(main())

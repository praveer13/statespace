"""Replay four recorded witnesses in plain Python integers: SP-1.1 (the roadmap's starter), SP-1.4 (the recipient
wrap, and the witness Pyodide found for a related query) and SP-1.5 (the guard that mixes unsigned and signed
comparisons).

Z3 found each of these models in a run of W0 (RUN-z3-starter, RUN-z3-bv64 and RUN-z3-bv64-pyodide). Those runs print
the model and nothing that checks it against the property it is a counterexample to; W1's own Z3 runs
(RUN-z3-boot-variant and the others) print a line beginning "replay ok" for every sat query. The specimen cabinet's
stamp for a witness, REFUTED, exists only once the witness replays (spine section 8.8; DESIGN.md section 5.4), so
this script gives these witnesses the same evidence: it reads each model from the verdict lines of the run record
that holds it, and checks it against the premises and the property of the Z3 query that produced it
(research/evidence/a2r3/scripts/z3_claims.py, sections 1 and 4, and research/evidence/A5r3/scripts/z3unk.mjs), using
Python integers and two's complement for the 64-bit cases, with no solver.

Usage, from anywhere:  uv run --no-project --quiet python -I scripts/spikes/W1-T16/replay_witnesses.py
It prints one line per witness, `[name] replay ok: ...`, and exits 1 if any witness does not replay.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FAILED = []

W = 64
MOD = 1 << W
HALF = 1 << (W - 1)


def signed(v):
    """The signed reading of a 64-bit bit-vector given as an unsigned integer."""
    return v - MOD if v >= HALF else v


def run_lines(run_id):
    return json.loads((REPO / "runs" / f"{run_id}.json").read_text())["verdict_lines"]


def model_of(lines, label):
    """The model printed after the label's `sat`: the bracketed list, which may continue over indented lines. The
    label is `[label] ` (the W0 harness) or `label ` (the Pyodide harness's `recipient-wrap sat [...]`)."""
    prefixes = (f"[{label}] ", f"{label} ")
    start = next(i for i, l in enumerate(lines) if l.startswith(prefixes))
    prefix = next(p for p in prefixes if lines[start].startswith(p))
    block = [lines[start][len(prefix) :]]
    for line in lines[start + 1 :]:
        if not line[:1].isspace():
            break
        block.append(line.strip())
    rest = " ".join(block)
    if not rest.startswith("sat"):
        raise SystemExit(f"[{label}] is not a sat line: {rest[:60]}")
    inside = re.search(r"\[(.*)\]", rest, re.S).group(1)
    pairs = {}
    for part in inside.split(","):
        name, value = (s.strip() for s in part.split("="))
        pairs[name] = int(value)
    return pairs


def report(name, ok, text):
    print(f"[{name}] replay {'ok' if ok else 'FAILED'}: {text}")
    if not ok:
        FAILED.append(name)


def checks(items):
    """items: (text, truth) pairs; the line lists each with ok or FAILED, and passes only if every one holds."""
    return all(t for _, t in items), ", ".join(f"{text} {'ok' if t else 'FAILED'}" for text, t in items)


# ---- SP-1.1: Ints a, b, amount: a >= 0, b >= 0, amount > 0 and the violation a - amount < 0 (z3_claims.py, section 1)
m = model_of(run_lines("RUN-z3-starter"), "1.2 starter: overdraft search")
a, b, amount = m["a"], m["b"], m["amount"]
ok, text = checks([("a >= 0", a >= 0), ("b >= 0", b >= 0), ("amount > 0", amount > 0), (f"a - amount = {a - amount} < 0", a - amount < 0)])
report("sp_1_1_starter", ok, f"a={a} b={b} amount={amount}: {text}")

# ---- SP-1.4: BitVec 64, signed comparisons: A >= 0, B >= 0, X > 0, X <= A, and the violation B + X < 0 (section 4)
m = model_of(run_lines("RUN-z3-bv64"), "1.5 BitVec64 signed: guarded DESTINATION wrap")
A, B, X = m["A"], m["B"], m["X"]
wrapped = signed((B + X) % MOD)
ok, text = checks(
    [
        ("A >= 0", signed(A) >= 0),
        ("B >= 0", signed(B) >= 0),
        ("X > 0", signed(X) > 0),
        ("X <= A", signed(X) <= signed(A)),
        (f"B + X wraps to {wrapped} < 0 (the integers give {signed(B) + signed(X)})", wrapped < 0 <= signed(B) + signed(X)),
    ]
)
report("sp_1_4_recipient_wrap", ok, f"A={A} B={B} X={X} (signed 64-bit): {text}")

# ---- SP-1.4, the witness Pyodide found for a related query: BitVec 64, B >= 0, M > 0 and the violation B + M < 0
m = model_of(run_lines("RUN-z3-bv64-pyodide"), "recipient-wrap")
M, B = m["M"], m["B"]
wrapped = signed((B + M) % MOD)
ok, text = checks(
    [
        ("B >= 0", signed(B) >= 0),
        ("M > 0", signed(M) > 0),
        (f"B + M wraps to {wrapped} < 0 (the integers give {signed(B) + signed(M)})", wrapped < 0 <= signed(B) + signed(M)),
    ]
)
report("sp_1_4_pyodide_related_query", ok, f"M={M} B={B} (signed 64-bit): {text}")

# ---- SP-1.5: BitVec 64: the guard UGT(X, 0), ULE(X, A) is unsigned, the violation A - X < 0 is signed (section 4)
m = model_of(run_lines("RUN-z3-bv64"), "1.5 BitVec64 unsigned guard, signed check")
A, X = m["A"], m["X"]
diff = signed((A - X) % MOD)
ok, text = checks(
    [
        ("X > 0 (unsigned)", X > 0),
        ("X <= A (unsigned)", X <= A),
        (f"A reads as {signed(A)} signed", signed(A) < 0),
        (f"A - X reads as {diff} < 0 signed", diff < 0),
    ]
)
report("sp_1_5_mixed_signedness", ok, f"A={A} X={X} (guard unsigned, check signed): {text}")

sys.exit(1 if FAILED else 0)

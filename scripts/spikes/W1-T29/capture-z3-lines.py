"""Capture the Z3 lane's verdict-line fixtures from the pinned engine, and record the run (RUN-z3-verdict-lines).

Writes, from one execution:

* bench/statespace/check/fixtures/z3-verdict-lines.json: for each case, the SMT-LIB input, the command
  line (the engine by name, the input by file name), Z3's exit code and its whole output, verbatim, the
  verdict lines, verdict and reason the lane's grammar gives for that output, and the constants of the
  model printed after sat. The expectations are written here by hand from the grammar in
  bench/statespace/lanes/z3.py, not computed by the lane, so the lane's tests check its reading against an
  independent statement of it. The TypeScript parser of the tab
  (W1-T14) reads the same file (ARCHITECTURE.md section 11.2: one fixture set copied from executed logs).
* runs/RUN-z3-verdict-lines/queries/<case>.smt2: the bytes each case gave Z3;
* runs/RUN-z3-verdict-lines/capture.log: the transcript, each case's command, its output and its exit code,
  then the readings (READINGS): the answers that readers the api entry does not use, or no longer uses,
  give to a case's text, each run in a fresh process on the same library (parse_smt2_string on the named
  premises, Solver.from_string on the NUL and DIMACS texts the lane refuses, the text of cli-cr-in-comment
  as Path.read_text returns it, the named assumption of cli-named-assumption read as the api entry reads an
  assumption, a question the lane refuses, and the models from_string gives under options that turn models
  off or print them as text, which the lane refuses too);
* runs/RUN-z3-verdict-lines.json: the run record (run@1) of these executions.

Run from the repository root, with the pinned wheel, then regenerate the registry index:

    uv run --project bench --locked --group image python -I scripts/spikes/W1-T29/capture-z3-lines.py
    node scripts/runs/build-index.mjs

It runs each case in a scratch directory, so no path of this machine reaches the files. The api cases run
this repository's own runner (bench/statespace/lanes/z3.py), which the record lists as an input: after a
change to it, capture again, or GATE-runs reports the input as changed.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import sys
import sysconfig
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "bench" / "statespace" / "check" / "fixtures" / "z3-verdict-lines.json"
RUN_ID = "RUN-z3-verdict-lines"
RECORD = ROOT / "runs" / f"{RUN_ID}.json"
FOLDER = ROOT / "runs" / RUN_ID
RLIMIT = 5000000
BACKSTOP_S = 120.0
WHEEL = {
    "url": "https://files.pythonhosted.org/packages/e9/ed/c327d486ef65228c367ef0f5c306abb3c805538c75db99600f68714ebb46/z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl",
    "file": "z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl",
    "sha256": "3e2e00bc80e776849d917daa194f33759ffa61d6528a859cfc4923ee3277a386",
    "bytes": 36561071,
    "role": "wheel",
}  # bench/uv.lock's entry for this platform

STARTER = """(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (>= a 0))
(assert (>= b 0))
(assert (> amount 0))
(assert (< (- a amount) 0))
(check-sat)
(get-info :reason-unknown)
"""
GUARD = STARTER.replace("(assert (< (- a amount) 0))", "(assert (<= amount a))\n(assert (< (- a amount) 0))")
CUBES = """(declare-const x Int)
(declare-const y Int)
(declare-const z Int)
(assert (> x 0))
(assert (> y 0))
(assert (> z 0))
(assert (= (+ (* x x x) (* y y y)) (* z z z)))
(check-sat)
(get-info :reason-unknown)
"""
WRAP = """(declare-const b (_ BitVec 64))
(declare-const m (_ BitVec 64))
(assert (bvsge b #x0000000000000000))
(assert (bvsgt m #x0000000000000000))
(assert (bvslt (bvadd b m) #x0000000000000000))
(check-sat)
"""
UNDECLARED = """(declare-const a Int)
(assert (> q 0))
(check-sat)
"""
NOT_BOOL = """(declare-const a Int)
(assert (+ a 1))
(check-sat)
"""
UNBALANCED = """(declare-const a Int)
(assert (> a 0)
(check-sat)
"""
MODEL_AFTER_UNSAT = """(declare-const a Int)
(assert (> a 0))
(assert (< a 0))
(check-sat)
(get-model)
"""
ASSUMING = """(declare-const p Bool)
(assert (not p))
(check-sat-assuming (p))
"""
AFTER = """(declare-const x Int)
(assert (> x 0))
(check-sat)
(assert false)
"""
OVERRIDE = "(set-option :rlimit 0)\n" + CUBES
PRINTED = """(declare-const sat Bool)
(simplify sat)
(check-sat-assuming (nonexistent))
"""
# SP-1.6's shape: the premises alone, named, with MAX_TRANSFER = 0, so they contradict each other.
NAMED = """(set-option :produce-unsat-cores true)
(declare-const amount Int)
(define-fun MAX_TRANSFER () Int 0)
(assert (! (> amount 0) :named amount-pos))
(assert (! (<= amount MAX_TRANSFER) :named under-max))
(check-sat)
(get-unsat-core)
"""
STRAY_PAREN = """(declare-const x Int)
(assert (> x 0))
(echo "unsat")
(exit)
)
"""
BLOCK_COMMENT = """#| a | b |#
(echo "unsat")
| (check-sat)
"""
BACKSLASH = """(declare-const |a\\|b| Int)
(check-sat)
"""
NONLINEAR = """(set-logic QF_LIA)
(declare-const x Int)
(assert (> (* x x) 3))
(check-sat)
"""
# Premises that contradict each other, the second after a NUL in a ; comment.
NUL_PREMISES = "(declare-const amount Int)\n(assert (> amount 0))\n; MAX_TRANSFER = 0 \x00\n(assert (<= amount 0))\n(check-sat)\n"
# The guarded query with its guard after a bare carriage return in a ; comment.
CR_GUARD = GUARD.replace("(assert (<= amount a))", "; guard\r(assert (<= amount a))")
# A CRLF file whose string literal spans a line: it holds a, \r, \n and b.
CRLF_STRING = '(declare-const s String)\r\n(assert (= s "a\r\nb"))\r\n(assert (= (str.len s) 4))\r\n(check-sat)\r\n'
DIMACS = "p cnf 1 2\n1 0\n-1 0\n(check-sat)\n"
# SP-1.6's premises again, the second assumed under a name with unsat cores on, so the question is unsat.
NAMED_ASSUMPTION = """(set-option :produce-unsat-cores true)
(declare-const amount Int)
(define-fun MAX_TRANSFER () Int 0)
(assert (> amount 0))
(check-sat-assuming ((! (<= amount MAX_TRANSFER) :named under-max)))
(get-unsat-core)
"""
# A question annotated with the quoted symbol |!|.
QUOTED_ANNOTATION = """(declare-const p Bool)
(assert (not p))
(check-sat-assuming ((|!| p :named q)))
"""
# What check_script suggests instead of a named assumption: an assumed Boolean constant that an assertion
# ties to the formula.
ASSUMED_CONSTANT = """(set-option :produce-unsat-cores true)
(declare-const amount Int)
(define-fun MAX_TRANSFER () Int 0)
(assert (> amount 0))
(declare-const under-max Bool)
(assert (=> under-max (<= amount MAX_TRANSFER)))
(check-sat-assuming (under-max))
(get-unsat-core)
"""
# The starter, then commands that read the answer and print values before the model that -model prints:
# with assignments on and nothing named, (get-assignment) prints an empty list.
VALUES_AFTER = "(set-option :produce-assignments true)\n" + STARTER + """(get-model)
(get-value (a b amount))
(eval (- a amount))
(get-assignment)
(exit)
"""
# The starter under options that turn models off, or print them as text.
MODELS_OFF = "(set-option :produce-models false)\n" + STARTER
MODEL_OFF = "(set-option :model false)\n" + STARTER
MODEL_V1 = "(set-option :model.v1 true)\n" + STARTER
ABA = ("a", "amount", "b")  # the starter's constants


@dataclass(frozen=True)
class Case:
    """One execution. `lines` are the verdict lines, the answer, a reason that is not empty and every
    (error ...) line, in order; models and empty reasons are not verdict lines. The text of an error line
    is Z3's own, read off the captured output; what is stated here independently of the lane is which
    lines are verdict lines, and the verdict and reason they carry. A verdict of None marks output with no
    verdict line at all. `model` names, sorted, the constants that the model printed after `sat` defines,
    where the model is the last block after `sat` that is a list of define-fun items (with the declare-fun
    and forall items of a sort's universe); () for an empty model, None when no model is printed."""

    id: str
    entry: str
    text: str
    lines: list[str]
    verdict: str | None
    reason: str | None = None
    rlimit: int = RLIMIT
    stop_after_s: float | None = None  # a wall-clock limit of the capture's own, for a run that would not stop
    note: str | None = None
    model: tuple[str, ...] | None = None


CASES: list[Case] = [
    Case("cli-unsat", "cli", GUARD, ["unsat"], "unsat"),
    Case("cli-sat-model", "cli", STARTER, ["sat"], "sat", model=ABA),
    Case("cli-unknown-rlimit", "cli", CUBES, ["unknown", '(:reason-unknown "canceled")'], "unknown", "canceled"),
    Case("cli-bitvector-model", "cli", WRAP, ["sat"], "sat", model=("b", "m")),
    Case("cli-error-then-sat", "cli", UNDECLARED, ['(error "line 2 column 11: unknown constant q")', "sat"], "error", model=("a",)),
    Case("cli-not-boolean-then-sat", "cli", NOT_BOOL, ['(error "line 2 column 15: invalid assert command, term is not Boolean")', "sat"], "error", model=("a",)),
    Case(
        "cli-syntax-error-no-answer",
        "cli",
        UNBALANCED,
        ['(error "line 3 column 0: invalid assert command, \')\' expected")'],
        "error",
        note="Z3's own output for a script that does not parse: an error and no answer; check_script refuses a script it cannot read, so the lane never runs this one",
    ),
    Case("cli-model-asked-after-unsat", "cli", MODEL_AFTER_UNSAT, ["unsat", '(error "line 5 column 10: model is not available")'], "unsat"),
    # rlimit one past 2**32 - 1: Z3 refuses the parameter on its own line, which is no verdict line; the
    # lane refuses such an rlimit before it runs, and would add a note of its own.
    Case("cli-rlimit-too-large", "cli", GUARD, [], None, rlimit=2**32),
    Case("cli-check-sat-assuming", "cli", ASSUMING, ["unsat"], "unsat", note="the question's assumption p contradicts the assertion (not p)"),
    Case("cli-assert-after-question", "cli", AFTER, ["sat"], "sat", note="Z3 answers the question before it reads the later (assert false); check_script refuses such a script, whose last line would read as part of the question"),
    Case(
        "cli-script-rlimit-overrides",
        "cli",
        OVERRIDE,
        [],
        None,
        stop_after_s=3.0,
        note="the script's (set-option :rlimit 0) replaces the rlimit=5000000 of the command line, which stops the same query with unknown (canceled) in cli-unknown-rlimit: Z3 gave no answer within the capture's 3 s limit and was stopped; check_script refuses any script that sets :rlimit, :timeout or a memory limit",
    ),
    Case(
        "cli-printed-word-before-question",
        "cli",
        PRINTED,
        ["sat", '(error "line 3 column 21: unknown constant nonexistent")'],
        "sat",
        note="(simplify sat) prints the constant's name, sat, and the question then fails, so the grammar reads an answer that no question gave; check_script refuses simplify, eval and display before the question",
    ),
    Case(
        "cli-stray-paren-after-echo",
        "cli",
        STRAY_PAREN,
        ["unsat"],
        "unsat",
        note="the script asks no question: Z3 runs (echo \"unsat\") and (exit) before it would read the stray ), and exits 0 with one line that reads as unsat; check_script refuses a script it cannot read, since Z3 runs every command before a fault",
    ),
    Case(
        "cli-block-comment-hides-echo",
        "cli",
        BLOCK_COMMENT,
        ["unsat", '(error "line 4 column 1: unexpected end of quoted symbol")'],
        "unsat",
        note="Z3 ends the #| block comment at the first |#, runs (echo \"unsat\"), and reads | (check-sat) as a quoted symbol that never ends, so no question is asked and the grammar reads unsat; a reader that takes each | for a quoted symbol sees one (check-sat) and no echo, so check_script refuses #| block comments",
    ),
    Case(
        "cli-backslash-in-quoted-symbol",
        "cli",
        BACKSLASH,
        ['(error "line 1 column 18: invalid character \'\\\' in quoted symbol")', '(error "line 1 column 18: unexpected character")', "sat"],
        "error",
        note="SMT-LIB allows no backslash in a |quoted symbol|: Z3 reports an error and reads on from the backslash, where a reader that ends the symbol at the next | would not; check_script refuses such a script",
        model=(),
    ),
    Case(
        "cli-named-premises",
        "cli",
        NAMED,
        ["unsat"],
        "unsat",
        note="the named premises amount > 0 and amount <= MAX_TRANSFER contradict each other when MAX_TRANSFER = 0, so a claim guarded by them holds vacuously; the unsat core names both",
    ),
    Case(
        "cli-nonlinear-in-qf-lia-then-sat",
        "cli",
        NONLINEAR,
        ['(error "line 3 column 21: logic does not support nonlinear arithmetic")', "sat"],
        "error",
        note="QF_LIA has no nonlinear terms: Z3 drops the assertion with an error and answers about what is left",
        model=("x",),
    ),
    Case(
        "cli-nul-in-comment",
        "cli",
        NUL_PREMISES,
        ["unsat"],
        "unsat",
        note="the command line reads past the NUL inside the ; comment, so both premises hold and contradict each other; Solver.from_string reads the same text only up to the NUL and answered sat (values.from_string_nul_reading); check_script refuses a script that holds a NUL, so the lane runs neither entry on this one",
    ),
    Case(
        "cli-cr-in-comment",
        "cli",
        CR_GUARD,
        ["sat"],
        "sat",
        note="Z3 ends a ; comment only at a line feed, so the guard after the bare carriage return of '; guard' is part of the comment and the overdraft is reachable; read with Path.read_text, which turns the carriage return into a line feed, the same file answered unsat (values.read_text_cr_reading)",
        model=ABA,
    ),
    Case(
        "cli-crlf-string",
        "cli",
        CRLF_STRING,
        ["sat"],
        "sat",
        note="in a CRLF file, the string literal that spans a line keeps its carriage return, so its length is 4",
        model=("s",),
    ),
    Case(
        "cli-dimacs-prefix",
        "cli",
        DIMACS,
        ['(error "line 1 column 1: invalid command, \'(\' expected")', "sat"],
        "error",
        note="the command line reads the file as SMT-LIB: p is not a command, so Z3 reports an error, skips to the (check-sat) and answers sat about no assertions; Solver.from_string reads a text that starts 'p c' as DIMACS and answered unsat to the same clauses (values.from_string_dimacs_reading); check_script refuses a form outside any command",
        model=(),
    ),
    Case(
        "cli-named-assumption",
        "cli",
        NAMED_ASSUMPTION,
        ["unsat"],
        "unsat",
        note="the command line assumes the named formula amount <= MAX_TRANSFER, which contradicts amount > 0 when MAX_TRANSFER = 0, and the unsat core it prints is that formula with MAX_TRANSFER replaced by 0; parse_smt2_string, which reads the api entry's assumptions, returns the named assumption as an implication from its name, which the name's being false satisfies, and the same question was sat read that way (values.parse_smt2_string_assumption_reading); check_script refuses an annotation in the question, so the lane runs neither entry on this one",
    ),
    Case(
        "cli-quoted-annotation-assumption",
        "cli",
        QUOTED_ANNOTATION,
        ["unsat"],
        "unsat",
        note="Z3 reads the quoted symbol |!| as the keyword !, so the question assumes p, which contradicts the assertion (not p), and Z3 reports no error; check_script removes the bars of a quoted symbol before it looks for an annotation, so it refuses this question too",
    ),
    Case(
        "cli-assumed-constant",
        "cli",
        ASSUMED_CONSTANT,
        ["unsat"],
        "unsat",
        note="what check_script suggests instead of a named assumption: the Boolean constant under-max, assumed, which an assertion ties to amount <= MAX_TRANSFER; the premises contradict each other, so the question is unsat, and the unsat core names the constant",
    ),
    Case(
        "cli-get-value-after-sat",
        "cli",
        VALUES_AFTER,
        ["sat"],
        "sat",
        note="the model that (get-model) prints, the values that (get-value ...) prints, the term that (eval ...) prints and the empty list that (get-assignment) prints with nothing named come before the model that -model prints after the output of every other command, (exit) included; of these blocks only the two models are lists of define-fun items with an item, so the model read is the last block, the one -model prints",
        model=ABA,
    ),
    Case(
        "cli-produce-models-off",
        "cli",
        MODELS_OFF,
        ["sat"],
        "sat",
        note="with models off, the command line prints no model after sat, so a check has no witness to replay; check_script refuses :produce-models and :model set to anything but true",
    ),
    Case(
        "cli-model-off",
        "cli",
        MODEL_OFF,
        ["sat"],
        "sat",
        note="Z3's own :model parameter, set to false, also leaves the command line with no model after sat; check_script refuses it as it refuses :produce-models false",
    ),
    Case(
        "cli-model-v1-text",
        "cli",
        MODEL_V1,
        ["sat"],
        "sat",
        note="under :model.v1 the command line prints the model as a quoted string of name -> value lines, not as define-fun items; check_script refuses :model.v1 and :model.v2 set to anything but false",
    ),
    Case("api-unsat", "api", GUARD, ["unsat"], "unsat"),
    Case("api-sat-model", "api", STARTER, ["sat"], "sat", model=ABA),
    Case("api-unknown-rlimit", "api", CUBES, ["unknown", '(:reason-unknown "canceled")'], "unknown", "canceled"),
    Case("api-error", "api", UNDECLARED, ['(error "line 2 column 11: unknown constant q")'], "error"),
    Case("api-check-sat-assuming", "api", ASSUMING, ["unsat"], "unsat", note="the api entry checks under the question's assumptions, as the command line does"),
    Case(
        "api-named-premises",
        "api",
        NAMED,
        ["unsat"],
        "unsat",
        note="the api entry reads the script with Solver.from_string, which keeps named assertions as the command line does; read with parse_smt2_string, each came back as (=> name formula) with nothing assuming the name, and the same script answered sat",
    ),
    Case(
        "api-nonlinear-in-qf-lia",
        "api",
        NONLINEAR,
        ['(error "line 3 column 21: logic does not support nonlinear arithmetic")'],
        "error",
        note="Solver.from_string reads (set-logic QF_LIA) as the command line does and reports the same error, so the verdict is error through both entries",
    ),
    Case(
        "api-cr-in-comment",
        "api",
        CR_GUARD,
        ["sat"],
        "sat",
        note="the api runner reads the file's bytes with no line-ending translation, so the guard is part of the comment through both entries",
        model=ABA,
    ),
    Case(
        "api-crlf-string",
        "api",
        CRLF_STRING,
        ["sat"],
        "sat",
        note="the api runner keeps the \\r\\n inside the string, as the command line does",
        model=("s",),
    ),
    Case(
        "api-assumed-constant",
        "api",
        ASSUMED_CONSTANT,
        ["unsat"],
        "unsat",
        note="the assumed constant reads the same through the api entry, which checks under it, as the command line does",
    ),
    Case(
        "api-get-value-after-sat",
        "api",
        VALUES_AFTER,
        ["sat"],
        "sat",
        note="the api entry asks only the script's question and prints the answer and the model, so the model it prints defines the constants the command line's does",
        model=ABA,
    ),
]


@dataclass(frozen=True)
class Reading:
    """A reading of a case's text through Z3's Python API in a fresh process (READER), on the library the
    api cases load: how a reader the api entry does not use, or no longer uses, or a question check_script
    refuses, answers. It reads the text before the case's question, (check-sat) or (check-sat-assuming,
    with parse_smt2_string or from_string, the text as given or as Path.read_text returns it from a file
    holding those bytes; with `assumptions`, it checks under them, each read as the api entry reads an
    assumption: the last formula of parse_smt2_string(<prefix> + (assert <assumption>)). With `model`, it
    also records the model after sat as the api entry printed it, model().sexpr(), and the names it defines."""

    key: str  # the record's values.<key>
    case: str
    text: str
    reader: str  # "parse_smt2_string" or "from_string"
    read_text: bool
    title: str
    why: str
    assumptions: tuple[str, ...] = ()
    model: bool = False


# One reading, run by `python -I -c` with its request as JSON on standard input, in a fresh process for each
# reading as the api entry runs each script: within one process, Z3's Python API kept the names that earlier
# texts defined, and a later reading's model defined them too. It prints the answer, each assumption as read,
# and, when asked and the answer is sat, the model as the api entry printed it and the names it defines.
READER = """
import json, sys
import z3
request = json.loads(sys.stdin.read())
prefix = request["prefix"]
solver = z3.Solver()
solver.set("rlimit", request["rlimit"])
if request["reader"] == "parse_smt2_string":
    solver.add(z3.parse_smt2_string(prefix))
else:
    solver.from_string(prefix)
assumed = []
if request["assumptions"]:
    # As the api entry read a question's assumptions: the last formulas of the prefix plus one assert each.
    base = len(z3.parse_smt2_string(prefix))
    extended = z3.parse_smt2_string(prefix + "\\n" + "".join("(assert " + a + ")\\n" for a in request["assumptions"]))
    assumed = [extended[base + i] for i in range(len(request["assumptions"]))]
answer = str(solver.check(*assumed))
out = {"answer": answer, "assumptions_read": [str(a.sexpr()) for a in assumed]}
if request["model"] and answer == "sat":
    model = solver.model()
    out["model"] = str(model.sexpr()).rstrip("\\n")
    out["model_defines"] = sorted(str(d.name()) for d in model.decls())
print(json.dumps(out))
"""


READINGS: list[Reading] = [
    Reading(
        "parse_smt2_string_reading",
        "api-named-premises",
        NAMED,
        "parse_smt2_string",
        False,
        "parse_smt2_string reading of api-named-premises (the api entry's reading before Solver.from_string)",
        "parse_smt2_string returns each named assertion as (=> name formula), and nothing assumes the name",
    ),
    Reading(
        "from_string_nul_reading",
        "cli-nul-in-comment",
        NUL_PREMISES,
        "from_string",
        False,
        "Solver.from_string reading of cli-nul-in-comment (why check_script refuses a NUL)",
        "from_string passes the text to Z3 as a C string, which ends at the NUL, so it reads the first premise alone",
    ),
    Reading(
        "from_string_dimacs_reading",
        "cli-dimacs-prefix",
        DIMACS,
        "from_string",
        False,
        "Solver.from_string reading of cli-dimacs-prefix (why check_script refuses a form outside any command)",
        "from_string reads a text that starts 'p c' as DIMACS, whose clauses 1 and -1 contradict each other",
    ),
    Reading(
        "read_text_cr_reading",
        "cli-cr-in-comment",
        CR_GUARD,
        "from_string",
        True,
        "Path.read_text reading of cli-cr-in-comment (the api runner's reading before it read bytes)",
        "Path.read_text turns the bare carriage return into a line feed, which ends the comment before the guard",
    ),
    Reading(
        "parse_smt2_string_assumption_reading",
        "cli-named-assumption",
        NAMED_ASSUMPTION,
        "from_string",
        False,
        "parse_smt2_string reading of cli-named-assumption's assumption (why check_script refuses an annotation in the question)",
        "with unsat cores on, parse_smt2_string returns the named assumption as an implication from its name (assumptions_read), which the name's being false satisfies",
        ("(! (<= amount MAX_TRANSFER) :named under-max)",),
    ),
    Reading(
        "from_string_produce_models_off_reading",
        "cli-produce-models-off",
        MODELS_OFF,
        "from_string",
        False,
        "Solver.from_string reading of cli-produce-models-off, with its model (why check_script refuses models turned off)",
        "the api entry read the script this way and printed its solver's model, model().sexpr(), where the command line prints none",
        model=True,
    ),
    Reading(
        "from_string_model_v1_reading",
        "cli-model-v1-text",
        MODEL_V1,
        "from_string",
        False,
        "Solver.from_string reading of cli-model-v1-text, with its model (why check_script refuses models printed as text)",
        "the api entry read the script this way and printed its solver's model, model().sexpr(), where the command line prints the model as a quoted string",
        model=True,
    ),
]

# Lines no engine printed: the grammar's edges, which the tab's parser must read the same way.
SYNTHETIC: list[dict[str, object]] = [
    {"id": "two-answers", "verdictLines": ["sat", "unsat"], "verdict": "error", "why": "a run carries one answer"},
    {"id": "no-answer", "verdictLines": ['(:reason-unknown "canceled")'], "verdict": "error", "why": "a reason without an answer"},
    {"id": "cli-note", "verdictLines": ["statespace: z3 gave no answer within 120 s of wall-clock time and was stopped"], "verdict": "error", "why": "a line of the CLI's own: no verdict was reached"},
    {"id": "note-after-answer", "verdictLines": ["sat", "statespace: z3 gave no answer within 120 s of wall-clock time and was stopped"], "verdict": "error", "why": "a note outranks an answer"},
    {"id": "multi-line-error", "verdictLines": ['(error "line 3 column 2: first part', 'second part")', "unsat"], "verdict": "error", "why": "an error continues until a line ends with \")"},
    {"id": "reason-with-sat-ignored", "verdictLines": ["sat", '(:reason-unknown "canceled")'], "verdict": "sat", "reason": None, "why": "a reason is read only with unknown"},
    {"id": "quote-in-reason", "verdictLines": ["unknown", '(:reason-unknown "a ""quoted"" word")'], "verdict": "unknown", "reason": 'a "quoted" word', "why": "SMT-LIB doubles a quote inside a string"},
    {"id": "uppercase-answer", "verdictLines": ["SAT"], "verdict": None, "why": "not a Z3 verdict line: the receipt is rejected"},
    {"id": "answer-with-space", "verdictLines": ["sat "], "verdict": None, "why": "lines are read verbatim"},
    {"id": "model-line", "verdictLines": ["sat", "(define-fun a () Int 1)"], "verdict": None, "why": "a model is not a verdict line"},
    {"id": "empty", "verdictLines": [], "verdict": None, "why": "receipt@1 requires at least one verdict line"},
    {"id": "unterminated-error", "verdictLines": ['(error "never closed'], "verdict": None, "why": "an error line must be terminated"},
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def shown_argv(case: Case) -> list[str]:
    name = f"{case.id}.smt2"
    if case.entry == "cli":
        return ["z3", "-smt2", "-model", f"rlimit={case.rlimit}", name]
    return ["python", "-P", "-m", "statespace.lanes.z3", "--rlimit", str(case.rlimit), "--model", name]


def text_of(value: object) -> str:
    if value is None:
        return ""
    return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value)


def ram_gib() -> float | None:
    try:
        for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemTotal:"):
                return round(int(line.split()[1]) / (1024 * 1024), 1)
    except OSError:
        return None
    return None


def main() -> int:
    import z3  # pyright: ignore[reportMissingTypeStubs]  # the pinned wheel

    binary = Path(sysconfig.get_path("scripts")) / "z3"
    library = sorted((Path(z3.__file__).resolve().parent / "lib").glob("libz3*"))[0]
    version_line = subprocess.run([str(binary), "--version"], capture_output=True, text=True, check=True).stdout.strip()
    version = str(z3.get_version_string())
    binary_sha, library_sha = sha256(binary.read_bytes()), sha256(library.read_bytes())
    runner = ROOT / "bench" / "statespace" / "lanes" / "z3.py"
    started_at, started = now(), time.monotonic()
    results: list[dict[str, Any]] = []
    transcript: list[str] = [version_line]
    with tempfile.TemporaryDirectory(prefix="w1t29-capture-") as scratch:
        work = Path(scratch)
        for case in CASES:
            name = f"{case.id}.smt2"
            (work / name).write_bytes(case.text.encode("utf-8"))  # the bytes as given: no line-ending translation
            shown = shown_argv(case)
            if case.entry == "cli":
                actual, env = [str(binary), *shown[1:]], None
            else:
                actual, env = [sys.executable, *shown[1:]], {**os.environ, "PYTHONPATH": str(ROOT / "bench")}
            began = time.monotonic()
            try:
                done = subprocess.run(actual, cwd=work, capture_output=True, timeout=case.stop_after_s or BACKSTOP_S, env=env)
                output, exit_code, stopped = text_of(done.stdout) + text_of(done.stderr), done.returncode, None
            except subprocess.TimeoutExpired as expired:
                output, exit_code, stopped = text_of(expired.stdout) + text_of(expired.stderr), None, case.stop_after_s or BACKSTOP_S
            ms = round((time.monotonic() - began) * 1000)
            footer = f"-- exit {exit_code}" if stopped is None else f"-- stopped after {stopped:g} s by the capture's wall-clock limit"
            transcript.extend([f"== {case.id}: {' '.join(shown)}", *output.splitlines(), footer])
            results.append({"case": case, "argv": shown, "output": output, "exitCode": exit_code, "stoppedAfterS": stopped, "ms": ms, "footer": footer})
        # Readings through Z3's Python API, each in a fresh process on the same library: how the readers the api
        # entry does not use, or no longer uses, answer, as evidence for each rule (READINGS).
        readings: dict[str, dict[str, object]] = {}
        reading_lines: list[str] = []
        for reading in READINGS:
            text = reading.text
            if reading.read_text:
                held = work / f"{reading.key}.smt2"
                held.write_bytes(text.encode("utf-8"))
                text = held.read_text(encoding="utf-8")
            question = "(check-sat-assuming" if reading.assumptions else "(check-sat)"
            prefix = text.split(question, 1)[0]
            request = {"prefix": prefix, "reader": reading.reader, "assumptions": list(reading.assumptions), "rlimit": RLIMIT, "model": reading.model}
            done = subprocess.run([sys.executable, "-I", "-c", READER], input=json.dumps(request), cwd=work, capture_output=True, text=True, timeout=BACKSTOP_S, check=True)
            read: dict[str, Any] = json.loads(done.stdout)
            answer = str(read["answer"])
            source = f"Path.read_text of a file holding the case's text, then its text before {question}" if reading.read_text else f"the case's text before {question}"
            call = "add(parse_smt2_string(<prefix>))" if reading.reader == "parse_smt2_string" else "from_string(<prefix>)"
            check = "check()"
            if reading.assumptions:
                check = "check(*assumptions), each of the question's assumptions read as the api entry reads one, the last formula of parse_smt2_string(<prefix> + (assert <assumption>))"
            readings[reading.key] = {
                "case": reading.case,
                "answer": answer,
                "how": f"in a fresh Python process (python -I), on the library the api cases load: z3.Solver() under rlimit={RLIMIT}, {call} with <prefix> = {source}, {check}",
                "why": reading.why,
            }
            if reading.assumptions:
                readings[reading.key]["assumptions"] = list(reading.assumptions)
                readings[reading.key]["assumptions_read"] = read["assumptions_read"]
            printed: list[str] = []
            if "model" in read:
                readings[reading.key]["model"] = read["model"]
                readings[reading.key]["model_defines"] = read["model_defines"]
                printed = str(read["model"]).splitlines()
            reading_lines.extend([f"== {reading.title}", *(f"assumption {given} read as {taken}" for given, taken in zip(reading.assumptions, read["assumptions_read"])), answer, *printed])
    transcript.extend(reading_lines)
    duration = round(time.monotonic() - started, 3)

    # The fixture: what the readers are tested against.
    fixture_cases: list[dict[str, object]] = []
    for r in results:
        case: Case = r["case"]
        entry: dict[str, object] = {"id": case.id, "entry": case.entry, "input": case.text, "argv": r["argv"], "exitCode": r["exitCode"], "output": r["output"]}
        if r["stoppedAfterS"] is not None:
            entry["stoppedAfterS"] = r["stoppedAfterS"]
        entry["expect"] = {"verdictLines": case.lines, "verdict": case.verdict, "reason": case.reason, "model": None if case.model is None else list(case.model)}
        if case.note:
            entry["note"] = case.note
        fixture_cases.append(entry)
    document = {
        "about": f"Z3 verdict-line fixtures for the Z3 lane's reader (bench/statespace/lanes/z3.py) and the tab's (W1-T14): each captured case is the pinned engine's whole output, verbatim, with the verdict lines, verdict and reason the grammar gives, and the constants that the model printed after sat defines (expect.model: sorted names, [] for an empty model, null when no model is printed; the model is the last block after sat that is a list of define-fun items, with the declare-fun and forall items of a sort's universe); the synthetic cases are the grammar's edges. Written by scripts/spikes/W1-T29/capture-z3-lines.py, which records the execution as {RUN_ID}; the expectations are stated there by hand, not computed by the lane.",
        "captured": {
            "engine": "z3",
            "version": version,
            "version_line": version_line,
            "wheel": "z3-solver 5.3.1.0 (bench/uv.lock)",
            "binary_sha256": binary_sha,
            "library_sha256": library_sha,
            "rlimit": RLIMIT,
            "date": started_at[:10],
            "run": RUN_ID,
        },
        "cases": fixture_cases,
        "synthetic": SYNTHETIC,
    }
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    fixture_bytes = (json.dumps(document, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    FIXTURE.write_bytes(fixture_bytes)

    # The run's own files: the queries as Z3 read them, and the transcript.
    queries = FOLDER / "queries"
    queries.mkdir(parents=True, exist_ok=True)
    for stale in queries.glob("*.smt2"):
        stale.unlink()
    query_inputs: dict[str, dict[str, object]] = {}
    for r in results:
        case = r["case"]
        data = case.text.encode("utf-8")
        (queries / f"{case.id}.smt2").write_bytes(data)
        query_inputs[case.id] = {"path": f"runs/{RUN_ID}/queries/{case.id}.smt2", "sha256": sha256(data), "bytes": len(data), "role": "query"}
    log_bytes = ("\n".join(transcript) + "\n").encode("utf-8")
    (FOLDER / "capture.log").write_bytes(log_bytes)

    def verdict_lines() -> list[str]:
        lines: list[str] = []
        for r in results:
            case = r["case"]
            carried = case.lines or r["output"].splitlines()
            lines.extend([f"== {case.id}: {' '.join(r['argv'])}", *carried, r["footer"]])
        lines.extend(reading_lines)  # the readings, as capture.log ends
        return lines

    harness = Path(__file__).resolve()
    harness_input = {"path": harness.relative_to(ROOT).as_posix(), "sha256": sha256(harness.read_bytes()), "bytes": harness.stat().st_size, "role": "harness"}
    runner_input = {"path": runner.relative_to(ROOT).as_posix(), "sha256": sha256(runner.read_bytes()), "bytes": runner.stat().st_size, "role": "runner (the api entry)"}
    outputs = [
        {"path": f"runs/{RUN_ID}/capture.log", "sha256": sha256(log_bytes), "bytes": len(log_bytes), "kind": "log"},
        {"path": FIXTURE.relative_to(ROOT).as_posix(), "sha256": sha256(fixture_bytes), "bytes": len(fixture_bytes), "kind": "fixture"},
    ]
    values = {
        "cases": {
            r["case"].id: {
                "entry": r["case"].entry,
                "rlimit": r["case"].rlimit,
                "exit_code": r["exitCode"],
                "stopped_after_s": r["stoppedAfterS"],
                "ms": r["ms"],
                "verdict": r["case"].verdict,
                "reason": r["case"].reason,
            }
            for r in results
        },
        **readings,
        "z3_cli_sha256": binary_sha,
        "libz3_sha256": library_sha,
    }
    uv_version = subprocess.run(["uv", "--version"], capture_output=True, text=True).stdout.strip() or None
    record: dict[str, object] = {
        "id": RUN_ID,
        "title": f"Z3 5.3.1's whole output for {len(results)} SMT-LIB queries through the command line and the Python API under an rlimit: the verdict-line fixtures of the Z3 lane",
        "task": "W1-T29",
        "origin": "recorded",
        "records": "the outputs that the Z3 lane's verdict-line grammar and its fixture are written from: answers, reasons, errors before and after the answer with their exit codes, Z3's refusal of an rlimit above 2^32 - 1, check-sat-assuming through both entries, an assertion after the question, a script's own :rlimit replacing the command line's, a printed word that reads as an answer, an echoed answer before a stray parenthesis, a block comment that hides an echo, a backslash in a quoted symbol, named premises through both entries (with the answer of the parse_smt2_string reading the api entry no longer uses), a nonlinear term under QF_LIA through both entries, premises split by a NUL in a comment, a guard after a bare carriage return in a comment and a CRLF string literal through both entries (with the Path.read_text reading the api entry no longer uses), a DIMACS header, a named assumption, an assumption annotated with the quoted symbol |!|, an assumed Boolean constant tied to the formula through both entries, values and a term printed after the answer and before the model through both entries, and models turned off or printed as text; with the answers Solver.from_string gives to the NUL and DIMACS texts, and the answer under the named assumption read as the api entry reads an assumption, all of which the lane refuses",
        "engine": "z3",
        "version": version,
        "version_string": version_line,
        "binary": "bin/z3 from the z3-solver 5.3.1.0 wheel (bench/uv.lock), which statespace doctor pins as z3-cli; the api cases load lib/libz3.so from the same wheel (sha256 under configs and values), which doctor pins as z3",
        "binary_sha256": binary_sha,
        "image": None,
        "recorded_at": now(),
        "started_at": started_at,
        "duration_s": duration,
        "argv": [r["argv"] for r in results],
        "inputs": [*query_inputs.values(), runner_input, harness_input, WHEEL],
        "budget": {"rlimit": RLIMIT, "timeout_s": BACKSTOP_S, "cases": "every case ran under rlimit=5000000 except cli-rlimit-too-large (4294967296, which Z3 refuses); timeout_s is the capture's wall-clock backstop, 3 s for cli-script-rlimit-overrides"},
        "exit_code": None,
        "verdict_lines": verdict_lines(),
        "outputs": outputs,
        "values": values,
        "environment": {
            "os": f"{platform.system()} {platform.release()}",
            "cpu_count": os.cpu_count(),
            "ram_gib": ram_gib(),
            "cpu_architecture": platform.machine(),
            "python": f"{platform.python_implementation()} {platform.python_version()}",
            "uv": uv_version,
        },
        "configs": [
            {
                "id": r["case"].id,
                "purpose": ("the z3 binary, the Z3 lane's cli entry" if r["case"].entry == "cli" else "the Python API, the Z3 lane's api entry, with PYTHONPATH set to the repository's bench/ so that the runner is this repository's code") + (f": {r['case'].note}" if r["case"].note else ""),
                "origin": "recorded",
                "engine": "z3",
                "version": version,
                "binary_sha256": binary_sha if r["case"].entry == "cli" else library_sha,
                "image": None,
                "argv": r["argv"],
                "inputs": [query_inputs[r["case"].id], *([runner_input] if r["case"].entry == "api" else []), WHEEL],
                "budget": {"rlimit": r["case"].rlimit, "timeout_s": r["case"].stop_after_s or BACKSTOP_S},
                "exit_code": r["exitCode"],
                "verdict_lines": r["case"].lines or r["output"].splitlines(),
                "outputs": [f"runs/{RUN_ID}/capture.log"],
            }
            for r in results
        ],
        "unrecorded": [{"field": "exit_code", "reason": f"the run is {len(results)} commands, each with its own exit code: values.cases.<case>.exit_code, and the -- exit line after each case in verdict_lines and capture.log"}],
        "notes": [
            "Recorded by W1-T29 with scripts/spikes/W1-T29/capture-z3-lines.py, which writes this record, the fixture bench/statespace/check/fixtures/z3-verdict-lines.json, the queries under runs/RUN-z3-verdict-lines/queries/ and the transcript runs/RUN-z3-verdict-lines/capture.log from one execution. Each case ran in a scratch directory holding its query, so argv names the input by file name.",
            "verdict_lines holds, for each case, the transcript's == line naming the case and its command, the lines of Z3's output that the Z3 lane's grammar keeps (the answer, a reason that is not empty, every (error ...) line), or Z3's whole output when it holds none of those, and the transcript's -- line with the exit code. Models are not verdict lines; capture.log and the fixture hold every output verbatim.",
            "One configuration per case, named by the case: its command, its query, the hash of what ran (the z3 binary for a cli case, the native library for an api case), its exit code and its verdict lines. The top level lists every command in the order they ran, so it names no primary configuration.",
            "The expectations in the fixture (verdict lines, verdict, reason) are stated by hand in the capture script from the grammar, not computed by the lane, and the lane's tests read every captured output against them; the drift test in bench/statespace/check/tests/test_z3_lane.py re-executes every case against the pinned engine. statespace run re-executes a cli case with --config <case> where the pinned z3 is on PATH (uv run --project bench --group image); it does not re-execute the top level, whose argv holds several commands, or an api case, whose runner is the CLI's own code.",
            "cli-script-rlimit-overrides: a 3 s wall-clock limit of the capture's own stopped Z3, so its exit code is null; the same query under the command line's rlimit=5000000 without the option stops with unknown (canceled) in cli-unknown-rlimit.",
            "cli-syntax-error-no-answer, cli-stray-paren-after-echo, cli-block-comment-hides-echo, cli-backslash-in-quoted-symbol, cli-nul-in-comment, cli-dimacs-prefix, cli-named-assumption, cli-quoted-annotation-assumption, cli-produce-models-off, cli-model-off and cli-model-v1-text run Z3 directly on scripts that the Z3 lane refuses before they reach Z3 (check_script): they record why it refuses them.",
            "Each case's query is written and read as bytes, and its output decoded as UTF-8 with no line-ending translation, so the carriage returns of cli-cr-in-comment, cli-crlf-string and their api twins reach Z3 as given, and the NUL of cli-nul-in-comment too.",
            "values.<reading>: readings of a case's text through Z3's Python API, each in a fresh Python process (python -I; within one process, the API kept the names earlier texts defined, and a later reading's model defined them too), on the library the api cases load, each the text before the case's question read into z3.Solver() under rlimit=5000000 and checked, under the question's assumptions when the reading lists them (each read as the api entry reads an assumption, and listed as read under assumptions_read), and for the readings that record it, the model after sat as the api entry printed it, model().sexpr() (under model, with the names it defines under model_defines); they are the last == blocks of capture.log and of verdict_lines. " + "; ".join(f"{key}: {r['answer']} for {r['case']} ({r['why']})" for key, r in readings.items()) + ". Through the lane, both entries answer unsat to the named premises and sat to the guard after a carriage return, and the NUL and DIMACS texts, the annotated questions and the scripts that turn models off or print them as text never reach Z3.",
        ],
    }
    RECORD.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {FIXTURE.relative_to(ROOT)}: {len(results)} captured cases, {len(SYNTHETIC)} synthetic")
    print(f"wrote {RECORD.relative_to(ROOT)} and runs/{RUN_ID}/ in {duration} s; now run node scripts/runs/build-index.mjs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

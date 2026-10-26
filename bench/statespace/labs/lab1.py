"""LAB-1, Project 00, the counterexample lab (curriculum/S01-counterexample.md section 3; content/stages/S1/lab.yaml).

W1-T30's module: the six stages, their checks LAB-1.c1 to LAB-1.c6, and the claim templates they mint
(section 3.2). Nothing runs at import time: `statespace receipt verify` imports this module to compare a
receipt with the lab.

Every verdict comes from a Z3 run through the lane (`ctx.z3()`), under RLIMIT, read from Z3's own verdict
lines: never from an exit code, and never from what a learner's script printed. Every `sat` that a check
relies on is graded by replaying its model in plain Python integers against the course's reference
semantics, never by matching model values (spine section 9.1).

The learner's files are Z3Py modules with a small interface (labs/LAB-1/transfer.py, mint.py,
fixed/refund.py, holds.py). A check never imports them into this process: it runs this very module as a
subprocess, `python -I -m statespace.labs.lab1 <job> <out.json> <args>`, which imports them, calls the
interface and writes each question as SMT-LIB (`Solver.to_smt2()`). The check then puts each question
through the Z3 lane, so the receipt records every question with its hash, budget and verdict lines.

| Check | Reads | Passes when |
|---|---|---|
| LAB-1.c1 | intro.py (logged), starter.py | the pinned Z3 answers the starter's first question sat and its last unsat |
| LAB-1.c2 | transfer.violation_query | sat, and the model replays as an overdraft; whether the query misses a violation is reported |
| LAB-1.c3 | transfer.guard, guarded_violation_query; claims/cl-1-1.smt2 | guarded unsat; premises and guard sat; guard equivalent to amount <= a under the premises; the query and the statement equivalent to the premises, the guard and the negated property; the statement unsat, without its last assertion sat |
| LAB-1.c4 | mint.mint_query, broken/ and fixed/refund.py; claims/cl-1-4.smt2 | the clamp mints and the witness replays; the fixed rule does not mint for the defaults and two drawn parameter sets; it accepts some refund and leaves a rejected one unchanged; a drawn larger witness of the clamp's class does not mint; the statement unsat, without its last assertion sat |
| LAB-1.c5 | transfer.step, holds.fixed_capture, at_most_once_violation; claims/cl-1-2.smt2, cl-1-3.smt2 | the step conserves the total and has a model; on the base model and three drawn settings the buggy double capture breaks at-most-once with a witness that replays, the fixed one does not, and one fixed capture succeeds; both statements unsat, without their last assertions sat |
| LAB-1.c6 | labs/LAB-1/README.md, claims/cl-1-1.yaml, cl-1-4.yaml | the five headings hold text; every answer line matches a run of a receipt; the example model replays; both cards pass claim@1 validation against their receipts, statements and witnesses |
"""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-1"
STARTER = f"{LAB_DIR}/starter.py"
INTRO = f"{LAB_DIR}/intro.py"
TRANSFER = f"{LAB_DIR}/transfer.py"
MINT = f"{LAB_DIR}/mint.py"
BROKEN = f"{LAB_DIR}/broken/refund.py"
FIXED = f"{LAB_DIR}/fixed/refund.py"
HOLDS = f"{LAB_DIR}/holds.py"
README = f"{LAB_DIR}/README.md"
STATEMENTS = {"CL-1.1": "claims/cl-1-1.smt2", "CL-1.2": "claims/cl-1-2.smt2", "CL-1.3": "claims/cl-1-3.smt2", "CL-1.4": "claims/cl-1-4.smt2"}
CARDS = {"CL-1.1": ("claims/cl-1-1.yaml", "LAB-1.3"), "CL-1.4": ("claims/cl-1-4.yaml", "LAB-1.4")}
OVERDRAFT = "specimens/lab1-overdraft.json"
MINTED = "specimens/lab1-refund-mint.json"
PINNED = "5.3.1"  # the course's Z3 pin [X RUN-z3-starter]
RLIMIT = 5_000_000  # every run's budget, the lane's default [D]
HARNESS_S = 120.0  # a wall-clock backstop for the subprocess that asks the learner's modules [D]
ANSWERS = ("sat", "unsat", "unknown")
FAMILY = ("floor", "reserved", "fee")  # the refund rule's parameters, in the order refund() takes them


# ================================================================================== the checks' side
def _tcb(ctx: CheckContext, *encodings: str) -> None:
    ctx.tcb("z3-solver, the version each run records", "trusted")
    ctx.tcb("CPython", "trusted")
    for path in encodings:
        ctx.tcb(f"the encoding in {path}", "trusted")


def _harness(ctx: CheckContext, job: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run this module as a subprocess to ask the learner's modules (see the module docstring)."""
    from statespace.check import proc

    ctx.workdir.mkdir(parents=True, exist_ok=True)
    out = ctx.workdir / f"{job}.harness.json"
    argv = [sys.executable, "-I", "-m", "statespace.labs.lab1", job, str(out), json.dumps(args or {})]
    done = proc.run(argv, cwd=ctx.root, timeout_s=HARNESS_S)
    (ctx.workdir / f"{job}.harness.out").write_bytes(done.output.encode("utf-8"))
    if done.returncode is None:
        raise ToolUnavailable(f"Python did not start to read your modules: {done.error}")
    if done.timed_out:
        return {"error": f"reading your modules took longer than {HARNESS_S:g} s and was stopped", "queries": []}
    if not out.is_file():
        last = next((line for line in reversed(done.output.splitlines()) if line.strip()), "no output")
        return {"error": f"reading your modules stopped (exit code {done.returncode}): {last}", "queries": []}
    return json.loads(out.read_text(encoding="utf-8"))


class _Asker:
    """The questions one harness job wrote, asked through the stage's Z3 lane on demand."""

    def __init__(self, ctx: CheckContext, data: dict[str, Any], seed: int | None = None) -> None:
        self.ctx = ctx
        self.texts = {q["step"]: q["smt2"] for q in data.get("queries", [])}
        self.seed = seed

    def empty(self, step: str) -> bool:
        """Whether the question asserts nothing: a model of no constraints is no witness."""
        return "(assert" not in self.texts.get(step, "")

    def __call__(self, step: str, *, seeded: bool = False) -> Any:
        """Ask one question. Z3 reporting an error (a term it cannot read, two sorts for one name) fails the
        check and names the learner's spec: the question was not asked, so nothing was answered."""
        from statespace.lanes.z3 import query_script

        run = self.ctx.z3().run(query_script(self.texts[step]), step=step, rlimit=RLIMIT, seed=self.seed if seeded else None)
        if run.verdict == "error":
            line = next((l for l in run.verdict_lines if l.startswith(("(error", "statespace:"))), "no answer line")
            raise InputRefused(f"Z3 could not answer the question {step}: {line}")
        return run


def _ints(run: Any, *names: str) -> dict[str, int] | str:
    """The model's integer values for `names`, or the reason they cannot be read."""
    if run.model is None:
        return "Z3 answered sat but printed no model that statespace could read"
    values: dict[str, int] = {}
    for name in names:
        value = run.model.value(name)
        if value is None or isinstance(value, bool) or not isinstance(value, int):
            return f"the model gives no integer value to {name}: keep the given name {name} for that constant"
        values[name] = value
    return values


def _shown(values: dict[str, Any] | str) -> str:
    return values if isinstance(values, str) else ", ".join(f"{k} = {v}" for k, v in values.items())


def _answer_line(run: Any) -> str:
    """The line a learner copies under "Solver answer" in the README (LAB-1.c6 matches it with the receipt)."""
    return f"{run.step}: {run.verdict} (Z3 {run.version}, rlimit {run.rlimit})"


def _write_witness(ctx: CheckContext, rel: str, run: Any, values: dict[str, int], violates: str, replay: str) -> None:
    """A witness file in specimens/: the values come from the run, never from typing (labs/README.md 9.3)."""
    data = {
        "schema": "statespace/lab1-witness@0",
        "stage": ctx.stage.id,
        "receipt": (ctx.workdir.parent / f"{ctx.workdir.name}.json").relative_to(ctx.root).as_posix(),
        "step": run.step,
        "engine": "z3",
        "version": run.version,
        "rlimit": run.rlimit,
        "verdict": run.verdict,
        "violates": violates,
        "values": values,
        "replay": replay,
    }
    path = ctx.path(rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    ctx.note(f"witness written to {rel}")


def _without_last_assertion(text: str) -> str | None:
    """The statement's premise query: the script without the last (assert ...) before its question."""
    from statespace.lanes.z3 import QUESTIONS, forms, render

    found = forms(text)
    question = next((i for i, f in enumerate(found) if f.head in QUESTIONS), len(found))
    asserts = [i for i, f in enumerate(found[:question]) if f.head == "assert"]
    if not asserts:
        return None
    return "\n".join(render(f.expr) for i, f in enumerate(found) if i != asserts[-1]) + "\n"


def _statement(ctx: CheckContext, template: str) -> tuple[Any, Any] | CheckResult:
    """Pin the claim's statement, ask it (expect unsat) and ask it without its last assertion (expect
    sat). Returns both runs, or the failing result."""
    rel = STATEMENTS[template]
    text = ctx.statement(rel, "smt2")
    z3 = ctx.z3()
    step = Path(rel).stem
    run = z3.run(text, step=f"violation-{step}", rlimit=RLIMIT)
    premise_text = _without_last_assertion(text)
    if premise_text is None:
        return CheckResult(False, f"{rel} asserts nothing, so it holds no negated property to ask about", "spec", (f"Z3 answered {run.verdict}", "fill its TODO(you) lines"))
    premise = z3.run(premise_text, step=f"premise-{step}", rlimit=RLIMIT)
    if run.verdict != "unsat":
        return CheckResult(False, f"{rel} is {run.verdict}, not unsat: the statement your claim pins does not hold as written", "spec", (*run.verdict_lines[:3], "fill its TODO(you) lines: the negated property goes last"))
    if premise.verdict != "sat":
        return CheckResult(False, f"{rel} without its last assertion is {premise.verdict}, so its unsat says nothing: the premises contradict each other", "spec", ("a vacuous unsat: drop the assertion that empties the premises",))
    return run, premise


# ---------------------------------------------------------------------------------------- LAB-1.c1
def c1(ctx: CheckContext) -> CheckResult:
    _tcb(ctx, STARTER)
    z3 = ctx.z3()
    if ctx.path(INTRO).is_file():
        intro = ctx.z3py(INTRO)
        answers = [z3.run(q.text, step=q.step, rlimit=RLIMIT).verdict for q in intro.queries]
        ctx.note(f"intro.py, logged and not graded: Z3 answered {', '.join(answers) or 'nothing'}")
    capture = ctx.z3py(STARTER)
    if capture.error is not None:
        return CheckResult(False, f"starter.py did not run to the end: {capture.error}", "implementation", (f"its output is in {capture.log_path}",))
    if capture.version != PINNED:
        return CheckResult(False, f"z3.get_version_string() is {capture.version}, not the pinned {PINNED}", "tool", ("run it with uv run, which installs the pinned z3-solver",))
    runs = [z3.run(query.text, step=query.step, rlimit=RLIMIT) for query in capture.queries]
    verdicts = [run.verdict for run in runs]
    if runs and runs[-1].verdict in ANSWERS:
        z3.headline(runs[-1])
    printed = [line for line in capture.output_lines if line in ANSWERS]
    shown = ", ".join(verdicts) or "nothing"
    if len(runs) < 2:
        return CheckResult(False, f"starter.py asked {len(runs)} question{'s' if len(runs) != 1 else ''}; the starter asks two: the overdraft search, then the same search with the guard", "spec")
    if verdicts[0] != "sat":
        return CheckResult(False, f"Z3 answered the overdraft search {verdicts[0]}, not sat: the premises or the negated property changed", "spec", (f"answers in order: {shown}",))
    if verdicts[-1] == "sat":
        return CheckResult(False, "the last question still has a model: the sufficient-funds guard is not in it", "spec", (f"answers in order: {shown}", "the TODO(you) line in starter.py is where the guard goes"))
    if verdicts[-1] != "unsat":
        return CheckResult(False, f"Z3 gave the guarded question no answer ({verdicts[-1]}); read its verdict lines in the receipt", "tool", (f"answers in order: {shown}",))
    if printed[:1] != ["sat"] or printed[-1:] != ["unsat"]:
        return CheckResult(False, f"Z3 answered sat, then unsat, but starter.py printed {', '.join(printed) or 'no answer line'}", "implementation")
    return CheckResult(True, f"Z3 {capture.version} answered the overdraft search sat, then the guarded search unsat (rlimit {RLIMIT})")


# ---------------------------------------------------------------------------------------- LAB-1.c2
def _judge(checks: list[tuple[str, bool]]) -> tuple[bool, str]:
    failed = [label for label, ok in checks if not ok]
    return not failed, ("; ".join(label for label, _ in checks) if not failed else "fails " + "; ".join(failed))


def _replay_overdraft(v: dict[str, int]) -> tuple[bool, str]:
    return _judge([("a >= 0", v["a"] >= 0), ("b >= 0", v["b"] >= 0), ("amount > 0", v["amount"] > 0), (f"a - amount = {v['a'] - v['amount']} < 0", v["a"] - v["amount"] < 0)])


def c2(ctx: CheckContext) -> CheckResult:
    _tcb(ctx, TRANSFER)
    data = _harness(ctx, "c2")
    if data.get("error"):
        return CheckResult(False, f"transfer.py could not be asked: {data['error']}", "implementation")
    ask = _Asker(ctx, data)
    if ask.empty("violation-overdraft"):
        return CheckResult(False, "transfer.violation_query() returns no constraints, so any model would do and none is a counterexample", "spec", ("return the premises and the negated property",))
    run = ask("violation-overdraft")
    if run.verdict in ANSWERS:
        ctx.z3().headline(run)
    if run.verdict != "sat":
        return CheckResult(False, f"your violation query is {run.verdict}, not sat: it should ask for an allowed input that breaks the property", "spec", run.verdict_lines[:3])
    values = _ints(run, "a", "b", "amount")
    if isinstance(values, str):
        return CheckResult(False, f"your violation query has a model, but {values}", "spec", ("an empty query has a model too: return the premises and the negated property",))
    ok, replay = _replay_overdraft(values)
    if not ok:
        return CheckResult(False, f"the model {_shown(values)} is not an overdraft under the encoding: it {replay}", "spec", ("a model of your query must be an allowed input that leaves the sender below zero",))
    missed = ask("missed")
    if missed.verdict == "sat":
        ctx.note(f"reported, not required: your query would miss this violation: {_shown(_ints(missed, 'a', 'b', 'amount'))}")
    elif missed.verdict == "unsat":
        ctx.note("reported, not required: your query misses no violation that the premises allow")
    _write_witness(ctx, OVERDRAFT, run, values, "the sender is not left below zero (a - amount >= 0)", replay)
    return CheckResult(True, f"Z3 {run.version} found an overdraft, {_shown(values)}, and it replays: the sender ends at {values['a'] - values['amount']}", details=(f"README line: {_answer_line(run)}",))


# ---------------------------------------------------------------------------------------- LAB-1.c3
def c3(ctx: CheckContext) -> CheckResult:
    _tcb(ctx, TRANSFER, STATEMENTS["CL-1.1"])
    data = _harness(ctx, "c3", {"statement": STATEMENTS["CL-1.1"]})
    if data.get("error"):
        return CheckResult(False, f"transfer.py could not be asked: {data['error']}", "implementation")
    ask = _Asker(ctx, data)
    guarded, premises, guard_equiv, query_equiv = ask("violation-guarded"), ask("premise-guarded"), ask("guard-equiv"), ask("query-equiv")
    if guarded.verdict != "unsat":
        return CheckResult(False, f"your guarded violation query is {guarded.verdict}, not unsat: the guard does not stop the overdraft", "spec", guarded.verdict_lines[:3])
    if premises.verdict != "sat":
        return CheckResult(False, f"the premises and your guard together are {premises.verdict}: no transfer passes the guard, so the unsat says nothing", "spec", ("a vacuous unsat: the guard or the premises reject every input",))
    if guard_equiv.verdict == "sat":
        state = _ints(guard_equiv, "a", "b", "amount")
        verdict = "rejects" if isinstance(state, dict) and state["amount"] <= state["a"] else "admits"
        return CheckResult(False, f"your guard is not sufficient funds: it {verdict} the transfer {_shown(state)}", "spec", ("the guard must admit exactly the transfers with amount <= a, a full-balance transfer included",))
    if guard_equiv.verdict != "unsat":
        return CheckResult(False, f"Z3 gave no answer ({guard_equiv.verdict}) on whether your guard is sufficient funds", "tool", guard_equiv.verdict_lines[:3])
    if query_equiv.verdict != "unsat":
        state = _ints(query_equiv, "a", "b", "amount") if query_equiv.verdict == "sat" else query_equiv.verdict
        return CheckResult(False, "your guarded violation query is not the premises, the guard and the negated property", "spec", (f"a state on which they differ: {_shown(state)}", "extra constraints can make no model cheap"))
    if data.get("statement_error"):
        return CheckResult(False, f"{STATEMENTS['CL-1.1']} could not be read as a statement over a, b and amount: {data['statement_error']}", "spec")
    pinned = _statement(ctx, "CL-1.1")
    if isinstance(pinned, CheckResult):
        return pinned
    run, _ = pinned
    ctx.z3().headline(run)
    same = ask("statement-equiv")
    if same.verdict != "unsat":
        state = _ints(same, "a", "b", "amount") if same.verdict == "sat" else same.verdict
        return CheckResult(False, f"{STATEMENTS['CL-1.1']} is unsat, but it is not the premises, the sufficient-funds guard and the negated property", "spec", (f"a state on which they differ: {_shown(state)}",))
    ctx.claim("CL-1.1")
    return CheckResult(
        True,
        f"Z3 {run.version}: the guarded violation query and {STATEMENTS['CL-1.1']} are unsat, the premises with the guard are sat, and the guard is sufficient funds",
        details=(f"README line: {_answer_line(run)}",),
    )


# ---------------------------------------------------------------------------------------- LAB-1.c4
def _draw_refund(ctx: CheckContext) -> tuple[list[dict[str, int]], dict[str, int]]:
    """The default parameters, two parameter sets of the bug's family, and a larger witness of the
    clamp's class: r at least m + 2, so the clamp mints at least 2 on it."""
    rng = ctx.rng
    params = [{"floor": 0, "reserved": 0, "fee": 0}]
    for kind in rng.sample(FAMILY, 2):
        p = {"floor": 0, "reserved": 0, "fee": 0}
        p[kind] = rng.randint(1, 50)
        params.append(p)
    m = rng.randint(0, 1000)
    return params, {"c": rng.randint(0, 1000), "m": m, "r": m + rng.randint(2, 500)}


def _replay_mint(v: dict[str, int]) -> tuple[bool, str]:
    c2_, m2_ = v["c"] + v["r"], max(v["m"] - v["r"], 0)  # the clamp, in plain integers
    minted = c2_ + m2_ - (v["c"] + v["m"])
    return _judge([("c >= 0", v["c"] >= 0), ("m >= 0", v["m"] >= 0), ("r > 0", v["r"] > 0), (f"the clamp gives c = {c2_}, m = {m2_}, minting {minted} > 0", minted > 0)])


def _setting(p: dict[str, int]) -> str:
    return ", ".join(f"{name} = {value}" for name, value in p.items() if value) or "the default parameters"


def c4(ctx: CheckContext) -> CheckResult:
    _tcb(ctx, MINT, FIXED, STATEMENTS["CL-1.4"])
    params, witness = _draw_refund(ctx)
    data = _harness(ctx, "c4", {"params": params, "witness": witness})
    if data.get("error"):
        return CheckResult(False, f"your refund files could not be asked: {data['error']}", "implementation")
    ask = _Asker(ctx, data, seed=ctx.seed)
    if ask.empty("violation-mint-broken"):
        return CheckResult(False, "mint.mint_query() returns no constraints, so any model would do and none is a mint", "spec", ("return the premises and the mint: the new total above c + m",))
    broken = ask("violation-mint-broken")
    if broken.verdict != "sat":
        return CheckResult(False, f"your mint query on broken/refund.py is {broken.verdict}, not sat: it should find the clamp's mint", "spec", broken.verdict_lines[:3])
    values = _ints(broken, "c", "m", "r")
    if isinstance(values, str):
        return CheckResult(False, f"your mint query on the clamp has a model, but {values}", "spec", ("an empty query has a model too: return the premises and the mint",))
    ok, replay = _replay_mint(values)
    if not ok:
        return CheckResult(False, f"the model {_shown(values)} does not mint under the clamp: it {replay}", "spec")
    _write_witness(ctx, MINTED, broken, values, "a refund never leaves c + m larger than before", replay)
    for k, p in enumerate(params):
        run = ask(f"violation-mint-fixed-{k}", seeded=k > 0)
        if run.verdict == "sat":
            return CheckResult(False, f"your fixed rule still mints, with {_setting(p)}", "implementation", (f"a refund it accepts and that mints: {_shown(_ints(run, 'c', 'm', 'r'))}", "fix the class, not the instance"))
        if run.verdict != "unsat":
            return CheckResult(False, f"Z3 gave no answer ({run.verdict}) to the mint query on your fixed rule with {_setting(p)}", "tool", run.verdict_lines[:3])
    for k, p in enumerate(params):
        accepted = ask(f"premise-mint-fixed-{k}", seeded=k > 0)
        if accepted.verdict != "sat":
            return CheckResult(False, f"your fixed rule accepts no refund at all with {_setting(p)} ({accepted.verdict}): rejecting every refund is not a fix", "implementation")
    unchanged = ask("rejected-unchanged")
    if unchanged.verdict != "unsat":
        return CheckResult(False, "your fixed rule changes a balance when it rejects a refund", "implementation", (f"a rejected refund that moves money: {_shown(_ints(unchanged, 'c', 'm', 'r'))}", "a rejected refund leaves both balances as they were"))
    larger = ask("witness-class", seeded=True)
    if larger.verdict != "unsat":
        return CheckResult(False, f"your fixed rule mints on a larger witness of the clamp's class: {_shown(witness)}", "implementation", ("it must reject that refund, or move no more money than it takes",))
    pinned = _statement(ctx, "CL-1.4")
    if isinstance(pinned, CheckResult):
        return pinned
    run, _ = pinned
    ctx.z3().headline(run)
    ctx.claim("CL-1.4")
    drawn = " and ".join(f"({_setting(p)})" for p in params[1:])
    return CheckResult(
        True,
        f"Z3 {run.version}: the clamp mints ({_shown(values)} replays); your fixed rule does not, for the defaults and for {drawn}; it accepts some refund, leaves a rejected one unchanged and stops a larger witness",
        details=(f"README line: {_answer_line(run)}",),
    )


# ---------------------------------------------------------------------------------------- LAB-1.c5
def _draw_holds(ctx: CheckContext) -> list[dict[str, Any] | None]:
    """The base model, then three settings: the hold's amount, other holds pooled in `held`, its status."""
    rng = ctx.rng
    seeds: list[dict[str, Any] | None] = [None]
    for _ in range(3):
        seeds.append({"h": rng.randint(1, 1000), "pool": rng.randint(1, 5000), "status": rng.choice(("HELD", "HELD", "CAPTURED"))})
    return seeds


def _replay_double_capture(run: Any) -> tuple[bool, str]:
    v = _ints(run, "avail", "held", "merchant", "h", "merchant_pp")
    if isinstance(v, str):
        return False, v
    merchant2 = v["merchant"] + 2 * v["h"]  # the reference capture, twice
    return _judge([
        ("balances >= 0", min(v["avail"], v["held"], v["merchant"]) >= 0),
        ("h > 0 and held >= h", v["h"] > 0 and v["held"] >= v["h"]),
        (f"two captures give merchant'' = {merchant2}", v["merchant_pp"] == merchant2),
        (f"the merchant gains {merchant2 - v['merchant']} > h = {v['h']}", merchant2 - v["merchant"] > v["h"]),
    ])


def c5(ctx: CheckContext) -> CheckResult:
    _tcb(ctx, TRANSFER, HOLDS, STATEMENTS["CL-1.2"], STATEMENTS["CL-1.3"])
    seeds = _draw_holds(ctx)
    data = _harness(ctx, "c5", {"seeds": seeds})
    if data.get("error"):
        return CheckResult(False, f"transfer.py or holds.py could not be asked: {data['error']}", "implementation")
    ask = _Asker(ctx, data, seed=ctx.seed)
    conservation, step = ask("violation-conservation"), ask("premise-conservation")
    if conservation.verdict != "unsat":
        state = _ints(conservation, "a", "b", "a_p", "b_p") if conservation.verdict == "sat" else conservation.verdict
        return CheckResult(False, f"your transfer step does not conserve the total ({conservation.verdict})", "spec", (f"a step that changes it: {_shown(state)}",))
    if step.verdict != "sat":
        return CheckResult(False, f"your step relation is {step.verdict}, so conservation holds vacuously", "spec")
    for k, seed in enumerate(seeds):
        setting = "the base model" if seed is None else f"h = {seed['h']}, {seed['pool']} more held in the pool, status {seed['status']}"
        buggy = ask(f"violation-buggy-{k}", seeded=k > 0)
        if buggy.verdict != "sat":
            return CheckResult(False, f"on {setting}, the buggy capture applied twice is {buggy.verdict} on your at-most-once query: it should find the double capture", "spec", ("at_most_once_violation must say that the merchant gains more than h",))
        ok, replay = _replay_double_capture(buggy)
        if not ok:
            return CheckResult(False, f"on {setting}, the double-capture witness does not replay: it {replay}", "spec")
        fixed = ask(f"violation-capture-{k}", seeded=k > 0)
        if fixed.verdict != "unsat":
            return CheckResult(False, f"on {setting}, your fixed capture still pays the hold twice ({fixed.verdict})", "implementation", ("a capture must consult the hold's status, not the pooled balance",))
        if seed is None or seed["status"] == "HELD":
            once = ask(f"premise-capture-{k}", seeded=k > 0)
            if once.verdict != "sat":
                return CheckResult(False, f"on {setting}, no fixed capture succeeds ({once.verdict}): refusing every capture is not a fix", "implementation")
    lines = []
    for template in ("CL-1.2", "CL-1.3"):
        pinned = _statement(ctx, template)
        if isinstance(pinned, CheckResult):
            return pinned
        lines.append(f"README line: {_answer_line(pinned[0])}")
    ctx.z3().headline(pinned[0])
    ctx.claim("CL-1.2")
    ctx.claim("CL-1.3")
    drawn = " and ".join(f"(h = {s['h']}, pool +{s['pool']}, {s['status']})" for s in seeds[1:] if s)
    return CheckResult(
        True,
        f"Z3 {step.version}: the step conserves the total and has a model; on the base model and on {drawn}, the buggy double capture breaks at-most-once and replays, the fixed one does not; both statements are unsat and not vacuous",
        details=tuple(lines),
    )


# ---------------------------------------------------------------------------------------- LAB-1.c6
HEADINGS = ("Property", "Assumptions", "Solver answer", "Example model", "Limitations")
_HEADING = re.compile(r"^#{1,6}\s+(.*?)\s*#*\s*$")
_COMMENT = re.compile(r"<!--.*?-->", re.S)
_ANSWER = re.compile(r"^\s*(?:[-*+]\s+)?`?(?P<step>[A-Za-z0-9][A-Za-z0-9._-]*)`?\s*:\s*`?(?P<verdict>sat|unsat|unknown)`?\s*\(Z3 (?P<version>[0-9][0-9A-Za-z.+-]*), rlimit (?P<rlimit>[0-9]+)\)`?\s*$")
_PAIR = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?[0-9]+)\b")


def _sections(text: str) -> dict[str, str]:
    out: dict[str, list[str]] = {}
    current: str | None = None
    for line in _COMMENT.sub("", text).splitlines():
        m = _HEADING.match(line)
        if m:
            current = m.group(1).strip().lower()
            out.setdefault(current, [])
        elif current is not None:
            out[current].append(line)
    return {k: "\n".join(v).strip() for k, v in out.items()}


def _latest_receipts(root: Path) -> dict[str, tuple[str, dict[str, Any]]]:
    """The newest receipt of each LAB-1 stage, by createdAt: stage -> (path, receipt)."""
    found: dict[str, tuple[str, dict[str, Any]]] = {}
    base = root / "receipts"
    for path in sorted(base.glob("LAB-1.*/*.json")) if base.is_dir() else []:
        try:
            receipt = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        stage = receipt.get("stage")
        if not isinstance(stage, str) or receipt.get("lab") != "LAB-1":
            continue
        if stage not in found or str(receipt.get("createdAt", "")) > str(found[stage][1].get("createdAt", "")):
            found[stage] = (path.relative_to(root).as_posix(), receipt)
    return found


def _card(ctx: CheckContext, template: str) -> str | None:
    """claim@1 validation of one LAB-1 card (labs/README.md 9.2). Returns the problem, or None."""
    import yaml  # pyright: ignore[reportMissingModuleSource]

    from statespace.receipt import verify_file
    from statespace.schema.statement_hash import statement_hash_file
    from statespace.schema.validation import validate

    rel, stage = CARDS[template]
    text = ctx.text(rel)
    if any("TODO(you)" in line for line in text.splitlines() if not line.lstrip().startswith("#")):
        return f"{rel} still has fields marked TODO(you)"
    try:
        card = yaml.safe_load(text)
    except yaml.YAMLError as error:
        return f"{rel} is not YAML: {str(error).splitlines()[0]}"
    issues = validate("claim", card)
    if issues:
        return f"{rel} is not a claim@1 card: {issues[0]['instancePath'] or '/'} {issues[0]['message']}"
    if card.get("template") != template:
        return f"{rel} names template {card.get('template')}, not {template}"
    if "[P]" in str(card["requirement"].get("text", "")):
        return f"{rel}: requirement-fit is never [P]; say in words how the claim serves the requirement"
    statement = (card.get("statement") or {}).get("path")
    if statement != STATEMENTS[template]:
        return f"{rel} pins {statement}, not {STATEMENTS[template]}"
    method = card["method"]
    receipt_rel = method.get("receipt")
    if receipt_rel and ctx.path(receipt_rel).is_dir():  # a stage's folder names its newest receipt
        newest = _latest_receipts(ctx.root).get(stage)
        receipt_rel = newest[0] if newest and newest[0].startswith(receipt_rel.rstrip("/") + "/") else None
    if not receipt_rel or not ctx.path(receipt_rel).is_file():
        return f"{rel}: method.receipt {method.get('receipt')} is not a receipt in your repository"
    verification = verify_file(ctx.path(receipt_rel), root=ctx.root)
    if not verification.ok:
        problem = next((f.message for f in verification.findings if f.level == "fail"), "rejected")
        return f"{rel}: its receipt {receipt_rel} does not verify: {problem}"
    receipt = json.loads(ctx.text(receipt_rel))
    if receipt.get("stage") != stage:
        return f"{rel}: its receipt is of {receipt.get('stage')}, not {stage}"
    if not all(c.get("pass") for c in receipt.get("checks", [])):
        return f"{rel}: its receipt has a failing check"
    if not any(c.get("template") == template for c in receipt.get("claims", [])):
        return f"{rel}: its receipt mints no {template}"
    engines = {(r.get("engine"), r.get("version")) for r in receipt.get("runs", [])}
    if (str(method.get("tool", "")).lower(), str(method.get("version", ""))) not in engines:
        shown = ", ".join(sorted(f"{e} {v}" for e, v in engines)) or "no runs"
        return f"{rel}: method says {method.get('tool')} {method.get('version')}, and the receipt's runs are {shown}"
    pinned = {s.get("path"): s.get("sha256") for s in receipt.get("statements", [])}
    if statement not in pinned:
        return f"{rel}: its receipt pins no {statement}"
    now = statement_hash_file(ctx.path(statement))
    if pinned[statement] != now:
        return f"{rel}: {statement} changed after its receipt, so the claim voids to [?]: check the stage again"
    specimen = card["if_weakened"].get("specimen")
    if not specimen or not ctx.path(specimen).is_file():
        return f"{rel}: if_weakened names no witness file in your repository ({specimen})"
    try:
        values = {k: int(v) for k, v in json.loads(ctx.text(specimen))["values"].items()}
        ok, shown = (_replay_overdraft if template == "CL-1.1" else _replay_mint)(values)
    except (ValueError, KeyError, TypeError) as error:
        return f"{rel}: {specimen} holds no witness that can be replayed ({type(error).__name__}: {error})"
    if not ok:
        return f"{rel}: the if-weakened witness {_shown(values)} does not refute the card's proposition once weakened: it {shown}"
    return None


def c6(ctx: CheckContext) -> CheckResult:
    sections = _sections(ctx.text(README))
    missing = [h for h in HEADINGS if not sections.get(h.lower())]
    if missing:
        return CheckResult(False, f"README.md has no text under {', '.join(missing)}", "spec", ("each of the five headings needs text of your own; the comments under them do not count",))
    receipts = _latest_receipts(ctx.root)
    runs = {(r.get("step"), r.get("verdict"), r.get("version"), str((r.get("budget") or {}).get("rlimit"))) for _, receipt in receipts.values() for r in receipt.get("runs", [])}
    answers = [m for line in sections["solver answer"].splitlines() if (m := _ANSWER.match(line))]
    if not answers:
        return CheckResult(False, "README.md has no answer line under Solver answer", "spec", ("copy one from what statespace check printed, such as its README line for LAB-1.3",))
    for m in answers:
        if (m["step"], m["verdict"], m["version"], m["rlimit"]) not in runs:
            return CheckResult(False, f"the answer line '{m.group(0).strip()}' matches no run in your newest receipts", "spec", (f"receipts read: {', '.join(p for p, _ in receipts.values()) or 'none'}",))
    values = {k: int(v) for k, v in _PAIR.findall(sections["example model"])}
    if {"a", "b", "amount"} <= values.keys():
        ok, shown = _replay_overdraft(values)
    elif {"c", "m", "r"} <= values.keys():
        ok, shown = _replay_mint(values)
    else:
        return CheckResult(False, "the example model gives no witness that statespace can replay: a, b and amount, or c, m and r", "spec")
    if not ok:
        return CheckResult(False, f"the example model {_shown(values)} does not violate the property: it {shown}", "spec")
    for template in CARDS:
        ctx.statement(STATEMENTS[template], "smt2")
        problem = _card(ctx, template)
        if problem is not None:
            return CheckResult(False, problem, "spec")
    count = f"{len(answers)} answer line{'s' if len(answers) != 1 else ''}"
    return CheckResult(True, f"README.md holds the five fields, its {count} match your receipts, the example model replays, and both cards pass claim@1 validation")


# ================================================================================== the lab
def _stage(n: int, title: str, label: str, run: Callable[[CheckContext], CheckResult], claims: tuple[str, ...] = ()) -> Stage:
    return Stage(f"LAB-1.{n}", title, (CheckSpec(f"LAB-1.c{n}", label, run),), claims=claims)


LAB = Lab(
    "LAB-1",
    "Project 00, the counterexample lab",
    stages=(
        _stage(1, "Run the starter: sat, then unsat once the guard arrives", "The answer pair reproduces.", c1),
        _stage(2, "Find a transfer that makes the source balance negative", "Your violation query finds a real overdraft.", c2),
        _stage(3, "Add the sufficient-funds guard", "The guard works, and its answer is not empty.", c3, claims=("CL-1.1",)),
        _stage(4, "Introduce the buggy refund rule and fix the class", "The fix kills the whole class.", c4, claims=("CL-1.4",)),
        _stage(5, "Conservation and double capture as two-state properties", "Both properties give the expected answers on fresh seeds.", c5, claims=("CL-1.2", "CL-1.3")),
        _stage(6, "README and two claim cards", "The README matches the receipt, and the cards hold.", c6),
    ),
)


# ================================================================================== the subprocess
class _Refused(Exception):
    """The learner's module cannot be asked: missing, raising, or returning the wrong shape."""


def _load(root: Path, rel: str, name: str) -> Any:
    import importlib.util

    path = root / rel
    if not path.is_file():
        raise _Refused(f"{rel} is not in your lab repository")
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise _Refused(f"{rel} cannot be loaded as a Python module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    try:
        spec.loader.exec_module(module)
    except Exception as error:  # noqa: BLE001 - the learner's module may raise anything
        raise _Refused(f"{rel} raised {type(error).__name__}: {error}") from error
    return module


def _call(fn: Any, what: str, *args: Any) -> Any:
    if not callable(fn):
        raise _Refused(f"{what} is not defined")
    try:
        return fn(*args)
    except _Refused:
        raise
    except Exception as error:  # noqa: BLE001
        raise _Refused(f"{what} raised {type(error).__name__}: {error}") from error


def _bool(value: Any, what: str) -> Any:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    if isinstance(value, bool):
        return z3.BoolVal(value)
    if not z3.is_bool(value):
        raise _Refused(f"{what} returned {type(value).__name__}, not a Z3 Boolean expression")
    return value


def _constraints(value: Any, what: str) -> list[Any]:
    items = list(value) if isinstance(value, (list, tuple)) else [value]
    return [_bool(item, f"{what}, item {i + 1},") for i, item in enumerate(items)]


def _conj(items: list[Any]) -> Any:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    return z3.And(*items) if items else z3.BoolVal(True)


def _smt(constraints: list[Any]) -> str:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    solver = z3.Solver()
    solver.add(*constraints)
    return solver.to_smt2()


def _transfer(root: Path) -> tuple[Any, ...]:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    module = _load(root, TRANSFER, "lab1_transfer")
    _ints_of(module, TRANSFER, "a", "b", "amount", "a_p", "b_p")
    a, b, amount = z3.Ints("a b amount")
    a_p, b_p = z3.Ints("a_p b_p")
    return module, a, b, amount, a_p, b_p, [a >= 0, b >= 0, amount > 0]


def _ints_of(module: Any, rel: str, *names: str) -> None:
    """The given constants must still be Z3 Ints of their given names: the reference terms are Ints, and a
    witness is replayed by name."""
    import z3  # pyright: ignore[reportMissingTypeStubs]

    for name in names:
        value = getattr(module, name, None)
        if not (z3.is_const(value) and value.decl().name() == name):
            raise _Refused(f"{rel} no longer defines the constant {name}")
        if value.sort() != z3.IntSort():
            raise _Refused(f"{rel} declares {name} as {value.sort()}, not Int: LAB-1 is checked over Int, and the reference terms cannot be compared with yours")


def _job_c2(root: Path, args: dict[str, Any], out: dict[str, Any]) -> list[tuple[str, list[Any]]]:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    t, a, _b, amount, _, _, premises = _transfer(root)
    query = _constraints(_call(getattr(t, "violation_query", None), "transfer.violation_query()"), "transfer.violation_query()")
    return [("violation-overdraft", query), ("missed", [*premises, a - amount < 0, z3.Not(_conj(query))])]


def _job_c3(root: Path, args: dict[str, Any], out: dict[str, Any]) -> list[tuple[str, list[Any]]]:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    from statespace.lanes.z3 import question_parts

    t, a, _b, amount, _, _, premises = _transfer(root)
    guard = _bool(_call(getattr(t, "guard", None), "transfer.guard()"), "transfer.guard()")
    query = _constraints(_call(getattr(t, "guarded_violation_query", None), "transfer.guarded_violation_query()"), "transfer.guarded_violation_query()")
    asked = [
        ("violation-guarded", query),
        ("premise-guarded", [*premises, guard]),
        ("guard-equiv", [*premises, guard != (amount <= a)]),
        ("query-equiv", [z3.Not(_conj(query) == _conj([*premises, guard, a - amount < 0]))]),
    ]
    try:
        text = (root / args["statement"]).read_bytes().decode("utf-8")
        before, assumptions = question_parts(text)
        parsed = list(z3.parse_smt2_string(before)) + [z3.parse_smt2_string(f"{before}\n(assert {lit})")[-1] for lit in assumptions]
        asked.append(("statement-equiv", [z3.Not(_conj(parsed) == _conj([*premises, amount <= a, a - amount < 0]))]))
    except Exception as error:  # noqa: BLE001 - a statement Z3 cannot read, or one over other sorts, is the learner's to fix
        message = str(error).strip()
        out["statement_error"] = f"{type(error).__name__}: {message.splitlines()[0] if message else 'no message'}"
    return asked


def _job_c4(root: Path, args: dict[str, Any], out: dict[str, Any]) -> list[tuple[str, list[Any]]]:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    mint = _load(root, MINT, "lab1_mint")
    _ints_of(mint, MINT, "c", "m", "r")
    broken = _load(root, BROKEN, "lab1_broken_refund")
    fixed = _load(root, FIXED, "lab1_fixed_refund")
    c, m, r = z3.Ints("c m r")
    premises = [c >= 0, m >= 0, r > 0]

    def bound(module: Any, label: str, params: dict[str, int]) -> Callable[..., Any]:
        def rule(c_: Any, m_: Any, r_: Any) -> Any:
            got = _call(getattr(module, "refund", None), f"{label} refund()", c_, m_, r_, *(params[k] for k in FAMILY))
            if not (isinstance(got, (list, tuple)) and len(got) == 3):
                raise _Refused(f"{label} refund() returned {type(got).__name__}, not (new c, new m, accepted)")
            return got[0], got[1], _bool(got[2], f"{label} refund()'s accepted flag")

        return rule

    def ask_mint(module: Any, label: str, params: dict[str, int]) -> list[Any]:
        query = _constraints(_call(getattr(mint, "mint_query", None), "mint.mint_query()", bound(module, label, params)), "mint.mint_query()")
        keep = params["floor"] + params["reserved"]
        return [*query, m >= keep] if keep else query  # a merchant starts with at least what it must keep

    params = args["params"]
    asked = [("violation-mint-broken", ask_mint(broken, "broken/refund.py", params[0]))]
    for k, p in enumerate(params):
        asked.append((f"violation-mint-fixed-{k}", ask_mint(fixed, "fixed/refund.py", p)))
        _, _, accepted = bound(fixed, "fixed/refund.py", p)(c, m, r)
        keep = p["floor"] + p["reserved"]
        asked.append((f"premise-mint-fixed-{k}", [*premises, accepted, *([m >= keep] if keep else [])]))
    c2_, m2_, ok = bound(fixed, "fixed/refund.py", params[0])(c, m, r)
    asked.append(("rejected-unchanged", [*premises, z3.Not(ok), z3.Or(c2_ != c, m2_ != m)]))
    w = args["witness"]
    asked.append(("witness-class", [*premises, c == w["c"], m == w["m"], r == w["r"], c2_ + m2_ > c + m]))
    return asked


def _job_c5(root: Path, args: dict[str, Any], out: dict[str, Any]) -> list[tuple[str, list[Any]]]:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    t, a, b, _amount, a_p, b_p, _ = _transfer(root)
    step = _bool(_call(getattr(t, "step", None), "transfer.step()"), "transfer.step()")
    asked = [("violation-conservation", [step, a_p + b_p != a + b]), ("premise-conservation", [step])]
    holds = _load(root, HOLDS, "lab1_holds")
    try:
        s0, s1, s2, h = holds.S0, holds.S1, holds.S2, holds.h
        statuses = {"HELD": holds.HELD, "CAPTURED": holds.CAPTURED}
    except AttributeError as error:
        raise _Refused(f"holds.py no longer defines the given names: {error}") from error
    if h.sort() != z3.IntSort() or s0.held.sort() != z3.IntSort():
        raise _Refused(f"{HOLDS} declares its balances as {h.sort()}, not Int: LAB-1 is checked over Int")

    def buggy(x: Any, y: Any) -> Any:  # the reference capture of SP-1.2: no guard
        return z3.And(y.held == x.held - h, y.merchant == x.merchant + h, y.avail == x.avail, y.status == statuses["CAPTURED"])

    def fixed(x: Any, y: Any) -> Any:
        return _bool(_call(getattr(holds, "fixed_capture", None), "holds.fixed_capture()", x, y), "holds.fixed_capture()")

    violation = _bool(_call(getattr(holds, "at_most_once_violation", None), "holds.at_most_once_violation()", s0, s2), "holds.at_most_once_violation()")
    for k, seed in enumerate(args["seeds"]):
        start = [s0.avail >= 0, s0.held >= 0, s0.merchant >= 0, h > 0, s0.held >= h]
        if seed is None:
            start.append(s0.status == statuses["HELD"])
        else:
            start += [h == seed["h"], s0.held == seed["h"] + seed["pool"], s0.status == statuses[seed["status"]]]
        asked.append((f"violation-buggy-{k}", [*start, buggy(s0, s1), buggy(s1, s2), violation]))
        asked.append((f"violation-capture-{k}", [*start, fixed(s0, s1), fixed(s1, s2), violation]))
        if seed is None or seed["status"] == "HELD":
            asked.append((f"premise-capture-{k}", [*start, fixed(s0, s1)]))
    return asked


JOBS: dict[str, Callable[[Path, dict[str, Any], dict[str, Any]], list[tuple[str, list[Any]]]]] = {"c2": _job_c2, "c3": _job_c3, "c4": _job_c4, "c5": _job_c5}


def _main(job: str, out_path: str, raw: str) -> int:
    if job not in JOBS:
        sys.stderr.write(f"unknown job {job}; one of {', '.join(JOBS)}\n")
        return 2
    root = Path.cwd()
    out: dict[str, Any] = {"queries": [], "error": None}
    sys.path.insert(0, str(root / LAB_DIR))
    try:
        asked = JOBS[job](root, json.loads(raw), out)
        out["queries"] = [{"step": step, "smt2": _smt(constraints)} for step, constraints in asked]
    except _Refused as error:
        out["error"] = str(error)
    except Exception as error:  # noqa: BLE001 - such as a sort mismatch between the learner's terms and the reference's
        out["error"] = f"{type(error).__name__}: {str(error).strip() or 'no message'}"
    Path(out_path).write_text(json.dumps(out), encoding="utf-8")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.stderr.write("usage: python -I -m statespace.labs.lab1 <job> <out.json> <args-json>\n")
        raise SystemExit(2)
    raise SystemExit(_main(*sys.argv[1:]))

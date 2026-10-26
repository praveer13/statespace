"""LAB-10, Core assembly (curriculum/S10-assembly.md section 3; content/stages/S10/lab.yaml).

W5-T07's module, built happy path first (2026-10-26). Every stage of the lab is declared with its check
and the claim templates it mints. The checks read the learner's Core through the NDJSON wire of
statespace/demo/adapter.py, run every solver query through the Bench's Z3 lane (so each is recorded in the
receipt with its rlimit and verdict lines), run PostgreSQL at STATESPACE_PG_DSN, and compare with the
reference pipeline (statespace/demo/, reference modules that earn nothing).

| Check | What it runs | Lane |
|---|---|---|
| LAB-10.c1 | the reference pipeline on TransferWithFee, compared with the recorded skeleton; your report/skeleton.json | Z3, PostgreSQL |
| LAB-10.c2 | your parser, typechecker, checker and interpreter on the fixture corpus and on proposals drawn now | Z3 |
| LAB-10.c3 | your compiler, runtime and simulator on the run fixtures, on PostgreSQL | PostgreSQL |
| LAB-10.c4 | a proposal drawn now through your parser and typechecker; your intake files | none |
| LAB-10.c5 | your verdict against the reference key; witness replay, minimality, specimen; cvc5 on a sound proposal | Z3, cvc5 |
| LAB-10.c6 | your corrected command through your compiler and runtime: differential and simulation suites | Z3, PostgreSQL |
| LAB-10.c7 | demo/ replayed: hashes, receipts, statements, CL-10.1, the witness | none |
| LAB-10.c8 | report/report.md against traversal rules T1, T2, T5 and T8 and the stamp of every line | none |
| LAB-10.c9 | bundle/: links, hashes, receipts, privacy lint, license, reproduction | none |

Not built yet, and said so where it matters: the tab's re-check of LAB-10.2, LAB-10.4 and LAB-10.5 (these
checks run the same comparisons on the Bench and report them); TLC trace validation (LAB-8's
`statespace trace validate`; the simulation suite here runs the trace lint and a replay through the
reference interpreter); report@1 and `statespace export --section` (W5-T06; LAB-10.c8 checks the rules it
can read from Markdown); the clean-clone build of LAB-10.c9; and a PostgreSQL lane (W4-T16), so the
PostgreSQL runs are shown as reported when a receipt is verified.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, Lab, Stage, ToolUnavailable

RLIMIT = 5_000_000
N_DIFFERENTIAL = 200  # the floor of LAB-6.c4 as LAB-10.c6 reads it [D]
N_SIM_SEEDS = 10  # the floor of LAB-8.c6 as LAB-10.c6 reads it [D]
RECORDED = "labs/LAB-10/challenge/RUN-core-demo.skeleton.json"
INTAKE = "labs/LAB-10/intake"
CLAIM_INTAKE = "claims/cl-10-intake.yaml"


# ------------------------------------------------------------------------------------------- helpers
def _ask(ctx: CheckContext) -> Any:
    from statespace.demo.pipeline import z3_ask

    return z3_ask(ctx.z3(), RLIMIT)


def _pg(ctx: CheckContext) -> tuple[Any, str, dict[str, str]]:
    from statespace.demo import sqlplan

    dsn = os.environ.get("STATESPACE_PG_DSN")
    if not dsn:
        raise ToolUnavailable("no PostgreSQL: set STATESPACE_PG_DSN (the devcontainer sets it to its PostgreSQL 18.6 service)")
    try:
        conn = sqlplan.connect(dsn)
    except Exception as error:  # noqa: BLE001 - a database that is not there means nothing was judged
        raise ToolUnavailable(f"PostgreSQL at STATESPACE_PG_DSN did not answer: {error}") from error
    info = sqlplan.server_info(conn)
    ctx.tcb(f"PostgreSQL {info['server_version']}", "trusted")
    ctx.ext.setdefault("lab10", {})["postgres"] = info["version"]
    return conn, dsn, info


def _core(ctx: CheckContext, needs: tuple[str, ...]) -> tuple[Any, CheckResult | None]:
    from statespace.demo.adapter import Core, CoreFault, CoreMissing

    try:
        core = Core(ctx.root)
    except CoreMissing as error:
        return None, CheckResult(False, str(error), "implementation", ("labs/LAB-10/core.toml names the command that runs your Core; its comments, and labs/LAB-10/README.md section 3, say what each component answers",))
    try:
        components = core.hello()
    except CoreFault as error:
        core.close()
        return None, CheckResult(False, str(error), "implementation")
    missing = [c for c in needs if c not in components]
    if missing:
        core.close()
        return None, CheckResult(False, f"your Core's hello names no {', '.join(missing)} component", "implementation", (f"it names: {', '.join(components) or 'nothing'}",))
    for name, where in components.items():
        if ".statespace/" in where or "statespace/demo" in where:
            core.close()
            return None, CheckResult(False, f"your {name} component is the course's reference module ({where}); the Core is the one you built", "implementation")
    return core, None


def _fault(error: Exception) -> CheckResult:
    return CheckResult(False, str(error), "implementation")


def _values(run: Any) -> dict[str, int]:
    out: dict[str, int] = {}
    if run.model is not None:
        for name in run.model.constants:
            v = run.model.value(name)
            if isinstance(v, int) and not isinstance(v, bool):
                out[name] = v
    return out


def _learner_check(ctx: CheckContext, core: Any, program: dict[str, Any], types: dict[str, str], step: str) -> dict[str, Any]:
    """Your checker's queries through the Z3 lane: each obligation's verdict class and, when refuted, the
    model as a witness by role (obligations.py's vocabulary)."""
    from statespace.demo import obligations
    from statespace.demo.obligations import Answer

    reply = core.request({"op": "check", "program": program, "types": types})
    obs = {o.get("name"): o for o in reply.get("obligations", []) if isinstance(o, dict)}
    out: dict[str, Any] = {}
    z3 = ctx.z3()
    for name in obligations.OBLIGATIONS:
        o = obs.get(name)
        if not o or not isinstance(o.get("query"), str) or not isinstance(o.get("premise"), str):
            out[name] = {"class": "MISSING"}
            continue
        q = z3.run(o["query"], step=f"{step}-{name}", rlimit=RLIMIT)
        p = z3.run(o["premise"], step=f"{step}-{name}-premise", rlimit=RLIMIT)
        a, b = Answer(q.verdict, _values(q), q), Answer(p.verdict, _values(p), p)
        entry: dict[str, Any] = {"class": obligations.classify(a, b), "verdict": q.verdict, "premise": p.verdict, "run": q}
        if q.verdict == "sat":
            entry["witness"] = obligations.decode(a, program, types)
        out[name] = entry
    return out


# ------------------------------------------------------------------------------------------- LAB-10.c1
def c1(ctx: CheckContext) -> CheckResult:
    from statespace.demo import pipeline
    from statespace.demo.cli import first_difference
    from statespace.demo.proposals import DEFAULT

    recorded = json.loads(ctx.text(RECORDED))
    for part in ("reference parser", "reference typechecker", "reference checker", "reference interpreter", "reference compiler", "reference runtime"):
        ctx.tcb(f"the {part} (statespace demo; reference module)", "trusted")
    yours = ctx.path("report/skeleton.json")
    if not yours.is_file():
        return CheckResult(False, "report/skeleton.json is not there: run `uv run statespace demo` first, and read what it prints", "implementation")
    try:
        learner = json.loads(ctx.text("report/skeleton.json"))
    except json.JSONDecodeError as error:
        return CheckResult(False, f"report/skeleton.json is not JSON ({error}): run `uv run statespace demo` again", "implementation")
    conn, _dsn, info = _pg(ctx)
    try:
        sk = pipeline.skeleton(_ask(ctx), DEFAULT.source, DEFAULT.claim, conn, run_sink=ctx.runs.append)
    finally:
        conn.close()
    z3 = ctx.z3()
    head = next((r for r in z3.runs if r.step == "proposal-nonneg"), None)
    if head is not None:
        z3.headline(head)
    diff = first_difference(sk, recorded)
    if diff is not None:
        return CheckResult(False, f"the reference pipeline here differs from RUN-core-demo first at {diff}", "tool",
                           ("compare the receipt's tools[] with the pins: `uv run statespace doctor`", f"PostgreSQL here: {info['version']}"))
    diff = first_difference(learner, recorded)
    if diff is not None:
        return CheckResult(False, f"report/skeleton.json differs from RUN-core-demo first at {diff}", "implementation", ("run `uv run statespace demo` again and do not edit what it writes",))
    return CheckResult(True, f"the skeleton reproduces RUN-core-demo: {len(sk['sections'])} sections, {len(sk['verdictLines'])} verdict lines and {len(sk['statements'])} statement hashes equal",
                       details=tuple(f"  {line}" for line in sk["verdictLines"] if line.startswith(("check nonneg:", "witness", "postgres proposal"))))


# ------------------------------------------------------------------------------------------- LAB-10.c2
def c2(ctx: CheckContext) -> CheckResult:
    from statespace.demo import corpus, lang, obligations, pipeline, semantics
    from statespace.demo.adapter import CoreFault
    from statespace.demo.proposals import draw

    core, failed = _core(ctx, ("parse", "typecheck", "check", "interp"))
    if failed:
        return failed
    ctx.tcb("your parser, typechecker, checker and interpreter (labs/LAB-10/core.toml)", "tested")
    ctx.tcb("the reference front end and interpreter (statespace/demo; reference modules)", "trusted")
    seeds = [ctx.rng.randrange(2**32) for _ in range(4)]
    drawn = [(f"drawn-{s}", draw(s).source) for s in seeds]
    counts = {"ir": 0, "typing": 0, "obligations": 0, "replays": 0, "interp": 0}
    try:
        # (a) IR equal to the reference export on every golden
        sources = [(n, s) for n, s in corpus.PROGRAMS.items()] + [(f, s) for f, s, _ in corpus.TYPING] + [(f, s) for f, s, _ in corpus.CHECKER] + drawn
        for fid, source in sources:
            ref = lang.parse_command(source)
            reply = core.request({"op": "parse", "source": source})
            if not reply.get("ok") or reply.get("program") != ref:
                got = reply.get("program") if reply.get("ok") else reply.get("error")
                return CheckResult(False, f"{fid}: your parser's IR differs from the reference export", "implementation",
                                   (f"reference: {json.dumps(ref)[:240]}", f"yours:     {json.dumps(got)[:240]}"))
            counts["ir"] += 1
        # (b) the typing goldens
        for fid, source, rule in [*corpus.TYPING, *[(f, s, None) for f, s in drawn]]:
            ref_rule, ref_types = None, None
            try:
                ref_types = lang.typecheck(lang.parse_command(source))["types"]
            except lang.TypeErr as error:
                ref_rule = error.rule
            reply = core.request({"op": "typecheck", "program": lang.parse_command(source)})
            got_rule = None if reply.get("ok") else reply.get("rule")
            if got_rule != ref_rule or (ref_rule is None and reply.get("types") != ref_types):
                return CheckResult(False, f"{fid}: your typechecker says {got_rule or 'well typed'}, the typing golden says {ref_rule or 'well typed'}", "implementation",
                                   (f"your types: {reply.get('types')}", f"reference types: {ref_types}") if ref_rule is None else ())
            counts["typing"] += 1
        # (c) the reference checker's verdict class on every fixture obligation; (d) replay; (e) no [P] without a premise witness
        fixtures = [(f, s, exp) for f, s, exp in corpus.CHECKER]
        for fid, source in drawn:
            try:
                program, types, _ = pipeline.front(source)
            except (lang.ParseError, lang.TypeErr):
                continue
            ref = pipeline.check_program(_ask(ctx), program, types, f"ref-{fid}", shrink=False)
            fixtures.append((fid, source, {n: ref["obligations"][n]["class"] for n in obligations.OBLIGATIONS}))
        for fid, source, expected in fixtures:
            program, types, _ = pipeline.front(source)
            yours = _learner_check(ctx, core, program, types, f"you-{fid}")
            for name in obligations.OBLIGATIONS:
                got = yours[name]["class"]
                if got != expected[name]:
                    hint = " (an unsat with unsat premises is VACUOUS: no [P] without a premise witness)" if expected[name] == "VACUOUS" else ""
                    return CheckResult(False, f"{fid}: your checker's {name} obligation is {got}, the reference's is {expected[name]}{hint}", "implementation",
                                       (f"your query answered {yours[name].get('verdict')}, its premises {yours[name].get('premise')}",))
                counts["obligations"] += 1
                if got == "REFUTED":
                    state, args = obligations.concretize(yours[name]["witness"], program, types)
                    ref_out = semantics.run(program, types, state, args)
                    mine = core.request({"op": "interp", "program": program, "types": types, "state": state, "args": args})
                    if (mine.get("ok"), mine.get("state") if mine.get("ok") else mine.get("err")) != (ref_out["ok"], ref_out["state"] if ref_out["ok"] else ref_out["err"]):
                        return CheckResult(False, f"{fid}: your interpreter and the reference disagree on your {name} witness", "implementation", (f"state {state}, call {args}", f"yours {mine}", f"reference {ref_out}"))
                    if not ref_out["ok"] or not semantics.inv_violations(ref_out["state"]):
                        return CheckResult(False, f"{fid}: your {name} witness does not replay: the interpreter gives {semantics.outcome_class(ref_out)} with Inv intact", "implementation", (f"state {state}, call {args}",))
                    counts["replays"] += 1
        # interpreter agreement on the run fixtures and on states drawn now
        cases = [(fid, corpus.PROGRAMS[name], state, args) for fid, name, state, args, _ in corpus.RUN_FIXTURES]
        for k in range(12):
            name = ctx.rng.choice(sorted(corpus.PROGRAMS))
            program, types, _ = pipeline.front(corpus.PROGRAMS[name])
            state, args = _random_case(ctx.rng, program, types)
            cases.append((f"seeded-{k}", corpus.PROGRAMS[name], state, args))
        for fid, source, state, args in cases:
            program, types, _ = pipeline.front(source)
            ref_out = semantics.run(program, types, state, args)
            mine = core.request({"op": "interp", "program": program, "types": types, "state": state, "args": args})
            if semantics.outcome_class(mine) != semantics.outcome_class(ref_out) or (ref_out["ok"] and mine.get("state") != ref_out["state"]):
                return CheckResult(False, f"{fid}: your interpreter gives {semantics.outcome_class(mine)}, the reference {semantics.outcome_class(ref_out)}", "implementation",
                                   (f"state {state}", f"call {args}", f"yours {mine.get('state')}", f"reference {ref_out.get('state')}"))
            counts["interp"] += 1
    except CoreFault as error:
        return _fault(error)
    finally:
        core.close()
    n = sum(counts.values())
    return CheckResult(True, f"your pipeline agrees with the fixtures end to end: n = {n} samples ({counts['ir']} IR, {counts['typing']} typing, {counts['obligations']} obligations, {counts['replays']} witness replays, {counts['interp']} interpreter calls), seeds {', '.join(map(str, seeds))}",
                       details=("the IR is compared with the reference front end's; the Lean export (LAB-3.7) joins the comparison when it ships",))


def _random_case(rng: Any, program: dict[str, Any], types: dict[str, str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """A state and a call drawn for a differential case: account parameters on a pool of four accounts, so
    some calls name one account twice; one call in twenty names an account that does not exist."""
    pool = ["a0", "a1", "a2", "a3"]
    balances = {a: rng.randrange(0, 61) for a in pool}
    balances["sink"] = rng.randrange(0, 11)
    balances["mint"] = -sum(balances.values())
    args: dict[str, Any] = {}
    for p in program["params"]:
        ty = types[p["name"]]
        if ty == "account":
            args[p["name"]] = "ghost" if rng.random() < 0.05 else rng.choice(pool)
        elif ty == "amount":
            args[p["name"]] = rng.randrange(1, 41)
        elif ty == "bool":
            args[p["name"]] = rng.random() < 0.5
        else:
            args[p["name"]] = rng.randrange(-5, 41)
    return {"balances": dict(sorted(balances.items()))}, args


# ------------------------------------------------------------------------------------------- LAB-10.c3
def _learner_execute(core: Any, dsn: str) -> Any:
    def execute(_conn: Any, plan: Any, args: dict[str, Any]) -> dict[str, Any]:
        reply = core.request({"op": "run", "plan": plan, "args": args, "dsn": dsn})
        outcome = reply.get("outcome") if isinstance(reply.get("outcome"), dict) else {"ok": False, "err": "noOutcome"}
        return {"outcome": outcome, "isolation": reply.get("isolation"), "attempts": reply.get("attempts") if isinstance(reply.get("attempts"), list) else []}

    return execute


def _sim_calls(rng: Any, program: dict[str, Any], types: dict[str, str], n: int = 6) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    state, _ = _random_case(rng, program, types)
    calls = [_random_case(rng, program, types)[1] for _ in range(n)]
    return state, calls


def c3(ctx: CheckContext) -> CheckResult:
    import random

    from statespace.demo import corpus, pipeline, sim
    from statespace.demo.adapter import CoreFault

    core, failed = _core(ctx, ("compile", "run", "sim"))
    if failed:
        return failed
    ctx.tcb("your compiler, runtime and simulator (labs/LAB-10/core.toml)", "tested")
    conn, dsn, info = _pg(ctx)
    groups: dict[str, int] = {}
    try:
        execute = _learner_execute(core, dsn)
        cases = pipeline.run_pg_corpus(conn, lambda p, t: core.request({"op": "compile", "program": p, "types": t}).get("plan"), execute)
        for case in cases:
            ctx.runs.append(pipeline.pg_run_record(case, info["server_version"], f"you-pg-{case['id']}", {"fixture": case["id"]}, {}))
            for a in case["attempts"]:
                if isinstance(a, dict) and a.get("sqlstate"):
                    groups[str(a["sqlstate"])] = groups.get(str(a["sqlstate"]), 0) + 1
        bad = next((c for c in cases if not c["agrees"]), None)
        if bad:
            return CheckResult(False, f"{bad['id']}: PostgreSQL gives {bad['pg']} through your runtime, the interpreter {bad['interp']} (expected on PostgreSQL: {bad['expected']})", "implementation",
                               (f"rows read back: {bad['rows']['balances']}",))
        bad = next((c for c in cases if not c["rsd"]), None)
        if bad:
            return CheckResult(False, f"{bad['id']}: R(S, D) fails after the call: the rows read back are not the interpreter's state", "implementation",
                               (f"rows {bad['rows']['balances']}", f"interpreter {bad['interpState']}"))
        iso = sorted({str(c["isolation"]) for c in cases})
        if iso != ["serializable"]:
            return CheckResult(False, f"transaction_isolation read back {', '.join(iso)}, not serializable", "implementation")
        overflow = next(c for c in cases if c["id"] == "edge-overflow")
        retried = [a for a in overflow["attempts"] if isinstance(a, dict) and a.get("sqlstate") == "22003" and a.get("result") == "retry"]
        if retried or len(overflow["attempts"]) != 1:
            return CheckResult(False, f"your runtime retried a value out of range: the attempt log of edge-overflow holds {len(overflow['attempts'])} attempts", "implementation",
                               (f"attempts: {overflow['attempts']}",))
        program, types, _ = pipeline.front(corpus.PROGRAMS["Transfer"])
        state, calls = _sim_calls(random.Random(1), program, types)
        trace = core.request({"op": "sim", "program": program, "types": types, "state": state, "calls": calls, "seed": 1}).get("trace")
        problems = sim.lint(trace if isinstance(trace, list) else [], program, types, state, calls)
        if problems:
            return CheckResult(False, f"simulator seed 1: {problems[0]}", "implementation")
    except CoreFault as error:
        return _fault(error)
    finally:
        core.close()
        conn.close()
    shown = ", ".join(f"{k}: {v}" for k, v in sorted(groups.items())) or "no SQLSTATE"
    return CheckResult(True, f"{len(cases)} fixtures through your compiler and runtime on PostgreSQL {info['server_version']} match the interpreter's outcome classes, R(S, D) holds after each, isolation reads back serializable",
                       details=(f"attempt log by SQLSTATE: {shown}; 22003 never retried", f"simulator seed 1: {len(trace)} NDJSON records, the lint and the replay accept them",
                        "TLC trace validation (`statespace trace validate`, LAB-8) is not run yet: the lint and replay stand in"))


# ------------------------------------------------------------------------------------------- LAB-10.c4
def _intake(ctx: CheckContext) -> tuple[dict[str, Any] | None, CheckResult | None]:
    from statespace.demo.proposals import draw
    from statespace.demo.record import load_yaml

    path = f"{INTAKE}/proposal.yaml"
    if not ctx.path(path).is_file():
        return None, CheckResult(False, f"{path} is not there: run `uv run statespace proposal draw`", "spec")
    record = load_yaml(ctx.path(path))
    seed = record.get("seed") if isinstance(record, dict) else None
    if not isinstance(seed, int):
        return None, CheckResult(False, f"{path} holds no seed", "spec")
    p = draw(seed)
    if record.get("source") != p.source or record.get("claim") != p.claim:
        return None, CheckResult(False, f"{path} is not the proposal its seed draws: draw it again with `statespace proposal draw --force`", "spec")
    return {"seed": seed, "source": p.source, "claim": p.claim}, None


def c4(ctx: CheckContext) -> CheckResult:
    from statespace.demo import lang
    from statespace.demo.adapter import CoreFault
    from statespace.demo.proposals import CHECKERS, claim_parts, draw
    from statespace.demo.record import load_yaml

    core, failed = _core(ctx, ("parse", "typecheck"))
    if failed:
        return failed
    details: list[str] = []
    try:
        unseen = draw(ctx.seed)
        for label, source in (("drawn now", unseen.source),):
            ref = lang.parse_command(source)
            reply = core.request({"op": "parse", "source": source})
            if not reply.get("ok") or reply.get("program") != ref:
                return CheckResult(False, f"the proposal {label} (seed {ctx.seed}) does not parse to the reference IR with your parser", "implementation", (source.strip(),))
            ty = core.request({"op": "typecheck", "program": ref})
            details.append(f"proposal {label} (seed {ctx.seed}): your typechecker says {'well typed' if ty.get('ok') else 'rejected, ' + str(ty.get('rule'))}")
        intake, failed = _intake(ctx)
        if failed:
            return failed
        assert intake is not None
        ref = lang.parse_command(intake["source"])
        reply = core.request({"op": "parse", "source": intake["source"]})
        if not reply.get("ok") or reply.get("program") != ref:
            return CheckResult(False, f"your drawn proposal (seed {intake['seed']}) does not parse to the reference IR with your parser", "implementation")
        ty = core.request({"op": "typecheck", "program": ref})
        details.append(f"your proposal (seed {intake['seed']}): your typechecker says {'well typed' if ty.get('ok') else 'rejected, ' + str(ty.get('rule'))}")
    except CoreFault as error:
        return _fault(error)
    finally:
        core.close()
    if not ctx.path(CLAIM_INTAKE).is_file():
        return CheckResult(False, f"{CLAIM_INTAKE} is not there: store the agent's claim as quoted, unreviewed text", "spec")
    ctx.statement(CLAIM_INTAKE, "yaml")
    card = load_yaml(ctx.path(CLAIM_INTAKE)) or {}
    if not isinstance(card, dict) or card.get("quoted") != intake["claim"]:
        return CheckResult(False, f"{CLAIM_INTAKE}: `quoted:` is not the agent's claim, word for word", "spec", (f"the claim: {intake['claim']}",))
    if card.get("status") != "UNREVIEWED" or card.get("source") != "agent":
        return CheckResult(False, f"{CLAIM_INTAKE}: an agent's claim is stored with `source: agent` and `status: UNREVIEWED`", "spec")
    if any(k in card for k in ("stamp", "stamps", "method", "tool")):
        return CheckResult(False, f"{CLAIM_INTAKE} carries a stamp or a method: a quoted claim has none; stamps come from receipts", "spec")
    triage_path = f"{INTAKE}/triage.yaml"
    if not ctx.path(triage_path).is_file():
        return CheckResult(False, f"{triage_path} is not there", "spec")
    if "TODO(you)" in ctx.text(triage_path):
        return CheckResult(False, f"{triage_path} still has a TODO(you) line: name a checker for each part of the claim", "spec")
    triage = load_yaml(ctx.path(triage_path)) or {}
    plan = {str(p.get("part")): p.get("checker") for p in (triage.get("parts") or []) if isinstance(p, dict)}
    for part in claim_parts(intake["claim"]):
        checker = plan.get(part)
        if not checker:
            return CheckResult(False, f"{triage_path} names no checker for \"{part}\"", "spec", (f"checkers: {', '.join(CHECKERS)}",))
        if checker not in CHECKERS:
            return CheckResult(False, f"{triage_path}: \"{checker}\" is not a checker this course runs", "spec", (f"checkers: {', '.join(CHECKERS)}",))
    return CheckResult(True, f"a proposal drawn now (seed {ctx.seed}) and yours (seed {intake['seed']}) parse with your parser; the claim is quoted and unreviewed; the plan names a checker for each of its {len(claim_parts(intake['claim']))} parts",
                       details=tuple(details) + ("the triage plan is an investigation item, not credited",))


# ------------------------------------------------------------------------------------------- LAB-10.c5
def _cvc5(ctx: CheckContext, text: str, step: str) -> str:
    """One query through the Bench's cvc5 lane under an rlimit, recorded as a run. Returns the verdict."""
    from statespace.lanes.cvc5 import Cvc5Session

    session = Cvc5Session(root=ctx.root, workdir=ctx.workdir, sink=ctx.runs.append)
    run = session.run(text, step=f"{step}-cvc5", rlimit=RLIMIT)
    ctx.tcb(f"cvc5 {run.version}", "trusted")
    return str(run.verdict)


def c5(ctx: CheckContext) -> CheckResult:
    from statespace.demo import obligations, pipeline, semantics
    from statespace.demo.adapter import CoreFault
    from statespace.demo.record import load_yaml

    intake, failed = _intake(ctx)
    if failed:
        return failed
    assert intake is not None
    vpath = f"{INTAKE}/verdict.yaml"
    if not ctx.path(vpath).is_file():
        return CheckResult(False, f"{vpath} is not there", "spec")
    if "TODO(you)" in ctx.text(vpath):
        return CheckResult(False, f"{vpath} still has a TODO(you) line: write your verdict", "spec")
    mine = load_yaml(ctx.path(vpath)) or {}
    key = pipeline.key(_ask(ctx), intake["source"], intake["claim"], step="key")
    verdict = mine.get("verdict")
    ctx.tcb("the reference key (statespace demo's pipeline; reference module)", "trusted")
    if verdict not in ("flawed", "sound", "rejected"):
        return CheckResult(False, f"{vpath}: verdict is flawed, sound or rejected, not {verdict!r}", "spec")
    if key["verdict"] == "rejected" or verdict == "rejected":
        if verdict != key["verdict"] or mine.get("rule") != key.get("rule"):
            return CheckResult(False, f"your verdict is {verdict} ({mine.get('rule')}), the reference key is {key['verdict']}" + (f" ({key.get('rule')})" if key.get("rule") else ""), "spec")
        return CheckResult(True, f"a typed rejection, {key['rule']}, as the key says: a valid outcome of triage")
    program, types = key["program"], key["types"]
    core, failed = _core(ctx, ("interp", "check"))
    if failed:
        return failed
    try:
        if verdict == "flawed":
            witness = mine.get("witness") or {}
            try:
                state, args = obligations.concretize(witness, program, types)
            except (KeyError, TypeError, ValueError) as error:
                return CheckResult(False, f"{vpath}: the witness cannot be read ({error}); give balances by account term and args by parameter", "spec")
            ref_out = semantics.run(program, types, state, args)
            yours = core.request({"op": "interp", "program": program, "types": types, "state": state, "args": args})
            broken = semantics.inv_violations(ref_out["state"]) if ref_out["ok"] else []
            named = mine.get("invariant")
            hit = [b for b in broken if b == named or b.startswith(f"{named}(")]
            if key["verdict"] != "flawed":
                if hit and semantics.outcome_class(yours) == semantics.outcome_class(ref_out):
                    ctx.note("your witness replays in the reference interpreter and the key says sound: the reference is wrong; file an erratum")
                    return CheckResult(True, "your witness replays in the reference interpreter against the key: a doubt against the reference, and an erratum to file")
                return CheckResult(False, f"your verdict is flawed, the reference key is {key['verdict']}, and your witness does not replay", "spec", (f"the interpreter gives {semantics.outcome_class(ref_out)}; Inv broken: {', '.join(broken) or 'nothing'}",))
            if not hit:
                return CheckResult(False, f"your witness does not break {named} in the reference interpreter: it gives {semantics.outcome_class(ref_out)}, Inv broken: {', '.join(broken) or 'nothing'}", "spec", (f"state {state}", f"call {args}"))
            if (yours.get("ok"), yours.get("state")) != (ref_out["ok"], ref_out.get("state")):
                return CheckResult(False, "your interpreter and the reference interpreter disagree on your witness", "implementation", (f"yours {yours}", f"reference {ref_out}"))
            if named != key["invariant"]:
                return CheckResult(False, f"you name {named}; the key's refuted invariant is {key['invariant']}", "spec")
            value = obligations.objective(witness, program, types)
            ob = next(o for o in obligations.obligations(program, types) if o.name == named)
            smaller = ctx.z3().run(obligations.objective_query(ob, program, types, value), step="minimal", rlimit=RLIMIT)
            if smaller.verdict != "unsat":
                return CheckResult(False, f"your witness is not minimal: a witness with an objective below {value} exists ({smaller.verdict})", "spec",
                                   ("the objective is the sum of the amount parameters and the pre-balances of the accounts named, except mint",))
            if mine.get("class") != key["class"]:
                return CheckResult(False, f"you name the class {mine.get('class')}; the claim's offered evidence makes it {key['class']}", "spec")
            spath = mine.get("specimen")
            if not spath or not ctx.path(str(spath)).is_file():
                return CheckResult(False, f"{vpath}: specimen names no file; mount the witness as a specimen under specimens/", "spec")
            sp = load_yaml(ctx.path(str(spath))) or {}
            missing = [f for f in ("violates", "because", "minimal", "cured_by", "found_in", "tool_version") if not sp.get(f) or "TODO(you)" in str(sp.get(f))]
            if missing:
                return CheckResult(False, f"{spath}: the label lacks {', '.join(missing)}", "spec")
            ctx.z3().headline(smaller)
            return CheckResult(True, f"flawed, as the key says: your witness breaks {named}, replays in your interpreter and the reference's, is minimal (objective {value}; nothing below it), class {key['class']}; specimen {spath}")
        if key["verdict"] != "sound":
            return CheckResult(False, f"your verdict is sound, the reference key is {key['verdict']}", "spec", (f"the key refutes {key.get('invariant')}",) if key["verdict"] == "flawed" else ())
        yours = _learner_check(ctx, core, program, types, "you")
        for name in obligations.OBLIGATIONS:
            if yours[name]["class"] != "PROVED":
                return CheckResult(False, f"your checker's {name} obligation is {yours[name]['class']}, not PROVED", "implementation")
        for name in obligations.OBLIGATIONS:
            run = yours[name]["run"]
            text = (ctx.root / run.input_path).read_text(encoding="utf-8")
            agrees = _cvc5(ctx, text, run.step)
            if agrees != "unsat":
                return CheckResult(False, f"cvc5 answers {agrees} on your {name} obligation, where Z3 answered unsat: a doubt against both", "tool")
        ctx.z3().headline(yours["nonneg"]["run"])
        return CheckResult(True, "sound, as the key says: every obligation unsat for the fragment, a premise witness sat, and cvc5 agrees on every unsat (uncertified)")
    except CoreFault as error:
        return _fault(error)
    finally:
        core.close()


# ------------------------------------------------------------------------------------------- LAB-10.c6
def c6(ctx: CheckContext) -> CheckResult:
    from statespace.demo import lang, obligations, pipeline, semantics, sim
    from statespace.demo.adapter import CoreFault
    from statespace.demo.record import load_yaml

    intake, failed = _intake(ctx)
    if failed:
        return failed
    assert intake is not None
    fpath = "labs/LAB-10/fix/corrected.mp"
    if not ctx.path(fpath).is_file():
        return CheckResult(False, f"{fpath} is not there", "spec")
    text = ctx.text(fpath)
    if "TODO(you)" in text:
        return CheckResult(False, f"{fpath} still has a TODO(you) line: write the corrected command (or the accepted proposal)", "spec")
    try:
        fixed, ftypes, _ = pipeline.front(text)
    except (lang.ParseError, lang.TypeErr) as error:
        return CheckResult(False, f"{fpath} does not parse and typecheck: {error}", "spec")
    try:
        original, otypes, _ = pipeline.front(intake["source"])
    except (lang.ParseError, lang.TypeErr) as error:
        return CheckResult(False, f"your proposal is a typed rejection ({error}): it has no corrected command to run; LAB-10.c6 needs a proposal that typechecks", "spec")
    if fixed["name"] != original["name"] or fixed["params"] != original["params"]:
        return CheckResult(False, f"{fpath} changes the command's name or parameters; a fix keeps the interface", "spec")
    ask = _ask(ctx)
    checked = pipeline.check_program(ask, fixed, ftypes, "corrected", shrink=False)
    for name in obligations.OBLIGATIONS:
        if checked["obligations"][name]["class"] != "PROVED":
            return CheckResult(False, f"the corrected command's {name} obligation is {checked['obligations'][name]['class']} under the reference checker", "spec")
    core, failed = _core(ctx, ("compile", "run", "sim", "interp"))
    if failed:
        return failed
    conn, dsn, info = _pg(ctx)
    stats: dict[str, int] = {}
    alias = 0
    largest = 0
    try:
        plan = core.request({"op": "compile", "program": fixed, "types": ftypes}).get("plan")
        execute = _learner_execute(core, dsn)
        for k in range(N_DIFFERENTIAL):
            state, args = _random_case(ctx.rng, fixed, ftypes)
            accts = [args[p["name"]] for p in fixed["params"] if ftypes[p["name"]] == "account"]
            alias += len(set(accts)) < len(accts)
            largest = max(largest, *state["balances"].values())
            case = pipeline.pg_case(conn, plan, fixed, ftypes, state, args, execute)
            stats[case["interp"]] = stats.get(case["interp"], 0) + 1
            if k % 20 == 0:
                case["agrees"] = case["pg"] == case["interp"]
                ctx.runs.append(pipeline.pg_run_record(case, info["server_version"], f"diff-{k}", plan or {}, args))
            if case["pg"] != case["interp"] or not case["rsd"]:
                return CheckResult(False, f"differential case {k}: PostgreSQL gives {case['pg']} through your runtime, the interpreter {case['interp']}; R(S, D) {'holds' if case['rsd'] else 'fails'}", "implementation",
                                   (f"state {state['balances']}", f"call {args}", f"seed {ctx.seed}"))
        for s in range(1, N_SIM_SEEDS + 1):
            import random

            state, calls = _sim_calls(random.Random(s), fixed, ftypes)
            trace = core.request({"op": "sim", "program": fixed, "types": ftypes, "state": state, "calls": calls, "seed": s}).get("trace")
            problems = sim.lint(trace if isinstance(trace, list) else [], fixed, ftypes, state, calls)
            if problems:
                return CheckResult(False, f"simulation seed {s}: {problems[0]}", "implementation")
        killed = "the proposal is sound: no specimen to kill"
        verdict = load_yaml(ctx.path(f"{INTAKE}/verdict.yaml")) if ctx.path(f"{INTAKE}/verdict.yaml").is_file() else {}
        if (verdict or {}).get("verdict") == "flawed":
            witness = verdict.get("witness") or {}
            bigger = None
            for factor in (3, 2, 4, 5):
                scaled = {"balances": {t: int(v) * factor for t, v in (witness.get("balances") or {}).items()},
                          "args": {a: int(v) * factor for a, v in (witness.get("args") or {}).items()}, "same": witness.get("same") or []}
                state, args = obligations.concretize(scaled, original, otypes)
                out = semantics.run(original, otypes, state, args)
                if out["ok"] and semantics.inv_violations(out["state"]):
                    bigger = (scaled, state, args)
                    break
            if bigger is None:
                return CheckResult(False, "no non-minimal witness of the specimen's class breaks the proposal: is verdict.yaml's witness the proposal's?", "spec")
            _scaled, state, args = bigger
            mine = core.request({"op": "interp", "program": fixed, "types": ftypes, "state": state, "args": args})
            if mine.get("ok") and semantics.inv_violations(mine["state"]):
                return CheckResult(False, "the corrected command does not kill a non-minimal witness of the specimen's class", "spec", (f"state {state['balances']}", f"call {args}"))
            killed = f"the fix kills a non-minimal witness of the specimen's class ({semantics.outcome_class(mine)} on {args})"
    except CoreFault as error:
        return _fault(error)
    finally:
        core.close()
        conn.close()
    shown = ", ".join(f"{k} {v}" for k, v in sorted(stats.items()))
    return CheckResult(True, f"the corrected command passes the differential suite (n = {N_DIFFERENTIAL}, seed {ctx.seed}) and the simulation suite ({N_SIM_SEEDS} seeds, 1 to {N_SIM_SEEDS}); {killed}",
                       details=(f"generator statistics: outcome classes {shown} of {N_DIFFERENTIAL}; {alias} calls name one account twice; largest balance {largest}",
                        "the simulation suite runs the trace lint and a replay; TLC trace validation (LAB-8) is not run yet"))


# ------------------------------------------------------------------------------------------- LAB-10.c7
def c7(ctx: CheckContext) -> CheckResult:
    from statespace.demo.record import replay

    problems, notes = replay(ctx.root)
    if problems:
        return CheckResult(False, problems[0], "implementation", tuple(problems[1:4]) + ("`uv run statespace demo record --explain` says what each artifact is",))
    ctx.statement("demo/cl-10-1.yaml", "yaml")
    ctx.claim("CL-10.1")
    return CheckResult(True, "demo/ replays: every artifact, receipt and statement checks by hash, and the witness replays", details=tuple(notes))


# ------------------------------------------------------------------------------------------- LAB-10.c8
STAMP_SECTION = {"[P]": "PROVED", "[M]": "MODEL-CHECKED", "[T]": "TESTED", "[E]": "ENFORCED", "[C]": "CONFIGURED", "[A]": "ASSUMED", "[N]": "NOT COVERED", "[?]": "UNKNOWN", "[R]": "Specimens"}
REQUIRED = ("PROVED", "MODEL-CHECKED", "TESTED", "ENFORCED", "CONFIGURED", "ASSUMED", "NOT COVERED", "UNKNOWN", "Specimens", "Checker matrix", "Theorem statements with hashes", "Budgets and advisories", "Doubt log")
_BARE = re.compile(r"\b(verified|correct|safe)\b", re.IGNORECASE)
_HASHREF = re.compile(r"`([0-9a-f]{64})`\s+`?([^\s`]+)`?")
_RECEIPT = re.compile(r"receipt:\s*`?([^\s`;,)]+\.json)`?")
_CLAIM = re.compile(r"\bCL-[0-9]+\.[0-9]+\b")


def _report_problems(ctx: CheckContext, rel: str) -> tuple[list[str], int]:
    from statespace.demo.pipeline import SECTIONS
    from statespace.receipt import verify
    from statespace.schema.statement_hash import statement_hash_file

    text = ctx.text(rel)
    problems: list[str] = []
    if "TODO(you)" in text:
        problems.append(f"{rel} still has a TODO(you) line")
    headings = [(i, m.group(1).strip()) for i, line in enumerate(text.splitlines(), 1) if (m := re.match(r"^##\s+(.+)$", line))]
    names = [h for _, h in headings]
    for req in REQUIRED:
        if req not in names:
            problems.append(f"{rel} has no section \"## {req}\"")
    order = [n for n in names if n in SECTIONS]
    if order != sorted(order, key=SECTIONS.index):
        problems.append(f"{rel}: the sections are not in report@1's order")
    section = None
    seen: dict[str, str] = {}
    lines = 0
    base = ctx.path(rel).parent
    in_code = False
    for i, line in enumerate(text.splitlines(), 1):
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        m = re.match(r"^##\s+(.+)$", line)
        if m:
            section = m.group(1).strip()
            continue
        prose = re.sub(r"`[^`]*`", "", line)
        if _BARE.search(prose) and not re.search(r"\bno bare\b", prose, re.IGNORECASE):
            problems.append(f"{rel}:{i}: the bare word \"{_BARE.search(prose).group(1)}\" (rule T8): say what was checked, by which checker, under which bound")
        stamp = next((s for s in STAMP_SECTION if line.lstrip("- ").startswith(s)), None)
        if stamp and section in STAMP_SECTION.values():
            lines += 1
            if STAMP_SECTION[stamp] != section:
                problems.append(f"{rel}:{i}: a {stamp} line under {section} (rule T1: each claim under its stamp's section)")
            if "%" in line:
                problems.append(f"{rel}:{i}: a percentage on a stamp line (rule T8)")
            if "requirement" in line.lower() and stamp == "[P]":
                problems.append(f"{rel}:{i}: requirement-fit is never [P] (rule T2)")
            for cid in set(_CLAIM.findall(line)):
                if cid in seen and seen[cid] != section and section != "ASSUMED":
                    problems.append(f"{rel}:{i}: {cid} appears under {seen[cid]} and {section} (rule T1: once in the stamp sections)")
                seen.setdefault(cid, section)
            if stamp in ("[P]", "[M]", "[T]", "[E]", "[C]"):
                found = _RECEIPT.search(line)
                if not found:
                    problems.append(f"{rel}:{i}: a {stamp} line cites no receipt (receipt: <path>)")
                else:
                    rpath = ctx.path(found.group(1))
                    if not rpath.is_file():
                        problems.append(f"{rel}:{i}: the receipt {found.group(1)} is not there")
                    else:
                        receipt = json.loads(rpath.read_text(encoding="utf-8"))
                        if not verify(receipt, root=ctx.root, source=found.group(1)).ok:
                            problems.append(f"{rel}:{i}: the receipt {found.group(1)} does not verify (rule T5: the claim moves to UNKNOWN)")
                        elif stamp == "[P]" and not any(r.get("engine") in ("z3", "cvc5", "lean", "lake") and r.get("verdict") in ("unsat", "accepted") for r in receipt.get("runs", [])):
                            problems.append(f"{rel}:{i}: a [P] line whose receipt holds no checker's unsat or acceptance: its stamp re-derives as {'[T]' if receipt.get('runs') else 'nothing'}")
        for h, path in _HASHREF.findall(line):
            target = (ctx.root / path) if (ctx.root / path).is_file() else (base / path)
            if not target.is_file():
                problems.append(f"{rel}:{i}: the statement {path} is not there")
            elif statement_hash_file(target) != h:
                problems.append(f"{rel}:{i}: the statement hash of {path} no longer matches (rule T5: the claim moves to UNKNOWN [?] with the reason \"statement mismatch\")")
    if not re.search(r"\b[0-9]+\|[0-9]+\b", text):
        problems.append(f"{rel}: the doubt log gives no m|n")
    return problems, lines


def c8(ctx: CheckContext) -> CheckResult:
    rel = "report/report.md"
    if not ctx.path(rel).is_file():
        return CheckResult(False, f"{rel} is not there: export the report (LAB-10.8, nine passes)", "spec")
    problems, lines = _report_problems(ctx, rel)
    if problems:
        return CheckResult(False, problems[0], "spec", tuple(problems[1:5]))
    if lines == 0:
        return CheckResult(False, f"{rel} holds no stamp line", "spec")
    ctx.claim("CL-10.2")
    return CheckResult(True, f"{rel} keeps rules T1, T2, T5 and T8: {lines} stamp lines, each under its section, each stamp re-derived from a receipt that verifies, every statement hash matching",
                       details=("report@1 validation and `statespace export --section` (W5-T06) are not run yet; T3, T4, T6, T7 and T9 to T12 are read by you, not by this check",))


# ------------------------------------------------------------------------------------------- LAB-10.c9
_PRIVATE = [
    (re.compile(r"/home/[A-Za-z0-9_.-]+"), "a home path"),
    (re.compile(r"/Users/[A-Za-z0-9_.-]+"), "a home path"),
    (re.compile(r"[A-Za-z]:\\\\Users\\\\"), "a home path"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "a private key"),
    (re.compile(r"\b(ghp|gho|github_pat)_[A-Za-z0-9_]{20,}"), "a token"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "a cloud key"),
    (re.compile(r"\bsk-[A-Za-z0-9]{20,}"), "an API key"),
    (re.compile(r"\boverlay/"), "a path in your private overlay"),
]
_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")


def c9(ctx: CheckContext) -> CheckResult:
    from statespace.receipt import verify
    from statespace.schema.statement_hash import statement_hash_file

    bundle = ctx.path("bundle")
    if not bundle.is_dir():
        return CheckResult(False, "bundle/ is not there: build the bundle you will publish (LAB-10.9)", "spec")
    problems: list[str] = []
    allowed = set()
    publish = bundle / "PUBLISH.txt"
    if publish.is_file():
        allowed = {ln.strip() for ln in publish.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")}
    if not any((bundle / n).is_file() for n in ("LICENSE", "LICENSE.md", "LICENSE.txt")):
        problems.append("bundle/ has no LICENSE")
    if not (bundle / "REPRODUCE.md").is_file():
        problems.append("bundle/ has no REPRODUCE.md: say how to re-run every receipt")
    receipts = 0
    links = 0
    hashes = 0
    for path in sorted(p for p in bundle.rglob("*") if p.is_file()):
        rel = path.relative_to(ctx.root).as_posix()
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if "TODO(you)" in text:
            problems.append(f"{rel} still has a TODO(you) line")
        for pattern, what in _PRIVATE:
            m = pattern.search(text)
            if m:
                problems.append(f"{rel}: {what} ({m.group(0)[:40]}): the privacy lint keeps it out of a published bundle")
        for m in _EMAIL.finditer(text):
            if m.group(0) not in allowed and not m.group(0).endswith(("@example.com", "@example.org")):
                problems.append(f"{rel}: an e-mail address you did not list in bundle/PUBLISH.txt ({m.group(0)})")
                break
        if path.suffix == ".md":
            for target in _LINK.findall(text):
                if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                    continue
                links += 1
                if not (path.parent / target.split("#", 1)[0]).exists():
                    problems.append(f"{rel}: the link {target} does not resolve inside the bundle")
            for h, p in _HASHREF.findall(text):
                hashes += 1
                target = path.parent / p
                if not target.is_file():
                    problems.append(f"{rel}: the statement {p} is not in the bundle")
                elif statement_hash_file(target) != h:
                    problems.append(f"{rel}: the statement hash of {p} does not match (the text with trailing whitespace removed, plus one newline)")
        if path.suffix == ".json" and "receipts" in path.parts:
            receipts += 1
            try:
                ok = verify(json.loads(text), root=ctx.root, source=rel).ok
            except json.JSONDecodeError:
                ok = False
            if not ok:
                problems.append(f"{rel} does not verify as a receipt")
    if receipts == 0:
        problems.append("bundle/ holds no receipts (bundle/receipts/...)")
    if problems:
        return CheckResult(False, problems[0], "spec", tuple(problems[1:5]))
    return CheckResult(True, f"bundle/: {links} links resolve, {hashes} statement hashes match, {receipts} receipts verify, the privacy lint is clean, a license and reproduction instructions are present",
                       details=("the clean-clone build in the devcontainer is not run by this check yet",))


# ------------------------------------------------------------------------------------------- LAB-10.c10
def c10(ctx: CheckContext) -> CheckResult:
    raise ToolUnavailable("LAB-10.10 is a stretch stage with no local check: its witness is replayed by whoever reads your issue or pull request")


LAB = Lab(
    "LAB-10",
    "Core assembly",
    stages=(
        Stage("LAB-10.1", "Run the reference pipeline on the provided agent proposal", (CheckSpec("LAB-10.c1", "The skeleton reproduces the recorded one", c1),)),
        Stage("LAB-10.2", "Wire your parser, typechecker, checker and interpreter", (CheckSpec("LAB-10.c2", "Your pipeline agrees with the fixtures end to end", c2),)),
        Stage("LAB-10.3", "Wire your compiler, runtime and simulator behind the pipeline", (CheckSpec("LAB-10.c3", "The same fixtures pass through PostgreSQL", c3),)),
        Stage("LAB-10.4", "Draw an unseen agent proposal and take it in", (CheckSpec("LAB-10.c4", "The proposal parses, and its claim is quoted text", c4),)),
        Stage("LAB-10.5", "Exhibit the violation, or prove the restricted obligation", (CheckSpec("LAB-10.c5", "The witness replays, or the fragment is proved with a premise witness", c5),)),
        Stage("LAB-10.6", "Run the corrected command on PostgreSQL with systematic tests", (CheckSpec("LAB-10.c6", "Both suites pass, and the fix kills a non-minimal witness", c6),)),
        Stage("LAB-10.7", "Record the demonstration end to end", (CheckSpec("LAB-10.c7", "The recording cites every artifact by run id and every statement by hash", c7),), claims=("CL-10.1",)),
        Stage("LAB-10.8", "Export the report from your claim graph", (CheckSpec("LAB-10.c8", "The report validates, and the rules hold", c8),), claims=("CL-10.2",)),
        Stage("LAB-10.9", "Publish the bundle", (CheckSpec("LAB-10.c9", "Every link and every hash in the bundle resolves", c9),)),
        Stage("LAB-10.10", "Stretch: a counterexample in a public project", (CheckSpec("LAB-10.c10", "No local check (stretch)", c10),)),
    ),
)

# Prove-it (labs/README.md section 13; content/stages/S10/lab.yaml `proveIt`): each mutant, the check that
# grades it, and how `statespace defend lab10` seeds it. statespace/demo/mutants.py applies each to the
# reference components and confirms the grading check kills it.
PROVE_IT = {
    "skip-premise-witness": ("LAB-10.c2", "the checker's premise query is dropped: ck-contradictory-premises reports PROVED where the key is VACUOUS"),
    "drop-rowcount-check": ("LAB-10.c3", "the plan loses its existence count and rowcounts: unknown-account commits the debit"),
    "rc-pool": ("LAB-10.c3", "the runtime runs READ COMMITTED: transaction_isolation reads back read committed"),
    "retry-out-of-range": ("LAB-10.c3", "the runtime retries 22003: edge-overflow's attempt log repeats it until the budget is spent"),
    "restamp-test": ("LAB-10.c8", "a [T] line restamped [P]: its receipt holds no checker's unsat"),
    "edit-after-receipt": ("LAB-10.c8", "a pinned statement edited after its receipt: its hash no longer matches (T5)"),
}

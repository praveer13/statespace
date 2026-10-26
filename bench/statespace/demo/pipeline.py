"""The reference pipeline behind `statespace demo` (curriculum/S10-assembly.md section 3.3, LAB-10.1): parser,
typechecker, checker, interpreter, compiler and runtime on PostgreSQL, run on an agent's proposal, ending in a
report skeleton. Reference modules earn nothing; the Core a learner wires in LAB-10.2 and LAB-10.3 is their own.

Solver answers come from a callable `ask(query, step)`, so the same pipeline runs through a check's Z3 lane
(every query recorded in the receipt) and through `statespace demo` on its own. Model values are never
compared, only replayed (spine section 9.1); the skeleton's verdict lines name a witness only when it is the
unique minimal one, as SP-10.1's is.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from typing import Any

from . import corpus, lang, obligations, semantics, sqlplan
from .obligations import Answer, Ask

__all__ = ["front", "check_program", "key", "cover_guard", "z3_ask", "skeleton", "SECTIONS", "COMPARED", "pg_case", "run_pg_corpus"]

RLIMIT = 5_000_000  # the Z3 lane's default [D]

# report@1's sections, in order (curriculum/S10-assembly.md section 4.2).
SECTIONS = (
    "Title block",
    "What this report establishes and what it does not",
    "The Core and its trusted base",
    "Operational semantics and the four decision records",
    "Theorem statements with hashes",
    "PROVED",
    "MODEL-CHECKED",
    "TESTED",
    "ENFORCED",
    "CONFIGURED",
    "ASSUMED",
    "NOT COVERED",
    "UNKNOWN",
    "Specimens",
    "The demonstration (CL-10.1)",
    "Erosion log",
    "Doubt log",
    "Checker matrix",
    "Budgets and advisories",
    "Agent incident ledger",
    "Known limitations",
    "Reproduction",
)
COMPARED = ("sections", "verdictLines", "statements")  # what LAB-10.c1 compares with the recorded skeleton


def statement_hash(text: str) -> str:
    from statespace.schema.statement_hash import statement_hash_text

    return statement_hash_text(text)


def z3_ask(session: Any, rlimit: int = RLIMIT) -> Ask:
    """An `ask` over a Z3 lane session: each query is one recorded run."""

    def ask(text: str, step: str) -> Answer:
        run = session.run(text, step=step, rlimit=rlimit)
        values: dict[str, int] = {}
        if run.model is not None:
            for name in run.model.constants:
                v = run.model.value(name)
                if isinstance(v, int) and not isinstance(v, bool):
                    values[name] = v
        return Answer(run.verdict, values, run)

    return ask


def front(source: str) -> tuple[dict[str, Any], dict[str, str], list[str]]:
    """Parse and typecheck one command. Raises lang.ParseError or lang.TypeErr."""
    program = lang.parse_command(source)
    typed = lang.typecheck(program)
    return program, typed["types"], typed["notes"]


def check_program(ask: Ask, program: dict[str, Any], types: dict[str, str], step: str, *, shrink: bool = True) -> dict[str, Any]:
    """Every obligation's verdict class, and for a REFUTED one its witness, minimized when `shrink`."""
    obs = obligations.obligations(program, types)
    premise = ask(obs[0].premise, f"{step}-premise")
    out: dict[str, Any] = {"premise": premise.verdict, "obligations": {}}
    for ob in obs:
        answer = ask(ob.query, f"{step}-{ob.name}")
        entry: dict[str, Any] = {"verdict": answer.verdict, "class": obligations.classify(answer, premise), "sha256": statement_hash(ob.query)}
        if answer.verdict == "sat":
            best, value, asked = obligations.minimize(ask, ob, program, types, answer, f"{step}-{ob.name}") if shrink else (answer, None, 0)
            witness = obligations.decode(best, program, types)
            state, args = obligations.concretize(witness, program, types)
            replay = semantics.run(program, types, state, args)
            entry.update({"witness": witness, "state": state, "args": args, "objective": value, "minimizeQueries": asked, "replay": replay,
                          "breaks": semantics.inv_violations(replay["state"]) if replay["ok"] else []})
        out["obligations"][ob.name] = entry
    return out


def cover_guard(program: dict[str, Any]) -> dict[str, Any]:
    """A guard that covers every debit: for each account the body debits, balance(x) >= the sum of what it
    debits, conjoined in order. The reference's correction of a guard that leaves a leg out."""
    debits: dict[str, list[dict[str, Any]]] = {}
    keys: dict[str, dict[str, Any]] = {}
    for st in program["body"]:
        if "move" in st:
            x = st["move"]["from"]
            k = json.dumps(x, sort_keys=True)
            keys[k] = x
            debits.setdefault(k, []).append(st["move"]["amount"])
    guard: dict[str, Any] | None = None
    for k, amounts in debits.items():
        total = amounts[0]
        for a in amounts[1:]:
            total = {"op": "+", "args": [total, a]}
        conj = {"op": ">=", "args": [{"balance": keys[k]}, total]}
        guard = conj if guard is None else {"op": "&&", "args": [guard, conj]}
    return guard or program["requires"]


def key(ask: Ask, source: str, claim: str, step: str = "key") -> dict[str, Any]:
    """The reference key of a proposal: rejected (with the typing rule), flawed (with the invariant, the
    minimal witness and the class its offered evidence gives) or sound."""
    from .proposals import EVIDENCE_CLASS, evidence_kind

    try:
        program, types, _notes = front(source)
    except lang.ParseError as error:
        return {"verdict": "rejected", "rule": "syntax", "detail": error.message}
    except lang.TypeErr as error:
        return {"verdict": "rejected", "rule": error.rule, "detail": error.detail}
    result = check_program(ask, program, types, step)
    refuted = [n for n in obligations.OBLIGATIONS if result["obligations"][n]["class"] == "REFUTED"]
    if refuted:
        ob = result["obligations"][refuted[0]]
        return {"verdict": "flawed", "invariant": refuted[0], "class": EVIDENCE_CLASS[evidence_kind(claim)], "witness": ob["witness"],
                "objective": ob["objective"], "result": result, "program": program, "types": types}
    if all(result["obligations"][n]["class"] == "PROVED" for n in obligations.OBLIGATIONS):
        return {"verdict": "sound", "result": result, "program": program, "types": types}
    return {"verdict": "unknown", "result": result, "program": program, "types": types}


# ------------------------------------------------------------------------------------------ postgres
def pg_case(conn: Any, plan: dict[str, Any], program: dict[str, Any], types: dict[str, str], state: dict[str, Any], args: dict[str, Any],
            execute: Callable[..., dict[str, Any]] | None = None) -> dict[str, Any]:
    """One call on PostgreSQL beside the interpreter: both outcome classes, and R(S, D): the rows read back
    equal the interpreter's state after a commit, and the starting state after anything else."""
    sqlplan.reset(conn, state)
    ran = (execute or sqlplan.execute)(conn, plan, args)
    rows = sqlplan.read_state(conn)
    interp = semantics.run(program, types, state, args)
    expected_state = interp["state"] if interp["ok"] else state
    pg_class = semantics.outcome_class(ran["outcome"])
    norm_rows = {"balances": rows["balances"], **({"frozen": rows["frozen"]} if rows.get("frozen") else {})}
    want = {"balances": {**{"mint": 0, "sink": 0}, **expected_state["balances"]}, **({"frozen": {k: v for k, v in expected_state.get("frozen", {}).items() if v}} if any(expected_state.get("frozen", {}).values()) else {})}
    if ran["outcome"].get("ok"):
        holds = norm_rows == want
    else:
        start = {"balances": {**{"mint": 0, "sink": 0}, **state["balances"]}, **({"frozen": {k: v for k, v in state.get("frozen", {}).items() if v}} if any(state.get("frozen", {}).values()) else {})}
        holds = norm_rows == start
    return {"pg": pg_class, "interp": semantics.outcome_class(interp), "rsd": holds, "isolation": ran.get("isolation"), "attempts": ran.get("attempts", []),
            "rows": rows, "interpState": interp.get("state")}


def run_pg_corpus(conn: Any, compile_fn: Callable[[dict[str, Any], dict[str, str]], dict[str, Any]] | None = None,
                  execute: Callable[..., dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Every run fixture through a compiler and runtime (the reference's by default) beside the interpreter."""
    out = []
    for fid, name, state, args, pg_expect in corpus.RUN_FIXTURES:
        program, types, _ = front(corpus.PROGRAMS[name])
        plan = (compile_fn or sqlplan.compile_plan)(program, types)
        case = pg_case(conn, plan, program, types, state, args, execute)
        expected = pg_expect or case["interp"]
        case.update({"id": fid, "expected": expected, "agrees": case["pg"] == expected})
        out.append(case)
    return out


def pg_run_record(case: dict[str, Any], version: str, step: str, plan: dict[str, Any], args: dict[str, Any]) -> dict[str, Any]:
    """A receipt@1 run for one PostgreSQL call. statespace has no PostgreSQL lane yet (W4-T16), so the
    receipt shows these verdicts as reported."""
    data = json.dumps({"plan": plan, "args": args}, sort_keys=True).encode()
    retried = [a["sqlstate"] for a in case["attempts"] if a.get("result") == "retry"]
    line = f"{step}: postgres {case['pg']}, interpreter {case['interp']}, R(S, D) {'holds' if case['rsd'] else 'FAILS'}, isolation {case['isolation']}, attempts {len(case['attempts'])}{' (retried ' + ', '.join(retried) + ')' if retried else ''}"
    return {"step": step, "engine": "postgres", "version": version, "argv": ["statespace-runtime", "--isolation", "serializable", f"--step={step}"],
            "inputSha256": hashlib.sha256(data).hexdigest(), "budget": {}, "exitCode": 0, "verdictLines": [line],
            "verdict": "passed" if case.get("agrees", case["pg"] == case["interp"]) and case["rsd"] else "failed"}


# ------------------------------------------------------------------------------------------ skeleton
def _witness_text(witness: dict[str, Any], program: dict[str, Any], types: dict[str, str]) -> str:
    parts = [f"balance({t}) = {v}" for t, v in witness["balances"].items() if t != "mint"]
    parts += [f"{p['name']} = {witness['args'][p['name']]}" for p in program["params"] if types[p["name"]] != "account"]
    if witness.get("same"):
        parts.append("same account: " + ", ".join(f"{a} = {b}" for a, b in witness["same"]))
    return ", ".join(parts)


def skeleton(ask: Ask, source: str, claim: str, conn: Any | None, *, run_sink: Callable[[dict[str, Any]], None] | None = None) -> dict[str, Any]:
    """The reference pipeline on a proposal, and the report skeleton it writes."""
    from .proposals import claim_parts

    lines: list[str] = []
    statements = [{"name": "proposal", "sha256": statement_hash(source)}]
    program, types, notes = front(source)
    lines.append(f"parse: ok, command {program['name']}({', '.join(p['name'] for p in program['params'])})")
    lines.append("typecheck: ok; " + ", ".join(f"{n}: {t}" for n, t in types.items()) + ("; " + "; ".join(notes) if notes else ""))
    result = check_program(ask, program, types, "proposal")
    lines.append(f"check premises: z3 {result['premise']}")
    for name in obligations.OBLIGATIONS:
        ob = result["obligations"][name]
        statements.append({"name": f"proposal.{name}", "sha256": ob["sha256"]})
        lines.append(f"check {name}: z3 {ob['verdict']}: {ob['class']}")
    refuted = [n for n in obligations.OBLIGATIONS if result["obligations"][n]["class"] == "REFUTED"]
    specimen = None
    if refuted:
        ob = result["obligations"][refuted[0]]
        lines.append(f"witness {refuted[0]}: {_witness_text(ob['witness'], program, types)}; " + (f"objective {ob['objective']}, and no witness below it" if ob['objective'] is not None else "not minimized within the query budget"))
        lines.append(f"replay in the reference interpreter: {semantics.outcome_class(ob['replay'])}; Inv broken: {', '.join(ob['breaks']) or 'nothing'}")
        specimen = {"id": "SP-10.1", "violates": ob["breaks"], "witness": ob["witness"], "state": ob["state"], "args": ob["args"],
                    "because": "the guard covers the amount and leaves the fee leg out", "minimal": f"yes: objective {ob['objective']} under the objective of obligations.objective_terms",
                    "curedBy": "a guard that covers every debit of the sender"}
    from .proposals import EVIDENCE_CLASS, evidence_kind

    for part in claim_parts(claim):
        if part == "never overdraws":
            lines.append(f"claim part \"{part}\": {result['obligations']['nonneg']['class']} by check nonneg")
        elif part == "conserves":
            lines.append(f"claim part \"{part}\": {result['obligations']['conserve']['class']} by check conserve")
        else:
            cls = EVIDENCE_CLASS[evidence_kind(claim)] if refuted else "none"
            lines.append(f"claim part \"{part}\": evidence offered, not a checker; class {cls}")
    fixed = dict(program, requires=cover_guard(program))
    fixed_types = lang.typecheck(fixed)["types"]
    lines.append(f"corrected: requires {lang.render_expr(fixed['requires'])}")
    fixed_result = check_program(ask, fixed, fixed_types, "corrected", shrink=False)
    for name in obligations.OBLIGATIONS:
        ob = fixed_result["obligations"][name]
        statements.append({"name": f"corrected.{name}", "sha256": ob["sha256"]})
        lines.append(f"check {name} (corrected): z3 {ob['verdict']}, premises {fixed_result['premise']}: {ob['class']}")
    weakened = None
    if specimen is not None:
        back = semantics.run(fixed, fixed_types, specimen["state"], specimen["args"])
        lines.append(f"replay of the witness on the corrected command: {semantics.outcome_class(back)}")
        weakened = f"drop the fee from the corrected guard: {_witness_text(specimen['witness'], program, types)} overdraws ({', '.join(specimen['violates'])})"
    environment: dict[str, Any] = {}
    if conn is not None:
        info = sqlplan.server_info(conn)
        environment["postgres"] = info["version"]
        plan = sqlplan.compile_plan(program, types)
        fixed_plan = sqlplan.compile_plan(fixed, fixed_types)
        if specimen is not None:
            for label, prog, tys, pl in (("proposal", program, types, plan), ("corrected", fixed, fixed_types, fixed_plan)):
                case = pg_case(conn, pl, prog, tys, specimen["state"], specimen["args"])
                case["agrees"] = case["pg"] == case["interp"]
                if run_sink:
                    run_sink(pg_run_record(case, info["server_version"], f"pg-{label}-witness", pl, specimen["args"]))
                broken = semantics.inv_violations({"balances": case["rows"]["balances"]}) if case["pg"] == "success" else []
                lines.append(f"postgres {label} on the witness: {case['pg']} (interpreter {case['interp']}); R(S, D) {'holds' if case['rsd'] else 'FAILS'}" + (f"; Inv broken: {', '.join(broken)}" if broken else ""))
        cases = run_pg_corpus(conn)
        for case in cases:
            if run_sink:
                run_sink(pg_run_record(case, info["server_version"], f"pg-{case['id']}", {"fixture": case["id"]}, {}))
        agree = sum(1 for c in cases if c["agrees"])
        rsd = sum(1 for c in cases if c["rsd"])
        retried_22003 = sum(1 for c in cases for a in c["attempts"] if a.get("sqlstate") == "22003" and a.get("result") == "retry")
        isolations = sorted({str(c["isolation"]) for c in cases})
        lines.append(f"postgres corpus: {agree} of {len(cases)} fixtures in their expected outcome class; R(S, D) holds after {rsd} of {len(cases)}")
        for c in cases:
            if c["pg"] != c["interp"]:
                lines.append(f"postgres corpus {c['id']}: postgres {c['pg']}, interpreter {c['interp']}, expected {c['expected']}")
        lines.append(f"postgres retries of 22003: {retried_22003}; transaction_isolation read back: {', '.join(isolations)}")
    else:
        lines.append("postgres: not reached")
    status = "composite: [R] for the proposal, [P] for the corrected command (Z3 only; cvc5 not run), [T] on the fixture corpus" if specimen else "composite: no refutation"
    return {
        "schema": "statespace/lab10-skeleton@1",
        "proposal": {"source": source, "claim": claim, "sha256": statement_hash(source)},
        "sections": list(SECTIONS),
        "verdictLines": lines,
        "statements": statements,
        "specimen": specimen,
        "cl101": {"status": status, "ifWeakened": weakened},
        "environment": environment,
    }


def skeleton_markdown(sk: dict[str, Any]) -> str:
    out = ["# Report skeleton", "", f"Written by `statespace demo` from the reference pipeline. Proposal statement hash `{sk['proposal']['sha256']}`.", ""]
    for section in sk["sections"]:
        out += [f"## {section}", ""]
        if section == "The demonstration (CL-10.1)":
            out += ["```", sk["proposal"]["source"].rstrip(), "```", "", f"Claim (quoted, unreviewed): \"{sk['proposal']['claim']}\"", ""]
            out += [f"- {line}" for line in sk["verdictLines"]] + [""]
        elif section == "Theorem statements with hashes":
            out += [f"- `{s['sha256']}`  {s['name']}" for s in sk["statements"]] + [""]
        elif section == "Specimens" and sk.get("specimen"):
            sp = sk["specimen"]
            out += [f"- {sp['id']}: violates {', '.join(sp['violates'])}; because {sp['because']}; minimal: {sp['minimal']}; cured by {sp['curedBy']}", ""]
        else:
            out += ["Pending: written in LAB-10.8.", ""]
    return "\n".join(out)

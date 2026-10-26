"""LAB-7, authz-flow (curriculum/S07-secrecy.md section 4; content/stages/S7/lab.yaml).

Every stage is declared, with its check and the claim template it mints, so that `statespace receipt verify`
compares a receipt with the lab's own list. LAB-7.8 is the stretch stage and has no check.

| Check | Runs | Reads |
|---|---|---|
| LAB-7.c1 | Soufflé, and Z3 Fixedpoint behind the course's Datalog adapter, on the toy program | `labs/LAB-7/reference/`, `labs/LAB-7/predict/lab7.1.txt` |
| LAB-7.c2 | both engines on your policy, on fresh worlds; derivations checked by the adapter | `labs/LAB-7/policy/read.dl` |
| LAB-7.c3 | Z3 on the pinned statement plus your property, on the base policy and four seeded mutants; cvc5 on the base | `claims/no-cross-tenant.smt2`, `labs/LAB-7/policy/read.smt2` |
| LAB-7.c4 | PostgreSQL (STATESPACE_PG_DSN, through psycopg): the SET ROLE differential and the owner probe | `labs/LAB-7/rls/schema.sql`, `labs/LAB-7/rls/policies.sql` |
| LAB-7.c5 | cargo, then your checker's queries through Z3; each sat replayed by the paired-state reference | `labs/LAB-7/checker/`, `labs/LAB-7/views/open.view`, `claims/observer.yaml` |
| LAB-7.c6 | cargo, then your two monitors over interpreter traces | `labs/LAB-7/monitors/`, `claims/revocation.yaml` |
| LAB-7.c7 | the release record against the LAB-7.5 receipt, broken/ beside fixed/, claim@1 on the four cards | `claims/`, `labs/LAB-7/broken/`, `labs/LAB-7/fixed/` |

The course's reference semantics live here, beside the checks, and earn nothing: the S7 world generator and
the reference read policy (rules 1 to 3 with nesting), the mutants of LAB-7.3, the paired-state evaluator
for one request (INS-pairs' rules on the view slice of checker/src/lib.rs), and the S7 interpreter that
writes revocation traces (single-copy, and a replicated model whose ACL replica lags). They are the oracles
of "unseen, not secret" (labs/README.md section 3): visible to a determined learner, drawn on seeds that
were not.

Engines that have no lane yet (souffle, postgres, cvc5, cargo, the learner's own binaries) are recorded as
runs with their verdict lines; `statespace receipt verify` shows their verdicts as reported. Their tools and
the receipt's datalog, pg, pairs and traces blocks are added through `_Extra`, a session-shaped holder the
runner reads like a lane's session. Nothing here runs at import time.
"""

from __future__ import annotations

import hashlib
import importlib.util
import itertools
import json
import os
import re
import shutil
import time
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

from statespace.check import CheckContext, CheckResult, CheckSpec, InputRefused, Lab, Stage, ToolUnavailable

LAB_DIR = "labs/LAB-7"
REF = f"{LAB_DIR}/reference"
RLIMIT = 5_000_000
PROC_TIMEOUT_S = 120.0
C2_WORLDS = 12  # [D]
C4_WORLDS = 10  # [D], plus W0
C6_TRACES = 24  # [D]

# The course's files whose bytes a check relies on. A changed file is not the course's any more.
ADAPTER_SHA256 = "7824640989fbab7afa1d7b10b659718af8a361595889b37f4f68d228831397b1"
CLAIM_STATEMENT = "claims/no-cross-tenant.smt2"
CLAIM_STATEMENT_HASH = "3df7a4e843c3f0b11ff17341690a714e96a52383ac1bde8e55133642bbe11c00"
REVOCATION_STATEMENT = "claims/revocation.yaml"
REVOCATION_STATEMENT_HASH = "5e57c8c521d096d310d0a3fad3720b81bc641ab810b812ab8c3b80046eb07e74"


# ===================================================================================== receipt helpers
class _Extra:
    """A session-shaped holder for the tools and the receipt block of engines that have no lane yet. The
    runner asks each session for receipt_tools() and receipt_section(), under its SECTION name."""

    def __init__(self, section: str) -> None:
        self.SECTION = section
        self.tools: list[dict[str, Any]] = []
        self.section: dict[str, Any] | None = None

    def receipt_tools(self) -> list[dict[str, Any]]:
        return list(self.tools)

    def receipt_section(self) -> dict[str, Any] | None:
        return self.section


def _extra(ctx: CheckContext, name: str) -> _Extra:
    store: dict[str, _Extra] = ctx.__dict__.setdefault("_lab7_extras", {})
    if not ctx.__dict__.get("_lab7_wrapped"):
        original = ctx.sessions
        ctx.sessions = lambda: [*original(), *store.values()]  # type: ignore[method-assign]
        ctx.__dict__["_lab7_wrapped"] = True
    if name not in store:
        store[name] = _Extra(name)
    return store[name]


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canon(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def _tool(ctx: CheckContext, name: str, path: str, version: str) -> None:
    try:
        from statespace import doctor

        pin = doctor.PINS.get(name)
        pinned_sha = pin.sha256 if pin is not None else None
    except Exception:  # noqa: BLE001 - pins are a courtesy here; the receipt verifier checks them again
        pinned_sha = None
    sha = _sha(Path(path).read_bytes())
    entry: dict[str, Any] = {"name": name, "version": version, "sha256": sha}
    if pinned_sha:
        entry["pinned"] = sha == pinned_sha
    holder = _extra(ctx, "_tools")
    if entry not in holder.tools:
        holder.tools.append(entry)


def _step(ctx: CheckContext, step: str) -> str:
    used: set[str] = ctx.__dict__.setdefault("_lab7_steps", set())
    name, n = step, 1
    while name in used:
        n += 1
        name = f"{step}-{n}"
    used.add(name)
    return name


def _record(
    ctx: CheckContext,
    *,
    step: str,
    engine: str,
    version: str,
    argv: list[str],
    input_sha256: str,
    verdict_lines: list[str],
    verdict: str,
    exit_code: int,
    ms: int,
    budget: dict[str, int] | None = None,
) -> None:
    ctx.runs.append(
        {
            "step": _step(ctx, step),
            "engine": engine,
            "version": version,
            "argv": argv,
            "inputSha256": input_sha256,
            "budget": dict(budget or {}),
            "exitCode": exit_code,
            "verdictLines": verdict_lines or ["(no output)"],
            "verdict": verdict,
            "ms": ms,
        }
    )


def _rel(ctx: CheckContext, path: Path) -> str:
    return path.resolve().relative_to(ctx.root).as_posix()


def _proc(ctx: CheckContext, argv: list[str], *, timeout: float | None = None, env: dict[str, str] | None = None):
    from statespace.check import proc

    return proc.run(argv, cwd=ctx.root, timeout_s=timeout or ctx.wall_clock_s or PROC_TIMEOUT_S, env=env)


def _workfile(ctx: CheckContext, name: str, text: str) -> Path:
    path = ctx.workdir / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))
    return path


def _statement_hash(ctx: CheckContext, relative: str) -> str:
    from statespace.schema.statement_hash import statement_hash_file

    return statement_hash_file(ctx.path(relative))


def _pinned(ctx: CheckContext, relative: str, kind: str, expected: str) -> str:
    """Pin a course-shipped statement and refuse one whose hash is not the course's."""
    text = ctx.statement(relative, kind)
    found = _statement_hash(ctx, relative)
    if found != expected:
        raise InputRefused(f"{relative} is not the statement the course pinned (its statement hash is {found[:12]}..., the course's {expected[:12]}...): restore it from the LAB-7 zip")
    return text


# ===================================================================================== engines
def _adapter(ctx: CheckContext) -> Any:
    """The course's Datalog adapter, labs/LAB-7/reference/ss_datalog.py: the tab engine's front end (Soufflé's
    checks, stratification) over Z3 Fixedpoint, with its derivation rebuilder and validator."""
    cached = ctx.__dict__.get("_lab7_adapter")
    if cached is not None:
        return cached
    path = ctx.path(f"{REF}/ss_datalog.py")
    if not path.is_file():
        raise ToolUnavailable(f"{REF}/ss_datalog.py, the course's Datalog adapter, is missing: unpack the LAB-7 zip again")
    if _sha(path.read_bytes()) != ADAPTER_SHA256:
        raise ToolUnavailable(f"{REF}/ss_datalog.py is not the course's adapter (its SHA-256 differs): unpack the LAB-7 zip again")
    try:
        import z3  # noqa: F401 - Fixedpoint needs the pinned Z3
    except ImportError as error:
        raise ToolUnavailable("z3-solver is not importable here: run `uv run statespace check ...` in your lab repository") from error
    spec = importlib.util.spec_from_file_location("statespace_lab7_ss_datalog", path)
    if spec is None or spec.loader is None:
        raise ToolUnavailable(f"{REF}/ss_datalog.py could not be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    ctx.__dict__["_lab7_adapter"] = module
    ctx.tcb(f"the course's Datalog adapter, {REF}/ss_datalog.py (sha256 {ADAPTER_SHA256[:12]}...), over Z3 Fixedpoint", "tested")
    return module


def _z3_version() -> str:
    import z3

    return z3.get_version_string()


def _souffle(ctx: CheckContext) -> tuple[str, str]:
    """The Soufflé binary and its version line, `Version: 2.5 (2.5)` on the Bench."""
    cached = ctx.__dict__.get("_lab7_souffle")
    if cached is not None:
        return cached
    exe = shutil.which("souffle")
    if exe is None:
        raise ToolUnavailable("Soufflé is not on PATH: LAB-7 runs it on the Bench, whose devcontainer has Soufflé 2.5 (labs/TOOLS.md section 2.7)")
    done = _proc(ctx, [exe, "--version"], timeout=30)
    line = next((ln.strip() for ln in done.output.splitlines() if ln.strip().startswith("Version:")), None)
    if line is None:
        raise ToolUnavailable(f"`souffle --version` printed no Version line: {done.output.strip()[:200]}")
    _tool(ctx, "souffle", exe, line)
    ctx.tcb(f"Soufflé, {line}", "trusted")
    ctx.__dict__["_lab7_souffle"] = (exe, line)
    return exe, line


def _souffle_engine(version_line: str) -> str:
    m = re.search(r"Version:\s*([A-Za-z0-9][A-Za-z0-9._+-]*)", version_line)
    return f"souffle@{m.group(1) if m else 'unknown'}"


def _souffle_eval(ctx: CheckContext, program: str, facts_dir: Path, out_dir: Path, step: str, relation: str = "canread") -> tuple[set[tuple[str, ...]] | None, list[str]]:
    """Run Soufflé on `program` (repository-relative) with the facts in facts_dir, and read `relation` back."""
    exe, version = _souffle(ctx)
    out_dir.mkdir(parents=True, exist_ok=True)
    shown = ["souffle", "-F", _rel(ctx, facts_dir), "-D", _rel(ctx, out_dir), program]
    done = _proc(ctx, [exe, *shown[1:]])
    (out_dir / "souffle.out").write_bytes(done.output.encode("utf-8"))
    errors = [ln for ln in done.output.splitlines() if ln.startswith("Error") or "error" in ln.lower()]
    csv = out_dir / f"{relation}.csv"
    if done.returncode != 0 or not csv.is_file():
        lines = errors[:5] or [ln for ln in done.output.splitlines() if ln.strip()][:5] or [f"souffle exited {done.returncode} and wrote no {relation}.csv"]
        _record(ctx, step=step, engine="souffle", version=version, argv=shown, input_sha256=_sha(ctx.path(program).read_bytes()), verdict_lines=lines, verdict="rejected", exit_code=done.returncode if done.returncode is not None else -1, ms=done.ms)
        return None, lines
    tuples = {tuple(row.split("\t")) for row in csv.read_text(encoding="utf-8").splitlines() if row != ""}
    lines = [f"{relation}\t{len(tuples)} tuples\tsha256 {_digest(tuples)}"]
    _record(ctx, step=step, engine="souffle", version=version, argv=shown, input_sha256=_sha(ctx.path(program).read_bytes()), verdict_lines=lines, verdict="accepted", exit_code=done.returncode or 0, ms=done.ms)
    return tuples, lines


def _digest(tuples: Iterable[tuple[Any, ...]]) -> str:
    """The adapter's canonical form: sorted tab-joined tuples, each with a newline."""
    lines = sorted("\t".join(str(v) for v in t) for t in tuples)
    return _sha("".join(line + "\n" for line in lines).encode("utf-8"))


def _cargo_build(ctx: CheckContext, crate: str, binary: str, step: str) -> tuple[Path | None, list[str]]:
    exe = shutil.which("cargo")
    if exe is None:
        raise ToolUnavailable("cargo is not on PATH: LAB-7 builds your Rust on the Bench, whose devcontainer has Rust 1.96.0 (labs/TOOLS.md section 2.6)")
    version_done = _proc(ctx, [exe, "--version"], timeout=60)
    version = version_done.output.strip().splitlines()[0] if version_done.output.strip() else "cargo"
    _tool(ctx, "cargo", exe, version)
    manifest = f"{LAB_DIR}/{crate}/Cargo.toml"
    if not ctx.path(manifest).is_file():
        raise InputRefused(f"{manifest} is not in your lab repository")
    shown = ["cargo", "build", "--offline", "--quiet", "--manifest-path", manifest]
    done = _proc(ctx, [exe, *shown[1:]], timeout=600)
    (ctx.workdir).mkdir(parents=True, exist_ok=True)
    (ctx.workdir / f"{step}.out").write_bytes(done.output.encode("utf-8"))
    sources = sorted((ctx.path(f"{LAB_DIR}/{crate}/src")).glob("*.rs"))
    digest = _sha(b"".join(p.name.encode() + b"\0" + p.read_bytes() for p in sources))
    out = ctx.path(f"{LAB_DIR}/{crate}/target/debug/{binary}")
    if done.returncode != 0 or not out.is_file():
        lines = [ln for ln in done.output.splitlines() if ln.startswith("error")][:5] or [ln for ln in done.output.splitlines() if ln.strip()][-5:] or [f"cargo exited {done.returncode}"]
        _record(ctx, step=step, engine="cargo", version=version, argv=shown, input_sha256=digest, verdict_lines=lines, verdict="failed", exit_code=done.returncode if done.returncode is not None else -1, ms=done.ms)
        return None, lines
    _record(ctx, step=step, engine="cargo", version=version, argv=shown, input_sha256=digest, verdict_lines=[f"built {LAB_DIR}/{crate}/target/debug/{binary}"], verdict="passed", exit_code=0, ms=done.ms)
    return out, []


# ===================================================================================== the S7 world
TENANTS = ("acme", "birch", "cedar")
TEAMS = ("payments", "growth", "legal", "risk", "ops")
USERS = ("dana", "frank", "gia", "hal", "eli", "ivy", "jo", "kim")
DOCS = ("q3-plan", "roadmap", "contract", "layoffs-memo", "budget", "hiring", "audit", "pricing", "launch", "vendor")
ROLES = ("viewer", "editor", "admin")
INPUTS = ("tenant_of_user", "tenant_of_team", "member", "owns", "subteam", "share_user", "share_team", "revoked")

World = dict[str, set[tuple[str, ...]]]


def w0() -> World:
    """The reference world W0 of curriculum/S07-secrecy.md section 1."""
    return {
        "tenant_of_user": {("dana", "acme"), ("frank", "acme"), ("gia", "birch"), ("hal", "birch")},
        "tenant_of_team": {("payments", "acme"), ("growth", "acme"), ("legal", "birch")},
        "member": {("dana", "payments", "editor"), ("frank", "growth", "viewer"), ("gia", "legal", "admin"), ("hal", "legal", "viewer")},
        "owns": {("payments", "q3-plan"), ("growth", "roadmap"), ("legal", "contract"), ("legal", "layoffs-memo")},
        "subteam": set(),
        "share_user": {("contract", "dana")},
        "share_team": {("roadmap", "payments")},
        "revoked": set(),
    }


def generate_world(rng: Any) -> World:
    """A seeded world: 2 to 3 tenants, 2 to 5 teams, 3 to 8 users (some teamless), 3 to 10 documents,
    nesting depth 0 to 2, shares and revocations. WF1 to WF3 hold by construction [D]."""
    tenants = list(TENANTS[: rng.randint(2, 3)])
    teams = list(TEAMS[: rng.randint(max(2, len(tenants)), 5)])
    team_tenant = {t: (tenants[i] if i < len(tenants) else rng.choice(tenants)) for i, t in enumerate(teams)}
    users = list(USERS[: rng.randint(3, 8)])
    user_tenant = {u: rng.choice(tenants) for u in users}
    world: World = {name: set() for name in INPUTS}
    world["tenant_of_user"] = {(u, a) for u, a in user_tenant.items()}
    world["tenant_of_team"] = {(t, a) for t, a in team_tenant.items()}
    for u in users:
        home = [t for t in teams if team_tenant[t] == user_tenant[u]]
        if not home or rng.random() < 0.2:
            continue  # a teamless user
        for t in rng.sample(home, rng.randint(1, min(2, len(home)))):
            world["member"].add((u, t, rng.choice(ROLES)))
    depth = rng.randint(0, 2)
    for a in tenants:
        chain = [t for t in teams if team_tenant[t] == a]
        rng.shuffle(chain)
        for i in range(min(depth, len(chain) - 1)):
            world["subteam"].add((chain[i + 1], chain[i]))  # chain[i+1] is nested in chain[i]
    docs = list(DOCS[: rng.randint(3, 10)])
    for d in docs:
        world["owns"].add((rng.choice(teams), d))
        for u in rng.sample(users, rng.choice((0, 0, 1, 1, 2))):
            world["share_user"].add((d, u))
            if rng.random() < 0.3:
                world["revoked"].add((d, u))
        for t in rng.sample(teams, rng.choice((0, 0, 0, 1))):
            world["share_team"].add((d, t))
    return world


def world_users(world: World) -> list[str]:
    return sorted(u for u, _ in world["tenant_of_user"])


def world_docs(world: World) -> list[str]:
    return sorted(d for _, d in world["owns"])


def inteam(world: World) -> set[tuple[str, str]]:
    closure = {(u, t) for u, t, _ in world["member"]}
    changed = True
    while changed:
        changed = False
        for u, s in list(closure):
            for child, parent in world["subteam"]:
                if child == s and (u, parent) not in closure:
                    closure.add((u, parent))
                    changed = True
    return closure


def reference_rules(world: World) -> tuple[set[tuple[str, str]], set[tuple[str, str]], set[tuple[str, str]]]:
    """Rules 1, 2 and 3 of the read policy, each alone."""
    team = inteam(world)
    r1 = {(u, d) for u, t in team for owner, d in world["owns"] if owner == t}
    r2 = {(u, d) for d, u in world["share_user"] if (d, u) not in world["revoked"]}
    r3 = {(u, d) for u, t in team for d, shared in world["share_team"] if shared == t}
    return r1, r2, r3


def reference_canread(world: World) -> set[tuple[str, str]]:
    r1, r2, r3 = reference_rules(world)
    return r1 | r2 | r3


def facts_text(world: World, relation: str) -> str:
    return "".join("\t".join(row) + "\n" for row in sorted(world[relation]))


def write_facts(world: World, directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for relation in INPUTS:
        (directory / f"{relation}.facts").write_text(facts_text(world, relation), encoding="utf-8")


def world_stats(worlds: list[World]) -> dict[str, Any]:
    fires = [0, 0, 0]
    trivial = 0
    for world in worlds:
        rules = reference_rules(world)
        for k, derived in enumerate(rules):
            fires[k] += bool(derived)
        allowed = reference_canread(world)
        if not allowed or len(allowed) == len(world_users(world)) * len(world_docs(world)):
            trivial += 1
    teamless = sum(len(set(world_users(w)) - {u for u, _, _ in w["member"]}) for w in worlds)
    n = len(worlds)
    return {
        "worlds": n,
        "users": sum(len(world_users(w)) for w in worlds),
        "teamlessUsers": teamless,
        "documents": sum(len(world_docs(w)) for w in worlds),
        "shares": sum(len(w["share_user"]) + len(w["share_team"]) for w in worlds),
        "revocations": sum(len(w["revoked"]) for w in worlds),
        "nestingEdges": sum(len(w["subteam"]) for w in worlds),
        "ruleFiring": {f"rule{k + 1}": round(fires[k] / n, 3) for k in range(3)},
        "trivialShare": round(trivial / n, 3),
    }


# ===================================================================================== LAB-7.c1
def _prediction(ctx: CheckContext) -> set[tuple[str, str]] | None:
    rows: set[tuple[str, str]] = set()
    said = False
    for raw in ctx.text(f"{LAB_DIR}/predict/lab7.1.txt").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        said = True
        if line.lower() == "none":
            continue
        parts = line.replace(",", " ").split()
        if len(parts) != 2:
            raise InputRefused(f"labs/LAB-7/predict/lab7.1.txt: `{line}` is not a tuple of two numbers")
        rows.add((parts[0], parts[1]))
    return rows if said else None


def c1(ctx: CheckContext) -> CheckResult:
    predicted = _prediction(ctx)
    if predicted is None:
        return CheckResult(False, "no call yet: write which tuples canread will hold in labs/LAB-7/predict/lab7.1.txt, then check again", "spec", ("nothing was run, so that your call comes first",))
    adapter = _adapter(ctx)
    program = f"{REF}/toy.dl"
    text = ctx.text(program)
    prog = adapter.parse(text)
    adapter.check(prog)
    facts = {rel: ctx.text(f"{REF}/{rel}.facts") for rel in prog.inputs}
    tuples, lines = _souffle_eval(ctx, program, ctx.path(REF), ctx.workdir / "c1-souffle", "c1-souffle")
    if tuples is None:
        return CheckResult(False, "Soufflé did not evaluate the reference program: " + "; ".join(lines), "tool")
    t0 = time.perf_counter()
    rels = adapter.eval_fixedpoint(prog, adapter.load_facts(prog, facts))
    ms = int((time.perf_counter() - t0) * 1000)
    tab = {tuple(str(v) for v in t) for t in rels["canread"]}
    version = _z3_version()
    tab_lines = [f"canread\t{len(tab)} tuples\tsha256 {_digest(tab)}"]
    _record(ctx, step="c1-fixedpoint", engine="datalog", version=f"z3 {version} Fixedpoint", argv=["ss_datalog.eval_fixedpoint", program, "-F", REF], input_sha256=_sha(ctx.path(program).read_bytes()), verdict_lines=tab_lines, verdict="accepted", exit_code=0, ms=ms)
    _, souffle_version = _souffle(ctx)
    block = _extra(ctx, "datalog")
    block.section = {"engine": _souffle_engine(souffle_version), "relations": {"canread": _digest(tuples)}}
    ctx.ext["lab7"] = {"tabEngine": f"z3-fixedpoint@{version}", "tabRelations": {"canread": _digest(tab)}}
    shown = ", ".join(f"({a}, {b})" for a, b in sorted(tuples)) or "nothing"
    if tuples != tab:
        return CheckResult(False, f"the two engines disagree: Soufflé derives {len(tuples)} tuples and the tab's engine {len(tab)}", "tool", (f"Soufflé: {lines[0]}", f"tab engine: {tab_lines[0]}"))
    ctx.note(f"relation hashes: Soufflé {_digest(tuples)[:16]}..., tab engine {_digest(tab)[:16]}... (equal)")
    if predicted == tuples:
        ctx.note("your call matched: " + shown)
    else:
        ctx.note(f"your call was {', '.join(f'({a}, {b})' for a, b in sorted(predicted)) or 'none'}; the engines derived {shown}")
    return CheckResult(True, f"Soufflé ({souffle_version}) and Z3 {version} Fixedpoint derive the same canread: {shown}")


# ===================================================================================== LAB-7.c2
def c2(ctx: CheckContext) -> CheckResult:
    program = f"{LAB_DIR}/policy/read.dl"
    text = ctx.text(program)
    adapter = _adapter(ctx)
    ctx.ext.setdefault("lab7", {})["policySha256"] = _sha(ctx.path(program).read_bytes())
    try:
        prog = adapter.parse(text)
        adapter.check(prog)
    except adapter.DatalogError as error:
        return CheckResult(False, f"policy/read.dl does not pass Soufflé's checks in the tab engine: {error.kind}: {error.message}", "spec")
    if "canread" not in prog.outputs:
        return CheckResult(False, "policy/read.dl does not output canread (`.output canread`)", "spec")
    missing = [rel for rel in prog.inputs if rel not in INPUTS]
    if missing:
        return CheckResult(False, f"policy/read.dl reads {', '.join(missing)}, which the world generator does not write: keep the template's declarations", "spec")
    worlds = [generate_world(ctx.rng) for _ in range(C2_WORLDS)]
    version = _z3_version()
    relations: dict[str, str] = {}
    checked = invalid = 0
    first_wrong: tuple[str, ...] | None = None
    for k, world in enumerate(worlds, 1):
        directory = ctx.workdir / f"c2-world-{k}"
        write_facts(world, directory / "facts")
        expected = reference_canread(world)
        tuples, lines = _souffle_eval(ctx, program, directory / "facts", directory / "souffle", f"c2-souffle-{k}")
        if tuples is None:
            return CheckResult(False, f"Soufflé rejected policy/read.dl on world {k}: " + "; ".join(lines), "spec", (f"the world's facts are in {_rel(ctx, directory / 'facts')}",))
        facts = {rel: facts_text(world, rel) for rel in prog.inputs}
        t0 = time.perf_counter()
        edb = adapter.load_facts(prog, facts)
        rels = adapter.eval_fixedpoint(prog, edb)
        ms = int((time.perf_counter() - t0) * 1000)
        tab = {tuple(str(v) for v in t) for t in rels["canread"]}
        _record(ctx, step=f"c2-fixedpoint-{k}", engine="datalog", version=f"z3 {version} Fixedpoint", argv=["ss_datalog.eval_fixedpoint", program, "-F", _rel(ctx, directory / "facts")], input_sha256=_sha(ctx.path(program).read_bytes()), verdict_lines=[f"canread\t{len(tab)} tuples\tsha256 {_digest(tab)}"], verdict="accepted", exit_code=0, ms=ms)
        relations[f"canread#{k}"] = _digest(tuples)
        if first_wrong is None:
            for engine, got in (("Soufflé", tuples), ("the tab engine", tab)):
                extra = sorted(got - expected)
                lost = sorted(expected - got)
                if extra or lost:
                    u, d = (extra or lost)[0]
                    allowed = bool(extra)
                    r1, r2, r3 = reference_rules(world)
                    why = "no rule of the reference derives it" if allowed else "the reference derives it by " + ", ".join(n for n, s in (("rule 1", r1), ("rule 2", r2), ("rule 3", r3)) if (u, d) in s)
                    first_wrong = (
                        f"on world {k}, {engine} {'allows' if allowed else 'denies'} ({u}, {d}) under your policy; the reference {'denies' if allowed else 'allows'} it: {why}",
                        f"the world's facts: {_rel(ctx, directory / 'facts')}",
                        f"{len(extra)} cells your policy allows and the reference denies, {len(lost)} the other way, on this world",
                    )
                    break
        if tab:
            cell = sorted(tab)[ctx.rng.randrange(len(tab))]
            height, best, _ = adapter.derive(prog, edb, rels)
            n, failures = adapter.validate(prog, rels, height, best)
            key = ("canread", tuple(cell))
            checked += 1
            if key not in best or failures:
                invalid += 1
    stats = world_stats(worlds)
    _, souffle_version = _souffle(ctx)
    block = _extra(ctx, "datalog")
    block.section = {"engine": _souffle_engine(souffle_version), "relations": relations, "derivations": {"checked": checked, "invalid": invalid}, "generator": stats}
    ctx.note(f"generator: {stats['worlds']} worlds, {stats['users']} users ({stats['teamlessUsers']} teamless), {stats['documents']} documents, {stats['shares']} shares, {stats['revocations']} revocations, {stats['nestingEdges']} nesting edges")
    ctx.note("rule firing (share of worlds): " + ", ".join(f"{k} {v}" for k, v in stats["ruleFiring"].items()) + f"; trivial matrices {stats['trivialShare']} (aims [D]: each rule at least 0.5, trivial at most 0.1)")
    if first_wrong is not None:
        return CheckResult(False, first_wrong[0], "spec", first_wrong[1:])
    if invalid:
        return CheckResult(False, f"{invalid} of {checked} derivations checked are not valid trees of your rules", "implementation")
    ctx.claim("CL-7.1")
    return CheckResult(True, f"your canread equals the reference matrix on {len(worlds)} fresh worlds in Soufflé and in the tab engine; {checked} derivations are valid trees")


# ===================================================================================== LAB-7.c3
CANREAD_LINE = "(define-fun canread ((u User) (d Doc)) Bool (or (rule1 u d) (rule2 u d) (rule3 u d)))"
MUTANTS: dict[str, tuple[str, Callable[[str], str]]] = {
    "wf1-dropped": ("WF1 dropped", lambda t: t.replace("(assert WF1)\n", "")),
    "tenant-grant": (
        "a tenant-level grant",
        lambda t: t.replace(CANREAD_LINE, "(declare-fun share_tenant (Doc Tenant) Bool)\n(define-fun canread ((u User) (d Doc)) Bool (or (rule1 u d) (rule2 u d) (rule3 u d) (share_tenant d (tu u))))"),
    ),
    "subset-share": (
        "subset for overlap in a team share",
        lambda t: t.replace(CANREAD_LINE, "(define-fun rule3_subset ((u User) (d Doc)) Bool (forall ((t Team)) (=> (inteam u t) (share_team d t))))\n(define-fun canread ((u User) (d Doc)) Bool (or (rule1 u d) (rule2 u d) (rule3_subset u d)))"),
    ),
    "nesting-no-wf2": ("nesting without WF2", lambda t: t.replace("(assert WF2)\n", "")),
}
REFERENCE_PROPERTY = """(define-fun reference_violation ((u User) (d Doc)) Bool
  (and (canread u d) (not (= (tu u) (td d))) (not (rule2 u d)) (not (rule3 u d))))
"""
REQUEST = "(declare-const req_u User)\n(declare-const req_d Doc)\n"


def _decode_request(text: str, mutant: str) -> tuple[bool, str]:
    """Re-solve a sat query with Z3's Python API, decode the world and the request from the model, and replay
    the request in plain Python: canread under the mutant's policy, tenants that differ, no explicit share,
    and the mutant's invariants. Models are not canonical, so any model will do; the property is checked,
    never the values."""
    import z3

    body = text.rsplit("(check-sat)", 1)[0]
    solver = z3.Solver()
    solver.set("rlimit", RLIMIT)
    solver.from_string(body)
    if solver.check() != z3.sat:
        return False, "Z3's Python API did not find the model again"
    m = solver.model()
    U, T, D, A = (z3.DeclareSort(n) for n in ("User", "Team", "Doc", "Tenant"))
    B = z3.BoolSort()
    tu, tt, owner = z3.Function("tu", U, A), z3.Function("tt", T, A), z3.Function("owner", D, T)
    member, anc = z3.Function("member", U, T, B), z3.Function("anc", T, T, B)
    share_user, share_team, revoked = z3.Function("share_user", D, U, B), z3.Function("share_team", D, T, B), z3.Function("revoked", D, U, B)
    share_tenant = z3.Function("share_tenant", D, A, B)
    req_u, req_d = z3.Const("req_u", U), z3.Const("req_d", D)

    def universe(sort: Any) -> list[Any]:
        found = m.get_universe(sort)
        return list(found) if found is not None else []

    users, teams, docs = universe(U), universe(T), universe(D)
    if not users or not docs or not teams:
        return False, "the model names no user, team or document"
    ev = lambda e: m.eval(e, model_completion=True)  # noqa: E731
    is_true = lambda e: z3.is_true(ev(e))  # noqa: E731
    key = lambda e: str(ev(e))  # noqa: E731
    u, d = ev(req_u), ev(req_d)
    own_value = ev(owner(d))
    if all(str(t) != str(own_value) for t in teams):
        teams = [*teams, own_value]  # model completion may name a value the universe did not list
    t_of = {str(t): key(tt(t)) for t in teams}
    mem = {(str(x), str(t)) for x in users for t in teams if is_true(member(x, t))}
    nest = {(str(s), str(t)) for s in teams for t in teams if is_true(anc(s, t))}
    if mutant != "wf1-dropped" and any(key(tu(x)) != t_of[str(t)] for x in users for t in teams if (str(x), str(t)) in mem):
        return False, "the decoded world breaks WF1"
    if mutant != "nesting-no-wf2" and any(t_of[s] != t_of[t] for s, t in nest):
        return False, "the decoded world breaks WF2"
    team_names = [str(t) for t in teams]
    closure = lambda who: {t for t in team_names if (who, t) in mem or any((who, s) in mem and (s, t) in nest for s in team_names)}  # noqa: E731
    mine = closure(str(u))
    own = str(own_value)
    rule1 = own in mine
    rule2 = is_true(share_user(d, u)) and not is_true(revoked(d, u))
    rule3 = any(is_true(share_team(d, t)) for t in teams if str(t) in mine)
    if mutant == "tenant-grant":
        allowed = rule1 or rule2 or rule3 or is_true(share_tenant(d, tu(u)))
    elif mutant == "subset-share":
        allowed = rule1 or rule2 or all(is_true(share_team(d, t)) for t in teams if str(t) in mine)
    else:
        allowed = rule1 or rule2 or rule3
    cross = key(tu(u)) != t_of[own]
    desc = f"user {u} of tenant {key(tu(u))} reads document {d}, owned by team {own} of tenant {t_of[own]}; member of {sorted(mine) or 'no team'}"
    if not allowed:
        return False, "the policy does not allow the decoded request: " + desc
    if not cross:
        return False, "the decoded request does not cross tenants: " + desc
    if rule2 or rule3:
        return False, "the decoded request is explained by an explicit share: " + desc
    return True, desc


def _cvc5(ctx: CheckContext, path: Path) -> str | None:
    exe = shutil.which("cvc5")
    if exe is None:
        ctx.note("cvc5 is not on PATH, so the cross-check of the unsat did not run (the Bench has cvc5 1.4.2)")
        return None
    v = _proc(ctx, [exe, "--version"], timeout=30)
    version = v.output.strip().splitlines()[0] if v.output.strip() else "cvc5"
    _tool(ctx, "cvc5", exe, version)
    shown = ["cvc5", "--lang=smt2", "--force-logic=ALL", _rel(ctx, path)]
    done = _proc(ctx, [exe, *shown[1:]], timeout=120)
    answer = next((ln.strip() for ln in done.output.splitlines() if ln.strip() in ("sat", "unsat", "unknown")), None)
    lines = [answer] if answer else ([ln for ln in done.output.splitlines() if ln.strip()][:3] or ["(no output)"])
    _record(ctx, step="c3-cvc5", engine="cvc5", version=version, argv=shown, input_sha256=_sha(path.read_bytes()), verdict_lines=lines, verdict=answer or "error", exit_code=done.returncode if done.returncode is not None else -1, ms=done.ms)
    ctx.tcb(version, "trusted")
    return answer


def c3(ctx: CheckContext) -> CheckResult:
    prelude = _pinned(ctx, CLAIM_STATEMENT, "smt2", CLAIM_STATEMENT_HASH)
    mine = ctx.statement(f"{LAB_DIR}/policy/read.smt2", "smt2")
    code = "\n".join(line.split(";", 1)[0] for line in mine.splitlines())
    if "(check-sat" in code or re.search(r"\(\s*assert\b", code):
        raise InputRefused("policy/read.smt2 asks its own question or asserts: write define-fun forms only, and let the check ask")
    if not re.search(r"\(define-fun\s+violation\s", code):
        raise InputRefused("policy/read.smt2 does not define (violation u d)")
    z3s = ctx.z3()
    ctx.tcb("Z3 5.3.1 under an rlimit, entry cli", "trusted")
    ctx.tcb(f"the encoding: {CLAIM_STATEMENT} (completion, nesting grounded as data)", "trusted")

    def ask(base: str, extra: str, assertion: str, step: str) -> Any:
        return z3s.run(base.rstrip("\n") + "\n" + extra + REQUEST + f"(assert {assertion})\n(check-sat)\n", step=step, rlimit=RLIMIT, seed=ctx.seed)

    premise = ask(prelude, "", "(canread req_u req_d)", "c3-premise")
    nonvacuity = ask(prelude, "", "(and (canread req_u req_d) (= (tu req_u) (td req_d)))", "c3-nonvacuity")
    if premise.verdict != "sat" or nonvacuity.verdict != "sat":
        return CheckResult(False, f"the premise witness is {premise.verdict} and the non-vacuity witness {nonvacuity.verdict}; both must be sat", "tool", ("the pinned statement and Z3 disagree with the course's run; read the verdict lines in the receipt",))
    yours = ask(prelude, mine.rstrip("\n") + "\n", "(violation req_u req_d)", "c3-base")
    reference = ask(prelude, REFERENCE_PROPERTY, "(reference_violation req_u req_d)", "c3-base-reference")
    if yours.verdict in ("sat", "unsat", "unknown"):
        z3s.headline(yours)
    problems: list[str] = []
    rows: list[str] = [f"WF1 to WF3: yours {yours.verdict}, reference {reference.verdict}"]
    if yours.verdict == "unknown":
        problems.append(f"rejected: unknown ({yours.reason_unknown or 'no reason given'}) on the base policy, never 'no counterexample'")
    elif yours.verdict == "error":
        return CheckResult(False, "Z3 reported an error on your property: " + " | ".join(yours.verdict_lines[:2]), "spec")
    elif yours.verdict != reference.verdict:
        problems.append(f"with WF1 to WF3 your query answers {yours.verdict}, the reference's {reference.verdict}")
        if yours.verdict == "sat":
            ok, desc = _decode_request(yours_text(yours, ctx), "base")
            problems.append(("a request your property calls a violation: " if ok else "your sat does not replay: ") + desc)
    order = list(MUTANTS)
    ctx.rng.shuffle(order)
    for name in order:
        label, mutate = MUTANTS[name]
        base = mutate(prelude)
        mine_run = ask(base, mine.rstrip("\n") + "\n", "(violation req_u req_d)", f"c3-{name}")
        ref_run = ask(base, REFERENCE_PROPERTY, "(reference_violation req_u req_d)", f"c3-{name}-reference")
        rows.append(f"{label}: yours {mine_run.verdict}, reference {ref_run.verdict}")
        if mine_run.verdict == "unknown":
            problems.append(f"{label}: rejected: unknown ({mine_run.reason_unknown or 'no reason given'})")
        elif mine_run.verdict != ref_run.verdict:
            problems.append(f"{label}: your query answers {mine_run.verdict}, the reference's {ref_run.verdict}" + (": your property misses the distinguishing request this mutant allows" if ref_run.verdict == "sat" else ""))
        elif mine_run.verdict == "sat":
            ok, desc = _decode_request(yours_text(mine_run, ctx), name)
            rows.append(f"  distinguishing request ({'replays' if ok else 'does NOT replay'}): {desc}")
            if not ok:
                problems.append(f"{label}: your sat names a request that does not replay: {desc}")
    for row in rows:
        ctx.note(row)
    if problems:
        return CheckResult(False, problems[0], "spec", tuple(problems[1:]))
    path = ctx.path(yours.input_path)
    answer = _cvc5(ctx, path)
    if answer is not None:
        ctx.note(f"cvc5 on the base query: {answer} (recorded; two solvers agreeing leaves the claim uncertified)")
    ctx.claim("CL-7.2")
    return CheckResult(True, f"with WF1 to WF3 your property is unsat, beside sat premise and non-vacuity witnesses; on {len(MUTANTS)} seeded mutants your verdicts equal the reference's and each sat replays (Z3 {yours.version}, rlimit {RLIMIT})")


def yours_text(run: Any, ctx: CheckContext) -> str:
    return ctx.path(run.input_path).read_bytes().decode("utf-8")


# ===================================================================================== LAB-7.c4
def _sql_world(world: World) -> list[tuple[str, tuple[Any, ...]]]:
    teams = sorted(t for t, _ in world["tenant_of_team"])
    ids = {t: i + 1 for i, t in enumerate(teams)}
    tenant = dict(world["tenant_of_team"])
    out: list[tuple[str, tuple[Any, ...]]] = []
    for t in teams:
        out.append(("INSERT INTO app.teams VALUES (%s, %s, %s)", (ids[t], t, tenant[t])))
    for child, parent in sorted(world["subteam"]):
        out.append(("INSERT INTO app.subteams VALUES (%s, %s)", (ids[child], ids[parent])))
    for u, t, r in sorted(world["member"]):
        out.append(("INSERT INTO app.memberships VALUES (%s, %s, %s)", (u, ids[t], r)))
    shared: dict[str, list[int]] = {}
    for d, t in world["share_team"]:
        shared.setdefault(d, []).append(ids[t])
    for t, d in sorted(world["owns"], key=lambda x: x[1]):
        out.append(("INSERT INTO app.documents (id, slug, team_id, title, body, internal_notes, shared_team_ids) VALUES (%s, %s, %s, %s, %s, %s, %s)", (d, d, ids[t], f"{d} title", f"{d} body", f"{d} notes", sorted(shared.get(d, [])))))
    for d, u in sorted(world["share_user"]):
        out.append(("INSERT INTO app.shares VALUES (%s, %s, %s)", (d, u, (d, u) in world["revoked"])))
    return out


def c4(ctx: CheckContext) -> CheckResult:
    try:
        import psycopg
        from psycopg import conninfo, sql
    except ImportError as error:
        raise ToolUnavailable("psycopg is not importable here: the repository's pyproject.toml pins psycopg[binary]==3.3.6, so run `uv sync` and then `uv run statespace check lab7.4`") from error
    dsn = os.environ.get("STATESPACE_PG_DSN", "").strip()
    if not dsn:
        raise ToolUnavailable("STATESPACE_PG_DSN is not set: the devcontainer sets it to its PostgreSQL 18.6 service")
    schema = ctx.text(f"{LAB_DIR}/rls/schema.sql")
    policies = ctx.statement(f"{LAB_DIR}/rls/policies.sql", "sql")
    policy_hash = _statement_hash(ctx, f"{LAB_DIR}/rls/policies.sql")
    try:
        admin = psycopg.connect(dsn, autocommit=True, connect_timeout=10)
    except psycopg.Error as error:
        raise ToolUnavailable(f"PostgreSQL did not accept a connection on STATESPACE_PG_DSN: {str(error).strip().splitlines()[0]}") from error
    database = f"statespace_lab7_{ctx.seed:08x}"
    worlds = [w0(), *(generate_world(ctx.rng) for _ in range(C4_WORLDS))]
    t0 = time.perf_counter()
    with admin:
        server = admin.execute("select version()").fetchone()[0]
        admin.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(database)))
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
        try:
            for role, extra in (("app_owner", ""), ("app_users", ""), *((u, " IN ROLE app_users") for u in USERS)):
                if admin.execute("select 1 from pg_roles where rolname = %s", (role,)).fetchone() is None:
                    admin.execute(f'CREATE ROLE "{role}" NOLOGIN{extra}')
            with psycopg.connect(conninfo.make_conninfo(dsn, dbname=database), autocommit=True) as db:
                result = _rls_differential(ctx, db, schema, policies, worlds, psycopg)
        finally:
            admin.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(database)))
    ms = int((time.perf_counter() - t0) * 1000)
    if isinstance(result, CheckResult):
        return result
    set_role, bypass, owner, readback, comparisons = result
    stats = world_stats(worlds)
    summary = [
        f"set-role: {len(set_role)} disagreements over {len(worlds)} worlds x users",
        f"owner probe without FORCE: {bypass} rows the matrix denies were visible",
        f"owner probe under your configuration: {len(owner)} disagreements",
        f"pg_class: relrowsecurity {readback[0]}, relforcerowsecurity {readback[1]}, at {readback[2]}",
    ]
    # The PostgreSQL lane's grammar for statements a check sends (statespace/lanes/pg.py): its verdict says the run went
    # to its summary line, never that the check passed; the check reads the summary.
    verdict_lines = [
        f"server: {server}",
        "statement: SET ROLE <user>; SELECT set_config('app.user', <user>, true); SELECT id FROM app.documents",
        "statement: SET ROLE app_owner; the same query, first with FORCE switched off, then under your configuration",
        f"executed: {comparisons} read-backs on {len(worlds)} worlds",
        "summary: " + "; ".join(summary),
    ]
    _record(ctx, step="c4-rls", engine="postgresql", version=server, argv=["psycopg", f"database {database}", "rls/schema.sql, then labs/LAB-7/rls/policies.sql, then each world"], input_sha256=policy_hash, verdict_lines=verdict_lines, verdict="passed", exit_code=0, ms=ms, budget={"seed": ctx.seed})
    lines = summary
    block = _extra(ctx, "pg")
    block.section = {
        "serverVersion": server,
        "isolationLevel": "read-committed",
        "sqlstateClasses": {},
        "rls": {"roleMode": "set-role, then owner (app_owner) with and without FORCE", "policySha256": policy_hash, "readBacks": comparisons, "disagreements": len(set_role) + len(owner)},
    }
    ctx.ext.setdefault("lab7", {}).update({"rlsGenerator": stats, "forceReadBack": {"relrowsecurity": readback[0], "relforcerowsecurity": readback[1], "at": readback[2]}})
    ctx.tcb(f"PostgreSQL's row-level security ({server.split(' on ')[0]})", "tested")
    ctx.tcb("the RLS harness of statespace check lab7.4, through psycopg", "trusted")
    for line in lines:
        ctx.note(line)
    ctx.note(f"generator: {stats['worlds']} worlds (W0 and {C4_WORLDS} fresh), {stats['users']} users ({stats['teamlessUsers']} teamless), {stats['documents']} documents; policy hash {policy_hash[:16]}...")
    if set_role:
        return CheckResult(False, f"SET ROLE mode: {set_role[0]}", "spec", tuple(set_role[1:3]))
    if bypass == 0:
        return CheckResult(False, "the owner probe without FORCE saw no row the matrix denies, so it could not catch the bypass", "tool")
    if owner:
        return CheckResult(False, f"owner connection under your configuration: {owner[0]}", "spec", ("the table owner bypasses row security unless the table is forced: S7.L4 segment 2", *owner[1:2]))
    if not (readback[0] and readback[1]):
        return CheckResult(False, f"pg_class reads relrowsecurity {readback[0]} and relforcerowsecurity {readback[1]}; both must be true", "spec")
    ctx.claim("CL-7.4")
    return CheckResult(True, f"row-level security equals the matrix for every user on {len(worlds)} worlds in SET ROLE mode and as the owner; the owner probe without FORCE saw {bypass} denied rows, and FORCE reads back true")


def _rls_differential(ctx: CheckContext, db: Any, schema: str, policies: str, worlds: list[World], psycopg: Any) -> CheckResult | tuple[list[str], int, list[str], tuple[bool, bool, str], int]:
    db.execute(schema)
    try:
        db.execute(policies)
    except psycopg.Error as error:
        return CheckResult(False, "rls/policies.sql did not run: " + str(error).strip().splitlines()[0], "spec")
    set_role: list[str] = []
    owner: list[str] = []
    bypass = 0
    comparisons = 0
    force = bool(db.execute("select relforcerowsecurity from pg_class where oid = 'app.documents'::regclass").fetchone()[0])

    def visible(role: str, user: str) -> set[str]:
        with db.transaction():
            db.execute(f'SET LOCAL ROLE "{role}"')
            db.execute("SELECT set_config('app.user', %s, true)", (user,))
            return {r[0] for r in db.execute("SELECT id FROM app.documents").fetchall()}

    for k, world in enumerate(worlds):
        name = "W0" if k == 0 else f"world {k}"
        db.execute("RESET ROLE")
        db.execute("TRUNCATE app.shares, app.documents, app.memberships, app.subteams, app.teams")
        for statement, params in _sql_world(world):
            db.execute(statement, params)
        matrix = reference_canread(world)
        for u in world_users(world):
            row = {d for (x, d) in matrix if x == u}
            got = visible(u, u)
            comparisons += 1
            if got != row:
                extra, lost = sorted(got - row), sorted(row - got)
                set_role.append(f"on {name}, {u} sees {', '.join(extra) or 'nothing extra'} the matrix denies and misses {', '.join(lost) or 'nothing'} it allows")
        db.execute("ALTER TABLE app.documents NO FORCE ROW LEVEL SECURITY")
        for u in world_users(world):
            row = {d for (x, d) in matrix if x == u}
            bypass += len(visible("app_owner", u) - row)
        if force:
            db.execute("ALTER TABLE app.documents FORCE ROW LEVEL SECURITY")
        for u in world_users(world):
            row = {d for (x, d) in matrix if x == u}
            got = visible("app_owner", u)
            comparisons += 1
            if got != row:
                owner.append(f"on {name}, the owner with app.user {u} sees {', '.join(sorted(got - row)) or 'nothing extra'} beyond {u}'s matrix row")
    rls, forced, at = db.execute("select c.relrowsecurity, c.relforcerowsecurity, now()::text from pg_class c where c.oid = 'app.documents'::regclass").fetchone()
    return set_role, bypass, owner, (bool(rls), bool(forced), str(at)), comparisons


# ===================================================================================== the view slice (INS-pairs' rules for LAB-7.5)
STATE = (("exists", bool), ("own", bool), ("shared", bool), ("title", int), ("body", int), ("internal_notes", int), ("visible", int), ("hidden", int))
FIELDS = ("title", "body", "internal_notes")
PARTS = ("code", "fields", "total")


def read_view(text: str) -> dict[str, Any]:
    view: dict[str, Any] = {"name": "", "missing": "", "denied": "", "fields": [], "total": "none"}
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        words = line.split()
        if len(words) != 2:
            raise InputRefused(f"view line {n}: expected `<key> <value>`, found `{line}`")
        key, value = words
        if key in ("view", "missing", "denied"):
            view["name" if key == "view" else key] = value
        elif key == "field":
            if value not in FIELDS:
                raise InputRefused(f"view line {n}: `{value}` is not a field (title, body, internal_notes)")
            if value not in view["fields"]:
                view["fields"].append(value)
        elif key == "total":
            if value not in ("none", "visible", "all"):
                raise InputRefused(f"view line {n}: total is none, visible or all")
            view["total"] = value
        else:
            raise InputRefused(f"view line {n}: unknown key `{key}`")
    if not (view["name"] and view["missing"] and view["denied"]):
        raise InputRefused("a view names itself and its missing and denied codes")
    return view


def write_view(view: dict[str, Any]) -> str:
    lines = [f"view {view['name']}", f"missing {view['missing']}", f"denied {view['denied']}", *(f"field {f}" for f in view["fields"]), f"total {view['total']}"]
    return "\n".join(lines) + "\n"


def code_number(code: str) -> int:
    fixed = {"ok": 0, "not_found": 1, "forbidden": 2}
    if code in fixed:
        return fixed[code]
    h = 0
    for b in code.encode():
        h = (h * 31 + b) % 1_000_003
    return 3 + h


def response(view: dict[str, Any], s: dict[str, Any]) -> dict[str, Any]:
    readable = s["exists"] and (s["own"] or s["shared"])
    code = view["missing"] if not s["exists"] else (view["denied"] if not readable else "ok")
    total = {"none": 0, "visible": s["visible"], "all": s["visible"] + s["hidden"]}[view["total"]]
    return {"code": code_number(code), "fields": tuple(s[f] if readable else 0 for f in view["fields"]), "total": total}


def observation(view: dict[str, Any], observe: Iterable[str], s: dict[str, Any]) -> tuple[Any, ...]:
    r = response(view, s)
    return tuple((p, r[p]) for p in PARTS if p in set(observe))


def related(release: Iterable[str], a: dict[str, Any], b: dict[str, Any]) -> bool:
    released = set(release)
    if any(a[k] != b[k] for k in ("own", "shared", "visible")):
        return False
    if a["own"] and any(a[k] != b[k] for k in ("exists", *FIELDS)):
        return False
    if a["shared"] and any(a[k] != b[k] for k in ("exists", *sorted(released))):
        return False
    return True


def slice_states() -> list[dict[str, Any]]:
    domains = [((False, True) if kind is bool else (0, 1)) for _, kind in STATE]
    return [dict(zip((n for n, _ in STATE), values)) for values in itertools.product(*domains)]


SLICE_BOUND = "every state with Booleans and integers in {0, 1}: 256 states, 65,536 pairs"  # [D]


def find_pair(view: dict[str, Any], observe: Iterable[str], release: Iterable[str]) -> tuple[dict[str, Any], dict[str, Any]] | None:
    observe, release = list(observe), list(release)
    states = slice_states()
    for a in states:
        oa = observation(view, observe, a)
        for b in states:
            if related(release, a, b) and observation(view, observe, b) != oa:
                return a, b
    return None


def decode_pair(text: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
    import z3

    solver = z3.Solver()
    solver.set("rlimit", RLIMIT)
    solver.from_string(text.rsplit("(check-sat)", 1)[0])
    if solver.check() != z3.sat:
        return None
    m = solver.model()
    sides = []
    for side in ("L", "R"):
        state: dict[str, Any] = {}
        for name, kind in STATE:
            sym = z3.Bool(f"{name}_{side}") if kind is bool else z3.Int(f"{name}_{side}")
            value = m.eval(sym, model_completion=True)
            state[name] = z3.is_true(value) if kind is bool else value.as_long()
        sides.append(state)
    return sides[0], sides[1]


def show_state(s: dict[str, Any]) -> str:
    return ", ".join(f"{k}={'yes' if v is True else 'no' if v is False else v}" for k, v in s.items())


# ===================================================================================== LAB-7.c5
def _observer(ctx: CheckContext) -> tuple[list[str], list[str]]:
    import yaml

    text = ctx.statement("claims/observer.yaml", "yaml")
    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as error:
        raise InputRefused(f"claims/observer.yaml is not YAML: {str(error).splitlines()[0]}") from error
    observe, release = list(data.get("observe") or []), list(data.get("release") or [])
    bad = [p for p in observe if p not in PARTS] + [f for f in release if f not in FIELDS]
    if bad:
        raise InputRefused(f"claims/observer.yaml names {', '.join(map(str, bad))}, which the view slice does not have")
    return [str(p) for p in observe], [str(f) for f in release]


def _variants(rng: Any) -> list[tuple[str, dict[str, Any]]]:
    fixed = {"missing": "not_found", "denied": "not_found", "fields": ["title", "body"], "total": "none"}
    leak = rng.choice([bits for bits in itertools.product((False, True), repeat=3) if len(set(bits)) == 2])  # at least one leak, at least one cure
    field = dict(fixed, name="variant-field", fields=["title", "body", "internal_notes"] if leak[0] else ["title"])
    count = dict(fixed, name="variant-count", total="all" if leak[1] else "visible")
    error = dict(fixed, name="variant-error", denied="forbidden" if leak[2] else "not_found")
    return [("a field leak" if leak[0] else "a field view, cured", field), ("a count field" if leak[1] else "a count, after the filter", count), ("an error branch" if leak[2] else "one refusal for both", error)]


def c5(ctx: CheckContext) -> CheckResult:
    observe, release = _observer(ctx)
    if "code" not in observe or "fields" not in observe:
        return CheckResult(False, f"claims/observer.yaml observes {', '.join(observe) or 'nothing'}: the observer of CL-7.3 is the response body, error codes included (code and fields)", "spec")
    if sorted(release) != ["body", "title"]:
        return CheckResult(False, f"claims/observer.yaml releases {', '.join(release) or 'nothing'}: the share releases a document's title and body (S7.L7), so the release list is [title, body]", "spec")
    view = read_view(ctx.text(f"{LAB_DIR}/views/open.view"))
    if "internal_notes" not in view["fields"]:
        return CheckResult(False, "views/open.view does not return internal_notes yet: make the deliberate bug on purpose by removing the # in front of its last line", "spec")
    binary, errors = _cargo_build(ctx, "checker", "lab7-checker", "c5-cargo")
    if binary is None:
        return CheckResult(False, "your checker does not build: " + (errors[0] if errors else ""), "implementation", tuple(errors[1:4]))
    observer_hash = _statement_hash(ctx, "claims/observer.yaml")
    fixed = dict(view, fields=[f for f in view["fields"] if f != "internal_notes"])
    cases = [("the deliberate bug", dict(view, name="open-bug")), ("the fixed view", dict(fixed, name="open-fixed")), *_variants(ctx.rng)]
    z3s = ctx.z3()
    bin_hash = _sha(binary.read_bytes())
    problems: list[str] = []
    witness: Any = None
    for label, case in cases:
        view_file = _workfile(ctx, f"c5-{case['name']}.view", write_view(case))
        expected = find_pair(case, observe, release)
        query = _learner_query(ctx, binary, "product", view_file, f"c5-{case['name']}-product", bin_hash)
        if isinstance(query, str) and query.startswith("!"):
            return CheckResult(False, f"your checker failed on {label}: {query[1:]}", "implementation")
        try:
            run = z3s.run(query, step=f"c5-{case['name']}", rlimit=RLIMIT)
        except InputRefused as error:
            return CheckResult(False, f"your checker's query for {label} cannot be run as one question: {error}", "implementation")
        want = "sat" if expected else "unsat"
        ctx.note(f"{label}: your checker {run.verdict}, the reference {want}")
        if run.verdict != want:
            problems.append(f"{label}: your checker answers {run.verdict}, the reference {want}" + (f" (a pair: {show_state(expected[0])} | {show_state(expected[1])})" if expected else ""))
            continue
        if run.verdict == "sat":
            pair = decode_pair(query)
            if pair is None:
                problems.append(f"{label}: the model does not decode into two states named <symbol>_L and <symbol>_R")
                continue
            a, b = pair
            if not related(release, a, b):
                problems.append(f"{label}: the decoded pair is not related under your relation with release {release}: {show_state(a)} | {show_state(b)}")
            elif observation(case, observe, a) == observation(case, observe, b):
                problems.append(f"{label}: the decoded pair looks the same to the observer, so it is no leak: {show_state(a)} | {show_state(b)}")
            else:
                ctx.note(f"  pair, replayed: execution 1 {show_state(a)}; execution 2 {show_state(b)}")
                if witness is None:
                    witness = {"view": case["name"], "execution1": a, "execution2": b}
        if case["name"] == "open-fixed" and run.verdict == "unsat":
            pq = _learner_query(ctx, binary, "premise", view_file, "c5-open-fixed-premise", bin_hash)
            if pq.startswith("!"):
                return CheckResult(False, f"your checker's premise failed: {pq[1:]}", "implementation")
            prun = z3s.run(pq, step="c5-premise", rlimit=RLIMIT)
            ctx.note(f"premise witness on the fixed view: {prun.verdict}")
            if prun.verdict != "sat":
                problems.append(f"the premise witness is {prun.verdict}: your relation leaves no secret free to vary, so the unsat says nothing (dp:A12)")
            else:
                pair = decode_pair(pq)
                if pair is None or not related(release, *pair) or all(pair[0][k] == pair[1][k] for k in ("internal_notes", "hidden", "exists")):
                    problems.append("the premise witness does not replay as a related pair whose secret differs")
            z3s.headline(run)
    ctx.tcb(f"your checker, labs/LAB-7/checker (binary sha256 {bin_hash[:12]}...), and Z3 5.3.1", "tested")
    ctx.tcb("the paired-state reference over the view slice (INS-pairs' rules), " + SLICE_BOUND, "tested")
    ctx.tcb("[A] the observer is the response body, error codes included (SEAM-10)", "trusted")
    block = _extra(ctx, "pairs")
    block.section = {"witnessSha256": _sha(_canon(witness)), "relationSha256": _sha(_canon({"release": sorted(release)})), "observerSha256": observer_hash, "bound": "Z3 over all integers; the reference by enumeration over " + SLICE_BOUND}
    ctx.note("your checker as wasm on fresh seeds is graded in the tab (Lane A), not here")
    if problems:
        return CheckResult(False, problems[0], "implementation", tuple(problems[1:]))
    ctx.claim("CL-7.3")
    return CheckResult(True, f"your checker finds the planted leak and the pair replays; the fixed view is unsat with the premise witness sat; on 3 seeded variants its verdicts equal the reference's (release {release})")


def _learner_query(ctx: CheckContext, binary: Path, mode: str, view_file: Path, step: str, bin_hash: str) -> str:
    shown = [_rel(ctx, binary), mode, _rel(ctx, view_file), "claims/observer.yaml"]
    done = _proc(ctx, [str(binary), *shown[1:]], timeout=60)
    text = done.output
    if done.returncode != 0:
        _record(ctx, step=step, engine="lab7-checker", version=f"sha256 {bin_hash[:12]}", argv=shown, input_sha256=_sha(view_file.read_bytes()), verdict_lines=[ln for ln in text.splitlines() if ln.strip()][:3], verdict="failed", exit_code=done.returncode if done.returncode is not None else -1, ms=done.ms)
        return "!" + (text.strip().splitlines() or [f"exit {done.returncode}"])[-1]
    _record(ctx, step=step, engine="lab7-checker", version=f"sha256 {bin_hash[:12]}", argv=shown, input_sha256=_sha(view_file.read_bytes()), verdict_lines=[f"query sha256 {_sha(text.encode())}"], verdict="passed", exit_code=0, ms=done.ms)
    return text


# ===================================================================================== the S7 interpreter (traces for LAB-7.6)
class Interp:
    """The S7 commands over a world, with each observer's delivered log. Single-copy by default; with
    `lag` > 0, `Open` checks the ACL on a replica that sees the shares and revocations `lag` steps late and
    reads the content from the primary (S7.L8's replicated model)."""

    def __init__(self, world: World, lag: int = 0) -> None:
        self.world = {k: set(v) for k, v in world.items()}
        self.version = {d: 1 for d in world_docs(world)}
        self.delivered: dict[str, list[str]] = {u: [] for u in world_users(world)}
        self.lag = lag
        self.history: list[tuple[set[tuple[str, ...]], set[tuple[str, ...]]]] = []
        self.rows: list[list[str]] = []

    def acl(self) -> tuple[set[tuple[str, ...]], set[tuple[str, ...]]]:
        return set(self.world["share_user"]), set(self.world["revoked"])

    def canread(self, u: str, d: str, acl: tuple[set[tuple[str, ...]], set[tuple[str, ...]]] | None = None) -> bool:
        w = self.world if acl is None else dict(self.world, share_user=acl[0], revoked=acl[1])
        return (u, d) in reference_canread(w)

    def editors(self, d: str) -> list[str]:
        owner = next(t for t, x in self.world["owns"] if x == d)
        return sorted(u for u, t, r in self.world["member"] if t == owner and r != "viewer")

    def step(self, kind: str, by: str, user: str, doc: str) -> None:
        self.history.append(self.acl())
        ok, page = "-", "-"
        if kind == "Share":
            self.world["share_user"].add((doc, user))
            self.world["revoked"].discard((doc, user))
        elif kind == "Revoke":
            if (doc, user) in self.world["share_user"]:
                self.world["revoked"].add((doc, user))
        elif kind == "Edit":
            self.version[doc] += 1
        elif kind == "Open":
            acl = self.history[max(0, len(self.history) - 1 - self.lag)] if self.lag else None
            if self.canread(user, doc, acl):
                ok, page = "yes", f"{doc}@{self.version[doc]}"
                self.delivered[user].append(page)
            else:
                ok = "no"
        subject = user if kind != "Edit" else "-"
        allowed = self.canread(user, doc) if subject != "-" else False
        log = self.delivered.get(user, []) if subject != "-" else []
        self.rows.append([str(len(self.rows) + 1), kind, by, subject, doc, ok, page, "yes" if allowed else "no", ",".join(log) or "-"])

    def text(self) -> str:
        return "i\tkind\tby\tuser\tdoc\tok\tpage\tcanread\tdelivered\n" + "".join("\t".join(r) + "\n" for r in self.rows)


def revocation_trace() -> Interp:
    """S7.L8 cell 1: Share(contract to dana), Open(dana, contract), Revoke(dana, contract), Open(dana, contract)."""
    it = Interp(w0())
    it.step("Share", "gia", "dana", "contract")
    it.step("Open", "dana", "dana", "contract")
    it.step("Revoke", "gia", "dana", "contract")
    it.step("Open", "dana", "dana", "contract")
    return it


def new_enemy_trace(lag: int = 2) -> Interp:
    """S7.L8 cell 2: gia revokes dana, gia edits contract's body, dana opens contract through a lagging ACL."""
    it = Interp(w0(), lag=lag)
    it.step("Revoke", "gia", "dana", "contract")
    it.step("Edit", "gia", "-", "contract")
    it.step("Open", "dana", "dana", "contract")
    return it


def random_trace(rng: Any) -> Interp:
    it = Interp(w0())
    users, docs = world_users(it.world), world_docs(it.world)
    for _ in range(rng.randint(3, 8)):
        kind = rng.choice(("Share", "Revoke", "Edit", "Open", "Open"))
        d = rng.choice(docs)
        eds = it.editors(d)
        if kind in ("Share", "Revoke", "Edit") and not eds:
            kind = "Open"
        if kind == "Open":
            u = rng.choice(users)
            it.step("Open", u, u, d)
        elif kind == "Edit":
            it.step("Edit", rng.choice(eds), "-", d)
        else:
            it.step(kind, rng.choice(eds), rng.choice(users), d)
    return it


def faulty_trace(rng: Any) -> str:
    """A seeded faulty trace: an interpreter trace with one injected successful read that the state does not
    allow (so a monitor that accepts everything is caught)."""
    it = random_trace(rng)
    w = it.world
    denied = [(u, d) for u in world_users(w) for d in world_docs(w) if (u, d) not in reference_canread(w)]
    u, d = rng.choice(denied)
    log = it.delivered[u] + [f"{d}@{it.version[d]}"]
    it.rows.append([str(len(it.rows) + 1), "Open", u, u, d, "yes", f"{d}@{it.version[d]}", "no", ",".join(log)])
    return it.text()


def s_new(text: str) -> bool:
    rows = [ln.split("\t") for ln in text.splitlines()[1:] if ln]
    return all(not (r[1] == "Open" and r[5] == "yes" and r[7] != "yes") for r in rows)


def s_past(text: str) -> bool:
    rows = [ln.split("\t") for ln in text.splitlines()[1:] if ln]
    return all(not (r[1] == "Revoke" and any(p.startswith(r[4] + "@") for p in r[8].split(",") if p != "-")) for r in rows)


# ===================================================================================== LAB-7.c6
def c6(ctx: CheckContext) -> CheckResult:
    _pinned(ctx, REVOCATION_STATEMENT, "yaml", REVOCATION_STATEMENT_HASH)
    binary, errors = _cargo_build(ctx, "monitors", "lab7-monitors", "c6-cargo")
    if binary is None:
        return CheckResult(False, "your monitors do not build: " + (errors[0] if errors else ""), "implementation", tuple(errors[1:4]))
    traces: list[tuple[str, str, str]] = []  # (kind, file, text)
    seeds = [ctx.rng.randrange(2**31) for _ in range(C6_TRACES)]
    import random

    for k, seed in enumerate(seeds, 1):
        traces.append(("single-copy", f"c6-trace-{k}.tsv", random_trace(random.Random(seed)).text()))
    traces.append(("revocation", "c6-revocation.tsv", revocation_trace().text()))
    for k in range(3):
        traces.append(("faulty", f"c6-faulty-{k + 1}.tsv", faulty_trace(random.Random(ctx.rng.randrange(2**31)))))
    traces.append(("replicated", "c6-new-enemy.tsv", new_enemy_trace().text()))
    paths = [_workfile(ctx, name, text) for _, name, text in traces]
    bin_hash = _sha(binary.read_bytes())
    verdicts: dict[str, dict[str, bool]] = {}
    for monitor in ("s-new", "s-past"):
        shown = [_rel(ctx, binary), monitor, *(_rel(ctx, p) for p in paths)]
        done = _proc(ctx, [str(binary), *shown[1:]], timeout=120)
        lines = [ln for ln in done.output.splitlines() if ln.strip()]
        found: dict[str, bool] = {}
        for ln in lines:
            parts = ln.split("\t")
            if len(parts) >= 2 and parts[1] in ("accept", "reject"):
                found[Path(parts[0]).name] = parts[1] == "accept"
        summary = [f"{sum(found.values())} accepted, {len(found) - sum(found.values())} rejected of {len(paths)} traces"]
        _record(ctx, step=f"c6-{monitor}", engine="lab7-monitors", version=f"sha256 {bin_hash[:12]}", argv=shown[:2] + [f"<{len(paths)} traces in {_rel(ctx, ctx.workdir)}>"], input_sha256=_sha("".join(t for _, _, t in traces).encode()), verdict_lines=summary, verdict="passed" if done.returncode == 0 and len(found) == len(paths) else "failed", exit_code=done.returncode if done.returncode is not None else -1, ms=done.ms, budget={"seed": ctx.seed})
        (ctx.workdir / f"c6-{monitor}.out").write_bytes(done.output.encode("utf-8"))
        if done.returncode != 0 or len(found) != len(paths):
            return CheckResult(False, f"your {monitor} monitor did not give a verdict on every trace (exit {done.returncode})", "implementation", tuple(lines[-3:]))
        verdicts[monitor] = found
    single = [(n, t) for kind, n, t in traces if kind == "single-copy"]
    max_len = max(len(t.splitlines()) - 1 for _, t in single)
    problems: list[str] = []
    for kind, name, text in traces:
        new_ok, past_ok = verdicts["s-new"][name], verdicts["s-past"][name]
        if kind in ("single-copy", "revocation") and not new_ok:
            problems.append(f"S-new rejects {name}, a single-copy interpreter trace on which it holds")
        if kind == "faulty" and new_ok:
            problems.append(f"S-new accepts {name}, whose last step is a successful read the state does not allow")
        if past_ok != s_past(text):
            problems.append(f"S-past {'accepts' if past_ok else 'rejects'} {name}; the reference {'accepts' if s_past(text) else 'rejects'} it")
    rev = revocation_trace()
    page = rev.rows[1][6]
    ctx.note(f"S-new accepted {sum(verdicts['s-new'][n] for n, _ in single)} of {len(single)} fresh single-copy traces (max length {max_len}): [T] · {len(single)} traces")
    ctx.note(f"the interpreter replays {traces[len(single)][1]}: {page} delivered at step 2, Revoke at step 3, and dana's log after it still holds {rev.rows[2][8]}")
    replicated = verdicts["s-new"]["c6-new-enemy.tsv"]
    ctx.note(f"optional: S-new on the replicated model's new-enemy trace: {'accepted' if replicated else 'rejected, a re-find of SP-7.6'}")
    block = _extra(ctx, "traces")
    block.section = {
        "n": sum(verdicts["s-new"][n] for n, _ in single),
        "seedListSha256": _sha(_canon(seeds)),
        "verdicts": [{"trace": f"{_rel(ctx, ctx.workdir)}/{n}", "verdict": "accepted" if verdicts["s-new"][n] else "rejected"} for _, n, _ in traces],
    }
    ctx.tcb("the S7 interpreter of statespace check lab7.6 (single-copy and replicated models)", "tested")
    ctx.tcb(f"your monitors, labs/LAB-7/monitors (binary sha256 {bin_hash[:12]}...)", "tested")
    if problems:
        return CheckResult(False, problems[0], "implementation", tuple(problems[1:4]))
    if verdicts["s-past"]["c6-revocation.tsv"]:
        return CheckResult(False, "S-past accepts the revocation trace, which the interpreter replays as a refutation", "implementation")
    return CheckResult(True, f"S-new accepts all {len(single)} fresh single-copy traces (max length {max_len}) and rejects the 3 seeded faulty ones; S-past is refuted by the replayed revocation trace and agrees with the reference on every trace")


# ===================================================================================== LAB-7.c7
CARDS = {"CL-7.1": ("claims/cl-7-1.yaml", "LAB-7.2"), "CL-7.2": ("claims/cl-7-2.yaml", "LAB-7.3"), "CL-7.3": ("claims/cl-7-3.yaml", "LAB-7.5"), "CL-7.4": ("claims/cl-7-4.yaml", "LAB-7.4")}
PLACEHOLDERS = ("write it in your words", "write the counterexample here", "write how the claim was established")


def _latest_receipt(ctx: CheckContext, stage: str) -> tuple[str, dict[str, Any]] | None:
    directory = ctx.path(f"receipts/{stage}")
    files = sorted(directory.glob("*.json")) if directory.is_dir() else []
    for path in reversed(files):
        try:
            return _rel(ctx, path), json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
    return None


def _card_problems(ctx: CheckContext, template: str, path: str, stage: str) -> list[str]:
    import yaml

    from statespace.schema.validation import validate

    if not ctx.path(path).is_file():
        return [f"{path} is missing"]
    text = ctx.statement(path, "yaml")
    try:
        card = yaml.safe_load(text)
    except yaml.YAMLError as error:
        return [f"{path} is not YAML: {str(error).splitlines()[0]}"]
    issues = validate("claim", card)
    if issues:
        return [f"{path} does not validate against claim@1: {issues[0]}"]
    out: list[str] = []
    if card.get("template") != template:
        out.append(f"{path} instantiates {card.get('template')}, not {template}")
    flat = json.dumps(card)
    if any(p in flat for p in PLACEHOLDERS):
        out.append(f"{path} still holds a placeholder: write each field in your words")
    method = card.get("method") or {}
    receipt_path = method.get("receipt")
    if not receipt_path:
        return [*out, f"{path}: method names no receipt (receipts/{stage}/<file>.json)"]
    if not str(receipt_path).startswith(f"receipts/{stage}/") or not ctx.path(str(receipt_path)).is_file():
        return [*out, f"{path}: method.receipt {receipt_path} is not a {stage} receipt in your repository"]
    receipt = json.loads(ctx.path(str(receipt_path)).read_text(encoding="utf-8"))
    if not all(c.get("pass") for c in receipt.get("checks", [])) or template not in {c.get("template") for c in receipt.get("claims", [])}:
        out.append(f"{path}: {receipt_path} did not pass, or does not mint {template}")
    tool, version = method.get("tool"), method.get("version")
    if not tool or not version:
        out.append(f"{path}: method.tool and method.version come from the receipt")
    else:
        offered = {(t.get("name"), t.get("version")) for t in receipt.get("tools", [])} | {(r.get("engine"), r.get("version")) for r in receipt.get("runs", [])}
        if not any((name == tool or str(name).startswith(f"{tool}-")) and v == version for name, v in offered):
            out.append(f"{path}: method says {tool} {version}, which {receipt_path} does not name")
    statement = (card.get("statement") or {}).get("path")
    if statement:
        pinned = {s.get("path"): s.get("sha256") for s in receipt.get("statements", [])}
        if statement not in pinned:
            out.append(f"{path}: {receipt_path} pins no statement {statement}")
        elif ctx.path(statement).is_file() and _statement_hash(ctx, statement) != pinned[statement]:
            out.append(f"{path}: {statement} changed after {receipt_path}, so the claim voids to [?]")
    weak = (card.get("if_weakened") or {})
    if not (weak.get("text") or weak.get("specimen")):
        out.append(f"{path}: the if-weakened counterexample is empty")
    return out


def c7(ctx: CheckContext) -> CheckResult:
    import yaml

    text = ctx.statement("claims/declassify.yaml", "yaml")
    try:
        record = yaml.safe_load(text) or {}
    except yaml.YAMLError as error:
        raise InputRefused(f"claims/declassify.yaml is not YAML: {str(error).splitlines()[0]}") from error
    problems: list[str] = []
    entries = record.get("releases") or []
    if not entries:
        problems.append("claims/declassify.yaml releases nothing yet: one entry per release, with what, to, who, where, when and requirement")
    what: set[str] = set()
    for n, entry in enumerate(entries, 1):
        missing = [k for k in ("what", "to", "who", "where", "when", "requirement") if not str((entry or {}).get(k) or "").strip()]
        if missing:
            problems.append(f"release {n} has no {', '.join(missing)}")
            continue
        fields = set(re.findall(r"documents\.([a-z_]+)", str(entry["what"])))
        if not fields:
            problems.append(f"release {n}: what names no state projection (documents.<field>)")
        what |= fields
    kept = " ".join(str(k) for k in (record.get("kept") or [])) + " " + " ".join(json.dumps(e) for e in entries)
    if "slug" not in kept:
        problems.append("claims/declassify.yaml does not account for the globally unique slug of S7.L4: release it in an entry, or keep it as an [N] line in `kept`")
    previous = _latest_receipt(ctx, "LAB-7.5")
    observe, release = _observer(ctx)
    if previous is None:
        problems.append("there is no LAB-7.5 receipt yet: run statespace check lab7.5 first, so the release list is pinned")
    else:
        rpath, receipt = previous
        pinned = {s.get("path"): s.get("sha256") for s in receipt.get("statements", [])}.get("claims/observer.yaml")
        if pinned != _statement_hash(ctx, "claims/observer.yaml"):
            problems.append(f"claims/observer.yaml changed after {rpath}: the release list there is not the one that receipt hashed")
        if what and what != set(release):
            problems.append(f"the record releases {', '.join(sorted(what))}; the release list of {rpath} is {', '.join(sorted(release))}")
    pairs = []
    for side in ("broken", "fixed"):
        path = f"{LAB_DIR}/{side}/open.view"
        if not ctx.path(path).is_file():
            problems.append(f"{path} is missing: keep the leaky view in broken/ beside its cure in fixed/")
            pairs.append(None)
            continue
        pairs.append(find_pair(read_view(ctx.text(path)), observe or ["code", "fields", "total"], release))
    if len(pairs) == 2 and ctx.path(f"{LAB_DIR}/broken/open.view").is_file() and ctx.path(f"{LAB_DIR}/fixed/open.view").is_file():
        if pairs[0] is None:
            problems.append("broken/open.view does not replay: the paired-state reference finds no leaking pair in it")
        else:
            ctx.note(f"broken/open.view replays: execution 1 {show_state(pairs[0][0])}; execution 2 {show_state(pairs[0][1])}")
        if pairs[1] is not None:
            problems.append(f"fixed/open.view still leaks: {show_state(pairs[1][0])} | {show_state(pairs[1][1])}")
    for template, (path, stage) in CARDS.items():
        problems.extend(_card_problems(ctx, template, path, stage))
    if problems:
        return CheckResult(False, problems[0], "spec", tuple(problems[1:6]))
    ctx.note("the if-weakened witnesses are checked for presence; replaying each against its card's proposition is not built yet")
    return CheckResult(True, f"the record has {len(entries)} complete {'entry' if len(entries) == 1 else 'entries'} releasing {', '.join(sorted(what))}, equal to the LAB-7.5 release list; broken/ replays beside fixed/; the four cards pass claim@1 validation against their receipts")


# ===================================================================================== the lab
LAB = Lab(
    "LAB-7",
    "authz-flow",
    stages=(
        Stage("LAB-7.1", "Run the reference policy in Soufflé and in the tab engine; compare relations", (CheckSpec("LAB-7.c1", "Both engines derive the same relation.", c1),)),
        Stage("LAB-7.2", "Your read policy, with derivations", (CheckSpec("LAB-7.c2", "Your policy equals the reference matrix, and each allowed cell has a derivation.", c2),), claims=("CL-7.1",)),
        Stage("LAB-7.3", '"No cross-tenant read" with a distinguishing request', (CheckSpec("LAB-7.c3", "Your verdicts equal the reference's, and each one carries its witnesses.", c3),), claims=("CL-7.2",)),
        Stage("LAB-7.4", "RLS policies and the SET ROLE differential on PostgreSQL", (CheckSpec("LAB-7.c4", "Row-level security matches the matrix in both connection modes.", c4),), claims=("CL-7.4",)),
        Stage("LAB-7.5", "A paired-state check through your own checker for one API view", (CheckSpec("LAB-7.c5", "Your checker finds the planted leak, and the fixed view passes modulo the release list.", c5),), claims=("CL-7.3",)),
        Stage("LAB-7.6", "Revocation stated temporally: S-new beside its refuted twin S-past", (CheckSpec("LAB-7.c6", "The first monitor holds on fresh traces, and the second is refuted by a replayed trace.", c6),)),
        Stage("LAB-7.7", "Leak fix, declassification record and claim cards", (CheckSpec("LAB-7.c7", "The record is complete, and the claim cards pass validation.", c7),)),
    ),
)

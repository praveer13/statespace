"""The reference translation validator of LAB-9.1 (curriculum S9 sections 3 and 13; reference module, earns nothing).

It checks one compiled output against its source command on every store within a stated bound, the way
S9.L2 describes: it runs the source semantics and the IR's semantics from each store, compares what a client
observes (the committed balances of the accounts the command names, or the error), and prints either

    verdict: accepted within the bound        with the bound: the accounts, the balance range, the stores
    verdict: rejected                         with a store on which the two observations differ

A rejection is a counterexample to replay, not a proof: `statespace check lab9.1` replays the store you copy
from it through its own copies of both semantics. An acceptance is about this output and this bound only.

    uv run python -I labs/LAB-9/reference/tv.py validate labs/LAB-9/reference/cases/transfer-30-1-2.tv
    uv run python -I labs/LAB-9/reference/tv.py run labs/LAB-9/reference/cases/rollback-1.ir --store a0=5,a1=0

A case file holds one `source` line and an `output` block of IR instructions, one per line, in the lessons'
syntax (`ldi r0 5`, `read r1 a1`, `add r1 r1 r0`, `sub ...`, `write a1 r1`, `writeIf r0 r1 a0 r2`,
`assertGe r0 r1 insufficient`, `abort denied`); `#` starts a comment. `maybeFail <err>` is a step that either
does nothing or aborts the run with that error, the S9.L5 variant whose target is not deterministic; the
validator then compares every outcome the output can reach.

Source commands: `skip`, `abort <err>`, `require <e> <e> <err>`, `move <e> <acct> <acct>`, `transfer <n> <acct>
<acct>` (the fragment's toy command), joined by `;`. Expressions: an integer, `bal <acct>`, `(add <e> <e>)`,
`(sub <e> <e>)`. Accounts are `a0`, `a1`, ...

Exit status: 0 accepted (validate) or ran (run), 1 rejected, 2 a file that cannot be read as a case.
"""

from __future__ import annotations

import argparse
import itertools
import re
import sys
from dataclasses import dataclass
from pathlib import Path

VERSION = "statespace-tv 1 (LAB-9 reference translation validator)"

# ----------------------------------------------------------------------------------------- the source


@dataclass(frozen=True)
class Committed:
    store: tuple[tuple[int, int], ...]  # (account, balance), sorted; every account the run touched or read


@dataclass(frozen=True)
class Aborted:
    error: str


Outcome = Committed | Aborted


def _acct(token: str) -> int:
    m = re.fullmatch(r"a([0-9]+)", token)
    if not m:
        raise ValueError(f"{token!r} is not an account such as a1")
    return int(m.group(1))


def _reg(token: str) -> int:
    m = re.fullmatch(r"r([0-9]+)", token)
    if not m:
        raise ValueError(f"{token!r} is not a register such as r0")
    return int(m.group(1))


def _tokens(text: str) -> list[str]:
    return re.findall(r"\(|\)|[^\s()]+", text)


def parse_expr(tokens: list[str]) -> tuple:
    if not tokens:
        raise ValueError("an expression is missing")
    head = tokens.pop(0)
    if head == "(":
        op = tokens.pop(0) if tokens else ""
        if op not in ("add", "sub"):
            raise ValueError(f"({op} ...) is not an expression; use (add e e) or (sub e e)")
        a = parse_expr(tokens)
        b = parse_expr(tokens)
        if not tokens or tokens.pop(0) != ")":
            raise ValueError("an expression is missing its )")
        return (op, a, b)
    if head == "bal":
        return ("bal", _acct(tokens.pop(0)))
    if re.fullmatch(r"-?[0-9]+", head):
        return ("lit", int(head))
    raise ValueError(f"{head!r} does not start an expression")


def parse_source(text: str) -> list[tuple]:
    """A source command as a list of commands run in sequence."""
    out: list[tuple] = []
    for part in [p.strip() for p in text.split(";") if p.strip()]:
        toks = _tokens(part)
        word = toks.pop(0)
        if word == "skip":
            out.append(("skip",))
        elif word == "abort":
            out.append(("abort", toks.pop(0)))
        elif word == "require":
            e1 = parse_expr(toks)
            e2 = parse_expr(toks)
            out.append(("require", e1, e2, toks.pop(0)))
        elif word == "move":
            e = parse_expr(toks)
            out.append(("move", e, _acct(toks.pop(0)), _acct(toks.pop(0))))
        elif word == "transfer":
            amt = int(toks.pop(0))
            src, dst = _acct(toks.pop(0)), _acct(toks.pop(0))
            out += [("require", ("lit", amt), ("lit", 1), "nonPositive"), ("require", ("bal", src), ("lit", amt), "insufficient"), ("move", ("lit", amt), src, dst)]
        else:
            raise ValueError(f"{word!r} is not a source command")
        if toks:
            raise ValueError(f"unexpected {' '.join(toks)!r} after a command")
    return out


def eval_expr(e: tuple, s: dict[int, int]) -> int:
    tag = e[0]
    if tag == "lit":
        return e[1]
    if tag == "bal":
        return s.get(e[1], 0)
    a, b = eval_expr(e[1], s), eval_expr(e[2], s)
    return a + b if tag == "add" else a - b


def run_source(cmds: list[tuple], store: dict[int, int]) -> Outcome:
    s = dict(store)
    for c in cmds:
        tag = c[0]
        if tag == "skip":
            continue
        if tag == "abort":
            return Aborted(c[1])
        if tag == "require":
            if not eval_expr(c[2], s) <= eval_expr(c[1], s):
                return Aborted(c[3])
            continue
        if tag == "move":
            v = eval_expr(c[1], s)  # evaluated once, in the starting store
            src, dst = c[2], c[3]
            s[src] = s.get(src, 0) - v
            s[dst] = s.get(dst, 0) + v  # the credit reads the debited store
    return Committed(tuple(sorted(s.items())))


# -------------------------------------------------------------------------------------------- the IR


def parse_ir(lines: list[str]) -> list[tuple]:
    prog: list[tuple] = []
    for raw in lines:
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        t = line.split()
        op = t[0]
        try:
            if op == "ldi" and len(t) == 3:
                prog.append(("ldi", _reg(t[1]), int(t[2])))
            elif op == "read" and len(t) == 3:
                prog.append(("read", _reg(t[1]), _acct(t[2])))
            elif op in ("add", "sub") and len(t) == 4:
                prog.append((op, _reg(t[1]), _reg(t[2]), _reg(t[3])))
            elif op == "write" and len(t) == 3:
                prog.append(("write", _acct(t[1]), _reg(t[2])))
            elif op == "writeIf" and len(t) == 5:
                prog.append(("writeIf", _reg(t[1]), _reg(t[2]), _acct(t[3]), _reg(t[4])))
            elif op == "assertGe" and len(t) == 4:
                prog.append(("assertGe", _reg(t[1]), _reg(t[2]), t[3]))
            elif op == "abort" and len(t) == 2:
                prog.append(("abort", t[1]))
            elif op == "maybeFail" and len(t) == 2:
                prog.append(("maybeFail", t[1]))
            else:
                raise ValueError(f"{line!r} is not an IR instruction")
        except (ValueError, IndexError) as error:
            raise ValueError(f"{line!r}: {error}") from None
    return prog


def run_ir(prog: list[tuple], store: dict[int, int]) -> list[tuple[Outcome, int]]:
    """Every outcome the program can reach from `store`, each with the number of steps it took. An abort
    discards every write of the run, as a ROLLBACK does."""
    results: list[tuple[Outcome, int]] = []

    def go(pc: int, regs: dict[int, int], st: dict[int, int], steps: int) -> None:
        while pc < len(prog):
            i = prog[pc]
            tag = i[0]
            steps += 1
            if tag == "ldi":
                regs = {**regs, i[1]: i[2]}
            elif tag == "read":
                regs = {**regs, i[1]: st.get(i[2], 0)}
            elif tag in ("add", "sub"):
                x, y = regs.get(i[2], 0), regs.get(i[3], 0)
                regs = {**regs, i[1]: x + y if tag == "add" else x - y}
            elif tag == "write":
                st = {**st, i[1]: regs.get(i[2], 0)}
            elif tag == "writeIf":
                if regs.get(i[2], 0) <= regs.get(i[1], 0):
                    st = {**st, i[3]: regs.get(i[4], 0)}
            elif tag == "assertGe":
                if not regs.get(i[2], 0) <= regs.get(i[1], 0):
                    results.append((Aborted(i[3]), steps))
                    return
            elif tag == "abort":
                results.append((Aborted(i[1]), steps))
                return
            elif tag == "maybeFail":
                results.append((Aborted(i[1]), steps))  # the branch that fails
            pc += 1
        results.append((Committed(tuple(sorted(st.items()))), steps))

    go(0, {}, dict(store), 0)
    return results


# ------------------------------------------------------------------------------------------ observing


def observe(o: Outcome, accounts: list[int]) -> tuple:
    """The outcome observer: the committed balances of the named accounts, or the error."""
    if isinstance(o, Aborted):
        return ("aborted", o.error)
    s = dict(o.store)
    return ("committed", tuple(s.get(a, 0) for a in accounts))


def show(o: Outcome, accounts: list[int]) -> str:
    names = ", ".join(f"a{a}" for a in accounts)
    if isinstance(o, Aborted):
        return f"aborted {o.error}"
    s = dict(o.store)
    return f"committed ({names}) = ({', '.join(str(s.get(a, 0)) for a in accounts)})"


def store_text(store: dict[int, int], accounts: list[int]) -> str:
    return f"store ({', '.join(f'a{a}' for a in accounts)}) = ({', '.join(str(store.get(a, 0)) for a in accounts)})"


def mentioned(cmds: list[tuple], prog: list[tuple]) -> list[int]:
    found: set[int] = set()

    def walk(x: object) -> None:
        if isinstance(x, tuple):
            if len(x) == 2 and x[0] == "bal":
                found.add(x[1])
            for y in x:
                walk(y)

    for c in cmds:
        walk(c)
        if c[0] == "move":
            found.update((c[2], c[3]))
    for i in prog:
        if i[0] in ("read",):
            found.add(i[2])
        elif i[0] == "write":
            found.add(i[1])
        elif i[0] == "writeIf":
            found.add(i[3])
    return sorted(found)


def literals(cmds: list[tuple], prog: list[tuple]) -> list[int]:
    out: list[int] = []

    def walk(x: object) -> None:
        if isinstance(x, tuple):
            if len(x) == 2 and x[0] == "lit":
                out.append(abs(x[1]))
            for y in x:
                walk(y)

    for c in cmds:
        walk(c)
    out += [abs(i[2]) for i in prog if i[0] == "ldi"]
    return out


@dataclass
class Case:
    source_text: str
    cmds: list[tuple]
    prog: list[tuple]


def read_case(path: Path) -> Case:
    lines = path.read_text(encoding="utf-8").splitlines()
    source = None
    body: list[str] = []
    in_output = False
    for raw in lines:
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        if in_output:
            body.append(line)
        elif line.startswith("source "):
            source = line[len("source "):].strip()
        elif line.strip() == "output":
            in_output = True
        else:
            raise ValueError(f"{raw.strip()!r}: a case file holds a `source` line, then `output` and its instructions")
    if source is None or not in_output:
        raise ValueError("a case file needs a `source` line and an `output` block")
    return Case(source, parse_source(source), parse_ir(body))


def validate(case: Case, hi: int | None = None) -> tuple[bool, list[str]]:
    accounts = mentioned(case.cmds, case.prog)
    hi = hi if hi is not None else max([10] + [2 * v for v in literals(case.cmds, case.prog)])
    out = [f"validate {case.source_text}"]
    n = 0
    witness = None
    for balances in itertools.product(range(0, hi + 1), repeat=len(accounts)):
        store = dict(zip(accounts, balances))
        n += 1
        source = run_source(case.cmds, store)
        reached = run_ir(case.prog, store)
        want = observe(source, accounts)
        got = {observe(o, accounts) for o, _ in reached}
        if got != {want} and witness is None:
            witness = (store, source, reached)
    out.append(f"bound: accounts {', '.join(f'a{a}' for a in accounts)}; balances 0..{hi}; {n} stores enumerated")
    if witness is None:
        out.append("verdict: accepted within the bound")
        return True, out
    store, source, reached = witness
    out.append("verdict: rejected")
    out.append(f"counterexample: {store_text(store, accounts)}")
    out.append(f"  source: {show(source, accounts)}")
    for o, steps in reached:
        mark = "" if observe(o, accounts) == observe(source, accounts) else "   <- no source behavior"
        out.append(f"  output: {show(o, accounts)} ({steps} steps){mark}")
    if len(reached) > 1:
        forward = any(observe(o, accounts) == observe(source, accounts) for o, _ in reached)
        out.append(f"  forward: {'every source outcome is reached by the output' if forward else 'the source outcome is not reached'}; backward: the output reaches an outcome the source lacks")
    return False, out


def parse_store(text: str) -> dict[int, int]:
    store: dict[int, int] = {}
    for part in [p for p in text.split(",") if p.strip()]:
        name, _, value = part.partition("=")
        store[_acct(name.strip())] = int(value)
    return store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tv.py", description="The LAB-9 reference translation validator (reference module, earns nothing).")
    sub = parser.add_subparsers(dest="command", required=True)
    v = sub.add_parser("validate", help="check one compiled output against its source on every store in the bound")
    v.add_argument("case")
    v.add_argument("--max-balance", type=int, default=None, help="the top of the balance range (default: twice the largest literal, at least 10)")
    r = sub.add_parser("run", help="run an IR program from one store and print every outcome it can reach")
    r.add_argument("program", help="an IR program, or a case file, whose output block is run")
    r.add_argument("--store", required=True, help="such as a0=5,a1=0")
    args = parser.parse_args(argv)
    print(VERSION)
    try:
        if args.command == "validate":
            ok, lines = validate(read_case(Path(args.case)), args.max_balance)
            print("\n".join(lines))
            return 0 if ok else 1
        text = Path(args.program).read_text(encoding="utf-8")
        prog = read_case(Path(args.program)).prog if re.search(r"^\s*output\s*$", text, re.M) else parse_ir(text.splitlines())
        store = parse_store(args.store)
        accounts = sorted(set(store) | set(mentioned([], prog)))
        print(f"run {Path(args.program).name} from {store_text(store, accounts)}")
        for o, steps in run_ir(prog, store):
            view = f"aborted {o.error}; balances ({', '.join(str(store.get(a, 0)) for a in accounts)})" if isinstance(o, Aborted) else show(o, accounts)
            print(f"outcome: {view} ({steps} steps)")
        return 0
    except (OSError, ValueError) as error:
        print(f"tv.py: {error}")
        return 2


if __name__ == "__main__":
    sys.exit(main())

"""`statespace sim <seed>`: run an outbox simulator under a seeded fault schedule and write its NDJSON trace.

W5-T15 (INS-sim on the Bench). Two simulators:

- `--reference`: the course's reference machine in the course's harness, both here. Reference module, earns
  nothing (labs/README.md section 2). LAB-8.1 runs it on seed 1 and validates the trace it writes. Its defaults
  are LAB-8.1's: one command and no faults, so seed 1's trace is the fault-free log of S8.L6.
- without it: your machine, the crate in labs/LAB-8/sim/, built and run with cargo (`outbox-sim trace`).

The harness here is a port of labs/LAB-8/sim/src/world.rs: the same world, the same SplitMix64 stream, the same
order of events, the same trace@1 lines (bench/statespace/trace.py), so the reference machine run here and the
same machine run in the Rust harness write the same bytes. A run is a function of the machine and the seed:
every choice comes from the seeded stream. `--planted-unseeded` is the planted variant of S8.L6: its fault plan
draws from the host's random source instead, so two runs of one seed can differ, and the first differing line
is where to look.

    statespace sim 1 --reference --out labs/LAB-8/traces/seed-1.ndjson
    statespace sim 7 --reference --rate 150 --commands 2
    statespace sim 7 --out labs/LAB-8/traces/seed-7.ndjson        your machine, through cargo
"""

from __future__ import annotations

import argparse
import hashlib
import random
import shutil
import subprocess
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

__all__ = ["Config", "Outcome", "ReferenceMachine", "Rng", "main", "run", "sha256_hex"]

MASK = (1 << 64) - 1
PENDING, INFLIGHT, ACKED = "pending", "inflight", "acked"


class Rng:
    """SplitMix64, as world.rs has it."""

    def __init__(self, seed: int) -> None:
        self.state = seed & MASK

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & MASK
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK
        return z ^ (z >> 31)

    def below(self, n: int) -> int:
        assert n > 0
        return self.next_u64() % n


class HostRng(Rng):
    """The planted variant's source: the host's, which the seed does not control."""

    def __init__(self, seed: int) -> None:
        super().__init__(seed)
        self.host = random.SystemRandom()

    def below(self, n: int) -> int:
        return self.host.randrange(n)


# ------------------------------------------------------------------------------------------ the reference
def reference_choose(rng: Rng, normal: int, faults: int, rate: int) -> tuple[str, int]:
    """The reference fault plan: a fault with probability rate/1000 when one is enabled, else a normal event."""
    if faults > 0 and (normal == 0 or rng.below(1000) < rate):
        return ("fault", rng.below(faults))
    if normal == 0:
        return ("normal", 0)
    return ("normal", rng.below(normal))


@dataclass
class _Intent:
    key: tuple[str, int]
    att: int
    stored: bool
    acked: bool


class ReferenceMachine:
    """The reference sans-I/O worker. Reference module, earns nothing."""

    def __init__(self) -> None:
        self.intents: dict[str, _Intent] = {}

    def _send(self, cmd: str) -> list[tuple[Any, ...]]:
        i = self.intents[cmd]
        i.att += 1
        return [("send", cmd, i.key, i.att), ("arm", cmd)]

    def step(self, inp: tuple[Any, ...]) -> list[tuple[Any, ...]]:
        kind = inp[0]
        if kind == "commit":
            _, cmd, key = inp
            self.intents[cmd] = _Intent(key, 0, False, False)
            return self._send(cmd)
        if kind == "tick":
            i = self.intents.get(inp[1])
            return self._send(inp[1]) if i and not i.stored and not i.acked else []
        if kind == "reply":
            _, cmd, key, _att = inp
            i = self.intents.get(cmd)
            if i and not i.stored and not i.acked and i.key == key:
                i.stored = i.acked = True
                return [("store", cmd), ("ack", cmd)]
            return []
        if kind == "restarted":
            out: list[tuple[Any, ...]] = []
            for cmd, key, att, status, stored in inp[1]:
                acked = status == ACKED
                self.intents[cmd] = _Intent(key, att, stored, acked)
                if acked:
                    continue
                if stored:
                    self.intents[cmd].acked = True
                    out.append(("ack", cmd))
                else:
                    out.extend(self._send(cmd))
            return out
        raise ValueError(kind)


# ------------------------------------------------------------------------------------------ the harness
@dataclass
class Config:
    seed: int
    rate: int = 0
    steps: int = 200
    commands: int = 1
    max_crashes: int = 2
    max_ticks: int = 2
    max_dups: int = 3
    mutant: str = "none"  # none | ack-before-store | fresh-key | resend-stored
    crash_in: str | None = None
    planted_unseeded: bool = False


@dataclass
class Outcome:
    log: list[str]
    steps: int
    crashes: int
    ticks: int
    dups: int
    violation: tuple[int, int, str, str] | None  # step, line, property, detail

    def ndjson(self) -> str:
        return "".join(line + "\n" for line in self.log)

    @property
    def faults(self) -> int:
        return self.crashes + self.ticks + self.dups


@dataclass
class _Row:
    key: tuple[str, int]
    att: int
    status: str
    stored: bool


@dataclass
class _World:
    cfg: Config
    choose: Callable[[Rng, int, int, int], tuple[str, int]]
    make: Callable[[], Any]
    rng: Rng = field(init=False)
    machine: Any = field(init=False)
    db: dict[str, _Row] = field(default_factory=dict[str, _Row])
    to_commit: list[str] = field(default_factory=list[str])
    reqs: list[tuple[str, tuple[str, int], int]] = field(default_factory=list[tuple[str, tuple[str, int], int]])
    replies: list[list[Any]] = field(default_factory=list[list[Any]])  # [reply, delivered]
    seen: set[tuple[str, int]] = field(default_factory=set[tuple[str, int]])
    charges: dict[str, int] = field(default_factory=dict[str, int])
    armed: set[str] = field(default_factory=set[str])
    crashes: int = 0
    ticks: int = 0
    dups: int = 0
    step: int = 0
    log: list[str] = field(default_factory=list[str])
    violation: tuple[int, int, str, str] | None = None
    crashed_in_window: bool = False

    def __post_init__(self) -> None:
        self.rng = HostRng(self.cfg.seed) if self.cfg.planted_unseeded else Rng(self.cfg.seed)
        self.machine = self.make()
        self.to_commit = [f"c{i}" for i in range(1, self.cfg.commands + 1)]

    def emit(self, line: str) -> None:
        self.log.append(line)

    def fail(self, prop: str, detail: str) -> None:
        if self.violation is None:
            self.violation = (self.step, len(self.log), prop, detail)

    def up(self) -> bool:
        return self.machine is not None

    def monitor(self) -> None:
        for c, n in sorted(self.charges.items()):
            if n > 1:
                self.fail("NoDoubleCharge", f"the provider charged {c} {n} times")
                break
        for c, r in sorted(self.db.items()):
            if r.status == ACKED and not r.stored:
                self.fail("AckedIsDurable", f"{c} was acknowledged before its result was stored")
                break

    def window_of(self, c: str) -> str | None:
        row = self.db.get(c)
        if row is None or row.status == ACKED:
            return None
        if row.status == PENDING:
            return "CW1"
        if row.stored:
            return "CW4"
        if any(r[0][0] == c for r in self.replies):
            return "CW3"
        if any(r[0] == c for r in self.reqs):
            return "CW2"
        return None

    def crash_allowed(self) -> bool:
        return self.up() and self.crashes < self.cfg.max_crashes and any(r.status != ACKED for r in self.db.values())

    def checkpoint(self, faulty: bool) -> bool:
        self.monitor()
        if not self.up():
            return False
        if self.cfg.crash_in is not None:
            if not self.crashed_in_window and self.window_of("c1") == self.cfg.crash_in:
                self.crashed_in_window = True
                self.crash()
                return True
            return False
        if faulty and self.crash_allowed():
            if self.choose(self.rng, 1, 1, self.cfg.rate)[0] == "fault":
                self.crash()
                return True
        return False

    def crash(self) -> None:
        self.machine = None
        self.armed.clear()
        self.crashes += 1
        self.emit('{"event":"Crash"}')

    def mutate(self, outs: list[tuple[Any, ...]], restarted: bool = False) -> list[tuple[Any, ...]]:
        if self.cfg.mutant == "resend-stored" and restarted:
            mutated: list[tuple[Any, ...]] = []
            for o in outs:
                row = self.db.get(o[1]) if o[0] == "ack" else None
                if row is not None and row.stored:
                    mutated += [("send", o[1], row.key, row.att + 1), ("arm", o[1])]
                mutated.append(o)
            return mutated
        if self.cfg.mutant == "fresh-key":
            return [("send", o[1], (o[2][0], o[3]), o[3]) if o[0] == "send" else o for o in outs]
        if self.cfg.mutant == "ack-before-store":
            outs = list(outs)
            for i in range(len(outs)):
                if outs[i][0] == "store":
                    j = next((j for j in range(i + 1, len(outs)) if outs[j] == ("ack", outs[i][1])), None)
                    if j is not None:
                        outs[i], outs[j] = outs[j], outs[i]
            return outs
        return outs

    def feed(self, inp: tuple[Any, ...], faulty: bool) -> None:
        if self.machine is None:
            return
        outs = self.mutate(self.machine.step(inp), restarted=inp[0] == "restarted")
        if inp[0] == "reply" and outs:
            self.emit(f'{{"event":"Receive","cmd":"{inp[1]}"}}')
            if self.checkpoint(faulty):
                return
        for out in outs:
            self.carry_out(out)
            if self.checkpoint(faulty):
                return

    def carry_out(self, out: tuple[Any, ...]) -> None:
        kind, cmd = out[0], out[1]
        if kind == "send":
            key, att = out[2], out[3]
            row = self.db.get(cmd)
            if row is None:
                self.fail("NoLostIntent", f"the machine sent {cmd}, which no committed intent names")
                return
            resend = row.status != PENDING
            row.status, row.att = INFLIGHT, att
            if resend:
                self.emit(f'{{"event":"Timeout","cmd":"{cmd}"}}')
            self.emit(f'{{"event":"Dispatch","cmd":"{cmd}","key":["{key[0]}",{key[1]}],"att":{att}}}')
            self.reqs.append((cmd, key, att))
        elif kind == "arm":
            self.armed.add(cmd)
            self.emit(f'{{"event":"TimerArmed","cmd":"{cmd}"}}')
        elif kind == "store":
            if cmd in self.db:
                self.db[cmd].stored = True
            self.emit(f'{{"event":"Persist","cmd":"{cmd}"}}')
        elif kind == "ack":
            if cmd in self.db:
                self.db[cmd].status = ACKED
            self.armed.discard(cmd)
            self.emit(f'{{"event":"Ack","cmd":"{cmd}"}}')

    def normal_events(self) -> list[tuple[Any, ...]]:
        ev: list[tuple[Any, ...]] = []
        if self.to_commit:
            ev.append(("commit", self.to_commit[0]))
        ev.extend(("accept", i) for i in range(len(self.reqs)))
        if self.up():
            ev.extend(("deliver", i) for i, r in enumerate(self.replies) if not r[1])
        else:
            ev.append(("restart",))
        return ev

    def fault_events(self) -> list[tuple[Any, ...]]:
        ev: list[tuple[Any, ...]] = []
        if self.cfg.crash_in is not None:
            return ev
        if self.crash_allowed():
            ev.append(("crash",))
        if self.up() and self.ticks < self.cfg.max_ticks:
            for c in sorted(self.armed):
                r = self.db.get(c)
                if r is not None and r.status == INFLIGHT and not r.stored:
                    ev.append(("tick", c))
        if self.up() and self.dups < self.cfg.max_dups:
            ev.extend(("dup", i) for i, r in enumerate(self.replies) if r[1])
        return ev

    def apply(self, e: tuple[Any, ...], faulty: bool) -> None:
        kind = e[0]
        if kind == "commit":
            c = e[1]
            self.to_commit.remove(c)
            key = (c, 0)
            self.db[c] = _Row(key, 0, PENDING, False)
            self.emit(f'{{"event":"Commit","cmd":"{c}"}}')
            if self.checkpoint(faulty):
                return
            self.feed(("commit", c, key), faulty)
        elif kind == "accept":
            cmd, key, att = self.reqs.pop(e[1])
            if key not in self.seen:
                self.charges[cmd] = self.charges.get(cmd, 0) + 1
            self.seen.add(key)
            self.replies.append([(cmd, key, att), False])
            self.checkpoint(faulty)
        elif kind in ("deliver", "dup"):
            if kind == "deliver":
                self.replies[e[1]][1] = True
            else:
                self.dups += 1
            cmd, key, att = self.replies[e[1]][0]
            if self.cfg.mutant == "fresh-key" and cmd in self.db:
                key = self.db[cmd].key  # the reply comes back under the intent's own key (world.rs, unmutate)
            self.feed(("reply", cmd, key, att), faulty)
        elif kind == "tick":
            self.ticks += 1
            self.armed.discard(e[1])
            self.feed(("tick", e[1]), faulty)
        elif kind == "crash":
            self.crash()
        elif kind == "restart":
            self.emit('{"event":"Recover"}')
            for row in self.db.values():
                if row.status == INFLIGHT and not row.stored:
                    row.status = PENDING
            self.machine = self.make()
            if self.checkpoint(faulty):
                return
            rows = [(c, r.key, r.att, r.status, r.stored) for c, r in sorted(self.db.items())]
            self.feed(("restarted", rows), faulty)

    def run(self) -> Outcome:
        while self.step < self.cfg.steps:
            normal, fault = self.normal_events(), self.fault_events()
            if not normal:
                break  # nothing ordinary is left to do: the run is over, whatever faults are still possible
            self.step += 1
            rate = 0 if self.cfg.crash_in is not None else self.cfg.rate
            which, i = self.choose(self.rng, len(normal), len(fault), rate)
            if which == "normal" and i < len(normal):
                e = normal[i]
            elif which == "fault" and i < len(fault):
                e = fault[i]
            else:
                e = normal[0]
            self.apply(e, True)
        drained = 0
        while drained < 1000:
            normal = self.normal_events()
            if not normal:
                break
            self.step += 1
            drained += 1
            self.apply(normal[0], False)
        if self.violation is None:
            left = [c for c, r in sorted(self.db.items()) if r.status != ACKED]
            if left:
                self.fail("NoLostIntent", f"{left[0]} was committed and never acknowledged: its intent was left behind")
            elif self.to_commit:
                self.fail("NoLostIntent", "a command was never committed")
        # the run ended normally, whatever it broke on the way: the log is complete
        self.emit('{"event":"End"}')
        return Outcome(self.log, self.step, self.crashes, self.ticks, self.dups, self.violation)


def run(cfg: Config) -> Outcome:
    """The reference machine under the reference fault plan."""
    return _World(cfg, reference_choose, ReferenceMachine).run()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def first_difference(a: Sequence[str], b: Sequence[str]) -> int:
    n = max(len(a), len(b))
    return next((i + 1 for i in range(n) if (a[i] if i < len(a) else None) != (b[i] if i < len(b) else None)), 0)


def describe(seed: int, o: Outcome) -> str:
    sha = sha256_hex(o.ndjson().encode())
    if o.violation is None:
        return f"seed {seed}: ok (steps {o.steps}, faults {o.faults}: crash {o.crashes}, tick {o.ticks}, dup {o.dups}; {len(o.log)} lines, sha256 {sha})"
    step, line, prop, detail = o.violation
    return f"seed {seed}: FAIL {prop} at step {step} (line {line}): {detail}"


# ------------------------------------------------------------------------------------------ the command
def _learner(args: argparse.Namespace) -> int:
    """Your machine: build the crate in labs/LAB-8/sim/ and run `outbox-sim trace`."""
    from statespace.check.runner import find_root

    root = find_root("labs/LAB-8/sim", Path.cwd())
    if root is None:
        sys.stderr.write("statespace sim: no labs/LAB-8/sim/ here or above; run it from your lab repository, or pass --reference\n")
        return 2
    cargo = shutil.which("cargo")
    if cargo is None:
        sys.stderr.write("statespace sim: there is no cargo on this machine (labs/TOOLS.md section 2.6)\n")
        return 3
    crate = root / "labs" / "LAB-8" / "sim"
    argv = [cargo, "run", "--release", "--quiet", "--manifest-path", str(crate / "Cargo.toml"), "--", "trace", "--seed", str(args.seed), "--rate", str(args.rate if args.rate is not None else 150), "--steps", str(args.steps), "--commands", str(args.commands if args.commands is not None else 2), "--mutant", args.mutant]
    if args.out:
        argv += ["--out", str(Path(args.out).resolve())]
    return subprocess.call(argv)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="statespace sim", description="Run an outbox simulator under a seeded fault schedule and write its NDJSON trace.")
    parser.add_argument("seed", type=int)
    parser.add_argument("--reference", action="store_true", help="the course's reference machine (reference module, earns nothing); LAB-8.1 runs it")
    parser.add_argument("--out", default=None, help="write the trace here (default: standard output)")
    parser.add_argument("--rate", type=int, default=None, help="faults per thousand choices (reference default 0, yours 150)")
    parser.add_argument("--steps", type=int, default=200, help="the step cap of the faulty phase")
    parser.add_argument("--commands", type=int, default=None, help="commands per run (reference default 1, yours 2)")
    parser.add_argument("--mutant", default="none", choices=("none", "ack-before-store", "fresh-key", "resend-stored"))
    parser.add_argument("--crash-in", choices=("CW1", "CW2", "CW3", "CW4"), default=None, help="one crash, the first time c1 is in that window, and no other fault")
    parser.add_argument("--planted-unseeded", action="store_true", help="the planted variant: faults drawn from the host's random source")
    args = parser.parse_args(list(argv) if argv is not None else None)
    if args.seed < 0 or args.seed >= 1 << 64:
        parser.error("the seed is a number from 0 to 2^64 - 1")
    if not args.reference:
        if args.planted_unseeded:
            parser.error("--planted-unseeded is a variant of the reference harness: add --reference")
        return _learner(args)
    cfg = Config(seed=args.seed, rate=args.rate if args.rate is not None else 0, steps=args.steps, commands=args.commands if args.commands is not None else 1, mutant=args.mutant, crash_in=args.crash_in, planted_unseeded=args.planted_unseeded)
    o = run(cfg)
    text = o.ndjson()
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_bytes(text.encode("utf-8"))
        sys.stdout.write(f"{describe(args.seed, o)}\nwrote {args.out}\n")
    else:
        sys.stdout.write(text)
        sys.stderr.write(describe(args.seed, o) + "\n")
    return 0 if o.violation is None else 1


if __name__ == "__main__":
    raise SystemExit(main())

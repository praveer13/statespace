"""The PostgreSQL lane (INS-bench-pg): `statespace isorun` runs, and statement runs a check makes itself.

Two engines, read by one grammar of verdict lines:

``isorun``
    one `statespace isorun` run of a spec (statespace/isorun.py): a `server:` line with the server's own
    version string, one `permutation <k>: <signature>` line per permutation (the catalog's signature, such
    as `s1=commit s2=abort:40001  [40001]`), a `hung: permutation <k>: ...` or `setup failed: ...` line for
    one that did not run to the end, and a `summary:` line.
``postgresql``
    statements a check sends through one connection, such as a lab's compiled plans run command by
    command: a `server:` line, then `<name>: <value>` lines for what was executed (`executed:`,
    `classes:`, `sqlstates:`, `level:`, `statement:`), and a `summary:` line.

The verdict: `error` when a line says `error:`, `failed` when a permutation hung or a setup failed,
`passed` when the run went to its summary line, and no verdict when the lines have no `server:` or no
`summary:` line, or hold a line of another shape. It says that the engine ran what it was given to the
end, never that the history is serializable or that a check passed: a check reads the history.

`PgSession` records each run the way the Z3 lane does: the input is written beside the receipt, its
SHA-256 is the run's input hash, and the run goes to the stage's list of runs through `sink`.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any

from statespace.check.lanes import Derivation, InputRefused, ToolUnavailable

__all__ = ["ENGINES", "PgSession", "derive_verdict"]

ENGINES = ("isorun", "postgresql")

_PERMUTATION = re.compile(r"permutation [0-9]+: \S.*")
_FIELD = re.compile(r"(executed|classes|sqlstates|level|statement|attempt|divergence|triggers): .*")


def derive_verdict(lines: Sequence[str]) -> Derivation:
    problems: list[str] = []
    if not lines or not lines[0].startswith("server: "):
        problems.append("the first verdict line is not the server's version (server: ...)")
    if not lines or not lines[-1].startswith("summary: "):
        problems.append("the last verdict line is not a summary (summary: ...)")
    verdict = "passed"
    for line in lines[1:-1] if len(lines) > 1 else []:
        if line.startswith("error: "):
            verdict = "error"
        elif line.startswith("hung: ") or line.startswith("setup failed: "):
            if verdict != "error":
                verdict = "failed"
        elif not (_PERMUTATION.fullmatch(line) or _FIELD.fullmatch(line)):
            problems.append(f"{line!r} is not a PostgreSQL lane verdict line")
    if problems:
        return Derivation(None, problems=tuple(problems))
    return Derivation(verdict)


class PgSession:
    """The PostgreSQL runs of one stage. A check makes one with the stage's workdir and `ctx.runs.append`
    as the sink (the check context has no PostgreSQL slot yet), and runs specs through `isorun`."""

    SECTION = "pg"

    def __init__(self, *, root: Path, workdir: Path, sink: Callable[[dict[str, Any]], None], dsn: str | None = None) -> None:
        self.root = root
        self.workdir = workdir
        self.sink = sink
        self.dsn = dsn
        self.server_version: str | None = None  # SHOW server_version, verbatim
        self.version_string: str | None = None  # SELECT version(), verbatim
        self.histories: list[str] = []  # SHA-256 of every history written
        self.sqlstates: dict[str, int] = {}
        self._steps: set[str] = set()

    def _step(self, step: str) -> str:
        name, n = step, 1
        while name in self._steps:
            n += 1
            name = f"{step}-{n}"
        self._steps.add(name)
        return name

    def _relative(self, path: Path) -> str:
        return path.resolve().relative_to(self.root).as_posix()

    def connect(self) -> Any:
        """An autocommit connection to the server, or ToolUnavailable naming why there is none."""
        from statespace import isorun

        try:
            conn = isorun.connect_admin(self.dsn)
        except isorun.IsorunUnavailable as error:
            raise ToolUnavailable(str(error)) from error
        if self.server_version is None:
            self.server_version = str(conn.execute("SHOW server_version").fetchone()[0])
            self.version_string = str(conn.execute("SELECT version()").fetchone()[0])
        return conn

    def scratch_db(self) -> tuple[Any, str, str]:
        """A fresh database: (admin connection, its name, a conninfo for it). Drop it with drop_db."""
        import secrets

        from statespace import isorun

        admin = self.connect()
        name = f"lab_{secrets.token_hex(6)}"
        admin.execute(f'CREATE DATABASE "{name}"')
        return admin, name, isorun._conninfo(admin, name)  # pyright: ignore[reportPrivateUsage]

    @staticmethod
    def drop_db(admin: Any, name: str) -> None:
        try:
            admin.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
        finally:
            admin.close()

    def isorun(self, spec_text: str, *, step: str, spec_label: str) -> dict[str, Any]:
        """Run a spec with isorun and record the run. Returns the history@1 document."""
        from statespace import isorun

        try:
            isorun.parse_spec(spec_text)
        except isorun.SpecError as error:
            raise InputRefused(f"{spec_label} cannot be read as an isolationtester spec: {error}") from error
        self.connect().close()
        step = self._step(step)
        self.workdir.mkdir(parents=True, exist_ok=True)
        spec_file = self.workdir / f"{step}.spec"
        spec_file.write_bytes(spec_text.encode("utf-8"))
        out = self.workdir / f"{step}.history.json"
        started = time.monotonic()
        try:
            history = isorun.run_spec(spec_text, dsn=self.dsn, spec_path=spec_label)
        except isorun.IsorunUnavailable as error:
            raise ToolUnavailable(str(error)) from error
        ms = int(round((time.monotonic() - started) * 1000))
        text = json.dumps(history, indent=2, ensure_ascii=False) + "\n"
        out.write_text(text, encoding="utf-8")
        self.histories.append(hashlib.sha256(text.encode("utf-8")).hexdigest())
        for p in history["permutations"]:
            for e in p["errors"]:
                if e.get("session") != isorun.OBSERVER and e.get("sqlstate"):
                    self.sqlstates[e["sqlstate"]] = self.sqlstates.get(e["sqlstate"], 0) + 1
        lines = isorun.verdict_lines(history)
        bad = any(p.get("hung") or p.get("setupError") for p in history["permutations"])
        self.sink(
            {
                "step": step,
                "engine": "isorun",
                "version": self.server_version or "unknown",
                "argv": ["statespace", "isorun", self._relative(spec_file), "--out", self._relative(out)],
                "inputSha256": hashlib.sha256(spec_text.encode("utf-8")).hexdigest(),
                "budget": {},
                "exitCode": 1 if bad else 0,
                "verdictLines": lines,
                "verdict": derive_verdict(lines).verdict or "error",
                "ms": ms,
            }
        )
        return history

    def record(self, *, step: str, input_text: str, lines: Sequence[str], ms: int, seed: int | None = None, extension: str = "txt") -> None:
        """Record statements a check ran itself (engine postgresql): its input is written beside the
        receipt, and `lines` are the run's verdict lines between the server line and the summary."""
        step = self._step(step)
        self.workdir.mkdir(parents=True, exist_ok=True)
        path = self.workdir / f"{step}.{extension}"
        path.write_bytes(input_text.encode("utf-8"))
        verdict_lines = [f"server: {self.version_string or self.server_version or 'unknown'}", *lines, f"summary: {step}"]
        (self.workdir / f"{step}.out").write_text("\n".join(verdict_lines) + "\n", encoding="utf-8")
        budget: dict[str, int] = {} if seed is None else {"seed": seed}
        self.sink(
            {
                "step": step,
                "engine": "postgresql",
                "version": self.server_version or "unknown",
                "argv": ["statespace", "check", "--postgresql", self._relative(path)],
                "inputSha256": hashlib.sha256(input_text.encode("utf-8")).hexdigest(),
                "budget": budget,
                "exitCode": 0,
                "verdictLines": verdict_lines,
                "verdict": derive_verdict(verdict_lines).verdict or "error",
                "ms": ms,
            }
        )

    def section(self, isolation: str | None = None) -> dict[str, Any]:
        """The receipt's pg block (receipt@1 `pg`), for a check to place where the runner can carry it.
        `isolation` is read committed, repeatable read, serializable or mixed."""
        out: dict[str, Any] = {
            "serverVersion": self.version_string or "unknown",
            "isolationLevel": (isolation or "read committed").replace(" ", "-"),
            "sqlstateClasses": dict(sorted(self.sqlstates.items())),
        }
        if self.histories:
            out["historySha256"] = self.histories[-1]
        return out

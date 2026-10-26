"""Run a learner's Z3Py script and capture each question it asks as SMT-LIB, for the Z3 lane to answer.

LAB-1's files are Z3Py scripts (curriculum/S01-counterexample.md section 3). A check does not trust what
the script prints: it runs the script once in a subprocess, under the Python that runs statespace, with
`z3.Solver.check` wrapped so that each call writes the solver's assertions as SMT-LIB (`Solver.to_smt2()`)
before it answers. The check then puts each captured query through the Z3 lane, which runs it under an
rlimit and reads its verdict lines, so the receipt records every question the script asked, with the hash
of its SMT-LIB, its budget and Z3's own answer. What the script printed is kept beside the receipt and
handed to the check, which may compare it with the lane's answers.

    capture = ctx.z3py("labs/LAB-1/starter.py")      # runs the script; raises InputRefused if it is missing
    for query in capture.queries:
        run = ctx.z3().run(query.text, step=query.step)

As a module, `python -I -m statespace.check.z3py <out-dir> <prefix> <script>` is the subprocess itself.
A `check(*assumptions)` call is captured with its assumptions as `(check-sat-assuming ...)`.
"""

from __future__ import annotations

import json
import os
import runpy
import sys
import traceback
from dataclasses import dataclass
from pathlib import Path

__all__ = ["Capture", "Query", "capture"]

WALL_CLOCK_S = 120.0  # a backstop for the whole script [D]; each query the lane runs has its own rlimit


@dataclass(frozen=True)
class Query:
    step: str  # the lane step name to run it under, such as starter-q1
    text: str  # SMT-LIB, one question
    answer: str  # what Z3Py answered inside the script: sat, unsat or unknown (data, never graded)


@dataclass(frozen=True)
class Capture:
    script: str  # repository-relative
    version: str | None  # z3.get_version_string() inside the script's process
    queries: tuple[Query, ...]
    output: str  # what the script printed, standard output and error interleaved
    output_lines: tuple[str, ...]  # the same, as lines with trailing white space removed
    exit_code: int | None
    error: str | None  # the last line of a traceback when the script raised, else None
    log_path: str  # where the output was written, repository-relative


def capture(*, root: Path, workdir: Path, script: str, prefix: str, wall_clock_s: float = WALL_CLOCK_S) -> Capture:
    """Run `script` (repository-relative) and capture its questions. The caller has checked it exists."""
    from .proc import run

    workdir.mkdir(parents=True, exist_ok=True)
    out_dir = workdir / f"{prefix}.queries"
    out_dir.mkdir(parents=True, exist_ok=True)
    done = run([sys.executable, "-I", "-m", "statespace.check.z3py", str(out_dir), prefix, script], cwd=root, timeout_s=wall_clock_s)
    log = workdir / f"{prefix}.out"
    log.write_bytes(done.output.encode("utf-8"))
    manifest_path = out_dir / "capture.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    queries = tuple(
        Query(q["step"], (out_dir / q["file"]).read_bytes().decode("utf-8"), q["answer"]) for q in manifest.get("queries", [])
    )
    error = manifest.get("error")
    if done.timed_out:
        error = f"the script gave no result within {wall_clock_s:g} s and was stopped"
    elif done.returncode is None:
        error = f"the script did not start: {done.error}"
    lines = tuple(line.rstrip() for line in done.output.splitlines())
    return Capture(script, manifest.get("version"), queries, done.output, lines, done.returncode, error, log.relative_to(root).as_posix())


# ------------------------------------------------------------------------------- the subprocess
def _main(out_dir: str, prefix: str, script: str) -> int:
    import z3  # pyright: ignore[reportMissingTypeStubs]

    manifest: dict[str, object] = {"version": str(z3.get_version_string()), "queries": [], "error": None}
    queries: list[dict[str, str]] = manifest["queries"]  # type: ignore[assignment]
    original = z3.Solver.check

    def save() -> None:
        with open(os.path.join(out_dir, "capture.json"), "w", encoding="utf-8") as handle:
            json.dump(manifest, handle)

    def check(self: object, *assumptions: object) -> object:
        n = len(queries) + 1
        text = self.to_smt2()  # type: ignore[attr-defined]
        if assumptions:
            flat: list[object] = []
            for item in assumptions:
                flat.extend(item if isinstance(item, (list, tuple)) else [item])
            literals = " ".join(a.sexpr() for a in flat)  # type: ignore[attr-defined]
            text = text.replace("(check-sat)", f"(check-sat-assuming ({literals}))")
        name = f"q{n}.smt2"
        with open(os.path.join(out_dir, name), "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        answer = original(self, *assumptions)  # type: ignore[arg-type]
        queries.append({"step": f"{prefix}-q{n}", "file": name, "answer": str(answer)})
        save()
        return answer

    z3.Solver.check = check  # type: ignore[method-assign]
    save()
    path = os.path.abspath(script)
    sys.argv = [path]
    sys.path.insert(0, os.path.dirname(path))
    try:
        runpy.run_path(path, run_name="__main__")
    except SystemExit as stop:
        code = stop.code if isinstance(stop.code, int) else (0 if stop.code is None else 1)
        if code:
            manifest["error"] = f"the script exited with status {code}"
            save()
        return code
    except BaseException as error:  # noqa: BLE001 - the learner's script may raise anything
        traceback.print_exc()
        manifest["error"] = f"{type(error).__name__}: {error}"
        save()
        return 1
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.stderr.write("usage: python -I -m statespace.check.z3py <out-dir> <prefix> <script>\n")
        raise SystemExit(2)
    raise SystemExit(_main(*sys.argv[1:]))

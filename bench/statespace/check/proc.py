"""Run one engine process: merged output, a wall-clock backstop, and the time it took.

Every lane runs its engine through `run`, so that a process that outlives its budget is stopped the
same way everywhere: the whole process group is killed (on POSIX), because `uv run` and a Python
runner start grandchildren that a plain kill of the child would leave behind.

Nothing here reads an exit code as a verdict. The caller gets the code, the output and whether the
backstop fired, and its lane parses the output.
"""

from __future__ import annotations

import os
import signal
import subprocess
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

__all__ = ["Completed", "run"]


@dataclass(frozen=True)
class Completed:
    """What a process did. `returncode` is None when it never started (see `error`)."""

    returncode: int | None
    output: str  # standard output and standard error, interleaved as the process wrote them
    ms: int  # wall-clock milliseconds from start to exit
    timed_out: bool  # the wall-clock backstop stopped it
    error: str | None = None  # why it did not start, such as "No such file or directory"


def _kill_group(process: subprocess.Popen[bytes]) -> None:
    try:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGKILL)
        else:  # pragma: no cover - Windows has no process groups in this sense
            process.kill()
    except (ProcessLookupError, PermissionError):
        pass


def run(
    argv: Sequence[str],
    *,
    cwd: Path | str,
    timeout_s: float,
    env: Mapping[str, str] | None = None,
    stdin: bytes | None = None,
) -> Completed:
    """Run `argv` in `cwd` and wait at most `timeout_s` seconds of wall-clock time.

    The output is decoded as UTF-8; a byte that is not UTF-8 becomes U+FFFD, so a line that carried
    one is visibly not what the engine meant rather than silently different.
    """
    started = time.monotonic()
    try:
        process = subprocess.Popen(
            list(argv),
            cwd=str(cwd),
            env=None if env is None else dict(env),
            stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            start_new_session=os.name == "posix",
        )
    except OSError as error:
        return Completed(None, "", 0, False, error.strerror or str(error))
    timed_out = False
    try:
        raw, _ = process.communicate(input=stdin, timeout=timeout_s)
    except subprocess.TimeoutExpired:
        timed_out = True
        _kill_group(process)
        raw, _ = process.communicate()
    ms = int(round((time.monotonic() - started) * 1000))
    return Completed(process.returncode, raw.decode("utf-8", errors="replace"), ms, timed_out)

"""The wire between LAB-10's checks and the learner's Core (LAB-10.2 and LAB-10.3).

The learner names one command in `labs/LAB-10/core.toml`, run from the repository root, that speaks NDJSON:
one JSON request per line on standard input, one JSON reply per line on standard output. A Core built in
LAB-3, LAB-4, LAB-6 and LAB-8 as Rust crates answers through a small adapter binary; the requests are the
component functions of D-14, with IR@1 programs in and component-specific JSON out.

    {"op": "hello"}                                   -> {"components": {"parse": "<source path>", ...}}
    {"op": "parse", "source": text}                   -> {"ok": true, "program": IR} | {"ok": false, "error": text}
    {"op": "typecheck", "program": IR}                -> {"ok": true, "types": {param: type}} | {"ok": false, "rule": rule}
    {"op": "check", "program": IR, "types": {...}}    -> {"obligations": [{"name", "query", "premise"}]}   SMT-LIB text
    {"op": "interp", "program": IR, "types", "state", "args"} -> {"ok": true, "state": S} | {"ok": false, "err": e}
    {"op": "compile", "program": IR, "types": {...}}  -> {"plan": P}                                      opaque to the check
    {"op": "run", "plan": P, "args": {...}, "dsn": d} -> {"outcome": {...}, "isolation": text, "attempts": [...]}
    {"op": "sim", "program", "types", "state", "calls", "seed"} -> {"trace": [record, ...]}

The checker's queries use the fixed vocabulary of obligations.py, and the check, not the Core, runs them
through the Z3 lane, so every query is recorded in the receipt. A component that is a reference module is
refused: the Core is the one you built (LAB-10.c3).
"""

from __future__ import annotations

import json
import queue
import subprocess
import threading
from pathlib import Path
from typing import Any

__all__ = ["Core", "CoreMissing", "CoreFault", "CONFIG", "COMPONENTS"]

CONFIG = "labs/LAB-10/core.toml"
COMPONENTS = ("parse", "typecheck", "check", "interp", "compile", "run", "sim")
TIMEOUT_S = 60.0  # [D]


class CoreMissing(Exception):
    """core.toml names no command, or a component the stage needs is not wired."""


class CoreFault(Exception):
    """The Core did not answer as the protocol says: it exited, timed out or printed something else."""


def _load(root: Path) -> dict[str, Any]:
    import tomllib

    path = root / CONFIG
    if not path.is_file():
        raise CoreMissing(f"{CONFIG} is not in your lab repository")
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except (tomllib.TOMLDecodeError, UnicodeDecodeError) as error:
        raise CoreMissing(f"{CONFIG} does not read as TOML: {error}") from error


class Core:
    def __init__(self, root: Path) -> None:
        self.root = root
        config = _load(root)
        core = config.get("core") or {}
        argv = core.get("command") or []
        if not isinstance(argv, list) or not argv or not all(isinstance(a, str) and a for a in argv):
            raise CoreMissing(f"{CONFIG} names no command under [core] (command = [...] is empty)")
        joined = " ".join(argv)
        if "statespace.demo" in joined or ".statespace/" in joined or "statespace demo" in joined:
            raise CoreMissing(f"{CONFIG} runs the course's reference pipeline ({joined}); wire your own Core")
        self.argv = argv
        self.wired = [c for c in COMPONENTS if (config.get("components") or {}).get(c)]
        self._proc: subprocess.Popen[str] | None = None
        self._lines: queue.Queue[str | None] = queue.Queue()
        self._stderr: list[str] = []

    def _start(self) -> subprocess.Popen[str]:
        if self._proc is None or self._proc.poll() is not None:
            try:
                self._proc = subprocess.Popen(self.argv, cwd=self.root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
            except OSError as error:
                raise CoreFault(f"your Core did not start ({' '.join(self.argv)}): {error.strerror or error}") from error
            proc = self._proc
            self._lines = queue.Queue()

            def pump(stream: Any, sink: Any) -> None:
                for line in stream:
                    sink(line)
                if sink is self._lines.put:
                    self._lines.put(None)

            threading.Thread(target=pump, args=(proc.stdout, self._lines.put), daemon=True).start()
            threading.Thread(target=pump, args=(proc.stderr, self._stderr.append), daemon=True).start()
        return self._proc

    def request(self, message: dict[str, Any], timeout_s: float = TIMEOUT_S) -> dict[str, Any]:
        proc = self._start()
        assert proc.stdin is not None
        try:
            proc.stdin.write(json.dumps(message) + "\n")
            proc.stdin.flush()
        except (BrokenPipeError, OSError) as error:
            raise CoreFault(f"your Core closed its input during {message.get('op')}: {self.tail()}") from error
        try:
            line = self._lines.get(timeout=timeout_s)
        except queue.Empty as error:
            proc.kill()
            raise CoreFault(f"your Core gave no reply to {message.get('op')} within {timeout_s:g} s") from error
        if line is None:
            raise CoreFault(f"your Core exited during {message.get('op')}: {self.tail()}")
        try:
            reply = json.loads(line)
        except json.JSONDecodeError as error:
            raise CoreFault(f"your Core's reply to {message.get('op')} is not one JSON line: {line.strip()[:120]!r}") from error
        if not isinstance(reply, dict):
            raise CoreFault(f"your Core's reply to {message.get('op')} is not a JSON object")
        return reply

    def tail(self) -> str:
        text = "".join(self._stderr).strip().splitlines()
        return " | ".join(text[-3:]) or "no error output"

    def hello(self) -> dict[str, str]:
        reply = self.request({"op": "hello"})
        comps = reply.get("components")
        if not isinstance(comps, dict):
            raise CoreFault("your Core's reply to hello names no components")
        return {str(k): str(v) for k, v in comps.items()}

    def close(self) -> None:
        if self._proc is not None and self._proc.poll() is None:
            try:
                assert self._proc.stdin is not None
                self._proc.stdin.close()
                self._proc.wait(timeout=5)
            except Exception:  # noqa: BLE001
                self._proc.kill()

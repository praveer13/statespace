"""The `statespace` command: one table of commands, each loaded only when it is named.

Spine section 9.6; ARCHITECTURE.md sections 11.2 and 11.3. A command is a module with
`main(argv) -> int`, imported when it runs, so a command's dependencies load only for it: `hash` needs
the standard library alone, and nothing here imports an engine. `statespace/__main__.py` (the
`statespace` script and `python -m statespace`) calls `main`. A later task adds its command here, such as
`defend` (W2-T31), `isorun` (W4-T01) or `trace` (W5-T14).

Nothing leaves the machine: no command makes a network request beyond local processes and containers.
"""

from __future__ import annotations

import importlib
import sys
from collections.abc import Sequence

from . import __version__

__all__ = ["COMMANDS", "main", "usage"]

# name -> (module, what it does). Spine section 9.6 words the descriptions.
COMMANDS: dict[str, tuple[str, str]] = {
    "doctor": ("statespace.doctor", "check the devcontainer pins and the sandbox; print a receipt-ready environment block"),
    "check": ("statespace.check.runner", "run a lab stage's checks and write its receipt: check lab1, check lab1.3"),
    "receipt": ("statespace.receipt", "receipt verify <file>: validate a receipt against receipt@1 and recompute its statement hashes"),
    "hash": ("statespace.hash", "print the comparator-style statement hash of a file"),
    "run": ("statespace.check.runs", "re-execute a registry run and diff its verdict lines (in the course repository)"),
    "export": ("statespace.check.export", "bundle claims, statement texts, specimens and receipts into a lab bundle for the tab"),
    "isorun": ("statespace.isorun", "run an isolationtester-format spec on PostgreSQL, advancing a step only on a lock wait it observes; write a history@1 file"),
    "demo": ("statespace.demo.cli", "run the reference pipeline on the provided agent proposal (LAB-10.1); demo record: record the demonstration (LAB-10.7)"),
    "proposal": ("statespace.demo.proposal_cli", "proposal draw: draw an unseen agent proposal for LAB-10.4"),
    "trace": ("statespace.trace", "trace validate <spec> <traces>: check NDJSON traces as behaviors of your TLA+ spec with TLC"),
    "sim": ("statespace.sim", "run an outbox simulator under a seeded fault schedule: sim <seed> [--reference]"),
}


def usage() -> str:
    width = max(len(name) for name in COMMANDS)
    rows = "\n".join(f"  {name.ljust(width)}  {what}" for name, (_module, what) in COMMANDS.items())
    return f"usage: statespace <command> [options]\n\ncommands:\n{rows}\n\n`statespace <command> --help` says more.\n"


def main(argv: Sequence[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] in ("-h", "--help"):
        sys.stdout.write(usage())
        return 0 if args else 2
    if args[0] == "--version":
        sys.stdout.write(f"statespace {__version__}\n")
        return 0
    name = args[0]
    if name not in COMMANDS:
        sys.stderr.write(f"statespace: unknown command {name!r}\n\n{usage()}")
        return 2
    module = importlib.import_module(COMMANDS[name][0])
    try:
        return int(module.main(args[1:]))
    except KeyboardInterrupt:
        sys.stderr.write("statespace: interrupted\n")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())

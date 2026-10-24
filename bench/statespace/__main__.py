"""The `statespace` command, and `python -m statespace`.

A command is a module with `main(argv) -> int`, loaded when it is named, so a command's dependencies are
imported only when it runs. `doctor` is the first. W1-T29 adds `check`, `receipt verify`, `hash` and `run`
(spine section 9.6) by listing them in COMMANDS, and may move this dispatcher into `statespace/cli.py`.
"""

from __future__ import annotations

import importlib
import sys
from collections.abc import Sequence

from . import __version__

# name -> (module, what it does). Spine section 9.6 words the descriptions.
COMMANDS: dict[str, tuple[str, str]] = {
    "doctor": ("statespace.doctor", "check the devcontainer pins and the sandbox; print a receipt-ready environment block"),
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
    return int(module.main(args[1:]))


if __name__ == "__main__":
    raise SystemExit(main())

"""The `statespace` command, and `python -m statespace`.

The command table and the dispatcher are in `statespace/cli.py`, where W1-T29 moved them as W0-T05
planned; this module stays the entry point that bench/pyproject.toml names.
"""

from __future__ import annotations

from .cli import COMMANDS, main, usage

__all__ = ["COMMANDS", "main", "usage"]

if __name__ == "__main__":
    raise SystemExit(main())

"""The labs this version of statespace holds checks for: one module per lab, `lab<n>.py`, beside this file.

A lab module defines `LAB`, a `statespace.check.Lab`, and runs nothing at import time (bench/statespace/check/
README.md section 3). `statespace check` finds a lab's module by its file name, so adding a lab is adding a
file here; nothing else is edited. `available()` lists the modules present, by directory, without importing
any of them.

The lab zip (scripts/labs/build-zips.mjs) ships this package with the module of the lab it packs, so a
learner's repository holds the modules of the labs it has unpacked.
"""

from __future__ import annotations

import re
from pathlib import Path

__all__ = ["available"]

_MODULE = re.compile(r"lab([1-9][0-9]*)\.py")


def available() -> list[str]:
    """The lab ids whose modules are in this directory, in lab order: ["LAB-1", "LAB-2", ...]."""
    found = [int(m.group(1)) for p in Path(__file__).resolve().parent.iterdir() if (m := _MODULE.fullmatch(p.name))]
    return [f"LAB-{n}" for n in sorted(found)]

"""`statespace proposal draw`: draw an agent proposal for LAB-10.4 (curriculum/S10-assembly.md section 3.2).

    statespace proposal draw [--seed N] [--root DIR] [--force]

It writes `labs/LAB-10/intake/proposal.yaml`: the seed, the command and the agent's claim, and nothing about
whether the proposal is sound. The key is computed by the reference pipeline when LAB-10.c5 runs. Without
--seed the seed is drawn at random, so the proposal is one you have not seen. An existing draw is kept
unless you pass --force, because your triage is about the proposal you drew.

Exit status: 0 drawn (or kept), 2 usage.
"""

from __future__ import annotations

import argparse
import secrets
import sys
from collections.abc import Sequence
from pathlib import Path

from .proposals import draw

INTAKE = "labs/LAB-10/intake/proposal.yaml"


def find_root(start: Path) -> Path:
    here = start.resolve()
    return next((c for c in (here, *here.parents) if (c / "labs" / "LAB-10").is_dir()), here)


def render(seed: int, source: str, claim: str) -> str:
    body = "".join(f"  {line}\n" for line in source.rstrip("\n").split("\n"))
    return (
        "# Drawn by `statespace proposal draw`. Do not edit it: LAB-10.c4 draws it again from its seed and\n"
        "# compares. The claim is the agent's, quoted and unreviewed.\n"
        "schema: statespace/proposal@1\n"
        f"seed: {seed}\n"
        "source: |\n"
        f"{body}"
        f"claim: \"{claim}\"\n"
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="statespace proposal", description="Draw an agent proposal for LAB-10.4.")
    sub = parser.add_subparsers(dest="action", required=True)
    d = sub.add_parser("draw", help="draw a proposal and write labs/LAB-10/intake/proposal.yaml")
    d.add_argument("--seed", type=int, default=None, help="the seed (default: drawn at random)")
    d.add_argument("--root", type=Path, default=None, help="the lab repository (default: the nearest directory upward holding labs/LAB-10)")
    d.add_argument("--force", action="store_true", help="replace an existing draw")
    d.add_argument("--print", dest="print_only", action="store_true", help="print the proposal and write nothing")
    args = parser.parse_args(list(argv) if argv is not None else None)
    seed = args.seed if args.seed is not None else secrets.randbits(32)
    if not 0 <= seed < 2**32:
        parser.error("the seed is from 0 to 4294967295")
    proposal = draw(seed)
    text = render(proposal.seed, proposal.source, proposal.claim)
    if args.print_only:
        sys.stdout.write(text)
        return 0
    root = args.root.resolve() if args.root else find_root(Path.cwd())
    path = root / INTAKE
    if path.exists() and not args.force:
        sys.stdout.write(f"kept {INTAKE}, drawn earlier; pass --force to draw again\n")
        sys.stdout.write(path.read_text(encoding="utf-8"))
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    sys.stdout.write(f"wrote {INTAKE}\n{text}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# statespace-lab

Your lab repository for the statespace course. You keep it, and it is your record: back it up with git.

Each lab arrives as a zip. Unpack it into this folder: the first zip starts the repository, and each later
one adds its lab's folder, `labs/LAB-<n>/`, and refreshes the agent kit and the command line.

## Start

1. Install [`uv`](https://docs.astral.sh/uv/). LAB-1 needs nothing else; from S2 on, open the folder in
   the devcontainer (`.devcontainer/`) or install the pinned tools (the course's `labs/TOOLS.md`).
2. `uv run statespace check` lists the labs here, their stages and their checks.
3. Write your part of a stage where its files mark it with the by-hand marker (AGENTS.md names it),
   then `uv run statespace check lab1.1`. Each check prints
   pass or FAIL with its message, and a failing check names what it suspects. The stage's receipt is
   written under `receipts/LAB-1.1/`.
4. Import the receipt on the course's Bench page.

## What is where

| Path | What |
|---|---|
| `labs/LAB-<n>/` | a lab: the files you work in, with a by-hand marker where you write |
| `claims/` | your claim cards and the statements they pin |
| `proposals/` | claim cards your agent proposes: shown as unreviewed text |
| `specimens/` | counterexamples you kept |
| `receipts/` | what `statespace check` wrote; do not edit by hand |
| `decisions/`, `notes/`, `report/` | your decision records, notes and exported report |
| `AGENTS.md`, `CLAUDE.md`, `.claude/` | what your coding agent reads, and the guard hook |
| `.statespace/` | the command line and the protected-paths lists; change them by unpacking a newer zip |
| `.devcontainer/` | the Bench image by digest, from S2 on |

The course's `labs/README.md` is the full manual.

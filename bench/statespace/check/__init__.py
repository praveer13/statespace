"""`statespace check`: the lane-pluggable runner that grades a lab stage and writes its receipt@1.

What a lab module (statespace/labs/lab<n>.py) imports from here:

    from statespace.check import CheckContext, CheckResult, CheckSpec, Lab, Stage

    def c3(ctx: CheckContext) -> CheckResult:
        z3 = ctx.z3()
        run = z3.run(query, step="violation", rlimit=5_000_000)
        ...
        return CheckResult(run.verdict == "unsat", "the guarded violation query is unsat")

    LAB = Lab("LAB-1", "Project 00", stages=(Stage("LAB-1.3", "Add the guard", (CheckSpec("LAB-1.c3", "...", c3),), claims=("CL-1.1",)),))

The runner is `statespace.check.runner`, the lane protocol `statespace.check.lanes`, `statespace run`
lives in `statespace.check.runs` and `statespace export` in `statespace.check.export`. README.md in this
directory documents all of it. Importing this package loads no engine.
"""

from .context import CheckContext
from .labs import LabUnavailable, find_lab, parse_target, register, unregister
from .lanes import InputRefused, ToolUnavailable
from .model import SUSPECTS, CheckResult, CheckSpec, Lab, Stage

__all__ = [
    "SUSPECTS",
    "CheckContext",
    "CheckResult",
    "CheckSpec",
    "InputRefused",
    "Lab",
    "LabUnavailable",
    "Stage",
    "ToolUnavailable",
    "find_lab",
    "parse_target",
    "register",
    "unregister",
]

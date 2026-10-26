"""The agent-proposal generator behind `statespace proposal draw` (curriculum/S10-assembly.md section 3.2;
course tool).

A proposal is a twin, a reference command with a correct claim, kept sound (possibly rewritten without
changing its meaning) or changed by one operator. Commands are always syntactically valid. The evidence
the agent offers ("k tests green", "Z3: unsat", "Lean accepted it") is drawn independently of soundness, so
the offered evidence is no cue. The sound share is seeded per draw between 30% and 60%.

The draw records only the seed, the command and the claim. The key, whether the proposal is sound and
which class a flawed one belongs to, is computed at grade time by the reference pipeline
(pipeline.key), never stored with the proposal. This generator covers the families of section 3.2 that the
LAB-10 fragment can state: the fee leg outside the guard, a guard on the wrong account, per-leg guards where
the sum must be guarded, the sound rewrites, and a typed rejection (a resource field assigned), which is a
valid outcome of triage. The authorization and hold families need LAB-7's and LAB-3's fragments [D].
"""

from __future__ import annotations

import random
from dataclasses import dataclass

__all__ = ["Proposal", "draw", "DEFAULT", "EVIDENCE_CLASS", "CHECKERS"]

# The checkers a triage plan may name for a part of a claim (LAB-10.c4).
CHECKERS = (
    "typechecker",
    "miniplinth check",
    "z3",
    "cvc5",
    "interpreter replay",
    "differential suite",
    "simulation suite",
    "lean comparator",
)

# The class a flawed proposal belongs to follows the evidence its agent offered (section 3.2).
EVIDENCE_CLASS = {"tests": "G11", "solver": "G4", "proof": "G8a"}


@dataclass(frozen=True)
class Proposal:
    seed: int
    source: str
    claim: str

    def as_record(self) -> dict[str, object]:
        return {"schema": "statespace/proposal@1", "seed": self.seed, "source": self.source, "claim": self.claim}


DEFAULT = Proposal(
    seed=0,
    source="command TransferWithFee(from, to, amount, fee)\n  requires balance(from) >= amount\n  do move amount from from to to; move fee from from to sink\n",
    claim="never overdraws; conserves; 200 tests green",
)

_FAMILIES = {
    # name: (params, sound guard, legs, alternative sound guards, flawed guards)
    "fee": (
        "from, to, amount, fee",
        "balance(from) >= amount + fee",
        ["move amount from from to to", "move fee from from to sink"],
        ["balance(from) >= fee + amount", "balance(from) - fee >= amount", "balance(from) >= amount + fee + 1"],
        ["balance(from) >= amount", "balance(to) >= amount + fee", "balance(from) >= amount && balance(from) >= fee"],
    ),
    "split": (
        "src, a, b, x, y",
        "balance(src) >= x + y",
        ["move x from src to a", "move y from src to b"],
        ["balance(src) >= y + x", "balance(src) - y >= x"],
        ["balance(src) >= x && balance(src) >= y", "balance(src) >= x", "balance(a) >= x + y"],
    ),
    "withdraw": (
        "acct, amount, fee",
        "balance(acct) >= amount + fee",
        ["move amount from acct to sink", "move fee from acct to sink"],
        ["balance(acct) >= fee + amount", "balance(acct) - amount >= fee"],
        ["balance(acct) >= amount", "balance(acct) >= fee", "balance(acct) >= amount && balance(acct) >= fee"],
    ),
}
_NAMES = {"fee": ("TransferWithFee", "PayWithFee", "SendWithCharge"), "split": ("SplitPayout", "PayTwo", "Disburse"), "withdraw": ("WithdrawWithFee", "CashOut", "Withdraw")}


def _evidence(rng: random.Random) -> tuple[str, str]:
    kind = rng.choice(("tests", "solver", "proof"))
    if kind == "tests":
        return kind, f"{rng.choice((50, 100, 200, 500, 1000))} tests green"
    if kind == "solver":
        return kind, "Z3: unsat"
    return kind, "Lean accepted it"


def draw(seed: int) -> Proposal:
    """The proposal for `seed`: the same seed always gives the same proposal."""
    rng = random.Random(f"statespace/proposal@1:{seed}")
    family = rng.choice(sorted(_FAMILIES))
    params, guard, legs, sound_guards, flawed_guards = _FAMILIES[family]
    name = rng.choice(_NAMES[family])
    sound_share = 0.30 + 0.30 * rng.random()  # seeded in [30%, 60%)
    roll = rng.random()
    legs = list(legs)
    if roll < 0.08:
        # typed rejection: a resource field assigned (a demonstration outcome, never an audit variant)
        first = legs[0].split()
        amount, src = first[1], first[3]
        legs = [f"set balance({src}) := balance({src}) - {amount}", *legs[1:]]
    elif roll < 0.08 + sound_share:
        guard = rng.choice([guard, *sound_guards])
        if rng.random() < 0.5:
            legs.reverse()
    else:
        guard = rng.choice(flawed_guards)
        if rng.random() < 0.3:
            legs.reverse()
    _kind, evidence = _evidence(rng)
    source = f"command {name}({params})\n  requires {guard}\n  do {'; '.join(legs)}\n"
    return Proposal(seed, source, f"never overdraws; conserves; {evidence}")


def evidence_kind(claim: str) -> str:
    last = claim.rsplit(";", 1)[-1].strip()
    if last.endswith("tests green"):
        return "tests"
    if last.startswith("Z3"):
        return "solver"
    return "proof"


def claim_parts(claim: str) -> list[str]:
    return [p.strip() for p in claim.split(";") if p.strip()]

# Report skeleton

Written by `statespace demo` from the reference pipeline. Proposal statement hash `2beac7d4baa32f7e7da9cdb269863dd6eda3b30ab72129dd9d3364679b8152e4`.

## Title block

Pending: written in LAB-10.8.

## What this report establishes and what it does not

Pending: written in LAB-10.8.

## The Core and its trusted base

Pending: written in LAB-10.8.

## Operational semantics and the four decision records

Pending: written in LAB-10.8.

## Theorem statements with hashes

- `2beac7d4baa32f7e7da9cdb269863dd6eda3b30ab72129dd9d3364679b8152e4`  proposal
- `f7d035840042d4f2c96b561e3d213e0f220a58643db773cfb9c5cb615531cb6d`  proposal.nonneg
- `9820f3065cd7df23eab814383bb57c12d0e73f287fc8db1c520fb9114a1e1546`  proposal.conserve
- `263ffc7827ecfabd2443ee686c46ff637ea32ed134fe2850016e6d70716c8a66`  corrected.nonneg
- `44d3283e68b5da8657dc2fde8fbec8c129ee18c37917fa47656e101770babca2`  corrected.conserve

## PROVED

Pending: written in LAB-10.8.

## MODEL-CHECKED

Pending: written in LAB-10.8.

## TESTED

Pending: written in LAB-10.8.

## ENFORCED

Pending: written in LAB-10.8.

## CONFIGURED

Pending: written in LAB-10.8.

## ASSUMED

Pending: written in LAB-10.8.

## NOT COVERED

Pending: written in LAB-10.8.

## UNKNOWN

Pending: written in LAB-10.8.

## Specimens

- SP-10.1: violates nonneg(from); because the guard covers the amount and leaves the fee leg out; minimal: yes: objective 3 under the objective of obligations.objective_terms; cured by a guard that covers every debit of the sender

## The demonstration (CL-10.1)

```
command TransferWithFee(from, to, amount, fee)
  requires balance(from) >= amount
  do move amount from from to to; move fee from from to sink
```

Claim (quoted, unreviewed): "never overdraws; conserves; 200 tests green"

- parse: ok, command TransferWithFee(from, to, amount, fee)
- typecheck: ok; from: account, to: account, amount: amount, fee: amount; R-cover: 2 statements, so each debit is an obligation for the checker (S4), not a typing rule
- check premises: z3 sat
- check nonneg: z3 sat: REFUTED
- check conserve: z3 unsat: PROVED
- witness nonneg: balance(from) = 1, balance(to) = 0, balance(sink) = 0, amount = 1, fee = 1; objective 3, and no witness below it
- replay in the reference interpreter: success; Inv broken: nonneg(from)
- claim part "never overdraws": REFUTED by check nonneg
- claim part "conserves": PROVED by check conserve
- claim part "200 tests green": evidence offered, not a checker; class G11
- corrected: requires balance(from) >= amount + fee
- check nonneg (corrected): z3 unsat, premises sat: PROVED
- check conserve (corrected): z3 unsat, premises sat: PROVED
- replay of the witness on the corrected command: error:guardFailed
- postgres proposal on the witness: success (interpreter success); R(S, D) holds; Inv broken: nonneg(from)
- postgres corrected on the witness: error:guardFailed (interpreter error:guardFailed); R(S, D) holds
- postgres corpus: 13 of 13 fixtures in their expected outcome class; R(S, D) holds after 13 of 13
- postgres corpus edge-overflow: postgres sqlstate:22003, interpreter success, expected sqlstate:22003
- postgres retries of 22003: 0; transaction_isolation read back: serializable

## Erosion log

Pending: written in LAB-10.8.

## Doubt log

Pending: written in LAB-10.8.

## Checker matrix

Pending: written in LAB-10.8.

## Budgets and advisories

Pending: written in LAB-10.8.

## Agent incident ledger

Pending: written in LAB-10.8.

## Known limitations

Pending: written in LAB-10.8.

## Reproduction

Pending: written in LAB-10.8.

# content/audit: the Audit Desk's cases

**Status:** the format and two example anchors (AUD-1.1 with two variant pairs, AUD-2.3 run-keyed), built for W1-T32. **Date:** 2026-10-26 (machine clock). Read `docs/AUDIT-DESK.md` first: sections 2 (the classes), 3 (the anchor cards), 4 (variants and operators), 5.4 (the five steps) and 6.3 (evidence types). The pool contract GATE-audit enforces is `scripts/spikes/W1-T40/README.md` section 3; this page is that contract plus the fields the Desk shows, and where they differ, the gate's contract wins.

## 1. Files

| Path | What |
|---|---|
| `content/audit/AUD-n.k.yaml` | one anchor: its pair and its variants. The file name is the ID |
| `content/audit/README.md` | this page |
| `content/audit/tools/record-keys.mjs` | records the example anchors' key runs in the Bench image (section 5) |
| `runs/RUN-<id>.json`, `runs/RUN-<id>/` | the runs that set every key, scenario answer and receipt line |

`node scripts/build-content.mjs` reads every anchor file, checks it (`packages/content/src/audit.ts`; the codes are `audit-*` in `packages/content/README.md` section 1.8) and writes `apps/site/public/content/audit.<hash>.json`, named by the manifest's `audit` field. The Desk (`apps/site/src/screens/audit/`) loads that file. A file starting with `_` is a draft the gate and the build skip.

## 2. An anchor

```yaml
id: AUD-1.1                     # the spine's anchor ID (section 6.2), and the file name
stage: S1
class: G2                       # spine 6.2's class: G1-G13 or a subclass (G6c); none for a sound anchor
medium: z3py                    # z3py, smt-lib, lean, tla, sql, rust
artifact: guarded-transfer      # with medium and operator, what makes an exemplar distinct
subject: "a transfer query (Z3Py)"   # what lists may say: a subject, never the gap
claim: "unsat, therefore safe."      # the agent's claim, quoted as it wrote it; one per pair
requirement: >-                 # what the claim is measured against, in plain words
  Every transfer the service accepts leaves the sender at zero or above, ...
scenario_question: "Does the statement speak about this transfer: do these values meet every premise it checks?"
scheduled_after: [LAB-1.3]      # labs, lab stages or lessons; at least one lab of the anchor's stage
kcs: [KC-1.non-vacuity-check, KC-1.implication-vacuity]
based_on:                       # the dated public incident; no code, never a working exploit
  incident: "PutnamBench issue #361: a readability refactor ..."
  date: "2026-10-12"            # quoted
  date_marks: "the issue was opened"
  source: https://github.com/trishullab/PutnamBench/issues/361   # a URL or a repository path; a list is fine
cases: [ ... ]                  # the pair: one sound member, one flawed member (section 3)
variants: [ ... ]               # variant pairs (section 4), or {pending: {lands: W2-T13}}
```

`variants: {pending: {lands: <task>}}` is allowed only on the anchors spine section 6 ships without variants (AUD-2.1 to AUD-2.4 and AUD-5.3 in revision 3). Every other anchor lists variant pairs, and its class needs six structurally different flawed exemplars across the pool before GATE-audit is green.

## 3. A case

Every case, pair member or variant, has these fields:

| Field | Rule |
|---|---|
| `id` | lower case, digits, hyphens; unique in the anchor. The case's ref is `AUD-n.k/<id>`, the ref of its audit events. Learners never see it before filing; the Desk numbers cases in a seeded order |
| `key` | `none` for a sound case; `G4`, or `{class: G6c, also: [G6d]}` for a flawed one. `also` is the rest of the acceptable set (AUDIT-DESK 2.4). Write `class`, never `primary` (GATE-kc reads `primary` as a KC tag) |
| `description` | the agent's description of its change, shown with the diff (step 2); the same words for both members of a pair |
| `statement` | the statement alone, shown at step 1: a theorem, a query, a property, a policy, a plan |
| `diff` | the agent's change, as a unified diff, shown at step 2. Where a construction must not ship (AUD-2.3), stand a labelled `⋯` line in for it |
| `receipt` | verdict lines **copied** from a run's log, never typed. The build warns on a line that is not a verdict line of `receipt_run` |
| `receipt_run` | optional: the run the receipt is copied from; defaults to `restatement.run` |
| `restatement` | `{run, scenarios}`: step 3's multiple true/false. Each scenario is `{id, text, answer, key_line, why}`; `answer` (true or false) answers the anchor's `scenario_question` and `key_line` is the verdict line of `run` that sets it. At least three scenarios; both members of a pair use the same scenario texts |
| `evidence` | flawed: `{type, load_bearing}`, the type from the class's row in AUDIT-DESK 6.3 (`declaration`, `identifiers`, `verdict-line`, `witness`, `paired-states`, `scenario`) and 1 to 3 load-bearing lines as `statement:N`, `diff:N` or `receipt:N` (1-based, non-blank). A line-anchored type needs at least four selectable lines in the case. Sound: `{type: restatement, scenarios: *alias}`, a YAML alias of the restatement's scenario list (GATE-audit reads a sound case's evidence there) |
| `key_run`, `key_lines` | the run that sets the key, and the verdict lines in it that carry it: a line, or `{config, line}` for a run with configurations. A key line matches with no letter or digit touching either end, so `sat` never matches inside `unsat`. On a pair member the key run should be one spine 6.2's Key run cell names |
| `explain` | what the key means, shown after filing beside the key |
| `pair`, `operator`, `artifact`, `medium`, `claim` | variants: `pair` (required) groups a flawed form with its matched sound form, `operator` is one of the 25 slugs of the gate's README section 3. All default to the anchor's on members |
| `rekey` | `{pending: {engine, lands}}` on a case whose engine has no keying lane yet (GATE-audit's battery skips it) |

Rules that hold for every case:

- **Every key, answer and receipt line comes from a recorded run** under `runs/`, copied from its log. No language model keys a case or grades a finding, now or at run time.
- **No cue in the text.** The two members of a pair share the claim, the description, the scenario texts and the shape of the diff, and differ in one place. A query tag that reaches a receipt is neutral (`q1`…`q6`, not `sound`). Diff sizes should match too: GATE-audit-blind's advisory longest-diff strategy reads them.
- **Words.** The agent's text is quoted and never stamped. No bare "verified", "safe", "proven" or "guaranteed" outside the agent's quoted claim. Every tool number in a `why` or `explain` is the run's own.
- **No exploit code.** A "based on" card cites; a case shows the option or verdict line that carries a trust gap, never the construction.

## 4. How the Desk uses a case

| Step | Shows | Graded by |
|---|---|---|
| 1 Call the statement alone | `claim`, `requirement`, `statement` | the call (sound or a gap) and a confidence, kept on the audit event as calibration, never credit |
| 2 Read the change | `description`, `diff`, `receipt` with `receipt_run` | nothing |
| 3 "This proves: ___" | a free line (kept, never graded), then `scenario_question` over `restatement.scenarios` | each answer against `answer` |
| 4 Name the kind of gap | G1 to G13 grouped by defeater kind, and "none: sound"; nothing preselected | the named class against the key's acceptable set, rolled up to G1-G13 |
| 5 Point at the lines | every non-blank line, 1 to 3 selectable | at least one selected line in `load_bearing` (the stand-in for every evidence type until the instruments replay witnesses) |

A finding writes one `audit` event: ref `audit:AUD-n.k/<id>`, `itemRev` the case's fingerprint, `conf`, `ok`, `provenance` (own, or assisted when "I had help" is ticked), `exposure`, `resp` (call, proves, scenarios, named, lines) and `data` (surface, sitting, position, size, truth, primary, acceptable, the grade). Audit accuracy is derived from own, unseen events at read time.

## 5. Recording a key run

Follow `runs/README.md` section 3. The example anchors' runs are recorded by `node content/audit/tools/record-keys.mjs`: each configuration runs in `statespace-bench@sha256:701be043…` with `--network none --memory=6g` on a scratch copy of `runs/<RUN-id>/inputs/`, writes its log to `runs/<RUN-id>/<config>.log`, and the record's verdict lines are filtered from that log. Then run `node scripts/runs/build-index.mjs`. For a new anchor, add its inputs under `runs/<RUN-id>/inputs/` and a function to the recorder (or a recorder of its own), and quote the run's lines in the case. Print neutral query tags so receipt lines carry no key.

| Anchor | Key runs |
|---|---|
| AUD-1.1 | members: RUN-z3-vacuous-unsat (the spine's); receipts, variant pairs v1 and v2, every scenario: RUN-z3-vacuous-variants (Z3 5.3.1 in the Bench) |
| AUD-2.3 | both members, receipts and scenarios: RUN-lean-skipkernel-pair (Lean 4.35.0 in the Bench) |

## 6. Open items

- AUD-2.3 is keyed by RUN-lean-skipkernel-pair, which the spine's Key run cell does not name yet (it names the imported RUN-lean-skipkernel, which has no argv); GATE-audit reports a `key-run` finding until the cell names the new run.
- G2 has three exemplars; six need W1-T33's further AUD-1.1 variants.
- GATE-audit cannot re-key any case until GEN-spot-the-gap's battery exists (W1-T25).

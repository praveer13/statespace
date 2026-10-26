# W1-T40: GATE-audit and GATE-audit-blind

**Status:** built by W1-T40. **Date:** 2026-10-26 (machine clock). **Runs:** [X RUN-audit-gate] and [X RUN-audit-blind-gate]. Spine section 9.5 registers no run for this task, and neither ID is in `packages/ids/proposals.json`, because GATE-links fails a proposal that no scanned document uses; the first scanned document that cites one (the W1 exit record, say) adds it, and the next spine revision registers or declines it.

Two gates over the audit pool (spine sections 6 and 11.2; `docs/AUDIT-DESK.md` sections 2 to 7). **GATE-audit** (nightly) checks that every anchor and variant builds or runs with its key, key run, class, typed evidence and "based on" card, that each class whose anchors have shipped has six exemplars, and that every shipped Clearinghouse family still separates its baselines. **GATE-audit-blind** (fast) asks whether a learner who never reads a case could beat chance on any figure the Desk reports, and prints the bound its pass carries.

Neither the pool nor the code the gates drive exists yet: AUD-1.1 to AUD-1.3 arrive with W1-T33, the five run-keyed anchors with W1-T34, the keying battery with W1-T25, the Desk's composer and scorer with W1-T32, the Clearinghouse with W3-T14. All of them depend on this task, so this README is also their contract: sections 3 to 6 say what each must provide for the gates to check it. Until each exists the gates say so, and the self-checks run both gates end to end on a fixture pool shaped like W1's.

## 1. What is here

| Path | What it is |
|---|---|
| `scripts/verify-audit.mjs` | GATE-audit: the pool's contract, the keying battery through the engine ports, the exemplar count, the Clearinghouse families, the report and the self-check |
| `scripts/verify-audit-blind.mjs` | GATE-audit-blind: the simulation, the strategies, the verdicts, the bound, the report and the self-check |
| `lib/pool.mjs` | the pool contract: reading `content/audit/`, the vocabulary (classes, evidence types, operators), every rule GATE-audit applies, and the simulation's view of a case |
| `lib/blind.mjs` | the published paths, which cases are served where, the reference composer and scorer, the strategies, the permutation nulls, the verdicts, the stage-only floor and the bound |
| `lib/fixtures.mjs` | the W1-shaped fixture pool (each S1 anchor with six structurally distinct variant pairs), a stand-in keying battery on the generator framework's box engine, a stand-in for the Desk's scorer (`fixtureAuditFigures`), stand-in Clearinghouse families, re-served blocks and a stand-in world's own incidents (`fixtureWorldIncidents`) |
| `calibrate.mjs` | measures the verdict rule's false alarms on a valid pool, its power on two planted cues, and the noise inflation behind the bound's detection threshold (sections 7.4 and 7.5) |
| `mutants.mjs` | weakens each rule of the two gates in turn, in a scratch copy, and runs that gate's self-check, which must fail (section 9) |
| `record.mjs` | records the two runs |
| `*.test.mjs` | the tests |

The helpers live here because W1 gives a task its own `scripts/spikes/<task>/` folder and CI depends on them, as it depends on `scripts/spikes/W0-T04/`; a later task may move them.

## 2. Running them

```
node scripts/verify-audit-blind.mjs               the fast lane
node scripts/verify-audit-blind.mjs --strict      the three proposed strategies of AUDIT-DESK 7.2 block too
node scripts/verify-audit-blind.mjs --verbose     every test with its observed figure, chance, SD and advantage
node scripts/verify-audit-blind.mjs --json        the report, with the bound and the stage-only floor for SCR-assurance
node scripts/verify-audit-blind.mjs --self-check  plant faults; the gate must fail on each

node scripts/verify-audit.mjs                     the nightly lane
node scripts/verify-audit.mjs --only AUD-1.1      only these anchors
node scripts/verify-audit.mjs --strict            pending re-keys, pending variants and an empty pool fail too
node scripts/verify-audit.mjs --ports MODULE      an engine port provider (also STATESPACE_GENERATOR_PORTS)
node scripts/verify-audit.mjs --self-check

node --test scripts/spikes/W1-T40/*.test.mjs      the tests (about a minute)
node scripts/spikes/W1-T40/mutants.mjs            every rule weakened in turn; its gate's self-check must fail (a quarter of an hour)
node scripts/spikes/W1-T40/calibrate.mjs          the numbers of sections 7.4 and 7.5 (4 to 7 minutes)
node scripts/spikes/W1-T40/record.mjs             record the two runs
```

Both exit 0 when green, 1 on a finding and 2 when they could not run. `--root DIR` points either gate at another tree (the tests do). GATE-audit-blind's last line is its verdict and its bound, which is what the lane runner prints for the step.

## 3. The pool: `content/audit/AUD-n.k.yaml`

One file per anchor, named after its ID (YAML or JSON; files starting with `_` are ignored). An anchor is a matched pair plus its variants (AUDIT-DESK 3 and 4). The example is shortened from the fixture in `lib/fixtures.mjs`; its texts are stand-ins, not the shipped case.

```yaml
id: AUD-1.1
stage: S1
class: G2                     # spine 6.2's class; "none" for a sound anchor (AUD-4.2)
medium: z3py                  # with artifact and operator, what makes an exemplar distinct
artifact: guarded-transfer
claim: "unsat, therefore safe."   # the agent's claim; one phrase bank for a pair
scheduled_after: [LAB-1.3]    # labs, lab stages or lessons; at least one lab or lab stage of the stage
kcs: [KC-1.non-vacuity-check, KC-1.implication-vacuity]
based_on:
  incident: "PutnamBench issue #361: a readability refactor made the hypotheses inconsistent"
  date: "2026-10-12"
  date_marks: "the issue was opened"      # spine 6: the card says which event each date marks
  source: https://github.com/trishullab/PutnamBench/issues/361   # a URL or a repository path; a list is fine
cases:                        # the pair's members: at least one sound and one flawed
  - id: sound
    key: none
    statement: |
      a, b, amount = Ints('a b amount')
      s = Solver()
      s.add(a >= 0)
      ...
    diff: "+s.add(amount <= a)"
    receipt: "[cl11_violation] unsat"
    evidence: { type: restatement, scenarios: [{ text: "..." }, { text: "..." }, { text: "..." }] }
    key_run: RUN-z3-vacuous-unsat
    key_lines: ["[cl11_premises] sat"]
  - id: flawed
    key: { class: G2, also: [G1] }
    statement: |
      ...
    evidence: { type: declaration, load_bearing: ["statement:6", "statement:7"] }
    key_run: RUN-z3-vacuous-unsat
    key_lines: ["[max0_guarded_premises] unsat"]
variants:                     # a list; {pending: {lands: W2-T13}} only on an anchor spine 6 ships without variants
  - id: v1-flawed
    pair: v1                  # the flawed form and its matched sound form share a pair
    operator: add-contradictory-hypothesis
    artifact: guarded-transfer-1
    key: { class: G2, also: [G1] }
    generator: { template: t1, band: 1, seed: 0x1000 }   # optional: GEN-spot-the-gap regenerates the texts
    statement: |
      ...
    evidence: { type: declaration, load_bearing: ["statement:6", "statement:7"] }
  - id: v1-sound
    pair: v1
    operator: add-contradictory-hypothesis
    key: none
    ...
```

**Fields of a case** (a member or a variant):

| Field | Rule |
|---|---|
| `id` | lower case, digits and hyphens; unique in the anchor; the case's reference is `AUD-n.k/<id>`, which is what an `audit` event's ref names (`audit:AUD-{n}.{k}/{variant}`, event@1) |
| `key` | `none`, a class (`G4`), or `{class, also}`; the acceptable set is the class plus `also` (AUDIT-DESK 2.4). The field is `class`, never `primary`: GATE-kc reads `primary` as a KC tag key in every content record |
| `statement`, `diff`, `receipt` | the texts the Desk shows (AUDIT-DESK 5.4); the statement is required. A line reference is `statement:N`, `diff:N` or `receipt:N`, 1-based |
| `evidence` | `type`: one of the class's types (table below); `load_bearing`: the 1 to 3 lines that carry the class, for every flawed case; `reference`: the artifact from the key run (a witness, a pair, a scenario) for the artifact types; a sound case's evidence is its `restatement` with at least three `scenarios` |
| `key_run`, `key_lines` | required on pair members, optional on variants: an executed run on disk and the verdict lines in it that carry the key, each a line or `{config, line}`. A key line matches when it occurs in a verdict line of the run (or of that configuration) with no letter, digit or underscore touching either end, so `sat` never matches inside `unsat` |
| `rekey` | `{pending: {engine, lands}}` on a case whose engine has no lane yet (the Lean and TLC anchors of W1): the battery skips it, its key lines stand in, and the gate fails the declaration once a port for that engine exists or the tracker marks `lands` done |
| `pair` | variants: required; members share `AUD-n.k/pair` unless they name another |
| `operator` | variants: one of the 25 slugs below; members: `anchor` unless they name one |
| `medium`, `artifact`, `claim` | default to the anchor's; a pair's members carry one claim |
| `generator` | optional on variants: `{template, band, seed}`; the battery's `regenerate()` must reproduce the texts |

**Evidence by class** (AUDIT-DESK 2.2, 2.3 and 6.3; a subclass not listed takes its parent's row). The line-anchored types are declaration, identifiers and verdict line; a case with one of them needs at least four selectable lines, so that selecting every line cannot validate it.

| Class | Evidence | Class | Evidence |
|---|---|---|---|
| G1 | scenario | G6d | verdict line or declaration |
| G1a | declaration or scenario | G7, G9, G13 | witness |
| G2 | declaration | G8 | witness or identifiers |
| G3, G4 | witness | G8a | identifiers or declaration |
| G3a, G10 | paired states | G8b, G8c, G8d | declaration |
| G5 | verdict line | G11 | verdict line or witness |
| G6 (G6a, b, c, e) | declaration | G12 | scenario |

**Operators** (spine 6.2 Variants; AUDIT-DESK 4.1 and 4.2). A flawed variant's class must be one its operator can key:

| Slug | Spine's words | Classes |
|---|---|---|
| `drop-parentheses` | drop parentheses | G2, G1, G12 |
| `swap-quantifiers` | swap ∀ and ∃ | G1, G12 |
| `change-arithmetic` | ℤ → ℕ or BitVec 64 | G4 |
| `add-contradictory-hypothesis` | add a contradictory hypothesis | G2 |
| `move-conclusion-into-premise` | move the conclusion into a premise | G8 |
| `insert-native-decide-or-sorry` | insert `native_decide` or `sorry` | G6 |
| `weaken-postcondition` | weaken a postcondition | G1, G8 |
| `drop-frame-conjunct` | drop a frame conjunct | G8, G1 |
| `drop-or-misplace-fairness` | drop or misplace fairness | G7 |
| `split-atomic-action` | split an atomic action | G9 |
| `widen-or-narrow-observer` | widen or narrow the observer | G10 |
| `change-isolation-level` | change an isolation level | G6, G7, G9 |
| `replace-proof-by-single-db-test` | replace a proof by a single-database test | G11 |
| `stamp-bounded-inductive-as-proof` | stamp a bounded inductive check as proof | G5 |
| `report-inconclusive-as-verdict` | report an inconclusive result as a verdict | G5 |
| `drop-verification-step` | drop a verification step and keep the claim | G6 |
| `redefine-or-stricter-copy` | redefine a definition the statement uses or point the theorem at a stricter copy | G8 |
| `edit-code-to-fit-proof` | edit the code so that a proof goes through | G8, G13 |
| `restate-property-kind` | restate an "eventually" property as an invariant or a pair property as a single-trace property | G3 |
| `pin-affected-version` | pin an affected engine version | G6 |
| `drop-declassification` | drop a declassification | G12 |
| `drop-environment-assumption` | drop an environment assumption other than fairness | G7 |
| `reorder-effects` | reorder two effects in the implementation | G8 |
| `drop-non-functional-requirement` | drop a non-functional requirement | G1 |
| `edit-pinned-statement` | edit a pinned statement file or `comparator.json` | G8 |

**What GATE-audit checks on the pool.** The anchor: its ID is the file's and the registry's, its stage is the spine's, its class is spine 6.2's, at least one case is keyed by a run of 6.2's Key run cell, it is scheduled after a lab or lab stage of its own stage, its KCs are the registry's, and its "based on" card has an incident, a quoted date, the event the date marks and a source that is a URL or a path in this repository, with no code in it. The pair: a sound and a flawed member, a flawed member keyed with the anchor's class, one claim per pair. Every case: a valid key, typed evidence of the class's type with its lines and artifact, a key run on disk that states every key line, an operator that can make its class. Variants: listed, each pair with its flawed form and its matched sound form (an empty list is a finding), or pending with a tracker task that is not done, and only on an anchor that spine section 6 ships without variants. In revision 3 those are AUD-2.1 to AUD-2.4 and AUD-5.3, "keyed only by executed runs ... without generated variants"; the gate reads the list from that sentence, so a pending declaration on any other anchor, AUD-1.1 to AUD-1.3 included, is a finding.

**Exemplars.** A class whose anchors have shipped needs six exemplars: flawed cases, counted under their class rolled up to G1 to G13, each of which "differs structurally from the class's other cases (a different operator, artifact or medium), not one with re-seeded constants" (AUDIT-DESK 4). In pool order, a flawed case counts as a new exemplar only when two things hold: its label (operator, artifact and medium) is new for the class, and its statement, diff and receipt differ from every exemplar already counted there once white space is collapsed and every numeric literal is replaced by a placeholder (`lib/pool.mjs`, `structureOf`). The literals are decimal, hexadecimal, binary and octal numbers with the unary minus that stands before one (`-3`), digit groups such as `5_000_000`, Rust type suffixes such as `7u64`, SMT-LIB's bit-vector literals such as `#x07` and `(_ bv7 64)`, and the bounds of a range such as `1..10`; a projection such as `(transfer a b amt).1` is structure and stays. A case with a new label and a counted exemplar's texts is a relabeled or re-seeded copy: an `exemplars` finding that names the exemplar it repeats, and no exemplar. A case with a counted label is another case of that exemplar: no exemplar, and no finding. An anchor has shipped unless its variants are declared pending and spine section 6 ships it without variants. An anchor with an empty, missing or malformed `variants` field, or with a pending declaration the spine does not allow, counts as shipped, so its class needs its six as well as failing on the field. A class all of whose anchors may wait waits, and the report names each anchor's task: in W1, G1 (W2-T13), G6 and G8 wait, while G2, G4 and G5 need six.

**Levels.** A problem that the simulation cannot run without (a key, a pair, the stage, the statement, evidence lines on four or more lines, scheduling) is a *shape* problem, and GATE-audit-blind fails on it in the fast lane; the rest only GATE-audit enforces, nightly.

## 4. The keying battery: GEN-spot-the-gap (W1-T25)

GATE-audit imports `packages/generators/src/spot-the-gap/index.ts` and uses:

```ts
export const auditBattery: {
  engines: string[]                                   // the engines its checks consult
  key(c: AuditCase, port: EnginePort): Promise<AuditKey | Discard>
  regenerate?(anchor: AuditAnchorView, ref: { template: string; band: number; seed: number }): { statement: string; diff: string; receipt: string }
}
export const ports: Record<string, EnginePort>        // engines it runs as plain code, as every family may

interface AuditKey {
  primary: string            // the class the battery computes ('G6a', 'G2', ...) or 'none' for sound
  also: string[]             // the rest of the acceptable set (a flawed key)
  evidence: { type: string; load_bearing: string[] }  // a flawed key: the lines it recomputed (the unsat core for G2)
}
```

`AuditCase` is plain data: `ref`, `id`, `kind`, `anchor` (`id`, `stage`, `class`, `medium`, `artifact`, `claim`), `key`, `statement`, `diff`, `receipt`, `evidence` (as the gate read it: `type`, `loadBearing`, `reference`, `scenarios`), `keyRun`, `keyLines`, `operator`, `pair`, `medium`, `artifact`, `claim`, `generator`, and `raw`, the case's YAML object, where a case may carry what the battery needs (a `check:` block with the query, the budget, the requirement predicate). The battery runs AUDIT-DESK 4.3's eight steps in order through the port; a discard (`{discard, cause}`, the generator framework's) means a check returned `unknown`, and the gate fails on it. The gate compares the battery's class, acceptable set, evidence type and load-bearing lines with the case's, exactly: a case that claims more than the battery computes (another acceptable class, another load-bearing line, a flaw where the battery finds none) fails as one that claims less does. The ports come from the family's `ports`, from `--ports`, from `STATESPACE_GENERATOR_PORTS` and from `scripts/conformance/z3-pyodide-native.mjs` when it exists, as for GATE-generators. `lib/fixtures.mjs` has a stand-in that keys G2 and sound cases by running the box engine (the premises, their smallest unsat subset, the violation) and reads the other classes from a recorded verdict; it exists to test the gate.

**The key's shape.** Every key carries `primary`, a class or `none`. A flawed key also carries `also` and `evidence` with its `type` and its `load_bearing` lines, under exactly those names. An empty `load_bearing` says the battery recomputes no lines for that class, and the lines are then not compared; a G2 key always lists them, because a G2 case's load-bearing lines are its premises' unsat core, recomputed by Z3 (AUDIT-DESK 6.3). The gate checks the shape before it compares anything, and a key that leaves a field out, spells it otherwise or gives it in another form is a `battery` finding: `loadBearing`, the spelling of the evidence the case arrives with; evidence without its `type`, or `null`; lines that are not text, such as numbers; `class` for `primary`, or an empty `primary`; `also` as text, or with entries that are not class names. Read as agreement, such a key would let a wrong line, type or class through unseen.

## 5. The composer and the scorer: the Desk (W1-T32)

GATE-audit-blind drives the Desk's own composer and scorer (AUDIT-DESK 7.1). It imports `packages/learner/judgment/index.ts`, in W1-T32's folder. If `packages/learner/package.json` exports `./judgment` (what the site imports), it imports that file instead, and as a last resort `packages/learner/src/judgment/index.ts`. It uses:

```ts
export const AUDIT_SURFACES: Array<'desk' | 'today' | 'part-c' | 'clearinghouse'>   // what the composer implements
export function composeAuditSitting(args: {
  surface: 'desk' | 'today' | 'part-c'
  cases: SimCase[]           // the cases eligible at this point of the path (for part-c, the Defence stage's only)
  topic: string              // the stage most recently completed
  stagesDone: string[]       // the stages completed so far, in order
  size: number               // desk 5, 6 or 8; part-c 4; today a block of 10 serves
  seed: number               // uint32
}): number[] | null          // indices into `cases`, in the order served; null when the pool cannot fill it
export function auditFigures(decisions: Decision[]): Array<{ id: string; kind: 'decision' | 'class'; value: number | null; n: number }>
```

A `SimCase` has `id`, `anchor`, `stage`, `pair`, `truth` (`sound` or `flawed`), `top` (the class, G1 to G13), `acceptableTop`, `evType`, `selectable`, `loadBearing` (a count), `diffLines`, `medium` and `scheduledAfter`. A `Decision` has `case`, `truth`, `primary`, `acceptable`, `pick` (`gap` or `sound`), `named`, `evidenceValid`, `restatementAnswered`, `surface`, `sitting` and `position`. `auditFigures` must be pure: the gate calls it tens of thousands of times per run with the same objects, their picks changed. It scores every decision it is given. AUDIT-DESK 6.4's selection (own, unseen, unassisted, post-instruction decisions only) is made before the call; every decision the gate simulates is one that counts, though a stream serves each case many times, so a scorer that dropped repeated cases by id would show too few figures and fail the required-figures check below. The gate tests every figure it returns that has a finite value, decision figures against the permutation across the stream and class figures against the permutation within each stage, and fails when a constant strategy's `ba` is not exactly 0.5.

**The figures the Desk must show.** AUDIT-DESK 7.3 asks the gate to test every figure the Desk shows, at the n its display uses (6.5), so `auditFigures` returns each of these with a finite number as its value, under exactly these ids, whenever its rule applies to the decisions it is given (a value of `null` or `NaN` is a figure left out):

| Id | Shown |
|---|---|
| `tpr`, `tnr`, `ba` | on every stream that holds flawed and sound decisions (`tpr` once one is flawed, `tnr` once one is sound) |
| `part-c-pass` | on every Part C stream |
| `recall:Gk` | once ten decisions of primary class Gk are counted (spine 6: per-class figures appear at n ≥ 10) |
| `precision:Gk` | once Gk has been named ten times |
| `recall-macro` | once any `recall:Gk` is due (the row above) or shown |

The gate checks every observed scoring, one per strategy and stream, and a required id that the scorer leaves out is a `scorer` finding naming the id, the streams and the strategies. A figure left out, or renamed (v1's figure reported as `balanced-accuracy` in place of `ba`, say), would otherwise drop out of the tests unseen, and the constant-strategy check on `ba` would have nothing to read. Further figures may carry other ids; each is tested against the null of the kind the module gives it.

Which null a figure is tested against is the gate's call. An id in section 7.2's list keeps the gate's kind, whatever kind the module gives it. So the Part C pass rate stays under the within-stage null of decision 5 even when the module files it with the decision figures, as AUDIT-DESK 7.4 lists it, and `precision:none` stays a decision figure even when the module reports it like a class (AUDIT-DESK 6.2); the report notes each difference. A new id takes the module's kind, which must be `decision` or `class`. A figure the module shows but the gate formed no null for (another kind, or a figure shown for the observed picks and never for permuted ones) would drop out unseen, so it is a finding.

Every sitting the composer returns is checked: eligible cases, the size asked, no case twice, the sound share (AUDIT-DESK 5.2) and pairs apart (5.3). A null says that no sitting keeps those rules, and the gate checks that too, because a sitting the composer declines is never checked and the gate would otherwise report green over it. For every null, the gate asks its reference composer for the same sitting: the same eligible cases, size, topic and seed. If the reference composes a sitting that keeps every rule above, the sitting could be filled, and the null is a `composer` finding, however few such nulls there are: a single declined sitting fails the gate. The finding gives the path, the surface, how many of the sittings asked for were declined and the first one, and says when nothing on that surface was checked at all. Only a sitting the reference cannot fill either gets the note "could not compose". In the same way, every anchor family offered in the sittings the composer filled must be served at least once on each path and surface (AUDIT-DESK 5.3 weighs the families; the gate takes it that no offered family's weight is zero, decision 14): a family it never serves is a `composer` finding, because its cases would go unchecked there. Neither check applies to the gate's own reference composer. For a surface the module does not list, and until the module exists, the gate uses its reference composer and scorer and says so in its first line. Five things fail the gate instead of letting it fall back without a word: a module without this contract (`AUDIT_SURFACES` included), an `AUDIT_SURFACES` entry that is not one of the gate's surface names (`Desk` for `desk`, say), a composer listed for none of `desk`, `today` and `part-c` (the gate would never drive it), a judgment folder (`packages/learner/judgment/` or `packages/learner/src/judgment/`) without the module, and a `./judgment` export that names a missing file. `lib/fixtures.mjs` has a stand-in `fixtureAuditFigures` that computes the reference figures from the decision objects; the self-check and the tests drive the gate through it.

## 6. The Clearinghouse (W3-T14)

Both gates read `apps/instruments/src/engines/clearinghouse/audit.ts` once it exists:

```ts
export const auditFamilies: Array<{ id: string; bar: number; seeds: number[]; score(policy: 'naive' | 'reference', seed: number): number }>
export function auditIncidentBlocks(seed: number, blocks: number): Incident[][]
```

GATE-audit re-executes every family on its recorded seeds, twice: the scores must repeat, the naive baseline's mean over every recorded seed must stay below the bar (a mean at the bar "meets" it and fails) and the reference's must reach it (spine 11.2). GATE-audit-blind asks for 60 blocks of served incidents per replicate stream and adds a `clearinghouse` stream. What `auditIncidentBlocks` returns is checked before it is read: the blocks asked for, each a non-empty list. Nothing, fewer blocks or an empty block is a `clearinghouse` finding, because the world's incidents would otherwise go untested while the gate reported green, as if no Clearinghouse had shipped. An `Incident` is a case in section 3's form plus `stage`, a stage ID (S1 to S10; a lesson such as `S1.L2` is a finding), and `family` (`id`, `key`, `evidence`, `statement`, `diff`, `receipt`, `pair`), and each is read with the pool's own rules for a case's shape (section 3's `shape` level: a valid key, a statement, evidence of its class's type with one to three load-bearing lines of its own texts, four selectable lines for line-anchored evidence); one that breaks them is left out with a `clearinghouse` finding. On that stream the strategies know the base rates of the incidents it serves; on the paths they know the pool's only, and the stage-only floor is the pool's, so the world's incidents never move a path stream's verdicts or the floor however many replicates bring them (decision 12). Harvested bundles (W5-T11) would join the same way, as their own surface.

## 7. GATE-audit-blind

### 7.1 Streams and strategies

The paths are the two of spine section 3.0, read from `content/stages/budget.yaml`, block by block. After each block the eligible cases are those whose `scheduled_after` units are all done (a lab is done when its non-stretch stages are), the topic is the block's stage, and the gate composes Desk sessions (8 each of 5, 6 and 8 cases), Today blocks (12 of 10 serves) and, where the block holds the stage's Defence, Part C draws (60 of 4 cases from that stage's pairs). One surface on one path is a stream. A case never served on a path is a finding, because it is never checked; so are a sitting the Desk's composer declines where the reference composer fills it, and a family it never serves on a surface (section 5).

| Strategy | Rule | Status |
|---|---|---|
| always-reject | flag every case, naming the pool's most frequent class, with up to three lines chosen at random | blocking (spine 6) |
| always-accept | "none: sound" on every case | blocking |
| last-is-sound | accept the last case of each sitting, flag the rest | blocking |
| topic-is-class | flag every case with the most frequent class of the sitting's topic stage (else of the latest completed stage that has one) | blocking |
| fill-the-floor | in Part C, accept the last case when every earlier one was flagged | advisory; blocks under `--strict` |
| stage-majority | accept a case when its stage is majority-sound in the pool | advisory |
| longest-diff-is-flawed | flag cases whose diff is longer than the sitting's median | advisory |

A flag names the pool's most frequent class unless the rule names another. Every base rate a strategy reads (the most frequent class, each stage's, whether a stage is majority-sound) is that of the cases its stream serves from: the pool's on the Desk, Today and Part C streams, the served incidents' on the Clearinghouse stream. The advisory strategies are tested on decision figures only: their rules decide flag or accept, and on class figures a diff size that tells one anchor family from another would read as a cue their rule does not claim. For Today and the Clearinghouse a sitting is the block of 10 serves.

### 7.2 Chance and the figures

The reference scorer computes the figures of AUDIT-DESK 6.2 and ASSESSMENT.md 3.7 for each stream: `tpr`, `tnr`, `ba` and `precision:none` (decision figures), and `tpr-correct`, `ba-correct`, `recall:Gk` and `precision:Gk` once their n reaches 10, `recall-macro` and `part-c-pass` (class figures). Chance is section 7.4's permutation null with 1,000 permutations per strategy and figure: the picks permuted across the stream for decision figures, within each stage for class figures. What a permutation moves is a pick's decision and named class; the random line choice of a flagged case is drawn once per served slot and stays with the case. A finding is correct when its class is acceptable and the line choice hits a load-bearing line of a line-anchored type; an artifact type never validates blind, because a blind strategy supplies no witness. The stage-only floor (7.6) is computed on each path's Desk stream, over the pool's cases, and reported, never tested.

### 7.3 The verdict

For each strategy, stream and figure, the advantage is observed minus chance, averaged over 8 independent replicate streams, and the figure fails when that average exceeds 2 SD, the SD being one stream's: the square root of the replicates' mean permutation variance; the 1,000 permutations are split evenly across the replicates. With one replicate this is AUDIT-DESK 7.4's rule exactly. A constant strategy passes by construction: its picks survive every permutation, so chance equals the observed figure and the SD is 0.

### 7.4 Why the rule averages replicates

On the W1-shaped fixture pool, which is valid by construction, 92 tests per configuration can vary [X RUN-audit-blind-gate]. Under the single-stream rule each fails about 2.3% of the time by chance [D], and some blocking test failed in 49 of 100 seed configurations, the largest at 3.89 SD [X RUN-audit-blind-gate]; a gate that blocks merges on such a verdict fails valid pools at random and teaches authors to reroll. Under the gate's rule none of the 100 failed, and the largest advantage of any test was 1.16 SD [X RUN-audit-blind-gate]. Averaging keeps the 2-SD margin and the null and removes only the simulation's own noise. A pass therefore means that no blocking strategy's advantage, averaged over the 8 replicate streams, exceeded 2 SD of one stream. That is weaker than "no strategy's expected advantage exceeds 2 SD": the average has noise of its own, so a strategy whose expected advantage is exactly 2 SD passes about half the time. Section 7.5 says what the gate does catch.

Against planted cues, over 40 configurations each: a composer that moves a sound case to the last slot of a Desk session is caught in 3 when it does so in 5% of sessions, in 34 at 10% and in all 40 at 20%; a composer that serves the topic stage's most frequent class in every flawed slot it can fill is caught in 17 when it does so in 25% of sessions and in all 40 at 50% [X RUN-audit-blind-gate]. The single-stream rule flags 23, 36 and 40 of the position-cue configurations [X RUN-audit-blind-gate], but it also flags 49 of 100 configurations of the valid pool, so its extra flags at 5% are not evidence of power. At the top the averaged rule is the stronger: with the same allowance for a cue's noise (section 7.5), the single-stream rule catches an expected advantage with 95% probability only above 2 + 1.645 × 1.3 = 4.14 SD, against the gate's 2.76 SD [D].

### 7.5 The bound

The last line prints the pool's size, the streams' length and two thresholds (AUDIT-DESK 7.7; I10), each with its widest value among the blocking tests that could vary, on BA, recall averaged over classes and the Part C pass rate:

- **What a pass establishes:** no blocking strategy's advantage, averaged over the 8 replicate streams, exceeded 2 SD of one stream.
- **What the gate catches:** an expected advantage above 2 + 1.645 × 1.3 / √8 ≈ 2.76 SD fails with probability 95% or more [D].

The second threshold rests on a normal approximation of the replicate mean, which `calibrate.mjs` checks [X RUN-audit-blind-gate]. Under the null, the replicate mean of a test's z spreads as 1/√8 predicts: by 0.354 on the valid pool, against 0.354, with a 95th percentile of 0.60, against 1.645/√8 = 0.58. Under a cue it spreads wider, because the cue's own realization varies from stream to stream. The test each planted cue moves most spread 1.18 to 1.23 times as widely as the null predicts under the position cue at 5%, 10% and 20%, and 1.07 and 1.06 times under the topic cue at 25% and 50% [X RUN-audit-blind-gate]. The threshold allows 1.3 times [D], the largest measured inflation rounded up; from the null's own noise alone it would read 2.58 SD, which overstates the gate's power. The self-check fails if the allowance falls below the largest inflation in the recorded calibration (`runs/RUN-audit-blind-gate/calibration.json`). With its measured spread, the approximation predicts those tests' failures closely: under the position cue at 10%, 30 of 40 observed against 31.5 predicted, and under the topic cue at 25%, 12 against 12.5 [X RUN-audit-blind-gate].

On the fixture pool the line reads [X RUN-audit-blind-gate]:

```
bound: 52 cases (26 sound, 26 flawed) in 8 anchors; 6 streams × 8 replicates of 480-1976 decisions, 1000 permutations per strategy and figure; a pass means no blocking strategy's advantage over chance, averaged over 8 replicate streams, exceeded 2 SD of one stream (at most +0.041 on ba, +0.016 on recall-macro, +0.013 on part-c-pass); an expected advantage above 2.76 SD is caught with 95% probability (at most +0.056 on ba, +0.022 on recall-macro, +0.017 on part-c-pass)
```

`--json` carries the same bound, with the inflation and the approximation it rests on, and the stage-only floor for SCR-assurance. Under `--strict` the advisory strategies count among the blocking tests. On the fixture pool the floor's recall averaged over classes is 0.238 on the default path and 0.262 on the builder's [X RUN-audit-blind-gate].

## 8. GATE-audit

The pool contract of section 3; then every case re-keyed through the battery (section 4), except those waiting for their engine's lane, whose executed runs key them meanwhile; listed variants regenerated from their generator reference when the battery exports `regenerate()`; the exemplar count; the Clearinghouse (section 6). A case the battery cannot run (no port for its engine, a thrown error) or discards fails the gate. On the fixture pool with the stand-in battery it re-keys 44 cases and leaves 8 to their runs [X RUN-audit-gate]; on the same pool without a battery it fails closed, naming W1-T25 [X RUN-audit-gate]. Its exemplar count there is G2 7, G4 7 and G5 8, each S1 anchor's seven flawed cases differing in label and in their texts beyond numeric literals; with AUD-1.2's variant pairs replaced by byte-identical copies of its pair v1 relabeled `copy-1` to `copy-6`, it fails with six `exemplars` findings, five copies repeating `copy-1` and G4 at two exemplars [X RUN-audit-gate]. With AUD-1.1's flawed member declaring lines that are not its unsat core, and a battery that returns each flawed key's lines as `loadBearing`, it fails on every flawed key whose evidence it cannot read, that member's included, instead of reading the missing lines as agreement [X RUN-audit-gate].

## 9. The self-checks and the mutants

Each gate's `--self-check` plants one fault at a time and fails unless the gate reports it. GATE-audit's has 136 cases, which cover every rule of the pool contract (section 3), the case as the battery receives it and the key's shape (section 4) and the gate's rules [X RUN-audit-gate]. GATE-audit-blind's has 73: the verdict rule, the bound and the SD it takes per figure, the strategies and the blind line choice, the base rates, the stage-only floor, the reference scorer's figures on hand-built streams and the scorer's checks, the figures the Desk must show and the n ≥ 10 rule, the streams of section 7.1 and the reference composer's draws, the composer's rules and its contract (section 5), the pool's shape problems, the module contracts and what the Clearinghouse returns (section 6) [X RUN-audit-blind-gate]. A case matches the finding's check and its text, so a fault that another rule happens to catch does not count for the rule under test. A rule that compares a count, a mean or a set is planted at its edge (decision 13). Examples: three selectable lines where four are needed, two scenarios where three are, four load-bearing lines, a Clearinghouse naive mean exactly at the bar, and a family whose first seed hides its mean. Acceptable sets and load-bearing lines are planted both wider and narrower than the battery's. The verdict is tested at 2.05 SD against 1.95, and at 2.1 against 1.9 root-mean SDs over replicates whose SDs differ, so that one pooling of the SD cannot pass for another, and over three replicates whose mean advantage fails where their median would pass; the composer at one sound case outside the share on either side, one serve over or under a Today block's size, and a single declined sitting. The value at an edge that passes has its own case too: exactly six exemplars, four lines, three scenarios, the last template, band and seed, a reference exactly at its bar, ten decisions of a class. The self-checks are hermetic. GATE-audit's reads a fixed W1 tracker for the five tasks the fixture names, and GATE-audit-blind's injects no Clearinghouse module, so their verdicts do not move as tasks close or W3-T14 lands. A fault that shows while composing or scoring (a broken sitting, a missing figure, a module without its contract) runs on one replicate of 50 permutations; the cues and the verdicts run on the gate's own configuration.

`mutants.mjs` checks the self-checks. Each mutant replaces one exact piece of a gate's source in a scratch copy, which weakens one rule that the gates' headers, this README or the spine name. Some mutants make a rule stricter instead, to show it is pinned from that side too: the verdict's mean over the replicates replaced by their maximum, and the mutants named `*-strict`, each of which fails a valid value at the edge of a rule (exactly six exemplars, three scenarios, a reference at its bar, an advantage just below 2 SD, ...). Examples are the six-exemplar threshold set to five, the battery's acceptable-set comparison made one-way, a battery key without evidence read as agreement, a Clearinghouse naive baseline allowed to meet its bar, the margin set to 3 SD, the SD pooled as the widest replicate's, always-reject removed from the strategies, a composer's nulls taken on trust and a single declined sitting tolerated. The harness then runs that gate's self-check, which must fail. All 271 mutants fail it: 143 of GATE-audit's and 128 of GATE-audit-blind's [X RUN-audit-gate] [X RUN-audit-blind-gate]. `gates.test.mjs` checks that every mutant still applies to the source and runs two of them end to end, so the list cannot fall out of step unseen. The list holds one plain weakening per rule and per edge (decision 13), not every weakening a rule admits. A mutant that would change nothing the gate prints is left out and named in the file: dropping the stage-only floor's own filter of the incidents, which `base.path` already makes redundant.

## 10. Decisions [D]

1. The pool format of section 3, including `key: {class, also}` (because GATE-kc reads `primary` as a KC tag), the line references, the 25 operator slugs and `rekey.pending`.
2. A class's six-exemplar count starts when one of its anchors has shipped. An anchor has shipped unless its variants are declared pending and spine section 6 ships it without variants; only those anchors (AUD-2.1 to AUD-2.4 and AUD-5.3 in revision 3) may declare their variants pending, and a class whose anchors all wait waits for its variants' task. Spine 6 and AUDIT-DESK issue 5 leave "shipped" open. What counts as an exemplar is AUDIT-DESK 4's definition made checkable: a flawed case counts only when its label (operator, artifact, medium) is new for its class and its statement, diff and receipt differ from every counted exemplar's once white space is collapsed and numeric literals are replaced; a new label on a counted structure is a finding (section 3).
3. Line-anchored evidence needs at least four selectable lines.
4. The replicate-averaged verdict (section 7.4), 8 replicates, the stream sizes of section 7.1 and the fixed seed `0x5ea7b11d`.
5. The Part C pass rate is tested against the within-stage null, though AUDIT-DESK 7.4 lists it among the decision figures: a Part C hit needs the right class and valid evidence, every draw comes from one stage, and under the full permutation topic-is-class (which in a Part C draw names the Defence stage's own class) gains from the stage alone, the effect 7.4 keeps out of class figures. On the valid fixture pool that advantage averaged 0.87 SD and reached 2.17 SD over 80 streams, past the 2-SD margin, so under the full permutation the gate would have failed this valid pool at least once; under the within-stage null it averaged 0 [X RUN-audit-blind-gate]. It grows with the streams' length.
6. Flagged cases name the pool's most frequent class unless a rule says otherwise; the blind line choice stays with the slot; artifact evidence never validates blind.
7. The three proposed strategies are advisory, tested on decision figures, and block under `--strict`.
8. The reference composer picks a family uniformly per slot (the simulation has no review schedule), caps the topic stage at half a session once two stages have cases, and prefers a case a Today block has not served.
9. A constant strategy's `ba` must be exactly 0.5: a scorer check, because the permutation null passes constant strategies by construction and so cannot catch v1's figure (AUDIT-DESK 1.4). For that check to have a `ba` to read, the Desk's scorer must show every figure AUDIT-DESK 7.3 lists under section 5's ids, at the n its display uses; a required id it leaves out is a finding.
10. Which null a figure is tested against is the gate's, not the scorer's (section 5), and a figure the gate can form no null for is a finding.
11. The bound prints two thresholds (section 7.5): what a pass establishes and what the gate catches with 95% probability. The second assumes a normal replicate mean with up to 1.3 times the null's noise, the largest inflation the calibration measured rounded up (section 7.5).
12. A blind strategy knows the base rates of the cases its stream serves from: the pool's on the Desk, Today and Part C streams, the served incidents' on the Clearinghouse stream; the stage-only floor is computed over the pool's cases. Spine 6's chance is what a strategy that knows only the pool's base rates scores, so the world's incidents, which would otherwise outnumber the pool by the gate's replicate count, never move a path stream or the floor.
13. Every rule the gates claim has a self-check case, and `mutants.mjs` holds one plain weakening of each, which must fail its gate's self-check (section 9). A rule that compares a count, a mean or a set is planted at its edge: one past the threshold and, where a value at the threshold passes, the threshold itself; a set equality from both sides; a statistic pooled over replicates on replicates that differ. The self-checks are hermetic (a fixed W1 tracker; no Clearinghouse module) and run their structural cases on one replicate of 50 permutations.
14. A composer the gate did not write is held to its contract where the gate would otherwise take its word (section 5): every null is checked against the reference composer asked for the same sitting, a single declined sitting being a finding, and every family offered in the sittings it filled must be served on each path and surface. The reference composer proves a sitting can be filled when it composes one, so the first check never fails a null where no sitting keeps the rules. The second assumes that a real composer, which AUDIT-DESK 5.3 has weigh families by review state and stage, gives no offered family a weight of zero.
15. What a module the gates did not write returns is checked at the boundary, before it is read: a battery's key carries every field section 4 names, under those names, a Desk module lists a surface its composer implements (section 5), and a Clearinghouse world returns the blocks asked for, each incident a case the pool's rules accept (section 6). A field, a surface, a block or an incident's shape left out is a finding, never agreement or an empty world.

## 11. Limits

- The gates run on a fixture pool today; the real pool, battery, composer and scorer are later tasks', and the gates have not met them.
- The blind simulation reads declared keys and line counts; GATE-audit (nightly) is what makes them trustworthy, so between a pool change and the next night the fast gate trusts the pool.
- Evidence validity for a blind pick is a model (section 7.2), not the engine's replay.
- The detection threshold of the bound rests on a normal approximation of the replicate mean. The calibration checks it on the fixture pool and on two planted cues, a position cue at three strengths and a topic cue at two [X RUN-audit-blind-gate], not on every cue a pool could carry.
- The exemplar rule compares texts once white space and the numeric literals of section 3 are set aside, so it catches relabeled and re-seeded copies, not every near-duplicate: two cases that differ by a renamed variable or a reworded comment count as distinct, and so do two that differ in a literal form it does not know (a Python complex literal such as `3j`, say). Whether such cases differ structurally is still the author's and the reviewer's judgment.
- `mutants.mjs` holds one plain weakening per rule, and one per edge of a rule that compares a count, a mean or a set. A weakening it does not list, of a rule it does, may still pass the self-check; the tests catch some of those, and no lane runs the self-checks, the tests or the mutants yet (the nightly steps are requested of the lane manifest's owner).
- The composer checks of section 5 compare a null with the reference composer's answer for the same seed, and the families served with those offered. The first is one-sided: a null where the reference composer, with that seed, finds no sitting either is noted, not failed, even if another draw would fill the sitting. A composer that serves every family but leans heavily on one would pass the second; the blind strategies are what test the sittings it does compose.
- The stage-only floor is computed with the reference scorer, even once the Desk's own scorer exists.
- The reference composer has no review schedule: its family weights are uniform, where the Desk's lean toward classes due.
- A pass bounds blind strategies, not every cue: a cue no strategy here exploits passes (AUDIT-DESK 7.5's cue ablation, W6-T06, is the complement).

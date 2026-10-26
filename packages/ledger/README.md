# @statespace/ledger: the evidence log

**Status:** built by W1-T03. **Date:** 2026-10-25 (machine clock).

The browser's only record is practice events (spine section 8.2; ARCHITECTURE.md section 7). This package is that record as pure TypeScript: the `event@1` record and its validation, the canonical conflict rule, merge, fold and digest, the codec, the read-time provenance weights, and the keep/kill experiment seed with the allocation, entry and read functions that W0-T07's rules need (spine section 12, item 58). It has no DOM, storage or network (the purity lint), so it runs the same on the main origin, in a worker and in Node. The IndexedDB adapter with its outbox and cross-tab sync is `apps/site/src/storage/`.

Nothing here stores a status. Every learner state (KC state, sign-off, settled, VRK30, Judgment, the Mirror, a keep/kill read) is derived from the log at read time (I2).

## 1. What is here

| Module | What |
|---|---|
| `src/event.ts` | `LedgerEvent` and `ExpSeedDraw` (generated from `schemas/event.schema.json`), the kind sets, `validateEvent`, `normalizeEvent`, `createEvent` (stamps id, v, at, tz, day and dev from an injected clock), and a ref's context (`itemContext`, `genOfRef`, `kcOfContext`) |
| `src/canonical.ts` | canonical JSON, code-point order, the structural limits of ARCHITECTURE.md section 5.6 |
| `src/log.ts` | the `Log` (events by id and the draws), `mergeLogs`, `resolveConflict`, `orderedEvents` and `foldLog`, `eventSetDigest` and `logDigest`, `previewMerge`, and the draw order (`governingDraw`, `supersededDraws`) |
| `src/codec.ts` | `encodeEvent`, `decodeEvent`, `encodeLog`, `decodeLog`, `snapshotOf` |
| `src/weights.ts` | `weigh`, `isFresh`, `isGenerated`, `WEIGHTS`: spine section 8.2's table |
| `src/expseed.ts` | `canDrawExpSeed`, `drawFor`, `createExpSeedDraw` |
| `src/time.ts` | exact instant comparison across offsets, civil-day arithmetic, `stampTime` |
| `src/sha256.ts` | SHA-256 and UTF-8, synchronous, tested against `node:crypto` |
| `src/keepkill/` | `@statespace/ledger/keepkill`: the rules snapshot, `allocate`, `entryOf`, `readComparison`, the arm records, the estimates and decisions, comparison 4's windows |
| `scripts/build-rules.ts` | writes `src/keepkill/rules.generated.ts` from `content/governance/keepkill-rules.yaml`; `--check` runs with the tests |

## 2. The record: `event@1`

`schemas/event.schema.json` is the one source; GATE-schema keeps the TypeScript and Python types in step and runs both validators over its fixtures (`schemas/fixtures/event/`). W1-T03 finished the first version before any event was written, reconciling it with spine section 8.2:

- `provenance` is `own`, `assisted` or `agent`. `automated` is a flag on receipts and claims only, never an event value.
- `view` is a kind: a drawer opened, logged as help-seeking, uncredited. Its ref is `view:D-{nn}`, and it is written with exposure `seen`.
- An `item` met outside practice names its context in its ref: `drawer:D-03/i2`, `placement:step-4`, `testout:KC-1.violation-as-sat`, `confirm:KC-1.violation-as-sat`, beside the practice form `item:GEN-{family}/{template}` (ARCHITECTURE.md section 7.2).
- `$defs/expSeedDraw` is the experiment-seed draw (section 6).
- An ungraded event omits `ok`, which ASSESSMENT.md section 2.1 writes as `null`; one representation keeps the canonical form unique.

The envelope fields are ARCHITECTURE.md section 18, item 9: `v` (the kind's shape version, 1 for every kind today), `tz` (minutes east of UTC) and `day` (the local date), frozen at write time so travel never rewrites history, and `dev` (the browser profile). `createEvent` takes the clock reading and its offset as inputs, never reading a clock itself.

A record is stored as the parse of its canonical form: undefined properties are dropped and `-0` becomes `0`; a value JSON cannot hold exactly (an infinity, which `JSON.parse` makes of `1e400`; a class instance) is refused.

## 3. Merge and the canonical conflict rule

The log is a set of events keyed by id (ASSESSMENT.md section 2.6; ARCHITECTURE.md section 7.5). Merge is set union. When two records share an id and differ, the one whose canonical JSON is smaller wins.

- **Canonical JSON** is RFC 8785's form for these values: object keys sorted by UTF-16 code units, no whitespace, strings and numbers as ECMAScript's `JSON.stringify` writes them.
- **Smaller** means in Unicode code-point order, which is also the order of the UTF-8 bytes, so another language can reproduce it [D]. It differs from JavaScript's `<` only between a supplementary character and U+E000 to U+FFFF.

The rule picks the minimum of a total order, so merge is commutative, associative and idempotent: a double import, a merge and a stale tab give identical logs (`test/log.test.ts`; `test/storage/store.test.ts` against the adapter). `previewMerge` classifies incoming records as added, duplicate or conflicting, and says which side the rule keeps, for SCR-settings' preview.

**Fold order** is by instant, compared exactly whatever offset each `at` carries, then by id in code-point order. `foldLog` and `orderedEvents` give every derivation the same order in every tab.

**Digests.** `eventSetDigest` is SHA-256 over the canonical JSON array of the events sorted by id, written `sha256:<hex>`; equal sets give equal digests. A derived view cached for first paint is trusted only beside the digest it came from (ARCHITECTURE.md section 7.6). `logDigest` covers the draws too.

## 4. Weights, applied at read time

`weigh(event)` returns the tier, the weight and what it counts toward, from spine section 8.2:

| Tier | When | Weight | Counts toward |
|---|---|---|---|
| fresh | own, unseen, and generated: an item, probe, Prove-it or audit with a seed | 1.0 | sign-off, settled, VRK30, Judgment, scheduling |
| authored | own, unseen, no seed: a first exposure to a fixed cell or anchor | 1.0 | Judgment, scheduling |
| practice | own, seen | 0.3 | scheduling |
| assisted | assisted | 0.3 | scheduling |
| agent | agent | 0 | nothing |
| uncredited | a lab check, receipt import, explain-back, note or view | 0 | nothing |

"Generated" is read from the seed: ASSESSMENT.md section 2.1 draws one for every generated instance and none for authored cells and audit anchors. Fresh events schedule as well (ASSESSMENT.md section 3.10). Which derivation reads which kind is that derivation's business; "until an unseen variant passes unassisted" belongs to the scheduler.

## 5. The codec

`encodeEvent` and `encodeLog` write canonical text. `decodeEvent` and `decodeLog` read outside bytes: JSON only, then each record held to ARCHITECTURE.md section 5.6's limits on its own (depth 64, 100,000 values, no `__proto__`, `prototype` or `constructor` key [D]), then `event@1`. `decodeLog` keeps the valid records and reports every refused one with its location, so an import preview can show them. The cap is per record, not per log: a long log legitimately holds more than 100,000 values in all, and its size is capped in bytes by whoever reads the file (16 MiB for an export bundle [D], section 5.6).

A log's portable form is `{ events, expSeeds }` (`snapshotOf`), which an export bundle (`bundle@1`, W1-T20) carries beside its envelope.

## 6. The experiment seed

The keep/kill rules (`content/governance/keepkill-rules.yaml`, common.experiment_seed) need one uint32, drawn once from the platform's cryptographic random source when the comparisons are turned on, before the first event is written, stored with the instant it was drawn and the rules' SHA-256, never redrawn, and carried in exports.

- **In the log.** A `Log` holds `expSeeds`, a set of `ExpSeedDraw` records, beside its events; merge joins them, the codec carries them and the adapter keeps them in the same database and outbox as the events.
- **Drawing.** `canDrawExpSeed(log)` refuses when a draw exists (never redrawn) or when any event exists (the switch comes before the first event); `drawFor` applies it. The app passes the random value in.
- **The merge rule.** `governingDraw` is the earliest draw, on equal instants the smaller value, on a full tie the smaller canonical JSON. A merge keeps every draw: units exposed under a superseded draw are deviations, left out of every estimate, and a read must see them to leave them out.

## 7. Keep/kill: allocation, entry and reads

`@statespace/ledger/keepkill` builds what W0-T07 fixed (RUN-keepkill-rules); SCR-assurance (W5-T08) reports it, and each mechanic reads its own arm (W1-T05, W1-T08, W2-T18).

**The rules.** `scripts/build-rules.ts` turns the hashed YAML into `rules.generated.ts`, whose `RULES_SHA256` is the SHA-256 of the exact bytes it came from; the browser never parses YAML. The test suite checks that the snapshot is a fresh generation and that its hash is the one RUN-keepkill-rules records.

**Allocation.** `allocate(comparison, expSeed)` orders units stratum by stratum, within a stratum by `fmix32(hash32(key))` (`hash32` from `packages/rng`, the vendored kernelspace module), and gives the arms alternately. It reproduces every unit of `runs/RUN-keepkill-rules/allocation-vectors.json` for the four example seeds, and `firstWindowArm` reproduces comparison 4's window 1. The interval and decision functions reproduce `interval-vectors.json` to within the rules' tolerance of 1e-12 [D], and its decisions exactly.

**Entry.** `entryOf(comparison, kc, { ordered, content, draw })` returns `entered` with the instant, `waiting`, or `never` with the reason: not a listed unit, credited at placement, first learned by a test-out's confirmation, or an entry that would precede the draw. No entry rule receives an arm; the property test checks that every entry is the same under any expSeed.

- Comparison 1: an expert-treatment KC at first learning (its first attempt at the first lesson's exit item); a novice KC (or one whose content declares no treatment) at the first graded event of the first session after the session in which it first became solid (ASSESSMENT.md sections 3.2 and 3.3: sessions break at gaps of 30 minutes; three counted sessions pairwise two local days apart, taken greedily; the latest fresh event correct).
- Comparison 2: the first practice item of GEN-proof-structure template 2 whose primary KC is the unit.
- Comparison 3: the first practice item of a listed family whose primary KC is the unit.
- Comparison 4: windows of 12 counted weeks from the week of the first event; a week touching a declared break is skipped. Window 1 enters at the first event, a later window at the start of its first week [D].

A practice item is an `item` met in practice or a drawer, never in a placement walk, test-out or confirmation [D]: the rules count test-out items among the probes that are the same in both arms.

**Content is injected.** KC tags live in content, not in events, so the functions take a `KeepKillContent`: `primaryKc`, `template` (family and 1-based number), `treatment`, `isFirstLessonExit`, and optionally `placementCredits` from the placement walk. Without it, a correct placement item credits its primary KC, which can only exclude more KCs and never depends on an arm.

**Reads.** `readComparison({ comparison, phase, at, log, content })` refuses without a draw and when the rules it applies (the snapshot) hash to anything but the governing draw's `rulesSha256`. It uses the events whose `at` precedes the read, finds each entered unit's outcome (the first fresh, graded event on the unit at least 30 days after entry, skipping practice Proof Blocks items), leaves out units exposed under a superseded seed, counts deviations from the arm records, and applies the comparison's decision table. It returns the figures and a learner-zero run record (`run@1`) whose inputs hold the digest of the event set it used and the rules' hash, so anyone with the export can derive it again. A read never changes a learner state.

**Read records.** Every read gets an id of its own, so every read's record can be kept and committed to `runs/` beside the others (GATE-runs requires the file name to be the id). `readRecordId` writes it as `RUN-lz-keepkill-<comparison>-<phase>-<yyyymmdd>-<hhmmss>-<digest>`: the date and time are the read's instant as written, in its own offset, and the digest is the first 8 hexadecimal digits of the SHA-256 of the record's canonical JSON with its id left out. Two reads whose records differ in anything (the instant, the event set, the content build, the time the record was written, a figure) therefore get different ids, even within one second, and the same read derived again from the export gets the same id. The record leaves null the fields a pure read has no value for (`binary`, `binary_sha256`, `image`, `duration_s`, `exit_code`, `environment.os`, `environment.cpu_count`), and `unrecorded` gives each its reason. The adapter takes a read and keeps its record in one call (`readKeepKill`), and never replaces a kept record (`apps/site/src/storage/`, section 5).

**Arm records.** A mechanic that applies an arm writes, on every item whose display a comparison governs and whichever arm it shows, `data.keepkill: [{ comparison, arm, expSeed }]`, adding `fallback: "<why>"` when the allocated variant could not be built (`armData` builds it). The arm is the unit's allocated arm, whose own rules (comparison 1's safeguard included) the display followed.

## 8. Tests

`npm test` runs `scripts/build-rules.ts --check` and the suites in `test/`. The ones the acceptance names:

| Acceptance | Tests |
|---|---|
| a double import, a merge and a stale tab give identical logs | `test/log.test.ts` (pure, over fixed seeds), `test/storage/store.test.ts` (the adapter on fake-indexeddb: two tabs, one hearing nothing, interleaved and concurrent writes; conflicting records, decided from each tab's view, reach the database by both of the adapter's paths: `merge()`, and `commit()` through appends and through closed tabs' outboxes, drained by a tab opened mid-run or by a third tab at the end, so an adapter whose commit applies the last writer, or keeps the first, fails it) |
| expSeed in the log, its export and its merge rule | `test/log.test.ts`, `test/expseed.test.ts`, `test/storage/store.test.ts` |
| the allocation reproduces RUN-keepkill-rules' vectors | `test/keepkill-vectors.test.ts` |
| the entry rules hold | `test/keepkill-entry.test.ts` |
| each read writes a learner-zero run record | `test/keepkill-read.test.ts` (every record validated against `run@1`; reads on one day get different ids; every null field has its reason, for all four comparisons), `test/storage/store.test.ts` (every read's record survives; a kept record is never replaced) |

`scripts/spikes/W1-T03/browser-check.mjs` runs the adapter itself in Chromium, Firefox and WebKit inside the pinned Playwright image; its command is in its header.

## 9. Decisions this package takes [D]

1. Code-point order for "lexicographically smaller" (section 3).
2. An ungraded event omits `ok` (section 2).
3. Generated means a seed was drawn (section 4).
4. Draws are a set in the log; the earliest governs and none is dropped, by a merge or a replace (section 6).
5. Sessions are built from calls and evidence kinds with a verdict; an attempt on a KC is an evidence kind, not a call (section 7).
6. Comparison 4's weeks start on Monday until M-set-your-week publishes its rule, and window 1 enters at the first event (section 7).
7. The section 5.6 structural cap applies per record (section 5).

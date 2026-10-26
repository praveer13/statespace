# The generator framework (`@statespace/generators/core`)

**Status:** built by W1-T21. **Date:** 2026-10-25 (machine clock). **Run:** [X RUN-generators-gate] (`runs/RUN-generators-gate.json`).

The contract every `GEN-*` family implements (ARCHITECTURE.md section 17.3; ASSESSMENT.md section 4.1; invariant I3), the mechanics that sit on generated items (M-layered-feedback, M-class-hint, M-which-is-it), and the checks of GATE-generators (spine section 11.2), which `scripts/verify-generators.mjs` runs. Everything here is pure TypeScript: no DOM, storage or network, and no clock or entropy (the determinism lint holds it to that).

## 1. What is here

| File | What |
|---|---|
| `types.ts` | The contract: `Generator`, `TemplateSpec` with its bands and its optional `pending` record (`PendingEngine`), `InstanceBase` and the item view (`ChoicePart`, `TrueFalsePart`, `ConstructedPart`), `KeyBase` (`ChoiceKey`, `TrueFalseKey`), `Grade`, `ItemAnswer`, `SampleAnswer` |
| `port.ts` | The engine port (`EnginePort`, `InstrumentRequest`, `InstrumentReply`, `RawVerdict`, `Budget`: ARCHITECTURE.md section 17.3's sketch) and `ask()`, which turns an `unknown` verdict or a budget stop into `unknown` and throws every other failure |
| `seed.ts` | The display and graded halves of the seed space, the deterministic redraw sequence, `gradedSeed()`, instance references in both grammars, and `instanceEventFields()` for event writers |
| `define.ts` | `defineGenerator()`, which checks a definition against the contract when its module loads; `discard()` with its causes; the pending-template readers `liveTemplates()`, `pendingTemplates()`, `isPending()` and `liveTemplateOf()`, with `PendingTemplateError` |
| `draw.ts` | `drawInstance()`: make, key, and redraw past discarded seeds; a pending template is refused before any seed is tried |
| `distractors.ts` | Misconception mutants: `assembleOptions()` in make(), `certifyChoice()` in key(), `categoricalDistinctions()`, `matchMisconception()` |
| `grade.ts` | Part and item grading (`gradeItem()`), ungraded grades, and `chanceOf()` |
| `feedback.ts` | M-layered-feedback: `layeredFeedback()` |
| `class-hint.ts` | M-class-hint: `classHintPlan()` and `fixKillsClass()` |
| `which-is-it.ts` | M-which-is-it: `planWhichIsIt()` and `checkWhichIsIt()` |
| `keepkill.ts` | `readArm()`: whether keep/kill comparison 1 or 3 governs an item, through W1-T03's allocation and entry rules |
| `digest.ts` | The determinism sample, `familyDigest()`, `determinism.json`'s format and `determinismProblems()`; `CORE_REV` |
| `checks.ts` | GATE-generators' checks on one family: `checkFamily()` |
| `copy.ts` | The framework's own learner-facing sentences, in one place for review |
| `fixture/` | The framework's fixture family, its box engine and its `determinism.json` (section 9) |

Tests live outside `src/` (`packages/generators/test/core/`, `test/gate/`), because the purity lint reads everything under `src/` and tests import Node's test runner. A family's tests go in `packages/generators/test/<slug>/`, which the package's `test` script already finds.

## 2. The contract

```ts
interface TemplateSpec {
  id: TemplateId; name: string; kcs: KcTags
  bands: Record<Band, BandSpec>        // bands 1-3
  pending?: { engine: EngineName; lands: string }   // waits for an engine of a later wave; `lands` is a tracker task
}

interface Generator<I extends InstanceBase, K extends KeyBase> {
  id: GenId; fixture: boolean; title: string
  templates: TemplateSpec[]            // 2-4, t1 upward, structurally different, pending ones included; at least one live
  engines: EngineName[]                // what key and grade consult for the live templates
  misconceptions: MisconceptionKey[]
  make(seed, band, template): I        // pure and deterministic; plain JSON data
  key(inst, port): Promise<K | Discard> // a checker at grade time
  grade(inst, answer, key, port): Promise<Grade>
  measure(inst): Measure               // the instance's place on its bands' axes
  structure(inst): string              // its shape with every literal erased
  replay?(inst, part, a, b, witness): boolean   // re-check a distinction independently
  samples?(inst, key): SampleAnswer[]  // answers for constructed parts, for the gate
}
```

- **make** reads nothing but its arguments. The instance carries `family`, `template`, `band`, `seed`, its KC tags (one primary, at most two secondary), the item the learner sees, and `bound` when a verdict on it rests on one (I10). It is plain JSON, so it digests and travels unchanged.
- **key** asks checkers through the port, never stores a key with the item, and returns a `Discard` when the checker cannot decide: an `unknown` verdict, a budget stop, two options it cannot tell apart, an instance nothing can violate. `discard(cause, reason)` names the cause; GATE-generators fails a family whose checker ever rejects the family's own reference (`reference-rejected`), because that is a generator bug.
- **grade** returns `ok` (`null` when ungraded: the checker undecided, a budget stop, or an answer outside the template's language), `why`, the matched `misconception` with its `note`, the `witness`, its `class`, the `bound` and the `basis` (what the verdict rests on), and `engine@version`.
- **Answers** are a response per part: an option id, a map from statement id to true or false, or the constructed text. An item is right only when every part is; a true/false set only when every statement is (spine section 8.5).
- **Keys** carry, for every choice part, the option the checker confirmed and a witness for every unordered pair of options (`ChoiceKey.distinctions`), and for every true/false part each statement's truth and a refuting witness for each false one.
- **Bands.** A template's `bands[1..3]` give an inclusive range per axis. Axes are oriented so a larger value is harder; a band never asks for less than the band below on any axis and asks for more on at least one. `measure()` must land every instance inside its band.
- **Pending templates [D].** A template whose engine ships in a later wave is declared in full (name, KC tags, bands) with `pending: { engine, lands }`. `engine` is the engine it will consult, which the family does not list in `engines` yet. `lands` is the tracker task after which it goes live: W3-T27 for GEN-find-the-witness's trace template, W4-T20 for its history template, W4-T28 for its state-pair template. A pending template:
  - counts toward the family's 2-4 templates and the spine's count;
  - is never drawn: `drawInstance()` and `liveTemplateOf()` throw `PendingTemplateError`;
  - is left out of `templatesByPrimaryKc()`, so M-which-is-it and Today never meet it;
  - is skipped by every check after `registry`, so its make() is never called, and it has no cells in the digest.

  At least one template must be live. GATE-generators fails a template that is still pending once a port for its engine exists, so no template stays pending by accident. Going live means removing `pending`, listing the engine in `engines`, making sure the gate is green on the template, and re-recording `determinism.json`, because the template's cells join the digest. `liveTemplates()`, `pendingTemplates()` and `isPending()` read a family's templates.

## 3. Writing a family

1. Make `packages/generators/src/<slug>/index.ts` (the slug is the ID without `GEN-`) and export `generator = defineGenerator({...})`. If the family runs an engine as plain code in the tab (the stamp deriver, a pocket predicate), also export `ports`, a map from engine name to `EnginePort`.
2. Build options with `assembleOptions()` from the reference and the family's mutants (each with its `dp:` tag, operator and why), and key them with `certifyChoice()`: the checker confirms the reference and tells every pair of options apart. Use `categoricalDistinctions()` for options that differ by value (verdict words, stamps, classes).
3. Grade with `gradeItem()`; hand constructed parts to your own grader, and return `ungradedPart()` when the checker answers `unknown`.
   Declare a template the spine gives your family whose engine has not shipped with `pending` (section 2). The framework refuses to draw it and the gate never calls your make(), key() or grade() for it, so they need not handle it; a make() that throws a RangeError for it is fine.
4. Run `node scripts/verify-generators.mjs --family GEN-<slug>`. When it is green apart from determinism, record the digest in three browsers (section 7, "Three engines") and commit the `determinism.json` it writes beside your `index.ts`. The content build fingerprints the folder (`scripts/build-content.mjs`, `templateRevs`), so a re-recorded digest also changes the family's itemRev, and earlier events show "re-check".

The determinism lint (`@statespace/rng/lint`) covers everything under `packages/generators/src/`: no `Math.random`, `Date.now`, `new Date(`, `performance.now` or Web Crypto entropy; no transcendental `Math` and no `**`; no locale-dependent methods or `Intl`; no timers or garbage-collection observers. Draw from `createDraw(seed)` (`@statespace/rng`): `below`, `int`, `pick`, `shuffle`, `sample`, `weighted`, and `fork(label)` for an independent stream per part of an instance.

## 4. Seeds

| Rule | Detail |
|---|---|
| Halves [D] | A seed with its top bit set is a display seed (worked examples, demonstrations, drawer illustrations); the rest are graded seeds (ASSESSMENT.md section 2.3). `gradedSeed(entropy, taken)` maps the main origin's entropy draw into the graded half and steps past identities already in the log |
| Redraws | A discarded seed is followed by `successor(seed)`, the first output of the stream seeded by it, in the same half; `drawInstance()` serves the first keyable seed, so the served seed (the one the event records) regenerates the instance anywhere |
| References | `instanceRef()` writes ASSESSMENT.md section 2.7's identity, `gen:GEN-negate-it:t4:b2:0x7c1e09a4`; `itemRef()` and `callRef()` write event@1's refs, `item:GEN-negate-it/t4`; `instanceEventFields()` gives an event writer the ref, the seed and `data.instance = { ref, band }`, because event@1 has no band field (section 11) |

## 5. Mechanics

**M-layered-feedback** (`layeredFeedback(grade, ctx)`). Layer 1 is the verdict, the witness, the bound and the basis, always, with a dash for an empty field. Layer 2, the misconception note, is open by default only in novice KCs (a KC whose content declares no treatment is novice); a sure miss opens it whatever the treatment (ASSESSMENT.md section 5.7). Layer 3 is due on the second miss on one tag; W2-T17 writes the refutation cards. A probe shows nothing until the whole item is submitted.

**M-class-hint** (`classHintPlan(input)`, `fixKillsClass()`). Practice shows the witness and its class; a probe is one shot, everything after submission. A fix matches only when it kills the witness shown and a non-minimal witness of the class.

**M-which-is-it** (`planWhichIsIt(input)`, `checkWhichIsIt()`). A mixed block draws from one confusable set of the KC graph only, never across sets; only KCs past their first exit item join; the block takes at most half of the session's graded items (floor of half). KCs take turns, so no KC appears twice running. Today (W1-T08) passes the graph's sets and `itemsFor`, which `templatesByPrimaryKc(families)` builds from the families' definitions, and places the block after the exit items. It is scheduling, so it reads no arm; a test checks that it imports nothing from the ledger or the arm readings.

**Keep/kill arms** (`readArm()`; spine section 12 item 58). M-layered-feedback reads comparison 1, `misconception-note`; M-class-hint reads comparison 3, `witness-generalization`. An arm applies only when the comparisons are on under the rules this build carries, the item is a practice item, its primary KC is an entered unit, and (comparison 3) its family is listed. The mechanics return the arm record the item's event carries in `data.keepkill` (W1-T03's format):

- comparison 1: the arm sets the note's default; a novice KC that is not solid keeps its note open in both arms (the rules' safeguard); a sure miss under the collapsed arm opens the note and records `fallback`, so the read counts it as a deviation (section 11);
- comparison 3: the contrast arm shows a second witness of the class that the family's engine certifies, an ungraded "what do the two share?" prompt, then the class; when the second witness cannot be built, the default shows and the record carries `fallback`.

## 6. Distractors, keys and grading

- A distractor applies one cataloged misconception to the reference and carries its `dp:` tag and its why (layer 2's note). `assembleOptions()` throws when fewer mutants apply than the part needs, so a part's chance level never changes with the seed.
- `certifyChoice()` asks the checker to confirm the reference and to tell every pair of options apart; it keeps each witness for the feedback and discards the seed on an undecided checker or an equivalent pair.
- `chanceOf()` prints 1 in k for a choice of k options, 1 in 2^m for a set of m statements (their product for several parts), and no guessing floor with a constructed part (spine section 8.5).

## 7. GATE-generators

| Check | Fails when |
|---|---|
| `lint` | a seeded path (packages/generators/src, packages/pocket/src, packages/rng/src, the Clearinghouse world) reads a clock or entropy, or uses engine-dependent arithmetic, locale data or timers |
| `contract` | the definition breaks `defineGenerator()`'s rules: 2-4 templates t1 upward (pending ones included), at least one live, KC tags, band ranges, engines, a pending template's engine and landing task, `dp:` keys, functions; a family module does not load |
| `registry` | the family, its template count (pending templates included), a misconception tag or a KC tag is not the spine's (the fixture is exempt from the first two), or a pending template lands with a task the tracker does not have |
| `pending` | a template is still pending although a port for its engine exists here. Every check below skips pending templates; the report names each one and the task it lands with |
| `purity` | make() throws (the gate's guard makes every clock and entropy read throw inside it), returns data that is not plain JSON, gives another instance for the same arguments, or carries another seed, band or template |
| `shape` | the item is malformed: options without whys, not exactly one reference, mutant tags the family does not declare, a true/false set with all or none meant true, a constructed part without its language |
| `templates` | two live templates share a shape: variety of structure, not of parameters (B/C [dp row 27], ASSESSMENT.md section 4.1) |
| `banding` | an instance's measure falls outside its band, or names an axis its bands do not constrain |
| `determinism` | the sample's digest differs from `determinism.json`, which must record the same digest from Chromium, Firefox and WebKit under the current `CORE_REV` |
| `unknown` | a key kept when every query answered `unknown` or stopped at its budget; an answer graded when the grader's checker answered `unknown`; a draw that served a discarded seed, or two draws from one seed that differ |
| `distractors` | a key that is not the reference, leaves a pair of options without a witness, or holds a witness that does not replay; a rejected reference; a cell where no draw finds a keyable seed |
| `grading` | the key does not match, a distractor does not miss with its tag, an answer outside the language is graded, a bounded key's grade prints no bound |

```
node scripts/verify-generators.mjs                    the fast lane (under a second for the fixture [X RUN-generators-gate])
node scripts/verify-generators.mjs --family GEN-x     one family; the lint still runs
node scripts/verify-generators.mjs --self-check       plant one fault per check; the gate must fail on each
node scripts/verify-generators.mjs --json | --verbose
```

**Three engines.** No lane installs browsers yet, so the fast lane compares Node's digest with the one Chromium, Firefox and WebKit computed and `determinism.json` records. Recording runs the same `familyDigest()` in all three, from one esbuild bundle of the families and this core, in the pinned Playwright image (the repository mounted read-only, the digests written to a scratch folder):

```
docker run --rm --memory=6g -v "$PWD":/repo:ro -v <scratch>:/out -w /repo mcr.microsoft.com/playwright:v1.63.0-noble \
  node scripts/verify-generators.mjs --engines --engines-out /out/engines.json
node scripts/verify-generators.mjs --engines-in <scratch>/engines.json --write
```

The second command writes `determinism.json` for every family whose Node digest equals all three browser digests, and refuses otherwise. With a writable mount, `--engines --write` does both in one step.

**Ports.** A family's own `ports` cover engines it runs as plain code. Any other engine comes from a provider module, loaded only when a family needs it: `--ports MODULE` (repeatable), `STATESPACE_GENERATOR_PORTS` (comma-separated), and, when it exists and exports them, `scripts/conformance/z3-pyodide-native.mjs`. A provider exports `ports` (engine name to `EnginePort`) or `createPorts()` returning them. A family fails the `unknown` check when an engine its live templates consult has no port: a checker that cannot run is never a pass. A pending template's engine is never required. The gate looks for a port for it all the same, and the `pending` check fails once one exists.

## 8. Recording

`node scripts/spikes/W1-T21/record.mjs` re-records [X RUN-generators-gate]: the fast lane, the browser digests, the write, the self-check and the tests, with each output's SHA-256. It needs Docker and the pinned Playwright image.

## 9. The fixture family

`fixture/` is a small complete family that runs anywhere, so the gate can hold the framework itself to every check before any course family exists: `GEN-fixture`, `fixture: true`, no content, no lesson. A requirement over two to four integer variables in a box `[-span, span]`; the learner picks the query whose `sat` answers are violations. Three templates negate three shapes (a bound, an implication, a conjunction); the distractors are mutants tagged dp:Z1, dp:O1, dp:G5, dp:G4 and dp:G1. Its checker, the box engine, enumerates the box; past its state budget a query is `unknown`, so band 3 discards some seeds by design, and its verdicts carry the box as their bound. `fixtureClassOf()` and `fixtureSecondWitness()` show what M-class-hint needs from a family.

## 10. Decisions [D]

1. The display half is the top bit; a redraw is the successor in the same half.
2. Discards carry a cause, and a rejected reference fails the gate rather than being redrawn quietly.
3. A choice key keeps a witness for every pair of options, so "distinct from the key and from each other" is checkable after the fact, by replay where the family can replay.
4. A family's determinism digest lives in its own folder, so the content build's template fingerprint follows it; `CORE_REV` makes a core change that alters instances or keys re-record every family.
5. The lint adds to kernelspace's rules (section 3); the vendored lint stays byte-identical and the tests run its self-test cases through the port.
6. Under comparison 1, a sure miss opens the note in both arms and is recorded as a fallback under the collapsed arm (section 11).
7. M-which-is-it caps a block at the floor of half the session's graded items and needs at least two items from two KCs.
8. A template whose engine ships in a later wave is declared `pending` rather than left out (section 2). It keeps its template number, so `t3` means the spine's third template in every wave. It counts toward 2-4 and toward the spine's count, needs one live sibling, is never drawn, and fails the gate once its engine has a port. `engines` lists only what the live templates consult, so a pending engine is never in it.

## 11. Spine and owner questions

1. **event@1 cannot regenerate an instance.** ASSESSMENT.md section 2.7 identifies an instance as `gen:{family}:{template}:{band}:{seed}`, but event@1's ref (ARCHITECTURE.md section 7.2) is `item:GEN-{family}/{template}` and the event has no band field. `instanceEventFields()` puts the band in `data.instance` until the schema owner (W1-T03) decides.
2. **A sure miss under the collapsed arm.** The keep/kill rules' comparison 1 manipulates whether the note opens by default; ASSESSMENT.md section 5.7 opens it after a sure miss whatever the treatment. The framework honors section 5.7 and records the arm with a fallback, so the read counts each such item as a deviation. The owner may prefer to treat a sure miss as a safeguard in both arms, which the hashed rules file does not say.
3. **KC treatments have no machine-readable home.** M-layered-feedback and comparison 1's default need each KC's treatment, which the stage specs declare in prose ("novice for all eleven S1 KCs", curriculum/S01-counterexample.md section 1). The mechanics take it as an input, reading a missing one as novice, as the rules do; `content/kc/graph.yaml` could carry it beside each KC.
4. **No run is registered for GATE-generators.** Spine section 9.5 lists none for W1-T05 or W1-T21; this task records RUN-generators-gate and proposes it in `packages/ids/proposals.json` only once a scanned document cites it (`scripts/spikes/W1-T21/propose-ids.mjs`), because GATE-links fails a proposal nothing scanned uses.
5. **"2-4 templates" against W1's partial families.** Spine sections 8.3 and 11.2 hold every family to 2-4 structurally different templates. The basis is pools of 2-4 structurally different problems (B/C [dp row 27]). In W1, GEN-find-the-witness ships its model template alone (W1-T23): the trace template follows with W3-T27, the history template with W4-T20 and the state-pair template with W4-T28. GEN-call-it's trace-length and which-anomaly templates wait for engines that S5 and S6 bring (W1-T24). The framework counts pending templates toward 2-4 and toward the spine's count, and asks for one live template. So GATE-generators can be green on GEN-find-the-witness in W1 while its learners meet one structure, which is the parameter variety the basis warns about. The owner may prefer the literal rule of two live templates, which would block W1-T23 as the tracker specifies it.
6. **GEN-call-it's trace-length and which-anomaly templates have no landing task.** No tracker task after W1-T24 lists `packages/generators/src/call-it/`, so `lands` has no task that adds them to name. W1-T24 can name the tasks that bring the engines: W3-T23 (the Theater engine's TLC state graphs) and W4-T20 (the recorded histories and their checker). The tracker should give the template work to a task.

## 12. Limits

- The fast lane checks determinism against recorded browser digests; the browsers themselves run only where Playwright's browsers are installed (the pinned image), until a lane installs them.
- `structure()` and `measure()` are the family's own account of its shapes and difficulty; the gate checks them for consistency, not for truth.
- A family that keys without an engine (a lookup table) cannot be checked for discarding `unknown`; the gate notes it.
- A pending template is checked only for its form (name, KC tags, bands, engine and landing task). Its instances are first made, keyed and digested when it goes live.
- Distinctions are replayed only when the family implements `replay()`; otherwise the gate trusts the engine's witness and checks only that every pair has one.
- Which band a learner meets next (ASSESSMENT.md section 4.1's band staircase) and which formalize mode (pick, fix, write; V2-26, W1-T22) are the scheduler's and the family's; the framework only defines and checks the bands.

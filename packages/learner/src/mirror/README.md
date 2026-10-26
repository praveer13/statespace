# @statespace/learner/mirror: calls, the Mirror and VRK30

**Status:** built by W1-T07. **Date:** 2026-10-26 (machine clock). The pure half of M-call-it and M-mirror (spine section 8.5; ASSESSMENT.md sections 5 and 3.6): which call counts, what a draft becomes when it is committed, the private Mirror, and VRK30. The sheet that asks a call is `apps/site/src/components/call-it/`; the screen is `apps/site/src/screens/mirror/`.

Everything here is derived from the event log at read time and stores nothing (I2). It is pure TypeScript, with no DOM, storage, network or clock: callers pass `now`.

The deliverable is listed as `packages/learner/mirror/`; it lives at `src/mirror/`, the package's source layout (`src/schedule/` is where the vendored FSRS wrapper lives), so the purity lint reads it. Import it as `@statespace/learner/mirror`.

## 1. What is here

| File | What |
|---|---|
| `bands.ts` | The three taps and every constant: the bands as printed (guess below 67%, think so 67–80%, sure above 80%), the payoffs (+1/0, +2/−2, +3/−6, feedback only), the imputed stated probabilities (0.73 for think so, 0.90 for sure, and for guess midway between the item's chance and 2/3), `MIN_CALLS_PER_BAND = 20`, `MIRROR_Z = 1.96`, the active study-month (4 distinct local days) and VRK30's 30 days |
| `shape.ts` | The shape of a called item: k options, a multiple true/false set of m statements (right only when every statement is), or a constructed answer. It sets the chance line ("3 options · chance 1 in 3"; "all 5 by guessing: 1 in 32"; "no guessing floor") and the Mirror bin |
| `calls.ts` | What a question is (`callKey`: its ref without the kind, and the seed of a generated instance), `firstCalls` and `firstCallOf` (the call that counts), `foldedEvents` (a log read as a set by id), and what a call event says about its item in `data.call` (`callDataOf`, `readCallData`) |
| `plan.ts` | `planCall`: write the call, or say which call is already there. The sheet asks it with the log as it is at the moment of the write |
| `stats.ts` | `rateOf`: hits of n with the 95% Wilson interval, from the keep/kill reads' `wilson` in `@statespace/ledger/keepkill` with z = 1.96, so the Mirror and the reads cannot disagree about an interval |
| `mirror.ts` | `deriveMirror`: bias and the hit rate per band, in two groups (the learner's own calls, and calls made with help, apart), and the calls left out with the reason; and `outsideBand`, where an interval lies against its band (exported for its tests) |
| `vrk30.ts` | `deriveVrk30` and `activeMonthsOf`: the count, the rate per active study-month, the accuracy over qualifying events with its interval, and the KCs that count |
| `index.ts` | The exports; `@statespace/learner/mirror` |

## 2. A call, and which call counts

A call is an event that carries a confidence tap (`conf`): a `call` on an authored cell or on a generated item, or any graded item the learner called (ASSESSMENT.md section 5.6, "calls and called items"). The sheet writes a `call` event with:

| Field | Value |
|---|---|
| `ref` | `call:S{n}.L{k}/c{cell}` for an authored cell, `call:GEN-{family}/{template}` for a generated item (ARCHITECTURE.md section 7.2) |
| `seed` | the instance's seed, for a generated item |
| `conf` | `guess`, `think` or `sure`, stored as the tap; the bands are applied at read time |
| `ok` | whether the call matched the key; a set is right only when every statement is |
| `resp` | `{ picked }` for a choice, `{ answers: { s1: true, … } }` for a set |
| `mis` | the misconception key the response matched, when it matched one: the picked option's key for a choice; for a set, the key of the first wrong statement that carries one (a wrong answer on a true statement carries none, so it never hides a key further down). The event holds one key, and `resp.answers` keeps every statement's mark |
| `provenance`, `exposure` | `own` or `assisted` (the learner's "I had help" box, OD-8); `unseen` |
| `data.call` | `{ form: 'choice', options: k }`, `{ form: 'set', statements: m }` or `{ form: 'constructed' }`, and `kc`, the item's primary knowledge component. event@1 has no field for either; the Mirror needs the shape for the chance level (the guess band's imputation) and the bin, and the KC to place the call against instruction [D] |

**Which call counts.** A question is its ref (without the kind: `call:S1.L1/c1` and `item:S1.L1/c1` are one question) and, for a generated instance, its seed (ASSESSMENT.md section 2.3). The item's revision is not part of it, so an erratum flags the call "re-check" and never gives the learner a second first call [D]. Only the first call on a question counts, by fold order (the instant, compared exactly whatever offset each event carries, then the id), and it cannot be edited. The log is append-only, so "cannot be edited" is three things, each held by a property test over seeded random logs (`test/mirror-first-call.test.ts`; the component's tests and the browser harness add the sheet's side):

1. **The sheet never plans a second call.** `planCall` returns `already` when the log holds a call on the question, whatever it said and whoever wrote it.
2. **A second call that gets written anyway** (a stale tab, a replayed import, a merged device) counts for nothing: `firstCallOf`, `firstCalls` and `deriveMirror` read the first one whatever order the events arrive in.
3. **A later call changes nothing the Mirror shows.** A first call that was itself left out (made before instruction, or ungraded) uses the question up: a later call never counts in its place [D].

Every derivation reads the log through `foldedEvents`, which keeps each id once (the conflict rule decides two records that share an id), so a double import, two exports joined end to end or a merge give the same Mirror.

## 3. The Mirror

**Population** (ASSESSMENT.md sections 2.5, 3.2 and 5.6): calls that are the first on their question, graded, own, unseen and made after instruction. A call is made after instruction when its primary KC has been first learned, at or before the call. Left out, each by the first reason that applies: `repeat`, `ungraded` (no `ok`: neither a hit nor a miss), `agent`, `seen`, `no-kc`, `no-shape`, `before-instruction` (this covers a first-contact call, such as Boot's, whenever it is made: spine section 12 item 33). Calls made with help are tallied apart and never pooled with the rest. Events at or after `now` are not read [D].

**Display** (ASSESSMENT.md section 5.6), per bin (a multiple true/false set has its own, spine section 8.5):

- **Bias**: the mean stated probability minus accuracy, with the mean minus accuracy's Wilson interval (the imputed mean is fixed by the taps). Shown from `MIN_CALLS_PER_BAND` calls in the bin, and not before.
- **Hit rate per band**: n, hits, the rate and its Wilson interval (z = 1.96), for guess, think so and sure, empty rows included, and each band's mean chance level (where a blind guess would sit), which the screen draws the guess band's range from (DESIGN.md section 6.12: "guess: chance to 67%").
- **Diagnosis**: a band gets a sentence only when it holds at least `MIN_CALLS_PER_BAND` (20) calls and its interval lies wholly outside the printed band, below it or above it. Touching the band's edge is reaching it, so nothing is said [D].
- **Resolution**: the hit rate at sure minus the hit rate at guess, only when both bands have enough calls.

The worked table of ASSESSMENT.md section 5.6 is a test: 18 of 30 at sure is 0.42–0.75 (below the band: a sentence); 21 of 30 is 0.52–0.83 and 18 of 20 is 0.70–0.97 (the interval reaches the band: nothing); 7 of 12 at think so is 0.32–0.81 (fewer than 20 calls: nothing). So are section 6.4's intervals (10 of 12 is 0.55–0.95; 2 of 2 is 0.34–1.00; 17 of 21 is 0.60–0.92; 7 of 12 is 0.32–0.81).

**Imputation** (spine section 8.5): guess is midway between the item's chance and 2/3 (0.50 for a three-way verdict, 0.33 for a constructed answer, about 0.35 for a set of five), think so is 0.73, sure is 0.90.

## 4. VRK30

A KC counts toward VRK30 while its latest qualifying event is correct (spine section 2.3; ASSESSMENT.md section 3.6). A qualifying event is fresh (own, unseen, generated: `isFresh` of the ledger), graded, on the KC as its primary KC, and at least 30 days of elapsed time after first learning [D: 30 × 86 400 seconds, compared exactly]. "Latest" is by fold order. The view carries the count, the KCs that count, the accuracy over every qualifying event with its Wilson interval (ASSESSMENT.md section 3.6's example, 41 of 52, is 0.79 with 0.66–0.88 and is a test), the active study-months and the rate: the count over the active months, null while none is active, so a declared break dilutes nothing. An active study-month is a calendar month, by the local date each event froze, with graded own work on at least 4 distinct local days. `settled` is an input, a set of KCs the caller knows to be settled: sign-off is the Defence's (W2), and the Mirror marks what it is told.

## 5. What the Mirror needs from content

KC tags live in content, not in events (ARCHITECTURE.md section 7.2), so `deriveMirror` and `deriveVrk30` take a `MirrorContent`, a part of what the keep/kill reads take (`KeepKillContent`), so one adapter can serve both:

| Method | Answers |
|---|---|
| `primaryKc(event)` | the event's primary KC, or undefined; the call's own `data.call.kc`, and for an event that is not a call `data.kc`, are read when content has none |
| `isFirstLessonExit(event, kc)` | whether the event is the attempt at the exit item of the KC's first lesson or step briefing: first learning (ASSESSMENT.md section 3.2). `firstLearning` of the ledger decides from it, and from a test-out's confirmation |
| `isFirstContact?(event)` | whether a call is first contact, which never reaches the Mirror |

The site's adapter is `apps/site/src/screens/mirror/content.ts`: a lesson's first-taught KCs and first-contact lessons from the KC graph, and an exit item's `data.exit = { lesson }` for first learning (see section 7).

## 6. Tests

```
npm test -w @statespace/learner        # the package's tests, under node --test
npm run typecheck -w @statespace/learner
```

| Test | Holds |
|---|---|
| `test/mirror-bands.test.ts` | the bands, payoffs and the proof that each tap is best in its band; the constants; imputation; chance lines and bins; shape validation |
| `test/mirror-derive.test.ts` | the diagnosis table; bias, its interval and its threshold; sets in their own bin; every filter and its boundary; order, duplicates and merges |
| `test/mirror-first-call.test.ts` | the properties of section 2 over seeded random logs, stale tabs included |
| `test/mirror-vrk30.test.ts` | the count, the 30-day boundary to the second, "latest", fresh only, the 41-of-52 example, active months and the rate |

Thirty-six weakened copies of the module (`scripts/spikes/W1-T07/mutants.mjs`, group `learner`: the last call instead of the first, a plan that always writes, an event counted twice, two records of one id decided by arrival, seen or agent or assisted calls counted, a minimum of 10, a different imputation, `<=` where `<` is, no first-contact exclusion, the interval the wrong way round, sets pooled, 29 days, any success counting, three days in a month, `now` ignored, ungraded calls counted, the resolution shown from a handful of calls...) each fail at least one of these tests. The script's first run found four that none did (the conflict rule between two records of one id, an interval ending exactly at its band, one starting exactly at it, and the resolution's minimum); each now has a test.

## 7. Decisions and questions for the owner

Decisions [D] this module takes, each stated where it applies: the question's identity (section 2); a first call that is left out uses the question up; only an event with a confidence is a call, and a call with no `ok` is ungraded; touching the band's edge is reaching it; the bias threshold is the band threshold; resolution is shown only when both bands have enough calls; a constructed answer shares the single-answer bin and has chance 0; the Wilson z is 1.96; a log is read as a set by id.

Questions the spine does not settle, for the owner:

1. **First learning needs a marker.** ASSESSMENT.md section 3.2 defines first learning as the first attempt at the exit item of a KC's first lesson, but event@1 has no field naming the lesson or the role an item was served in. The keep/kill reads inject `isFirstLessonExit` for the same reason. The site's adapter reads `data.exit = { lesson }` from an exit item's event; whoever writes exit items (W1-T02's lesson screen, W1-T10's lessons, W1-T08's Today) must write it, or the Mirror and VRK30 stay empty. The tracker has no task for the marker.
2. **KC tags are recorded, not resolved, for calls.** ARCHITECTURE.md section 7.2 says KC tags are resolved from content at read time; the sheet records the item's primary KC in `data.call.kc` because no read-time resolver from a generated item's ref to its template's KC tags exists yet, and the Mirror reads content first and the record second, so a resolver replaces the record without a change here. An item event that is not a call and counts toward VRK30 needs `data.kc` (or a resolver) for the same reason.
3. **The rate's interval.** DESIGN.md section 6.12 gives VRK30's rate "an interval"; spine section 2.3 and ASSESSMENT.md section 3.6 define only the accuracy's Wilson interval, which is what the view carries. No interval of a count per month is invented.
4. **In-lesson calls are pre-instruction.** By ASSESSMENT.md sections 3.2 and 5.1, a call inside a KC's first lesson, before its exit item, is pre-instruction and never reaches the Mirror. The curriculum's "S1.L1's first scored call is a fresh variant" (V2-05) therefore means scored for the call's feedback, not counted in the Mirror; the Mirror's first calls come from generated items after the exit item and from cells in later lessons.
5. **Settled** is shown only as a mark on KCs the caller says are settled, until the Defence (W2-T12) derives sign-off.

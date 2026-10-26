# Call It: the sheet that commits a verdict and a confidence

**Status:** built by W1-T07. **Date:** 2026-10-26 (machine clock). M-call-it (spine section 8.5; DESIGN.md sections 6.2 to 6.4; ASSESSMENT.md section 5). The first call is final: only it counts, and it cannot be edited. The pure rules (which call counts, what a draft becomes, the Mirror that reads it) are `packages/learner/src/mirror/`; this folder is the sheet, the code that writes the call, and the fixtures GATE-items reads.

## What a learner sees

A fieldset of native radios, in turn (DESIGN.md sections 6.2 and 10.3):

1. **The answer.** A verdict, a trace-length interval, a which-anomaly option, one radio per option; or, for a multiple true/false set, a True and a False radio for each statement. The item's **chance** is printed beside it: "3 options · chance 1 in 3", "all 5 by guessing: 1 in 32".
2. **How likely is this right?** Appears once the answer is complete: the three taps with their bands printed, *guess* (below 67%), *think so* (67–80%) and *sure* (above 80%), and the payoffs, printed before the tap: "Feedback only, never credit: guess +1 / 0 · think so +2 / −2 · sure +3 / −6." A set takes one confidence for the whole set.
3. **The action.** Off until both are chosen, with the reason beside it. The host names it ("Run Z3 here"), and its run starts only after the call is in the log. A box says "I had help with this call", which writes the call as assisted (OD-8: self-declared, and the copy says so).

Pressing the action records the call and turns the whole fieldset read-only. After the host's run, the sheet shows "Your call matched." or "Your call missed.", what was recorded ("Recorded: B. unsat · think so."), the payoff as feedback only, and the whys. Nothing on the sheet says "correct", and nothing sums, totals or compares a payoff.

## The first call is final

The log is append-only, so "cannot be edited" is held in layers, each tested:

| Layer | Where | Test |
|---|---|---|
| The sheet never plans a second call: `planCall` answers `already` for a question that has a call | `packages/learner/src/mirror/plan.ts`, used by `commit.ts` | `packages/learner/test/mirror-first-call.test.ts` (properties over seeded random logs); `test/commit.test.mjs` on the real adapter |
| The call is read from the log when the sheet opens and whenever any tab writes: a question already called shows its call, read-only | `useCall.ts` | the browser harness: a reload, a second tab, a tab that hears the other tab |
| Once the call is on record, the fieldset is disabled, and a tap, the help box or a second commit is ignored whatever the DOM says | `model.ts`: `reduceSession` | `test/model.test.mjs`: properties over random action sequences; the harness's forced clicks and a hostile re-enable of the fieldset |
| A call written anyway (a stale tab, a replayed import, a merged device) counts for nothing: every reader takes the first call in fold order | `packages/learner/src/mirror/calls.ts` | the property tests; the harness's stale tab and its two tabs committing at the same moment |

The commit reads the log at the write, so a tab that is open on an old view cannot call a question another tab called: nothing is written, and the sheet shows the call that stands ("This question was already called, in another tab. That call stands."). Two tabs that commit in the same instant may each write; the call that counts is the first in fold order, and both screens show it.

## Using it

```tsx
import { CallItCell, itemFromCell, itemFromInstance } from '../../components/call-it'

// an authored cell: the lesson's instrument block, with its segment's primary KC
const item = itemFromCell(block, { lesson: 'S1.L1', kc: segment.kcs?.[0] })
// a generated item, with the key its checker computed
const item = itemFromInstance(instance, key, instanceRef)

<CallItCell store={store} item={item} actionLabel="Run Z3 here" onCommitted={runTheInstrument} revealed={ranAlready} />
```

`store` is the tab's ledger store (`openLedgerStore`); `null` when the browser cannot open one (the sheet says the record is not kept, and offers no call); `undefined` while the host is still opening it (the sheet says it is looking). `CallIt` is the same sheet without the store: it takes the call that counts (`recorded`) and an `onCommit` that writes it.

| Prop | |
|---|---|
| `item` | a `ChoiceItem` (a verdict, an interval, an anomaly) or a `SetItem` (a multiple true/false set); `identity` is the ref and, for a generated instance, its seed |
| `actionLabel` | the action's words; a cell says what it will do. Default "Record my call" |
| `onCommitted(call, status)` | after the learner's action: the host's run starts here, with the call already in the log. `status` is `recorded` (this call was written) or `already` (another tab called the question first: the sheet shows that call, and the run the learner asked for still starts). Not called for a question already called when the sheet opens |
| `revealed` | show the result, the payoff and the whys. The host turns it on after the run, or at once for an item with no run |
| `layout` | `inline`, or `sheet`: below 900 px the action bar docks at the bottom of the cell (DESIGN.md section 6.2). The bar is the action alone; the help box and the reason the action is off stay in the flow above it, so the bar is the same height in every state, nothing moves under the learner's finger and nothing inside the sheet scrolls. The page reserves the bar's height as scroll padding, so a focused control above it is never hidden (WCAG 2.4.11). DESIGN.md says the fieldset docks; a whole fieldset (the answers, the taps, the payoffs and the action) is taller than a phone's viewport and would hide the question it asks about, so only the action docks |
| `skip` | the expert skip once a KC is solid: "Skip the call: you've shown this one." The host decides when; a skipped call writes nothing |
| `helpToggle` | the "I had help" box; default on |

**What a host must know.** A mounted sheet may be given another question (a host that steps through questions need not remount it): it starts again, with nothing of the last question's taps or call on it, and reads the new question's own call from the log. A call is asked on the first run of an authored cell and on every generated item, and nowhere else: free runs, Bench runs and re-runs stay ungated (spine section 8.5), so a host mounts the sheet for the first run only (a question already called shows its call, and the host offers the free run beside it). Pass the item's primary KC (`kc`): the call records it, because the Mirror places a call against instruction by it. Boot's first-contact call is `call:S1.L0/c1`; the Mirror keeps it out whenever it is made. Hosts use the glossary's terms by their own copy: the sheet's own words use "call" and plain English, so they are the same in Boot, which introduces no other term for this.

## What it writes

One `call` event, before any run result is seen (the call is committed, not only in the outbox, before the promise settles):

```
ref        call:S1.L1/c1  |  call:GEN-call-it/t1
seed       the instance's seed (generated items)
conf       guess | think | sure
ok         the call matched the key; a set is right only when every statement is
resp       { picked: 'B' }  |  { answers: { s1: true, … } }
mis        the misconception key the response matched: for a set, the first wrong statement that carries one
provenance own | assisted          exposure unseen          ms  time on task
itemRev, engine   from the item
data       { call: { form, options | statements, kc }, instance?: { ref, band } }
```

A set can match several misconceptions at once; event@1 has room for one key, so `mis` is the first wrong statement's that carries one, in statement order. A wrong answer on a true statement carries none, so it never hides the key of a tagged statement after it. `resp.answers` keeps every statement's mark, so the other keys the learner held can be read back from it.

## Files

| | |
|---|---|
| `CallIt.tsx`, `CallItCell.tsx`, `useCall.ts`, `index.ts` | the sheet; the sheet bound to the store; the hook that reads the call that counts; the exports |
| `model.ts` | The logic without the DOM: what a draft needs, grading, and a session that freezes when the log holds the call |
| `commit.ts` | `commitCall`: read the log, plan, write, and answer with the call that stands |
| `items.ts`, `types.ts` | an authored cell's call and a generated instance reduced to the sheet's two shapes; the refs event@1 allows |
| `copy.ts`, `inline.tsx` | the sheet's fixed words, in one place for review; copy as text nodes with `code` spans, never markup |
| `call-it.css` | tokens only: no stamp hue, no dashed, dotted or gradient line, no shadow; every control at least 44 px |
| `fixtures/` | the Call It fixtures (below) |
| `test/` | the tests (below) |

## The fixtures and GATE-items

`fixtures/tree/content/stages/S1/` holds three lesson pages in the page format `packages/content/README.md` describes: seven authored calls, each keyed by a verdict line of the run it cites. `fixtures/generated/instances.json` holds eight generated instances in the shape the generator framework produces, one to three for each of GEN-call-it's four templates: three three-way verdicts (template 1), one trace-length interval (template 2), two which-anomaly questions (template 3) and two multiple true/false sets of five statements (template 4).

`test/items-gate.test.mjs` runs GATE-items on them: the pages through the gate's own discovery and the content build's reader in a scratch root that also holds the registry and the runs the pages cite, and the instances through the gate's instance reader and its rules (`scripts/spikes/W1-T07/lib/items-gate.mjs`). Both pass with no finding. The test then plants a fault in a scratch copy and requires the gate to find it, on the item it breaks: an option with no why, a distractor with no misconception key, a key the registry does not hold, a key far longer than its distractors, two options that read the same, unsat answering 5 of 7 calls, every key following the narrative-blind strategy, a set whose statements are all true or mostly true, and verdicts that all key `sat`. `node scripts/spikes/W1-T07/items-gate.mjs` runs the gate's command line on the same scratch root. Each of the seven cells carries the code its call is about, so that `node scripts/spikes/W1-T07/calls-gate.mjs` can run GATE-calls on the pages too: native Z3 and Pyodide's Z3 agree on every call, every unsat is cross-checked with cvc5, and each key is what the cell's first check gives.

The generated fixtures are held to the gate's rules once each, as a pool of eight; they are not sampled at 200 seeds per template and band, which is the family's own run (GEN-call-it, W1-T24).

## Tests

```
node --test "apps/site/src/components/call-it/test/*.test.mjs"
node --test "apps/site/src/screens/mirror/test/*.test.mjs"
```

| File | Holds |
|---|---|
| `model.test.mjs` | the fixtures reduce to items; the refs; verdict then confidence then action; grading, with a set's misconception key checked over every way of marking a set; the call event the Mirror reads; the session, with two properties over random action sequences |
| `commit.test.mjs` | `commitCall` on the real ledger adapter over fake-indexeddb: one call written, a stale tab, tabs that commit at once, a read-only store, a store that fails, a set written with the key it matched, the Mirror reading what the sheet wrote |
| `render.test.mjs` | the markup a reader and a screen reader get, escaping, unique ids, and the vocabulary: the sheet's own words (`copy.ts`) against the glossary (no internal name, no ID of the machinery, no bare status word, no term beyond the five Boot introduces), and the words of each fixture item, rendered open, matched and missed, against the terms its lesson may use (an authored call's own lesson; a generated item's, the terms S1 introduces) |
| `items-gate.test.mjs` | GATE-items on the fixtures, with planted faults |

The browser harness (`scripts/spikes/W1-T07/harness/`, `scripts/spikes/W1-T07/README.md`) runs the real sheet on the real adapter in Chromium, Firefox and WebKit: the first call is final (a reload, a second tab, a tab that hears the other tab, a stale tab, two tabs that commit at once, a forced click, a hostile re-enable), a mounted sheet given another question, the keyboard path of DESIGN.md section 10.3, axe at 320, 360 and 1280 px in both themes, target sizes, and the docked bar.

`scripts/spikes/W1-T07/mutants.mjs` holds the weakened copies that show the tests hold what they claim: 16 changes to the sheet's rules and code (a tap or a second commit taken after the call is recorded, a question written again, a lost race told its own call stands, a set right when one statement is, a set's misconception key taken from a first wrong statement that has none, a failure that reopens a recorded sheet, "Correct!" in the copy, a term Boot has not introduced in the sheet's own words...) each fail at least one test of this folder, and 8 changes to the sheet (the fieldset left open, a stale tab that writes, an open tab that does not hear another, a recorded sheet that shows the learner's taps, no scroll padding for the docked bar, the host's run started before the call is in the log, a sheet given another question that shows the last question's call or keeps its taps) each fail the harness in Chromium.

`scripts/spikes/W1-T07/record.mjs` records the tests, GATE-items on the fixtures, the weakened copies and the browser runs together as `RUN-call-it-mirror` (`runs/RUN-call-it-mirror.json`), with the browsers' versions and the counts.

## Not yet

- The instrument cell that hosts the sheet is W1-T06's, the lesson screen W1-T02's, and Boot W1-T09's. The harness's mock cell stands in for them.
- A trace-length interval and a which-anomaly item are choices here; their generated templates wait for engines of later waves (GEN-call-it's templates 2 and 3, W1-T24).
- A confidence-only mode for an item whose answer is built elsewhere (a constructed answer, no guessing floor) is not here; the Mirror already reads such a call (`data.call.form: 'constructed'`).

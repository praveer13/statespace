# SCR-mirror: the Mirror

**Status:** built by W1-T07. **Date:** 2026-10-26 (machine clock). Private calibration and VRK30 (M-mirror, SCR-mirror; spine section 8.5; DESIGN.md section 6.12 and SCR-mirror; ASSESSMENT.md sections 5.6 and 3.6). It is reached from Today at `/mirror` (ARCHITECTURE.md section 3.2), is never linked from Claims, and is never part of an exported report.

The screen is a view of two derivations in `packages/learner/src/mirror/` (`deriveMirror`, `deriveVrk30`) and holds no rule of its own: what counts, what a band is diagnosed on and how a stated confidence is imputed are that package's, and `packages/learner/src/mirror/README.md` explains them. Nothing is stored (I2): the screen reads the event log when it opens and whenever any tab writes to it.

## What a learner sees

- **Calibration.** For calls with one answer, and, when there are any, for calls on a set of statements (a multiple true/false set has its own group, spine section 8.5):
  - **Bias** leads: the mean stated confidence minus the hit rate, with its interval, shown from 20 calls. Below that: "Too few calls to say anything about bias yet (n of 20)."
  - **Hit rate by band**: guess (below 67%), think so (67–80%) and sure (above 80%), each with its n, its hits, its Wilson 95% interval written as numbers and drawn as a dimension line on a 0 to 100% axis beside a pale bracket for the band's range (think so and sure as printed; guess from its chance level to 67%). A band gets a sentence only when it holds at least 20 calls and its interval lies wholly outside the band: "Your “sure” calls hit less often than “sure” says: 18 of 30, interval 0.42–0.75." Below 20: "Too few calls in this band to say anything yet (12)." The interval reaching the band: "The interval reaches the band, so there is nothing to report."
  - **Resolution**, shown apart from bias and only when both ends have enough calls.
- **Calls made with help, shown apart**, with counts and intervals and no sentence, never pooled with the rest.
- **What counts**: the learner's own calls that count, and each reason a call was left out, in words, when there is one.
- **Reasoning moves still yours at 30 days (VRK30)**: the count of ideas, the rate per active study-month, the accuracy over answers given 30 days or more after first learning with its interval, and the ideas that count, in words (a KC is an idea; its ID is never shown), each with when it was first learned and last answered. A mark says "settled" for an idea the caller says is settled.
- **How to read this**: a drawer, closed, with the bands, the interval, how bias is taken, the minimum, what counts, and the honesty sentence: "Provenance is self-declared. Nothing on this device can tell assisted work from unassisted work."

Ink only (DESIGN.md sections 2.1 and 6.12): no stamp hue, no green for good or red for bad, no comparison with anyone, no score. A sentence is about the calls, never the person. The screen is phone first: one column at 320 and 360 px, every control at least 44 px, two columns from 900 px (bias and the bands on the left, VRK30 on the right).

## Files

| | |
|---|---|
| `route.tsx` | `routes`, one route, `mirror`, loaded lazily, with no guard and no loader that redirects (I5). W1-T02's shell discovers it |
| `MirrorRoute.tsx` | opens the ledger store, reads the events, subscribes (a call made in another tab appears without a reload), reads the clock, and hands the two derivations to the screen |
| `MirrorScreen.tsx`, `Interval.tsx` | the screen; the dimension line, a drawing of numbers the row already prints, hidden from assistive technology |
| `content.ts` | what the Mirror needs from content: first-taught lessons and first-contact lessons from the KC graph, and an exit item's `data.exit = { lesson }` for first learning (the package README, section 5) |
| `copy.ts`, `mirror.css` | the screen's fixed words, in one place for review; tokens only |
| `test/` | the render tests (below) |

## Tests

```
node --test "apps/site/src/screens/mirror/test/*.test.mjs"
```

`test/render.test.mjs` draws the real screen to static markup over the real derivations of a learner's log: the states, privacy and the way back to Today, the diagnosis table of ASSESSMENT.md section 5.6 as the screen words it, bias and its threshold, the group for sets, assisted calls apart, what counts, VRK30, the document's structure, every word of the screen's own copy and of the pages it draws against the glossary (no internal name, no ID of the machinery, no bare status word, and no glossary term whose first lesson comes after S1.L1, so nothing about claims or seams, which S1.L3 introduces; an idea's name is the KC graph's, not the screen's, and the test gives it two), and the stylesheets (ink only). The browser harness (`scripts/spikes/W1-T07/harness/`) draws the screen at 320, 360 and 1280 px in both themes in Chromium, Firefox and WebKit with axe, target sizes and the keyboard, and mounts the route over the real IndexedDB adapter with the clock fixed while a second tab writes calls.

The same run (`scripts/spikes/W1-T07/record.mjs`, `RUN-call-it-mirror`) records the screen's tests and its browser results beside the sheet's.

## Not yet, and why

- **The Mirror is empty until exit items carry `data.exit = { lesson }`.** First learning is the first attempt at a lesson's exit item (ASSESSMENT.md section 3.2), and event@1 has no field for the lesson an item was served in. Whoever writes exit items (the lesson screen, the lessons, Today) must write it; until they do, every call is before instruction and the screen says nothing counted yet. See the package README, section 7.
- **Settled** ideas are marked only from a set the caller passes, and without a date (DESIGN.md section 6.12 lists "the settled KCs with their dates"); sign-off and the settling probe are the Defence's (W2).
- **VRK30 counts events whose KC it can read**: `data.kc` on a fresh item event, until a read-time resolver from an item to its template's KC exists.
- **A link from Today** belongs to W1-T08's screen.
- Every figure the screen prints is derived from the learner's own events. No tool number appears on the screen.

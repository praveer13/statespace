# W1-T01 helpers

The recipes behind W1-T01's font subsets, and the browser harness that checked the stamp and strip components. The gates themselves are `scripts/verify-stamps.mjs` (GATE-stamps) and `scripts/verify-codes.mjs` (GATE-codes); nothing here is a gate.

| File | What it does |
|---|---|
| `build-fonts.mjs` | downloads the pinned sources of the three faces (each checked against the SHA-256 it records), subsets them with fontTools under `uv`, writes `apps/site/public/fonts/` (the WOFF2 files, each face's license and `fonts.json`) and rewrites the generated `@font-face` block of `apps/site/src/styles/tokens.css`. With `--check` it rebuilds into the scratch directory and fails unless the committed files are byte-identical |
| `subset-fonts.py` | the fontTools step `build-fonts.mjs` runs: instancing, subsetting to WOFF2 without recalculated timestamps, and the vertical metrics and average advances the fallback faces are matched to |
| `harness/` | one page of every stamp, a strip, a "modulo" reading, an [?] that fails closed and an agent's quote, built with Vite under a project base path; `check.mjs` serves it inside the pinned Playwright image and runs axe at 320, 360 and 1280 px in both themes in three engines, checks that the page never scrolls sideways, and writes plain, grayscale and forced-colors screenshots |
| `mutate.mjs` | measures whether the gates' self-checks notice a weakened rule, on a scratch copy of the repository. `sinks` tags every place a gate records a finding with its line, plants every fault once, and lists the places no plant depends on; `mutate` removes each alternative of each regular expression in a gate's rules in turn (and applies each change a list file names), and lists the mutants that neither turn the tree red nor leave a planted fault missed |
| `weakenings.mjs` | the list file for `mutate.mjs mutate --listed-only`: the weakenings a reviewer tried on both gates, adapted to the current code, one for each rule the W1 repair rounds added, and two generated kinds: each list of exemptions or scopes widened by one plausible entry (a folder, a key, an attribute, a class, a property, a pseudo-class, a quotation mark, a negation), and each exact match that decides a finding turned into a prefix match |

## Re-running

```
node scripts/spikes/W1-T01/mutate.mjs sinks --work <scratch directory>
node scripts/spikes/W1-T01/mutate.mjs mutate --gate codes --work <scratch directory>
node scripts/spikes/W1-T01/mutate.mjs mutate --gate stamps --skip 'PLACEMENT|LAYOUT|NO_SIGNATURE|TRANSIENT|NOT_ON_THE_BOX|NEGATION_(BEFORE|AFTER)' --work <scratch directory>
node scripts/spikes/W1-T01/mutate.mjs mutate --mutants scripts/spikes/W1-T01/weakenings.mjs --listed-only --work <scratch directory>
```

A surviving mutant that removes an entry from a list of exemptions makes the gate stricter, not weaker, and needs no plant. A plant's control (`no(check, where)` in a gate's PLANTS) is a form the rule must leave alone, so `sinks` reads it as depending on no finding site. The five finding sites `sinks` leaves uncovered in GATE-stamps, and the one in GATE-codes, report that the gate could not load its own dependencies, that a check threw, or that the compiler could not type the copies the hand check asked about; no fault planted in a copy of the tree can make them happen.

```
node scripts/spikes/W1-T01/build-fonts.mjs --work <scratch directory> [--check]

HARNESS_OUT=<scratch>/dist npx vite build -c scripts/spikes/W1-T01/harness/vite.config.mjs
docker run --rm --memory=6g --network none -v "$PWD":/repo:ro -v <scratch>/dist:/dist:ro -v <scratch>/out:/out \
  mcr.microsoft.com/playwright:v1.63.0-noble node /repo/scripts/spikes/W1-T01/harness/check.mjs /dist /out /statespace/
```

The font build needs network access for the pinned sources, `uv`, `curl`, `tar` and `fc-match` with the Liberation faces installed (their advance widths are those of Arial, Times New Roman and Courier New, which the fallback stacks name). The sources, their hashes, the tool versions and the command are in `apps/site/public/fonts/fonts.json`.

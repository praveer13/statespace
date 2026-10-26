# @statespace/kc

The KC graph v0 of spine section 4 as data and code, and GATE-kc, the gate that holds it, the content and both
published paths to the spine (spine section 11.2). W1-T04 builds both, with GATE-coverage beside them
(`scripts/verify-coverage.mjs`). The package is pure (no I/O); `scripts/verify-kc.mjs` does the reading.

## What is here

| Path | What |
|---|---|
| `content/kc/graph.yaml` | **The source.** The 105 KCs (26 threshold) with their requires (hard and soft), confusable and threshold edges, each KC's first lesson and item sources; the confusable sets A–H; the fading families F1–F6; per lab stage its KC tags, the artifacts it uses and the tools it needs; the lab artifacts a lesson applies; the substitutes of spine section 3.0; and the crossings that wait on an owner decision |
| `src/graph.generated.ts` | `GRAPH`, the loaded graph as a typed constant. **Generated** by `node scripts/verify-kc.mjs --write`; GATE-kc fails while it is stale |
| `src/types.ts`, `src/load.ts` | The types, and the strict loader of `graph.yaml` (unknown keys, malformed IDs and dangling references are problems) |
| `src/graph.ts` | Queries: `kcById`, `requirementsOf`, `prerequisitesOf`, `canCredit`, `blockingRequirements`, `creditOrder`, `confusableSetsOf`, `fadingFamilyOf`, `firstContactIn`, `kcsFirstTaughtIn`, `kcsOfStage`, `findCycle`, `topologicalOrder`, `labStageById` |
| `src/paths.ts` | The published paths as ordered units, from `content/stages/budget.yaml` (whose paths GATE-budget holds equal to spine section 3.0) |
| `src/content.ts` | The KC tags of content: `readPage` (a lesson@1 page) and `unitsOfRecord` (audit anchors, specimens, generator templates, lab data, placement steps) |
| `src/spine.ts` | What the gate reads from the spine: the section 4 tables and paragraph, the first-contact notes in the lesson rows, the builder path and section 3.0's table of jumps |
| `src/check.ts` | GATE-kc's checks, pure |
| `test/` | Unit tests, the gate on the real tree, every planted fault, and GATE-coverage's tests |

## Using the graph

```ts
import { GRAPH, canCredit, confusableSetsOf, creditOrder, firstContactIn, kcById } from '@statespace/kc'

kcById(GRAPH, 'KC-4.cti-or-bug')?.threshold              // true
canCredit(GRAPH, 'KC-1.three-answers', credited)          // a placement walk or test-out credits a KC only once
                                                          // every hard requirement is credited (spine section 8.6)
creditOrder(GRAPH, passed, credited)                      // { credits, waiting }: the order passes credit in
confusableSetsOf(GRAPH, 'KC-6.differential-testing')      // sets A and G: M-which-is-it interleaves within one set
firstContactIn(GRAPH, 'S1.L0')                            // Boot's call: recorded, scheduled, counted toward no KC state
```

Every query takes the graph explicitly, so a test can pass a small one. Soft edges never block credit; hard edges
always do.

## The graph file

`content/kc/graph.yaml` is written in the repository's YAML subset (`packages/ids/src/yaml-subset.ts`). Its KC rows,
names, stages, threshold flags, requires (hard and `requires_soft`) and confusable edges, the sets and the families
equal spine section 4 exactly, and GATE-kc fails on any difference: change the spine first, then the file, then run
`--write`. What the spine does not tabulate comes from the stage specs:

- **`first_taught`**: the first lesson or step briefing, in roadmap order, whose spine row lists the KC. Boot's call
  on KC-1.violation-as-sat is first contact (spine section 12 item 33), so that KC is first taught in S1.L1. The
  KC-10 KCs are first taught in the step briefings S10.L6 and S10.L7.
- **`families`**: the generator families whose items carry the KC: the specs' exit items and Today cards,
  ASSESSMENT.md section 4's per-family KC lines and curriculum/D-drawers.md section 6.6. A KC may instead name a
  `bank` of authored isomorphs; no KC needs one today.
- **`lab_stages`**: `kcs`, what the stage's checks exercise (so every lab check carries KC tags through its stage);
  `first_contact`, for the two-minute wins that run the course's reference before the lesson that teaches their KCs;
  `uses`, the earlier stages whose artifacts the stage consumes (the specs' lab sections, and the claim mints of spine
  section 5.2); `tools`, the set-up whose first use on a path needs its drawer (D-14 for Lane A, D-15 for the
  devcontainer); and, for a `[stretch]` stage, the unit it follows (`after`), because no budget sequence places it.
- **`lesson_uses`**: per lesson, the lab stages whose artifacts its objective, worked example or copy applies (the
  stage specs): S6.L2 applies LAB-3.7's self-transfer decision record and S6.L4 its decision-record form, S8.L4
  LAB-6.6's retry policy, S9.L8 LAB-6.7's R(S, D), and S9.L9 the six components its trust inventory marks. These are lab-artifact dependencies too, so the
  path checks hold them like a lab stage's `uses`. The file's comment lists what is left out and why (erosion
  forecasts, which GATE-erosions replays on both paths; rows naming a whole lab; the S10 steps).
- **`substitutes`**: the crossings of spine section 3.0's table on the builder's path: the soft edge
  KC-6.rowcount-as-guard → KC-3.big-step-errors (drawer D-23), and LAB-6.6 and LAB-8.5 using LAB-6.2's compiler (the
  reference compiler, "reference module, earns nothing"). An `artifact` entry's first element is the lab stage or
  the lesson that uses the artifact.
- **`pending_crossings`**: a crossing that section 3.0's table does not substitute yet, with the owner decision it
  waits on. GATE-kc reports each as a warning, so the gap is labeled in every run without failing the path. Today
  there is one: on the builder's path S6.L2 runs before S3 yet applies the LAB-3.7 self-transfer decision record,
  and section 3.0 names nothing for it (D-23 stands in only for the soft edge). When the owner decides, the
  substitute goes into the spine's table and `substitutes`, and the pending entry comes out (the loader refuses a
  crossing that is both).

## KC tags in content

GATE-kc reads the tags where the content's own formats put them, so the authoring tasks need nothing beyond them:

| Content | Read as | Where the tags are |
|---|---|---|
| lessons, drawers (`content/stages/S*/S*.L*.md`, `content/drawers/D-*.md`) | lesson@1 pages, through packages/content's `parsePageSource` | each item's `kcs` (primary first), and each segment's own `kcs` (`## Title {minutes=N kcs=...}`; lesson@1's `$defs.segment.kcs`). A cell's Call It counts toward its segment's declared KCs ("a cell's call is for its segment's components"); a segment that declares none carries, and lends its calls, the KCs of its graded items, or of its prequestions when it holds only those. A GEN-call-it segment item counts toward its own tags |
| `content/audit/**` | records | the anchor's `kcs` (an object whose `id` is AUD-n.k, or the file AUD-n.k itself) |
| `content/specimens/**` | records | each specimen's `kcs` (an object whose `id` or key is SP-n.k) |
| `content/generators/**` | records | each template's `kcs`, or the family's when a template has none (entries of `templates`, or objects whose `id` or `template` is t1, t2, ...) |
| `content/stages/S*/lab.yaml` | records | a check's own `kcs` if present (they must be KCs of the graph); otherwise its stage's `kcs` in `graph.yaml` |
| `content/stages/S*/placement.yaml` | records | each item's `kcs`, or the enclosing step's |

A tag key may be `kcs`, `kc`, `primary`, `secondary` and their snake and camel forms (`TAG_KEYS`); a list, a comma
list and `{primary, secondary}` are all read.

## What GATE-kc checks

`node scripts/verify-kc.mjs` (fast lane; `--verbose`, `--json`, `--write`, `--self-check`, `--root DIR`):

| Check | Fails when |
|---|---|
| `graph` | `graph.yaml` does not load: an unknown key, a malformed ID, a reference outside the graph |
| `generated` | `src/graph.generated.ts` differs from what the graph generates |
| `spine` | the graph differs from spine section 4 (KCs, names, stages, threshold flags, edges, sets, families) or from the first-contact notes of the lesson rows |
| `counts` | the graph holds fewer than 80 or more than 110 KCs |
| `dag` | the requires edges (hard and soft) have a cycle |
| `sources` | a KC has no item source; a threshold KC has no generator and fewer than four isomorphs; a family is unregistered or not used in the KC's stage (spine section 8.3's Stages, "all" included) |
| `first-taught` | a KC's first lesson is not the first lesson or step briefing whose row lists it |
| `order` | a requires edge's target is first taught after its dependent in roadmap order |
| `labs` | a lab stage of the spine is missing or misflagged; a stage with a check has no KC tags; the artifact dependencies have a cycle; `lesson_uses` names a lesson the spine does not have |
| `paths` | on a published path a hard edge is broken; a lab stage comes before a KC it exercises (first contact aside); a lab stage or a lesson comes before an artifact it uses or applies; a soft edge or an artifact is crossed with neither a substitute that spine section 3.0's table names nor a pending entry; a substitute or pending entry is declared that the path does not need; a tool's first use is not named by its drawer's "Used in"; the path's lessons differ from spine section 3.0 |
| `tags` | an item, segment, lab check, audit case, specimen, template or placement item carries no KC tag, or a tag that is not a KC of the graph (a segment's declared `kcs` included); a lesson item's primary KC is first taught after its lesson on a path (ASSESSMENT.md section 7.4); a content file cannot be read |
| `dose` | a KC's first lesson or step briefing, once authored, has no prequestion, no call or no exit item tagged with it, a cell's call counting toward its segment's KCs as above. KCs whose first page is not authored yet are listed as pending, not failed |

A **warning** never fails the gate. Today there are two, both on the builder's path:

- S6.L2 comes before LAB-3.7 but applies its self-transfer decision record, and section 3.0's table names no
  substitute. The warning names the owner decision it waits on (`pending_crossings`), and the path's summary counts
  it apart from the substituted crossings ("4 crossings: 3 with their substitutes ... and 1 with none yet").
- D-14's "Used in" names LAB-8.4 as the first Lane A work on the builder's path, but LAB-6.6's classifier is Lane A
  (curriculum/S06-correspondence.md section 3) and comes earlier on that path. D-14 is named for LAB-6, so the path
  holds; the sentence is reported to the spine.

`--self-check` plants twenty-four faults in memory, at least one per rule, and requires each to fail its check; the
tests run the same plants (`test/gate.test.ts`).

## GATE-coverage

`node scripts/verify-coverage.mjs` (fast lane; `--json`, `--self-check`, `--root DIR`) parses `docs/COVERAGE.md`
and fails when a row's lesson, LAB (lab, stage or check), CL or SP ID does not resolve against the registry, ranges
between IDs of one prefix included (SP-1.9–SP-1.12 checks SP-1.10 and SP-1.11 too), or when a lesson the row cites was
cut and the row names no receiving ID. A cut is applied in spine section 14's table by striking the bridge through
(`~~S4.L5~~`) or marking its row "cut"; its receivers are the lessons of the row's last cell, passed on when a
receiver is cut too. None is cut today.

## Commands

```
node scripts/verify-kc.mjs                 GATE-kc
node scripts/verify-kc.mjs --write         regenerate src/graph.generated.ts after editing content/kc/graph.yaml
node scripts/verify-kc.mjs --self-check    the planted faults
node scripts/verify-coverage.mjs           GATE-coverage (--self-check plants an unresolved ID and a cut)
npm run test -w @statespace/kc             the tests
npm run typecheck -w @statespace/kc
```

## Limits

- The graph records what the specs say a lab stage uses and exercises and what a lesson applies; a dependency the
  specs leave unsaid is not checked. Within-stage order comes from the budget file's sequences, which the "Build
  this" cards set.
- A Markdown page is read through packages/content, which needs the workspace installed (`npm ci`); without it, a
  page cannot be read and fails, because its tags cannot be seen.
- A cell carries no tags of its own (lesson@1), so the dose check credits its Call It to the KCs its segment declares.
  For a segment that declares none (lesson@1 leaves the field optional), it falls back to the KCs of the segment's
  graded items, then of its prequestions; an author who wants a call to count for a KC its items do not carry
  declares it on the segment.

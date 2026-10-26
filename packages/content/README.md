# @statespace/content: the content pipeline

**Status:** built by W1-T36 (ARCHITECTURE.md section 3.3). **Date:** 2026-10-25 (machine clock).

The pipeline turns what authors write under `content/` into what the site loads: it validates every lesson, drawer, stage and lab record against `schemas/lesson.schema.json` (whose root picks the definition by the record's ID) and the ID registry generated from the spine, resolves the run references, computes `itemRev`, builds the titles-only rail, and writes per-lesson JSON, per-lesson Markdown, the search index and the published schemas. The logic is this package, pure TypeScript with no file access; `scripts/build-content.mjs` reads the repository and writes the files.

```
content/stages/S{n}/S{n}.L{k}.md     lessons             \
content/drawers/D-{nn}.md            drawers              |  scripts/build-content.mjs
content/stages/S{n}/stage.yaml       a stage's own data   |    parse, validate against the schema and the registry,
content/stages/S{n}/lab.yaml         a lab's own data     |    resolve run and fact references, derive, hash
runs/RUN-*.json, content/registry/   what references name |
schemas/*.schema.json                                    /
        |
        v   apps/site/public/
content/<id>.<hash>.json     one page, lazy and content-hashed       md/<id>.md       the same page as Markdown
content/stages.<hash>.json   the ten stages, joined to the spine     md/index.json    the index llms.txt is written from
content/labs.<hash>.json     the ten labs, the same way              schemas/*.json   the published JSON Schemas
content/search.<hash>.json   the search index                        content/manifest.json   the entry point
```

Nothing is written when anything is an error, so a deploy never carries half a build.

## 1. Writing a lesson or a drawer

A page is a Markdown file with YAML front matter. The body is segments (a level-2 heading each) of blocks. Ordinary Markdown is a `prose` block; the other five block types are written as `:::name` containers, or as one line `::name` when they have no body. The reader is strict, says where it stopped (a line number and what it expected), and keeps reading after an error.

**Learner copy is never inside a code fence.** GATE-numbers and GATE-facts skip fenced code, so a number written in a fence would escape them. Only code is fenced.

### 1.1 A page

````markdown
---
id: S1.L2
tier: bridge
title: "Three answers: sat, unsat, unknown"
draft: true
kcs: [KC-1.three-answers, KC-1.unknown-fails-closed]
objective: Say what sat, unsat and unknown each assert about one query.
drawers: [D-13]
---

## What each answer asserts {minutes=12}

:::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.three-answers,KC-1.unknown-fails-closed
@choice key=C
A deploy gate asks Z3 whether a rule can overdraw any account, and Z3 answers `unknown`. What is established?

- A. No account can be overdrawn.
  - why: `unknown` is no verdict.
  - mis: dp:Z2
- B. Some account can be overdrawn.
  - why: Only `sat` with a replayed model shows a violation.
  - mis: dp:Z1
- C. Nothing about the rule, so the gate blocks it until the question is decided.
  - why: A gate that lets `unknown` through has no evidence at all.
:::

The solver answers for one query, one encoding and one run.[^1]

[^1]: Drawer D-13 holds the SMT-LIB vocabulary.

:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow
```python
from z3 import *
x, y = Ints('x y')
s = Solver()
s.add(x**y == 8, y > 1)
print(s.check())
```

@direction
Query asserts: two whole numbers whose power is eight, with an exponent above one.

@call key=C surprise=yes run=RUN-z3-unknown-pow
What will Z3 return?

- A. `sat`
  - why: A solution exists, but the verdict reports this run, not the truth.
  - mis: dp:Z6
- B. `unsat`
  - why: A solution exists, so a guess of unsat misread the constraint.
  - mis: dp:Z5
- C. `unknown`
  - why: The reason line names the gap.

@after
The same run decides a neighbouring query that has an exponent variable.
:::

::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers

## Exit {minutes=3}

::item role=exit family=GEN-which-stamp template=t1 kcs=KC-1.unknown-fails-closed,KC-1.three-answers

:::card variant=build-this title="Build this" lab=LAB-1.3
Next, add the sufficient-funds guard and read the answer.
:::
````

### 1.2 Where files go, and what each is

| File | Is | Schema |
|---|---|---|
| `content/stages/S1/S1.L1.md` | a lesson; the file name is the ID | `lesson.schema.json`, root |
| `content/drawers/D-03.md` | a drawer, deferred ones included; the file name is the ID | `lesson.schema.json`, root (a drawer has no tier) |
| `content/stages/S1/stage.yaml` | what a stage page needs beyond the spine's tables: the record whose ID is a stage, `S1` | `lesson.schema.json`, the stage definition |
| `content/stages/S1/lab.yaml` | what a lab page needs beyond the spine's tables: the record whose ID is a lab, `LAB-1` | `lesson.schema.json`, the lab definition |

A Markdown file anywhere else in those folders is an error. `content/stages/budget.yaml` and `content/stages/S{n}/placement.yaml` belong to other tasks and are left alone; any other file is reported as not read.

**A stage or lab file starts with `schema: statespace/lesson@1`.** The line is required (`schema-tag`), because it is how GATE-schema finds the file: the gate reads every YAML file that declares a tag, in TypeScript and with PyYAML, and requires the two verdicts to agree (section 4.1). PyYAML reads YAML 1.1 and this build reads YAML 1.2, so an unquoted `no`, `off`, `2026-10-25`, `1e3`, `0777`, `1_000` or `12:30` is one value to one reader and another to the other (a date is not even JSON, so the gate fails on it). The build reports such a scalar where it is written (`pyyaml`), and the cure is quotes. Quoted strings, block scalars, `true`, `false`, `~`, plain decimal numbers and the IDs a content file holds are the same to both. The page front matter below is read by this build alone, as YAML 1.2.

### 1.3 Front matter

| Key | Holds |
|---|---|
| `id` | the lesson or drawer ID; it must be in the registry and must be the file name |
| `tier` | a lesson's tier from the spine's table: `boot`, `core`, `bridge` or `step`; absent for a drawer |
| `title` | the spine's title for the ID; a different title is a warning |
| `draft` | `true` while the page is unreviewed, `false` after learner-zero and the owner have been through it; required |
| `kcs` | the knowledge components the page teaches; `[]` for a deferred drawer |
| `previews` | a drawer only: the knowledge components it previews |
| `objective` | the observable objective, in the learner's words |
| `drawers` | the drawers linked beside the segments |
| `deferred` | a deferred drawer only: `topic`, `why` and `trigger`, and no segments |

The build derives `minutes`, `rail`, `establishes`, `runs`, `facts`, `checkedBy`, `unresolved` and `rev`; writing one is an error. The front matter's YAML is read as YAML 1.2 with no duplicate keys, so `no` and `2026-10-25` stay strings. Quote a title that holds a colon. A document whose aliases expand past the YAML library's limit is reported (`front-matter`, at line 2) and never crashes the build.

### 1.4 Segments

`## Title {minutes=14 kcs=KC-1.a,KC-1.b}` starts a segment. The title is plain text, because the rail shows it and only it (section 2.4). Minutes are whole, 1 to 60. `kcs` names the knowledge components the segment teaches (every lesson segment carries KC tags, spine section 4, and GATE-kc reads them; a cell's call is for its segment's components); a component the page's `kcs` does not list is a warning (`segment-kc`). The segment anatomy of spine section 3.0 (12 to 15 for a core segment, one instrument run, a graded item last) is GATE-lessons's to check. Text before the first segment is an error, and so is a level-1 heading, and so is a heading drawn with a line of `=` or `-` under a line of text (`heading`, reported at the underline, in prose and inside a block): a page's only structure is `## Title {minutes=N}`, and text under any other heading would never be a segment. A line of hyphens after a blank line is a rule, and one under a list item, a quote, a table or code belongs to it; neither is reported. HTML comments are removed from the body, so an author can leave a note to a reviewer in one.

### 1.5 The six block types

W1 to W2 content uses these six and no more (V2-18; spine section 12 item 48). `BLOCK_TYPES` is the list, and a seventh needs a logged decision in the spine, then a change to the list and to the schema together.

| Type | Written as | Holds |
|---|---|---|
| `prose` | Markdown between blocks; there is no `:::prose` | text with sidenotes (Markdown footnotes), a table, a figure drawn from runs; images and raw HTML are refused |
| `instrument` | `:::instrument ins=INS-z3 cell=1 recorded=RUN-id` | a tab instrument cell: its code, its query direction, the interpretation tap, the authored Call It, and the text after the first run |
| `item` | `::item role=... family=GEN-... template=t1 kcs=...` | a graded item that names its generator family and template; a fixed instance (a prequestion) carries a `@choice` |
| `claim` | `::claim template=CL-1.1` | a claim the page mints; no text |
| `specimen` | `::specimen id=SP-1.1` | a specimen the page mounts, or `mount=false` to only show it; no text |
| `card` | `:::card variant=... title="..." lab=LAB-1.2` | a content card; its body is its text |

**Item.** `role` is where it sits: `prequestion` (first in its segment), `segment` (ends a segment) or `exit`. `family` is a generator family the spine registers and `template` is `t1` up to the family's template count. `kcs` lists one to three components, the first primary (evidence credits only the primary one). `mode` (`pick`, `fix`, `write`) and `band` (1 to 3) are optional. A generated item has no body, so it is one line; its instance is made from a seed and its key comes from a checker at grade time.

**Instrument.** `cell` numbers the cell in the page from 1, each once, and the number is its identity in an event's ref (`cell:S1.L3#2`), so it never changes once a learner may have called it. `recorded` is the run the cell shows while its engine is cold or downloading. A lesson's cell asks for a call on its first run; `call=false` turns that off, and a drawer's cells are free runs (`call=false` is their default, and a drawer takes no `@call`). The body is, in order, optional text, at most one fenced code block (its language follows the fence, and ` ```python editable ` says the learner may edit it before a free run), and then sections, each opened by a line that starts with `@` at column 1:

| Section | Holds |
|---|---|
| `@direction` | "Query asserts: ... `sat` means ..." |
| `@tap` | one line: the property the query tests, in words (fills "so ... holds") |
| `@call key=B run=RUN-id surprise=yes` | the Call It: a choice (section 1.6); `run` is the run that establishes the key and `surprise` is the author's forecast (`yes`, `moderate` or `no`) |
| `@after` | text shown after the first run, once the call is committed |

**Card.** `variant` is `build-this`, `twin`, `dated-incident`, `feels-harder` or `reading`. A `build-this` card names its next lab stage with `lab=`, and the build adds the stage's minutes; no other variant takes `lab`. `reading` is the dated, section-level pointer a bridge lesson carries; the spine names the other four.

### 1.6 A choice

A choice is a question with a fixed set of options, in an item's `@choice` or a cell's `@call`:

```
@call key=B
The question, as the learner reads it. It may run over several lines.

- A. The first option.
  - why: Why it is wrong, or right.
  - mis: dp:Z1
- B. The key.
  - why: Why it is right.
```

Rules the build enforces: two to eight options, lettered `A`, `B`, ... in order; `key=` names one of them; every option has a `why`; every option except the key has a `mis`, a misconception key the registry holds (`dp:Z1`, proposed ones included), and the key has none; no two options say the same thing. Lines under an option are indented by at least two spaces, and a line that is not indented ends the options. A choice does not give an answer away through a segment title: see section 2.4.

### 1.7 References in copy

| Write | The build | The site shows |
|---|---|---|
| `{{run:RUN-z3-starter#values.model}}` | prints the value from the run's record (numbers grouped in thousands), so the number is generated, never typed | the value |
| `{{run:RUN-z3-starter}}` | keeps it, and puts the run in the page's `runs` table | a run chip that opens the run sheet |
| `[X RUN-z3-starter]` | writes `{{run:RUN-z3-starter}}`, one per run in the tag, and drops a value path (GATE-facts checks the sentence against it) | a run chip |
| `{{fact:tool.z3.pypi-latest}}` | keeps it, and puts the fact in the page's `facts` table | the fact's value, with the "stale since" badge once its TTL has passed |

The documents' form `[X RUN-id]` needs its run on disk, in a draft too. A `{{run:}}` reference to a run that `runs/` does not hold is a warning in a draft (`run-pending`; the page's `unresolved` lists it, and the site renders "run not yet recorded") and an error in a page with `draft: false` (`run-unresolved`; GATE-runs fails it too). A run ID the spine does not register, and a value path the record lacks, are errors. The same rules apply to the runs a block names in its own fields (`recorded=`, a choice's `run=`). A title holds no reference.

The format placeholders (`{{run:RUN-id}}`, `[X RUN-id]`, `{{run:ID}}`) name the form and are not references.

### 1.8 What the build checks, by code

An error stops the page and, with it, the build; a warning is printed, and `--strict` fails on warnings too.

| Code | Means |
|---|---|
| `front-matter`, `yaml` | the front matter is missing, unclosed, not YAML (or its aliases expand past the library's limit), or has a key that is derived, unknown or misplaced; the same for a stage or lab file's YAML |
| `schema-tag`, `pyyaml` | a stage or lab file without `schema: statespace/lesson@1`, or with an unquoted scalar that PyYAML reads as another value than this build does (section 1.2) |
| `before-first-segment`, `heading`, `container`, `body`, `attributes`, `code`, `choice` | the body does not read: text before the first segment, a level-1 heading or a heading drawn with an underline, a block that is never closed or nests, a body where a block has none, an attribute that cannot be read or is missing, a second code fence, an option list that does not parse |
| `block-type` | a block type outside the six (the block is kept, so a gate can count it); `:::prose` has a message of its own, because prose is the Markdown between blocks |
| `schema` | the record does not match `lesson.schema.json`; the message names the path and the line |
| `file-name`, `id-unregistered`, `tier-mismatch`, `deferred-card` | the page is not where its ID says, the registry does not hold the ID, the tier differs from the spine's, a deferred drawer lacks its card or another drawer has one |
| `unknown-kc`, `unknown-drawer`, `drawer-self`, `unknown-instrument`, `unknown-generator`, `template-range`, `unknown-claim`, `unknown-specimen`, `unknown-lab-stage`, `unknown-misconception`, `unknown-seam`, `unknown-anchor`, `unknown-check` | an ID the registry does not hold, or one that does not belong where it is used (a template past the family's count, a check of another lab) |
| `audit-file`, `audit-anchor`, `audit-fields`, `audit-based-on`, `audit-case`, `audit-key`, `audit-evidence`, `audit-restatement`, `audit-key-run`, `audit-receipt`, `audit-pair` | an audit anchor under `content/audit/` that the Desk cannot serve: an ID, stage or class the registry does not hold, a missing field, a case without a key, texts or description, a load-bearing line that is not a line of the case, fewer than three scenarios or a scenario answer its run does not state, a key run not on disk or a key line it does not state, a receipt line that is not a verdict line of its run (a warning), a pair without both members or with two claims (`content/audit/README.md`) |
| `cell-duplicate`, `drawer-call`, `card-lab` | two cells with one number; a Call It in a drawer; a Build this card with no lab stage, or another card with one |
| `call-missing` | a cell asks for a call on its first run and has no `@call`: a warning in a draft, an error otherwise (`call=false` makes it a free run) |
| `item-kc`, `segment-kc` | an item or a segment tagged with a component the page's `kcs` does not list (warnings) |
| `choice-order`, `choice-key`, `choice-mis`, `choice-distinct` | the choice rules of section 1.6 |
| `rail` | a segment title that is not plain text, repeats another, or gives away an option (section 2.4) |
| `html`, `image`, `link` | raw HTML, an image, or a link that is not https, a path on the site or an anchor |
| `run-id`, `run-unregistered`, `run-tag`, `run-value`, `run-pending`, `run-unresolved`, `fact-unknown`, `ref-in-title` | the reference rules of section 1.7 |
| `title-differs`, `row-differs`, `anchor-stage` | the page differs from the spine: its title, or what the spine's row for the lesson lists (knowledge components, instruments, generator families, specimens, claim templates); all warnings, because the stage specs differ from the spine in places and the owner decides which one changes. Boot's row lists a generator for its scheduled follow-up, which is a Today card and no block, so a Boot page is not held to it |
| `unknown-file`, `unread-file`, `schema-file`, `run-record`, `facts`, `encoding`, `page-size`, `internal` | a build-level finding: a Markdown file that is neither lesson nor drawer, a file the build does not read, a schema or run record or facts file that does not parse, a file that is not UTF-8, a page larger than a route should carry (a design value, `PAGE_SIZE_WARN`), or a bug in the build itself |

### 1.9 Things that trip authors

- A list is joined with commas and no spaces: `kcs=KC-1.a,KC-1.b`. A value with a space is quoted: `title="Build this"`.
- Put a space on each side of `<` and `>` in a formula, so it is not read as HTML: `a < b`. Write code in a fence and a formula in a code span.
- The code fence of a cell comes before its first `@` section; after that, a fence is part of the section's text.
- A `@` line is a section only at column 1 and outside a fence.
- A footnote is a sidenote: `text[^1]` and `[^1]: the note`, in the same block. Labels need only be unique inside the block.
- A prose block's Markdown is rendered by the site. A line of three colons ends a block; a code fence may hold lines that look like blocks.
- A line of `---` or `===` directly under a line of text is a heading, which a page does not have, not a rule: leave a blank line above a rule.
- In a stage or lab file, quote a value that is `no`, `yes`, `on`, `off`, a date, `1e3`, a number with a leading zero or an underscore, or a time such as `12:30`: PyYAML reads each as something else (section 1.2), and the build says `pyyaml` and shows the scalar.

## 2. What the build writes

All paths are under `apps/site/public/`. Nothing here is committed; the build writes it, the deploy publishes it, and the three folders it owns (`content`, `md`, `schemas`) are cleared first so a page that no longer exists leaves no file.

| File | Holds |
|---|---|
| `content/manifest.json` | the entry point, at a stable URL: for each page its hashed file, its Markdown, its title, tier, draft flag, minutes and revision; the hashed files of the stages, the labs and the search index; `builtAt` (the title block's "Drawn") and `contentRev`, a hash that changes when anything the site loads changes |
| `content/<id>.<hash>.json` | one lesson or drawer, as the record of `lesson@1`, with its references resolved and its derived fields. The name carries the first 12 digits of the file's SHA-256, so it can be cached for good |
| `md/<id>.md` | the page as Markdown at a stable URL, for the learner's own agent (section 2.3) |
| `md/index.json` | `{format, pages: [{id, kind, title, path}]}`: the index `llms.txt` is written from |
| `content/stages.<hash>.json` | the ten stages: the spine's tables (lessons with their tier, whether they are built and their minutes; the lab and its stages; the anchors; the drawers, deferred ones marked) joined to each stage's own data |
| `content/labs.<hash>.json` | the ten labs: each stage with its title and nominal minutes from the spine and the checks the lab's own data lists |
| `content/search.<hash>.json` | the search index (section 2.2) |
| `schemas/<name>.schema.json`, `schemas/index.json` | the published JSON Schemas for the learner's own agent, with each one's `$id`, record tag and SHA-256 |

### 2.1 The page record

`content/<id>.<hash>.json` is a valid `lesson@1` record: the front matter's fields, `segments` (each `{id, title, minutes, blocks}`, the ids `s1`, `s2`, ...), and these, which the build derives:

| Field | Holds |
|---|---|
| `minutes` | the sum of the segments' minutes |
| `rail` | `[{id, title}]`, one per segment (section 2.4) |
| `establishes` | `{claims, specimens}`: the claim templates and specimens the page's blocks mint or show, which the page shows only after its exit items |
| `runs` | each run the page cites, by ID, as the record pruned to what the run chip and the run sheet read (`runChip` and `runSheet` of `@statespace/runs` take it as it is); no staleness is baked in, because that depends on the day the learner reads |
| `facts` | each registry fact the page cites, by ID, pruned the same way |
| `checkedBy` | `[{run, engine, version}]`: the title block's "Checked by" |
| `unresolved` | the runs a draft cites that `runs/` does not hold yet; empty in a page that is not a draft |
| `rev` | the SHA-256 of the page as built: the title block's "Rev" |
| each `item` and `instrument` block's `itemRev` | section 2.5 |
| each `card` block's `minutes` and `runs` | the lab stage's nominal minutes, and the runs the card's text cites |

Strings keep two reference tokens, for the site to render: `{{run:RUN-id}}` becomes a run chip from `runs[id]` (a token whose run is in `unresolved` renders as "run not yet recorded"), and `{{fact:id}}` becomes the value of `facts[id]` with its badge. A value reference whose run is not recorded yet (a draft only) also stays as `{{run:RUN-id#values.name}}`, and renders as "run not yet recorded". Everything else in a string is Markdown. A `claim` or `specimen` block carries only its ID: the page shows the card or the label drawn from the claim templates and the specimen's run, and shows `establishes` after the exit items.

### 2.2 The search index

`{format, entries: [{id, kind, title, href, stage?, text}]}`, over the registry and the built pages: stages, lessons, drawers, knowledge components (their `href` is the first lesson that teaches them), labs and lab stages, specimens, claim templates and anchors. `href` follows the routes of ARCHITECTURE.md section 3.2. `text` holds words to match besides the title: a lesson's tier tag, which stays in data and search, the word "threshold", "deferred" or "stretch", the lesson that teaches a component or mounts a specimen, and a built page's segment titles. The index holds no body text, no option and no key, because a results list is not where an answer may appear (V2-05). A lesson or drawer is titled as its built page titles it, else as the spine does, and a Boot lesson with no built page is titled "Start here": the spine's title for S1.L0 names the internal tier, and learners see "Start here" (spine section 0). The stage pages' lesson and drawer lists are titled the same way.

### 2.3 The Markdown for the learner's agent

The page as reading text: its title, the draft banner, its format in plain words (a tier is never named: "Start here", "Full lesson", "Short lesson with reading"), the ideas it teaches by name, the rail, and each segment with its blocks. A question is its stem and its options. A cell is its text, its code, its Call It stem and options, and its recorded run. It never holds a key, a "why", a misconception, a forecast or the text that follows a first run, and a generated item says it has no fixed answer. A static site cannot hide its oracles (ASSESSMENT.md section 7.5), and this file is not where the course hands them out.

A run is named the way the page's title block names it, by its ID, engine and version, and never by its title, its verdict lines or its values, because a run's title says what the run found, which is the answer to a call the page asks for: `## Runs cited` lists `- RUN-z3-starter (z3 5.3.1)`, and a reference in prose reads "(run RUN-id)". `markdown.test.ts` compiles the fixture lesson and this README's own example and requires that no cited run's title, verdict line or note appears in the Markdown. A run's ID is still printed, so an ID whose slug spells its verdict would give that call away; the registry's IDs should not (section 6). A fact is its value, and footnote labels are made unique across the document.

Boot says "result" where every other page says "run", because the course introduces the word with S1.L1 (spine section 0): `Recorded result`, "Your call before you see the result", `## Results cited` and "(result RUN-id)".

### 2.4 The rail

The rail shows segment titles and nothing else, never an answer, a verdict or option text (V2-05; spine section 3.0). It is built from `segments[].title` alone, so no block can reach it, and the build lints the titles, because an author can still write an answer into one: a title is plain text (no Markdown, code, link or reference); no two titles in a page are alike; and a title may not hold an option of a question on the page, where an option short enough to be a verdict (`sat`, "proved") may not appear in it as a word and a longer one may not appear in it at all. Options as common as "no" or "true" are excepted. The check reads the options a page authors; an item whose instance is generated carries no text to compare, so GATE-lessons runs the same rule, `railLeaks`, over the generators' options.

### 2.5 `itemRev`

`itemRev` is 16 hexadecimal digits of a SHA-256 over the canonical JSON of an item's or a cell's authored fields (the block as written, before references resolve), the content hash of each run it cites (null for one that is not recorded yet), and, for an item, a fingerprint of its generator family's files when the build finds any (`content/generators/GEN-x/` and `packages/generators/src/x/`). So it changes exactly when what the learner is asked changes, or what a cited tool printed. An event graded against an older revision shows "re-check" and never deducts (ARCHITECTURE.md section 3.3). Editing prose changes no `itemRev`.

### 2.6 What the build does not check

Lesson anatomy per tier, the segment length, glossary terms, internal names and lock copy are GATE-lessons (W1-T38); tool numbers are GATE-numbers and GATE-facts; that an item's options are valid, balanced and tagged is GATE-items; that a call's key reproduces on its engine is GATE-calls; the knowledge-component graph and its ordering are GATE-kc; unbracketed codes are GATE-codes.

## 3. Using the package

```ts
// the site and the gates share this entry: no file access, no YAML, no schema validator
import { BLOCK_TYPES, DRAFT_LABEL, copyOf, countBlockTypes, itemRev, railLeaks, renderMarkdown, tierFormat } from '@statespace/content'
// the reader, the checks and the build
import { buildContent, compilePage, parsePageSource } from '@statespace/content/build'
```

| Export | For |
|---|---|
| `BLOCK_TYPES`, `MAX_BLOCK_TYPES`, `ITEM_ROLES`, `CARD_VARIANTS`, `TIERS`, `tierFormat` | the constants a screen and a gate share |
| `DRAFT_LABEL`, `DRAFT_BANNER`, `RUN_PENDING` | the label on unreviewed content, the banner a screen shows, and what an unresolved reference renders as |
| `countBlockTypes`, `unknownBlockTypes`, `blocksOf` | GATE-lessons: how many block types a page uses, and which are outside the six |
| `copyOf`, `mapCopy` | every string a learner reads, with its JSON Pointer and kind (`prose`, `card`, `cell`, `prompt`, `option`, `why`, `tap`, `title`, `objective`, `deferred`; `code` on request), so a lint reads one list |
| `railOf`, `railLeaks` | the rail and its lint |
| `itemRev`, `runRecordHash`, `sha256Hex`, `canonicalJson`, `fingerprint` | revisions and the hashes under them (a synchronous SHA-256, tested against `node:crypto`) |
| `renderMarkdown`, `plainRefs` | the per-lesson Markdown |
| `indexRegistry`, `pageTitle`, `runSnapshot`, `factSnapshot`, `lineOf`, `markdownProblems`, `expectedPath` | lookups over the registry, the title a learner sees for a lesson or drawer, the pruned records, and helpers |
| `parsePageSource` (build entry) | the reader: `{record, problems, lines}`; it returns the record even with problems, and keeps an unknown block type as `{type: 'figure'}`, so a gate can count the types a page uses |
| `compilePage`, `compileRecord`, `buildContent` (build entry) | one page, one stage or lab record, and the whole build as a pure function from files to files |
| `makeSchemaChecker`, `resolveRefs`, `readYaml`, `parseAttrs` (build entry) | the pieces, for a gate that needs one. The checker judges a `page`, a `stage` or a `lab` by its own definition, and a `record` of any of the three by the schema's root (the verdict GATE-schema reaches). `readYaml(text, { pyyaml: true })` also reports the scalars PyYAML reads differently (section 1.2); without the option it reads YAML 1.2 alone |

The types of the records are the generated types of `@statespace/schema` (`Lesson`, `LessonBlock`, `LessonSegment`, `LessonChoice`, `LessonStage`, `LessonLab`, ...), re-exported here. `exactOptionalPropertyTypes` is not on in this package, so an optional field may be assigned `undefined`.

## 4. Running it

```
node scripts/build-content.mjs                 build into apps/site/public
node scripts/build-content.mjs --check         validate everything and write nothing
node scripts/build-content.mjs --strict        warnings fail too
node scripts/build-content.mjs --json          print the report as JSON
node scripts/build-content.mjs --root DIR      read the tree under DIR (tests)
node scripts/build-content.mjs --out DIR       write under DIR instead of apps/site/public
node scripts/build-content.mjs --built-at DATE the build date, YYYY-MM-DD (default: SOURCE_DATE_EPOCH, else today in UTC)
npm run verify -w @statespace/content          the same as --check
npm test -w @statespace/content                the tests, which include a --check of the repository's own content
npm run typecheck -w @statespace/content
```

Exit status: 0 built (or valid), 1 findings, 2 the build could not run (a bad argument, a missing registry, an output directory it refuses to clear). A file the build crashes on is a finding too (`internal`, with the file, and the other files still build): it never ends the run with a stack trace. The build date is the one input that is not content: two builds of the same sources on different days differ in `builtAt` only, and every hashed file keeps its name.

Output goes under `apps/site/public/`, which the deploy publishes; the build clears `content/`, `md/` and `schemas/` there before it writes. The site build must run the content build first (W1-T02).

### 4.1 How it relates to the gates

- **GATE-schema** validates every record that declares `schema: statespace/lesson@1`, in TypeScript and in Python, and requires the two to agree. The records it reads are: the schema's own fixtures (`schemas/fixtures/lesson/`: pages, stages and labs, valid and invalid, written by `scripts/spikes/W1-T36/make-schema-fixtures.mjs`); mutants of every valid fixture (a key removed, a type changed, a trailing newline added), so the stage and lab definitions are pressed field by field like the page's; and every JSON or YAML file in the repository that declares the tag. Those are the stage and lab files (`content/stages/S{n}/stage.yaml`, `lab.yaml`), which declare it on their first line (section 1.2), and built pages, which declare it too, wherever they sit in the tree. The root of the schema picks the definition by the ID, so a stage or lab file reaches the stage or lab definition, in both languages. What GATE-schema does **not** read is a lesson's or a drawer's Markdown source: it reads JSON and YAML only, so the Python half sees a page only once it is built into the tree, and the build's TypeScript validator is the one check of the source.
- **The build** runs the same validator on every source: a lesson or drawer against the page definition, a stage or lab against its own, and each finished record again against the schema's root. For a stage or lab file that is what GATE-schema would also say; for a page it is the only check of the source. A fault is reported where the build can place it (`file:line`).
- **The lane today.** `npm test` (the lane's unit-tests step) runs `test/repo-content.test.ts`, which runs `node scripts/build-content.mjs --check` on the repository's own `content/` and fails on any error. So on every run of the fast lane every lesson, drawer, stage and lab file in the tree is validated against the schema, the ID registry and the run records, in TypeScript, and every stage and lab file is also validated by GATE-schema in both languages. Built pages reach GATE-schema's Python half only after a build has written them into the tree, and no lane step does that yet (W1-T02 wires the site build; section 6).
- **GATE-runs** reads `content/` for references and the draft label: `draft: true` in the front matter is where it looks.
- **GATE-numbers** reads `content/stages/` as learner copy; it skips fenced code, which is why copy is never fenced (section 1). It does not read `content/drawers/` yet; the drawer task asks for that.

## 5. Decisions this task made

Each decides something the spine or the architecture leaves open; the owner reviews them with the task.

1. **Markdown with front matter, blocks as `:::` containers.** The tracker names `.md` deliverables for lessons and drawers. Blocks are not fenced YAML, because GATE-numbers and GATE-facts skip fenced code and would not see the copy inside. A block's attributes ride on its opening line and its text is Markdown.
2. **One record type for lessons and drawers.** A drawer is built from the same segments of blocks, so `lesson@1` covers both, told apart by the ID: a drawer has no tier, may have `previews`, and a deferred drawer has `deferred` and no segments. `if` and `then` in the schema enforce it in both validators.
3. **Stage and lab data are records of `lesson@1`, told apart by their ID.** The root of `lesson.schema.json` dispatches on the ID: `S{n}` is judged as a stage, `LAB-{n}` as a lab, anything else as a page, and the definition's own errors surface at their fields. Each is a closed record that declares `schema: statespace/lesson@1`, which makes the stage and lab files GATE-schema records without a schema of their own; the stage and lab keep an open `extra` object for what a later task needs before a field names it (the hint rungs, the Prove-it mutants). The cost: one tag names three shapes, so `lesson@1` is not a tagged record in the sense of `schemas/README.md` section 2 (it has no `RecordTypes` entry, and `validateRecord` does not dispatch to it; use `validate('lesson', record)` or this package's checker), and the root, an envelope named `LessonRecord`, would prefix every definition, so each definition names itself with `x-typeName` to keep `Lesson`, `LessonStage`, `LessonLab` and the rest. Publishing `stage@1` and `lab@1` as schemas of their own would remove the cost; it adds two schema files and is the owner's call (section 6).
4. **A `reading` card variant.** Spine section 12 item 48 names four card variants; curriculum/S01-counterexample.md names a fifth, the dated reading pointer, and spine section 3.0 gives a bridge lesson one.
5. **`tier` is `boot`, `core`, `bridge` or `step`.** The sketch in ARCHITECTURE.md section 17.3 has the first two only; the registry has all four (Boot is S1.L0, and S10.L1 to S10.L7 are steps).
6. **A cell's call lives in the cell, and an item's fixed instance in the item.** ARCHITECTURE.md section 17.3 sketches an instrument block with a `cell` id and an item block without options; the S1 spec authors a Call It with options, whys and keys inside a cell, and prequestions with the same, so the schema carries a `choice` in both.
7. **Run values are printed at build time; citations and facts are tables.** A value reference becomes text, so the number in copy is generated; a citation keeps its token and the page carries the pruned record, so a run chip and a recorded fallback need no second request, and "stale since" is worked out on the day the learner reads.
8. **The build fails closed.** It writes nothing when anything is an error.
9. **No answers outside the call.** The Markdown, the rail and the search index hold no key, no why and no option text of a question the learner has yet to answer.
10. **Titles and rows are warnings.** The spine's title for an ID and its row for a lesson (the knowledge components, instruments, generators, specimens and claims it lists) are compared, and a difference warns instead of failing, because the stage specs differ from the spine in places.

## 6. Open items

- **TODO(W1-T02):** the lesson, stage and search screens load `content/manifest.json` and then the hashed files; the site build runs `scripts/build-content.mjs` before `vite build`. That build also puts the built pages in the tree for GATE-schema's Python half, if a lane step runs the two in that order.
- **GATE-schema's reach, plainly.** It reads stage and lab files (in both languages) and built pages (in both languages, once a build has written them into the tree). It does not read a lesson's or a drawer's Markdown source, which only the build's TypeScript validator checks. Until a lane step runs the content build (a `content-build` step in `scripts/spikes/W0-T04/gates.json` is requested), `test/repo-content.test.ts` is what runs the build's checks on the repository's own content in the fast lane.
- **Owner decision:** split `stage@1` and `lab@1` out of `lesson@1` (section 5, decision 3). Each would be a tagged record with its own type and its own fixtures, `validateRecord` would work for it, and the root of `lesson.schema.json` would be the page again, so the `x-typeName` on every definition and the dispatch would go. It adds `schemas/stage.schema.json` and `schemas/lab.schema.json`, which are outside this task's files.
- **Spec issue:** a run's ID is printed in the Markdown (`## Runs cited`, and beside a cell) and in the lesson's compact title block (DESIGN.md section 6.1: "Checked by ... with run IDs") before the learner has made a call. `RUN-z3-unknown-pow` and `RUN-z3-vacuous-unsat` spell their verdicts. Rename them, or have GATE-lessons check that no run ID a call cites contains one of the call's options.
- **TODO(W1-T18):** `llms.txt` is written from `md/index.json`.
- **TODO(W1-T38):** GATE-lessons reads pages through `parsePageSource`, `countBlockTypes`, `copyOf` and `railLeaks`, and applies the rail rule to the generators' options.
- **TODO(W1-T37):** a cell's code is carried in the page and the recorded run holds its input; GATE-calls can compare the two.
- Stage and lab data are not authored yet (`content/stages/S1/stage.yaml`, `lab.yaml`): the stage and lab pages carry the spine's tables until they are, and `authored` is null.
- Drawer items use the same blocks; their event refs (`drawer:D-03/i2`) number the item blocks of the page in order, a rule the drawer screen owns.

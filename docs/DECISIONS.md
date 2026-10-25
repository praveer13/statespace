# statespace: decisions

**Status:** the owner decisions are reviewed. On 2026-10-25 the owner accepted OD-1 to OD-5, OD-7 to OD-9 and OD-11 to OD-15, changed OD-6 and OD-10, decided OD-16, and accepted the two questions W0's results raised (section 1). The records of sections 2 and 3 are still proposed: each is a default that authoring uses until the owner reviews it. **Date:** 2026-10-23 (machine clock); the owner's review recorded 2026-10-25.

**Scope.** The owner decisions OD-1 to OD-16 (OD-15 began as the spine's proposal and OD-16 was opened during W0) and two questions from W0's results, Q-1 and Q-2; one record for each of the 16 contested items in BRIEF §5.1; one record for each of the 59 items in the spine's decisions log (SPINE §12); an index of the decision records the W0 spikes wrote; and a list of what this file believes was wrong in the spine, with the outcome of each item in spine revision 3.

**Precedence.** As in the spine: the roadmap sets scope; executed runs beat any report; then the brief, the four digests, the reports and reviews, kernelspace (its learning engine only) and the v1 design (history only). IDs come from `docs/spine/SPINE.md` and this file adds none, so a record is named by its position in its source ("Brief item 7", "Log item 24"), the way the spine itself writes "§12 item 29". If this file and the spine disagree on an ID or a figure, the spine wins until the two are reconciled.

## How to read a record

Owner decisions carry six fields: the decision, the adopted default, the rationale with sources, the consequences, how to change it later, and when it must be settled. The other records carry a context, the decision, the alternatives considered, where it lands, sources and a status.

| Word | Meaning |
|---|---|
| `adopted default` | An owner decision taken from the brief's recommendation and used for authoring. The owner has not reviewed it. |
| `proposed` | A record waiting for the owner's review. |
| `accepted <date>` | The owner confirmed it. Change the status line and leave the text. |
| `changed <date>` | The owner chose differently. Add what replaced it and update the spine row it lands in. |
| `superseded` | A later record replaced it. Name that record. |

**Alternatives.** An alternative that a source proposed names its source. An alternative marked [D] is an option this file weighs that no source proposed; it is design rationale, not history.

**Tags.** As in the spine: [X RUN-id] an executed run that exists on disk; {{run:RUN-id}} a run to record before the sentence ships; [V] re-checked against a primary source on the date its sentence or row states, or on 2026-10-23 where none is stated; [U] unverified; [D] design rationale or estimate. Evidence grades A to D follow the pedagogy digest (A meta-analysis or several randomized trials; B one good similar experiment; C small, correlational or preprint; D rationale). Source keys in brackets, such as [hacker00], are listed in section 5. Stamp codes such as [P] and [M] are the course's own. Review hours and the "settle by" tasks are estimates drawn from the spine's task table [D].

## Where review attention pays

The owner reviewed every owner decision on 2026-10-25 (section 1), so none waits on review. The owner's time is still limited (OD-7), and attention now goes where the review changed something.

| What | Why it deserves a look now |
|---|---|
| OD-6 downloads, OD-10 booklet (changed) | Each reopens or edits tasks and changes wording across the documents. Their records list what changes; spine revision 3 (W0-T10) applies the document changes. |
| Q-1 | S2's worked examples move to parallel theorems before W2 authors them. |
| Sections 2 and 3 | Their records are still proposed defaults. Log item 4 is OD-15, which the owner accepted. |

## Decision index

Each line repeats the "In one line" of a record below. The first table is the owner decisions and the two questions from W0, with their status; the second is the contested items of BRIEF §5.1; the third is the items of the spine's decisions log.

### Owner decisions

| Record | Decision in one line | Settle by | Status |
|---|---|---|---|
| OD-1 · Course name | The course is called statespace. | Before W0-S11 publishes receipt@1, and in any case before the first public push. | Accepted 2026-10-25 |
| OD-2 · Roadmap names and the lab template | Keep "Mini-Plinth" and `miniplinth check` as the roadmap names them; the lab template is `statespace-lab`. | Before W2-T07. | Accepted 2026-10-25 |
| OD-3 · Path through the stages | The roadmap's order is the default; an optional builder's path puts concurrency first, in the spine's repaired order. | Before W1-T04 (the KC graph and GATE-kc). | Accepted 2026-10-25 |
| OD-4 · Third-party tools | Third-party tools appear only as disclosed link-outs that are never credited; nothing embeds CheerpJ. | Before the first link-out card ships (S2.L1, W2). | Accepted 2026-10-25 |
| OD-5 · Instrument origin | Instruments and all untrusted input run on a separate origin with its own custom subdomain. | W0-S01, before any instrument that parses URL input ships. | Accepted 2026-10-25 |
| OD-6 · Downloads | No download asks first and none warns; while an engine downloads, the loader shows its size. | W1-T06. | Changed 2026-10-25; the replaced default asked first above 5 MB |
| OD-7 · Owner review envelope | Review is planned at 2 to 3 hours a week, and a wave starts only when the review queue is under 10 hours. | Now; revisit at W1's exit (BRIEF §8). | Accepted 2026-10-25 |
| OD-8 · Honor-system provenance | Provenance is self-declared and stated openly as an honor system; the course calibrates and does not police. | Before W1-T03 (the event log). | Accepted 2026-10-25 |
| OD-9 · Human reviewer and design partners | A human reviewer of claim cards is optional, and design partners gate only an "external learners" label. | Before W1-T09. | Accepted 2026-10-25 |
| OD-10 · Self-explanation booklet | Adapt the booklet's text, not its three rights-reserved images, under the CC BY-SA 4.0 its PDF states, with credit and a change note, in its own directory; nobody asks the authors and nothing waits. | Settled 2026-10-25; the adaptation ships with W2-T05. | Changed 2026-10-25; the replaced default asked the authors first |
| OD-11 · Publication hygiene | No private-design content enters the repository, and the review JSONs stay out. | W0-T01, before the first public push. | Accepted 2026-10-25 |
| OD-12 · Edition pins | Edition 1 pins Lean 4.35.x and PostgreSQL 18.6, and the isolation catalog is re-recorded after PostgreSQL 19 reaches general availability. | When W0-S12 and W0-T05 record the pins; reviewed again at W6-T07. | Accepted 2026-10-25 |
| OD-13 · Sigstore attestations | Sigstore attestations are off by default and may be enabled only on a learner's own public repository. | Before receipt@1 is published (W0-S11), so that a schema change is not forced later. | Accepted 2026-10-25 |
| OD-14 · Name of the persistent world | The persistent world is called "the Clearinghouse" for now, and the course keeps its coined nouns few. | Before W3-T14. | Accepted 2026-10-25 |
| OD-15 · Lab shape | Ten labs with 91 stages, 83 planned and 8 stretch, pinned per lemma; an owner decision since the owner accepted the spine's proposal (full record: Log item 4). | Settled 2026-10-25. | Accepted 2026-10-25 |
| OD-16 · Course licenses | Code is under the MIT License and course content under CC BY 4.0, in statespace and in kernelspace. | Settled 2026-10-25. | Decided 2026-10-25 |
| Q-1 · LAB-2's public proofs | The public proofs of LAB-2's four basic ledger theorems stay, and S2's worked examples use parallel theorems. | Before W2 authors S2's lessons and the GEN-proof-structure bank (W2-T05, W2-T19, W2-T20, W2-T21, W2-T30). | Accepted 2026-10-25 |
| Q-2 · Adopt W0-S13 | W0-S13 spikes trace validation by TLC's trace-module method, so that W5-T14 has a tested fallback. | W0's exit (W0-T11). | Accepted 2026-10-25 |

### Contested items in the brief

| Record | Resolution in one line |
|---|---|
| Brief item 1 · Confidence scale | Three confidence taps with printed probability bands and the chance level shown; certainty-based payoffs are feedback, never credit. |
| Brief item 2 · Audit sound share | A pool of matched sound and flawed pairs, about half sound, with each session's sound share drawn from a seed between 30 and 60%. |
| Brief item 3 · Defence format | A four-part, untimed Defence over at least two sessions, with explain-back required and uncredited. |
| Brief item 4 · Lean in the browser | No embedded WebAssembly Lean; goal states come from generated Goal Replay, with a disclosed link-out. |
| Brief item 5 · Datalog in the tab | Z3's Fixedpoint inside the existing Pyodide worker if W0-S03 passes; otherwise a TypeScript evaluator differential-tested against Soufflé. |
| Brief item 6 · TLC pin | Pin TLC 1.8.0 by SHA-256 for JSON traces, label it pre-release, and run 1.7.4 in CI as the text-trace fallback. |
| Brief item 7 · CheerpJ TLC | TLC through CheerpJ is not embedded; the default is off, and the question was reserved for the owner as OD-4. |
| Brief item 8 · Comparator sandbox | Record the sandbox state on every receipt and never require it. |
| Brief item 9 · Heavy lane | The nightly lane blocks releases, and a red night downgrades the claims it touches to "unverified since <date>". |
| Brief item 10 · Author lag | Agents draft stage N+1 while the owner studies stage N, and unreviewed material is labeled draft; there is no embargo. |
| Brief item 11 · AI policy | Agents are welcome everywhere except on Prove-it and Defence items; the policy is per item, not per stage. |
| Brief item 12 · Scope of the persistent world | The world is thin: a seeded Mini-Plinth world on the reference interpreter, in the roadmap's nouns only. |
| Brief item 13 · Navigation and names | Navigation is Today · Stages · Bench · Audit · Claims, plus search. |
| Brief item 14 · The cache-header lesson | The landscape digest's CDN cache-header lesson becomes one drawer without vendor specifics. |
| Brief item 15 · Experiments | Keep and kill decisions use rules fixed in advance for one learner, read descriptively, instead of pre-registered randomized experiments. |
| Brief item 16 · Glyphs, strip and interpretation tap | Stamps are words plus bracketed codes, the strip has three segments, and the interpretation tap is a faded Call It type. |

### Items in the spine's decisions log

| Record | Decision in one line |
|---|---|
| Log item 1 · Lesson numbering follows the brief | Lessons are `S{n}.L{k}`; the self-explanation unit is S2.L0, only S1.L0 is Boot, and S1.L1 and S1.L2 are swapped against the brief's order. |
| Log item 2 · Capstone steps are tier `[step]` | Capstone steps S10.L1 to S10.L7 are not lessons, are excluded from every lesson count, and five of them are built inside earlier labs. |
| Log item 3 · Core-lesson choice | The 26 core lessons are placed where the roadmap's projects need full authoring, with three swaps against an earlier tiering. |
| Log item 4 · Lab shape (OD-15) | Ten labs and 91 stages (83 planned, 8 stretch) against the brief's nine labs and about 45 stages; the owner accepted it as OD-15 on 2026-10-25. |
| Log item 5 · Course-supplied harnesses | The course supplies the multi-session driver, the checkers and validators that are not themselves the learning object; learners write the compilers, specs and machines. |
| Log item 6 · KC count and ground skills | 105 KCs with 26 threshold KCs, the old Course 00 material taught in S1 by drawers, and one `requires` edge corrected. |
| Log item 7 · Seams and erosions | Twelve erosions with both endpoints each, plus three held seams so that erosion is not universal. |
| Log item 8 · Builder's path | The brief's builder's path is replaced by a repaired topological order with declared substitutes. |
| Log item 9 · Audit anchors | Twenty-five anchors, at least two per stage, covering all thirteen classes, with five W1 anchors keyed only by executed runs. |
| Log item 10 · Provenance weights | Weights of 1.0 and 0.3 follow kernelspace; an automated close in manual mode is a flag on receipts and claims, not an event provenance. |
| Log item 11 · Budget method | Stage budgets use a 3× multiplier for Lean proof stages, 2× elsewhere, 45-minute weekend stages, and a Keep block taken off the top. |
| Log item 12 · Six fading families | Six procedure families get backward fading; the rest get worked examples without fading. |
| Log item 13 · Generator families | Fourteen families and 47 templates; GEN-which-stamp and GEN-spot-the-gap are added to the brief's list. |
| Log item 14 · Instrument names | Bench engines are named `INS-bench-*`; the CTI workbench and the minimap are mechanics over existing instruments. |
| Log item 15 · The CLI is `statespace` | The Bench CLI is `statespace`; the brief's `bench <command>` is shorthand for it. |
| Log item 16 · Hall of Records items are specimens | Dated incidents are specimens inside stages, shown through a "dated incidents" filter; the Lean kernel-bug story is a story card with no exploit code. |
| Log item 17 · The capstone artifact is "the Core" | The capstone artifact is called "the Core"; "plinth" survives only in the roadmap's toy-language names. |
| Log item 18 · Production-twin pins | Every production-twin SHA is recorded in RUN-twin-pins with a 60-day TTL, and none is written into copy by hand. |
| Log item 19 · Unexecuted facts are placeholders | A fact that a review reported but no committed run shows is written as `{{run:RUN-id}}` until it is recorded. |
| Log item 20 · VRK₃₀ is the north star's name | The north star is called VRK₃₀, the brief's name, not the pedagogy digest's VRC₃₀. |
| Log item 21 · "The Defence" keeps its spelling | "The Defence" keeps the brief's spelling as a proper noun; all other copy is US English. |
| Log item 22 · Deferred topics are one drawer each | Each deferred topic is one always-open drawer tagged "deferred", with a neutral trigger that surfaces it in Today and unlocks nothing. |
| Log item 23 · W6 is launch hardening | W6 is a wave for accessibility, performance, docs, hygiene, a final adversarial review and the release gate, and the keep/kill rules move to W0. |
| Log item 24 · Model assignment | The strongest model writes anything whose silent error would corrupt credit; the lighter model scaffolds. |
| Log item 25 · The Keep block is computed | The Keep block is computed from the dose and logged item times, and is larger than the brief's 30 to 40 minutes a week. |
| Log item 26 · Today excludes the Lean keep-alive | The Lean keep-alive is its own Keep session; Today shows a card when one is due. |
| Log item 27 · Defence Part C, small parts and retakes | Part C has four cases, every credited part has at least four items, and a failed part is retaken on fresh seeds after at least three days. |
| Log item 28 · "Prove safety" in S8 is met as [M] | The roadmap's "prove safety properties over the model" is met as [M] · constants · complete, with an optional lift to [P]. |
| Log item 29 · Inductive invariants | TLC's or Apalache's inductive check earns [M] · constants; [P] for every N needs a parametric proof of the inductive step. |
| Log item 30 · Safety and liveness are separate claims in S8 | CL-8.1 is safety and CL-8.5 is liveness; they are minted as separate claims beside CL-8.4. |
| Log item 31 · Cut eligibility | A bridge can be cut only if it carries no threshold KC, no seam or erosion endpoint, no outcome-core KC and no sole completion-test coverage, and its KCs move to a lesson that stays. |
| Log item 32 · Fewer nouns | Learner copy uses at most 25 coined terms, internal names are linted out, and two screens became a filter and a plainly named screen. |
| Log item 33 · Boot and the first hour | Boot's call is a pre-instruction call on `Int` that counts toward no KC, the BitVec 64 wrap is an uncredited reveal, and S1.L1 and S1.L2 follow the `requires` order. |
| Log item 34 · LAB-1 runs without the devcontainer | LAB-1 runs with `uv run --with z3-solver==5.3.1` or in the tab; the devcontainer arrives at S2. |
| Log item 35 · Learner-zero numbers are descriptive | A learner-zero median measures no first-time learner, so those numbers are labeled descriptive and a separate tester run gates the external-learners label. |
| Log item 36 · Owner time is planned | Every task carries an estimate of owner review hours, every wave a total and a duration at 2.5 h/week, and learner-zero's study sits on the critical path. |
| Log item 37 · S9's halves | S9 has two halves that follow the lessons, each closed by a mini-Defence that samples only its own half. |
| Log item 38 · Rust and cvc5 are not new tools | Rust counts as the learner's existing language and cvc5 as a second engine on the SMT-LIB the learner already writes, so neither is a new tool. |
| Log item 39 · OD-4's link-outs | The brief's "CheerpJ TLC" option is the link-out to TLA+ By Example, the Natural Number Game joins the list, and GATE-bundle's route tests enforce it. |
| Log item 40 · Misconception IDs use the `dp:` prefix | Misconception IDs are `dp:` plus the pedagogy digest's catalog key, with EVIDENCE.md §6 as the catalog. |
| Log item 41 · Manual-mode variants | S3's step-invariant labs turn off `grind` and keep `omega`, because case analysis is the taught step; further per-lab variants are logged here. |
| Log item 42 · S10's briefings, passes and mutations; S9's Defences | S10's KCs get step briefings, LAB-10.8 is one write stage run as nine passes, S10's Part B has seven mutations, and S9's two mini-Defences are recounted; the arc is 107 to 197 hours. |
| Log item 43 · A KC for the six fields | KC-1.claim-anatomy holds roadmap rule 3, the six-field claim, so the skill is spaced in Today and sampled in Defences; the graph holds 105 KCs. |
| Log item 44 · An ID exception | RUN-lean-ih-ungeneralised keeps its British spelling, because a registered ID is never renamed or deleted. |
| Log item 45 · `research/` is published redacted | `research/` is published with the personal domains, account identifiers and private paths removed, and GATE-privacy scans every published path. |
| Log item 46 · Twins and pairs | "Twin" means a production twin only; matched sound and flawed audit cases are pairs, and a specimen or lab statement that sets a sound form beside a flawed one calls it a counterpart. |
| Log item 47 · Anchors in time | Settled is anchored at the stage's sign-off date, and VRK₃₀ counts from first learning, which for a KC credited at placement or test-out is the confirmation date. |
| Log item 48 · The six content block types | W1–W2 content uses six block types: prose, instrument, item, claim, specimen and card. |
| Log item 49 · Assessment rules decided where the spine was silent | Item scoring, the no-failed-part retake, sessions, first learning, VRK₃₀'s counting event and band 2 are fixed in the spine. |
| Log item 50 · S2 against the roadmap | S2 meets 'finite maps' with total functions, moves the dependent-type example to S3, and reads 'preservation over sequences' as conservation. |
| Log item 51 · Two proposed stretch stages declined | Two proposed stretch stages, their claim template and their three runs are not registered. |
| Log item 52 · LAB-2's proofs stay public; S2's worked examples prove parallel theorems | LAB-2's published proofs stay public; S2's worked material proves parallel theorems. |
| Log item 53 · W0-S13 and the trace-validation run | W0-S13's run, RUN-tlc-tracemodule, answers trace validation; RUN-trace-validate-spike is kept as a superseded ID. |
| Log item 54 · M-consent keeps its ID, and nothing asks | OD-6 as changed: no prompt and no warning; the loader shows each engine's size; M-consent keeps its ID. |
| Log item 55 · INS-datalog is Z3 `Fixedpoint` behind an adapter | The tab's Datalog engine is Z3 Fixedpoint behind an adapter, with a logged fallback and switch conditions. |
| Log item 56 · INS-spectacle unmodified, under a time budget | Spectacle is not patched; the adapter carries fixes, and edits run under a 10 s budget instead of about 5k states. |
| Log item 57 · Lean sandbox verdicts and `--paranoid` placement | Positive-evidence classification of Lean verdicts, a sandbox only a learner or CI turns off, and --paranoid placed by cost. |
| Log item 58 · The keep/kill machinery | The keep/kill comparisons' machinery is split over W1 tasks, W2-T18 and W5-T08. |
| Log item 59 · The tool primer | The primer is the opening minutes of the first lesson that meets a stage's new tab instrument. |

## 1. Owner decisions

The brief's recommendations (BRIEF §8) were adopted as defaults, and the spine records them in SPINE §1.2. The owner reviewed them on the review page on 2026-10-25, between 01:11 and 01:15 UTC: OD-1 to OD-5, OD-7 to OD-9 and OD-11 to OD-14 were accepted, and OD-6 and OD-10 were changed, OD-10 after a question answered in conversation. OD-15 began as a proposal of the spine, outside the fourteen, and became an owner decision when the owner accepted it. OD-16 was opened during W0 and decided in the same review, and the two questions that W0's results raised follow it. An accepted record keeps its text. A changed record says what replaced its default and why, lists the consequences, and keeps the replaced default as history.

### OD-1 · Course name

**In one line.** The course is called statespace.

- **Decision.** The name used for the repository, the Bench CLI, the lab template, the schema ids and every public surface.
- **Adopted default.** statespace (BRIEF §8 and §7.1).
- **Rationale and sources.**
  - Family fit: it sits beside kernelspace and tablespace, and it names the object every claim in the course is about, the set of states S and the step S → S′ (SPINE §0; BRIEF §7.1).
  - A name is needed at all because the roadmap's working title, "Plinth", collides with other uses of the word (BRIEF §7.1). The word already named the course, the toy language and the base metaphor (A7-12).
  - Collision checks on 2026-10-23 [V ghsearch][V statespaceorg][V proofspaceco]: an unrelated company uses "Statespace" (a GitHub organization created 2025-02-10, whose search repository had 868 stars that day); no course of that name turned up. The risk is search confusion, not overlap of domain. No trademark search was run [U].
  - Options not taken: obligation (the roadmap's central verb; fewest collisions, the top repository had 20 stars; a single technical noun but "distinctive and dry") and proofspace (a verifiable-credentials company already trades under it, and it puts "proof" above the other eight stamps, against the course's thesis).
- **Consequences.** The name appears in the `statespace-lab` template (OD-2), the `statespace` CLI (SPINE §9.6; Log item 15), schema ids such as `statespace/receipt@1` (§9.4), the instrument subdomain (OD-5) and the glossary. The stone-plinth metaphor and the elevation drawing are retired; home is an ordered path of stages (§0 Look).
- **How to change it later.** A rename is mechanical but it touches identifiers that outlive it: schema `$id` strings, the CLI name in learners' scripts, and the repository URL. Make it before receipt@1 is published (W0-S11) and before DNS for the instrument origin exists (W0-S01); afterward keep the old name as an alias for at least one edition. Re-run the BRIEF §7.1 collision check for the new name. GATE-links resolves IDs, not names, so a rename needs a text search over `docs/`, `labs/` and `bench/`. [D]
- **Settle by.** Before W0-S11 publishes receipt@1, and in any case before the first public push. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-2 · Roadmap names and the lab template

**In one line.** Keep "Mini-Plinth" and `miniplinth check` as the roadmap names them; the lab template is `statespace-lab`.

- **Decision.** Whether public copy keeps the roadmap's own names for the toy language, the learner's checker and the lab repository, or renames them.
- **Adopted default.** Keep Mini-Plinth and `miniplinth check`; ship the template as `statespace-lab` in place of the roadmap's `plinth-lab` (BRIEF §8; SPINE §0, §1.2).
- **Rationale and sources.**
  - The roadmap sets scope and names the toy language and the checker (roadmap Stages 3 and 4; SPINE precedence 1). The owner is also the reference learner, who wrote those words and will read them in the course.
  - Only the roadmap's own names are kept. Everything the course itself introduces takes the course's names: the template, the CLI and the capstone artifact, "the Core" (Log item 17). A public course must not couple to anything outside the roadmap (dr2 R19).
  - Two tools stay distinct. `miniplinth check` is the checker the learner builds in LAB-4; `statespace check` is the Bench CLI that grades labs (SPINE §9.6).
- **Consequences.** "plinth" appears in public copy only inside Mini-Plinth, `miniplinth`, `mini-plinth-core`, `MiniPlinthRef` and quotations of the roadmap, so GATE-privacy needs an allow-list for exactly those strings. The LAB-3 template (mini-plinth-core) and its Lean modules carry the name, and statement hashes (I7) are taken over that text.
- **How to change it later.** Before W2-T07 (the reference semantics and goldens) a rename is a search and replace in content tasks. After it, every pinned statement hash and kernel-checked golden that embeds the old name changes, and runs that print the name, such as RUN-check-fragment, must be re-recorded. [D]
- **Settle by.** Before W2-T07. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-3 · Path through the stages

**In one line.** The roadmap's order is the default; an optional builder's path puts concurrency first, in the spine's repaired order.

- **Decision.** Which order the path through S1 to S10 is drawn and scheduled in by default, and whether a second published path exists.
- **Adopted default.** Roadmap order by default; an optional builder's path for early concurrency work, with erosions keyed to seams and a Lean keep-alive (BRIEF §8). The spine adopts a topological repair of the brief's path: S1 → S5.L1–S5.L8 → S6.L1, S6.L2, S6.L6, S6.L7 → S8.L1–S8.L4 → S2 → S3 → S4 → S5.L9 → S7 → S6.L3–S6.L5, S6.L8, S6.L9 → S8.L5–S8.L7 → S9 → S10 (SPINE §3.0 Paths).
- **Rationale and sources.**
  - The progression is the owner's own and fixes the default (roadmap "Progression at a glance"; SPINE precedence 1).
  - The price of roadmap order is Lean sitting idle across S5 to S8, an estimated 14 to 28 weeks, which, extrapolating from the decay of procedural skills [tatel25] (grade A for the decay), would cost about 25 to 50% of the gain [D] (dp §4.5). A Lean keep-alive of 20 to 30 minutes every 2 to 3 weeks is the mitigation (M-lean-keep-alive; dose D).
  - A builder's path shortens that gap to about 3 to 5 weeks [D]. The brief's version (S1 → S5 → S6.L6–L7 → S8.L1–L4 → S7 → S2–S4) was not a topological order: S7.L6 and LAB-7.5 run self-composition through the learner's own VC generator from LAB-4; KC-7.observer-equivalence requires KC-4.vc-shape; S7.L4 needs KC-6.sql-not-algebra; S6.L6 needs KC-6.rowcount-as-guard (SPINE §12 item 8). The pedagogy digest had asked to validate dependencies first and to key erosions to seams, not stage numbers (dp §4.5).
- **Consequences.** GATE-kc checks that every published path is a linear extension of the hard `requires` edges and of the lab-artifact dependencies, and that every soft edge a path crosses names its substitute. The repaired path crosses one soft edge (KC-6.rowcount-as-guard → KC-3.big-step-errors, covered by D-23), uses a reference compiler labeled "reference module, earns nothing" for LAB-6 and LAB-8 work done before LAB-3 and LAB-4, reads D-14 before LAB-8.4, and moves S5.L9 and LAB-5.7 after S4. An erosion fires when both endpoints exist in the learner's record (§5.4); W3-T12 replays both paths; GATE-budget's claim cadence runs on both.
- **How to change it later.** To make the builder's path the default, change which path SCR-stages draws first; the data for both exists. To drop it, delete the path and its three substitutes from §3.0, keep D-23 as an ordinary drawer, and simplify GATE-kc and W3-T12 to one path. Either change is cheap until stage content is authored, because prerequisites are expressed as KC edges, not stage numbers. [D]
- **Settle by.** Before W1-T04 (the KC graph and GATE-kc). [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-4 · Third-party tools

**In one line.** Third-party tools appear only as disclosed link-outs that are never credited; nothing embeds CheerpJ.

- **Decision.** Whether tools the course does not host may run inside or beside lessons.
- **Adopted default.** Disclosed, uncredited link-outs only: live.lean-lang.org, Alloy4Fun, TigerBeetle's simulator and TLA+ By Example (SPINE §1.2), plus the Natural Number Game (SPINE §9.1 lists it as a fifth); no embedded CheerpJ (BRIEF §8).
- **Rationale and sources.**
  - Zero servers, no accounts and no telemetry (I6; BRIEF §1.2) mean the course cannot vouch for a third party's logging or retention. The learner leaves the course's origin knowingly, and the course makes no claim about what happens there.
  - CheerpJ is free for personal, open-source and one-person-company use only from the vendor's CDN, and self-hosting needs a commercial license [V cheerpj]. Running TLC through it in the tab therefore means a request to a vendor at lesson time (dl §1, §3).
  - Alloy4Fun stores models server-side (dl §2, Stage 7); TLA+ By Example's license is unstated in its repository metadata (dl §7 item 13); the Natural Number Game's host was intermittent on 2026-10-20 and 2026-10-21 (dl §2, Stage 2), which is why D-08 pins a fallback.
  - "Never credited" follows from I1 and I4: a link-out result has no pinned version, argv or hash, so it cannot become a receipt, a run or Evidence.
- **Consequences.** No embedded WebAssembly Lean (Brief item 4); tab TLA+ is Spectacle and authored TLC graphs, never CheerpJ (INS-spectacle, INS-theater). Each link-out card names the third party and says the course does not see what happens there. [D]
- **How to change it later.** To allow an opt-in embedded CheerpJ lane: re-read the license against the owner's circumstances, add a consent card under M-consent that names the vendor CDN, put the vendor origin on an explicit allow-list in GATE-bundle's route tests, keep the "never credited" rule, and record the change here. [D]
- **Settle by.** Before the first link-out card ships (S2.L1, W2). [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-5 · Instrument origin

**In one line.** Instruments and all untrusted input run on a separate origin with its own custom subdomain.

- **Decision.** Where Pyodide-Z3, Spectacle, PGlite, the Datalog and lasso instruments, imported receipts and learner wasm run, relative to the origin that holds the learner's practice log.
- **Adopted default.** A separate instrument origin on its own custom subdomain, decided and recorded in W0 (BRIEF §8; V2-19; SPINE §1.2, §11.1, W0-S01).
- **Rationale and sources.**
  - Executed: an opaque-origin sandbox, the pattern kernelspace uses, fails for Pyodide in Chromium, and classic workers are refused; a separate origin with a module worker runs Z3 in Chromium 153, Firefox 155 and WebKit 26.6 and cannot read the parent's storage [X RUN-z3-starter-pyodide, RUN-browser-origin]. In a measured probe, Python inside a same-origin worker reached `indexedDB` (A5-F6), which on one origin is the learner's own log.
  - GitHub Pages serves project sites under one owner origin or an inherited custom domain, so a second project site is not a second origin [V ghpages][V ghdomain] (dr2 §6 item 1, B8). The instrument site needs its own hostname.
  - I6 requires untrusted input (URL-fragment specs, imported receipts, learner wasm) to be parsed only there, and spec duels (M-spec-duel) are impossible without it.
- **Consequences.** Two static deployments (`apps/site`, `apps/instruments`); one message-only bus, {engine, version, input, budget} → {verdict, witness, stats, provenance}; a domain or subdomain whose DNS the owner controls; caches, service worker and consent (OD-6) scoped per origin. The recorded run used a second local port, and a phone-class throttle did not reach the cross-origin worker, so phone timing is left to W0-S02 [X RUN-browser-origin]. The review also recommended a content-security policy of `connect-src 'self'` on the instrument host (A5-F6); the spine does not record it, so decide it in W0-S01.
- **How to change it later.** W0-S01 leaves a decision record with a fallback (SPINE §13). The measured alternatives fail: a same-origin worker can reach the learner's storage, and an opaque-origin frame fails for Pyodide in Chromium. A host that is already a distinct origin, such as another account's Pages host, might serve without a purchased domain; that is untested [D] and W0-S01 is the place to test it. Moving the origin after launch changes every cached asset URL and service-worker scope, so it is a coordinated release that uses the kill switch (M-consent).
- **Settle by.** W0-S01, before any instrument that parses URL input ships. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-6 · Downloads

**In one line.** No download asks first and none warns; while an engine downloads, the loader shows its size.

- **Decision.** Whether the site asks, or warns, before it downloads an engine or data, and what it shows while it downloads.
- **Changed 2026-10-25.** The owner changed the default on the review page (01:13 UTC). No download asks first and none warns, whatever its size. While an engine downloads, the loader shows its size: the engine's first load, counted as compressed bytes on the wire from the build's asset manifest, which is the unit ARCHITECTURE.md §5.9 already used.
- **The owner's reason.** The owner asked why the course should ask at all, and suggested at most a warning for very large downloads. The owner was then told that the 5 MB line came from a kernelspace rule for phones on metered data and had no outcome evidence, and that at that line both in-tab engines would ask: Pyodide with Z3 is 12,893,420 B of gzip [X RUN-phone-pyodide] and PGlite 5,580,851 B of gzip [X RUN-pglite-0511]. Asked afterwards where a warning should start, above 25 MB, above 10 MB or never [D], the owner chose never.
- **Replaced default.** Consent above 5 MB [D] (BRIEF §8; M-consent; GATE-bundle): any download above 5 MB asked first. Its rationale, consequences and how-to-change text are kept at the end of this record as history.
- **Consequences.**
  - M-consent keeps its ID, because IDs are never renamed, and now names the loader: no consent sheet or card and no size warning, a progress display of bytes received against the engine's size from the manifest, content-hashed caching and the service worker's kill switch. SCR-settings lists each engine's size and cache state with a remove control, in place of consent.
  - The bus drops consent: no `consent` field on `run` or `warm`, no `consent-required` error, no `needsConsent` in `EngineCaps`, and no consent record in working state (ARCHITECTURE.md §3.4, §5.4, §5.9, §7.4, §17.3 and §18 item 6). The host still fetches an engine only for a `run` or `warm` from the main origin.
  - GATE-bundle drops "behind consent" and the route test that no engine byte is requested before the consent tap. It checks instead that nothing prompts or warns before an engine downloads, and that the loader's size equals the manifest's figure (`caps.firstLoadBytes`).
  - A cell still opens on its recorded run, an engine still loads only when a page needs it, and no lesson waits for an engine, so phones keep the spine's flow (SPINE §9.3). Nothing now stops Z3 loading on a cold start, which the replaced text below said would need the Boot timing gate re-run: W1-T41 holds Boot's budget at 360 px with an engine download in flight [D].
  - W0-S01, W0-S02 and W0-S08 are reopened, because their decision records state the consent rule; each gets an addendum, and their measurements stand. W1-T06, W1-T20, W1-T41, W4-T04 and W6-T02 are edited to the new rule (tracker/tasks.yaml).
  - Records that are not reopened keep their wording. OD-5's "consent (OD-6) scoped per origin" now means the loader and the engine cache, scoped per origin. OD-4's card for an opt-in CheerpJ lane would disclose the vendor CDN, as every link-out card names its third party (OD-4), and would not ask about size. W0-S04 compares Spectacle's compressed first load with the former 5 MB (its section 4.5); the comparison stays as measured, and W0-S04 is not reopened, because the comparison was not its decision.
  - Wording that says a download asks first changes in the spine (§0, §1.2, M-consent, INS-z3, INS-pglite, SCR-settings, GATE-bundle, W1-T06), ARCHITECTURE.md, DESIGN.md, PLAN.md, the README, `labs/README.md`, `labs/TOOLS.md`, the S1, S2 and drawer specs, and the W0 report's standing owner action on compression. A link-out to a large third-party download, such as D-08's community port of the Natural Number Game, asks nothing either. Spine revision 3 (W0-T10) applies it.
- **How to change it later.** To bring back a warning or a prompt, add a size threshold to M-consent and GATE-bundle, write its copy and re-check the Boot timing gate; the loader's size display stays either way. [D]
- **Settle by.** W1-T06. [D]
- **Replaced default, as first recorded (history).**
  - *Rationale and sources.*
    - Phone-first surfaces and metered data. Consent before large downloads is a standing kernelspace rule (ks100x §1.3 item 13). The threshold itself is design rationale [D] with no outcome evidence (SPINE §7, M-consent).
    - The instrument that needs it most, Pyodide with Z3, has a first-load size that is recorded on real phones in {{run:RUN-phone-pyodide}} (W0-S02). The brief's earlier figure for it is not repeated here because it came from a review rather than a run (Log item 19).
    - First load must not block the first success: Boot uses a labeled recorded run while the worker is cold, and pocket checkers grade witnesses offline (INS-pocket), so Today needs no Z3 download.
  - *Consequences.* A consent card before any instrument whose first load exceeds the threshold (INS-z3 certainly; INS-pglite once W0-S08 records its size); content-hashed caching under a bundle budget; a service worker with a kill switch; Boot's interactive-time gate at 360 px uses a budget set from {{run:RUN-phone-pyodide}} (GATE-bundle); SCR-settings carries the control.
  - *How to change it later.* The threshold is one constant, the GATE-bundle budget and the consent copy. Raising it above INS-z3's first-load size means Z3 loads without asking on a cold start, so re-run the Boot timing gate; lowering it adds prompts for smaller assets. [D]
- **Status.** Changed 2026-10-25 by the owner (review page and conversation).

### OD-7 · Owner review envelope

**In one line.** Review is planned at 2 to 3 hours a week, and a wave starts only when the review queue is under 10 hours.

- **Decision.** How much of the owner's week the course may take in review, and the rule that paces the waves.
- **Adopted default.** Review of 2 to 3 h/week and a queue gate of 10 h; revisit at W1's exit (BRIEF §8; SPINE §13).
- **Rationale and sources.**
  - Review hours, not agent time, are the binding constraint on one maintainer working with agents (ks100x §8; BRIEF §1.2). kernelspace gated each wave on a queue under 10 h at a larger envelope of 10 h/week (ks100x §8, §11 OD11).
  - Here the owner's week also holds 6 to 10 h of study as learner-zero (SPINE §13), so review is between about a sixth and a third of the combined week [D].
  - The second review round estimated 250 to 345 h of work at this cap would need 83 to 173 weeks, against a 39 to 78 week arc (dr2 B6, derived). The spine plans review per task ("Review h" [D]) and sums to about 189 h, about 76 weeks at 2.5 h/week, or 17 to 20 months from W0's start, with W5's exit bound by learner-zero's own arc (SPINE §13 calendar [D]).
  - Planning at the pessimistic end follows the planning-fallacy evidence: 48.7% finished by their pessimistic estimate [buehler94] (grade B, dp row 41), and students study 5 to 8 h/week less than they plan [oreo19] (dp §4.1).
- **Consequences.** "Review h" is about 1.5 h per core lesson, 0.5 h per bridge, 2 to 3 h per lab, 0.3 h per audit anchor, 0.25 h per drawer and 0.5 to 1.5 h per spike [D], and logged review time replaces it after each wave. Unreviewed material is labeled "draft: first-learner pass pending". If a wave's review total outruns its window, the cut order (§14) applies before the queue gate is relaxed. Owner minutes are logged and no hour totals are published (dr2 B6).
- **How to change it later.** Edit the envelope and the gate in §13 and recompute the calendar table (weeks = review total ÷ envelope). Doubling the envelope halves the calendar but not the queue; relaxing the queue gate starts a wave on top of unreviewed work, so use the cut order first. No CI gate computes the queue; it is a process rule counted from the "Review h" cells. [D]
- **Settle by.** Now; revisit at W1's exit (BRIEF §8).
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-8 · Honor-system provenance

**In one line.** Provenance is self-declared and stated openly as an honor system; the course calibrates and does not police.

- **Decision.** Whether the course tries to enforce "unassisted work" or says plainly that it cannot.
- **Adopted default.** Honor-system provenance with no anti-cheat, stated on the assurance page (BRIEF §8; SPINE §8.2, §8.9, SCR-assurance).
- **Rationale and sources.**
  - Nothing local can verify "unassisted" for a learner who builds with agents every day, and a static site cannot hide its oracles, which are "unseen, not secret" (BRIEF §4.2, §4.4; dr1 §4 ruling 2).
  - Self-grades are least reliable where they matter: low performers inflate them [hacker00] (B, dp row 28). Unguarded model help raised practice scores and cut unaided exam scores [bastani25] (A−/C, dp row 33), which is why only unassisted, checker-graded work earns credit; that rule is [D] (dp §3.1).
  - A course about what each check establishes should not overstate what its own provenance check establishes (I10 holds the course's own graders to the same standard for bounds).
  - kernelspace's provenance weights rest on an engineering premise, that agents can produce most artifacts; it cites the harm studies only for the harm of substitution (ks100x V6).
- **Consequences.** Events carry `provenance: own | assisted | agent | automated` and `seen | unseen`; only own · unseen events count toward sign-off, settled, VRK₃₀ and audit accuracy (SPINE §8.2). Receipts carry self-reported `assisted: none | explain | code` and `agent: bool`. A passed Defence is [T] (n unseen items), never PROVED competence. SCR-assurance prints that unassisted work is self-declared, that oracles are visible to a determined learner, that Defence Part B has no outcome data and that n = 1 (§8.9); SCR-settings carries the honesty statement.
- **How to change it later.** Stronger policing needs a grading or proctoring server, which would reverse I6 and is a larger decision than this one. Within the current architecture the levers are a higher share of unseen-seed items, tool-detected provenance where possible (dr1 D1, for example recording a hook toggle), and reworded copy; only SCR-assurance, SCR-settings and §8.9 change. A signed attestation (OD-13) binds an artifact to a build, not a person to unassisted work, so it does not help here [D].
- **Settle by.** Before W1-T03 (the event log). [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-9 · Human reviewer and design partners

**In one line.** A human reviewer of claim cards is optional, and design partners gate only an "external learners" label.

- **Decision.** Whether a person other than the learner reviews work, and whether outside testers are required.
- **Adopted default.** An optional human reviewer of claim cards; design partners gate only an "external learners" label (BRIEF §8; SPINE M-weekly-review, §13).
- **Rationale and sources.**
  - One respected human reviewing claim cards monthly is a persistence lever: commitment rose with the status of the person told (Klein 2020) and coaching raised persistence (Bettinger 2014) (dp §4.3). The digest assigns those two studies no grade, so read the lever as [D] design rationale.
  - Peer machinery is excluded: cohorts, leaderboards and accountability-partner prompts. MOOC plan prompts (Kizilcec 2020) and accountability-partner prompts (Li 2025) were null (dp row 39, grade A, small).
  - Testers must not stall a wave, because a third-party dependency cannot gate an exit (dr2 B6; SPINE revision log P-04, P-28). Learner-zero is the author, so a learner-zero median measures no first-time learner (Log item 35).
- **Consequences.** RUN-boot-firstsuccess (at least five naive testers, with voluntary event-log exports) gates only the public "external learners" label (W1-T09). No wave exit depends on partners, and M-weekly-review works with or without a reviewer.
- **How to change it later.** To require partners, move RUN-boot-firstsuccess into W1's exit and count recruiting time inside the OD-7 envelope (kernelspace budgeted partner hours as a separate line, ks100x §8.1). To drop the label, remove the run from W1-T09 and never use the label. To name a standing reviewer, add one line to SCR-week; nothing else changes. [D]
- **Settle by.** Before W1-T09. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-10 · Self-explanation booklet

**In one line.** Adapt the booklet's text, not its three rights-reserved images, under the CC BY-SA 4.0 its PDF states, with credit and a change note, in its own directory; nobody asks the authors and nothing waits.

- **Decision.** Whether and how S2.L0, the self-explanation unit, may be adapted from a published booklet.
- **Changed 2026-10-25.** The owner flagged the default for discussion on the review page (01:14 UTC), then changed it in conversation. S2.L0 adapts the booklet's text only, not its three rights-reserved images, under the CC BY-SA 4.0 that page 1 of its PDF states, with credit to its authors and a change note, in its own directory under CC BY-SA 4.0. No request goes to the authors and nothing waits for a reply. If the authors ever object, an original unit under the course's license replaces the adaptation.
- **The owner's reason.** The owner asked why the request was needed. The answer: page 1 of the booklet's PDF states CC BY-SA 4.0, while its web page and the PDF's metadata say all rights reserved, so the request was meant to settle that conflict, at the cost of a 4-week wait in W2. The owner chose to adapt under the license the PDF states, without asking.
- **Replaced default.** Ask the authors before adapting, and keep any adaptation in its own directory under its license; after 4 weeks without a reply, write an original unit instead (BRIEF §8; SPINE §1.2; W2-T05; revision log P-28). Its rationale, consequences, how-to-change text and settle-by are kept at the end of this record as history.
- **Consequences.**
  - S2.L0 stays a bridge of 15 to 20 minutes and stays uncredited (M-self-explanation).
  - W2-T05 adapts the text in `content/third-party/self-explanation/`, with the CC BY-SA 4.0 license file, the credit and the change note beside it. The request, the logged reply and the 4-week window are gone. P-28's fallback, an original unit after 4 weeks without a reply, becomes the replacement for the case where the authors object, and `curriculum/S02-proof.md` §2 keeps that unit specified.
  - The conflict between page 1 and the rights-reserved notices is recorded, not settled by the authors. The course relies on page 1's statement (the PDF fetched 2026-10-23, SHA-256 prefix e55f4c9e…6559 [booklet]) and never copies the three images.
  - Share-alike binds the adaptation only. It keeps CC BY-SA 4.0 in its own directory beside course content under CC BY 4.0 (OD-16), and GATE-privacy's license lint covers the directory, as before.
  - W2-T05 is edited to the new rule (tracker/tasks.yaml). Wording that describes the request or the wait changes in the spine (§1.2, S2.L0's row and W2-T05's row; the revision log notes that P-28 no longer applies), PLAN.md, EVIDENCE.md (§9 item 11, and its Spine issue 5, which the text-only rule resolves), LANDSCAPE.md, the README's License section and `curriculum/S02-proof.md` (S2.L0's two variants). Spine revision 3 (W0-T10) applies it.
- **How to change it later.** If the authors object, or the owner later wants no copyleft text in the repository, remove the adaptation and ship the original unit that `curriculum/S02-proof.md` §2 specifies, under the course's license. [D]
- **Settle by.** Settled 2026-10-25; the adaptation ships with W2-T05.
- **Replaced default, as first recorded (history).**
  - *Rationale and sources.*
    - The unit is the cheapest lever for proofs: self-explanation training has an average effect of g = 0.55 [bisra18] (A), and the proof booklet gave d = 0.950 in one experiment [hodds14] (B), with a 15-minute version whose advantage persisted. Retention evidence is thin, and one study found no effect when time was controlled (dp row 13, grade A overall, B for proofs).
    - The license signals conflicted. An earlier fact-check could not confirm CC BY-SA: the web page's footer says all rights reserved and the PDF metadata marks rights reserved (L1 verification, item 5). The pedagogy digest then read page 1 of the official PDF, which states CC BY-SA 4.0 (SHA-256 prefix e55f4c9e…6559, fetched 2026-10-23), and found the rights-reserved notice on three embedded images only. Adapt the text and not the images, with attribution and share-alike, after a one-line confirmation from the authors (dp header; [booklet]).
    - Share-alike means an adaptation carries the same license, so the owner decides how a CC BY-SA module sits beside the rest of the repository (dp header). A separate directory keeps the terms visible.
  - *Consequences.* S2.L0 is a bridge of 15 to 20 minutes and is uncredited (M-self-explanation). W2-T05 accepts either the authors' reply logged with the license file in place, or, after 4 weeks without a reply, an original unit of 15 to 20 minutes under the course's license that passes GATE-lessons, so a third party cannot stall W2. GATE-privacy's license lint covers the directory.
  - *How to change it later.* If the owner would rather keep copyleft text out of the repository, write the original unit now and skip the request, which removes the 4-week wait. If the authors confirm, adapt text only, keep attribution and the license file beside it, and log the reply. If they object, the original unit is already the fallback; remove the adaptation before it is published.
  - *Settle by.* Send the request early in W1, so that W2-T05's 4-week window can close before W2 needs the unit. [D]
- **Status.** Changed 2026-10-25 by the owner (review page and conversation).

### OD-11 · Publication hygiene

**In one line.** No private-design content enters the repository, and the review JSONs stay out.

- **Decision.** What may be published.
- **Adopted default.** No private-design content; the review JSONs are excluded; "your system" is the only name for the learner's own product in public copy (BRIEF §1.5, §8; SPINE I9, GATE-privacy, W0-T01).
- **Rationale and sources.**
  - The repository will be public and the learner's platform design is private. Public copy may use only generic terms that the public roadmap already implies (BRIEF §1.5).
  - The two merged review JSONs are not publishable as saved; commit the digests and the brief instead (dr1 publication note; dr2 §7). Both digests record the SHA-256 of the unredacted files, so a reviewer can be shown the originals unmodified without publishing them.
  - Additions beyond the roadmap survive only where a roadmap line asks for them (BRIEF §1.1 scope ruling; dr1 §4), and a public course must not couple to anything outside the roadmap (dr2 R19).
- **Consequences.** GATE-privacy: no private-design terms, personal identifiers, emails or private paths; review JSONs absent; every vendored directory carries its license. The private overlay (M-overlay, `statespace overlay`) is local-only and never committed (W5-T12), and `statespace stuck` strips private paths (W2-T14). The gate's scope is not stated, and the repository holds research files it should probably cover; see Spine issues.
- **How to change it later.** The default is one-way: private content that has been published cannot be recalled. Relax it only by publishing something redacted. To show evidence from the reviews, commit a redacted copy under `docs/` and record the original's hash.
- **Settle by.** W0-T01, before the first public push. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-12 · Edition pins

**In one line.** Edition 1 pins Lean 4.35.x and PostgreSQL 18.6, and the isolation catalog is re-recorded after PostgreSQL 19 reaches general availability.

- **Decision.** Which tool versions an edition teaches against, and when a pin moves.
- **Adopted default.** Lean 4.35.x and PostgreSQL 18.6 for edition 1; re-record the catalog after PostgreSQL 19 GA (BRIEF §8; SPINE §9.2, W6-T07).
- **Rationale and sources.**
  - Tools move faster than lessons. The next Lean release is expected within weeks of the pin [D], TLC's newest build is a rolling pre-release pinned by SHA-256 [X RUN-tlc-jars], and Spectacle's head moves weekly (BRIEF §2.5; dl §3). So pin per edition and run the newest stable monthly (GATE-labs).
  - PostgreSQL's documentation alias `current` flips to 19 at GA, so links point to `/docs/18/`. The PostgreSQL 19 release notes list no isolation or row-security changes [V pg19notes], so the pin is stable, but the catalog is re-recorded rather than assumed [D].
  - Every pinned behavior is already a recorded run on these versions: the four ledger theorems and the axiom probes on Lean 4.35.0 [X RUN-lean-ledger, RUN-lean-axioms], and the isolation table on PostgreSQL 18.6 [X RUN-pg-anomalies, RUN-pg-claims]. A pin change therefore re-runs the registry instead of editing copy (GATE-runs).
- **Consequences.** A tool bump re-runs `runs/` and opens a reviewable diff; Goal Replay is regenerated and compared (GATE-replay); `statespace doctor` checks the devcontainer pins; W6-T07 does the PostgreSQL 19 check; the PGlite pin is {{run:RUN-pglite-0511}}.
- **How to change it later.** A newer Lean inside an edition is a new edition: re-run every Lean run, regenerate the strips, re-check comparator verdicts and statement hashes against the new toolchain, and publish the diff as change cards (M-change-cards). Moving to PostgreSQL 19 means re-recording the catalog rows in the W0-S09 format, updating the `/docs/18/` links and re-checking each specimen's SQLSTATE.
- **Settle by.** When W0-S12 and W0-T05 record the pins; reviewed again at W6-T07. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-13 · Sigstore attestations

**In one line.** Sigstore attestations are off by default and may be enabled only on a learner's own public repository.

- **Decision.** Whether receipts or reports are signed into a public transparency log.
- **Adopted default.** Off by default; if ever enabled, for learners' public repositories only (BRIEF §8; SPINE §9.4).
- **Rationale and sources.**
  - Attestations from public repositories land in a publicly readable transparency log (dr2 §6 item 5; [attest]), so a learner's private overlay or private repository must never emit one (M-overlay; I9).
  - For private repositories, the vendor's page does not state whether attestations are available (A5 review) [U].
  - The benefit is small: the brief scored the idea 8 or less and kept it only as an optional extra (BRIEF §6 "Also kept"; dr2 §5 idea 11, impact 3 × wow 4 ÷ effort 1.5).
  - An attestation binds an artifact to a build, not a person to unassisted work, so it does not touch the provenance limits recorded under OD-8 [D].
- **Consequences.** Receipt v1 has no attestation field and `statespace export` does no signing. The course's own assurance trail is the runs registry and its diffs (GATE-runs), not signatures.
- **How to change it later.** Add an optional attestation object to the receipt schema (a version bump, since receipt@1 will have been published), ship an opt-in CI template for public lab repositories in `statespace-lab`, and warn that a public entry is permanent. The overlay stays excluded. [D]
- **Settle by.** Before receipt@1 is published (W0-S11), so that a schema change is not forced later. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-14 · Name of the persistent world

**In one line.** The persistent world is called "the Clearinghouse" for now, and the course keeps its coined nouns few.

- **Decision.** A name for the seeded world into which the learner's components plug, and the policy on new nouns.
- **Adopted default.** Working name "the Clearinghouse"; prefer fewer nouns (BRIEF §7.4, §8; SPINE §0 glossary, M-docket, SCR-clearinghouse, W3-T14).
- **Rationale and sources.**
  - Naming is low priority and fewer nouns is the safer default (BRIEF §8). The round-2 design review filed "too many nouns, mixed metaphors, and three name collisions" as a major finding (A7-12), and the spine caps learner copy at 25 coined terms, with at most five new terms in Boot (§0; Log item 32).
  - The Clearinghouse is one of those 25 terms (glossary #23). It first appears after LAB-3, so it is never a Boot term.
  - The world is thin: a seeded Mini-Plinth world run by INS-interp, with the learner's components plugged in (M-docket; Brief item 12). Its internal name, docket, and the weekly incident queue stay internal; GATE-lessons lints them out of learner copy.
- **Consequences.** One ID embeds the name, SCR-clearinghouse, and three tasks build the world: W3-T14, W4-T14 and W5-T13.
- **How to change it later.** Pick a plain name ("the World") or another word; update glossary term 23, rename SCR-clearinghouse and its references in one pass so GATE-links resolves, and change copy in the three tasks. The cost is low because it is one noun. [D]
- **Settle by.** Before W3-T14. [D]
- **Status.** Accepted 2026-10-25 by the owner (review page).

### OD-15 · Lab shape

**In one line.** Ten labs with 91 stages, 83 planned and 8 stretch, pinned per lemma; an owner decision since the owner accepted the spine's proposal (full record: Log item 4).

- **Decision.** How many labs and lab stages the course builds, and how long a stage may be.
- **Proposal reviewed.** Not one of the fourteen defaults: the spine proposed a lab shape of 10 labs with 91 stages (83 planned and 8 `[stretch]`), against the brief's 9 labs and "~45 stages", with stages pinned per lemma, at most 25 minutes on weekdays and at most 45 minutes at weekends, and asked the owner to review it as OD-15 (SPINE §1.2, §3.0, §3.11).
- **Rationale, alternatives and consequences.** As Log item 4 records them. A Lean proof of a whole theorem does not fit a 25-minute stage, so stages are pinned per lemma and whole-theorem stages are weekend stages; three hands-on acts the roadmap asks for gained stages of their own; every check needs hint rungs R0 to R4, so authoring volume and review hours grow with the stage count, and GATE-budget confirms the totals fit.
- **How to change it later.** Fewer stages means merging per-lemma stages, which breaks the 25-minute cap or the per-lemma hint ladders and comparator checks (Log item 4). A change goes through GATE-budget and the lab's stage spec before its wave authors the lab. [D]
- **Settle by.** Settled 2026-10-25, before W1; the lab shape sets most of the review load.
- **Status.** Accepted 2026-10-25 by the owner (review page). OD-15 is an owner decision from that date; Log item 4 keeps the full record.

### OD-16 · Course licenses

**In one line.** Code is under the MIT License and course content under CC BY 4.0, in statespace and in kernelspace.

- **Decision.** Which licenses the course offers its own code and content under, and which license kernelspace's vendored code carries.
- **Adopted default.** None: OD-16 was open. The review page offered MIT for code and CC BY 4.0 for content as a suggestion, and the owner chose both for both repositories.
- **Rationale and sources.**
  - A public file without a license grants a reader no rights, and GATE-privacy kept the fast lane red while `vendor/kernelspace/` had no license file of its own (W0-T01, W0-S12) [X RUN-privacy-gate].
  - MIT is the license kernelspace's Rust crates already declared, and CC BY 4.0 lets anyone reuse and adapt the text and figures with credit. Neither is copyleft, so learners may build on the lab templates and checkers in their own projects under any terms [D].
  - The OD-10 booklet, if adapted, keeps its CC BY-SA terms in its own directory, and third-party material keeps its own license (README, License).
- **Consequences.** `LICENSE` (MIT) and `LICENSE-CONTENT` (CC BY 4.0) at the root of both repositories, and a License section in each README that says which files are code and which are content. kernelspace gained a `NOTICE` for ts-fsrs. `vendor/kernelspace/` is pinned to kernelspace's licensed commit `80c8537e`, which changed no vendored file, and carries upstream's `LICENSE`. GATE-privacy's vendor-license finding and its course-license warning clear.
- **How to change it later.** Future versions can be relicensed at any time, but copies already published stay available under these terms. The copyright lines name "the statespace authors" and "the kernelspace authors"; putting a person's name there is a one-line edit.
- **Settle by.** Before the first public push; settled late, on 2026-10-25.
- **Status.** Decided 2026-10-25: the owner took the suggestion, MIT for code and CC BY 4.0 for content, for statespace and for kernelspace (review page).

### Questions W0's results raised

W0's results raised two questions, which the review page put to the owner beside OD-16. The owner decided both on 2026-10-25. They are named as the review page named them; Q-1 and Q-2 are not spine IDs.

#### Q-1 · LAB-2's public proofs

**In one line.** The public proofs of LAB-2's four basic ledger theorems stay, and S2's worked examples use parallel theorems.

- **Question, as asked.** "Complete proofs of LAB-2's four basic ledger theorems are public: in the v1 research spike since the first commit, and now in W0-S10's Goal Replay corpus, a specimen's input and W0-S07's `vcgen` demo. A suggestion: keep them (they are history, and provenance is an honor system under OD-8), and have S2's worked examples use parallel theorems so LAB-2 still asks for proofs of your own."
- **Decision.** Accepted as suggested.
- **Consequences.**
  - Nothing is removed. The four theorems are `transfer_conserves`, `transfer_rejected`, `transfer_nonneg` and `run_conserves`; their proofs stay in `research/spikes/lean/Ledger.lean`, in W0-S10's corpus (the same file, by hash), in the specimen input and in W0-S07's demo. W0-S06's owner action on the LAB-2 proofs already public is settled. The LAB-2 pack's own solution files still stay in the private companion repository (W0-S06, owner action 5), as W2-T36 and W2-T37 require.
  - S2's worked examples, reference strips, fading rungs and Proof Blocks, and the banks that S2's lesson and Defence items draw from, prove parallel theorems, never a theorem that a LAB-2 stage asks for, as S9's worked examples already use a sibling construct so that the lab's cases stay the learner's (`curriculum/S09-preservation.md`). In `curriculum/S02-proof.md` this moves S2.L0's strip and S2.L6's segment (`transfer_nonneg`), S2.L3's strip and S2.L5's first worked example (`transfer_conserves`), and S2.L7's reference proof, fading rungs and Proof Blocks (`run_conserves`); S2.L8's `decide` strip shows another instance than the one LAB-2.6 asks for. Among the banks, S2.L0's reading bank holds no LAB-2 theorem, the transfer-variant bank (S2.L3, S2.L5) leaves out LAB-2's own `transfer`, and the threaded-state bank (S2.L7) leaves out its `run`. The sample item in ASSESSMENT.md §4.14 and the Goal Replay schematic in DESIGN.md §6.9 move with S2.L7. The parallel theorems avoid the hint ladders' unseen variants, so those stay unseen [D].
  - What shows a failure, reads a statement or names a move, and no complete proof, stays on LAB-2's theorems: SP-2.3, the recorded failure of `run_conserves` without `generalizing s`, with S2.L7's prequestions, its template-3 item and its explain-back; S2.L5's statement items and SP-2.2's no-guard failure; Part D of the S2 Defence; and D-05's "generalize first" (`curriculum/D-drawers.md`). SP-2.3 is the spine's specimen for CL-2.4, and LAB-2.5 still asks for the learner's own proof.
  - LAB-2.1's reference module stays as specified: its `omega` proof of `transfer_conserves` fails LAB-2.c2's manual-mode scan (`curriculum/S02-proof.md` §13, issue 8), so LAB-2.2 still needs the learner's own proof.
  - W2-T05, W2-T19, W2-T20, W2-T21 and W2-T30 carry the rule (tracker/tasks.yaml); spine revision 3 (W0-T10) applies it to the S2 spec, ASSESSMENT.md and DESIGN.md.
- **Status.** Accepted 2026-10-25 by the owner (review page).

#### Q-2 · Adopt W0-S13

**In one line.** W0-S13 spikes trace validation by TLC's trace-module method, so that W5-T14 has a tested fallback.

- **Question, as asked.** "Adopt W0-S13: spike trace validation with TLC's trace-module method on a toy outbox spec (one accepted, one rejected and one partial NDJSON trace), so W5-T14 has a tested fallback. It adds 0.5 h of review."
- **Decision.** Accepted: W0-S13 is adopted (`adopted: true` in tracker/tasks.yaml) and runs before W0's exit.
- **Consequences.** W0-S13 writes a decision record with a fallback and records its run under the ID that W0-T10 registers. W5-T14 builds on that record, and its branch for a declined W0-S13 is gone (tracker/tasks.yaml). W0-S05's owner action to decide on W0-S13 (its section 7, action 2) is settled (tracker/tasks.yaml), and W0-T10 decides how the spine's RUN-trace-validate-spike (§3.8, §9.5, §9.6 and W0-S05's row in §13) resolves against W0-S13's run. The owner's review queue gains 0.5 h [D].
- **Status.** Accepted 2026-10-25 by the owner (review page).

## 2. Contested items in the brief (BRIEF §5.1)

BRIEF §5.1 resolves sixteen items where the reviews and digests disagreed. Each record restates the positions, keeps the reason the brief gave, and adds where the resolution lands in the spine. Round-1 and round-2 change IDs (D1, A4, R9 and the like) are those of the two review digests, `dr1` and `dr2`.

### Brief item 1 · Confidence scale

**In one line.** Three confidence taps with printed probability bands and the chance level shown; certainty-based payoffs are feedback, never credit.

- **Context.** Call It records a verdict and a confidence before a run. v1 offered 55, 75 and 95. Round 1 proposed mapping the three taps per item to the chance level 1/k and scoring by Brier against a no-skill baseline (D15). Round 2 proposed certainty-based marking (CBM) with printed bands and payoffs (A4). On a three-way verdict chance is 33%, so a 55% floor forces overconfidence (dp §3.4).
- **Decision.** *Guess* (below 67%), *think so* (67 to 80%) and *sure* (above 80%), the bands being CBM's switch points; the item shows its chance level, 1/k; the payoffs (+1/0, +2/−2, +3/−6) are shown before the choice and used as feedback only. The first call is final and is the only one that counts. The Mirror leads with bias and the hit rate per band with Wilson intervals, and diagnoses nothing below about 20 to 30 calls per band.
- **Alternatives considered.** (a) 55/75/95, as in v1: rejected, because it forces overconfidence on three-way verdicts, and a Brier headline from about 40 calls is unstable; 7 of 12 right has a 95% interval of about 0.32 to 0.81 [D] (dp §3.4). (b) Per-item mapping to 1/k with Brier (D15): partly kept, since the chance level is printed, but the bands come from CBM's published switch points. (c) CBM payoffs as credit: rejected, because penalties mix risk attitude into the score; under penalties women skipped more at equal knowledge [baldiga14] (B, dp row 30). (d) Full probability distributions (D15): rejected for friction and for consistency with the family's three-tap design.
- **Lands in.** SPINE §8.5; M-call-it; M-mirror; W1-T07. Grade: A for the retrieval, C for CBM as feedback (SPINE §7).
- **Sources.** [cbm]; [baldiga14]; [stone00] (B/C: feedback cut overconfidence, content teaching raised it, dp row 29); dp §3.4; dr1 D15; dr2 A4, R14.
- **Status.** Proposed.

### Brief item 2 · Audit sound share

**In one line.** A pool of matched sound and flawed pairs, about half sound, with each session's sound share drawn from a seed between 30 and 60%.

- **Context.** v1's Audit Desk had 4 sound cases in 32, so "reject everything" scored 87.5% precision and 100% recall [D], more than v1's own mock learner (dr1 D3). Proposals for the base rate were 25 to 35% sound (dl §4), a fixed 40 to 50% (D3) and a seeded 30 to 60% (A4).
- **Decision.** The pool is matched pairs, about half sound. Each session draws its sound share from a seed in the 30 to 60% range, so the rate cannot be learned. Scoring is per-class precision and recall plus balanced accuracy with Wilson intervals, reported per class only from n ≥ 10. GATE-audit-blind fails CI if always-reject, always-accept, last-is-sound or topic-is-class beats chance by more than 2 SD.
- **Alternatives considered.** (a) 25 to 35% sound (dl §4): keeps most cases flawed but the rate is learnable. (b) A fixed 40 to 50% (D3): the same flaw; a learner who infers the rate can bias toward it. (c) A fixed 50% [D]: simplest and equally learnable. (d) An unmatched pool [D]: loses the contrasting cases that make a flaw visible (d = .50 [alfieri13], grade A).
- **Lands in.** SPINE §6; GATE-audit, GATE-audit-blind; W1-T17.
- **Sources.** dl §4 design rules; dr1 D3; dr2 A4, R10; [alfieri13]; [alemdag25] (A, small; erroneous examples need prior knowledge); BRIEF §4.8.
- **Status.** Proposed.

### Brief item 3 · Defence format

**In one line.** A four-part, untimed Defence over at least two sessions, with explain-back required and uncredited.

- **Context.** v1's viva was self-graded or graded by a model. Proposals: 6 to 8 machine-graded items passing at 5 of 6, plus a self-graded Part B (D1); Prove-it plus equivalence-graded specification items (A2); four parts (dp §3.5).
- **Decision.** Part A probes (10 to 12 unseen-seed items from at least three families, agent closed, a call on each); Part B defend (4 to 6 seeded mutations of the learner's own artifact, predicted first, graded by Lean, TLC, Z3 or cargo); Part C audit (four cases, at least one sound, typed evidence); Part D explain-back (required, uncredited). Untimed, over at least two sessions within a week of the lab. The grade is B−.
- **Alternatives considered.** (a) 6 to 8 items, pass at 5 of 6 (D1): too few items for a stable interval [D], and no audit part. (b) Prove-it plus specification items only (A2): leaves out the audit skill that end-state (g) trains [D]. (c) A self-graded Part B or a model grader: rejected; low performers inflate self-grades [hacker00] and model proof scores are inflated up to about 20 times [petrov25] (dp rows 28, 31). (d) Timed: no validity evidence, and harm appeared under speed pressure [shen26] (dp row 33). (e) Explain-back as practice only (R21): it stays uncredited but is required, because the roadmap's completion tests are explanations.
- **Lands in.** SPINE §3.0, §8.6; M-defence, M-explain-back; W2-T12. The small-part rule and the retake rule are Log item 27.
- **Sources.** [serth22] (a gap before a separate exam lost learners); [wass03] (two orals reach reliability 0.65, four orals by two examiners 0.78; dp row 28); [rowland14] retrieval (A); [kobayashi19] explanation (A/B, small); dp §3.5; dr1 D1; dr2 A2, R21.
- **Status.** Proposed.

### Brief item 4 · Lean in the browser

**In one line.** No embedded WebAssembly Lean; goal states come from generated Goal Replay, with a disclosed link-out.

- **Context.** A community WebAssembly build could give a live Lean cell in the tab. The landscape digest proposed it as an opt-in practice cell that never awards credit; round 2 rejected it (R20).
- **Decision.** No embedded build. Goal Replay strips are generated at build time from real Lean elaboration (INS-goal-replay), regenerated on every toolchain bump (GATE-replay); live.lean-lang.org is a disclosed, uncredited link-out (OD-4). The community build needs cross-origin isolation, reports Lean 4.33.0-pre, which is behind the pinned toolchain, and loads 137,362,599 B decoded (17,179,888 B transferred) on a cold start [X RUN-lean-wasm].
- **Alternatives considered.** (a) An opt-in cell with a CI divergence check (dl §3): the payload, a second isolation regime beside the instrument origin, and the lag behind the pinned toolchain outweigh a practice-only benefit. (b) Lean on a server: reverses I6 [D].
- **Lands in.** SPINE §9.1 (INS-goal-replay's honest limits); W0-S10, W2-T03.
- **Sources.** dl §2 Stage 2 ("Lean in the browser"), §3; dr2 R20; BRIEF §2.4.
- **Status.** Proposed.

### Brief item 5 · Datalog in the tab

**In one line.** Z3's Fixedpoint inside the existing Pyodide worker if W0-S03 passes; otherwise a TypeScript evaluator differential-tested against Soufflé.

- **Context.** S7 needs a policy engine in the tab that shows derivations. Proposals: a TypeScript evaluator (dl), `ascent` (D19), Z3 Fixedpoint (R7).
- **Decision.** Fixedpoint in the existing Z3 worker if spike W0-S03 shows equal relations to Soufflé; otherwise the TypeScript evaluator, differential-tested against Soufflé. Soufflé is the Bench reference (INS-datalog, INS-bench-souffle). Executed so far: stratified negation works, with `canread(1,3)` satisfiable and the revoked `canread(1,4)` unsatisfiable [X RUN-z3-fixedpoint]. W0-S03 then found equal relations and derivation heights to Soufflé on every comparison [X RUN-fixedpoint-equal], so Fixedpoint is the tab engine and the evaluator is the logged fallback (Log item 55).
- **Alternatives considered.** (a) A TypeScript evaluator first (dl): a fourth engine and a second semantics to gate (dr2 A5-F17). (b) `ascent` (D19): a Rust crate for the Bench rather than a tab engine; dr2 B7 confines it to the final stage. (c) Alloy as the main engine: the roadmap says "Soufflé or Alloy", and Alloy becomes drawer D-16 so that both are honored.
- **Lands in.** SPINE §3.7, §9.1; W0-S03, W4-T07; GATE-conformance (tab Datalog = Soufflé).
- **Sources.** dr2 R7, B7; dr1 D19; BRIEF §5.1; roadmap Stage 7.
- **Status.** Proposed.

### Brief item 6 · TLC pin

**In one line.** Pin TLC 1.8.0 by SHA-256 for JSON traces, label it pre-release, and run 1.7.4 in CI as the text-trace fallback.

- **Context.** The newest stable TLC, 1.7.4, rejects the `-dumpTrace` option; 1.8.0 is a rolling pre-release that writes JSON traces. The two print the same state counts on the course's double-spend spec [X RUN-tlc-doublespend].
- **Decision.** `tla2tools` 1.8.0 pinned by SHA-256 and labeled pre-release; 1.7.4 as the text-trace fallback in CI; Java 21 [X RESULTS.md]; argv always recorded; minimal traces only with `-workers 1` (INS-bench-tlc). On the double-spend spec, default flags stop at "Deadlock reached" with 10 distinct states, and the explicit deadlock flag reports the violation at 11 distinct states [X RUN-tlc-doublespend, RUN-tlc-jars].
- **Alternatives considered.** (a) 1.7.4 only: stable, but the Theater and the lasso validator would parse text instead of JSON [X RUN-tlc-doublespend]. (b) 1.8.0 only: it is re-published without notice, and a pin by SHA protects the course but leaves no stable fallback. (c) Build TLC from a tagged commit [D]: a heavier toolchain for the same pin.
- **Lands in.** SPINE §3.5, §9.2; W3-T05; GATE-labs (argv on every receipt).
- **Sources.** RUN rows above; dr2 B2; BRIEF §2.3.
- **Status.** Proposed.

### Brief item 7 · CheerpJ TLC

**In one line.** TLC through CheerpJ is not embedded; the default is off, and the question was reserved for the owner as OD-4.

- **Context.** TLC can run in a tab through CheerpJ, and TLA+ By Example does so from the vendor's CDN. The vendor's license allows free use from the CDN for personal, open-source and one-person-company use, and self-hosting needs a commercial license [V cheerpj].
- **Decision.** Default off. TLA+ By Example is a disclosed, uncredited link-out (OD-4). The course's tab TLA+ is Spectacle plus authored TLC state graphs (INS-spectacle, INS-theater), and TLC itself runs on the Bench.
- **Alternatives considered.** (a) An opt-in embedded lane (dl §3): a runtime request to a vendor CDN, against "zero servers, no telemetry", under terms that depend on who runs and forks the repository. (b) Self-hosting CheerpJ: a commercial license. (c) A home-made TLA+ explorer: a second semantics, which v1 planned and round 2 rejected (V2-13).
- **Lands in.** OD-4; SPINE §9.1.
- **Sources.** dl §2 Stage 5, §3; dr2 B2; BRIEF §5.1.
- **Status.** Proposed; the owner decision it depends on is OD-4.

### Brief item 8 · Comparator sandbox

**In one line.** Record the sandbox state on every receipt and never require it.

- **Context.** `lake comparator` and `lake check` build in a bubblewrap sandbox that works only on Linux. Under default Docker, bubblewrap fails with the same exit code as a rejection.
- **Decision.** Receipts record `sandbox: on | off | failed` and are never blocked by it. macOS and Windows learners use the devcontainer. Relaxed container confinement is an opt-in, documented profile, never a silent default (SPINE §9.2, §9.4; INS-bench-lean).
- **Evidence.** Without bubblewrap the command exits 2; with bubblewrap under default Docker it exits 1, the code of a rejection [X RUN-lean-bwrap-docker]. Statement matching works without the sandbox: an honest solution is accepted and a weakened statement and a redefined function are rejected [X RUN-lean-comparator]. A failed sandbox is told from a rejection by positive evidence, a `bwrap:` line, never by exit code [X RUN-bwrap-lanes]. On a stock Ubuntu 24.04 virtual machine, the stand-in W0-S06 used for a CI runner, AppArmor's restriction on unprivileged user namespaces stops the sandbox as shipped [X RUN-bwrap-lanes]. Verdicts on CI runners, Docker Desktop and Codespaces are {{run:RUN-bwrap-lanes}} (W0-S06; SPINE §12 item 57).
- **Alternatives considered.** (a) Require the sandbox (R3): the threat is self-deception through one's own agent, not an attacker, and requiring it would block most non-Linux learners. (b) Relax container security silently: rejected (dr2 §1, "never relax container security silently"). (c) No sandbox at all [D]: loses the defense against a malicious metaprogram where it is available.
- **Lands in.** SPINE §9.2, §9.4, SP-2.8; W0-S06.
- **Sources.** [lean435]; [leanvp] (Lean's manual treats un-reviewed AI-generated proofs as potentially malicious); dr2 A1, R3.
- **Status.** Proposed.

### Brief item 9 · Heavy lane

**In one line.** The nightly lane blocks releases, and a red night downgrades the claims it touches to "unverified since <date>".

- **Context.** Lean, PostgreSQL, conformance and accessibility checks are too slow for a fast lane of under 5 minutes. The question was whether the slow lane is advisory or blocking (R5).
- **Decision.** The fast lane (under 5 minutes) blocks merges; the nightly lane blocks releases; a red night downgrades the claims it touches; the release lane is a Cedar-style gate (SPINE §11.2; GATE-release).
- **Alternatives considered.** (a) Advisory only (R5): the load-bearing Lean and TLC claims live in the nightly lane, so a red night would leave stale claims standing. (b) Block merges on the nightly lane [D]: it would break the 5-minute budget and one maintainer's capacity. (c) Rely on review alone [D]: review hours are the binding constraint (OD-7).
- **Lands in.** SPINE §11.2; W0-T04, W5-T09.
- **Sources.** dr2 R5, B5; [cedarblog] ("A new version of Cedar isn't released unless its model, proofs, and differential tests are up to date").
- **Status.** Proposed.

### Brief item 10 · Author lag

**In one line.** Agents draft stage N+1 while the owner studies stage N, and unreviewed material is labeled draft; there is no embargo.

- **Context.** Content drafted by agents ahead of the owner's own study can be wrong in ways only a learner notices. The options were an embargo or learner-zero.
- **Decision.** Learner-zero: agents draft stage N+1 while the owner studies stage N, and unreviewed material carries "draft: first-learner pass pending" (SPINE §13 rules).
- **Alternatives considered.** (a) An embargo that holds content until it has been studied (R2): it blocks the owner at the moment the owner needs the course. (b) Separate author and learner [D]: not available with one maintainer.
- **Lands in.** SPINE §13; GATE-runs fails the fast lane on non-draft content that cites an unresolved run. Learner-zero's numbers are descriptive (Log item 35).
- **Sources.** dr2 R2, B6.
- **Status.** Proposed.

### Brief item 11 · AI policy

**In one line.** Agents are welcome everywhere except on Prove-it and Defence items; the policy is per item, not per stage.

- **Context.** The owner builds with coding agents daily, and the course must still measure what the learner can do alone.
- **Decision.** Per item. Agents may implement and prove outside "by hand" stages. Prove-it and Defence items are agent closed. Only unassisted, checker-graded work on unseen seeds earns credit, and an agent's claim renders as quoted UNREVIEWED text and is never stamped (I1, I8; SPINE §8.1, §8.2; M-prove-it).
- **Alternatives considered.** (a) Per-stage bans (R9): unenforceable for someone who builds with agents every day. (b) No policy [D]: substitution harm, since unguarded model help raised practice scores and cut unaided exam scores [bastani25] (A−/C, dp row 33). (c) A detector [D]: it needs a server or telemetry, which I6 rules out.
- **Lands in.** SPINE §8.1, §8.2; W1-T18 (the agent kit); GATE-guardrails.
- **Sources.** dr2 R9, A1; dp rows 33 and 34.
- **Status.** Proposed.

### Brief item 12 · Scope of the persistent world

**In one line.** The world is thin: a seeded Mini-Plinth world on the reference interpreter, in the roadmap's nouns only.

- **Context.** Round 1 proposed a rich, domain-specific simulated world; round 2 asked for a thin one (C2, R18). A richer domain would add scope with no outcome evidence.
- **Decision.** Thin. A seeded, deterministic world run by INS-interp, growing with the stages: accounts, postings and holds; concurrent command traffic; users, teams, roles, documents and sharing; an external provider. The mutation generator plays the agent, and erosions fire from the oldest open erodible seam (M-docket; V2-25).
- **Alternatives considered.** (a) The richer domain (D22): the largest build, adding scope with no outcome evidence (R18). (b) No world at all [D]: drops the plug-in pattern of the family formula (BRIEF §1.2).
- **Lands in.** SPINE M-docket, SCR-clearinghouse; W3-T14, W4-T14, W5-T13; RUN-docket-baselines; GATE-audit-blind covers the incidents.
- **Sources.** BRIEF §7.4; dr1 D22; dr2 C2, R18.
- **Status.** Proposed.

### Brief item 13 · Navigation and names

**In one line.** Navigation is Today · Stages · Bench · Audit · Claims, plus search.

- **Context.** Round 1 proposed Today, Map, Bench and Record with command-palette search (D21). Round 2 proposed Stages, Audit and Claims (R16), after finding that the earlier names collided with the subject matter (B9).
- **Decision.** "Stage" is the roadmap's word. "Signed off" replaces v1's "set", which collides with Lean's `Set`. Claims replaces v1's Ledger, because a ledger is what the course models. The private Mirror is reached from Today and never appears on Claims. Home is an ordered path of stages with a list mirror (SPINE §0).
- **Alternatives considered.** (a) Map and Record (D21): Map belongs to the retired masonry and elevation metaphor and Record is generic. (b) Keep Ledger and "set": two meanings of "ledger" can appear on one screen, and "set" is a Lean type (A7-12). (c) A masonry-bond home drawing (R17): contiguous spans cannot draw S6 resting on S3 and S5 beside S9 resting on S3 and S4, so an ordered path with rests-on edges on focus won.
- **Lands in.** SPINE §0 Navigation, §10.1; W1-T02.
- **Sources.** dr1 D21; dr2 B9, R16, R17; A7-12.
- **Status.** Proposed.

### Brief item 14 · The cache-header lesson

**In one line.** The landscape digest's CDN cache-header lesson becomes one drawer without vendor specifics.

- **Context.** The landscape digest proposed a core lesson on cache headers and sensitivity. The roadmap defers CDN topology until an obligation demands it, and the vendor-specific part rested on an unverified reading of vendor documentation [U] (dl §2 Stage 7).
- **Decision.** One drawer, D-20 ("Sensitivity in caches, without vendor specifics"), attached to S7 and always open. It teaches the information-flow idea with configured and assumed seams stated generically (SPINE §3.7, §3.12).
- **Alternatives considered.** (a) A core lesson: it would displace a core S7 lesson inside a budget the brief already stretched (V2-23) and teach vendor behavior the roadmap defers. (b) Omit it [D]: loses a real information-flow channel. (c) Teach one named CDN [D]: unverified [U], and the roadmap defers it.
- **Lands in.** SPINE D-20, §3.7.
- **Sources.** dl §2 Stage 7 ("Caches"); BRIEF §1.1; roadmap "What not to study prematurely".
- **Status.** Proposed.

### Brief item 15 · Experiments

**In one line.** Keep and kill decisions use rules fixed in advance for one learner, read descriptively, instead of pre-registered randomized experiments.

- **Context.** kernelspace pre-registered within-learner randomization, with thresholds filed before any data (ks100x §9). One learner cannot power a randomized comparison.
- **Decision.** n = 1 decision rules. The four comparisons of BRIEF §3.5 (feedback layer open versus collapsed; Proof Blocks distractors versus none; counterexample versus class hint; reserve weeks versus none), with 30-day fresh-seed accuracy as the outcome. The rules file is committed with its SHA-256 recorded in RUN-keepkill-rules before the first W1 learner-zero event, and GATE-schema checks the hash is unchanged. Results are reported descriptively, with no causal claim (V2-32; W0-T07).
- **Alternatives considered.** (a) Pre-registered randomized comparisons (ks100x §9; dp §7): they need an n the course does not have (R23). (b) No rules [D]: rules fixed after the data are not fixed in advance (SPINE revision log P-05; Log item 23). (c) A fifth comparison, confidence prompts on reviews versus none (dp §7 lists it): not adopted, since BRIEF §3.5 lists four.
- **Lands in.** SPINE W0-T07, §4.1; GATE-schema.
- **Sources.** dp §7; dr2 C1, R23; ks100x §9.
- **Status.** Proposed.

### Brief item 16 · Glyphs, strip and interpretation tap

**In one line.** Stamps are words plus bracketed codes, the strip has three segments, and the interpretation tap is a faded Call It type.

- **Context.** Round 2's stamp design left three questions open (R11, R12, R13).
- **Decision.** (a) Stamps use the codes [P], [M], [T], [E], [C], [A], [?], [N] and [R], not logic glyphs. (b) The strip has three segments: proposition-of-model, correspondence and requirement-fit, which is never [P]. (c) The "so P holds", "so P is violated" or "can't tell" tap fades once the KC's fresh items are solid and returns for each new "sat is good" query (SPINE §8.4, §8.7; M-assurance-strip).
- **Alternatives considered.** (a) Glyph icons (R11): they collide with notation the course teaches. Lean prints ⊢ before open goals, and □, ≜ and ~ are TLA+ notation (dr2 A6). (b) Five segments or a table (R12): a model is not itself proved, so three segments suffice. (c) The tap on every run (R13): friction, so it fades.
- **Lands in.** SPINE §8.4, §8.7, §10.2; W1-T01; GATE-stamps, GATE-codes. Codes share letters with ID prefixes for claims, audit cases and erosions, so codes are always bracketed and IDs never are (dr2 A6).
- **Sources.** dr2 A6, R11 to R13.
- **Status.** Proposed.

## 3. Decisions in the spine's log (SPINE §12)

SPINE §12 records fifty-nine decisions the brief did not make. Each record below gives the context the spine implies, the decision as the spine states it, the alternatives, where it lands and a status. Revision-log rows (M1, P-08 and the like) are those of SPINE §15.

### Log item 1 · Lesson numbering follows the brief

**In one line.** Lessons are `S{n}.L{k}`; the self-explanation unit is S2.L0, only S1.L0 is Boot, and S1.L1 and S1.L2 are swapped against the brief's order.

- **Context.** The brief numbers lessons per stage and uses "2.0" for the self-explanation unit. The landscape digest numbers two Stage 9 lessons "9.9" and "9.10". Round 2 found Boot overloaded and out of KC order (revision log P-11), which forced a swap of the first two S1 lessons.
- **Decision.** S2's self-explanation unit is S2.L0, and only S1.L0 is Boot. The digest's "9.9" and "9.10" map to S9.L8 and S9.L9. S1.L1 and S1.L2 are swapped against the brief's order (Log item 33), so the brief's "Lesson 1.2" (V2-05) is S1.L1 here.
- **Alternatives considered.** (a) Renumber every stage from L1 [D]: it breaks the mapping to the brief's V2 text and to the digests' references. (b) Keep the brief's S1 order: it violates `requires`, since KC-1.three-answers requires KC-1.violation-as-sat, which requires KC-1.quantifier-negation, and that is first taught in S1.L1. (c) Give the zero-index units their own ID kind [D]: unnecessary, because the zero index already marks "before the stage's first lesson".
- **Lands in.** SPINE §3.1, §3.2, §4 (GATE-kc checks the order).
- **Status.** Proposed.

### Log item 2 · Capstone steps are tier `[step]`

**In one line.** Capstone steps S10.L1 to S10.L7 are not lessons, are excluded from every lesson count, and five of them are built inside earlier labs.

- **Context.** BRIEF §7.7 has as-you-go capstone steps 10.1 to 10.5 and a final stage of integration, demonstration and publication. The spine's ID rule gives lessons the tiers core and bridge.
- **Decision.** Capstone steps use lesson-shaped IDs with tier `[step]`, sit outside the 76 lessons, and are excluded from every lesson count, GATE-links included. Steps 1 to 5 are built as tagged stages inside LAB-3, LAB-4, LAB-6 and LAB-8; LAB-10 is the final assembly (the demonstration and publication, S10.L6 and S10.L7).
- **Alternatives considered.** (a) Count the steps as lessons [D]: 83 lessons would no longer match the brief's 26 core plus 50 bridge. (b) A new ID kind for steps [D]: the ID table is fixed and the roadmap presents them as parts of Stage 10. (c) Make Stage 10 ordinary lessons [D]: the capstone is built, not taught, and five of its seven steps grow inside earlier labs (BRIEF §7.7).
- **Lands in.** SPINE §3.10; GATE-links.
- **Status.** Proposed.

### Log item 3 · Core-lesson choice

**In one line.** The 26 core lessons are placed where the roadmap's projects need full authoring, with three swaps against an earlier tiering.

- **Context.** The brief fixes 26 core and 50 bridge lessons. A core lesson is fully authored; a bridge is at most 1,000 words with a pointer into external reading. An earlier tiering put authoring effort on lessons that outside texts already teach (revision log M6, P-09).
- **Decision.** S2.L10 ("Every checker agrees; none read the requirement") is core and S2.L2 a bridge, because the Lean book covers propositions-as-types well and the flagship needs full authoring; its title avoids "four checkers" because `--paranoid` runs six [X RUN-lean-comparator]. Three swaps keep the 26 and 50: S3.L6 core and S3.L5 bridge (progress and preservation moved to stretch under BRIEF §7.2, and fading family F2 retargeted to step-invariant case analysis); S9.L6 core and S9.L2 bridge (translation validation stays the first win); S7.L4 core (V2-23 requires RLS as core) and S7.L2 bridge (the Soufflé tutorial already covers policy as Datalog).
- **Alternatives considered.** (a) Keep the earlier tiering: effort lands on lessons the Lean book and the Soufflé tutorial cover and off the roadmap's projects (LAB-3.4 and LAB-3.5 with CL-3.3; the preservation stages with CL-9.2). (b) More core lessons [D]: it exceeds the brief's word budget of about 100 to 110 thousand words (BRIEF §7.2). (c) Fewer core lessons [D]: loses authored segments where the projects are.
- **Lands in.** SPINE §3.1 to §3.10 (the Tier column); §4 Fading families.
- **Sources.** BRIEF §7.2, V2-23; dr2 B6; revision log M6 and P-09.
- **Status.** Proposed.

### Log item 4 · Lab shape (OD-15)

**In one line.** Ten labs and 91 stages (83 planned, 8 stretch) against the brief's nine labs and about 45 stages; the owner accepted it as OD-15 on 2026-10-25.

- **Context.** The brief plans 9 labs and about 45 stages. Review rounds required stages of at most 25 minutes with a hint ladder and a check on each, and a Lean proof of a whole theorem does not fit in 25 minutes.
- **Decision.** Accepted by the owner as OD-15 on 2026-10-25: 10 labs (LAB-10 is the final assembly) with 91 stages, of which 83 are planned and 8 are `[stretch]`. Stages are pinned per lemma, and whole-theorem Lean stages are 45-minute weekend stages (BRIEF §7.3). LAB-3.6 (`force move`), LAB-4.7 (the miscompiler) and LAB-7.6 (revocation) are new stages for hands-on acts the roadmap asks for that were lesson-only. LAB-8.3 checks liveness. Seven planned stages build capstone steps. GATE-budget confirms the totals fit.
- **Alternatives considered.** (a) The brief's about 45 stages: whole-theorem stages would run past 25 minutes or pin several lemmas in one check, which defeats per-lemma hint ladders and comparator checks [D]. (b) Fewer, longer stages: breaks the 25-minute weekday cap (BRIEF §7.3; V2-14). (c) Leave the roadmap's hands-on acts as lesson-only (revision log M4): the roadmap asks the learner to introduce an unsafe command, to miscompile their own checker and to explore revocation.
- **Consequences.** Every check needs hint rungs R0 to R4 (GATE-labs), so authoring volume grows with the stage count; labs are reviewed at 2 to 3 h each [D].
- **Lands in.** SPINE §3.0, §3.11; revision log M4, M9.
- **Status.** Accepted 2026-10-25 as OD-15 (section 1).

### Log item 5 · Course-supplied harnesses

**In one line.** The course supplies the multi-session driver, the checkers and validators that are not themselves the learning object; learners write the compilers, specs and machines.

- **Context.** Several S6 to S9 labs need tools whose construction would crowd out the lesson: a multi-session PostgreSQL driver, a serializability checker, a TLC trace-validation wrapper, a reference translation validator and, on the builder's path, a reference compiler.
- **Decision.** These are course tools (`statespace isorun`, the abstract-serializability checker, `statespace trace validate`, the reference translation validator of LAB-9.1 and the reference compiler). Learners write compilers, generators, retry policies, R(S, D), machines, specs and validators. The isorun gate on upstream isolationtester outputs therefore applies to the course (W4-T01).
- **Alternatives considered.** (a) The learner builds the harnesses [D]: it pushes stages past 25 minutes and turns a lesson on correspondence into plumbing. (b) Everything supplied and the learner only runs it [D]: contradicts the roadmap's "build" and the learner-owned R(S, D) of LAB-6.7. (c) External history checkers such as Elle: optional only, because such checkers show anomalies present and never absent (dl §2 Stage 6).
- **Lands in.** SPINE §3.6, §3.8, §3.9, §9.6; W4-T01, W5-T01, W5-T04.
- **Status.** Proposed.

### Log item 6 · KC count and ground skills

**In one line.** 105 KCs with 26 threshold KCs, the old Course 00 material taught in S1 by drawers, and one `requires` edge corrected.

- **Context.** The brief targets about 80 to 100 KCs (cap 110) with about 25 threshold KCs that spiral (BRIEF §3.4). v1 had a separate Course 00 with its own KCs.
- **Decision.** 105 KCs, 26 of them threshold (KC-1.claim-anatomy added, Log item 43). The Course 00 KCs live in S1 and are taught just in time by drawers D-01 to D-06. KC-2.induction-principle requires KC-2.proof-reading (taught in S2.L0), not KC-2.goal-state-reading (taught later, in S2.L3).
- **Alternatives considered.** (a) A separate Course 00 KC set, as in v1: rejected by V2-20, which dissolves Course 00 into drawers and placement. (b) Sixty to eighty KCs (dr2 A5 began from about 60 to 100) [D]: fewer items per stage, but the threshold KCs lose coverage. (c) Hold at about 100: 105 is five above the target's upper end and inside the cap of 110 that GATE-kc enforces (80 to 110), and the Keep arithmetic of Log item 25 uses 105.
- **Lands in.** SPINE §4, §4.1; GATE-kc; W1-T04.
- **Status.** Proposed.

### Log item 7 · Seams and erosions

**In one line.** Twelve erosions with both endpoints each, plus three held seams so that erosion is not universal.

- **Context.** The brief ships five erosions. A seam is an assumption planted on purpose that later cracks. Round 1 asked that not every assumption break, and that some seam tests hold (dr1 D3).
- **Decision.** Twelve erosions, each with both endpoints, plus three held seams (SEAM-13, SEAM-14, SEAM-15). SEAM-7 is planted in S1 so that the solver-bug replay is a long-range erosion. SEAM-13 is planted on the course's own assurance claim about INS-interp, not on a learner claim.
- **Alternatives considered.** (a) Five erosions, as in the brief: most stages would carry none. (b) Every seam erodes [D]: erosion becomes the expected outcome and the learner stops predicting. (c) A larger held share: dr1 D3 suggested about a third of seam tests should hold, and 3 of 15 is 20% [D]. Each held seam carries a standing check (GATE-interp and GATE-conformance; nightly GATE-specimens; `--paranoid` at every Lean Defence), so the share is also a maintenance load.
- **Lands in.** SPINE §5.3, §5.4; W3-T12, W4-T12, W5-T10, W5-T13; GATE-erosions.
- **Status.** Proposed.

### Log item 8 · Builder's path

**In one line.** The brief's builder's path is replaced by a repaired topological order with declared substitutes.

- **Context.** See OD-3. The brief's path was not a topological order of the `requires` DAG or of the lab-artifact dependencies.
- **Decision.** The published builder's path is S1 → S5.L1–S5.L8 → S6.L1, S6.L2, S6.L6, S6.L7 → S8.L1–S8.L4 → S2 → S3 → S4 → S5.L9 → S7 → S6.L3–S6.L5, S6.L8, S6.L9 → S8.L5–S8.L7 → S9 → S10, with one soft edge (covered by D-23), two reference-compiler substitutes, D-14 read before LAB-8.4, and S5.L9 after S4. An erosion fires when both endpoints exist in the learner's record; if the specimen came first, the claim mints already cracked.
- **Alternatives considered.** (a) The brief's order: it breaks hard edges. (b) Roadmap order only [D]: loses the early concurrency work a learner building their own system may want. (c) A generated path computed per learner from the KC graph [D]: GATE-kc checks a fixed published list, and a per-learner path has nothing to check against.
- **Lands in.** SPINE §3.0, §5.4; GATE-kc; W3-T12.
- **Sources.** dp §4.5; revision log M1, P-08. A re-check of the KC table against the lesson rows, run for this file, found one `requires` edge taught after its dependent on the default path (the Boot first-contact call, exempt under Log item 33) and, on the builder's path, that edge plus the declared soft edge into S6.L2.
- **Status.** Proposed.

### Log item 9 · Audit anchors

**In one line.** Twenty-five anchors, at least two per stage, covering all thirteen classes, with five W1 anchors keyed only by executed runs.

- **Context.** The brief plans about 24 anchors with at least six exemplars per class from variants. The Lean and TLC lanes arrive in W2 and W3, but the Audit Desk ships in W1.
- **Decision.** 25 anchors, at least two per stage and covering G1 to G13. AUD-5.3 is based on this course's own corrected mock-ups. Subclass IDs follow the brief's lists. The five W1 anchors from later stages (AUD-2.1 to AUD-2.4 and AUD-5.3) ship keyed only by executed runs, without generated variants, and are scheduled after LAB-2 and LAB-5, because erroneous examples need prior knowledge [alemdag25]; their variants follow in W2-T13 and W3-T13.
- **Alternatives considered.** (a) 24 anchors: the brief's figure is "about 24"; 25 follows from at least two per stage and all thirteen classes [D]. (b) Anchors only for S1, the one stage whose tool exists in W1 [D]: three anchors cannot cover thirteen classes. (c) Variants in W1 without the Lean and TLC lanes: keys would not come from real tool runs, against I3. (d) External incidents only [D]: AUD-5.3 shows the course auditing its own earlier mistake, and every case still carries a dated "based on" card.
- **Lands in.** SPINE §6; GATE-audit; W1-T17, W2-T13, W3-T13, W4-T13, W5-T11.
- **Status.** Proposed.

### Log item 10 · Provenance weights

**In one line.** Weights of 1.0 and 0.3 follow kernelspace; an automated close in manual mode is a flag on receipts and claims, not an event provenance.

- **Context.** Evidence events carry provenance and exposure, and kernelspace's ledger weights its provenance classes: 1.0 for proved and unseen work, at most 0.3 for lab-green, practice and assisted work, and 0 for legacy work (ks100x V6).
- **Decision.** Own · unseen counts 1.0 toward sign-off, settled, VRK₃₀ and audit accuracy. Own · seen and assisted work count 0.3 for scheduling only, until an unseen variant passes unassisted. Agent work counts 0. A tactic that closes a step taught in manual mode is an automated close. Since spine revision 3, `automated` is a flag on receipts and claims and never an event provenance, so it never weighs an evidence event, and receipts and claims never count as evidence (SPINE §8.2).
- **Alternatives considered.** (a) Binary credit [D]: simpler, but it discards the scheduling signal from practice. (b) A graded scale with other values [D]: no evidence favors any particular value, and the 0.3 is a design number. (c) Credit agent work: contradicts I1 and I8.
- **Consequences.** Because credit toward sign-off is binary by the own · unseen rule, the 0.3 weights affect only scheduling.
- **Lands in.** SPINE §8.2; W1-T03; ledger property tests.
- **Status.** Proposed.

### Log item 11 · Budget method

**In one line.** Stage budgets use a 3× multiplier for Lean proof stages, 2× elsewhere, 45-minute weekend stages, and a Keep block taken off the top.

- **Context.** GATE-budget needs a method that compares each stage's plan with the roadmap's range, and the first plan was implausibly low (revision log M9, P-15).
- **Decision.** Planned hours are reading, lessons, build, write and the Defence, with the Keep block taken off the top. Lean proof stages are planned at up to 3× their nominal minutes (the stuck protocol parks a goal at 90 minutes) and other stages at 2×. Weekend stages are 45 nominal minutes. S1's "session" is read as at most 2.5 h (SPINE §3.0).
- **Alternatives considered.** (a) One flat multiplier of 1.6 [buehler94] for everything: it ignores the heavy tail of Lean proof stages. (b) No multiplier: the planning fallacy. (c) Per-stage empirical figures: there is no data before learner-zero, so logged item times replace the estimates after each wave.
- **Consequences.** The arc projection is a separate layer: the pessimistic factor of 1.6 and two reserve weeks in every twelve (SPINE §3.11).
- **Lands in.** SPINE §3.0, §3.11; GATE-budget; W0-T06.
- **Status.** Proposed.

### Log item 12 · Six fading families

**In one line.** Six procedure families get backward fading; the rest get worked examples without fading.

- **Context.** Review round 1 proposed rungs L0 to L4 for ten procedure families (A3-M4). The evidence favors correct worked examples first [barbieri23] (A) and backward fading with principle prompts on revealed steps [renkl02] (B), and expertise reversal says to fade fast for experts (dp rows 9 to 12).
- **Decision.** Fading for six families: F1 Lean list induction with a generalized hypothesis; F2 step-invariant case analysis; F3 weakest-precondition derivation; F4 invariant strengthening after a CTI; F5 a TLA+ action with its invariant and fairness; F6 a forward-simulation step. Each runs rungs L0 to L4 on a 3-up, 1-down staircase per KC. The other families get worked examples without fading.
- **Alternatives considered.** (a) All ten families: authoring cost, and dr1 D17 limited fading to the five or six hardest. (b) None: v1 had nothing between read-only replay and full independent proofs (A3-M4). (c) Prompts on completion blanks: rejected, since blanks combined with prompts impaired proof learning [hilbert08] (B, dp row 12).
- **Wording note.** F4 stands in for the review's VC construction; the other five of the ten get worked examples without fading (SPINE §12 item 12).
- **Lands in.** SPINE §4 Fading families; M-goal-replay-fading; W2-T03.
- **Status.** Proposed.

### Log item 13 · Generator families

**In one line.** Fourteen families and 47 templates; GEN-which-stamp and GEN-spot-the-gap are added to the brief's list.

- **Context.** BRIEF §4.4 lists twelve families. Confusable set A (which stamp) and the audit variants need graders the list lacks, and S1 already uses stamp items.
- **Decision.** Fourteen families with 47 templates. GEN-which-stamp and GEN-spot-the-gap are added to the brief's family list because confusable set A and audit variants need them. GEN-which-stamp ships in W1 because S1 uses it. GATE-generators enforces purity and template variety; GATE-items and GATE-audit-blind enforce validity.
- **Alternatives considered.** (a) Fold which-stamp into GEN-call-it's three-way template [D]: the verdict-to-stamp table of SPINE §8.8 is a distinct grader. (b) No spot-the-gap family [D]: audit variants would come from a static pool with no seeded variation, so keys could not be recomputed by the checker at grade time (I3).
- **Lands in.** SPINE §8.3; W1-T05, W2-T11, W3-T02, W3-T10, W4-T05, W4-T08.
- **Status.** Proposed.

### Log item 14 · Instrument names

**In one line.** Bench engines are named `INS-bench-*`; the CTI workbench and the minimap are mechanics over existing instruments.

- **Context.** Lesson tables cite instruments by ID and GATE-links checks the "Used in" column, but the Bench engines had no IDs.
- **Decision.** Bench engines are named `INS-bench-*` so lesson tables can cite them. The CTI workbench and the minimap (internally, the telescope) are mechanics over existing instruments, not new engines.
- **Alternatives considered.** (a) Leave Bench engines out of the catalog [D]: lessons could not cite them and GATE-links could not check them. (b) Make the workbench and the minimap instruments [D]: it would inflate the catalog by two and each would need an owning task, when each is a view over INS-z3 or INS-spectacle.
- **Lands in.** SPINE §9.1, §9.2; M-cti-workbench, M-telescope.
- **Status.** Proposed.

### Log item 15 · The CLI is `statespace`

**In one line.** The Bench CLI is `statespace`; the brief's `bench <command>` is shorthand for it.

- **Context.** The brief calls the CLI `bench`, and BRIEF §7.5 says it keeps the course's name rather than "plinth".
- **Decision.** The CLI is `statespace`, written in Python and managed by `uv`, and shipped in `statespace-lab`.
- **Alternatives considered.** (a) `bench` [D]: generic, and it collides with other tools by name. (b) A name from outside the course: ruled out by BRIEF §7.5. (c) `miniplinth`: that is the learner's own checker, and sharing the name would confuse `miniplinth check` with `statespace check`.
- **Lands in.** SPINE §9.6; OD-1, OD-2.
- **Status.** Proposed.

### Log item 16 · Hall of Records items are specimens

**In one line.** Dated incidents are specimens inside stages, shown through a "dated incidents" filter; the Lean kernel-bug story is a story card with no exploit code.

- **Context.** V2-27 adds dated toy models of real incidents, re-run in CI. A separate screen would add a noun (Log item 32).
- **Decision.** The six incident specimens (SP-1.9, SP-1.10, SP-4.5, SP-5.7, SP-6.11, SP-8.5) live inside their stages and surface through a "dated incidents" filter in SCR-specimens, not a screen of their own. The Lean kernel-bug story stays a story card in S2.L9 with no exploit code.
- **Alternatives considered.** (a) A Hall of Records screen [D]: a new noun, against OD-14. (b) A pool outside the stages [D]: the incidents would be detached from the lessons that teach their principle. (c) A toy model of the kernel bug: the advisory says exploitation needs a metaprogram executed inside the Lean process, so the story is told without code (dl §2).
- **Lands in.** SPINE §5.1, M-hall-of-records, SCR-specimens; W4-T11.
- **Status.** Proposed.

### Log item 17 · The capstone artifact is "the Core"

**In one line.** The capstone artifact is called "the Core"; "plinth" survives only in the roadmap's toy-language names.

- **Context.** The roadmap calls the capstone "Plinth Core"; the course keeps "plinth" only in the roadmap's toy-language names (OD-1, OD-2).
- **Decision.** The artifact is "the Core". The roadmap's names stay only for the toy language and its checker (OD-2).
- **Alternatives considered.** (a) "Plinth Core" as the roadmap writes it: it reuses the roadmap's working title, which collides with other uses of the word (OD-1). (b) "The Capstone" [D]: generic, but it names a stage, not an artifact. (c) "statespace Core" [D]: it puts the course's name on the learner's own artifact.
- **Lands in.** SPINE §0, §3.10.
- **Status.** Proposed.

### Log item 18 · Production-twin pins

**In one line.** Every production-twin SHA is recorded in RUN-twin-pins with a 60-day TTL, and none is written into copy by hand.

- **Context.** kernelspace pins each twin at a SHA as a 60-day version claim (ks100x §5.8). Tool claims carry a 60 to 90 day TTL (BRIEF §2.3).
- **Decision.** Every production-twin SHA lives in RUN-twin-pins with a 60-day TTL, refreshed by the wave that authors each stage. None is typed into copy.
- **Alternatives considered.** (a) SHAs written into lesson copy [D]: each would need its own tag under GATE-numbers and would drift. (b) Pin by tag or branch [D]: both move. (c) A 90-day TTL: allowed for tool claims, but upstream repositories change weekly, so 60 days is the stricter end.
- **Lands in.** SPINE §9.5 ("Every wave"), the "Production twins" line of each stage in §3; GATE-runs.
- **Status.** Proposed.

### Log item 19 · Unexecuted facts are placeholders

**In one line.** A fact that a review reported but no committed run shows is written as `{{run:RUN-id}}` until it is recorded.

- **Context.** The Rust `i64` overflow behavior, the PGlite 0.5.11 behavior, the WebAssembly Lean size and the Pyodide payload were each reported by a review, but no output was committed.
- **Decision.** The Rust `i64` behavior is {{run:RUN-rust-i64}}. PGlite 0.5.11 was written the same way until W0-S08 recorded its pin and its first load [X RUN-pglite-0511]. RUN-lean-wasm and RUN-lean-plaingoal moved from executed to to-record in revision 2, because only scripts and report prose were on disk; W0-S11 re-ran both with their outputs committed, so they are executed runs again. The Pyodide payload figure moved to RUN-phone-pyodide for the same reason, and W0-S02 recorded it [X RUN-phone-pyodide]. A run counts as executed only when its output log is on disk (SPINE §9.5).
- **Alternatives considered.** (a) Keep the figures with a [V] or [U] tag: I4 and GATE-numbers require a run reference, and a [U] tag would let unverified numbers into copy. (b) Delete the claims [D]: it would remove the Rust row of the six-row table that V2-08 asks for. (c) Re-run before writing: right in the end, but placeholders let authors write the sentence only after the run resolves (GATE-runs).
- **Lands in.** SPINE §9.5; GATE-runs; W0-S11.
- **Note.** RUN-lean-bv-decide and RUN-lean-vcgen: both moved to To record in spine revision 2 (m11) and were recorded by W0-S11 [X RUN-lean-bv-decide, RUN-lean-vcgen]; spine revision 3 lists them as executed.
- **Status.** Proposed.

### Log item 20 · VRK₃₀ is the north star's name

**In one line.** The north star is called VRK₃₀, the brief's name, not the pedagogy digest's VRC₃₀.

- **Context.** The brief names the north star VRK₃₀, kernelspace's measure carried over: knowledge components answered correctly, unassisted, on unseen seeds, at least 30 days after first learning (BRIEF §1.3 item 6). The pedagogy digest calls the same measure VRC₃₀ and applies it to reasoning moves.
- **Decision.** VRK₃₀. The Mirror shows the count, its rate per active study-month and intervals. There is no population target and no comparison across learners (SPINE §2.3).
- **Alternatives considered.** (a) VRC₃₀ [dp header]: the same measure under a second name would split the documents, and kernelspace and the brief already use VRK₃₀ [D]. (b) A composite score [D]: SPINE §2.4 promises no effect multiples, since the median education effect is about 0.10 SD [kraft20]. (c) Per-stage mastery percentages [D]: they behave like gates, against I5. The number exists to answer roadmap rule 6, "track what you can independently reason about".
- **Lands in.** SPINE §2.3; M-mirror; SCR-mirror; W1-T07.
- **Status.** Proposed.

### Log item 21 · "The Defence" keeps its spelling

**In one line.** "The Defence" keeps the brief's spelling as a proper noun; all other copy is US English.

- **Context.** The course writes US English, but the brief and the task IDs spell the assessment "Defence" (M-defence, SCR-defence, W2-T12).
- **Decision.** "The Defence" keeps its brief and task spelling as a proper noun, so the learner-facing name matches the IDs derived from it.
- **Alternatives considered.** (a) "Defense" in copy while IDs keep "defence" [D]: copy and IDs would disagree on one word. (b) Rename the IDs [D]: the ID table is fixed by the conventions, and a rename ripples through the registry. (c) Rename the concept [D]: v1 called it a viva and V2-02 replaced it with the Defence, so another rename costs churn with no learning gain.
- **Lands in.** SPINE §0 glossary (term 14); SCR-defence.
- **Status.** Proposed.

### Log item 22 · Deferred topics are one drawer each

**In one line.** Each deferred topic is one always-open drawer tagged "deferred", with a neutral trigger that surfaces it in Today and unlocks nothing.

- **Context.** The roadmap defers ten topics until a concrete obligation demands them. The brief makes them "closed" drawers with named triggers (BRIEF §1.1), and round 2 found that the copy read as locks (revision log P-20), against "nothing locks".
- **Decision.** One drawer per topic, D-30 to D-40: eleven drawers, because the roadmap's "Kani/Verus" splits into two with different triggers (D-30 at ER-1; D-31 when a correspondence field names Rust code). Learner copy shows them tagged "deferred"; each is always openable, with a short card saying what the topic is, why the roadmap defers it and what surfaces it. "Shelf" is the internal name.
- **Alternatives considered.** (a) A locked Shelf, as in v1: locks cut completion [kulik90] (A) and break I5. (b) Omit the topics [D]: the roadmap defers them and does not delete them, and a learner with a concrete obligation needs a pointer. (c) One combined drawer [D]: the triggers differ, for example D-32 surfaces at ER-7 and the others when a claim names the topic.
- **Lands in.** SPINE §3.12, I5, V2-30; GATE-lessons (no lock copy).
- **Status.** Proposed.

### Log item 23 · W6 is launch hardening

**In one line.** W6 is a wave for accessibility, performance, docs, hygiene, a final adversarial review and the release gate, and the keep/kill rules move to W0.

- **Context.** The brief's waves end at W5. An earlier draft scheduled the keep/kill rules late, after data existed (revision log P-05).
- **Decision.** W6 is launch hardening: an accessibility pass, performance budgets, glyphs and fonts, a publication hygiene audit, docs and edition notes, a cue-ablation and blind-strategy sweep, the runs re-record with the PostgreSQL 19 check, and a final adversarial review against I1 to I10. The keep/kill rules move to W0-T07, because rules fixed after five waves of data are not fixed in advance.
- **Alternatives considered.** (a) Five waves with hardening folded into W5 [D]: W5 is already the heaviest wave, with 13 tasks and about 33.5 h of review (SPINE §13 calendar). (b) Fix the keep/kill rules at the end (the earlier draft): they would be fitted to the data they judge (P-05).
- **Lands in.** SPINE §13 (W6, W0-T07); GATE-release.
- **Status.** Proposed.

### Log item 24 · Model assignment

**In one line.** The strongest model writes anything whose silent error would corrupt credit; the lighter model scaffolds.

- **Context.** The brief shapes the waves "for planning and Sonnet 5.5 agents" (BRIEF §7.10). Round 2 found sonnet assigned to correctness-critical checkers (revision log P-21).
- **Decision.** Opus for architecture, hard content, proofs, correctness-critical checkers and adversarial review; sonnet for scaffolding, well-specified UI, transforms and tests from specs. Every grader, untrusted-input parser, stamp deriver, verdict parser, reference checker and release gate is opus (W1-T01, W1-T13, W1-T14, W2-T08, W3-T04, W3-T05, W4-T06, W5-T09).
- **Alternatives considered.** (a) Sonnet everywhere [D]: cheapest, and it matches the brief's framing, but a silent error in a grader or a stamp deriver corrupts credit, and review hours are what bind (OD-7), so a stronger model where a mistake is hardest to see saves owner hours. (b) Opus everywhere [D]: agent cost is secondary to review hours, but scaffolding that tests can check gains little from it.
- **Lands in.** SPINE §13 (the Model column).
- **Note.** W2-T08 is opus since spine revision 3.
- **Status.** Proposed.

### Log item 25 · The Keep block is computed

**In one line.** The Keep block is computed from the dose and logged item times, and is larger than the brief's 30 to 40 minutes a week.

- **Context.** The brief plans a Keep block of 30 to 40 minutes a week. Its own basis (KCs × about 10 reviews × about 2 minutes) gives about 35 h over the arc for 105 KCs [D], before audit cases, Clearinghouse incidents, reviews and the keep-alive.
- **Decision.** The Keep block is computed, planned at 45 to 75 min/week at 6 h/week and 60 to 105 min/week at 10 h/week, taken off the top of the week and recomputed from logged item times after each wave. Today runs three to five times a week inside it (SPINE §3.0).
- **Alternatives considered.** (a) Keep 30 to 40 minutes: too small by the brief's own arithmetic, since 35 h over 42 to 78 weeks is about 27 to 50 minutes a week for reviews alone [D]. (b) Cut reviews below 8 graded opportunities in 60 days: the dose is an analogy to [koedinger23] (B/D) and rests on spacing evidence [latimier21] (A), so cutting it weakens the course's core mechanism. (c) A fixed block of 90 minutes [D]: a constant instead of a computed figure, so it would over-plan early and under-plan late.
- **Lands in.** SPINE §3.0, §4.1, §12 item 25; GATE-budget (each stage's implied Keep load); SCR-week; W1-T08.
- **Status.** Proposed.

### Log item 26 · Today excludes the Lean keep-alive

**In one line.** The Lean keep-alive is its own Keep session; Today shows a card when one is due.

- **Context.** BRIEF §7.6 lists the Lean keep-alive inside Today, every two to three weeks during S5 to S8. A session of 20 to 30 minutes cannot fit a Today of 10 to 12.
- **Decision.** The keep-alive is a separate Keep session on the learner's own definitions. It starts only once S2 is signed off, and Today only shows a card when one is due (M-lean-keep-alive).
- **Alternatives considered.** (a) A shorter Lean item inside Today [D]: the dose is 20 to 30 minutes every 2 to 3 weeks [tatel25] (A for the decay; the dose is D), and a 10-minute item changes it. (b) A longer Today on those days [D]: it breaks the 10-to-12-minute target and one tool per session (BRIEF §3.4). (c) No keep-alive: it ignores the decay in which half of the accuracy gains in procedural skills are gone after about 6.5 months unused [tatel25] (A; the decay of proof skill itself is unmeasured).
- **Lands in.** SPINE M-today, M-lean-keep-alive; W3-T13.
- **Status.** Proposed.

### Log item 27 · Defence Part C, small parts and retakes

**In one line.** Part C has four cases, every credited part has at least four items, and a failed part is retaken on fresh seeds after at least three days.

- **Context.** BRIEF §4.7 allows two to four audit cases and requires each part at 60% or more. A 60% floor on two cases makes one miss fatal, and the Wilson interval for 2 of 2 is about 0.34 to 1.0 [D] (revision log P-18).
- **Decision.** Part C has four cases, at least one sound, in S1 as in every stage. Every credited part has at least four items, so a single miss never fails a part. A failed part is retaken on fresh seeds at least 3 days later, only the failed parts are re-sampled, nothing locks in the meantime, and every attempt stays in the event log (SPINE §8.6).
- **Alternatives considered.** (a) Two cases with a 60% floor: one miss is fatal. (b) A pooled threshold with no per-part floor [D]: strength in one family could hide a hole in another. (c) More items per part [D]: the Defence is untimed but already runs about 85 minutes over two or more sessions. (d) An immediate retake [D]: it measures short-term memory, so the gap borrows the spacing idea of successive relearning [higham22] (B).
- **Consequences.** The three-day minimum is a scheduling rule and blocks no content, so it does not breach I5; if the owner prefers, it can be a recommendation.
- **Revision 3.** The record first said that a part with five or fewer items passes with at most one miss. Spine revision 3 dropped that small-part clause: every credited part has at least four items, so the clause changed no result (SPINE §8.6, §12 item 27).
- **Lands in.** SPINE §3.0, §8.6; W2-T12.
- **Status.** Proposed.

### Log item 28 · "Prove safety" in S8 is met as [M]

**In one line.** The roadmap's "prove safety properties over the model" is met as [M] · constants · complete, with an optional lift to [P].

- **Context.** Roadmap Stage 8 says to "prove safety properties over the model". A complete TLC run is exhaustive only for its fixed constants, and "bounded exploration is not an unqualified proof" is a Stage 5 completion test.
- **Decision.** The roadmap line is met as [M] · constants · complete, the stamp the course's own rules give a complete TLC run. An optional inductive-invariant step, as in S5.L9 with a parametric Z3 or Lean proof, can lift one safety claim to [P] (SPINE §12 item 28).
- **Alternatives considered.** (a) Require a parametric proof for every S8 safety claim [D]: far beyond the stage's planned 7.4 to 13.2 h. (b) Stamp the complete run [P]: contradicts §8.8, I10 and V2-10. (c) Leave the line unaddressed [D]: a scope loss against the roadmap.
- **Lands in.** SPINE §3.8 (Budget), §8.8; CL-8.1; S5.L9.
- **Status.** Proposed.

### Log item 29 · Inductive invariants

**In one line.** TLC's or Apalache's inductive check earns [M] · constants; [P] for every N needs a parametric proof of the inductive step.

- **Context.** The spine's first critic pass filed C1, its only critical finding: an earlier draft stamped TLC's inductive-invariant check [P] (SPINE §15).
- **Decision.** The technique checks `Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` only over states enumerated for fixed, finite constants, so it earns [M] · constants. [P] for every N needs a parametric proof of the step, with Z3 using the parameter as an uninterpreted sort, or Lean. CL-5.4, S5.L9, KC-5.inductive-invariant-tla, §8.8 and AUD-5.3's G5 variant follow this.
- **Alternatives considered.** (a) Stamp TLC's inductive check [P], as the earlier draft did: it covers the enumerated states for one N and no more. (b) Apalache as the [P] route: its check is treated as bounded by the constants and types it instantiates until a run shows otherwise [D], so it earns [M] alone (D-18). (c) Drop inductive invariants from S5 [D]: it loses the bridge from model checking to proof that outcome (c) asks for.
- **Lands in.** SPINE §3.5 (S5.L9), §8.8, CL-5.4, D-18, AUD-5.3.
- **Status.** Proposed.

### Log item 30 · Safety and liveness are separate claims in S8

**In one line.** CL-8.1 is safety and CL-8.5 is liveness; they are minted as separate claims beside CL-8.4.

- **Context.** Revision log M3: CL-8.1 was a liveness claim in a safety stage.
- **Decision.** CL-8.1, "no committed command's outbox intent is lost before acknowledgement", is safety. CL-8.5, "every committed command's effect is eventually dispatched", is liveness, minted beside CL-8.4 under weak fairness on Worker and eventual recovery as [A]. SEAM-12 rides on CL-8.2.
- **Alternatives considered.** (a) One combined claim [D]: it files two property kinds under one stamp, the confusion G3 names. (b) Liveness only in S5 [D]: the roadmap's Stage 8 asks which progress guarantees need eventual recovery, so S8 needs an artifact for it (LAB-8.3). (c) Leave CL-8.1 as the earlier draft had it: wrong stage and wrong property kind.
- **Lands in.** SPINE §5.2; LAB-8.2, LAB-8.3.
- **Status.** Proposed.

### Log item 31 · Cut eligibility

**In one line.** A bridge can be cut only if it carries no threshold KC, no seam or erosion endpoint, no outcome-core KC and no sole completion-test coverage, and its KCs move to a lesson that stays.

- **Context.** The brief's cut order includes "bridge lessons beyond 30". Without a rule the cut could remove load-bearing bridges (revision log P-07).
- **Decision.** A bridge is eligible only if it carries no threshold KC; is not a seam's planting lesson or an erosion's cashing lesson; carries no outcome-core KC (SPINE §2.2); and is not the only lesson of a roadmap completion test or of a mechanic. Every KC and claim of a cut bridge moves, with one added graded item, to a named receiving lesson that is not cut. Twenty-one bridges qualify and twenty are listed in cut order.
- **Alternatives considered.** (a) The literal criterion "no KC taught nowhere else": it would leave only two eligible bridges, because nearly every bridge introduces its own KC (P-07, adapted). (b) No rule [D]: the cut could take the only lesson for a completion test. (c) A list with no receiving lessons [D]: KCs would lose their in-lesson items.
- **Lands in.** SPINE §14; GATE-budget.
- **Status.** Proposed.

### Log item 32 · Fewer nouns

**In one line.** Learner copy uses at most 25 coined terms, internal names are linted out, and two screens became a filter and a plainly named screen.

- **Context.** OD-14. The design review counted about thirty proprietary nouns across five metaphors in v1 (A7-12).
- **Decision.** A capped glossary of 25 learner-facing terms (SPINE §0), with at most five introduced in Boot; internal names are linted out of learner copy; the Hall of Records screen became the "dated incidents" filter in SCR-specimens; the docket screen became SCR-clearinghouse.
- **Alternatives considered.** (a) No cap, with an index [D]: nothing stops the nouns growing. (b) A cap below 25 [D]: no evidence favors any number, so the cap is a design budget. (c) A flavored name for each mechanic [D]: more voice, at the price of the collisions A7-12 lists (Ledger, course, Plinth, set).
- **Lands in.** SPINE §0 glossary; GATE-lessons; SCR-specimens, SCR-clearinghouse.
- **Status.** Proposed.

### Log item 33 · Boot and the first hour

**In one line.** Boot's call is a pre-instruction call on `Int` that counts toward no KC, the BitVec 64 wrap is an uncredited reveal, and S1.L1 and S1.L2 follow the `requires` order.

- **Context.** Revision log P-11: Boot was overloaded and out of KC order. The roadmap's starter prints its own answer, so a first scored call must be a fresh variant (V2-05).
- **Decision.** Boot's call is on `Int`, is a pre-instruction call (first contact, counted toward no KC state), and the BitVec 64 wrap is an uncredited reveal, so Boot requires no untaught KC. S1.L1 is the hands-on core lesson "Negate, then search" and S1.L2 the bridge "Three answers", which follows the `requires` DAG.
- **Alternatives considered.** (a) Credit Boot's call to KC-1.violation-as-sat: that breaks the `requires` order, because the KC requires KC-1.quantifier-negation, taught in S1.L1 (P-11, adapted). (b) No call at Boot [D]: it loses first contact with Call It. (c) Open Boot on BitVec 64 [D]: it needs the threshold KC KC-1.encoding-is-the-claim first.
- **Lands in.** SPINE §3.1 (Boot notes); S1.L0; W1-T09.
- **Status.** Proposed.

### Log item 34 · LAB-1 runs without the devcontainer

**In one line.** LAB-1 runs with `uv run --with z3-solver==5.3.1` or in the tab; the devcontainer arrives at S2.

- **Context.** A first install was kernelspace's top drop-off risk (dp §6), and Project 00 needs only Z3Py. The roadmap's first weekend is the Z3Py introduction and the counterexample lab.
- **Decision.** LAB-1 runs with `uv run --with z3-solver==5.3.1`, as the executed spikes did [X RUN-z3-starter], or entirely in the tab on INS-z3. The devcontainer and `statespace doctor` arrive at S2 (D-15). Witnesses are re-checked in the tab.
- **Alternatives considered.** (a) The devcontainer from day one (V2-22 makes it the default): it puts the largest drop-off risk on the first weekend (revision log P-10). (b) The tab only [D]: the roadmap asks for one evolving lab repository from the first weekend, and the `uv` route gives one without a container. (c) Per-OS native install instructions [D]: more variance than `uv run`.
- **Lands in.** SPINE §3.1 (LAB-1), D-15; W1-T13.
- **Status.** Proposed.

### Log item 35 · Learner-zero numbers are descriptive

**In one line.** A learner-zero median measures no first-time learner, so those numbers are labeled descriptive and a separate tester run gates the external-learners label.

- **Context.** Learner-zero is the author. A median over the author's own sessions says nothing about a first-time learner.
- **Decision.** Boot's 4-minute target (ks100x) is checked mechanically by a Playwright timing gate and by at least five naive testers (RUN-boot-firstsuccess) before the "external learners" label. Today's 12 minutes stays a learner-zero event-log metric, labeled descriptive (SPINE §12 item 35).
- **Alternatives considered.** (a) Gate W1's exit on external testers (P-04 as filed): a third-party dependency would stall a wave (P-28). (b) Treat learner-zero numbers as validation: invalid, since the author knows the content. (c) Drop the Boot target [D]: the 4-minute first success is the number kernelspace's drop-off history points to (ks100x K4).
- **Lands in.** SPINE §13 (W1 exit), W1-T08, W1-T09; OD-9.
- **Status.** Proposed.

### Log item 36 · Owner time is planned

**In one line.** Every task carries an estimate of owner review hours, every wave a total and a duration at 2.5 h/week, and learner-zero's study sits on the critical path.

- **Context.** Revision log P-19: review load was unplanned, though the owner's attention is the binding constraint (OD-7).
- **Decision.** "Review h" on every task, a total and an implied duration at 2.5 h/week for every wave, and the learner-zero study commitment on the critical path (SPINE §13).
- **Alternatives considered.** (a) Plan by agent-days only (sizes S, M and L): it hides the binding constraint. (b) Plan by calendar dates: kernelspace dated its waves, but the roadmap imposes no deadline. (c) Log review hours only after the fact [D]: the queue gate needs forward estimates.
- **Lands in.** SPINE §13 (the Review h column and the Calendar).
- **Status.** Proposed.

### Log item 37 · S9's halves

**In one line.** S9 has two halves that follow the lessons, each closed by a mini-Defence that samples only its own half.

- **Context.** Revision log m12: the S9 halves disagreed with the labs. The roadmap gives S9 six to ten weeks, and v1's Stage 9 went 3.3 to 5.6 weeks without a claim (dp §6).
- **Decision.** Half A is S9.L1 to S9.L4 with LAB-9.1 to LAB-9.3. Half B is S9.L5 to S9.L9 with LAB-9.4 to LAB-9.12, and the SQL validator (LAB-9.11) runs in half B after the preservation stages, so no mini-Defence tests work whose lesson comes later. LAB-9.1's 2-minute win is the reference translation validator (V2-29).
- **Alternatives considered.** (a) One Defence at the end [D]: six to ten weeks with no sign-off checkpoint. (b) Halves by lab only (the earlier draft): they disagreed with the lessons (m12). (c) Three parts [D]: smaller checkpoints, more Defence overhead.
- **Lands in.** SPINE §3.9; W5-T05.
- **Status.** Proposed.

### Log item 38 · Rust and cvc5 are not new tools

**In one line.** Rust counts as the learner's existing language and cvc5 as a second engine on the SMT-LIB the learner already writes, so neither is a new tool.

- **Context.** GATE-budget allows at most one new tool per stage (SPINE §4.1). The roadmap pairs Rust with PostgreSQL at Stage 6, and the S3 and S4 stage specs use Rust and cvc5 without naming a new tool.
- **Decision.** The learner is Rust-fluent (SPINE §2.1), so Rust counts as the learner's existing language and appears from S3 (LAB-3.8 to LAB-3.11, Lane A) and S4 (`miniplinth check`). cvc5 in S4 is a second engine on the SMT-LIB the learner already writes, reported through the same receipt. Neither counts against GATE-budget's one new tool per stage.
- **Alternatives considered.** (a) Count Rust as a new tool where the roadmap pairs it with PostgreSQL: S6 would carry two new tools against the limit [D]. (b) Count cvc5 as S4's new tool: it adds no notation and no instrument, only a second engine behind the same receipt [D].
- **Lands in.** SPINE §3.3, §3.4, §4.1; GATE-budget.
- **Status.** Proposed.

### Log item 39 · OD-4's link-outs

**In one line.** The brief's "CheerpJ TLC" option is the link-out to TLA+ By Example, the Natural Number Game joins the list, and GATE-bundle's route tests enforce it.

- **Context.** OD-4 allows disclosed, uncredited link-outs only and no embedded CheerpJ. SPINE §1.2 listed four link-outs and §9.1 five, and the brief's "CheerpJ TLC" item had been replaced by TLA+ By Example without a log entry (section 6, item 7).
- **Decision.** The brief's option is offered as the link-out to TLA+ By Example, which runs TLC through CheerpJ from the vendor's CDN, so nothing CheerpJ-based is embedded. The Natural Number Game joins the list for S2.L1. GATE-bundle's route tests enforce the rule.
- **Alternatives considered.** (a) An opt-in embedded CheerpJ lane: a runtime request to a vendor CDN against "zero servers, no telemetry", under terms that depend on who runs and forks the repository (Brief item 7). (b) Two lists, one in §1.2 and one in §9.1 [D]: a link-out could ship that one list does not allow, and no gate would notice.
- **Lands in.** SPINE §1.2, §9.1, §11.2 (GATE-bundle); OD-4.
- **Status.** Proposed.

### Log item 40 · Misconception IDs use the `dp:` prefix

**In one line.** Misconception IDs are `dp:` plus the pedagogy digest's catalog key, with EVIDENCE.md §6 as the catalog.

- **Context.** GATE-items requires a misconception ID on every option (SPINE §8.4, §11.2), but the spine had no namespace for them, and the digest's keys collide with gap classes (G1 to G9 against G1 to G13), stages (S1 to S4 against S1 to S10) and the solver's name (Z3). Every curriculum spec and EVIDENCE.md §6 already wrote `dp:`.
- **Decision.** The ID is `dp:` plus the catalog key, for example `dp:G4`, registered from EVIDENCE.md §6, whose §6.11 governs proposed entries. The prefix keeps the digest's own keys.
- **Alternatives considered.** (a) `MC-` (the S01 spec's example) or `MIS-{n}.{kebab}`, the forms proposed before the spine chose `dp:`: each would rename every misconception ID the specs already write and drop the digest's own keys. (b) No namespace [D]: GATE-items could not resolve an option's misconception ID, and the digest's keys would collide with gap classes and stages.
- **Lands in.** SPINE ID conventions, §8.3; EVIDENCE.md §6.
- **Status.** Proposed.

### Log item 41 · Manual-mode variants

**In one line.** S3's step-invariant labs turn off `grind` and keep `omega`, because case analysis is the taught step; further per-lab variants are logged here.

- **Context.** M-manual-mode keeps automation off the taught step, and S2's manual mode turns off both `grind` and `omega`. LAB-3.4 and LAB-3.5 teach case analysis over the semantics, and the S3 spec asked for the variant to be logged (`curriculum/S03-semantics.md`, §14 issue 10).
- **Decision.** LAB-3.4–LAB-3.5 turn off `grind` but keep `omega`, because case analysis is the taught step and `omega` adds no `Classical.choice` [X RUN-lean-axioms]. A `grind` close is an automated close, flagged on the receipt. Further per-lab variants are logged here.
- **Alternatives considered.** (a) S2's mode, both off: the arithmetic left after a case split would be proved by hand, which S3 does not teach [D]. (b) Both on: `grind` would close the case analysis the labs teach, and it adds `Classical.choice` where `omega` does not [X RUN-lean-axioms].
- **Lands in.** SPINE §3.3 (LAB-3.4 and LAB-3.5), §7 (M-manual-mode).
- **Status.** Proposed.

### Log item 42 · S10's briefings, passes and mutations; S9's Defences

**In one line.** S10's KCs get step briefings, LAB-10.8 is one write stage run as nine passes, S10's Part B has seven mutations, and S9's two mini-Defences are recounted; the arc is 107 to 197 hours.

- **Context.** The S10 spec found that KC-10.* appear only in `[step]`s, while GATE-kc places each KC's items in its first lesson; that LAB-10.8's 25 minutes understated the 6.8 to 11.7 hours the Write column plans; and that Part B needs one mutation per learner-owned component, seven in all (`curriculum/S10-assembly.md`, §13 issues 1, 2 and 11). The S9 spec put its two mini-Defences at about 2.3 to 2.8 hours by the §3.0 pattern, above the 1.5 to 2.0 hours planned (`curriculum/S09-preservation.md`, §14 issue 1) [D].
- **Decision.** S10.L6 and S10.L7 open with step briefings outside the lesson counts, which carry the KC-10.* KCs' first-lesson dose. LAB-10.8 is one write stage run as nine passes (325 nominal minutes), counted as one stage so that OD-15's shape is unchanged. S10's Part B has seven mutations, one per learner-owned component, the one exception to four to six. With S9's two mini-Defences at 2.3–2.8 h by the §3.0 pattern, the arc becomes 107–197 h, and its 6 h/week projection, about 43–80 weeks, runs just past the roadmap's 18 months at the high end [D].
- **Alternatives considered.** (a) Split LAB-10.8 into nine stages: it would change OD-15's count (S10 spec, §13 issue 2). (b) Make the briefings lessons [D]: the capstone steps are outside the 76 lessons by Log item 2, so a lesson would break that count. (c) Keep S9's Defences at the planned 1.5 to 2.0 hours: ten probes, four mutations, four cases and an explain-back each come to 2.3 to 2.8 hours by the §3.0 pattern (S9 spec, §14 issue 1) [D].
- **Lands in.** SPINE §3.0, §3.9, §3.10, §3.11, §13.
- **Status.** Proposed.

### Log item 43 · A KC for the six fields

**In one line.** KC-1.claim-anatomy holds roadmap rule 3, the six-field claim, so the skill is spaced in Today and sampled in Defences; the graph holds 105 KCs.

- **Context.** Roadmap rule 3 is the course's thesis, yet no KC held it: D-06's items borrowed KC-1.three-answers, KC-1.violation-as-sat and KC-1.non-vacuity-check, so the six-field skill was never graded as the learner's own (`curriculum/D-drawers.md`, §10 issue 3).
- **Decision.** KC-1.claim-anatomy is added. It is first taught in S1.L3 with D-06, spaced in Today and sampled in Defences as the learner's own, and the graph holds 105 KCs, inside the cap of 110.
- **Alternatives considered.** (a) Keep the borrowing, the D-drawers spec's other option: the six-field skill would stay ungraded as the learner's own. (b) Raise the KC cap above 110 to make room [D]: unneeded, since 105 is inside it.
- **Lands in.** SPINE §4, §3.1 (S1.L3), §3.12 (D-06).
- **Status.** Proposed.

### Log item 44 · An ID exception

**In one line.** RUN-lean-ih-ungeneralised keeps its British spelling, because a registered ID is never renamed or deleted.

- **Context.** The ID breaks the US-English rule, and IDs are exact. The generated registry, the tracker, five companion documents and recorded gate output cite it (section 6, item 11).
- **Decision.** The ID keeps its spelling. A registered ID is never renamed or deleted, so an ID that breaks a style rule is logged here as an exception.
- **Alternatives considered.** (a) Rename the ID in the spine and the registry together, as the Spine issues list first proposed: every citation would change, recorded gate output included [D]. (b) Leave the spelling unlogged: the style rule would be broken without a trace [D].
- **Note.** An earlier draft of the item let W0-T03 rename the ID; spine revision 3 dropped that clause.
- **Lands in.** SPINE §9.5, ID conventions; SP-2.3.
- **Status.** Proposed.

### Log item 45 · `research/` is published redacted

**In one line.** `research/` is published with the personal domains, account identifiers and private paths removed, and GATE-privacy scans every published path.

- **Context.** OD-11 keeps private-design content out of the repository, but the spine's layout had no `research/` entry and stated no scope for GATE-privacy, while W0-S11 imports runs from `research/` and the spine cites it throughout. Several research files would have failed GATE-privacy as they stood (section 6, item 2).
- **Decision.** `research/` is published redacted (OD-11). W0-T01 removes the personal domains, account identifiers and private paths the companion documents found there. GATE-privacy scans every published path, with its term list kept as hashed tokens in CI configuration. Redaction markers are intentional gaps for GATE-links.
- **Alternatives considered.** (a) Move `research/` out of the repository [D]: run records and the spine cite its files as inputs and sources, so each citation would lose its target. (b) Publish it as it stands [D]: published content cannot be recalled (OD-11), and several files would fail GATE-privacy.
- **Lands in.** SPINE §11.1, §11.2 (GATE-privacy); OD-11; W0-T01.
- **Status.** Proposed.

### Log item 46 · Twins and pairs

**In one line.** "Twin" means a production twin only; matched sound and flawed audit cases are pairs, and a specimen or lab statement that sets a sound form beside a flawed one calls it a counterpart.

- **Context.** Glossary term 19 defines "twin" as a production system pinned at a SHA, but SPINE §6, M-twins and the AUD table called matched sound and flawed cases "twins", and learner copy cannot use one word for both (`docs/AUDIT-DESK.md`, Spine issues, item 1).
- **Decision.** "Twin" means a production twin only. Matched sound and flawed audit cases are pairs, and a specimen or lab statement that sets a sound form beside a flawed one calls it a counterpart. The mechanic ID M-twins keeps its name.
- **Alternatives considered.** (a) Rename the production twin [D]: the stages' twin cards and M-production-twin use the word, and glossary term 19 defines it. (b) Rename the mechanic M-twins: IDs are never renamed (Log item 44).
- **Lands in.** SPINE §0 (term 19), §6, §7 (M-twins).
- **Status.** Proposed.

### Log item 47 · Anchors in time

**In one line.** Settled is anchored at the stage's sign-off date, and VRK₃₀ counts from first learning, which for a KC credited at placement or test-out is the confirmation date.

- **Context.** SPINE §8.6 defined settled as a fresh probe correct "at least 30 days later" without naming the date it is later than, while VRK₃₀ counts from first learning, which was undefined for a KC credited at placement or test-out (`docs/PLAN.md`, Spine issues, item 10; `curriculum/D-drawers.md`, §10 issue 12).
- **Decision.** Settled is anchored at the stage's sign-off date. VRK₃₀ counts from first learning; for a KC credited at placement or test-out, first learning is the confirmation date.
- **Alternatives considered.** (a) Anchor settled at first learning too [D]: a KC's 30 days could run out before its stage's Defence signs it off. (b) Count the test-out attempt as first learning, as ASSESSMENT.md first did: the credit is unconfirmed until a later fresh item (Log item 49).
- **Lands in.** SPINE §8.6, §4.1, §0 (term 15), §2.3.
- **Status.** Proposed.

### Log item 48 · The six content block types

**In one line.** W1–W2 content uses six block types: prose, instrument, item, claim, specimen and card.

- **Context.** SPINE §3.0, §11.1 and GATE-lessons cap W1–W2 content at six block types, but the six were never named; ARCHITECTURE.md, DESIGN.md and three stage specs listed different sixes, and GATE-lessons needs a fixed list to trip on a seventh.
- **Decision.** The six are prose, instrument, item, claim, specimen and card [D]; prequestions, segment items and exit items are item roles, Build this, twins, incidents and the harder card are card roles, run tables and figures are prose, and the Goal Replay strip is an instrument cell. A seventh type needs a logged decision.
- **Alternatives considered.** (a) Leave the choice to W1-T10: GATE-lessons (W1-T38) would be built without its list. (b) DESIGN.md's list (Goal Replay strip and static table as types) [D]: two of its six are roles of the others.
- **Lands in.** SPINE §3.0, §11.1, §13 W1-T10; W1-T36, W1-T38.
- **Status.** Proposed.

### Log item 49 · Assessment rules decided where the spine was silent

**In one line.** Item scoring, the no-failed-part retake, sessions, first learning, VRK₃₀'s counting event and band 2 are fixed in the spine.

- **Context.** ASSESSMENT.md §3.2, §3.6, §4.1, §6.3 and §6.5 decided six rules the spine left open; ASSESSMENT.md and AUDIT-DESK.md differed on the sound-case hit, and ASSESSMENT.md set first learning at the first test-out probe where SPINE §2.3 sets it at the confirmation date.
- **Decision.** SPINE §8.6 and §2.3 state the rules [D], taking AUDIT-DESK §6.6's sound-case rule and §2.3's confirmation date.
- **Alternatives considered.** (a) Point §8.6 at ASSESSMENT.md §6.3 without copying the rules [D]: two documents would govern one gate. (b) The first test-out probe as first learning: a test-out is confirmed 7–14 days later, so VRK₃₀ would count from an unconfirmed credit.
- **Lands in.** SPINE §2.3, §8.6; W2-T12, W1-T07, W1-T08.
- **Status.** Proposed.

### Log item 50 · S2 against the roadmap

**In one line.** S2 meets 'finite maps' with total functions, moves the dependent-type example to S3, and reads 'preservation over sequences' as conservation.

- **Context.** The S2 spec (§13 issues 14–16) substitutes total functions for finite maps, moves the worked dependent-type example to S3.L2, and keeps non-negativity over sequences out of the required path because S2's high estimate sits at its roadmap bound.
- **Decision.** The three readings stand [D]; CL-2.5 states that its claim is local.
- **Alternatives considered.** (a) Finmap with Mathlib: the packages take 7.3 GB [X RUN-lean-mathlib]. (b) A required non-negativity-over-sequences stage: it needs a named displacement, which no one has named.
- **Lands in.** SPINE §3.2, §5.2 CL-2.5; curriculum/S02-proof.md §13.
- **Status.** Proposed.

### Log item 51 · Two proposed stretch stages declined

**In one line.** Two proposed stretch stages, their claim template and their three runs are not registered.

- **Context.** The S2 and S8 specs proposed one stretch stage each, with a claim template and three runs between them, pending in packages/ids/proposals.json; spine revision 3 must register or decline every proposal.
- **Decision.** Declined: OD-15 fixes 8 stretch stages and the owner accepted it on 2026-10-25; item 28 already dropped the [P] lift. The specs keep the exercises without IDs.
- **Alternatives considered.** (a) Register both and raise OD-15's stretch count to 10 [D]: that rewrites an owner decision the owner accepted as written. (b) Keep them proposed: `verify-links --strict` requires an empty proposals list.
- **Lands in.** SPINE §12 items 28 and 50; curriculum/S02-proof.md, curriculum/S08-effects.md; packages/ids/proposals.json.
- **Status.** Proposed.

### Log item 52 · LAB-2's proofs stay public; S2's worked examples prove parallel theorems

**In one line.** LAB-2's published proofs stay public; S2's worked material proves parallel theorems.

- **Context.** The complete proofs of LAB-2's four basic ledger theorems have been public since the first commit, and W0 repeated them in W0-S10's corpus and W0-S07's demo.
- **Decision.** Keep them as history and have S2's worked examples, strips, rungs, Proof Blocks and bank instances prove parallel theorems, so each LAB-2 stage still asks for the learner's own proof.
- **Alternatives considered.** (a) Remove the published proofs [D]: they are history and already copied. (b) Change LAB-2's statements: the specimens, claims and runs rest on them.
- **Lands in.** SPINE §3.2, §9.1 INS-goal-replay; curriculum/S02-proof.md; W2-T03, W2-T05, W2-T19–W2-T21, W2-T30.
- **Status.** Accepted 2026-10-25 (Q-1, section 1).

### Log item 53 · W0-S13 and the trace-validation run

**In one line.** W0-S13's run, RUN-tlc-tracemodule, answers trace validation; RUN-trace-validate-spike is kept as a superseded ID.

- **Context.** SPINE §3.8, §9.5, §9.6 and W0-S05's §13 row named RUN-trace-validate-spike, which W0-S05 never recorded; W0-S13, adopted on 2026-10-25, recorded the spike as RUN-tlc-tracemodule.
- **Decision.** Register RUN-tlc-tracemodule, repoint the references, move the acceptance item to a W0-S13 row, and keep RUN-trace-validate-spike under To record as superseded.
- **Alternatives considered.** (a) Rename the recorded run to RUN-trace-validate-spike: renames a record, its outputs and 37 citations. (b) Delete the old ID: IDs are never deleted.
- **Lands in.** SPINE §3.8, §9.5, §9.6, §13 W0-S05 and W0-S13.
- **Status.** Accepted 2026-10-25 (Q-2, section 1) for the adoption; the ID handling is spine revision 3's and is proposed.

### Log item 54 · M-consent keeps its ID, and nothing asks

**In one line.** OD-6 as changed: no prompt and no warning; the loader shows each engine's size; M-consent keeps its ID.

- **Context.** OD-6 asked consent above 5 MB, a kernelspace rule with no outcome evidence; at 5 MB both in-tab engines would ask (12,893,420 B of gzip [X RUN-phone-pyodide]; 5,580,851 B [X RUN-pglite-0511]).
- **Decision.** The owner changed OD-6 on 2026-10-25; M-consent now names the loader and the cache's kill switch.
- **Alternatives considered.** (a) Warn above 25 MB or 10 MB: the owner chose never to warn. (b) Rename the mechanic: IDs are never renamed.
- **Lands in.** SPINE §0, §1.2, §7, §9.1, §10.1, §11.2, §13 W1-T06.
- **Status.** OD-6 changed 2026-10-25 by the owner (section 1); keeping the mechanic's ID is proposed.

### Log item 55 · INS-datalog is Z3 `Fixedpoint` behind an adapter

**In one line.** The tab's Datalog engine is Z3 Fixedpoint behind an adapter, with a logged fallback and switch conditions.

- **Context.** SPINE §3.7 and §9.1 left INS-datalog to W0-S03; W0-S03 found equal relations and derivation heights to Soufflé on every comparison [X RUN-fixedpoint-equal].
- **Decision.** Adopt Fixedpoint behind the adapter; the TypeScript evaluator is the fallback, with four switch conditions.
- **Alternatives considered.** (a) The naive evaluator as the tab engine: faster per case, left to the owner. (b) Fixedpoint's own derivations: not used.
- **Lands in.** SPINE §3.7, §9.1 INS-datalog; W4-T07.
- **Status.** Proposed.

### Log item 56 · INS-spectacle unmodified, under a time budget

**In one line.** Spectacle is not patched; the adapter carries fixes, and edits run under a 10 s budget instead of about 5k states.

- **Context.** W0-S04 assumed the vendored commit unmodified; about 5k states would take 16 to 59 s on S8-sized specs [X RUN-spectacle-s5s8].
- **Decision.** Keep the commit unmodified, put fixes in the adapter, and budget the worker at 10 s wall clock [D].
- **Alternatives considered.** (a) Patch Spectacle for Nat, Int and STRING [D]: a fork GATE-conformance would have to cover. (b) Keep the 5k-state cap: too slow for S8.
- **Lands in.** SPINE §7 M-telescope, §9.1 INS-spectacle; W3-T08.
- **Status.** Proposed.

### Log item 57 · Lean sandbox verdicts and `--paranoid` placement

**In one line.** Positive-evidence classification of Lean verdicts, a sandbox only a learner or CI turns off, and --paranoid placed by cost.

- **Context.** W0-S06 classified 185 Lake runs with no mismatch [X RUN-bwrap-lanes] and found lookalikes in which a failed sandbox or a killed checker prints a rejection; it ran two of the five lanes and put labeled stand-ins in place of the other three.
- **Decision.** Adopt the classification rule, the sandbox policy and the --paranoid placement; keep the unrun lanes' sentences as forward references.
- **Alternatives considered.** (a) Classify by exit code: a failed sandbox exits like a rejection [X RUN-lean-bwrap-docker]. (b) Let a script re-run without the sandbox: silent relaxation.
- **Lands in.** SPINE §9.2 INS-bench-lean, §9.6 statespace check, §8.8; W2-T32, W2-T33, W1-T43.
- **Status.** Proposed.

### Log item 58 · The keep/kill machinery

**In one line.** The keep/kill comparisons' machinery is split over W1 tasks, W2-T18 and W5-T08.

- **Context.** W0-T07 fixed and hashed the rules; nothing built the expSeed draw, arm allocation, entry rules, reads or the switch.
- **Decision.** Assign each piece to an existing task; add no task.
- **Alternatives considered.** (a) A new task for the allocation and reads: equivalent, but adds an ID. (b) Leave it to W1's exit: the rules need the switch on before the first event.
- **Lands in.** SPINE §13 W1-T20; W1-T03, W1-T05, W1-T08, W2-T18, W5-T08.
- **Status.** Proposed.

### Log item 59 · The tool primer

**In one line.** The primer is the opening minutes of the first lesson that meets a stage's new tab instrument.

- **Context.** SPINE §4.1 restored the pedagogy digest's primer of at least 5 minutes, but its Held-by cell named only the one-tool-per-stage line and GATE-budget.
- **Decision.** Place the primer in five named lessons, exempt Boot, and hold it on the review checklist.
- **Alternatives considered.** (a) A primer inside Boot: breaks Boot's 8-minute cap. (b) Log the cut and drop the primer [D]: the digest grades pre-training B.
- **Lands in.** SPINE §4.1.
- **Status.** Proposed.

## 4. The W0 spikes' decision records

SPINE §13 requires every W0 spike to leave a decision record with a fallback. Every spike with a decision to record has now run and written one (`docs/spikes/W0-S01.md` to `docs/spikes/W0-S10.md`, and `docs/spikes/W0-S13.md`), so no record is still to come. The table indexes them: the spike's task, what its record decides, and the fallback. The record is the source, and a row follows it. Fallbacks are quoted where the spine or the record states one.

| Task | What the record decides | Fallback |
|---|---|---|
| W0-S01 | Whether the owner's custom subdomain works as the instrument origin, and whether the instrument host gets a `connect-src 'self'` policy (OD-5) | The spike's own record; the measured alternatives fail (OD-5) |
| W0-S02 | The first-load size and phone timing that set Boot's time budget, and the first-load size the loader shows (OD-6, changed 2026-10-25) | Recorded runs with ids, and pocket checkers (SPINE §14) |
| W0-S03 | INS-datalog: Z3 Fixedpoint in the tab, or a TypeScript evaluator | A TypeScript evaluator differential-tested against Soufflé (§3.7) |
| W0-S04 | Whether Spectacle covers the operators S5 and S8 use, including local `EXTENDS` and the state-pair check | None stated |
| W0-S05 | The lasso JSON shape that INS-lasso reads | None stated |
| W0-S06 | Sandbox verdicts on CI runners, Docker Desktop and Codespaces, and `--paranoid` timing | The sandbox is recorded and never required (Brief item 8; §14) |
| W0-S07 | Whether `vcgen` works on a custom command type | The S4.L9 twin stays dated and experimental |
| W0-S08 | S7.L4's lane, decided: the tab on PGlite on laptops, with the Bench authoritative and phones showing recorded runs [X RUN-pglite-rls] | RLS on PostgreSQL 18.6 on the Bench (§3.7) |
| W0-S09 | The isolation catalog rows that have no 18.6 run yet | None stated |
| W0-S10 | Whether Goal Replay strips are deterministic across a toolchain bump | Strips limited to recorded `#guard_msgs` outputs, still regenerated by GATE-replay (W0-S10 section 6) |
| W0-S13 | Whether the trace-module method runs on the pinned 1.8.0 jar with only the modules it bundles, and what `statespace trace validate` reports for an accepted, a rejected and a partial trace [X RUN-tlc-tracemodule] | The method as tested, with the three fallbacks of W0-S13 section 6 for changed named registers, a `Json` module that leaves the jar, or an unavailable 1.8.0 jar |

## 5. Source keys

Keys are those of BRIEF §9, whose URLs are copied here for the keys this file uses. Dates in parentheses are the brief's.

| Key | Source |
|---|---|
| [alemdag25] | https://doi.org/10.3102/00346543251390901 |
| [alfieri13] | https://doi.org/10.1080/00461520.2013.775712 |
| [attest] | https://docs.github.com/en/actions/concepts/security/artifact-attestations |
| [baldiga14] | https://doi.org/10.1287/mnsc.2013.1776 |
| [bangertdrowns04] | https://doi.org/10.3102/00346543074001029 |
| [barbieri23] | https://doi.org/10.1007/s10648-023-09745-1 |
| [bastani25] | https://doi.org/10.1073/pnas.2422633122 |
| [bisra18] | https://doi.org/10.1007/s10648-018-9434-x |
| [booklet] | https://www.lboro.ac.uk/media/media/schoolanddepartments/mathematics-education-centre/downloads/research/SE-booklet.pdf (CC BY-SA 4.0; read 2026-10-23) |
| [buehler94] | https://doi.org/10.1037/0022-3514.67.3.366 |
| [cbm] | https://www.ucl.ac.uk/lapt/REAP_CBM.htm |
| [cedarblog] | https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/ |
| [cheerpj] | https://cheerpj.com/docs/licensing |
| [ghdomain] | https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages |
| [ghpages] | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages |
| [ghsearch] | https://api.github.com/search/repositories (queries run 2026-10-23) |
| [hacker00] | https://doi.org/10.1037/0022-0663.92.1.160 |
| [higham22] | https://doi.org/10.1037/edu0000693 |
| [hilbert08] | https://doi.org/10.1016/j.learninstruc.2006.10.008 |
| [hodds14] | https://doi.org/10.5951/jresematheduc.45.1.0062 |
| [kobayashi19] | https://doi.org/10.1111/jpr.12221 |
| [koedinger23] | https://doi.org/10.1073/pnas.2221311120 |
| [kraft20] | https://doi.org/10.3102/0013189X20912798 |
| [kulik90] | https://doi.org/10.3102/00346543060002265 |
| [latimier21] | https://doi.org/10.1007/s10648-020-09572-8 |
| [lean435] | https://lean-lang.org/doc/reference/latest/releases/v4.35.0/ (2026-10-12; read 2026-10-23) |
| [leanvp] | https://lean-lang.org/doc/reference/4.35.0/ValidatingProofs/ |
| [oreo19] | https://doi.org/10.3386/w26059 |
| [petrov25] | https://arxiv.org/abs/2503.21934 |
| [pg19notes] | https://www.postgresql.org/docs/19/release-19.html |
| [proofspaceco] | https://www.kuppingercole.com/vendors/proofspace (read 2026-10-23) |
| [renkl02] | https://doi.org/10.1080/00220970209599510 |
| [rowland14] | https://doi.org/10.1037/a0037559 |
| [serth22] | https://doi.org/10.3389/feduc.2022.1008545 |
| [shen26] | https://arxiv.org/abs/2601.20245 |
| [statespaceorg] | https://api.github.com/orgs/statespace-tech (read 2026-10-23) |
| [stone00] | https://doi.org/10.1006/obhd.2000.2910 |
| [tatel25] | https://doi.org/10.1037/bul0000481 |
| [wass03] | https://doi.org/10.1046/j.1365-2923.2003.01417.x |

Studies cited by author and year in the pedagogy digest, which the brief's index does not carry:

| Study | DOI |
|---|---|
| Klein 2020 | https://doi.org/10.1037/apl0000441 |
| Bettinger 2014 | https://doi.org/10.3102/0162373713500523 |
| Kizilcec 2020 | https://doi.org/10.1073/pnas.1921417117 |
| Li 2025 | https://doi.org/10.24059/olj.v29i4.5215 |

Local sources, as relative paths in this repository unless noted:

| Short name | Source |
|---|---|
| BRIEF | `research/synthesis/BRIEF.md`, the v2 redesign brief |
| SPINE | `docs/spine/SPINE.md`, the canonical index; "Log item n" is item n of its §12 and "revision log" is its §15 |
| dl | `research/synthesis/digest-landscape.md` |
| dp | `research/synthesis/digest-pedagogy.md`; "dp row n" is a row of its §1 evidence table |
| dr1 | `research/synthesis/digest-review-1.md`; D1 to D26 are its changes |
| dr2 | `research/synthesis/digest-review-2.md`; A1 to A6, B1 to B11, C1 to C5 and R1 to R24 are its changes and rulings |
| A1 to A8 | `research/reviews/A1-fidelity.md`, `A2-correctness.md`, `A3-pedagogy.md`, `A4-journey.md`, `A5-feasibility.md`, `A6-worldclass.md`, `A7-design.md`, `A8-successor.md`; a finding such as A5-F6 resolves there |
| L1 verification | `research/reports/L1-learning-science.verify.md` |
| RUN rows | `research/spikes/RESULTS.md` and the logs under `research/evidence/`, as listed in SPINE §9.5 |
| ks100x | kernelspace's learning-experience plan, PLAN-100X (2026-10-03), the predecessor course's own document; it is not part of this repository |

## 6. Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15). Each item keeps its text and ends with its outcome.*

These are the places where this file believes `docs/spine/SPINE.md` is wrong, inconsistent with the evidence on disk, or silent where a decision is needed. Each was checked against the files named. Severity is a judgment [D].

1. **Two "executed" Lean runs have no output log on disk (medium).** SPINE §9.5 lists a run as executed only when its output log is on disk. RUN-lean-bv-decide and RUN-lean-vcgen cite `.lean` sources and "R1 verification log", which is a report. The evidence tree holds the sources (`research/evidence/lean-measure/proj/ledger/Ledger/Bits*.lean` and `Contract*.lean`) but no file that contains the `vcgen` output or the `bv_decide` counterexample values; `research/evidence/a2r3/out/lean_bv.txt` records only axiom lists and a solver timeout. SPINE §3.4 (production twins) and SP-4.7 cite `[X RUN-lean-vcgen]`; nothing cites RUN-lean-bv-decide. *Fix:* move both to the to-record list (W0-S11 re-run; W0-S07 for the custom-command case), write `{{run:RUN-lean-vcgen}}` in §3.4 and SP-4.7, and correct the counts in §9.5 and §15 (34 executed; 104 to record). *Revision 3: already resolved (§9.5): revision 2 (m11) moved both runs to To record, W0-S11 has since recorded them, and they are executed rows [X RUN-lean-bv-decide, RUN-lean-vcgen].*
2. **`research/` is outside the layout, and GATE-privacy's scope is not stated (medium).** SPINE §11.1 has no `research/` entry, yet W0-S11 imports runs from it and the spine cites it throughout. OD-11 and W0-T01 name the review JSONs, and GATE-privacy lists terms to reject, but nothing says which directories the gate scans or what it allows. Several research files would fail GATE-privacy as they stand. *Fix:* decide which files under `research/` are published, redacted or moved out; extend GATE-privacy's scope and its allow-list to say so; record the answer under OD-11. *Revision 3: already resolved (§11.1 lists `research/` as published redacted; §11.2 GATE-privacy states its scope; §12 item 45), and W0-T01 built the gate.*
3. **`.gitignore` ignores `*.log` (medium).** Thirteen of the 37 executed runs in SPINE §9.5 cite `.log` files as sources (for example `browser-runs.log`, `z3-pyodide.log`, `pglite.log`, `comp-run2.log`, `tla/run.log`). Unless those files are force-added, or W0-S11 copies each output into `runs/<RUN-id>.json` before the first public push, or the rule is narrowed, a clone would lack the evidence behind them. This file did not run git, so whether any of them is already tracked is not checked. *Revision 3: applied (§9.5, first paragraph): run logs stay tracked, because `.gitignore` re-includes `research/**/*.log` and `runs/**/*.log`.*
4. **The v1 canvas contradicts the spine's own rule (medium).** SPINE §10.2 and V2-03 say the artboards are labeled "illustrative" until redrawn from runs, but none of the six `design/canvas/*.dc.html` files nor `canvas.json` carries that label. Two artboards (`Theater.dc.html` and `Ledger.dc.html`) print content that the corrections ledger (BRIEF §2.2) lists as false: an invented state count, and an overflow mechanism and an isolation verdict that the executed runs contradict. GATE-numbers' scope includes artboards and its deny-list comes from that ledger, and no W0 task labels, fixes or exempts them. The canvas and `docs/history/v1/` also use the retired name "Plinth" outside GATE-privacy's allow-list (OD-2). *Fix:* label them and exempt `design/canvas/` and `docs/history/` explicitly in W0-T03 or W0-S11, or redraw them before W1. *Revision 3: applied (§10.2 Artboards): every sheet carries the label "illustrative, v1 history", and no sheet is redrawn.*
5. **Two rows state a browser result that was measured under Node (low).** The log behind RUN-z3-budget-pyodide and the tab half of RUN-z3-unknown-pow (`A5r3/z3-pyodide.log`) has the header "pyodide 314.0.7 under node v22.22.2", and the browser log (`browser-runs.log`) has neither case. Yet SP-1.8 says "a timeout that never fires in the tab", and RUN-z3-unknown-pow says "in the tab". W0-S02's acceptance lists `rlimit` timing but not the timeout. *Fix:* say "under Pyodide in Node" until a browser run exists, or add both cases to W0-S02. *Revision 3: applied, merged with W0-S02's browser runs (§5.1 SP-1.8; §9.1 INS-z3; §9.5): the claim now names the Node harness and three desktop browsers, never phones [X RUN-z3-budget-pyodide, RUN-phone-pyodide].*
6. **Log item 24 and W2-T08 disagree (low).** The rule makes every grader and untrusted-input parser opus, but W2-T08 builds INS-lane-a, the host that runs and grades the learner's wasm (an untrusted-input path under I6), and INS-interp, the key-computing oracle, and it is assigned sonnet. *Fix:* make W2-T08 opus, or split the Lane A host into its own opus task. *Revision 3: already resolved (§13 W2-T08; §12 item 24): W2-T08 is opus.*
7. **OD-4 and §9.1 list different link-outs, and no gate enforces the rule (low).** §1.2 lists four (live.lean-lang.org, Alloy4Fun, TigerBeetle's simulator, TLA+ By Example). §9.1 lists five by adding the Natural Number Game. The brief's "CheerpJ TLC" item was replaced by TLA+ By Example without a log entry. GATE-bundle's route tests are the natural enforcement point for "no request to a third-party origin unless the learner follows a link-out", but §11.2 does not say so. *Fix:* keep one list and add the route-test line. *Revision 3: already resolved (§1.2 OD-4; §9.1; §11.2 GATE-bundle; §12 item 39): one list of five link-outs, enforced by GATE-bundle's route tests.*
8. **The six content block types are never named (low).** §3.0, §11.1 and GATE-lessons cap W1 to W2 content at six block types, and "a seventh needs a logged decision", but neither the six nor the decision that fixes them appears in §12. *Fix:* name them in §3.0, or log the choice when W1-T10 makes it. *Revision 3: applied (§3.0; §11.1; §13 W1-T10; §12 item 48): the six types are named and logged.*
9. **Log item 12's wording is off (low).** It says the six fading families were "chosen from the review's ten". F4 (invariant strengthening after a CTI) is not among the ten (the nearest is "VC construction"), and five of the ten were dropped (Z3 encoding, VC construction, SQL history to anomaly, Datalog policy, self-composition), not four. *Fix:* reword. *Revision 3: already resolved (§12 item 12).*
10. **§4.1's KC target and the build differ (low).** The dosage row says "≈ 80–100 KCs (cap 110)" and the build has 104; GATE-kc enforces 80 to 110. *Fix:* write "cap 110; 104 planned" in the row. *Revision 3: already resolved (§4.1 KC graph row, "cap 110 KCs, 105 planned"; §12 items 6 and 43): the item's 104 is now 105.*
11. **A British spelling sits inside an ID (low).** RUN-lean-ih-ungeneralised (SP-2.3 and the S2 to S3 list in §9.5) breaks the US-English rule. IDs are exact, so change it in the spine and the registry together, or record it as an ID exception. *Revision 3: applied (ID conventions; §12 item 44): a registered ID is never renamed or deleted, so the spelling stays and the exception is logged.*
12. **The spine has no ID kind for decision records (gap).** This file names records by their position in the brief and in the spine's log. If the owner wants addressable records, add a kind for them (prefix to be chosen) to the spine's ID table and to the registry that GATE-links generates. *Revision 3: declined: no addressable decision records are added, because the owner asked for none; records stay named by their position, and Q-1 and Q-2 stay plain labels (spine §15, "Left unchanged").*

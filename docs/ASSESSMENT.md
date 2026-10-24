# statespace: evidence and assessment

**Status:** the canonical rules for evidence, grading, calibration and sign-off in statespace v2. This document elaborates spine §8 (Assessment) and the assessment rows of spine §2, §4, §6 and §11. Every ID in it comes from `docs/spine/SPINE.md`. **Date:** 2026-10-23 (machine clock). **Review:** owner decisions OD-1–OD-15 are adopted defaults awaiting owner review (spine §1.2); OD-8, honor-system provenance, shapes §2 and §9.

**Precedence.** The roadmap sets scope; executed runs (`research/spikes/RESULTS.md` and `research/evidence/`) beat any report; then come the redesign brief, the four digests, the research reports and adversarial reviews, kernelspace's learning engine, and the v1 design as history. The spine is the index for IDs and wins over this document. Where the spine is silent, this document decides and tags the decision [D]. Where this document believes the spine is wrong, it says so under "Spine issues" at the end, and the spine governs until it changes.

**Tags.** `[X RUN-id]` marks an executed run already on disk; `{{run:RUN-id}}` a run that must be recorded before the sentence ships; `[D]` a design decision or an exact computation (every interval below uses z = 1.96 and can be reproduced from the formula in §6.4). Evidence grades follow the pedagogy digest: **A** a meta-analysis or several consistent RCTs; **B** one good experiment on a similar task; **C** a small study, correlational data or a preprint; **D** theory, consensus or design rationale. `[dp row N]` cites row N of the pedagogy digest's graded evidence table (`research/synthesis/digest-pedagogy.md` §1); `[dp §2, Stage k]` cites its misconception catalog; `[dp §3.x]` and `[dp §6]` its assessment and dosage sections. Other lowercase keys in brackets resolve in the brief's source index (`research/synthesis/BRIEF.md` §9). Stamp codes are bracketed ([P], [M], [T] …); IDs never are. Learner-facing copy calls the learner's own product "your system".

---

## 0. The system on one screen

1. **Evidence moves status, and nothing else does** (I1). A learner state changes only on checker-graded work that the learner declares unassisted, on an instance generated from a seed drawn at grade time. Reading, lab checks, receipts, claims and agent work never move it.
2. **Every state is derived** at read time from an append-only event log (I2): per-KC relearning, stage sign-off, settled KCs, VRK₃₀ and audit accuracy. Nothing stores a status.
3. **Checkers decide, about the learner too** (I3). Fourteen generator families compute their keys with Z3, TLC state graphs, the Mini-Plinth interpreter, recorded PostgreSQL histories, the paired-state evaluator, Lean's elaboration or the verdict→stamp deriver. No language model grades an answer, and none writes an item at run time.
4. **Signed off** means the Defence's Parts A–C passed (at least 75% overall; each part at least 60%, or at most one miss in a part of five or fewer items), Part D was attempted, and every KC of the stage was answered correctly on fresh items in three spaced sessions. **Settled** means one fresh probe per KC answered correctly at least 30 days after sign-off. Both are learner states drawn in ink; neither borrows a stamp's color, revokes or locks anything.
5. **Calls are calibrated, never scored.** Three taps carry bands printed from certainty-based marking's switch points; every item prints its chance level; payoffs are shown as feedback only. The private Mirror leads with bias and per-band hit rates with Wilson intervals, and diagnoses nothing below about 20–30 calls in a band (operationally 20, §5.6).
6. **The course stamps its own assessments.** A passed Defence is [T] · n unseen items with its Wilson interval, never PROVED competence; a self-check is [A].
7. **Validity is a CI property.** Keys reproduce on their engines, item lints run on every generated pool, blind strategies are held to chance + 2 SD, cue ablation runs on every template, and the course states that its oracles are "unseen, not secret".
8. **The limits are printed** on SCR-assurance (§9): provenance is self-declared, oracles are visible, Defence Part B has no outcome data, and one learner supports no causal claim. Expect effects of tenths of a standard deviation at most; the median education effect is about 0.10 SD [kraft20].

---

## 1. Principles and their grounds

| Principle | What it means in this system | Basis |
|---|---|---|
| Checkers decide, about the learner too | Keys, grades and stamps come from Z3, TLC, Spectacle, the interpreter, `lake comparator`, cargo or recorded runs. Lean's manual treats un-reviewed AI-generated proofs as potentially malicious and prescribes the comparator [leanvp] | B/C · [dp row 31]: LLM judges inflated olympiad proof scores up to about 20× [petrov25]; D for [leanvp] |
| Language models only propose, at authoring time | Models may draft reading prequestions, adversarial audit cases and hint wording; a checker certifies every flaw and a human reviews. No model grades, generates a graded item at run time, or stands in for learners when items are validated | B/C · [dp row 31]; simulated "students" correct themselves after any feedback [do26] |
| Claims are not evidence | Claims record what artifacts establish, and agents may produce them. Evidence records what the learner did unassisted. Only evidence moves a learner state | A−/B · [dp row 33]: unguarded AI raised practice 48% and lowered the unassisted exam 17% [bastani25] |
| Retrieval on fresh application items is the unit of evidence | Every credited event answers a newly generated application item: a query, a witness, a precondition, a verdict | A · [dp row 1]: retrieval g = 0.50 against restudy; transfer d = 0.40 only with application items [rowland14][pan18] |
| The course stamps its own assessments | A passed Defence is [T] with n and an interval; a self-grade is [A]; a model's opinion earns no stamp | B · [dp row 28]: self-grades correlated with a teacher's at r = 0.91–0.94 yet low performers inflated them, the lowest with "gross overconfidence" [hacker00]; orals need many cases [wass03] |
| Nothing locks; status is computed | Lessons, drawers, audit cases, labs and the Defence are always open; states are computed from events and gate nothing | A · [dp row 37]: self-paced mastery gating cuts completion [kulik90]; expected rewards −.28 to −.40 [deci99] |
| Practice shows witnesses; probes are one shot | Counterexample feedback invites patching the special case, so probes give feedback only after submission and practice adds the witness's class | B · [dp row 21] [dantoni15] |
| Bounded checks print their bound, the course's own graders included | Every grader verdict that rests on a scope, a constant, a search depth or an `rlimit` budget [X RUN-z3-budget-pyodide] prints it (I10) | D |

---

## 2. Evidence events and provenance

### 2.1 The event record

The spine fixes the fields of an event (§8.2); this table fixes their meaning.

| Field | Meaning and rule |
|---|---|
| `id` | a random UUID; a merge keeps one copy per id (§2.6) |
| `kind` | one of nine kinds (§2.2) |
| `ref` | what was answered, in the grammar of §2.7; with `itemRev` it identifies the instance |
| `itemRev` | a content fingerprint of the template, its misconception set and its key procedure. When an erratum changes it, earlier events on that template are flagged "re-check" and nothing is deducted (§2.6) |
| `engine@version` | the engine that computed the key at grade time: `z3@5.3.1` in the Pyodide 314.0.7 worker [X RUN-z3-starter-pyodide]; a pocket checker by bundle hash; a TLC 1.8.0 state graph [X RUN-tlc-jars]; the interpreter, the lasso validator, the paired-state evaluator or the stamp deriver by content hash; Goal Replay strips from Lean 4.35.0 [X RUN-lean-ledger]; or `bench:` plus a receipt hash. A bounded engine also records its bound |
| `seed` | the uint32 drawn at grade time for a generated instance; absent for authored cells and audit anchors |
| `ok` | `true`, `false` or `null`. `null` means ungraded: the engine returned `unknown` or reached its budget at grade time, or the answer fell outside the item's language. An ungraded event never counts as a miss |
| `conf` | `guess`, `think` or `sure` when a call was asked (§5); stored as the tap, never as a number |
| `provenance` | `own`, `assisted`, `agent` or `automated` (§2.4) |
| `seen \| unseen` | exposure (§2.3) |
| `at` | an RFC 3339 timestamp carrying the device's UTC offset, so the local day is fixed when the event is written and travel never rewrites spacing |
| `ms` | time on task |

Two derivations need data the spine's record does not hold. Refutation cards fire "after two misses on a tag" (M-refutation-card), and a miss's tag can be recovered only from the learner's response. This document therefore assumes two more fields, `resp` (the response in canonical form: an option id, a formula, a witness or a verdict vector) and `mis` (the misconception tags a wrong response matched), and lists them under Spine issues.

### 2.2 Kinds

| Kind | Written when | Key from | Produces |
|---|---|---|---|
| `call` | the first run of an authored instrument cell; the interpretation tap (§5.4); an audit case's statement-alone call | the run's verdict, read through §8 | calibration and scheduling input |
| `item` | a generated item in practice mode: lesson exit items, Today, re-finds, sure-and-wrong returns, interleaved sets | the family's engine | evidence |
| `probe` | a generated item in probe mode, one shot with feedback after submission: Defence Part A, settled probes, test-out | the family's engine | evidence |
| `audit` | an audit case decided with a class and typed evidence: Today, the Clearinghouse, Defence Part C | the case's checker | evidence, for audit accuracy |
| `prove-it` | a prediction about a seeded mutation of the learner's own artifact: a lab's Prove-it, Defence Part B | the checker's verdict on the mutant, read from the receipt | evidence |
| `lab-check` | a lab check's result | `statespace check` (Lane B) or the tab (Lane A) | claims and specimens only |
| `receipt-import` | a receipt imported by file or URL fragment | schema and statement-hash validation | claims and specimens only |
| `explain-back` | Defence Part D completed | nobody | uncredited; its existence is required for sign-off |
| `note` | a technical note exported | nobody | uncredited |

### 2.3 Instance identity, exposure and "fresh"

- **Identity.** An instance is identified by its `ref` and `itemRev`. Generators are pure, so the pair regenerates the same instance in any browser (I3).
- **Unseen.** An event is `unseen` when no earlier event in the log has the same identity and the instance was never displayed with its key, witness or worked solution before the first submission. Every other event is `seen`.
- **Display seeds stay apart** [D]. Worked examples, fading rungs, lesson demonstrations and drawer illustrations draw seeds from a reserved half of the seed space; graded items draw from the other half, and a graded draw whose identity is already in the log is redrawn. Exposure is therefore computable from the log alone, with no "viewed" event.
- **Fresh.** An event is fresh when it is `own`, `unseen` and *generated*: an `item`, a `probe`, a `prove-it`, or an `audit` on a generated variant. Authored cells and audit anchors are `unseen` on first exposure, but they are fixed, published and identical for every learner; the roadmap's starter even prints its own answer, which is why S1.L1's first scored call is a fresh variant (V2-05). Their events feed calibration, scheduling and audit accuracy, never sign-off, settled or VRK₃₀.

### 2.4 Provenance

| Value | Set by | Effect |
|---|---|---|
| `own` | default: the learner declared no help | full weight |
| `assisted` | a hint rung past R2; a `statespace stuck` packet or another context packet used on this instance; a receipt's self-reported `assisted: explain` or `code`; the learner's "I had help" toggle, which every item carries and nothing questions | weight 0.3 for scheduling. An assisted event never upgrades; the KC is credited again when a later fresh variant passes unassisted |
| `agent` | the learner's declaration that an agent produced the answer; a receipt's `agent: true` | weight 0; may produce claims, never evidence |
| `automated` | mechanically, from a receipt's automation flags: a tactic closed a step taught in manual mode (`grind` adds `Classical.choice`, `omega` does not [X RUN-lean-axioms]) | weight 0 for the taught KC and a flag on the receipt. Lab receipts never count as evidence, so in practice the flag shows on the claim's qualifier |

The weights are the spine's (§8.2), which follow kernelspace's (spine §12, item 10):

| Provenance and exposure | Weight | Counts toward |
|---|---|---|
| own · unseen | 1.0 | sign-off, settled, VRK₃₀, Judgment |
| own · seen (practice) | 0.3 | scheduling only |
| assisted (past rung R2, or a context packet used) | 0.3 | scheduling only, until an unseen variant passes unassisted |
| automated (a tactic closed a step taught in manual mode) | 0 for that KC | flagged on the receipt |
| agent | 0 | may produce claims; never evidence |

**Honesty** (OD-8). Provenance is self-declared, and nothing on a static site can verify "unassisted". The system calibrates rather than polices: it asks, records, weights and says so on SCR-settings and SCR-assurance. The weights exist because substitution harms unassisted performance (A−/B · [dp row 33]); they are not an accusation. AI use also inflates self-assessment (B · [dp row 35] [fernandes26]), so assisted work is shown apart from unassisted work wherever either appears.

### 2.5 What counts

| Event class | KC relearning (sign-off) | Defence score | Settled | VRK₃₀ | Audit accuracy | Mirror | Scheduling weight | Claims and specimens |
|---|---|---|---|---|---|---|---|---|
| fresh `item` | yes | — | — | yes, at ≥ 30 days | — | yes, if called post-instruction | 1.0 | a re-find also marks its specimen "kept" |
| fresh `probe` | yes | Part A | yes | yes, at ≥ 30 days | — | yes | 1.0 | — |
| fresh `prove-it` | yes | Part B | — | yes, at ≥ 30 days | — | yes | 1.0 | — |
| `audit`, own · unseen, generated variant | yes, for its KCs | Part C | — | yes, at ≥ 30 days | yes | its statement-alone call | 1.0 | — |
| `audit`, own · unseen, anchor | — | Part C | — | — | yes | its statement-alone call | 1.0 | — |
| `call` on an authored cell, own, post-instruction | — | — | — | — | — | yes, first run only | 1.0 | — |
| `call`, pre-instruction (prequestions, Boot's first-contact call) | — | — | — | — | — | — | creates the KC's first Today card | — |
| any own · seen event | — | — | — | — | — | — | 0.3 | — |
| any assisted event | — | not credited | — | — | — | shown apart | 0.3 | — |
| any agent or automated event | — | not credited | — | — | — | — | 0 | may produce claims |
| `lab-check`, `receipt-import` | — | — | — | — | — | — | — | yes |
| `explain-back` | — | Part D, required and uncredited | — | — | — | — | — | — |
| `note` | — | — | — | — | — | — | — | — |

"Not credited" means the item counts in its part's denominator and not in its numerator: a Defence item answered with help is neither a pass nor a misconception.

### 2.6 Log rules

- **Append-only.** Events are written once and never edited; the first call on an authored cell is final (M-call-it).
- **Merge.** A merge is a set union by `id`. When two records share an id but differ, the record with the lexicographically smaller canonical JSON wins (kernelspace's ledger rule). The rule is commutative, associative and idempotent, so double imports, merges and stale tabs give identical logs (W1-T03's property tests).
- **Export.** Export bundles, merge-import with undo and a 7-day backup nudge, because WebKit may clear script-written storage after seven days without interaction [webkit7d] (SCR-settings).
- **Errata.** A changed `itemRev` flags the affected events "re-check" and schedules a fresh item on the KC. An erratum never lowers a derived state (kernelspace's errata rule; M-change-cards).
- **Locality.** The log, the Mirror and every derived state stay on the device. There are no accounts, no telemetry and no grading server (I6). Claims, specimens and receipts live in the learner's lab repo (V2-17).

### 2.7 The `ref` grammar [D]

| Kind | `ref` | Example |
|---|---|---|
| `item`, `probe` | `gen:{family}:{template}:{band}:{seed}` | `gen:GEN-negate-it:t4:b2:0x7c1e09a4` |
| `call` on a cell | `cell:{lesson}#{n}` | `cell:S1.L3#2` |
| `call` as interpretation tap | `tap:{lesson}#{n}` | `tap:S1.L3#3` |
| `call` on an audit statement | `aud:{AUD-id}:statement`, or with `:v:{seed}` for a variant | `aud:AUD-1.1:statement` |
| `audit` | `aud:{AUD-id}`, or `aud:{AUD-id}:v:{seed}` for a generated variant | `aud:AUD-1.1:v:0x0009b21f` |
| `prove-it` | `mut:{LAB-n}:{seed}:{m}`, mutant m of a seeded set | `mut:LAB-2:0x51c0a2e7:3` |
| `lab-check` | `lab:{check}` | `lab:LAB-1.c3` |
| `receipt-import` | `receipt:{sha256}` | — |
| `explain-back` | `explain:{stage}:{attemptSeed}` | `explain:S1:0x3f02aa10` |
| `note` | `note:{n}` | `note:1` |
| inside a Defence | `def:{stage}:{attemptSeed}:{part}{i}/` followed by the item's own `ref` | `def:S2:0x3f02aa10:A7/gen:GEN-proof-structure:t3:b2:0x2b9d0c11` |

A Defence attempt's parts and items are a deterministic function of its stage and attempt seed, so the derivations of §3 can group events by attempt and part from the log alone.

---

## 3. The KC graph and derived states

### 3.1 How assessment uses the graph

- **The graph** is the spine's (§4): 104 KCs, 26 of them threshold KCs; `requires` edges form a DAG; seven confusable sets (A–G) define what may be interleaved; six fading families (F1–F6) run from worked examples to transfer.
- **Tags.** Every template, audit case, lab check and specimen carries KC tags (GATE-kc). A generated item names one primary KC and at most two secondary KCs [D]. Evidence credits the primary KC only; secondary tags steer interleaving, misconception analysis and scheduling at weight 0.3, so a three-tag item never counts three times.
- **Threshold KCs** get extra calls, spiral returns in later stages, and at least one Part A slot in a later stage's Defence (§6.2).
- **Interleaving.** M-which-is-it serves mixed sets from one confusable set only, after the KC's exit item, for at most half a session (A · [dp row 4] [brunmair19]).
- **Dose floor.** In its first lesson every KC gets a prequestion, one or two calls and an exit item; then at least 8 graded opportunities in its first 60 days, at about 1–3, 7, 21 and 45–60 days (B/D · [dp §6]; [koedinger23], an analogy: a median of 7.24 opportunities to reach 80%).

### 3.2 Sessions, spacing and first learning [D]

| Term | Definition |
|---|---|
| session | a maximal run of graded events in which consecutive events are less than 30 minutes apart |
| local day | the calendar date of `at` in the offset it carries |
| first learning of KC k | the learner's first attempt at the exit item of k's first lesson, or the first test-out probe on k, whichever comes first |
| post-instruction on k | at or after first learning of k. Prequestions, Boot's first-contact call and in-lesson predictions before the exit item are pre-instruction |
| spaced | two counted sessions are spaced when their local days are at least 2 apart (one full day between) |

The spacing rule copies successive relearning's protocol: sessions about two days apart, correct items dropped for the session, misses returned at most twice (B · [dp row 3] [higham22]).

### 3.3 Per-KC relearning

A session *counts* for KC k when the learner answers a fresh item whose primary KC is k correctly in it, no later than the third attempt on k in that session. Each return after a miss is a fresh variant rather than the same instance, so every attempt stays `unseen`. KC k is **relearned** when three counted sessions are pairwise spaced. The count is taken greedily in time order (the earliest counted session, then the earliest counted session at least two local days later, and so on), which finds three spaced sessions whenever three exist.

| Per-KC state | Condition | Used by |
|---|---|---|
| introduced | first learning has happened | scheduling; the post-instruction filter |
| practicing | at least one fresh event on k | — |
| relearned | three spaced counted sessions | stage sign-off |
| solid | relearned, and the latest fresh event on k is correct | the expert skip on authored calls; fading the interpretation tap (§5.4) |
| settled | a fresh probe on k correct at least 30 days after its stage's sign-off (§3.5) | VRK₃₀ display; a stage's settled state |

Relearned never reverts, because a stage's sign-off is a belt that does not revoke (C · [dp row 42]). Solid can revert: it governs only how much scaffolding to offer, and the expertise reversal is asymmetric, so when unsure the course helps (A · [dp row 9] [tetzlaff25]).

### 3.4 Stage sign-off

```
partPassed(c, n) = c/n ≥ 0.60  or  (n ≤ 5 and n − c ≤ 1)

defencePassed(S, t):
  for P in {A, B, C}:
    L[P] = the latest attempt of part P for stage S before t
    n[P] = number of items in L[P]
    c[P] = items in L[P] with ok = true and provenance = own
  return  partPassed(c[P], n[P]) for every P in {A, B, C}
      and (c[A] + c[B] + c[C]) / (n[A] + n[B] + n[C]) ≥ 0.75
      and the events of L[A], L[B] and L[C] fall in at least two sessions
      and L[C] holds at least one sound case
      and an explain-back event for S exists before t

signedOff(S, t) = defencePassed(S, t) and relearned(k, t) for every KC k of S
signOffDate(S)  = the earliest t at which signedOff(S, t) holds
```

- The Defence and the relearning criterion can be met in either order. The Defence's own Part A probes are fresh events and count toward relearning when they fall in a spaced session.
- Lab completion, receipts and claims are absent from the rule (§1, claims are not evidence). Part B needs the learner's own artifact to mutate, so building the lab is a precondition of taking Part B, not a source of credit.
- S9 signs off through two mini-Defences, one per half; each samples only its half, and both must pass (spine §3.9).
- "Signed off" is drawn in ink, never in a stamp's color (GATE-codes), and nothing waits on it.

### 3.5 Settled

```
settled(k, t):
  t0 = signOffDate(stage of k);  if there is none, return false
  return some probe e on k (as primary KC) is fresh, is the first attempt on its
         instance, has ok = true, and satisfies t0 + 30 days ≤ e.at ≤ t

settledStage(S, t) = settled(k, t) for every KC k of S
```

Today serves each KC's settled probe when it falls due, 30 days after sign-off. A later stage's Defence probe on an earlier stage's threshold KC is also a probe, and settles that KC if it falls inside the window. A missed settled probe returns the KC to relearning and schedules a new settled probe at least 30 days after the miss, so "settled" keeps meaning retention at 30 days [D]. A miss never touches the stage's sign-off. The criterion is successive relearning followed by a delayed fresh test (B · [dp row 3]; [dp §6]).

### 3.6 VRK₃₀

```
qualifying(k) = fresh events on k (as primary KC) with at ≥ firstLearning(k) + 30 days
VRK30(t)      = the number of KCs k whose qualifying events before t are non-empty
                and whose latest qualifying event has ok = true
```

The Mirror shows the count, the count per active study-month, the accuracy over all qualifying events with its Wilson interval, the KCs that count, and which of them are settled. An active study-month is a calendar month with graded own work on at least 4 distinct local days [D], so declared breaks do not dilute the rate. The rule takes the *latest* qualifying event rather than any past success because roadmap rule 6 asks what the learner can independently reason about now [D]. For example, 41 correct qualifying events out of 52 show as 0.79 with a Wilson interval of 0.66–0.88 [D]. There is no target, no comparison across learners and no population claim (spine §2.3).

### 3.7 Audit accuracy (Judgment)

Judgment is the spine's internal name (§2.2); learner copy says "audit accuracy". Its population is `audit` events that are own and unseen: anchors on first exposure, and generated variants.

```
TP = flawed cases rejected with a class in the case's acceptable set and valid typed evidence
FN = flawed cases accepted, or rejected without both
TN = sound cases marked "none: sound"
FP = sound cases rejected
TPR = TP / (TP + FN),   TNR = TN / (TN + FP),   each with its Wilson interval
balanced accuracy = (TPR + TNR) / 2, shown with the mean of the two Wilson bounds
per class c, shown only once n ≥ 10:
  recall(c)    over flawed cases whose canonical class is c
  precision(c) over the learner's findings labeled c
```

Averaging the two components' bounds gives a wider interval than their joint sampling error warrants, so it errs toward modesty [D]. With 9 of 12 flawed cases found (0.47–0.91) and 7 of 9 sound cases accepted (0.45–0.94), balanced accuracy shows as 0.76 with 0.46–0.92 [D]. Balanced accuracy puts always-reject and always-accept at exactly 0.5, which is why the Audit Desk scores it instead of precision on rejections: with v1's 4 sound cases in 32, rejecting everything scored 87.5% precision and 100% recall [dp §3.6]. The case flow, the pool and the gap taxonomy are the spine's (§6). Erroneous examples carry grade A (small) · [dp row 16] [alemdag25], and findings need typed evidence because the effect was larger when learners explained the error.

### 3.8 The end-state matrix

Each roadmap end-state (a)–(g) is a generated task set (spine §2.2). Its criterion is per learner and on the device: at least 75% on at least 12 fresh items across at least two sessions, then a fresh probe correct at least 30 days later, always shown with a Wilson interval and never as a population claim. Outcome (c) adds per-class audit recall once n ≥ 10, and (g) adds balanced accuracy. The spine's outcome (f) also names LAB-6.c7, and outcome (g) the recorded demonstration CL-10.1; this document shows those as artifact lines beside the evidence, because lab checks and claims are not evidence (Spine issues). Every Defence samples items from the matrix rows its stage trains.

### 3.9 Test-out and placement

- **Test-out** (M-test-out): three fresh probes per KC, confirmed by one more at least 7 days later. High assistance hurts learners with high prior knowledge, d = −0.428 (A · [dp row 9] [tetzlaff25]), so showing a KC is always an option. A passed test-out sets first learning, starts the KC in maintenance scheduling, and counts its probes toward relearning like any fresh events; the stage still signs off only through the Defence. A failed test-out changes only the schedule; the lessons were open anyway.
- **Placement "From kernelspace"** pre-credits only KCs that a kernelspace Evidence Pack evidences, and never logic, induction, TLA+ or isolation KCs (spine §2.1; W2-T16). Pre-credit sets first learning and puts the KC's test-out first in its schedule. No imported event counts toward sign-off, settled or VRK₃₀, which need statespace's own fresh events.

### 3.10 Scheduling inputs

Scheduling is FSRS at a target retention of 0.85–0.90 (A · [dp row 2] [latimier21][cepeda08]), fed by evidence as follows.

| Event | FSRS rating |
|---|---|
| fresh, `ok`, `guess` | Hard |
| fresh, `ok`, `think`, `sure` or no call | Good |
| fresh, miss | Again; a `sure` miss also schedules the sure-and-wrong returns (§5.7) |
| seen or assisted, `ok` | Hard at most: a low-weight event can bring a review closer, never push it later |
| seen or assisted, miss | Again |
| ungraded (`ok = null`) | no update |

Immediate confidence predicts retention worse than delayed judgments do (A · [dp row 7]), so calls adjust the rating only at the edges: a lucky guess is not treated as mastery, and a confident error comes back. The dose floor of §3.1 overrides FSRS whenever FSRS would wait longer (W1-T08's property test on a simulated 60-day calendar).

---

## 4. Generator families

### 4.1 The generator contract

| Rule | Detail | Held by |
|---|---|---|
| Purity | `make(seed, band)` reads no clock, no storage and no randomness beyond its seed. The same family, template, band, seed and `itemRev` give the same instance in Chromium, Firefox and WebKit (I3) | GATE-generators |
| Keys at grade time | the key is computed from the instance by the family's engine when the learner submits, never stored with the item. Two families differ only in where their engine runs: GEN-proof-structure replays Lean 4.35.0 elaboration recorded at build time, because no Lean runs in the tab (an embedded WASM Lean is reported at 137.5 MB and needs isolation {{run:RUN-lean-wasm}}); GEN-defend's checkers run on the Bench and return in a receipt | GATE-calls, GATE-replay, GATE-labs |
| Templates and bands | 2–4 structurally different templates per family, 47 in all, each with bands 1–3 set by operator count, quantifier alternation, trace length and process count | GATE-generators |
| Distractors | each applies one cataloged misconception to the key. The family's engine checks that it differs from the key and from every other option on at least one state, trace, world or history, and stores that witness for the option's "why". Each carries a misconception tag (Appendix A) | GATE-generators, GATE-items |
| `unknown` | an `unknown` while generating discards the seed and redraws deterministically; an `unknown` or budget stop while grading records `ok = null`. `unknown` is a key only in GEN-call-it's three-way template, built on SP-1.7's reason-stable construction: `x**y == 8, y > 1` gives `unknown`, "incomplete (theory arithmetic)", natively and in the tab [X RUN-z3-unknown-pow] | GATE-generators, GATE-calls |
| Answer languages | each template defines a small grammar inside its decidable fragment; an answer outside it comes back as "outside this item's language" and is not graded | GATE-generators |
| Witnesses, not models | a `sat` answer is graded by checking the witness, never by matching a model, because native and Pyodide witnesses differ [X RUN-z3-bv64-pyodide] | GATE-calls |
| Misconception matching | a wrong constructed answer is checked against the template's mutants; when it is equivalent to one, the feedback names that misconception and the event records its tag | GATE-items |
| Modes | practice: after each submission, the verdict, a distinguishing witness, the bound and the witness's class. Probe: one shot, all feedback after submission | GATE-lessons |
| Feedback layers | (1) verdict, witness, bound and basis, always; (2) the misconception note, open by default only in novice KCs; (3) a refutation card after two misses on one tag (M-layered-feedback, M-refutation-card) | GATE-items |
| Formalize progression | GEN-negate-it and GEN-spec-it serve each KC as pick, then fix, then write; two unseen successes move up a mode and two misses move down (V2-26) | GATE-generators |
| Band staircase | per KC and family, three correct fresh answers move up a band and one miss moves down [D, the fading staircase of spine §4]. Defence and settled probes use band 2, the stage standard [D] | scheduler property tests |
| Bounds printed | a verdict that rests on a scope, constant, depth or budget prints it in the feedback and records it with `engine@version` (I10) | GATE-stamps |

**Basis.** Structural variety rather than parameter variety, B/C · [dp row 27]: with one generator, later test-takers gained 13 points from earlier ones, against 2–3 points with pools of 2–4 structurally different problems [chen18]. Layered, elaborated feedback, A · [dp row 20] [vdkleij15]. Expertise reversal for the default layer, A · [dp row 9]. Class hints, B · [dp row 21]. Refutation cards, A in science and untested in logic · [dp row 26] [danielson24].

### 4.2 The families at a glance

| Family | Learner produces | Engine (key at grade time) | Fragment or bound | Templates | Stages · ships |
|---|---|---|---|---|---|
| GEN-negate-it | a violation query | Z3: equivalence of premises and of the negated property, plus a premise witness | QF_LIA; QF_BV at 16, 32 or 64 bits; finite account sorts, grounded | 4 | S1, S4, S7 · W1 |
| GEN-spec-it | a property, policy or postcondition | Z3 equivalence with a reference; requirement fit by scenarios | QF_LIA; policies inside a printed finite scope | 3 | S1, S4, S7 · W2 |
| GEN-wp-it | a weakest precondition | Z3 equivalence with the reference generator's WP; distinguishing state replayed | QF_LIA, loop-free commands | 3 | S4 · W3 |
| GEN-find-the-witness | a model, trace, history or state pair, then its class | the engine evaluates the witness; no stored key | ground evaluation; traces up to a printed length; serial-order search n ≤ 6–8 | 4 | S1–S9 · W1 (the lesson rows; spine §8.3 omits S2 and S4) |
| GEN-cti-or-bug | inductive, CTI or reachable | Z3 on initiation, consecution and safety; keys certified by a strengthening or a replayed trace | QF_LIA transition systems; reachable depth within a printed N | 3 | S4, S5, interleaved to S9 · W3 |
| GEN-trace-allowed | one satisfying and one violating trace | replay on the TLC state graph | finite graph at printed constants | 3 | S5, S7, S8 · W3 |
| GEN-lasso-or-not | a fair violating lasso, or "none" | the lasso validator over the TLC graph | finite graph; fair-cycle analysis | 2 | S5, S8 · W3 |
| GEN-anomaly-id | a history class | the history checker on histories recorded on PostgreSQL 18.6 [X RUN-pg-anomalies] | the recorded run; serial-order search n ≤ 6–8 | 4 | S6 · W4 |
| GEN-leaks-to-observer | a state pair the observer tells apart, or "none" | the paired-state evaluator | finite domains, scope printed | 3 | S7, S9 · W4 |
| GEN-call-it | a verdict and confidence, or true/false over about five scenarios | the scenario's engine | inherited from that engine | 4 | all · W1 |
| GEN-which-stamp | the stamp and qualifier for a raw output | the verdict→stamp deriver (§8) | exact | 3 | all · W1 |
| GEN-proof-structure | the next goal, a Proof Blocks order, or the needed hypothesis | Goal Replay strips; DAG check; hypothesis deletion at build time | pinned Lean 4.35.0 elaboration | 3 | S2, S3, S9 · W2 |
| GEN-defend | predictions about seeded mutations of the learner's own artifact | comparator, TLC, Z3 or cargo through `statespace defend` | per checker | 4 | S1–S10 · W2 |
| GEN-spot-the-gap | a gap class and typed evidence | the checker run on the mutated twin; evidence replayed | per anchor | 4 | all · W1 |

Worked examples below are illustrative instances; their seeds are made up, and any number that a tool produced cites its run. Where an example shows a state that tells two formulas apart, the state can be checked by hand; at generation the family's engine finds such states itself.

### 4.3 GEN-negate-it

**KCs.** KC-1.violation-as-sat, KC-1.quantifier-negation, KC-1.only-if-direction, KC-1.implication-vacuity and KC-1.non-vacuity-check in S1; KC-4.vc-shape in S4; KC-7.policy-checking in S7.

**Produces.** A violation query for a stated property. In pick mode the learner chooses among misconception mutants; in fix mode, repairs a near-miss; in write mode, writes the query in two parts: the premises (state, step and guard) and the negated property.

**Grader.** With reference parts `PreK` and `NegK` and the learner's `PreR` and `NegR`:

1. *Premises.* Z3 looks for a state in `PreK ∧ ¬PreR` and one in `PreR ∧ ¬PreK`. Either is a state the two premise sets disagree on.
2. *Non-vacuity.* Z3 must find a state satisfying `PreR`, which is shown as the premise witness. Premises that cannot hold make every violation query `unsat`, the vacuity trap (SP-1.6, {{run:RUN-z3-vacuous-unsat}}), so such an answer is wrong whatever its negation says.
3. *Negation, relative to the premises.* Z3 looks for a state in `PreK ∧ (NegR ⊕ NegK)`: a state that one query accepts and the other rejects.
4. The answer is correct when steps 1 and 3 find nothing and step 2 finds a witness. A distinguishing state is replayed in the pocket checker or the interpreter and narrated: "your query accepts this state, and the property holds in it".

Pick and fix modes supply the premises and run step 3 alone.

**Fragment.** Quantifier-free linear integer arithmetic over at most four variables; fixed-width bit-vectors at 16, 32 or 64 bits for encoding variants; quantified templates range over a finite account sort of two to four accounts and are grounded before checking. Every check is decidable, so there is no bound to print. Nonlinear terms are outside the item's language.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 single guard | 2 variables, 1 atom | 3 variables, 2–3 atoms, one ∧ or ∨ | 4 variables, 4–5 atoms, nesting depth 2 |
| t2 two-state (primed variables) | 2 state variables, 1 primed atom | 3 variables, 2 primed atoms, 1 frame conjunct | 4 variables, 3 primed atoms, 2 frame conjuncts |
| t3 quantified over accounts | 2 accounts, ∀ only | 3 accounts, one alternation | 4 accounts, two alternations |
| t4 English "only if" or "unless" | "only if", antecedent first | "only if" with the word order reversed, or "unless" | "not … unless", or "provided that" inside a negation |

**Distractor mutants.** Assert the property instead of its negation (`mis:sat-means-holds`); violate the converse (`mis:only-if-converse`); negate a biconditional (`mis:only-if-biconditional`); negate only the consequent, leaving an implication that a false antecedent satisfies (`mis:false-antecedent-irrelevant`); negate ∀ as ∀¬ (`mis:quantifier-negation`); shift a bound by one (`mis:invariant-bounds`); drop the guard from the premises (`mis:logic-slip-in-encoding`).

**Worked example.** GEN-negate-it · t4 · band 2 · pick · seed `0x7c1e09a4`. Primary KC: KC-1.only-if-direction.

> *Requirement:* "Only if the sender's balance covers the amount is a transfer allowed." *Variables:* `ok` (the transfer is allowed), `a` (sender balance), `x` (amount). *Which query, if `sat`, exhibits a violation?* Chance: 1 in 5.

| Option | Tag | A state that tells it from the key | Why |
|---|---|---|---|
| `ok ∧ a < x` | key | — | the requirement is `ok → a ≥ x`, and its violation is `ok ∧ ¬(a ≥ x)` |
| `a ≥ x ∧ ¬ok` | `mis:only-if-converse` | `ok`, a = 0, x = 1 | this violates the converse, "a transfer is allowed if the balance covers it"; the reversed word order invites it |
| `(ok ∧ a < x) ∨ (¬ok ∧ a ≥ x)` | `mis:only-if-biconditional` | `¬ok`, a = 5, x = 1 | this violates "allowed if and only if covered"; refusing a covered transfer breaks no "only if" |
| `ok → a ≥ x` | `mis:sat-means-holds` | `ok`, a = 5, x = 1 | this is the requirement itself, so a `sat` answer shows a state that satisfies it |
| `ok → a < x` | `mis:false-antecedent-irrelevant` | `¬ok`, a = 0, x = 0 | an implication holds whenever `ok` is false, so its `sat` answers prove nothing |

In practice mode a wrong choice shows its state, replays it against the requirement, and names the class of such states ("every refused transfer the balance would have covered"). The event is `kind: item`, `ref: gen:GEN-negate-it:t4:b2:0x7c1e09a4`, with `conf` as tapped.

**Basis.** Retrieval on application items, A · [dp row 1]. Equivalence grading with a distinguishing state as feedback, B−/C · [dp row 25] [wrenn19][prasad26]. "Only if" produced most biconditional-for-conditional errors, and reversed word order raised reversals, C · [dp §2, Stage 0]; English-to-formula translation is the harder direction, C · [dp §2, Stage 5].

### 4.4 GEN-spec-it

**KCs.** KC-1.only-if-direction and KC-1.two-state-property in S1; KC-4.frame-condition and KC-4.vc-shape in S4; KC-7.policy-as-datalog and KC-7.policy-checking in S7.

**Produces.** A specification from an English requirement (a property, a policy, or a postcondition with its frame) plus, for non-vacuity, a distinguishing request: one input the specification accepts and one it rejects.

**Grader.**

1. *Non-vacuity.* The engine evaluates the learner's specification on the two requests the learner supplied; it must accept one and reject the other, so neither `true` nor `false` can pass (`mis:no-distinguishing-request`).
2. *Equivalence.* Z3 looks for an input on which the learner's specification and the reference disagree, in both directions. One found is shown and replayed in the instrument that owns the domain: the interpreter for properties and postconditions, INS-datalog for policies.
3. *Requirement fit.* Equivalence is not intent [dp §3.2], so the item adds a multiple true/false block of about five concrete scenarios, each to be marked "the requirement permits it" or "forbids it". Each scenario's key is the reference evaluated on it, and CI checks that the reference agrees with the authored requirement verdict on every scenario template (GATE-calls). The block is its own `item` event on the requirement-reading KC.

**Fragment and bound.** Properties: QF_LIA or QF_BV. Postconditions with frames: a finite account sort, grounded. Policies: finite worlds inside a printed scope, for example "every world with at most 3 users, 2 teams and 3 documents". Equivalence inside the scope is exact, and the feedback prints the scope because the result says nothing beyond it (I10); S7.L3 teaches the small-scope claim as a hypothesis.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 property | 1–2 atoms | 3 atoms, one ∀ over accounts | 4 atoms, one alternation |
| t2 policy (bands size the reference; answers may always use stratified negation) | 1 rule over 2 relations; scope 3 users, 2 teams, 3 documents | 2 rules over 3 relations; same scope | 3 rules over 4 relations, one of them negated; scope 4, 3 and 4 |
| t3 postcondition with frame | 1 written field, 2 accounts | 2 written fields, 3 accounts | 3 written fields, 4 accounts, aliasing (`from = to`) present |

**Distractor mutants.** A subset test where an overlap was meant, vacuously true on an empty set (`mis:subset-for-overlap`); quantifiers at the set level instead of per principal (`mis:extra-quantifiers`); a missing frame conjunct (`mis:missing-frame`); an incomplete or over-strong condition (`mis:invariant-incomplete`); the converse of an "only if" (`mis:only-if-converse`).

**Worked example.** GEN-spec-it · t2 · band 2 · write · seed `0x19e4b7d0`. Primary KC: KC-7.policy-as-datalog.

> *Requirement:* "A user may read a document when they share at least one team with it, or when it is shared with them explicitly." *Scope:* every world with at most 3 users, 2 teams and 3 documents. *Language:* Datalog with stratified negation, which the tab engine evaluates (Z3's `Fixedpoint` handled stratified negation in the tab [X RUN-z3-fixedpoint]).
>
> *Reference:* `canRead(u, d) :- member(u, t), docTeam(d, t).` and `canRead(u, d) :- shared(d, u).`
>
> *A learner's answer,* which reads the requirement as "every team of the user is a team of the document": `gap(u, d) :- member(u, t), doc(d), !docTeam(d, t).`, then `canRead(u, d) :- user(u), doc(d), !gap(u, d).` and `canRead(u, d) :- shared(d, u).` The learner also supplies a granted request (u in t1 only; d in t1) and a denied one (u in t2 only; d in t1; nothing shared). Step 1 passes: the answer grants the first and denies the second.
>
> *Step 2* finds either of two worlds:
> - W1: u is in t1 and t2; d is in t1; nothing is shared. The reference grants (they share t1); the answer denies (t2 is not d's team).
> - W2: u is in no team; d is in t1; nothing is shared. The reference denies; the answer grants, because a user with no teams has no `gap` at all.
>
> *Feedback:* the world, both verdicts, the scope, and the tag `mis:subset-for-overlap`, whose "why" names both halves of the misconception: a subset where an overlap was meant, and vacuous truth on an empty set.

**Basis.** Hidden oracles with distinguishing scenarios cut invalid test suites from 29.7% to 9.3%, B−/C · [dp row 25] [wrenn19]. A policy accepted without a distinguishing request is cataloged at B−, and wrong operators are the top error in student specifications at C · [dp §2, Stage 7]. Multiple true/false exposes partial understanding, B/C · [dp row 27].

### 4.5 GEN-wp-it

**KCs.** KC-4.wp-assignment (threshold), KC-4.capture-avoiding-substitution, KC-4.wp-sequence-conditional.

**Produces.** The weakest precondition of a loop-free command for a postcondition: written in write mode, chosen in pick mode, or derived step by step on the Derivation Board (INS-derivation), where each step is one Z3 validity query.

**Grader.** The reference VC generator computes `wp(c, Q)` by backward substitution: `wp(x := e, Q) = Q[e/x]`; `wp(c1; c2, Q) = wp(c1, wp(c2, Q))`; one rule per guard reading (assume: `G → wp`; reject, which is what a `requires` means: `G ∧ wp`; if-then-else: `(G → wp1) ∧ (¬G → wp2)`). The weakest precondition is unique up to logical equivalence [dp §3.2], so Z3 checks the learner's formula against it in both directions. A state found in either direction is replayed by running the command from it in the interpreter: "from this state the postcondition fails, and your precondition admits it", or "from this state the postcondition holds, and your precondition excludes it". Variable capture shows up as a non-equivalence like any other error (SP-4.2, {{run:RUN-z3-capture}}).

**Fragment.** QF_LIA over loop-free commands; no bound.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 assignment | 1 assignment, 1-atom postcondition | 2–3-atom postcondition | a capture-prone variable name present |
| t2 sequence | 2 assignments that commute | 3 assignments, one non-commuting pair | 4 assignments, two non-commuting pairs |
| t3 guarded command | the assume reading | the reject reading (a `requires`) | if-then-else with one nested guard |

**Distractor mutants.** Substitution in execution order instead of backward (`mis:wp-substitution`); a sign flipped by forward reasoning (`mis:wp-substitution`); a variable left unsubstituted after it is assigned (`mis:wp-substitution`); a sufficient but stronger precondition (`mis:invariant-incomplete`); the assume reading where the reject reading was meant (`mis:partial-vs-total`).

**Worked example.** GEN-wp-it · t2 · band 2 · pick · seed `0x0b77f312`. Primary KC: KC-4.wp-assignment.

> *Command:* `a := a − x; b := b + x; ok := (a ≥ 0)`. *Postcondition:* `ok`. Chance: 1 in 4.
>
> *Key:* `a − x ≥ 0`. Substituting backward, `ok` becomes `a ≥ 0`; the assignment to `b` leaves that unchanged; the assignment to `a` turns it into `a − x ≥ 0`.

| Option | Tag | A state that tells it from the key | Replayed in the interpreter |
|---|---|---|---|
| `a − x ≥ 0` | key | — | — |
| `a ≥ 0` | `mis:wp-substitution` (execution order) | a = 0, x = 1 | `a` becomes −1 and `ok` false: the postcondition fails, yet this option admits the state. It checks the balance before the debit |
| `a + x ≥ 0` | `mis:wp-substitution` (forward reasoning) | a = 0, x = 1 | as above |
| `a − x ≥ 0 ∧ b + x ≥ 0` | `mis:invariant-incomplete` (stronger than needed) | a = 5, x = 1, b = −10 | `ok` becomes true: the postcondition holds, yet this option excludes the state. It is a precondition, not the weakest |

**Basis.** Equivalence grading suits an answer that is unique up to equivalence, D · [dp §3.2]. Correct worked examples first, then backward fading for this family (F3), A and B · [dp rows 10–12]. Backward or captured substitution and missing frames are cataloged with no learner study yet, D · [dp §2, Stage 4].

### 4.6 GEN-find-the-witness

**KCs.** KC-1.violation-as-sat, KC-1.witness-class and KC-1.encoding-is-the-claim (S1); KC-2.finite-map-update (S2); KC-3.small-step-stuck (S3); KC-4.trust-stack (S4); KC-5.interleaving-granularity (S5); KC-6.abstract-serializability (S6); KC-7.side-channels (S7); KC-8.crash-windows (S8); KC-9.bad-optimization (S9).

**Produces.** A witness, then its class. The witness is a model, a state, a trace, a serial order for a recorded history, or a pair of states. The class describes every witness like it: chosen among mutants, or written as a predicate at band 3.

**Grader.** There is no stored key; the engine evaluates the learner's witness.

- *Model or state:* the pocket checker (INS-pocket) or Z3 evaluates the premises and the negated property on the given values. Pocket checkers are a second semantics, so CI property-tests them against Z3 (GATE-conformance).
- *Trace:* every step must be an edge of the TLC state graph or a stuttering step, and the last state must violate the property (INS-theater, INS-spectacle).
- *History:* the learner gives a serial order that explains a Bench-recorded concurrent history, or answers "no serial order". An order is replayed through the reference interpreter and must reproduce every committed output; "no serial order" is checked by the abstract-serializability search over all orders, whose bound of n ≤ 6–8 transactions is printed (INS-history).
- *State pair:* the paired-state evaluator checks the relation the pair must satisfy (equal under R, or equal for the observer) and the claimed difference (INS-pairs).
- *Class:* Z3 checks each class option, or the written predicate, for equivalence with the projected violation set, the set of all inputs that violate.
- *Minimality,* when asked: the witness must also reach the optimum of a Z3 Optimize objective, which is how SP-1.1's minimal amount of 1 is defined [X RUN-z3-optimize-min].

**Fragment and bound.** Ground evaluation is decidable. Traces are bounded by the item's printed maximum length on a finite graph at printed constants, histories by the printed search bound, and state pairs by printed finite domains.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 model | Int, 1–2 atoms | BitVec 16 or 32, 3 atoms | BitVec 64, 4 atoms, minimality asked |
| t2 trace | 2 processes, shortest witness 2–4 actions | 2 processes, 5–6 actions | 3 processes, 7–10 actions |
| t3 history | 2 transactions | 3 transactions | 4 transactions |
| t4 state pair | 2 fields, domain of 2 | 3–4 fields, domain of 3 | 5 fields, domain of 4 |

**Class distractors.** "Only this exact value" (`mis:model-is-the-bug`); "only when the variable shown is at its boundary" (`mis:fix-instance-shown`); "none: the guard prevents it" (`mis:int-covers-i64`).

**Worked example.** GEN-find-the-witness · t1 · band 2 · write, then class · seed `0x3d8a5c21` (width 16 drawn from the seed). Primary KC: KC-1.encoding-is-the-claim.

> *Model:* signed 16-bit balances with `a ≥ 0` and `b ≥ 0`; guard `0 < x ∧ x ≤ a`; transfer `a′ = a − x`, `b′ = b + x`. *Find* an allowed transfer after which the recipient's balance is negative.
>
> *A learner's witness:* a = 1, b = 32767, x = 1. The checker evaluates it: the guard holds; `b + x` is 32768, which wraps to −32768 in signed 16-bit arithmetic; the violation holds. Correct. Any witness is accepted, because the checker never compares with a stored model; Z3's own models differ between engines (at 64 bits the native run found B = 9223372036850581504, X = 4194304 [X RUN-z3-bv64], and Pyodide found a different one [X RUN-z3-bv64-pyodide]).
>
> *Class:* "Which allowed transfers wrap the recipient?" Key: every one in which `b + x ≥ 2¹⁵` over the integers. Distractors: "only when `b = 32767`" (`mis:model-is-the-bug`); "only when `x = a`" (`mis:fix-instance-shown`); "none: the guard bounds `x`" (`mis:int-covers-i64`). Z3 checks each option against the projected violation set. The lesson is SP-1.4's at 64 bits: the guard protects the sender, not the recipient.

**Basis.** Minimize, then generalize: with minimal-only or maximal-only witnesses, learners abandoned them and many fixed only the case shown, C · [dp row 24]. Class hints rather than bare counterexamples, B · [dp row 21]. Keeping broken examples beside fixes, A/B · [dp row 43] [keith08].

### 4.7 GEN-cti-or-bug

**KCs.** KC-4.cti-or-bug and KC-4.invariant-vs-inductive (both threshold); KC-5.inductive-invariant-tla.

**Produces.** A verdict on a candidate invariant of a small transition system: "inductive"; "CTI: strengthen the invariant"; or "reachable: fix the command". At band 3 a CTI verdict also asks for a strengthening, and a reachable verdict for the trace.

**Grader and certified keys.** The learner works with the spine's procedure in the CTI workbench (M-cti-workbench): Z3 checks initiation `Init ⇒ Inv`, consecution `Inv ∧ Next ⇒ Inv′` and `Inv ⇒ Safe`; when consecution fails, a bounded reachability search runs from Init to the printed bound N. The generator certifies every key exactly, so no key rests on the bound [D]:

- *inductive:* initiation and consecution are `unsat`;
- *CTI:* consecution is `sat`, and the generator holds an inductive strengthening `Inv*` with `Inv* ⇒ Inv` (its initiation, consecution and implication all `unsat`), which proves that `Inv` holds in every reachable state although it is not inductive;
- *reachable:* a trace from Init to a violating state, at most N actions long, replays in the interpreter.

A seed whose instance yields none of the three certificates within budget is discarded. Reachable instances are generated with a shortest violation inside the workbench's N, so a learner who searches can find it. A learner's strengthening is graded by the same three checks.

**Fragment.** QF_LIA transition systems with 2–4 integer variables and 1–3 guarded commands.

**Templates and bands.**

| Template (key class) | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 inductive | 2 variables, 1 command | 3 variables, 2 commands | 4 variables, 3 commands |
| t2 CTI | 1 command; the strengthening adds 1 conjunct | 2 commands; 1 conjunct | 3 commands; 2 conjuncts; the strengthening asked |
| t3 reachable | violation at depth 1–2 | depth 3–4 | depth 5–6; the trace asked |

**Distractor verdicts.** "Reachable" on a CTI (`mis:cti-is-bug`); "inductive" on a true but non-inductive invariant (`mis:invariant-is-inductive`); "CTI" on a reachable bug because a search stopped early (`mis:no-error-is-proof`).

**Worked example: a CTI and its reachable twin.** GEN-cti-or-bug · t2 and t3 · band 2 · seed `0x6f40d1b9` (T = 100 drawn from the seed). Primary KC: KC-4.cti-or-bug. The pair is a generated variant of SP-4.3 ({{run:RUN-z3-cti-pair}}).

> *State:* balances `a`, `b` and a pending amount `p`. *Init:* `a = 100, b = 0, p = 0`. *Debit(x):* guard `p = 0 ∧ 0 < x ≤ a`; `a′ = a − x`, `p′ = x`. *Credit:* guard `p > 0`; `b′ = b + p`, `p′ = 0`. *Inv:* `a + b ≤ 100`.
>
> *Consecution fails:* from `(a, b, p) = (100, 0, 1)`, which satisfies `Inv`, Credit reaches `(100, 1, 0)`, where `a + b = 101`.
>
> *Key: CTI.* Every reachable state satisfies `a + b + p = 100` and `p ≥ 0`, so `(100, 0, 1)` is unreachable. The certificate adds one conjunct, `Inv* = Inv ∧ a + b + p ≤ 100`: it holds at Init (100 ≤ 100); Debit leaves `a + b + p` unchanged and lowers `a + b`; Credit moves `p` into `b`, so `a + b` becomes the old `a + b + p`, which was at most 100; and `Inv*` implies `Inv`. The fix is to strengthen the invariant, not to change a command.
>
> *Twin, key: reachable.* Change Credit so that it leaves `p` uncleared (`b′ = b + p`, `p′ = p`). Then Init, Debit(1), Credit, Credit reaches `(99, 2, 1)`, where `a + b = 101`: reachable in 3 actions. The fix is the command.

Both verdicts are arithmetic a reader can check; at grade time Z3 and the interpreter recompute them.

**Basis.** Contrasting cases, with the principle stated after the comparison, A · [dp row 15] [alfieri13]. At least four CTI items interleaved through S9, D · [dp §6]. Reading a counterexample to induction as a reachable bug is cataloged without a learner study, D · [dp §2, Stage 4], as is equating an invariant with an inductive invariant, D · [dp §2, Stage 0].

### 4.8 GEN-trace-allowed

**KCs.** KC-5.behaviors-stuttering, KC-5.interleaving-granularity, KC-5.holds-lifecycle, KC-5.safety-vs-liveness (safety prefixes), KC-7.revocation-past, KC-8.outbox-chain, KC-8.crash-windows.

**Produces.** One behavior prefix that satisfies a safety property and one that violates it; in the enabled-actions template, the set of actions enabled in a given state; in the stuttering template, a judgment on whether a given sequence is a behavior of the spec.

**Grader.** The oracle is the spec's TLC state graph at the item's constants, computed in CI for authored families and by Spectacle in the tab for learner edits up to about 5k states (spine §9.1). A prefix is allowed when its first state is initial and each consecutive pair is an edge or a stuttering step; it satisfies or violates the property according to the property's evaluator on its states and steps. A satisfying prefix extends by stuttering to a satisfying behavior, which is why one finite prefix suffices. Lengths are reported in actions, never in states (SP-5.2's lesson).

**Fragment and bound.** A finite graph from complete exploration at printed constants. TLC runs with `-workers 1` [X RUN-tlc-rtw3], which the spine requires for minimal traces (spine §9.2), and with its deadlock flag stated in the argv [X RUN-tlc-doublespend].

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 safety prefix | 2 processes, violation within 4 actions | 2 processes, 5–6 actions | 3 processes, 7–8 actions |
| t2 enabled actions | 2–3 actions | 4 actions | 5 actions, one guarded by a local variable |
| t3 stuttering | no repeated states | 1 repeated state | 2, one of them at the end |

**Distractor mutants** (judgment templates). Counting states as the length (`mis:states-vs-actions`); assuming steps happen in program order across processes (`mis:sequential-consistency`); an implicit "always" (`mis:implicit-always-eventually`); rejecting a repeated state as "not a step" (`mis:stuttering-not-a-step`, uncataloged and logged through calls).

**Worked example.** GEN-trace-allowed · t1 · band 1 · write. Shown at the recorded constants so that every number is a recorded run; live instances vary `Init`, `Amount` (keeping `Amount ≤ Init < 2 · Amount`) and the worker count. Primary KC: KC-5.interleaving-granularity.

> *Spec:* DoubleSpend with `Init = 100`, `Amount = 80` and `Workers = {w1, w2}`. Each worker reads the balance, then in a separate step writes its read value minus `Amount`; a worker that reads less than `Amount` stops. *Property:* `NoOverspend == spent <= Init`. *Give* one violating prefix and one that never violates, with lengths in actions.
>
> *Violating:* Read(w1), Read(w2), Write(w1), Write(w2): 4 actions, 5 states, ending with `spent = 160` [X RUN-tlc-doublespend]. *Never violating:* Read(w1), Write(w1), Read(w2); w2 reads 20 and stops, and the prefix extends by stuttering. The grader replays both on the graph, whose full reachable space has 11 distinct states [X RUN-tlc-full].

**Basis.** Temporal items ask for one satisfying and one violating trace [dp §2, rules]. A prediction before the run, A · [dp row 5] [sthilaire23]. Counting trace length in states rather than actions is cataloged for Stage 5 and confirmed by a run [dp §2, Stage 5].

### 4.9 GEN-lasso-or-not

**KCs.** KC-5.fairness (threshold), KC-5.lasso-reading, KC-5.safety-vs-liveness, KC-8.progress-needs-recovery.

**Produces.** A lasso that violates a liveness property under the stated fairness (a stem from an initial state and a cycle back to a state on it), or "none".

**Grader.** The lasso validator (INS-lasso) checks, on the TLC graph, that the stem starts in an initial state and follows edges; that the cycle follows edges back to its first state; that the property fails on the infinite behavior stem·cycle^ω (for `<>P`, no state satisfies P; for `[]<>P`, no cycle state does; for `P ~> Q`, a P-state on the cycle is never followed by Q); and that the lasso is fair: under `WF(A)`, if A is enabled in every cycle state then A occurs in the cycle; under `SF(A)`, if A is enabled in some cycle state then A occurs in the cycle. "None" is checked exactly: a fair violating lasso exists if and only if a reachable strongly connected component admits a fair cycle on which the property fails, which the validator decides on the finite graph. The validator is tested against TLC's liveness results on fixtures (GATE-conformance), and its JSON input awaits W0-S05 ({{run:RUN-tlc-lasso-json}}).

**Fragment and bound.** A finite graph at printed constants; exact.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 starving (a fair violating lasso exists) | a cycle of 1–2 actions, no fairness | 2–4 actions, weak fairness on some actions | weak and strong fairness mixed, a cycle of 4 |
| t2 fair cycle (key "none") | one strong-fairness condition removes the cycle | two conditions | a weak-fairness condition that looks sufficient and is not, beside one that is |

**Distractor mutants** (the "which fairness makes it hold" judgment). Weak fairness on an action that is only intermittently enabled (`mis:weak-fairness-suffices`, uncataloged, confusable set E); liveness checked with crash actions switched off (`mis:liveness-crashes-off`); an eager "eventually" (`mis:eager-eventually`); an implicit "always" (`mis:implicit-always-eventually`).

**Worked example.** GEN-lasso-or-not · t1 · band 2 · write, on the recorded Hold spec. Primary KC: KC-5.fairness.

> *Spec:* a hold the worker keeps trying to capture: Try (held → pending), Busy (pending → held), Capture (pending → captured), Timeout (held → released). *Fairness:* `WF(Try) ∧ WF(Busy)`. *Property:* `EventuallyResolves`, that the hold eventually reaches captured or released.
>
> *Key: a lasso exists.* TLC's counterexample is Try, Busy, Try, then Busy back to the initial state [X RUN-tlc-hold-lasso]. It is fair: Try and Busy both occur in the cycle, while Capture and Timeout are each enabled in only some cycle states, so weak fairness on either would not force it.
>
> *Seeded variants of the same spec:* with `WF(Capture)` added, the lasso stays fair and the key stays "a lasso exists", which is the weak-versus-strong discrimination the template targets; with `SF(Capture)`, the cycle is unfair, because Capture is enabled infinitely often and never taken, and the key becomes "none". The validator computes these keys at grade time from the finite graph; they are not recorded TLC verdicts.

**Basis.** An implicit "always" or "eventually" accounted for 28.68% of wrong answers in the LTL Tutor, C · [dp §2, Stage 5]; swapping safety and liveness and misjudging fairness have no learner study yet [dp §2, Stage 5]. Asking for a trace rather than a definition follows the catalog's rule for temporal items [dp §2, rules].

### 4.10 GEN-anomaly-id

**KCs.** KC-6.anomaly-isolation (threshold), KC-6.compilation-pattern, KC-6.serializable-retries.

**Produces.** The class of a recorded concurrent history: lost update, write skew, read skew, serialization failure (SQLSTATE 40001), deadlock (40P01) or no anomaly; both SQLSTATEs are recorded outcomes on PostgreSQL 18.6 [X RUN-pg-claims].

**Grader.** The history checker (INS-history), run on histories recorded on PostgreSQL 18.6 by `statespace isorun` [X RUN-pg-anomalies]. SQLSTATE outcomes are read from the recording. Anomaly classes are computed: the abstract-serializability search asks whether some serial order of the committed transactions, replayed through the reference semantics, reproduces every committed output; if none does, the shape of the dependency cycle names the class (two writers of one row: lost update; two transactions each writing what the other read: write skew; one reader seeing two versions: read skew). Stems always name the compilation pattern and the isolation level, never the level alone (spine §3.6).

**Fragment and bound.** The classification is exact for the recorded run and says nothing about other runs, which is why S6's claims are [T]. The serial-order search is bounded at n ≤ 6–8 transactions, and the bound is printed.

**Instance supply.** The tab cannot run concurrent PostgreSQL, because PGlite serializes two sessions [X RUN-pglite], and a history with altered numbers would be an unrun fact (GATE-numbers). Instances are therefore drawn only from recorded histories: the rows of RUN-pg-anomalies and RUN-pg-claims today, and the isolation catalog that W0-S09 records ({{run:RUN-pg-catalog}}). The seed varies presentation only (account and table names, display order). The size of the recorded pool bounds how long this family can stay unseen (Spine issues).

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 read-modify-write | 2 transactions, READ COMMITTED against REPEATABLE READ | beside its conditional-UPDATE twin | 3 transactions |
| t2 write skew | the team-sum variant | the holds variant | across all three isolation levels |
| t3 read skew | 2 transactions | 3 transactions | mixed isolation levels |
| t4 serialization failure or deadlock | 40001 | 40P01 | which SQLSTATEs a retry policy should retry |

**Distractor mutants.** The isolation level alone is taken to decide the outcome (`mis:isolation-names-anomaly`); REPEATABLE READ is taken to prevent every anomaly (`mis:repeatable-read-prevents-all`); write skew labeled as a lost update (`mis:write-skew-as-lost-update`, uncataloged, confusable set D); retries assumed always to terminate (`mis:retries-terminate-tests-prove`).

**Worked example.** GEN-anomaly-id · t2 · band 2 · pick · a recorded history. Primary KC: KC-6.anomaly-isolation. Chance: 1 in 6.

> *History:* holds compiled as predicate-read-then-insert, at REPEATABLE READ on PostgreSQL 18.6. Two sessions each read 100 available, each insert a hold, and both commit; 160 is held against a balance of 100 [X RUN-pg-claims].
>
> *Options:* lost update · write skew (key) · read skew · serialization failure (40001) · deadlock (40P01) · no anomaly.
>
> *Key: write skew.* Neither serial order reproduces the outputs: whichever session ran second would have read 20 available and could not have placed its hold. Each session wrote what the other had read. "No anomaly" carries `mis:repeatable-read-prevents-all`; "lost update" carries `mis:write-skew-as-lost-update`; "serialization failure" carries `mis:isolation-names-anomaly`, because it is the SERIALIZABLE outcome of the same pattern, where the second commit fails with 40001 and 80 stays held [X RUN-pg-claims].

**Basis.** Each isolation misconception in the catalog is reproduced by an executed run [dp §2, Stage 6]. Interleaving inside confusable set D after the exit item, A · [dp row 4].

### 4.11 GEN-leaks-to-observer

**KCs.** KC-7.hyperproperty, KC-7.observer-equivalence (threshold), KC-7.enforcement-vs-ni (threshold), KC-7.side-channels, KC-7.declassification; KC-9.observations in S9.

**Produces.** Two states that differ only in data the observer may not see, and that the observer can tell apart after the command or view runs; or "none".

**Grader.** The paired-state evaluator (INS-pairs), over the reference interpreter, checks low-equivalence (the two states agree on everything the observer may know: its own tenant's data and the declassified fields) and distinguishability (the observation function, which includes the response body and, by template, counts, sizes or aborts, gives different results). "None" is checked by self-composition in Z3 over the finite-domain encoding, `lowEq(s1, s2) ∧ obs(c(s1)) ≠ obs(c(s2))` being `unsat` inside the printed scope, and is cross-checked by enumeration in CI.

**Fragment and bound.** Finite domains: 2–3 tenants, up to 4 documents and small value ranges; the scope is printed with every verdict.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 field leak | 2 tenants, 2 fields | 3 fields, one declassified | 5 fields, two declassified |
| t2 count channel | a count over one table | a count filtered by team | a count after a revocation |
| t3 size or abort observer | the response size | an abort the observer sees | size and abort together |

**Distractor mutants.** "Every read passed the access check, so nothing leaks" (`mis:enforcement-is-ni`); an observer that ignores aborts (`mis:observer-ignores-aborts`); "the observer sees only the response body", SEAM-10's assumption read as a fact (`mis:observer-body-only`); a pair that differs in the observer's own data and so is not low-equivalent (`mis:pair-not-low-equivalent`).

**Worked example.** GEN-leaks-to-observer · t1 · band 1 · write · seed `0x52aa0e6c`. Primary KC: KC-7.observer-equivalence.

> *World:* tenants A and B; document d belongs to B and is shared with user u of tenant A. *View:* `GET /doc/d` returns `{title, body, note}`, where `note` is private to B and not declassified. *Observer:* u, who sees the response body.
>
> *A learner's pair:* s1 and s2 are identical except that `d.note` is "n1" in s1 and "n2" in s2. Low-equivalent for u: yes, since u may see `title` and `body`, which are equal. Distinguishable: yes, the two responses differ in `note`. The pair is a valid witness: the view leaks `note` although every read passed the sharing check, the gap between enforcement and noninterference (SP-7.1, {{run:RUN-z3-leaky-field}}).
>
> *The "none" variant:* the same view projecting only `{title, body}`. Self-composition finds no pair inside the scope, and the key is "none, within the printed scope".

**Basis.** Mistaking enforcement for noninterference and observers that ignore aborts are cataloged without a learner study, D · [dp §2, Stages 7 and 9–10]. A leaking view beside its projected twin is a contrasting case, A · [dp row 15].

### 4.12 GEN-call-it

**KCs.** Every stage's verdict KCs; above all KC-1.three-answers, KC-1.unknown-fails-closed, KC-2.theorem-statement-reading, KC-3.progress-preservation-scope, KC-5.tlc-flags-matter, KC-8.commit-not-send and KC-9.three-claims.

**Produces.** A verdict and a confidence for a run that has not happened yet; or true/false judgments over about five scenarios, with one confidence for the set.

**Grader.** The scenario's own engine computes the key at grade time: Z3 for `sat`, `unsat` and `unknown`; the TLC graph's shortest path, in actions, for trace length; a recorded history for which anomaly. In the multiple true/false template every statement is generated together with a formal reading, and Z3 checks the reading against the reference proposition: equivalent means "a true restatement". For statements about Lean theorems the readings come from templates whose verdicts Lean establishes at build time (true readings proved equivalent, false ones refuted by a `decide`-checked counterexample), kept current by GATE-replay [D]. An item is correct when every judgment is right; per-statement results are kept for misconception analysis.

**Fragment and bound.** Inherited from the engine; a trace-length interval is computed on a complete graph at printed constants.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 three-way verdict | 1–2 atoms; `sat` or `unsat` | 3–4 atoms and an encoding change | the reason-stable `unknown` construction among the keys |
| t2 trace length as an interval | intervals of 1–3, 4–6 and 7 or more actions | narrower intervals | three processes |
| t3 which anomaly | 2 patterns | 3 patterns | 4 patterns, mixed levels |
| t4 multiple true/false | 4 statements | 5 statements | 6 statements, two of them quantifier swaps |

Each multiple true/false item has between 1 and m − 1 true statements, so "all true" and "all false" always score 0.

**Distractor mutants.** Reading `sat` as "holds" (`mis:sat-means-holds`); reading `unknown` or a timeout as "no bug" (`mis:unknown-means-safe`); counting states for length (`mis:states-vs-actions`); dropping a hypothesis from a restatement (`mis:cannot-state-theorem`); stating the converse (`mis:only-if-converse`); swapping ∀ for ∃ (`mis:quantifier-unpacking`).

**Worked example.** GEN-call-it · t4 · band 2 · seed `0x44c3a8f2`. Primary KC: KC-2.theorem-statement-reading.

> *Theorem*, proved on core Lean 4.35.0 [X RUN-lean-ledger]: `transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) : 0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b`, where `transfer` moves `n` from `a` to `b` and leaves the ledger unchanged unless `0 ≤ n ≤ a`. *Which sentences say exactly what it proves?* Chance for the set: 1 in 32.

| Sentence | Key | Tag | Why |
|---|---|---|---|
| If both balances start non-negative, then for any amount both are non-negative after the transfer | true | — | it names both hypotheses and both conclusions |
| Both balances are non-negative after any transfer | false | `mis:cannot-state-theorem` | it drops `ha` and `hb`: from a = −5, b = 0, n = 1 the transfer is refused and `a` stays −5 |
| If both balances are non-negative after a transfer, they were non-negative before | false | `mis:only-if-converse` | the converse is not the theorem, and it is false: a = 1, b = −1, n = 1 ends at 0 and 0 |
| For every amount, a ledger whose balances are at least zero still has both at least zero after transferring that amount | true | — | a paraphrase with the same hypotheses and conclusions |
| If both balances start non-negative, there is some amount after whose transfer both are non-negative | false | `mis:quantifier-unpacking` | ∃ for ∀: true of `transfer` (an amount of 0 qualifies) but much weaker than the theorem |

Z3 decides each reading against the theorem's proposition, rendered from the pinned definitions; `transfer` is linear, with one if-then-else. The learner taps one confidence for the set, and the band printed on "sure" (above 80%) sits beside a chance of 1 in 32.

**Basis.** Multiple true/false shows that nearly half of correct multiple-choice answerers misjudge the other options, B/C · [dp row 27]. A call before each run, A · [dp row 5] [sthilaire23]. Not being able to say what a theorem proves is cataloged at C · [dp §2, Stage 2]. Proof-comprehension facets as item types, C · [dp row 32].

### 4.13 GEN-which-stamp

**KCs.** Confusable set A: KC-1.three-answers, KC-1.unknown-fails-closed, KC-2.axioms-and-trust, KC-5.bounded-scope, KC-6.differential-testing; also KC-4.trust-stack and KC-9.tcb.

**Produces.** The stamp and qualifier that a raw tool output earns; or a qualifier's missing field; or which segment of a claim's strip (proposition-of-model, correspondence, requirement-fit) an output bears on.

**Grader.** The verdict→stamp deriver of §8, the same code GATE-stamps uses to stamp receipts, applied to the parsed raw output. One implementation keys both the items and the course's own stamps, so the two cannot drift apart.

**Fragment and bound.** Exact: a parse and a table lookup.

**Instance supply.** Raw outputs come from the runs registry: the verdict lines of executed runs, by run id. The seed chooses the run, the question template and the option order. Numbers are never altered, because an altered output would be an unrun fact.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 raw output → stamp | Z3 `sat` or `unsat` | Lean axiom lists; complete TLC runs | TLC stops, `unknown (canceled)`, "results match" on one database |
| t2 complete the qualifier | one missing field | two | the bound, the checker and the version |
| t3 which strip segment | proposition against requirement | correspondence | all three, with an erosion |

**Distractor mutants.** A bounded or stopped check stamped PROVED (`mis:test-as-proof`); "no error found" read as complete (`mis:no-error-is-proof`); a deadlock stop read as a finished check (`mis:default-flags-deadlock`); kernel acceptance read as the requirement met (`mis:kernel-means-requirement`); any axiom read as unsound (`mis:axiom-means-unsound`); many passing runs read as proof (`mis:empirical-conviction`).

**Worked example.** GEN-which-stamp · t1 · band 3 · pick · a recorded run. Primary KC: KC-5.bounded-scope. Chance: 1 in 5.

> *Raw output:* TLC 1.8.0 on DoubleSpend with `Init = 100`, `Amount = 80` and two workers, default flags, invariant `NoOverspend`; the spec is meant to terminate. The run prints "Error: Deadlock reached." and "11 states generated, 10 distinct states found, 3 states left on queue." [X RUN-tlc-doublespend]

| Option | Tag | Why |
|---|---|---|
| [?] · stopped at deadlock, 10 distinct states | key | TLC stopped before exploring every reachable state; the invariant was checked only on the states explored (§8) |
| [M] · constants · complete | `mis:no-error-is-proof` | the run did not complete: 3 states were left on the queue |
| [M] · bound · partial | `mis:default-flags-deadlock` | a deadlock stop is not a declared bound or state constraint |
| [R] · deadlock reached | `mis:default-flags-deadlock` | this "deadlock" is the spec terminating; [R] needs a violation of `NoOverspend`, which this run never reached |
| [P] · TLC 1.8.0 | `mis:test-as-proof` | a model-checking run is never [P] |

A band 3 follow-up shows the same spec with `-deadlock`, which reports the `NoOverspend` violation at 11 distinct states with a 4-action trace [X RUN-tlc-doublespend], and asks for its stamp: [R] · 4 actions.

**Basis.** Interleaving inside confusable set A, A · [dp row 4]. Stamps that name their checker and bound follow V2-10, D. The misconceptions are cataloged: conviction from authority or many passing runs at C · [dp §2, Stage 0]; default flags and "no error" read as proof, confirmed by runs · [dp §2, Stage 5].

### 4.14 GEN-proof-structure

**KCs.** KC-2.proof-reading, KC-2.props-as-types, KC-2.goal-state-reading, KC-2.induction-principle and KC-2.generalized-ih (threshold) in S2; KC-3.typing-judgment and KC-3.step-invariant in S3; KC-9.stack-machine-correctness, KC-9.forward-simulation (threshold) and KC-9.preservation-proof in S9.

**Produces.** The goal a tactic produces next (chosen among goals); an order for a proof's steps (Proof Blocks, with one or two distractor blocks); or the hypothesis a step needs.

**Grader.** Instances come from a corpus of proofs elaborated at build time on Lean 4.35.0. Goal Replay strips record each tactic's goal through `$/lean/plainGoal` ({{run:RUN-lean-plaingoal}}), deterministically per toolchain ({{run:RUN-replay-gen}}). *Next goal:* the key is the recorded goal. *Proof Blocks:* the build records each step's dependencies; any order that respects the dependency DAG is accepted, and distractor blocks must be left out (M-proof-blocks). *Needed hypothesis:* at build time each candidate hypothesis is deleted in turn and the proof re-elaborated; the key is the one whose deletion breaks the step. GATE-replay regenerates the strips on the pinned toolchain and fails if they differ from the committed ones.

**Fragment and bound.** Exact for the pinned toolchain; a toolchain bump regenerates every key.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 next goal | proofs of 3–5 steps | 6–9 steps, one case split | 10 or more steps, nested cases |
| t2 Proof Blocks | 5 blocks, 1 distractor | 7 blocks, 1 distractor | 9 blocks, 2 distractors, one a circular use of the hypothesis |
| t3 needed hypothesis | 2 candidates | 3 candidates | 4 candidates, one of them the ungeneralized hypothesis |

**Distractor mutants.** The hypothesis for the original state only (`mis:ih-not-generalized`); using the theorem being proved (`mis:circular-step`); "automation closes it" (`mis:automation-closes-taught-step`); a block that uses the hypothesis before the case split (`mis:circular-step`).

**Worked example.** GEN-proof-structure · t3 · band 3 · pick · seed `0x2b9d0c11`. Primary KC: KC-2.generalized-ih (fading family F1).

> *Proof*, on core Lean 4.35.0 [X RUN-lean-ledger]:
> `theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := by induction ns generalizing s with | nil => rfl | cons n ns ih => simp [run, ih, transfer_conserves]`.
> *Which hypothesis does the `cons` case need?* Chance: 1 in 4.

| Option | Tag | Why |
|---|---|---|
| `ih`, the hypothesis for every state, used at the state `transfer s n` | key | `run s (n :: ns)` unfolds to `run (transfer s n) ns`, so the hypothesis must apply to a state other than `s`, which `generalizing s` provides |
| the hypothesis for the original `s` only | `mis:ih-not-generalized` | without `generalizing s` the step cannot be proved (SP-2.3, {{run:RUN-lean-ih-ungeneralised}}) |
| `run_conserves` itself | `mis:circular-step` | a proof cannot use the theorem it proves |
| none: `simp` closes the case unaided | `mis:automation-closes-taught-step` | the goal mentions `run (transfer s n) ns`, which only the hypothesis speaks about; `transfer_conserves` covers one transfer |

The key comes from deleting each candidate from the `cons` case at build time and re-elaborating; it is never authored by hand.

**Basis.** Proof Blocks after reading matched the alternative at one week in 11.1 against 43.4 minutes, B · [dp row 14] [poulsen23]. Correct worked examples first, then backward fading with no prompts on completion blanks, A and B · [dp rows 10–12]. The ungeneralized hypothesis is cataloged and confirmed by a run [dp §2, Stage 2].

### 4.15 GEN-defend

**KCs.** The stage's KCs that the mutated artifact exercises: for example KC-1.encoding-is-the-claim and KC-1.non-vacuity-check (S1), KC-2.axioms-and-trust and KC-2.generalized-ih (S2), KC-5.fairness (S5), KC-7.observer-equivalence (S7).

**Produces.** For each of 4–6 seeded mutations of the learner's own lab artifact, a prediction made with the agent closed: the verdict ("passes `statespace check`", "builds, and `statespace check` rejects it", or "does not build or elaborate"), the locus when it fails (which theorem, goal, check, invariant or state), and a confidence.

**Grader.** `statespace defend` seeds the mutations on the Bench, runs the stage's checker (comparator for Lean, TLC for specs, Z3 for queries, cargo for Rust) and writes a receipt whose verdict lines are parsed, never trusted from an exit code alone (spine §9.4). The tab grades each prediction against the receipt: correct when the verdict matches and, for a mutant that fails, the locus matches. Every mutant elaborates or builds, or its key says that it fails to (GATE-labs).

**Fragment and bound.** Per checker: comparator is exact; TLC is bounded by the spec's printed constants; Z3 runs under an `rlimit` [X RUN-z3-budget-pyodide], and an `unknown` leaves the mutant ungraded; cargo tests report n.

**Templates and bands.** The spine names four templates (§8.3); the stages' Defence lines name operators that fall outside those names, so this document reads each template broadly enough to hold every listed operator while keeping GATE-generators' cap of four (Spine issues).

| Template | Operators, from the stages' Defence lines |
|---|---|
| t1 drop or weaken a hypothesis or statement | drop `amount ≤ balance`; drop `generalizing s`; weaken a statement under the same name; weaken the invariant |
| t2 weaken a guard or a check | `≤` to `<`; drop a conjunct of the refund rule; reverse a guard; drop the rowcount check; drop reply validation; drop `FORCE` |
| t3 change the encoding or the trusted base | ℤ → ℕ; Int → BitVec 64; drop `amount > 0` under BitVec 64; `decide` → `native_decide` on a closed goal |
| t4 change concurrency, the environment or the observer | split the atomic action; drop weak fairness; add a duplicate-reply action; a READ COMMITTED pool; retry only 40001; switch crash actions off; widen the observer; make aborts unobservable |

Bands apply to every template: band 1 asks for the verdict, band 2 adds the locus, and band 3 adds the first failing goal or state, or pairs the mutant with a second, interacting one.

**Distractor mutants.** The answer set is fixed (the three verdicts and the receipt's loci), so there are no options to mutate. A wrong prediction is tagged with the misconception its mutation targets: `mis:ih-not-generalized` for dropping `generalizing s`, `mis:empirical-conviction` for predicting that a green build with a native axiom passes the check, `mis:int-covers-i64` for an encoding change predicted harmless.

**Worked example.** GEN-defend · S2 Defence Part B · the learner's LAB-2 artifact. Primary KC: KC-2.axioms-and-trust.

> *Mutant 3 (t3, a change to the trusted base):* replace `decide` with `native_decide` in the closed goal that exhibits the self-transfer mint (SP-2.1's `xferBuggy … = 15`) in LAB-2.6. *Key, from the receipt:* the build passes; `#print axioms` lists an axiom of the form `<declaration>._native.native_decide.ax_1_1`; `statespace check` rejects it as not permitted by `comparator.json` [X RUN-lean-axioms]. Predicting "does not build" misses the verdict; predicting "passes `statespace check`" misses it too and carries `mis:empirical-conviction`.
>
> *Mutant 1 (t1):* drop `generalizing s` from `run_conserves`. *Key:* the `cons` case fails to elaborate (`mis:ih-not-generalized`; SP-2.3, {{run:RUN-lean-ih-ungeneralised}}).
>
> The `native_decide` mutant is applied only to closed, decidable goals; on the universally quantified ledger goals it would not elaborate (spine §3.2).

**Basis.** Predicting mutation effects on one's own artifact has face validity and no outcome data, C/D · [dp §3.5]. Predicting before running, A · [dp row 5]. The mutation operators are the pedagogy digest's: drop a hypothesis, weaken a guard, ℤ → ℕ or BitVec 64, split an atomic action, drop weak fairness, widen the observer [dp §3.5].

### 4.16 GEN-spot-the-gap

**KCs.** KC-4.trust-stack (threshold), KC-2.kernel-not-requirement (threshold), KC-10.agent-proposal-triage, and each anchor's stage KCs (confusable set C).

**Produces.** For a generated audit variant, the Audit Desk's five steps (spine §6): a call on the statement alone; the diff revealed; "This proves: ___" (uncredited prose); a gap class, with no default and "none: sound" offered; typed evidence anchored to lines.

**Grader.** Each variant comes from an anchor's sound twin by one gap-class mutation operator (spine §6.2, Variants). Its key is set by running the anchor's checker on the mutated twin: the class or classes the operator produces (keys are multi-label, with an acceptable set) and the evidence that certifies them. A finding is correct when its class is in the acceptable set and its typed evidence validates mechanically:

| Evidence type | Validated by |
|---|---|
| a witness or trace | replay in Z3, the interpreter or the TLC graph |
| the offending declaration | the anchored line matched against the checker's output, for example its `#print axioms` line |
| mismatched identifiers | a match against comparator's verdict |
| paired states | INS-pairs |
| a scenario the theorem permits and the requirement forbids | the statement evaluated on the scenario, against the requirement's authored verdict |

A sound case is correct when "none: sound" is chosen. Each session draws its sound share from a seed in the 30–60% range (spine §6).

**Fragment and bound.** The anchor checker's; a bounded checker's bound is printed on the case.

**Templates and bands.**

| Template | Band 1 | Band 2 | Band 3 |
|---|---|---|---|
| t1 rebutting (G1, G2, G3, G12) | one-line statements | statements with two hypotheses | a requirement scenario needed as evidence |
| t2 undermining (G4, G5, G6, G7, G11) | an axiom or verdict line | an encoding change | an environment assumption hidden in fairness or configuration |
| t3 undercutting (G8, G9, G10, G13) | mismatched identifiers | an observer that is too weak | a CTI "fixed" by changing correct code |
| t4 sound | the anchor's sound twin | a sound variant with a harmless change | a sound case from an earlier stage, interleaved |

**Distractor classes.** Every class is always offered, so the misconception lies in the choice. GATE-audit-blind guards the shortcuts: always reject, always accept, "the last case is sound", and "the class is the topic just taught" (§7.3).

**Worked example.** GEN-spot-the-gap · t1 · band 1 · a variant of AUD-1.1 made by the operator "add a contradictory hypothesis" · seed `0x0009b21f`. Primary KC: KC-1.non-vacuity-check.

> *Statement alone:* "The guarded transfer never overdraws the sender: Z3 returns `unsat`." The learner calls it sound or flawed, with a confidence.
>
> *Diff revealed:* the query's premises are `a ≥ 0`, `x > 0`, `x ≤ a` and, on a later line, `a < x`, followed by the violation `a − x < 0`.
>
> *Key:* G2, vacuous premise. *Evidence:* the learner anchors the lines `x ≤ a` and `a < x`; the grader asks Z3 whether the anchored premises can hold together. They cannot (no integers satisfy both), so the evidence validates. Choosing G4 or G5 is a miss, and so is G2 anchored to lines that can hold together. The sound twin, the same claim without the contradictory line and with a premise witness shown, is keyed "none: sound".

**Basis.** Erroneous examples help learners who have prior knowledge, g = .136 overall and d = .33 at one week, so cases are scheduled after their lab, A (small) · [dp row 16] [alemdag25][mclaren15]. Matched sound and flawed twins, A · [dp row 15]. Findings need explanations and typed evidence [dp §3.6].

---

## 5. Call It calibration

### 5.1 When a call is asked

- A call is asked on the first run of an authored instrument cell and on every generated item, and nowhere else (I5). Free runs, Bench runs and re-runs stay ungated. Once a KC is solid (§3.3), the learner may skip calls on its authored cells (the expert skip).
- Only the first call counts, and it cannot be edited (M-call-it).
- Pre-instruction calls (prequestions, Boot's first-contact call, in-lesson predictions before the exit item) are recorded and scheduled but kept out of the Mirror and out of every state. Being wrong there is the intended learning event: prequestions help the content they ask about (g = 0.54, against 0.04 on unasked content) and work after wrong guesses when the answer is then studied (A · [dp row 5] [sthilaire23]).
- The prompt asks how likely the answer is to be right, not how confident the learner feels. Confidence prompts are reactive, helping confident reasoners and hurting unconfident ones (B/C · [dp row 8]); in one experiment, wording with "likely" somewhat reduced the effect (report L3, F16).

### 5.2 Three taps, printed bands and chance

The bands come from certainty-based marking's payoffs [cbm]: +1 or 0 at the first level, +2 or −2 at the second, +3 or −6 at the third, for a right or a wrong answer. A learner who believes the answer is right with probability p expects p, 4p − 2 and 9p − 6 at the three levels. The first is best below p = 2/3, the second between 2/3 and 4/5, the third above 4/5 [D]. Honest reporting therefore maximizes the expected payoff, and the bands can be printed on the taps.

| Tap | Printed band | If right / if wrong (feedback only) |
|---|---|---|
| guess | below 67% | +1 / 0 |
| think so | 67–80% | +2 / −2 |
| sure | above 80% | +3 / −6 |

Every item prints its chance level beside the taps: 1/k for k options (1 in 3 for a three-way verdict, which sits inside "guess"); 1/2^m for a multiple true/false set of m statements (1 in 32 for five); "no guessing floor" for a constructed answer. v1's 55/75/95 scale put its lowest option above chance on three-way verdicts and pushed honest guessers into overconfidence [dp §3.4].

### 5.3 Payoffs as feedback, never credit

- The payoffs are shown before the tap, and the earned payoff after the result, as information about the choice. They are never summed, credited, totaled or compared. Penalty scoring mixes risk attitude into a score: under penalties, women skipped more questions at equal knowledge (B · [dp row 30] [baldiga14]); CBM's own reliability gain is C and unverified.
- The Mirror may say "at your hit rate on these items, 'think so' would have paid more than 'sure'". That is information about calibration, not a reward (A · [dp row 37]: positive feedback +.33; expected rewards −.28 to −.40).

### 5.4 The interpretation tap

After a solver run in S1–S2, before the stamp appears, the learner taps "so P holds", "so P is violated" or "can't tell" (spine §8.4). The tap is a `call` with three options, keyed by §8: `unsat` of ¬P on the learner's encoding means "so P holds" (for this encoding, if the solver is sound); `sat` with a replayed witness means "so P is violated"; `unknown`, a timeout or an `rlimit` stop means "can't tell". The tap fades for a KC once the KC is solid.

### 5.5 Rules for calls

| Rule | Operational check | Source |
|---|---|---|
| At least 30% of a stage's calls are genuine surprises | a call is a genuine surprise when the narrative-blind strategy (violated or `sat` on a scene's first run; holds or `unsat` after an edit framed as a fix) predicts the wrong verdict: the guard is insufficient, the property holds without the guard, or the answer is a genuine `unknown` | V2-05; review A8, F5 |
| No verdict exceeds 60% of a stage's calls | counted per stage and per verdict | V2-05 |
| Every option carries a "why" and a misconception tag | per option | V2-05; [dp row 27] |
| The lesson rail never shows answers | segment titles only | V2-05 |
| S1.L1's first scored call is a fresh variant | never the roadmap's starter, which prints its own answer | V2-05 |

GATE-items holds the call rules; GATE-lessons holds the rail.

### 5.6 The Mirror

**Population.** Calls and called items that are own, unseen and post-instruction. Seen re-attempts are left out, because a remembered key measures memory of the answer, not judgment [D]. Assisted calls are shown apart and never pooled, because AI use inflates self-assessment (B · [dp row 35] [fernandes26]).

**Display,** in this order (M-mirror, SCR-mirror):

1. *Bias:* mean stated probability minus accuracy. Stated probability is imputed from each band's midpoint [D]: for "guess", the midpoint between the item's chance level and 2/3 (0.50 for a three-way verdict, 0.33 for a constructed answer); 0.73 for "think so"; 0.90 for "sure". The imputed mean is fixed by the learner's taps, so bias's interval is that mean minus the Wilson interval of accuracy.
2. *Hit rate per band:* n, correct, the Wilson 95% interval, and the printed band beside it.
3. *Resolution:* the hit rate at "sure" minus the hit rate at "guess", each with its interval, shown separately because calibration feedback reduces overconfidence without improving discrimination, and teaching content can even raise overconfidence (B/C · [dp row 29] [stone00]).
4. *Sure-and-wrong list,* each item already re-queued (§5.7).

**Diagnosis rule.** A band gets a sentence only when it holds at least 20 calls and its Wilson interval lies wholly outside the printed band [D, within the spine's "about 20–30"].

| Band | Calls | Wilson 95% | Printed band | Sentence |
|---|---|---|---|---|
| sure | 18 of 30 right | 0.42–0.75 | above 80% | "your 'sure' calls land below their band" |
| sure | 21 of 30 right | 0.52–0.83 | above 80% | none: the interval reaches the band |
| sure | 18 of 20 right | 0.70–0.97 | above 80% | none: the interval overlaps the band |
| think so | 7 of 12 right | 0.32–0.81 | 67–80% | none: fewer than 20 calls; v1's "at 80% right only 58%" rested on about this many [dp §3.4] |

Sentences describe tasks, never the person ("your 'unsat after adding a guard' calls: 6 of 10 at 'sure'"), because over a third of feedback interventions lowered performance (A · [dp row 20] [kluger96]). The Brier score stays internal: it falls as knowledge rises even when calibration does not (B/C · [dp row 29]). The Mirror is private: it is reached from Today, never appears on Claims, and never enters the published report.

### 5.7 Sure-and-wrong re-tests

A `sure` miss returns as a fresh variant of the same template and KC at about 1 day and again at about 1 week (M-sure-wrong-returns; W2-T17). The feedback after the miss opens the misconception layer whatever the KC's novice or expert setting, because confident errors are the ones feedback corrects most often (B · [dp row 6] [butterfield01]); the returns exist because high-confidence errors come back after a week [butler11]. Two misses on one misconception tag, confident or not, bring a refutation card that names the misconception and refutes it (M-refutation-card; A in science, untested in logic · [dp row 26] [danielson24]).

---

## 6. The Defence

### 6.1 Shape

| Part | Content | Graded by | About |
|---|---|---|---|
| A · probes | 10–12 fresh probes from at least three families; the roadmap's completion tests turned into items; the agent closed; a call on each | the families' engines | 35 min |
| B · defend | 4–6 seeded mutations of the learner's own lab artifact, predicted first (GEN-defend) | Lean's comparator, TLC, Z3 or cargo | 20 min |
| C · audit | 4 cases, at least one sound, with typed evidence (GEN-spot-the-gap and anchors) | each case's checker | 20 min |
| D · explain-back | a 2-minute spoken explanation and a 3-idea self-check compared with Part A; required and uncredited | nobody | 10 min |

The Defence is untimed: nothing shows that timing adds validity, and the harm from AI appeared under speed pressure ([dp §5]; [shen26]). It is offered as two sittings, Part A first and Parts B–D second, in the week after the lab's last planned stage, because a gap before a separate exam lost learners [serth22]. It never locks and never expires; until the learner takes it, Today lists it as available.

### 6.2 Sampling

- **Part A** draws band 2 items from at least three of the stage's families. Each of the stage's roadmap completion tests becomes at least one item. At least one item is a spiral item on an earlier stage's threshold KC when one exists, which gives every threshold KC its place in a later Defence (spine §4). The remaining items sample the end-state matrix rows the stage trains (spine §2.2). No instance the learner has seen is used.
- **Part B:** `statespace defend` seeds 4–6 mutants of the artifact, following the mutation list in the stage's Defence line (spine §3).
- **Part C:** four cases from the stage's anchor pool and its generated variants, with the sound share drawn from the 30–60% seed (so one or two of the four are sound), never a case the learner has seen.
- **S9** runs two mini-Defences, one per half, each sampling only its half (spine §3.9). **S10** runs the Defence over the report: 12 probes across all seven outcome families; one mutation per pipeline component of the learner's own Core; four cases, one of them harvested from the learner's repo by `statespace audit`; and an explain-back of what the report establishes and what it does not (spine §3.10).

### 6.3 Scoring and the sign-off rule

An item scores 1 when `ok` is true and provenance is own, and 0 otherwise. A Part B prediction scores 1 when the verdict matches and, for a mutant that fails, the locus matches. A Part C case scores 1 when the decision is right and, for a flawed case, the class is acceptable and the evidence validates (§4.16). The rule is §3.4's:

- each of Parts A–C passes at 60% or more, or with at most one miss when it has five or fewer items;
- Parts A–C together score at least 75%;
- Parts A–C span at least two sessions, and Part C held at least one sound case;
- a Part D event exists;
- for each part, its latest attempt counts.

Three worked results for S1, which has 10 Part A items, 4 Part B mutants and 4 Part C cases [D]:

| Case | A | B | C | Overall | Outcome |
|---|---|---|---|---|---|
| 1, first attempt | 9/10 (0.60–0.98) | 3/4 (0.30–0.95) | 3/4 | 15/18 = 0.83 (0.61–0.94) | Defence passed |
| 2, first attempt | 7/10 (0.40–0.89) | 2/4: two misses, so B fails | 3/4 | 12/18 = 0.67 (0.44–0.84) | B and the overall fail; B alone is retaken |
| 2, B retaken at least 3 days later | 7/10 (kept) | 4/4 (0.51–1.00) | 3/4 (kept) | 14/18 = 0.78 (0.55–0.91) | Defence passed |

The stage is signed off once its KCs also meet the relearning criterion (§3.3).

### 6.4 The Wilson interval

For k correct out of n, with z = 1.96:

```
center    = (k/n + z²/(2n)) / (1 + z²/n)
halfWidth = z · sqrt((k/n)(1 − k/n)/n + z²/(4n²)) / (1 + z²/n)
interval  = [max(0, center − halfWidth), min(1, center + halfWidth)]
```

| k of n | Interval | Where it appears |
|---|---|---|
| 10 of 12 | 0.55–0.95 | a typical Part A pass (spine §8.6) |
| 2 of 2 | 0.34–1.00 | why a two-item floor would be noise (spine §8.6) |
| 17 of 21 | 0.60–0.92 | an S2 Defence: 12 probes, 5 mutants, 4 cases |
| 7 of 12 | 0.32–0.81 | v1's calibration copy [dp §3.4] |

The interval describes sampling over items for one learner, not uncertainty over learners. A single sitting is a screen rather than a measurement (report L3, §3.3), which is why sign-off also needs three spaced sessions per KC, and settled a 30-day probe.

### 6.5 Retakes

A failed part is retaken on fresh seeds at least 3 days later; only the failed part or parts are re-sampled; nothing locks meanwhile; every attempt stays in the log as evidence (spine §8.6). The wait spaces the retake from the failure instead of rewarding immediate re-drill [D]. When every part clears its own floor but the overall falls below 75%, no part has failed, so the learner chooses one part to retake, and the Defence suggests the lowest-scoring one [D]. Otherwise a passed part is never retaken to raise a score.

### 6.6 Settled probes

One fresh probe per KC, at least 30 days after sign-off (§3.5), served by Today, one shot, at band 2. A correct answer settles the KC; a miss returns it to relearning and schedules another settled probe at least 30 days later. The stage's sign-off is untouched either way.

### 6.7 What a passed Defence is

A passed Defence is stamped [T] · n unseen items with its Wilson interval, for example "[T] · 21 unseen items over 2 sessions · 0.60–0.92", and never PROVED competence (spine §8.1). The Part D self-check is [A] · self-assessed; it is compared with Part A on the same KCs as a self-grade calibration signal and never credited, because low performers inflate self-grades (B · [dp row 28]). The spoken explanation may be recorded locally for the learner's own review; nothing is uploaded, and no model ever listens to it. The Defence as a whole is grade B−: retrieval (A · [dp row 1]), case sampling (B · [dp row 28] [wass03]) and explanation (A/B, small · [dp row 47] [kobayashi19]) support Parts A, C and D, while Part B has face validity only (C/D · [dp §3.5]).

---

## 7. Validity CI

### 7.1 Keys from checkers

| Mechanism | Gate | Lane |
|---|---|---|
| Generators are pure and deterministic across three engines, have 2–4 templates, discard `unknown`, and keep distractors distinct from the key and from each other | GATE-generators | fast |
| Authored call answers reproduce on their engines (Pyodide-in-Node and native Z3, Spectacle, the interpreter), checked by witness properties rather than model values; every authored `unsat` is cross-checked with cvc5 1.4.2 from W1 (the executed run's pip wheel reports `1.4.2-modified` [X RUN-cvc5-alethe]; the Bench binary is {{run:RUN-scaffold}}) | GATE-calls | fast; Lean calls nightly |
| Second semantics agree with their references: Spectacle = TLC [X RUN-spectacle]; Pyodide Z3 = native Z3; PGlite = PostgreSQL 18.6 on single-session specimens; tab Datalog = Soufflé; pocket checkers = Z3; the lasso validator = TLC on fixtures | GATE-conformance | nightly |
| The interpreter matches the kernel-checked goldens, n reported (the held seam SEAM-13) | GATE-interp | fast |
| Goal Replay strips, which key GEN-proof-structure, regenerate identically on the pinned toolchain | GATE-replay | nightly |
| Every audit anchor and variant builds or runs with its key, class, typed evidence and "based on" card | GATE-audit | nightly |
| Every Defence mutant elaborates or builds, or its key predicts that it fails to | GATE-labs | nightly |
| Every stamp, and every GEN-which-stamp key, comes from one deriver applied to a receipt or a recorded output | GATE-stamps | fast |
| Every tool number in a stem, key or "why" is a run reference that resolves | GATE-numbers, GATE-runs | fast |

### 7.2 Item lints

GATE-items runs these on every authored item and on a seeded sample of every template and band.

| Lint | Rule | Basis |
|---|---|---|
| why and tag | every option of every selection item carries a "why" and a misconception tag | [dp row 27]; kernelspace's item lint |
| length | the key is strictly the longest option in at most 30% of a family's sampled items, and no key exceeds 1.3 times its distractors' mean length | kernelspace's thresholds; "always pick the longest" passed 58 of 68 kernelspace lessons [dp row 27] |
| convergence | the centroid strategy (§7.3) stays within chance + 2 SD; one-edit mutants make the key the options' centroid | [dp row 27]; [dp §3.3] |
| absolute words | hedges and absolutes ("always", "never", "only", "all") in natural-language options are balanced between keys and distractors. Operators inside formulas are exempt, because "never resolves twice" is a property, not a cue | report L3, F10 |
| surprises and balance | the call rules of §5.5 | V2-05 |
| multiple true/false | between 1 and m − 1 true statements per item; a stage's true share between 40% and 60% [D] | [dp row 27] |
| distinctness | distractors pairwise non-equivalent and non-equivalent to the key, by the family's engine | [dp §3.3] |
| CTI dose | at least four GEN-cti-or-bug items interleaved through S9 | spine §4.1 |
| bound printed | every grader verdict that rests on a bound prints it | I10 |
| no runtime model | no stem, option, key or "why" is produced by a model at run time | [dp row 31] |

### 7.3 Blind-strategy gates

For a pool of N scored decisions with chance rates c₁ … c_N, a strategy that scores X fails its gate when X > Σcᵢ + 2·√(Σcᵢ(1 − cᵢ)) [D]. The pool is a stage's authored calls plus 200 seeded instances per template and band [D]. For example, 40 three-way calls have a chance mean of 13.3 and an SD of 2.98, so no blind strategy may get more than 19 of the 40 right [D].

| Strategy | Applies to | Gate |
|---|---|---|
| always the longest option | selection items | GATE-items |
| always the first, or always the last, option | selection items | GATE-items |
| always the majority verdict ("sat", "violated") | calls | GATE-items |
| narrative-blind: violated on a first run, holds after an edit | calls | GATE-items |
| all true; all false | multiple true/false | GATE-items |
| centroid: the option with the highest mean token overlap with the others | selection items | GATE-items |
| the hedged option; the absolute option | natural-language options | GATE-items |
| always reject; always accept | audit cases | GATE-audit-blind |
| the last case in a session is sound | audit cases | GATE-audit-blind |
| topic is class: the class most common among the anchors of the case's stage | audit cases | GATE-audit-blind |

For audit strategies, chance is the score of a random strategy that knows only the pool's base rates, measured over simulated sessions drawn by the real session sampler, Clearinghouse incidents included [D]. Balanced accuracy puts always-reject and always-accept at exactly 0.5, so those two pass by construction; last-is-sound and topic-is-class are the live risks, which is why spine §6 interleaves earlier stages' classes into later sessions.

### 7.4 Cue ablation

Cue ablation asks whether an item can be answered without the knowledge it tests. kernelspace had the maintainer's agent answer each item three ways: from the options only, with its numbers perturbed, and with the lesson. statespace makes the gate mechanical and keeps the agent only as a flagger (W6-T06):

| Ablation | Mechanical check | Fails when |
|---|---|---|
| stem ablation | delete the stem and run §7.3's options-only strategies on the template's sample | any of them beats chance + 2 SD |
| perturbation, by a "keeper" | generate minimal pairs whose surfaces differ in one parameter that flips the key, then answer the second instance with the first one's key | the keeper beats chance + 2 SD, meaning keys do not move with content |
| lesson ablation | every item's primary KC is taught at or before the item's placement, first-contact calls excepted | an item precedes its KC's first lesson (GATE-kc) |

An authoring-time agent may also answer items from their options only and flag any it gets right above chance. Its flags go to the owner's review queue. It never passes or ships an item, never grades a learner, and is never used to estimate difficulty or to stand in for learners, because simulated "students" correct themselves after any feedback [do26]. Its outputs are committed with the sweep.

### 7.5 "Unseen, not secret"

A static site cannot hide its oracles. The generators, the misconception catalog, the checkers and the key procedures are public, and every instance's seed is recorded in the event that answered it. A determined learner, or the learner's agent, can compute any key. "Unseen" guarantees something narrower: the instance was not shown with its answer before the learner submitted. The course therefore measures what an honest learner can do unassisted, says so (§9; SCR-assurance), and spends no effort on secrecy or anti-cheat (OD-8). One residual leak is structural: seeing one instance of a template partly reveals the others, which is why each family has 2–4 structurally different templates and three bands (B/C · [dp row 27] [chen18]).

---

## 8. Verdict → stamp

### 8.1 The table

The canonical table is spine §8.8. It is reproduced here with an example on disk for each row, because GATE-stamps and GEN-which-stamp both apply it.

| Raw output | Stamp | Example |
|---|---|---|
| `unsat` of ¬P on the learner's encoding | [P] of the encoding, with an open defeater "encoding unverified"; "uncertified" unless cross-checked | CL-1.1, the guarded transfer's `unsat` [X RUN-z3-starter] |
| `sat` plus a model | [R], after the witness replays | SP-1.1: `sat [b = 0, amount = 1, a = 0]` [X RUN-z3-starter] |
| `unknown`, a timeout or an `rlimit` stop | [?] with its reason; fails closed when it guards enforcement [bpa] | SP-1.7 [X RUN-z3-unknown-pow]; an `rlimit` of 5e6 gives `unknown (canceled)` [X RUN-z3-budget-pyodide] |
| TLC "no error", complete exploration | [M] · constants · complete | CL-5.1, the atomic transfer: no error, 4 distinct states [X RUN-tlc-atomic] |
| TLC or Spectacle stopped by a bound or state constraint | [M] · bound · partial | none recorded yet |
| TLC stopped at "Deadlock reached" before exploring all reachable states (the invariant was checked only on the states explored) | [?] · stopped at deadlock, n distinct states (or [R] if the property was deadlock freedom) | DoubleSpend under default flags: 10 distinct states [X RUN-tlc-doublespend] |
| TLC or Apalache inductive check (`Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` over the states `TypeOK` enumerates) at fixed constants | [M] · constants · "inductive at N = k"; never [P] | CL-5.4's supporting check {{run:RUN-tlc-inductive}} |
| Z3 `unsat` of `Init ⇒ Inv` and of the inductive step with the parameter as an uninterpreted sort | [P] · Z3 5.3.1 unsat · uncertified, for every N, with a premise witness and the open defeater "encoding unverified" (the SMT translation of the spec) | CL-5.4 {{run:RUN-z3-inductive-param}} |
| Lean: comparator accepts, axioms standard | [P] · Lean 4.35.0 kernel · axioms listed (+ "6 checkers" after `--paranoid`) | "Your solution is okay!" and six checkers under `--paranoid` [X RUN-lean-comparator]; conservation uses `[propext, Quot.sound]` [X RUN-lean-ledger] |
| Lean: `sorryAx` present | no [P]; the claim reads "PROVED modulo k assumed lemmas", each lemma [A] | SP-2.4: a `sorry` file builds with exit code 0 and `sorryAx` is listed [X RUN-lean-axioms] |
| Lean: a `_native` axiom | [P] · kernel + compiler | SP-9.5 [X RUN-lean-axioms] |
| Lean: comparator reports a statement or constant mismatch | the claim voids to [?] · statement mismatch | SP-2.7: "theorem statement do not match" and "Const does not match" [X RUN-lean-comparator] |
| Differential testing, no divergence | [T] · n, generator statistics | CL-6.1 {{run:RUN-drt-transfers}} |
| Shadow or gold mismatch | no stamp; a defeater against both sides | — |
| "Results match" on one database | [T] · 1 instance | SP-9.4 {{run:RUN-pg-one-db}} |
| Trace validation over n seeds | [T] · n seeds, composed with the spec's [M] | CL-8.3 {{run:RUN-tlc-trace-validation}} |
| A setting read back from the system | [C] · source | — |
| A runtime check or constraint in place | [E] · where | CL-6.4 {{run:RUN-pg-enforce-commit}} |
| A language model says "equivalent" or "proved" | no stamp; quoted UNREVIEWED text | — |

### 8.2 The course's own assessments, stamped

| Result | Stamp | Note |
|---|---|---|
| a passed Defence | [T] · n unseen items · Wilson interval | shown on SCR-defence; "signed off" itself is a learner state drawn in ink |
| a passed mini-Defence (S9) | [T] · n unseen items of its half | both halves are needed |
| a settled KC | [T] · 1 probe at 30 days or more | a single item is a screen, which is why it is a KC state and not a claim |
| audit accuracy | [T] · n cases · balanced accuracy with its interval | per class only at n ≥ 10 |
| VRK₃₀ | [T] · n qualifying events · accuracy with its interval | private, on the Mirror |
| the Part D self-check, or any self-grade | [A] · self-assessed | compared with Part A, never credited |
| an explain-back | no stamp | uncredited by design |
| a language model's opinion of an answer | no stamp | never consulted for grading |
| the course's own graders, for example INS-interp against the Lean reference | [T] · n goldens | SEAM-13, a held seam tested by GATE-interp, printed on SCR-assurance |

---

## 9. What this system cannot establish

SCR-assurance prints these limits (spine §8.9), with the reason for each.

1. **Unassisted work is self-declared.** The weights in §2.4 rest on the learner's word (OD-8). The course calibrates; it does not police, and it cannot detect an agent that answered for the learner.
2. **Oracles are visible to a determined learner.** "Unseen" means not shown with its answer, not secret (§7.5).
3. **Defence Part B has no outcome data.** Predicting mutation effects on one's own artifact has face validity only (C/D); the course reports the score and draws no further conclusion from it.
4. **One learner.** Every figure describes one learner (n = 1). Wilson intervals describe sampling over items, not over people, and nothing supports a population claim or a causal claim about any mechanic. Keep/kill decisions about mechanics follow rules fixed and hashed before the first learner-zero event (W0-T07, {{run:RUN-keepkill-rules}}), read descriptively from 30-day fresh-seed accuracy.
5. **A sign-off is a screen, not a measurement of competence.** Ten of twelve has an interval of 0.55–0.95 [D], which is why sign-off adds three spaced sessions per KC and settled adds a 30-day probe.
6. **Template familiarity leaks.** Exposure to an instance is tracked; familiarity with a template is not, and a solo learner gains some advantage from it [chen18].
7. **The graded forms are proxies for explanation.** The roadmap's completion tests are explanations. The course grades checker-gradable forms of them (multiple true/false, needed hypotheses, Proof Blocks, witnesses) and keeps the spoken explanation uncredited, so it cannot certify that the learner can write the explanation.
8. **Requirement fit is only as good as the authored scenarios.** Scenario items make requirement mismatch gradable, but their requirement verdicts are authored, which is why requirement-fit is never [P] (spine §5.2).
9. **The course's graders are software.** Pocket checkers, the interpreter, Spectacle and the lasso validator are tested against their references (GATE-conformance, GATE-interp). That earns [T], not [P].
10. **Audit accuracy measures the taxonomy.** It shows performance on thirteen gap classes and their seeded variants; it cannot show that the learner will catch a new kind of gap in real agent-written code.
11. **Near transfer only.** Far transfer is about zero under controls (A/B · [dp row 44] [sala19]). The course trains near transfer to "your system" through twin labs and the private overlay, and measures nothing beyond it.
12. **Effects are small.** The median education RCT effect is about 0.10 SD [kraft20]; calibration feedback reduces overconfidence without improving discrimination [stone00]; retention beyond the 30-day probe decays unless it is kept up (A · [dp row 45] [tatel25]).

---

## Appendix A. Misconception tags used here

Each tag is a misconception ID in the spine's form, `dp:{catalog key}`, and resolves against EVIDENCE.md §6, which maps the pedagogy digest's catalog (§2) onto the spine's stages and lists proposed entries (§6.11). The `mis:` names used in this document's prose and tables are descriptive aliases only: item metadata carries the `dp:` key, and several aliases may share one key. Tags marked "uncataloged" name confusions with no learner study; their keys are proposed entries with evidence "—", logged through calls and kept only if they draw errors [dp §2, rules]. dp:T7 and dp:T14 are proposed by the S5 spec (`curriculum/S05-time.md`); dp:Q16, dp:A16 and dp:A17 are proposed here and registered in EVIDENCE.md §6.11.

| Tag | Alias | Misconception | Source |
|---|---|---|---|
| dp:G1 | `mis:only-if-converse` | "P only if Q" read as Q → P | [dp §2, Stage 0] |
| dp:G1 | `mis:only-if-biconditional` | "P only if Q" read as P ↔ Q | [dp §2, Stage 0] |
| dp:G4 | `mis:false-antecedent-irrelevant` | a false antecedent read as irrelevant; a guard that never fires | [dp §2, Stage 0] |
| dp:G5 | `mis:quantifier-negation` | a negation goes wrong, most often when it sounds implausible | [dp §2, Stage 0] |
| dp:G6 | `mis:quantifier-unpacking` | an informal claim not unpacked into its quantifiers | [dp §2, Stage 0] |
| dp:G8 | `mis:empirical-conviction` | conviction from many passing runs or from authority ("Lean accepted it") | [dp §2, Stage 0] |
| dp:G9 | `mis:invariant-is-inductive` | "invariant" equated with "inductive invariant" | [dp §2, Stage 0] |
| dp:Z1 | `mis:sat-means-holds` | `sat` read as "holds"; `unsat` read as "safe" without a non-vacuity check | [dp §2, Stage 1] |
| dp:Z2 | `mis:unknown-means-safe` | `unknown` or a timeout read as "no bug" | [dp §2, Stage 1] |
| dp:Z3 | `mis:model-is-the-bug` | the model taken as the bug rather than one witness of a class | [dp §2, Stage 1] |
| dp:Z4 | `mis:int-covers-i64` | `Int` assumed to cover `i64` | [dp §2, Stage 1] |
| dp:Z5 | `mis:logic-slip-in-encoding` | Stage 0 slips and wrong operators carried into an encoding | [dp §2, Stage 1] |
| dp:L2 | `mis:automation-closes-taught-step` | automation closes the step being taught | [dp §2, Stage 2] |
| dp:L3 | `mis:kernel-means-requirement` | kernel acceptance taken to mean the requirement is met | [dp §2, Stage 2] |
| dp:L4 | `mis:cannot-state-theorem` | unable to say what a theorem proves | [dp §2, Stage 2] |
| dp:L5 | `mis:ih-not-generalized` | the induction hypothesis not generalized over the state | [dp §2, Stage 2] |
| dp:L6 | `mis:circular-step` | the base case seen as optional, or the inductive step as circular | [dp §2, Stage 2] |
| dp:L8 | `mis:axiom-means-unsound` | any axiom read as unsound, or no `sorry` read as nothing trusted | [dp §2, Stage 2] |
| dp:O1 | `mis:invariant-bounds` | wrong quantifier bounds, off by one | [dp §2, Stage 4] |
| dp:O2 | `mis:invariant-incomplete` | a condition that is incomplete, too strong, or missing a relationship | [dp §2, Stage 4] |
| dp:O3 | `mis:cti-is-bug` | a counterexample to induction read as a reachable bug | [dp §2, Stage 4] |
| dp:O4 | `mis:wp-substitution` | weakest-precondition substitution done forward or with capture | [dp §2, Stage 4] |
| dp:O4 | `mis:missing-frame` | a missing frame condition | [dp §2, Stage 4] |
| dp:O5 | `mis:partial-vs-total` | partial and total correctness confused; a vacuous obligation | [dp §2, Stage 4] |
| dp:T1 | `mis:implicit-always-eventually` | an implicit "always" or "eventually" | [dp §2, Stage 5] |
| dp:T3 | `mis:eager-eventually` | "resolves exactly once" written as an eager "eventually" | [dp §2, Stage 5] |
| dp:T5 | `mis:no-error-is-proof` | "no error found" taken as proof for all sizes | [dp §2, Stage 5] |
| dp:T6 | `mis:states-vs-actions` | trace length counted in states rather than actions | [dp §2, Stage 5] |
| dp:T6 | `mis:default-flags-deadlock` | a stop at "Deadlock reached" under default flags read as a finished check | [dp §2, Stage 5] |
| dp:C1 | `mis:sequential-consistency` | sequential consistency assumed | [dp §2, Stage 5] |
| dp:T7 | `mis:stuttering-not-a-step` | a repeated state rejected as not a step of the spec | uncataloged; proposed by the S5 spec (KC-5.behaviors-stuttering) |
| dp:T14 | `mis:weak-fairness-suffices` | weak fairness trusted for an action that is only intermittently enabled | uncataloged; proposed by the S5 spec (confusable set E) |
| dp:Q4 | `mis:isolation-names-anomaly` | the isolation level alone taken to decide the anomaly; the compilation pattern decides it | [dp §2, Stage 6] |
| dp:Q5 | `mis:repeatable-read-prevents-all` | REPEATABLE READ taken to prevent every anomaly | [dp §2, Stage 6] |
| dp:Q7 | `mis:retries-terminate-tests-prove` | retries assumed always to terminate; differential tests taken as proof | [dp §2, Stage 6] |
| dp:Q16 | `mis:write-skew-as-lost-update` | write skew labeled as a lost update | uncataloged; proposed here (confusable set D) |
| dp:A1 | `mis:subset-for-overlap` | a subset test where an overlap was meant; vacuously true on an empty set | [dp §2, Stage 7] |
| dp:A2 | `mis:extra-quantifiers` | extra quantifiers, or constraints set per set instead of per principal | [dp §2, Stage 7] |
| dp:A3 | `mis:fix-instance-shown` | fixing only the instance shown | [dp §2, Stage 7] |
| dp:A4 | `mis:enforcement-is-ni` | enforcement mistaken for noninterference | [dp §2, Stage 7] |
| dp:A5 | `mis:no-distinguishing-request` | a policy accepted without a distinguishing request | [dp §2, Stage 7] |
| dp:E3 | `mis:liveness-crashes-off` | liveness checked with crash actions switched off | [dp §2, Stage 8] |
| dp:P1 | `mis:observer-ignores-aborts` | an observer that ignores aborts | [dp §2, Stages 9–10] |
| dp:X1 | `mis:test-as-proof` | a test or a bounded check presented as proof | [dp §2, Stages 9–10] |
| dp:A16 | `mis:observer-body-only` | "the observer sees only the response body" taken as fact | uncataloged; proposed here (SEAM-10) |
| dp:A17 | `mis:pair-not-low-equivalent` | a witness pair that differs in the observer's own data | uncataloged; proposed here (KC-7.observer-equivalence) |

---

## Spine issues

Things in `docs/spine/SPINE.md` that this document believes are wrong, contradictory or under-specified, with a proposal for each. Until the spine changes, it governs.

1. **Generator stage columns drift from the lesson rows** (§8.3). S2.L8, S4.L7 and S4.L8 use GEN-find-the-witness, but §8.3 lists it for S1, S3 and S5–S9. GEN-negate-it is listed for S7 and GEN-spec-it for S1 and S4, where no lesson row or Defence line names them. Proposal: generate §8.3's Stages column from the lesson rows and Defence lines, as §9.1's "Used in" column is generated, and have GATE-links check it.
2. **GEN-defend's template names are too narrow for its operators** (§8.3 against §3's Defence lines). The four names (drop a hypothesis; weaken a guard; change the encoding; split an action, drop fairness or widen the observer) leave out operators the stages require: `decide` → `native_decide` (S2, S9), a statement weakened under the same name (S2), the read-modify-write compilation and "retry only 40001" (S6), an added duplicate-reply action (S5), crash actions switched off (S8) and aborts made unobservable (S9). GATE-generators caps a family at four templates. Proposal: rename the four as §4.15 does (hypothesis or statement; guard or check; encoding or trusted base; concurrency, environment or observer).
3. **Misconception IDs had no format** (§8.3, §8.4, GATE-items; resolved). Every option must carry a misconception ID, and the pedagogy digest's catalog keys collide with the gap classes G1–G13 and the stages S1–S10. The spine's ID table now defines the kind as `dp:{catalog key}`, registered from EVIDENCE.md §6, and W0-T03 adds that registry to GATE-links. Appendix A gives each of this document's `mis:` tags its `dp:` key and keeps the `mis:` name as a descriptive alias; it proposes dp:Q16, dp:A16 and dp:A17 for three uncataloged confusions.
4. **The event record cannot support two derivations** (§8.2). M-refutation-card fires after two misses on a tag, but the record holds neither the response nor the matched tag. Proposal: add `resp` and `mis` to `event@1`, and state that `at` carries the local UTC offset, because sessions and spacing are computed in local days.
5. **"Unseen" is weaker than "fresh"** (§8.2, against §2.3, §4 and §8.6). The weights table credits own · unseen toward sign-off, settled and VRK₃₀, while §2.3 and §8.6 require fresh generated items; authored cells and audit anchors are unseen on first exposure yet fixed and public. Proposal: define fresh as own · unseen · generated for sign-off, settled and VRK₃₀, and keep own · unseen for Judgment.
6. **"Settled" has no anchor date** (§0 glossary, §4.1, §8.6). "At least 30 days later" does not say later than what, while VRK₃₀ (§2.3) counts from first learning. This document anchors settled at the stage's sign-off date. Proposal: say so in §8.6 and in the glossary.
7. **The two-session rule sits outside the sign-off criterion** (§3.0, §8.6). The Defence is described as taken "over at least two sessions", but the signed-off bullet omits it; the pedagogy digest put it in the criterion. This document requires Parts A–C to span two sessions. Proposal: add it to the bullet, or drop it from the description.
8. **I3 says every key is computed at grade time** (§1.1), but GEN-proof-structure's keys come from build-time Lean elaboration (GATE-replay) and GEN-defend's from Bench receipts. Proposal: "computed by an engine at grade time, or by the pinned checker at build time or on the Bench and replayed at grade time".
9. **GEN-cti-or-bug's grader can mint a wrong key** (§8.3). "Then bounded reachability (bound printed)" keys an instance "CTI" whenever no violation turns up within N, which is wrong when the violation lies deeper. This document certifies CTI keys with an inductive strengthening and reachable keys with a replayed trace, and discards seeds that yield neither (§4.7). Proposal: adopt that wording in §8.3.
10. **GEN-anomaly-id's unseen supply is unsized** (§8.3, W0-S09). The tab cannot run concurrent PostgreSQL and an altered history would be an unrun fact, so every instance must be a recorded history; W0-S09's acceptance ("unrun rows recorded in isolationtester format") sets no catalog size. Proposal: have RUN-pg-catalog record a seeded grid of amounts, balances and interleavings with a target count per template, and have GATE-generators report each template's unseen supply.
11. **Two outcome criteria count claims** (§2.2). Outcome (f)'s criterion includes "LAB-6.c7 passing" and outcome (g)'s the recorded demonstration (CL-10.1). Both are claims, which §8.1–§8.2 keep out of learner states because agents may produce them. Proposal: show them as artifact lines beside the outcome, outside the per-learner criterion.
12. **Three calibration rules lack an operational form** (§8.4, §8.5, GATE-items): how a band maps to a probability for bias (this document imputes band midpoints, §5.6); the Mirror's minimum n, "about 20–30" (this document uses 20 calls plus an interval wholly outside the band); and "genuine surprise" (this document uses review A8's narrative-blind definition, §5.5). Proposal: write the chosen forms into §8.4, §8.5 and GATE-items.
13. **GATE-audit-blind's "chance" is undefined** (§6, §11.2). Under balanced accuracy, always-reject and always-accept score exactly 0.5 by construction, so the gate needs a defined baseline for last-is-sound and topic-is-class. Proposal: chance is a random strategy that knows only the pool's base rates, over simulated sessions from the real sampler (§7.3).
14. **The small-part clause is inert** (§8.6). Parts have at least four items, and there "at most one miss when the part has five or fewer items" never changes a result: 60% of four already allows one miss, and at five items 60% allows two. As written, it would also pass a one-item part with its only item missed. Proposal: state a minimum part size of four and drop the clause, or keep it as a documented no-op.
15. **The `automated` weight can never bind** (§8.2). Automation flags arrive only on receipts, and receipts never count as evidence, so "0 for that KC" applies to no evidence event. It is harmless, but it reads as if receipts could count. Proposal: say that `automated` marks receipts and claims only.
16. **One run description is abridged** (§9.5, RUN-tlc-hold-lasso). The recorded lasso is Try, Busy, Try, then Busy back to state 1; "Try → Busy → Try → back to the start" leaves out the closing Busy. GATE-facts compares tool-behavior sentences with their runs, so the sentence should match the log.

Decided here because the spine leaves them open, not because it is wrong: multiple true/false scoring (an item is right when every statement is; chance 1/2^m); Part B and Part C item scoring (§6.3); which part is retaken when every part clears its floor but the overall falls short (§6.5); sessions, spacing and first learning (§3.2); VRK₃₀ counting a KC by its latest qualifying event, and the active study-month behind its rate (§3.6); band 2 for Defence and settled probes (§4.1).

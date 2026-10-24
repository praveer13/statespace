# Review round 1 digest: lenses A1–A4

*For the v2 lead course architect. Prepared 2026-10-23 by machine clock; the brief's nominal date is 2026-10-20 and the lens runs are dated 2026-10-21. Inputs: `review-merged-1.json` (not published), the lens reports in `research/reviews/`, and `research/spikes/RESULTS.md`, whose executed facts win on any conflict. Per-finding evidence and URLs are in the JSON; this digest gives URLs only for facts it re-checked.*

**JSON provenance.** I re-transcribed the brief's JSON independently in nine parts and byte-compared each part with the copy an earlier run had saved. The result is byte-identical (304,452 bytes, sha256 `6dbc5446…183202`) and was re-saved unchanged.

**Publication note.** The review JSON files are not published; the digest contains no content from them beyond what it states.

## 0. At a glance

- **84 findings:** A1 fidelity 21, A2 correctness 21, A3 pedagogy 23, A4 journey 19. As filed: 13 critical, 47 major, 24 minor.
- **Skeptic verdicts** (two per finding; uu = both uphold; um or mu = split, in JSON order; mm = both modify): 28 uu, 38 split, 18 mm. Nothing was refuted, and 56 findings carry a modified recommendation.
- **Severity:** skeptics proposed lowering six findings and raising none.
  - A3-C4 becomes major (D8).
  - A2-F13 would be minor on its own and is folded into D2.
  - A1-F1, A1-F2, A2-F4 and A3-C3 stay critical inside D1, D4 and D3, for the reasons given there.
- **Result:** 26 changes: 7 critical (D1–D7), 17 major (D8–D24) and 2 minor (D25–D26). Every finding ID appears in at least one Sources line.

## 1. Bottom line

1. **Keep v1's thesis.** No lens disputes the six-field claims, qualified stamps, specimens, seams, Call It, or an Audit Desk scored on precision and recall. The defects are places where v1's own machinery commits the errors it teaches:
   - it accepts a kernel-bypassed proof of 1 = 2;
   - "reject everything" wins its audit metric;
   - it prints invented tool numbers;
   - it stamps a false REFUTED;
   - it narrates an overflow that Postgres does not perform.
2. **Critical changes:**
   - learner versus agent (D1);
   - Lean receipts (D2);
   - the Audit Desk (D3);
   - Stage 6 concurrency (D4);
   - the 64-bit seam (D5);
   - retention and rhythm (D6);
   - budget (D7).
3. **RESULTS.md confirms every correctness finding it touches.** A fresh check of Lean 4.35.0 strengthens D1 and D2 (§2).
4. **Roadmap over platform.** Where a lens pulled the learner's platform into course scope, the skeptics pulled it back to the roadmap, and I follow them (§4).
5. **One person's week is the binding constraint.** Accepted findings add roughly 10–15 lesson-sized sections [estimated, A1-F12 skeptic]. D7's displacement rule is part of the plan, not a contingency.

## 2. Reconciliation with RESULTS.md and fresh checks

| Topic | Executed (RESULTS.md, 2026-10-20) or checked | Lenses | Resolution |
|---|---|---|---|
| PostgreSQL 18.6 | A conditional UPDATE at READ COMMITTED loses nothing. Read-modify-write spends 160 of 100, and gets 40001 at REPEATABLE READ. Sum-guarded write skew commits at RR and gets 40001 at SERIALIZABLE. CHECK accepts NULL; WHERE skips NULL rows; bigint overflow raises 22003 | A2-F1 adds 40P01 (opposite-order transfers) and identical results on PG 17.11 | They agree. Drives D4, D5 and D11 |
| TLC double spend | Read/write spec: 4 actions (5 states), 11 distinct states | A2-F7: read/check/write spec gives 6 actions and 20 distinct; with the check merged, 4 actions and 13 distinct | Different encodings, so no conflict. "212" and "48,112" were invented. Every number carries its spec hash and argv (D21) |
| Z3 BitVec | Sender `unsat`; recipient wraps (B = 9223372036850581504, M = 4194304). The roadmap's starter asserts `amount > 0` (RM:34) | A2-F3 skeptic: without `amount > 0`, the sender wraps too | Consistent: the sender is safe only with a positivity guard, which v1's toy syntax lacks (D5) |
| Browser Z3 | npm `z3-solver` 5.3.1 needs SharedArrayBuffer and COOP/COEP | A1-F18: PyPI ships a pyemscripten wheel; compatibility unverified | D14 |
| Lean | Core 4.35.0 proves the Stage 2 ledger (`[propext, Quot.sound]`). A pointwise transfer mints money on self-transfer (10 → 15) | A2-F8, A2-F18 and A4-05 agree | Core Lean through Course 03; specimen S2.1 (D17) |
| Lean 4.35.0 tooling (checked 2026-10-23) | Release notes (https://lean-lang.org/doc/reference/latest/releases/v4.35.0/, dated 2026-10-12): `lake check` replays the project export through the kernel and fails on non-standard axioms; `lake comparator` checks solution theorems against challenge statements; both build in a bubblewrap sandbox (Linux only); `--paranoid` adds five bundled external checkers | A1-F1's skeptic could not verify `--paranoid`; A2-F2 proposed `leanchecker --fresh` | Verified. D1 and D2 use the official commands |
| Course 09 opener (checked 2026-10-23) | Isabelle HOL-IMP theory `ASM` proves `exec (comp a) s stk = aval a s # stk` (https://isabelle.in.tum.de/library/HOL/HOL-IMP/ASM.html) | Proposed by A4-07's skeptic | Port it to Lean (D17) |

## 3. Changes for v2, ranked

Each change gives its sources with verdict codes, then what v2 does, then how contested points were resolved. Cross-cutting rulings are in §4.

### 3.1 Critical: settle before authoring content

**D1 · Separate the learner's judgment from the agent's work.** Sources: A1-F1 mm, A3-C2 um, A3-M10 uu, A4-01 um, A4-16 uu.
- **Provenance:** each evidence event records whether it was own, assisted, agent or automated work, and whether the item was seen or unseen. It is self-declared, and tool-detected where possible. Only own, unseen events count toward sign-off, Judgment and rule 6, using kernelspace-style weights.
- **Statement pins:** the learner's theorems, invariants, temporal properties, R(S,D) and observers live in pinned challenge files (`Claims.lean`, `claims/*.tla`, `claims/*.smt2`). Receipts store their hashes, and a changed hash voids the claim to UNKNOWN. Lean labs check with `lake comparator`.
- **Agent kit in every lab zip:** AGENTS.md, CLAUDE.md, and a fail-closed PreToolUse hook on `TODO(you)` and challenge files. The hook can be toggled per stage, and the toggle is recorded as provenance. The site ships `llms.txt` and per-lesson Markdown.
- **Tactic contract:** in "by hand" stages, goals closed by `grind`, `omega`, `aesop`, `decide` or `native_decide` are flagged as automated. Automation such as `grind` (Lean 4.22.0+) or `omega` can close C2.1–C2.3 without any agent (A4-01 skeptic 2).
- **Viva:**
  - Part A: 6–8 agent-closed, machine-graded items on fresh variants, each tied to a named roadmap completion test. Pass at 5 of 6, including one constructed item.
  - Part B: predict your score, explain back, then self-grade against anchored exemplars.
  - Set = Part A passed + Part B attempted, labelled "self-assessed defence".
- **No LLM grading:** delete the in-page BYOK examiner, as kernelspace did. The learner's agent may run a formative viva mode through AGENTS.md, but it never grades.
- **Stuck protocol** (default thresholds 25/45/90 min):
  - A hint ladder runs from "write your hypothesis" to a worked solution, which is redone after 24 h and credited as assisted.
  - `plinth stuck` emits a forum-ready minimal example with private paths stripped.
  - The goal can then be parked as ASSUMED proof debt, with a Re-find after 7 days.
  - Add a Lean error museum and a no-AI "Prove it" for each lab.
- **End-state matrix:** one generated task family per outcome (a)–(g), re-sampled at ≥30 days. The Defence samples from it.
- *Resolved:*
  - Provenance is honour-system calibration, not anti-cheat, because nothing local can verify "unassisted" (A1-F1 skeptic 2).
  - Agents may implement and prove outside "by hand" stages.
  - The 30-day re-viva gives way to D6's "cured" state.
  - `--paranoid` is verified; run it in CI and at the Defence.
  - Quote Ipeirotis & Rizakos as α 0.52–0.65 before deliberation and 0.86–0.90 after, LLM–LLM only.
  - Critical despite one "stretch" vote: this is the roadmap's purpose (RM:6, :126, :138).

**D2 · Lean receipts a kernel bypass cannot fool.** Sources: A2-F2 um, A2-F13 mm, A2-F18 um (part).
- **Pipeline:** `lake build` → `#print axioms` per pinned theorem → `lake check` → `lake comparator` where a challenge exists. Run `--paranoid` in CI and at the Defence. Receipts record the toolchain hash and sandbox state (bubblewrap is Linux-only). In A2's run, a `debug.skipKernelTC` proof of `1 = 2` built green and reported no axioms; only kernel replay rejected it.
- **Generated TCB:** classify axioms as standard (propext, Classical.choice, Quot.sound), incomplete (`sorryAx`), compiler-trusted (`*._native.*`) or custom. This replaces v1's fixed sentence.
- **Gap class 6** adds `bv_decide`, `decide +native`, `skipKernelTC`, and "builds but fails kernel replay". New audit case: A2.6.
- **Goldens are theorems** over a decidable observation (`by decide` or `rfl`), never `#eval` output.
  - Lint the semantics modules for `implemented_by`, `extern`, `partial`, `unsafe` and `native_decide`.
  - Regenerate Goal Replay strips on every toolchain bump (`verify:goals`).
- **Setup:**
  - core Lean + Std, pinned per edition;
  - `autoImplicit false`;
  - Mathlib only as a later optional lane;
  - TPIL ch. 12 as the reading for 2.9.
- *Resolved:*
  - The 4.35.0 commands supersede the leanchecker-only pipeline.
  - Comparator sets audit-case ground truth in `verify:audit` and gates the capstone; it does not score the learner (A2-F2 skeptic 2).
  - Goldens use decidable observations because function-valued states lack `DecidableEq` (A2-F13 skeptic 2).

**D3 · Make the Audit Desk a valid instrument.** Sources: A3-C3 mu, A3-M7 um, A4-11 mm, A2-F4 mu, A2-F14 um (part), A1-F11 uu (part), A4-17 mu (part).
- **Scoring:** findings score on gap class plus evidence. With 4 of 32 cases sound, "reject everything" scores 87.5% precision and 100% recall, beating the mock learner's 71% and 64%. `verify:audit-blind` fails CI if any blind strategy beats chance + 2 SD.
- **Base rate:** 40–50% of cases sound, built as matched sound/flawed twins. Keep A4.2 as sound, because dropping the guard strengthens the VC. Add A4.5, the vacuity trap.
- **Dose:** at least 6 exemplars per class, from anchors plus keyed variants. A Bench-side `plinth audit gen --seed` sets each key by running the real tool. Mutating the learner's own artifacts is a later stretch, and only after ≥30 days.
- **Compiled cases:** `verify:audit` builds every case on the pinned toolchain and asserts the build result, axiom list and gap witness. A2.1 ships compiled with an explicit modify-style update; its self-refund variant becomes a separate "statement false" case.
- **Taxonomy:** class 5 becomes "bounded or inconclusive presented as proof", which absorbs A1.3. Add class 13, "induction failure ↔ bug" (D8).
- **Delivery:** 1–2 cases a week through Today, interleaved. Per-class rates appear only at n ≥ 10, with intervals. P(sound) forecasts are optional.
- **Public-safe cases** built from common claim errors (D23):
  - blanket tenant isolation despite sharing;
  - liveness filed as an invariant;
  - an eventual property stamped runtime-enforced;
  - an "iff" that mixes safety and liveness;
  - "exhaustive" without stated constants;
  - translation validation said to remove all compiler trust;
  - retrying only 40001.
- **Seam tests:** about a third should hold, each predicted first.
- *Resolved:* critical as a cluster, despite one downgrade vote each on A3-C3 and A2-F4. The Desk is the trainer for end-state (g), its metric is gameable, and its flagship case does not compile. A4.2 stays sound (A2-F14 skeptic 2).

**D4 · Rebuild Stage 6 concurrency on measured Postgres behaviour.** Sources: A1-F2 mu, A2-F1 uu, A2-F9 mu (part).
- **The compilation strategy is the variable in 6.6:**
  - Application read-modify-write: a lost update at RC, 40001 at RR (S6.2).
  - Conditional single UPDATE: safe at RC because WHERE is re-evaluated. Stamped TESTED + ASSUMED, and bridged to 5.3's atomic action.
  - Predicate read, then insert, over postings or holds: write skew at RC and RR, 40001 at SERIALIZABLE (S6.3).
  - Opposite-order moves: 40P01, cured by id-ordered locking (S6.5).
  - Re-stamp C6.2 so it names its pattern.
- **Concurrent R(S,D) is abstract serializability:** accept a history if some serial order, replayed through the Lean oracle, reproduces every committed output and the final state. The search is bounded (n ≤ 6–8) and pruned by observed dependencies, and aborts count as stutter steps. Never replay in commit order, because SSI's apparent serial order can differ from it.
- **Deterministic harness:** drive interleavings by detecting lock waits, never by sleeping. `verify:specimens` runs in CI on PG 18.6, the version PGlite 0.5.10 embeds. PGlite is labelled a "history viewer".
- *Resolved:*
  - Critical despite one major vote: the Ledger stamps a false REFUTED, and RM:77's project cannot run on v1's own compilation. RESULTS.md reproduced both.
  - Write skew comes from the course's own postings (D10), with a labelled two-row example as fallback; RM:77 says "or".

**D5 · Tell the 64-bit story truthfully.** Sources: A2-F3 um, A1-F14 uu, A2-F19 uu, A4-14 mm (part).
- **Lesson 1.5:** under signed BitVec(64), C1.1 survives only if the guard also requires `amount > 0`. With that guard:
  - only the recipient wraps;
  - conservation holds mod 2^64;
  - a guard mixing signed and unsigned comparisons readmits the overdraft.

  The zero-or-negative decision is forced here, then recorded in 3.7 and asked in the viva.
- **E1** cracks C2.2 (success condition) and C6.1 (refinement), not C2.3. Postgres raises 22003 and aborts a transfer that the ℤ model commits. That is a refinement failure with an availability effect, not wraparound, and it is not retried the way 40001 is.
- **Remedies** replace "Add a CHECK constraint". Either:
  - bound the abstract semantics (0 < amt ∧ bal(to) + amt ≤ 2^63 − 1) and re-prove;
  - or model `Except Overflow`, with errors observable in R;
  - or use `numeric` with a stated bound.
- **Six-row table:**
  - Lean ℤ and Z3 Int never overflow.
  - Z3 BitVec wraps, with signedness per operator.
  - PG bigint and numeric raise an error.
  - Rust i64 panics in debug builds, wraps in release (`overflow-checks = false`), and returns None from `checked_add`.

  The Kani drawer opens here, and `verify:specimens` asserts 22003.
- *Resolved:* critical, though A1 filed it as major. This is first-weekend content, and the signature erosion currently teaches a false mechanism.

**D6 · Retention, a daily habit and a weekly rhythm.** Sources: A3-C1 mm, A3-M5 uu, A3-M6 mu, A3-m8 mu, A4-02 um, A4-13 uu.
- **Learner model:** about 90–110 knowledge components (KCs), linked by requires, confusable and threshold edges, over an append-only evidence log.
- **Item sources:** each KC is either `gen` (variants generated by an instrument) or `bank` (at least 4 authored isomorphs, for Lean, TLA+, WP and simulation KCs). `verify:kc` fails any threshold KC with neither.
- **The Desk:**
  - FSRS scheduling at a desired retention of 0.85 or 0.90;
  - at most 5 new cards a week, plus a debt mode;
  - a welcome-back set after ≥7 idle days, with no overdue counts;
  - Re-find serves fresh isomorphs, settled after 3 sessions;
  - confusable sets interleave after a blocked first exposure, for at most half a session.
- **"Cured":** a KC answered correctly and unaided on an unseen variant at least 30 days after learning, shown with intervals in a private Mirror.
- **Two surfaces:**
  - Today: 10–15 min, works at 360 px and offline, resume card first, capped by minutes.
  - Week: Set your week, a weekly target with repair, no streak, and a 20-minute review.
  - On a phone: Today, Goal Replay, audit reading, and the Theater's predict-then-reveal.
- *Resolved:*
  - Dose targets (6–8 graded opportunities in 60 days) are tunable design rationale, not law.
  - The Desk defaults to about 40 min a week, counted across the 20/65/15 shares rather than taken from reading time.
  - Five proposed surfaces become two (A4-02 skeptic 2).

**D7 · A budget that governs every addition.** Sources: A1-F12 um, A4-03 mm, A4-09 mu, A4-15 mu.
- **Per-stage budget:** read, build and write hours, low and high, at 6 and 10 h/week. It separates minimum-path readings from drawer readings and labels overruns [estimated]. `verify:budget` fails any stage above the roadmap's upper bound.
- **Displacement rule:** every addition names what it displaces. Cut order:
  - Course 00 becomes drawers.
  - Alloy becomes a drawer, and 7.4 is cut.
  - 5.9 merges into 6.8.
  - C3.1–C3.2 and C4.3 move to stretch.
  - 6.5 becomes a test-out.
  - Query containment moves to stretch.
  - Audit cases become about 24 anchors plus variants.
  - The scheduler lesson becomes a drawer.
- **Time accounting:** time is tracked by activity and shown in the weekly review. Receipts auto-fill each claim card's method, tool and version.
- **The builder's clock:** the default order stays the roadmap's (RM:6). An optional builder's path runs 01 → 05 + 8.1–8.3 → 6.5–6.7 → 7.2–7.6 → 02–04, with a weekly Lean kata; stages taken out of order are drawn "dry-laid". Agent-written artifacts from the learner's own system wait in the overlay as ASSUMED audit debt (D23).
- **Field twins** (opt-in) replace a stage's final Bench stage and never add to it. They carry `field` provenance and live in a separate Field Ledger. An unscored weekly field audit reviews one real agent PR. Public copy says "your system".
- **Capstone as you go:** 10.1–10.2 after 03, 10.3 after 04, 10.4 after 06, 10.5 after 08. Course 10 shrinks to integration, demo and Defence, in at most 6 weeks. A bring-your-own-system report is an optional alternative.
- *Resolved:*
  - Critical, though A1 filed it as major: without a governing budget, this digest alone would overrun the arc.
  - The toy Plinth Core stays (RM:115).
  - The builder's path includes 6.5–6.7 (A4-03 skeptic 2).

### 3.2 Major

**D8 · Invariant vs inductive invariant.** Sources: A3-C4 mm, A2-F14 um, A3-m3 uu.
- Teach the distinction with a 2×2 contrasting set at 4.4, and revisit it at 5.1.
- L4 output:
  - `unsat` reads "inductive for this command; PROVED for the fragment".
  - `sat` reads "counterexample to induction (CTI)", followed by a bounded reachability search: "REACHABLE in k steps" or "none within N, MODEL-CHECKED ≤ N".
- Proof obligations:
  - A vacuity query sits beside every unsat VC.
  - Name the four guarded-command WP readings; `requires` is the reject reading.
  - Teach 4.1 on a fuelled loop.
  - The Derivation Board fades to typed WPs, graded by Z3 equivalence.
- Add a CTI/real-bug specimen pair, an audit case in which an agent "fixes" a correct command after a CTI, and an optional Apalache inductive check in Course 08.
- *Resolved:*
  - Major, as both skeptics say.
  - Reachability over unbounded ℤ is undecidable, so the search is bounded.
  - Specimen IDs come from the registry: A2-F6 and A3-C4 both proposed "S4.3".

**D9 · Two grading lanes and one IR.** Sources: A1-F8 mu, A4-18 uu.
- **Lane A:** Rust compiled to wasm, graded in the browser with seeds drawn at grade time. It covers:
  - the interpreter, differential-tested against the Lean oracle;
  - the VC checker, whose SMT-LIB runs on Z3 against fresh mutants;
  - the SQL compiler, on PGlite;
  - the outbox machine, under fault injection;
  - the Stage 9 validator.
- **Lane B:** receipts for Lean, TLC/Apalache and multi-connection Postgres.
- **One IR:** a single JSON IR emitted by `lake exe` bridges Stages 3, 6 and 9. Differential tests report n and triage each mismatch as a spec, implementation, tool or proof error.
- **Lab repo:** `plinth-lab` becomes cumulative Rust, with Python kept only for Z3Py. Receipts open the site through a URL fragment, which is never sent to a server.
- *Resolved:* Lean, TLC and concurrency checks stay on receipts. Components are named by function.

**D10 · Mini-Plinth seeds a generic resource kernel.** Sources: A1-F3 mm; A1-F20 mu (part).
- **Stage 2** keeps the roadmap's scope (RM:45). A stretch exercise writes a transfer as zero-sum postings.
- **Stage 3** adds:
  - a ResourceOp node for the roadmap's resource operations, as postings with mint and sink accounts;
  - a typing rule that forbids assigning resource fields;
  - `Amount := {n : Int // 0 < n}`, which doubles as the dependent-type example.
- **Step semantics:** steps return `Except Err (State × Output × List Effect)`, with time in Ctx and effects opaque. New claim: postings refine the Stage 2 ledger.
- **Lesson 1.4** states holds as Z3 constraints over postings. TigerBeetle's two-phase transfers are the dated production twin.
- *Resolved:* no double-entry ledger in Stage 2 (both skeptics; RM:45).

**D11 · Stage 6 compile spec, retries and the concurrency bridge.** Sources: A1-F5 mm, A1-F9 mu, A2-F9 mu.
- **6.2:**
  - Both rowcounts must equal 1, and each 0 maps to a typed error.
  - Schema: `NOT NULL CHECK (bal >= 0)`.
  - 3.7's self-transfer decision reaches the compiler.
  - Specimens: NULL, unknown account, self-transfer.
- **6.7:**
  - Retry whole commands on 40001 and 40P01, and on 23505/23P01 only when transient.
  - Termination is ASSUMED.
  - Receipts log attempts, counts by SQLSTATE, and latency.
- **Bridge section:** compose C2.3/C3.3 with Postgres's guarantee: PROVED for serial execution, plus ASSUMED that all writers are SERIALIZABLE on the primary, that PG behaves as documented, and that nothing reads from replicas.
- **New lesson, "Enforced at commit":** a deferred trigger or delta check over postings, with its Course 04 obligation. Specimens:
  - SUM over no rows is NULL, so the check passes;
  - write skew under REPEATABLE READ.
- *Resolved:* no duplicate Lean lemma (both skeptics). Inbound idempotency moves to 8.4, and the new lesson displaces 6.5.

**D12 · Real TLA+, real lassos, trace validation.** Sources: A2-F10 um, A1-F7 mu, A2-F7 uu (part), A3-m6 mm, A2-F20 mu (part).
- **Browser play** runs real TLA+, translated from PlusCal at build time, in Spectacle or in an explorer conformance-tested against TLC at `-workers 1`.
  - Liveness uses an exact lasso validator.
  - TLC remains authoritative, with `tla2tools.jar` pinned by sha256 and a fallback to TLC's text trace.
- **The Theater:**
  - compares the learner's trace against TLC on the same model;
  - prints witness length in actions;
  - shows message controls only for models with messages;
  - opens liveness with a worked lasso;
  - caps turns.

  5.8 adds TLC's fingerprint-collision estimate.
- **L8:** the outbox is a sans-I/O Rust machine whose simulator traces TLC validates ("traces ⊆ spec, TESTED(n)"). A planted drift is caught only by trace validation.
- *Resolved:* Apalache and Stateright stay stretch. Spectacle's licence and conformance need a spike.

**D13 · Open with Project 00; nothing locks.** Sources: A1-F13 uu, A4-04 um, A3-M1 uu, A3-M11 uu, A4-12 uu, A1-F18 um (part).
- **Course 00** dissolves into just-in-time drawers, plus an optional "Ground" path.
- **Boot** (10 min) opens L1:
  - an agent PR claims "proved", and the learner makes a Call It;
  - an instant ℤ result, stamped "RECORDED · CHECKED in CI", stands in until the live solver loads;
  - then the BitVec wrap, and a first specimen.
- **The first weekend** is Project 00 verbatim. The README carries RM:134's five fields beside the claim card.
- **Audience:** Rust-fluent engineers, with isomorphisms that say where each one breaks.
- **Nothing locks:**
  - drawers always open;
  - misses get misconception-specific feedback and a fresh isomorph;
  - audit cases are always browsable;
  - each stage offers a test-out (3 fresh items per KC, confirmed after 7 days).
- *Resolved:* unanimous. Recorded results must be labelled as recorded.

**D14 · Solver honesty and the browser Z3 lane.** Sources: A2-F6 uu, A2-F11 um, A2-F12 uu, A1-F18 um, A2-F20 mu (part).
- **Wording:** "unsat of ¬P proves ∀ for exactly your encoding, if the solver is sound."
- **Specimen:** Z3 issue #11179 (closed 2026-10-15), citing replays per version: wrong `unsat` on 4.15.4, 5.1.0 and 5.3.0, and `unknown` on 5.3.1.
- **Uncertified results:**
  - stamp solver-only results "uncertified";
  - cross-check authored unsats on cvc5 at build time;
  - record the version, API path and `reason_unknown`;
  - author only reason-stable unknowns (`x**y == 8, y > 1`), never timeouts.
- **Browser lane:** no home-made Python shim. Spike real Z3Py in Pyodide. The fallback shows the Z3Py source and runs build-exported SMT-LIB on npm `z3-solver` under COOP/COEP, one call at a time.
- **Vocabulary:** keep the card field "Model"; call solver output a "witness" and a TLA+ run a "trace".
- *Resolved:* renaming the field "Formalisation" and making SMT-LIB the primary cell language are both rejected, for roadmap fidelity (RM:123; RM:10).

**D15 · Calibration that measures judgment.** Sources: A2-F16 um, A3-M2 mu, A3-M3 mu, A4-12 uu (part).
- **Gating:** gate only authored Call Its tied to a misconception, and first runs. "Run without calling" is unrecorded.
- **Confidence:** kernelspace's guess / think-so / sure, mapped per item to 1/k, (1/k + 0.95)/2 and 0.95.
  - Brier score against a no-skill baseline.
  - Trace lengths are scored as intervals.
  - `verify:calls` requires a misconception id for every distractor.
- **Judgment:** post-instruction calls only, shown in the private Mirror after 30 scored calls, with Wilson intervals and task-level wording.
- *Resolved:* full probability distributions rejected, for friction and family consistency.

**D16 · Stamps that mean what they say.** Sources: A2-F5 mu, A1-F15 um, A1-F16 uu, A3-m7 uu.
- **Renames:**
  - CHECKED becomes MODEL-CHECKED, showing constants and complete or partial; state counts are statistics, not bounds.
  - Build gates become TESTED(n).
  - REFUTED shows witness length.
  - PROVED names its checker: the Lean kernel, uncertified Z3, or cvc5 Alethe with k holes.
- **New stamps:** add NOT COVERED and CONFIGURED. MODEL-CHECKED becomes composite with trace validation (D12).
- **C5.2 and E4:**
  - C5.2 becomes MODEL-CHECKED, with weak fairness as a dashed assumption and symmetry off.
  - Crashes stay in Course 05.
  - E4 retargets the seam "effect dispatch is atomic with the hold's commit", which Course 08's commit-to-send windows crack.
- **Enforcement and copy:**
  - `verify:stamps` derives each stamp from its receipt.
  - Drop "Correct —" from copy.
  - Narrow DESIGN §6's PROVED ban to correspondence with running code.
  - Export reports in the course's own sections.
- *Resolved:* any mapping to an external vocabulary stays in the local overlay (publication constraint).

**D17 · Staged labs, the Lean valley and Course 09.** Sources: A4-08 uu, A3-m1 uu, A4-05 um, A3-M4 mm, A4-07 mm, A2-F18 um.
- **One staging spec:**
  - lab stages of at most 45 min (25 on weekdays), with a 2-minute first win;
  - resume cards in Today;
  - lessons in segments of at most 15 min, each ending in retrieval.
- **The Lean valley:**
  - completion problems and Proof Blocks;
  - the Natural Number Game first (RM:43), with its 33 required levels vendored as a pinned fallback;
  - a "this will feel harder" card;
  - fading ladders for only the 5–6 hardest families, with one principle prompt per faded step;
  - 2.8 rewritten in core Lean (`Acct → Int`);
  - a weekly Lean kata through 05–08.
- **Course 09:**
  - opens with a Lean port of the stack-machine compiler proof (§2);
  - wins first with translation validation;
  - splits into two halves;
  - keeps Metaprogramming as a triggered drawer (RM:102).
- *Resolved:* PFPL's K machine is replaced; Metaprogramming is kept; fewer prompts (A3-M4 skeptic 2).

**D18 · Practice that produces.** Sources: A3-M8 mm, A3-M9 mu, A3-m2 uu, A3-m4 mm, A3-m5 mu, A4-14 mm (part), A4-17 mu.
- **Formalize items** go pick → fix → write.
  - First-order and frame formulas are graded by Z3 equivalence, returning a distinguishing assignment.
  - Temporal formulas are graded over lassos up to length k, stamped MODEL-CHECKED ≤ k.
  - Distractors come from Greenman et al.
- **Claim cards** fade from receipt-prefilled to learner-written. `verify:claims` checks the method, bound and detectable assumptions, and that the "if weakened" witness refutes the claim's own proposition.
- **Specimens** move from "mounted" (labels verified by runs) to "kept" (re-found after ≥7 days).
- **Erosions** open with a forecast and a restatement of the claim from memory.
- **Notes** are "ready to write", and are answered from memory before any links appear.
- *Resolved:* no temporal equivalence is claimed, and the Deci argument is dropped.

**D19 · Stage 7 within its budget.** Sources: A1-F6 mm; A2-F20 mu (part).
- **Main path:**
  - one Datalog engine of the learner's choice (Soufflé or ascent 0.8.1), with derivations as explanations;
  - Z3 self-composition through the learner's own VCGen, modulo declassified data;
  - gap class 3 gains 2-safety hyperproperties.
- **Rescoping:**
  - C7.3 becomes a Z3 claim.
  - Alloy becomes a drawer, and 7.4 is cut.
  - The small-scope claim is presented as Jackson's hypothesis.
- **Core RLS lesson:** compile the read rule to `CREATE POLICY`, differential-test it on PGlite, and add specimens for owner bypass, FORCE and the covert channel.
- **Also:**
  - the roadmap's deliberate bug stays (RM:88), with visibility rules kept abstract (RM:118);
  - 7.8 adds a stale-replica "new enemy" specimen;
  - query containment becomes a stretch drawer.
- *Resolved:* RLS is core (skeptic 2), displacing 7.4. ABAC attributes stay abstract (RM:84).

**D20 · Course 08: untrusted replies and the provider's horizon.** Sources: A2-F15 uu, A1-F10 mu, A1-F9 mu (part).
- **8.4:**
  - replies are untrusted input: check status and that the charge is within the hold, reject late replies, and state the loss;
  - inbound idempotency keys are written in the same SERIALIZABLE transaction;
  - ambiguous commits are resolved by key or `pg_xact_status`.
- **8.7:** C8.1 carries the ASSUMED seam "retry horizon < provider key retention". It cites Stripe's API v1 documentation as a dated example (read 2026-10-21): keys may be pruned after ≥24 h, saved 500s are replayed, and v2 differs.
- **TLA+:** model the key TTL, in-flight rejection and replayed 500s. Specimen: a double charge after an outage.
- *Resolved:* scheduled work becomes a drawer or a world incident, not a lesson.

**D21 · One registry, honest numbers, four destinations.** Sources: A4-10 uu, A1-F21 uu, A2-F7 uu (part), A2-F8 uu, A2-F17 uu.
- **Registry:** one registry generates all IDs and mockup copy, and `verify:links` covers the artboards. It fixes the drift: S1.1 vs S1.2, C2.4, "7 of 12", four names for L2, "~40" specimens, C4.1 vs C4.3.
- **Numbers:** every tool number comes from a recorded run. Mockups are marked [illustrative].
- **Flagship card fix:**
  - dropping Allowed leaves conservation intact (the premise was unnecessary);
  - only non-negativity fails (S1.1);
  - self-transfer mints money (S2.1);
  - axioms come from receipts, and the minimal witness is amount = 1.
- **Navigation:** Today, Map, Bench and Record, plus ⌘K.
  - The unit is the "Stage".
  - The course, Mini-Plinth and "your system" keep distinct names.
- *Resolved:* unanimous.

**D22 · A persistent world in the roadmap's nouns.** Sources: A1-F4 mm.
- **A seeded world** built from the roadmap's nouns, into which the learner's components plug:
  - accounts with holds (Stages 1 and 5);
  - users, teams, roles, documents and sharing (RM:86);
  - an external provider effect (Stage 8).
- **Build-out:**
  - P0 ships a static scenario.
  - Traffic generators arrive with Stages 05–08.
  - Incidents come from the gap taxonomy, calibrated by seeded mutants.
- *Resolved:* the world uses only the roadmap's nouns (both skeptics). The world is not a P0 dependency.

**D23 · Your own design as the final exam.** Sources: A1-F11 uu, A1-F15 um (part), A1-F12 um (part).
- **A local-only overlay:** at the Defence the learner re-stamps their private guarantees as claim cards and classifies sat results. Findings feed back into their own design.
- **What it holds:** audit debt, field-twin claims, and any stamp-vocabulary map. Nothing private leaves the browser.
- *Resolved:* unanimous.

**D24 · Fewer install walls.** Sources: A4-06 mm.
- Make the existing devcontainer the default.
- Add `plinth doctor` and a tools stage in Courses 05–06.
- Meet each tool first in a browser instrument.
- Honour "Soufflé or Alloy" (D19).
- Freeze one Lean toolchain per edition.
- Name PLF's Rocq notation.
- *Resolved:* the devcontainer already exists; make it the default.

### 3.3 Minor

**D25 · Shelf triggers and theory gaps.** Sources: A1-F17 mu, A1-F20 mu, A2-F21 uu.
- **Triggers:**
  - The Kani drawer opens at E1.
  - The certificates drawer opens at 4.8's "Z3 trusted" seam. Carcara's last release (1.1.0, 2023-08-29) is a dated risk.
  - A 15-minute Z3-vs-cvc5 check is diversity, not infrastructure.
- **Theory:**
  - 9.5 contrasts forward simulation, backward simulation and bisimulation.
  - 4.4 adds symbolic execution.
  - C4.3 moves to stretch.
- **Course 09:** state IR determinism, make serialization failures observable, and pin down 9.7's guard semantics (Leroy 2009).

**D26 · Siblings: link, don't duplicate.** Sources: A1-F19 mu, A4-19 mm.
- Link tablespace T4 and byzantine's harness only once they exist.
- Shrink 6.5 to a test-out plus an R(S,D) restatement, with a fallback.
- Share KC ids across the family.
- Defer importing sibling ledgers to a family-level decision.

## 4. Cross-cutting rulings

1. **The roadmap is scope.** Scope additions stay only where a roadmap line asks for them: RLS for RM:88, the provider horizon for RM:99, effects for RM:86 and :104.
2. **Be honest about the honour system.** Provenance, statement pins and hooks are calibration and friction, and are labelled that way.
3. **Bounded checks print their bound,** including the course's own graders.
4. **Family consistency:** nothing locks, no BYOK grading, three-tap confidence, a private Mirror.
5. **Displacement before addition** (D7).
6. **Nothing private in public text.**

## 5. Bold ideas worth keeping

1. **The instruments are the item bank and the grader** (A3): checkers grade free answers and return witnesses (D6, D18).
2. **One mutant catalogue** feeds Call It, Re-find, viva Part A and audit variants, with every key set by a real tool run (A1, A3, A4).
3. **"You state, agents prove, the kernel checks, you audit,"** using `lake comparator` (A1, A2).
4. **An abstract-serializability checker** with a deterministic two-session harness (A1, A2).
5. **Bidirectional conformance** between TLA+ and the Rust machine, plus a lasso validator in the browser (A1, A2).
6. **A three-semantics overflow lab**, and "the solver was wrong" as a specimen (A2).
7. **Every number is a run; every golden is a theorem** (A2).
8. **Proof debt as ASSUMED:** "PROVED modulo k assumed lemmas", with a stage set only at zero debt (A4).
9. **Set, then cured:** 30-day cold checks, with the curing-concrete analogy as metaphor only (A3).
10. **Core grows as you go:** field twins, with your own design as the final exam (A4, A1, A3).
11. **Small helpers:** `plinth stuck`, phone proof-reading, and an optional daily interleaving puzzle (A4).
12. **Trust as a forecast:** an optional P(sound) at the Audit Desk, scored with a proper scoring rule (A3).
13. **The pedagogy wears stamps**, on an "About this course's assurance" page (A3).
14. **Drawers:** a Certificate X-ray, decision records on open questions, and a family-wide KC namespace (A2, A1, A3).

**Rejected or deferred:**
- a richer application world beyond the roadmap's nouns (replaced by D22);
- strictly coupling the capstone to the learner's own system (kept generic; see R19 in digest-review-2);
- mutating the learner's own artifacts at launch.

## 6. Convergence with review round 2

`digest-review-2.md` (lenses A5–A8) independently reaches the same blocking themes:
- pinned statements (D1, D2);
- credit only for machine-graded, unassisted work (D1);
- a runs registry (D21);
- a valid Audit Desk and Call It (D3, D15);
- generated practice with retention (D6);
- honest stamps (D16).

Its reported runs support D14, D12 and D2; I did not re-run them. Its change IDs (A1–A6, B, C) collide with this digest's lens names, so this digest uses D-numbers.

## 7. Not verified here

- Andoni et al.'s evaluation of the small-scope hypothesis (not found in a search on 2026-10-23).
- Compatibility of the Z3 wheel with Pyodide.
- Spectacle's licence.
- Which release fixed Z3 #11179.
- Secondary figures the skeptics flagged: Koedinger, Barbieri, Joyner, SysMoBench, Selden & Selden, and the LoVe chapter names.
- v1's added hours and reading overruns, which are estimates.

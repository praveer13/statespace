# A6: World-class differentiation and the "holy shit" factor

Adversarial review of Plinth v1, revision 3. It supersedes the earlier A6 drafts that were in this file.

**Lens.** What would make an experienced engineer who has finished kernelspace say "this is the best thing I have ever learned from"?

**Reviewed.**
- `PLAN.md` (643 lines) and `DESIGN.md` (130 lines), both dated 2026-10-20.
- The six artboards: Main, Elevation, Lesson, Theater, Audit and Ledger.
- Both documents are byte-identical to `statespace/docs/history/v1/` (seed commit `6102c83`).

**Reviewed against.**
- The roadmap, which is the source of truth.
- kernelspace PLAN-100X, and its repo at `5ab8883` (2026-10-20).
- The byzantine and tablespace plans.
- The learner's private design for "your system", used for alignment only and not reproduced here.
- The exemplars named in the brief.

**Date.** Task date 2026-10-20; executed 2026-10-21 (UTC) on this machine.

**Method.**
1. **Re-executed every load-bearing measurement myself** (§9.1):
   - Lean 4.35.0: statement swap, axioms, `vcgen`;
   - real Z3Py in Pyodide;
   - TLC 1.7.4 and the 1.8.0 nightly;
   - PostgreSQL 18.6.
2. **Opened primary sources today** (§9.2).
3. **Used sibling dossiers only where tagged** (R1, R2, R6, L2, L3, L4). I preferred items their own verifiers confirmed.

**Tags.**

| Tag | Meaning |
|---|---|
| [measured] | Executed by me on this machine, 2026-10-21 |
| [verified] | Primary source opened by me, 2026-10-21 |
| [spike] | The course team's executed spike log, `statespace/research/spikes/RESULTS.md` (2026-10-20) |
| [sibling X] | Another agent's dossier in this session, with its verification status. Not re-verified by me unless stated |
| [ks-dossier] | kernelspace's adversarially verified evidence files |
| [derived] | Computed by me from cited inputs |
| [estimated] | My judgement |
| [unverified] | Not load-bearing |

---

## 0. Verdict

**v1 has the best *thesis* of any formal-methods course I know.**
- The tool is not the judge.
- Every result is a six-field claim with a stamp that cannot render without its qualifier.
- Counterexamples are kept specimens.
- Seams are planted on purpose and cracked later.
- "Call It" turns judgement into calibration.
- The Audit Desk scores precision *and* recall.

No exemplar measures calibration or uses mandatory-qualifier stamps; sibling R6 reached the same conclusion independently.

**The experience falls below the bar the family has already shipped, and in four places the course contradicts its own thesis.**

1. **It certifies the error it warns about.**
   - Its receipts would accept an agent's swapped theorem statement. [measured] The swap builds green, with 0 `sorry` and axioms `[propext]`.
   - It plans an LLM examiner for vivas, which the predecessor explicitly rejected.
2. **Practice is the exam, and nothing is retained.** Every item is authored and finite. Yet this is the one domain where a checker can grade unlimited fresh constructed answers for free. kernelspace already ships the fix: Today plus 13 generator families.
3. **Its showcase content is false in places, and its gates cannot see it.**
   - The flagship erosion teaches the wrong PostgreSQL mechanism.
   - "212 distinct states" is invented. [measured] TLC finds 11, and only with deadlock checking off.
   - The artboards drift from the plan's IDs: gap class 8, committed by the course itself.
4. **Its judgement instrument rewards reflexive rejection.** The Audit Desk has 4 sound cases in 32, so "reject everything" scores 87.5% precision and 100% recall [derived]. That beats the mockup's own learner.

Behind these sit the structural gaps:
- **Nothing runs:** no world, a homemade model-checker dialect, and correspondence that is asserted, never checked.
- **No bridge from bounded to unbounded:** nothing like counterexamples to induction (CTIs).
- **A capstone parallel to "your system", the real one the learner is building,** so course hours and hours on that system add up.

**What makes it a category of one.** One sentence:

> *Every answer is a certificate, every claim wears a stamp, every agent is an adversary, and your system is the final exam.*

In practice:
- Grade constructed answers with checkers on fresh seeds; ship witnesses, not answer keys.
- Pin statements, and let agents write proofs.
- Give the learner a living app that attacks their seams every day.
- Run real TLA+ in the tab, and validate the learner's Rust against it.
- End by re-stamping the claims of "your system", the one the learner is actually building.

**Five "holy shit" moments the upgraded course can promise** [estimated timing at 6–10 h/week]:

| When | Moment | Upgrade |
|---|---|---|
| Day 1, 8 minutes, phone | An agent's "proved ✓" refund is true of the wrong thing. In-tab Z3 finds the merchant overdraft. The 64-bit re-encoding shows the guard protects the sender, not the recipient. Bitcoin's 2010 overflow and Bloch's 2006 binary search are the receipts | U3 |
| Week 3 | Your agent "simplifies" a theorem and the build is green. Comparator rejects it. Then the Hall of Records shows a 2026 AI-assisted proof that fooled Lean's own kernel | U1, U7 |
| Month 3 | You build `miniplinth check`, and it agrees with Lean 4.35's new `vcgen` on 200 generated commands, except for one: your frame-condition bug | U11 |
| Month 5 | "CHECKED ≤ 3 holds" becomes "PROVED · inductive" for every N, after the CTI Workbench shows you a state your system can never reach | U5 |
| Month 12 | The final audit case is *your own system*. Three of its claims get re-stamped | U6 |

---

## 1. What v1 already does that nobody else does (keep and amplify)

| v1 mechanic | Why it is world-class | Amplify by |
|---|---|---|
| Six-field claim; stamps need qualifiers (PLAN §2.1, DESIGN §3); Correspondence and Requirement can never render PROVED (DESIGN L95–97) | Makes "a true theorem about the wrong thing" visible on every surface | Stamps *computed* from receipts, never typed (F1, F14) |
| Seams and planned erosion (PLAN L96–113) | A delayed counterexample to your own claim is a novel spiral device | Erosions caused by world events and the learner's own artifacts (F8), propagated along a claim graph (F19) |
| Call It plus calibration (L120–133) | Calibration is trainable: probability training improved calibration and resolution (Mellers et al. 2014) [verified] | Ungated, with intervals and a proper scoring rule (F16, F18) |
| Specimen Cabinet plus Minimise (L135–151) | Broken examples become objects worth keeping (roadmap rule 2) | Minimise → Generalise (F20); records of real incidents (F10) |
| Audit Desk scored on precision *and* recall (L213–237) | Operationalises end-state (g) | A balanced base rate, witness-backed findings, an unlimited adversary (F4) |
| 12-class gap taxonomy (L224–236) | Shared vocabulary across viva, audit and report | Also the mutation-operator set for generated cases (F4, U8) |
| Deferred Shelf (L251–255) | Restraint becomes a visible design choice | It is also where certificate infrastructure belongs (F14) |
| Line language: dashed means assumed, everywhere (DESIGN §2) | A semantic UI grammar no exemplar has | Extend it to a dependency graph (F19) |

---

## 2. Benchmark: v1 against the best

| Exemplar | What makes it work (evidence) | v1 | Verdict |
|---|---|---|---|
| **Software Foundations** | Every exercise is machine-checked. The autograder flags "If the type is not ok, it means you proved the wrong thing" [verified, LF Basics] | Receipt checks `sorry` and axioms, not statement identity (L160–168) | **Borrow**: statement-pinned labs (U1) |
| **NNG / lean4game** | Tactic inventory, goal-matched hints. Server-hosted by default (GPL-3.0, "Server to host Lean games") [verified repo]. A community WebAssembly (WASM) build runs NNG4 in the tab [sibling R1, measured] | Authored Goal Replay; "No in-browser Lean" (L184) | **Borrow**: inventory, generated frames, opt-in live cell (F13) |
| **Learn TLA+ → TLA+ By Example, Spectacle** | Learn TLA+ is text-first: last "what's new" 2023-08-02, exercises still on its roadmap [sibling R6]. TLA+ By Example runs real TLC in the tab via CheerpJ [verified]. Spectacle: "full TLA+ interpreter in Javascript", conformance-tested against TLC [verified] | Homemade breadth-first search (BFS) over a "PlusCal-like DSL" (L181) | **Beat** Learn TLA+; **borrow** Spectacle plus lessons-as-tests (F11) |
| **Brown Logic for Systems / Forge** | Language levels (Froglet); `is necessary/sufficient for`; `test expect { … is sat }` for non-vacuity; hidden "wheat" models; Sterling custom visualisations. "We do not claim to measure learning efficacy" [verified, PACMPL 8 OOPSLA1 Art. 116] | No spec-adequacy grading; self-graded viva (L238–247) | **Borrow**: Spec Bench (U4) |
| **Hitchhiker's Guide to Logical Verification (2026, Lean)** | Operational semantics; Hoare logic with a VCG tactic [sibling R1/R6] | Course 04 reads PLF in Rocq (L387–389) | **Borrow**: Lean-native spine (F13) |
| **kernelspace** (Boot, Today, Daily, Forge, Fleet) | `5ab8883` ships `Boot.tsx`, `Today.tsx` (483 lines), `Daily.tsx` (401), 13 seeded generator families, `labs/agent-kit` and `llms.txt` [measured] | 0 hits for Today, seed, unseen, FSRS, AGENTS, `llms.txt`, provenance, hint | **Regression**: F1, F2, F8, F15 |
| **byzantine / tablespace** | Deterministic network harness and Cluster world; Engine world; crash injection by killing the wasm mid-write; MVCC lab under a deterministic interleaving scheduler [context plans] | 0 cross-links; Courses 06 and 08 overlap them | **Cross-link**; family convergence (bold idea 7) |
| **Jepsen** | Dated counterexamples in production databases. PostgreSQL 12.3: SERIALIZABLE "not, in fact, serializable" (G2-item), 2020-06-12 [verified] | Every specimen synthetic; 0 hits for Jepsen | **Borrow**: Hall of Records (U7) |
| **Bret Victor, "Up and Down the Ladder of Abstraction" (2011)** | Scrub the parameters and see every behaviour at once | One trace at a time (Theater artboard) | **Borrow**: state-space telescope (bold idea 3) |
| **Math Academy** | Prerequisite plus "encompassing" graph; FIRe implicit repetition; adaptive diagnostic. No published outcome numbers [ks-dossier] | Re-find keyed by specimen; no graph (L148–151) | **Borrow**: FIRe-lite credit from labs (U2) |
| **pwn.college** | A solve is proven by a flag only success yields. Belts beat leaderboards at scale; 50k+ learners (SIGCSE 2026) [ks-dossier] | A course is "set" by a self-graded viva (L246) | **Borrow**: witness-as-flag, verifiable belts (U2, bold idea 8) |

---

## 3. Findings, ranked by severity

### Critical

#### F1 · CRITICAL: A course about auditing agent-written proofs has no agent stance, and its receipts would certify a swapped statement

**Evidence**
- **Receipts don't record statement identity.**
  - PLAN L160–168: the receipt records "checks passed, goals proved, `sorry` count, the axioms each theorem depends on … tool versions, file hashes".
  - Its trusted base includes "this CLI's parser of Lean output". Nothing records *which* statement was proved.
- **Agents appear only as subjects.** `grep` over PLAN and DESIGN finds 0 hits for AGENTS, `llms.txt`, provenance, hint and comparator. "Agent" appears only as Audit Desk subject matter (L7, L38, L213–216) and in the capstone demo (L568).
- **An LLM examiner the predecessor rejected.**
  - L243–246 plan a bring-your-own-key (BYOK) Claude examiner for vivas.
  - kernelspace PLAN-100X §10 refuses an in-page BYOK drawer and LLM-graded credentials (α 0.52–0.65), and its OD8 defers BYOK.
  - LLM judges inflated olympiad-proof scores up to about 20× (Petrov et al. 2025) [sibling L3, verifier-confirmed].
- **[measured] A swapped statement builds green on Lean 4.35.0.**
  - I weakened `transfer_nonneg`, dropping the recipient conjunct, under the *same name*.
  - Result: "Build completed successfully", no `sorry`, `depends on axioms: [propext]`. Every field v1's receipt records looks clean.
- **[sibling R1, measured; outputs in `research/evidence/lean-measure/proj/judge/*.out`]** `lake comparator` catches it:
  - the same kind of swap: "Challenge and solution theorem statement do not match";
  - a changed definition: "Const does not match between challenge and target 'transfer'";
  - forbidden axioms: `sorryAx`, a custom axiom, a `native_decide` axiom.
- **[verified] Lean 4.35.0 (2026-10-12) ships `lake comparator` and `lake check --paranoid`.**
  - `lake help comparator` [measured]: it "Establishes that every named theorem in the solution proves the same statement as the challenge, uses no axiom outside the permitted list, and is accepted by the kernel".
  - `--paranoid` adds `leanchecker-paranoid`, `lean4lean`, `nanoda`, `con-leche` and `con-ron`.
- **[verified] The Lean FRO's own Hex practice is the course's doctrine:** "we write the specifications, and AI agents implement both the executable code and the formal proofs" (FRO roadmap y4-1, Sept 2026 to Feb 2027).
- **[measured] kernelspace `5ab8883` already ships an agent kit** in `labs/agent-kit`:
  - an AGENTS template with an explanation gate and a hint ladder;
  - `ks-guard.sh`, a fail-closed PreToolUse hook;
  - a Socratic output style;
  - a settings template with a deny rule.

**Problem**
- The Ledger is both the progress record and the published Course 10 report (L115–118).
- An agent can fill it with PROVED stamps on swapped statements. That is gap classes 6 (hidden trust) and 8 (drift), committed by the course itself.
- Roadmap rule 6 ("track … what you can now independently reason about") fails.

**Recommendation: U1**
1. **First screen of lab 1: "Agents may write proofs. You own statements."**
2. **A per-course AI policy:**
   - Courses 01–02 use a no-AI "Prove it". The Stage 2 completion test needs the learner's own induction.
   - From Course 03 on, agents may prove lemmas against learner-owned, hash-pinned statements.
3. **Every Lean lab carries three files:**
   - a course-owned `Challenge.lean`, whose hash is published in the static bundle;
   - a `Solution.lean`;
   - a `comparator.json`.

   [measured] `permitted_axioms` is itself a lesson: `omega` gives `[propext, Quot.sound]` and `grind` adds `Classical.choice`.
4. **TLA+ and `.plinth` labs pin invariants and properties** in read-only spec files, hashed the same way.
5. **Receipts carry:**
   - the comparator verdict and exit code;
   - per-checker verdicts;
   - statement hashes;
   - provenance: declared, plus git `Co-Authored-By` trailers. This is an honour system, framed as calibration.
6. **Two ledgers** [sibling L3]:
   - **Claims** record what artifacts establish.
   - **Evidence** records what the learner can do, weighted by provenance.

   A course is set on Evidence, never on Claims.
7. **Fork kernelspace's agent kit, inverting what it protects.** It guards `Challenge*.lean`, theorem headers, TLA+ invariants and `.plinth` invariants, rather than the implementation file. Add:
   - a `flag_for_human` abort path;
   - a red-team mode (U8);
   - optional `lean-lsp-mcp` wiring [sibling R1].
8. **Remove the BYOK examiner.**

**Caveat.** `lake comparator` needs `bwrap`, and it failed under NixOS's nix-ld [sibling R1]. Prove it in a dev container in CI. Where it cannot run, fall back to statement-hash comparison plus `#print axioms`, stamped as the weaker check.

#### F2 · CRITICAL: Practice is the exam and nothing is retained, in the one domain where a checker grades unlimited fresh constructed answers

**Evidence**
- **Every item is fixed.**
  - L131–133: `verify:calls` asserts *authored* verdicts.
  - L148–151: Re-find "re-presents an old broken spec" from a queue "keyed by specimen".
  - L215: 32 fixed audit cases. The Elevation artboard reads "Judgment · last 40 calls".
  - 0 hits for FSRS, Today, seed, unseen and retention.
- **kernelspace already fixed this.** Its defect #4 is "Practice is the exam" (PLAN-100X §2.2), and the fixes K1/K2 ship at `5ab8883` [measured].
- **[measured] Grading is cheap.**
  - Real Z3Py in Pyodide grades a generated query in 8–28 ms after about 1.7 s of warm-up.
  - `Optimize` and `Fixedpoint` both work.
- **Retention is at risk.**
  - Lean sits idle for 14–28 weeks between Courses 04 and 09 [derived from PLAN §1 estimates].
  - Half of accuracy gains are lost in about 6.5 months of disuse [sibling L4, verified].
- **The evidence base.**
  - Retrieval: g = 0.50. Transfer: d = 0.40, but it needs application items [ks-dossier: Rowland 2014; Pan & Rickard 2018].
  - The LTL Tutor generates misconception-coded items [sibling L3, verified; CAV 2025, DOI 10.1007/978-3-031-98685-7_9].

**Problem**
- After one pass, specimens and audit cases are *recognised*, not re-derived.
- The Brier score and audit precision/recall then measure memory of a fixed set.
- Nothing measures whether a 9–18-month arc leaves anything behind.

**Recommendation: U2, "certificates, not keys"**

Item families are graded by a checker in a worker:
- **negate-it:** Z3 equivalence, returning a distinguishing state.
- **call-it:** the key is computed at grade time under `rlimit`.
- **find-the-witness:** no key; the learner's model or trace is evaluated.
- **WP-it:** equivalence to the computed weakest precondition.
- **spot-the-gap:** a mutant from one gap-class operator; the learner must produce a witness.
- **CTI-or-bug, trace-allowed, lasso-or-not.**
- **anomaly-ID:** Adya cycles on generated histories.
- **leaks-to-observer:** paired states.
- **minimise/generalise.**

Around the families:
- **Today:** 10–12 minutes on kernelspace's `ts-fsrs` composer.
- **FIRe-lite credit:** labs refresh the knowledge components (KCs) they encompass.
- **A Lean thread** of items through Courses 05–08.
- **North star:** VRK₃₀, as in kernelspace. A KC counts when the learner re-derives it unassisted, on unseen seeds, 30 or more days later.
- **Discard bad instances:** any where the solver says `unknown`, or where Pyodide Z3 and CI's native Z3 disagree on a sample.

#### F3 · CRITICAL: The showcase content teaches false mechanisms and invented numbers, and the build gates cannot catch it

**Evidence**
- **The flagship erosion E1 has the wrong mechanism.**
  - Sources: PLAN L108, and the Ledger artboard banner: "bigint overflowing at 2⁶³−1, where Lean's ℤ keeps counting".
  - [measured, PostgreSQL 18.6] `9223372036854775807::bigint + 1` raises SQLSTATE **22003 "bigint out of range"**. The transaction aborts; nothing wraps.
  - Silent wrap lives elsewhere: in Rust release builds, where overflow checks are off by default, and in `BitVec` encodings.
- **[derived] The overflow specimen is unreachable as framed.**
  - Take a closed ledger with conservation, non-negative balances and the guard `n ≤ b_src`. Every balance, and every `b_dst + n`, is at most the total supply T.
  - So overflow needs T > i64::MAX. That means *minting* (grants, deposits) or an aggregate.
  - The spike's wrap witness (B = 9223372036850581504, M = 4194304) has B + M > 2⁶³ − 1.
- **C6.2 names the wrong compilation pattern.**
  - The Ledger artboard: "Concurrent transfers serialise at READ COMMITTED — Refuted — S6.2 lost update". But lesson 6.2 compiles a transfer to one conditional `UPDATE` (L452).
  - [measured] Under READ COMMITTED, the second `UPDATE` re-evaluates `WHERE` and updates 0 rows. Final balance 20, no lost update.
  - Only an application-level read-modify-write loses an update: both read 100, final 20, 160 spent.
- **The Theater artboard's "212 distinct states" is invented.**
  - [measured, TLC 1.7.4 and the 1.8.0 nightly of 2026-10-20] The model has 11 distinct states (full space, depth 5), and only with `-deadlock`.
  - Under default flags TLC first reports **"Deadlock reached"** (10 distinct states, depth 4) on a *serial, overspend-free* trace: Read(w1), Write(w1), Read(w2). The hand-written spec has no terminating stutter step.
  - The PlusCal translator adds `Terminating == /\ \A self \in ProcSet: pc[self] = "Done" …`, and TLC then reports the violation by default [measured].
  - The spike log records 11 states, but not the flag.
- **More invented or stale numbers.**
  - The Ledger artboard gives "TLC, 48,112 states" for C5.1. No run produced it.
  - The Main artboard's specimen label shows a = 0, b = 0, amount = 40 and says "Minimal? Yes — 3 variables, 1 step". [measured] Z3 `Optimize` returns `amount = 1`. "Minimal" is undefined.
  - The artboards say "Z3 4.15". Z3 is 5.3.1 (2026-10-15) [verified].
  - Audit case A2.3 assumes pre-4.35 behaviour. In 4.35, native computation appears as a named per-use axiom in `#print axioms` [sibling R1, measured].
- **The gates don't cover any of this.** The build gates (L606–617) check Call It verdicts and specimens, not:
  - prose facts;
  - displayed numbers;
  - tool flags;
  - artboards.

**Problem**
- The flagship erosion teaches a false failure mode in a course whose currency is precision about *what* failed.
- The course commits gap classes 4 (encoding), 5 (bound) and 8 (drift) in its own materials.

**Recommendation: U12, plus content fixes**
- **New gates:**
  - **`verify:facts`:** executable assertions against pinned PGlite or Postgres, Z3, TLC and Lean.
  - **`verify:numbers`:** every displayed number comes from a recorded run, with tool version, *full command line and flags*. Otherwise it is labelled illustrative.
- **Rewrite E1 as two specimens:**
  - (a) the model takes a step the database refuses. That is a refinement and availability divergence, and 22003 must not be retried like 40001.
  - (b) silent wrap in Rust release arithmetic.

  Then teach the twist [derived]: a global "supply ≤ i64::MAX" invariant prevents the wrap, and minting commands are where it must be enforced.
- **Name the compilation pattern** on S6.2: read-modify-write versus a conditional `UPDATE`.
- **Make "termination is reported as deadlock" a Course 05 specimen.**
- **Define "minimal"** as an `Optimize` objective, and machine-check it.
- **Tool versions** become dated claims with TTLs.

#### F4 · CRITICAL: The Audit Desk rewards reflexive rejection, and its cases are finite and keyed rather than witnessed

**Evidence**
- **The base rate is skewed.**
  - Of 32 cases (L213–237), 4 are sound: A2.5, A4.3, A6.4 and A9.3.
  - "Reject everything" therefore scores **precision 87.5%, recall 100%, F1 0.93** [derived; also sibling L3].
  - The Audit artboard's own learner, at "71% precision · 64% recall" (F1 0.67), scores worse than the trivial strategy.
- **The set is finite and locked.** Cases unlock "as courses are set" (L215).
- **The gate checks keys, not claims.** `verify:audit` (L614) checks keys and gap classes. It does not check that a case's surface claims ("`lake build` ✓ · 0 `sorry`") are literally true.
- **Erroneous examples help, but only later.** d = .33 on a one-week delayed test, with no immediate difference (McLaren, Adams & Mayer 2015, n = 390, middle-school decimals) [verified]. LLM-generated, test-certified bugs performed like instructor-made ones (BugSpotter, SIGCSE 2025) [sibling L3].
- **Real agent failures exist to harvest** [sibling R2, verifier-confirmed]:
  - Comparator caught an axiom injected via metaprogramming (FormalQualBench).
  - AlphaVerus learned to exploit `assume (false)`.
  - Formal Conjectures fixed 291 misformalizations: 48.1% misrepresentation, 35.4% semantic.
  - ImpossibleBench: an abort option cut GPT-5's cheating from 54% to 9% (on Conflicting-SWEbench).

**Problem**
- The instrument that operationalises end-state (g) teaches that skepticism is always right.
- After one pass it measures memory.

**Recommendation: U8**
- **A balanced base rate:** 40–50% sound in every session.
- **Findings need a witness the evaluator validates,** for example `merchant = 0, amt = 50 → −50` for A2.1. [derived] At least 10 of the 12 gap classes admit a machine-checkable witness. Requirement mismatch, and partly test-as-proof, use multiple-true-false (MTF) items over concrete scenarios.
- **Three sources of cases:**
  - static, dated agents-of-record cases;
  - an in-tab mutation generator, with keys computed in a worker;
  - a local red-team pack.
- **CI proves every case's surface claims literally true.**
- **New classes:**
  - statement substitution;
  - answer in the statement (leaky spec);
  - checker or VCGen unsoundness;
  - definition holes;
  - trusted-base bug (kernel or solver).
- **Report precision and recall per class with intervals,** with sure-and-wrong items first.
- **No unlocking.**

### Major

#### F5 · MAJOR: The thesis skill, stating the right property, is never machine-graded, and courses are "set" by a self-graded viva

**Evidence**
- **v1's assessment is self-graded.** L238–247: the learner self-grades rubric lines, with an optional LLM examiner, and "A course is **set** on passing its viva". Gap class 12 exists only as vocabulary (L236).
- **Forge** [verified]:
  - runs student tests against a hidden "wheat";
  - supports `assert fullFirstRow is sufficient for winning`;
  - supports `test expect { … is sat }`, a check that a model is non-vacuous ("Can my transition system even run?").
- **Alloy4Fun** auto-assesses specs against secret predicates [verified DOI 10.1016/j.scico.2021.102690].
- **Automata Tutor** (TOCHI 2015, n = 377) [verified, PDF]: against binary feedback, counterexample feedback cut mean time from 394 s to 245 s, and give-ups on practice problems from 44% to 27%.
- **English → LTL is the hard direction:** wrong 47% of the time vs 23% for LTL → English [sibling L2].
- **Self-grading and orals are weak measures** [sibling L3, verifier-confirmed]:
  - self-assessments run 7% high (Kulkarni 2013);
  - an intercase reliability of 0.78 took four 20-minute orals with two examiners each (Wass 2003).

**Problem**
- Learners write invariants, guards, fairness assumptions, observers and R(S,D) across nine courses with no valid signal on whether they wrote the *right* one.
- The course cannot detect its own thesis error in the learner.

**Recommendation: U4 (Spec Bench), plus a Defence that replaces the viva**
- **The Defence** [sibling L3]:
  - probes on unseen seeds;
  - `plinth defend sN`, which applies seeded mutations to the learner's *own* artifacts (drop `h₂`, ℤ→`BitVec`, split an atomic action, remove weak fairness (WF), widen the observer), and the learner predicts first;
  - witness-backed audit findings;
  - an oral explain-back, kept formative only.
- **Rule for "set":** score thresholds over at least two sessions, shown with Wilson intervals.

#### F6 · MAJOR: No bridge from "checked to a bound" to "proved for every size", and Course 04 risks teaching that a satisfiable inductive step is a bug

**Evidence**
- **v1 and the roadmap.**
  - L396 uses `Inv(S) ∧ Guard(S) ∧ Step(S,S′) ∧ ¬Inv(S′)`.
  - The roadmap's Stage 4 says "If satisfiable, explain the violating state".
  - L427 (lesson 5.8) covers bounds only. There are 0 hits for "inductive invariant" and "CTI".
- **Ivy** (PLDI'16, pp. 614–630): "whenever verification fails, Ivy graphically displays a concrete counterexample to induction" [verified].
- **Apalache** checks inductive invariants with IndInit (`--init=Init --inv=IndInv --length=0`), IndNext (`--init=IndInv --inv=IndInv --length=1`) and IndProp [verified docs]. It is active: v0.62.4 shipped 2026-10-12 [verified].
- **The roadmap's own checker has exactly this inductive shape.** Stage 4 has `miniplinth check` "derive an obligation of the form Inv(S) AND Guard(S) AND Step(S,S') AND NOT Inv(S')" and, if it is unsatisfiable, "report a proved obligation for the precisely supported fragment".

**Problem**
- A satisfying pre-state may be unreachable. It is then a counterexample to induction (CTI), not a bug.
- Without this lesson, "sat means bug" becomes the learned rule.
- The TLA+ arc never turns CHECKED ≤ N into PROVED ∀N.

**Recommendation: U5, the CTI Workbench**
- New lessons:
  - 4.5b, "The counterexample that can't happen";
  - 5.8b, "From CHECKED ≤ N to PROVED for every N".
- Read the roadmap's "violating state" precisely: a state satisfying Inv that steps out of Inv.
- Stamp honestly: bounded reachability can only say "reachable within k". "Unreachable" needs a proof.

#### F7 · MAJOR: Correspondence, one of the six claim fields, is asserted and never checked against the learner's code

**Evidence**
- **v1:** L516 and L519–520 say traces "replay in the Theater". Correspondence is a claim field (L30–34).
- **Trace validation** found spec–implementation discrepancies "in all cases" (Cirstea, Kuppe, Loillier & Merz 2024, via TLC) [verified, arXiv 2404.16075].
- **CCF's "smart casual verification"** found "six subtle bugs", and runs in CI (NSDI'25) [verified].
- **Cedar's verification-guided development:** proofs found 4 bugs; differential random testing (DRT) and property-based testing (PBT) found 21 more [verified, arXiv 2407.01688].
- **The roadmap asks for a comparable check.** Stage 9 says to "design a narrow translation-validation check for generated transaction plans" and to keep separate the claims "that a compiler preserves meaning, and that the runtime follows the target semantics".

**Recommendation: U10**
- The learner's Rust state machine runs as wasm under seeded faults.
- Spectacle checks every recorded step against `Next`.
- The first divergence becomes a specimen of gap class 8.
- The stamp is correspondence TESTED (n seeds), never PROVED.

#### F8 · MAJOR: Nothing runs between sessions: the "world" is an archive and erosions are calendar events

**Evidence**
- L53: the world is "**Plinth itself**: one evolving language whose spec, theorems and specimens accumulate".
- L104–113: erosions are scheduled.
- The Elevation artboard's "Your application stands here" stays empty for 9–18 months.
- **The family's worlds:** kernelspace has the Fleet plus a shipped Daily [measured]; byzantine has the Cluster; tablespace has the Engine.
- **Evidence:** simulation-based learning g = 0.85 against other instruction (Chernikova 2020) [ks-dossier]. There is no world-specific outcome data.

**Recommendation: U9, the living world**
- A living app the learner's checker must defend against a seeded stream of agent proposals.
- Erosions are *caused* by world events.

#### F9 · MAJOR: The capstone is a parallel toy, so course hours and hours on "your system" add up

**Evidence**
- **The capstone builds on the toy.** L559–569 build Plinth Core over the toy syntax; L358–359 define `Account`/`Transfer`.
- **Hours add up** [derived; sibling L4]. Work on "your system" runs alongside the course's 6–10 h/week, so the two stack if they are additive.
- **Transfer is near, not far.** AWS engineers got useful TLA+ results within 2–3 weeks on their own systems; far transfer is about zero [sibling L4, verified].

**Recommendation: U6, "your system is the final exam".** An optional local overlay re-stamps the learner's own claims about their system; nothing leaves the device. It stays optional because the roadmap's organizing problem is "not a deadline or a commitment to a fixed architecture".

#### F10 · MAJOR: There are no real-world counterexamples; every specimen is synthetic

**Evidence.** §6 Sources (L637–643) lists tutorials only, and there are 0 hits for Jepsen. Every record below was verified today unless tagged.

| Record | Verified detail | Becomes |
|---|---|---|
| Bitcoin CVE-2010-5139 | 2010-08-15, block 74638, "184,467,440,737.09551616 bitcoins"; outputs "so large that they overflowed when summed" | Overflow in an **aggregate**; the supply invariant |
| Bloch, 2006-06-02 | "the binary search program that Bentley proved correct"; `(low + high) / 2`; about nine years in the JDK; "It is not sufficient merely to prove a program correct; you have to test it too." | Overflow in an **intermediate**; proof ≠ encoding |
| Starbucks, 2015-05-21 | "send $1 simultaneously from wallet1 to wallet2 using both sessions" | S5.1 double spend |
| Jepsen PostgreSQL 12.3, 2020-06-12 | SERIALIZABLE "not, in fact, serializable"; G2-item; fix "scheduled for the next minor release, on August 13th" | A trusted base that was wrong |
| Stripe idempotency (API v1) | keys removable after ≥24 h; a reuse then "generate[s] a new request" | "Exactly-once is a pair", with a TTL |
| Z3 #11179, 2026-10-15 | "Incorrect UNSAT in Real exponentiation with a base below 1", fixed in 5.3.1 | The solver sits in the trusted base |
| Lean #14576, 2026-07-28 | Per its 2026-08-01 postmortem, an AI-assisted proof chained two unrelated kernel bugs [sibling R2, verifier-confirmed] | "Kernel acceptance" has a TCB too |
| Pact property-checker tutorial | A negative amount lets the "sender" steal from anyone; fixed by `(> amount 0)` [sibling R6, docs] | The industrial cousin of Course 01 |

**Recommendation: U7.**

#### F11 · MAJOR: The Theater runs a homemade model-checking dialect when a TLC-conformance-tested interpreter and real TLC already run in the browser

**Evidence**
- **v1:** L181 has the Theater use its "own explicit-state BFS for a small PlusCal-like DSL".
- **Spectacle** [verified README, MIT, pushed 2026-09-30]:
  - "implements a full TLA+ interpreter in Javascript";
  - "nearly all testing … via conformance testing against TLC", by reachable-state-graph equivalence;
  - SVG animations and shareable traces, including "Write skew anomaly under snapshot isolation".
- **TLA+ By Example** (tlaplus org; created 2026-02-14, pushed 2026-10-15) [verified]: "runs the TLC model checker directly in the browser via CheerpJ".
  - Its lessons declare `expect: success|violation`, and an end-to-end suite runs every lesson [sibling R6].
  - CheerpJ is free for FOSS from `cjrtnc.leaningtech.com`, but "If you wish to self-host CheerpJ, you will need a Commercial License" [verified].
- **The Theater artboard shows one trace at a time.**

**Problem**
- Learners debug two semantics.
- Specs written in the Theater do not run unchanged in TLC.
- "Your 6 vs TLC's 4" compares two different models.

**Recommendation: U10**
- **Spectacle becomes the engine,** with a CI gate: Spectacle's state graph must equal TLC's on every authored model.
- **Lessons become tests,** each with an `expect` value.
- **Real TLC is an opt-in, disclosed third party** via CheerpJ; the Bench stays authoritative.
- **In-browser liveness becomes lasso certificate checking:**
  - the learner supplies a prefix plus a loop;
  - the page checks the loop is a real behaviour and evaluates fairness on it.
- **PlusCal is translated at build time.**
- **Add the state-space telescope** (bold idea 3).

#### F12 · MAJOR: The in-tab Z3 plan picks the harder, less faithful lane, and Course 07 adds a fourth engine

**Evidence**
- **v1's plan:** L179 uses the npm `z3-solver` with "Python syntax shimmed to the JS API" and a 10 s timeout.
- **What npm requires** [sibling L3, verifier-confirmed; spike]: the package needs threads, `SharedArrayBuffer` and COOP/COEP. Its README warns against the coi-serviceworker trick in complex apps.
- **Hosting:** the family deploys to GitHub Pages (byzantine plan), which cannot set those headers.
- **[measured] The Pyodide lane works.** The official `z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl` (6.5 MB) runs real Z3Py in Pyodide 314.0.7 with no `SharedArrayBuffer`.
  - First load is about 18 MB (9.2 + 2.5 + 6.5 MB). Load times: Pyodide 1.0 s, install 0.47 s, import 0.2 s.
  - The roadmap starter reproduces: `sat [b = 0, amount = 1, a = 0]`, then `unsat` (28 ms).
  - `Optimize` (8 ms) and `Fixedpoint` Datalog (8 ms) both work.
  - `timeout = 2000` is **not honoured**: the query was killed at 20 s. `rlimit` returns `unknown (canceled)` in 1.1 s.
  - Measured in Node 22 only.
- **Engine count:** L183 adds a TypeScript Datalog evaluator on top of Soufflé, Alloy and Z3.

**Recommendation**
- Use the Pyodide lane. Bench Python then runs unchanged, with no shim to trust.
- UNKNOWN qualifiers use `rlimit`; the hard stop is terminating the worker.
- Z3 `Fixedpoint` replaces the TypeScript Datalog.
- On the Bench, use Soufflé, or `ascent`, a Rust crate (0.8.1, MIT) [verified].
- Make Alloy optional: the roadmap says "Soufflé or Alloy".
- Publish instrument budgets as dated claims.

#### F13 · MAJOR: Lean is a slideshow

Goal frames are hand-authored, there is no live cell, the Lean course has a Rocq reading spine, and it carries an implied Mathlib dependency.

**Evidence**
- **v1's plan.**
  - L184 says "No in-browser Lean"; L209–211 describe authored goal frames.
  - L334 (`Finmap`) implies Mathlib. Yet the Course 2 proofs compile on **core** Lean 4.35, with no Mathlib [spike]. Mathlib adds about 5 GB [sibling R1].
  - L387–389 assign PLF, which is in Rocq.
- **A Lean-native spine exists.** HGLV 2026 covers operational semantics and Hoare logic with a VCG tactic [sibling R1/R6].
- **Real frames can be generated.** Verso and SubVerso render real proof states at build time [sibling R1/R6; extraction not run].
- **Community WASM Lean** (lean.cau.li) [sibling R1, measured]:
  - READY in 6.3–8.3 s;
  - about 137 MB;
  - COOP/COEP mandatory;
  - about 950 commits behind upstream.
- **lean4game** has inventories and goal-matched hints. It is GPL-3.0 and server-hosted by default [verified repo metadata].
- **[measured] Lean 4.35's experimental `vcgen`:**
  - closes a transfer contract and a loop invariant automatically;
  - for a guard missing `amt ≤ a`, reports "unproved verification conditions … ⊢ 0 ≤ (a - amt, b + amt).fst".

**Recommendation**
- Generate Goal Replay from real elaboration.
- Use core Lean only: `AccountId → Int` plus `List.sum`.
- Add an opt-in WASM cell that never awards credit.
- Lock `grind`/`omega` until the manual proof is done (an NNG-style inventory macro in the challenge preamble).
- Read HGLV LoVe09–10 alongside PLF.
- Make `vcgen` Course 04's production twin (U11).

#### F14 · MAJOR: One PROVED stamp covers a multi-kernel Lean proof and an uncertified solver `unsat`

**Evidence**
- **v1:** the Ledger artboard reads "C1.1 … Proved — Z3 unsat"; DESIGN §3's qualifier is "which kernel or solver".
- **Solvers fail.** Z3 #11179 (incorrect UNSAT) was opened and closed 2026-10-15 and fixed in 5.3.1 [verified].
- **Certificates cover only some fragments.** 5.3.1 "Extend[s] Lean proof reconstruction to QF_UF and QF_LRA refutations" [verified release notes]. That is not the LIA and BitVec that Course 01 uses.
- **Kernels fail too.** Lean #14576 [sibling R2].
- **The roadmap defers "proof-certificate infrastructure"** until an obligation demands it.

**Recommendation**
- **Two-axis stamps:**
  - scope: every size, or ≤ bound;
  - trust: kernel(s), solver-uncertified (version, `rlimit`), tested n, enforced or configured.
- **Double discharge** of small verification conditions in Lean (`omega`, `grind`, `bv_decide`). This is in scope, because both tools are in the roadmap. Any disagreement becomes a specimen.
- **Certificate replay** (Z3→Lean, Alethe/Carcara) goes on the **Deferred Shelf.** Trigger: "an obligation of your system is discharged only by an uncertified solver and must appear in a report".

*This corrects the previous A6 draft,* which promoted a certificate ladder to a core upgrade against the roadmap's defer list.

#### F15 · MAJOR: No first-session wow; a kernelspace graduate gets 1–2 weeks of truth tables before the thesis appears

**Evidence**
- L10–11 set the audience: "backend engineers comfortable with Python and one typed language. No prior logic …". The actual learner is Rust-fluent and has finished kernelspace.
- L275–289: Course 00 is six lessons over 1–2 weeks, skippable only by a 10-question check (L277).
- The thesis moment, S1.4, arrives at lesson 1.5 (L303).
- kernelspace's Boot has shipped, targeting a median of 4 minutes or less to first success.
- Prequestions: g = 0.54 [ks-dossier].

**Recommendation: U3**
- Add Boot.
- Rewrite the audience statement for the real learner.
- Turn Course 00 into on-demand drawers plus an adaptive placement.

#### F16 · MAJOR: Hard locks and run gates break the family's "nothing locks" rule

**Evidence**
- **Locks and gates in v1:**
  - L215: audit cases are "unlocked as courses are set".
  - L261: theory drawers "open only when a Call It is missed twice".
  - L125: *every* instrument run waits for a verdict and confidence ("then Run unlocks"), exploratory runs included.
  - L80: notes are "due".
- **The family rule:** kernelspace principle 11 and K3 (soft gates; nothing locks).
- **The evidence:**
  - Self-paced mastery programmes "often reduce the completion rates" (Kulik 1990) [ks-dossier; sibling L4].
  - Confidence prompts change reasoning performance, so Call It should not gate [sibling L3].

**Recommendation**
- Theory drawers are always openable, with a "try first" nudge.
- Audit cases are always available, ordered after their lab.
- Call It is required only on the first run of authored cells and on generated items. Scratch runs are free.
- An expert skip applies once a KC is solid.
- Notes are suggestions, not due dates.

### Minor

#### F17 · MINOR: The artboards drift from the plan (gap class 8 inside the course)

**Evidence**
- **Lesson artboard 1.2** "establishes C1.1 … S1.2 the overdraft". But PLAN L300–302 has 1.2 leave S1.1, mints C1.1 in 1.3, and makes S1.2 the double capture.
- **Elevation artboard** "2.6 — Induction over transfer sequences — Prove C2.4". But L332–333 make 2.6 rejection and non-negativity (C2.2), and sequences 2.7 (C2.3).
- **Ledger artboard** "C4.1 VC generator is sound for assign + if". But L397 makes C4.1 the hand-derived WP, and L400 assigns soundness to C4.3.

**Recommendation**
- One typed registry; lessons and artboards render from it.
- `verify:links` covers the canvas.

#### F18 · MINOR: The Judgment mirror breaks the course's own stamp rule

**Evidence**
- The Elevation artboard: "At 80% confidence you were right only 58% of the time … Overconfident about guards".
- No 80% bucket exists (L125: 55/75/95), and the figure has no n or interval.
- For 7/12, the 95% Wilson interval is 32–81% [derived], which includes 80%.
- DESIGN §9 forbids claims without a stamp.
- Performance feedback reduced overconfidence; environmental feedback *increased* it (Stone & Opel 2000) [sibling L3, verifier-confirmed].

**Recommendation**
- Stamp the mirror: "TESTED · n · CI".
- Suppress diagnoses below a minimum n.
- Show the reliability and resolution components.
- Re-test sure-and-wrong calls after about 1 day and about 1 week.

#### F19 · MINOR: The Ledger is a flat table, so seams do not propagate and there is no blast radius

**Evidence**
- The Ledger artboard's "Rests on" column is free text.
- leanblueprint builds a `\uses{}` dependency graph and separates `proved` from `fully_proved` [sibling R6, verified].

**Recommendation**
- Turn the Ledger into a claim graph with typed edges.
- Distinguish "fully proved" from "proved, resting on seams".
- Let erosion propagate along edges.
- Let blast radius drive world incidents, Defence prompts and the report's structure.

#### F20 · MINOR: The Specimen Cabinet rewards minimal witnesses only, which the evidence says narrows fixes

**Evidence**
- L141–143: Minimise is first-class, and the Cabinet records whether the learner reached the shortest witness.
- Danas et al. 2017 [sibling L2]: with minimal-only counterexamples, 28 of 35 students dropped out. Of the 7 who stayed, 3 banned only self-loops, which was the minimal witness, instead of all cycles.
- Near-miss negative instances helped (Dyer et al. 2022) [sibling L2].

**Recommendation**
- Minimise → Generalise: a fix must also kill a non-minimal witness, found as "another witness ≠ this one" or at a larger bound.
- Show a near-miss beside each specimen.
- Score "fixed only the minimal case" as its own error.

#### F21 · MINOR: The siblings are not cross-linked, Courses 06 and 08 re-teach them, and technical notes are inert

**Evidence**
- 0 hits for byzantine or tablespace.
- Course 06 overlaps tablespace T4 (MVCC, anomalies including write skew, SSI; lab 04 under deterministic interleavings).
- Course 08 overlaps T3 (WAL, crash injection by killing the wasm) and byzantine's deterministic network harness.
- L248–250: notes export Markdown only.

**Recommendation**
- Bridge cards, for example "MVCC mechanics in tablespace T4; here, the relation R(S,D)".
- Shared specimen IDs across courses.
- Reuse byzantine's harness for L8.
- Proof-carrying notes (bold idea 2).

---

## 4. Twelve bold upgrades, ranked by (impact × wow) / effort

**Scoring.**
- Impact (I) and wow (W) run 1–5 [estimated].
- Effort (E) uses kernelspace's scale: S = 3 agent-days or less (1), M = 2 weeks or less (2), L = 6 weeks or less (3). S–M counts as 1.5 and M–L as 2.5.
- "Precedent" means a working example exists but there is no learning-outcome data.

| Rank | Upgrade | I | W | E | Score | Fixes |
|---|---|---|---|---|---|---|
| 1 | **U1 Statement-pinned labs, provenance, agent kit**: "Agents may write proofs. You own statements." | 5 | 4 | S | 20.0 | F1 |
| 2 | **U3 Boot**: "The proof was true. Of the wrong thing." | 4 | 5 | S–M | 13.3 | F15 |
| 3 | **U11 Production twins**: "you just built what the field ships" | 4 | 5 | S–M | 13.3 | F13, F7 |
| 4 | **U4 Spec Bench**: wheats, chaffs, equivalence stories, non-vacuity | 5 | 5 | M | 12.5 | F5 |
| 5 | **U5 CTI Workbench**: CHECKED ≤ N → PROVED for every N | 5 | 5 | M | 12.5 | F6 |
| 6 | **U6 Your system is the final exam**: an optional local overlay re-stamps the learner's own claims about their system; nothing leaves the device | 5 | 5 | M | 12.5 | F9 |
| 7 | **U8 A real adversary at the Audit Desk**, scored honestly | 5 | 5 | M | 12.5 | F4 |
| 8 | **U7 Hall of Records**: dated real-world counterexamples, re-run in the tab | 4 | 4 | S–M | 10.7 | F10 |
| 9 | **U12 Honest assurance everywhere**: two-axis stamps, double discharge, the course's own `/assurance`, a bounty | 4 | 4 | S–M | 10.7 | F3, F14, F17 |
| 10 | **U9 The living world**: a living app; an agent proposes, your checker defends | 5 | 5 | L | 8.3 | F8, F19 |
| 11 | **U10 One TLA+ in the tab, and your Rust validated against it** | 5 | 5 | L | 8.3 | F7, F11 |
| 12 | **U2 Certificates, not keys**: checker-graded generators, Today, VRK₃₀ | 5 | 4 | M–L | 8.0 | F2 |

**Build order differs from rank.** U2's grader core (the Pyodide worker plus 4 families) goes into P0 anyway, because U3, U4, U5 and U8 reuse it.

### How each works with zero servers

**U1: Statement-pinned labs.**
- **Runs locally.** `plinth bench check` runs:
  - `lake build`;
  - `lake comparator --paranoid`, with `bwrap` on Linux or a dev container elsewhere;
  - `#print axioms`;
  - TLC or Apalache with pinned configs.
- **Receipt:** `{challengeSha, theorems[{name, statementSha, verdicts{lean, nanoda, lean4lean, …}}], permittedAxioms, provenance{declared, coAuthorTrailers[]}, tools, cmdlines}`.
- **Minting:** the page mints PROVED only when `challengeSha` equals the hash in the static bundle.
- **The zip carries:**
  - AGENTS.md: explanation gate, statement-guard rule, `flag_for_human`, red-team mode;
  - `.claude/settings.json` (deny rules) and a fail-closed PreToolUse hook, forked from kernelspace's `ks-guard.sh`;
  - the Socratic style;
  - `llms.txt`.
- **Honest trusted base:** receipts are self-reported, and provenance is an honour system.
- **Evidence:**
  - SF's test files, Lean comparator and lean-eval's "solved iff comparator accepts" [sibling R1] (precedent);
  - unguarded AI raised practice scores 48% but lowered unassisted exam scores 17% (Bastani 2025) [sibling L3, verified];
  - an abort option cut cheating from 54% to 9% (ImpossibleBench) [sibling R2].

**U2: Certificates, not keys.**
- **Engine:** Pyodide plus the Z3 wheel (about 18 MB, cached by a service worker, offline afterwards) in a Web Worker. Families are pure TypeScript `make(seed, level) → {prompt, z3py, render}`.
- **Grading:** "find" tasks ship *no key*; the witness is evaluated. Verdict tasks compute the key at grade time under `rlimit`.
- **Storage and scheduling:** an IndexedDB Evidence ledger; `ts-fsrs` (kernelspace's composer); FIRe-lite credit when a lab passes.
- **Evidence:** retrieval and transfer [ks-dossier]; the LTL Tutor (misconception-driven generation) [sibling L3].

**U3: Boot.**
- **Delivery:** a static page plus the U2 worker. On low-memory phones, recorded runs are stamped "recorded".
- **Script, 8–10 minutes:**
  1. an agent PR claims "refund with safety proof ✓, 200 tests green";
  2. Call It;
  3. Z3 finds the merchant overdraft;
  4. add the guard: `unsat`;
  5. switch to `BitVec(64)` and the recipient wraps [spike];
  6. the twist: a supply invariant blocks the wrap, until a deposit mints [derived];
  7. two records: Bitcoin 2010 and Bloch 2006 [verified];
  8. "Set your week", then placement.
- **Evidence:** prequestions g = 0.54 [ks-dossier].

**U4: Spec Bench.**
- **Per seed:** a reference R, wheats (which must be allowed), chaffs (which must be refuted) and bounds.
- **The learner writes** P, in the Mini-Plinth invariant syntax or a Z3Py subset.
- **Z3 checks** P ⇒ R and R ⇒ P over the bounded domain, and returns a distinguishing state told as a story in the course world: "your invariant allows hold 40, capture 30, capture 10".
- **Non-vacuity:** P ∧ Init must be satisfiable.
- **Temporal properties:** Spectacle BFS over tiny constants.
- **Oracles are "unseen, not secret"** (kernelspace V6). Fresh seeds make peeking pointless.
- **Precedent:** Forge, Alloy4Fun, Examplar. **Evidence:** Automata Tutor [sibling L3].

**U5: CTI Workbench.**
1. Z3 checks `Inv ∧ Next ∧ ¬Inv′` on the world's holds model.
2. If it is sat, bounded model checking (BMC) from `Init` (Z3 unrolling or Spectacle BFS) searches for the pre-state:
   - **reachable:** a bug; mount it as a specimen;
   - **not reachable within k:** "CTI candidate · CHECKED ≤ k". The learner strengthens Inv, and the loop repeats.
3. When IndInit, IndNext and IndProp are all unsat, stamp "PROVED · inductive · Z3 5.3.1 · uncertified".

On the Bench, use Apalache IndInit/IndNext/IndProp [verified]. Precedent: Ivy [verified]. There is no outcome study.

**U6: Your system is the final exam.** An optional local overlay re-stamps the learner's own claims about their system; nothing leaves the device.
- **Self-audit kit:** turn the system's guarantees into six-field claim cards and run the gap-class checklist.
- **Evidence:** near transfer [sibling L4]; utility value (Hulleman & Harackiewicz 2009) [ks-dossier].

**U7: Hall of Records.**
- **Content:** each record is `{date, sources, quote, toy model (Z3Py/TLA+/SQL/Lean), claim card, seam, TTL}`.
- **CI:** `verify:specimens` re-runs every toy.
- **Placement:** records appear in a "this happened" panel in the matching lesson, and as Audit cases.
- **Evidence:** active case comparison, d = .50 (Alfieri 2013) [ks-dossier].

**U8: A real adversary at the Audit Desk.**
- **Case sources:**
  1. agents of record, harvested offline by the maintainer, then dated, model-labelled and shipped with witnesses;
  2. a mutation generator (sound artifact × gap-class operator) running in the worker, which computes the key;
  3. a red-team pack, in which the learner's *own* agent attacks their repo locally and comparator, Z3 or TLC adjudicates.
- **No LLM runs in the page,** consistent with kernelspace §10.
- **Scoring:** a balanced base rate, witness-required findings, and per-class precision/recall with intervals.
- **Evidence:** erroneous examples, d = .33 delayed [verified]; BugSpotter [sibling L3].

**U9: The living world.**
- **Runtime:** a worker hosting PGlite, a reference runtime in TypeScript (the learner's wasm later), a seeded scheduler of tenants and users, and fault providers: an external provider that fails, times out, duplicates or reorders.
- **The proposal stream:** an "agent" proposes spec changes drawn from a catalogue of real bug classes:
  - a refund larger than the charge;
  - a field added to a public view;
  - a retry with a fresh idempotency key;
  - a split transaction.

  The learner's checker (their L4 wasm, or the reference checker with their invariants) accepts or rejects each one. A bad proposal that escapes plays out in the world ("Team 7: credits −40") and becomes a specimen.
- **Scores:** mutation score and false-alarm rate.
- **Daily:** seeded by `hash(local date, ledger)`; it enters through the learner's oldest ASSUMED seam.
- **Honesty card:** PGlite is single-connection, so isolation anomalies replay from recorded Bench histories.
- **Evidence:** simulation g = 0.85 [ks-dossier]. Worlds are precedent only.

**U10: One TLA+ in the tab, plus trace validation.**
- **Engine:** Spectacle (MIT), self-hosted, with a CI conformance gate against TLC. Real TLC runs opt-in via CheerpJ from its CDN, disclosed.
- **Trace validation:** the learner's I/O-free Rust state machine compiles to zero-import wasm exposing `step(event) → vars`.
  - The seeded fault simulator drives it.
  - Spectacle checks that each recorded (s, s′) satisfies `Next`.
  - The first divergence lights a third lane.
- **On the Bench:** TLC trace validation, following Cirstea et al. [verified].
- **Stamp:** correspondence TESTED (n seeds).

**U11: Production twins.** Static content, with three tracing questions per twin at a pinned version (a dated claim):

| Course | Twin |
|---|---|
| 04 | A differential test of the learner's VCGen against Lean 4.35's `vcgen` on generated commands [measured: it reports the exact unproved obligation]. Pact's `conserves-mass` checker as the industrial cousin [sibling R6] |
| 07 | Cedar: Lean model plus DRT [verified] |
| 08 | CCF's smart casual verification [verified] |
| 06 | Jepsen's PostgreSQL analyses [verified] |
| 09 | CompCert and Csmith |

**U12: Honest assurance everywhere.**
- Two-axis stamps (F14).
- Lean double discharge of small verification conditions.
- `/assurance`, in the course's own stamps, including ASSUMED rows (viva rubrics, LLM-free grading).
- A counterexample bounty: a PR with a witness that GitHub Actions re-verifies. CI, not a server.

---

## 5. Re-sequenced phases (minimal change to v1 §5)

| Phase | Add |
|---|---|
| **P0 Slice** | F3 content fixes; `verify:facts`, `verify:numbers` (with flags) and generated artboards; the Pyodide Z3 lane; U3 Boot; U1 for L1–L2; U2 core (negate-it, call-it, find-the-witness, which-stamp) plus Today v0; the Audit base-rate fix; Hall of Records v0 (Bitcoin 2010, Bloch 2006, Starbucks 2015); `/assurance` v0. Course 00 becomes drawers plus placement |
| **P1 Proof** | Generated Goal Replay; comparator receipts; per-course AI policy; axioms as Call Its; Lean #14576 record; core-only Lean; a spike of the opt-in WASM cell |
| **P2 Obligations + Audit** | U4 Spec Bench; U5 (Z3 half); U8 mutation generator plus about 10 agents-of-record cases; the `vcgen` twin |
| **P3 Time** | Spectacle Theater plus conformance CI; lasso certificates; U5 (Apalache half); U9 living world v1 (credits, holds, flaky provider, Daily) |
| **P4 Correspondence** | History checker for Bench histories; world SQL on PGlite; tablespace bridge; Jepsen records |
| **P5 Secrecy** | World tenants and sharing; Z3 `Fixedpoint` in the tab; Soufflé or `ascent` on the Bench; Cedar twin |
| **P6 Effects, Preservation, Assembly** | U10 trace validation; U6 overlay plus self-audit; machine-checked Defence; bounty |

**Pay for it by cutting from v1** [estimated]:
- the homemade explorer, replaced by Spectacle;
- the TypeScript Datalog, replaced by Z3 `Fixedpoint`;
- mandatory Alloy;
- the BYOK examiner;
- hand-authored Goal Replay frames;
- Course 00 as six lessons.

---

## 6. Bold ideas beyond fixing

1. **Spec duels by URL.**
   - Two invariants or specs are encoded in a link. The recipient's tab finds a behaviour one allows and the other forbids, or says "equivalent within bound".
   - You can also duel your past self: your Course 02 invariant against your Course 08 invariant.
   - No server is involved.
2. **Proof-carrying technical notes.**
   - Every claim in a published note links to an artifact the reader's browser re-runs: a Z3 model, a Spectacle trace link, or a comparator receipt hash.
   - Readers can Call It before revealing.
   - This is Stage 10's "research artifact", made executable.
3. **State-space telescope.** Bret Victor's ladder of abstraction, applied to model checking:
   - scrub the constants (workers, amounts, holds) and watch the reachable states, the violation frontier and the shortest witness update (Spectacle BFS; TLC agreement precomputed in CI);
   - drag atomicity boundaries;
   - step back down to one trace.
4. **"Four kernels agree, and none of them read the requirement."**
   1. A wrong-statement proof passes all five bundled checkers.
   2. The learner then writes a deliberately buggy toy kernel and catches it by differential checking.
   3. The lab ends on Lean #14576.
5. **A living museum of agents of record.**
   - Each quarter, current agents run on fixed briefs, and their verification failures are harvested.
   - Each case is dated and model-labelled. Change cards ("this agent behaviour has changed") feed Today.
6. **Graduate with a public upstream counterexample.** An optional final rung: find and fix one real misformalization in a public corpus, such as Formal Conjectures or the TLA+ Examples repo. Formal Conjectures invites AI and human audits [sibling R2].
7. **Family convergence.**
   - Trace-validate your byzantine Raft lab against a Raft TLA+ spec.
   - Check your tablespace MVCC histories against an SI spec. Spectacle already hosts `AbstractRaft` and an SI spec with a write-skew trace [verified].
   - "Verify what you built in the earlier courses."
8. **Verifiable belts, witness as flag.**
   - Belts are awarded only for checker-verified solves on unseen seeds.
   - A belt exports as one file of witnesses and receipt hashes that *any* browser re-verifies offline.
   - This is pwn.college's "only success yields the flag", made zero-server. The certificates check themselves.

---

## 7. A week in the upgraded course (illustrative)

**Tue 07:40, phone, Today (11 minutes).** Seven items:
- Negate a property; Z3 says "equivalent".
- Spot the gap in a five-line theorem: a vacuous premise. Your contradicting pair is checked.
- Name the anomaly in a three-transaction history: G2-item, with the cycle drawn.
- Classify a satisfiable inductive step: not reachable within 6, so it is a CTI candidate.

The call you were *sure* about and got wrong returns Thursday, with new numbers.

**Thu 21:00, laptop, Course 05.**
1. You schedule a double spend in six steps. Spectacle finds four actions. The "this happened" panel shows Starbucks 2015.
2. The world pages you: "Team 7's credits are −40 after a duplicated provider reply". Your C5.1 is CHECKED ≤ 3 holds, assuming one reply per provider.
3. You reproduce it, fix it and strengthen the invariant in the CTI Workbench.
4. C5.1 becomes "PROVED · inductive · Z3 5.3.1 · uncertified", and the seam's blast radius drops.

**Sat 10:00, Bench.**
- Your agent's PR says "exactly-once capture, proved".
- The hook blocked the edit, so the agent wrote `capture_once'` and proved that instead. `lake comparator` rejects it.
- You file a finding of class 13, statement substitution, with the comparator log as the witness.

---

## 8. What not to build

- **LLM-graded credit of any kind**, including the BYOK viva examiner (F1). LLMs propose; checkers decide.
- **Runtime LLM item generation in the page.** Generate offline, certify with a checker, and ship static.
- **WASM Lean as an authority.** It is opt-in practice only.
- **Hard locks, timers, leaderboards before belts, game engines, 3D** (kernelspace §10).
- **Certificate infrastructure** before an obligation of "your system" needs it (roadmap; F14).

---

## 9. Verification log

### 9.1 Executed by me (2026-10-21 UTC, this machine)

| Fact | How |
|---|---|
| Lean 4.35.0 (commit eb6cafb): a weakened `transfer_nonneg` under the same name builds green with `[propext]`; `omega` gives `[propext, Quot.sound]`; `grind` adds `Classical.choice`; `lake help comparator` text | `docker ss-lean:4.35.0`; session working files, not published |
| `vcgen` proves `transfer.spec` and `applyAll.spec` (axioms `[propext, Classical.choice, Quot.sound]`); the bad guard gives "unproved verification conditions … ⊢ 0 ≤ (a - amt, b + amt).fst" | session working files, not published |
| Z3Py 5.3.1 in Pyodide 314.0.7 (Node 22.22.2): load timings, starter output, BitVec wrap witness, `Optimize`, `Fixedpoint`; `timeout` ignored (killed at 20 s); `rlimit` gives unknown in 1.1 s; file sizes | a session spike script, not published |
| TLC 1.7.4 (TLC2 2.19) and 1.8.0 nightly 2026.10.20: default flags give "Deadlock reached" (11 generated, 10 distinct, depth 4); `-deadlock` gives the violation (12 generated, 11 distinct, 5 states); full space 13/11, depth 5; atomic 5/4, depth 3; PlusCal emits `Terminating` and reports the violation by default | `docker eclipse-temurin:21-jre`; session working files, not published |
| PostgreSQL 18.6: 22003 on bigint overflow; conditional `UPDATE` under RC gives rowcounts 1/0, final 20; read-modify-write under RC loses an update (160 spent from 100) | psycopg 3. **Note:** my own container failed to bind, so the script ran against the existing `ss-pg` spike container. The spike script drops and recreates its `acct` table, so nothing lasting changed. The R4 sibling's containers (other ports) were untouched |
| kernelspace `5ab8883` (2026-10-20): Today, Daily, Me, Play, Boot, 13 families, agent-kit, `llms.txt` | a local clone of kernelspace at `5ab8883` |
| v1 counts: 32 cases, 4 sound; grep zero-hits; artboard strings | PLAN/DESIGN grep; text extraction of `*.dc.html` |

### 9.2 Primary sources opened by me (2026-10-21)

- **Lean:**
  - 4.35.0 release notes: `vcgen` replaces `mvcgen`, experimental `requires`/`ensures`, `lake check --paranoid`, `lake comparator`, trustCompiler removal (lean-lang.org/doc/reference/latest/releases/v4.35.0/);
  - FRO roadmap y4-1, Hex and Beam (lean-lang.org/fro/roadmap/y4-1/);
  - GitHub metadata: comparator (archived; last push 2026-10-14), lean4game (GPL-3.0), Hex, Beam, lean-eval, lean-lsp-mcp, the cauli WASM fork, Verso, SubVerso.
- **Z3:** #11179 (created and closed 2026-10-15); releases 5.3.0 (2026-10-14) and 5.3.1 (2026-10-15); RELEASE_NOTES (Lean reconstruction for QF_UF/QF_LRA).
- **TLA+ tooling:**
  - Spectacle README (github.com/will62794/spectacle);
  - TLA+ By Example README and metadata (github.com/tlaplus/tla-by-example; learning.tlapl.us);
  - CheerpJ licensing (cheerpj.com/docs/licensing);
  - Apalache "Checking an inductive invariant" (apalache-mc.org/docs/apalache/running.html); v0.62.4 2026-10-12.
- **Papers:**
  - Forge, PACMPL 8 OOPSLA1 Art. 116 (DOI 10.1145/3649833; PDF at tnelson.github.io);
  - Cedar VGD (arXiv 2407.01688);
  - trace validation (arXiv 2404.16075);
  - CCF (usenix.org/conference/nsdi25/presentation/howard);
  - Ivy (pldi16.sigplan.org; search summary of the PLDI'16 abstract).
- **Records:** Jepsen PG 12.3; Bitcoin CVE-2010-5139 (en.bitcoin.it); Bloch 2006 (research.google blog); Starbucks 2015 (sakurity.com); Stripe idempotent requests (docs.stripe.com/api/idempotent_requests).
- **Crossref:** Alloy4Fun, Mellers 2014, McLaren 2015, Examplar, Forge, Automata Tutor, LTL Tutor.
- **Automata Tutor PDF:** time 394/264/245 s for binary/hint/counterexample; give-ups 44%/33%/27% (microsoft.com/en-us/research/wp-content/uploads/2016/12/tochi15.pdf).
- **Abstracts:** McLaren 2015 (Semantic Scholar); Mellers 2014 (NCBI eutils).
- **SF:** LF Basics text ("you proved the wrong thing").
- **Crates and repos:** `ascent` 0.8.1; Stateright 0.31.0 (last release 2025-07-27: a maturity risk).

### 9.3 Carried from sibling dossiers (not re-verified by me unless listed above)

| Dossier | Items | Status |
|---|---|---|
| R1 | Lean WASM measurements; comparator verdicts with the sandbox disabled; lean-lsp-mcp; HGLV; SubVerso | R1 measured or verified; SubVerso extraction not run |
| R2 | ImpossibleBench, Formal Conjectures, Lean #14576 postmortem, FormalQualBench, AlphaVerus, Spec-Harness | R2 verifier confirmed (2026-10-21), with noted precision fixes |
| R6 | TLA+ By Example contract, Learn TLA+ staleness, Pact docs, leanblueprint, Michigan `.t.dfy`, Toadus Ponens | R6 verified; Toadus runtime unverified |
| L2 | Danas 2017; Dyer 2022; English→LTL error rates | Not re-verified |
| L3 | Audit base rate; Petrov; Stone & Opel; Kulkarni; Wass; Automata Tutor numbers; Defence design | L3 verifier confirmed |
| L4 | Hours, decay, transfer, Kulik | L4 [V] tags |
| ks-dossier | Rowland, Pan & Rickard, St. Hilaire, Chernikova, Alfieri, Hulleman, Math Academy, pwn.college | Adversarially verified upstream |

### 9.4 Corrections to the previous A6 draft in this file

1. **"TLC measures 11 states"** is true only with `-deadlock`; under default flags TLC reports a deadlock first.
2. **Apalache** is active (v0.62.4, 2026-10-12), not "slowed".
3. **The certificate ladder** is moved to the Deferred Shelf, per the roadmap; only stamps and double discharge stay core.
4. **BMC cannot classify "unreachable"**; it reports CHECKED ≤ k.
5. **Hex wording** now matches the FRO page.
6. **Comparator's archive date** was inferred; the last push was 2026-10-14.
7. **New in this revision:**
   - the Audit base-rate defect (F4);
   - artboard drift and the false "Minimal? Yes" (F3, F17);
   - locks (F16);
   - production twins (U11);
   - the self-audit of "your system" (F9);
   - verifiable belts.

## 10. Unverified or open

- **`lake comparator` with its sandbox on learners' machines** (`bwrap`; it fails under NixOS's nix-ld). CI must prove it in a dev container before P1.
- **The Pyodide lane in browsers:**
  - Safari and iOS memory are untested;
  - I measured in Node only;
  - that `timeout` is ignored in browsers is inferred from the single-threaded build.
- **Performance and maturity:**
  - Spectacle on Course 05/08-sized models;
  - CheerpJ TLC start-up time;
  - community WASM Lean's longevity.
- **pwn.college's flag mechanics** beyond "a flag only success yields". Not relied on.
- **Learning outcomes.** There is no outcome evidence for worlds, Spec Benches, CTI workbenches, trace validation or belts. Pre-register keep/kill rules per kernelspace §9.
- **Every I/W/E score is [estimated].**
- **"At least 10 of 12 gap classes have machine-checkable witnesses"** is my own analysis.

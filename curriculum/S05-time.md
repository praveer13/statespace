# S5 Time (TLA+): curriculum spec

**Status:** authoring spec for W3 (W3-T11 lessons and LAB-5; W3-T07 runs; W3-T06 and W3-T08–W3-T10 instruments and generators; W3-T12 erosions; W3-T13 anchors). **Date:** 2026-10-23. **IDs:** every ID comes from `docs/spine/SPINE.md`; run ids this spec needs and the spine lacks are marked "proposed" and listed in §12, never used silently.

**Sources, in precedence order:** the roadmap (Stage 5 and its completion test); executed runs (`research/spikes/RESULTS.md`, `research/spikes/tla/` and the TLC logs under `research/evidence/`, cited per sentence); the brief; the four digests; reviews A1 and A2 and report R3; the spine.

**Tags.** `[X RUN-id]` an executed run on disk; `[X evidence: path]` executed output under `research/evidence/` that the §9.5 registry does not yet list (each is proposed for registration in §12 and must carry its run id before copy ships); `{{run:RUN-id}}` a run to record before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or derivation; grades A–D follow the pedagogy digest. Learner copy follows "Copy:" and uses only the spine's §0 glossary terms (S5 adds *Theater*), never internal names (lane, telescope, docket, Hall of Records, Judgment).

---

## 0. The stage at a glance

**Promise.** Model concurrency and time: find a race as a trace, tell "never" from "eventually", state the fairness a progress claim rests on, and say exactly what a model check that finds nothing establishes.

**New tool.** TLA+ with TLC on the Bench: `tla2tools` 1.8.0, a rolling pre-release pinned by SHA-256 `5bd7b64d…52b1e2`, with 1.7.4 (`936a2620…0e88`) as the text-trace fallback [X RUN-tlc-jars]; Java 21. Met first in the tab: INS-theater (authored TLC state graphs), INS-spectacle (Spectacle at 5827c22, whose counts equal TLC's 11, 45, 191 and 813 distinct states for two to five workers [X RUN-spectacle, RUN-tlc-full]) and INS-lasso. Roadmap time: 3–6 weeks; resource: Learn TLA+.

| ID | Tier | Title | Minutes | KCs introduced | Calls | Specimens · claims |
|---|---|---|---|---|---|---|
| S5.L1 | bridge | States, actions, behaviors, stuttering | 15–25 | KC-5.behaviors-stuttering | 1 | — |
| S5.L2 | bridge | A first spec, and the flags that change verdicts | 15–25 | KC-5.tlc-flags-matter | 2 | SP-5.2 |
| S5.L3 | core | The double spend: you are the scheduler | 40–60 | KC-5.interleaving-granularity | 4 | SP-5.1, SP-5.5 · CL-5.1 |
| S5.L4 | bridge | The holds lifecycle | 15–25 | KC-5.holds-lifecycle | 1 | — |
| S5.L5 | bridge | The hostile environment | 15–25 | KC-5.hostile-environment | 1 | SP-5.4, SP-5.7 · CL-5.2 |
| S5.L6 | core | Safety or liveness? | 40–60 | KC-5.safety-vs-liveness, KC-5.temporal-operators | 3 | — |
| S5.L7 | core | Fairness: what the scheduler must promise | 40–60 | KC-5.fairness, KC-5.lasso-reading | 3 | SP-5.3 · CL-5.3 |
| S5.L8 | bridge | What "no error" means | 15–25 | KC-5.bounded-scope | 1 | SP-5.6 |
| S5.L9 | bridge | From MODEL-CHECKED ≤ N to PROVED for every N | 15–25 | KC-5.inductive-invariant-tla | 1 | CL-5.4 |

**KCs of S5** (spine §4; three threshold KCs, whose spiral returns appear in their lessons' Today lines):

| KC | Threshold | Requires | First taught |
|---|---|---|---|
| KC-5.behaviors-stuttering | | KC-1.two-state-property | S5.L1 |
| KC-5.tlc-flags-matter | | KC-5.behaviors-stuttering | S5.L2 |
| KC-5.interleaving-granularity | | KC-5.behaviors-stuttering | S5.L3 |
| KC-5.holds-lifecycle | | KC-5.behaviors-stuttering | S5.L4 |
| KC-5.hostile-environment | | KC-5.holds-lifecycle | S5.L5 |
| KC-5.safety-vs-liveness | threshold | KC-5.behaviors-stuttering | S5.L6 |
| KC-5.temporal-operators | | KC-5.safety-vs-liveness | S5.L6 |
| KC-5.fairness | threshold | KC-5.safety-vs-liveness | S5.L7 |
| KC-5.lasso-reading | | KC-5.fairness | S5.L7 (§12 issue 1) |
| KC-5.bounded-scope | threshold | KC-5.tlc-flags-matter | S5.L8 |
| KC-5.inductive-invariant-tla | | KC-4.invariant-vs-inductive, KC-5.bounded-scope | S5.L9 |

**Also.** LAB-5 (§3); ER-2 cashed in S5.L3, SEAM-4 and SEAM-8 planted (§6); AUD-5.1–AUD-5.4 (§7); drawers D-09, D-18 and, on the builder's path, D-15 (§9). Outcomes served (spine §2.2): (b) through KC-5.safety-vs-liveness, (e) through KC-5.interleaving-granularity, (c) through GEN-cti-or-bug. Technical note 2 follows LAB-5; on the default path the Lean keep-alive starts here once S2 is signed off.

**Paths.** Default: roadmap order. Builder's path: S5.L1–S5.L8 with LAB-5.1–LAB-5.6 come straight after S1; S5.L9 and LAB-5.7 move after S4, because KC-5.inductive-invariant-tla requires KC-4.invariant-vs-inductive (spine §3.0).

---

## 1. Conventions in this file

**Every TLC number** in copy names the version line, argv, constants, and "first counterexample" or "complete exploration" (TLA+ By Example's contract [tlabyex, R3 F4]). Trace length is in actions, states in parentheses. "Shortest" is claimed only for safety runs at one worker; TLC's liveness traces are not guaranteed shortest (A2-F10, quoting the TLC documentation).

**Instruments and stamps.** Theater monitors report observations; only TLC or Spectacle results earn [M] (spine §9.1). Spectacle has no PlusCal and no fairness or liveness (R3 F3), so liveness verdicts come from TLC on the Bench, and INS-lasso validates lassos in the tab. Authored scenes are TLC graphs dumped with `-dump dot,actionlabels` at one worker, deadlock setting explicit [X RUN-tlc-help, RUN-tlc-full].

**Call It** follows S1's conventions (three taps with printed bands, chance 1/k, payoffs as feedback only, first call final); each authored call carries a surprise forecast, tallied in §2.10.

**Scaffolding per KC** (expertise reversal, A [dp row 9]): expert for KC-5.interleaving-granularity (races are familiar; misconception notes collapsed); novice for KC-5.temporal-operators, KC-5.fairness and KC-5.lasso-reading (notes open; a correct worked example before fading family F5 in S5.L7).

**Misconception tags** come from the pedagogy digest's catalog, written `dp:T1` and so on (S1's convention: the catalog's G-tags collide with gap classes). S5 uses dp:T1, dp:T3–dp:T6, dp:C1, dp:C3–dp:C5, dp:L3, dp:O3, dp:P3, dp:Z2, dp:Z3 and dp:X1, plus ten proposed tags, each "—" (no learner study): logged through Call It, kept only if they draw errors (§12 issue 8).

| Tag (proposed) | Misconception |
|---|---|
| dp:T7 | `[][Next]_v` read as `[]Next`: a step that changes nothing is forbidden |
| dp:T8 | A behavior ends when the system finishes (behaviors read as finite runs) |
| dp:T9 | TLC flags confused with the spec's meaning ("Deadlock reached" read as a lock cycle; `-deadlock` read as turning the check on) |
| dp:T10 | An enabled action assumed to fire eventually without any fairness |
| dp:T11 | An event-counting property written as a predicate on the current state alone |
| dp:T12 | A bounded-response property ("before the deadline") classified as liveness |
| dp:T13 | Deduplication kept in volatile memory assumed to survive a crash |
| dp:T14 | WF and SF confused (WF assumed to force an intermittently enabled action, or SF thought needed for a continuously enabled one) |
| dp:T15 | Fairness on an environment action treated as a system guarantee; the environment assumed well behaved |
| dp:T16 | Two actions enabled in one state assumed to happen in the same step |

**Reference models** used by the lessons and the lab:

| Model | What it is | Status |
|---|---|---|
| M1 DoubleSpend | `spikes/tla/DoubleSpend.tla`: `Read(w)` records `seen[w]` and branches on `bal >= Amount`; `Write(w)` sets `bal` to `seen[w] - Amount`; `NoOverspend == spent <= Init`; Init 100, Amount 80, workers {w1, w2} | [X RUN-tlc-doublespend] |
| M2 DoubleSpendAtomic | the guard and the write in one action, `Spend(w)` | [X RUN-tlc-atomic] (argv caveat, §12 issue 2) |
| M3 RTW3 | read, check and write as three actions; `TypeOK` uses `bal \in 0..Init`, because Spectacle cannot evaluate the recorded `bal \in Nat` (or `TypeOK` is checked on the Bench) [X RUN-spectacle-s5s8] | [X RUN-tlc-rtw3] |
| M4 Hold | `st` in {held, pending, captured, released}, `tries` toggled mod 2; `Try` held → pending, `Busy` pending → held, `Capture` pending → captured, `Timeout` held → released; `Fair == WF_vars(Try) /\ WF_vars(Busy)` | [X RUN-tlc-hold-lasso] |
| M5 Holds | the lab's safety model: the lifecycle plus the environment (table below) | {{run:RUN-tlc-lifecycle}}, {{run:RUN-tlc-resolved-twice}}, {{run:RUN-tlc-never-twice}} |
| M6 GiftCard | the 2015 gift-card race as a toy model | {{run:RUN-tlc-starbucks15}} |

M5 is authored in W3-T11 from this table; environment actions (M5's Reply and Crash, HoldLive's Busy and Capture) live in the read-only, hashed `HoldsEnv.tla`; the learner writes the system actions. LAB-5.3's lifecycle is M5 without the environment (Place, Capture, Release); LAB-5.4 splits Capture into Dispatch and Handle and turns Release into Expire.

| Action | Owner | Enabled when | Effect |
|---|---|---|---|
| Place | system | `hst = "available"` | `hst' = "held"` |
| Dispatch | system | `hst = "held"`, `tries < MaxTries`, worker up | `hst' = "capturing"`, `tries' = tries + 1`; the provider request is sent in the same step (this is SEAM-4) |
| Reply(r) | environment | a request has been sent | `msgs' = msgs \cup {r}`, r in {"ok", "busy"}; replies stay in `msgs`, so one can be handled twice (duplicate) or late (delay) |
| Handle(r) | system | `r \in msgs`, worker up, `hst = "capturing"` | "ok": `hst' = "captured"`, `res' = res + 1`; "busy": `hst' = "held"` |
| Expire | system | `hst = "held"` | `hst' = "released"`, `res' = res + 1` |
| Crash | environment | `CrashesOn`, worker up | worker down; volatile state lost |
| Restart | system | worker down | worker up |

Properties: `TypeOK`; `NeverTwice == res <= 1` (`res`, a history variable, counts resolutions); `Conserve` when funds are tracked. `EventuallyResolves` is M4's `<>Resolved` (M4 starts held); models that start available use `(hst = "held") ~> Resolved`. The unsafe variant splits `Handle` and `Expire` into a read step and a write step that trusts the read, and lets expiry release any unresolved hold. Liveness is checked on a separate M4-family model, `HoldLive.tla`, as Learn TLA+ advises (topics/optimization.html#separate-safety-and-liveness).

---

## 2. Lessons

### S5.L1 · bridge · States, actions, behaviors, stuttering

**Objective.** Read a TLA+ spec as a set of behaviors: mark finite prefixes (each continued by stuttering forever) as allowed or forbidden, including one with a repeated state, and name the actions enabled in a given state.
**KCs.** KC-5.behaviors-stuttering. **Prerequisites.** KC-1.two-state-property (primed variables, S1.L4). **Instruments.** INS-theater, INS-spectacle. **Generators.** GEN-trace-allowed. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3). Copy: "`Spec == x = 0 /\ [][x' = x + 1]_x`. Is the behavior 0, 1, 1, 2, 3, … allowed?" A "Yes: the step from 1 to 1 leaves x unchanged." · B "No: every step must add 1." · C "Only if TLC runs with `-deadlock`." **Key:** A, by definition: `[A]_v` means `A \/ v' = v` (Learn TLA+, Core › TLA+ [V]). **Why** A: a stuttering step satisfies the box. B: reads `[][Next]_x` as `[]Next` (dp:T7). C: flags change what TLC checks, not which behaviors a spec allows (dp:T9).

**Segment · Behaviors as sequences** (12–15 min). INS-spectacle draws M2's four reachable states [X RUN-tlc-atomic]; the Theater replays behaviors as trace tables with a "stutter" control. Copy: "A state gives each variable a value; a step is a pair of states; a behavior is an infinite sequence of states; a spec is the set of behaviors it allows." The roadmap's *labeled transitions* are named next (a definition [D]; the Theater's graphs are TLC's, each edge labeled with its action, §1). Copy: "TLC also records which action took each step. Draw those names on the arrows between states and the reachable graph is a *labeled transition system*: a spec's actions are its labels, and a behavior is a path through the graph that may also stay in a state, which is stuttering."

**Call It** (k = 3, chance 1/3). Copy: "Is the behavior that stays in the initial state forever, with no worker ever spending, a behavior of `Spec == Init_ /\ [][Next]_vars`?" A "Yes." · B "No: `Spend(w1)` is enabled, so the next step must be a Spend." · C "No: a behavior must end in a state where nothing is enabled." **Key:** A, by definition; the Theater shows it as the initial state with a stuttering self-loop. **Why** A: every step leaves `vars` unchanged, which the box permits, and nothing in `Spec` forces a Next step. Forcing progress is what fairness adds (S5.L7). B: enabled is not taken (dp:T10). C: behaviors are infinite; a finished system stutters forever (dp:T8). **Surprise forecast:** yes.

**Graded item.** GEN-trace-allowed template 3 (stuttering), band 1–2 variables and 2–3 actions: a seeded spec (bounded counter, toggle, or M2 with Init and Amount varied). The learner gives one allowed prefix containing a stuttering step and one forbidden prefix, each read as "then stutter forever"; graded step by step against the state graph Spectacle computes at grade time (Spectacle = TLC, GATE-conformance), the first illegal step highlighted.

**Exit item.** GEN-trace-allowed template 2 (enabled actions, the labels on the arrows that leave the state) on a seeded state of a fresh spec.
**Today cards created.** Both templates at the spine §4.1 windows (about 1–3, 7, 21 and 45–60 days). **Twin.** None. **Sibling bridge.** None.
**Reading** (bridge pointer): Learn TLA+ (© 2022, read 2026-10-23), Core › TLA+ §"Learning from PlusCal" (`core/tla.html#learning-from-pluscal`), for `[][Next]_vars` as `[](Next \/ UNCHANGED vars)`; Core › Temporal Properties §"Intro" (`core/temporal-logic.html#intro`): "any behavior is allowed to stutter".
**Build this:** LAB-5.1 setup: `statespace doctor` shows Java 21 and the pinned 1.8.0 jar hash [X RUN-tlc-jars].
**If cut** (spine §14, #7): the KC moves to S5.L3 with one added template 3 item.

---

### S5.L2 · bridge · A first spec, and the flags that change verdicts

**Objective.** Write M1 in TLA+ in the tab, its PlusCal form beside it (D-09); run it on the Bench with default flags and with `-deadlock`; from the raw output, say which message comes first and why, and give the `-deadlock` counterexample's length in actions.
**KCs.** KC-5.tlc-flags-matter. **Prerequisites.** KC-5.behaviors-stuttering. **Instruments.** INS-spectacle, INS-bench-tlc (phones: the recorded run with its id). **Generators.** GEN-call-it. **Specimen.** SP-5.2. **Drawer.** D-09; on the builder's path also D-15 (§12 issue 5). **Minutes.** 15–25.

**Author's note.** The learner runs hand-written TLA+: the PlusCal translator inserts a `Terminating` action so that finishing is not reported as a deadlock (Learn TLA+, Core › Concurrency [V]), so SP-5.2 belongs to hand-written specs. D-09 shows the translation; the course's own translation of M1 and its default-flags verdict are {{run:RUN-pcal-doublespend}}.

**Prequestion** (k = 3, chance 1/3). Copy: "TLC prints `Error: Deadlock reached.` What does that tell you?" A "Some reachable state enables no action of Next." · B "Two workers are waiting on each other's lock." · C "The invariant holds, because TLC finished." **Key:** A. **Why** A: TLC's deadlock check looks for a reachable state with no Next successor; here, both workers are done. B: a lock cycle is one cause of that, but M1 has no locks (dp:T9). C: TLC stopped early; the invariant was checked only on the states explored so far (dp:T5).

**Segment · Run it twice** (12–15 min). M1 on INS-bench-tlc, first with default flags, then with `-deadlock`.

**Call It 1** (k = 3, chance 1/3). Copy: "Default flags. What does TLC report first?" A "Invariant NoOverspend is violated." · B "Deadlock reached." · C "No error has been found." **Key:** B [X RUN-tlc-doublespend]: 11 states generated, 10 distinct, 3 left on the queue, depth 4; the trace is Read(w1), Write(w1), Read(w2), 3 actions (4 states), after which w2 has read 20, below 80, and finished. **Why** A: breadth-first search reaches that finished state at depth 4, before the violation at depth 5, and default flags treat "nothing enabled" as an error (dp:T9). B: as recorded, in 1.7.4 and 1.8.0 alike. C: there is both a deadlock and a violation (dp:T5). **Surprise forecast:** yes.

Reveal. Copy: "`-deadlock` turns the deadlock check off." TLC 1.8.0's own help reads: "if specified DO NOT CHECK FOR DEADLOCK" [X RUN-tlc-help]. With it, TLC reports "Invariant NoOverspend is violated": 12 states generated, 11 distinct, 2 on the queue, depth 5 [X RUN-tlc-doublespend].

**Call It 2** (template 2, k = 4, chance 1/4). Copy: "How long is the `-deadlock` counterexample?" A "1–2 actions" · B "3–4 actions" · C "5–6 actions" · D "7 or more". **Key:** B, 4 actions (5 states): Read(w1), Read(w2), Write(w1), Write(w2), ending with spent 160 and bal 20 [X RUN-tlc-doublespend]. **Why** A: two writes each need a prior read (dp:C1). B: four steps. C: counts the five states as steps (dp:T6). D: counts generated states (dp:T6). **Surprise forecast:** no.

Version notes (copy): 1.7.4 rejects `-dumpTrace` ("unrecognized option"), 1.8.0 writes JSON; 1.7.4 labels the step `Read`, 1.8.0 `Read(w1)` [X RUN-tlc-doublespend]. Receipts keep the version line verbatim.

**Graded item.** GEN-call-it template 2 (trace length as an interval) on a seeded M1 variant (two or three workers; Init and Amount drawn so that a violation exists); key: the shortest violation in actions from Spectacle's breadth-first search at grade time (Spectacle = TLC at one worker, GATE-conformance).
**Exit item.** GEN-call-it template 1 (three-way verdict): for a seeded spec and flag set, which comes first: invariant violated, deadlock reached, or no error. Keys: from Spectacle at grade time through the adapter's deadlock check (Spectacle's own checker has none), gated by GATE-conformance [X RUN-spectacle-s5s8].

**Today cards created.** Templates 1 and 2; a re-find of SP-5.2 at 7 days or more. **Twin.** None. **Sibling bridge.** None.
**Reading:** Learn TLA+ (read 2026-10-23), Core › Writing Specifications (`core/pluscal.html`); Core › Concurrency §"Processes" and §"await" (`core/concurrency.html#processes`, `#await`), including the `Terminating` note.
**Build this:** LAB-5.1, "Run the provided DoubleSpend configuration; read the receipt and its argv" (2 min).
**If cut** (#4): the KC and SP-5.2 move to S5.L3 with one added template 1 item.

---

### S5.L3 · core · The double spend: you are the scheduler

**Objective.** Choosing enabled actions in the Theater, produce a behavior of M1 that pays out more than Init and name its class; confirm it with TLC; merge guard and write into one action; account for both distinct-state counts, 11 and 4, with version, flags and constants; predict how a finer grain changes the shortest witness.
**KCs.** KC-5.interleaving-granularity (expert scaffolding). **Prerequisites.** KC-5.behaviors-stuttering; KC-5.tlc-flags-matter (order). **Instruments.** INS-theater, INS-spectacle, INS-bench-tlc. **Generators.** GEN-find-the-witness, GEN-trace-allowed; GEN-call-it for the counts item (§12 issue 9). **Specimens.** SP-5.1, SP-5.5. **Claim.** CL-5.1. **Erosion.** cashes ER-2 on the default path. **Terms.** Theater. **Minutes.** 43–52 (prequestions, three segments, exit).

**Hook.** Copy: "An agent's change note: 'The guard runs before every write. Safe under concurrency.'"

**PQ1** (k = 3, chance 1/3). Copy: "Two workers each read `bal`, and if what they read is at least 80, write back what they read minus 80. `bal` starts at 100; the read and the write are separate steps. Can more than 100 be paid out?" A "Yes." · B "No: the guard runs before each write." · C "Only under a rare schedule, so not in practice." **Key:** A. **Why** A: both can read 100 before either writes. B: the guard tests a value that may be stale by the time of the write (dp:C1). C: the checker tries every schedule; traffic finds rare ones (dp:C4).

**PQ2** (k = 3, chance 1/3). Copy: "Which change removes the overpayment?" A "Read, check and write in one atomic step." · B "Make the read and the write faster." · C "Re-check the balance in its own step just before the write." **Key:** A. **Why** A: no other worker can act between the check and the write. B: speed narrows the window without closing it (dp:C4). C: the re-check is itself a step that can go stale (dp:C3).

**Segment 1 · Be the scheduler** (15 min). INS-theater on M1's TLC graph: an enabled-action bar, branching history, a trace table narrating `bal`, `spent` and each `seen`.

**Call It** (k = 3, chance 1/3). Copy: "Which orders of the four steps R1, R2, W1, W2 pay out 160?" A "Only R1, R2, W1, W2." · B "Any order in which both reads come before both writes." · C "Any order at all." **Key:** B (the four such orders are paths of the graph; spent 160 is the recorded end state [X RUN-tlc-doublespend]). **Why** A: one witness taken for the whole bug; write order does not matter (dp:Z3). B: both workers hold `seen = 100` and both pass the guard. C: in R1, W1, R2, W2, worker 2 reads 20 and stops (dp:C1). **Surprise forecast:** moderate.

**Graded item.** GEN-find-the-witness template 2 (trace), band 2–3 workers: a seeded M1 variant (Amount ≤ Init < 2·Amount for two workers, Init < 3·Amount for three). The engine replays the submitted trace (no stored key) and checks that NoOverspend fails; then the learner names the class: "all reads before the competing writes", "one worker overspends alone" or "the initial state already violates". Practice shows class hints; probes are one-shot (M-class-hint).

**Segment 2 · Ask TLC** (15 min). INS-bench-tlc runs M1 with `-deadlock` (violated, 11 distinct, 4 actions [X RUN-tlc-doublespend]), then M2.

**Call It** (k = 3, chance 1/3). Copy: "M2 does the guard and the write in one action. With `-deadlock`, what does TLC report?" A "No error, exploration complete." · B "A violation with a shorter trace." · C "Deadlock reached." **Key:** A [X RUN-tlc-atomic]: 5 states generated, 4 distinct, depth 3. **Why** A: no state lies between a read and its write, so no stale read exists. B: the grain changed which behaviors exist, not just their length (dp:C3). C: `-deadlock` turns that check off (dp:T9). **Surprise forecast:** no.

Accounting for the counts (copy; the per-depth split is derived by hand [D], the totals are recorded): M1's 11 distinct states fall 1, 2, 3, 4 and 1 at depths 1 to 5; M2's 4 fall 1, 2 and 1. The extra states are moments between a worker's read and its write, while its `seen` can go stale. The complete M1 space is also 11 [X RUN-tlc-full]. With three workers at Amount 40, M1 is violated with 69 distinct states when found [X RUN-tlc-unsafe-3w], and M2 finds no error in 8 [X RUN-tlc-atomic].

**Erosion forecast, ER-2** (M-erosion-forecast). Restate CL-2.4 (`run_conserves`) from memory (uncredited), then call (k = 3): "Which segment of CL-2.4 does this trace crack?" A "proposition-of-model" · B "correspondence" · C "requirement-fit". **Key:** B. **Why** A: the Lean theorem about sequential runs is still true; a trace of the concurrent system does not refute it (dp:P3, claims about the model and the system conflated). B: the running system is not sequential; SEAM-2 ("transfers run one at a time") cracks. C: nothing about intent changed; requirement-fit is not where proof status lives (dp:L3). Remedies offered: an atomic action (CL-5.1) and isolation (S6). On the builder's path the forecast runs in LAB-2.5, where CL-2.4 mints already cracked. **Surprise forecast:** no.

**Graded item.** GEN-trace-allowed template 1 (safety prefix) on a seeded M2 variant: one behavior that satisfies NoOverspend and, if one exists, a violating prefix, otherwise "none"; graded on the variant's complete TLC graph; the double-spend order is not even a behavior of M2.

**Segment 3 · Change the grain** (12 min). INS-spectacle on M3.

**Call It** (k = 3, chance 1/3). Copy: "With the check split out of the read, the shortest violation is…" A "shorter than 4 actions" · B "still 4 actions" · C "longer". **Key:** C, 6 actions (7 states): Read(w1), Check(w1), Read(w2), Write(w1), Check(w2), Write(w2); 20 distinct states, complete [X RUN-tlc-rtw3]. **Why** A: a finer grain adds steps (dp:C3). B: treats steps as happening together (dp:C1). C: each worker now needs three steps, and the extra scheduling point multiplies interleavings. **Surprise forecast:** yes.

**Graded item.** GEN-call-it template 4 (about five true/false statements) on a seeded grain variant (2–4 steps per worker, 2–3 workers): its shortest witness in actions, its state count against the merged version, and the flags and constants a count depends on; keys from Spectacle at grade time.

**Exit items.** (1) GEN-find-the-witness template 2 on a fresh three-worker variant, as a probe. (2) GEN-trace-allowed template 2 (enabled actions) in a mid-interleaving state of M3.

**Today cards created.** The three families above for KC-5.interleaving-granularity; re-finds of SP-5.1 and SP-5.5 at 7 days or more; the ER-2 forecast goes to the claim graph.
**Production twin.** TLA+ By Example's authoring contract [tlabyex]: each lesson declares `expect: success|violation`, runs in CI, and labels counts "first counterexample" or "complete local exploration with `-deadlock -continue`" (R3 F4). Tracing question: label this lesson's runs, and each of 11, 4 and 20 as first-counterexample or complete. Pin in {{run:RUN-twin-pins}}.
**Sibling bridge.** None. **Build this:** LAB-5.2, "Make the critical step atomic; complete check" (25 min).

---

### S5.L4 · bridge · The holds lifecycle

**Objective.** Write the one-hold lifecycle (Place, then Capture or Release, all system actions) with a resolution counter, state "a hold never resolves twice" as the invariant `res <= 1`, and give a behavior for each outcome and a forbidden step.
**KCs.** KC-5.holds-lifecycle. **Prerequisites.** KC-5.behaviors-stuttering. **Instruments.** INS-spectacle. **Generators.** GEN-trace-allowed. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3). Copy: "Which formula says 'a hold never resolves twice'?" A "`res <= 1` as an invariant, where every Capture or Release adds 1 to `res`." · B "`<>(hst \in {"captured", "released"})`" · C "`~(hst = "captured" /\ hst = "released")`" **Key:** A. **Why** A: a history variable makes past events visible to a state predicate (Learn TLA+, Topics › Auxiliary Variables §"History Variables" [V]). B: that is "eventually resolves", a different kind of property (dp:C5). C: true of every state, because one state holds one value; it cannot remember two events (dp:T11).

**Segment · One hold** (12–15 min). The learner writes the lifecycle in INS-spectacle; the minimap shows the whole graph. Also shown: the action property `[][(hst \in {"captured", "released"}) => hst' = hst]_hst`, "a resolved hold stays resolved", a box action formula TLC can check (Learn TLA+, Core › Action Properties [V]). The implication is parenthesized because SANY rejects the unparenthesized form, which Spectacle's parser accepts [X RUN-spectacle-s5s8].

**Call It** (k = 3, chance 1/3). Copy: "Can `res` reach 2 in this lifecycle?" A "No." · B "Yes: Capture and Release are both enabled in held, so both fire." · C "It depends on the scheduler." **Key:** A {{run:RUN-tlc-lifecycle}}. **Why** A: each resolution requires `hst = "held"` and leaves it, so after one neither is enabled. B: one step takes one action (dp:T16). C: the model covers every schedule (dp:C4). **Surprise forecast:** no.

**Graded item.** GEN-trace-allowed template 1 (safety prefix) on a seeded lifecycle variant (seeds: Release enabled from captured; a Capture that skips `res`; a second Place): a behavior that satisfies `res <= 1` and a violating prefix, or "none"; graded on the variant's complete TLC graph.
**Exit item.** GEN-trace-allowed template 2 (enabled actions) on a seeded lifecycle state.
**Today cards created.** Templates 1 and 2. **Sibling bridge.** None.
**Twin card.** TigerBeetle's two-phase transfers [tb2pc]: "A pending transfer can only be posted or voided once"; repeats return `pending_transfer_already_posted`, `pending_transfer_already_voided` or `pending_transfer_expired` (§"Resolve Funds", §"Errors"; read 2026-10-23 [V]). Tracing question: which disabled branch of your spec corresponds to each error? Pin in {{run:RUN-twin-pins}}.
**Reading:** Learn TLA+ (read 2026-10-23), Core › Writing an Invariant (`core/invariants.html`); Topics › Auxiliary Variables §"History Variables" (`topics/aux-vars.html#history-variables`); Core › Action Properties (`core/action-properties.html`).
**Build this:** LAB-5.3, "Holds lifecycle with NeverTwice" (25 min).
**If cut** (#10): the KC moves to S5.L5 with one added template 1 item.

---

### S5.L5 · bridge · The hostile environment

**Objective.** Add the environment as actions (replies delivered at least once, so duplicated, delayed or late; expiry as a competing path; crash and restart), find a hold resolved twice, and fix it so that `res <= 1` holds with every environment action on.
**KCs.** KC-5.hostile-environment. **Prerequisites.** KC-5.holds-lifecycle. **Instruments.** INS-theater, INS-spectacle. **Generators.** GEN-find-the-witness; GEN-call-it for the exit item (§12 issue 9). **Specimens.** SP-5.4, SP-5.7. **Claim.** CL-5.2, which plants SEAM-4. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3). Copy: "The provider's 'ok' may arrive twice, or after the hold has expired. Which handler keeps `res <= 1`?" A "Resolve only if the stored state is still capturing, tested and written in one step." · B "Remember handled replies in the worker's memory." · C "Check the stored state, then write in the next step." **Key:** A. **Why** A: a compare-and-set on durable state makes duplicates and late replies no-ops. B: Crash erases memory, and the duplicate is handled again (dp:T13). C: the check can go stale before the write, as in S5.L3 (dp:C3).

**Segment · The world misbehaves** (15 min). In a Theater scene of M5's unsafe variant the learner drives Reply, Expire, Crash and Restart; INS-spectacle then checks `NeverTwice`.

**Call It** (k = 3, chance 1/3). Copy: "With duplicates, late replies, crashes and expiry all on, can the unsafe variant reach `res = 2`?" A "Yes." · B "No: each path checks the state before writing." · C "Only if the provider misbehaves on purpose." **Key:** A {{run:RUN-tlc-resolved-twice}}; expected shape: the worker and the expiry job both read capturing, then both write; the length is whatever the run records. **Why** A: two resolution paths each trust a read that the other invalidates. B: checking and writing in separate steps is S5.L3's race again (dp:C1). C: duplicates, delays and crashes are ordinary behavior for a network and a process, not malice (dp:T15). **Surprise forecast:** no.

The fix makes each resolution one compare-and-set action: no error, complete, `CrashesOn = TRUE`, every environment action on, both outcomes reachable {{run:RUN-tlc-never-twice}}. CL-5.2 is drafted from the receipt, SEAM-4 dashed. Copy: "This model sends the capture request in the same step that commits the hold. Real systems cannot; Stage 8 takes the step apart."

**Dated incident** (SP-5.7, the "dated incidents" filter). Copy: "In 2015 a researcher sent two near-simultaneous confirmations of the same staged gift-card transfer; both went through, and $15 spread over three cards became $20." (Sakurity, 2015-05-21 [starbucks15, V]); toy model {{run:RUN-tlc-starbucks15}}.

**Graded item.** GEN-find-the-witness template 2 (trace) on a seeded hostile variant (which handler is split; which environment actions are on; a volatile-dedup seed). The engine replays the trace; then the learner names the class: competing paths, duplicate after a crash, or stale read.
**Exit item.** GEN-call-it template 4: (1) "At-least-once delivery means a reply can be handled twice." (2) "A crash erases the worker's memory, not the stored hold." (3) "If `res <= 1` holds with crashes on, it holds with crashes off." (4) "If it holds with crashes off, it holds with crashes on." (5) "`res <= 1` means the provider charged at most once." Keys T, T, T, F, F: removing actions only removes behaviors, so safety survives it; adding them can break it; the provider's ledger is not in the model (SEAM-4).
**Today cards created.** Both items; a re-find of SP-5.4. **Twin.** None. **Sibling bridge.** None.
**Reading:** Learn TLA+ (read 2026-10-23), Core › Nondeterminism (`core/nondeterminism.html`); Core › Temporal Properties §"Anything can crash" (`core/temporal-logic.html#anything-can-crash`).
**Build this:** LAB-5.4, "Environment actions; find resolved-twice; fix it" (25 min).

---

### S5.L6 · core · Safety or liveness?

**Objective.** Classify holds properties as safety, liveness or a conjunction; for each, give a satisfying and a violating behavior (a finite prefix for safety, a lasso for liveness); read and write `[]`, `<>` and `~>`, including what a formula with no temporal operator says.
**KCs.** KC-5.safety-vs-liveness (threshold), KC-5.temporal-operators (novice scaffolding). **Prerequisites.** KC-5.behaviors-stuttering; KC-5.holds-lifecycle (examples). **Instruments.** INS-theater, INS-lasso. **Generators.** GEN-trace-allowed, GEN-lasso-or-not, GEN-call-it. **Minutes.** 43–52 (prequestions, three segments, exit).

**Author's core** (copy-ready). A property is *safety* when every behavior that violates it has a finite prefix that no continuation can repair: the bad thing happened. It is *liveness* when every finite prefix can still be extended to a behavior that satisfies it: no finite prefix proves it violated. Every property is a safety property conjoined with a liveness property [alpern85]. In a finite-state spec a liveness violation can always be shown as a lasso: a finite stem, then a cycle repeated forever. TLA+ formulas cannot see stuttering, so "within k steps" needs a clock variable, and is then safety. Learn TLA+: safety says the system "doesn't do bad things", liveness that it "always does a good thing" (Core › Temporal Properties [V]).

**PQ1** (k = 3, chance 1/3). Copy: "Which can a finite log refute: 'a hold never resolves twice' or 'a hold eventually resolves'?" A "Only the first." · B "Both." · C "Only the second." **Key:** A. **Why** A: a second resolution is visible in a finite log; a hold still unresolved at the end of a log may resolve later. B and C: safety and liveness merged or swapped (dp:C5).

**PQ2** (k = 3, chance 1/3). Copy: "'Every hold resolves before its deadline', with the deadline on a clock variable, is…" A "safety" · B "liveness" · C "both at once". **Key:** A: the witness is a finite prefix in which the clock passes the deadline with the hold unresolved. **Why** B: bounded response sounds like "eventually" but has a finite witness (dp:T12). C: it is pure safety; "exactly once" is the conjunction case (dp:C5).

**Segment 1 · Two kinds of witness** (15 min). INS-theater on S5.L4's lifecycle graph {{run:RUN-tlc-lifecycle}}; the learner tries to build a finite prefix violating `EventuallyResolves`.

**Call It** (k = 3, chance 1/3). Copy: "Can any finite prefix of this spec violate `EventuallyResolves`?" A "No." · B "Yes: any prefix that ends while the hold is held." · C "Yes, if the prefix is long enough." **Key:** A: from every reachable state a resolved state is still reachable (a graph check). **Why** A: liveness has no finite witness. B: reads the property over finite traces only (dp:T1). C: length does not matter; continuation does (dp:C5). **Surprise forecast:** moderate.

**Graded item.** GEN-call-it template 1 (safety, liveness or conjunction) on seeded holds properties (invariants, box action formulas, `<>P`, `P ~> Q`, `[]<>P`, bounded response on a clock, exactly-once); keys from each template's construction.

**Segment 2 · Lassos** (15 min). INS-lasso on M4's graph, fairness removed.

**Call It** (k = 3, chance 1/3). Copy: "With no fairness conjunct, does M4 satisfy `EventuallyResolves`?" A "Yes: Timeout and Capture exist." · B "No." · C "Yes, for the states TLC explored." **Key:** B {{run:RUN-tlc-hold-fairness}} row r1: staying held and stuttering forever is a behavior. **Why** A: existing is not happening (dp:T10). B: S5.L1's stutter, now as a lasso whose cycle is one stuttering step. C: confuses a liveness verdict with a bound (dp:T5). **Surprise forecast:** yes.

**Graded item.** GEN-lasso-or-not template 1 (starving) on seeded variants without fairness: a violating lasso (stem and cycle), or "none"; INS-lasso checks that it is a path, that the cycle closes and that the property fails on it. These items carry KC-5.safety-vs-liveness; KC-5.lasso-reading starts in S5.L7 (§12 issue 1).

**Segment 3 · Writing it** (12 min). INS-lasso evaluates formulas over the lifecycle's behaviors, starting with `Avail == hst = "available"` as a PROPERTY.

**Call It** (k = 3, chance 1/3). Copy: "Your config says `PROPERTY Avail`. Is it violated?" A "No." · B "Yes: Avail is false after Place." · C "Yes, unless every hold is eventually placed." **Key:** A {{run:RUN-tlc-bare-property}}: a formula with no temporal operator is about the first state, where it holds (Learn TLA+: "anything outside a temporal operator ([] or <>) is tested as true in the initial state", Core › TLA+ [V]). **Why** B: reads an implicit `[]` (dp:T1). C: reads an implicit `<>` (dp:T1). **Surprise forecast:** yes.

Then (copy): `INVARIANT Inv` means `[]Inv`; a PROPERTY writes `[]`, `<>` or `~>` explicitly; `Responds == (hst = "held") ~> (hst \in {"captured", "released"})`; "exactly once" is `NeverTwice /\ EventuallyResolves`, never a single eager `<>` (dp:T3).

**Graded item.** GEN-call-it template 4: which of about five lassos satisfy a seeded formula (`P ~> Q`, `[]<>P`, `<>[]P`); keys from INS-lasso at grade time.

**Exit items.** (1) GEN-call-it template 1 on fresh properties, as a probe. (2) GEN-lasso-or-not template 1 on a fresh variant. (3) One English-to-formula pick (GEN-call-it template 1 over three formulas), because English to formula is the harder direction: wrong 47% of the time against 23–24% for formula to English (GSNK22, grade C; dp:T4).
**Today cards created.** All three, for KC-5.safety-vs-liveness (threshold: extra calls; returns in S7.L5 and S8.L5; S5 and S8 Defences) and KC-5.temporal-operators. Confusable set B opens: "Which is it?" sets after the exit item, at most half a session, among KCs already taught.
**Production twin.** TigerBeetle's two-phase transfers [tb2pc]: "A pending transfer can only be posted or voided once"; a pending transfer whose timeout interval passes expires and the full amount returns (§"Resolve Funds"; read 2026-10-23 [V]). Tracing questions: classify each guarantee; name what the second rests on (an expiry step that runs; the page does not say who performs it, so record that as [A]). Pin in {{run:RUN-twin-pins}}.
**Sibling bridge.** None. **Build this:** LAB-5.5, first half: add `EventuallyResolves` to your `HoldLive.tla` with no fairness and keep the lasso TLC returns.

---

### S5.L7 · core · Fairness: what the scheduler must promise

**Objective.** State the weak or strong fairness that "a hold eventually resolves" needs; read a lasso against each fairness conjunct (taken on the cycle? enabled at every state, some, none?); keep fairness on the system's own actions; draw it as a dashed [A] field.
**KCs.** KC-5.fairness (threshold), KC-5.lasso-reading (novice scaffolding). **Prerequisites.** KC-5.safety-vs-liveness; KC-5.temporal-operators; KC-5.hostile-environment (who owns an action). **Instruments.** INS-lasso, INS-bench-tlc. **Generators.** GEN-lasso-or-not; GEN-call-it for the exit item (§12 issue 9). **Specimen.** SP-5.3. **Claim.** CL-5.3, which plants SEAM-8. **Fading family.** F5. **Minutes.** 43–52 (prequestions, three segments, exit).

**Definitions** (copy): `WF_v(A) == <>[](ENABLED <<A>>_v) => []<><<A>>_v` and `SF_v(A) == []<>(ENABLED <<A>>_v) => []<><<A>>_v` (Learn TLA+, Core › TLA+ §"Fairness in TLA+" [V]). On a lasso whose cycle is C, WF on A holds exactly when A is taken somewhere on C or is disabled at some state of C; SF on A holds exactly when A is taken on C or is disabled at every state of C (A2-F10; INS-lasso implements this rule).

**PQ1** (k = 3, chance 1/3). Copy: "The worker retries a capture; the provider may answer 'busy' forever; the scheduler is weakly fair to the retry. Must the hold resolve?" A "No." · B "Yes: weak fairness guarantees progress." · C "Yes, because Timeout exists." **Key:** A: retry, busy, retry, busy forever is a fair behavior, and nothing forces Capture or Timeout. **Why** B: WF forces only actions that stay enabled (dp:T14). C: an action that exists need not happen (dp:T10).

**PQ2** (k = 3, chance 1/3). Copy: "Which fairness may a claim about your system rest on without saying so?" A "None." · B "WF on every action, since it is standard." · C "SF on the provider, since providers answer eventually." **Key:** A: every conjunct is an assumption, about your scheduler on your actions, about the world on the provider's. **Why** B and C: unstated promises, the second about someone else's system (dp:T15).

**Worked example and fading (F5).** L0, correct and complete: M4 with Timeout widened to `st \in {"held", "pending"}` and `Fair == WF_vars(Timeout)`. Steps: (1) the action and its enabling condition; (2) the safety invariant still holds, since every resolution requires an unresolved state; (3) the fairness conjunct, on a system action only; (4) the property `EventuallyResolves`; (5) the configuration (`SPECIFICATION Spec`, `PROPERTY EventuallyResolves`, no SYMMETRY, no CONSTRAINT) and the stamp "[M] · constants; fairness as [A]". L1–L3 fade backward: blank step 3, then steps 3–4, then step 1's enabling condition; no prompt on any blank, one principle prompt per revealed step (copy: "Fairness is a promise. Whose?"). L4, transfer: a fresh spec (a cancel path, or S8's worker). Staircase 3-up, 1-down per KC (A/B [dp rows 10–12]).

**Segment 1 · Read a cycle** (15 min). *Worked example first* (F5 rung L0, about 3 min, read-only): the L0 example's five steps, shown complete and correct, before the first call. INS-lasso imports M4's TLC JSON trace [X RUN-tlc-hold-lasso], whose last action targets state 1, closing the loop [X evidence: a2r3/tla/live/Hold.trace.json], in the format that W0-S05 documents [X RUN-tlc-lasso-json].

**Call It** (k = 3, chance 1/3). Copy: "`Fair == WF_vars(Try) /\ WF_vars(Busy)`. Does M4 satisfy `EventuallyResolves`?" A "Yes." · B "No." · C "No, but only if the provider acts maliciously." **Key:** B [X RUN-tlc-hold-lasso]: held → Try → pending → Busy → held → Try → pending → Busy → back to state 1; 9 states generated, 8 distinct. **Why** A: WF on Try and Busy is satisfied by this cycle (dp:T14). B: no conjunct forces Capture or Timeout. C: answering "busy" is a legal provider behavior (dp:T15). **Surprise forecast:** moderate.

The reading table (copy): Try and Busy are taken on the cycle; Capture is never taken, enabled only at the two pending states; Timeout is never taken, enabled only at the two held states. Copy: "Busy is the provider's action, so WF on Busy is already a promise about the world, and still the hold need not resolve."

**Graded item.** GEN-lasso-or-not template 1 (starving) on seeded variants (which actions carry WF): stem and cycle, or "none"; INS-lasso checks the path, the closure, the property failing on every cycle state, and every stated conjunct holding on the cycle.

**Segment 2 · Weak or strong** (15 min). Fairness toggles in INS-lasso on the same graph; INS-bench-tlc confirms each variant {{run:RUN-tlc-hold-fairness}}, rows r3–r5.

**Call It** (k = 2, chance 1/2). Copy: "Add `WF_vars(Capture)`. Does the cycle survive?" A "Yes." · B "No." **Key:** A (row r3): Capture is disabled at the held states of the cycle, so WF on Capture holds without Capture being taken. **Why** A: WF needs Capture continuously enabled. B: treats WF as "eventually taken if ever enabled" (dp:T14). **Surprise forecast:** yes.

Then, as copy: `SF_vars(Capture)` removes the cycle (row r4), since Capture is enabled infinitely often and never taken, but it promises something about the provider. `WF_vars(Try) /\ SF_vars(Timeout)` with Timeout enabled only in held still fails (row r5): a provider that stays silent leaves the hold pending forever, where Timeout is disabled.

**Graded item.** GEN-lasso-or-not template 2 (fair cycle) on seeded fairness sets (none, WF or SF per action; Timeout held-only or widened): a fair violating lasso, or "none"; keys at grade time from INS-lasso, conformance-gated against TLC fixtures.

**Segment 3 · Whose promise** (12 min). INS-bench-tlc runs the L0 worked example shown in Segment 1: Timeout widened, `Fair == WF_vars(Timeout)` (row r6).

**Call It** (k = 3, chance 1/3). Copy: "Does `EventuallyResolves` hold now?" A "Yes." · B "No: the Try and Busy cycle still starves Timeout." · C "No: the behavior can stutter forever." **Key:** A (row r6): in any behavior that never resolves, Timeout is enabled at every state, so WF forces it. **Why** B: Timeout is now continuously enabled, so WF suffices (dp:T14). C: WF on Timeout rules out stuttering forever while Timeout is enabled (dp:T10). **Surprise forecast:** no.

CL-5.3 is drafted, "[M] · constants; fairness as [A]": WF on Timeout, a system action; no environment fairness; crash actions off in this check, which plants SEAM-8, "the worker keeps running under weak fairness", drawn dashed. The price, as copy: "A provider acceptance racing the expiry is decided by whichever step comes first. A capture the provider performs after we release is outside this model." (SEAM-4; S8.L4.)

**Graded item.** GEN-lasso-or-not template 2 on seeded system-only fairness designs, where "none" is often the key.
**Exit items.** (1) GEN-lasso-or-not template 2, as a probe. (2) GEN-call-it template 4 on about five fairness statements over a seeded spec, keys from INS-lasso.
**Today cards created.** Both, for KC-5.fairness (threshold; spiral return in S8.L5; S8 Defence) and KC-5.lasso-reading. Confusable set E (none, weak, strong; lasso shapes) opens.
**Liveness base-rate card.** Copy: "Model-written TLA+ specs violated 41.9% of liveness properties against 8.3% of safety properties, with fairness choices 'overly technical or random'. Read an agent's fairness line by line." (SysMoBench, arXiv 2509.23130, v3 2026-01-28 [V], as quoted in the brief.)
**Production twin.** TigerBeetle's pending-transfer expiry [tb2pc]. Tracing question: in your model's terms, what fairness does "every pending transfer is eventually resolved" need, and does the page state it? (Key: an expiry step that keeps being scheduled; the page gives expiry semantics, not who performs it.) Reading card: TigerBeetle, "Simulation testing for liveness" (2023-07-06). Pin in {{run:RUN-twin-pins}}.
**Sibling bridge.** None. **Build this:** LAB-5.5, "Liveness under stated fairness; validate the starving lasso" (25 min).

---

### S5.L8 · bridge · What "no error" means

**Objective.** For a TLC result, state its scope (constants, state constraints and symmetry, which together replace an unbounded system by a finite-state abstraction; completeness with its fingerprint-collision estimate; worker count) and choose its stamp: [M] · constants · complete or partial, never [P].
**KCs.** KC-5.bounded-scope (threshold). **Prerequisites.** KC-5.tlc-flags-matter. **Instruments.** INS-spectacle with its minimap (M-telescope), INS-bench-tlc. **Generators.** GEN-call-it, GEN-which-stamp. **Specimen.** SP-5.6. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3). Copy: "TLC on two workers: 'Model checking completed. No error has been found.' What may you claim?" A "[M] · two workers, these constants · complete" · B "[P]: the transfer never overspends" · C "[T] · n = the distinct-state count" **Key:** A. **Why** A: exactly this configuration, every reachable state. B: a bounded check presented as proof (dp:T5). C: a model check is not a sample of tests (dp:X1).

**Segment · Change the constants** (12–15 min). INS-spectacle and its minimap on M1 at Amount 40, first with two workers, then three.

**Call It** (k = 3, chance 1/3). Copy: "M1, Init 100, Amount 40, two workers. Does TLC find a violation?" A "Yes, as at Amount 80." · B "No." · C "Only with `-continue`." **Key:** B {{run:RUN-tlc-n3-only}}: two stale writes spend at most 80. With three workers the violation appears, at 69 distinct states when found and depth 7 [X RUN-tlc-unsafe-3w]. **Why** A: one configuration's verdict carried to another (dp:T5). C: `-continue` keeps searching after a violation; it creates none (dp:T9). **Surprise forecast:** yes.

Reveal, from an unbounded system to a finite model (about 2 min, inside the segment; carried by KC-5.bounded-scope, no new KC). Copy: "Your system has no fixed number of workers and no cap on a balance, and TLC can complete a check only on a finite graph. So a check explores a finite-state abstraction of your system: a model with finitely many states that stands in for it. Three choices shape the abstraction. Constants fix the number of workers and the amounts (`Workers`, `Init`, `Amount`). A CONSTRAINT cuts it off at a bound. SYMMETRY counts states that differ only by swapping interchangeable workers as one. What TLC reports is about the abstraction and covers your system only as far as the abstraction does: the two models in the Call It gave different answers." (Those two runs: {{run:RUN-tlc-n3-only}} and [X RUN-tlc-unsafe-3w].) The step is the roadmap's *finite-state abstraction*, and it is why bounded exploration is no unqualified proof for an arbitrary state space (completion test 3) [D]; the scope facts below say what each choice costs.

Scope facts (copy): M1 at Amount 80 has 11, 45, 191 and 813 distinct states at two to five workers [X RUN-tlc-full]. A CONSTRAINT drops states silently, so the stamp is "[M] · bound · partial" (Learn TLA+, Topics › Handling Unbound Models §"Bounding Models" [V]; spine §8.8). SYMMETRY can shrink the space by about n! (Topics › Optimizing Model Checking [V]), and TLC 1.8.0 warns that declaring symmetry during liveness checking "might cause TLC to miss violations of the stated liveness properties" [X RUN-tlc-sym-liveness], so liveness cards say "symmetry off". A complete run prints collision estimates, 8.3E-7 (optimistic) and 2.1E-9 (actual fingerprints), on a model of 2,986,377 distinct states [X RUN-tlc-fingerprint]: "complete" unless a collision hid a state. The command line runs one worker unless told otherwise [X RUN-tlc-help]; a four-worker run of M1 found a different 5-state trace, Read(w2) first [X RUN-tlc-doublespend], so minimal traces are claimed at one worker only.

**Graded item.** GEN-which-stamp template 2 (complete the qualifier) on seeded raw TLC outputs from CI: complete; constrained; stopped at "Deadlock reached" ("[?] · stopped at deadlock, n distinct"); symmetry on; `-simulate` ("[T] · n traces", a row the spine lacks, §12 issue 6).
**Exit item.** GEN-call-it template 4 on one run: "It holds for three workers." (F) · "It holds for these constants unless a fingerprint collision hid a state." (T) · "A CONSTRAINT reports the states it drops." (F) · "Symmetry is safe with liveness." (F) · "[M] is the right stamp." (T) · "Constants, a CONSTRAINT and symmetry each change the finite model that stands in for the system." (T)
**Today cards created.** Both, for KC-5.bounded-scope (threshold; spiral return in S7.L3 through KC-7.small-scope; S7 Defence). Confusable set A gains its S5 member.
**Twin card.** TLA+ By Example's scope line: "The result applies to the chosen constants, assumptions, and properties, not automatically to arbitrary system sizes or to an implementation" (R6 F15). **Sibling bridge.** None.
**Reading:** Learn TLA+ (read 2026-10-23), Topics › Optimizing Model Checking §"Use smaller constants", §"Use symmetry sets", §"Separate safety and liveness" (`topics/optimization.html`); Topics › Handling Unbound Models §"Bounding Models" (`topics/unbound-models.html#bounding-models`).
**Build this:** LAB-5.6, "Bound statement and claim cards" (20 min).

---

### S5.L9 · bridge · From MODEL-CHECKED ≤ N to PROVED for every N

**Objective.** Check `Inv` inductive with TLC at fixed constants, stamped "[M] · constants · inductive at N = k"; discharge `Init ⇒ Inv` and `Inv ∧ Next ⇒ Inv′` in Z3 with workers as an uninterpreted sort and a premise witness, stamped "[P] · Z3 5.3.1 unsat · uncertified" for every N with the open defeater "translation from the TLA+ spec unverified"; decide inductive, CTI or reachable for seeded invariants.
**KCs.** KC-5.inductive-invariant-tla. **Prerequisites.** KC-4.invariant-vs-inductive (hard; S4), KC-5.bounded-scope. **Instruments.** INS-bench-tlc, INS-z3, INS-bench-smt, INS-bench-apalache (optional). **Generators.** GEN-cti-or-bug, GEN-which-stamp. **Claim.** CL-5.4. **Drawer.** D-18. **Minutes.** 15–25 (after S4 on the builder's path).

**Content.** For M2, `Inv == TypeOK /\ bal + spent = Init /\ bal >= 0 /\ spent >= 0`, and `Inv ⇒ NoOverspend`. `NoOverspend` alone is not inductive: from the unreachable state bal 100, spent 50, a Spend of 80 reaches spent 130, a CTI, so strengthen; on M1 the same invariant fails on a reachable state, so fix the command (SP-5.1). Lamport's technique (2018, §1): `Inv ∧ Next ⇒ Inv′` holds exactly when `Inv` is an invariant of `ISpec == Inv /\ [][Next]_vars`, with `Inv` led by `TypeOK` so that TLC can enumerate initial states; only fixed, finite constants qualify, so it earns [M]. The paper's §2 samples random subsets of the `TypeOK` states: at most "[T] · n sampled states" ([D]; §12 issue 6). In Z3, workers are an uninterpreted sort W, `pc` is an array from W to {go, done} updated with `store`, which keeps the query quantifier-free, and Init and Amount stay symbolic with `Init >= 0` and `Amount > 0`.

**Prequestion** (k = 3, chance 1/3). Copy: "TLC's inductive check passes at three workers. Which stamp?" A "[M] · three workers · inductive at N = 3" · B "[P] for every N" · C "[T] · 1 instance" **Key:** A. **Why** A: only the enumerated states were checked. B: AUD-5.3's G5 variant, a bounded check stamped as proof (dp:X1). C: an exhaustive check of one configuration is not one sampled test (dp:X1).

**Segment · Lift it** (12–15 min). INS-bench-tlc on the `ISpec` configuration {{run:RUN-tlc-inductive}}; then INS-z3 in the tab, or INS-bench-smt, on the parametric query {{run:RUN-z3-inductive-param}}; Apalache optional, also [M] (D-18; its run records the version and a bounded smoke check only [X RUN-apalache-version]). Worked example first, correct only, each conjunct annotated (`Init ⇒ Inv`; both branches of the guard; the `store` frame for `pc`; `¬Inv′`); fading family F4's staircase carries over from S4.L6 at rungs L3–L4.

**Call It** (k = 3, chance 1/3). Copy: "With workers as an uninterpreted sort, is `Inv ∧ Step ∧ ¬Inv′` satisfiable?" A "unsat" · B "sat: there is a CTI" · C "unknown: the sort is infinite" **Key:** A {{run:RUN-z3-inductive-param}}; the premise witness `Inv ∧ Step` is `sat`. **Why** A: the strengthened invariant is preserved by every Spend, whatever the number of workers. B: a CTI exists for `NoOverspend` alone, not for the strengthened `Inv` (dp:O3). C: this fragment (arrays, uninterpreted functions, linear integers, no quantifiers) is decided (dp:Z2). **Surprise forecast:** moderate.

**Graded item.** GEN-cti-or-bug (templates: inductive, CTI, reachable) on seeded invariants over M1 and M2: Z3 decides `Init ⇒ Inv`, `Inv ∧ Next ⇒ Inv′` and `Inv ⇒ Safe`; Spectacle's bounded reachability tells a CTI from a reachable violation, with the bound printed, and its state-pair check (is (s, t) a step of the spec?) may key a CTI item from an unreachable state, such as bal 100, spent 50 [X RUN-spectacle-s5s8]. These count toward the four or more CTI items interleaved through S9.
**Exit item.** GEN-which-stamp template 1 on two raw outputs: the TLC inductive pass at N = 3, and the Z3 `unsat` with the uninterpreted sort.
**Today cards created.** Both; GEN-cti-or-bug joins the S9 interleave. **Twin.** None. **Sibling bridge.** None.
**Reading:** Lamport, "Using TLC to Check Inductive Invariance" (2018-08-23), §1 "Inductive Invariance" and §2 "How to Do it Yourself" [lamportii, V]; Apalache documentation, "Checking an inductive invariant" (`running.md` §1.5; R3 F6), through D-18.
**Build this:** LAB-5.7 `[stretch]`.
**If cut** (#3): the KC moves to S5.L8; CL-5.4 stays stretch-backed in LAB-5.7.

### 2.10 Call tally

Seventeen authored calls (prequestions and generated items excluded). Keys: "holds or not reachable" 7 (41%), "violated or reachable" 4 (24%), interval, class or segment 6 (35%); no verdict exceeds 60%. Surprise forecasts: 7 "yes" (41%; GATE-items needs at least 30%) and 4 "moderate", checked against learner-zero's first calls. Every key is a definition, a graph check on a recorded spec, or a run; none ships before its run resolves (GATE-runs).

---

## 3. LAB-5 · The holds spec

**Lane.** Lane B: TLC runs on the Bench and receipts are imported ("reported from your machine"). INS-spectacle re-runs safety checks c2–c4 from the receipt's spec text when the complete exploration fits INS-spectacle's 10 s wall-clock budget [D] (spine §9.1) and its operators are covered (W0-S04 [X RUN-spectacle-s5s8]): badge "re-checked here"; INS-lasso does the same for c5's starving lasso. Liveness verdicts stay "reported from your machine". No Lane A (no learner Rust in S5). Phones: predict, see the recorded run, queue the stage.
**Template supplies** M1 and its config, `HoldsEnv.tla` (read-only), `claims/s5-props.tla` stubs, `broken/`, `fixed/` and `statespace check lab5`.

| Stage | Title | Min | Check |
|---|---|---|---|
| LAB-5.1 | Run the provided DoubleSpend configuration on the Bench; read the receipt and its argv | 2 | LAB-5.c1 |
| LAB-5.2 | Make the critical step atomic; complete check | 25 | LAB-5.c2 |
| LAB-5.3 | Holds lifecycle with NeverTwice | 25 | LAB-5.c3 |
| LAB-5.4 | Environment actions; find resolved-twice; fix it | 25 | LAB-5.c4 |
| LAB-5.5 | Liveness under stated fairness; validate the starving lasso | 25 | LAB-5.c5 |
| LAB-5.6 | Bound statement and claim cards (write stage) | 20 | LAB-5.c6 |
| LAB-5.7 | `[stretch]` TLC's inductive check at fixed constants ([M] · constants), then the inductive step for arbitrary N in Z3 with workers as an uninterpreted sort ([P]); Apalache optional | 25 | — |

### 3.1 Checks and exact pass conditions

- **LAB-5.c1.** The receipt validates against receipt@1; its result line is "Invariant NoOverspend is violated"; 11 distinct states; depth 5; a 4-action (5-state) trace in which both reads precede both writes; the argv contains `-deadlock`; one worker; the jar hash equals the pin [X RUN-tlc-jars]; spec and config hashes equal the template's [X RUN-tlc-doublespend].
- **LAB-5.c2.** On the learner's spec (hash different from M1's): "No error has been found" with 0 states left on the queue; NoOverspend among the checked invariants; constants printed. Non-vacuity: a witness operator `NoSpend == spent = 0`, checked as an invariant, is violated, so a spend is reachable (1.8.0 also offers `-inv`; 1.7.4 does not [X RUN-tlc-help]). The reference fix is M2 [X RUN-tlc-atomic]; no distinct-state count is required of the learner's own variables.
- **LAB-5.c3.** `NeverTwice` and `TypeOK` hold, complete; non-vacuity: witness operators `hst # "captured"` and `hst # "released"`, each checked as an invariant, are violated. Reference {{run:RUN-tlc-lifecycle}}.
- **LAB-5.c4.** (a) The unsafe variant, kept in `broken/`: TLC reports `NeverTwice` violated with an Expire step in the trace (reference {{run:RUN-tlc-resolved-twice}}). (b) The fix, in `fixed/`: no error, complete, `CrashesOn = TRUE`, and every `HoldsEnv` action taken at least once in the explored graph (from `-coverage` output); non-vacuity as in c3. Reference {{run:RUN-tlc-never-twice}}.
- **LAB-5.c5.** (a) `EventuallyResolves` holds under the learner's `SysFairness`, complete; SANY's parse of `SysFairness` names no action defined in `HoldsEnv.tla`; `CrashesOn = FALSE` is recorded; no SYMMETRY and no CONSTRAINT. Reference {{run:RUN-tlc-eventually}}. (b) The starving variant's JSON trace is accepted by INS-lasso: a path of the graph, closed, `EventuallyResolves` false on every state of the cycle, every `SysFairness` conjunct satisfied on it.
- **LAB-5.c6.** CL-5.1, CL-5.2 and CL-5.3 pass claim@1 validation: six fields and a requirement row; every [M] prints constants, "complete" or "partial", version line, jar hash, argv, symmetry, any CONSTRAINT and any fingerprint line; CL-5.2 lists SEAM-4 as [A]; CL-5.3 lists every fairness conjunct as [A] and "crash actions off (SEAM-8)"; each "if weakened" field names a witness that refutes its own claim's proposition (SP-5.1, SP-5.4 and SP-5.3, or the learner's own); a bound statement names the constants and links SP-5.6.

### 3.2 Receipt (receipt@1, TLC lane)

The `tlc` block: spec and config SHA-256; constants; argv and TLC version line verbatim; workers; jar SHA-256 ("unpinned tool" if it differs from [X RUN-tlc-jars]); the result line verbatim; states generated, distinct, queued and depth; the JSON (1.8.0) or text (1.7.4) trace; fingerprint lines; SYMMETRY and CONSTRAINT lines; property and fairness definitions by hash. The rest follows spine §9.4. A receipt never trusts the exit code; it parses every verdict line.

### 3.3 Hint ladders (R0–R4, behind the explanation gate)

R0 on every check: a teach-back of at least 12 words, compared with three authored ideas; self-assessed, never credit. Past R2 the check is credited as assisted until an unseen variant passes (other constants or worker count, drawn at grade time).

| Check | R1 concept | R2 where to look | R3 fragment (at most 3 lines) | R4 design in prose |
|---|---|---|---|---|
| c1 | `-deadlock` turns the deadlock check off | the argv and version lines of the receipt | `statespace check lab5.1` reruns the provided configuration unchanged | Rerun; do not edit the template |
| c2 | the guard and the write must be one step | the action that reads `seen` and the one that writes `bal` | `Spend(w) == /\ pc[w] = "go"` / `/\ IF bal >= Amount THEN … ELSE UNCHANGED <<bal, spent>>` | One action tests and writes the balance; add the witness run |
| c3 | events need a history variable | every action that resolves the hold | `res' = res + 1` in each; `NeverTwice == res <= 1` | Count resolutions; show both outcomes reachable |
| c4 | resolve by compare-and-set on stored state | the two-step Handle and Expire | `Expire == /\ hst = "held" /\ hst' = "released" /\ res' = res + 1` | Every resolution tests and writes `hst` in one action; keep crashes on |
| c5 | WF forces only a continuously enabled action | Timeout's enabling condition along the lasso | `Timeout == /\ st \in {"held", "pending"} …` / `SysFairness == WF_vars(Timeout)` | Let expiry apply while a request is outstanding; fairness on your actions only |
| c6 | an [M] stamp needs its bound | the receipt's constants, argv and queue line | `stamp: "[M] · Workers = {w1, w2}, Init = 100, Amount = 80 · complete"` | Copy the bound from the receipt; name the seam each card rests on |

### 3.4 Prove-it (M-prove-it, C/D · Prec)

`statespace defend` mutates the learner's own LAB-5 files; agent closed; predictions first, then TLC grades. Each mutant parses and runs, or its key predicts that it does not (GATE-labs).

| Operator | Applied to | Prediction asked |
|---|---|---|
| split the atomic action | LAB-5.2 | violated or not; witness length as an interval in actions |
| drop WF on Timeout | LAB-5.5 | holds or violated; the lasso's shape |
| add a duplicate-reply handler outside the compare-and-set | LAB-5.4 | `NeverTwice` holds or not |
| raise Workers from 2 to 3 | LAB-5.2 | verdict, and which fields of the [M] qualifier change |
| restrict Timeout to held | LAB-5.5 | does a starving lasso return? |
| add SYMMETRY to the liveness configuration | LAB-5.5 | what TLC prints (the warning [X RUN-tlc-sym-liveness]) |

### 3.5 Statement pins, lanes and the stuck protocol

No Lean challenge pack and no `comparator.json`: TLC has no axiom list to permit. Instead `claims/s5-props.tla` (NoOverspend, NeverTwice, EventuallyResolves, the learner's `SysFairness`) and `HoldsEnv.tla` are pinned and hashed as in spine §9.4; a changed hash voids the claim to [?] (I7). The agent kit's hook blocks agent edits to `claims/`, `HoldsEnv.tla` and `receipts/`. The stuck protocol fires at 25, 45 and 90 minutes: `statespace stuck` emits a forum-ready minimal spec and config, private paths stripped, and offers to park the check as an [A] with a re-find in 7 days.

---

## 4. Specimens

Labels are generated from runs (spine §5.1); "mounted" once the run verifies the label, "kept" after a re-find at 7 days or more.

| ID | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-5.1 | Read(w1), Read(w2), Write(w1), Write(w2): 4 actions (5 states), spent 160, bal 20 | NoOverspend | each guard tests a value read one step earlier | yes, at one worker | M2, no error in 4 distinct states; isolation in S6 | [X RUN-tlc-doublespend, RUN-tlc-atomic] |
| SP-5.2 | Read(w1), Write(w1), Read(w2): 3 actions (4 states) to a state where nothing is enabled | TLC's deadlock check, not a property of the spec | the hand-written spec has no `Terminating` step, and breadth-first search reaches depth 4 before the violation at 5 | yes | `-deadlock`, stated on the card; a `Terminating` disjunct | [X RUN-tlc-doublespend] |
| SP-5.3 | M4: held → Try → pending → Busy → held → Try → pending → Busy → back to state 1 | `EventuallyResolves` under WF(Try) ∧ WF(Busy) | Capture and Timeout are each enabled only part of the cycle and carry no fairness | not claimed (liveness traces need not be shortest) | Timeout enabled while unresolved, with WF (system only) | [X RUN-tlc-hold-lasso] |
| SP-5.4 | M5 unsafe: worker reads capturing, expiry reads capturing, both write | `NeverTwice` | two resolution paths each trust a read the other invalidates | per the run, at one worker | one compare-and-set action per path | {{run:RUN-tlc-resolved-twice}} |
| SP-5.5 | M3: Read(w1), Check(w1), Read(w2), Write(w1), Check(w2), Write(w2): 6 actions (7 states); 20 distinct, complete | NoOverspend | every extra scheduling point admits more interleavings | yes, at one worker | read, check and write in one action (M2) | [X RUN-tlc-rtw3] |
| SP-5.6 | M1 at Init 100, Amount 40: three workers overspend at depth 7 | NoOverspend | two stale writes spend at most 80; three spend 120 | yes, at one worker | M2 (three workers: no error, 8 distinct); constants on every card | [X RUN-tlc-unsafe-3w]; two-worker half {{run:RUN-tlc-n3-only}} |
| SP-5.7 | M6: two confirmations of one staged transfer both pass the source check before either debits | conservation of the cards' total | check and debit are separate steps, while the credit is an atomic increment | per the run | one atomic confirmation (the source's remedy: a pessimistic lock); a conditional UPDATE (SP-6.6) | {{run:RUN-tlc-starbucks15}}; dated incident 2015-05-21 [starbucks15] |

---

## 5. Claim templates

Six fields plus a requirement row; the strip reads proposition-of-model · correspondence · requirement-fit, and requirement-fit is never [P]. Cards fade from receipt-prefilled (CL-5.1) to learner-written (CL-5.3).

| Field | CL-5.1 | CL-5.2 | CL-5.3 | CL-5.4 |
|---|---|---|---|---|
| Proposition | `[](spent <= Init)` for M2 | `[](res <= 1)` for M5 | `(hst = "held") ~> (hst \in {"captured", "released"})` | `Inv` is inductive for M2, for every number of workers |
| Assumptions | [A] one action is one atomic step in the code | [A] SEAM-4: dispatch is atomic with the hold's commit; replies may be duplicated or late | [A] WF on Timeout (a system action); [A] SEAM-8: the worker keeps running, crash actions off in this check | [A] the SMT encoding matches the spec (open defeater) |
| Model | M2, by hash | M5 `fixed/`, by hash | `HoldLive.tla`, by hash | M2 plus the SMT-LIB query, by hash |
| Method | TLC 1.8.0, `-deadlock`, one worker, complete | TLC, complete, `CrashesOn = TRUE` | TLC liveness, complete, symmetry off | Z3 5.3.1 with an uninterpreted sort; TLC `ISpec` at N = k |
| Correspondence | [A] the code tests and writes in one step (S6: conditional UPDATE) | [A] each resolution is one guarded write whose rowcount is checked (KC-6.rowcount-as-guard) | [A] an expiry job is scheduled | [N] none beyond the model |
| If weakened | split the action: SP-5.1 | split Expire: SP-5.4 | Timeout held-only: SP-5.3 | `Inv := NoOverspend`: a CTI |
| Requirement | "no account pays out more than it holds" | "funds held for a payment are released or captured once" | "no hold stays reserved forever" | as CL-5.1 |
| Stamp | [M] · constants printed · complete | [M] · constants · complete | [M] · constants; fairness as [A] | [P] · Z3 5.3.1 unsat · uncertified (workers as an uninterpreted sort), defeater open, supported by [M] · TLC inductive check at N = k |
| Status | [X RUN-tlc-atomic] | {{run:RUN-tlc-never-twice}} | {{run:RUN-tlc-eventually}} | {{run:RUN-z3-inductive-param}}, {{run:RUN-tlc-inductive}} |

---

## 6. Seams and erosions

| Event | Seam | Endpoint 1: planted | Endpoint 2: cashed | Segment cracked | Remedies | Ships |
|---|---|---|---|---|---|---|
| ER-2 | SEAM-2 "transfers run one at a time" | S2.L7 · CL-2.4 | S5.L3 · SP-5.1 | correspondence: a sequential proof, a concurrent system | an atomic action (CL-5.1); isolation (S6) | W3 |
| ER-4 | SEAM-4 "effect dispatch is atomic with the hold's commit" | S5.L5 · CL-5.2 | S8.L3 · SP-8.1 | assumption record | an outbox, inbound keys, provider idempotency as [A] | W5 |
| ER-8 | SEAM-8 "the worker keeps running under weak fairness" | S5.L7 · CL-5.3 | S8.L5 · SP-8.6 | assumption record: progress needs recovery | state recovery as [A]; check with crashes on | W5 |

On the builder's path ER-2 fires in LAB-2.5, where CL-2.4 mints already cracked; ER-4 and ER-8 fire in S8 on both paths (W3-T12 replays both).

---

## 7. Audit anchors

Scheduled after LAB-5, never locked, re-checked a week later. AUD-5.3 ships in W1 keyed only by RUN-tlc-doublespend; its variants and the other anchors ship in W3-T13, built with the spine's operators (drop or misplace fairness, split an atomic action, stamp a bounded inductive check as proof).

| ID | Class | Sound twin | Flawed variant | Based on (dated, sourced) | Evidence required · key |
|---|---|---|---|---|---|
| AUD-5.1 | G3 | "every hold eventually resolves", checked as a PROPERTY under stated fairness | "no deadlock reported, so every hold resolves", filed as an invariant | SysMoBench: model-written specs violated 41.9% of liveness properties against 8.3% of safety (https://arxiv.org/abs/2509.23130; v1 2025-09-27, v3 2026-01-28) | a lasso: M4's cycle has no deadlock and never resolves · [X RUN-tlc-hold-lasso] |
| AUD-5.2 | G7 | fairness on the system's actions only | liveness "proved" under SF on Capture or WF on Busy, the provider's actions, unstated | SysMoBench (arXiv 2509.23130, dated as in AUD-5.1): fairness choices "overly technical or random" | the conjunct naming the environment action, and the lasso once it is removed · {{run:RUN-tlc-hold-fairness}} |
| AUD-5.3 | G5 | the `-deadlock` run that reports the violation | "TLC found no invariant violation" after a default run that stopped at "Deadlock reached" with 10 distinct states; variant: "TLC inductive check at N = 3 stamped PROVED for all N" | this course's v1 mock-ups printed un-run TLC numbers (2026-10-20; `docs/history/v1/` in this repository); the executed run (2026-10-21) | the argv and the stop line · [X RUN-tlc-doublespend]; variant keyed by RUN-tlc-inductive and RUN-z3-inductive-param |
| AUD-5.4 | G9 | one conditional UPDATE matching the atomic action, which loses nothing at READ COMMITTED | one atomic action implemented as a read, an application check and a write, which spends 160 from 100 | Sakurity, the 2015 gift-card race (https://sakurity.com/blog/2015/05/21/starbucks.html, 2015-05-21) | the code lines set against the action · [X RUN-pg-anomalies] |

---

## 8. The Defence (S5)

Untimed, over at least two sessions within a week of LAB-5; pass rules as spine §8.6.

- **Part A, probes** (12 unseen items, agent closed, a call on each, about 35 min): 3 GEN-trace-allowed (one per template); 3 GEN-lasso-or-not (one starving; two fair-cycle, one on completion test 2, the scheduler and environment fairness needed); 4 GEN-call-it (two property-kind items pairing "never resolves twice" with "eventually resolves", completion test 1; one trace length in actions; one true/false set on fairness); 2 GEN-which-stamp on bounded runs, one clean at two workers and violated at three (completion test 3: bounded exploration is no proof for arbitrary state spaces).
- **Part B, defend** (about 20 min): the spine's four mutations of the learner's own specs, predicted first and graded by TLC: split the atomic action; drop weak fairness; add a duplicate-reply action; raise the worker constant.
- **Part C, audit** (about 20 min): four cases from the AUD-5.1–AUD-5.4 pool and its variants, at least one sound, typed evidence.
- **Part D, explain-back** (about 10 min, required, uncredited): safety versus liveness for holds, 2 minutes oral, then a 3-idea self-check compared with Part A.

---

## 9. Drawers

D-09, PlusCal beside its TLA+ translation, including the translator's `Terminating` step (S5.L2). D-18, Apalache for inductive invariants: bounded by the constants and types it instantiates, so [M], never [P] alone (S5.L9). D-15, the devcontainer and `statespace doctor`, surfaced at S5.L2 on the builder's path only (§12 issue 5).

---

## 10. Reading list (dated, section-level)

| Source | Sections | For |
|---|---|---|
| Learn TLA+, Hillel Wayne (© 2022; content last added 2023-08-02; read 2026-10-23) | Core › Writing Specifications; Writing an Invariant; Nondeterminism; Concurrency §Processes, §await; Temporal Properties §Intro, §[], §Anything can crash, §<>, §~>; Action Properties; TLA+ §Learning from PlusCal, §Fairness in TLA+. Topics › Auxiliary Variables §History Variables; Optimizing Model Checking §Use smaller constants, §Use symmetry sets, §Separate safety and liveness; Handling Unbound Models §Bounding Models | S5.L1–S5.L8 |
| TLC 1.8.0 help text, as recorded (2026-10-21; `a2r3/out/tlc-help-tla180.txt`) | `-deadlock`, `-workers`, `-dumpTrace`, `-continue`, `-dump` | S5.L2, LAB-5 |
| Lamport, "Using TLC to Check Inductive Invariance" (2018-08-23) | §1; §2–§2.2 | S5.L9 |
| TigerBeetle: Two-Phase Transfers (read 2026-10-23); "Simulation testing for liveness" (2023-07-06, optional) | §Resolve Funds (post, void, expire), §Errors; the post | S5.L4, S5.L6, S5.L7 |
| TLA+ By Example (`dev/lessons.md` at ec0cc03, pushed 2026-10-15) | the authoring contract | S5.L3, S5.L8 |
| Alpern and Schneider, "Defining Liveness", Information Processing Letters 21(4):181–185, 1985 [alpern85, V] | the decomposition theorem, optional | S5.L6 |
| SysMoBench, arXiv 2509.23130 (v3, 2026-01-28) | the liveness and fairness results | S5.L7, AUD-5.1–AUD-5.2 |

---

## 11. Time budget

| Read | Lessons | Build | Write | Defence | Total | Weeks at 6 h/wk | Weeks at 10 h/wk | Roadmap |
|---|---|---|---|---|---|---|---|---|
| 2.5–4.0 h | 3.5–5.5 h (3 core × 40–60 min, 6 bridge × 15–25) | 1.7–3.4 h (102 nominal min, up to 2×) | 1.8–3.2 h (LAB-5.6 plus technical note 2) | 1.0–1.5 h | 10.5–17.6 h | 2.2–3.7 | 1.3–2.1 | 3–6 weeks: 14.25–28.5 h of stage work at 4.75 h/wk |

GATE-budget passes: the high estimate is under 28.5 h and over half the lower bound (7.1 h). LAB-5.7 is stretch and excluded. The Keep block absorbs eleven new KCs at about ten graded reviews of about 2 minutes each in their first 60 days, plus the Lean keep-alive (20–30 minutes every 2–3 weeks, its own Keep session, default path, once S2 is signed off). Claim cadence: three claims and seven specimens. Technical note 2 (600–1,000 words) follows LAB-5: rule 5's three parts, from memory, then specimens and receipt hashes. After LAB-5 the Clearinghouse's weekly incidents may draw GEN-spot-the-gap variants of AUD-5.1–AUD-5.4 (M-docket).

---

## 12. Spine issues

This list was resolved in spine revision 3 on 2026-10-25 (spine §15); each item ends with its outcome.

1. **KC-5.lasso-reading requires KC-5.fairness**, yet S5.L6 asks for lassos first. This spec tags S5.L6's lasso items KC-5.safety-vs-liveness; proposed: KC-5.lasso-reading requires KC-5.safety-vs-liveness and starts in S5.L6. *Revision 3: already resolved (§4 KC-5.lasso-reading; §3.5 S5.L6).*
2. **RUN-tlc-atomic and RUN-tlc-unsafe-3w** (and RUN-tlc-full's two-worker figure) rest on `RESULTS.md` prose, with no log or argv on disk, against §9.5's own listing rule. M2's "no error" implies deadlock checking was off (its final state enables no action). W0-S11 should re-run them with argv before S5 copy cites them. *Revision 3: applied (§9.5 executed paragraph).*
3. **Runs this spec needs** (W3-T07; its fifteen runs become nineteen): RUN-tlc-lifecycle; RUN-tlc-hold-fairness, rows r1 (no fairness; r2 is RUN-tlc-hold-lasso), r3 (+WF Capture), r4 (+SF Capture), r5 (WF Try, SF Timeout held-only), r6 (Timeout widened, WF Timeout only); RUN-tlc-bare-property; RUN-pcal-doublespend. Spine §9.5 now names these four under W3-T07, and lists as executed, from evidence on disk, the two runs the copy cites: RUN-tlc-help (`a2r3/out/tlc-help-tla180.txt`, `-174.txt`) and RUN-tlc-sym-liveness (`a2r3/out/tlc_runs.txt`, "Sym"). *Revision 3: already resolved (§9.5).*
4. **INS-lasso's "lasso JSON shape awaits W0-S05"** is partly answered: 1.8.0's JSON closes the loop with a last action targeting state 1 (`a2r3/tla/live/Hold.trace.json`; A2-F10); W0-S05 can narrow to documenting it. *Revision 3: already resolved (§9.1 INS-lasso, §13 W0-S05).*
5. **D-15 lists S2 and S6 only**, but on the builder's path S5 is the first Bench work needing Java 21 and the pinned jar; add S5 there, or let `statespace doctor` set up the TLC lane alone. *Revision 3: already resolved (§3.12 D-15).*
6. **§8.8 lacks rows** for TLC `-simulate` and Lamport's random-subset inductive check; proposed: "[T] · n traces (or n sampled states) · constants". *Revision 3: already resolved (§8.8).*
7. **S5.L2's objective** pairs PlusCal with the deadlock lesson, but the translation adds `Terminating`, so SP-5.2 holds only for hand-written TLA+; proposed: "write it in TLA+, its PlusCal form shown beside". *Revision 3: already resolved (§3.5 S5.L2).*
8. **The misconception catalog** lacks tags for ten S5 distractors; dp:T7–dp:T16 (§1) are proposed, each "—". *Revision 3: already resolved (EVIDENCE.md §6.11).*
9. **Lesson rows** omit GEN-call-it (an all-stages family) that S5.L3, S5.L5 and S5.L7 use; add it so the rows and GATE-lessons agree. *Revision 3: already resolved (§3.5).*
10. **LAB-5.c4 and LAB-5.c5 omit crash settings:** safety keeps crashes on (A1-F16); SEAM-8 needs liveness checked with crashes off, stated as [A]. The spine rows should say so, as the checks here do. *Revision 3: already resolved (§3.5 LAB-5).*
11. **SP-5.6's status** omits its executed three-worker half [X RUN-tlc-unsafe-3w]. *Revision 3: already resolved (§5.1 SP-5.6).*
12. **SP-5.7's label**, "a double redemption", misdescribes the source: one staged transfer confirmed twice. Proposed: "a transfer confirmed twice". *Revision 3: already resolved (§5.1 SP-5.7).*

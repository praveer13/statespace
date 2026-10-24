# S9 Preservation (Lean, Rust): curriculum spec

**Status:** authoring spec for W5: W5-T03 (runs), W5-T04 (challenge packs, reference validator), W5-T05 (lessons, LAB-9, mini-Defences), W5-T10 (ER-5, ER-10, ER-11), W5-T11 (AUD-9.1, AUD-9.2). **Date:** 2026-10-24. **IDs:** every ID comes from `docs/spine/SPINE.md`; anything the spine lacks or gets wrong is listed in §14.

**Sources, in precedence order:** the roadmap (Stage 9); executed runs (`research/evidence/lean-measure/proj/check-bad.out`, `A5r3/comp-run2.log`, `comp-run5.log`, `A5r3/pglite.log`, `a2r3/out/pg_claims.txt`, `research/spikes/RESULTS.md`); the brief (V2-29); the digests; R5 §2D–2E and §3.2; reviews A2-F21, A4-07 and A1-F20; the spine; sibling specs S01, S06 and S10.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or estimate; grades A–D follow the pedagogy digest. "Copy:" marks learner copy. Learner copy uses only the spine's glossary terms, calls matched audit cases "pairs" (glossary term 19 reserves "twin" for production twins), and refers to the learner's product only as "your system".

**Authoring note.** The Lean definitions and statements in §2 and §4.2 and the specimen designs in §5 were drafted against the pinned Lean 4.35.0 toolchain. No verdict about them is claimed here: each is a placeholder until W5-T03 and W5-T04 record the runs listed in §13. No reference proof of a lab theorem appears in this public file; labs ship statements only.

---

## 0. The stage at a glance

**Promise** (roadmap Stage 9): translate a Mini-Plinth subset into a simpler intermediate representation, prove that the translation preserves what can be observed, break the proof with a bad optimization, validate generated SQL per command, and keep three claims apart. Completion test: "describe the refinement relation, its abstraction boundaries, and which pieces of the executable system remain unverified."

**No new tool.** Lean 4.35.0 returns on the Bench (core plus Std, `autoImplicit false`, no Mathlib) [X RUN-lean-ledger, RUN-lean-toolchain], with challenge packs checked by `lake comparator` [X RUN-lean-comparator]. The learner's Rust returns in the tab for the SQL validator (Lane A, internal name), replayed on PGlite, which reports PostgreSQL 18.6 [X RUN-pglite]. The Lean keep-alive (M-lean-keep-alive) ends here: Lean is the stage's main tool. Roadmap time: 6–10 weeks. Technical note 4 follows the stage.

| ID | Tier | Title | Min | KCs introduced | Calls | Specimens · claims |
|---|---|---|---|---|---|---|
| S9.L1 | bridge | A stack machine, proved | 15–25 | KC-9.stack-machine-correctness | 1 | CL-9.1 (minted in LAB-9.2) |
| S9.L2 | bridge | Translation validation first | 15–25 | KC-9.translation-validation | 2 | — |
| S9.L3 | bridge | A target IR, and compiling into it | 15–25 | KC-9.target-ir | 1 | — |
| S9.L4 | core | What is observable | 40–60 | KC-9.observations | 3 | SP-9.3 |
| S9.L5 | core | Forward, backward, bisimulation | 40–60 | KC-9.forward-simulation (threshold), KC-9.simulation-kinds | 3 | — |
| S9.L6 | core | Prove preservation for the fragment | 40–60 | KC-9.preservation-proof | 3 | CL-9.2 (minted after LAB-9.6) |
| S9.L7 | bridge | The bad optimization | 15–25 | KC-9.bad-optimization | 2 + forecast | SP-9.1 (cashes ER-5) |
| S9.L8 | bridge | Validating SQL: containment, provers, refutation | 15–25 | KC-9.sql-equivalence | 2 + forecast | SP-9.2, SP-9.4 · CL-9.3 (cashes ER-11) |
| S9.L9 | bridge | Draw the trusted computing base | 15–25 | KC-9.three-claims, KC-9.tcb (threshold) | 2 + forecast | SP-9.5, SP-9.6 (cashes ER-10) |

LAB-9.1 adds one call, so the stage has 20 authored calls (§3.10).

**Sequence** (both published paths; S9 follows S8 on each, spine §3.0). Half A: LAB-9.1 opens the stage (the 2-minute win, V2-29) → S9.L1 → LAB-9.2 → S9.L2 → S9.L3 → LAB-9.3 → S9.L4 → mini-Defence A. Half B: S9.L5 → LAB-9.4 → S9.L6 → LAB-9.5 to LAB-9.10 → S9.L7 → S9.L8 → LAB-9.11 → S9.L9 → LAB-9.12 → mini-Defence B → technical note 4 (M-notes).

**KCs** (spine §4; two threshold KCs, each with extra calls, a spiral return and a later Defence):

| KC | Threshold | Requires | First taught | Returns |
|---|---|---|---|---|
| KC-9.stack-machine-correctness | | KC-2.generalized-ih | S9.L1 | LAB-9.5's expression lemma; fading family F1 |
| KC-9.translation-validation | | KC-6.differential-testing | S9.L2 | set G (S9.L5); S9.L8; S10 Defence, outcome (f) |
| KC-9.target-ir | | KC-3.big-step-errors | S9.L3 | S9.L4; LAB-9.11's lifter |
| KC-9.observations | | KC-9.target-ir, KC-7.observer-equivalence | S9.L4 | LAB-9.4; S9.L9 (ER-10); outcome (d) |
| KC-9.forward-simulation | threshold | KC-9.observations, KC-6.refinement-relation | S9.L5 | S9.L6–S9.L7; set G; F6; mini-Defence B; S10 Defence (d) |
| KC-9.simulation-kinds | | KC-9.forward-simulation | S9.L5 | set G; S9.L8 (a nondeterministic runtime) |
| KC-9.preservation-proof | | KC-9.forward-simulation | S9.L6 | LAB-9.5–LAB-9.10; S9.L7 |
| KC-9.bad-optimization | | KC-9.preservation-proof | S9.L7 | Clearinghouse proposals; S10.L6 |
| KC-9.sql-equivalence | | KC-9.translation-validation, KC-6.sql-not-algebra | S9.L8 | LAB-9.11; S10 Defence, outcome (f) |
| KC-9.three-claims | | KC-9.preservation-proof | S9.L9 | CL-10.1 (composite); S10.L7 |
| KC-9.tcb | threshold | KC-9.three-claims, KC-4.trust-stack | S9.L9 | KC-10.claim-graph-report; S10 Defence (c), (g) |

S9 trains outcome families (c), (d), (f) and (g) of spine §2.2. Confusable set G (correspondence) opens in S9.L5.

---

## 1. Conventions in this file

**Call It** as in S01 §1 (M-call-it; A for retrieval, C for confidence as feedback): three taps (*guess* below 67%, *think so* 67–80%, *sure* above 80%), chance 1/k printed, payoffs shown as feedback only, the first call final. Each authored call names the run that keys it (GATE-calls) and carries a surprise forecast.

**Misconception tags** use S01's `dp:` prefix for the pedagogy digest's catalog (§2), because its Ground IDs G1–G9 collide with gap classes. S9 mainly uses dp:P1 (observer ignores aborts; simulation direction confused), dp:P3 (compiler, command and runtime claims conflated), dp:X1, dp:X2, dp:L5, dp:L7, dp:L8, dp:S1 and dp:G4. Three are **proposed** (evidence "—"; logged through Call It, kept only if they draw errors; §14): **dp:P4** aborts treated as ordinary steps (the rest of the program is assumed to run, or earlier writes to persist); **dp:P5** preservation read as covering what the observation excludes (time, size, memory, intermediate states); **dp:P6** a matching relation that must equate everything, scratch state included. "—" marks an option with no catalog entry.

**Graded items** name a family, a template and a spec (instance space, band, grader, tagged distractors). Items whose answer may be "none" draw a seeded sound share of 30–60%. GEN-proof-structure variants come from a build-time pool of elaborated proofs, regenerated by GATE-replay on every toolchain bump.

**Lessons** follow spine §3.0: correct worked examples first, backward fading with no prompt on a blank and one principle prompt per revealed step (A/B [barbieri23][renkl02][hilbert08]). Worked examples use a sibling construct, a single posting `post`, so the lab's cases stay the learner's.

---

## 2. The fragment, the IR and the theorem

Every lesson and lab stage refers to this section. The template supplies the source semantics (the pinned reference, or the learner's LAB-3 evaluator restricted to these constructs through an adapter) and the IR's syntax; the learner writes the IR's semantics, the compiler, the observation and the matching relation.

```lean
abbrev Acct := Nat
abbrev Store := Acct → Int      -- balances
abbrev Regs := Nat → Int        -- target registers

-- Source fragment
inductive Expr | lit (v : Int) | bal (a : Acct) | add (e₁ e₂ : Expr) | sub (e₁ e₂ : Expr)
inductive Cmd
  | skip | move (amt : Expr) (src dst : Acct) | require (e₁ e₂ : Expr) (err : Err)
  | seq (c₁ c₂ : Cmd) | abort (err : Err)
inductive Outcome | committed (s : Store) | aborted (e : Err)
-- runS (move amt src dst) s: v := evalE s amt, evaluated once; debit src; then credit dst,
--   reading the debited store.  runS (require e₁ e₂ err) s: committed s if e₂ ≤ e₁, else aborted err
def transfer (amt : Int) (src dst : Acct) : Cmd :=
  .seq (.require (.lit amt) (.lit 1) .nonPositive)
    (.seq (.require (.bal src) (.lit amt) .insufficient) (.move (.lit amt) src dst))

-- Target IR: syntax supplied by the template
inductive Instr
  | ldi (r : Nat) (v : Int) | read (r : Nat) (a : Acct) | arith (op : Op) (rd r₁ r₂ : Nat)
  | write (a : Acct) (r : Nat) | writeIf (r₁ r₂ : Nat) (a : Acct) (r : Nat)
  | assertGe (r₁ r₂ : Nat) (err : Err) | abort (err : Err)
-- exec : List Instr → Regs → Store → Except Err (Regs × Store), one step per instruction
-- runT p regs st := committed st' on .ok (_, st'); aborted e on .error e
```

`transfer` is the roadmap's toy command: `requires balance(from) >= amount; do move amount from from to to`, plus the positive-amount check that S3's refined `Amount` type gave for free.

| Decision | Why | Taught in |
|---|---|---|
| The amount is evaluated once, in the pre-state | compiled code must save it in a register before the first write, or `move (bal src) src dst` destroys money | S9.L3 |
| The credit reads the debited store | a self-transfer nets to zero (the S3 decision); reading both balances first is SP-2.1's class | S9.L2, S9.L3 |
| Errors are outcomes, never "going wrong" | with no undefined behavior, CompCert's "improves on" becomes equality (A2-F21) | S9.L4 |
| `abort` discards every write of the run | the IR models one PostgreSQL transaction; this decides when a hoisted write is wrong | S9.L3, S9.L7 |
| `exec` is a total function; `exec_deterministic` is stated and accepted | forward simulation suffices for a deterministic target (Leroy 2009 §2.4 [V]); the database under concurrency is not one, so that part stays in the runtime claim | S9.L3, S9.L5 |
| `writeIf` exists; the compiler never emits it | an UPDATE whose WHERE can match no row, rowcount ignored (S6.L2); used by SP-9.3 and LAB-9.11's lifter | S9.L4, S9.L8 |
| `compE e r` leaves the value in `r` and changes only registers `r` and above | the guard keeps operands in `r` and `r + 1`: S4's frame condition again | S9.L6 |
| R ignores registers | they are dead between commands, as in Leroy's register-allocation relation (CACM 2009 §4.3 [V]) | S9.L5 |

**What the IR models.** `read` is a SELECT of one balance; `write` an UPDATE by id expecting one row; `writeIf` an UPDATE with a WHERE guard and the rowcount ignored; `assertGe` a checked condition mapped to a typed error; `abort` a ROLLBACK with a typed error. It does **not** model concurrency, missing rows, `bigint` overflow (22003, SP-6.4 [X RUN-pg-anomalies]) or retries: those belong to the runtime claim (S9.L9), and LAB-9.11 meets missing rows and SQLSTATEs as outcome classes.

**The theorem**, in CompCert's template ("if the compiler … produces the code C, then the observable behavior of C improves on one of the allowed observable behaviors of S", manual §1.2 [V][compcert]):

`compile c = some p → ∀ s regs, obs s (runT p regs s) = obs s (runS c s)`

`obs` and R are the learner's (LAB-9.4), held to the adequacy floor of §4.2: aborts, error codes and every balance must be observable, R must hold on the starting states, and R must imply equal observations. The proof is a forward simulation (`SimR`, §4.2) by induction on the command.

---

## 3. Lessons

### Stage opener · LAB-9.1 (2 minutes, tab)

The stage opens on the reference translation validator (a course tool that earns nothing; spine §12 item 5) checking two compiled versions of `transfer 30 1 2`: the compiler's, and one an agent edited "to reuse a register", which writes the credit to the source account.

**Call It** (k = 4, chance 1/4). Copy: "The validator checks both outputs against the source. What does it report?" A "rejects both: any difference from the reference compiler is flagged" · B "accepts both: the edit only reuses a register" · C "cannot decide without a proof of the compiler" · D "accepts the compiler's output; rejects the edit with a counterexample". **Key:** D {{run:RUN-tv-reference}}. **Why** A: a validator compares meaning, not text (dp:X2). B: the edited output leaves the destination unchanged on every store where the accounts differ (dp:X2). C: translation validation checks this output, not the compiler; that is its point (dp:P3). D: the counterexample store replays in both semantics. **Surprise forecast:** no.

### S9.L1 · bridge · A stack machine, proved

**Objective.** Prove `exec (comp a) s stk = aval a s :: stk` for arithmetic expressions over balances, ported from Isabelle's HOL-IMP `ASM` theory [holimp, V]; shown in the lesson by ordering the plus case (Proof Blocks) and naming the hypothesis it needs (GEN-proof-structure templates 2 and 3). The Lean proof itself is LAB-9.2.
**KCs.** KC-9.stack-machine-correctness. **Prerequisites.** KC-2.generalized-ih. **Instruments.** INS-goal-replay, INS-bench-lean. **Generator.** GEN-proof-structure. **Claim.** CL-9.1. **Minutes.** 15–25.

Copy (hook): "The validator checked one compiled command. A proof checks every program a compiler can produce. Start with the smallest compiler there is." Isabelle proves it by `induction a arbitrary: stk` then `auto`, after `exec_append` [holimp, V]. The port reads balances (`bal a`) and makes `exec1 add` total with a junk case on a short stack, which compiled code never reaches.

**Prequestion** (k = 4, chance 1/4). Copy: "Isabelle proves the theorem by induction on `a` with the stack arbitrary. Why must the stack be arbitrary?" A "The theorem never uses the stack" · B "The second operand's code runs on a stack that already holds the first operand's value" · C "It only makes the automation faster" · D "The induction is on the stack, not on `a`". **Key:** B. **Why** A: the conclusion mentions `stk`, and the plus case changes it (dp:L4). B: the hypothesis for the second operand is needed at `aval a s :: stk`. C: without it the plus case is unprovable, not slow (dp:L2). D: the induction is on the expression; the stack is generalized (dp:L5).

*Cell* (INS-goal-replay, recorded): the port's proof attempted with and without `generalizing stk` {{run:RUN-lean-stack-machine}}.

**Call It** (k = 4, chance 1/4). Copy: "Without `generalizing stk`, which case leaves a goal the hypotheses cannot close?" A `n` · B `bal` · C `plus` · D "none: the proof goes through". **Key:** C {{run:RUN-lean-stack-machine}}. **Why** A, B: a constant or a read pushes one value and needs no hypothesis (dp:L6). C: the hypothesis for `b` speaks about `stk`, but the goal needs it at `aval a s :: stk`. D: the same slip as SP-2.3's ungeneralized `run_conserves` (dp:L5). **Surprise forecast:** moderate.

**Worked example.** Goal Replay of `exec_append`, a list induction generalizing the stack (fading family F1, at the learner's current rung).

**Graded item.** GEN-proof-structure template 2 (Proof Blocks, 1–2 distractors) on the plus case of a pooled variant machine (constructor sets plus/minus, plus/times, or plus with a unary `neg`; band by constructor count). Key order: split the code with `exec_append` → the hypothesis for `a` at `stk` → the hypothesis for `b` at `aval a s :: stk` → compute the last instruction. Distractors: "the hypothesis for `b` at `stk`" (dp:L5); "rewrite with the goal" (dp:L6). Graded as a DAG.
**Exit item.** GEN-proof-structure template 3 (needed hypothesis) on a fresh pooled variant → KC-9.stack-machine-correctness, KC-2.generalized-ih (spiral).
**Today cards.** The exit family; a KC-2.generalized-ih return on S9's first day back in Lean.
**Twin card.** Isabelle HOL-IMP `ASM` and `Compiler`, pinned by Isabelle release in {{run:RUN-twin-pins}}: which `exec1` cases does `fun` leave unspecified, and why does `exec_comp` never meet them?
**Sibling bridge.** None. **Reading.** HOL-IMP `ASM`, "Stack Machine" and "Compilation"; *Concrete Semantics* §3.3 (§11).
**Build this.** LAB-9.2 (45 min, weekend).

### S9.L2 · bridge · Translation validation first

**Objective.** Check one compiled output against the source on every store within a stated bound, produce a store that refutes a wrong output, and stamp the verdict with its bound or instance count (GEN-find-the-witness template 1; GEN-which-stamp templates 1–2).
**KCs.** KC-9.translation-validation. **Prerequisites.** KC-6.differential-testing. **Instruments.** INS-lane-a (hosting the reference validator), INS-interp. **Generators.** GEN-find-the-witness, GEN-which-stamp. **Minutes.** 15–25.

Content. Translation validation checks each output instead of the compiler (Pnueli, Siegel and Singerman, TACAS 1998; Necula, PLDI 2000); Leroy: run untrusted code, "then verify its results using a verified validator" (CACM 2009 §2.4 [V]). Alive2 is bounded, "designed to avoid false alarms", and found 47 new LLVM bugs (PLDI 2021; R5 F19). The reference validator runs both semantics on INS-interp over every store within its bound: exhaustive gives [M] · bound, sampled gives [T] · n, and a symbolic encoding of straight-line code could give [P] of its encoding, uncertified. Either way the validator joins the trusted base (S9.L9).

**Prequestion** (k = 4, chance 1/4). Copy: "A translation validator accepts one compiled command. What is established?" A "The compiler is correct" · B "This output agrees with the source on every store within the validator's bound" · C "This output agrees with the source on every store" · D "The output matches the reference compiler's text". **Key:** B. **Why** A: one output was checked; the next is not (dp:P3). B: per output, per bound. C: only an unbounded method says that, and then about its encoding (dp:X1). D: it compares behavior, not text (dp:X2).

*Cell 1*: the validator on the compiled transfer with its two writes swapped: credit first, then debit; each write re-reads its account, and the amount was saved first.

**Call It** (k = 3, chance 1/3). Copy: "What does the validator report for the swapped writes?" A "accepted within the bound" · B "rejected: a self-transfer counterexample" · C "rejected: an insufficient-funds counterexample". **Key:** A {{run:RUN-tv-reference}}. **Why** A: two postings commute when each reads the current balance and the amount is fixed, a self-transfer included. B: SP-2.1's mint needs both balances read before either write; this order re-reads (dp:L7, dp:S1). C: the guard and its assert did not move (—). **Surprise forecast:** yes.

*Cell 2*: the read-both-first output is rejected with a self-transfer counterexample: SP-2.1's class (10 became 15 in S2 [X RUN-lean-selftransfer]; this cell's numbers, {{run:RUN-tv-reference}}).

**Call It** (k = 3, chance 1/3). Copy: "The validator enumerated every store with three accounts and balances in a small range, and found no divergence. Which stamp?" A "[P] · validator" · B "[T] · n" · C "[M] · with the bound printed". **Key:** C (spine §8.8, bounded and complete within the bound) {{run:RUN-tv-reference}}. **Why** A: complete within a bound is not unbounded (dp:X1, dp:T5). B: [T] is for sampled instances; this enumeration was exhaustive within its bound (—). C. **Surprise forecast:** no.

**Graded item.** GEN-find-the-witness template 1 (model): a compiled output drawn from the reference output mutated by one operator (wrong account, flipped sign, dropped assert, swapped assert operands, a clobbered register) or left intact (seeded sound share); band by command size (one to three source commands). The learner gives a store on which source and output disagree, or "none". INS-interp runs both semantics; "none" is keyed by the bounded enumeration, bound printed.
**Exit item.** GEN-which-stamp template 2 (complete the qualifier of a validator verdict line) → KC-9.translation-validation.
**Today cards.** The exit family; set G items once S9.L5 opens the set.
**Twin card.** Alive2 at a pinned commit {{run:RUN-twin-pins}}: what bound does `alive-tv` place on loops, and what does it print when the bound is reached?
**Sibling bridge.** None. **Reading.** Leroy 2009 §2.2 "Verified, validated, certifying compilers"; Alive2 §1–2 (§11).
**Build this.** LAB-9.3: your compiler's outputs meet this validator before you prove anything.

### S9.L3 · bridge · A target IR, and compiling into it

**Objective.** Define the IR's semantics with transactional aborts, state its determinism, and compile the fragment so that the amount is saved before the first write and the credit reads the debited store; shown by finding the command and store that expose a wrong compile scheme (GEN-find-the-witness template 1).
**KCs.** KC-9.target-ir. **Prerequisites.** KC-3.big-step-errors. **Instruments.** INS-interp, extended with the target IR (§14). **Generator.** GEN-find-the-witness. **Minutes.** 15–25.

**Prequestion** (k = 3, chance 1/3). Copy: "`move balance(a) from a to b`, with a = 5 and b = 0. A compiler debits a by balance(a), then credits b by balance(a), reading balance(a) again for the credit. What does b end with?" A "5" · B "0" · C "10". **Key:** B (replayed in the segment, keyed by {{run:RUN-tv-reference}}). **Why** A: the source evaluates the amount once; this compile evaluates it a second time, after the debit (dp:S1). B: the second read sees 0, so 5 leaves the system. C: no write doubles it (—).

*Cell*: INS-interp runs three IR programs: a write followed by `abort`; a failing `assertGe`; a `writeIf` whose condition fails.

**Call It** (k = 3, chance 1/3). Copy: "The program writes 9 to account 0, then executes `abort denied`. From balances (5, 0), what does a client observe?" A "committed: (9, 0)" · B "aborted: denied; balances (5, 0)" · C "aborted: denied; balances (9, 0)". **Key:** B, the IR's transactional abort (an LAB-9.3 golden) {{run:RUN-tv-reference}}. **Why** A: `abort` is not `skip` (dp:P4). B: an abort discards every write of the run, as ROLLBACK does. C: that would be an IR whose aborts keep earlier writes; S9.L7 shows what it breaks (dp:P4). **Surprise forecast:** no.

Copy, on determinism: "`exec` is a function: one program and one starting state give one outcome. State it anyway. It is the assumption forward simulation needs (S9.L5), and a database under concurrency does not meet it." Contrast: LLVM IR is not deterministic (`undef`), so Alive2 checks refinement; 43 of its 121 refinement violations in LLVM's unit tests involved `undef` (PLDI 2021; R5 F19).

**Graded item.** GEN-find-the-witness template 1: a compile scheme drawn from {amount re-evaluated after the debit (dp:S1); both balances read first (dp:L7); the guard's first register clobbered; the positivity assert dropped} or the reference scheme (seeded sound share). The learner gives a command and store that expose it, or "none"; INS-interp grades.
**Exit item.** GEN-call-it template 4: about five statements on determinism and rollback (for example "a deterministic IR makes the database deterministic", false, dp:P3) → KC-9.target-ir.
**Today cards.** The exit family; a re-find of SP-2.1's class in compiled code (M-re-find).
**Twin card.** Alive2, as in S9.L2: why refinement rather than equality under `undef`?
**Sibling bridge.** None. **Reading.** *Concrete Semantics* §8.1 and §8.3 (§11).
**Build this.** LAB-9.3 (25 min).

### S9.L4 · core · What is observable

**Objective.** Choose the observations (aborts included), define observational equivalence, and state the preservation theorem in CompCert's template; shown by producing a pair of runs that a weak observer equates and a client tells apart (GEN-leaks-to-observer template 3) and by judging restatements of the theorem (GEN-call-it template 4).
**KCs.** KC-9.observations. **Prerequisites.** KC-9.target-ir, KC-7.observer-equivalence. **Instruments.** INS-pairs, INS-goal-replay. **Generators.** GEN-leaks-to-observer, GEN-call-it. **Specimen.** SP-9.3. **Minutes.** 2 + 3 × 12–15 + 5.

**PQ1** (k = 3, chance 1/3). Copy: "A compiler turns a failed funds check into 'change nothing, report success'. Your theorem compares final balances only. Does it catch the bug?" A "yes" · B "no" · C "only on self-transfers". **Key:** B. **Why** A: the balances end equal either way; only the outcome differs (dp:P1). B. C: neither run writes anything (—).
**PQ2** (k = 4, chance 1/4). Copy: "Which is part of CompCert's observable behavior?" A "execution time" · B "memory consumption" · C "the trace of input and output and how the program ends" · D "the generated assembly". **Key:** C. **Why** A, B: excluded by name, "with the notable exception of execution time and memory consumption" (manual §1.2 [V][compcert]) (dp:P5). C: termination, divergence or going wrong, with the trace of input and output (Leroy 2009 §2.1 [V]). D: an artifact, not a behavior (dp:X2).

**Segment 1 · What a client sees.** *Cell* (INS-pairs): the source and SP-9.3's compiler, which turns the funds check into conditional writes (`writeIf`) that match nothing when funds are short, run on a store with balance 0 and amount 1, under two observers: balances only, and the outcome (committed balances, or the error code).
**Call It** (k = 4, chance 1/4). Copy: "Which observers tell these two runs apart?" A "neither" · B "balances only" · C "the outcome observer" · D "both". **Key:** C {{run:RUN-lean-abort-blind}}. **Why** A: one run aborts and one commits (dp:P1). B: both leave the balances unchanged (dp:P1). C. D: balances-only equates them (—). **Surprise forecast:** moderate.
Copy: "This is S6's unchecked rowcount (S6.L2) one level up. An observer that cannot see aborts proves that bug correct." SP-9.3 is mounted: provable for every store under balances only, refuted at this store under the outcome observer {{run:RUN-lean-abort-blind}}.
**Graded item.** GEN-leaks-to-observer template 3 (size or abort observer): an observer (balances only; error codes merged; aborts mapped to the pre-state) and a compiled output (silent guard; wrong error code; or the reference, seeded sound share). The learner gives a pair of runs the observer equates and a client distinguishes, or "none"; INS-pairs checks both.

**Segment 2 · The template.** Worked example: CompCert's statement (manual §1.2 [V]) and its Coq form, `transf_c_program p = OK tp -> backward_simulation (Csem.semantics p) (Asm.semantics tp)` (`driver/Compiler.v`, read 2026-10-23 [V]). Without undefined behavior, "improves on" becomes equality: §2's theorem, shown by INS-goal-replay.
**Call It** (k = 3, chance 1/3). Copy: "A 'compiler' returns `none` for every command. Does it satisfy the theorem?" A "yes, vacuously" · B "no" · C "only if every source command aborts". **Key:** A ({{run:RUN-lean-preservation-frag}} records the one-line proof). **Why** A: the premise `compile c = some p` never holds, so the implication holds everywhere. B: a false premise makes an implication true (dp:G4). C: no program exists to run (dp:G4). **Surprise forecast:** yes.
Copy: "So the template needs a companion: the compiler accepts every command of the fragment." That companion is the pinned `compile_complete` (KC-1.implication-vacuity returns).
**Graded item.** GEN-call-it template 4: five restatements of the pinned theorem, for example "whenever the source commits, the compiled program commits with the same balances" (true, given the adequacy floor), "the compiler accepts every fragment command" (false: that is `compile_complete`, dp:G4), "it takes as many steps as the source" (false, dp:P5); keys checked in {{run:RUN-lean-preservation-frag}}.

**Segment 3 · What the template leaves out.** *Cell* (INS-pairs): two compiled transfers that agree on the outcome observation; one takes more IR steps.
**Call It** (k = 4, chance 1/4). Copy: "Preservation holds under the outcome observation. Which can still differ between the source run and the compiled run?" A "the final balances" · B "the error code" · C "whether the command aborted" · D "the number of steps". **Key:** D {{run:RUN-tv-reference}}. **Why** A, B: inside the observation (—). C: inside it, since aborts are observed (dp:P1). D: steps, registers and intermediate stores lie outside, as CompCert's time and memory do (dp:P5 if missed). **Surprise forecast:** no.
Copy: "What an observation leaves out comes back in S9.L9."
**Graded item.** GEN-leaks-to-observer template 3 with a step-count observer: give two runs equal under the outcome observation and different in steps, or "none".

**Exit items.** GEN-leaks-to-observer template 3 → KC-9.observations; GEN-call-it template 4 (theorem restatements) → KC-9.observations, KC-1.implication-vacuity.
**Today cards.** Both exit families; a re-find of SP-9.3 after 7 days on a fresh weak observer (error codes merged into one).
**Twin card.** CompCert's `transf_c_program_correct` and manual §1.2 [V], pinned in {{run:RUN-twin-pins}}: what does `= OK tp` exclude, which simulation direction does the theorem state, and which phases does the manual call unverified?
**Sibling bridge.** None. **Build this.** LAB-9.4, after S9.L5: write `obs` and R in your statement module.

### S9.L5 · core · Forward, backward, bisimulation

**Objective.** Draw the simulation diagram for the fragment, classify correspondence claims as forward, backward or bisimulation, and say when forward suffices (a deterministic target); shown by naming the next goal in a faded forward-simulation step (GEN-proof-structure template 1) and by classifying claims (GEN-call-it template 4).
**KCs.** KC-9.forward-simulation (threshold), KC-9.simulation-kinds. **Prerequisites.** KC-9.observations, KC-6.refinement-relation. **Instruments.** INS-goal-replay (fading, F6). **Generators.** GEN-proof-structure, GEN-call-it. **Minutes.** 2 + 3 × 12–15 + 5.

**PQ1** (k = 4, chance 1/4). Copy: "Forward simulation: every source behavior is a target behavior. Backward: every target behavior is a source behavior. Which says 'the compiled code never does what the source forbids'?" A "forward" · B "backward" · C "both are needed" · D "neither". **Key:** B. **Why** A: forward shows the target can match the source, not that it does nothing else (dp:P1). B. C: one direction carries that sentence (dp:P1). D: (—).
**PQ2** (k = 4, chance 1/4). Copy: "When does the easier direction, forward, give you the other?" A "when the source is deterministic" · B "when the target is deterministic" · C "always" · D "never". **Key:** B. **Why** A: a deterministic source does not stop the target from having extra behaviors (dp:P1). B: Leroy 2009 §2.4: "provided the target language of the compiler has deterministic semantics" [V]; CompCert's `forward_to_backward_simulation` asks for a receptive source and a determinate target [V]. C, D: (—).

**Segment 1 · The diagram** (F6). Worked example (rung L0): Goal Replay of the forward-simulation step for a single posting `post a e`, outside the lab's fragment: related states, the expression lemma, three instructions, the relation re-established. Leroy: "The gist of a proof by simulation is the definition of the ∼ relation" (CACM 2009 §4.3 [V]).
**Call It** (k = 4, chance 1/4). Copy: "After `post`'s compiled code runs from related states, what must you re-establish?" A "the target store equals the source's new store" · B "the registers equal the source's" · C "both" · D "nothing: the relation carries over". **Key:** A {{run:RUN-lean-preservation-frag}}. **Why** A. B: the source has no registers; R forgets them, as Leroy's relation ignores dead registers (dp:P6). C: (dp:P6). D: the store changed, so the relation must be shown again (—). **Surprise forecast:** no.
**Graded item.** GEN-proof-structure template 1 (next goal) on the strip at the learner's F6 rung (L1 hides the last step, L2 the last two, L3 all but the first; 3-up, 1-down staircase), no prompt on the blank.

**Segment 2 · Which direction, when.** *Cell* (INS-interp): the IR beside a variant whose step `maybeFail` may abort with a serialization failure on any run.
**Call It** (k = 3, chance 1/3). Copy: "This target may abort with a serialization failure on any run. You proved forward simulation. Is every target behavior a source behavior?" A "yes" · B "yes, once retries are added" · C "no: the extra abort is a target behavior the source lacks". **Key:** C, by definition; the cell's run is in {{run:RUN-tv-reference}}. **Why** A: forward simulation never rules out extra target behaviors (dp:P1). B: retries move the problem into the runtime claim, where termination is assumed (CL-6.5 [A]) (dp:P3). C. **Surprise forecast:** moderate.
Copy: "This is why S9.L3 states the IR's determinism, and why serialization failures (40001, 40P01) are outcome classes in S6 and S9.L8 rather than invisible." [X RUN-pg-anomalies, RUN-pg-claims]
**Graded item.** GEN-call-it template 4: five diagram or claim descriptions, each judged forward, backward or bisimulation (for example "for every target run there is a source run with the same observation": backward).

**Segment 3 · One family, five methods** (set G opens).

| Method | Direction | Over | Stamp |
|---|---|---|---|
| Preservation proof (CL-9.2) | forward; with a deterministic target, also backward | every program and store | [P] |
| Translation validation (S9.L2) | both, for one output | stores within a bound | [M] · bound |
| Differential testing (S6.L3, CL-6.1) | equal outcome classes | n sampled commands | [T] · n |
| Abstract serializability (S6.L8, CL-6.3) | backward: each history is explained by a serial source run | recorded histories | [T] · n · search bound |
| Trace validation (S8.L6, CL-8.3) | backward: each implementation trace is a spec behavior | n seeds | [T] · n seeds |

*Cell* (INS-receipt views): the learner's CL-6.3 and CL-8.3 receipts side by side; recorded copies on a phone.
**Call It** (k = 3, chance 1/3). Copy: "Your S6 checker accepted a history because some serial order of source commands reproduced every committed output. Which direction was that?" A "forward" · B "backward" · C "bisimulation". **Key:** B. **Why** A: it starts from the concrete history and finds a source run (dp:P1). B. C: it checked one direction, on recorded histories only (—). **Surprise forecast:** yes.
**Graded item.** GEN-call-it template 4, the first set G item: five checks, each judged as one of the five methods. Set G then interleaves after the exit item, at most half a session (M-which-is-it, A [brunmair19]).

**Exit items.** GEN-proof-structure template 1 (F6) → KC-9.forward-simulation; GEN-call-it template 4 (direction) → KC-9.simulation-kinds.
**Today cards.** Both exits, with extra calls on the threshold KC in its first week; set G interleaving from now on (KC-6.differential-testing, KC-8.trace-validation and KC-9.translation-validation join).
**Twin card.** CompCert `common/Smallstep.v`: `forward_simulation`, `backward_simulation`, `forward_to_backward_simulation`, `compose_forward_simulations` (read 2026-10-23 [V]; pinned in {{run:RUN-twin-pins}}): what does the conversion assume of each side, and how does composition let CompCert prove one pass at a time (Leroy §2.3 [V])?
**Sibling bridge.** None. **Build this.** LAB-9.4.

### S9.L6 · core · Prove preservation for the fragment

**Objective.** Prove, case by case, that each source outcome is matched by the compiled code from related states (move, guard with a failing guard, sequence, abort), then assemble preservation with aborts observable; shown by naming the hypothesis each case needs, the next goal, and a correct order for the sequence case (GEN-proof-structure templates 1–3).
**KCs.** KC-9.preservation-proof. **Prerequisites.** KC-9.forward-simulation. **Instruments.** INS-goal-replay, INS-bench-lean. **Generator.** GEN-proof-structure. **Claim.** CL-9.2. **Minutes.** 2 + 3 × 12–15 + 5.

**PQ1** (k = 4, chance 1/4). Copy: "Your simulation lemma for `move` holds only from the all-zero register file. Which case of the theorem then fails?" A "move" · B "require" · C "seq" · D "none". **Key:** C. **Why** A, B: each runs from whatever registers it is given, and all-zero is one such file (—). C: the second command starts from the registers the first left behind (dp:L5). D: (dp:L5).
**PQ2** (k = 4, chance 1/4). Copy: "The first command of a sequence aborts. Which simulation facts show that the compiled sequence aborts with the same error?" A "the first command's only" · B "both commands'" · C "the second command's only" · D "neither". **Key:** A. **Why** A: the second command's code never runs. B, C: (dp:P4). D: the first command's code must abort with that error (—).

**Segment 1 · The statement and what to generalize.** *Cell*: Goal Replay of `SimR c p` (§4.2) and of the induction's goals with and without `∀ regs`.
**Call It** (k = 4, chance 1/4). Copy: "Before induction on the command, what must the simulation statement quantify over?" A "the store only" · B "the register file only" · C "nothing beyond the command" · D "the store and the register file". **Key:** D ({{run:RUN-lean-preservation-frag}} records the failing variants). **Why** A: the sequence case needs any register file (dp:L5). B: the store changes between commands too (dp:L5). C: (dp:L5). D. **Surprise forecast:** no.
**Graded item.** GEN-proof-structure template 3 (needed hypothesis) on a pooled case, keyed by CI's hypothesis deletion; for example, the frame clause of `compE_correct` in the guard case.

**Segment 2 · The workhorse lemma and the move case** (F6, rungs L2–L3 on `post`). `compE_correct` says: the value lands in register `r`, the store is unchanged, and registers below `r` are unchanged; that last clause is the frame condition the guard case needs (KC-4.frame-condition returns).
**Call It** (k = 3, chance 1/3). Copy: "The amount expression reads `src`. Which instruction order makes the compiled move agree with the source on every store?" A "save the amount in a register; debit; then credit" · B "debit; evaluate the amount; credit" · C "read both balances; then write both". **Key:** A ({{run:RUN-tv-reference}} refutes B and C with stores). **Why** A. B: re-evaluating after the debit sees the new balance (dp:S1). C: SP-2.1's class: a self-transfer mints (dp:L7). **Surprise forecast:** no.
**Graded item.** GEN-proof-structure template 1 (next goal) on the faded strip.

**Segment 3 · Sequences, aborts and the assembled theorem.** Proof Blocks for the sequence case: split with the append law → case on c₁'s outcome → committed: c₁'s simulation at the related state, then c₂'s at the intermediate store and c₁'s final registers → aborted: the error propagates and c₂'s code never runs. Assembly: induction with the case lemmas; preservation from `SimR`, `R_init` and `R_obs`; `#print axioms`; comparator; manual mode (`grind` off, automation flagged, M-manual-mode C [keenan26]).
**Call It** (k = 3, chance 1/3). Copy: "In the branch where c₁ commits, at which store do you apply c₂'s simulation?" A "the original store" · B "the final store" · C "the intermediate store left by c₁". **Key:** C {{run:RUN-lean-preservation-frag}}. **Why** A: c₂ runs after c₁ (dp:S1). B: that is what is being proved (dp:L6). C. **Surprise forecast:** no.
**Graded item.** GEN-proof-structure template 2 (Proof Blocks) with distractors "apply c₂'s simulation in the abort branch" (dp:P4) and "apply c₂'s simulation at the original store" (dp:S1).

**Exit items.** GEN-proof-structure template 3 → KC-9.preservation-proof; template 2 → KC-9.preservation-proof, KC-2.generalized-ih.
**Today cards.** Both exits. The claim card CL-9.2 reads "PROVED modulo k remaining cases", each case [A], and updates as each lab case closes.
**Twin card.** Cedar's `cedar-spec`, whose README lists "sound and complete symbolic compilation" [cedarspec]; pinned in {{run:RUN-twin-pins}}: what does `verifyEquivalent_is_sound` assume about the environment, and what does differential testing of the Rust port cover that the proof does not?
**Sibling bridge.** None. **Build this.** LAB-9.5.

### S9.L7 · bridge · The bad optimization

**Objective.** Hoist a write above its guard, watch the preservation proof break, extract the counterexample and its class, and say when the same move is a correct optimization (GEN-find-the-witness template 1, "none" allowed).
**KCs.** KC-9.bad-optimization. **Prerequisites.** KC-9.preservation-proof. **Instruments.** INS-interp, INS-bench-lean. **Generator.** GEN-find-the-witness. **Specimen.** SP-9.1; cashes ER-5. **Minutes.** 15–25.

**Erosion forecast** (M-erosion-forecast). Restate CL-4.2 from memory, then call which segment cracks if the running code is compiled with a hoisted write: proposition-of-model · correspondence · requirement-fit · none. **Key:** correspondence (spine §5.4): the obligation is still true of the source; the code no longer follows the source.

**Prequestion** (k = 4, chance 1/4). Copy: "Moving a write above an `assert`: when does it preserve meaning?" A "always, because aborts roll back" · B "never" · C "when the assert's operands were read before the write, the write clobbers neither, and aborts roll back" · D "only when aborts keep earlier writes". **Key:** C. **Why** A: rollback hides a write after a failed assert, but it cannot fix a guard that reads the written location after the write (dp:S1). B: the table below has a correct cell (—). C. D: kept writes leak whenever the guard fails (dp:P4).

| | Aborts roll back (this IR) | Aborts keep earlier writes |
|---|---|---|
| The guard reads its operands before the write | preserved: the sound pair | broken: a failed guard leaves the write behind |
| The guard reads the written location after the write | broken: the guard tests the new value (SP-9.1) | broken |

The four cells are contrasting cases, shown together before the principle (A [alfieri13]); this pins down A2-F21's condition.

*Cell* (INS-interp, recorded): the hoisted compile of `transfer 1 0 1` from balances (1, 0): the debit block moved above the balance guard's read and assert.
**Call It** (k = 3, chance 1/3). Copy: "The source commits this transfer. What does the hoisted code do?" A "aborts: insufficient" · B "commits with the same balances" · C "commits and overdraws". **Key:** A {{run:RUN-lean-hoist}}. **Why** A: the guard now reads the debited balance, and 0 ≥ 1 fails. B: (dp:S1). C: the guard became stricter, not weaker (—). **Surprise forecast:** yes.
**Call It** (k = 3, chance 1/3). Copy: "Starting from non-negative balances, can the hoisted code ever commit a negative balance?" A "no, and CL-4.2 still covers this code" · B "no, but CL-4.2 no longer covers this code" · C "yes". **Key:** B ({{run:RUN-lean-hoist}} records a proof that the hoisted code keeps balances non-negative). **Why** A: CL-4.2 is about the source, and its correspondence to this code is cracked (dp:P3). B: the code now needs a balance of twice the amount, so it refuses legal transfers, an availability divergence like ER-1's 22003 [X RUN-pg-anomalies], and its safety is no longer what your argument proves. C: (—). **Surprise forecast:** yes.

**Extracting the counterexample.** The broken sequence arm reduces to: from `amt ≤ bal src`, show `amt ≤ bal src − amt` (the Lean goal is recorded in {{run:RUN-lean-hoist}}). Negate it, as in S1: `bal src = amt = 1` replays as committed against aborted. The class is `amt ≤ bal src < 2·amt`; a fix must also kill a non-minimal member such as balance 7 and amount 4 (M-class-hint, B/C [dantoni15]). Remedies (ER-5): a preservation proof, which this compiler cannot have, or per-command translation validation, which rejects this output. The correct hoist rewrites the guard by substitution (S4.L2): after `src := src − amt`, it becomes `src ≥ 0`.

**Graded item.** GEN-find-the-witness template 1: an optimization drawn from {debit hoisted above the guard's read; credit hoisted under self-transfer; writes reordered; the guard rewritten with or without substitution; the hoist that keeps the guard's reads first} (seeded sound share). The learner gives a disagreeing store plus a non-minimal one, or "none"; INS-interp grades.
**Exit item.** The same family, fresh → KC-9.bad-optimization. Today also schedules a GEN-cti-or-bug return (a stuck goal may be a bug or a weak relation; at least four CTI items run through S9, spine §4.1).
**Today cards.** The exit family; a re-find of SP-9.1 after 7 days (the credit hoist under a self-transfer).
**Twin card.** Alive2's maintained bug list (`BugList.md`) at a pinned commit {{run:RUN-twin-pins}}: name the gap class of one unsound transformation it records.
**Sibling bridge.** None. **Reading.** *Concrete Semantics* §8.4 (§11).
**Build this.** Apply the hoist to your own compiler now and keep it in `broken/hoist/`; LAB-9.12 mounts it.

### S9.L8 · bridge · Validating SQL: containment, provers, refutation

**Objective.** Validate generated SQL per command against the source, replay every counterexample through both semantics, and stamp "results match on one database" as [T] · 1 instance (GEN-find-the-witness template 1, a distinguishing database instance; GEN-which-stamp template 1).
**KCs.** KC-9.sql-equivalence. **Prerequisites.** KC-9.translation-validation, KC-6.sql-not-algebra. **Instruments.** INS-pglite, INS-lane-a. **Generators.** GEN-find-the-witness, GEN-which-stamp. **Specimens.** SP-9.2, SP-9.4. **Claim.** CL-9.3; cashes ER-11. **Drawer.** D-17. **Minutes.** 15–25.

**Erosion forecast.** Restate CL-6.1, then call the segment that cracks when a rewrite agrees on one database and differs on another. **Key:** correspondence (ER-11).

**Prequestion** (k = 4, chance 1/4). Copy: "An agent rewrote your compiled credit as an upsert (`INSERT … ON CONFLICT (id) DO UPDATE`). The fixture database and the S6 suite agree with the original. What is established?" A "the rewrite is equivalent" · B "it agrees on the instances tried: [T] · 1 instance for the fixture" · C "it is equivalent whenever the accounts exist, so it is safe" · D "nothing". **Key:** B. **Why** A: agreement on instances is a test (dp:X1, dp:G8). B. C: the instances tried are read as all the relevant ones; the schema allows a missing account (dp:A6). D: one instance is evidence, stamped as such (—).

| Evidence | Tools (Bench only; none runs in a browser, R5 F24) | Stamp |
|---|---|---|
| Proof for a fragment | containment of conjunctive queries by homomorphism (Chandra and Merlin, STOC 1977; D-17); QED, bag semantics with NULLs, complete for a defined fragment | [P] of the prover's encoding · uncertified |
| Bounded search | VeriEQL, databases up to a size | [M] · bound |
| Refutation and tests | Polygon; ParSEval's generated databases | [R] after replay, otherwise [T] · n |

A prover's NEQ is not [R]: SQLSolver "may output NEQ or UNKNOWN for some equivalent query pairs" (R5 F24); only a replayed instance refutes. Calibration: about 32% of LLM SQL rewrites changed results, and an optimizer-based checker proved 37% (CIDR 2026 [cidr26]); judging on one database overstated text-to-SQL accuracy by 11.3–14.2 points (SpotIt, arXiv 2510.26840); LLM judges "exhibit a strong bias for equivalence predictions" (arXiv 2412.05561), and a model's "equivalent" earns no stamp. The validator compares outcome classes per command: success with balances related by your R(S, D) (LAB-6.7), a typed error, or a SQLSTATE such as 22003. Serialization failures (40001, 40P01) are outcome classes too [X RUN-pg-anomalies, RUN-pg-claims], but arise only under concurrency, which stays in the runtime claim (A2-F21).

*Cell 1* (INS-pglite): the original credit and the upsert on the fixture database, then on a database without the destination row.
**Call It** (k = 3, chance 1/3). Copy: "On a database that lacks the destination account, what happens?" A "both fail: no such account" · B "both commit" · C "the original fails (0 rows, NoSuchAccount, rollback); the upsert creates the account and commits". **Key:** C {{run:RUN-pg-one-db}}. **Why** A: an upsert inserts when no row matches (—). B: an UPDATE that matches no row reports 0 rows [X RUN-pg-claims], and the rowcount check rolls back (—). C: SP-9.4. **Surprise forecast:** moderate.
*Cell 2*: a shape check and the reference semantic validator on the wrong-account mutant, whose credit names `$from`.
**Call It** (k = 2, chance 1/2). Copy: "The shape check asks for two UPDATEs, each `WHERE id = <parameter>`, each expecting one row. Does it accept the mutant?" A "accepts" · B "rejects". **Key:** A {{run:RUN-sql-shape-validator}}. **Why** A: the shape is intact; the meaning is not (SP-9.2). B: a shape check cannot see which parameter is named (dp:X2). **Surprise forecast:** no.
Replay rule: a counterexample must satisfy the schema (`bal bigint NOT NULL CHECK (bal >= 0)`, S6.L2); an instance PGlite cannot insert is spurious and discarded (QED and VeriEQL model integrity constraints for this reason, R5 F24).

**Graded item.** GEN-find-the-witness template 1: a compiled statement and a rewrite drawn from {upsert; `NOT IN` against `NOT EXISTS` over a nullable column; `COUNT(*) > 0` against a row-returning guard; a dropped rowcount check} or an equivalent rewrite (seeded sound share). The learner gives a schema-valid instance and parameters that distinguish them, or "none"; graded by replay on INS-pglite and the source on INS-interp, compared by outcome class.
**Exit item.** GEN-which-stamp template 1 over raw outputs (a prover's EQ; an NEQ without an instance; "no counterexample up to k rows"; "results match on the fixture database"; a model's verdict) → KC-9.sql-equivalence.
**Today cards.** The exit family; a re-find of SP-9.4 (`NOT IN` with a NULL).
**Twin card.** QED or SQLSolver at a pinned commit {{run:RUN-twin-pins}}: what each verdict means (`EQ`, `NEQ`, `UNKNOWN`, `TIMEOUT`), for which fragment QED is complete, and what a timeout does.
**Sibling bridge.** None. **Build this.** LAB-9.11.

### S9.L9 · bridge · Draw the trusted computing base

**Objective.** Mark each component of the executable system as proved, validated per run, tested or trusted, against your own claim graph (GEN-which-stamp template 1), and sort about five claims into the three that stay apart: the command preserves invariants, the compiler preserves meaning, the runtime follows the target (GEN-call-it template 4).
**KCs.** KC-9.three-claims, KC-9.tcb (threshold). **Prerequisites.** KC-9.preservation-proof; KC-4.trust-stack. **Instruments.** SCR-claims' rests-on view (no engine). **Generators.** GEN-which-stamp, GEN-call-it. **Specimens.** SP-9.5, SP-9.6; cashes ER-10. **Drawer.** Deferred D-31, surfaced here. **Minutes.** 15–25.

**Erosion forecast.** Restate CL-7.3, then call the segment that cracks when a compiled view's running time depends on another tenant's private rows. **Key:** the assumption record: the observer omits timing (ER-10).

**Prequestion** (k = 4, chance 1/4). Copy: "`native_decide` closes one IR golden. What joins your trusted base?" A "nothing: the kernel still checks it" · B "the Lean compiler and its runtime" · C "only the `decide` tactic" · D "the SMT solver". **Key:** B. **Why** A: `native_decide` "adds the entire lean compiler to the trusted part, and a new axiom will show up in `#print axioms`" (docstring, Lean 4.35.0; R5 F22) (dp:L8). B. C: `decide` is checked by the kernel; `native_decide` is not (dp:L8). D: no solver is involved (—).

*Cell 1* (recorded receipt): a `native_decide` proof's build, axiom list and check.
**Call It** (k = 3, chance 1/3). Copy: "What do the build, `#print axioms` and the check report?" A "green; standard axioms; accepted" · B "red: the build fails" · C "green; a `_native` axiom listed; rejected as not permitted". **Key:** C: on the recorded run `big_native` depends on `[big_native._native.native_decide.ax_1_1]`, and the check reports "Axiom 'big_native._native.native_decide.ax_1_1' is not permitted" while its log still says "Lean default kernel accepts the solution" [X RUN-lean-axioms]. **Why** A: the axiom list changed (dp:L8). B: it builds; a green build with a non-standard axiom is G6b's telltale (—). C: SP-9.5; the stamp becomes [P] · kernel + compiler (spine §8.8). **Surprise forecast:** moderate.
*Cell 2* (INS-pairs): the S7 document view compiled two ways, a full scan and an index scan, on paired states that differ only in tenant B's private documents.
**Call It** (k = 3, chance 1/3). Copy: "Both compiled views return the same body to tenant A on both states. Can A tell the states apart?" A "yes, by the full scan's running time" · B "no: the bodies are equal" · C "yes, by the body". **Key:** A {{run:RUN-lean-leaky-compile}}. **Why** A: SP-9.6: the full scan's step count includes B's private rows; the index scan's does not. B: CL-7.3's observer sees bodies only; time lies outside it, as CompCert's observations exclude time (dp:P5). C: the bodies are equal (—). **Surprise forecast:** yes.
Remedies (ER-10): widen the observer to include steps, which refutes CL-7.3 with this pair ([R]); or state the timing channel as [N], choose the index plan, and claim only the observer you checked. Preserving such properties through compilation takes its own proof (Barthe et al., POPL 2020).

| Component | Built in | Status | Evidence |
|---|---|---|---|
| Lean 4.35.0 kernel and checkers | — | trusted | `--paranoid` runs six checkers [X RUN-lean-comparator]; SEAM-15 held |
| Source semantics | LAB-3 | trusted as the specification | goldens; decision records; requirement-fit never [P] |
| Parser and typechecker (Rust) | LAB-3.8–LAB-3.9 | tested | [T] · n goldens |
| `miniplinth check` (Rust) | LAB-4 | tested; results cross-checked | CL-4.2's qualifier, both solvers agree, uncertified {{run:RUN-check-fragment}} |
| Z3 and cvc5 | — | trusted | SEAM-7 cracked by SP-4.5 |
| IR compiler (Lean) | LAB-9.3 | proved | CL-9.2 [P] · Lean 4.35.0 kernel |
| IR semantics as a model of one transaction | LAB-9.3 | trusted | [A] |
| SQL compiler (Rust) | LAB-6.2 | validated per run | CL-9.3 [M] · bound or [T] · n |
| SQL validator and its lifter | LAB-9.11 | trusted, tested on mutants | the mutant suite; PGlite replay |
| Runtime and retries (Rust) | LAB-6.8 | tested; termination assumed | CL-6.1 [T]; CL-6.5 [A] |
| PostgreSQL 18.6 | — | trusted | SEAM-9 [A]; SEAM-14 held |
| INS-interp, the course's port | course | tested | GATE-interp [T] · n; SEAM-13 held |
| The Lean compiler | — | trusted only where `native_decide` appears | SP-9.5 |

Leroy's list of what CompCert still trusts: the source and target semantics, the unverified parser, assembler and linker, the chain that builds the compiler, and the proof assistant (CACM 2009 §5 [V]); Csmith found CompCert's wrong-code bugs only in "unverified front-end code", plus a specification gap (PLDI 2011 §3.1 [V]). The three claims compose only as strongly as their weakest stamp; the S10 report lists each.

**Graded items.** GEN-which-stamp template 1: each component of the learner's own claim graph → proved [P], validated per run ([M] or [T] per output), tested [T] or trusted [A]. GEN-call-it template 4: five claims, each sorted into command, compiler or runtime (distractors dp:P3).
**Exit item.** GEN-call-it template 4 on fresh claims → KC-9.three-claims, KC-9.tcb.
**Today cards.** The exits, with extra calls on KC-9.tcb in its first week; D-31 (Verus and Aeneas) surfaces when a correspondence field names Rust code to verify directly.
**Twin card.** AuthV2 relies on "the assumption that the DafnyLite compiler produces a correct result, whereas Cedar relies on the correctness of the Lean compiler, since the Lean spec is compiled to C in order to differentially test it" (ICSE 2025; R5 F30). Tracing question at the pinned `cedar-spec` commit {{run:RUN-twin-pins}}: where compiled Lean runs in the differential-testing harness.
**Sibling bridge.** None. **Build this.** LAB-9.12.

### 3.10 Call tally

20 authored calls. Keys by position: A 7, B 3, C 7, D 3 (largest share 35%). Surprise forecasts: yes 6 (S9.L2's first, S9.L4's template call, S9.L5's S6-direction call, both S9.L7 calls, S9.L9's timing call), moderate 5, no 9: GATE-items' 30% floor, until learner-zero's logs replace the forecast. Verdict kinds vary, and none exceeds 60% of the calls. Erosion forecasts are not calls.

---

## 4. LAB-9 · compiler, preservation proof and SQL validator

The template supplies the source semantics with its adapter, the IR's syntax, the `skip`, `seq` (append) and `abort` clauses of `compile`, and named register-index lemmas, so manual mode keeps `omega` and `grind` off. The learner writes the IR's semantics, `compE`, the `move` and `require` clauses, `InFragment`, `obs`, R, every proof and the Rust SQL validator. The stuck protocol fires at 25, 45 and 90 minutes; a goal parked at 90 minutes enters CL-9.2 as one more [A] case, re-found in 7 days (M-stuck-protocol).

### 4.1 Stages and checks

| Stage | Min | Lane | Check: exact pass condition |
|---|---|---|---|
| LAB-9.1 Run the reference validator on `transfer` (half A; first win) | 2 | tab | LAB-9.c1: both verdicts reproduce {{run:RUN-tv-reference}}: "accepted" for the compiled output, bound printed (accounts, balance range, stores enumerated); "rejected" for the wrong-account output, with a store INS-interp replays as different observations. Earns nothing. |
| LAB-9.2 Stack-machine correctness, yourself (proof, `[weekend]`) | 45 | Bench | LAB-9.c2: comparator reports "Your solution is okay!" for `exec_append` and `exec_comp` against pack S9A (verdict wording as in [X RUN-lean-comparator]); axioms within `comparator.json`; no `sorryAx` or `_native` axiom; manual mode recorded. Reference: {{run:RUN-lean-stack-machine}}. |
| LAB-9.3 IR semantics and compiler (half A) | 25 | Bench | LAB-9.c3: comparator accepts every golden of pack S9IR by `decide` and `exec_deterministic`; the lint finds no `native_decide`, `implemented_by`, `extern`, `partial` or `unsafe` in `S9/Defs.lean`; the receipt freezes `S9/Defs.lean` by SHA-256. |
| LAB-9.4 Observations and the matching relation (half B) | 25 | Bench | LAB-9.c4: comparator accepts `obs_sees_aborts`, `obs_sees_errors`, `obs_sees_balances`, `R_init` and `R_obs` against pack S9B's `Adequacy` module, which imports the frozen `S9/Defs.lean` and `S9/Statement.lean`; the receipt freezes `S9/Statement.lean`. An observer blind to aborts cannot pass (SP-9.3). |
| LAB-9.5 Expression lemma (proof, `[weekend]`) | 45 | Bench | LAB-9.c5: comparator accepts `compE_correct`. |
| LAB-9.6 The assignment case: postings compiled to writes (proof, `[weekend]`) | 45 | Bench | LAB-9.c6: comparator accepts `move_sim`; CL-9.2 is minted as "PROVED modulo the remaining pinned lemmas", each [A]. |
| LAB-9.7 The guard case, a failing guard included (proof, `[weekend]`) | 45 | Bench | LAB-9.c7: comparator accepts `require_sim`. |
| LAB-9.8 The sequence case (proof, `[weekend]`) | 45 | Bench | LAB-9.c8: comparator accepts `exec_append` (the IR's append law) and `seq_commit`. |
| LAB-9.9 The abort case, aborts observable (proof, `[weekend]`) | 45 | Bench | LAB-9.c9: comparator accepts `seq_abort`, `abort_sim` and `skip_sim`. |
| LAB-9.10 The assembled theorem (proof, `[weekend]`) | 45 | Bench | LAB-9.c10: comparator accepts `seq_sim`, `compile_correct`, `compile_complete` and `preservation`; `#print axioms preservation` within `comparator.json`; CL-9.2 becomes [P] · Lean 4.35.0 kernel · axioms listed ({{run:RUN-lean-preservation-frag}}); `--paranoid` runs at the Defence. |
| LAB-9.11 A SQL validator on generated plans | 25 | tab | LAB-9.c11, on seeds drawn at grade time: (1) every semantically wrong mutant is rejected, the shape-only mutant included (correct statement shapes, credit naming `$from`); (2) no honest plan is rejected; (3) every rejection carries a schema-valid instance and parameters that give different outcome classes when replayed on INS-pglite (SQL) and INS-interp (source); an instance that cannot be inserted, or does not replay as a divergence, fails the check; (4) every verdict prints its bound or n. Reference: {{run:RUN-sql-validation}}. |
| LAB-9.12 The bad optimization kept; the TCB drawn; claim cards (write stage) | 20 | Bench, tab | LAB-9.c12: `broken/hoist/` sits beside `fixed/`; two `decide` goldens replay SP-9.1 (minimal witness and a non-minimal member); the TCB table gives every component a status; CL-9.1–CL-9.3 pass claim@1 validation, each "if weakened" witness refuting its own proposition. |

### 4.2 Challenge packs and statement pins

Every pack permits `propext`, `Quot.sound` and `Classical.choice` (S2.L9 teaches them; `grind` adds the last [X RUN-lean-axioms]); `sorryAx`, any `_native` axiom and any custom axiom are rejected. `comparator.json` follows the recorded shape [X RUN-lean-comparator], for example `{"challenge_module": "S9A.StackChallenge", "solution_module": "S9A.StackSolution", "theorem_names": ["S9A.exec_append", "S9A.exec_comp"], "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]}`. Receipts hash each challenge file and the frozen `S9/Defs.lean` and `S9/Statement.lean` (trailing whitespace trimmed plus one newline, spine §9.4). A changed hash voids CL-9.2 to [?] · statement mismatch until the affected checks pass again (I7).

- **S9A** (LAB-9.2): `AExp` (`n`, `bal`, `plus`), `aval`, `Instr` (`loadi`, `load`, `add`), a total `exec1`, `exec`, `comp`; theorems `exec_append` and `exec_comp`, stated as in HOL-IMP with the stack explicit.
- **S9IR** (LAB-9.3; imports the frozen `S9/Defs.lean`): IR goldens (a write then `abort` leaves the store unchanged; a failing `assertGe` returns its error; a failing `writeIf` changes nothing), compiler goldens (`transfer` moves the amount; a self-transfer nets to zero; `move (bal src) src dst` moves the whole balance; a non-positive amount aborts), all over decidable projections of the outcome; and `exec_deterministic : exec p regs st = o₁ → exec p regs st = o₂ → o₁ = o₂`.
- **S9B** (LAB-9.4–LAB-9.10; imports the frozen `S9/Defs.lean` and `S9/Statement.lean`):

```lean
-- S9/Statement.lean (yours): Obs : Type, obs : Store → Outcome → Obs,
--   R : Store → Regs → Store → Prop   (source store, target registers, target store)
theorem obs_sees_aborts (s₀ : Store) (e : Err) (s : Store) : obs s₀ (.aborted e) ≠ obs s₀ (.committed s)
theorem obs_sees_errors (s₀ : Store) (e₁ e₂ : Err) : obs s₀ (.aborted e₁) = obs s₀ (.aborted e₂) → e₁ = e₂
theorem obs_sees_balances (s₀ s₁ s₂ : Store) :
    obs s₀ (.committed s₁) = obs s₀ (.committed s₂) → ∀ a, s₁ a = s₂ a
theorem R_init (s : Store) (regs : Regs) : R s regs s
theorem R_obs (s₀ s : Store) (regs : Regs) (st : Store) :
    R s regs st → obs s₀ (.committed st) = obs s₀ (.committed s)

def Follows (o : Outcome) (t : Except Err (Regs × Store)) : Prop :=
  match o, t with
  | .committed s', .ok (regs', st') => R s' regs' st'
  | .aborted e, .error e' => e = e'
  | _, _ => False
def SimR (c : Cmd) (p : List Instr) : Prop :=
  ∀ (s : Store) (regs : Regs) (st : Store), R s regs st → Follows (runS c s) (exec p regs st)

theorem compE_correct (e : Expr) (r : Nat) (regs : Regs) (st : Store) :
    ∃ regs', exec (compE e r) regs st = .ok (regs', st) ∧ regs' r = evalE st e ∧
      ∀ q, q < r → regs' q = regs q
theorem move_sim (amt : Expr) (src dst : Acct) (p : List Instr) :
    compile (.move amt src dst) = some p → SimR (.move amt src dst) p
theorem require_sim (e₁ e₂ : Expr) (err : Err) (p : List Instr) :
    compile (.require e₁ e₂ err) = some p → SimR (.require e₁ e₂ err) p
theorem exec_append (p k : List Instr) (regs : Regs) (st : Store) :
    exec (p ++ k) regs st = (exec p regs st).bind (fun rs => exec k rs.1 rs.2)
theorem seq_commit (c₁ c₂ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁) (h₂ : SimR c₂ p₂)
    (s s₁ : Store) (regs : Regs) (st : Store) (hR : R s regs st) (hc : runS c₁ s = .committed s₁) :
    Follows (runS c₂ s₁) (exec (p₁ ++ p₂) regs st)
theorem seq_abort (c₁ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁)
    (s : Store) (regs : Regs) (st : Store) (e : Err) (hR : R s regs st) (ha : runS c₁ s = .aborted e) :
    exec (p₁ ++ p₂) regs st = .error e
theorem abort_sim (err : Err) (p : List Instr) : compile (.abort err) = some p → SimR (.abort err) p
theorem skip_sim (p : List Instr) : compile .skip = some p → SimR .skip p
theorem seq_sim (c₁ c₂ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁) (h₂ : SimR c₂ p₂) :
    SimR (.seq c₁ c₂) (p₁ ++ p₂)
theorem compile_correct (c : Cmd) (p : List Instr) : compile c = some p → SimR c p
theorem compile_complete (c : Cmd) : InFragment c → ∃ p, compile c = some p
theorem preservation (c : Cmd) (p : List Instr) : compile c = some p →
    ∀ (s : Store) (regs : Regs), obs s (runT p regs s) = obs s (runS c s)
```

`seq_abort` takes no hypothesis about `c₂`: the second command never runs, and a learner who reaches for it has met dp:P4. The S9IR goldens force `compile` to accept `transfer`, so `compile_complete` cannot be met vacuously.

### 4.3 Receipts (receipt@1)

Lean stages (LAB-9.2–LAB-9.10, LAB-9.12): `lean` with toolchain 4.35.0, `checkers[]` with verdicts (comparator; `--paranoid` at the Defence), `challengeSha`, axioms per theorem, `nativeAxioms: []`, `sorryCount: 0`, automation flags; `statements[]` (challenge files and the frozen modules); `checks[]`; `claims[]` (CL-9.1 at LAB-9.c2; CL-9.2 minted at LAB-9.c6, updated at LAB-9.c7–LAB-9.c10; CL-9.1–CL-9.3 written at LAB-9.c12); `tcb[]` at LAB-9.c12; `provenance` (self-reported, OD-8). LAB-9.11's receipt is produced in the tab: the validator wasm's SHA-256, seeds, n or bound, the PGlite version and its server version string, and outcome-class counts per mutant.

### 4.4 Hint ladders (M-hint-ladder)

R0 for every check: a teach-back of at least 12 words on what the check needs, then three authored ideas revealed and ticked; self-assessed, never credited. Past R2, work is assisted until an unseen variant passes.

| Check | R1 concept | R2 where to look | R3 fragment (≤ 3 lines) | R4 informal proof or design |
|---|---|---|---|---|
| LAB-9.c1 | a validator checks one output on stores in its bound | the counterexample store on the receipt | open the store; compare dst in both runs | the edit credits src, so dst never changes |
| LAB-9.c2 | the second operand runs on a taller stack | the plus case; `exec_append` | induct on `a`, stack generalized; split; both hypotheses | HOL-IMP's argument, case by case |
| LAB-9.c3 | save the amount; credit after the debit | the failing golden's command | snapshot register before the first write | the compile scheme of §2 |
| LAB-9.c4 | aborts and errors must be visible | which adequacy theorem fails | observe the outcome itself | `obs` as the outcome; R as store equality |
| LAB-9.c5 | frame: lower registers and the store unchanged | the `add` case's second operand | first hypothesis at `r`, second at `r + 1` | value, frame and store, by induction |
| LAB-9.c6 | R forgets registers; two postings | the expression lemma at base 0 | rewrite the amount as the register's value | stores agree pointwise after six steps |
| LAB-9.c7 | the assert compares registers, not the store | the frame clause for register `r` | case on the guard; failing branch aborts | both branches, with the frame clause |
| LAB-9.c8 | the second command starts at c₁'s state | the append law; the commit branch | c₁'s simulation, then c₂'s at the new state | composition of the two diagrams |
| LAB-9.c9 | aborts short-circuit | the append law's error branch | the prefix fails; c₂ never runs | propagation without c₂'s hypothesis |
| LAB-9.c10 | induction, then observations | `R_init`, `R_obs`, `compile_complete` | assemble; derive equal observations | the whole argument in prose |
| LAB-9.c11 | compare meaning; replay every rejection | the shape-only mutant | lift each statement to IR form; compare outcome classes | the validator design of S9.L8 |
| LAB-9.c12 | every component has a status | the hoisted compile at the witness | golden: source commits, target aborts | the TCB table of S9.L9 |

### 4.5 Prove-it (M-prove-it; `statespace defend`, agent closed, predictions first)

| After | Mutation of your artifact | Prediction key | Graded by |
|---|---|---|---|
| LAB-9.2 | drop `generalizing stk` | fails to elaborate at the plus case | Lean |
| LAB-9.3 | read both balances before writing | the self-transfer golden fails | Lean (`decide`) |
| LAB-9.3 | evaluate the amount again after the debit | the `move (bal src)` golden fails | Lean (`decide`) |
| LAB-9.4 | return the pre-state on abort | `obs_sees_aborts` cannot be proved | comparator |
| LAB-9.7 | delete the frame clause from `compE_correct` | `require_sim` breaks; `move_sim` survives | comparator |
| LAB-9.10 | hoist the debit above the guard's read | `compile_correct` fails; witness class `amt ≤ bal < 2·amt` | Lean, INS-interp |
| LAB-9.11 | replace the semantic check with a shape check | the shape-only mutant is accepted | the Lane A harness |

### 4.6 Lanes

Learners see the badge words only. *Reported from your machine*: LAB-9.2–LAB-9.10 and LAB-9.12's goldens (Lean receipts). *Re-checked here*: LAB-9.1 (reference module, no credit) and LAB-9.11 (the learner's Rust as wasm, fresh seeds, PGlite replay). On phones: predict, view the recorded run, queue the stage. After LAB-9.11 the validator plugs into the Clearinghouse and checks plans (BRIEF §7.4; owning task in §14).

---

## 5. Specimens

Labels come from runs (M-specimen-cabinet); "kept" follows a re-find after at least 7 days.

| ID | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-9.1 | `transfer 1 0 1` from balances (1, 0): source commits, hoisted code aborts | preservation | the debit moved above the guard's read, so the guard tests the debited balance | yes (amount 1); class `amt ≤ bal < 2·amt` | the original order; the hoist that keeps the guard's reads first; or the guard rewritten to `src ≥ 0` | {{run:RUN-lean-hoist}} |
| SP-9.2 | the compiled transfer with the credit naming `$from`, accepted by a shape check | per-command validation | the check compares statement shape, not outcome classes | — | the semantic validator with replay (LAB-9.11) | {{run:RUN-sql-shape-validator}} |
| SP-9.3 | balance 0, amount 1: source aborts, the conditional-write compile commits, balances equal | full preservation, while the balances-only statement is provable for every store | the observer cannot see aborts; the compile is S6.L2's unchecked rowcount | yes | an observer that sees the outcome (LAB-9.4's floor) | {{run:RUN-lean-abort-blind}} |
| SP-9.4 | upsert credit against UPDATE credit: equal on the fixture database; without the destination row the original rolls back (NoSuchAccount) and the upsert commits | CL-6.1's correspondence | agreement on one instance is [T] · 1 instance | one missing row | per-command translation validation; refutation by generated instances | {{run:RUN-pg-one-db}} |
| SP-9.5 | an IR golden closed by `native_decide`: green build, a `_native` axiom, rejected as not permitted | "PROVED by the kernel" | the Lean compiler joins the trusted base | — | `decide`; or accept [P] · kernel + compiler | [X RUN-lean-axioms] |
| SP-9.6 | paired states differing only in tenant B's private documents: equal bodies, different full-scan step counts | CL-7.3 under a timing observer | preservation's observation excludes time, as CompCert's does | one extra private row | widen the observer, or state the channel [N]; the index plan | {{run:RUN-lean-leaky-compile}} |

## 6. Claim templates

| Field | CL-9.1 | CL-9.2 | CL-9.3 |
|---|---|---|---|
| Proposition | `exec (comp a) s stk = aval a s :: stk` for every expression, store and stack | the pinned `preservation`, with `compile_complete` | each generated SQL plan in the suite agrees with its source command on outcome classes |
| Assumptions | none beyond the Lean kernel | `obs` and R as frozen; IR semantics models one transaction [A] | your R(S, D) from LAB-6.7; PGlite as PostgreSQL 18.6 [A]; single session |
| Model | HOL-IMP port | the fragment and the IR (§2) | the lifted IR and the source |
| Method | comparator, Lean 4.35.0 | comparator, Lean 4.35.0; `--paranoid` at the Defence | the learner's validator; replay on INS-pglite and INS-interp |
| Correspondence | none claimed for any real machine | to the IR only; the IR to PostgreSQL is CL-9.3 and the runtime claims | per command, within the bound or sample |
| If weakened | the variant without `generalizing stk` does not prove (S9.L1) | an abort-blind observer proves the silent compile (SP-9.3) | a shape check accepts the wrong-account plan (SP-9.2) |
| Requirement row | a warm-up; no requirement claimed | the compiler preserves what clients observe, nothing about time or size ([N]) | SQL plans mean what commands mean; concurrency not covered ([N]) |
| Stamp | [P] · Lean 4.35.0 kernel · axioms listed | [P] · Lean 4.35.0 kernel · axioms listed; "PROVED modulo k remaining cases" from LAB-9.6 | [T] · n commands, or [M] · bound |
| Run | {{run:RUN-lean-stack-machine}} | {{run:RUN-lean-preservation-frag}} | {{run:RUN-sql-validation}} |

Strips (proposition-of-model · correspondence · requirement-fit): CL-9.1 [P] · [N] · [N]; CL-9.2 [P] · [A] (the IR as a model of one transaction) · [A]; CL-9.3 [T] or [M] · [A] (the lifter's SQL model; only rejections are replayed) · [A]. Requirement-fit is never [P].

## 7. Seams and erosions

| Event | Seam | Endpoint 1 (planted) | Endpoint 2 (cashed) | Segment cracked | Forecast key | Remedies |
|---|---|---|---|---|---|---|
| ER-5 | SEAM-5: obligations checked on the source carry to the running code | S4.L7 · CL-4.2 | S9.L7 · SP-9.1 | correspondence | correspondence | a preservation proof; per-command translation validation |
| ER-11 | SEAM-11: one database's agreement stands for the compiler | S6.L3 · CL-6.1 | S9.L8 · SP-9.4 | correspondence: [T] · 1 instance | correspondence | translation validation per command; provers or refutation |
| ER-10 | SEAM-10: the observer sees only the response body | S7.L6 · CL-7.3 | S9.L9 · SP-9.6 | assumption record: timing omitted | assumption record | widen the observer; state the channel [N] |

On the builder's path the endpoints arrive in the same order. Held seams touched: SEAM-13 (the reference validator runs on INS-interp) and SEAM-15 (`--paranoid` at both mini-Defences). After S9, SEAM-12 is the oldest open erodible seam, so ER-12 fires in the Clearinghouse (spine §5.4; W5-T13).

## 8. Audit anchors

| ID | Class | Sound pair | Flawed variant | Based on (dated) | Evidence |
|---|---|---|---|---|---|
| AUD-9.1 | G10 (acceptable: G10, G1) | preservation with aborts observable | preservation proved with an observer that ignores aborts | Csmith found CompCert's wrong-code bugs only in "unverified front-end code", plus a specification gap in its PowerPC semantics (PLDI 2011, §3.1; https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf) [V] | a pair of runs, source aborting and target committing, with equal observations |
| AUD-9.2 | G11 (acceptable: G11, G10, as AUDIT-DESK §2.4) | a validator that replays counterexamples through both semantics | a validator that checks shape, not meaning | LLM judges "exhibit a strong bias for equivalence predictions" (arXiv 2412.05561, v2 2025-06-08); about 32% of LLM rewrites changed results (CIDR 2026, https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf) | a distinguishing database instance that replays |

**Variants** (seeded operators, keys recomputed by the checker, toward six or more per class): widen or narrow the observer (merge error codes; map aborts to the pre-state; drop a balance); replace a proof by a one-database test; validation "at bound k, for all inputs" (G5, AUD-1.3's pool); a `native_decide` golden called "kernel-checked" (G6b, AUD-2.2's pool); a prover's NEQ filed as a compiler bug without a replayed instance; "translation validation removes all compiler trust" (G6). Scheduled after LAB-9, re-checked a week later, never locked.

## 9. The Defence: two mini-Defences

Each samples only its own half (spine §12 item 37), is untimed, runs over at least two sessions within a week, and follows the §8.6 pass rule.

| Part | Mini-Defence A (after S9.L4) | Mini-Defence B (after LAB-9.12) |
|---|---|---|
| A, 10 probes | GEN-proof-structure (stack-machine variants), GEN-find-the-witness (validator witnesses; compile-scheme mutants), GEN-which-stamp (validator verdicts), GEN-leaks-to-observer (abort observers); completion test: GEN-call-it template 4 on what R relates and forgets and on what the IR leaves out | GEN-proof-structure (case lemmas), GEN-find-the-witness (optimizations; SQL instances), GEN-which-stamp (SQL verdicts; TCB statuses), GEN-leaks-to-observer (step or size observers); completion test: which pieces of your system remain unverified (GEN-which-stamp template 1) |
| B, 4 mutations, predicted first | drop `generalizing stk` (fails to elaborate); `native_decide` in an IR golden, a closed goal: green build, a `_native` axiom, rejected by `statespace check` [X RUN-lean-axioms]; read both balances first (self-transfer golden fails); evaluate the amount twice (`move (bal src)` golden fails) | make aborts unobservable (`obs_sees_aborts` fails); hoist the debit (`compile_correct` fails; witness class); validate shape only (shape-only mutant accepted); weaken R to relate any stores (`R_obs` fails) |
| C, 4 cases | AUD-9.1 variants and IR-level AUD-9.2 variants; at least one sound | AUD-9.1 and AUD-9.2 variants, the G5 and G6b variants; at least one sound |
| D, explain-back | the refinement relation and the IR's boundary | the three claims and why they stay apart |

## 10. Drawers

D-17 (query containment) in S9.L8; D-14 (the wasm ABI) for LAB-9.11; D-22 (Lean 4 metaprogramming, the roadmap's "selectively"), surfaced only if the learner embeds the toy syntax with `declare_syntax_cat`; deferred D-31 (Verus and Aeneas), surfaced in S9.L9.

## 11. Reading list (dated, section-level)

- [holimp] Isabelle HOL-IMP `ASM`, subsections "Stack Machine" and "Compilation", https://isabelle.in.tum.de/library/HOL/HOL-IMP/ASM.html (read 2026-10-23) [V]. S9.L1.
- Nipkow and Klein, *Concrete Semantics* (Springer, 2014; free PDF at concrete-semantics.org, read 2026-10-23): §3.3; ch. 8, §8.1, §8.3, §8.4 [V]. S9.L1, S9.L3, S9.L7.
- [compcert] CompCert manual ch. 1, §1.2 "Formal verification of compilers" and §1.3 "Structure of the CompCert C compiler", https://compcert.org/man/manual001.html (version pinned in {{run:RUN-twin-pins}}; read 2026-10-23) [V]. S9.L4, S9.L9.
- Leroy, "Formal verification of a realistic compiler", CACM 52(7), 2009, DOI 10.1145/1538788.1538814: §2.1, §2.2, §2.3, §2.4, §4.3, §5 (author's copy, read 2026-10-23) [V]. S9.L2, S9.L5, S9.L9.
- CompCert sources `common/Smallstep.v` and `driver/Compiler.v` (github.com/AbsInt/CompCert, master, read 2026-10-23) [V]. Twin cards.
- Yang, Chen, Eide and Regehr, "Finding and Understanding Bugs in C Compilers", PLDI 2011, DOI 10.1145/1993498.1993532, §3.1, paragraph "Testing CompCert" (read 2026-10-23) [V]. S9.L9, AUD-9.1.
- Lopes et al., "Alive2: Bounded Translation Validation for LLVM", PLDI 2021, DOI 10.1145/3453483.3454030, §1–2 (R5 F19). S9.L2, S9.L3, S9.L7.
- SQL (S9.L8): Chandra and Merlin, STOC 1977, DOI 10.1145/800105.803397; QED, PVLDB 17(11), 2024; SQLSolver's README on verdicts; Narasayya and Chaudhuri, CIDR 2026; SpotIt, arXiv 2510.26840 (v2, 2026-03-04); Singh and Bedathur, arXiv 2412.05561 (v2, 2025-06-08).
- Trusted base (S9.L9): the `native_decide` docstring, Lean 4.35.0 `src/Init/Tactics.lean`; AuthV2, ICSE 2025, section "Translation validation and fuzzing"; Barthe et al., POPL 2020, DOI 10.1145/3371075.
- Drawer only: *Metaprogramming in Lean 4*, the roadmap's "selectively" (D-22).

## 12. Time budget

| Part | Hours [D] | Basis |
|---|---|---|
| Read | 2.0–4.0 | the core pointers of §11 |
| Lessons | 3.5–5.5 | 3 core × 40–60 min; 6 bridges × 15–25 min |
| Build | 6.5–18.3 | LAB-9.1–LAB-9.11, 392 nominal minutes; Lean proof stages (315 min) at up to 3×, the rest at up to 2× |
| Write | 1.8–3.2 | LAB-9.12, claim cards, technical note 4 |
| Defence | 1.5–2.0 | the spine's figure; see §14, item 1 |
| **Total** | **15.3–33.0** | 3.2–6.9 weeks at 6 h/week, 1.9–4.0 at 10 h/week, against 6–10 weeks (28.5–47.5 h); GATE-budget passes, and the low estimate stays above half the lower bound |

Keep load: 11 new KCs × about 10 graded reviews × about 2 minutes ≈ 3.7 h over 60 days, about 25 min/week [D]. Claim cadence at 6 h/week: the longest gap without a new claim or specimen, SP-9.3 (S9.L4) to CL-9.2 (LAB-9.6), plans at about 8.6 h, under two weeks [D].

## 13. Runs this stage needs (W5-T03, W5-T04)

| Run | Must record |
|---|---|
| RUN-tv-reference | verdicts on the compiled transfer (accepted, bound printed) and on the wrong-account, swapped-write, read-both-first and re-evaluated-amount outputs; the rollback, step-count and `maybeFail` cells |
| RUN-lean-stack-machine | pack S9A's reference accepted, axioms listed; the attempt without `generalizing stk` and its goal |
| RUN-lean-preservation-frag | pack S9B's reference accepted, axioms listed, `--paranoid`; the vacuous-compiler proof; the variants without `∀ regs` |
| RUN-lean-hoist | the hoisted compile's failing proof and goal; goldens at the minimal and a non-minimal witness; agreement outside the class; the non-negativity proof; the sound pair |
| RUN-lean-abort-blind | the balances-only statement proved for every store; the outcome observer refuted at balance 0, amount 1 |
| RUN-lean-leaky-compile | equal bodies; different full-scan step counts; equal index-scan step counts |
| RUN-sql-shape-validator | the shape check accepting the wrong-account plan; the semantic validator rejecting it with a replayed instance |
| RUN-sql-validation | the reference SQL validator's verdicts with n or bound; every counterexample replayed |
| RUN-pg-one-db | both credits on the fixture database and on one without the destination row, on PGlite and PostgreSQL 18.6 |
| RUN-twin-pins | the Isabelle release; CompCert, Alive2, QED or SQLSolver, and `cedar-spec` commits |

## 14. Spine issues

1. **Defence budget** (§3.9, §3.11). Two mini-Defences, each with 10 probes, 4 mutations, 4 cases and an explain-back, come to about 2.3–2.8 h by the §3.0 Defence pattern, not 1.5–2.0 h [D]. The high total rises to about 33.8 h, still under 47.5 h.
2. **LAB-9.6's title, "the assignment case".** Mini-Plinth forbids assigning resource fields (S3.L2), so the source construct is a posting pair compiled to IR writes. Suggest "the posting case (postings compiled to writes)"; this spec keeps the spine's title.
3. **LAB-9.c3, "the determinism lemma is stated".** A stated but unproved lemma would put `sorryAx` on the receipt, so this spec requires `exec_deterministic` to be accepted (one line for a functional semantics).
4. **LAB-9.c4, "comparator accepts the statement module".** Comparator requires every definition a pinned statement uses to match between challenge and solution ("Const does not match" [X RUN-lean-comparator]), so a course challenge cannot pin the learner's own `obs` and R. Implemented as adequacy theorems in a course challenge importing the frozen learner modules; suggest rewording.
5. **INS-interp** (§9.1) must also run the target IR (S9.L2, S9.L3, S9.L7); GATE-interp's goldens and SEAM-13's course claim should cover it.
6. **D-17's "Used in"** (§3.12) omits S9.L8; GATE-links will flag it.
7. **The Clearinghouse validator plug-in** (BRIEF §7.4: "their validator checks plans") has no owning task in §13; suggest W5-T05 or W5-T13.
8. **Misconception IDs** have no spine format, and the digest's Ground IDs collide with gap classes G1–G9. This file follows S01's `dp:` prefix and proposes dp:P4–dp:P6.
9. **AUD-9.1's acceptable set** (G10, G1) should be recorded with the anchor, as AUDIT-DESK §2.4 records AUD-9.2's.
10. **Mutations by half.** §3.9 lists Part B's mutations without halves. Under item 37's rule the `native_decide` golden mutation belongs to mini-Defence A (LAB-9.3 is half A); the observer, hoist and shape mutations to B.
11. **Twin pins.** The twin cards add HOL-IMP, QED or SQLSolver, and AuthV2's note to §3.9's CompCert, Alive2 and Cedar; RUN-twin-pins must pin them.
12. **RUN-tv-reference's scope.** It keys more cells than §9.5 says (§13's row). No new run ID is needed, but W5-T04's acceptance should list them.

# S3 Semantics (Mini-Plinth in Lean): curriculum spec

**Status:** authoring spec for W2 (W2-T07 reference and goldens, W2-T08 IR and interpreter, W2-T09 lessons and LAB-3, W2-T10 runs, W2-T13 anchors; ladders W2-T06, Prove-it W2-T11, the Defence W2-T12). Draft: first-learner pass pending. **Date:** 2026-10-23 (machine clock); updated 2026-10-25 for spine revision 3. **IDs:** all from `docs/spine/SPINE.md` (revision 3); anything the spine lacks is marked "proposed" and listed in §14, each item there ending with its revision 3 outcome.

**Sources** (precedence order): the roadmap; executed runs (`research/spikes/RESULTS.md`, `spikes/lean/Ledger.lean`, `evidence/a2r3/out/lean_trust.txt`, `evidence/A5r3/comp-run*.log`, `evidence/lean-measure/`); the brief (V2-15, V2-16, §4.3); the digests; reviews A1, A2 and A4; the spine.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships; `[V]` re-checked against a primary source on 2026-10-23; `[D]` design rationale or estimate; grades A–D as in the pedagogy digest. Learner copy follows "Copy:" in quotation marks and uses only the spine's §0 glossary terms, never internal names (lane, Shelf, docket, pocket checker, telescope, Hall of Records, proof debt, Judgment).

---

## 0. The stage at a glance

**Promise.** Invent Mini-Plinth as a language: give the roadmap's toy syntax a precise meaning in Lean, independent of SQL, Rust and UI; prove that successful steps of well-typed commands preserve a state invariant; then add an unsafe command and watch that proof become impossible.

**New tool.** None: Lean 4.35.0, core plus Std, `autoImplicit false`, returns from S2 [X RUN-lean-ledger]. Lanes: the Bench (Lean with kernel-checked goldens; badge "reported from your machine") and, for capstone steps S10.L1–S10.L2, the learner's Rust as wasm graded in the tab (badge "re-checked here"). Toy syntax, verbatim: `entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.` Roadmap time: 4–8 weeks.

| ID | Tier | Title | Minutes | KCs introduced | Specimens · claims |
|---|---|---|---|---|---|
| S3.L1 | bridge | Abstract syntax, and why we skip parsing | 15–25 | KC-3.abstract-syntax | draft 0 (plants SEAM-6) |
| S3.L2 | core | Typing: resources cannot be assigned | 45–55 | KC-3.typing-judgment, KC-3.resource-postings, KC-3.refined-types | — |
| S3.L3 | bridge | Big-step with explicit errors | 15–25 | KC-3.big-step-errors | — |
| S3.L4 | bridge | Small-step and stuck states | 15–25 | KC-3.small-step-stuck | SP-3.1, SP-3.4 |
| S3.L5 | bridge | What progress and preservation buy | 15–25 | KC-3.progress-preservation-scope | CL-3.1, CL-3.2 (stretch) |
| S3.L6 | core | Invariants of successful steps | 45–55 | KC-3.step-invariant | CL-3.3, CL-3.4 (plants SEAM-3) |
| S3.L7 | core | Edge cases are decisions | 45–55 | KC-3.edge-cases-as-decisions, KC-3.nat-truncation | SP-3.3 (cashes ER-6) |
| S3.L8 | bridge | Termination: structural recursion and fuel | 15–25 | KC-3.termination-fuel | — |
| S3.L9 | bridge | The unsafe command; goldens as theorems | 15–25 | KC-3.goldens-as-theorems | SP-3.2, SP-3.5 · CL-3.5 (shows SEAM-13) |

**KCs** (spine §4). Twelve; the threshold KCs KC-3.small-step-stuck and KC-3.progress-preservation-scope get extra calls, spiral returns (S6.L2, S9.L4; S4.L4, S9.L9) and items in the S3 and S9 Defences. Confusable set F (KC-3.refined-types, KC-3.nat-truncation with KC-1.encoding-is-the-claim) opens in S3.L7 after its exit items; KC-3.goldens-as-theorems joins set A when S6 opens it. Order inside lessons respects every `requires` edge.

**Glossary.** S3 introduces "erosion" (ER-6, S3.L7) and "Clearinghouse" (after LAB-3, §5). **Content blocks:** V2-18's six, named in spine §12 item 48: prose, instrument, item, claim, specimen and card. The prequestion, the graded item and the exit item are item roles; the Build this line, the production twin and the dated incident are card roles. **Sibling bridges:** none in S3 (spine §3.3), so lessons omit the line; each lesson's instruments and generators are spine §3.3's, and each cell names its instrument.

**Cadence** [D]. At 6 h/week (4.75 h of stage work) S3 takes five to six weeks, the lab interleaved, with a specimen or claim at least every two weeks: SP-3.1 and SP-3.4 (week 2), CL-3.3 and SP-3.3 (week 4), SP-3.2 (week 5), CL-3.5 (weeks 5–6). **Paths.** On the builder's path S3 follows S2 unchanged; D-14 is already read (LAB-8.4).

---

## 1. Decisions and conventions

### 1.1 Decisions (read first)

Design choices [D] unless tagged, settling what the spine leaves open.

1. **Goldens are theorems over a finite, decidable state.** `State` is an association list with unique keys, never a function `Acct → Int`, which lacks decidable equality (digest review 1, D2). The harness derives `DecidableEq` for `Except`: in an unregistered scratch elaboration on the pinned 4.35.0 image (2026-10-23), `decide` could not synthesize `Decidable` for an `Except` equation until `deriving instance DecidableEq for Except` was added, after which every golden elaborated with no axioms {{run:RUN-lean-golden-harness}} (proposed, §14 issue 1).
2. **Evaluators are structurally recursive; the runner takes fuel.** In the same elaboration a fueled structural function reduced under `decide` and a well-founded one got stuck {{run:RUN-lean-golden-harness}}; the Lean reference says well-founded applications "are not necessarily definitionally equal to their return values" (§7.6.3) [V].
3. **Statement freeze.** Comparator pins the course's statement text; the learner owns the definitions it mentions. `statespace check lab3.<k>` builds a challenge from the read-only template, the pinned statements and the learner's definitions at the current commit, then runs build → `#print axioms` → `lake check` → `lake comparator`. A weakened statement fails ("theorem statement do not match" [X RUN-lean-comparator]); a redefined evaluator is copied into the challenge, so goldens must catch it (SP-3.5). One receipt binds proof, goldens and challenge to a source hash. If goldens cannot be decided, the fallback (`example : <statement> := Lab3.step_preserves_inv` plus `#print axioms`) stamps the correspondence "statement check: weak" (BRIEF §4.3) and the check stays unpassed.
4. **`HasType` is a checking function**, `typecheck : Ctx → Cmd → Except TypeErr Unit`, with `HasType Γ c := typecheck Γ c = .ok ()`: typing goldens are decidable without a soundness proof, and every rejection names its rule. Lessons draw the same rules as inference rules (PFPL §4.2).
5. **One statement per command body.** The guarded-debit rule (§2.2) is sound only when one debit follows one guard read in the pre-state; with two statements, two parameters can name one account and two passing guards can overdraw it together (dp:S1). Sequencing arrives with S4's weakest preconditions.
6. **Edge-case decisions are data.** `Policy` has four fields: `zero ∈ {reject, noop}`, `self ∈ {allow, reject}`, `guard ∈ {error, silent}`, `overflow ∈ {unbounded, bounded maxBal}`. The reference takes a policy; the learner's evaluator implements one and declares it as `Lab3.policy`; edge-case goldens select by it; the LAB-3.7 records must match it. Reference defaults: reject, allow (a no-op by sequential postings), error, unbounded.
7. **The resource model.** Accounts are `mint`, `sink`, `user n` and `escrow h`; `Inv s` is unique keys ∧ total 0 ∧ every account but `mint` non-negative. Every operation is a zero-sum posting pair, so every step keeps the total at 0 without a per-command proof, and non-negativity is the per-command obligation.
8. **Who writes what.** The template supplies, read-only, `State` with its lemmas, `Err`, `Output`, `Effect`, `Ty`, `Expr` with `evalExpr` and two guard lemmas, `Inv`, `Policy` and the goldens harness; `Inv` and `Policy` extend the spine's list (§14 issue 6). The learner writes `ResourceOp`, `Stmt`, `Cmd`, `typecheck`, `Covers`, `post`, `applyOp`, `exec`, `policy`, the proofs, the decision records and the Rust front end and interpreter. The reference ships as the pinned dependency `MiniPlinthRef`, which learner semantics may not import (a lint; honor system, OD-8).
9. **Agents** may prove lemmas against the pinned statements (provenance `agent`, weight 0; the checker still stamps the claim). Decision records, claim propositions and Prove-it predictions are `TODO(you)`, under the agent kit's hook.
10. **Manual mode for case analysis.** LAB-3.4–LAB-3.5 switch `grind` off and keep `omega`, which adds no axiom beyond `propext` and `Quot.sound` [X RUN-lean-axioms]; a `grind` close is flagged "automated", weight 0 for KC-3.step-invariant (§14 issue 10).

### 1.2 Conventions

**Call It** (M-call-it), as in S1: taps *guess* (below 67%), *think so* (67–80%), *sure* (above 80%); chance 1/k printed; payoffs +1/0, +2/−2, +3/−6 as feedback only; the first call is final; sure-and-wrong calls return at about 1 day and 1 week. Each call carries a surprise forecast (§3.10).

**Keys** are design keys from §2's reference semantics; each ships only after GATE-calls reproduces it on its engine (INS-interp, Lean nightly, or INS-z3 with every authored `unsat` cross-checked by cvc5) and records the run. Every Lean verdict stated as a fact cites a run.

**Misconception tags** are the pedagogy digest's catalog IDs written `dp:S2`, `dp:L7`, since the catalog's S1–S4 and G1–G9 collide with stage IDs and gap classes (§14 issue 2). Stage 3's entries: dp:S1 aliasing intuitions; dp:S2 `Nat` balances cannot overdraw; dp:S3 → written for ↔ in typing or guard rules; dp:S4 progress plus preservation taken to imply the business invariant. Ten are proposed (evidence "—"; kept only if they draw errors):

| Tag (proposed) | Misconception |
|---|---|
| dp:S5 | A term Lean accepts as an `Expr` is a well-typed Mini-Plinth program |
| dp:S6 | A total evaluator means the language has no stuck states |
| dp:S7 | An error outcome is a defect of the semantics |
| dp:S8 | Out of fuel means the program loops forever |
| dp:S9 | The guard alone makes a step safe; typing rules are about shapes only |
| dp:S10 | Conservation needs a proof for each command |
| dp:S11 | A resolved hold can be resolved again |
| dp:S12 | A silent no-op and an error are the same outcome |
| dp:S13 | An `#eval` result is as good as a kernel-checked golden |
| dp:S14 | A refined type is a run-time check that fires later |

**Graded items** name a family and template (spine §8.3, numbered in its order). In S3, GEN-find-the-witness template 1 (model) takes a program, state and call, and template 2 (trace) a small-step trace; the engine (the reference typechecker, evaluator or stepper, or Z3) is the key, never a stored answer, and the learner then names the class. GEN-proof-structure goals come from real elaboration ([X RUN-lean-plaingoal]); needed-hypothesis keys come from CI hypothesis deletion. Practice shows class hints; probes are one-shot.

**Today cards.** Each exit item creates FSRS cards (KC, family, template): at least 8 graded opportunities in 60 days, at about 1–3, 7, 21 and 45–60 days (spine §4.1).

---

## 2. Mini-Plinth v0, the reference

Lean signatures are sketches for W2-T07 [D]; the elaborated reference is {{run:RUN-lean-step-invariant}}. "(you)" marks the learner's LAB-3 code.

### 2.1 Syntax

| Category | Forms | Notes |
|---|---|---|
| Types `Ty` | `account`, `amount`, `hold`, `int`, `bool` | `amount` values are `Amount := {n : Int // 0 < n}` |
| Expressions `Expr` | literals, `var x`, `balance(e)`, `frozen(e)`, `+`, `-`, `>=`, `=`, `&&`, `!` | template-supplied, with `evalExpr` |
| `ResourceOp` (you) | `deposit n to a`, `move n from x to y`, `hold n on x`, `capture h to y`, `release h` | `capture` may target `sink` |
| `Stmt` (you) | `op r`, `set f(x) := e` | only scalar `f` types (R-set); LAB-3.6 adds `force move` |
| `Cmd` (you) | `command C(params) requires g do st` | typed parameters in the IR; one statement per body (§1.1 item 5) |
| Programs | commands with distinct names | `entity Account`: resource `balance`, scalar `frozen` |
| Calls | `C(v₁, …, vₖ)`, raw values | amounts decoded at the boundary |

The roadmap's command as a value (sketch): `Cmd.mk "Transfer" [("from", .account), ("to", .account), ("amount", .amount)] (.ge (.balance (.var "from")) (.var "amount")) (.op (.move (.var "amount") (.var "from") (.var "to")))`. The roadmap writes parameters untyped; the Rust front end (S10.L1) infers each type from its uses, reports conflicts, and the IR carries the result.

### 2.2 Typing: the named rules

| Rule | Requires | Rejection | Protects |
|---|---|---|---|
| R-param | distinct parameter names with declared types | `dupParam` | well-formedness |
| R-var | every variable is a parameter | `unknownParam` | well-formedness |
| R-expr | `balance(e)`, `frozen(e)` take an `account`; arithmetic and `>=` take numbers; the guard is `bool` | `wrongType` | no stuck expression |
| R-amount | an operation's amount is an `amount` parameter or a positive literal | `nonPositive` | the direction of every posting |
| R-cover | `move n from x …` and `hold n on x` need a top-level guard conjunct `balance(x) >= n` | `unguardedDebit` | non-negativity of the debited account |
| R-set | `set f(x) := e` needs a scalar field `f`; `balance` has no assignment rule | `assignsResource` | conservation |
| R-hold | `capture h to y`, `release h` need `h : hold` and `y : account` or `sink` | `wrongType` | no stuck statement |

`Covers g x n` holds when `g` is `balance(x) >= n`, or `g` is `g₁ && g₂` and either side covers; a disjunction never covers. The rule is sound and incomplete: `balance(x) >= n + fee` implies coverage without covering syntactically; S4's obligations prove what it cannot see. R-amount matters to the proof: `move -5 from x to y` credits `x` and debits `y`, which no guard mentions.

### 2.3 Operations as postings

| Operation | Postings (debit → credit, amount) | Run-time checks | Effects · Output |
|---|---|---|---|
| `deposit n to a` | `mint → a`, n | `a` exists | `notify a` |
| `move n from x to y` | `x → y`, n | `x`, `y` exist | `notify y` |
| `hold n on x` | `x → escrow h`, n, with `h = nextHold` | `x` exists | records hold `h` (owner, amount, held); Output `[h]` |
| `capture h to y` | `escrow h → y`, nₕ | hold exists (`unknownHold`); held and covered (`holdNotOpen`) | status captured; `notify y` (user) |
| `release h` | `escrow h → owner`, nₕ | as for capture | status released; `notify` the owner |

`post s x y n` debits `x`, then credits `y` reading the updated state, so a self-posting changes nothing; S2's SP-2.1 computed both balances from the old state and turned 10 into 15 [X RUN-lean-selftransfer]. Commands cannot name escrow accounts. In reachable states the escrow check never fails; it keeps per-operation proofs local, and S4 shows how an inductive "every escrow covers its hold" lets it go.

### 2.4 Evaluation and the outcome order

`exec : Program → Call → State → Except Err (State × Output × List Effect)` is total and structurally recursive. It checks, in order:

1. The command exists, else `unknownCommand C`.
2. Arguments decode by arity and type, amounts positive, else `badArgument p`; under `zero = noop`, an amount of 0 returns `.ok (s, [], [])` at once, with no account or guard check.
3. Every account argument exists, in parameter order, else `unknownAccount a`.
4. A `move` from an account to itself: `selfTransfer` under `self = reject`; under `allow`, continue.
5. A false guard gives `guardFailed C` under `guard = error`, or `.ok (s, [], [])` under `silent`.
6. The statement's run-time checks: `unknownHold h`, `holdNotOpen h`.
7. The postings; under `overflow = bounded maxBal`, a balance outside [−maxBal, maxBal] gives `overflow a`.
8. Effects: `notify y` per credited user account; Output `[h]` for a hold, else `[]`.

`typeError` arises only on ill-typed input (where small-step is stuck), `outOfFuel` only from the fueled runner. Prediction items (default policy; mint −100, a 100, b 0): `Transfer(a, b, 30)` commits a 70, b 30, `[notify b]`; `Transfer(a, b, 130)` is `guardFailed "Transfer"`; `Transfer(a, a, 30)` commits unchanged, `[notify a]`; `Transfer(a, ghost, 30)` is `unknownAccount ghost`; `Transfer(a, b, 0)` is `badArgument "amount"`.

### 2.5 Small-step

Configurations run `bind c args s` → `checked env s` → `guard e env s` → `run st env s`, ending in `done s′ o es` or `err e`. Expressions step left to right; `balance(acct a)` steps to the literal `bal s a`. `done` and `err` are final; a non-final configuration with no step is stuck (PFPL §5.1). The draft relation in S3.L4 lacks `guard false ⟶ err (guardFailed C)` and error propagation, which is SP-3.4.

### 2.6 The invariant and the pinned statements

`Inv s := WF s ∧ total s = 0 ∧ ∀ p ∈ s.bals, p.1 ≠ mint → 0 ≤ p.2`, decidable and template-supplied. Pinned statements (course text, hashed per receipt@1):

| Statement | Shape | Stage |
|---|---|---|
| `post_inv` | `0 < n → (x = mint ∨ n ≤ bal s x) → Inv s → Inv (post s x y n)` | LAB-3.4 |
| `deposit_inv` … `release_inv` (five) | `applyOp r env s = .ok s′ → Inv s → Inv s′`, plus coverage `n ≤ bal s (env x)` for move and hold | LAB-3.4 |
| `covers_sound` | `Covers g x n → evalBool g env s = true → evalAmt n env ≤ bal s (env x)` | LAB-3.5 |
| `step_preserves_inv` | `p.WellTyped → Inv s → exec p c s = .ok (s′, o, es) → Inv s′` | LAB-3.5 (CL-3.3) |
| `cex_force` | the negation of `step_preserves_inv` for the language with `force move` | LAB-3.6 (SP-3.2) |
| `postings_refine_ledger` | the S2 square of CL-3.4 (§7) | reference |
| `progress`, `preservation` | over configurations | LAB-3.12–LAB-3.13 (stretch) |

`step_preserves_inv` holds under every policy: a silent rejection and a zero no-op return the unchanged state, and a bounded overflow returns an error. Decisions change outcomes and what an observer sees, never the invariant; S3.L7 makes that a call.

### 2.7 What the IR carries for S3

IR@1 holds programs, calls, states (balances, holds, `nextHold`, flags), the policy, outcomes (`ok` with state, output and effects, or an `Err` with payload) and goldens (pool id, theorem name, statement hash, pre-state, call, outcome). `lake exe export-ir` writes each golden's right-hand side from the golden module's kernel-checked literals, never from a fresh `#eval`: compiled code can disagree with the kernel through `implemented_by` (in a scratch elaboration on 4.35.0 the kernel proved `spec 3 = 3` with no axioms while `#eval spec 3` printed 4, reproducing review A2-F13) {{run:RUN-lean-implemented-by}} (proposed). S6's typed errors rename these: `Insufficient` is the roadmap Transfer's `guardFailed`; `NoSuchAccount(x)` is `unknownAccount x`.

---

## 3. Lessons

### S3.L1 · bridge · Abstract syntax, and why we skip parsing

**Objective.** Build the roadmap's Transfer as an AST value in INS-interp's AST view; judge five scenarios true or false: which errors an AST-only design rules out and which it leaves to a parser or typechecker (GEN-call-it, template 4). **KCs.** KC-3.abstract-syntax. **Prerequisites.** KC-2.props-as-types. **Seam.** Plants SEAM-6. **Minutes.** 15–25.

**Prequestion** (k = 4). Copy: "You skip parsing and build programs directly as AST values. Which problem can such a value never have?" A "a missing closing parenthesis" · B "an amount used where an account is expected" · C "two commands with the same name" · D "a guard that is never true". **Key:** A. **Why** A: an AST has no parentheses. B: `balance(e)` accepts any expression, so typing must reject it (dp:S5, proposed). C: a list can repeat names; well-formedness must catch it (dp:S5, proposed). D: well-formed and well-typed; only the semantics or a search reveals it (dp:G4).

**Cell 1** (INS-interp, AST view): the roadmap's text beside its AST; draft 0's state declares `balance : Nat` with the dashed note "balances cannot go negative [A]" (SEAM-6). Every learner's cabinet keeps draft 0, so ER-6 fires whatever the learner adopts. **Call It** (k = 3, chance 1/3). Copy: "Can this AST represent `Transfer(a, a, 30)`, a transfer from an account to itself?" A "yes" · B "no: the AST forbids it" · C "only if the parser allows it". **Key:** A. **Why** A: no syntax relates two arguments, so allowing a self-transfer is a semantic decision (S3.L7). B: the syntax cannot say "distinct" (dp:S5, proposed). C: there is no parser here (dp:S5, proposed). **Surprise forecast:** no.

**Cell 2** (INS-goal-replay, recorded output): Lean elaborates a command whose guard is `balance(amount) >= amount` as a value of type `Cmd` {{run:RUN-lean-stuck}}. **Call It** (k = 2, chance 1/2). Copy: "Does Lean accept `balance(amount) >= amount` as a value of type `Expr`?" A "yes" · B "no: `amount` is an amount, not an account". **Key:** A. **Why** A: Lean checks the AST's shape; Mini-Plinth's types are a separate judgment, written next lesson. B: confuses Lean's types with Mini-Plinth's (dp:S5, proposed). **Surprise forecast:** yes.

**Graded item.** GEN-call-it template 4: five seeded scenarios (unrepresentable, parser-only, typing-only or semantics-only), each "ruled out by the AST alone: true or false", keyed at build time by elaborating each against the reference AST and typechecker (GATE-calls, Lean nightly). **Exit item.** GEN-call-it template 1: "caught by the AST's shape, the parser or the typechecker?" on a fresh scenario. **Today cards.** KC-3.abstract-syntax × GEN-call-it templates 4 and 1.
**Reading** (read 2026-10-23): PFPL §1.1 "Abstract Syntax Trees" (skip §1.2: v0 has no binders); FPIL "Getting to Know Lean" §1.5 "Datatypes and Patterns". **Build this.** LAB-3.1, the 2-minute win; then LAB-3.2's signature file, which fixes your constructor names.

### S3.L2 · core · Typing: resources cannot be assigned

**Objective.** Write `ResourceOp` (deposit, move, hold, capture, release) as posting pairs against mint, sink or escrow accounts, and `HasType` with resource and scalar types, R-set (no resource assignment), R-cover (guarded debits) and `Amount := {n : Int // 0 < n}`; then produce, for a named rule, a command it rejects (GEN-find-the-witness, template 1). **KCs.** KC-3.typing-judgment, KC-3.resource-postings, KC-3.refined-types. **Prerequisites.** KC-3.abstract-syntax, KC-1.two-state-property. **Minutes.** 45–55.

**Prequestion 1** (KC-3.resource-postings; k = 4). Copy: "Draft 0 lets a command assign balances: `set balance(x) := e`. Which single command can mint money?" A "`set balance(a) := balance(a) + 1`" · B "a transfer from an account to itself" · C "none: Transfer conserves, so the language conserves" · D "a transfer between two very large balances". **Key:** A. **Why** A: an assignment can write any value. B: sequential updates conserve on a self-transfer; S2's mint computed both balances from the old state (dp:S1). C: one conserving command says nothing about a language with assignment (dp:S10, proposed). D: Lean's `Int` does not overflow (dp:Z4).

**Prequestion 2** (KC-3.refined-types; k = 3). Copy: "Amounts are plain `Int`. Which guarded command can drive an account negative?" A "`move amount from from to to` under `requires balance(from) >= amount`, with amount −5" · B "none: the guard checks the balance" · C "only a transfer from an account to itself". **Key:** A. **Why** A: a negative move debits `to`, which no guard mentions. B: a guard covers the account it names (dp:S9, proposed). C: a positive self-transfer nets to zero (dp:S1).

**Segment 1 — The judgment (13 min).** Teaches Γ ⊢ c ok, R-param, R-var, R-expr and R-cover. Run: INS-interp's typing view, derivation or failing rule. **Call It** (k = 3, chance 1/3). Copy: "Does `command Pay(from: account, to: account, amount: amount) requires balance(to) >= amount do move amount from from to to` type-check?" A "yes: every type lines up" · B "no: the guard does not cover the debited account" · C "no: `balance(to)` is ill-typed". **Key:** B (`unguardedDebit`). **Why** A: R-cover asks which account the guard protects (dp:S9, proposed). B: R-cover needs `balance(from) >= amount`; this guard names the credited account. C: `to` is an account, so `balance(to)` is well-typed (dp:S3). **Surprise forecast:** yes. **Graded item:** GEN-find-the-witness template 1: for a seeded rule (R-expr or R-cover), edit a command until the reference typechecker rejects it with that rule; then name what the rule protects.

**Segment 2 — Five operations, ten postings (13 min).** Teaches the posting table (§2.3), conservation from zero-sum pairs versus non-negativity by obligation, and R-set. Run: INS-interp's posting view, balances before and after `hold 30 on a`, `capture h to sink`, `release h`. **Call It** (k = 3, chance 1/3). Copy: "After `hold 30 on a` and `capture h to sink`, what does `release h` do?" A "returns 30 to a" · B "`holdNotOpen h`" · C "it is rejected before it runs, as ill-typed". **Key:** B. **Why** A: capture emptied the escrow and closed the hold (dp:S11, proposed). B: a run-time check refuses a second resolution; no typechecker knows a hold's status (S3.L5). C: `release h` with `h : hold` is well-typed; this is a run-time outcome (dp:S7, proposed). **Surprise forecast:** no. **Graded item:** GEN-find-the-witness template 1: with R-set or R-amount dropped from a variant checker, find a call that breaks `Inv` and name the conjunct; `Inv` on the outcome is the key.

**Segment 3 — Positivity as a type (12 min).** Teaches subtypes and decoding at the boundary. Goal Replay plan (a correct, complete worked example; one principle prompt per revealed step; no blanks): `⟨30, by decide⟩ : Amount` (goal `0 < 30`); `⟨0, by decide⟩`, where `decide` reports the goal false; `Amount.add`, closing `0 < a.val + b.val` by `omega`. **Call It** on the second step (k = 2, chance 1/2). Copy: "Can the boundary turn the argument 0 into an `Amount`?" A "no: there is no proof of `0 < 0`, so the boundary must reject zero or treat it specially" · B "yes: Lean raises an error later, when the amount is used". **Key:** A. **Why** A: a subtype's value carries its proof, checked once at construction, so zero becomes a boundary decision (S3.L7). B: (dp:S14, proposed). **Surprise forecast:** no. **Graded item:** GEN-proof-structure template 3: which hypothesis does `move_inv` need for the credited account? Exactly one option is necessary by CI hypothesis deletion: `0 < n` (key), beside `x ≠ y`, `frozen x = false` and `n ≤ bal s x`.

**Exit items.** KC-3.typing-judgment: GEN-find-the-witness template 1 on a fresh rule; KC-3.resource-postings: the same template on a fresh variant checker; KC-3.refined-types: GEN-proof-structure template 3 on a fresh lemma. **Today cards.** These three, per KC. **Production twin.** TigerBeetle's two-phase transfers: a pending transfer reserves an amount that a later post or void resolves [tb2pc]; tracing questions at the pinned SHA {{run:RUN-twin-pins}} map pending, post and void onto v0's operations. **Build this.** LAB-3.2: your AST, `ResourceOp` and `HasType`, checked by typing goldens.

### S3.L3 · bridge · Big-step with explicit errors

**Objective.** In INS-interp's evaluator view, produce for a named outcome class a state and call the reference evaluates to it (GEN-find-the-witness, template 1), including zero, self-transfer and failed-guard outcomes as values. **KCs.** KC-3.big-step-errors. **Prerequisites.** KC-3.abstract-syntax. **Minutes.** 15–25.

**Prequestion** (k = 3). Copy: "In S2, `transfer` returned the unchanged state when its guard failed. Can a caller tell a rejected transfer from a successful one that changed nothing?" A "no: both return the same state" · B "yes: the balances differ" · C "yes: `transfer_rejected` tells them". **Key:** A. **Why** A: silent rejection is invisible in the value, so S3 gives failure its own shape, `Except Err …`. B: the balances are equal (dp:S12, proposed). C: a theorem describes the function; a caller sees only the value (dp:L4).

**Cell 1** (default policy). **Call It** (k = 4, chance 1/4). Copy: "From a = 10, `Transfer(a, a, 5)`. What is a's balance afterwards?" A "10" · B "15" · C "5" · D "an error". **Key:** A. **Why** A: the postings debit and then credit the same account, reading the updated state. B: S2's specimen computed both balances from the old state; postings do not (dp:S1). C: the debit without the credit (dp:S1). D: the reference allows self-transfers; S3.L7 makes it your decision (dp:S12, proposed). **Surprise forecast:** yes; a learner who remembers SP-2.1 predicts 15.

**Cell 2.** **Call It** (k = 3, chance 1/3). Copy: "`Transfer(a, b, 0)`: what is the outcome?" A "`badArgument "amount"`" · B "it commits and changes nothing" · C "the evaluator crashes". **Key:** A, under `zero = reject`. **Why** A: 0 is not an `Amount`; the boundary rejects it with a typed error. B: that is the decision `zero = noop` (dp:S12, proposed). C: a total evaluator always returns a value (dp:S6, proposed). **Surprise forecast:** no.

**Graded item.** GEN-find-the-witness template 1: for a seeded outcome class (`guardFailed`, `unknownAccount`, `holdNotOpen`, a commit that notifies the sender, `badArgument`), give a state and call; the reference evaluator is the key; then name the outcome-order step (§2.4) that produced it. **Exit item.** The same template, fresh class. **Today cards.** KC-3.big-step-errors × GEN-find-the-witness template 1.
**Reading** (read 2026-10-23): FPIL "Monads" §4.3 "Example: Arithmetic in Monads" (an `Except` evaluator for division by zero) and §4.1 "One API, Many Applications"; PFPL §6.3 "Run-Time Errors" (checked versus unchecked errors). **Build this.** LAB-3.3.

### S3.L4 · bridge · Small-step and stuck states

**Objective.** In INS-interp's trace view, build one configuration that ends stuck and one that ends in `err` (GEN-find-the-witness, template 2); classify fresh ones as "steps", "error" or "stuck" (GEN-call-it, template 1). **KCs.** KC-3.small-step-stuck (threshold). **Prerequisites.** KC-3.big-step-errors. **Specimens.** SP-3.1, SP-3.4. **Minutes.** 15–25.

**Prequestion** (k = 3). Copy: "Your Lean evaluator is total: it returns a value on every input. Can a Mini-Plinth program still go wrong?" A "yes: totality forces an invented outcome on programs the semantics should never run" · B "no: total means safe" · C "only if it loops". **Key:** A. **Why** A: a total function must answer even for `balance(30)`; the small-step relation honestly has no rule. B: (dp:S6, proposed). C: v0 has no loops; going wrong is about missing rules (dp:S8, proposed).

**Cell 1** (SP-3.1, typing bypassed). **Call It** (k = 3, chance 1/3). Copy: "What does the relation do with `balance(30) >= 30`?" A "steps to `0 >= 30`: an unknown account reads as 0" · B "nothing: no rule applies" · C "steps to `err unknownAccount`". **Key:** B {{run:RUN-lean-stuck}}. **Why** A: that default belongs to the big-step lookup, not to a rule (dp:S6, proposed). B: `balance` steps only on an account value. C: an error is a defined outcome with a rule, and here there is none (dp:S7, proposed). **Surprise forecast:** no.

**Cell 2** (SP-3.4: the draft relation on well-typed `Transfer(a, b, 130)` from a = 100). **Call It** (k = 3, chance 1/3). Copy: "Under the draft relation, where does this trace end?" A "`err (guardFailed "Transfer")`" · B "stuck at `guard false`" · C "`done`, with a at −30". **Key:** B {{run:RUN-lean-bigsmall}}. **Why** A: that is the big-step answer; the draft lacks a false-guard rule, so the semantics disagree (dp:S6, proposed). B: the fix is `guard false ⟶ err …` plus propagation (PFPL §6.3). C: a false guard never runs the body (dp:S9, proposed). **Surprise forecast:** yes.

**Graded item.** GEN-find-the-witness template 2: for a seeded "stuck" or "error", build a program and state; the reference stepper is the key; then name the class (stuck: ill-typed or a missing rule; error: a checked run-time outcome). **Exit item.** GEN-call-it template 1 on a fresh configuration. **Today cards.** KC-3.small-step-stuck × GEN-find-the-witness template 2 and GEN-call-it template 1; threshold returns in S6.L2 (a row a guard skips is neither stuck nor an error) and S9.L4 (aborts observable).
**Reading** (read 2026-10-23): PFPL §5.1 "Transition Systems" (stuck states defined) and §5.2 "Structural Dynamics". **Build this.** LAB-3.3, every error explicit (goldens include SP-3.4's case); stretch LAB-3.12.

### S3.L5 · bridge · What progress and preservation buy

**Objective.** Read the progress and preservation statements beside `step_preserves_inv`, then judge five candidate guarantees true or false: what type safety gives and which business invariants it does not (GEN-call-it, template 4). **KCs.** KC-3.progress-preservation-scope (threshold). **Prerequisites.** KC-3.small-step-stuck, KC-3.typing-judgment. **Claims.** CL-3.1, CL-3.2 (stretch). **Minutes.** 15–25.

**Prequestion** (k = 3). Copy: "Progress and preservation are proved for Mini-Plinth. Do those two theorems alone guarantee that well-typed Transfers keep balances non-negative?" A "yes: that is what type safety means" · B "no: type safety rules out stuck states, not business violations" · C "only if it terminates". **Key:** B. **Why** A: (dp:S4). B: the theorems speak of steps and types; R-cover and the step invariant carry balances. C: termination is a separate property (dp:S8, proposed).

**Cell** (INS-goal-replay, generated, read-only): `progress : Typed cfg → Final cfg ∨ ∃ cfg′, Step cfg cfg′` and `preservation : Typed cfg → Step cfg cfg′ → Typed cfg′`, beside `step_preserves_inv`. **Call It** (k = 4, chance 1/4). Copy: "Delete R-cover from the typing rules. Which theorem stops being provable?" A "progress" · B "preservation" · C "neither of those: `step_preserves_inv` does" · D "both". **Key:** C {{run:RUN-lean-progress}}, {{run:RUN-lean-preservation}}. **Why** A, B and D: an unguarded debit still steps and keeps its types; it only drives a balance negative (dp:S4; dp:S9, proposed). C: only the step invariant mentions balances. **Surprise forecast:** yes.

**Production twin.** Cedar's `typecheck_is_sound` [cedarspec] [V]: when typechecking succeeds, evaluation produces a boolean or "returns an error of type `entityDoesNotExist`, `extensionError`, or `arithBoundsError`", since the type checker "has no knowledge of the entities/context that will be provided at authorization time" (`cedar-lean/Cedar/Thm/Typechecking.lean`, read 2026-10-23; SHA in {{run:RUN-twin-pins}}). v0's analogue: well-typed calls can still end in `unknownAccount`, `unknownHold`, `holdNotOpen` or `guardFailed`.

**Graded item.** GEN-call-it template 4: five pooled candidates, such as "well-typed calls never get stuck" (true), "well-typed calls never return an error" (false; dp:S7), "progress and preservation imply conservation" (false; dp:S4), "a well-typed capture never returns `holdNotOpen`" (false). True candidates have reference proofs, false ones counterexample goldens (GATE-calls, Lean nightly). **Exit item.** GEN-proof-structure template 1: the next goal in the reference preservation proof after `cases` on the step. **Today cards.** KC-3.progress-preservation-scope × GEN-call-it template 4 and GEN-proof-structure template 1; threshold returns in S4.L4 and S9.L9.
**Reading** (read 2026-10-23): PFPL §6.1 "Preservation" and §6.2 "Progress"; the Cedar file above. **Build this.** LAB-3.4; stretch LAB-3.12–LAB-3.13.

### S3.L6 · core · Invariants of successful steps

**Objective.** Prove case by case that every successful step of a well-typed command preserves `Inv` (`post_inv`, one lemma per ResourceOp, the assembly), and name the hypothesis the refinement to the S2 ledger needs (GEN-proof-structure, templates 1–3). **KCs.** KC-3.step-invariant. **Prerequisites.** KC-2.generalized-ih, KC-3.big-step-errors. **Fading.** Family F2. **Claims.** CL-3.3, CL-3.4. **Seam.** Plants SEAM-3. **Minutes.** 45–55.

**Prequestion 1** (k = 3). Copy: "Every Mini-Plinth operation is a zero-sum pair of postings. Which part of `Inv` needs the guard?" A "conservation" · B "non-negativity" · C "both". **Key:** B. **Why** A and C: a zero-sum pair keeps the total whatever the guard says (dp:S10, proposed). B: only a debit can push a balance below zero.

**Prequestion 2** (k = 3). Copy: "Your evaluator returns `guardFailed` for every call. Can you prove `step_preserves_inv`?" A "yes, vacuously: no call succeeds" · B "no: errors break the invariant" · C "no: the statement needs at least one success". **Key:** A. **Why** A: the theorem speaks only of successful steps; goldens (S3.L9) catch an evaluator that never succeeds. B: an error returns no state to break (dp:S7, proposed). C: a false premise makes the implication true (dp:G4).

**Segment 1 — The worked example (F2 rung L0, 14 min).** Goal Replay of the reference proof of `post_inv` (unfold, split the conjuncts, rewrite with `total_setBal`, close with `omega`); each revealed step carries one principle prompt, a choice among four (zero-sum pairs keep the total; coverage pays the debit; positivity protects the credit; unique keys keep `total` honest). **Call It** on the first reveal (k = 3, chance 1/3). Copy: "After splitting `Inv (post s x y n)` into its three parts, which part uses the coverage hypothesis `x = mint ∨ n ≤ bal s x`?" A "the total" · B "non-negativity at x" · C "non-negativity at y". **Key:** B. **Why** A: no pair changes the total (dp:S10, proposed). B: correct. C: y is credited, so it needs positivity of n (dp:S9, proposed). **Surprise forecast:** no. **Graded item:** GEN-proof-structure template 1: the next goal in a fresh generated strip (say, `deposit_inv` after `split`), distractors elaborated from mutated hypotheses.

**Segment 2 — Backward fading (F2 rungs L1–L3, 14 min).** `move_inv` with its last step blank, `hold_inv` with two blank, `capture_inv` with only the case split shown; no prompt on any blank, one principle prompt per revealed step; the 3-up, 1-down staircase sets the next rung in Today. **Call It** on `capture_inv` (k = 3, chance 1/3). Copy: "In `capture_inv` the debited account is the escrow. What pays for the debit?" A "the run-time check that the hold is open and its escrow covers the amount" · B "the command's guard" · C "nothing: escrow accounts may go negative". **Key:** A. **Why** A: capture checks status and coverage at run time (§2.3). B: no guard names an escrow (dp:S9, proposed). C: `Inv` exempts only `mint` (dp:S10, proposed). **Surprise forecast:** no. **Graded item:** GEN-proof-structure template 2 (Proof Blocks): order `release_inv`'s steps, with two distractors (an appeal to the guard; a circular use of `release_inv`), graded as a DAG.

**Segment 3 — Assemble, then refine to the ledger (13 min).** Run: INS-bench-lean, `statespace check` on the reference's assembly with `hold_inv` as `sorry`. **Call It** (k = 3, chance 1/3). Copy: "The assembled theorem builds with `hold_inv` left as `sorry`. What does the receipt stamp?" A "PROVED" · B "PROVED modulo 1 assumed lemma, with `hold_inv` assumed" · C "REFUTED". **Key:** B: a `sorry` build exits 0 [X RUN-lean-axioms]; `sorryAx` yields "PROVED modulo k assumed lemmas" (§8.8). **Why** A: a green build is not a complete proof (dp:G8). B: correct; this is how a parked goal is carried. C: nothing was refuted; a goal is missing (dp:S7, proposed). **Surprise forecast:** yes. Then CL-3.4's refinement (§7): for existing accounts u₁, u₂ and `toLedger s := ⟨bal s u₁, bal s u₂⟩`, a Transfer of a positive amount commits with `toLedger s′ = transfer (toLedger s) n`, S2's function [X RUN-lean-ledger], or fails its guard exactly when S2's `transfer` leaves the ledger unchanged; zero lies outside the square. **Graded item:** GEN-proof-structure template 3: which hypothesis does the refinement proof need? Key `u₁ ≠ u₂` (with one account, S2 moves n between two fields while S3's self-transfer changes nothing), beside `frozen u₁ = false`, `n ≤ bal s u₁` and `Inv s`.

**Exit item.** GEN-proof-structure template 3 on `step_preserves_inv`'s move branch: the hypothesis supplying coverage (`HasType`, through `covers_sound`). **Today cards.** KC-3.step-invariant × GEN-proof-structure templates 1–3 on the F2 staircase. **Production twin.** "How We Built Cedar" [cedar24] §3 "Lean Models and Proofs" (arXiv 2407.01688v1, read 2026-10-23) [V]: properties are proved of a Lean model and production code is tied to the model by testing, the shape of CL-3.3 plus CL-3.5. **Seam.** SEAM-3, dashed on CL-3.3: "a correct step needs no observer". **Build this.** LAB-3.4, then LAB-3.5.

### S3.L7 · core · Edge cases are decisions

**Objective.** Answer zero, self-transfer, failed guard and overflow from the semantics alone (GEN-call-it, template 4, keyed under a stated policy); record each decision, its alternative and consequence; show how `Nat` subtraction hides an overdraft with a Z3-checked truncation witness (GEN-find-the-witness, template 1). **KCs.** KC-3.edge-cases-as-decisions, KC-3.nat-truncation. **Prerequisites.** KC-3.big-step-errors; KC-1.encoding-is-the-claim. **Specimen.** SP-3.3. **Erosion.** ER-6, introducing the term "erosion". **Minutes.** 45–55.

**Prequestion 1** (KC-3.edge-cases-as-decisions; k = 3). Copy: "Two engineers implement Transfer from the same English sentence. One rejects self-transfers; the other treats them as no-ops. Which one violates the specification?" A "the one that rejects" · B "the one that allows" · C "neither: the sentence does not decide it, so the semantics must". **Key:** C. **Why** A: "a self-transfer obviously works" assumes the answer (dp:L7). B: a sequential-posting no-op conserves (dp:S1). C: correct.

**Prequestion 2** (KC-3.nat-truncation; k = 3). Copy: "Draft 0 stores balances as `Nat` and has `Pay(from, to, amount)` with no guard. From from = 30, `Pay(from, to, 50)`: what is from's balance afterwards?" A "−20" · B "0" · C "an error". **Key:** B {{run:RUN-lean-nat-trunc}}. **Why** A: `Nat` has no −20 (dp:S2). B: `Nat` subtraction truncates at 0. C: subtraction is total on `Nat` (dp:S7, proposed).

**Segment 1 — Four edge cases, four decisions (14 min).** Run: INS-interp's decision panel reruns four calls under each policy option. **Call It** (k = 3, chance 1/3). Copy: "From a = 2^63 − 1, `deposit 1 to a` under the reference policy (overflow unbounded). What is the outcome?" A "it commits; a becomes 2^63" · B "a wraps to −2^63" · C "`overflow a`". **Key:** A. **Why** A: the model's `Int` is unbounded. B: wrapping belongs to machine integers (dp:Z4). C: the bounded decision, Cedar's; PostgreSQL's `bigint` refuses such a step with 22003 [X RUN-pg-claims] (S6.L4) (dp:Z4). **Surprise forecast:** no. **Graded item:** GEN-call-it template 4 over five scenarios, keyed by the reference evaluator under the learner's declared policy, for example "under `self = allow`, `Transfer(a, a, 15)` from a = 10 is `guardFailed`" (true: the guard runs first); "under `zero = noop`, a zero transfer to an unknown account commits" (true: the no-op skips every check); "under `overflow = unbounded`, `deposit` can return `overflow`" (false). The pool also holds questions the semantics leaves open (a lock wait, a UI rounding rule), keyed "not decided": the roadmap's completion test.

**Segment 2 — The erosion: `Nat` hides the overdraft (14 min).** First the forecast (M-erosion-forecast): restate draft 0's claim from memory ("balances are never negative, because they are `Nat`"), then call the segment that cracks (k = 3, chance 1/3): A "proposition-of-model" · B "correspondence" · C "requirement-fit". **Key:** B (spine ER-6). **Why** A: the proposition stays true (dp:S2). B: `Nat` is not the intended arithmetic, so the model stops corresponding to money. C: the requirement still asks for non-negative balances; the model misrepresents them (dp:S2). Copy after the reveal: "This is an erosion: a seam you accepted in S3.L1 has cracked." Then INS-z3 (Z3 5.3.1 in the tab [X RUN-z3-starter-pyodide]) runs draft 0's subtraction as `If(n <= a, a - n, 0)` over non-negative integers. **Call It** (k = 3, chance 1/3). Copy: "Z3 searches for a draft-0 `Pay` after which some balance is negative. What is its verdict?" A "`sat`" · B "`unsat`" · C "`unknown`". **Key:** B {{run:RUN-z3-nat-trunc}} (proposed). **Why** A: truncation makes negative balances impossible, so the overdraft cannot show as one (dp:S2). B: correct; the next query, "the total changed", is `sat` (from 30, amount 50: from 0, to + 50, 20 minted). C: a small linear integer query is decided (dp:Z2). **Surprise forecast:** yes. Remedies (ER-6): `Int` balances plus a guard, and the refined `Amount`; with them the query is `unsat`, cross-checked by cvc5. **Graded item:** GEN-find-the-witness template 1: find a draft-0 state and call after which the total changes (Z3 checks the witness's property, never its values), name the class ("every debit above the balance mints the difference; a `Nat` mint does it on the first `deposit`"), and fix it so a non-minimal witness dies too (M-class-hint).

**Segment 3 — Decisions travel (13 min).** Run: INS-interp's policy-diff view. **Call It** (k = 3, chance 1/3). Copy: "Switch `guard` from `error` to `silent`. What changes?" A "CL-3.3's proposition" · B "outcomes and what an observer sees, but not CL-3.3" · C "S2's `transfer_rejected` becomes false". **Key:** B. **Why** A: a silent rejection returns the unchanged state, so the theorem holds under every policy (§2.6) (dp:S12, proposed). B: correct; the S6 compiler, the Rust interpreter and observers must follow it. C: an S2 theorem is about S2's function (dp:L4). **Surprise forecast:** yes. **Graded item:** GEN-call-it template 1 on a fresh policy pair: "which claim segment changes: proposition, correspondence or nothing?"

**Exit items.** KC-3.edge-cases-as-decisions: GEN-call-it template 4, fresh scenarios; KC-3.nat-truncation: GEN-find-the-witness template 1 on a fresh encoding that admits a truncation witness (an unguarded `Nat` debit, or `deposit` from a `Nat` mint), naming the conjunct of `Inv` it breaks. Set F opens after them (M-which-is-it, at most half a session). **Today cards.** KC-3.edge-cases-as-decisions × GEN-call-it templates 4 and 1; KC-3.nat-truncation × GEN-find-the-witness template 1; set F mixes with KC-1.encoding-is-the-claim. **Production twin.** Cedar's bounded integers: `arithBoundsError` is among the errors its type-soundness theorem still allows [cedarspec] [V], so Cedar took the bounded decision; the reference takes the unbounded one and carries SEAM-1 to S6.L4. **Dated incident.** Formal Conjectures made 291 fixes, 35.4% of them type semantics such as ℕ subtraction (arXiv 2605.13171, 2026-05; landscape digest [V]). **Build this.** LAB-3.7: the four decision records and the IR export.

### S3.L8 · bridge · Termination: structural recursion and fuel

**Objective.** Judge five statements true or false about why v0 needs no fuel, how fuel makes the runner total, what an out-of-fuel result means, and why goldens need definitions the kernel can reduce (GEN-call-it, template 4). **KCs.** KC-3.termination-fuel. **Prerequisites.** KC-3.big-step-errors. **Minutes.** 15–25.

**Prequestion** (k = 3). Copy: "A fueled runner returns `outOfFuel` after 1,000 steps. What do you know about the program?" A "it loops forever" · B "only that no verdict was reached within 1,000 steps" · C "it has a bug". **Key:** B. **Why** A: more fuel may finish it (dp:S8, proposed). B: like S1's `unknown`, no verdict, and it fails closed. C: a long run is not an error (dp:S7, proposed).

**Cell 1** (INS-goal-replay, recorded outputs): Lean accepts `exec` by structural recursion with no termination proof; the runner recurses on fuel; a golden over a well-founded definition reports "Tactic `decide` failed to reduce … reduction got stuck" {{run:RUN-lean-golden-harness}}. **Call It** (k = 3, chance 1/3). Copy: "`theorem g : countdownWF 3 = 0 := by decide`, where `countdownWF` uses well-founded recursion. What happens?" A "it proves g" · B "it fails: the equation is false" · C "it fails to reduce: no verdict". **Key:** C. **Why** A: `decide` needs the kernel to compute the value; well-founded definitions need not reduce (dp:S13, proposed). B: 0 is true; reduction failed, not truth (dp:S7, proposed). C: correct. **Surprise forecast:** yes.

**Cell 2** (INS-interp's runner on a counted loop, an extension outside v0). **Call It** (k = 2, chance 1/2). Copy: "With fuel 3 the runner says `outOfFuel`; with fuel 100 it finishes. Did the program's meaning change?" A "no: fuel bounds the runner, not the program" · B "yes: with fuel 3 it is a failing program". **Key:** A. **Why** A: correct. B: (dp:S8, proposed). **Surprise forecast:** no.

**Graded item.** GEN-call-it template 4, five statements such as "v0 needs no fuel: every body is one statement and the evaluator recurses on the syntax" (true); "`outOfFuel` is an error the program raised" (false; dp:S7); "a golden whose right side is `outOfFuel` states a fact about the program" (false: about a bound); "a structurally recursive evaluator lets the kernel decide goldens" (true). **Exit item.** GEN-call-it template 1 ("verdict", "no verdict" or "error") on a fresh runner result. **Today cards.** KC-3.termination-fuel × GEN-call-it templates 4 and 1.
**Reading** (read 2026-10-23): Lean Language Reference §7.6.2 "Structural Recursion" and §7.6.3 "Well-Founded Recursion" (`lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/`; repin to the 4.35.0 copy). **Build this.** Confirm LAB-3.3's goldens reduce; LAB-3.10 reuses the runner.

### S3.L9 · bridge · The unsafe command; goldens as theorems

**Objective.** Add `force move` and give a successful call that leaves `Inv` as a state and call (GEN-find-the-witness, template 1); find a call separating a seeded evaluator mutant from the goldens (same template); say which check catches a redefined evaluator. **KCs.** KC-3.goldens-as-theorems; KC-3.step-invariant returns. **Prerequisites.** KC-2.axioms-and-trust, KC-3.big-step-errors, KC-3.step-invariant. **Specimens.** SP-3.2, SP-3.5. **Claim.** CL-3.5. **Seam.** Shows SEAM-13. **Minutes.** 15–25.

**Prequestion** (k = 3). Copy: "Comparator accepts your `step_preserves_inv` against the pinned statement. Is your evaluator right?" A "yes: the statement is pinned" · B "not established: comparator pins the statement's text, and you own the evaluator it mentions" · C "yes, if only the standard axioms appear". **Key:** B. **Why** A: (dp:L3). B: correct; goldens check the evaluator. C: axioms say what a proof trusts, not what a definition means (dp:L8).

**Cell 1** (INS-interp; `ForcePay(a, b, 1)` from a = 0). **Call It** (k = 3, chance 1/3). Copy: "Admit `force move` as well-typed. Can `step_preserves_inv` still be proved?" A "yes, with a cleverer proof" · B "no: a counterexample exists" · C "unknown until someone tries". **Key:** B {{run:RUN-lean-unsafe-cmd}}. **Why** A: no proof exists once a kernel-checked counterexample does; reading a violation as a proof difficulty is the confusion S4 names (dp:O3). B: correct; `cex_force` proves the negation by `decide`. C: the counterexample settles it (dp:Z2). **Surprise forecast:** no.

**Cell 2** (INS-bench-lean, recorded receipts for SP-3.5: an evaluator redefined to fail every call). **Call It** (k = 3, chance 1/3). Copy: "This evaluator returns `guardFailed` for every call. Which checks pass?" A "comparator only" · B "comparator and the goldens" · C "neither". **Key:** A {{run:RUN-lean-golden-redef}}. **Why** A: the statement matches and holds vacuously; the first golden expecting a commit evaluates to false. B: a vacuous theorem does not make goldens true (dp:G4). C: comparator checks against the frozen challenge, which copied this evaluator (dp:L3). **Surprise forecast:** yes. Then why a golden is a theorem, not printed output: a closed `decide` proof adds no axiom, `native_decide` adds a `_native` one [X RUN-lean-axioms], and `#eval` can disagree with the kernel through `implemented_by` {{run:RUN-lean-implemented-by}} (dp:S13, proposed). SEAM-13 appears on the assurance page ("INS-interp agrees with the Lean reference: [T] · n goldens", GATE-interp), a held seam tested the same way.

**Graded item.** GEN-find-the-witness template 1: a state and call, using the unsafe command, whose successful outcome breaks `Inv` (INS-interp evaluates `Inv`); name the class (any amount above the balance). **Exit item.** The same template against a seeded evaluator mutant: a call on which mutant and golden disagree, graded by running both. **Today cards.** KC-3.goldens-as-theorems × GEN-find-the-witness template 1 (mutant separation); KC-3.step-invariant × the same template (unsafe-command variants). **Production twin.** "How We Built Cedar" [cedar24] §4 "Differential Random Testing" [V]: Rust tested against the Lean model; proofs found 4 bugs, and "DRT and PBT helped us find and fix 21 additional bugs" (read 2026-10-23). LAB-3.10–LAB-3.11 build that shape.
**Reading** (read 2026-10-23): the Cedar paper §3–4; optionally Lean's "Validating Proofs" [leanvp]. **Build this.** LAB-3.6, then LAB-3.8–LAB-3.11.

### 3.10 Call tally

Twenty authored calls plus one forecast; ten are forecast as surprises (S3.L1 cell 2, S3.L2 segment 1, S3.L3 cell 1, S3.L4 cell 2, S3.L5, S3.L6 segment 3, S3.L7 segments 2–3, S3.L8 cell 1, S3.L9 cell 2), above GATE-items' 30% floor. Four keys are "no" and two "yes"; no verdict exceeds 60% of the twenty. The render shuffles option order per seed.

---

## 4. LAB-3 · mini-plinth-core, goldens and the JSON IR; capstone S10.L1–S10.L2

Learner-owned semantics against `MiniPlinthRef` and kernel-checked goldens, with §1.1 item 3's fallback and item 8's template. **Predict, then run:** before LAB-3.1, §2.4's five calls as GEN-call-it template 1 items keyed by INS-interp, then three investigation items (which outcome-order step fired; the diff after one policy change; the cheapest call that notifies its own sender).

### 4.1 Stages and exact checks

| Stage | Min | Lane | Check: exact pass condition |
|---|---|---|---|
| LAB-3.1 Run the reference evaluator; see a golden pass | 2 | Bench | LAB-3.c1: `statespace check lab3.1` exits 0 on the template; the receipt parses `golden_transfer_ok` as kernel-accepted, with no axioms {{run:RUN-lean-golden-harness}} |
| LAB-3.2 AST, `ResourceOp` and `HasType` (`[weekend]`) | 45 | Bench | LAB-3.c2: every typing golden `typecheck Γₖ cₖ = rₖ := by decide` builds, the pool holding an accepted command and a rejection per rule (so reject-everything fails); the signature file compiles; `autoImplicit false` everywhere |
| LAB-3.3 Evaluator with explicit errors (`[weekend]`) | 45 | Bench | LAB-3.c3: every evaluator golden `exec pₖ cₖ sₖ = rₖ := by decide` builds, rₖ selected by your `policy`; a golden that fails to reduce is "no verdict", not a pass; no axioms on any golden; the lint finds no `implemented_by`, `extern`, `partial`, `unsafe` or `native_decide` in semantics modules and no import of `MiniPlinthRef` |
| LAB-3.4 Step invariant (a): per-operation lemmas (proof, `[weekend]`) | 45 | Bench | LAB-3.c4: comparator accepts `post_inv` and the five operation lemmas against the frozen challenge; axioms within `comparator.json`; `sorryCount` 0; no `grind` |
| LAB-3.5 Step invariant (b): the assembled theorem (proof, `[weekend]`) | 45 | Bench | LAB-3.c5: comparator accepts `covers_sound` and `step_preserves_inv`; axioms within `comparator.json`; LAB-3.c3's goldens pass at the same source hash, on the same receipt |
| LAB-3.6 The unsafe command; keep it in `broken/` (proof) | 25 | Bench | LAB-3.c6: in `broken/`, a typing golden shows the `force move` command type-checks; `cex_force` (the pinned statement's negation, by witnesses and `decide`) builds with permitted axioms; an edited statement is rejected by comparator [X RUN-lean-comparator]; `fixed/` still passes LAB-3.c5 |
| LAB-3.7 Decision records; IR export (write) | 20 | Bench | LAB-3.c7: `decisions/{zero,self-transfer,failed-guard,overflow}.md`, each with "Decision", "Alternative considered", "Consequence" and "Downstream" sections and a `choice:` equal to the matching `Lab3.policy` field; `lake exe export-ir` output validates against IR@1, golden right-hand sides from the golden module's literals |
| LAB-3.8 S10.L1 (a): Rust parser | 25 | tab | LAB-3.c8: the parser accepts every positive corpus file (the roadmap's text verbatim included), rejects every negative file with a located error, and emits IR equal to the Lean export for each pool program |
| LAB-3.9 S10.L1 (b): Rust typechecker mirroring `HasType` | 25 | tab | LAB-3.c9: on typing goldens sampled by a grade-time seed, the verdict (accept, or the rule's name) equals the golden's on every sample; n printed |
| LAB-3.10 S10.L2 (a): Rust reference interpreter | 25 | tab | LAB-3.c10: on evaluator goldens sampled by a grade-time seed under your policy, stratified by operation and outcome class and including boundary values, every outcome equals the golden's; n and per-stratum counts printed |
| LAB-3.11 S10.L2 (b): differential run, claim cards (write) | 20 | tab | LAB-3.c11: CL-3.3, CL-3.4 and CL-3.5 pass claim@1 validation; [T] stamps print n and generator statistics; a run against INS-interp on m fresh programs reports m and triages each disagreement as spec, implementation, tool or proof error |
| LAB-3.12 `[stretch]` progress | 25 | Bench | — (mints CL-3.1) |
| LAB-3.13 `[stretch]` preservation | 25 | Bench | — (mints CL-3.2) |

"Fresh seeds" in LAB-3.c9–LAB-3.c10 means a grade-time seed samples a large build-time pool of kernel-checked goldens; the tab runs no Lean (§14 issue 8).

### 4.2 Receipts

Bench stages write receipt@1 (lane "reported from your machine"): the environment with sandbox state, recorded and never required [X RUN-lean-bwrap-docker]; the toolchain and its hash; each `Challenge/` file's SHA-256 (trimmed text plus one newline); argv, exit codes and verbatim verdict lines of `lake build`, `lake check` and `lake comparator`; checker verdicts, `challengeSha`, axioms per theorem, `sorryCount` and automation flags; golden counts (pool hash, n, passed, failed, no verdict; §14 issue 7); checks, provenance, claims to mint (CL-3.3 from LAB-3.5) and `tcb`. Tab stages record the wasm module's SHA-256, ABI version (D-14), grading seed, n, per-stratum counts and each mismatch.

### 4.3 Hint ladders

R0 is a teach-back behind the explanation gate, R4 an informal proof; past R2, work is assisted until an unseen variant passes.

| Check | R0 (say first) | R1 | R2 | R3 | R4 |
|---|---|---|---|---|---|
| c1 | what a golden asserts | S3.L9 cell 2 | the failing receipt line | the command to re-run | — |
| c2 | the rule a failing golden expects | S3.L2 seg 1; §2.2 | that golden's program and rule | the `typecheck` case skeleton | the rule in prose |
| c3 | the outcome-order step the golden tests | S3.L3; §2.4; S3.L8 for "no verdict" | the first failing golden, both sides | the `exec` branch to change | the outcome order for that call |
| c4 | which conjunct each lemma needs | S3.L6 seg 1–2; D-07 | the unsolved goal | the case split and template lemma | an informal proof of `post_inv` |
| c5 | where coverage comes from | S3.L6 seg 3 | the unsolved branch | `covers_sound` by induction on `Covers` | an informal proof of the assembly |
| c6 | what a counterexample golden proves | S3.L9 cell 1 | the witness state's shape | `cex_force` with `decide` holes | the witness written out |
| c7 | what each record must contain | S3.L7 seg 3 | the missing section or `choice:` mismatch | a record template | — |
| c8–c10 | which IR field or outcome differs | D-14; §2.7 | the first mismatching sample | the AST, rule or branch to change | an outline of the function |
| c11 | what n establishes and what it does not | S3.L9 | the failing claim@1 field | the six-field skeleton | — |

### 4.4 Prove-it

M-prove-it (C/D · Prec): agent closed; `statespace defend` seeds a mutation of your artifact; you predict; Lean or the tab grades. Disjoint from the Defence's Part B.

| Mutation | After | Predict | Key |
|---|---|---|---|
| P1 compute both posting balances from the old state | LAB-3.3 | which goldens fail | the self-transfer goldens under `self = allow`; none under `reject` |
| P2 credit before debit in `post` | LAB-3.3 | which goldens fail | none: either order gives the same state |
| P3 evaluate the guard after the statement | LAB-3.5 | true? proof builds? goldens? | true; your proof breaks where it read the pre-state guard; goldens moving over half a balance fail |
| P4 drop the account-existence check | LAB-3.5 | the same | true; proof depends on your script; `unknownAccount` goldens fail (a missing sender reads 0; a missing recipient is created) |
| P5 wrapping `i64` arithmetic in the Rust interpreter | LAB-3.10 | does LAB-3.c10 pass? | no: the boundary goldens fail, which is why the pool includes them |

### 4.5 Challenge pack

`Challenge/` holds §2.6's pinned statements as course text, hashed per receipt@1, plus signature files fixing every name they mention. `comparator.json` permits `propext`, `Quot.sound` and `Classical.choice` (S2.L9's standard three) and rejects `sorryAx`, any `_native` axiom and custom axioms; `--paranoid` (six checkers [X RUN-lean-comparator]) runs in CI and at the Defence. The golden pool is generated at build time from `MiniPlinthRef` by seed, stratified by operation, outcome class and policy option, with boundary values near ±(2⁶³ − 1); each golden is a literal theorem, and the pool hash is pinned.

### 4.6 The stuck protocol and claim cards

The stuck protocol fires at 25, 45 and 90 minutes: `statespace stuck` emits a forum-ready example with private paths stripped; at 90 minutes a lemma can be parked as [A] on CL-3.3 ("PROVED modulo k assumed lemmas"), re-found in 7 days, and LAB-3.c4 or LAB-3.c5 stays unpassed meanwhile. Claim cards fade: CL-3.3 arrives with method, tool, version and axioms prefilled; you write the proposition, assumptions (SEAM-3 offered dashed), correspondence and "if weakened" witness (LAB-3.6's counterexample). CL-3.5 is yours except n and the generator statistics.

## 5. After LAB-3: the Clearinghouse opens

Glossary term 23: a seeded Mini-Plinth world of accounts, postings and holds run by INS-interp (M-docket; W3-T14). Your LAB-3.10 interpreter plugs in as a second engine; a disagreement opens an incident and, once triaged, a specimen. First incidents are mutation-generated proposals (a command that type-checks only under a weakened rule; a decision record contradicting `policy`), sound in a seeded 30–60% share, with baselines in {{run:RUN-docket-baselines}}.

---

## 6. Specimens

Each mounts when its run replays and is "kept" after a re-find on a fresh variant 7 or more days later. Draft 0 sits in the cabinet as SEAM-6's carrier, not a specimen.

| ID | Witness | Violates, because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|
| SP-3.1 (S3.L4) | `requires balance(amount) >= amount`, typing bypassed, amount 30 | progress: no step from a non-final configuration, since `balance` steps only on an account | yes | R-expr (`wrongType`), checked before stepping | {{run:RUN-lean-stuck}} |
| SP-3.2 (S3.L9, LAB-3.6) | `force move 1 from a to b`, a, b and mint at 0 | `Inv` (a at −1), since `force move` escapes R-cover | yes: balance + 1 from 0 | exclude `force move` or require a covering guard; kept in `broken/` | {{run:RUN-lean-unsafe-cmd}} |
| SP-3.3 (S3.L7) | draft 0, unguarded `Pay(from, to, 50)` from 30 | conservation (+20) while non-negativity holds, since `Nat` subtraction truncates | any amount above the balance; balance + 1 minimal | `Int` plus a guard; refined `Amount` (ER-6) | {{run:RUN-lean-nat-trunc}}; Z3 view {{run:RUN-z3-nat-trunc}} |
| SP-3.4 (S3.L4) | the draft relation on `Transfer(a, b, 130)` from 100 | big-step and small-step agreement: `guardFailed` versus stuck at `guard false` | yes | `guard false ⟶ err (guardFailed C)` plus propagation (PFPL §6.3) | {{run:RUN-lean-bigsmall}} |
| SP-3.5 (S3.L9) | `exec` failing every call: comparator accepts `step_preserves_inv` vacuously; `golden_transfer_ok` evaluates to false | correspondence to the reference, since comparator pins text, not the definitions it mentions | yes: one golden | goldens bound to the proof's source hash (LAB-3.c5) | {{run:RUN-lean-golden-redef}} |

## 7. Claim templates

Six fields, a requirement row and a strip (proposition-of-model · correspondence · requirement-fit, never [P]); Lean qualifiers add "6 checkers" after `--paranoid` [X RUN-lean-comparator].

**CL-3.3 · Successful steps preserve the state invariant** (S3.L6, LAB-3.5; {{run:RUN-lean-step-invariant}}). *Proposition:* for every well-typed v0 program, call and state satisfying `Inv`, a successful step yields a state satisfying `Inv`. *Assumptions:* [A] the Lean 4.35.0 kernel accepts only well-typed terms (SEAM-15, held); [A] a correct step needs no observer (SEAM-3); under the unbounded decision, [A] balances are unbounded integers (SEAM-1; §14 issue 4). *Model:* your `exec` and `policy`; single-statement commands; posting pairs. *Method:* a Lean proof accepted by comparator against the pinned statement. *Correspondence:* your `exec` agrees with `MiniPlinthRef` on n kernel-checked goldens bound to the proof's source hash; nothing about SQL (S6) or compiled code (S9). *If weakened:* drop R-cover or admit `force move`, and SP-3.2 leaves `Inv`; drop R-amount, and a negative move debits the recipient unguarded. *Requirement row:* [A] conservation and non-negativity are what a step must keep; confidentiality not considered. *Strip:* [P] · Lean 4.35.0 kernel · axioms listed | [T] · n goldens | [A]; a parked lemma gives "PROVED modulo k assumed lemmas"; the fallback reads "statement check: weak".

**CL-3.4 · Postings refine the Stage 2 ledger** (S3.L6; {{run:RUN-lean-postings-refine}}). *Proposition:* for two distinct existing user accounts and a positive amount, the reference Transfer commits with `toLedger s′ = transfer (toLedger s) n`, or fails its guard exactly when S2's `transfer` returns the ledger unchanged. *Assumptions:* [A] the kernel (SEAM-15); SEAM-1 (S2's ledger is over unbounded `Int`). *Model:* the reference, default policy; S2's two-account ledger [X RUN-lean-ledger]. *Method:* the course's proof of the reference module. *Correspondence:* reaches your semantics only through goldens, [T] · n; zero and self-transfers lie outside the square. *If weakened:* without `u₁ ≠ u₂`, S2 moves n between two fields while S3 changes nothing. *Requirement row:* [A] S2's ledger is the intended meaning of a two-account transfer. *Strip:* [P] · Lean 4.35.0 kernel · axioms listed (of the reference) | [T] · n goldens | [A]. No lab stage mints it (§14 issue 3).

**CL-3.5 · Your Rust interpreter agrees with the kernel-checked goldens** (S3.L9, LAB-3.10; {{run:RUN-interp-goldens}}). *Proposition:* on every golden the grade-time seed samples, the interpreter's outcome equals the golden's right-hand side. *Assumptions:* [A] the IR export and wasm host carry inputs faithfully; [A] the pool covers the behaviors that matter (generator statistics printed). *Model:* IR@1 programs under your policy. *Method:* a differential run in the tab. *Correspondence:* right-hand sides are kernel-checked theorems about the reference; n samples say nothing about other inputs; agreement with INS-interp is not independent (both derive from the reference; G11). *If weakened:* P5's wrapping `i64` passes a pool without boundary values and fails this one. *Requirement row:* [A]. *Strip:* [P] · Lean 4.35.0 kernel (the goldens) | [T] · n goldens · generator statistics | [A].

**CL-3.1 · Progress** and **CL-3.2 · Preservation** (stretch; LAB-3.12–LAB-3.13; {{run:RUN-lean-progress}}, {{run:RUN-lean-preservation}}): typed configurations are final or step, and steps keep typing; [A] the kernel; the template's small-step relation; Lean proofs; correspondence to your `exec` only through goldens; if weakened, deleting the false-guard rule breaks progress at SP-3.4's configuration; requirement row [A], type safety is not a business invariant. *Strip:* [P] · Lean 4.35.0 kernel · axioms listed | [T] · n goldens | [A].

## 8. Seams and erosions

| Seam | Planted | Fate | Tested by · cashed |
|---|---|---|---|
| SEAM-6 "`Nat` balances cannot go negative" | S3.L1, on draft 0's card (in every cabinet) | erodes: ER-6 | S3.L7 · SP-3.3 |
| SEAM-3 "a correct step needs no observer" | S3.L6 · CL-3.3 | erodes: ER-3 | S7.L7 · SP-7.1 |
| SEAM-13 "INS-interp agrees with the Lean reference" | the course's assurance claim, shown in S3.L9 | held | GATE-interp; GATE-conformance |
| carried: SEAM-1, SEAM-15 | S1–S2; CL-3.3, CL-3.4 (unbounded decision) | ER-1 at S6.L4; held | SP-6.4; `--paranoid` |

**ER-6** (both endpoints in S3; ships W2, W2-T09, GATE-erosions): SEAM-6, planted S3.L1, cashed S3.L7 by SP-3.3; correspondence cracks; forecast item in S3.L7 segment 2; remedies `Int` plus a guard and the refined `Amount`. **ER-3** (endpoint 1 here; ships W4): SEAM-3, planted S3.L6 with CL-3.3, cashed S7.L7 by SP-7.1; requirement-fit gains a [N] line for confidentiality; remedy: an observer, an equivalence relation and a declassification list.

## 9. Audit anchors

Both ship with W2-T13, after LAB-3, keyed by checker runs (GATE-audit).

**AUD-3.1 · G8 (model–implementation drift).** *Sound twin:* `step_preserves_inv` over the `HasType` the shipped Rust typechecker mirrors, typing goldens showing agreement ([T] · n). *Flawed variant:* the same theorem over `HasTypeStrict`, which also rejects self-transfers, while the shipped checker implements `HasType`; the card still says "every well-typed command preserves `Inv`". *Evidence:* the mismatched identifiers and a command the shipped checker accepts that the theorem does not cover. *Based on:* VERINA PR #17, merged 2026-04-17, fixing specs in 18 tasks and code in 9 (https://github.com/sunblaze-ucb/verina/pull/17) [V, landscape digest]. *Variants:* a stricter evaluator; a policy other than the exported one; `MiniPlinthRef.exec` in the theorem; an evaluator bent to fit the proof (SP-3.5, G8d).

**AUD-3.2 · G4 (encoding and type-semantics slip).** *Sound twin:* `Int` balances with R-cover, non-negativity proved from the guard. *Flawed variant:* "balances can't go negative" stamped [P] because they are `Nat`. *Evidence:* a truncation witness. *Based on:* Kimina-Prover issue #11 (2026-09-13): a dropped `(1/4 : ℝ)` ascription leaves "0 = 0" over ℕ (https://github.com/MoonshotAI/Kimina-Prover-Preview/issues/11). *Variants:* `Int` amounts without positivity (flawed); `Nat` amounts with `Int` balances (sound for `Inv`, so topic-matching loses); BitVec 64 balances (flawed: wrap); `Nat` balances with every debit guarded (flawed: the mint truncates on `deposit`).

## 10. The Defence (S3)

Untimed, over at least two sessions within a week of LAB-3; signed off by spine §8.6, Wilson interval shown.

**Part A, probes:** twelve unseen-seed items, one per KC (KC-3 prefix dropped), agent closed, a call on each: (1) abstract-syntax, GEN-call-it t4; (2) typing-judgment, GEN-find-the-witness t1; (3) resource-postings, GEN-find-the-witness t1; (4) refined-types, GEN-proof-structure t3; (5) big-step-errors, GEN-find-the-witness t1, a failed guard answered from the semantics alone included; (6) small-step-stuck, GEN-find-the-witness t2; (7) progress-preservation-scope, GEN-call-it t4; (8) step-invariant, GEN-proof-structure t1 or t2; (9) edge-cases-as-decisions, GEN-call-it t4 on zero, self-transfer, failed guard and overflow, mixed with questions the semantics does not decide (completion test: "a semantics independent of SQL, Rust and UI"); (10) nat-truncation, GEN-find-the-witness t1; (11) termination-fuel, GEN-call-it t1; (12) goldens-as-theorems, GEN-find-the-witness t1.

**Part B, defend:** five seeded mutations of your LAB-3, predicted first, graded by `statespace defend` (Lean build plus goldens); each mutant elaborates or its key says not (GATE-labs).

| Mutation | Key |
|---|---|
| B1 amounts as `Nat` in `ResourceOp`, balances `Int` | still true; your proof builds only if it uses no more than `0 ≤ n`; zero goldens fail (a zero move now commits) |
| B2 drop R-set | false (`set balance(a) := balance(a) + 1` mints); the proof fails in the `set` case |
| B3 reverse a guard: R-cover accepts `n >= balance(x)` | false (balance 10, amount 20); the proof fails in the move and hold cases |
| B4 let `force move` type-check | false; LAB-3.6's counterexample applies |
| B5 make your `typecheck` also demand `!(from = to)` in every move's guard | still true (fewer programs typed); your typing-extraction lemma may need re-proving; typing goldens that accept Transfer fail: AUD-3.1's drift in your own code |

B1 and B5 survive, so always predicting "breaks" fails. **Part C, audit:** four cases from the AUD-3.1 and AUD-3.2 pool and variants, sound share seeded in 30–60%, at least one sound, typed evidence. **Part D, explain-back:** what progress and preservation buy and what they do not; a 2-minute oral and a 3-idea self-check compared with Part A; required, uncredited.

## 11. Drawers

D-14 (the Lane A wasm ABI) before LAB-3.8; D-22 (Lean 4 metaprogramming), surfaced only if the learner embeds the toy syntax with `declare_syntax_cat`; D-07 (the Lean error museum) from LAB-3.c4–c5's R1 rungs (the spine lists it under S2). D-23 (S3.L3's content, for the builder's path at S6.L2) is not shown in S3.

## 12. Reading list (minimum path; read 2026-10-23)

| Source | Sections | For | Estimate [D] |
|---|---|---|---|
| Harper, *PFPL*, 2nd ed., free abbreviated edition (`cs.cmu.edu/~rwh/pfpl/abbrev.pdf`) [V] | §1.1 (skip §1.2); §2.1–2.4; §4.1–4.3; §5.1–5.2; §6.1–6.3; §34.1 "Basic Commands" | S3.L1–S3.L5 | 1.5–3 h |
| *Functional Programming in Lean*, Verso edition (`lean-lang.org/functional_programming_in_lean/`; cited by title: the 2025 port renumbered chapters) [V] | "Getting to Know Lean" §1.4–1.6; "Hello, World!" §2.3 "Starting a Project"; "Monads" §4.1, §4.3; "Functors, Applicative Functors, and Monads" §5.2.1.2 "Subtypes" | S3.L1–S3.L3, LAB-3.7 | 0.5–1 h |
| Lean Language Reference [V] | §7.6.2 "Structural Recursion", §7.6.3 "Well-Founded Recursion" | S3.L8 | 10 min |
| Cedar [V] | `typecheck_is_sound` (`cedar-lean/Cedar/Thm/Typechecking.lean`); "How We Built Cedar", arXiv 2407.01688v1, §3–4 | twins | 20 min |
| Optional | FPIL §7.1 "Indexed Families" and §7.3; PFPL ch. 7 (printed book only); *Concrete Semantics* ch. 7; LoVe 2026 lecture 09 | depth | — |

A4 measured the full path at 2–3× S3's reading share; this subset fits 2.0–4.0 h.

## 13. Time budget

| Read | Lessons | Build | Write | Defence | Total | Roadmap |
|---|---|---|---|---|---|---|
| 2.0–4.0 h | 3.5–5.5 h | 5.0–12.0 h | 0.3–0.7 h | 1.0–1.5 h | 11.9–23.7 h | 4–8 weeks |

Lessons: three core at 40–60 minutes, six bridges at 15–25. Build: 302 nominal minutes (LAB-3.1–LAB-3.6, LAB-3.8–LAB-3.11), the Lean proof stages (115 minutes) at up to 3× and the rest at up to 2×; write: LAB-3.7 at 1–2×. Against 19–38 h of stage work (4–8 weeks at 4.75 h/week) the high estimate passes GATE-budget and the low one clears half the lower bound (9.5 h); stretch adds 0.8–2.5 h. Keep load [D]: twelve KCs × about 10 reviews × about 2 minutes ≈ 4 h over 60 days, inside the planned Keep block. Claim cadence: §0.

## 14. Spine issues

Resolved in spine revision 3 on 2026-10-25 (spine §15); the section numbers in each item's closing note are the spine's.

1. **Three proposed runs** for §9.5 under W2-T10 (with S2's RUN-lean-s2-cells, eighteen S2–S3 runs, not fourteen): RUN-lean-golden-harness (no core `DecidableEq` for `Except`; with a derived one, goldens elaborate axiom-free; fueled structural definitions reduce under `decide`, well-founded ones do not) and RUN-lean-implemented-by (the kernel proves `spec 3 = 3`, `#eval` prints 4; A2-F13), both seen in unregistered scratch elaborations on 2026-10-23; and RUN-z3-nat-trunc (the truncation witness; the `Int`-plus-guard `unsat`, cvc5-checked). *Revision 3: already resolved (§9.5, §13 W2-T10).*
2. **Misconception IDs collide** with stage IDs (S1–S4) and gap classes (G1–G9). This spec and its siblings write `dp:`; the spine's ID table should adopt it. Proposed here: dp:S5–dp:S14. *Revision 3: already resolved (ID conventions; §12 item 40).*
3. **CL-3.4 has no lab stage.** Minted from the reference proof, it reaches the learner's semantics through goldens; the alternative is a pinned lemma over the learner's `exec` in LAB-3.5 (+15–25 minutes). *Revision 3: already resolved (§5.2 CL-3.4).*
4. **SEAM-1 carriage.** CL-3.3 and CL-3.4 rest on unbounded `Int` under the unbounded decision; §5.3's "carried by" should name them, and ER-1's blast radius reaches their correspondence. *Revision 3: already resolved (§5.3 SEAM-1).*
5. **Golden prerequisites** (a finite state, an `Except` instance, a structural evaluator; §1.1 items 1–2) belong in §3.3 and W2-T07's acceptance. *Revision 3: already resolved (§3.3, §13 W2-T07).*
6. **Template list.** §3.3's template should also supply `Inv` and `Policy`, or a learner could weaken `Inv`. *Revision 3: already resolved (§3.3 LAB-3).*
7. **receipt@1** needs a golden block, `goldens {poolSha, n, passed, failed, noVerdict}` (§9.4). *Revision 3: already resolved (§9.4).*
8. **"Fresh seeds"** for kernel-checked goldens can only mean seeded sampling from a build-time pool; say so in §3.3 and under I3. *Revision 3: already resolved (§3.3, §1.1 I3).*
9. **The reference and "no `_solutions`".** `MiniPlinthRef` answers LAB-3.3; ship it as a pinned dependency learner semantics may not import (§1.1 item 8). *Revision 3: already resolved (§3.3, §11.2 GATE-guardrails).*
10. **Manual mode** disables `grind` and `omega`; LAB-3.4–LAB-3.5 keep `omega` (§1.1 item 10). Log per-lab variants in §12. *Revision 3: already resolved (§3.3, §12 item 41).*
11. **Additions within the spine's patterns:** a fifth Part B mutation (B5); a TigerBeetle twin card in S3.L2. *Revision 3: already resolved (§3.3).*
12. **Cross-stage (S04 spec).** S04 keeps v0's one-statement bodies (§1.1 item 5), but its holds example counts `held` against `bal` (`n ≤ bal − held`), while v0 moves held funds into escrow accounts, so `balance` is already the available balance; LAB-4's step relation must use v0's encoding, or its witnesses will not replay in the interpreter. *Revision 3: already resolved (§3.4 LAB-4).*
13. **Cross-stage (S06 spec).** S06's plan writes "Ok with no SQL" for an allowed self-transfer, but S3 runs the guard first, so a self-transfer above the balance is `guardFailed`; the plan must still check the balance, or the differential diverges. *Revision 3: already resolved (§3.6 S6.L2).*

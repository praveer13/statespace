# S7 Secrecy (Datalog, Z3, PostgreSQL RLS): curriculum spec

**Status:** authoring spec for W4 (W4-T07–W4-T10, W4-T12–W4-T15), depending on W0-S03 and W0-S08; draft, first-learner pass pending. **Date:** 2026-10-23 (machine clock). **IDs** come from `docs/spine/SPINE.md` (revision 2); anything the spine lacks is marked "proposed" and listed in §13.

**Sources.** The roadmap's Stage 7. The one executed S7 run, RUN-z3-fixedpoint: Z3 5.3.1's `Fixedpoint` with stratified negation on Pyodide 314.0.7, answering `canread(1,3)` sat and the revoked `canread(1,4)` unsat (`research/evidence/A5r3/z3-pyodide.log`; program in `A5r3/scripts/z3unk.mjs`). Executed pins: RUN-z3-starter, RUN-z3-starter-pyodide, RUN-pg-anomalies, RUN-pglite, RUN-cvc5-alethe. The brief (V2-23, §1.4, §4.8), the pedagogy digest §2, R5 and R4 §2.5, reviews A1-F6, A4 and A6-F12. Re-read on 2026-10-23 [V]: the PostgreSQL, Soufflé, Zanzibar, Sabelfeld and Sands, *Security Foundations*, Jackson and Cedar sources of §11.

**Tags.** As in the spine: `[X RUN-id]`, `{{run:RUN-id}}`, [V], [D], and evidence grades A–D. Misconception tags read `dp:A4` (pedagogy digest §2), as in the sibling specs. "Copy:" marks learner-facing text, which uses only glossary terms, plain English and the badges *re-checked here* and *reported from your machine*.

**Roadmap scope.** Users, teams, roles, documents and sharing; the read policy "a user may see a document when they are a team member or it is explicitly shared"; the access matrix; state pairs that differ only in another tenant's private data; a shared-document query that deliberately reveals a private field; revocation, which cannot erase what was delivered; enforcement versus noninterference. **Completion test:** formulate the observer and the equivalence relation; explain what is intentionally declassified and why "no tenant can ever observe any change in another tenant" is false. 4–8 weeks; "Soufflé or Alloy".

---

## 0. The stage at a glance

**New tool: Soufflé** on the Bench (INS-bench-souffle, {{run:RUN-souffle-version}}). In the tab, INS-datalog is Z3 `Fixedpoint` in the existing Pyodide worker if W0-S03 passes ({{run:RUN-fixedpoint-equal}}), otherwise a TypeScript evaluator; GATE-conformance requires relations equal to Soufflé's. Alloy is a drawer (D-16) and a stretch stage: one engine honors the roadmap's "or" (V2-23) and answers review A4's warning about two new tools at once. PostgreSQL 18.6 [X RUN-pg-anomalies] returns for RLS; PGlite RLS waits on W0-S08 ({{run:RUN-pglite-rls}}). Z3 5.3.1 [X RUN-z3-starter], INS-interp and `miniplinth check` return from S1, S3 and S4.

| ID | Tier | Title | Minutes | KCs introduced | Calls | Specimens · claims · seams |
|---|---|---|---|---|---|---|
| S7.L1 | bridge | Access models in the roadmap's nouns | 15–20 | KC-7.access-models | 2 | — |
| S7.L2 | bridge | Policy as Datalog, with derivations | 20–25 | KC-7.policy-as-datalog | 2 | CL-7.1 (minted in LAB-7.2) |
| S7.L3 | bridge | Checking policies: distinguishing requests | 20–25 | KC-7.policy-checking, KC-7.small-scope | 3 | SP-7.7 · CL-7.2 |
| S7.L4 | core | Row-level security as enforcement | 45–55 | KC-7.rls-semantics, KC-7.side-channels | 3 | SP-7.4, SP-7.5 · CL-7.4 |
| S7.L5 | core | Enforcement is not noninterference | 40–50 | KC-7.enforcement-vs-ni (threshold), KC-7.hyperproperty | 3 | — |
| S7.L6 | core | Observers and equivalence | 45–55 | KC-7.observer-equivalence (threshold) | 3 | CL-7.3 (plants SEAM-10) |
| S7.L7 | bridge | The leaky shared document, and declassifying on purpose | 20–25 | KC-7.declassification | 2 + forecast | SP-7.1, SP-7.2 (cashes ER-3) |
| S7.L8 | bridge | Revocation and the past; the new enemy | 20–25 | KC-7.revocation-past | 2 + forecast | SP-7.3, SP-7.6 (cashes ER-9) |

**Recommended order** (printed on cards, never enforced; I5): S7.L1, LAB-7.1, S7.L2, LAB-7.2, S7.L3, LAB-7.3, S7.L4, LAB-7.4, S7.L5, S7.L6, S7.L7, LAB-7.5, S7.L8, LAB-7.6, LAB-7.7, the Defence. LAB-7.5 follows S7.L7 because its fix needs a release list.

**Paths.** By default S7 follows S6. On the builder's path (OD-3) it follows S5.L9 and precedes S6.L3–S6.L5, S6.L8 and S6.L9. Every hard edge into S7 holds on both: KC-6.sql-not-algebra before S7.L4, KC-4.vc-shape before S7.L6, KC-5.temporal-operators before S7.L8. On the builder's path SP-7.6 precedes S6.L9, so CL-6.2 and CL-6.3 mint with SEAM-9 already cracked (spine §5.4).

**Completion test → graded forms** (all Defence Part A slots, §9): the observer and relation, GEN-spec-it template 1 and GEN-leaks-to-observer; what is declassified, GEN-call-it template 4 keyed by INS-pairs with and without the release list; why the blanket claim is false, GEN-leaks-to-observer under the blanket relation, keyed by a pair built from sharing.

**Flagship moment:** "every read is checked, and it still leaks" (S7.L4's slug insert, S7.L5's error code). **Glossary:** no new terms; the stage's vocabulary is plain technical English, defined where first used.

---

## 1. The S7 world

One world serves the lessons, LAB-7 and the Clearinghouse's S7 plug-in (W4-T14); the LAB-7 template and INS-interp supply it (SI-8).

**Relations:** `tenant_of_user(u, a)` and `tenant_of_team(t, a)` (a document's tenant is its owning team's); `member(u, t, r)` with `r ∈ {viewer, editor, admin}`; `owns(t, d)`; `subteam(s, t)`, s nested in t (from S7.L3); `share_user(d, u)`, `share_team(d, t)`, `revoked(d, u)`.

**The read rule**, the roadmap's sentence as three rules:

```
inteam(u, t)  :- member(u, t, _).
inteam(u, t)  :- inteam(u, s), subteam(s, t).          % from S7.L3
canread(u, d) :- inteam(u, t), owns(t, d).             % rule 1: a member of the owning team
canread(u, d) :- share_user(d, u), !revoked(d, u).     % rule 2: shared with the user, not revoked
canread(u, d) :- inteam(u, t), share_team(d, t).       % rule 3: shared with one of the user's teams
```

Roles gate writes, not reads: `canedit(u, d) :- member(u, t, r), owns(t, d), r != "viewer".` Whatever no rule derives is denied.

**Schema invariants**, carried as [A], or [E] where a constraint enforces them: WF1, a member belongs to the team's tenant (no guest membership); WF2, a subteam belongs to its parent's tenant; WF3, `subteam` is acyclic. Under them, reads cross tenants only through rules 2 and 3.

**Reference world W0** [D]: tenants Acme and Birch; teams Payments and Growth (Acme) and Legal (Birch); dana (Payments, editor) and frank (Growth, viewer) in Acme, gia (Legal, admin) and hal (Legal, viewer) in Birch; documents q3-plan (Payments), roadmap (Growth), contract and layoffs-memo (Legal); shares `share_user(contract, dana)` and `share_team(roadmap, Payments)`.

**Views** leave the state unchanged and return Mini-Plinth's `Except Err Output` (S3): `Open(viewer, id)` returns `{title, body, owner_team}` or an error; `Search(viewer, term)` returns `{hits, total}`; `ListShared(viewer)`. **Commands:** `Share`, `Revoke`, `Edit`, and `CreateDoc(by, team, slug)`, with slugs globally unique in the RLS schema.

**The observer** of a view for user u is the value returned to u, error code included: SEAM-10's "response body" (SI-14). Size, timing, caches and logs lie outside it. **Tenant equivalence ~Acme** (S7.L6): two states agree on all of Acme's data and on what Birch released to Acme principals (the shares and the released projections of shared documents), and may differ anywhere in Birch's private data. **Noninterference for a view V:** for every Acme user u and every argument, S ~Acme S′ implies obs_u(V(S)) = obs_u(V(S′)).

**Generated worlds** (seeded, I3) [D]: 2–3 tenants, 2–5 teams, 3–8 users, 3–10 documents, nesting depth 0–2, shares, revocations and teamless users. Receipts print per-rule firing rates and the share of trivial matrices: Cedar found 35.5% of its generated `when` conditions were Boolean literals, until a new generator brought that to 9.7% [cedar24 §4.3].

---

## 2. Conventions

**Calls** (M-call-it): three taps (*guess · think so · sure*), chance 1/k printed, certainty-based payoffs as feedback only, the first call final. Authored keys reproduce on their engines (GATE-calls); `sat` keys are checked as witness properties. Each option carries a "why" and a tag; keys are bold. 12 of the 22 authored calls are designed surprises (≥ 30% required), and no key verdict exceeds 60% (GATE-items). **Items:** practice shows the witness and its class (M-class-hint); probes are one-shot; GEN-spec-it runs pick → fix → write (§8.4); bounded keys print their bound (I10); `unknown` instances are discarded.

| Tag | Misconception | Evidence |
|---|---|---|
| dp:A1 | `in` (subset) used where overlap was meant; vacuously true on ∅ | catalog (C) |
| dp:A2 | extra quantifiers; constraints set at set level instead of per principal | catalog (C) |
| dp:A4 | enforcement mistaken for noninterference | catalog (—) |
| dp:A5 | a policy accepted without a distinguishing request | catalog (B−/C) |
| dp:A6 | a small scope read as unbounded; revocation assumed to erase disclosure | catalog (—) |
| dp:A7 | *proposed:* a default-deny policy read open-world | — |
| dp:A8 | *proposed:* a negated premise ignored ("shared, so allowed", despite a revocation) | — |
| dp:A9 | *proposed:* Datalog and solver answers conflated (the polarity of `sat`; `unknown` expected from a finite fixpoint, or definite answers from quantified queries) | — |
| dp:A10 | *proposed:* RLS failure modes swapped (`USING` expected to raise, `WITH CHECK` to filter) | — |
| dp:A11 | *proposed:* enabling RLS assumed to bind the table owner | — |
| dp:A12 | *proposed:* the strongest equivalence relation assumed safest (it makes noninterference vacuous) | — |
| dp:A13 | *proposed:* a release judged by *what* alone (who, where, when ignored) | — |
| dp:A14 | *proposed:* revocation assumed to take effect everywhere at once | — |
| dp:A15 | *proposed:* tenants treated as walls (legitimate cross-tenant release forgotten) | — |
| cross-stage | dp:L4 can't say what a theorem proves; dp:P1 the observer ignores aborts; dp:P3 claims conflated; dp:C5 safety and liveness swapped; dp:T5 "no error" read as proof; dp:X3 overconfident rejection; dp:Z2 `unknown` misread | catalog |

The proposed tags follow the digest's own rule: no learner study yet, so log them through Call It and keep each only if it draws errors (SI-9). Two run IDs here are proposed, not in the spine: RUN-pg-rls-semantics and RUN-pairs-reference (SI-3). A run cited by several cells records one input and verdict per cell, as RUN-z3-bv64 records four [X RUN-z3-bv64]. **No Goal Replay:** no S7 lesson contains a Lean proof; the worked examples (S7.L2, S7.L4, S7.L6, S7.L7) come first and are not faded, since none belongs to the six fading families (spine §4).

---

## 3. Lessons

### S7.L1 · bridge · Access models in the roadmap's nouns

**Objective:** decide which requests the read rule allows on a given world, and classify rules as role-, attribute- or relationship-based (GEN-call-it template 4, keyed by INS-datalog at grade time). **KCs:** KC-7.access-models; no `requires` edge (it draws on KC-1.only-if-direction). **Instrument:** INS-datalog. **Minutes.** 15–20.

**Prequestion** (k = 3, chance 1/3). Copy: "frank is in Acme, on Growth. q3-plan belongs to Payments, also in Acme, and nobody has shared it with him. Under the roadmap's rule, in a system that denies by default, can frank see q3-plan?"

| Option | Why | Tag |
|---|---|---|
| Yes: nothing in the rule forbids it | a default-deny system allows exactly what some rule derives | dp:A7 |
| **No: neither way in applies to him** | he is not on Payments and holds no share | — |
| Yes: he and Payments share a tenant | no rule mentions tenants; a tenant bounds claims, it grants nothing | dp:A2 |

**Cell 1, the recorded run** (labeled "recorded"), verbatim [X RUN-z3-fixedpoint]:

```
canread(u, d) :- member(u, d).
canread(u, d) :- shared(u, d), !revoked(u, d).
member(1, 3).   shared(1, 4).   revoked(1, 4).
```

The toy relates users straight to documents; W0 adds teams. Call It (k = 3, chance 1/3). Copy: "Query `canread(1, 4)`. What does the engine answer?"

| Option | Why | Tag |
|---|---|---|
| `sat` | `shared(1, 4)` is one premise; the rule also needs `revoked(1, 4)` absent | dp:A8 |
| **`unsat`** (designed surprise) [X RUN-z3-fixedpoint] | rule 1 needs `member(1, 4)`; rule 2's negated premise fails | — |
| `unknown` | a stratified program over finitely many facts reaches its fixpoint in finitely many steps | dp:A9 |

Copy (after): "In Datalog, `sat` means *derivable*, here *allowed*. In S1, after asserting a negation, it meant *a violation exists*."

**Cell 2, W0 live.** Call It (k = 2, chance 1/2). Copy: "dana is in Acme. contract belongs to Birch. Can dana read contract?"

| Option | Why | Tag |
|---|---|---|
| **Yes** (designed surprise) {{run:RUN-datalog-matrix}} | rule 2 fires on `share_user(contract, dana)`; no rule mentions tenants | — |
| No | tenants are not walls; Birch chose to share (this seeds S7.L7) | dp:A15 |

Sidenote (copy): "In Zanzibar recursion lives in the engine, in Cedar in the data (each entity carries its ancestors), in Datalog in the rules. S7.L3 shows why that matters to a checker."

**Graded item:** GEN-call-it template 4, about five "u may read d" statements on a seeded world (2 tenants, at most 4 users and 4 documents, 0–2 shares, 0–1 revocation); the false ones are dp:A7, dp:A8 and dp:A15 mutants. **Exit item → Today:** GEN-call-it template 4, classifying five generated rules drawn from three disjoint templates (role–permission, attribute comparison, relationship path); card KC-7.access-models. **Twin:** Zanzibar §2.1, `doc:readme#viewer@group:eng#member`, "Members of group:eng are viewers of doc:readme", which is rule 3 in production notation [zanzibar]. **Build this:** LAB-7.1. **Reading:** the Soufflé tutorial, "Introduction to Datalog › Overview" and "First example › Transitive closure"; Cedar's language paper §2.3, "Cedar policy structure: Supporting RBAC, ABAC, ReBAC" (both read 2026-10-23).

### S7.L2 · bridge · Policy as Datalog, with derivations

**Objective:** write rules 1–3 as Datalog over W0, generate the access matrix, and justify an allowed cell by its derivation and a denied cell rule by rule (GEN-find-the-witness template 1; GEN-spec-it template 2). **KCs:** KC-7.policy-as-datalog; requires KC-7.access-models. **Instrument:** INS-datalog. **Minutes.** 20–25.

**Prequestion** (k = 3, chance 1/3). Copy: "The engine says dana may read contract. Which justification is complete?"

| Option | Why | Tag |
|---|---|---|
| "`share_user(contract, dana)` is a fact" | rule 2 also needs `revoked(contract, dana)` absent | dp:A8 |
| **"Rule 2, applied to `share_user(contract, dana)`, with `revoked(contract, dana)` not derivable"** | every premise of the rule instance is accounted for | — |
| "Birch lets Acme users read its documents" | there is no tenant-level grant | dp:A2 |

**Worked example** (a correct example first; not a fading family, so no blanks): rule 1 read line by line, with negation's two rules from Soufflé's Rules page (read 2026-10-23): "Negated literals do not bind variables", and "rules involving negation must be stratifiable".

**Cell 1: write rules 2 and 3, run the matrix.** Call It (k = 3, chance 1/3). Copy: "Add `revoked(contract, dana)`. Which cells change?"

| Option | Why | Tag |
|---|---|---|
| None: the share is still there | the revocation removes rule 2's other premise | dp:A8 |
| **Exactly the dana–contract cell** {{run:RUN-datalog-matrix}} | dana is not in Legal, and contract has no team share | — |
| Every cell of contract | a revocation names one user | dp:A2 |

**Cell 2: derivations.** An allowed cell shows its minimal-height derivation, as Soufflé's `-t explain` prints proof trees that "are of *minimal height*" (Provenance page, read 2026-10-23); a denied cell lists each rule with its first unmatched premise (non-recursive rules only). Call It (k = 2, chance 1/2). Copy: "Can a denial be justified by one tree, the way an allowance can?"

| Option | Why | Tag |
|---|---|---|
| Yes | absence is not a fact with a proof tree | dp:A9 |
| **No** {{run:RUN-datalog-matrix}} | a denial says no instance of any rule applies; Soufflé's `explainnegation` needs guidance because "it is not technically feasible to automatically generate explanations for non-existence" | — |

**Graded items.** GEN-find-the-witness template 1: build the derivation of an allowed request on a seeded world (INS-datalog checks that leaves are facts and nodes are rule instances), or give a world in which u reads d without being on d's team. GEN-spec-it template 2, pick → fix → write: an English variant ("editors of the owning team, or anyone it is shared with, unless revoked") becomes Datalog. If both rule sets are non-recursive with negation only on base relations, Z3 checks equivalence over uninterpreted sorts, an effectively propositional fragment that Z3 decides; otherwise the check is bounded equivalence over every world within a printed scope. A mismatch returns a distinguishing request; the candidate must allow some request the reference allows. Distractors: dp:A8, dp:A2, dp:A1.

**Exit item → Today:** GEN-find-the-witness template 1 (a derivation); card KC-7.policy-as-datalog. **Twin:** Cedar's Lean model as an executable specification, with proved properties such as default deny and "forbid trumps permit" [cedarspec], the first of Cedar's three evidence layers; pin {{run:RUN-twin-pins}}. **Build this:** LAB-7.2, which mints CL-7.1. **Reading:** the Soufflé tutorial's "Relations" and "First example › Data-flow analysis example" (it negates with `!KillDef`); the Rules page's "Negation in Rules"; the Provenance page's "Using Provenance › The `explain` interface" (read 2026-10-23).

### S7.L3 · bridge · Checking policies: distinguishing requests

**Objective:** state "no cross-tenant read without an explicit share" as an all-worlds violation query, reading `sat` as a distinguishing world and `unsat` only beside its premise and non-vacuity witnesses; see grounding remove a quantified hierarchy's `unknown`; stamp a bounded check [M] · scope (GEN-spec-it template 1; GEN-call-it template 4). **KCs:** KC-7.policy-checking, KC-7.small-scope; requires KC-7.policy-as-datalog, KC-1.violation-as-sat, KC-5.bounded-scope; KC-1.non-vacuity-check and KC-1.unknown-fails-closed return. **Instruments:** INS-z3, INS-datalog. **Minutes.** 20–25.

**Prequestion** (tagged with both KCs, SI-10; k = 3, chance 1/3). Copy: "An agent reports: 'On randomly generated small worlds, the new team-sharing rule never let anyone read another tenant's document without a share. Ship it.' What has been established?"

| Option | Why | Tag |
|---|---|---|
| No world of any size has such a read | generated worlds sample a space; larger worlds stay open | dp:A6 |
| **Such reads are absent from the worlds generated; checking every world is a different query** | this is [T] · n worlds | — |
| Nothing, unless a request is shown on which the old and new rules differ | an overcorrection: the tests establish [T]; a distinguishing request is how a change is reviewed | dp:X3 |

**Cell 1, all worlds** (INS-z3). Uninterpreted sorts; rules 1–3 by completion; the property negated (some u, d with `canread(u, d)`, different tenants, and no share to u or u's teams). The first run uses the rule alone, without schema invariants. Call It (k = 3, chance 1/3). Copy: "No schema invariants: `sat`, `unsat` or `unknown`?"

| Option | Why | Tag |
|---|---|---|
| **`sat`** (designed surprise) {{run:RUN-z3-cross-tenant}} | a distinguishing world: a Birch user who is a member of an Acme team reads an Acme document with no share | — |
| `unsat` | nothing stops a membership from crossing tenants | dp:A2 |
| `unknown` | no quantified hierarchy yet; the query stays in a fragment Z3 decides | dp:Z2 |

Free run (same run): with WF1 the answer is `unsat`, beside a premise witness (WF1 and the policy are satisfiable together) and a non-vacuity witness (some same-team read is allowed). Deny-all satisfies every confidentiality property, so an `unsat` without the second witness proves nothing useful. The claim now rests on WF1, as [A] or [E]. Comparing two policies works the same way: a request one allows and the other denies is how a policy change is reviewed, and a spec duel (M-spec-duel) returns one from a policy in the URL fragment.

**Cell 2, the hierarchy** (INS-z3; SP-7.7). Nesting in three encodings, after Cedar's §4.3: unconstrained, which admits a spurious `sat` needing a cycle WF3 forbids (its Example 4.3); quantified acyclicity and transitivity, which "make the encoding undecidable, causing timeouts or unknown results"; and grounded, the hierarchy as data with constraints instantiated only on the teams the query mentions (its footprint). Call It on the quantified encoding (k = 3, chance 1/3). Copy: "What will Z3 return?"

| Option | Why | Tag |
|---|---|---|
| `sat` | expecting a Datalog engine's always-definite answer from a quantified query | dp:A9 |
| `unsat` | reading the absence of a counterexample as proof | dp:Z2 |
| **`unknown`, with its reason** (designed key and surprise; the recorded verdict decides) {{run:RUN-z3-hierarchy-unknown}} | no verdict, so a guarded change fails closed, as in S3 Block Public Access: "if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe" [bpa] | — |

*Design constraint for W4-T10:* the quantified encoding must give a reason-stable `unknown` under an `rlimit`, recorded with `reason_unknown`. Transitivity over relations alone is effectively propositional and Z3 may decide it; if so, add quantified acyclicity over an integer rank and re-record. Copy states only the recorded verdict. Grounding moves the burden to the data (WF2, WF3).

**Cell 3, small scope** (INS-datalog). Every world within a printed scope: without WF2 a small violation appears (a subteam edge across tenants), with WF2 none within scope {{run:RUN-datalog-matrix}}. Call It (k = 2, chance 1/2). Copy: "With WF2, no violation within the scope. Which stamp?"

| Option | Why | Tag |
|---|---|---|
| **[M] · scope · complete within the scope** | every world within the bound, nothing beyond it | — |
| [P] for every world | the small scope hypothesis says where bugs usually live; it is not a theorem | dp:A6, dp:T5 |

Copy (after): "Jackson: 'many bugs have small counterexamples', so bounded analysis is 'sound: no false alarms' but 'incomplete: can't prove anything'." (York, 2004-02-04, slides 18–19.) Drawer D-16 shows the same in Alloy.

**Graded item:** GEN-spec-it template 1, pick → fix → write: the violation query for a variant (for example, adding "and never after revocation"), checked by Z3 equivalence with a distinguishing world on mismatch and a mandatory non-vacuity witness; distractors dp:A1, dp:A5, dp:A2. **Exit item → Today:** GEN-call-it template 4 on what each result establishes: a one-world matrix ([T] · 1 world), a bounded enumeration ([M] · scope), an `unsat` with both witnesses ([P] · Z3 5.3.1 unsat · uncertified), an `unknown` ([?], fails closed); cards KC-7.policy-checking and KC-7.small-scope (confusable set A, through KC-5.bounded-scope). **Twin:** Cedar's second layer, per-change symbolic analysis (equivalent, more or less permissive, incomparable), and IAM Access Analyzer's `CheckNoNewAccess` (R5 F4–F5). **Drawer:** D-16. **Build this:** LAB-7.3 (mints CL-7.2). **Reading:** Jackson's York slides 18–19 (2004-02-04); Cedar §4.3 (read 2026-10-23).

### S7.L4 · core · Row-level security as enforcement

**Objective:** compile rules 1–3 to `CREATE POLICY` on PostgreSQL 18.6, differential-test the policies per user against the Datalog matrix, find the owner bypass and fix it with `FORCE`, and exhibit an integrity-check covert channel as a state pair (GEN-find-the-witness templates 1 and 4). **KCs:** KC-7.rls-semantics (requires KC-7.policy-as-datalog, KC-6.sql-not-algebra) and KC-7.side-channels (requires KC-7.rls-semantics). **Instruments:** INS-pglite if W0-S08 passes, otherwise INS-history replaying Bench-recorded runs; INS-bench-pg. **Minutes.** 45–55.

Copy (hook): "Your policy has been facts and rules. Now the database has to enforce it, one row at a time."

**Prequestion 1** (KC-7.rls-semantics; k = 3, chance 1/3). Copy: "A row fails the `USING` clause of every policy that applies to a user's `SELECT`. What does the user get?"

| Option | Why | Tag |
|---|---|---|
| An error naming the policy | `USING` hides rows; it does not refuse the query | dp:A10 |
| **Nothing: the row is silently left out** | CREATE POLICY: such rows "will not be visible … Typically, such rows are silently suppressed; no error is reported" (read 2026-10-23) | — |
| It depends on `WITH CHECK` | `WITH CHECK` governs new rows from `INSERT` and `UPDATE` | dp:A10 |

**Prequestion 2** (KC-7.side-channels; k = 2, chance 1/2). Copy: "Every row a user can see passes the read policy. Can the user still learn that a row they cannot see exists?"

| Option | Why | Tag |
|---|---|---|
| No: they never see it | a hidden row can still change an outcome | dp:A4 |
| **Yes** | uniqueness and foreign-key checks bypass row security (§5.9) | — |

**Segment 1: compile the rule** (13 min). *Worked example*, a correct example first. The template's schema is `documents(id, slug UNIQUE, team_id, title, body, internal_notes, shared_team_ids int[] NOT NULL DEFAULT '{}')` with `memberships` and `shares`. It supplies `user_teams(u)`, a SECURITY DEFINER function computing the team closure with a recursive CTE, independent of the Datalog engine; for a teamless user it returns an empty array, never NULL (the template coalesces), which keeps the operator mutant in §4's Prove-it table meaningful. It also supplies an UPDATE policy for editors. The learner writes:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_team ON documents FOR SELECT
  USING (team_id = ANY (user_teams(current_setting('app.user', true))));
CREATE POLICY read_shared ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM shares s
                 WHERE s.doc_id = documents.id
                   AND s.user_name = current_setting('app.user', true)
                   AND NOT s.revoked));
CREATE POLICY read_team_shared ON documents FOR SELECT
  USING (shared_team_ids && user_teams(current_setting('app.user', true)));
```

Copy points: permissive policies combine with OR (CREATE POLICY); with no applicable policy, "a default-deny policy is used" (§5.9); a NULL `USING` hides the row, as `WHERE` skipped NULL rows in S6 (KC-6.null-guards), so an unset `app.user` fails closed.

Call It (k = 3, chance 1/3). Copy: "frank (Growth, viewer) holds the UPDATE privilege and runs `UPDATE documents SET title = 'x' WHERE id = 'q3-plan'`, a row invisible to him. What comes back?"

| Option | Why | Tag |
|---|---|---|
| An error naming row security | `USING` filters before the update | dp:A10 |
| **`UPDATE 0`, with no error** (designed surprise) {{run:RUN-pg-rls-semantics}} | such rows "will not be available for modification"; §5.9's own example prints `UPDATE 0` | — |
| The update succeeds; UPDATE checks only `WITH CHECK` | `WITH CHECK` tests the new row, `USING` the existing ones | dp:A10 |

Free run (same run): dana moves q3-plan to Growth, where she is not an editor, and `WITH CHECK` raises an error. *Graded item:* GEN-find-the-witness template 1: for generated policy variants (restrictive for permissive; `<@` for `&&`; a dropped `NOT s.revoked`; a missing policy), give a (user, document) on which RLS disagrees with the matrix, or "none"; keys from PGlite if W0-S08 passes, otherwise from a nightly seeded pool of Bench runs replayed in INS-history.

**Segment 2: the differential, and the owner** (14 min). The `SET ROLE` differential runs on fresh worlds on the Bench and its receipt is imported (phones show the recorded run): for each user, `SET ROLE u; SET app.user = 'u'; SELECT id FROM documents;`, compared with u's matrix row. Zero disagreements earn [E] · RLS on `documents` plus [T] · n worlds × users (CL-7.4; {{run:RUN-pg-rls-differential}}). Then the shape many applications take: one connection as the table's owner, with `app.user` set per request. Call It (k = 3, chance 1/3). Copy: "RLS is enabled and your policies are unchanged. The application connects as the owner of `documents` and sets `app.user = 'frank'`. What does frank's query return?"

| Option | Why | Tag |
|---|---|---|
| frank's matrix row | the owner is not bound unless forced | dp:A11 |
| **Every row** (designed surprise) {{run:RUN-pg-rls-owner}} | "Table owners normally bypass row security as well, though a table owner can choose to be subject to row security with ALTER TABLE … FORCE ROW LEVEL SECURITY" (§5.9) | — |
| No rows: default deny | default deny applies to roles RLS binds; the owner is not one yet | dp:A11 |

Free run (same run): `ALTER TABLE documents FORCE ROW LEVEL SECURITY;` and frank's row returns. Copy notes: a policy limited by `TO app_users` leaves the owner seeing nothing under `FORCE`; superusers and `BYPASSRLS` roles "always bypass" (§5.9); `FORCE` is configuration read back from `pg_class` (SI-2); `app.user` is trusted only because no end user runs SQL, an [A] on CL-7.4. *Graded item:* GEN-find-the-witness template 1: a connection setup (role, `FORCE`, attributes) and a user under which a denied row becomes visible.

**Segment 3: a channel the policy cannot see** (12 min). Slugs are globally unique. Call It (k = 3, chance 1/3). Copy: "frank inserts a document with slug 'layoffs-memo' into Growth. Birch already has a private document with that slug, invisible to frank. What happens?"

| Option | Why | Tag |
|---|---|---|
| The insert succeeds: RLS hides Birch's row from the constraint | constraint checks see every row | dp:A4 |
| **A unique-violation error** (designed surprise) {{run:RUN-pg-rls-covert}} | "Referential integrity checks, such as unique or primary key constraints and foreign key references, always bypass row security to ensure that data integrity is maintained", so schemas must "avoid 'covert channel' leaks of information through such referential integrity checks" (§5.9) | — |
| An error naming row security | the refusal comes from the constraint | dp:A10 |

The pair (SP-7.5): two worlds differing only in Birch's private row, and frank's outcome differs; every read was filtered, and frank still learned a bit. Cures: `UNIQUE (tenant_id, slug)`, opaque identifiers, or a recorded release (S7.L7). Sidenote: under READ COMMITTED a policy subquery can read a group mapping mid-change (§5.9's "secret from mallory"; S6's catalog row H17, {{run:RUN-pg-catalog}}). *Graded item:* GEN-find-the-witness template 4: two worlds differing only in Birch's private rows such that an Acme user's command outcome differs, or "none".

**Exit items → Today:** template 1, card KC-7.rls-semantics; template 4, card KC-7.side-channels. **Production twin:** Cedar's third layer, daily differential random testing of the Rust authorizer against the Lean model; proofs found 4 bugs and differential and property-based testing 21 [cedar24], and its generator finding (§4.3) is why LAB-7.4's receipt prints generator statistics; pin {{run:RUN-twin-pins}}. **Drawer:** D-17, query containment, the proof alternative for the conjunctive fragment. **Sibling bridge:** none. **Build this:** LAB-7.4, which mints CL-7.4.

### S7.L5 · core · Enforcement is not noninterference

**Objective:** for an API whose every response passes the read check, exhibit a pair of executions that differ only in Birch's private data and that an Acme user tells apart, or establish "none" within a printed bound; classify properties as trace properties or 2-safety hyperproperties (GEN-leaks-to-observer templates 1 and 3; GEN-call-it template 4). **KCs:** KC-7.enforcement-vs-ni (threshold; requires KC-7.policy-checking) and KC-7.hyperproperty (requires KC-5.safety-vs-liveness). **Instrument:** INS-pairs. **Minutes.** 40–50.

Copy (hook): "S7.L4 ended with a policy that checked every row and still told frank something. That was not a bug in the policy."

**Prequestion 1** (KC-7.enforcement-vs-ni; k = 3, chance 1/3). Copy: "An API never returns a document's content unless `canread(viewer, doc)` holds. Can a viewer learn anything about documents they may not read?"

| Option | Why | Tag |
|---|---|---|
| No: every read is checked | the check governs what is read, not what the response depends on | dp:A4 |
| **Yes: what comes back, or which error, can depend on data they may not read** | an error code or a count is part of the response | — |
| Only through timing | the response itself already leaks; timing is a further channel | dp:P1 |

**Prequestion 2** (KC-7.hyperproperty; k = 3, chance 1/3). Copy: "Can you refute 'frank's responses never depend on Birch's private data' by exhibiting one run?"

| Option | Why | Tag |
|---|---|---|
| Yes: a run whose response contains Birch's data | dependence is not containment; an implicit flow shows no secret in any one response | dp:A4 |
| **No: you need two runs that differ only in Birch's data and whose responses differ** | the property compares runs | — |
| Only with an infinite run, as for liveness | liveness needs infinite behaviors; this needs pairs of finite ones | dp:C5 |

**Segment 1: two runs, one difference** (14 min). `Open` v0 returns `not_found` when the id does not exist, `forbidden` when it exists and `canread` fails, and the page otherwise. INS-pairs runs `Open(frank, id of layoffs-memo)` in two worlds that differ only in whether layoffs-memo exists; a per-response monitor ("every page returned passes `canread`") passes on both. Call It (k = 3, chance 1/3). Copy: "Will frank's two responses be identical?"

| Option | Why | Tag |
|---|---|---|
| Identical: frank can read neither document | he reads neither, but the refusals differ | dp:A4 |
| **Different: `forbidden` in one world, `not_found` in the other** (designed surprise) {{run:RUN-pairs-reference}} | the error code depends on whether Birch's document exists | — |
| Identical, because errors are not part of a response | an error code is a returned value; dropping it from the observer hides the leak | dp:P1 |

The fix is one answer for both cases (`not_found`). *Graded item:* GEN-leaks-to-observer template 3 (an error or abort observer): generated views with error branches; give a pair the observer tells apart, or "none", keyed by INS-pairs within a printed bound; practice shows the pair and its class, "error channel" (M-class-hint).

**Segment 2: why one run is never enough** (12 min). A trace property is a set of runs, refuted by a finite prefix (safety) or an infinite run (liveness, S5). Noninterference is a set of sets of runs, refuted by two finite runs: a 2-safety hyperproperty (Clarkson and Schneider 2010; Terauchi and Aiken 2005). The per-response check is a safety property of each run, so it passed both. INS-pairs replays the runs singly (each passes) and as a pair (it fails). Call It (k = 3, chance 1/3). Copy: "What kind of property is 'every page returned passes `canread`'?"

| Option | Why | Tag |
|---|---|---|
| **Safety** {{run:RUN-pairs-reference}} | a finite prefix of one run can violate it | — |
| Liveness | nothing has to happen eventually | dp:C5 |
| A hyperproperty | that is the property it gets mistaken for | dp:A4 |

*Graded item:* GEN-call-it template 4: about five generated properties, each "a single run can refute it", true or false, keyed by its generated kind. KC-7.hyperproperty joins confusable set B, so these interleave with S5's property-kind items after the exit item (M-which-is-it).

**Segment 3: two claims, two stamps** (12 min). S7.L4's slug pair, modeled in Mini-Plinth (`CreateDoc` with globally unique slugs) and run in INS-pairs. Call It (k = 2, chance 1/2). Copy: "RLS is on, `FORCE` is set, and the differential found no disagreement. Does noninterference hold for frank?"

| Option | Why | Tag |
|---|---|---|
| Yes: enforcement is complete | complete for reads, while the insert outcome still depends on Birch's row | dp:A4 |
| **No: the slug pair refutes it** (designed surprise) {{run:RUN-pairs-reference}} | two runs differing only in Birch's private row, told apart by frank | — |

The same system earns [E] for "RLS enforces the read rule" (CL-7.4) and [R] for "frank's outcomes do not depend on Birch's private rows", whose witness is the pair; both statements are true of it. *Graded item:* GEN-leaks-to-observer template 1 (a field leak): views in which every returned document passes the check but an output field depends on a hidden row (say, "last edited by" from the latest edit across tenants); give a pair, or "none".

**Exit items → Today:** GEN-leaks-to-observer template 3, card KC-7.enforcement-vs-ni; GEN-call-it template 4, card KC-7.hyperproperty. **Threshold handling:** three calls; returns in S7.L6, S7.L7, LAB-7.5, S9.L4, S9.L9 and S10's report; sampled in the S7 and (via outcome (b)) S10 Defences. **Twin:** none to pin; *Security Foundations*' secure multi-execution is the contrast. **Sibling:** none. **Build this:** LAB-7.5, part 1: your `Open` view's observer, error codes included, in `claims/observer.yaml`.

### S7.L6 · core · Observers and equivalence

**Objective:** write the observer and the tenant equivalence for a view, decide whether given state pairs are related, and build the self-composed obligation, reading `sat` as a leaking pair and `unsat` only beside a premise witness that lets the secret vary (GEN-leaks-to-observer templates 1–3). **KCs:** KC-7.observer-equivalence (threshold; requires KC-7.hyperproperty, KC-4.vc-shape), KC-7.hyperproperty. **Instruments:** INS-pairs, INS-z3. **Minutes.** 45–55.

Copy (hook): "To say 'frank learns nothing', you must say what frank sees, and which worlds he must not be able to tell apart."

**Prequestion** (KC-7.observer-equivalence; k = 3, chance 1/3). Copy: "To check that frank learns nothing about Birch's private documents, which pairs of worlds should the check compare?"

| Option | Why | Tag |
|---|---|---|
| Every pair of worlds | frank's own documents legitimately differ; this is the blanket claim S7.L7 refutes | dp:A15 |
| **Pairs that agree on everything Acme may know and differ only in Birch's private data** | the relation states what frank may already know | — |
| Identical worlds only | then every view passes and the check says nothing | dp:A12 |

**Segment 1: the observer and the relation** (13 min). obs_u and ~Acme as in §1; INS-pairs evaluates ~Acme on three single changes to W0. Call It (k = 3, chance 1/3). Copy: "Which single change keeps the two worlds related?"

| Option | Why | Tag |
|---|---|---|
| **layoffs-memo's body differs** {{run:RUN-pairs-reference}} | Birch's private data may differ | — |
| contract's body differs | contract is shared with dana, so its body is released to Acme and must agree | dp:A15 |
| roadmap's title differs | Acme's own data must be equal | dp:A2 |

*Graded item:* GEN-leaks-to-observer template 1, with the relation shown: give a related pair the observer distinguishes, or "none".

**Segment 2: self-composition** (14 min). *Worked example*, a correct example first (not a fading family). The product obligation for `Open`:

```
Rel(S_L, S_R)                                   ; agree on Acme's data and on Birch's releases to Acme
∧ out_L = Open(frank, k)(S_L)
∧ out_R = Open(frank, k)(S_R)
∧ obs_frank(out_L) ≠ obs_frank(out_R)           ; the negated conclusion
```

`sat` is a leaking pair: decode both states and replay them in INS-pairs. `unsat` is noninterference for this view, observer, relation and encoding, read only beside the premise witness `Rel(S_L, S_R) ∧ secret_L ≠ secret_R`, which must be `sat`; a relation that also forced Birch's data equal would pass every view (dp:A12). This is S4's `Inv ∧ Guard ∧ Step ∧ ¬Inv′` with two copies of the state (KC-4.vc-shape). INS-z3 runs v0 (`sat`, the decoded pair of segment 1) and v1, which answers `not_found` in both cases {{run:RUN-z3-selfcomp}}. Call It on v1 (k = 3, chance 1/3). Copy: "What does the product obligation return for v1?"

| Option | Why | Tag |
|---|---|---|
| **`unsat`, with the premise witness `sat`** | related worlds now give equal responses, and the relation still lets Birch's data vary | — |
| `sat` | refusals are harmless once they look alike | dp:A4 |
| `unknown` | no quantified hierarchy here; the query stays in a fragment Z3 decides | dp:Z2 |

*Graded item:* GEN-leaks-to-observer template 2 (a count channel): generated views with aggregates; a pair or "none", keyed by INS-pairs within a printed bound or by Z3 self-composition.

**Segment 3: through your own checker; what stays assumed** (12 min). LAB-7.5 adds to `miniplinth check`: rename every state symbol twice, emit `Rel` from `claims/observer.yaml`, emit the view twice, negate the observation equality, and decode a model into two states. The stamp is [P] · Z3 5.3.1 unsat by self-composition · uncertified, with the observer as [A] (CL-7.3); the observer is the response body, which plants SEAM-10. INS-z3 runs the reference checker's SMT-LIB for v1, and INS-pairs replays the decoded v0 pair (RUN-z3-selfcomp). Call It (k = 2, chance 1/2). Copy: "Your [P] covers frank's responses. Does it cover how long they take?"

| Option | Why | Tag |
|---|---|---|
| Yes | what the observer does not include is not covered | dp:P1 |
| **No** | time lies outside the observer; the claim carries it as an assumption (SEAM-10, eroding in S9.L9) | — |

*Graded item:* GEN-leaks-to-observer template 3: a view proved for an observer that sees successful pages only; widen it to error and abort outcomes, as the item states, and give a pair, or "none".

**Exit items → Today:** GEN-leaks-to-observer templates 1–2, card KC-7.observer-equivalence; proposed in SI-11, GEN-spec-it template 1 (write the relation for a given observer and release list; Z3 checks it against the reference and returns a distinguishing state pair; non-vacuity asks for a related pair that differs in the secret). **Threshold handling:** three calls; returns in S7.L7, LAB-7.5, S9.L4 (KC-9.observations requires it), S9.L9 and S10's report; GEN-leaks-to-observer samples it in the S7 and S9 Defences. **Twin:** none that can be pinned; Cedar's verified symbolic compiler applies the same discipline to policies (language paper §4.4). **Sibling:** none. **Build this:** LAB-7.5, part 2, the product construction (start after S7.L7). **Plants:** SEAM-10 via CL-7.3.

### S7.L7 · bridge · The leaky shared document, and declassifying on purpose

**Objective:** find the roadmap's deliberate leak with the paired check, write a release (declassification) record stating what, who, where and when, refute the blanket claim with a legitimate feature, and meet the count channel (GEN-leaks-to-observer templates 1–2 with a release list). **KCs:** KC-7.declassification (requires KC-7.observer-equivalence); KC-7.side-channels returns. **Instruments:** INS-pairs, INS-interp. **Cashes:** ER-3. **Minutes.** 20–25.

**Erosion forecast** (ER-3, M-erosion-forecast; k = 3, chance 1/3). Copy: "Restate CL-3.3 from memory. When a shared view leaks a private field, which segment of CL-3.3's strip cracks?"

| Option | Why | Tag |
|---|---|---|
| Proposition of the model | every successful step still preserves the invariant | dp:L4 |
| Correspondence | the leak is in the view's semantics, the model itself | dp:P3 |
| **Requirement fit** (designed surprise) | the theorem never said who learns what: confidentiality becomes [N] on CL-3.3 | — |

**Prequestion** (k = 3, chance 1/3). Copy: "Birch shares contract with dana, then edits its body. dana sees the new body. Is that a leak?"

| Option | Why | Tag |
|---|---|---|
| Yes: a tenant observed a change in another tenant | that is the blanket claim; sharing exists to permit this | dp:A15 |
| **No: it is the release Birch chose, working as intended** | the share released contract's title and body to dana | — |
| Only if Acme's admins never approved it | the release belongs to the data's owner, Birch | dp:A13 |

**Cell 1: the deliberate bug.** The shared page now also returns `internal_notes`; INS-pairs replays the pair Z3 found. Call It (k = 3, chance 1/3). Copy: "Self-composition, with {title, body} released for shared documents: `sat` or `unsat`?"

| Option | Why | Tag |
|---|---|---|
| **`sat`** {{run:RUN-z3-leaky-field}} | the pair differs only in contract's `internal_notes`, and dana's pages differ (SP-7.1) | — |
| `unsat` | "shared" read as "everything about it released" | dp:A13 |
| `unknown` | the encoding is S7.L6's decidable one | dp:Z2 |

ER-3 fires: SP-7.1 cracks SEAM-3, and CL-3.3's requirement fit gains "[N] confidentiality: what an observer learns", with the remedies an observer, an equivalence relation and a release list. The cure: drop `internal_notes` from the shared projection.

**Cell 2: release on purpose.** *Worked example:*

```yaml
- what:  "title and body of document d"        # a projection of the state, not an output field
  to:    "the users and teams d is shared with"
  who:   "editors and admins of d's owning team (the Share command's guard)"
  where: "Share releases; Open and ListShared show"
  when:  "from Share until Revoke; what was delivered stays delivered"
  why:   "requirement R-share"
```

Sabelfeld and Sands' principles (§3) become checks: conservativity (an empty record gives plain noninterference); monotonicity of release ("adding further declassifications to a secure program cannot render it insecure"); non-occlusion ("the presence of a declassification operation cannot mask other covert information leaks"). Hence release state projections, not output fields: if the view returned `body ++ internal_notes` as `body`, releasing the stored body still catches the notes, while exempting the output field would mask them. INS-pairs shows the share-then-edit pair told apart under the blanket relation and unrelated under ~Acme with the record (RUN-pairs-reference): the blanket claim is false for any system with sharing (AUD-7.2), and the honest claim is noninterference modulo the record.

**Cell 3: the count channel.** `Search` returns frank's readable hits plus `total`, counted before the filter. Call It (k = 2, chance 1/2). Copy: "Can frank learn whether Birch has a private document matching 'layoffs'?"

| Option | Why | Tag |
|---|---|---|
| **Yes** (designed surprise) {{run:RUN-z3-count-channel}} | `total` counts documents frank cannot read (SP-7.2) | — |
| No: he sees only his own hits | each hit is checked; the count is not | dp:A4 |

One bit per query; repeated queries with longer terms spell out titles, the laundering pattern of Sabelfeld and Sands' card-digits example, where a "what" policy fails without control over "who". The cure: count after filtering, or drop `total`.

**Graded item:** GEN-leaks-to-observer template 1 or 2 with a release list: a pair the observer tells apart that the record does not explain, or "none". **Exit item → Today:** the same family, template 2; card KC-7.declassification. **Drawer:** D-20; RFC 9111 §5.2.2.7 says a shared cache "MUST NOT store" a `private` response, a directive that "only controls where the response can be stored; it cannot ensure the privacy of the message content". A cache is one more observer. **Build this:** LAB-7.5 with your release list, then LAB-7.7. **Reading:** Sabelfeld and Sands §2.1 (with "The PER model of information") and §3.1–§3.3 (read 2026-10-23).

### S7.L8 · bridge · Revocation and the past; the new enemy

**Objective:** state revocation as two temporal statements, show that one holds on single-copy traces and that a short trace refutes the other, and exhibit the new enemy on a model whose ACL replica lags (GEN-trace-allowed template 1; GEN-call-it template 4). **KCs:** KC-7.revocation-past; requires KC-7.declassification and KC-5.temporal-operators. **Instruments:** INS-interp, INS-pairs. **Cashes:** ER-9. **Minutes.** 20–25.

**Erosion forecast** (ER-9; k = 4, chance 1/4). Copy: "Restate CL-6.3 from memory. A read after an ACL change is served from a lagging replica. Which part of CL-6.3's card cracks?"

| Option | Why | Tag |
|---|---|---|
| Proposition of the model | every checked history is still accepted | dp:L4 |
| Correspondence | the implementation never left the model; the model assumed something | dp:P3 |
| Requirement fit | the requirement is unchanged | dp:P3 |
| **An assumption record** | SEAM-9's clause "nothing reads a replica" (SI-13) | — |

On the builder's path this forecast runs when S6.L9 mints CL-6.3, already cracked.

**Prequestion** (k = 3, chance 1/3). Copy: "Birch revokes dana's access to contract, which she opened last week. What does revocation guarantee?"

| Option | Why | Tag |
|---|---|---|
| She loses access and loses what she already saw | delivered information cannot be recalled | dp:A6 |
| **Her later opens fail if the check reads an up-to-date ACL; what she already received stays known** | revocation governs the future, through the ACL the check reads | — |
| Her later opens fail at once, whatever copy of the ACL the check reads | a stale copy still says yes | dp:A14 |

**Cell 1: revocation over traces** (INS-interp): `Share(contract → dana) · Open(dana, contract) · Revoke(dana, contract) · Open(dana, contract)`, against LAB-7.6's two statements. **S-new**, "after revocation, no new read succeeds": `□[ReadOK(u, d) ⇒ canread(u, d)]_vars`, a safety property. **S-past**, "revocation removes what was already read": `□[Revoke(u, d) ⇒ d ∉ delivered′[u]]_vars`. Call It (k = 2, chance 1/2). Copy: "Is S-past refuted on this trace?"

| Option | Why | Tag |
|---|---|---|
| **Yes** {{run:RUN-interp-revocation}} | after `Revoke`, dana's delivered log still holds the page (SP-7.3) | — |
| No | revocation stops future reads only | dp:A6 |

Knowledge only grows, `□(d ∈ delivered[u] ⇒ □(d ∈ delivered[u]))`: revocation promises something about the future, and for the past the record's "when" says delivered stays delivered.

**Cell 2: the new enemy** (INS-interp, replicated model). Zanzibar's Example B: "Alice removes Bob from the ACL of a document; Alice then asks Charlie to add new contents to the document; Bob should not be able to see the new contents, but may do so if the ACL check is evaluated with a stale ACL from before Bob's removal" (§2.2). Here `Open` checks the ACL on a lagging replica and reads content from the primary; gia revokes dana, gia edits contract's body, dana opens contract. Call It (k = 3, chance 1/3). Copy: "What can dana see?"

| Option | Why | Tag |
|---|---|---|
| Nothing: she was revoked | the check consulted a copy that had not heard of the revocation | dp:A14 |
| **The new body** (designed surprise) {{run:RUN-interp-new-enemy}} | a stale ACL applied to new content (SP-7.6) | — |
| The old body only | the ACL and the content come from different copies here | dp:A14 |

S-new fails on the replicated model, and ER-9 fires. Remedies: check the ACL and read the content at one snapshot; store a consistency token with each content version and require an ACL snapshot at least as fresh (Zanzibar's zookie); or route reads after an ACL change to the primary. The claim records the choice as [E] where enforced, otherwise [A].

**Graded item:** GEN-trace-allowed template 1 (a safety prefix): on a generated replicated model, one trace satisfying S-new and one violating it, graded by bounded enumeration over INS-interp, bound printed (SI-5). **Exit item → Today:** GEN-call-it template 4 on what revocation guarantees with and without replicas; card KC-7.revocation-past. **Sibling bridge:** byzantine's consistency material, the new enemy as an ordering problem, with card D-21 (M-sibling-bridge). **Twin:** Zanzibar's zookies [zanzibar]. **Build this:** LAB-7.6. **Reading:** Zanzibar §2.2 "Consistency Model", pp. 34–35 (read 2026-10-23).

---

## 4. LAB-7 authz-flow

**The template** (`statespace-lab`, lab 7; never solutions, GATE-guardrails) supplies the world generator and W0; RUN-z3-fixedpoint's toy program (`reference/toy.dl`, `reference/toy.facts`); declarations for `policy/read.dl`; the pinned `claims/no-cross-tenant.smt2`, which includes the learner's `policy/read.smt2`; the RLS schema, `user_teams()`, UPDATE and INSERT policies and the harness (`SET ROLE` mode, owner probe); the S7 views with the deliberate-bug line commented out, so the learner makes the roadmap's bug on purpose; the encoder `encode_view_body` for the learner's LAB-4 checker, so LAB-7.5 covers only the product construction; monitor stubs; the pinned `claims/revocation.yaml`; and the agent kit with its fail-closed hook on `TODO(you)`, claim and receipt files.

| Stage | Title | Min | Learner writes | Check |
|---|---|---|---|---|
| LAB-7.1 | Run the reference policy in Soufflé and in the tab engine; compare relations | 2 | nothing; predict first | LAB-7.c1 |
| LAB-7.2 | Your read policy, with derivations | 25 | `policy/read.dl` | LAB-7.c2 |
| LAB-7.3 | "No cross-tenant read" with a distinguishing request | 25 | `policy/read.smt2` | LAB-7.c3 |
| LAB-7.4 | RLS policies and the `SET ROLE` differential on PostgreSQL 18.6 | 25 | `rls/policies.sql` | LAB-7.c4 |
| LAB-7.5 | A paired-state check through your own VC generator for one API view | 25 | `checker/src/noninterference.rs`, `claims/observer.yaml` | LAB-7.c5 |
| LAB-7.6 | Revocation stated temporally: S-new beside its refuted twin S-past (Lane A over interpreter traces) | 25 | `monitors/` | LAB-7.c6 |
| LAB-7.7 | Leak fix, declassification record (what, who, where, when) and claim cards (write stage) | 20 | `claims/declassify.yaml`, claim cards, `fixed/` | LAB-7.c7 |
| LAB-7.8 | `[stretch]` an Alloy model (D-16) or query containment (D-17) | 25 | — | — |

**Pass conditions.**
- **LAB-7.c1.** Soufflé (Bench) and INS-datalog (tab) evaluate `reference/toy.dl` on `reference/toy.facts`; the two `canread` relations are equal as sets (the SHA-256 of the sorted tuples matches), and the receipt names Soufflé's version {{run:RUN-souffle-version}} and W0-S03's tab engine {{run:RUN-fixedpoint-equal}}. The prediction's key follows from RUN-z3-fixedpoint's two answers [X RUN-z3-fixedpoint].
- **LAB-7.c2.** On n fresh worlds drawn at grade time, your `canread` equals the reference on every world in the tab engine and on Soufflé (your Bench receipt), both accepting the program as stratified; one derivation per world is a valid tree; firing rates and the share of trivial matrices are printed (targets [D]: each rule fires in at least half the worlds; at most a tenth trivial). Mints CL-7.1.
- **LAB-7.c3.** Z3 5.3.1 on `claims/no-cross-tenant.smt2`: with WF1–WF3 your verdict equals the reference's (`unsat` for a correct policy), and the premise and non-vacuity witnesses are `sat`; on mutants seeded at grade time (WF1 dropped; a tenant-level grant; subset for overlap in a team share; nesting without WF2) your verdicts equal the reference's, and every `sat` carries a distinguishing request that replays in INS-datalog; an `unknown` reads "rejected: unknown (reason)", never "no counterexample"; nesting uses the grounded encoding; cvc5 on the Bench ({{run:RUN-scaffold}}) agrees on the `unsat` (recorded; the stamp stays "uncertified"). Mints CL-7.2.
- **LAB-7.c4.** On PostgreSQL 18.6 with n fresh worlds: in `SET ROLE` mode every user's visible ids equal the matrix row (zero disagreements); the owner probe runs the application query as the table owner without `FORCE`, where it must report rows the matrix denies (the bypass caught and logged), and under your configuration, where it reports zero; `relrowsecurity` and `relforcerowsecurity` read back true from `pg_class` with a timestamp; the receipt names the server version, n, generator statistics (teamless users included) and the policy hash. PGlite reruns the `SET ROLE` mode on a smaller n if W0-S08 passes. Mints CL-7.4.
- **LAB-7.c5.** With the deliberate bug enabled, your checker returns `sat` and INS-pairs replays the decoded states: related under your pinned relation with the release list {title, body}, observations different (a re-find of SP-7.1's class, M-re-find); on the fixed view, `unsat` with the premise witness `sat`; on three seeded variant views (a field leak, a count field, an error branch) your verdicts equal the reference checker's; your checker runs as wasm on fresh seeds. Mints CL-7.3.
- **LAB-7.c6.** Your S-new monitor accepts all n fresh single-copy traces (n and the maximum length printed: [T]); your S-past monitor rejects a trace that INS-interp replays, showing the page delivered before `Revoke` still in the observer's log after it. Optional, outside the pass condition: S-new on replicated-model traces, keeping a violating trace as a re-find of SP-7.6.
- **LAB-7.c7.** Every entry of `claims/declassify.yaml` has what (a state projection), to, who, where and when, plus a requirement link; its "what" set equals the release list hashed in the LAB-7.5 receipt; the leaky view sits in `broken/` beside `fixed/` and replays; channels you keep (such as global slugs) appear as entries or [N] lines; CL-7.1–CL-7.4 pass claim@1 validation (six fields, an "if weakened" witness refuting the claim's own proposition, statement hashes matching the receipts).

**Receipts** follow receipt@1 (spine §9.4), plus: the CPU architecture (Soufflé issue #2476, "sporadic crashes on ARM", was open when R5 checked on 2026-10-20); `tools[]` with Soufflé {{run:RUN-souffle-version}}, Z3 5.3.1 [X RUN-z3-starter], cvc5 {{run:RUN-scaffold}} and PostgreSQL 18.6 [X RUN-pg-anomalies]; statement hashes for the four `claims/` files and `policy/read.dl`; `z3` with `rlimit`, verdict and `reason_unknown`; `pg` with the role mode, `FORCE` read-back, policy hash and disagreement counts; `claims[]` CL-7.1–CL-7.4; `tcb[]` listing Soufflé, the tab engine, Z3, cvc5, PostgreSQL's RLS, INS-pairs, INS-interp and the encoder. Datalog and paired-state blocks: SI-7.

**Hint ladders** (M-hint-ladder) sit behind an explanation gate. R0 is the same everywhere: a teach-back of at least 12 words, compared with three authored ideas (self-assessed, never credited). Past R2, the check counts as assisted until an unseen variant passes.

| Check | R1 the concept | R2 where to look | R3 a fragment (≤ 3 lines) | R4 the design in prose |
|---|---|---|---|---|
| c1 | relations are sets | the two relation-hash lines | `souffle -F reference -D out reference/toy.dl` | one program, one fact set, one fixpoint; equality covers this input only |
| c2 | each way in is one rule; the rest is denied | the first distinguishing world | `canread(u, d) :- inteam(u, t), share_team(d, t).` | rules 1–3, safe negation, recursive nesting |
| c3 | assert the negation; `unsat` needs both witnesses; `unknown` fails closed | the mutant whose verdict differs | `(assert (and (canread u d) (not (= (tu u) (td d))) (not (explicit u d))))` | completion per rule, WF1–WF3, grounding |
| c4 | `USING` filters; permissive policies OR; owners bypass unless forced | the first disagreeing triple and the connecting role | `ALTER TABLE documents FORCE ROW LEVEL SECURITY;` | one policy per rule; why the owner probe exists |
| c5 | two related copies of the state, outputs compared | the decoded pair: is the differing symbol released? | `fn rename(sym: &str, side: Side) -> String { format!("{sym}_{side}") }` | the product program and witness decoding |
| c6 | safety over traces; delivered stays delivered | the trace your S-past monitor missed | `let revoked_at = trace.iter().position(\|e\| e.is_revoke(&u, &d));` | both statements; monotone knowledge |
| c7 | what, who, where, when; release state, not output fields | your record against the LAB-7.5 list | one entry in the worked example's shape | the four principles applied |

The stuck protocol fires at 25, 45 and 90 minutes (M-stuck-protocol); `statespace stuck` packages the failing world, pair or trace with private paths stripped.

**Prove-it** (M-prove-it: `statespace defend` mutates the learner's own artifacts; agent closed; predict, then the checkers grade; every mutant builds or loads, GATE-labs).

| Mutation | GEN-defend template | Prediction asked | Graded by |
|---|---|---|---|
| drop `!revoked(d, u)` from rule 2 | 2 weaken a guard | does c2 fail? does c3? (the matrix differs on worlds with a revocation; the tenant property holds) | INS-datalog, Z3 |
| `<@` in place of `&&` in `read_team_shared` | 3 change the encoding | who sees what? (the empty array is contained in every array: dp:A1) | PostgreSQL 18.6 |
| drop `FORCE` | 2 weaken a guard | which mode disagrees? (the owner probe, not `SET ROLE`) | PostgreSQL 18.6 |
| add `total` to `Search`'s observer | 4 widen the observer | does the `Search` variant turn `sat`? | Z3, INS-pairs |
| remove `body` from the release list | 1 drop a hypothesis (a conjunct of `Rel`) | does the fixed view turn `sat`, and on which pair? (share-then-edit) | Z3, INS-pairs |
| the ACL check reads the lagging replica | 4 split an action | does S-new still hold on generated traces? | INS-interp |

**Statement pins, not a challenge pack.** LAB-7 is not a Lean lab (no `Challenge` module or `comparator.json`). Its statements are non-Lean files pinned by hash (I7): `claims/no-cross-tenant.smt2` and `claims/revocation.yaml` ship pinned; `claims/observer.yaml` and `claims/declassify.yaml` are hashed on their first receipt. A changed hash voids the citing claims to [?] · statement mismatch; the hook blocks agent edits to all four. *Optional Lean keep-alive* (M-lean-keep-alive): prove default deny for your read rule, Cedar's first layer at toy scale, as a challenge pack whose `comparator.json` permits only S2.L9's standard axioms.

**Lanes.**

| Stage | Graded where | Badge |
|---|---|---|
| LAB-7.1, LAB-7.2 | INS-datalog on fresh worlds; Soufflé receipt | *re-checked here*; *reported from your machine* |
| LAB-7.3 | INS-z3 on fresh mutants; Z3 and cvc5 receipt | *re-checked here*; *reported from your machine* |
| LAB-7.4 | PostgreSQL 18.6 receipt; PGlite rerun if W0-S08 passes | *reported from your machine* (*re-checked here* for the rerun) |
| LAB-7.5, LAB-7.6 | Lane A: your checker or monitors as wasm, with INS-z3, INS-pairs, INS-interp | *re-checked here* |
| LAB-7.7 | claim@1 validation by `statespace check`, imported | *reported from your machine* |

**LAB-7.8 `[stretch]`.** Either an Alloy model of the schema and rules 1–3, with `check NoCrossTenant for k` paired with a satisfiable `run` and stamped [M] · scope k, on the Bench's Alloy {{run:RUN-alloy-version}} (Alloy4Fun only as a disclosed, uncredited link-out, OD-4); or query containment (D-17): `read_team`'s visible set contained in rule 1's for the conjunctive fragment, then broken by a NULL. No check; outside the budget.

---

## 5. Specimens

Labels are generated from runs (*violates, because, minimal?, cured by, found in, tool version*); a specimen is "mounted" once a run verifies its label and "kept" after a re-find on a fresh variant at least 7 days later (M-specimen-cabinet). For a pair, "minimal" means the fewest differing secret atoms, found by the run's shrinker (SI-20). All seven are placeholders recorded by W4-T10.

| ID | Witness | Violates | Because | Minimal? | Cured by | Status |
|---|---|---|---|---|---|---|
| SP-7.1 Leaky shared document (S7.L7; re-found in LAB-7.5) | worlds differing only in contract's `internal_notes`; dana's pages differ | noninterference for the shared view modulo {title, body} (CL-7.3) | the view releases a field the record does not | one document, one share, one field | drop the field from the shared projection | {{run:RUN-z3-leaky-field}}; cracks SEAM-3 |
| SP-7.2 Count side channel (S7.L7) | worlds differing only in a Birch private match for "layoffs"; `Search(frank, "layoffs").total` differs | noninterference for `Search` | `total` is counted before the filter | one document | count after filtering, or drop `total` | {{run:RUN-z3-count-channel}} |
| SP-7.3 Revocation cannot unsee (S7.L8) | `Share · Open · Revoke`: the page stays in dana's delivered log | S-past, the refuted twin | knowledge is monotone; revocation changes future access only | three steps; witness length from the run | none in the system: claim S-new, record "delivered stays delivered", rotate what must not stay known | {{run:RUN-interp-revocation}} |
| SP-7.4 Owner bypasses RLS until `FORCE` (S7.L4) | the owner probe without `FORCE` returns rows the matrix denies | CL-7.4 in owner-connection mode | owners bypass row security unless forced (§5.9) | one row | `FORCE`, read back as [C]; or a non-owner role without `BYPASSRLS` | {{run:RUN-pg-rls-owner}} |
| SP-7.5 Integrity check leaks existence (S7.L4) | with and without Birch's slug "layoffs-memo", frank's insert fails or succeeds | noninterference for frank's outcomes, while CL-7.4 holds | unique and foreign-key checks bypass row security (§5.9) | one row | `UNIQUE (tenant_id, slug)`, opaque ids, or a release entry | {{run:RUN-pg-rls-covert}} |
| SP-7.6 The new enemy (S7.L8) | revoke and edit on the primary; dana's check reads the lagging ACL replica and she sees the new body | S-new on the replicated model; SEAM-9's "nothing reads a replica" | the ACL check and the content read use different, unordered copies | one revoke, one edit, one open | one snapshot; a consistency token; read-your-writes routing; as [E] or [A] | {{run:RUN-interp-new-enemy}}; cracks SEAM-9 |
| SP-7.7 Quantified hierarchy `unknown` (S7.L3) | quantified encoding: `unknown` with reason; unconstrained: spurious `sat` (a forbidden cycle); grounded: a verdict | nothing: a tool-trust specimen ([?] fails closed) | quantified acyclicity and transitivity leave Z3's decided fragment (Cedar §4.3) | — | hierarchy as data, grounded on the footprint | {{run:RUN-z3-hierarchy-unknown}} (constraint in S7.L3) |

---

## 6. Claim templates

Six fields plus a requirement row, under the strip proposition · correspondence · requirement fit (requirement fit is never [P]). Cards live in `claims/*.yaml` and fade from receipt-prefilled (CL-7.1, CL-7.2) to learner-written (CL-7.3, CL-7.4). Each "counterexample when weakened" refutes the claim's own proposition (claim@1 validation).

**CL-7.1 · On every checked world, the access matrix equals the policy's derivations** (LAB-7.2). *Proposition:* on n generated worlds, the access table served equals the requests the policy derives, in both engines, each allowed cell with a valid derivation. *Assumptions:* [A] both engines implement stratified Datalog as documented; [A] the table is recomputed before it is served; [A] the generator exercises every rule. *Model:* `policy/read.dl`. *Method:* differential evaluation against Soufflé {{run:RUN-souffle-version}}. *Correspondence:* those worlds only (enforcement is CL-7.4; all worlds, CL-7.2). *If weakened:* materialize once, then revoke a share: the cell stays allowed with no derivation. *Requirement:* rules 1–3 as the roadmap's sentence, [A]. *Stamp:* [T] · n worlds · generator statistics · engines agree {{run:RUN-datalog-matrix}}.

**CL-7.2 · No cross-tenant read without an explicit share, at the policy level** (LAB-7.3; the spine's wording drops "without an explicit share", SI-1). *Proposition:* in every world satisfying WF1–WF3, a cross-tenant `canread(u, d)` implies an unrevoked share to u or a share to one of u's teams. *Assumptions:* WF1–WF3 as [A] or [E]; [A] the encoding (completion, grounding) is faithful, the open defeater "encoding unverified". *Model:* first-order definitions over uninterpreted sorts. *Method:* Z3 5.3.1 `unsat` under an `rlimit`, both witnesses `sat`, cvc5 cross-check. *Correspondence:* the policy only. *If weakened:* drop WF1 and a guest member reads without a share {{run:RUN-z3-cross-tenant}}. *Requirement:* sharing across tenants is permitted (AUD-7.2). *Stamp:* [P] · Z3 5.3.1 unsat · uncertified · rlimit N, grounding stated {{run:RUN-z3-cross-tenant}}.

**CL-7.3 · Noninterference for the document view modulo declassified fields** (LAB-7.5; plants SEAM-10). *Proposition:* for all S ~Acme S′ (agreeing on Acme's data and on the released {title, body} of shared documents), every Acme user u and id k: obs_u(`Open(u, k)`(S)) = obs_u(`Open(u, k)`(S′)). *Assumptions:* [A] the observer is the response body, error codes included (SEAM-10); [A] the encoding is faithful; [A] the release record states the intended release (hash cited). *Model:* the view semantics (SI-8). *Method:* self-composition through the learner's checker, Z3 5.3.1 `unsat`, premise witness `sat`. *Correspondence:* the semantics, not the serving code (S9) or the database (CL-7.4). *If weakened:* drop `body` from the release list: `sat` on share-then-edit {{run:RUN-z3-selfcomp}}. *Requirement:* noninterference modulo the record (AUD-7.2). *Stamp:* [P] · Z3 5.3.1 unsat by self-composition · uncertified; observer [A] {{run:RUN-z3-selfcomp}}.

**CL-7.4 · RLS enforces the read rule** (LAB-7.4). *Proposition:* on every checked world, each user's visible rows equal the matrix row, in `SET ROLE` and owner-connection modes. *Assumptions:* [C] RLS enabled and forced (read back with the time); [A] the application's role is neither superuser nor `BYPASSRLS`; [A] only the application sets `app.user`; [A] PostgreSQL 18.6 behaves as documented (SEAM-9); [N] the policy-subquery race and integrity-check channels. *Model:* schema, `user_teams()`, policies. *Method:* the differential and the owner probe. *Correspondence:* enforcement only (SP-7.5 breaks noninterference). *If weakened:* drop `FORCE` under an owner connection and denied rows appear {{run:RUN-pg-rls-owner}}. *Requirement:* rules 1–3, [A]. *Stamp:* [E] · PostgreSQL 18.6 RLS on `documents`, plus [T] · differential · n worlds × users {{run:RUN-pg-rls-differential}}, plus [C] · `relforcerowsecurity` read back (SI-2).

---

## 7. Seams and erosions

| Event | Seam | Endpoint 1: planted | Endpoint 2: cashed | Part cracked | Remedies | Forecast | Ships |
|---|---|---|---|---|---|---|---|
| ER-3 | SEAM-3 "A correct step needs no observer" | S3.L6 · CL-3.3 | S7.L7 · SP-7.1 | requirement fit: CL-3.3 gains "[N] confidentiality" | an observer, a relation, a release list (S7.L6, LAB-7.5) | S7.L7 (requirement fit) | W4-T12 |
| ER-9 | SEAM-9 "Nothing reads a replica; PostgreSQL behaves as documented; every writer is SERIALIZABLE" | S6.L9 · CL-6.2, CL-6.3 | S7.L8 · SP-7.6 | an assumption record: replicas and ordering (first clause, SI-13) | one snapshot; a consistency token; read-your-writes routing; as [A] or [E] | S7.L8 (an assumption record) | W4-T12 |
| ER-10, planted here | SEAM-10 "The observer sees only the response body" | S7.L6 · CL-7.3 | S9.L9 · SP-9.6 | an assumption record: size and timing | widen the observer, or state the channel as [N] | S9.L9 | W5 |

ER-3 fires in S7.L7 on both published paths. ER-9 fires in S7.L8 by default; on the builder's path SP-7.6 comes first, so CL-6.2 and CL-6.3 mint at S6.L9 already cracked and the forecast runs then. GATE-erosions checks both endpoints, the forecast and the remedy card (W4-T12). No proposition cracks: CL-3.3 stays [P] and CL-6.3 stays [T] for its histories.

---

## 8. The Audit Desk: S7 anchors

Spine §6 applies: matched twins, a seeded 30–60% sound share, the five-step flow with "none: sound" offered and no default, scheduling after LAB-7 with a re-check a week later, nothing locked, no exploit code.

| ID | Class | Sound twin | Flawed variant | Based on | Evidence | Keys |
|---|---|---|---|---|---|---|
| AUD-7.1 | G10 observer too weak | noninterference for the cured document API (per-tenant slugs, counts after filtering) with an observer that includes write outcomes, counts and sizes | the same proof with the observer set to the JSON body of reads, while the API also returns insert outcomes and a total-count header | PostgreSQL 18 §5.9 on integrity checks and "covert channel" leaks (read 2026-10-23; https://www.postgresql.org/docs/18/ddl-rowsecurity.html) | pairs the observer equates and an attacker distinguishes | {{run:RUN-z3-selfcomp}}; {{run:RUN-pg-rls-covert}} |
| AUD-7.2 | G12 requirement mismatch | noninterference modulo the declassified share | "no tenant can ever observe any change in another tenant" | 13 of 200 model answers on Erdős problems were "meaningfully correct" (arXiv 2601.22401, 2026-01-29; https://arxiv.org/abs/2601.22401); alternative in SI-12 | a legitimate feature, sharing, the claim forbids | {{run:RUN-z3-selfcomp}}; {{run:RUN-pairs-reference}} |

**Variants** (spine §6.2 operators, keys recomputed at grade time): widen or narrow the observer; drop or add a release entry; replace self-composition with a single-world check; stamp a bounded pair search as proof. GEN-spot-the-gap serves them to Today (0–1 per session), the Clearinghouse and the Defence. **S7 exemplars for other classes** (keys at grade time; no new anchors):

| Class | Exemplar | Evidence | Key from |
|---|---|---|---|
| G2 | noninterference "proved" with a relation that also fixes Birch's data | the secret-differs premise witness is `unsat` | INS-z3 |
| G3a | "every endpoint calls `canread`, so tenants are isolated" | a pair (S7.L5) | INS-pairs |
| G4 | `<@` for `&&` in a team-share policy | a teamless user's visible rows | PGlite or the recorded pool |
| G5 | "no cross-tenant read: PASS" after the hierarchy query returned `unknown` | the raw verdict line and reason | {{run:RUN-z3-hierarchy-unknown}} |
| G7 | "revocation enforced" while checks read a lagging replica | a new-enemy trace | INS-interp |
| G8 | CL-7.4 tested via `SET ROLE`; the deployed application connects as owner without `FORCE` | the owner probe's disagreement | {{run:RUN-pg-rls-owner}} |
| G11 | "the matrix has no cross-tenant cell, so the policy is tenant-safe" | the stamp against the method: [T] · 1 world | INS-z3 |

---

## 9. The Defence (S7)

Untimed, at least two sessions within a week of LAB-7 (spine §8.6). Signed off: Parts A–C at least 75% overall and each part at least 60% (at most one miss in a part of five or fewer), Wilson interval shown, plus fresh items in at least three spaced sessions; a failed part is retaken on fresh seeds after at least 3 days, and nothing locks.

**Part A, probes** (about 35 min): 12 unseen-seed items from three families, agent closed, a call on each.

| Slots | Family · template | Item | Completion test | KCs |
|---|---|---|---|---|
| 2 | GEN-spec-it 1 | write the tenant equivalence for a given observer and release list (Z3 against the reference; a distinguishing state pair; non-vacuity) | (i) observer and relation | KC-7.observer-equivalence |
| 1 | GEN-spec-it 2 | a policy variant, with a distinguishing request | — | KC-7.policy-as-datalog |
| 2 | GEN-leaks-to-observer 1 | a field leak; a field leak with a release list | — | KC-7.enforcement-vs-ni, KC-7.declassification |
| 1 | GEN-leaks-to-observer 1, blanket relation | a pair from a legitimate feature that the blanket claim forbids | (iii) why the blanket claim is false | KC-7.declassification |
| 1 | GEN-leaks-to-observer 2 | a count channel | — | KC-7.side-channels |
| 1 | GEN-leaks-to-observer 3 | an error or abort observer | — | KC-7.enforcement-vs-ni |
| 1 | GEN-call-it 4 | release scenarios: intended or leak (keys by INS-pairs with and without the record) | (ii) what is declassified | KC-7.declassification |
| 1 | GEN-call-it 4 | what a one-world matrix, a bounded enumeration, an `unsat` with witnesses and an `unknown` establish | — | KC-7.policy-checking, KC-7.small-scope |
| 1 | GEN-call-it 4 | which properties one run can refute; who reads what on a seeded world | — | KC-7.hyperproperty, KC-7.access-models |
| 1 | GEN-call-it 4 | who RLS binds (owner, `FORCE`, `BYPASSRLS`, `TO`); what revocation guarantees, with and without replicas | — | KC-7.rls-semantics, KC-7.revocation-past |

**Part B, defend** (about 20 min): GEN-defend on the learner's artifacts, predicted first, graded by the matching checker. The spine's four are mandatory (widen the observer; drop a declassification; `in` where overlap was meant; drop `FORCE`), plus up to two from the Prove-it table. Every mutant builds or loads, or its key predicts it fails to (GATE-labs); Part B has face validity only.

**Part C, audit** (about 20 min): four cases from the AUD-7.1 and AUD-7.2 pools, at least one sound. **Part D, explain-back** (about 10 min; required, uncredited): two minutes on enforcement versus noninterference, then a three-idea self-check against Part A: a per-read check is a property of each run; noninterference compares runs, so its witness is a pair; the observer and relation define "learns nothing", the release record what is learned on purpose. **Settled:** a fresh probe per KC correct at least 30 days later.

---

## 10. The Clearinghouse, twins, siblings, drawers and the note

**The Clearinghouse** (M-docket, W4-T14; OD-14) gains users, teams, roles, documents and sharing. The learner's policy and cross-tenant query gate rule changes, the RLS policies run on PGlite in the world if W0-S08 passes, and the paired-state checker gates view changes. Weekly incidents (1–3) are mutation-generated agent proposals, sound in a seeded 30–60% share: a new sharing rule, a view adding a field, a materialized access table, an RLS edit adding `TO`, a read routed to a replica. Gap-class incidents (G10, G12, G7, G8) have thresholds proven against naive and reference baselines ({{run:RUN-docket-baselines}}); erosions come from the oldest open erodible seam. S10.L6's agent proposal may then be an authorization command.

**Twins** (M-production-twin; pins in {{run:RUN-twin-pins}}, 60-day TTL): Cedar's three layers at S7.L2, S7.L3 and S7.L4 [cedar24][cedarspec], with tracing questions at the pinned `cedar-spec` SHA (what Lean proves; which differential targets compare Rust and Lean; what the oracle trusts); Zanzibar's consistency model at S7.L8 [zanzibar]. **Sibling bridge:** byzantine at S7.L8 with D-21 (tablespace T4 not adopted, SI-19). **Drawers** (always open; opening logged, never required): D-16 (S7.L3, LAB-7.8), D-17 (S7.L4, LAB-7.8), D-20 (S7.L7), D-21 (S7.L8); D-10 helps with Rocq notation (SI-15). **Technical note 3** (M-notes) follows S7: 600–1,000 words in roadmap rule 5's three parts, from memory first, with specimens and receipt hashes attached after; publishing is optional.

---

## 11. Reading list

1. **Soufflé** (the roadmap's resource): tutorial (https://souffle-lang.github.io/tutorial) "Introduction to Datalog › Overview", "First example" (Transitive closure; Data-flow analysis example), "Relations", "Aggregation › Counting"; the tutorial lacks provenance and stratification, so add the Rules page's "Negation in Rules" (https://souffle-lang.github.io/rules) and the Provenance page's "Using Provenance › The `explain` interface" (https://souffle-lang.github.io/provenance). Read 2026-10-23.
2. **PostgreSQL 18**: §5.9 "Row Security Policies" (https://www.postgresql.org/docs/18/ddl-rowsecurity.html); CREATE POLICY's Description, Parameters, Notes and "Application of Multiple Policies" (https://www.postgresql.org/docs/18/sql-createpolicy.html). Read 2026-10-23. CREATE VIEW's `security_invoker`, read 2026-10-21 via R4 §2.5. Links pin `/docs/18/` (OD-12).
3. ***Security Foundations*** 1.2 (2026-08-24; Rocq 9.0.0 or later), https://softwarefoundations.cis.upenn.edu/secf-current/toc.html: in "Defining Secrecy and Secure Multi-Execution", the sections "Naive attempt at defining secrecy" through "Noninterference for state transformers" and "Secure Multi-Execution (SME)"; in "Information-Flow-Control Type Systems", "Explicit flow prevented by cf_well_typed" and "Implicit flow prevented by cf_well_typed". Read 2026-10-23.
4. **Sabelfeld and Sands**, "Declassification: Dimensions and principles", *JCS* 17(5), 2009, DOI 10.3233/JCS-2009-0352 (https://www.cse.chalmers.se/~andrei/sabelfeld-sands-jcs07.pdf): §2.1–§2.4 (with "The PER model of information"), §3.1–§3.3. Read 2026-10-23.
5. **Zanzibar** (Pang et al., USENIX ATC 2019; https://www.usenix.org/conference/atc19/presentation/pang): §2.1 Relation Tuples; §2.2 Consistency Model, pp. 33–35. Read 2026-10-23.
6. **Cedar**: arXiv 2403.04651v2 (2024-03-08) §2.3, §4.3, §4.4; "How We Built Cedar", arXiv 2407.01688v1 (2024-07-01) §3, §4.1, §4.3. Read 2026-10-23.
7. **Jackson**, "analyzable models for software design", University of York, 2004-02-04, slides 18–19 (https://people.csail.mit.edu/dnj/talks/york04/york-04.ppt.pdf), read 2026-10-23; optional, *CACM* 62(9), 2019, DOI 10.1145/3338843.
8. **Optional** (section pointers not re-checked; read the definitions): Clarkson and Schneider, "Hyperproperties", *JCS* 18(6), 2010, DOI 10.3233/JCS-2009-0393; Barthe, D'Argenio and Rezk, CSFW 2004, DOI 10.1109/csfw.2004.1310735; Terauchi and Aiken, SAS 2005, DOI 10.1007/11547662_24.
9. **S7.L3's fail-closed rule:** "Block Public Access: Trust Safety Verification of Access Control Policies", ESEC/FSE 2020, DOI 10.1145/3368089.3409728 [bpa] (sentence checked by R5, 2026-10-20). **D-20:** RFC 9111 §5.2.2.7 (https://www.rfc-editor.org/rfc/rfc9111.txt; checked by R5, 2026-10-20).

---

## 12. Time budget

| Component | Plan [D] | Basis |
|---|---|---|
| Read | 1.5–3.0 h | Soufflé 25–40 min, PostgreSQL 15–25, *Security Foundations* 30–50, Sabelfeld and Sands 20–35, Zanzibar 10, Jackson 5, Cedar 10–15 (1.9–3.0 h) |
| Lessons | 3.25–5.1 h | 3 core at 40–60 min, 5 bridges at 15–25; this spec's rows sum to 3.75–4.7 h |
| Build | 2.1–4.2 h | LAB-7.1–LAB-7.6 at 127 nominal minutes, up to 2× (no Lean proof stages) |
| Write | 1.8–3.2 h | LAB-7.7 (20 min, up to 2×) and technical note 3 |
| Defence | 1.0–1.5 h | Parts A–D, about 85 min, over two sessions |
| **Total** | **9.7–17.0 h** | the spine's §3.11 row |

That is 2.0–3.6 weeks at 6 h/week (4.75 h of stage work) and 1.2–2.1 at 10 h/week, against the roadmap's 4–8. **GATE-budget:** 17.0 h ≤ 8 × 4.75 = 38 h and ≥ 9.5 h (half of 4 × 4.75): pass, no warning. The plan sits below the roadmap's lower bound, as the spine notes for S6–S8; learner-zero's logged times replace it after W4. **Keep load:** 11 KCs × about 10 reviews × about 2 min ≈ 3.7 h over 60 days [D]. **Claim cadence:** a claim at each of LAB-7.2–LAB-7.5 and specimens in four lessons, so no two-week gap. LAB-7.8 and the keep-alive are outside the totals.

---

## 13. Spine issues

Each names what this spec does meanwhile; none is applied to the spine silently.

- **SI-1 · CL-7.2's proposition.** "No cross-tenant read at the policy level" is the blanket claim at policy level, refuted by any share. Proposed (used here): "No cross-tenant read without an explicit share, at the policy level".
- **SI-2 · CL-7.4 omits configuration.** `FORCE` is a setting read back from the system, which §8.8 stamps [C] (BRIEF §1.4 lists "configuration [C]" here). Proposed: add "[C] · `relforcerowsecurity` read back".
- **SI-3 · Two run IDs are missing:** RUN-pg-rls-semantics (S7.L4's RLS behaviors) and RUN-pairs-reference (S7.L5–S7.L7's INS-pairs cells). Proposed: add both to §9.5 under W4-T10.
- **SI-4 · S7.L7's instruments.** SP-7.1 and SP-7.2 are Z3 runs, but S7.L7 lists only INS-pairs and INS-interp; this spec replays their pairs in INS-pairs. Alternative: add INS-z3.
- **SI-5 · GEN-trace-allowed in S7.** Its grader is a TLC state graph, but S7.L8 has no TLC instrument. Proposed (used here): bounded trace enumeration over INS-interp, bound printed.
- **SI-6 · Derivations.** W0-S03 accepts on equal relations only; S7.L2 needs derivations. Proposed: GATE-conformance also compares derivation heights with Soufflé's `-t explain`.
- **SI-7 · receipt@1 lacks Datalog, pair and RLS fields.** Proposed: `datalog` (engine, relation hashes, derivation checks, generator statistics), `pairs` (witness, relation and observer hashes, bound), `pg.rls` (role mode, policy hash, read-backs, disagreements).
- **SI-8 · No task extends the Lean reference to S7.** SEAM-13 rests on kernel-checked goldens, but nothing adds documents, sharing and views to the Lean reference, so INS-interp's S7 part is outside that claim. Proposed: a W4 task before W4-T08.
- **SI-9 · Misconception registry.** Bare digest codes collide with spine IDs (S1–S4, L1–L8, C1–C5). Proposed: register the `dp:` prefix and dp:A7–dp:A15 with evidence "—".
- **SI-10 · One prequestion, two new KCs** (S7.L3). Proposed §3.0 wording: "one prequestion, tagged with every KC the bridge introduces".
- **SI-11 · S7.L6's generators.** The Defence grades its completion test with GEN-spec-it template 1, which S7.L6 does not list. Proposed: add it (used here only as an exit item).
- **SI-12 · AUD-7.2's "based on".** An authorization incident fits better: AuthV2 (ICSE 2025), where "shadow testing exposed 7 mismatches owing to inaccuracies or incompleteness of our specification; no issues were found with tools or proofs" (https://www.amazon.science/publications/formally-verified-cloud-scale-authorization; R5 F30).
- **SI-13 · SEAM-9 bundles three assumptions;** SP-7.6 cracks only "nothing reads a replica". Proposed: ER-9 cracks that clause alone.
- **SI-14 · SEAM-10's "response body".** Proposed: the view's returned value, error codes included, so CL-7.3 and AUD-7.1 agree.
- **SI-15 · D-10** should list S7, because *Security Foundations* is written in Rocq.
- **SI-16 · The owner bypass** cannot appear under `SET ROLE` alone; LAB-7.4 adds an owner probe. Proposed: say so in S7.L4's row.
- **SI-17 · Soufflé on ARM.** RUN-souffle-version should record the CPU architecture (issue #2476).
- **SI-18 · Spec duels** fit S7.L3 but are linked to no lesson. Proposed: name S7.L3.
- **SI-19 · tablespace T4** bears on S7.L8's stale reads (card D-11); not adopted.
- **SI-20 · "Minimal?"** is undefined for pairs and traces. Proposed: the fewest differing secret atoms, or the shortest prefix, found by the run's shrinker.

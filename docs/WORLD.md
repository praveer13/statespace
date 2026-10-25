# The Clearinghouse: the persistent world

**Status:** design spec for the persistent world: M-docket, SCR-clearinghouse, RUN-docket-baselines and ER-12, built by W3-T14, W4-T14 and W5-T13. Draft, first-learner pass pending; the owner decisions it rests on, OD-14 above all, were accepted on 2026-10-25. **Date:** 2026-10-24 (machine clock). **IDs:** every ID comes from `docs/spine/SPINE.md` (revision 2). What the spine lacked is listed in §11, and spine revision 3 applies those items (spine §15).

**Sources, in precedence order.** The roadmap (`research/context/roadmap.md`) sets scope. Executed runs (`research/spikes/RESULTS.md`, `research/evidence/`) beat any report. Then come the v2 brief, whose §7.4 is this document's charter and whose V2-25 is its change; the digests; the reports and reviews; kernelspace, for its learning engine; and v1, for history. Companion documents: [AUDIT-DESK.md](AUDIT-DESK.md) (the finding flow, the sound share, scoring, the blind-strategy gate), [ARCHITECTURE.md](ARCHITECTURE.md) §6.6 and §6.8 (the Lane A host and the world's runtime) and [DESIGN.md](DESIGN.md) (SCR-clearinghouse). The world reuses four curriculum specs rather than restating them: `curriculum/S03-semantics.md` §2 (Mini-Plinth v0), `curriculum/S07-secrecy.md` §1 (the access layer), `curriculum/S08-effects.md` §1.1 (the effects model) and `curriculum/S10-assembly.md` §3.2 (the proposal generator).

**Tags.** `[X RUN-id]` marks an executed run on disk; `{{run:RUN-id}}` a run to record before the sentence ships; `[D]` a design choice or estimate; grades A–D follow the pedagogy digest (A a meta-analysis or several RCTs, B one good similar experiment, C small, correlational or preprint, D rationale). Quoted learner copy uses only the spine's glossary (§0) and plain English. Internal names such as docket, lane and Judgment appear in this document and never on screen (GATE-lessons).

---

## 0. The world in one page

| Question | Answer |
|---|---|
| What is it? | A small clearinghouse, written in Mini-Plinth and run in the tab by INS-interp. Tenants hold credits in accounts, move them, place holds and capture or release them; from S7 their people share documents, and from S8 captures settle with an outside provider. It is seeded, deterministic and multi-tenant, and it speaks only the roadmap's nouns. |
| What is it for? | End-state (g), deciding which claims are justified before trusting agent-written code, practiced every week on the learner's own components; and near transfer of the S1–S9 moves to one running system. |
| What plugs in? | The learner's Lane A components as they are built: the checker gates proposals (LAB-4), the compiler runs on PGlite (LAB-6), the outbox machine runs under seeded faults (LAB-8), the validator checks plans (LAB-9). Two cheap attachments reuse lab harnesses: the front end and interpreter run beside INS-interp (LAB-3), and the read policy runs beside the course's policy (LAB-7). |
| What happens each week? | 1–3 incidents, as many as the learner's week plan allows: agent proposals made by mutation, sound with a seeded probability between 30% and 60%; gap-class incidents, whose events are proven to break a naive baseline and to spare the reference; and erosions, fired only from the learner's oldest open erodible seam (ER-12 in edition 1). |
| What counts? | Only the learner's own calls and filed findings, scored against keys that the reference pipeline computes at grade time: `call` and `audit` events, toward audit accuracy and the tagged KCs. The learner's component runs produce claims and specimens, never evidence (spine §8.1). |
| What is stored? | Nothing about the world. Each week is a pure function of public content, recorded seeds, the learner's events and the hashes of the modules that ran (I2). |
| What runs where? | Everything runs in the browser: course engines on the instrument origin, learner wasm through the Lane A host. Concurrency comes only from recorded Bench histories, because PGlite serializes sessions [X RUN-pglite]. There is no server, account or telemetry. |
| How strong is the evidence? | The world itself is grade D, precedent only (kernelspace's Fleet); no study measures a persistent world in formal-methods teaching. Its parts carry their own grades, from A (small) for erroneous examples to A for contrasting cases (§8). Expect tenths of an SD at most. |
| Why so thin? | A full simulated product was rejected as the largest build with no outcome evidence (BRIEF §5.1, R18), and a richer domain adds scope the roadmap does not ask for (BRIEF §7.4). Every addition names what it displaces (§9.4). |

---

## 1. Constraints this design obeys

| Constraint | Source | How the world meets it |
|---|---|---|
| Roadmap nouns only | BRIEF §7.4; V2-25 | Every entity, command and event is a roadmap noun or a Mini-Plinth construct; §2.9 lists the nouns kept out. |
| No private-design content | I9; OD-11; BRIEF §1.5 | Nothing from the learner's own system (a private design, not reproduced here) appears in the world. The world's nouns are the roadmap's: credits are abstract units, and the provider is a generic service that performs one effect per accepted request. The world is never "your system", the only name learner copy gives the learner's own product. |
| Evidence, not clicks | I1 | Status moves only on calls and filed findings, checker-graded, on unseen seeds. Opening the world, browsing it, running components or meeting a bar moves nothing. |
| Derived, never stored | I2 | §5. |
| Pure generators, keys from checkers | I3 | Every incident is made from a seed; its key comes from the reference pipeline at grade time; an instance whose key comes back `unknown` is discarded. |
| Every tool number a run | I4 | Every number the world shows is a live result printed with its engine@version, seed and bound, or it cites a recorded run. This document states no tool number without a tag. |
| Nothing locks | I5 | The world is always open. Weeks are scheduled, never required; a skipped week is never generated afterwards; nothing is ever overdue. |
| Zero servers; outside bytes on the instrument origin | I6 | Learner wasm, imported histories and traces are parsed only there (ARCHITECTURE.md §5). |
| Statements pinned | I7 | A proposal that edits a rule its own proof is checked against is caught by that rule's statement hash, as AUD-2.4 is caught by comparator. |
| Agent claims never stamped | I8 | Proposals render as quoted UNREVIEWED text, and so do the course-authored claims under audit in gap-class incidents. |
| Bounds printed | I10 | Every result prints its n, seeds, constants or search bound. A rule that stays quiet over n calls earns at most [T] · n calls (§2.1). |
| The brief's anti-patterns | BRIEF §3.3 | No XP, leaderboards, streaks, daily counters, deadlines, timed incidents, loss framing, language-model grading, runtime language-model items or self-graded sign-off. A wrong decision is replayed and corrected, never carried as debt (§4.3). |
| Fewer nouns | OD-14 | One coined term, "Clearinghouse" (glossary term 23, introduced after LAB-3). Everything else on screen is plain English. |

---

## 2. The world model

### 2.1 One semantics, one canonical history

- **Language.** The world is written in Mini-Plinth as the course's reference semantics pins it: v0 from S3 (`curriculum/S03-semantics.md` §2: typed parameters, a guard, one statement per body, and the five ResourceOps as zero-sum postings against `mint`, `sink`, user and escrow accounts), sequencing once S4 adds it, the access layer of S7 and the effects model of S8. Its programs are stored as IR@1 and shown in the roadmap's toy syntax. The world never contains a construct that the reference semantics for the learner's scheduled phases lacks.
- **Interpreter.** INS-interp, the TypeScript port of the reference semantics, computes the canonical history, and week k starts from the canonical end state of week k−1. The port agrees with the Lean reference on kernel-checked goldens, [T] · n goldens (GATE-interp). That agreement is the held seam SEAM-13; every world verdict rests on it, and the world's "about" panel says so.
- **Plug-ins never steer the canon.** A learner component runs beside the canon or through it, and it starts every week from the canonical start state, so one week's divergence never carries into the next.
- **Time is ticks.** One tick is one step of the week's schedule. Timeouts, delays, outages and the provider's key retention are counted in ticks. No wall-clock duration enters the world, and no date enters a seed or a rule.
- **Rules, not stamps.** The world evaluates its rules (below) at every step. Like INS-theater's monitors, a rule reports an observation. A rule that fires yields a witness trace, which earns [R] · its length for the claim it refutes once it replays. A rule that stays quiet over n calls earns at most [T] · n calls, never [P] or [M] (spine §8.8).

**The world's rules.** These are its requirements in plain English, with the claim templates they match.

| Rule | Phase | Checked by | Matches |
|---|---|---|---|
| Credits are conserved: the total over all accounts, `mint` and `sink` included, is zero | ledger | INS-interp at every step (`Inv`, S03 §2.6) | CL-1.2, CL-2.1, CL-2.4, CL-3.3 |
| No account other than `mint` goes below zero | ledger | the same | CL-1.1, CL-2.2, CL-3.3 |
| A hold resolves at most once | ledger | the hold table at every step | CL-1.3, CL-5.2 |
| Credits enter only at setup: once the world is set up, no posting debits `mint` | ledger | the postings | CL-1.4 |
| Compiled commands agree with the semantics on outcome class (success, zero rows, SQLSTATE) | traffic | PGlite beside INS-interp | CL-6.1 |
| A committed concurrent history is serializable: some serial order reproduces every committed output | traffic | INS-history, a bounded search | CL-6.3 |
| A user reads a document only when a read rule derives it | access | INS-datalog | CL-7.1, CL-7.4 |
| No view lets one tenant tell apart two states that differ only in another tenant's private data, beyond what was declassified | access | INS-pairs over finite domains | CL-7.2, CL-7.3 |
| No committed command's outbox intent is lost before acknowledgement | effects | the provider simulator | CL-8.1 |
| The provider charges each command at most once | effects | the same | CL-8.2 |
| Every compiled plan the world runs was validated for its command | plans | the validator slot | CL-9.3 |

The fourth rule is deliberately not implied by `Inv`. A deposit from `mint` preserves `Inv`, because `mint` may go negative, so a command can mint user-held credits while every invariant proof still goes through; that gap is what makes the world's G1 and G12 incidents real (§4.3). Liveness, such as "every committed effect is eventually dispatched", is not a rule. A finite week cannot establish it, so the world shows "still pending when the week ended" as an observation, and liveness lives only in [M] claims from TLC with recovery assumed (CL-8.4, CL-8.5).

### 2.2 How the world grows

A phase is scheduled according to what the learner's record holds, never by stage number, so both published paths (OD-3) grow the same world. Scheduling is not access: the standing world and every phase's sample week can be opened at any time. A decision on an incident whose classes the learner has not yet been taught is first-contact practice and counts toward no audit-accuracy figure (AUDIT-DESK.md §5.1). Scored weeks begin after LAB-3.

| Phase | Scheduled when the record holds | Adds (roadmap nouns) | Plug-ins that join | Built by |
|---|---|---|---|---|
| Ledger | LAB-3, whose planned stages have results (glossary term 23) | tenants, accounts, credits as postings, transfers, holds, refunds | front end and interpreter (beside the canon); checker, from LAB-4 | W3-T14 |
| Traffic | S5.L3 (KC-5.interleaving-granularity); recorded histories from S6.L6 (KC-6.compilation-pattern) | sessions; commands as compiled statements; isolation levels; retries | compiler, from LAB-6.2 | W4-T14 |
| Access | S7.L1 (KC-7.access-models) | users, teams, roles, documents, sharing, revocation | read policy (beside the course's), from LAB-7.2; the checker's paired-state check, from LAB-7.5 | W4-T14 |
| Effects | S8.L2 (KC-8.outbox-chain) | outbox intents, a worker, an external provider, acknowledgements; crashes, duplicate and delayed replies, timeouts, outages | outbox machine, from LAB-8.4 | W5-T13 |
| Plans | S9.L8 (KC-9.sql-equivalence) | compiled plans and rewrites of them | validator, from LAB-9.11 | W5-T13 |
| The Core | S10.L6 (KC-10.agent-proposal-triage) | nothing new: every slot can hold the learner's own component | all | W5-T07 reuses the generator |

On the builder's path the learner reaches LAB-3 after the early concurrency and effects blocks, so scored weeks begin with the traffic and effects phases already eligible. The compiler slot then shows the reference module until LAB-6.2, exactly as the reference compiler substitutes in LAB-6.6 and LAB-8.5 on that path (spine §3.0).

### 2.3 Ledger

**The standing world** is generated from the public edition seed (§5): three tenants [D], two of them S07's Acme and Birch so that lesson examples recur in the world; two or three user accounts per tenant [D]; `mint`, `sink` and one escrow account per hold. Setup grants from `mint` give the opening balances, and they are the only grants the world itself ever makes. The world is small on purpose: INS-pairs and INS-history need finite, bounded domains, and a week's tables must fit a phone.

**Base commands**, in the roadmap's toy syntax. Each stays inside v0: one statement, and a guard that covers every debit (rule R-cover, S03 §2.2).

```
entity Account
command Transfer(from, to, amount);   requires balance(from) >= amount;  do move amount from from to to
command PlaceHold(owner, amount);     requires balance(owner) >= amount; do hold amount on owner
command Capture(h, to);               requires true;                     do capture h to to
command Release(h);                   requires true;                     do release h
command Refund(payee, payer, amount); requires balance(payee) >= amount; do move amount from payee to payer
```

- Transfer is the roadmap's own command, verbatim.
- Capture and Release rely on the semantics' run-time checks (`unknownHold`, `holdNotOpen`), which is how a hold resolves at most once in v0.
- Refund is a reverse transfer. v0 has no expression for a hold's captured amount, so "a refund never exceeds its capture" cannot be checked in this phase and the world does not claim it; the roadmap's buggy refund rule stays an S1 exercise (SP-1.3).
- The world runs the reference policy record (S03 §1.1, item 6): an amount of zero is rejected, a self-transfer is allowed (a no-op under sequential postings), a failed guard is a typed error, and overflow is unbounded. The traffic stays far from 64-bit bounds until ER-1 has fired (§4.2).

**Traffic.** Each week the week seed draws a few dozen calls [D] across tenants. The edge cases that S3.L7 turned into decisions (zero, self-transfer, failed guard, unknown account) are mixed in, so the front end and interpreter attachment meets them. RUN-docket-baselines records a canonical week's replay time on the reference modules.

**What a proposal can change here.** A guard, an operation or a new command in the same fragment, and, from S4.L3, sequences of statements. Before sequencing, the v0 typing rules already reject unguarded debits, negative amounts and assignments to balances, so flawed proposals in this phase are flawed in their claims rather than their syntax: a refund via `deposit` that keeps `Inv` and breaks "credits enter only at setup"; an `unsat` over contradictory premises; a change that edits the rule its own proof is checked against. Sequencing brings command-level flaws, such as per-leg guards on a two-leg command that overdraw when both legs name one account at run time (S03 §1.1, item 5).

### 2.4 Traffic

- **Sessions.** From S5.L3 every call carries a session label. INS-interp runs calls whole, one after another, and that is the specification: commands are atomic in the semantics.
- **Below the command.** Anomalies live below command granularity, in compiled statements, and the tab cannot run statements concurrently, because PGlite serializes "concurrent" sessions [X RUN-pglite]. So the world shows statement-level concurrency only from recorded artifacts. From S6.L6 these are PostgreSQL 18.6 histories [X RUN-pg-anomalies] recorded on the Bench with `statespace isorun`, replayed in INS-history and classified by its abstract-serializability checker against INS-interp; the search is bounded, so results are [T] (spine §9.1). The course's histories come from RUN-pg-anomalies, RUN-pg-claims, [X RUN-pg-catalog] and {{run:RUN-isorun-upstream}}. The learner may add their own as receipts, badged *reported from your machine*.
- **Seeds relabel, never revalue.** A seed may choose a history and relabel its tenants and accounts. It never changes a value, because a changed value would be an unrecorded PostgreSQL outcome.
- **The compiler slot.** From LAB-6.2 the week's calls also run through the learner's compiler on PGlite, from the canonical start state, and their outcome classes are compared with INS-interp's (S6.L3's differential). For concurrency on the learner's own compiled SQL, the world hands over the week's history file to run on the Bench; the tab never claims that result.
- **Between S5 and S6.** From S5.L3 to S6.L6 the traffic phase adds session labels and serves variants of AUD-5.1–AUD-5.4 in the world's nouns (as `curriculum/S05-time.md` notes), keyed by TLC state graphs precomputed in CI. Scenes of the world's own commands at split granularity are a later addition (§4.5).

The executed facts this phase stands on [X RUN-pg-anomalies, RUN-pg-claims]: at READ COMMITTED the read-modify-write compilation spends 160 from 100, while the conditional UPDATE re-evaluates its WHERE clause, updates 0 rows and loses nothing; at REPEATABLE READ the read-modify-write's second writer gets 40001; opposite-order moves get 40P01. Specimens and incidents name the compilation pattern, never the isolation level alone.

### 2.5 Access

- **One semantics with S7.** The access layer is `curriculum/S07-secrecy.md` §1 as written: the tenancy of users and teams; membership with the roles viewer, editor and admin; teams owning documents; nested teams from S7.L3; sharing with a user or with a team; revocation; S07's three read rules with default deny; its schema invariants; the views Open, Search and ListShared; the commands Share, Revoke, Edit and CreateDoc; and the observer, which is the value a view returns, error code included.
- **The world's instance.** The edition seed gives the standing world's tenants their teams, users and documents, and S07's reference world W0 is included so that lesson cases recur. Accounts belong to tenants and documents belong to teams; no command links the two in edition 1 [D], which keeps both layers small.
- **Revocation.** After a revocation no new read succeeds, and a read delivered before it stays in the observer's history (SP-7.3's class, eligible from S7.L8).
- **No replicas.** The world holds one copy of its state. The stale-replica read (SP-7.6, the new enemy) stays a lesson specimen; the world models no replication.
- **Row-level security** runs in the world on PGlite with a `SET ROLE` before every statement [X RUN-pglite-rls]; the owner probe and the policy-subquery race replay recorded Bench runs.
- **Limit.** The access layer has no Lean reference (S07's issue SI-8), so its verdicts rest on INS-interp's extension, differential-tested through the policy engines (tab Datalog = Soufflé in GATE-conformance; CL-7.1's [T]). SEAM-13 does not cover it (spine §5.3).

### 2.6 Effects

- **One model with S8.** The worker and the provider follow `curriculum/S08-effects.md` §1.1's reference model. On the database side: the committed commands, each intent's status (none, pending, inflight, acked) and the durable results. In the network: one request per attempt, and replies that can be delivered again. At the provider: the charges it performed and its idempotency table, which it prunes under a stated retention. The actions are S08's: commit, dispatch, timeout, accept, receive, persist, acknowledge, crash, recover and forget.
- **In the world.** The effects phase adds `Settle(h)`, a capture to `sink` whose commit also records an outbox intent in the same transaction. The worker dispatches the intent with its key. The provider performs one charge for each key it has not seen, and replies. Replies are untrusted input, checked for their status and for a charge within the hold, with late replies rejected and the loss stated (S8.L4). Acknowledgement follows the durable write.
- **Seeded faults.** The week seed draws crashes in S08's crash windows CW1–CW5 (S08 §1.2; CW0 is the client-side ambiguous commit), duplicate and delayed replies, timeouts that fire before slow replies, provider outages, and key pruning after the provider's retention. The retention is a world parameter in ticks. The dated incident behind it, documented key pruning (SP-8.5), stays a reading card and gives the world no number.
- **Reconciliation.** The provider answers "did you charge this key?" from its own charge ledger, which it never prunes [D], so "reconcile by key", one of ER-12's remedies, has something to ask.
- **Rules and liveness.** The world checks "no intent lost", "acknowledged only if durable" and "at most one charge per command" at every step; liveness is only observed (§2.1).
- **Export.** A week's effects run exports as NDJSON in LAB-8's trace schema, so `statespace trace validate` can check it against the learner's spec on the Bench and supply CL-8.3's [T] · n seeds, badged *reported from your machine*.
- **Limit.** The provider simulator is course TypeScript. Its conformance to S08's reference spec is checked by validating its traces with TLC in CI (GATE-conformance, spine §11.2). INS-sim results are not authoritative; TLC trace validation on the Bench is (spine §9.1).

### 2.7 Plans

From S9.L8, every command the world compiles produces a plan, the generated SQL, which the validator slot checks before PGlite runs it. The reference is the course's translation validator ({{run:RUN-tv-reference}}). Proposals in this phase rewrite plans ("merge the two UPDATEs", "drop the status check, the CHECK covers it") or change validators, and they are keyed by the reference validator, which replays every counterexample through both semantics (LAB-9.c11). A plan accepted because "results match on one database" earns [T] · 1 instance (spine §8.8).

### 2.8 The Core

From S10.L6 every slot can hold the learner's own component, and the world becomes a stage for the demonstration. LAB-10.4 draws from the same generator (`curriculum/S10-assembly.md` §3.2), so a proposal triaged in the world can serve as the demonstration's proposal. The report's agent incident ledger (S10-assembly.md, item T12) lists the world's triaged proposals, read from an event bundle the learner exports; nothing leaves the device unless the learner exports it. ER-12 fires in the world after S9 on both published paths (§4.6).

### 2.9 Nouns the world never uses

| Kept out | Why |
|---|---|
| prices, money, currencies | Credits are abstract units; the roadmap's credit ledger needs nothing more. |
| devices and logins | Not roadmap nouns; mobile attestation is deferred (D-36). The world's "sessions" are database sessions only, the roadmap's concurrent connections. |
| caches, CDNs, edge, deployment topology | Deferred by the roadmap (D-37); D-20 stays a drawer. |
| replicas, regions, clusters | Not in the roadmap; the new enemy stays a lesson specimen (SP-7.6). |
| UI generated from specs, SDKs, migrations | Deferred (D-39, D-40, D-38). |
| real companies or people | GATE-privacy; tenant, team and user names come from a fixed neutral list in the course content. |

---

## 3. Plug-in points

### 3.1 The slot contract

1. **One host.** Every learner component runs through the Lane A host (ARCHITECTURE.md §6.6): zero-import wasm on the family ABI v2, IR@1 or a component-specific JSON request in, a JSON reply out, a fresh instance per call, and the host's per-check time limit as the per-call budget.
2. **Identity by hash.** A module is identified by its SHA-256, and every event names the hashes of the modules that ran, so a week replays only with the same modules. A slot holds the module last dropped for it. Its bytes sit in the instrument origin's cache as a convenience; a cleared cache only asks for the file again.
3. **Empty slots.** A slot without a learner module runs the course's reference module, labeled "reference module, earns nothing" (spine §3.0), so the world works from its first week.
4. **Keys never leak before filing.** No reference module runs on an incident's event before the learner files a finding on that incident. The standing world's routine traffic uses reference modules for empty slots; incidents are kept apart from it, and an empty slot's personal run (§4.4) waits until after filing.
5. **A divergence is a defeater, not a verdict.** When a learner component and the reference disagree, neither side gets a stamp. The disagreement is a defeater against both until it is triaged as a spec, implementation, tool or proof error (spine §8.8, §9.3).
6. **Claims and specimens, never evidence.** A component's run can mount a specimen, support or defeat a claim in the learner's repo, or export a trace for the Bench. It never moves sign-off, audit accuracy or a KC (spine §8.1).
7. **Phones.** Incidents work on a phone. Dropping and managing modules is laptop work, as on SCR-bench. A cached module runs on the device that holds it; on any other device the personal panel says "run this on your laptop".

### 3.2 The slots

| Slot | Your artifact (built in) | Joins | What it does in the world | Compared with | Naive baselines: seeded mutants of the reference | Honest limits |
|---|---|---|---|---|---|---|
| Checker (plug-in) | `miniplinth check` (LAB-4; S10.L3) | LAB-4 | Gates proposals: emits `Inv ∧ Guard ∧ Step ∧ ¬Inv′` for each proposed command, sends the SMT-LIB to INS-z3, decodes `sat` models into states and replays them in INS-interp. From LAB-7.5 it also runs paired-state checks of views by self-composition. | the reference checker ({{run:RUN-check-fragment}}), after filing | a frame conjunct dropped (SP-4.1); `unsat` reported without a premise witness (SP-4.4); every satisfiable inductive step called a bug (SP-4.3) | Solver results are uncertified. `unknown` fails closed: a proposal the checker cannot decide is never admitted on the checker's word (KC-1.unknown-fails-closed). |
| Compiler (plug-in) | Transfer to SQL with rowcount guards, typed errors, retries and a runtime (LAB-6.2–LAB-6.8; S10.L4) | LAB-6.2 | Runs every week's calls on PGlite from the canonical start state; their outcome classes are compared with INS-interp's. | the reference compiler | the read-modify-write compilation (SP-6.2); the rowcount check dropped, so a failed guard reads as success with 0 rows; the CASE self-transfer (SP-6.7); retrying 22003 | One connection [X RUN-pglite]; concurrency only from recorded histories or the learner's own `isorun` receipts. |
| Outbox machine (plug-in) | the sans-I/O machine (LAB-8.4; S10.L5) | LAB-8.4 | Dispatches every settlement under the week's seeded faults (INS-sim). | the reference machine, under the effects rules | a fresh key on every retry (SP-8.3); acknowledgement before the durable write (SP-8.4); replies accepted unvalidated | INS-sim is not authoritative; TLC trace validation on the Bench is. |
| Validator (plug-in) | the SQL validator (LAB-9.11) | LAB-9.11 | Checks every compiled plan before it runs. | the reference translation validator ({{run:RUN-tv-reference}}) | shape-only validation (SP-9.2); agreement on one database standing for equivalence (SP-9.4) | Per-command results are [T] · n or [M] · bound, never [P] for the compiler. |
| Front end and interpreter (attachment) | parser, typechecker and interpreter (LAB-3.8–LAB-3.10; S10.L1–S10.L2) | LAB-3 | Parses and typechecks every proposal; runs every week's calls beside INS-interp. | INS-interp and the reference front end | `Nat` balances (SP-3.3); an evaluator redefined to pass statement matching (SP-3.5) | INS-interp is itself a port (SEAM-13). |
| Read policy (attachment) | the Datalog read rule (LAB-7.2) | LAB-7.2 | Decides reads beside the course's policy; the week's access matrix is compared. | the reference matrix in INS-datalog | `in` written where overlap was meant; the team-share rule missing | Finite worlds; the bound is printed. |

The four plug-ins are the brief's (BRIEF §7.4). The two attachments reuse lab harnesses, LAB-3.c10's goldens comparison and LAB-7.c2's matrix comparison, so they cost little, and they come first in the world's cut order (§9.4).

---

## 4. The weekly incidents

Internally this is the docket (M-docket). On screen it is "‹n› incidents this week".

### 4.1 The week

- **Opening.** A week opens when the learner first opens the Clearinghouse in a new week of their own rhythm (*Set your week*, M-set-your-week). Its index k counts only the weeks the learner opened. A week the learner skips is never generated afterwards: there is no backlog, no overdue count and no welcome-back debt (M-welcome-back; B [silverman23]).
- **Size.** 1, 2 or 3 incidents. The default follows the planned hours, 1 at 6 h/week and 2 at 10 h/week (spine §3.0), selectable from 1 to 3 in *Set your week* [D], so SCR-week's computed Keep figure (spine §3.0) can count them. An erosion, when one fires, takes one of the week's slots.
- **Duration.** About 10–15 minutes per incident [D], replaced by learner-zero's logged times after W3. Nothing is timed.
- **Retirement.** An incident not filed by the time the next week opens is retired unscored. It counts toward nothing, and its seed is not reused. A call already made on it stays in the log, like any first call.
- **Order.** The learner picks the order and may stop after any incident.
- **Scheduling is not access.** The screen and the world are always open (I5). No week is scheduled before LAB-3, yet an early visitor may open one. A decision on a class not yet taught on the learner's path is first-contact practice and counts toward no audit-accuracy figure (AUDIT-DESK.md §5.1).

### 4.2 Composing a week

1. **The erosion slot.** Compute the learner's oldest open erodible seam, the open, unheld seam whose first planting event in the learner's record came earliest, ties broken by seam number, with SEAM-13–SEAM-15 excluded (spine §5.4), from the claim graph in the lab mirror and the events. If that seam's erosion has its second endpoint in the Clearinghouse and its first endpoint exists, the erosion takes a slot (§4.6). In edition 1 that is ER-12 alone; in every other week there is no erosion, and none is shown.
2. **Eligible families.** A family (§4.5) is eligible when its phase is scheduled, its gap classes are taught on the learner's path (AUDIT-DESK.md §5.1), it is erosion-safe (below) and, for a component family, its slot exists; a reference module fills an empty slot, labeled.
3. **The mix.** The remaining slots alternate proposals and gap-class incidents [D], and every slot is a proposal while no gap-class family is eligible. Draws are weighted toward classes due for review and away from the current stage; once two stages are done, at most half of a week's incidents come from the current stage (AUDIT-DESK.md §5.3).
4. **The member.** Each scored incident is sound or flawed by the share rule of AUDIT-DESK.md §5.2. For each block of 10 scored incidents a seed gives u in [0, 1) and p = 0.30 + 0.30·u, and each incident is sound with probability p, drawn independently: feedback follows every incident, and an exact count per block would let the last ones be inferred. The screen states the range, never p. The two members of a pair never share a block; offered evidence comes from one phrase bank; sound and flawed members' diffs are matched in length, so length does not cue the key (AUDIT-DESK.md §7.2's longest-diff-is-flawed); lists name counts and subjects, never a gap (AUDIT-DESK.md §5.3).
5. **Admission.** An instance drawn from its seed is admitted only if the reference produces a key (no `unknown`) and, for a gap-class family, the naive baseline misses the bar while the reference meets it on that very instance (§4.4). Otherwise the next derived seed is tried, up to a fixed bound [D]. A family that finds no admissible instance is skipped that week, and the skip is logged for the gates.

**Erosion-safe composition.** The world never serves the cracking specimen of a lesson-hosted erosion, or a variant of its class, before that erosion has fired, or, on the builder's path, before the specimen is already in the learner's record. Serving it early would fire the erosion in the world and spoil its forecast.

| Held back | Until | Erosion |
|---|---|---|
| balances near 64-bit bounds; a step the database refuses with 22003 [X RUN-pg-anomalies] | S6.L4 · SP-6.4 | ER-1 |
| a double spend between two sessions | S5.L3 · SP-5.1 | ER-2 |
| a shared view that reveals a private field | S7.L7 · SP-7.1 | ER-3 |
| a crash between the provider's acceptance and the acknowledgement | S8.L3 · SP-8.1 | ER-4 |
| a write hoisted above its guard | S9.L7 · SP-9.1 | ER-5 |
| a solver's wrong answer, replayed | S4.L9 · SP-4.5 | ER-7 |
| a compiled view that leaks through size or timing | S9.L9 · SP-9.6 | ER-10 |
| agreement on one database standing for a rewrite | S9.L8 · SP-9.4 | ER-11 |
| a liveness check that passes only with crashes off | never in the world: it checks no liveness | ER-8 |
| a stale replica | never in the world: it has no replicas | ER-9 |

ER-6 (`Nat`, S3.L7) has fired before scored weeks begin. Once an erosion fires, its class becomes eligible, and the world's incidents test the remedy the learner chose; for ER-1 that is a bounded semantics, `Except Overflow`, or `numeric` with a stated bound.

### 4.3 Proposal incidents

**The generator.** One generator serves the world's proposals and LAB-10.4's draw (`curriculum/S10-assembly.md` §3.2): GEN-spot-the-gap's twin machinery applied to proposal twins, each a reference change plus a correct claim. A draw keeps the twin sound, possibly rewritten without changing its meaning, or applies one operator. Every proposal parses and typechecks under the reference front end. The agent's offered evidence ("k tests green", "Z3: unsat", "Lean accepted it") is drawn independently of soundness, so no wording predicts the key. Evidence that cites Lean arrives with a receipt computed at build time (comparator and `#print axioms`, recorded in CI), because the tab runs no Lean. No language model runs anywhere, and the screen says that the agent is a seeded mutation generator.

**What proposals change, by phase.** The class of a flawed proposal follows the evidence it offers (S10-assembly.md §3.2), and a class is served only once it is taught.

| Phase | Proposals change | Sound examples | Flawed examples |
|---|---|---|---|
| ledger | guards, operations, new commands; sequences from S4.L3 | add `!frozen(from)` to Transfer's guard; a claim proved over a query that omits the guard, which only strengthens it (AUD-4.2's sound twin); a guarded refund | a refund via `deposit`, whose invariant proof goes through while "credits enter only at setup" breaks (G1: the statement is too weak for the requirement); an `unsat` over contradictory premises (G2); a change that edits the rule its own proof is checked against (G8a); a CTI answered by "fixing" a correct command (G13, from S4.L6); per-leg guards that overdraw when both legs name one account (from S4.L3, refuted by a witness) |
| traffic | compilation patterns, isolation levels, retry policies | debit and credit in ascending account order; log `RETURNING` old and new balances (S06) | one CASE statement "to save a round trip" (SP-6.7); "set the pool to READ COMMITTED for throughput" (G6e, AUD-6.3's shape); "retry 22003 too" (G7, after ER-1) |
| access | sharing rules, view fields, observers | a view that drops a field nobody reads | a field added to a shared view (G10, after ER-3); "no tenant can ever observe any change in another tenant" (G12, AUD-7.2) |
| effects | retry policies, ordering, reply handling | persist the reply, keyed by the intent, before acknowledging | a fresh key per retry (SP-8.3, G7); "exactly once via the outbox" (G7, AUD-8.1) |
| plans | plan rewrites and validators | merging two statements, with an equivalence the reference validator confirms | "results match on one database" (G11, after ER-11); a validator that checks shape, not meaning (SP-9.2, G11) |

**The flow** is the Audit Desk's five steps (spine §6; AUDIT-DESK.md §5.4), with the world's tools in the middle.

1. **Call the claim alone.** The card shows "An agent proposes:" with the claim as quoted UNREVIEWED text and the offered evidence, unstamped. The learner calls sound or gap with a confidence tap; chance (1 in 2) is printed and the payoffs are feedback only (M-call-it).
2. **Reveal the change** as a diff in the roadmap's toy syntax, with the tools: "Run your checker", "Run it in the world" (INS-interp on a state the learner builds or picks from the week), Z3 (INS-z3) and, in later phases, the compiler, outbox machine and validator slots. Every tool result shows its lane badge (*re-checked here* for tab runs) and its bound.
3. **"This proves: ___"**: one uncredited line, then multiple true/false over about five scenarios (GEN-call-it, template 4), each evaluated by the world's engine at grade time.
4. **Pick a gap class**, G1–G13 or "none: sound", with nothing preselected.
5. **Anchor typed evidence** to one to three lines: a witness that replays, a trace, a state pair, a scenario the claim permits and a rule forbids, or the stamp the method actually earns.

**After filing.** The learner sees counts split by truth, never a pooled score (AUDIT-DESK.md §5.5); the key and the reference pipeline's verdicts with their lanes; their own slot results beside the reference's, any divergence marked as a defeater; the other member of the pair, side by side (M-twins); and a replay of the decision in the world. For a flawed proposal, "If admitted" runs it over the week's traffic and the reference witness and draws the first step at which a rule fires, in heavy vermilion; for a sound one, the replay shows the reference proof or check with its bound.

**What persists.** A sound proposal the learner admitted joins the world's command set from the next week, replacing the command it edits, within a fixed cap on commands [D]: the world grows by the learner's own correct decisions. A flawed proposal the learner admitted is replayed and never adopted, and its replay can be kept as a specimen. A rejected proposal is not adopted. The world never carries a known flaw forward, so a wrong decision costs one replay, never a damaged world.

### 4.4 Gap-class incidents

A gap-class incident is an event in the world, aimed at one slot and one or two gap classes: traffic, a recorded history, a fault schedule, a probe of a view, or a plan rewrite. It is kernelspace's adversarial scenario in the roadmap's nouns.

- **The bar.** A pass bar on a component's run under the event, printed with its bound: for example, "the provider charged each command at most once over n fault seeds", or "outcome classes equal INS-interp's on every call this week".
- **Proven against two baselines.** The naive baseline, a seeded mutant of the reference module that embodies the family's gap class, misses the bar; the reference module meets it. Both hold on the family's fixed seed set in RUN-docket-baselines, and again on each instance at admission, because the baselines are re-simulated on every graded seed (kernelspace's seed hygiene [ks100x]; "calibrated by seeded mutants", digest review 1, D22). No bar is guessed.
- **The scored part.** A claim about a component's behavior under the event, shown with that component's diff against the reference. The component is either the reference (the sound member, possibly rewritten without changing its meaning) or the naive baseline (the flawed member), by the share rule of §4.2. The learner judges it in the five steps of §4.3 and may run the shown component under the event: its raw outputs appear as tables, without the rules' flags, which appear only after filing. A course-authored claim under audit renders as quoted text and is never stamped, the rule I8 gives agents.
- **The personal part.** The learner's own component runs under the same event against the same bar, at any time if it is plugged in, and only after filing when the slot is empty and the reference would run (§3.1, item 4). The panel reads "Your outbox machine met the bar on ‹n› fault seeds", or names the step at which it missed. A miss is a specimen candidate with its seed, event and module hash; the learner can keep it, and it can defeat a claim in their repo. An optional prediction before the run is shown back and never logged as evidence, because a learner whose component already matches the reference could always predict "met".

Why two parts: the scored judgment needs a key that does not depend on the learner's own component (I3), and the persistent-world pattern needs the learner's component to meet the world's traffic. Keeping the two apart gives both.

### 4.5 Families

Edition 1 ships the families marked "1"; the families marked "later" are the world's cut list (§9.4). Every family carries KC tags (GATE-kc), and no tag names a KC taught after the family's first eligible lesson.

| Family | Phase · slot | Event · bar (bound printed) | Naive baseline | Classes (anchors) | KCs | Eligible from · ships |
|---|---|---|---|---|---|---|
| Gate batch | ledger · checker | a batch of proposed commands · every satisfiable obligation reported [R] with a witness that replays, every `unsat` reported [P] with a satisfiable premise witness, no `unknown` admitted | a frame conjunct dropped (SP-4.1); vacuity-blind (SP-4.4) | G8 (AUD-4.1), G2 (AUD-1.1) | KC-4.vc-shape, KC-4.frame-condition, KC-1.non-vacuity-check | S4.L5 · 1, W3-T14 |
| CTI or reachable | ledger · checker | an invariant whose inductive step is satisfiable · "inductive", "CTI", "REACHABLE in k" or "none within N", matching the reference, bound printed | every satisfiable step called a bug | G13 (AUD-4.3), G5 | KC-4.cti-or-bug, KC-4.invariant-vs-inductive | S4.L6 · 1, W3-T14 |
| Differential | traffic · compiler | the week's calls, edge cases included · outcome classes equal INS-interp's on every call | the rowcount check dropped; the CASE self-transfer (SP-6.7) | G10 (AUD-6.2), G11 (AUD-6.1) | KC-6.differential-testing, KC-6.rowcount-as-guard, KC-6.null-guards | S6.L3 · 1, W4-T14 |
| Compiled concurrency | traffic · compiler (personal part by `isorun` receipt) | a recorded two-session history at an isolation level · the committed outcome is serializable (INS-history, bound printed) | read-modify-write at READ COMMITTED | G9 (AUD-5.4), G6e (AUD-6.3) | KC-6.compilation-pattern, KC-6.anomaly-isolation | S6.L6 · 1, W4-T14 |
| Access matrix | access · read policy | the week's shares, revocations and membership changes · the matrix equals the reference derivations for every user and document | `in` for overlap; the team-share rule missing | G8, G12 | KC-7.policy-as-datalog, KC-7.policy-checking | S7.L3 · 1, W4-T14 |
| Observer | access · checker (paired states) | a view, and pairs of states that differ only in another tenant's private data · no pair told apart beyond the declassified fields (INS-pairs, finite domain) | an observer that sees the body only and misses a count channel (SP-7.2) | G10 (AUD-7.1), G3a | KC-7.observer-equivalence, KC-7.side-channels, KC-7.hyperproperty | S7.L6 · 1, W4-T14 |
| Duplicate and late replies | effects · outbox machine | duplicated replies, and timeouts that fire before slow replies · at most one charge per command, and late replies rejected with the loss stated | a fresh key per retry (SP-8.3); replies unvalidated | G7 (AUD-8.1) | KC-8.at-least-once, KC-8.idempotency-keys, KC-8.untrusted-replies | S8.L4 · 1, W5-T13 |
| Crash windows | effects · outbox machine | a crash in each crash window · no committed intent lost, and acknowledgement only after the durable write | acknowledgement before the durable write (SP-8.4) | G8 (AUD-8.2), G7 | KC-8.crash-windows, KC-8.commit-not-send | S8.L3, after ER-4 · 1, W5-T13 |
| Provider horizon | effects · outbox machine | an outage longer than the provider's retention · no second charge for a command whose retries stayed within the stated horizon, and every command past it reconciled by key or reported as a stated loss | unbounded retries with a stable key | G7 | KC-8.provider-horizon | after ER-12 · 1, W5-T13 |
| Plan validation | plans · validator | compiled plans with rewrites · every non-equivalent plan rejected with a distinguishing instance that replays through both semantics, every equivalent plan accepted | shape-only validation (SP-9.2); one-database agreement (SP-9.4, after ER-11) | G11 (AUD-9.2) | KC-9.sql-equivalence, KC-9.translation-validation | S9.L8 · 1, W5-T13 |
| Interpreter agreement | ledger · front end and interpreter | the week's calls with S3.L7's edge cases · outcomes equal INS-interp's under the declared policy | `Nat` balances (SP-3.3) | G4 (AUD-3.2) | KC-3.edge-cases-as-decisions, KC-3.nat-truncation | LAB-3 · later |
| Interleaving scenes | traffic · none (TLC state graphs) | two sessions running Transfer at a split granularity · no overspend in the explored graph, constants printed | the read/check/write split (SP-5.5) | G9, G5 (AUD-5.3) | KC-5.interleaving-granularity | S5.L3, after ER-2 · later |
| Retries | traffic · compiler | 40001, 40P01 and 22003 outcomes from recorded histories [X RUN-pg-anomalies, RUN-pg-claims] · whole-command retries on 40001 and 40P01 only, attempts logged by SQLSTATE, 22003 never retried | retry everything; retry 40001 only | G7 | KC-6.serializable-retries, KC-6.overflow-refusal | S6.L7, with 22003 after ER-1 · later |
| Leaky field | access · checker | a field added to a shared view · no field outside the declassification record reaches another tenant | the leaky view (SP-7.1) | G10, G12 | KC-7.declassification | after ER-3 · later |
| Revocation | access · none | a revocation after a delivered read · "after revocation, no new read succeeds" holds on the trace, and no claim says that revocation removes what was read | LAB-7.6's refuted twin | G3 | KC-7.revocation-past | S7.L8 · later |
| Hoisted write | plans · validator | an optimization that hoists a write above its guard · the plan is rejected with a counterexample | the hoisted plan (SP-9.1) | G8, G11 | KC-9.bad-optimization | after ER-5 · later |
| Abort-blind observer | plans · none | a source run that aborts beside a target run that commits · the observations include aborts | an abort-blind observer (SP-9.3) | G10 (AUD-9.1) | KC-9.observations | S9.L4 · later |

### 4.6 Erosions

- **The rule.** Erosions come only from the learner's oldest open erodible seam, never from the calendar, and only when both endpoints exist (BRIEF §7.4; spine §5.4). The world computes the seam when a week opens (§4.2, step 1).
- **Edition 1 has one world erosion, ER-12.** SEAM-12, "every copy of every attempt is delivered or dropped before the provider can forget the key", is planted by CL-8.2's provider-horizon clause, written in LAB-8.8. ER-12 fires in the first week the learner opens in which SEAM-12 is their oldest open erodible seam. On both published paths that is after S9, once ER-5, ER-10 and ER-11 have cracked the older SEAM-5, SEAM-10 and SEAM-11 (spine §3.10). Meeting SP-8.5 as a dated incident in S8.L7 does not cash ER-12; the world week does (spine §5.4).
- **The incident, in five beats.**
  1. *Forecast first* (M-erosion-forecast): "Restate your claim from memory, then call which segment cracks." The learner may skip; a skip records nothing and blocks nothing.
  2. *The week plays.* The provider is down for longer than its retention, in ticks. Whatever the machine does next (yours, or the reference if the slot is empty), whether it retries after the provider has forgotten the key and is charged a second time, stops retrying while the charge's fate is unknown, or reconciles by key, the assumption that every copy of every attempt is delivered or dropped before the provider can forget the key has failed in this world. That failure is the crack, so the incident works whichever machine runs.
  3. *The crack.* SCR-claims draws the vermilion zig-zag on CL-8.2's assumption record, and claims that rest on it show the hairline "rests on a cracked seam" (ARCHITECTURE.md §8.6). The run exports as NDJSON for the Bench.
  4. *Remedies* (spine §5.4): bound the retry horizon; reconcile by key; state the loss. The learner revises the machine and the claim in their repo; the new card supersedes the old one, which stays in the erosion log.
  5. *Afterwards* the provider-horizon family (§4.5) tests the remedy in later weeks.
- **Weeks without an erosion** show none. The world never shows a seam's planned fate or the lesson that will test it, so forecasts stay predictions.
- **Later editions** may host more erosions in the world. Each must name both endpoints, a forecast item and a remedy card (GATE-erosions), and none may pre-empt a lesson-hosted erosion.

### 4.7 Scoring and evidence

| Event | Kind (spine §8.2) | Counts toward | Data the world adds |
|---|---|---|---|
| the call in step 1 | `call` | calibration in the Mirror; the tagged KCs, when own and unseen | `surface: "clearinghouse"`, `week`, `weekSeed`, `family` |
| a filed finding | `audit` | audit accuracy and the tagged KCs, when own and unseen and the class is taught | the above, plus `member` (sound or flawed), `decision` and `plugins` (module hashes) |
| the ER-12 forecast | `call`, ref `ER-12/forecast` | calibration; KC-8.provider-horizon | `week` |
| a component run, a replay, a specimen kept | none | nothing: claims and specimens live in the repo | — |

- **The same rules as every surface.** A Clearinghouse finding is scored as a Desk finding is (AUDIT-DESK.md §6): a verdict, a class and evidence that validates. Audit accuracy is balanced accuracy with the interval AUDIT-DESK.md §6.5 assembles, and per-class figures appear only from n ≥ 10. Every `audit` event records its surface, so a display can split the world from the Desk, read descriptively for one learner (AUDIT-DESK.md §6.4).
- **KC tags.** Each family's KCs (§4.5). KC-10.agent-proposal-triage joins proposal incidents once S10.L6 is in the record, and never earlier (GATE-kc's order check).
- **Provenance** is self-declared and weighted as in spine §8.2: own and unseen 1.0; assisted, for example with a context packet for the learner's own agent, 0.3; agent 0. The copy says that provenance calibrates rather than polices (OD-8).
- **Blind strategies.** GATE-audit-blind drives the real composer and scorer over simulated Clearinghouse streams on both published paths (AUDIT-DESK.md §7) with always-accept, always-reject, last-is-sound, topic-is-class, longest-diff-is-flawed and the offered-evidence cue; each must stay within chance + 2 SD.
- **The raw-verdict judge.** RUN-docket-baselines also records a naive judge that admits exactly what the reference checker's raw verdict and the offered evidence support. It is a measurement, not a gate. A family on which this judge is never wrong teaches only "run the checker", so the composer leans toward families in which vacuity, encoding, bounds or requirement-fit decide the case.

### 4.8 RUN-docket-baselines and the gates

{{run:RUN-docket-baselines}} records, for each shipped family, the generator revision, a fixed seed set, the naive baseline's and the reference's result on every seed with its bound, and the admission rate; for proposal families it records the reference keys and the raw-verdict judge's verdicts instead. It also records a canonical week's replay hash and replay time on the reference modules, and the versions of every engine involved. W3-T14 records it; W4-T14 and W5-T13 extend its families and re-record it; a tool bump re-runs it and opens a reviewable diff (GATE-runs).

| Gate | What it checks for the world |
|---|---|
| GATE-runs | `{{run:RUN-docket-baselines}}` resolves, and is re-recorded on every tool bump |
| GATE-generators | incident makers are pure; a canonical week replays to the same hash in Chromium, Firefox and WebKit; the determinism lint holds on the world's seeded paths |
| GATE-audit-blind | blind strategies stay within chance + 2 SD, Clearinghouse incidents included |
| GATE-audit | nightly, every shipped family's naive baseline misses its bar and its reference meets it on the recorded seeds |
| GATE-erosions | ER-12 fires by the oldest-open-erodible-seam rule on both published paths; its forecast item and remedy card are present |
| GATE-labs | plug-in smoke tests: each slot runs its lab's reference module over a canonical week and reproduces the recorded hash |
| GATE-stamps | world results derive their stamps by spine §8.8, with its world rows; quoted claims carry none |
| GATE-lessons, GATE-privacy | learner copy uses glossary terms and no internal names; no private-design terms and no real names |
| GATE-a11y | SCR-clearinghouse passes at 360, 320 and 1280 px |
| GATE-numbers | no untagged tool number in the world's copy |

---

## 5. Determinism and seeds

**Inputs.** A week is a pure function, week(inputs) → (canonical states, traffic, faults, incidents, keys), with no inputs beyond these:

| Input | Source | Recorded in |
|---|---|---|
| edition seed | a public constant per edition; it generates the standing world (tenants, accounts, setup grants, teams, users, documents and the provider's parameters) | the course content and RUN-docket-baselines |
| scheduled phases | the lessons and labs in the learner's record when the week opens | the week's events, which list them |
| week index k | the number of weeks the learner has opened | derived from the events |
| week seed | `crypto.getRandomValues`, a uint32 drawn when the week opens | every event of the week |
| block seed | drawn at the first scored incident of each block of 10 (AUDIT-DESK.md §5.2) | that incident's event |
| adopted proposals | the sound proposals the learner admitted in earlier weeks | their `audit` events |
| module hashes | the SHA-256 of every learner or reference module that ran | the events |
| engine versions | INS-interp, PGlite, Z3 on Pyodide, the provider simulator and the Lane A host's ABI | the events, as engine@version |
| the oldest open erodible seam | the claim graph in the lab mirror, plus the events | derived; the erosion's events name it |

**Rules.**

1. **Pure and derived.** Nothing about the world is stored (I2); the screen recomputes a week from its inputs.
2. **Seeds at grade time.** The week seed is drawn when the learner opens the week, so its instances are unseen until then. Derived seeds come from the vendored seeded RNG, one stream per purpose (traffic, faults, families, members), keyed as hash32(week seed, purpose, slot, attempt), so adding a family never shifts another stream [D]. The RNG is swept for degenerate seeds, kernelspace's seed-hygiene lesson [ks100x].
3. **Exact arithmetic.** Credits are integers, exact at any size, so amounts near 64-bit bounds behave identically in every engine. Seeded paths use no floating point and no transcendental functions, and no `Math.random`, `Date.now` or `new Date(` (the determinism lint, ARCHITECTURE.md §13.2).
4. **Three engines.** The same inputs give the same week in Chromium, Firefox and WebKit (GATE-generators; kernelspace's "same hash in three browsers").
5. **A chained canon.** Week k starts from week k−1's canonical end state, and every event of a week records that state's hash.
6. **Replay, and change made visible.** Any recorded week replays from its events. If an engine bump changes a replayed hash, the world says so with a change card ("this week was recorded on ‹engine@old›; ‹engine@new› replays it differently") instead of silently rewriting history (M-change-cards).
7. **Unseen, not secret.** The world's code, generators and oracles are public. A determined learner can compute keys ahead of time, and SCR-assurance says so (spine §8.9).
8. **No calendar.** Dates label weeks for the learner and never enter a seed or a rule.

---

## 6. UI surfaces

### 6.1 Where the world appears

| Surface | What the world puts there | Phone |
|---|---|---|
| SCR-today | one card, "‹n› incidents this week", with the action Open; it names no class, member or gap | yes |
| SCR-clearinghouse | the week, its incidents, the world and what is plugged in | yes; plug-in management on a laptop |
| SCR-audit's components | the five-step finding flow, embedded in each incident | yes |
| SCR-claims | ER-12 in the erosion log with its blast radius; defeaters raised by divergences | yes |
| SCR-specimens | specimens kept from the world, labeled "found in: the Clearinghouse, week ‹k›, seed ‹s›" | yes |
| SCR-week | the chosen number of incidents, inside the computed Keep block | yes |
| SCR-bench | dropping modules; importing `isorun` and trace-validation receipts | no |
| SCR-assurance | what the world rests on: SEAM-13, PGlite's single connection, recorded histories, RUN-docket-baselines | yes |

### 6.2 SCR-clearinghouse

- **Header.** "Week of ‹date› · ‹n› incidents" (DESIGN.md), with a plan sentence such as "2 incidents · about 25 minutes", never a backlog.
- **Incidents.** One card each, labeled in plain words: "An agent proposes a change", "This week in the world" or "An erosion". A card shows its subject, such as "a hold timeout" or "Transfer's compiled SQL", and its state (new, called, filed), never a class.
- **What is plugged in.** One row per slot: "Your checker · LAB-4 · ‹first 8 hex digits of its hash›", or "reference module, earns nothing", or "not built yet"; last week's agreement with the course's semantics as a count with its n ("agreed on ‹a› of ‹n› calls"); and, on a laptop, "Use a new build". A small schematic in solid line shows the slots in pipeline order (front end, checker, interpreter, compiler, validator, outbox machine), each box labeled with its status in words.
- **The world.** Sections, each a table, each number live with its run line (engine@version · seed · n):
  - *Ledger:* accounts by tenant (balance, frozen); holds (owner, amount, status).
  - *Traffic:* step · session · call · outcome · effects.
  - *Access*, from S7: users, teams and roles; documents and shares; the week's access matrix.
  - *Provider*, from S8: requests, replies, charges, the provider's keys, outages.
  - *Plans*, from S9: each compiled plan and its validator verdict.
- **About this world**, one tap away and repeated on SCR-assurance:
  - "The agent here is a seeded mutation generator. No language model runs."
  - "The world runs on the course's port of the Mini-Plinth semantics. For the ledger, the port agrees with the Lean reference on ‹n› kernel-checked goldens: TESTED [T] · ‹n› goldens. The access and provider layers have no Lean reference; other engines check them."
  - "PGlite runs one connection, so concurrency here comes from histories recorded on PostgreSQL."
  - "Each incident's bar is proven to break a naive version and spare the reference."
  - "Erosions come only from your oldest open seam."
  - "Nothing here leaves your device unless you export it."
- **Desktop (1280 px).** Three columns: the incidents (main), the world (side) and what is plugged in (side), as in DESIGN.md.
- **Before LAB-3.** "Nothing of yours is plugged in yet. Incidents begin after LAB-3." The world stays open to browse (see §10 on DESIGN.md's current wording).

### 6.3 An incident, panel by panel

**A proposal.**

| Step | Panel | Learner copy (examples) |
|---|---|---|
| 1 | the claim alone | "An agent proposes:" ‹claim› "UNREVIEWED" · "Offered: ‹evidence›" · "Sound or gap?", with *guess*, *think so* and *sure*; "chance: 1 in 2" |
| 2 | the change and the tools | the diff; "Run your checker"; "Run it in the world"; "Open Z3" |
| 3 | restatement | "This proves: ___"; five scenarios, each true or false |
| 4 | the class | G1–G13 and "none: sound", with nothing preselected |
| 5 | the evidence | select one to three lines; attach a witness, trace, pair or scenario |
| after | the reveal | "sound: ‹a› of ‹b› accepted · flawed: ‹c› of ‹d› found, ‹e› with the right class and evidence"; the key; "If admitted:" and the replay; the other member of the pair; "Keep as a specimen"; for an admitted sound change, "Joins the world next week" |

**A gap-class incident** differs at three points. Step 1 reads "This week in the world: ‹event›" and "A claim about it:" ‹claim›. Step 2 shows the component's diff and "Run it under this week's event", with tables and no rule flags. After filing, the rules' flags appear on the trace, and the personal panel runs "your ‹component›" under the same event against the same bar.

**An erosion.** "Restate your claim from memory, then call which segment cracks" (Forecast · Skip); then the week's run, with the crack; then "Remedies: bound the retry horizon · reconcile by key · state the loss".

### 6.4 Copy, look and access

- **Words.** Glossary terms and plain English only; never docket, lane, Judgment, Shelf, pocket checker, telescope, Hall of Records or proof debt (GATE-lessons). Lane badges read *re-checked here*, *reported from your machine* and *self-assessed*. No streaks, counters, overdue marks, red badges, deadlines or loss framing; reference modules are labeled "earns nothing".
- **Stamps.** `WORD [code] · qualifier`, bound first for [M] and [T], and derived from runs only (GATE-stamps). Agent claims and claims under audit are quoted text.
- **Lines** keep the course's one meaning each (spine §0): solid for structure (tables, the schematic); dashed only for an assumption, such as the provider's idempotency as [A] or a seam; dotted only for a bound; heavy vermilion only for a witnessed violation, the first step at which a rule fires; and the vermilion zig-zag only for ER-12's crack.
- **Motion** only for change: the replay's step cursor and the crack's propagation, both of which become static +/− marks under reduced motion.
- **Access.** Traces are tables with headers; every control is reachable by keyboard; targets are 44 px; calls and classes use native radios; WCAG 2.2 AA holds at 360, 320 and 1280 px (GATE-a11y). There are no illustrations, avatars or story art, the decoration the brief rules out (BRIEF §3.3: immersive 3D [wu20]).

---

## 7. What the world deliberately does not do

| It does not | Because |
|---|---|
| run on a server, keep accounts, send telemetry, rank learners, or compare one learner with another | zero servers and no comparison across learners (spine §0, §2.3) |
| run a language model, grade with one, or generate items with one at run time | BRIEF §3.3; spine §8.1 |
| lock anything, schedule debt, or punish a skipped week | I5; resumption is designed, never debt (M-welcome-back) |
| move status for browsing, running components or meeting a bar | I1; claims are not evidence (spine §8.1) |
| sign anyone off | sign-off belongs to the Defence (spine §8.6) |
| simulate concurrency it cannot check | PGlite serializes sessions [X RUN-pglite]; concurrency comes from recorded histories and TLC state graphs |
| show a number it did not just compute or cannot cite | I4 |
| keep world state | I2 |
| use wall-clock time, or fire anything by date | erosions come from seams, not the calendar (BRIEF §7.4) |
| fire a lesson's erosion early | erosion-safe composition (§4.2) |
| check liveness | a finite week cannot establish it; liveness stays [M] from TLC, with recovery as [A] |
| model replicas, caches, devices, prices or deployment | they are not roadmap nouns, or the roadmap defers them (§2.9) |
| contain "your system" | the private overlay is separate and local (M-overlay); nothing from it enters the world |
| promise far transfer | near transfer only (A/B [sala19][grossman11]) |
| replace labs, the Audit Desk or the Defence | it is 1–3 incidents a week inside the Keep block |
| tell a story | no characters, narrative or illustration; tables and traces only |

---

## 8. Evidence

The world is a precedent-graded mechanic (spine §7: M-docket, D · Prec). kernelspace's Fleet and its siblings' worlds are the precedent, and no study measures a persistent world in formal-methods teaching. What the world delivers is graded by its parts (BRIEF §3.2; the pedagogy digest):

| What the world does | Principle | Grade | Source |
|---|---|---|---|
| weekly findings on flawed and sound claims, each class served after its lab | erroneous examples, which help only with prior knowledge | A (small) | [alemdag25] |
| the naive and the reference side by side, the principle after the comparison | contrasting cases | A | [alfieri13] |
| a call before each reveal | retrieval and prequestions; confidence as feedback only | A; C for CBM as feedback | [rowland14][pan18][sthilaire23]; [cbm][baldiga14] |
| incidents spread across weeks | spacing | A | [latimier21][cepeda08] |
| gap classes mixed after their labs | interleaving within confusable set C | A | [brunmair19] |
| layered feedback, the witness first | elaborated feedback | A | [vdkleij15] |
| a witness together with its class, never a minimal witness alone | class hints | B/C | [dantoni15] |
| the replay of an admitted flaw, kept as a specimen | error management | A/B | [keith08] |
| no locks; counts as information | informational rewards | A | [deci99][kulik90] |
| skipped weeks never return as debt | a repairable rhythm | B | [silverman23] |
| the learner's own components meeting the world's traffic | near transfer | A/B | [sala19][grossman11] |
| the erosion forecast | precedent only | D | M-erosion-forecast (spine §7) |
| the world as a whole | precedent only | D | kernelspace's Fleet [ks100x] |

The median effect across 747 education RCTs is 0.10 SD [kraft20]; nothing here adds up to more, and no copy promises more. Edition 1 adds no keep/kill comparison for the world, because W0-T07's rules are fixed before any data exists; the per-surface split of audit accuracy is read descriptively, for one learner.

---

## 9. Build phases

### 9.1 Tasks

| Task | Size · model · review h | Depends on (spine) | Builds | Acceptance |
|---|---|---|---|---|
| W3-T14 Clearinghouse v0 | M · opus · 1.5 | W2-T08, W1-T17, W3-T04 (whose reference checker keys the gate families) | the standing world from the edition seed; the ledger phase; canonical replay with week hashes; the checker slot; the front end and interpreter attachment; the shared proposal generator in the ledger's nouns; GEN-spot-the-gap variants in the world's nouns; the gate-batch and CTI-or-reachable families; SCR-clearinghouse v0, its Today card and the "about this world" panel | GATE-audit-blind with the incidents; GATE-generators on a canonical week in three engines; {{run:RUN-docket-baselines}} recorded (GATE-runs); GATE-labs smoke tests for the checker slot and the attachment; GATE-lessons and GATE-privacy on the world's copy; GATE-a11y on SCR-clearinghouse |
| W4-T14 Clearinghouse plug-ins: compiler, concurrent traffic, users, teams and documents | M · opus · 1 | W3-T14, W4-T03 (INS-history), W4-T04, W4-T06 (the reference compiler, a baseline), W4-T07 (INS-datalog), W4-T08 (INS-pairs) | the traffic phase (session labels, recorded histories); the compiler slot on PGlite; the access phase (S07's layer) with the read-policy attachment and the checker's paired-state check; the differential, compiled-concurrency, access-matrix and observer families | GATE-audit-blind on the new incidents; plug-in smoke tests in GATE-labs; RUN-docket-baselines re-recorded with the new families |
| W5-T13 Clearinghouse provider and validator plug-ins; ER-12 | M · opus · 1 | W4-T14, W5-T01, W3-T12 (the claim graph, which yields the oldest open erodible seam), W5-T04 and W5-T05 (the reference validator and LAB-9) | the effects phase (the provider simulator per S08 §1.1, seeded faults, NDJSON export); the outbox slot; the duplicate-replies, crash-windows and provider-horizon families; ER-12 by the oldest-open-erodible-seam rule; the plans phase, the validator slot and the plan-validation family | GATE-erosions: ER-12 fires on both published paths; GATE-audit-blind; RUN-docket-baselines re-recorded; the GATE-conformance row for the provider simulator |
| the Core (no task of its own) | — | W5-T07 | LAB-10.4 draws from the shared generator | W5-T07's acceptance |

The spine's review estimates for the three tasks (3.5 h in all) were set before revision 3 added the traffic phase and the validator slot to W4-T14 and W5-T13; those additions may need about another hour of review [D].

### 9.2 Order inside each task

1. **Content first.** The standing world, each family's naive baseline and bar, and the twins' claims are written as data, so review reads them before any code.
2. **Then the runs.** RUN-docket-baselines on the fixed seed sets. A family whose naive baseline meets its bar, or whose reference misses it, does not ship.
3. **Then the screen**, against DESIGN.md's SCR-clearinghouse.
4. **Then the gates.**

### 9.3 Risks

| Risk | Mitigation |
|---|---|
| the world thickens | the phase table (§2.2) is the scope; additions name their displacement (GATE-budget); the cut order below |
| a key leaks before filing | the slot rule (§3.1, item 4), held by a gate fixture in which no reference module may run on an incident's event before its `audit` event exists |
| a bar does not discriminate | admission per instance and RUN-docket-baselines; GATE-audit's nightly re-execution of every shipped family |
| PGlite drifts from PostgreSQL | GATE-conformance on single-session specimens; concurrency never comes from PGlite |
| the provider simulator drifts from S08's spec | the TLC trace-validation row in GATE-conformance |
| a richer domain adds scope the roadmap does not ask for | the noun list (§2.9), GATE-privacy and review |
| incidents crowd the week | the week's size follows the planned hours; logged times replace the 10–15-minute estimate |
| a phone lacks the learner's modules | incidents still work there; the personal part waits for the laptop |

### 9.4 The world's own cut order

If a wave's review total outruns its window (spine §13), cut inside the world, in this order, before touching anything else: (1) the read-policy attachment; (2) the "later" families of §4.5; (3) the front end and interpreter attachment's divergence display; (4) the plans phase and the validator slot, whose family moves to the Audit Desk as variants of AUD-9.2; (5) the compiled-concurrency family, whose histories stay in S6's lessons. Never cut the ledger phase with the checker gate and proposals, which is V2-25's core; the effects phase with ER-12, which GATE-erosions requires to fire; or GATE-audit-blind's coverage of the incidents. Any addition to the world names what it displaces.

---

## 10. Alignment with other documents

- **`curriculum/S06-correspondence.md`**, in its Clearinghouse plug-in paragraph, keys S6 incidents "by running the learner's components on the world's traffic". This document keys every scored incident by the reference pipeline (§4.4), because a key computed by the learner's own component is wrong exactly when that component is (I3); the learner's components drive the personal part only. S06's six example proposals fit §4.3's traffic row unchanged.
- **`curriculum/S08-effects.md`** labels its crash windows CW0–CW5, and **`curriculum/S07-secrecy.md`** numbers its read rules "rule 1" to "rule 3", so that neither collides with the wave IDs W0–W6 under the spine's ID conventions or reads like the hint rungs R0–R4. This document says "S08's crash windows CW1–CW5" (CW0 is the client-side ambiguous commit) and "S07's three read rules".
- **[DESIGN.md](DESIGN.md)**, SCR-clearinghouse's state before LAB-3: "Incidents begin once your interpreter joins, after LAB-3." This document schedules the first week after LAB-3 whether or not the learner's interpreter is plugged in, because a reference module fills an empty slot, so the copy should read "Incidents begin after LAB-3."
- **[ARCHITECTURE.md](ARCHITECTURE.md) §6.8** lists a week's inputs as the world seed, the week index, the module hashes and the learner's responses. §5 here splits the world seed into a public edition seed and week seeds drawn at grade time, and adds the scheduled phases, the engine versions and the oldest open erodible seam.

---

## 11. Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15); each item ends with its outcome.*

Things in `docs/spine/SPINE.md` (revision 2) that this document believes are wrong or incomplete, with a proposed fix for each.

1. **Plug-in ownership.** BRIEF §7.4 names four plug-ins (checker, compiler, outbox machine, validator), and §13 owns two of them explicitly: W4-T14 the compiler, W5-T13 the outbox machine. W3-T14's Implements and acceptance cells never name the checker gate, and its dependencies omit W3-T04, which delivers LAB-4's reference checker. No task implements the validator plug-in (LAB-9.11). The brief's second growth step, concurrent command traffic from recorded histories, is in no task's acceptance. GATE-links checks ownership only for the catalog IDs of §7, §9.1 and §10.1, so these gaps pass it. Proposed: name the checker gate in W3-T14 and add W3-T04; add the traffic phase to W4-T14; add the plans phase and the validator slot to W5-T13, with W5-T04 and W5-T05. *Revision 3: already resolved in the spine (§13 W3-T14, W4-T14, W5-T13).*
2. **Missing dependencies.** W4-T14 depends only on W3-T14 and W4-T04, yet its traffic and access layers need W4-T03 (INS-history), W4-T07 (INS-datalog) and W4-T08 (INS-pairs), and its compiler families need W4-T06's reference compiler as their reference baseline. W5-T13 should list W3-T12, which yields the oldest open erodible seam; it is earlier in the wave order, but ER-12 cannot fire without it. *Revision 3: already resolved in the spine (§13 W4-T14, W5-T13).*
3. **No gate proves the thresholds.** M-docket and W3-T14 promise incident thresholds "proven against a naive and a reference baseline", but GATE-audit-blind checks only blind strategies, and GATE-runs checks only that RUN-docket-baselines resolves and is re-run on a tool bump. Nothing fails when a family's naive baseline meets its bar or its reference misses it. Proposed: extend GATE-audit (nightly) to re-execute every shipped family on its recorded seeds. *Revision 3: already resolved in the spine (§11.2 GATE-audit, §7 M-docket).*
4. **One run for three tasks.** §9.5 assigns RUN-docket-baselines to W3-T14 alone, but W4-T14 and W5-T13 add families whose baselines must be recorded before they ship. Their acceptance cells should re-record the run, or the registry should split it by phase. *Revision 3: applied (§13 acceptance cells; §9.5); splitting the run by phase is declined, because one run is re-recorded as families are added.*
5. **ER-12 against the general firing rule.** §5.4 says that an erosion fires "when both endpoints exist in the learner's record", and ER-12's second endpoint names SP-8.5, which the learner meets in S8.L7 as a dated incident, just before LAB-8.8 writes the clause that plants SEAM-12. Read literally, ER-12 then fires at LAB-8.8, not in the world after S9 as §3.8, §3.10 and ER-12's own row intend. The spine should state that a Clearinghouse-hosted erosion's second endpoint is the world week, with SP-8.5 as the label of its witness, and that meeting SP-8.5 in a lesson does not cash it. ARCHITECTURE.md §8.6 already codes it that way. *Revision 3: already resolved in the spine (§5.4, ER-12, §3.10).*
6. **"Oldest open erodible seam" needs an order and a week.** "Earliest-planted" is ambiguous for SEAM-1, which is planted in S1.L3 and S1.L4 and carried by S2's claims, and for claims minted already cracked on the builder's path. Proposed: order seams by the first planting event in the learner's record, ties by seam number. The rule's "first week" also needs a definition. This document uses the learner's own week, opened on demand and never generated retroactively (§4.1), because a calendar week would put a date into an erosion rule. *Revision 3: already resolved in the spine (§5.4).*
7. **§8.8 has no rows for world results.** It needs three: a rule that stays quiet over n world calls earns at most [T] · n calls, never [P] or [M]; a rule that fires yields a witness, [R] · its length once it replays; and a course-authored claim under audit renders as quoted text with no stamp, as I8 rules for agents. GATE-stamps derives every stamp from §8.8, so without these rows it cannot derive the world's. *Revision 3: already resolved in the spine (§8.8).*
8. **SEAM-13's scope and the world's other engines.** SEAM-13 is INS-interp's agreement with the Lean reference on kernel-checked goldens, which exist for the S3 fragment. The world also runs INS-interp's S7 access extension, which has no Lean reference (S07's issue SI-8), and a TypeScript provider simulator for S8, which no gate checks. Proposed: scope SEAM-13 to the fragments its goldens cover, and add a GATE-conformance row in which the provider simulator's traces validate against S8's reference spec with TLC. Tab Datalog = Soufflé already covers the policies. *Revision 3: already resolved in the spine (§5.3 SEAM-13, §11.2 GATE-conformance, §13 W5-T13).*
9. **The sound share's wording.** M-docket and W3-T14 say "sound in a seeded 30–60% share". Feedback follows every Clearinghouse incident, so AUDIT-DESK.md §5.2 draws each serve independently with a seeded probability p in [0.30, 0.60] per block of 10, and a block's realized share can fall outside that range. The spine should say "sound with a seeded probability of 30–60%". *Revision 3: already resolved in the spine (§6 Pool, §7 M-docket, §13 W3-T14).*
10. **The Keep block counts incidents it never sizes.** §3.0's Keep computation includes "1–3 Clearinghouse incidents" but no incident duration and no default count. This document plans about 10–15 minutes per incident [D] and one incident a week at 6 h/week; the spine should state the assumed count for each planned-hours band (see also PLAN.md's spine issue 7). *Revision 3: already resolved in the spine (§3.0 Budget method); §4.1 here takes the spine's counts.*
11. **SCR-clearinghouse's phone column.** §10.1 marks it phone-first without qualification, but dropping and managing Lane A modules is laptop work, as SCR-bench's row says. The row should read: incidents phone-first, plug-in management laptop-only. *Revision 3: already resolved in the spine (§10.1 SCR-clearinghouse).*
12. **Erosions inside "1–3 incidents".** M-docket lists erosions among the week's 1–3 incidents without saying whether an erosion takes a slot. This document lets it take one, so a week never grows past the size the learner chose. *Revision 3: already resolved in the spine (§7 M-docket, §3.0).*

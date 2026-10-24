# R3: SMT, model checking, specification and simulation tools. Status and a pinned stack (as of 2026-10-21)

**Scope.** This report covers a narrowed set of topics. Executed spikes in `research/spikes/RESULTS.md` already verified three things, so they are not re-researched here:
- Z3 5.3.1, both the Python wheel and npm;
- the npm `z3-solver` requirement for threads and COOP/COEP headers;
- TLC 1.8.0 `-dumpTrace json`.

Where sibling dossiers already cover a topic, I cross-reference them rather than repeat them:
- **R2**: Verus, LLM cheat patterns;
- **R5**: cvc5 and Carcara as the course's certificate path; the Alloy 6.2.0 version;
- **R6**: TLA+ By Example, Spectacle, Forge and Alloy4Fun as *courseware*;
- **L2**: Alloy4Fun learner-error data.

This report adds tool **status, licences, construct coverage, and the honest in-browser vs local split**.

**Evidence tags.**
- **[checked]**: I read the primary artifact today. That means the GitHub REST API, repository files at a recorded commit, the official docs page, or the arXiv API.
- **[spike]**: executed on this machine on 2026-10-20 (RESULTS.md).
- **[second-hand]**: a search-engine summary or secondary source that I did not read in full.
- **[prior]**: my background knowledge, not re-fetched today. Verify it before it enters course copy.
- **[unverified]**: I could not confirm it.

---

## 1 Summary

1. **TLC has no stable release newer than v1.7.4 (2024-08-05).** v1.8.0 is a *rolling prerelease*, re-published as a nightly; the latest is 2026-10-20. Pin the jar by SHA-256 and vendor it, which its MIT licence permits. Do not pin by tag. [checked]
2. **Spectacle (MIT; formerly "tla-web") should replace v1's home-made "PlusCal-like DSL" explorer** as the in-tab TLA+ engine.
   - It is conformance-tested against TLC reachable-state graphs: 172 test specs, 142 with TLC graphs.
   - It checks invariants by BFS in a web worker, embeds in other pages, and shares traces by URL.
   - It has **no PlusCal and no fairness/liveness checking**, so liveness stays with TLC. [checked]
3. **Real TLC already runs in a browser tab.** The TLA+ project's own `tla-by-example` does it with CheerpJ 4.3 and a Java 11 runtime.
   - CheerpJ is commercial software. Its free Community Licence covers FOSS, personal and evaluation use only when the runtime is served from Leaning Technologies' CDN. **Self-hosting needs a commercial licence.**
   - So in-tab TLC must be opt-in, disclosed and online-only. It must never be the only path, and never the grader. [checked]
4. **Apalache now belongs to the TLA+ Foundation (under the Linux Foundation)** and ships about monthly (v0.62.4, 2026-10-12). It is the practical tool for *inductive* invariants, which makes it the bridge from Course 04 VCs to Course 05.
   - Quint moved to `quint-co/quint` (v0.33.0, 2026-09-28). It now runs "at Informal Systems" alongside a commercial product with a waitlist.
   - Its `quint-connect` crate replays model traces against Rust code. It is the closest off-the-shelf precedent for the course's model-to-code check. [checked]
5. **Trace validation is the industrial bridge from spec to code.**
   - Cirstea, Kuppe, Loillier and Merz turn it into constrained TLC model checking.
   - Microsoft's CCF, which powers Azure Confidential Ledger, binds TLA+ to C++ this way (NSDI 2025).
   - MongoDB found trace-checking against a highly abstract spec "impractical", but model-based test-case generation "highly successful" (VLDB 2020).
   - Course 08 should validate the learner's *own* simulator traces against their *own* spec. [checked]
6. **Relational modelling: run Alloy 6.2.0 on the Bench, borrow Forge's testing idioms, and use Alloy4Fun as a link-out only.**
   - Alloy needs Java 17+. Its LICENSE says the code is "CURRENTLY … UNDER MIT", with Apache-2.0 pending.
   - Forge v5.2 has the best pedagogy, but it needs Racket plus Java and is a different language.
   - Alloy4Fun is a Meteor + Java + MongoDB server, so it cannot be embedded in a zero-server course. [checked]
7. **Rust verification:**
   - **Kani 0.68.0** (2026-09-16) and **Verus** (2026-10-19) are healthy but stay deferred, as the roadmap says.
   - **Stateright** is in maintenance mode: 0.31.0, no push since 2025-07-27.
   - **madsim** is too: 0.2.34; its last commit (2026-02-16) was a dependency bump.
   - No lab should depend on either.
   - **turmoil** is active and grew simulated net and fs crates; turmoil-fs 0.1.0 shipped 2026-10-19. [checked]
8. **Deterministic simulation:** TigerBeetle's VOPR is the public exemplar, and its financial-ledger domain matches this course.
   - It is open source: "real code … network, storage and process faults, at 1000x speed … 24/7 on 1024 cores".
   - Antithesis is commercial; a $105M Series A was announced 2025-12 [second-hand].
   - Course 08's simulator should be the learner's own small seeded simulator.
9. **cvc5 1.4.2 (2026-10-08) emits Alethe proofs.** It covers EUF, linear arithmetic, bit-vectors and parts of strings, which is exactly the fragment `miniplinth check` produces.
   - Carcara has had no release since 1.1.0 (2023-08-29), but it has ≥100 commits in 2026. Pin it through cvc5's `contrib/get-carcara-checker`.
   - cvc5 1.4.0 added a Lean-written CPC checker, **Logos**; 1.4.1 removed LFSC.
   - I found no cvc5 WASM/npm build, so cross-checking is Bench-only. [checked]
10. **The honest split:**
    - **In the tab, self-hosted:** Z3 WASM, Spectacle (safety and traces), PGlite, and the course's TS Datalog evaluator.
    - **In the tab, opt-in, via the third-party CDN:** TLC through CheerpJ, including liveness. Possibly Alloy, but that is not yet spiked.
    - **Bench only, and authoritative:** TLC counts and receipts, Apalache, Alloy and Forge, cvc5 + Carcara, Kani/Verus, Postgres concurrency, and Rust simulators.

---

## 2 Findings

### 2.1 Version, licence and activity table

All rows [checked] on 2026-10-21. Sources:
- GitHub REST API (`gh api repos/<owner>/<repo>` and `/releases`); raw output kept in a local working file (not published);
- the crates.io API for crate versions.

| Tool | Latest | Date | Licence (GitHub SPDX) | Last push | Note |
|---|---|---|---|---|---|
| TLC / tla2tools (`tlaplus/tlaplus`) | v1.8.0, **prerelease** | 2026-10-20 | MIT | 2026-10-20 | Last stable tag is **v1.7.4, 2024-08-05** (then v1.7.3, same day; v1.7.2, 2022-02-02) |
| vscode-tlaplus | no GitHub releases | n/a | MIT | 2026-10-21 | active |
| TLA+ By Example (`tlaplus/tla-by-example`) | no releases | n/a | NOASSERTION | 2026-10-15 | HEAD `ec0cc03` |
| Spectacle (`will62794/spectacle`) | no releases | n/a | MIT | 2026-09-30 | HEAD `5827c22`; `will62794/tla-web` redirects here |
| Apalache (`apalache-mc/apalache`) | v0.62.4 | 2026-10-12 | Apache-2.0 | 2026-10-12 | v0.62.3 2026-10-01; v0.62.2 2026-08-26; v0.62.1 2026-08-19 |
| Quint (`quint-co/quint`) | v0.33.0 | 2026-09-28 | Apache-2.0 | 2026-10-13 | `informalsystems/quint` redirects here; org created 2026-05-07; previous release v0.32.0, 2026-03-31 |
| Alloy (`AlloyTools/org.alloytools.alloy`) | v6.2.0 | 2025-01-09 | NOASSERTION (see F13) | 2026-06-11 | previous release v6.0.0, 2021-11-04 |
| Forge (`tnelson/Forge`) | v5.2 | 2026-03-06 | MIT | 2026-07-22 | v5.0.0 2026-01-26 (breaking) |
| Alloy4Fun (`haslab/Alloy4Fun`) | no releases | n/a | MIT | 2026-02-20 | hosted service |
| Kani (`model-checking/kani`) | 0.68.0 | 2026-09-16 | Apache-2.0 | 2026-10-20 | 0.67.0 2026-01-16; 0.66.0 2025-11-06 |
| Verus (`verus-lang/verus`) | `release/0.2026.10.18.7d82994` | 2026-10-19 | MIT | 2026-10-21 | also daily `release/rolling/…` prereleases |
| Stateright | 0.31.0 (crates.io) | 2025-07-27 | MIT | 2025-07-27 | latest issue activity 2025-12-23 |
| madsim | 0.2.34 (crates.io) | 2025-10-11 | Apache-2.0 | 2026-02-16 | last commit: dependency bump |
| turmoil (`tokio-rs/turmoil`) | v0.7.2 | 2026-04-24 | MIT | 2026-10-20 | new crates: turmoil-net 0.1.0 (2026-05-04), turmoil-fs 0.1.0 (2026-10-19) |
| TigerBeetle | 0.17.9 (GitHub release) | 2026-07-06 | Apache-2.0 | 2026-10-16 | |
| P (`p-org/P`) | tag `peasyai-v1.0.0` | 2026-03-05 | MIT | 2026-09-03 | AWS's P language |
| cvc5 | 1.4.2 | 2026-10-08 | NOASSERTION (COPYING: BSD; build-dependent, see F23) | 2026-10-21 | 1.4.1 2026-09-25; 1.4.0 2026-09-17 |
| Carcara (`ufmg-smite/carcara`) | 1.1.0 | **2023-08-29** | Apache-2.0 | 2026-10-13 | ≥100 commits since 2026-01-01 |
| CCF (`microsoft/CCF`) | ccf-7.0.21 | 2026-10-19 | Apache-2.0 | 2026-10-21 | home of CCF's TLA+ trace validation |

### 2.2 TLA+ tooling

**F1. TLC: stable v1.7.4 vs rolling v1.8.0.** [checked; high]
- **Source:** https://github.com/tlaplus/tlaplus/releases.
- **Release status.** v1.8.0 is marked `prerelease=true` and was published 2026-10-20T18:35:42Z. That timestamp matches the nightly the spike downloaded, so the tag is re-published as a rolling build. The newest non-prerelease is v1.7.4 (2024-08-05).
- **The 1.8.0 notes are uncurated.** The "1.8.0 milestone" link in its release body actually points to `milestone:1.7.1`. The body also still lists TLA+ Toolbox 1.8.0 zips with SHA-1 sums, so the Eclipse Toolbox is still built.
- **Spike results:** TLC 1.8.0 runs on Java 21, and `-dumpTrace json` emits `{"counterexample":{"action":[…]}}` [spike].
- **Minimum Java version for 1.8.0:** [unverified].
  - TLA+ By Example runs tla2tools on CheerpJ's Java 11 runtime (F4). Which jar build it uses was not determined.
  - Whether `-dumpTrace json` exists in v1.7.4 is also [unverified]. If it does not, pinning "stable" would break v1's trace import.

**F2. Editor route.** [checked; high]
- The VS Code extension (`tlaplus/vscode-tlaplus`, MIT) was pushed 2026-10-21.
- TLA+ By Example's README offers "VS Code in the browser with the TLA+ extension and Java for TLC" as its local or Codespaces route.
- Its `scripts/run-in-codespace.mjs` prefers "the tla2tools.jar bundled with the installed TLA+ extension".

**F3. Spectacle (formerly tla-web): coverage, licence and limits.** [checked at commit `5827c22`, 2026-09-30]
- **Sources:** https://github.com/will62794/spectacle ; live at https://will62794.github.io/spectacle/
- **Licence and identity.** MIT. The GitHub API resolves `will62794/tla-web` to `will62794/spectacle`, so they are the same project. The embedding docs still link to `will62794.github.io/tla-web/...` paths.
- **Testing method** (README): "nearly all testing of the tool is done via conformance testing against TLC … we generate its reachable state graph using TLC and compare this for equivalence against the reachable state graph generated by the Javascript interpreter". I counted **172** `.tla` test specs in `specs/with_state_graphs`, **142** of them with a TLC `.dot.json` graph. (The directory holds 623 *files*; each spec has `.cfg`, `.dot` and `.json` siblings.)
- **Tested and implemented constructs.**
  - Test groups in `js/test.js`: "General", "UNCHANGED", "Module instantiation", "Module instantiation with substitution", "Large Specs", "Semantic Errors".
  - Test specs include `record_literal_eval`, `seq_append`, `simple_choose` and `empty_domain_and_seq`.
  - `ENABLED` is implemented in `eval.js`, with the comment "ENABLED A is true if any branch of A is enabled". I did not check its test coverage.
  - `LAMBDA`, `RECURSIVE` and `INSTANCE` all appear in the interpreter.
  - Parsing uses `tree-sitter-tlaplus.wasm`.
- **Checking.** `app.js` has `startCheckInvariantWebWorker(invariantExpr)` and reports `invariantCheckingStatesExplored`, i.e. BFS invariant checking off the main thread.
- **Embedding** (`doc/embedding.md`): "All of the core functionality is self-contained and runnable in the browser". Dependencies and the WASM parser must be copied by hand, and better packaging is "In future". In practice that means vendoring a pinned commit.
- **Not present.**
  - Zero occurrences of `PlusCal`/`pcal`, `WF_`, `SF_`, `fairness`, `liveness`, `TLCGet` or `RandomElement` in `js/`. So there is **no PlusCal translation and no fairness or liveness checking**.
  - Confidence is medium-high: this is an inference from absence, though consistent with the tool's stated purpose.
  - Two commented-out README lines admit the limits: "highly efficient model checking isn't currently a goal of the tool", and "some TLA+ language features that may not be implemented".
- **Course-relevant shared traces** (README): "Write skew anomaly under snapshot isolation", "Read-only anomaly under snapshot isolation", and "Raft log entry is written and later rolled back".
- **Agent-native.** The repository ships `AGENTS.md` and `CLAUDE.md`, which describe the conformance-test workflow.

**F4. TLA+ By Example: real TLC in the tab.** [checked at commit `ec0cc03`, 2026-10-15]
- **Sources:** https://learning.tlapl.us/ ; https://github.com/tlaplus/tla-by-example
- **How it runs TLC.** The README says: "The playground runs the TLC model checker directly in the browser via CheerpJ (TLA+ tools compiled to a JAR, executed in-browser)."
  - The code loads `cjrtnc.leaningtech.com/4.3/loader.js` with a `version: 11` runtime setting.
- **Content:** two tracks, `intro` and `blocking-queue`.
- **Its authoring contract** (`dev/lessons.md`) is worth copying verbatim as a house rule:
  - lessons must "Explain whether a reported error is an invariant violation, a deadlock, or a temporal-property violation". So in-tab TLC handles temporal properties, which Spectacle cannot.
  - "Quoted state-space totals must specify whether they describe the browser's first-counterexample run or a complete local exploration with `-deadlock -continue`."
  - Example: the BlockingQueue lesson says "**57254 distinct states**, as reported upstream", and gives the local command.
- **Licence:** GitHub reports NOASSERTION for the site's licence. Reuse terms for its lesson text are [unverified].

**F5. CheerpJ: licence and capability.** [checked]
- **Sources:**
  - https://cheerpj.com/docs/licensing (docs version selector "v4.3"; © 2026);
  - https://labs.leaningtech.com/blog/cheerpj-4.3 (2026-04-21).
- **Who may use it free.** The Community License covers "personal projects, FOSS projects, and for technical evaluations". It gives "unlimited, unmetered use of CheerpJ from the cjrtnc.leaningtech.com domain". Free users must "Give appropriate credits".
- **Self-hosting:** "If you wish to self-host CheerpJ, you will need a Commercial License."
- **Business use:** "any business use (with exception of one-person companies)" requires a commercial licence.
- **Evaluation:** "If an application is not seen by internal or external users, it is considered a technical evaluation."
- **The 4.3 post's statements:**
  - "CheerpJ is commercial software, free to use for FOSS projects, personal projects, and one-person companies";
  - "CheerpJ currently supports Java 8, 11 and 17";
  - "Support for Java 21 is also planned for later this year";
  - it "runs entirely client-side in the browser";
  - it adds an IndexedDB-backed persistent `/files/` mount.
- **Unknown:** runtime download size, cold-start time, CDN availability or SLA, and the CDN's logging and privacy terms. All [unverified].
- **Alloy under CheerpJ is [unverified] and needs a spike.**
  - Alloy 6.2.0 needs Java 17, which CheerpJ 4.3 lists as supported.
  - But Alloy's native SAT back-ends (JNI) and Alloy 6's unbounded temporal checking through external model checkers [prior] are unlikely to work in the tab.
  - Pure-Java SAT4J probably would. I found no public Alloy-on-CheerpJ deployment, but I did not search exhaustively.

**F6. Apalache: active, foundation-hosted, symbolic.** [checked]
- **Source:** https://github.com/apalache-mc/apalache
- **Governance.** The README says: "Apalache has moved to TLA+ Foundation, under the Linux Foundation". It lists Informal Systems funding as *past* (2020–2024).
- **What it is.** The repo description reads "symbolic model checker for TLA+ and Quint".
- **Inductive invariants.** The docs source (`docs/src/apalache/running.md` §1.5, "Checking an inductive invariant") says: "To check executions of arbitrary lengths, one usually finds a formula that satisfies the two following properties". It then describes checking `IndInit` and the inductive step as two commands. Rendered docs: https://apalache-mc.org/docs/apalache/running.html (URL [prior]; source file checked).
- **Cadence:** four releases between 2026-08-19 and 2026-10-12.
- **Confidence:** high.

**F7. Quint: org move and commercial layer.** [checked repos; corporate details second-hand]
- **Sources:** https://github.com/quint-co/quint ; https://quint.sh/ (page "Last updated on May 4, 2026").
- **Repository and package.**
  - `informalsystems/quint` resolves to `quint-co/quint`; the `quint-co` org was created 2026-05-07.
  - Releases: v0.33.0 (2026-09-28), plus a separate `evaluator/v0.7.0` tag the same day. Given the tag name, this is likely the Quint simulator/evaluator component [unverified].
  - The README still installs from `npm i @informalsystems/quint -g`.
- **The company layer.**
  - quint.sh: "The Quint language and core tooling are open source".
  - It also offers a "Quint Studio" behind a waitlist.
  - It links an interview naming a "CEO of Quint at Informal Systems" [second-hand].
- **Sibling repos:**
  - `quint-connect`: "A model-based testing framework for Quint + Rust" (Apache-2.0, pushed 2026-05-25). Its README says it automatically validates "your implementation against your Quint spec by replaying generated test traces".
  - `quint-llm-kit`: "Agents and tools for using Quint with LLMs" (pushed 2026-07-01).
  - `quint-trace-explorer`: a TUI for Quint/Apalache ITF traces, with no licence.
  - "Quint Agent Skills" in the main repo.
- **Confidence:** high for the repo facts; medium for the corporate structure.

**F8. Lamport, *A Science of Concurrent Programs*.** [second-hand; medium]
- **Publication.** Cambridge University Press, 2026, ISBN 978-1-009-71985-8, 332 pp.
  - Cambridge's copyright page: https://assets.cambridge.org/97810097/19858/copyright/9781009719858_copyright_info.pdf (copyright year 2026).
  - Retailers disagree on the exact date (February to April 2026).
- **Free version.** A TLA+ mailing-list post (https://discuss.tlapl.us/msg06762.html) notes it "has long been available for free on Lamport's website" and is now published in hardcover and ebook.
- **Not read:** I did not open the PDFs or the free version.

**F9. TLA+ Foundation.** [checked page, undated; medium]
- **Sources:** https://foundation.tlapl.us/ ; https://foundation.tlapl.us/grants/index.html
- **Members shown:** AWS, Oracle and NVIDIA.
- **Grants:** USD 1,000–100,000 [second-hand via search].
- **Navigation** includes a "GenAI-accelerated TLA+ challenge".
- **Other signals:**
  - Apalache moved under the foundation (F6).
  - The `tlaplus` GitHub org now hosts the browser-first learning site TLA+ By Example, created 2026-02-14 per R6.
- **Nothing dated for 2026:** I found no dated 2026 announcements, but my confidence that none exist is low.

**F10. Trace validation (Kuppe et al.) and CCF.** [checked via arXiv API; high]
- **The framework paper.** Cirstea, Kuppe, Loillier, Merz, "Validating Traces of Distributed Programs Against TLA+ Specifications", arXiv:2404.16075 (v1 2024-04-24, v2 2024-09-17). The venue is [unverified]; my prior is SEFM 2024.
  - "The problem is reduced to a constrained model checking problem, realized using the TLC model checker."
  - "traces only contain updates to specification variables rather than full values, and developers may choose to trace only certain variables."
  - It found "discrepancies between the specifications and the implementations in all" of the case studies.
- **The industrial case.** Howard, Kuppe, Ashton, Chamayou, Crooks, "Smart Casual Verification of the Confidential Consortium Framework", NSDI 2025, arXiv:2406.17455 (v2 2024-10-16).
  - "CCF powers Microsoft's Azure Confidential Ledger service".
  - The approach is "binding the formal specification in TLA+ to the C++ implementation".
  - This is the requested Azure conformance example.
- **Not verified this session:** an Azure Cosmos DB TLA+ paper (ICSE-SEIP 2023) [prior].

**F11. MongoDB conformance.** [checked paper; blog second-hand]
- **The paper.** Davis, Hirschhorn, Schvimer, "eXtreme Modelling in Practice", PVLDB 13(9):1346–1358 (2020), doi:10.14778/3397230.3397233, arXiv:2006.00915.
  - "We found MBTC [model-based trace-checking] to be impractical for testing that the Server conformed to a highly abstract specification. MBTCG [model-based test-case generation] was highly successful" (for Realm Sync's operational transformation).
- **The 2025 retrospective.** "Conformance Checking at MongoDB: Testing That Our Code Matches Our TLA+ Specs" (2025-06-02), https://www.mongodb.com/company/blog/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs [second-hand summary only].

**F12. AWS, "Systems Correctness Practices at Amazon Web Services" (Brooker and Desai, CACM 2025).** [metadata second-hand; P facts checked]
- **Access.** The full text could not be fetched: cacm.acm.org and queue.acm.org both returned HTTP 403 (Cloudflare) on 2026-10-21.
- **Metadata** (search index): CACM Vol. 68, Issue 6 (June 2025), pp. 38–42. Topics: TLA+, the P language, property-based testing, fault injection, and event-based simulation. **No quotes from the article are used in this report.**
- **P facts, from the AWS-maintained P README** (https://github.com/p-org/P, MIT) [checked]:
  - "Teams across AWS building flagship products—from storage (S3, EBS), to databases (DynamoDB, MemoryDB, Aurora), to compute (EC2, IoT)—use P".
  - PObserve: "Validate service logs against P specifications."
  - The README itself cites the CACM article.

### 2.3 Relational modelling: Alloy 6, Forge, Alloy4Fun

**F13. Alloy 6.2.0.** [checked; high]
- **Release.** v6.2.0, 2025-01-09. Its release note adds "a command-line interface (documentation with `java -jar alloy.jar help`)", which makes headless Bench grading straightforward.
- **Runtime.** The README says "Alloy runs on all operating systems with a recent JVM (Java 17 or later)."
- **Licence.** The LICENSE file begins "# THIS IS NOT VALID YET! CURRENTLY CODE IS UNDER MIT LICENSE", followed by the Apache-2.0 text. So the effective licence today is MIT, with a pending Apache-2.0 move. Hence GitHub's "NOASSERTION".
- **Activity.** Last commits were 2026-06-11 (a build task) and 2026-03-17 ("Fixes #336"). Slow, but alive.
- **Alloy 6 language features** [prior; https://alloytools.org/alloy6.html, not re-fetched]:
  - mutable `var` signatures and fields;
  - LTL with past operators;
  - trace-based `run` and `check`;
  - `expect` on commands.

**F14. Forge (Brown).** [checked; high]
- **Releases.** v5.2 (2026-03-06), v5.1 (2026-02-27), v5.0.1 (2026-02-05), v5.0.0 (2026-01-26). MIT.
- **v5.0.0 breaking changes:**
  - "certain built-in helpers, such as sequences, are not automatically imported. Instead, use `open util/<library name>` … `util/temporal` and `util/sequences`".
  - It upgraded to "the new CnD-powered Sterling visualizer".
- **Install requirements.**
  - Racket plus `raco pkg install`. The README says "any version should work, although we suggest the latest: 8.3", and that pointer is stale.
  - "You will also need Java installed (we suggest version 11 or later)."
- **Pedagogy** (OOPSLA 2024, doi:10.1145/3649833): language levels and the `example` / `test expect … is sat` / `is necessary|sufficient` constructs. R6 F11 covers this; it is not repeated here.

**F15. Alloy4Fun.** [checked; high]
- **Architecture** (README): a "Meteor framework" web app plus an `api`, "where a Java web service is used to interact with the alloytools API", plus a `mongo` database.
- **Hosting:** live at http://alloy4fun.inesctec.pt. MIT; last push 2026-02-20.
- **Data:** every model version is stored server-side (R6 F13). L2 covers its learner-error dataset (97,000+ submissions).

**Which one for teaching relational models?** The four options compare as follows:

| Criterion | Alloy 6.2.0 | Forge v5.2 | Alloy4Fun |
|---|---|---|---|
| Named by the roadmap (Stage 7) | yes (alloytools.org) | no | no |
| Install | one JAR + Java 17 | Racket + raco + Java 11 | none (hosted) |
| Fits zero-server/local-first | yes (Bench) | yes (Bench) | **no**: third-party server stores models |
| Pedagogical testing constructs | `expect` on commands [prior] | best-in-class (`example`, `test expect`, levels) | secret predicates (auto-graded challenges) |
| Temporal | yes (Alloy 6) | yes (`util/temporal`) | yes (Alloy 6 based) [prior] |
| Material | *Practical Alloy*, Jackson's book | *Logic for Systems* 2026 draft | challenge sets |
| Verdict | **primary** | borrow its idioms; reading | optional link-out with disclosure |

### 2.4 Rust verification and deterministic simulation

**F16. Kani.** [checked; high]
- 0.68.0 (2026-09-16), with releases every 2–8 months. Repo pushed 2026-10-20. "A model checker for Rust programs."

**F17. Verus.** [checked; high]
- Stable-channel tag `release/0.2026.10.18.7d82994` (2026-10-19), plus daily rolling prereleases (`release/rolling/0.2026.10.21.315b8d9`). MIT. R2 I21 covers LLM cheat patterns.

**F18. Stateright.** [checked; medium on the maintenance judgement]
- 0.31.0 on crates.io (2025-07-27; about 708k recent downloads). The last push was 2025-07-27.
- The most recent issue activity was 2025-12-23. A PR, "Fix cargo clippy warnings with Rust 1.90", has been open since 2025-10-17.
- I infer low maintenance.

**F19. madsim.** [checked; medium on the maintenance judgement]
- 0.2.34 (crates.io, 2025-10-11). The last commit, 2026-02-16, was "chore: bump tonic to 0.14 and etcd-client to 0.18".
- That looks like maintenance mode.

**F20. turmoil.** [checked; high]
- **Release:** v0.7.2 (2026-04-24). MIT. The repo was pushed 2026-10-20.
- **README on `main`:** "Turmoil is a family of crates for deterministic simulation testing of distributed systems. It runs multiple concurrent hosts within a single thread and injects 'hardship' — latency, drops, partitions, crashes, torn writes — into the simulated network and filesystem, under manual control or a seeded …"
- **New crates.**
  - On crates.io: `turmoil-net` 0.1.0 (2026-05-04) and `turmoil-fs` 0.1.0 (2026-10-19).
  - Listed in the README: `turmoil-io-uring`.
  - These are very new, so their API stability is [unverified].

**F21. TigerBeetle VOPR.** [checked; high]
- **Source:** https://docs.tigerbeetle.com/concepts/safety/
  - "TigerBeetle is tested in the VOPR … a simulated environment where an entire cluster, running real code, is subjected to all kinds of network, storage and process faults, at 1000x speed … This simulation can find both logical errors in the algorithms and coding bugs in the source … This simulator is running 24/7 on 1024 cores".
- **Links from that page:** https://tigerbeetle.com/blog/2023-07-06-simulation-testing-for-liveness/ and the browser game at https://sim.tigerbeetle.com.
- **Domain match.** TigerBeetle is "The financial transactions database designed for mission critical safety and performance" (repo description), so its debit/credit domain matches the Plinth ledger.

**F22. Antithesis.** [second-hand; medium]
- A $105M Series A led by Jane Street was announced around 2025-12-03 (press releases syndicated by Kyodo/AAP).
- Fortune (2026-03-23) names customers including Jane Street, the Ethereum network and MongoDB.
- It is commercial and hypervisor-based. I saw no sign that the platform has been open-sourced.

### 2.5 SMT solvers and proof certificates

**F23. cvc5 1.4.x.** [checked; high]
- **Releases:** 1.4.0 (2026-09-17), 1.4.1 (2026-09-25), 1.4.2 (2026-10-08).
- **Licence.** COPYING says cvc5 is under a "BSD license", and notes that "cvc5 can be configured" with additional, differently licensed components. So the licence of a binary depends on how it was built.
- **1.4.0 notes.**
  - "Added support for checking CPC proofs with **Logos**, a proof checker written in Lean". Its scope is "the CPC fragment used by safe builds of cvc5". It is "not yet optimized for performance", and "Ethos … remains the recommended proof checker for CPC proofs".
  - Separately: "VTS has no proof support and had soundness issues in the presence of nested quantified formulas, and can no longer be enabled in safe and stable mode."
- **1.4.1 notes:** "Removed support for LFSC proof output"; "The current CPC proofs are checkable by Ethos 0.2.5".

**F24. Alethe output in cvc5.** [checked: `docs/proofs/output_alethe.rst` on `main`; high]
- **How to get it:** `--dump-proofs --proof-format-mode=alethe`.
- **Coverage:** "the theories of equality with uninterpreted functions, linear arithmetic, bit-vectors and parts of the theory of strings (with or without quantifiers) are supported in cvc5's Alethe proofs".
- **Checking:** the repo has a `contrib/get-carcara-checker` script that installs "the Carcara checker's version with full support for cvc5 Alethe proofs". Reconstruction is also possible in Isabelle/HOL and Coq (SMTCoq).

**F25. Carcara.** [checked; high]
- **Releases.** The latest release is `carcara-1.1.0` (2023-08-29).
- **Activity.** ≥100 commits since 2026-01-01; that is the API page cap, so the real figure may be higher. Recent commits:
  - 2026-10-13: "Make allowed rules not be considered holes"; "Fix symbol shadowing behavior";
  - 2026-10-06: "Control Eunoia sharing with CLI flag".
- **Build:** "you will need Rust and Cargo 1.93 or newer".
- **Usage:** `carcara check example.smt2.alethe example.smt2`, plus `elaborate`.
- **Paper:** TACAS 2023.

**F26. No in-browser cvc5 found.** [checked, absence; low-medium]
- `gh search repos "cvc5 wasm"` returned nothing, and R5 found no npm package.
- So any Z3-vs-cvc5 cross-check runs on the Bench.

---

## 3 What this means for the course

**Course 05, Time (TLA+). This course changes most.**
- **Engine swap.**
  - Delete v1's "own explicit-state BFS for a small PlusCal-like DSL" (PLAN §2.5). It is a second language that would drift from TLC.
  - Embed Spectacle at commit `5827c22` under v1's Theater UI, which R6 also recommends. Spectacle is TLC-conformance-tested and MIT-licensed, so the course can vendor it.
- **Language.**
  - In the tab, lessons use TLA+ directly. Learn TLA+ (the roadmap's resource) is PlusCal-heavy, so show PlusCal next to the TLA+ that TLC's translator produces, and animate the TLA+.
  - PlusCal itself compiles on the Bench.
- **Coverage map for Stage 5's project.**
  - Spectacle can show the double-spend violation, the atomic fix, and the Available → Held → Captured/Released lifecycle with timeouts, duplicate replies and crashes as *safety*: "a hold never resolves twice".
  - Spectacle **cannot** check "a hold eventually resolves" under WF/SF fairness. That lesson runs TLC on the Bench, or optionally TLC in the tab via CheerpJ.
  - The Theater can still *display* an imported TLC counterexample. How the JSON represents a liveness *lasso* is [unverified]; the spike only covered safety traces.
- **Numbers discipline.**
  - Every state count in copy comes from a recorded TLC run, with the jar's SHA-256. The spike already corrected v1's invented "212 distinct states" to 11.
  - Adopt TLA+ By Example's disclosure rule: first-counterexample run vs full exploration.
- **Conformance as CI.**
  - For every lesson spec, generate the TLC state graph and diff it against Spectacle's, which is Spectacle's own test method (F3).
  - A mismatch blocks publication. This makes "the explorer agrees with TLC" a checked claim instead of a hope.
- **Bounded vs unbounded.**
  - Add an optional lesson on Apalache v0.62.4's inductive-invariant check (F6), on the Bench.
  - It turns the Course 04 obligation shape `Inv ∧ Next ⇒ Inv′` into a TLA+ check for *all* states, which is exactly the roadmap's completion test: "bounded exploration is not an unqualified proof".
- **Reading.** Lamport's *A Science of Concurrent Programs* (free on his site; CUP 2026) is optional for the "TLA as mathematics" and refinement lessons (5.9 and Course 09).

**Course 08, Effects (outbox, crash windows, simulator).**
- **The simulator.** The roadmap's "deterministic simulator" should be the learner's own small Rust simulator:
  - a seeded PRNG and a simulated clock;
  - a fault injected at every step boundary, VOPR-style (F21);
  - output as NDJSON traces of *spec-variable updates only*, following Cirstea et al. (F10).
- **New lab, "Trace validation".**
  1. Validate simulator traces against the learner's Course 08 TLA+ spec with TLC.
  2. Then mutate the simulator, for example acknowledging before the durable write, and watch TLC reject the trace.
  3. That is the CCF method at learner scale (F10), and it is the honest form of the roadmap's "implementation correspondence" field.
- **Specimen.** MongoDB's finding (F11) is a calibrated warning: trace-checking against a *highly abstract* spec was impractical. So the learner must log at the abstraction level of the spec.
- **Dependencies.**
  - Do not use madsim or Stateright (F18, F19).
  - turmoil is an optional appendix for tokio users. Its new `turmoil-fs`, with torn writes and crashes, is on point for crash windows but only 2 days old (F20).
- **Readings.** TigerBeetle's VOPR, including the sim.tigerbeetle.com Play, and Antithesis.
- **Cross-links.** Leave Raft and partition-level DST to **byzantine**. Course 08 stays at the outbox and external-effect boundary.

**Course 04, Obligations, and Course 01, Z3.**
- **cvc5 cross-check.** Run cvc5 1.4.2 alongside Z3 on the Bench, as R2 and R5 already recommend. Pin it per receipt, because solver upgrades can regress (R5).
- **Certificates.**
  - Alethe certificates are cheap here, because `miniplinth`'s VCs are linear integer arithmetic, and bit-vectors in the overflow variant. Both are inside cvc5's Alethe coverage (F24).
  - The roadmap defers "proof-certificate infrastructure", so keep cvc5 → Carcara as a **Shelf drawer** with an explicit trigger.
  - A 20-minute Play, "what would it take not to trust Z3?", is fine now.
- **Teaching specimen.**
  - cvc5 1.4.0 disabled VTS "in safe and stable mode" because it "had soundness issues" (F23). That is a real, dated example of solver unsoundness, for the completion test "distinguish solver correctness from VCGen correctness".
- **Pointer for Lean graduates.** Logos (F23) is a Lean program that checks SMT proofs, which ties Course 02 to Course 04. Shelf only.

**Course 07, Secrecy.**
- **Tooling.** Run Alloy 6.2.0 (Java 17) on the Bench, graded headlessly through its new CLI (F13).
- **The model.** A static relational model of users, teams, documents and sharing, with a cross-tenant-read assertion checked at a stated scope.
- **Non-vacuity.**
  - Every `check` is paired with a satisfiable `run`, Forge's `test expect … is sat` idiom (F14).
  - A wheat/chaff set, per R6, catches over- and under-constrained learner specs.
- **Temporal mode.** Keep Alloy temporal out of the core path, because TLA+ already teaches temporal logic. One optional exercise may use Alloy 6's past-time operators for revocation, "once delivered, always known", which is the roadmap's own revocation lesson.
- **In the tab.** Pre-recorded Alloy instances, labelled "recorded with Alloy 6.2.0 on <date>". Alloy-on-CheerpJ needs a spike first (F5).
- **Alloy4Fun.** An optional external challenge set, with the disclosure "your models are stored on a third-party server" (F15).
- **Forge.** A reading card (*Logic for Systems* 2026), not a second toolchain.

**Course 06, Correspondence (Postgres).**
- Spectacle's shared trace, "Write skew anomaly under snapshot isolation" (F3), is a ready-made Play.
- Pair it with the spike's real Postgres result: under REPEATABLE READ both transactions commit and the team total ends at −100.
- Cross-link **tablespace** for MVCC internals instead of re-teaching them.

**Courses 09 and 10, and Plinth alignment.**
- **Shelf drawers.** Kani 0.68.0 and Verus `release/0.2026.10.18.7d82994` get Shelf drawers that pin at opening time. Verus's daily rolling channel makes pinning mandatory.
- **"Correspondence" cards.** Two industrial patterns map directly onto Plinth's proved / model-checked / runtime-enforced vocabulary:
  - `quint-connect`: model traces replayed against Rust (F7);
  - P/PObserve: production logs validated against specs (F12).
- **Licence firewall.** CheerpJ's free licence excludes business use (F5). Keep CheerpJ out of any code the learner may later reuse in a commercial setting.

**The zero-server formula.**
- **Fully consistent:** Z3-WASM, Spectacle and PGlite are self-hosted static assets.
- **CheerpJ:**
  - it makes runtime requests to a third-party CDN;
  - it cannot be self-hosted for free;
  - it does not work offline.
  - So gate it behind a click, show the disclosure, and always offer the Bench fallback.
- **Alloy4Fun** sends learner models to a third-party server.

---

## 4 Recommendations (ranked)

**R1. Adopt this version-pinned stack.** Re-verify pins on each content release; receipts record the exact version, SHA-256 or commit.

| Layer | Tool | Pin | Date | Licence | Runs | Courses |
|---|---|---|---|---|---|---|
| SMT | `z3-solver` (npm) | 5.3.1 | 2026-10-16 | MIT [prior] | tab (WASM worker; COOP/COEP via coi-serviceworker) [spike] | 00, 01, 04, 07 |
| SMT | `z3-solver` (PyPI) | 5.3.1 | 2026-10-15 | MIT [prior] | Bench [spike] | 01, 04, 07 |
| SMT cross-check | cvc5 | 1.4.2 | 2026-10-08 | BSD (build-dependent) | Bench | 04 |
| Proof checker | Carcara | the commit installed by cvc5 1.4.2's `contrib/get-carcara-checker` (last release 1.1.0 is from 2023) | n/a | Apache-2.0 | Bench (Rust ≥ 1.93) | Shelf |
| TLA+ checker | `tla2tools.jar` | 1.8.0 nightly of 2026-10-20, **SHA-256 recorded, jar vendored** (fallback v1.7.4 stable) | 2026-10-20 | MIT | Bench (Java 21 [spike]) | 05, 08 |
| TLA+ in tab | Spectacle | commit `5827c22` | 2026-09-30 | MIT | tab (vendored) | 05, 06, 08 |
| TLA+ in tab (opt-in) | TLC on CheerpJ | loader 4.3 | 2026-04-21 | CheerpJ Community Licence (CDN only, credit required) | tab, online only | 05, 08 |
| TLA+ symbolic | Apalache | v0.62.4 | 2026-10-12 | Apache-2.0 | Bench | 05 (optional) |
| Relational | Alloy | 6.2.0 | 2025-01-09 | MIT now, Apache-2.0 pending | Bench (Java 17+) | 07 |
| DB | PGlite | 0.5.10 | 2026-10-14 | not checked | tab [spike] | 06 |
| DB | PostgreSQL | 18.6 (docker `postgres:18`) | n/a | PostgreSQL | Bench [spike] | 06 |
| Proof | Lean | 4.35.0, no Mathlib | 2026-10-12 | Apache-2.0 [prior] | Bench [spike] | 02, 03, 09 |
| Simulation | own simulator; turmoil optional | turmoil 0.7.2 | 2026-04-24 | MIT | Bench | 08 |
| Deferred | Kani; Verus | 0.68.0; `release/0.2026.10.18.7d82994` | 2026-09-16; 2026-10-19 | Apache-2.0; MIT | Bench | Shelf |

**R2. Publish the honest split.** Put it on a "What runs where" page, and print one line of it on every instrument.

| Capability | Tab, self-hosted | Tab, opt-in (third-party CDN) | Bench (authoritative) |
|---|---|---|---|
| SAT/SMT queries | Z3 5.3.1 WASM (34.6 MB, lazy-loaded) | n/a | Z3 Py + cvc5 cross-check |
| SMT proof certificates | none | none | cvc5 Alethe → Carcara |
| TLA+ safety: explore, check invariants, share traces | Spectacle | TLC via CheerpJ | TLC 1.8.0 (counts, receipts) |
| TLA+ liveness/fairness | display imported TLC traces only | TLC via CheerpJ | TLC |
| PlusCal | show pre-translated TLA+ | TLC translator via CheerpJ [unverified] | TLC `pcal.trans` |
| Inductive invariants | none | none | Apalache |
| Relational models | replay of recorded Alloy instances | Alloy via CheerpJ [unspiked] | Alloy 6.2.0 CLI |
| Datalog | own TS evaluator (v1) | none | Soufflé |
| SQL semantics | PGlite (single connection) | none | Postgres 18 (concurrency) |
| Simulation | replay of recorded seeds and traces | none | own simulator; turmoil optional |
| Rust verification | none | none | Kani / Verus (deferred) |

**R3. Make Spectacle the Theater engine**, vendored at a pinned commit. Add the Spectacle-vs-TLC state-graph diff to course CI. TLC remains the authority for every number and every CHECKED stamp.

**R4. Keep TLC in the tab (CheerpJ) opt-in only.**
- Show the disclosure line and the credit CheerpJ requires.
- Keep a Bench fallback and never use it for grading or receipts.
- Confirm the course repository carries an OSI licence, because the free tier is conditioned on "FOSS projects".

**R5. Add the Course 08 "Trace validation" lab:** own simulator → NDJSON spec-variable updates → TLC trace spec → a mutated-simulator specimen. Readings: Cirstea et al., CCF (NSDI 2025), MongoDB VLDB 2020.

**R6. Add the optional Apalache inductive-invariant lesson** as the 04 → 05 bridge, on the Bench.

**R7. Course 07: Alloy 6.2.0 on the Bench**, with Forge-style non-vacuity runs and wheat/chaff checks. Alloy4Fun is a disclosed link-out; Forge is a reading card.

**R8. Run the cvc5 1.4.2 cross-check now.** Alethe → Carcara becomes a Shelf drawer, triggered when "a PROVED stamp must not trust the solver". Pin Carcara through cvc5's `contrib` script and record the commit. Use the VTS soundness note as a specimen.

**R9. Do not build labs on Stateright or madsim.**
- turmoil stays optional.
- TigerBeetle VOPR and Antithesis become readings.
- P/PObserve and quint-connect become "industrial correspondence" cards.
- Quint and Apalache get an "other doors" card, not a track. The roadmap names TLA+ and Learn TLA+.

**R10. Run three spikes before writing Courses 05 and 07.**
- **(a)** Load `spikes/tla/DoubleSpend.tla` in Spectacle and compare its distinct-state count with TLC's recorded 11.
- **(b)** Run Alloy 6.2.0 under CheerpJ 4.3 (Java 17) with SAT4J: start-up time, a bounded temporal run, failure modes.
- **(c)** Get a TLC *liveness* counterexample via `-dumpTrace json`, and document how the lasso or back-loop is represented, for the Theater importer.

---

## 5 Open questions

1. **Spectacle coverage.** Does Spectacle handle every construct in the course's Course 05/06/08 specs: records, functions, `Sequences`, `CHOOSE`, recursive operators, model values, deadlock reporting? The way to answer it is R10(a) plus the CI diff.
2. **TLC versions.** What is the official minimum Java version for tla2tools 1.8.0? Does `-dumpTrace json` exist in v1.7.4? When will 1.8.0 get a stable tag?
3. **CheerpJ operations.** What are the CDN's availability and logging terms? Download size and cold start for TLC? Does "Give appropriate credits" require specific wording?
4. **Alloy in the tab.** Can Alloy 6.2.0 run usefully under CheerpJ with SAT4J only?
5. **AWS article.** What does the full text of the Brooker & Desai article say about deterministic simulation and PObserve? It was blocked (403), so a human should read it before the course quotes it.
6. **Quint's future.** Will Quint's open-source core stay Apache-2.0 as the company layer (Quint Studio) grows? What exactly is the `evaluator/v0.7.0` component?
7. **Trace-validation venue.** In which venue was the Cirstea et al. trace-validation paper published? My prior, SEFM 2024, is unverified.
8. **turmoil-fs.** Will `turmoil-fs` (0.1.0, 2026-10-19) stabilise enough to recommend for crash-window labs?
9. **cvc5 in the browser.** Is there an official or maintained cvc5 WASM build that would allow an in-tab Z3-vs-cvc5 disagreement Play?
10. **Lamport's book.** What is the CUP edition's exact publication date, and does the free online version differ from the print edition?

---

## 6 Verification log

**Checked directly today (2026-10-21):**
- **GitHub REST API** (`gh api`), for repo metadata, licences, last push and releases of 20 repos: tlaplus/tlaplus, apalache-mc/apalache, informalsystems/quint → quint-co/quint, will62794/spectacle (and the tla-web redirect), tlaplus/tla-by-example, tlaplus/vscode-tlaplus, AlloyTools/org.alloytools.alloy, tnelson/Forge, haslab/Alloy4Fun, stateright/stateright, model-checking/kani, verus-lang/verus, madsim-rs/madsim, tokio-rs/turmoil, tigerbeetle/tigerbeetle, cvc5/cvc5, ufmg-smite/carcara, microsoft/CCF, tlaplus/Examples, p-org/P. The raw output was saved locally and is not published.
- **Release-note text** from the GitHub API: TLC v1.8.0, Alloy v6.2.0, Forge v5.0.0, cvc5 1.4.0/1.4.1/1.4.2.
- **Repository files via the API:**
  - READMEs for Apalache (funding and foundation text), Quint, Forge, Alloy (Java 17), Alloy4Fun (architecture), turmoil, P, and Carcara;
  - Alloy's LICENSE;
  - cvc5's COPYING (head);
  - cvc5's `docs/proofs/output_alethe.rst`;
  - Apalache's `docs/src/apalache/running.md` §1.5;
  - the Carcara commit list since 2026-01-01;
  - Stateright issue activity; madsim's latest commits; the `quint-co` org and its repos.
- **Shallow clones, grep only, nothing executed:**
  - Spectacle at `5827c22`: README, AGENTS.md, `doc/embedding.md`, `js/app.js`, `js/eval.js`, `js/test.js`, and the test spec count.
  - TLA+ By Example at `ec0cc03`: README, `dev/lessons.md`, the CheerpJ loader URL and runtime version, and the lesson content.
- **crates.io API:** stateright, madsim, turmoil, kani-verifier, turmoil-net, turmoil-fs.
- **arXiv API:** 2404.16075, 2406.17455, 2006.00915 (titles, authors, dates, journal reference, abstracts).
- **Web pages:** cheerpj.com/docs/licensing; labs.leaningtech.com/blog/cheerpj-4.3; docs.tigerbeetle.com/concepts/safety; quint.sh; foundation.tlapl.us. These came through a fetch tool that summarises pages, so the quotes are as relayed by that tool.

**Second-hand (search summaries; not read in full):**
- the Lamport CUP edition details;
- the TLA+ Foundation grant range;
- the MongoDB 2025 blog contents;
- the AWS CACM article metadata (both ACM hosts returned 403);
- Antithesis funding and customers (press releases, Fortune).

**From spikes (executed 2026-10-20, RESULTS.md), not re-run:**
- Z3 5.3.1 and the npm threading requirement;
- TLC 1.8.0 `-dumpTrace json` and the DoubleSpend state counts;
- PGlite 0.5.10, PostgreSQL 18.6 and Lean 4.35.0.

**Prior knowledge, flagged in text and to verify before use in course copy:**
- Alloy 6 language features and the `expect` syntax;
- that Alloy's native SAT back-ends will not load under CheerpJ;
- the Apalache docs URL path;
- the Azure Cosmos DB TLA+ paper;
- the trace-validation venue;
- the Z3 and Lean licences.

**Not done:**
- I ran no tool from this report beyond what the earlier spikes covered. Spectacle, CheerpJ, Alloy, Apalache, cvc5 and Carcara were not executed here; see R10.
- The 15-minute cache and summarising fetcher mean web-page quotes should be spot-checked by a human before publication.

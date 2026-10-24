# R1 — Lean 4 and the proof-assistant ecosystem, as of 2026-10-20

**For:** the Plinth formal-methods course (successor to kernelspace). It covers mainly Courses 02, 03, 04 and 09, plus the Bench, the Audit Desk and the instruments.
**Question:** What must the course use and teach about Lean as of October 2026, and how do we make Lean labs low-friction?

**Method.**
- Primary sources: Lean release notes, the reference manual, GitHub PRs and issues, repo metadata via the GitHub API, and papers on arXiv.
- Local measurements of the official v4.35.0 toolchain, run in a scratchpad sandbox. The toolchain was installed under a private `ELAN_HOME`, and nothing was installed system-wide.
- Headless-Chromium measurements of a community WebAssembly build of Lean.
- The session's web-search budget ran out partway through. Later facts were fetched directly from known primary URLs; no search engine or proxy was used.
- **Resumed-run re-verification.** A second pass ran on 2026-10-20 local time (UTC−7), which is 2026-10-21 05:30–06:15 UTC. It re-checked load-bearing claims against the GitHub API, the toolchain's own `lake help` text, the saved measurement logs and primary pages. §6 lists the corrections and additions. Dates in this report are local unless marked UTC.

**Tags:**
- [primary]: read directly from the official source.
- [measured]: run on one machine on 2026-10-20: 20 CPUs, 31 GiB RAM, Linux 6.12 (NixOS with nix-ld), Chromium 149. These figures are single-machine and not yet re-measured on a mid-range laptop.
- [second-hand]: taken from another dossier or a summary.
- [unverified]: never load-bearing.

---

## 1. Summary

1. **Lean ships monthly and moves fast.**
   - The latest stable release is **v4.35.0 (2026-10-12)**, and **v4.36.0-rc1** came out on 2026-10-14.
   - Eighteen minor releases have shipped since v4.19.0 (2025-05-01), each preceded by release candidates.
   - The course must pin one toolchain per edition and treat every Lean fact as a dated claim.
2. **Automation now closes the course's early theorems in one line.**
   - `grind`, released in 4.22 (2025-08-14), is SMT-style; its integer solver `lia` (formerly *cutsat*) supersedes `omega`.
   - `bv_decide` returns 64-bit counterexamples and SAT certificates.
   - `decide +kernel`, `cbv` and `try?` are also available.
   - So the course should spend its effort on reading *statements*, *goals* and *axioms*, not on tactic recitation. That matches the roadmap's "explain without reciting tactics".
3. **Lean now has Dafny-style intrinsic verification (experimental).**
   - It consists of `def … requires … ensures …` contracts (4.34–4.36), `do`-block `assert`/`invariant`/`decreasing`, and the `vcgen` tactic. `mvcgen` was deprecated in 4.35.
   - [measured] `vcgen` proved a ledger `transfer` contract and a conservation loop automatically.
   - A transfer whose guard drops `amt ≤ a` fails with the exact unproved obligation.
   - Course 04 gets a real "production twin" for its own VC generator.
4. **Proof auditing became first-class in 2026.**
   - The reference manual now has a four-level **"Validating a Lean Proof"** ladder.
   - v4.35.0 added `lake check`. Its `--paranoid` flag runs five bundled independent kernels: lean4lean, nanoda, con-leche, con-ron and a hardened leanchecker.
   - v4.35.0 also added `lake comparator`, which has the same `--paranoid` flag and judges a solution against a trusted challenge statement.
   - The binary is ahead of its docs. The manual's page still says comparator supports "the official Lean kernel and the external checker `nanoda`", and still names the checker `lean4checker`.
   - `Lean.trustCompiler` was removed. Native computation now shows up as a per-use `…_native…` axiom.
   - [measured] Each tool gave the verdict the course needs for its gap taxonomy.
5. **Kernel soundness bugs are a live, documented risk.**
   - In July 2026 an AI-assisted, `sorry`-free "disproof" of the Collatz conjecture passed the official kernel *and* a week-old nanoda by chaining two distinct bugs.
   - The response was a postmortem, the 4.32.2 point release and about eight kernel fixes in 4.33.
   - 4.34 fixed three more issues found by OpenAI's AI adversarial testing.
   - This is the Audit Desk's best real specimen. It is also why a PROVED stamp must name the kernel(s) and their versions.
6. **Official Lean in the browser still needs a server, but community WebAssembly builds now work.**
   - The official options are server-side: lean4web/live.lean-lang.org, and the FRO's Lean Workbench, which is experimental and self-hosted.
   - [measured] lean.cau.li, a community fork, ran Lean entirely in the tab:
     - cold start to READY in 6.3–8.3 s;
     - small files checked in 14–297 ms;
     - about 137 MB decompressed (`lean.wasm` is about 16 MB compressed on the wire);
     - COOP/COEP headers mandatory.
   - The fork is about 950 commits behind upstream (956 on 2026-10-21 UTC).
   - It is feasible as an opt-in practice instrument for core-Lean snippets. It is never an authority.
7. **The core readings are current, but chapter numbers moved.**
   - *Theorem Proving in Lean 4* and *Functional Programming in Lean* both target Lean 4.33.0 and are built with Verso.
   - FPIL's 2025 Verso port **renumbered chapters**, so the course should cite them by title.
   - *The Hitchhiker's Guide to Logical Verification* has a **2026 edition** (BSD-style licence). It covers operational semantics, Hoare logic with a hand-built VCG tactic, and denotational semantics.
   - NNG4 is pinned to Lean 4.23.0. Its host, adam.math.hhu.de, timed out on two probes about four hours apart. The course needs fallbacks.
   - Verso's companion library SubVerso extracts real proof states from compiled Lean. The course can therefore **generate** its Goal Replay strips rather than author them by hand.
8. **Agent tooling exists, and the FRO's own threat model treats unreviewed AI proofs as potentially malicious.**
   - lean-lsp-mcp v0.31.0 is MIT-licensed, in beta, and includes a `lean_verify` axiom scan.
   - The FRO's **Lean Beam** is in preview, with a CLI, an MCP server and a Claude/Codex skill.
   - The community skill pack `lean4-skills` is also available.
   - The FRO's own benchmark, `lean-eval`, counts a problem as solved "iff comparator accepts the submitted solution". Its Comparator Live playground identifies trusted challenges by hash.
   - Lab zips should wire these tools in behind guardrails, and every Lean receipt should run comparator.
9. **Cedar is the closest production precedent for this course's Lean-to-Rust stages.**
   - cedar-spec, already on Lean 4.35.0, holds an executable Lean model, machine-checked proofs and differential random testing (DRT) against Rust.
   - Its symbolic compiler to SMT is proved sound and complete.
   - Velvet/Loom (Dafny-style, in Lean), Veil (transition systems in Lean) and Aeneas (Rust to Lean) are mature enough to cross-link. All three belong on the Deferred Shelf, each with a concrete trigger.
10. **Lab friction comes from the toolchain and Mathlib, not from Lean's speed.**
    - The Linux toolchain is a 594.5 MB download and 3.0 GB unpacked.
    - [measured] A core-only project compiles in under 1 s.
    - Mathlib adds about 5 GB of build artifacts. Keep every Lean lab **Mathlib-free**, as the FRO's own Hex libraries do.
    - Setup lanes: native elan plus VS Code, a Linux devcontainer, Codespaces, and a GitHub "build bot" using `lean-action` with leanchecker, nanoda and axiom-audit. Skip Gitpod.
    - `lake check` needs Linux bubblewrap. It failed under NixOS's nix-ld here.

---

## 2. Findings

Each finding gives the claim, its source, the date or version, and a confidence level. Measurement scripts and logs are listed in §6.

### 2.1 Release state and cadence

**F1. Current release and cadence.**
- v4.35.0 is the latest stable release (2026-10-12). v4.36.0-rc1 followed on 2026-10-14.
- Stable releases arrive about once a month, each preceded by one to four release candidates, with occasional point releases (4.32.1, 4.32.2, 4.33.1, 4.34.1). Release dates since 4.19.0:

| Year | Release (date) |
|---|---|
| 2025 | 4.19 (05-01), 4.20 (06-02), 4.21 (06-30), 4.22 (08-14), 4.23 (09-15), 4.24 (10-14), 4.25 (11-14), 4.26 (12-13) |
| 2026 | 4.27 (01-24), 4.28 (02-17), 4.29 (03-27), 4.30 (05-26), 4.31 (06-13), 4.32 (07-13), 4.33 (08-10), 4.34 (09-14), 4.35 (10-12) |

- Mathlib and Batteries `master` already track v4.36.0-rc1. Mathlib carries a tag for every Lean release (e.g. `v4.35.0`).
- *Sources:* https://github.com/leanprover/lean4/releases · https://lean-lang.org/doc/reference/latest/releases/ · Mathlib tags via the GitHub API · https://github.com/leanprover-community/mathlib4/blob/master/lean-toolchain
- *Confidence:* high [primary].

**F2. What changed that matters for teaching (2025-08 → 2026-10).** All items are from the per-version release notes at `https://lean-lang.org/doc/reference/latest/releases/v4.NN.0/`.

| Version (date) | Change |
|---|---|
| **4.22 (2025-08-14)** | `grind` released, not marked experimental. Its arithmetic module, cutsat, is "superseding `omega`, with model construction". The new code generator replaced the old one. A first Hoare logic for monadic programs (`Std.Do`, `mvcgen`) arrived as experimental. The module system became experimental. A new `math` project template was added. |
| 4.23 (2025-09-15) | The old C++ compiler was removed. |
| 4.24 (2025-10-14) | `grind` gained an AC solver. Verso docstrings arrived. |
| **4.25 (2025-11-14)** | Interactive `grind => …` and `finish?` were added, along with the `coinductive` keyword and remote Lake caches via Reservoir. `mvcgen invariants?` suggests loop invariants. |
| 4.26 (2025-12-13) | `try?` became extensible, and `grind +suggestions` / `simp? +suggestions` were added. |
| **4.27 (2026-01-24)** | The module system is no longer experimental. `cutsat` was renamed **`lia`** (#11330). The `String` API revision was completed. |
| **4.28 (2026-02-17)** | lean4checker became the bundled **`leanchecker`** binary. `SymM` (symbolic simulation) and `first_par` were added. |
| **4.29 (2026-03-27)** | Native computation now yields "one axiom per computation". A user-facing `cbv` tactic arrived, along with a new extensible `do` elaborator (opt-in). |
| 4.30 (2026-05-26) | Added the `sym =>` interactive mode. `cbv` is no longer experimental, the LCNF compiler was completed, and Lake caching was overhauled. |
| 4.31 (2026-06-13) | `mvcgen'` was rewritten from scratch ("over 100x faster" on some benchmarks). `lake lint` was added, `Std.Async`/`Std.Http` graduated to `Std`, and LLVM moved to 22. |
| 4.32 (2026-07-13) | The new `do` elaborator became the default, which is a breaking change. |
| 4.32.2 (2026-07-28) | Point release fixing the kernel soundness bug #14576 (F18). |
| **4.33 (2026-08-10)** | `mvcgen'` was renamed **`vcgen`**. Kernel soundness fixes landed (F18), and `Float` got a logical model. |
| **4.34 (2026-09-14)** | **`def` contracts with `requires`/`ensures`** arrived, along with `do`-block `assert` and loop `invariant`. Three AI-found kernel issues were fixed. |
| **4.35 (2026-10-12)** | `vcgen` became the headline feature, still behind `experimental.vcgen`, and `mvcgen` was deprecated. `Decidable` became a Bool-carrying structure. `Lean.trustCompiler`, `reduceBool` and `reduceNat` were removed. Added **`lake check` / `lake comparator`**, with external checkers bundled. |
| 4.36.0-rc1 (2026-10-14) | Contracts gained `throws` clauses. `vcgen` moved to `Std.WP.Tactic`. `Std.WP` names were revised. |

- *Confidence:* high [primary]. A caveat: the per-version notes were read through a summarising fetcher, so the load-bearing items were cross-checked against PR pages or reproduced locally (F10, F13–F16).

**F3. Toolchain size.**
- v4.35.0 release assets: Linux `tar.zst` is 594.5 MB, Linux `.zip` 925.9 MB, macOS aarch64 `tar.zst` 570.4 MB, Windows `tar.zst` 622.7 MB. No WebAssembly asset is published.
- [measured] elan v4.2.4 (2026-08-25) installed in 0.8 s.
- [measured] `elan toolchain install leanprover/lean4:v4.35.0` took 15.0 s on a fast connection and unpacked to **3.0 GB**.
- `bin/` ships `lean`, `lake`, `leanchecker`, `leanchecker-paranoid`, `leanexport`, `lean4lean`, `nanoda_bin`, `con-leche`, `con-ron`, `cadical`, `clang` and `ld.lld`.
- *Sources:* https://api.github.com/repos/leanprover/lean4/releases/tags/v4.35.0 · https://github.com/leanprover/elan/releases/tag/v4.2.4
- *Confidence:* high.

### 2.2 Tactics and libraries that change teaching

**F4. `grind` is the default heavy automation.**
- The reference describes it as "inspired by modern SMT solvers". It works by contradiction on a shared "whiteboard" using congruence closure, E-matching, constraint propagation, guided case analysis, and satellite solvers for linear integer arithmetic, commutative rings and fields, and linear arithmetic.
- Its proofs are ordinary Lean proof terms.
- The reference warns it is not for "combinatorially explosive problems" and points bit-level work to `bv_decide`.
- An official tutorial, "Using `grind` for Ordered Maps", exists.
- [measured] `unfold transfer; split <;> grind` proved two-account conservation and non-negativity.
- [measured] The `grind` proof depends on `Classical.choice`. The `simp`/`omega` proof of the same theorem depends only on `propext, Quot.sound`. This is a nice, concrete "read the axioms" moment.
- *Sources:* https://lean-lang.org/doc/reference/latest/The--grind--tactic/ (4.36.0-rc1) · https://lean-lang.org/doc/tutorials/
- *Confidence:* high.

**F5. `lia` versus `omega`.**
- The 4.22 notes, under the heading "Grind is released!", describe cutsat as "superseding `omega`, with model construction". 4.27 renamed it `lia` "for better alignment with standard terminology in the theorem proving community" (#11330).
- `omega` still exists and is still documented in the tactic reference.
- 4.29 clarifies: "The `lia` tactic is intended for linear integer arithmetic only."
- *Sources:* release notes for 4.22, 4.27 and 4.29 · https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Tactic-Reference/
- *Confidence:* high.

**F6. `bv_decide` gives Z3-like counterexamples inside Lean, with a trust footnote.**
- It "calls a state-of-the-art SAT solver (CaDiCaL) and then returns a compact, machine-checkable certificate". `cadical` ships in the toolchain.
- [measured] Under `import Std.Tactic.BVDecide`, the guarded 64-bit claim `amt ≤ a → a - amt ≤ a` was proved.
- [measured] The unguarded claim was refuted with the counterexample **`a = 0#64, amt = 9223372036854775808#64`** (that is, 2^63). This is a direct Lean twin of the course's Z3 wraparound specimen S1.4.
- [measured] The proved theorem's axioms include **`bv_sub_no_wrap._native.bv_decide.ax_1_5`**. The certificate check runs as compiled code, so `lake check`'s default axiom policy rejects it (F15).
- *Sources:* grind chapter (above) · https://lean-lang.org/doc/reference/latest/ValidatingProofs/
- *Confidence:* high.

**F7. `decide`, `decide +kernel` and `decide +native`.**
- [measured] `decide +kernel` on `(List.range 50).foldl (·+·) 0 = 1225` depends on no axioms.
- [measured] `decide +native` creates `small_native._native.decide.ax_1_1`. `native_decide` creates `big_native._native.native_decide.ax_1_1`.
- [measured] `native_decide` on a goal with free variables fails at build time ("Expected type must not contain free variables").
- 4.35 made `Decidable` "a structure holding a `Bool` and a proof", so `decide` is faster and more equations hold by `rfl`.
- *Sources:* 4.35.0 notes (#8309) · ValidatingProofs (above)
- *Confidence:* high.

**F8. `cbv`, `try?` and `simp` changes.**
- `cbv` has been user-facing since 4.29 and was no longer experimental by 4.30.
- `try?` proposes proofs. Automatic suggestions arrived in 4.33, behind options that default to off.
- `simp? +suggestions` arrived in 4.26.
- Since 4.29, `simp` no longer simplifies instances by default.
- *Source:* release notes 4.26–4.33. *Confidence:* high.

**F9. The standard library is in core, Batteries still exists, and the language is mid-migration.**
- `Std.HashMap` and `Std.TreeMap` ship with lemma libraries. For example, `Std.TreeMap.getElem?_insert` and `size_insert` are in `Std.Data.TreeMap.Lemmas`.
- Iterators, `Std.Time`, and `Std.Async`/`Std.Http` (since 4.31) are in core.
- Batteries remains active and tracks 4.36.0-rc1.
- Migrations under way: the module system (stable since 4.27), the new `do` elaborator (default since 4.32), and the String overhaul (4.25–4.27). Each broke downstream code once.
- *Sources:* https://lean-lang.org/doc/api/Std/Data/TreeMap/Lemmas.html · release notes · https://github.com/leanprover-community/batteries
- *Confidence:* high.

**F10. Intrinsic, Dafny-style verification is native but experimental.**
- A `def` with `requires`/`ensures` (plus `given` in 4.35 and `throws` in 4.36) "expands to the plain definition plus a `vcgen`-proven, `@[spec]`-tagged specification theorem `f.spec`".
- `do` blocks support `assert`, `while … invariant … decreasing …` and `for x in xs invariant …`.
- Two options must be set: `set_option experimental.vcgen true` and `set_option experimental.intrinsic true`.
- The reference has a `vcgen` chapter. The `mvcgen` chapter says it is "superseded by `vcgen`". Official tutorials exist for both.
- [measured, 4.35.0] With no manual proof, `vcgen` proved:
  - `transfer.spec : ∀ a b amt, ⦃0 < amt ∧ amt ≤ a⦄ transfer a b amt ⦃fun r => r.fst + r.snd = a + b ∧ 0 ≤ r.fst ∨ a < 0⦄`;
  - a `StateM` loop `for amt in amts invariant _ _ s => s.1 + s.2 = total` that preserves conservation.
- [measured] Dropping `amt ≤ a` from the guard produced: `error: unproved verification conditions for the contract of transferBad … case vc1 … a✝ : 0 < amt ∧ 0 ≤ a ⊢ 0 ≤ (a - amt, b + amt).fst`.
- The syntax changed in 4.34, 4.35 and 4.36. One example: the `⦃ P ⦄ c ⦃ v, Q ⦄` triple form was removed in 4.35. Treat it as unstable.
- *Sources:* https://lean-lang.org/doc/api/Lean/Elab/Tactic/Do/Contract.html · https://lean-lang.org/doc/reference/latest/The--vcgen--tactic/ · https://github.com/leanprover/lean4/blob/v4.35.0/tests/elab/intrinsicVerification.lean · PR #14589 (merged 2026-07-30)
- *Confidence:* high on existence and behaviour; low on syntax stability.

**F11. Definitions that matter for interpreters.**
- Since 4.24, `partial_fixpoint` supports `Option`- and `EIO`-style monads.
- The `coinductive` keyword arrived in 4.25.
- Well-founded definitions with a `Nat` measure became reducible in 4.27.
- `strong_induct` principles for inductive predicates arrived in 4.35.
- `fun_induction` and `fun_cases` are in the tactic reference.
- *Sources:* release notes · tactic reference. *Confidence:* medium. These were read via summaries and not exercised locally.

### 2.3 Trust and auditing

**F12. The official validation ladder.** The reference's "Validating a Lean Proof" page defines four levels and a threat model. Its headings are listed in order below.
1. **"The Blue Double Check Marks"** (the editor, or `lake build`). These do not protect against problems in dependencies or against a statement that doesn't match its meaning.
2. **"Printing Axioms".**
   - It names three "standard axioms of Lean's logic, and benign": `propext`, `Classical.choice` and `Quot.sound`.
   - "If `sorryAx` is reported, then this theorem or one of its dependencies uses `sorry` or is otherwise incomplete."
   - "If axioms with `_native` in their names are reported, then native evaluation is used."
   - "Any other axiom means that a custom axiom was declared and used".
3. **"Re-Checking Proofs with `lean4checker`".** It says "run `lean4checker --fresh` on the module". The page still uses the pre-4.28 name; the bundled binary is `leanchecker` (F14).
4. **"Gold Standard: `comparator` and external checkers".**
   - "In a trusted environment, write the theorem **statement** (the 'challenge'), and then judge the proposed proof against it with `lake comparator`, with external checkers enabled."
   - "This should only be necessary for high risk scenarios (proof marketplaces, high-reward proof competitions, unaligned AI)."
   - "At the time of writing, `comparator` supports using the official Lean kernel and the external checker `nanoda`". The 4.35.0 binary already bundles four more (F15), so **the docs lag the binary**.

**Threat model.**
- *Honest* code tries to create a valid proof. *Malicious* code "goes out of its way to trick or mislead the user". Malicious "includes un-reviewed AI-generated proofs and programs."
- "it is important to distinguish the question 'does the theorem have a valid proof' from 'what does the theorem statement mean'." This is the roadmap's learning rule 4 in the FRO's own words.

**Native computation.**
- "Specific uses wrapped in honest tactics (e.g. `bv_decide`) are generally trustworthy."
- "External checkers (`lean4checker`, `comparator`) cannot check such proofs, as they do not have access to the Lean compiler."

**Remaining assumptions**, verbatim:
- "The soundness of Lean's logic."
- "The plumbing provided by the `comparator` tool is correct."
- "The sandbox used by `comparator` is secure."
- "There is no implementation bug affecting all of the used checkers simultaneously."
- "No human error or misleading presentation of the theorem statement in the trusted challenge file."

- *Source:* https://lean-lang.org/doc/reference/latest/ValidatingProofs/ (4.36.0-rc1 edition; re-fetched in the resumed run)
- *Confidence:* high.

**F13. Native computation is now visible per use.**
- PR #14953 ("remove deprecated in-kernel native reduction", merged 2026-08-28) removed `Lean.reduceBool`, `Lean.reduceNat`, `Lean.ofReduceBool`, `Lean.ofReduceNat` and `Lean.trustCompiler`. Its reason: "Nothing in the toolchain used them any more", and the removal lets `#print axioms` "mean what it says".
- [measured] `with_sorry` reports `[sorryAx]` and `with_axiom` reports `[cheat]`.
- [measured] A file containing `sorry` **still compiles with only a warning**, exit code 0.
- *Sources:* https://github.com/leanprover/lean4/pull/14953 · local log
- *Confidence:* high.

**F14. leanchecker.**
- lean4checker was folded into the toolchain as `leanchecker` in 4.28 (2026-02-17). The standalone repo is archived.
- `bin/leanchecker-paranoid`, built with allocator hardening, arrived in 4.35.
- *Sources:* 4.28 and 4.35 notes · https://github.com/leanprover/lean4checker
- *Confidence:* high.

**F15. `lake check` (4.35).**
- PR #14990 merged on 2026-09-07. Its description notes that "the kernel accepts `sorryAx`, so a `sorry` is caught by this report and by nothing else."
- From `lake help check` [primary, from the binary]:
  - It builds the default targets, exports them, replays them through the kernel and errors on non-standard axioms.
  - The project is treated as untrusted and built inside a **`bwrap` sandbox**. Its `.olean` files are never loaded into Lake's own address space.
  - "`bubblewrap` is required, and needs either unprivileged user namespaces or to be installed setuid root." `COMPARATOR_BWRAP` overrides the sandbox executable.
  - The project must carry a `lake-manifest.json`.
  - `--paranoid` also runs `leanchecker-paranoid`, `lean4lean`, `nanoda`, `con-leche` and `con-ron`.
  - `--from-export <FILE>` checks an NDJSON export built elsewhere. The help lists "Using export files built in virtual machines for extra isolation" as a use, and warns that it "only establishes that the export file is accepted".
  - Exit codes: 0 means accepted, 1 means rejected, 2 means it could not start (no `bwrap`, no manifest, or no default targets).
  - `--inadvisably-no-sandbox` "can compromise the result fully".
- [measured] On this NixOS host the sandbox failed (`[nix-ld] FATAL … Posix(2)`). This looks environment-specific, so the runs below used `--inadvisably-no-sandbox` on code I wrote myself.
- [measured] Clean project, default kernel: accepted in **53.9 s**.
- [measured] `--paranoid`: accepted by all six kernels in **172.8 s**. lean4lean reported "checked 57943 declarations": the cost is the core-library closure, not the learner's code.
- [measured] Project with planted specimens: rejected, exit code 1, with `Axiom 'big_native._native.native_decide.ax_1_1' is not permitted; it is used by 'big_native'`, `Axiom 'sorryAx' is not permitted…` and `Axiom 'cheat' is not permitted…`. The log still says "Lean default kernel accepts the solution", which is a perfect lesson that kernel acceptance and the axiom policy are separate verdicts.
- *Sources:* https://github.com/leanprover/lean4/pull/14990 · 4.35.0 notes
- *Confidence:* high.

**F16. `lake comparator` (4.35).**
- It "establishes that every named theorem in the solution proves the same statement as the challenge, uses no axiom outside the permitted list, and is accepted by the kernel".
- Config is `comparator.json`. Required fields are `challenge_module`, `solution_module`, `theorem_names` and `permitted_axioms`. Optional fields are `definition_names` (the challenge's definition holes) and `external_kernels`.
  - `permitted_axioms` is "deliberately not defaulted: it is what the verdict means, so the challenge author states it".
  - `external_kernels` maps each checker to the command that runs it, e.g. `{"nanoda": ["nanoda_bin"]}`. The legacy `enable_nanoda: true` is still accepted.
- Flags: `--paranoid` runs the same five bundled checkers as `lake check`. `--challenge-from-export` and `--solution-from-export` judge prebuilt exports.
- The standalone `leanprover/comparator` repo is **archived**. Its last push was 2026-10-14, and it was seen archived on 2026-10-20. Its README says: "This project has been merged into core as of Lean release v4.35.0 in the form of `lake comparator` and the accompanying `lake check`. Users are advised to migrate". The standalone tool sandboxed with `landrun`; core uses `bwrap`.
- [measured, 4 runs on a transfer-conservation challenge]:

| Submission | Verdict |
|---|---|
| Honest proof | "Your solution is okay!" (2 s) |
| Same names, `transfer` redefined to do nothing | `error: Const does not match between challenge and target 'transfer'` |
| Weakened statement (only `amt = 0`) | `error: Challenge and solution theorem statement do not match: 'conserves'` |
| `native_decide` attempt | Fails at build time |

- *Sources:* `lake help comparator` · https://github.com/leanprover/comparator
- *Confidence:* high.

**F17. Independent kernels and the Lean Kernel Arena.**
- arena.lean-lang.org "presents, tests and benchmarks proof checkers for the Lean Theorem Prover". It runs scored accept and reject suites; the reject tests are invalid proofs that only an unsound checker would accept. It also has performance tests, including Mathlib and Cedar.
- At fetch time it listed about 27 checkers, including official v4.34.1, lean4lean, nanoda, con-leche and evmlean, plus trivial baselines.
- The Arena repo was created 2026-01-06 and is active.
- *Sources:* https://arena.lean-lang.org · https://github.com/leanprover/lean-kernel-arena
- *Confidence:* high on existence; medium on the exact table, because the fetched text was partly garbled.

**F18. The 2026 soundness incidents.**
- On **2026-07-25** a repository published a `sorry`-free Lean "disproof" of the Collatz conjecture. Its pipeline README lists leanchecker replay, axiom checks and "independent checking by pinned Nanoda".
- On **2026-07-28** issue #14576, "Kernel accepts wrong-structure projections, allowing an axiom-free proof of False", reduced it to a proof of `False`: "`'bad' does not depend on any axioms`".
  - The issue was opened at 03:28 UTC.
  - The postmortem says "We pushed a fix one hour after the report (#14577)". The PR, "fix: missing check at kernel inductive declaration", merged at 13:39 UTC.
  - **4.32.2** was published at 16:34 UTC the same day.
- Leo de Moura's **postmortem (2026-08-01)** explains the chain:
  - The Collatz "disproof" was "produced with AI assistance".
  - It chained **two distinct bugs**. "The official kernel had a missing check in the nested inductive type support". Meanwhile "nanoda did check that spot, but did not verify the type name in a projection node."
  - "The original Collatz repository also passed a week-old version of nanoda".
  - Key quotes: "checking with an independent kernel still works … but users who rely on it need current versions of both", and "Soundness cannot depend on an untrusted component refusing to build a bad term."
  - It adds: "comparator.live now runs nanoda by default, and nanoda is tracked daily so lean-eval and comparator stay current after upstream fixes" (see F40).
- 4.33.0 fixed about eight kernel soundness issues and labelled each by whether `comparator` users were affected.
- 4.34.0: "three soundness issues, found with AI adversarial testing", "reported by Daniel Selsam (OpenAI)". For one of them, "The bogus proof was also accepted by `nanoda`".
- 4.35.0 fixed paths to undefined behaviour and use-after-free in the official kernel that need extremely large inputs; one is described as "On inputs north of 100GB". The notes say "Kernels that are not based on the Lean runtime were not affected", which is another concrete argument for kernel diversity.
- *Sources:* https://github.com/xrchz/CollatzLean · https://github.com/leanprover/lean4/issues/14576 · https://github.com/leanprover/lean4/pull/14577 · https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576/ · notes for 4.32.2, 4.33.0, 4.34.0 and 4.35.0
- *Confidence:* high.

**F19. Community auditing tools.**
- **SafeVerify** (Apache-2.0) replays `.olean` files with `Environment.replay`, compares names, types and bodies, and rejects `partial`/`unsafe`. It admits it cannot catch `implemented_by`/`extern`. PutnamBench's leaderboard used it for some submissions.
- **axiom-audit** (leanprover-community, created 2026-06-23).
- **lean-lsp-mcp `lean_verify`** returns the axioms used plus a source scan for `set_option debug.*`, `@[implemented_by]`, `unsafe` and similar.
- *Sources:* https://github.com/GasStationManager/SafeVerify · https://github.com/leanprover-community/axiom-audit · https://github.com/oOo0oOo/lean-lsp-mcp/blob/main/docs/tools.md
- *Confidence:* high.

### 2.4 Lean in the browser

**F20. The official path is server-side.**
- lean4web: "the Lean server is running on a web server, and not in the browser". Instances run at live.lean-lang.org and lean.math.hhu.de, and "serious Lean code development and larger projects are considered out-of-scope".
- **Lean Workbench** (`leanprover/lean-workbench`, created 2026-03-05, Apache-2.0) is "experimental": a multi-user code-server inside bubblewrap, about 3 GiB of RAM per concurrent user, GitHub OAuth, and Mathlib (about 5 GB).
- The FRO roadmap calls Workbench "a zero-install web environment … in beta". I found no public FRO-hosted instance [unverified].
- *Sources:* https://github.com/leanprover-community/lean4web · https://github.com/leanprover/lean-workbench · https://lean-lang.org/fro/roadmap/y4-1/
- *Confidence:* high.

**F21. Community WebAssembly Lean works today.**
- **cauli/lean4-wasm-in-browser** (Apache-2.0, live at https://lean.cau.li) builds a custom fork, `cauli/lean4@reinstate-wasm`. That branch is 124 commits ahead of upstream master and **about 950 behind** (956 at the 2026-10-21 UTC re-check). It was last pushed 2026-09-10, and the page footer says "Lean 4.33.0-pre".
  - README: the full desktop build is 48 MB JS plus 101 MB wasm with Std, Lean and Batteries; the slim iOS build is "Init only".
  - It runs NNG4's 9 worlds and 79 levels in the tab, minus Hint/Branch evaluation.
- [measured, headless Chromium 149, cold profile]:
  - `crossOriginIsolated = true`;
  - READY in 8.3 s and 6.3 s on two runs;
  - 137.5 MB decompressed payload: `lean.wasm` 100.8 MB, about 16.1 MB on the wire, plus about 32 MB of core library packs;
  - from the worker's own logs: Init environment (629 modules) imported in about 0.3 s; compiles took 297 ms (empty file), 145 ms (an `omega` example) and 14 ms (a failing goal).
- **seo-rii/wasm-idle PR #48** (merged 2026-10-10) runs *upstream* Lean 4.34.1 compiled with Emscripten. It handles programs only, Init only, at about 7–15 s per run with about 143 MB of static assets.
- **live-codes/browser-lean** is a proof of concept on the cauli artifacts. It reports "Cross-origin isolation is mandatory, with no fallback", a runtime ready about 2.2 s after the first Run, and a proof checked in about 0.3 s.
- *Confidence:* high on existence and my measurements; medium on longevity.

### 2.5 Agent integration

**F22. lean-lsp-mcp.**
- v0.31.0 (2026-09-30) on PyPI, MIT licence. It describes itself as "a research tool and … currently in beta".
- Tools include `lean_goal`, `lean_diagnostic_messages`, `lean_hover_info`, `lean_multi_attempt`, `lean_run_code`, `lean_verify`, `lean_build`, `lean_leansearch`, `lean_loogle` (remote: "3 req/30s"), `lean_leanfinder` and `lean_hammer_premise`.
- Claude Code setup: `claude mcp add lean-lsp uvx lean-lsp-mcp`.
- *Source:* https://github.com/oOo0oOo/lean-lsp-mcp. *Confidence:* high.

**F23. Lean Beam (FRO).**
- It is "a preview project for efficient interaction with Lean from AI agents and other tools".
- `runAt` speculatively executes tactics at file positions without editing files, available as the CLI `lean-beam run-at` or the MCP tool `lean_run_at`.
- Other features: `todo` (sorries, holes, diagnostics) and `.olean` checkpoints.
- The repo description calls it a "Claude/Codex skill and local workflow layer". It defaults to 4.36.0-rc1.
- The roadmap plans to "distribute it with Lean".
- *Sources:* https://github.com/leanprover/lean-beam · https://reservoir.lean-lang.org/@leanprover/beam · roadmap y4-1
- *Confidence:* high.

**F24. Other agent tools.**
- `cameronfreer/lean4-skills` (MIT, created 2025-10-17).
- LeanCopilot (tracks Lean; v4.35.0 shipped 2026-10-13).
- LeanDojo-v2 (Apache-2.0).
- Pantograph and the community REPL, both listed on lean-lang.org/documentation for machine use.
- kimina-lean-server.
- I found no official FRO MCP server other than Lean Beam's [unverified: absence].
- *Confidence:* high on existence.

**F25. AI proving in Lean is strong, and the FRO is building on it.**
- Seed-Prover reports fully proving 5 of 6 IMO 2025 problems in Lean and ">50% on PutnamBench".
- The FRO's y4-1 AI projects: **Tau Ceti** (AI-authored Mathlib-style mathematics), **Hex** ("Humans write specifications, and AI agents implement code and proofs") and **Palomar** (a registry of verified results).
- Its automation goals include making "error messages so AI agents can use these tactics effectively".
- *Sources:* https://arxiv.org/abs/2507.23726 · https://lean-lang.org/fro/roadmap/y4-1/ · https://github.com/leanprover/hex
- *Confidence:* high.

### 2.6 Program verification in Lean

**F26. Cedar is verification-guided development in production.**
- The cedar-spec Lean model is on v4.35.0. It defines a definitional evaluator, validator and symbolic compiler (`SymCC`).
- Proved properties include:
  - "If some forbid policy is satisfied, then the request is denied";
  - default-deny;
  - order and duplicate independence;
  - sound type checking, where only the errors `entityDoesNotExist`, `extensionError` and `arithBoundsError` remain possible;
  - **sound and complete symbolic compilation to SMT**.
- DRT against the Rust implementation runs via `cargo fuzz`.
- The VGD paper: proofs found 4 validator bugs; DRT and property testing found 21 more.
- *Sources:* https://github.com/cedar-policy/cedar-spec (cedar-lean README) · https://arxiv.org/abs/2407.01688 (2024-07-01)
- *Confidence:* high.

**F27. Velvet, Loom and Veil.**
- **Velvet** (`verse-lab/velvet`, Lean v4.34.0, Apache-2.0) is "a Dafny-style verifier for imperative programs embedded in the Lean proof assistant". It offers ghost state, partial and total correctness, and `#derive_tester_for` ("testing before proving"). Its root package is Mathlib-free.
- **Loom** (v4.24.0) is its WP-generation framework.
- **Veil 2.0** (pre-release, v4.32.0) specifies and verifies transition systems. It offers `#model_check`, uses cvc5, and has a live environment at try.veil.dev.
- *Sources:* https://github.com/verse-lab/velvet · https://github.com/verse-lab/loom · https://github.com/verse-lab/veil
- *Confidence:* high (venues of related papers [unverified]).

**F28. Aeneas.**
- Aeneas "functionalizes a subset of safe Rust" via Charon/LLBC to Lean (Lean backend on v4.35.0), F*, Coq or HOL4.
- Unsupported: nested-loop `return`/`break`, generics instantiated with `&mut`, unsafe code and concurrency.
- Papers at ICFP 2022 and ICFP 2024. Apache-2.0.
- Industrial case studies (e.g. SymCrypt) were not confirmed on the pages fetched [unverified].
- *Source:* https://github.com/AeneasVerif/aeneas. *Confidence:* high on scope and limits.

**F29. Hex's split.**
- "Each computational library is Mathlib-free", and the Mathlib correspondence proofs live in separate `*-theory` libraries.
- *Source:* https://github.com/leanprover/hex. *Confidence:* high.

### 2.7 Learning resources

**F30. TPIL.**
- *Theorem Proving in Lean 4* "assumes … Lean 4 (specifically `4.33.0`)".
- Chapters: 1 Introduction, 2 Dependent Type Theory, 3 Propositions and Proofs, 4 Quantifiers and Equality, 5 Tactics, 6 Interacting with Lean, 7 Inductive Types, 8 Induction and Recursion, 9 Structures and Records, 10 Type Classes, 11 Conversion Tactic Mode, **12 Axioms and Computation**.
- The roadmap's chapters 3–5 and 7–8 are unchanged.
- *Source:* https://lean-lang.org/theorem_proving_in_lean4/. *Confidence:* high.

**F31. FPIL.**
- *Functional Programming in Lean* says: "All code samples are tested with Lean release `4.33.0`"; © Lean FRO 2023–2026.
- It was ported to Verso on 2025-06-02 (commit `bb4e224cf7`), and the interludes became unnumbered.
- Current chapters: 1 Getting to Know Lean, 2 Hello World, 3 Type Classes, **4 Monads**, 5 Functors/Applicative, 6 Monad Transformers, **7 Programming with Dependent Types**, 8 Programming, Proving, and Performance.
- In the pre-port mdBook, chapter 4 was "Overloading and Type Classes" and chapter 7 was "Monad Transformers". The roadmap's "ch. 1–2, 4, 7" is therefore ambiguous; the current numbering fits Stage 3 (`Except` evaluators, typed ASTs).
- *Sources:* https://lean-lang.org/functional_programming_in_lean/ · fp-lean history
- *Confidence:* high.

**F32. NNG4 and the game server.**
- NNG4 is pinned to Lean **v4.23.0**. Its active worlds are Tutorial, Addition, Multiplication, Power, Implication, AdvAddition, LessOrEqual, AdvMultiplication and Algorithm. The repo was last pushed 2026-10-09.
- The lean4game server runs Lean server-side, sandboxed with bubblewrap.
- Local options: a devcontainer (recommended; first start "2–15 minutes"), Codespaces, or a manual install. Gitpod is listed as "does not work yet".
- **adam.math.hhu.de timed out twice: at 2026-10-21 01:40 UTC and again at 05:44 UTC (20 s limit).**
  - It resolves to the same IP as lean.math.hhu.de (134.99.156.253), and TLS completes, but no HTTP response arrives.
  - lean.math.hhu.de returned 200 (in 8 s), as did live.lean-lang.org.
  - This points to the game application, not the network.
  - lean4game had commits on 2026-10-20, and none of its eight newest issues reports an outage. Its README says to open an issue or contact the maintainers "in case of a server outage".
- The community WASM port keeps NNG at `lean.cau.li/game`; its README says "the original `/game` Natural Number Game URL remains unchanged".
- *Sources:* https://github.com/leanprover-community/NNG4 · https://github.com/leanprover-community/lean4game (README, `doc/running_locally.md`) · https://github.com/cauli/lean4-wasm-in-browser
- *Confidence:* high on facts; medium that this is more than a transient outage (two observations about four hours apart).

**F33. Hitchhiker's Guide, 2026 edition.**
- `lean-forward/logical_verification_2026` (created 2026-01-30) ships PDFs plus Lean files pinned to **v4.24.0 + Mathlib `stable`**.
- Lectures 01–14 each have Demo, Exercise and Homework files. Lectures **09 Operational Semantics, 10 Hoare Logic and 11 Denotational Semantics** are the relevant ones; LoVe10 builds `PartialHoare` rules and a **`vcg` tactic** via metaprogramming.
- Licence: BSD-3-style, © 2018–2026 Baanen, Bentkamp, Blanchette, Généreux, Hölzl and Limperg.
- *Source:* https://github.com/lean-forward/logical_verification_2026. *Confidence:* high.

**F34. Other texts.**
- The Lean 4 Metaprogramming book tracks 4.36.0-rc1.
- *Mathematics in Lean* is on 4.34.0.
- *The Mechanics of Proof* is pinned to 4.3.0, which is stale.
- Official tutorials exist for `vcgen`, `mvcgen` and `grind`.
- lean-lang.org/documentation lists Loogle, LeanExplore, LeanSearch, Verso, the REPL, Pantograph and lean4web.
- *Confidence:* high.

### 2.8 Lab friction

**F35. Install path.**
- The official instruction is "through VS Code and the Lean 4 VS Code extension". The extension walks the user through elan.
- [measured] `lake new ledger lib` produced `lakefile.toml`, `lean-toolchain`, `Ledger/Basic.lean`, `Ledger.lean` and a README.
- [measured] The first `lake build` of a four-theorem ledger took 0.3 s (144 ms for the module); `.lake` was 244 KB.
- *Source:* https://lean-lang.org/install/. *Confidence:* high.

**F36. Mathlib cost.**
- Mathlib's `.olean` files are about 5 GB, per the Workbench README.
- Mathlib's own devcontainer requests 4 CPUs and 8 GB and runs `lake exe cache get!`.
- Stats page: 139,460 definitions, 290,943 theorems and 772 contributors (undated page, fetched 2026-10-20).
- *Sources:* lean-workbench README · https://github.com/leanprover-community/mathlib4/tree/master/.devcontainer · https://leanprover-community.github.io/mathlib_stats.html
- *Confidence:* high (stats: medium).

**F37. CI and build bot.**
- `lean-action` v1.6.2 (2026-10-12) provides:
  - `leanchecker: true`, using the bundled binary on ≥ v4.28.0-rc1;
  - `nanoda: true`;
  - `axiom-audit: true`, which "fail[s] if any declaration … transitively depends on an axiom outside the allowlist";
  - Mathlib cache handling.
- For Mathlib projects it advises `LEAN_NUM_THREADS: "1"`.
- v1.6.2 has **no `lake check` or `lake comparator` input**. Its inputs are `leanchecker`, `lean4checker` (legacy), `nanoda`, `nanoda-allow-sorry`, `axiom-audit`, `axiom-audit-allow` and `axiom-audit-root`, plus the build, test, lint and cache inputs. A build bot that wants `lake check --paranoid` or comparator must add its own `run:` step, which needs bubblewrap (F15).
- *Source:* https://github.com/leanprover/lean-action (action.yml at v1.6.2). *Confidence:* high.

**F38. Cloud development environments.**
- Codespaces on a free personal account includes 120 hours and 15 GB-month per month. 2-core machines draw down at 2×, so about 60 wall-clock hours.
- [second-hand, kernelspace forge-friction dossier, 2026-10-03] gitpod.io now redirects to Ona, which starts at $20/month.
- [second-hand, same dossier] Files at `raw.githubusercontent.com/<o>/<r>/<sha>/…` are served with CORS `*`, which is the basis for a zero-server receipt import.
- *Sources:* https://docs.github.com/en/billing/concepts/product-billing/github-codespaces · kernelspace's forge-friction research dossier (2026-10-03)
- *Confidence:* high for Codespaces; medium for the second-hand items.

### 2.9 Authoring, benchmarks and practice banks (added in the resumed run)

**F39. Verso and SubVerso: Lean-checked course text and real proof states.**
- **Verso** (`leanprover/verso`, Apache-2.0) is the "Lean documentation authoring tool".
  - Its README says that "Today, Verso is usable for running a website and blog and for writing long-form technical documentation, such as the Lean language reference".
  - It is tagged per Lean release (`v4.35.0`, `v4.36.0-rc1`).
  - `verso-templates` ships `basic-book`, `textbook`, `basic-blog`, `slides` and `package-docs` starters.
  - The FRO roadmap says "Verso produces PDFs and interactive web pages from a single literate source".
  - The README warns the project "is currently undergoing change at a rapid pace".
- **SubVerso** (`leanprover/subverso`, Apache-2.0) is the extraction layer underneath Verso.
  - It "allows a Verso document to describe Lean code written in multiple versions of Lean", and its CI "validates it on every Lean release since 4.0.0".
  - Authors mark code with `-- ANCHOR: name` / `-- ANCHOR_END: name` and name a goal with `-- ^ PROOF_STATE: name`.
  - `subverso-extract-mod MODNAME OUT.json`, or the `highlighted` Lake facet, emits per-command JSON whose highlighted code includes **proof states**.
  - Caveat: "the specifics of its data formats is an implementation detail, not a public API. Please use SubVerso itself to read and write the data."
  - Toolchains before 4.25.0 need its `no-modules` branch.
- *Sources:* https://github.com/leanprover/verso (README, tags) · https://github.com/leanprover/subverso (README) · https://github.com/leanprover/verso-templates · https://lean-lang.org/fro/roadmap/y4-1/
- *Confidence:* high on features as documented; [unverified] in practice, because extraction was not run locally.

**F40. Comparator Live and lean-eval: the FRO's own "judge untrusted proofs" products.**
- **Comparator Live** (`leanprover/comparator-live`, Apache-2.0, created 2026-06-03, last push 2026-08-05) is "an online live.lean-lang.org-style playground for running the Comparator tool". Its README describes three design choices, all of which put the trust on the challenge:
  - It "always uses the standard set of three permitted axioms".
  - It "automatically infers the challenge theorems as all the theorems declared in the challenge".
  - It introduces **"trusted challenges"**, "identified by their hash", where "the hash of a challenge is `sha256(challenge.trimRight() + "\n")`". Trusted hashes come from `lean-eval` and a `TrustedChallenges` folder. Other challenges are "loudly flagged as unreliable in the UI" unless the user marks them locally trusted.
  - It compiles on a server.
  - The `comparator.live` domain named in the postmortem had no DNS record on 2026-10-21 UTC. I found no public instance [unverified: absence].
- **lean-eval** (`leanprover/lean-eval`, Apache-2.0, created 2026-04-10, pinned to v4.35.0-rc3) is "a comparator-based Lean benchmark for formal mathematics".
  - "A submission is scored entirely by comparator results: a problem counts as solved iff comparator accepts the submitted solution."
  - The leaderboard at https://lean-lang.org/eval/ is live (HTTP 200).
  - It is mathematics, not software verification.
- *Sources:* https://github.com/leanprover/comparator-live · https://github.com/leanprover/lean-eval · https://lean-lang.org/eval/
- *Confidence:* high.

**F41. human-eval-lean: a core-only bank of small verified programs.**
- `leanprover/human-eval-lean` (MIT, created 2025-04-30, last push 2026-03-27, pinned to `nightly-2026-03-27`) collects "hand-written _formally verified_ Lean 4 solutions" to the 164 HumanEval tasks. It is "inspired by human-eval-verus".
- Its purpose is "to assess the out-of-the-box experience of Lean 4 as a software verification tool, so this project will not take on dependencies such as Batteries".
- Missing lemmas are written into the file that needs them, so "the files in this repository clearly document what was missing from Lean core".
- There are 164 per-problem files, but not all are solved; the README links a progress table.
- *Source:* https://github.com/leanprover/human-eval-lean
- *Confidence:* high on facts; the solved count was not measured.

---

## 3. What this means for the course

### Cross-cutting

- **Stamp qualifiers become concrete.**
  - PROVED must carry `Lean <ver> · kernels: official[, nanoda, lean4lean…] · axioms: {propext, Quot.sound[, Classical.choice]}`.
  - A `_native` axiom downgrades the qualifier to "PROVED · compiler-trusted (bv_decide LRAT / native_decide)". This honest middle ground between PROVED and ASSUMED is exactly the kind of distinction DESIGN.md's stamp grammar exists for.
  - A stamp minted under a kernel later found unsound (e.g. < 4.32.2 for untrusted input) gets a dated **advisory**, the same mechanism as kernelspace's "this has changed" cards.
- **Receipt schema (PLAN §4).** Extend `lean?` with:
  - `toolchain`;
  - `checkers: [{name, version, verdict}]`;
  - `comparator: {challengeSha, verdict, permittedAxioms}`, where `challengeSha` is computed exactly as Comparator Live computes it: `sha256(challenge.trimRight() + "\n")` (F40). A challenge hash then means the same thing in the course as in the FRO's tool;
  - `nativeAxioms[]`;
  - `sandbox: bwrap|none`.
  `lake check` and `lake comparator` exit codes (0/1/2) are scriptable, so `plinth bench check` can wrap them. The TCB line on each receipt can now be precise: "Lean kernel 4.35.0 (+ nanoda), leanexport, comparator plumbing, bwrap sandbox, the challenge statement, your machine".
- **Lean "Call It" items get a build gate for free.** Lean's `#guard_msgs` asserts expected output, including error text. `verify:calls` can compile every authored "what will Lean say?" item against the pinned toolchain in CI.
- **The Audit Desk gets real specimens.** Seed cases from measured verdicts:
  - comparator `Const does not match … 'transfer'` (drift, gap 8);
  - statement mismatch (too weak, gap 1);
  - `sorryAx` accepted by the kernel but rejected by policy (hidden trust, gap 6);
  - a `_native` axiom (gap 6);
  - a custom `axiom cheat` (gap 6);
  - "kernel-checked disproof of Collatz", from the postmortem. It shows that diverse kernels must be *current* (gaps 6 and 7). Link to the issue and the Arena regression test; do not ship exploit code in lab zips.
- **New Audit Desk case: comparator against a wrong challenge.** Comparator moves all trust onto the challenge statement. A case where comparator says "okay!" but the challenge encodes the wrong business rule is gap 12 (requirement mismatch), and it is the roadmap's learning rule 4 made concrete. The FRO built Comparator Live's hash-identified "trusted challenges" (F40) for exactly this reason.

### Course 01 → 02 bridge

The roadmap pairs Z3 (Stage 1) and Lean (Stage 2). The S1.4 wraparound specimen should be re-found in Lean with `bv_decide`. It returns `a = 0, amt = 2^63` just as Z3 does. This one short lesson connects "solver found a counterexample" with "proof assistant found a counterexample", and introduces the `_native` trust footnote.

### Course 02 — Proof (Lean)

- **Pin** Lean 4.35.x, or 4.36.0 once stable (expected about mid-November 2026 [estimated from cadence]), with **core only and no Mathlib**.
- **Finite maps (lesson 2.8):**
  - Replace `Finmap`/Finset, which need Mathlib, with `Std.TreeMap`, which has lemmas like `getElem?_insert` and `size_insert`.
  - Or use a function `Account → Int` with point update plus a `List.sum` over a fixed account list.
  - Self-transfer stays the planted specimen.
- **Automation honesty (2.5–2.7):**
  - Prove C2.1 by `unfold; split; omega` and then show that `grind` closes it in one line.
  - Make the Call It question "which axioms will each proof use?" Answer [measured]: `omega` uses propext and Quot.sound; `grind` adds Classical.choice.
  - The viva rule "explain the induction without naming tactics" matters more, not less.
- **Lesson 2.9 becomes "The validation ladder".** Teach the reference manual's four levels with real outputs:
  - `sorry` builds green with only a warning;
  - `#print axioms` names `sorryAx`, `_native` and custom axioms;
  - `leanchecker`;
  - `lake check --paranoid` with six kernels;
  - `lake comparator`.
  End with the Collatz postmortem. Add **TPIL ch. 12 (Axioms and Computation)** to the reading.
  - Include one dated-claim moment. The manual (4.36.0-rc1 edition) says comparator supports the official kernel and nanoda, but `lake help comparator` on 4.35.0 lists five bundled checkers (F12, F16). The binary's own help is the authority, and the receipt records which checkers actually ran.
  - Close on the manual's sentence separating "does the theorem have a valid proof" from "what does the theorem statement mean". That sentence leads straight into 2.10.
- **Lesson 2.10 (statement review):** each lab ships `Challenge.lean` + `comparator.json`. The learner sees that comparator catches drift and weakening, and that nothing catches a wrong challenge.
- **Readings:** NNG4 (Tutorial, Addition, Multiplication, Implication), then TPIL 3–5, 7–8 and 12.
  - NNG4 runs on its own dialect and on Lean 4.23. Warn that tactic behaviour differs slightly from 4.35.
  - Give two fallbacks for when adam.math.hhu.de is down (it timed out twice during this research): the in-browser port at lean.cau.li/game (community), or the NNG4 devcontainer.
- **Optional extra reps:** offer a curated handful of solved `human-eval-lean` problems as program + spec + proof exercises (MIT, core-only, no Batteries; F41). Re-pin them to the course toolchain in CI first, because the repo is on a March 2026 nightly.

### Course 03 — Semantics (Mini-Plinth in Lean)

- **Cite FPIL by title:** Getting to Know Lean; Hello, World!; Monads (for `Except` and state); Programming with Dependent Types (for intrinsically typed ASTs). Optionally add the "Interlude: Tactics, Induction, and Proofs".
- **Add LoVe 2026 lectures 09 (Operational Semantics) and 11 (Denotational Semantics)** as Lean-native companions to Harper's *PFPL*. The licence allows adapting exercises with attribution.
- **Use Cedar's sound-type-checking theorem as the model for C3.1/C3.2.** It states type safety *with an explicit list of allowed runtime errors*, which is exactly Mini-Plinth's "explicit error semantics".
- **Termination (lesson 3.8):** structural recursion, `termination_by`/`decreasing_by`, fuel, and a one-paragraph preview of `partial_fixpoint` for when loops arrive.
- **Golden-case export (`#eval` → JSON):** stays the correspondence check for the TS interpreter. `lake exe` can emit the cases directly.

### Course 04 — Obligations

- **The roadmap's core build stays:** the learner writes `miniplinth check` (VCGen → Z3), plus the Derivation Board.
- **Add two Lean-side comparisons after it:**
  - **LoVe10's VCG tactic.** About 60 lines of metaprogramming that apply Hoare rules backwards. It shows a VCG *inside* a prover.
  - **Lean's own `vcgen` with `def` contracts** (an "experimental" dated claim). The same `transfer` with `requires 0 < amt ∧ amt ≤ a` proves automatically [measured]. Dropping `amt ≤ a` shows the exact VC `0 ≤ (a - amt, b + amt).fst` under hypotheses. The learner compares it with their own VC from the Z3 path.
- **Lesson 4.8 (the trust stack):** cite Cedar's *sound and complete* SymCC theorem as the industrial answer to "VCGen correctness vs solver correctness". C4.3 ("VCGen soundness for assign + if, in Lean") is the same kind of theorem at toy scale.
- **Specimen:** the `bv_decide` counterexample connects "the encoding is the claim" (`Int` vs `BitVec 64`) across tools.

### Courses 05 and 08 — Time and Effects (TLA+)

Keep TLA+, as the roadmap says. Add **Veil** to the Deferred Shelf with the trigger: "you want an inductive-invariant *proof* of the holds protocol rather than bounded TLC". Veil does model checking plus proofs inside Lean and has a live sandbox at try.veil.dev. Cross-link byzantine rather than duplicating its Raft material.

### Course 06 — Correspondence (Postgres + Rust)

Use Cedar's DRT as the model: an executable Lean definitional engine, called from Rust and differentially fuzzed against production. It is AWS's published approach. Make it a reading and an Audit Desk case: "20k DRT runs presented as a proof" (gap 11). The VGD paper's 4 + 21 bug split is a useful, sourced illustration of what proofs and tests each find.

### Course 07 — Secrecy

Cedar's proved authorization properties are worked examples of *policy-level* claims: forbid overrides permit, default deny, and order independence. Contrast them with the course's noninterference claims, which are hyperproperties that Cedar's theorems do not state. That keeps "enforcement vs noninterference" sharp.

### Course 09 — Preservation

- The Lean 4 Metaprogramming book is current (4.36.0-rc1).
- **Lesson 9.9 (draw the TCB)** can now list real, versioned components: kernel(s), `leanexport`, comparator plumbing, the sandbox, the compiler (only when `_native` axioms appear), and the challenge statement.
- **Aeneas** (Rust → Lean, safe-Rust subset) and **Velvet** (Dafny-style in Lean, with `#derive_tester_for`) go on the Deferred Shelf.
  - Trigger: "a C9 claim's correspondence field names Rust runtime code you want to verify directly".
  - This mirrors the roadmap's deferral of Kani/Verus.

### Course 10 — Assembly

The assurance report embeds the Lean checker matrix and comparator verdicts per theorem, with tool versions. It also states the known advisories. That makes "publish tool versions and known limitations" mechanical.

### Instruments

- Keep **Goal Replay** (always available) as the default Lean instrument, but **generate** its strips at build time from the real solution files. Hand-authoring them is the alternative to avoid.
  - Mark the steps with SubVerso `PROOF_STATE` anchors and extract them on the pinned toolchain.
  - Convert the output to the site's own JSON with a small Lean executable, because SubVerso's format "is an implementation detail, not a public API" (F39).
  - Add a `verify:replay` build gate (CHECKED). A re-pin that changes a goal then fails CI instead of letting the replay drift from what Lean actually shows.
- Add an **opt-in in-browser Lean cell** for core-Lean snippets: Call It on "accepted?", `#print axioms` drills, and tiny `decide`/`omega` checks. Base it on the Apache-2.0 WASM artifacts, self-hosted and SHA-pinned.
  - It needs COOP/COEP. GitHub Pages can't set those headers, so use coi-serviceworker, as kernelspace's research found [second-hand].
  - Make it desktop-first: iOS gets Init only.
  - Label it "practice instrument: unofficial build, Lean 4.33-pre fork; the Bench is authoritative".
  - Run every authored cell in CI against both the fork and the official toolchain, and fail the build on divergence.

### Bench and lanes

| Lane | What it is | Notes |
|---|---|---|
| A | Native: VS Code + elan | Recommended |
| B | Devcontainer (Linux) | `lake check` works |
| C | Codespaces | 2-core; about 60 h/month free |
| D | GitHub build bot | Template repo + `lean-action` v1.6.2 (`leanchecker`, `nanoda`, `axiom-audit`), plus an explicit `run:` step for `lake check --paranoid` and `lake comparator`, which lean-action has no input for (F37). Writes a receipt branch that the site imports via raw.githubusercontent (CORS `*`) |

If bubblewrap cannot create user namespaces on a runner, the help text's own remedy is a setuid-root `bwrap` (F15). On Ubuntu 24.04 images the AppArmor user-namespace restriction may also need relaxing [unverified on GitHub runners].

Gitpod/Ona is not a lane. Budget `lake check --paranoid` as a once-per-lab CI step (about 3 min measured on a fast desktop). Use `lake comparator` per submission (about 2 s measured).

### Agents

- The lab-zip `AGENTS.md` should install lean-lsp-mcp (read-only tools: goal, hover, diagnostics, `lean_verify`) and optionally Lean Beam.
- Guardrails follow kernelspace's H1 pattern: the proof bodies of `TODO(you)` theorems are protected.
- State the FRO's own rule in the course: *unreviewed AI proofs are treated as potentially malicious until comparator plus external kernels accept them against a human-reviewed challenge*.
- Point to the FRO's own precedent: it scores its AI benchmark, `lean-eval`, by comparator verdict alone (F40). Lean receipts for agent-assisted work should follow the same rule.
- "Prove it, no AI" for Lean means explaining the induction and naming the axioms without the agent.

---

## 4. Recommendations (ranked)

1. **Pin one Lean toolchain per course edition, core-only, as a dated claim with a re-pin gate.**
   - Use v4.35.x now, and 4.36.0 when stable [estimated about mid-November 2026].
   - CI `verify:labs` builds templates and solutions on the pin and on the newest stable release every month. A break opens a "this has changed" card.
   - No Mathlib anywhere in Courses 02–09. If a later claim needs Mathlib, follow Hex's split into a separate `*-theory` package.
2. **Make the official validation ladder the backbone of lesson 2.9, the receipts and the stamps.**
   - `#print axioms` goes into every receipt.
   - `lake comparator` runs per lab, against shipped challenge files.
   - `lake check --paranoid` runs in the build bot.
   - Stamp qualifiers name kernels, versions and axioms.
   - `_native` axioms render as "compiler-trusted".
3. **Ship `Challenge.lean` + `comparator.json` with every Lean lab, and seed the Audit Desk from real verdicts.** Use the four measured comparator verdicts, the `lake check` axiom rejections, and the Collatz postmortem as the capstone story of Course 02. Add one "comparator says okay, the challenge is wrong" case for gap 12. Hash each challenge the way Comparator Live does (`sha256(challenge.trimRight() + "\n")`), and publish the course's trusted-challenge hashes with each edition.
4. **Add the `bv_decide` counterexample twin of S1.4, `#guard_msgs`-checked Lean Call-It items, and SubVerso-generated Goal Replay strips.** This is cheap and has high leverage:
   - it ties Courses 01, 02 and 04 together;
   - `verify:calls` covers Lean;
   - a `verify:replay` gate keeps every displayed goal identical to what the pinned toolchain prints (F39).
5. **In Course 04, add a Lean-side comparison after the learner's own VCG.** It has two parts: LoVe10's `vcg` tactic and Lean's `vcgen` with `def` contracts. Label the latter experimental with an as-of date. Never replace the hand derivation or the learner-built Z3 checker.
6. **Update the readings and cite chapters by title.**
   - TPIL 3–5, 7–8 and **12**.
   - FPIL: Getting to Know Lean, Hello World, Monads, Programming with Dependent Types.
   - **LoVe 2026 lectures 09–11** (BSD licence, adaptable with attribution).
   - Cedar's cedar-lean README and the VGD paper for Courses 06–07.
   - The official `vcgen` and `grind` tutorials as optional reading.
   - `human-eval-lean` (MIT, core-only) as an optional practice bank, re-pinned first (F41).
7. **Ship an opt-in in-browser Lean instrument on self-hosted, pinned WASM artifacts, behind Goal Replay.** Never let it award credit. Add a CI divergence check against the official toolchain. Re-evaluate quarterly, because the fork lags upstream by about 950 commits.
8. **Use four Bench lanes: native, devcontainer, Codespaces and a `lean-action` build bot.**
   - Document `lake check`'s Linux and bubblewrap requirement: unprivileged user namespaces or a setuid-root `bwrap`.
   - lean-action v1.6.2 has no `lake check` input, so the bot adds a `run:` step.
   - On macOS and Windows, receipts use `leanchecker` + nanoda via the build bot.
   - Provide NNG fallbacks for when the HHU server is unreachable.
9. **Wire agent tooling in, behind guardrails.**
   - lean-lsp-mcp read-only tools, plus Lean Beam as optional.
   - Teach the FRO threat model: unreviewed AI proofs are untrusted until judged by comparator.
   - Label agent-assisted claims.
10. **Put dated entries with triggers on the Deferred Shelf:**
    - Aeneas and Velvet: Rust or imperative code verification (Course 09);
    - Veil: inductive invariants for TLA+-style protocols (Courses 05/08);
    - Mathlib: real analysis or Finset algebra;
    - Lean Workbench: when a public FRO instance with terms exists.
11. **Register volatile items as stale-prone claims with a re-verify date of 2027-01:**
    - `vcgen` and contract syntax (changed in each of 4.34, 4.35 and 4.36);
    - the `mvcgen` deprecation;
    - Workbench beta status;
    - WASM fork status;
    - Arena tables;
    - lean-lsp-mcp and Beam versions;
    - NNG4's toolchain and host availability;
    - the manual's list of checkers comparator supports, which lags the binary;
    - SubVerso's extraction format.

---

## 5. Open questions

1. Does `lake check`/`lake comparator`'s bubblewrap sandbox work on **GitHub-hosted ubuntu-24.04 runners**, where AppArmor restricts unprivileged user namespaces? And on macOS or Windows at all? I could only test NixOS, where it failed because of nix-ld [unverified elsewhere]. The help text documents a fallback, a setuid-root `bwrap`, which a runner with `sudo` can install. Whether that is enough on GitHub's runners is untested.
2. How long do `lake check --paranoid` and comparator with `external_kernels` take on a **mid-range laptop** and a 2-core Codespace? The 53.9 s and 172.8 s figures come from a 20-core desktop.
3. Will 4.36.0 stable or 4.37 change the contract and `vcgen` syntax again? Should the learner's own projects use `vcgen` before it leaves experimental status?
4. Will the FRO host a public Lean Workbench, and under what privacy terms? That would bear on the no-accounts, no-telemetry promise.
5. How long will the WASM fork last, and will upstream build a WASM target? (The branch name "reinstate-wasm" suggests upstream once had one.) Two smaller points: one community fork of the browser build (astroautomata/lean4-wasm-in-browser) carries GPL-3.0 while the upstream fork is Apache-2.0, and InfoView-style goal display is available in the game route but unconfirmed in the playground.
6. **Partly resolved: comparator.live.** The postmortem's "comparator.live" matches the `leanprover/comparator-live` project, an online comparator playground (F40). The domain has no DNS record, and I found no public instance. Is one hosted, and under what privacy terms? The course should know before it links learners to it, given the no-accounts, no-telemetry promise.
7. Is adam.math.hhu.de's outage transient? It timed out twice, about four hours apart (01:40 and 05:44 UTC on 2026-10-21), with TLS up but no HTTP response.
8. How strong are AI provers on *software-verification* tasks, as opposed to competition mathematics, and how much should Audit Desk cases assume? Not researched, because web search was exhausted.
9. Would adapting LoVe exercises into the course need anything beyond BSD-3 attribution, for example if the authors prefer it?
10. How much glue will SubVerso-generated Goal Replay need across re-pins, given that its JSON format is explicitly not a public API (F39)? A one-day spike across two consecutive toolchains would answer it.

---

## 6. Verification log

### Checked directly: fetched primary pages, GitHub API, `gh api` read-only, all on 2026-10-20

- Lean releases list and `releases/` index.
- Notes for 4.22, 4.23, 4.24, 4.25, 4.26, 4.27, 4.28, 4.29, 4.30, 4.31, 4.32, 4.32.2, 4.33, 4.34, 4.35 and 4.36-rc1.
- PRs #14990, #14953, #15099 and #14589, and issue #14576.
- Leo de Moura's postmortem and `xrchz/CollatzLean` (README and commits).
- Reference manual pages: TOC, ValidatingProofs, grind, vcgen, mvcgen, Interacting, Tactic Reference, tutorials, Contract API and TreeMap lemmas.
- FRO roadmap index and y4-1.
- Repos: comparator (archived; last push 2026-10-14), lean-kernel-arena and arena.lean-lang.org, lean4checker (archived), lean4lean, nanoda_lib, lean4export, SafeVerify, axiom-audit, lean-action (action.yml, v1.6.2), lean4web, lean-workbench, lean4game (`running_locally.md`) and NNG4 (toolchain and worlds).
- Repos: cauli/lean4-wasm-in-browser (README, fork compare), seo-rii PR #48, live-codes/browser-lean, lean-lsp-mcp (README, tools.md, PyPI and GitHub releases), lean-beam (README, Reservoir), lean4-skills, LeanCopilot (toolchain and releases) and LeanDojo-v2.
- Repos: cedar-spec (README, cedar-lean README, toolchain), Velvet, Loom, Veil, Aeneas and Hex.
- Texts: TPIL and FPIL pages, the fp-lean history (pre-Verso SUMMARY.md), LoVe 2026 (tree, toolchain, manifest, licence, LoVe10 demo).
- Other pages: lean-lang.org/documentation, /install, the Mathlib stats page, Mathlib's devcontainer, the Codespaces billing docs, and arXiv 2407.01688 and 2507.23726.
- Availability probes with curl at 2026-10-21 01:40 UTC (18:40 local on 2026-10-20).

### Measured locally on 2026-10-20

Artifacts are in `research/evidence/lean-measure/` (`out/caul2.netlog.json` is not included).

| What | Script or project | Log or output |
|---|---|---|
| elan and toolchain install | `scripts/measure-local.sh` | `measure.log` |
| Ledger, `#print axioms`, `bv_decide`, `decide`, contracts | `proj/ledger/Ledger/{Basic,Bad,Bits,BitsBad,Contract,ContractBad}.lean` | — |
| `lake check` with specimens | `proj/ledger` | `proj/check-bad.out` |
| comparator verdicts | `proj/judge` | `cmp-honest.out`, `cmp-drift.out`, `cmp-weak.out` |
| WASM probes | `scripts/probe-wasm*.cjs` | `out/caul*.json`, `out/caul2.netlog.json` |

The toolchain (3.0 GB) was kept outside the repository; setting `ELAN_HOME` to its directory allows reuse.

### Read through a summarising fetcher

WebFetch returns a small model's summary of each page. Release-note and README details were read that way. Load-bearing claims were cross-checked against PR or API data, or reproduced locally:
- `lake check` and `--paranoid`;
- comparator;
- `_native` axioms and the trustCompiler removal;
- the bundled checkers (seen in the toolchain's `bin/`);
- contracts and `vcgen`;
- `bv_decide` counterexamples;
- the WASM numbers.

Items that rest on summaries alone:
- F11 (`partial_fixpoint`, coinductive, strong induction);
- the Arena table's exact counts;
- the Mathlib stats.

### Second-hand

- Gitpod → Ona pricing, CORS on raw.githubusercontent, and coi-serviceworker for Pages. Source: kernelspace's `forge-friction.md`, 2026-10-03. In the resumed run I confirmed that the dossier says this; I did not re-check the vendors.

### Re-verified in the resumed run (2026-10-21, 05:30–06:15 UTC)

- **GitHub API, read-only.** Everything matched unless noted:
  - release tags and dates from v4.33.0 to v4.36.0-rc1, including 4.32.2 at 16:34 UTC on 2026-07-28;
  - issue #14576, and PRs #14577, #14589, #14953 and #14990;
  - every toolchain pin quoted in §2: NNG4, TPIL, FPIL, LoVe, Mathlib, Batteries, Velvet, Loom, Veil, cedar-lean, Aeneas, Hex, Beam, the metaprogramming book, MIL and LeanCopilot;
  - lean-action v1.6.2 and its inputs, elan v4.2.4, lean-lsp-mcp 0.31.0 (PyPI) and seo-rii PR #48;
  - the cauli fork's lag, now **956** commits;
  - repo metadata for the tools in F17–F24;
  - new in this run: verso, subverso, verso-templates, comparator-live, the lean-eval family (leaderboard HTTP 200), human-eval-lean, and the lean4game README and issues.
- **Local.**
  - The toolchain's `bin/` holds all twelve binaries named in F3, in 3.0 GB.
  - `lake help check` and `lake help comparator` (Lake 5.0.0, Lean 4.35.0).
  - The saved `check-bad.out`, `cmp-*.out` and WASM probe JSON (READY 8257 ms and 6267 ms; footer "Lean 4.33.0-pre") all match §2.
- **Fetched with prompts asking for verbatim quotes:** ValidatingProofs (4.36.0-rc1), the postmortem, notes for 4.22.0, 4.27.0 and 4.35.0, and roadmap y4-1 ("covers September 2026 to February 2027").
- **Probes at 05:44 UTC.** adam.math.hhu.de timed out again; live.lean-lang.org, lean.math.hhu.de, lean.cau.li and arena.lean-lang.org returned 200; `comparator.live` has no DNS record.
- **Course cross-references.** Confirmed:
  - PLAN.md lesson, claim and specimen IDs (2.5–2.10, 3.8, 4.8, 9.9, C2.1, C3.1/C3.2, C4.3, S1.4);
  - the 12 gap-class numbers;
  - the `lean?` receipt field in PLAN §4;
  - kernelspace's H1 guardrail kit and its "this has changed" cards;
- **Corrected.**
  - The comparator archive date: 2026-10-20 had been inferred from `updated_at`; the last push was 2026-10-14.
  - The `lia` rename: 4.27 (#11330).
  - F12: one paraphrase in quotation marks replaced with verbatim text, and the ladder headings made exact.
  - #14576: the fix was pushed after about an hour and merged after about ten hours. The bug wording now follows the postmortem, and one quote was trimmed to the verified words.
  - The fork lag.
- **Added.**
  - F39–F41.
  - The gap between the manual's checker list and the binary's.
  - Comparator's `--paranoid` and `--*-from-export` flags.
  - The setuid `bwrap` remedy.
  - The 4.35 use-after-free fixes.
  - lean-action's missing `lake check` input.
  - Generated Goal Replay, the challenge-hash convention and the lean-eval precedent.

### Not verified

- A public Lean Workbench instance.
- A public Comparator Live instance. The repo exists, but the `comparator.live` domain has no DNS record.
- SubVerso extraction in practice (not run locally).
- Industrial Aeneas users (SymCrypt).
- Paper venues for Loom and Veil.
- Whether nanoda actually accepted the Collatz repository. The postmortem says "a week-old version of nanoda" passed it, but I did not reproduce this.
- `lake check` on GitHub runners, macOS and Windows.
- Phone performance of WASM Lean.
- Release date of 4.36.0 stable (an estimate from cadence).

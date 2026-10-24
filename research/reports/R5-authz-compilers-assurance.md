# R5: Authorization, information flow, compiler correctness and assurance cases

*Research dossier for Plinth course v2. It covers Stage 7 (Secrecy), Stage 9 (Preservation), and the course-wide Claim and assurance-report system. Researched 2026-10-20, then resumed and re-verified the same day; that pass added F30–F36 and corrected two errors (SymCert effort; one stale "second-hand" tag). A second resume pass on 2026-10-21 made these changes:*
- *re-checked the riskiest claims;*
- *corrected one venue (F36);*
- *labelled three gap classes in §3.3 as new proposals, since they are not v1 classes;*
- *added F37–F44, covering LLM-generated SQL, defeater documentation, confidence in practice, understanding, and evidence independence;*
- *added four relational-verification rows to F13.*

**Scope**
- Cedar: Lean model, differential random testing (DRT), SymCC, SymCert.
- AWS Zelkova and IAM Access Analyzer.
- Zanzibar, OpenFGA, SpiceDB, OPA/Rego and Oso.
- Datalog engines and in-browser options.
- Noninterference, hyperproperties, declassification, relational verification, and cache-safety / data-flow reachability analysis.
- CompCert, Csmith, CakeML, Alive/Alive2, Lean's new compiler, and translation validation.
- SQL query-equivalence tools, egg/egglog, and assurance cases (GSN v3, CAE, Assurance 2.0, eliminative argumentation, confidence arguments, SACM).

**Method**
- I used primary sources first:
  - paper PDFs, with the text extracted and read;
  - project READMEs, source files and release metadata through the GitHub API;
  - the crates.io and npm registries;
  - Crossref DOI metadata;
  - official documentation.
- In the first pass the shared web-search budget ran out partway through; after that I only fetched known primary URLs directly.
- In the resume pass (also 2026-10-20):
  - I re-checked every tool version against the GitHub API (authenticated), crates.io and npm. All earlier version claims still held.
  - I re-resolved DOIs through Crossref and DataCite.
  - I read four more primary PDFs as full text: AuthV2 (ICSE 2025), SRI-CSL-2024-01 on defeaters, SymCert (FMCAD 2026) and Block Public Access (FSE 2020).
  - Findings F30–F36 are new. They sit in their topical subsections, so the numbering is not sequential.
- In the second resume pass (2026-10-21):
  - I re-checked the latest Z3, cvc5, Lean, CompCert, `cedar-policy-symcc` and egglog releases; none had changed.
  - I resolved the Assurance 2.0 DOI through Crossref.
  - I extracted the text of eight primary sources and read the passages I cite. They are:
    - the CIDR 2026 LLM-rewrite paper and its slides;
    - SpotIt (ICLR 2026);
    - the SQL small-model-bounds preprint;
    - the LLM SQL-equivalence benchmark paper;
    - Defeater Cards;
    - the real-world defeater taxonomy;
    - Bloomfield's 2026 "Understanding" preprint.
  - Other abstracts and metadata came from the arXiv API and Crossref.
  - Findings F37–F44 are new and sit in their topical subsections.

**Evidence tags**

| Tag | Meaning |
|---|---|
| **[checked]** | I read the primary text or metadata myself. |
| **[summary]** | A primary page read through a summarising fetch, so there is some paraphrase risk. |
| **[second-hand]** | A search-result summary only. |
| **[background]** | My prior knowledge, not re-verified today. |
| **[unverified]** | I could not confirm it. |

---

## 1. Summary

1. **Cedar is the best production model for Stages 7 and 9 together.** It has four layers:
   - an executable Lean model;
   - kernel-checked meta-theorems ("forbid trumps permit" and others);
   - a Lean-verified symbolic compiler whose SMT encodings are proved **sound and complete**;
   - a Rust implementation kept in line with the model by daily DRT.

   The proofs found 4 bugs and DRT/PBT found 21 more, and a release ships only when the model, proofs and differential tests are up to date. SymCert (FMCAD 2026) verified five production analyses in one work day; they were then ported to Rust, with the Lean versions kept as the DRT oracle (F1–F4).
2. **Once the code is proved, the risk sits in the specification.** AWS rebuilt its IAM authorization engine, AuthV2 (about 1 billion requests/s), in Dafny and compiled it to readable Java with its own compiler. Shadow testing on 10^15 production samples found 7 mismatches, every one a spec error: "no issues were found with tools or proofs" (ICSE 2025; F30).
3. **Analyzability is decided when the language is designed.** Cedar keeps its SMT encoding decidable by grounding hierarchy constraints on each expression's finite footprint; quantified constraints caused timeouts and `unknown`. Datalog program equivalence is undecidable. Stage 7 should teach *where the recursion lives*: in the engine (Zanzibar), the data (Cedar) or the rules (Datalog) (F1, F6).
4. **Production analyzers show the discipline the course needs for UNKNOWN.** S3 Block Public Access fails closed: "if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe" (about one unknown per two million policies). Zelkova runs a solver portfolio and requires that previously solved queries stay solved across solver upgrades. Policy diffs go back to Margrave (2005) and now include model counting of *how much* access changed (F5, F31).
5. **Datalog engines.** Soufflé 2.5 (proof trees) and Nemo 0.10.1 (runs fully in the browser through WASM and can trace derivations) are live. `ascent` 0.8.1 and `crepe` 0.2.0 are compile-time Rust embeddings, and DDlog is archived. Nemo's latest release fixed a "critical bug where filters in rules would be ignored", a reminder that the engine is part of the trusted base (F10, F11).
6. **Information flow and revocation.** Self-composition, 2-safety and product programs remain the practical SMT route to noninterference (F13). Sabelfeld & Sands supply a declassification vocabulary (what, who, where, when) and four sanity principles (F14); hyperproperty tools, including HyperPardinus for Alloy (TOSEM 2026), are research-grade (F15). Revocation is a consistency property: Zanzibar's "new enemy" problem and its zookies tie Stage 7 to byzantine and tablespace (F6).
7. **Cache safety is a configuration seam, not just a header.** RFC 9111 says a shared cache "MUST NOT store" a `private` response. Cloudflare honours this through a setting that is on by default (and fixed) on Free/Pro/Business plans, but promises only to "aim to strictly adhere to RFC 7234". Its directive table implies that `private=<headers>` caches the body without those headers, and Cache Rules can override origin headers (F16, F33).
8. **Compiler correctness.**
   - CompCert 3.18 preserves observable behaviour, which **excludes time and memory**. Csmith found CompCert's wrong-code bugs only in the unverified front end.
   - Alive2's bounded translation validation found 47 new LLVM bugs (PLDI'21); its list now holds 101 LLVM and 24 Z3 bugs, four of them Z3 unsoundness bugs.
   - Compilers also hide inside verification pipelines: Cedar's DRT oracle is Lean compiled to C, and AuthV2 trusts its own DafnyLite compiler (F18, F19, F22, F30).
9. **SQL equivalence tools disagree on what their verdicts mean, and LLM-written SQL makes this urgent.**
   - **The tools.** QED, SQLSolver, VeriEQL and SPES prove or bound equivalence for fragments of an undecidable problem. Polygon (PLDI 2025) refutes equivalence, and ParSEval (VLDB 2025) generates distinguishing test databases.
   - **Their verdicts are not interchangeable.** SQLSolver "may output NEQ … for some equivalent query pairs", and 2 of VeriEQL's 3,619 counterexamples were not genuine (F24, F34).
   - **LLM rewrites in production.** About 32% of LLM query rewrites on Microsoft workloads returned different results, and an optimizer-based checker proved only 37% of the rewrites that survived (CIDR 2026).
   - **One test database is not enough.** Checking against a single database overstated text-to-SQL accuracy by 11.3–14.2 points, and the *gold* query was often the wrong one (SpotIt, ICLR 2026).
   - **LLM judges lean towards "equivalent"** (F37–F40).

   Generated SQL therefore needs a verdict→stamp table and mandatory counterexample replay on real Postgres.
10. **Assurance-case research gives the Claim system a principled backbone, with cautions.**
    - **Core apparatus.** It contributes five CAE blocks, the indefeasibility criterion, a defeater log, three defeater types and *m|n* doubt counts; v1's 12 gap classes regroup under the three types (F26–F29).
    - **Assurance 2.0's 2024 report** adds exploratory versus exact defeaters and three-valued claim status, and it uses confidence only to balance effort, never to judge a case (F35).
    - **Ready-made formats.** Defeater Cards (2026) supply a record format and a 2025 taxonomy supplies a doubt-hunting checklist; interviewed practitioners (n = 19) preferred qualitative confidence methods (F41, F42).
    - **AI-proposed defeaters.** LLMs can propose defeaters, but human reviewers disagree about their quality (kappa < 0.442) (F36).
    - **Understanding.** Bloomfield's 2026 "Personal Understanding Statement" targets the *epistemic debt* of AI-assisted work (F43).
    - **Shared sources.** A 2026 preprint finds that verifiers sharing one evidence source approved far more unsafe actions than verifiers with an independent source (62.9% vs 22.9%) (F44).

    Top recommendations (§4): R1 three evidence layers for Stage 7; R2 defeater log; R3 verdict→stamp table; R4 validating generated SQL; R5 Cedar-style assurance for the course itself.

---

## 2. Findings

Each finding gives the claim, the evidence (source and date or version), the confidence level, and its boundary.

### 2A. Authorization languages and analyzers

**F1. The Cedar language paper (OOPSLA 2024): analyzable by design, with measured speed.**
- **What Cedar covers**
  - Cedar supports RBAC, ABAC and ReBAC idioms with an optional-typing validator.
  - Its design "has been finely balanced to allow for a sound and complete logical encoding".
  - It is modelled and proved in Lean and implemented in Rust.
- **How the encoding stays decidable**
  - Cedar uses a type-based translation into decidable theories only. It uses "finite sets of ground well-formedness constraints (e.g., to ensure entity graphs are acyclic) rather than quantified constraints".
  - Quantified acyclicity and transitivity constraints "make the encoding undecidable, causing timeouts or unknown results".
  - Grounding the constraints on the expression's footprint "maintains decidability while ensuring completeness".
- **Performance**
  - The authorizer is 28.7×/34.4×/35.2× faster than OpenFGA and 60.4×/80.8×/42.8× faster than Rego. The three figures are for the gdrive, github and TinyTodo models, on randomly generated inputs.
  - Policy slicing makes authorization 10.0–18.0× faster.
  - Encoding plus solving takes 75.1 ms on average.
- **Related work**
  - Rego's validator is "neither specified carefully nor proved sound".
  - "Datalog program equivalence is undecidable" (the paper cites Shmueli 1993).
- **Sources:**
  - arXiv 2403.04651v2 (2024-03-08): https://arxiv.org/abs/2403.04651
  - DOI 10.1145/3649835 (PACMPL OOPSLA1, 2024-04-29): https://doi.org/10.1145/3649835
- **Confidence:** high [checked: PDF text, Crossref].
- **Boundary:** the speed comparisons are the authors' own benchmarks, on their own generated workloads.

**F2. "How We Built Cedar": verification-guided development (FSE 2024 industry track).**
- **Code size**

  | Artifact | Lines of code |
  |---|---|
  | Lean model | 1,673 |
  | Lean proofs | 5,714 |
  | Rust production code | 15,693 |

  - The proof-to-model ratio is about 3.4:1, and the Lean models are about an order of magnitude smaller than the Rust.
  - Parsers are not modelled.
- **Bugs found:** proofs found 4 validator bugs (one non-termination bug exposed by the termination proof, three during the soundness proof); DRT and property-based testing (PBT) found 21.
- **How DRT runs:** every day on ECS, with 4 vCPU and 8 GB per fuzz target for 6 hours, generating "millions of inputs". The authors say they had no particular reason for choosing 6 hours.
- **Generator quality matters**
  - 35.5% of the `when` conditions from the type-directed ABAC generator were boolean literals.
  - A new expression generator lowered that to 9.7%.
- **What DRT missed:** the non-termination bug, and parser bugs triggered only by malformed text (the generators produce ASTs).
- **Effect on language design:** a "string size" feature was dropped after DRT exposed a disagreement between bytes, code points and graphemes.
- **Sources:**
  - https://arxiv.org/abs/2407.01688 (v1 2024-07-01)
  - DOI 10.1145/3663529.3663854
  - Confidence: high [checked: PDF text].
- **AWS blog (2024-04-08):**
  - "On average, Lean takes 5 microseconds to evaluate a differential testing input, compared to 7 microseconds for Rust."
  - "A new version of Cedar isn't released unless its model, proofs, and differential tests are up to date."
  - Lean was chosen for "its fast runtime, extensive libraries, and small trusted computing base".
  - Source: https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/
  - Confidence: high [checked: page text, resume pass].

**F3. What `cedar-spec` proves and tests today (main branch, read 2026-10-20).**
- **Lean toolchain:** `leanprover/lean4:v4.35.0`.
- **Verified properties listed in the README:** forbid trumps permit; allowed only if explicitly permitted; default deny; order/duplicate independence; sound policy slicing; sound type checking; sound level-based entity slicing; sound and complete symbolic compilation; sound and complete verification checks.
- **Theorems I read**
  - `forbid_trumps_permit`, `default_deny`, `allowed_only_if_explicitly_permitted`, `order_and_dup_independent`.
  - `verifyEquivalent_is_sound`: if the SMT assertions are unsatisfiable, then for every strongly well-formed environment both policy sets allow or both deny.
  - `verifyEquivalent_is_complete`: if the assertions are satisfiable, there exists a concrete environment on which the two sets disagree.
  - TPE `reauthorize_is_sound`: re-authorizing a partial-evaluation residual with concrete data gives the same answer as direct authorization.
- **DRT targets:** `cedar-drt` has 26 SymCC-related fuzz targets, for example:
  - `symcc-term-drt-*`, which compares Rust and Lean term generation;
  - `symcc-smt-script-drt`;
  - `symcc-cex-drt`, which checks counterexamples.
- **Sources:** https://github.com/cedar-policy/cedar-spec — specifically `cedar-lean/README.md`, `cedar-lean/Cedar/Thm/{Authorization,Verification,TPE}.lean` and `cedar-drt/README.md`.
- **Confidence:** high [checked].

**F4. Cedar's analysis tooling in 2025–2026.**
- **Cedar Analysis (AWS blog, 2025-06-16):** symbolic compiler plus reference CLI (`cedar-lean-cli`); classifies two policy sets as Equivalent / More Permissive / Less Permissive / Incomparable; checks Shadowed Permits, Impossible Conditions, Forbid Overrides, Complete Denials (https://aws.amazon.com/blogs/opensource/introducing-cedar-analysis-open-source-tools-for-verifying-authorization-policies). Confidence: medium [summary].
- **`cedar-policy-symcc` 0.8.0 (crates.io, 2026-10-17)**
  - Analyses: never-errors, always-allows, always-denies, subsumption, equivalence and disjointness. Each also has a `*_with_counterexample` variant.
  - It needs **cvc5 1.3.1**, passed in through the `CVC5` environment variable.
  - Sources: https://docs.rs/cedar-policy-symcc and https://crates.io/crates/cedar-policy-symcc
  - Confidence: high for the version [checked: registry API]; medium for the docs [summary].
- **SymCert (FMCAD 2026, pp. 238–247; sole author Emina Torlak; DOI 10.34727/2026/isbn.978-3-85448-093-8_30)**
  - A Lean framework for verified SMT-based analyses of Cedar. It has four verified parts: a symbolic compiler, an authorizer, a hierarchy enforcer, and a counterexample extractor that converts "infinite SMT models into finite Cedar inputs, which is essential for proving analysis completeness".
  - The encoder's simplifying "factory functions … were a source of subtle bugs during development. Our proofs caught these bugs."
  - **Effort.** Five production analyses were written in under an hour (39 lines). Proving them sound and complete took 7 hours, and modelling plus proof took "one work day" **in total** (551 lines). *Correction: the first pass of this report said one work day each.*
  - **Deployment.** Developers "ported both SymCert and the analyses to Rust for production deployment … the original Lean implementation serves as a correctness oracle for daily differential random testing".
  - **Performance.** Queries generate in under 20 ms and solve in under 40 ms (cvc5 1.1.1). On Cedar's published examples it "finds two issues in three benchmarks: unintended policy shadowing and redundancy".
  - **Extensions.** Three Cedar RFCs took minutes (RFC-53), 4 days (RFC-82) and 8 days (RFC-80); the abstract summarises this as "4 to 8 days each". Formalising RFC-80 "required refining the RFC to resolve ambiguities".
  - Source: https://www.amazon.science/publications/symcert-verifying-smt-based-policy-analyses (PDF linked there)
  - Confidence: high [checked: PDF text; DOI via DataCite].
- **Current releases**
  - `cedar-policy` 4.14.0 (2026-10-17).
  - `@cedar-policy/cedar-wasm` 4.14.0 (npm, 2026-10-19). It exports `is_authorized`, `is_authorized_partial`, `validate`, `format` and schema/policy conversions, but **not SymCC**.
  - Confidence: high [checked: registry plus `cedar-wasm/src/lib.rs`].

**F5. Zelkova and IAM Access Analyzer: SMT policy analysis at AWS scale.**
- **FMCAD 2018 paper**
  - "ZELKOVA encodes the semantics of policies into SMT, compares behaviors, and verifies properties. It provides users a sound mechanism to detect misconfigurations … solves a PSPACE-complete problem and is invoked many millions of times daily."
  - DOI 10.23919/FMCAD.2018.8602994; PDF: https://cs.utexas.edu/~hunt/FMCAD/FMCAD18/papers/paper3.pdf
  - Confidence: high [checked].
- **Rungta, CAV 2022 keynote "A Billion SMT Queries a Day"**
  - Zelkova runs a portfolio of Z3, CVC4, cvc5 and a custom automaton solver, and takes whichever answers first.
  - In **S3 Block Public Access a timeout is classified as "public"**.
  - Upgrading from CVC4 to cvc5 0.0.4 caused timeouts on queries that used to be solved. The rule became that previously solved queries must stay solved. cvc5 was added to the portfolio rather than replacing CVC4.
  - Sources: https://www.amazon.science/blog/a-billion-smt-queries-a-day (2022-08-18); paper DOI 10.1007/978-3-031-13185-1_1.
  - Confidence: medium [summary]. The blog body does not state the "billion a day" figure; it appears only in the title.
- **Block Public Access, primary source** (ESEC/FSE 2020, DOI 10.1145/3368089.3409728)
  - "To maintain soundness, we choose to fail closed: if the analysis result is unknown due to a time-out, we say the policy is not Trust Safe."
  - Unknowns are rare: none among 19,901 sample policies, and an estimated "one unknown every two million policies" over three years of Zelkova use.
  - The analysis runs in the control plane when a policy changes, and the data plane uses the cached verdict.
  - Source: https://www.amazon.science/publications/block-public-access-trust-safety-verification-of-access-control-policies (PDF linked there)
  - Confidence: high [checked: PDF text, resume pass].
- **IAM Access Analyzer custom policy checks:** `CheckNoNewAccess` (a policy diff), `CheckAccessNotGranted` and `CheckNoPublicAccess`.
  - Source: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-custom-policy-checks.html (read 2026-10-20).
  - Confidence: high [checked].

**F30. AuthV2: AWS's IAM authorization engine rebuilt in Dafny ("Formally Verified Cloud-Scale Authorization", ICSE 2025).** *Added in the resume pass.*
- **Scale and result**
  - The engine is "invoked 1 billion times per second" for "over 200 fully featured services".
  - The rebuild took four years. It was "deployed in 2024 without incident", and the new engine "computes authorization decisions three times faster".
- **Method**
  - The team wrote a new engine in Dafny instead of proving the legacy Java code.
  - They compiled it with their own **DafnyLite** compiler, which accepts a restricted subset of Dafny and runs "30 self-contained, type-preserving" passes, so that the generated Java is readable and reviewable.
  - The effort "split evenly between i) specification, proofs, and implementation; ii) compilation; and iii) testing and validation".
- **Shadow testing found only specification errors**
  - "In total, shadow testing exposed 7 mismatches owing to inaccuracies or incompleteness of our specification; no issues were found with tools or proofs."
  - Examples: millisecond resolution dropped from Date/Time, wildcard-matching corner cases, and Unicode string representation.
  - After 8 shadow iterations, the final build agreed with the legacy engine on 10^15 inputs (the superscript is lost in the PDF text; the figure is consistent with "trillions of times per day"). The legacy engine then ran as the shadow for a month before it was switched off.
- **What "translation validation" meant here**
  - The compiler section is titled "Translation validation and fuzzing", but it describes two other things:
    - Java Checker Framework annotations (nullness, side effects, signedness, reference equality);
    - differential testing against Dafny's own compilers on XDSmith-generated programs, which "helped us identify and fix multiple bugs in the DafnyLite compiler".
  - Neither is per-run semantic validation.
- **Proof brittleness had an operational cost**
  - "Most code or environment changes broke at least one proof, causing delays in deployment by up to 14 days."
  - Brittleness was measured as the coefficient of variation of solver resource counts across random seeds. CI blocks merges that degrade it.
  - Brittle verification conditions fell from 41 to 4. One string module grew from 800 lines (300 of them proof) to 1,200 lines (1,100 proof), while its resource count fell by two orders of magnitude.
- **The paper's own comparison with Cedar**
  - AuthV2 relies on "the assumption that the DafnyLite compiler produces a correct result, whereas Cedar relies on the correctness of the Lean compiler, since the Lean spec is compiled to C in order to differentially test it".
- **Sources**
  - https://www.amazon.science/publications/formally-verified-cloud-scale-authorization
  - PDF: https://cdn.amazon.science/bb/40/22ac44f84f6d8eb625ac9666a00f/formally-verified-cloud-scale-authorization.pdf
  - Programme: https://conf.researchr.org/details/icse-2025/icse-2025-research-track/119/Formally-Verified-Cloud-Scale-Authorization (presented 2025-05-02; listed as "Award Winner")
- **Confidence:** high [checked: PDF text]. DOI not found [unverified]; the "Distinguished Paper" label is [second-hand].
- **Boundary:** the speed-up and sample counts are the authors' own production measurements.

**F31. Policy-diff analysis has a 20-year lineage, now with a quantitative branch.** *Added in the resume pass.*
- **Lineage:**
  - Margrave change-impact analysis (Fisler et al., ICSE 2005, DOI 10.1145/1062455.1062502);
  - Zelkova (FMCAD 2018, F5);
  - stratified abstraction for IAM Access Analyzer (CAV 2020, DOI 10.1007/978-3-030-53288-8_9);
  - Block Public Access (FSE 2020, F5);
  - Cedar and SymCert (F1, F4).
- **Counting *how much* access changed:**
  - "Quantifying permissiveness of access control policies" (Eiers et al., ICSE 2022, DOI 10.1145/3510003.3510233);
  - "Projective Model Counting for IP Addresses in Access Control Policies" (D'Antoni et al., FMCAD 2024, DOI 10.34727/2024/isbn.978-3-85448-065-5_26).
- **Source:** SymCert's reference list. Each DOI was resolved through Crossref or DataCite.
- **Confidence:** high for metadata [checked]; content [background].

**F6. Zanzibar (USENIX ATC 2019).**
- **Scale:** more than 2 trillion ACLs and millions of checks per second, with p95 latency under 10 ms and availability above 99.999% over 3 years.
- **Policy model:** userset rewrites (`computed_userset`, `tuple_to_userset`) encode inheritance.
- **The "new enemy" problem** has two forms:
  - neglecting the order of ACL updates;
  - applying an old ACL to new content.
- **The fix:** external consistency plus snapshot reads with bounded staleness, carried in **zookies**.
- **Sources:**
  - https://www.usenix.org/conference/atc19/presentation/pang
  - PDF: https://www.usenix.org/system/files/atc19-pang.pdf
- **Confidence:** high [checked: PDF text].

**F7. OpenFGA and SpiceDB, the open-source Zanzibar descendants.**
- **OpenFGA**
  - v1.22.0 (2026-10-06); CLI v0.8.2 (2026-10-15).
  - It is a CNCF Incubating project. The CNCF project page says "Incubating maturity level on October 28, 2025", and CNCF's announcement blog is dated 2025-11-11 [both checked in the resume pass].
  - "37 companies publicly acknowledge using it in production" (CNCF blog).
  - Model tests live in `.fga.yaml` files and are run with `fga model test`. They support three assertion kinds:
    - `check`, a yes/no decision;
    - `list_objects`, a reverse query: which objects can this user reach;
    - `list_users`, which users can reach this object.
  - Sources: https://openfga.dev/docs/modeling/testing ; https://www.cncf.io/blog/2025/11/11/openfga-becomes-a-cncf-incubating-project/
  - Confidence: high for versions [checked]; medium for the docs [summary].
- **SpiceDB**
  - v1.57.0 (2026-10-20).
  - Its `pkg/development/wasm` package "provides SpiceDB's development functionality via a WebAssembly interface" and is marked "**not stable**".
  - The playground is open source (Apache-2.0).
  - Sources: https://github.com/authzed/spicedb/tree/main/pkg/development/wasm ; https://github.com/authzed/playground
  - Confidence: high [checked].

**F8. OPA/Rego.**
- **Versions:** v1.21.3 (2026-10-19). v1.0.0 (2024-12-20) made `if` and `contains` mandatory.
- **Origins:** "Rego was inspired by Datalog and extends it to support structured document models such as JSON." Source: `docs/docs/policy-language.md` in the opa repository.
- **Governance:** OPA's creators and many Styra staff joined Apple; OPA "remains a CNCF graduated open source project" with "no changes to the project governance or licensing" (https://openpolicyagent.org/blog/note-from-teemu-tim-and-torin-to-the-open-policy-agent-community-2dbbfe494371, 2025-08-20).
- **SQL data filtering:** `/v1/compile/filters/include` returns a SQL `WHERE` fragment (SQLite in the tutorial); "An absent `query` means unconditional deny"; "OPA returns the filter — it does not enforce it" (https://openpolicyagent.org/docs/filtering/tutorial-sql-filtering).
- **In the browser:** the npm package `@open-policy-agent/opa-wasm` is at 1.10.0 (2024-11-08).
- **Confidence:** high for the GitHub and npm data; medium for the docs pages [summary].

**F32. Regorus: a second, Rust implementation of Rego that runs in the browser.** *Added in the resume pass.*
- **What it is**
  - Microsoft's Regorus is "a fast, light-weight Rego interpreter written in Rust".
  - It is `no_std` compatible, has a WASM build (wasm-pack) and a browser playground, and is at v0.13.0 (crates.io and GitHub, 2026-10-14).
- **Its conformance claim is pinned to an old version**
  - The README says Regorus is "mostly compliant with the latest OPA release v1.2.0" and "passes the OPA v1.2.0 test-suite barring a few builtins".
  - OPA itself is at v1.21.3 (F8).
  - So the claim names a referent that has since moved on: the "latest" release is no longer v1.2.0. TTLs in a claims registry exist for exactly this case.
- **Why it matters:** two independent Rego implementations make a ready-made DRT exercise.
- **Source:** https://github.com/microsoft/regorus (README read 2026-10-20)
- **Confidence:** high [checked].

**F9. Oso.**
- The open-source library is deprecated: "We have deprecated the legacy Oso open source library … we are not end-of-lifing (EOL) the library". Its last release is v0.27.3 (2024-01-13).
- Oso Cloud is the commercial successor.
- The README links Oso's vendor-neutral "Authorization Academy" guides.
- **Source:** https://github.com/osohq/oso
- **Confidence:** high [checked].

### 2B. Datalog engines and in-browser options

**F10. Engine status as of 2026-10-20.** I checked versions in the GitHub, crates.io and npm metadata; features come from the READMEs and release notes.

| Engine | Latest release (date) | Shape | In browser? | Explanations | Fit |
|---|---|---|---|---|---|
| **Soufflé** | 2.5 (2025-03-24); repo active (push 2026-10-02) | Datalog to parallel C++; also an interpreter | No official WASM [unverified] | `-t explain`: "proof trees … of *minimal height*", computed lazily; `explainnegation` needs user guidance | Bench oracle; mature; 2.5 added **lattices**; known ARM concurrency issue ("sporadic crashes on ARM", #2476, open since 2024-03-15) |
| **Nemo** | v0.10.1 (2026-08-01) | Rust; stratified negation, aggregates, existential rules | **Yes**: "runs entirely on your browser" (https://tools.iccl.inf.tu-dresden.de/nemo/); `nemo-wasm` bindings are "experimental", built with wasm-pack, not on npm | Tracing API (`traceTreeForTable`) plus a tracing visualisation in nemo-web | Best real engine for in-browser use; KR 2024 paper |
| **ascent** | 0.8.1 (2026-08-29) | Rust macro (`ascent!`), compiled with your code; lattices; parallel (`ascent_par!`) | Only as a prebuilt WASM module, because the rules are fixed at compile time | Not documented in the README [unverified] | Matches the learner's Rust stack; BYODS paper DOI 10.1145/3622840 |
| **crepe** | 0.2.0 (2025-12-14) | Rust proc macro; semi-naive evaluation; stratified negation | Same as ascent | Not documented | Small and simple |
| **datafrog** | 2.0.1 (crate release 2019-01-02) | "lightweight Datalog engine … no runtime"; you apply the rules by hand | Same as ascent | None | Low-level only |
| **DDlog** | v1.2.3 (2021-12-13); **archived** (last push 2023-07-07) | Incremental Datalog | — | — | **Avoid**. Its authors' later work is DBSP (VLDB 2023, DOI 10.14778/3587136.3587137), developed as Feldera (v0.367.0, 2026-10-18). That is incremental SQL, not Datalog, and DDlog's README does not point to it |
| **egglog** | 3.0.0 (2026-08-19) | Datalog plus equality saturation | **Yes**, web demo (https://egraphs-good.github.io/egglog/) | — | Stage 9 rewrite lab (F25) |

- **Sources:** https://github.com/souffle-lang/souffle/releases/tag/2.5 ; https://souffle-lang.github.io/provenance ; https://github.com/knowsys/nemo ; https://crates.io/crates/ascent ; https://github.com/ekzhang/crepe ; https://github.com/rust-lang-nursery/datafrog ; https://github.com/vmware/differential-datalog
- **Confidence:** high [checked].

**F11. Nemo shows that the engine belongs to the trusted computing base.** v0.10.1 is "a maintenance release to fix a critical bug where filters in rules would be ignored in certain situations".
- In an authorization or information-flow check, ignoring filters means rules match more than intended. Any "no path to the sink" result computed during the affected window would be suspect.
- **Source:** https://github.com/knowsys/nemo/releases/tag/v0.10.1 (2026-08-01).
- **Confidence:** high [checked].

**F12. Authorization and program analysis have a long Datalog lineage:** Binder (S&P 2002, DOI 10.1109/SECPRI.2002.1004365); Li & Mitchell (PADL 2003, DOI 10.1007/3-540-36388-2_6); SecPAL (CSF 2007, DOI 10.1109/CSF.2007.18); Doop (OOPSLA 2009, DOI 10.1145/1640089.1640108); Soufflé (CAV 2016, DOI 10.1007/978-3-319-41540-6_23). For tracking where sensitive data can flow, the classic algorithm is IFDS, which treats interprocedural dataflow as graph reachability (Reps, Horwitz & Sagiv, POPL 1995, DOI 10.1145/199448.199462; added 2026-10-21). **Confidence:** high for metadata [checked: Crossref]; content [background].

### 2C. Noninterference, hyperproperties, declassification, cache safety

**F13. The relational toolkit: definitions and checking methods.**
- **Foundational papers**

  | Work | Venue | DOI |
  |---|---|---|
  | Noninterference (Goguen & Meseguer) | S&P 1982 | 10.1109/SP.1982.10014 |
  | Sound type system for secure flow (Volpano, Irvine, Smith) | JCS 1996 | 10.3233/JCS-1996-42-304 |
  | Language-based information-flow security (Sabelfeld & Myers) | JSAC 2003 | 10.1109/JSAC.2002.806121 |
  | Self-composition (Barthe, D'Argenio, Rezk) | CSFW 2004 | 10.1109/csfw.2004.1310735 |
  | 2-safety (Terauchi & Aiken) | SAS 2005 | 10.1007/11547662_24 |
  | Hyperproperties (Clarkson & Schneider) | JCS 2010 | 10.3233/JCS-2009-0393 |
  | Product programs (Barthe, Crespo, Kunz) | FM 2011 | 10.1007/978-3-642-21437-0_17 |
  | Relational Hoare logic (Benton) | POPL 2004 | 10.1145/964001.964003 |
  | Hyper Hoare Logic, proves and disproves hyperproperties (Dardinier & Müller) | PLDI 2024 | 10.1145/3656437 |
  | Product programs and relational program logics (Barthe, Crespo, Kunz) | JLAMP 2016 | 10.1016/j.jlamp.2016.05.004 |
  | Regression verification: equivalence of two versions of a program (Godlin & Strichman) | DAC 2009 | 10.1145/1629911.1630034 |
  | SymDiff: a language-agnostic semantic diff (Lahiri, Hawblitzel, Kawaguchi, Rebêlo) | CAV 2012 | 10.1007/978-3-642-31424-7_54 |
  | Cartesian Hoare Logic for k-safety (Sousa & Dillig) | PLDI 2016 | 10.1145/2908080.2908092 |

- **Program-level diffs.** The last four rows were added on 2026-10-21. Regression verification and SymDiff are the program-level counterparts of the policy diff (F31) and of Stage 9's per-run translation validation [background].
- **Why self-composition exists.** From the self-composition abstract: information-flow type systems "are inherently imprecise, and reject many secure programs". Source: https://cs.famaf.unc.edu.ar/~dargenio/node/27.html
- **Confidence:** high for metadata [checked]; medium for summaries.

**F14. Sabelfeld & Sands, "Declassification: Dimensions and principles" (JCS 17(5), 2009; DOI 10.3233/JCS-2009-0352).**
- **Four dimensions:** *what* information is released, *who* releases it, *where* in the system, and *when*.
- **Four principles:**
  - **semantic consistency:** security definitions are "invariant under equivalence-preserving transformations";
  - **conservativity:** security "should be a weakening of noninterference";
  - **monotonicity of release:** "adding declassification annotations cannot make a secure program become insecure";
  - **non-occlusion:** "the presence of declassifications cannot mask other covert information leaks".
- **Motivating example:** a "last four digits of the card" policy says *what* may be released but not *who* controls which digits. An attacker can therefore launder the whole number across several purchases.
- **The PER model:** attacker knowledge is an equivalence relation. The paper's example: releasing only parity corresponds to the `Parity` relation.
- **Source:** https://www.cse.chalmers.se/~andrei/sabelfeld-sands-jcs07.pdf
- **Confidence:** high [checked: PDF text].

**F15. Hyperproperty tooling is real but research-grade.**

| Tool / work | Status | Source | Confidence |
|---|---|---|---|
| HyperLTL (Clarkson et al.) | POST 2014, DOI 10.1007/978-3-642-54792-8_15 | — | high (metadata) |
| MCHyper (Finkbeiner, Rabe, Sánchez) | CAV 2015, DOI 10.1007/978-3-319-21690-4_3 | — | high (metadata) |
| AutoHyper | TACAS 2023, DOI 10.1007/978-3-031-30823-9_8. Complete for full HyperLTL through language-inclusion checking. Repo GPL-3.0, last push 2024-06-21 | — | high (metadata/repo); summary of claims from search result [second-hand] |
| HyperQB | Bounded model checking. The arXiv abstract (first posted 2021, updated 2025-10-21) introduces "HyperQB 2.0": NuSMV or Verilog input; HyperLTL or A-HLTL; SMT and QBF back ends; CLI, GUI and web interfaces. The GitHub repo (MIT) was last pushed 2025-03-12 | https://arxiv.org/abs/2109.12989 ; https://github.com/TART-MSU/HyperQB | abstract [checked]; whether the 2.0 code and web UI are public [unverified] |
| **HyperPardinus** (Macedo & Pacheco) | TOSEM 2026, DOI 10.1145/3845615. Extends Alloy's Pardinus backend so hyperproperties can be specified and checked at design level, with counterexamples shown at Alloy's level of abstraction | https://arxiv.org/abs/2512.12024 | high (metadata); medium (abstract summary); code availability [unverified] |
| Survey: Finkbeiner, "Logics and Algorithms for Hyperproperties" | arXiv 2501.08063 (2025-01-14) | — | medium |

**F16. Cache safety: protocol semantics and real attacks.**
- **RFC 9111 (HTTP Caching, June 2022), §5.2.2.7 `private`**
  - "a shared cache MUST NOT store the response".
  - The Note says the word "only controls where the response can be stored; it cannot ensure the privacy of the message content".
  - The *qualified* form "is often handled by caches as if an unqualified private directive was received".
  - Source: https://www.rfc-editor.org/rfc/rfc9111.txt
  - Confidence: high [checked].
- **"Cached and Confused: Web Cache Deception in the Wild" (USENIX Security 2020)**
  - The study covered 340 high-profile sites.
  - It found leaks of private data and tokens, and "many popular sites remain vulnerable two years after the public disclosure".
  - The authors conclude that "web caches are not plug & play technologies".
  - Source: https://www.usenix.org/conference/usenixsecurity20/presentation/mirheidari
  - Confidence: medium [summary].

**F33. Cloudflare, a widely used CDN, honours `private` through a setting, not as a guarantee.** *Added in the resume pass.*
- **Default behaviour**
  - Cloudflare defines `private` as "must not be stored by a shared cache like Cloudflare".
  - "Origin Cache Control" makes Cloudflare respect origin `Cache-Control`. "Free, Pro, and Business customers have this option enabled by default and cannot disable it"; Enterprise customers can turn it off.
  - When it is enabled, Cloudflare "will aim to strictly adhere to RFC 7234". RFC 9111 obsoletes RFC 7234.
- **Seam 1: qualified `private`**
  - The directive table says that with Origin Cache Control enabled, `Private=<headers>` "Does not cache `<headers>` values mentioned in `Private=<headers>` directive".
  - My reading is that the response body *is* cached, minus the named headers. RFC 9111 notes that caches often treat the qualified form as unqualified (F16), so the two behave in opposite ways.
- **Seam 2: Cache Rules** can "augment or override an origin server's `Cache-Control` headers".
- **Source:** https://developers.cloudflare.com/cache/concepts/cache-control/ (last updated 2026-06-30; raw Markdown read 2026-10-20)
- **Confidence:** high for the quotes [checked]. The qualified-`private` behaviour is my interpretation and is untested.

**F17. Quantitative information flow.** Smith, "On the Foundations of Quantitative Information Flow" (FoSSaCS 2009; DOI 10.1007/978-3-642-00596-1_21) is the standard way to measure how much a "harmless" count or existence leak reveals.
- **Confidence:** high for metadata; content [background].

### 2D. Compiler correctness and translation validation

**F18. CompCert: what is proved and what is trusted.**
- **Current version:** 3.18 (GitHub release 2026-08-30; site lists it as "08/2026"). Targets are ARM, PowerPC, RISC-V and x86, including AArch64. The open-source parts are under LGPL.
- **The preservation theorem (CompCert manual):** "For all source programs S and compiler-generated code C, if the compiler … produces the code C, without reporting a compile-time error, then the observable behavior of C improves on one of the allowed observable behaviors of S."
  - Observable behaviour is "a trace of all I/O and volatile operations", together with how the program terminates.
  - It explicitly excludes "execution time and memory consumption".
- **What is verified**
  - Only the phase from the CompCert C AST to the Asm AST, plus the parser, is proved in Rocq/Coq. That is about 90% of the algorithms.
  - Preprocessing, elaboration, assembling and linking are not verified.
- **Sources:**
  - https://compcert.org/ ; https://compcert.org/man/manual001.html
  - Leroy, CACM 2009, DOI 10.1145/1538788.1538814
- **Confidence:** high for version and dates [checked]; medium for the manual [summary with quotes].
- **Csmith (PLDI 2011; DOI 10.1145/1993498.1993532)**
  - Six silent wrong-code bugs (the first plus "five others like it") were "in CompCert's unverified front-end code"; "partly in response", the verified portion was expanded to cover C's integer promotions and other implicit casts.
  - Two more bugs came from a specification gap: "CompCert's PPC semantics failed to specify a constraint" on a 16-bit displacement field, assuming the assembler would catch it (it did). There were also "a handful of crash errors".
  - "The striking thing about our CompCert results is that the middle-end bugs we found in all other compilers are absent."
  - "As of early 2011, the under-development version of CompCert is the only compiler we have tested for which Csmith cannot find wrong-code errors … about six CPU-years."
  - Source: https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf
  - Confidence: high [checked: PDF text].

**F19. Alive2: bounded translation validation and its bug record.**
- **PLDI 2021 (DOI 10.1145/3453483.3454030)**
  - Alive2 "limits resource consumption by, for example, unrolling loops up to some bound, which means there are circumstances in which it misses bugs".
  - It "is designed to avoid false alarms".
  - Running it over LLVM's unit tests "discovered and reported 47 new bugs, 28 of which have been fixed".
  - It led to "eight patches to the LLVM Language Reference".
  - It found 121 refinement violations in the unit tests, of which 43 involved `undef` inputs.
  - Alive2 is "a far more discerning test oracle than … syntactic oracles, such as the CHECK: line".
  - Confidence: high [checked: PDF text].
- **Maintained bug list (`BugList.md`, last changed 2026-01-12)**
  - **101 LLVM bugs and 24 Z3 bugs**.
  - Four Z3 entries are unsoundness bugs: "Unsoundness with smt.bv.size_reduce=true" (#6314), "Unsoundness in elim-uncnstr2" (#6488 and #6506) and "Unsound NaN encoding" (#6972) [recounted in the resume pass].
  - Source: https://github.com/AliveToolkit/alive2/blob/master/BugList.md
  - Confidence: high [checked: counted].
- **Other details:** latest release v21.0 (2025-08-12), repository active (push 2026-10-19); online `alive-tv` at https://alive2.llvm.org ; README warns it "does not support inter-procedural transformations … may produce spurious counterexamples". Confidence: high [checked].

**F20. Translation-validation lineage.**

| Work | Venue | DOI |
|---|---|---|
| Pnueli, Siegel, Singerman, "Translation validation" | TACAS 1998 | 10.1007/BFb0054170 |
| Necula, "Translation validation for an optimizing compiler" | PLDI 2000 | 10.1145/349299.349314 |
| Alive: a peephole-rewrite DSL proved with SMT (Lopes et al.) | PLDI 2015 | 10.1145/2737924.2737965 |

- **Confidence:** high for metadata; content [background].

**F21. CakeML.** The backend "has been proved to only produce machine code that is compatible with the behaviours of the source programs"; the compiler "has been bootstrapped inside HOL" (6 target architectures); latest release tag v3479 (2026-08-26). **Sources:** https://cakeml.org/ ; POPL 2014, DOI 10.1145/2535838.2535841 ; JFP 2019, DOI 10.1017/S0956796818000229. **Confidence:** high for metadata; medium for the site [summary].

**F22. Lean's own trusted base.**
- **New compiler:** Lean v4.22.0 (2025-08-14): "The old compiler has been replaced by the new compiler". Source: https://lean-lang.org/doc/reference/latest/releases/v4.22.0/
- **The `native_decide` docstring (Lean v4.35.0, `src/Init/Tactics.lean`):** it "adds the entire lean compiler to the trusted part, and a new axiom will show up in `#print axioms`".
- **Releases:** current stable v4.35.0 (2026-10-12); v4.36.0-rc1 (2026-10-14).
- **Confidence:** high [checked].

**F23. Correct compilation is not the same as secure compilation.**
- CompCert's observables exclude time (F18), so a correct compiler may still introduce timing leaks.
- Barthe et al., "Formal verification of a constant-time preserving C compiler" (POPL 2020; DOI 10.1145/3371075), and Abate et al., "Journey Beyond Full Abstraction: Exploring Robust Property Preservation for Secure Compilation" (CSF 2019; DOI 10.1109/csf.2019.00025), study preserving (hyper)properties through compilation.
- **Confidence:** high for metadata; content [background].

### 2E. SQL query equivalence and containment (for validating generated SQL)

**F24. The tools differ in coverage and in what their verdicts mean.**
- **Theory**
  - Equivalence of SQL queries is undecidable in general (QED §1).
  - Containment of conjunctive queries reduces to finding a homomorphism: Chandra & Merlin, STOC 1977, DOI 10.1145/800105.803397. This is the right tool for "does the generated query return only rows the policy allows?"
  - SQL's NULL semantics has a formal semantics validated against real DBMSs: Guagliardo & Libkin, VLDB 2017, DOI 10.14778/3151113.3151116.

| Tool (venue, DOI) | Approach | Verdict semantics / caveats | Status |
|---|---|---|---|
| Cosette / HoTTSQL (PLDI 2017, 10.1145/3062341.3062348); UDP (VLDB 2018, 10.14778/3236187.3236200) | Proof (Coq / U-semiring) | — | Repo "now deprecated. Check out our new QED" |
| EQUITAS (VLDB 2019, 10.14778/3342263.3342267) | SMT, set semantics | — | Research artifact |
| SPES (ICDE 2022, 10.1109/icde53745.2022.00250) | Symbolic, **bag semantics** | — | Last push 2023-05-09; needs Z3 4.6 |
| **SQLSolver** (PACMMOD/SIGMOD 2024, 10.1145/3626768) | Linear integer arithmetic | Returns `EQ`, `NEQ`, `UNKNOWN` or `TIMEOUT`, and "**may output NEQ or UNKNOWN for some equivalent query pairs**". With a `timeout` set it "may still run beyond the time limitation". Bundles Z3 4.8.9 and a Calcite parser | Active (2025-11) |
| **VeriEQL** (OOPSLA 2024, 10.1145/3649849) | **Bounded** model checking; integrity constraints | Results dated 2023-03-27: 15,200 checked or not refuted, 3,619 refuted, **3,617 genuine** counterexamples. The benchmark set has 23,224 LeetCode pairs | Stable tag v1.0; dev branch active (2026-03) |
| **QED** (PVLDB 17(11) 2024, 10.14778/3681954.3682024) | Q-expressions; bag semantics; NULLs and integrity constraints | Proves "299 out of 444" Calcite pairs and "979 out of 1287" CockroachDB pairs, "more than 2×" the prior state of the art. Complete for a defined fragment "assuming a complete first-order theory solver". Rust nightly; needs both z3 *and* cvc5; `QED_SMT_TIMEOUT` defaults to 10 s | Active (push 2026-10-05) |
| Polygon (PLDI 2025, 10.1145/3729303; arXiv 2504.06542) | Conflict-driven search over under-approximations: generates an input on which n queries' outputs satisfy an SMT property | Built to *refute* equivalence and to disambiguate queries. Evaluated on "over 30,000 benchmarks"; the authors say it "significantly outperforms all prior techniques" [checked: arXiv abstract] | Code availability [unverified] |
| cvc5 theories of tables and relations (Mohamed, Reynolds, Tinelli, Barrett; LPAR 2024, pp. 445–463, DOI 10.29007/rlt7) | SMT theories of finite bags and finite relations, plus nullable sorts, implemented in cvc5 | Solver-level support, evaluated on "benchmarks derived from public sets of SQL equivalence problems"; not a SQL front end [checked: arXiv abstract 2405.03057; EasyChair page] | Whether it ships in a cvc5 release [unverified] |

- **Sources:** https://github.com/qed-solver/prover ; https://github.com/SJTU-IPADS/SQLSolver ; https://github.com/VeriEQL/VeriEQL ; https://github.com/georgia-tech-db/spes ; https://github.com/uwdb/Cosette ; QED paper https://www.vldb.org/pvldb/vol17/p3602-wang.pdf
- **Confidence:** high [checked: READMEs, QED PDF, Crossref].
- **Boundary**
  - I found no in-browser build of any of these tools.
  - Two searches in the resume pass found no new 2025–2026 equivalence *prover*. The newer work refutes equivalence (Polygon) or generates tests (F34). Search coverage is not exhaustive.

**F34. ParSEval: test-database generation as a third kind of SQL evidence** (PVLDB 18(11), 2025, DOI 10.14778/3749646.3749727; demo PVLDB 19(12), 2026, DOI 10.14778/3827998.3828137). *Added in the resume pass.*
- **How it works:** plan-aware generation of test databases, using branch coverage over the logical query plan. Keys, foreign keys, and set or bag semantics are configurable.
- **What it produces:** concrete witness databases when results differ, and TESTED evidence otherwise. It does not produce proofs.
- **Results (authors'):**
  - it "supports up to 40% more query pairs than state-of-the-art verification-based approaches";
  - it is "21× faster" than test-based approaches.
- **Motivation:** the demo paper says that evaluating on a single static database "often misses semantic errors that arise only under specific data conditions, such as duplicates, NULLs, or integrity assumptions".
- **Code:** https://github.com/sfu-db/ParSEval (Apache-2.0, pushed 2026-10-06).
- **Confidence:** high [checked: both PDFs, Crossref, GitHub API].

**F37. LLM-written SQL in production: about a third changed results, and an optimizer-based checker proved 37%** (Narasayya & Chaudhuri, Microsoft, CIDR 2026). *Added 2026-10-21.*
- **Setup**
  - 118 real-world queries on four Microsoft customer data warehouses, plus 224 JOB, TPC-DS and TPC-H queries.
  - The queries use inner and outer joins, group-by and aggregation, UNION ALL, subqueries, views and CTEs.
  - Rewrites came from GPT-4o-mini and GPT-5, on Microsoft SQL Server.
- **Rewrites that changed results.** "A large fraction of the rewrites (≈32%) produce different results compared to the original query on the given database, and are therefore incorrect".
- **Rewrites that matched.** Rewrites whose results matched on the given database are called *candidates*; the authors obtained "3100+ candidate rewrites". Matching on one database is a test, not a proof.
- **QO-Verify**
  - It reuses the optimizer's Cascades memo. It answers *Equivalent* when both queries reach a common logical expression and *Unknown* otherwise, so it is one-sided.
  - It is sound only because "each transformation rule is known to be sound".
  - It verified "37% of the rewrites suggested by LLMs"; the slides say "37% of candidate rewrites".
  - Its median running time is about 1.2 s.
  - Its Unknowns pointed the developers to transformation rules missing from the optimizer.
- **Citation drift.**
  - A 2026 preprint (F40) paraphrases this result as "roughly a third of over 3,100 LLM-proposed rewrites of production queries returned results different from the original".
  - That mixes up the denominators: the 3,100+ are the rewrites whose results *matched*, and the workloads include benchmarks.
  - It is a live example of why the claims registry stores the quote alongside any paraphrase.
- **Sources**
  - Paper: https://www.cidrdb.org/cidr2026/papers/p33-narasayya.pdf
  - Slides: https://www.cidrdb.org/cidr2026/slides/Narasayya-112.pdf
  - Landing page: https://vldb.org/cidrdb/2026/leveraging-query-optimizers-to-verify-the-soundness-of-llm-based-query-rewrites-for-real-world-workloads.html
  - A companion PVLDB 2026 demo, "Verified LLM-Based Query Rewriting for Microsoft SQL Server", is listed at https://www.vldb.org/pvldb/vol19/p4594-narasayya.pdf [second-hand: search result only].
- **Confidence:** high [checked: PDF text and slides].
- **Boundary:** the workloads are vendor-internal and cannot be reproduced.

**F38. Checking SQL on one test database is optimistic, and the reference query is often the wrong one** (SpotIt, ICLR 2026; arXiv 2510.26840 v2, 2026-03-04). *Added 2026-10-21.*
- **Method.** SpotIt replaces BIRD's execution-match evaluation with VeriEQL-style bounded verification, extended to string and date operators. It searches for a database on which the generated query and the gold query differ.
- **Results**
  - For ten text-to-SQL methods, "the reported accuracy … drops by 11.3%–14.2%". These are absolute points: the top method falls from 71.32% to 58.80%.
  - The drop causes "substantial changes in the order of ranking".
  - "When the predicted SQL disagrees with the ground truth, it is often the gold SQL that is incorrect". In one example, all ten systems disagreed with a gold query whose `WHERE` clause reduced to `T2.rnp != '-' OR FALSE`.
- **Follow-up.** SpotIt+ (arXiv 2603.04334, v3 2026-05-11) mines database constraints, using rules plus LLM validation, so that counterexample databases are realistic. Code: https://github.com/ai-ar-research/SpotIt-plus (pushed 2026-07-02; licence NOASSERTION).
- **Confidence:** high [checked: PDF text; arXiv API; GitHub API].
- **What it means for the course:** this is AuthV2's lesson (F30) again. A disagreement with a reference is a defeater against *both* sides until it has been triaged.

**F39. LLMs used as SQL-equivalence judges lean towards "equivalent".** *Added 2026-10-21.*
- **"Can the Rookies Cut the Tough Cookie?"** (Singh & Bedathur; arXiv 2412.05561 v2, 2025-06-08)
  - LLMs reach "up to 82% accuracy on Spider+DIN" and 61% on the new SQLEquiQuest benchmark.
  - However, they "exhibit a strong bias for equivalence predictions, with consistently poor performance over non-equivalent pairs".
- **LLM-SQL-Solver** (Zhao et al.; arXiv 2312.10321 v4, 2025-03-12) proposes prompting techniques and calls LLMs "a promising tool", although "challenges still persist".
- **Why the bias matters:** it points the wrong way for validation, where the costly error is calling a changed query "equivalent".
- **Confidence:** high for the quoted abstracts and lines [checked: arXiv API; PDF text]. Both are preprints [no venue found].

**F40. When does bounded SQL checking become a proof? Small-model bounds for a conjunctive fragment** (Sara Cohen, arXiv 2609.09978, 2026-09-09, preprint). *Added 2026-10-21.*
- **The problem it addresses:** "Bounded SQL equivalence checkers search for a counter-example database of bounded size, and a search that comes back empty proves nothing."
- **The result**
  - Under combined set and bag semantics, inequivalent conjunctive queries "already disagree on a database with at most 2^w|Q| tuples", where w counts only the columns the queries read.
  - Declared keys reduce the bound to 2^kw|Q|, and acyclic foreign keys leave it unchanged.
  - The result extends to some comparisons with constants.
  - "For these fragments, bounded search becomes a terminating, complete decision procedure."
- **Open problems the paper states:** aggregation, and stored relations that are bags. NULLs are not addressed [my reading of the text].
- **A second-hand claim it makes:** "A fifth of the pairs one suite of VeriEQL's evaluation reports as 'checked' are in fact inequivalent, two needing counter-examples of over a thousand tuples". I did not check this against the VeriEQL paper [second-hand].
- **Confidence:** high that the paper says this [checked: arXiv HTML text]. The theorem has not been peer-reviewed [unverified].

### 2F. egg / egglog

**F25. Equality saturation.**
- **egg:** POPL 2021, DOI 10.1145/3434304; crate 0.11.0 (2025-12-04).
- **egglog:** PLDI 2023, "Better Together: Unifying Datalog and Equality Saturation", DOI 10.1145/3591239; crate 3.0.0 (2026-08-19).
  - It "combines the power of equality saturation and Datalog".
  - It has a tutorial, and "you can also run egglog in your web browser".
- **Source:** https://github.com/egraphs-good/egglog
- **Confidence:** high [checked].

### 2G. Assurance cases

**F26. Assurance 2.0, the manifesto (Bloomfield & Rushby).**
- **Bibliographic details:** arXiv 2004.10474v3 (2021-01-14); published in *Systems and Covid-19* (SSS 2021), DOI 10.65391/r1313.
- **Reasoning steps:** they should be "as deductive as possible and inductive only as strictly necessary".
- **Building blocks:** "there are only five basic CAE Blocks: evidence incorporation, calculation, decomposition, substitution, and concretion".
- **Weighing evidence:** evidence "must also discriminate between a claim and its negation or counterclaim", measured with confirmation theory.
- **The Indefeasibility Criterion**
  - "all identified doubts and objections have been attended to and no credible doubts remain".
  - What makes a case indefeasible "is that we know about these residual doubts, have examined them, and made a conscious decision about them".
- **The defeater log:** defeaters are recorded "just as hazard analysis and the hazard log are essential parts of safety engineering".
- **Source:** https://arxiv.org/abs/2004.10474
- **Confidence:** high [checked: PDF text].
- **CAE building blocks paper:** Bloomfield & Netkachova, ISSREW 2014, DOI 10.1109/ISSREW.2014.72 [checked: metadata].

**F27. "Assessing Confidence with Assurance 2.0" (arXiv 2205.04522, v4 2024-05-03; SRI-CSL-2022-02 R2)** assesses confidence from three perspectives: **positive** (soundness, evidence weight), **negative** (defeaters explored, resolved and recorded, guarding against confirmation bias) and **residual doubts** (accepted deliberately and documented), supported by the **Clarissa** prototype toolset. **Confidence:** medium [summary].

**F28. Eliminative argumentation (SEI CMU/SEI-2015-TR-005, 2015-02-25; Goodenough, Weinstock, Klein).**
- **Five elements:** an argument has "claims, evidence, inference rules, argument terminators, and defeaters".
- **Three defeater types (the report says "only" three)**

  | Type | Attacks | Meaning |
  |---|---|---|
  | **Rebutting (R)** | the claim | "If R is true, the claim is false" (failure modes, counterexamples) |
  | **Undermining (UM)** | the evidence | "If UM is true, the evidence is invalid" |
  | **Undercutting (UC)** | the inference rule | "the truth of the rule's premises is insufficient" |

- **Confidence as m|n**
  - Write *m|n* when m of n identified doubts have been eliminated.
  - "there are n – m residual doubts".
- **Caveat:** "Our approach says nothing about how to identify doubts".
- **Sources:** https://www.sei.cmu.edu/library/eliminative-argumentation-a-basis-for-arguing-confidence-in-system-properties/ ; ICSE 2013 NIER paper, DOI 10.1109/icse.2013.6606668 ; incremental assurance, J. System Safety 58(1) 2023, DOI 10.56094/jss.v58i1.215
- **Confidence:** high [checked: PDF text].

**F29. Notations and standards.**
- **GSN:** the SCSC site names **version 3** as the latest GSN Standard (https://scsc.uk/gsn-standard, linked as SCSC-141C).
  - SRI-CSL-2024-01 (F35) cites it as "Goal Structuring Notation Community Standard Version 3. The Assurance Case Working Group, York, UK, May 2021".
  - The same report describes GSN's "Dialectic Extension" (Section 1:6), which leaves the propagation of defeat to "expert judgement".
  - The date is checked through that citation. I still could not read the standard itself.
- **OMG SACM:** **2.3** (October 2023) is the latest formal version, and 2.4 is in beta (September 2026). Source: https://www.omg.org/spec/SACM/ [summary].
- **ISO/IEC/IEEE 15026-2:2022 (assurance cases):** [unverified]; the ISO page returned 403.
- **Confidence arguments:** Hawkins, Kelly, Knight, Graydon, "A New Approach to creating Clear Safety Arguments" (SSS 2011; DOI 10.1007/978-0-85729-133-2_1) separates the main argument from *confidence* arguments. Metadata [checked]; content [background].

**F35. Bloomfield, Netkachova & Rushby, "Defeaters and Eliminative Argumentation in Assurance 2.0"** (SRI-CSL-2024-01, 2024-05-28; arXiv 2405.15800). *Added in the resume pass.*
- **Two kinds of defeater**
  - *Exploratory* defeaters "augment the main argument".
  - *Exact* defeaters are "used as a reasoning step within the main argument". This is how Assurance 2.0 represents eliminative argumentation.
- **Status vocabulary**
  - Claims are true, false or *unsupported*.
  - Defeaters are "retired" when refuted, "active" otherwise, or "explicitly accepted and justified as residual risks".
  - An argument with active defeaters, disconnected parts or unsupported claims is "open"; otherwise it is "closed".
- **The propagation rules are a logic program**
  - They are written as Horn clauses and run in the s(CASP) answer-set system.
  - Exact defeaters need classical negation; "unsupported" behaves like negation as failure.
- **Confidence is subordinate**
  - Confidence is a subjective probability, with a default "sum of doubts" for reasoning steps.
  - It is "not used to deliver judgment on a case (that is the rôle of indefeasible soundness)" but "to help ensure balanced effort across a case". A footnote says ordinal scales have "little merit".
- **Source:** https://arxiv.org/abs/2405.15800
- **Confidence:** high [checked: PDF text].

**F36. LLMs can propose defeaters, but the evidence is preliminary and judging defeater quality is itself unreliable.** *Added in the first resume pass. On 2026-10-21 the venues were corrected and the third item added.*
- **GPT-4 Turbo study.** Khakzad Shahandashti et al. used GPT-4 Turbo to identify defeaters written in eliminative-argumentation notation (arXiv 2401.17991, 2024-01-31).
  - It was published at the REW 2024 workshops of IEEE RE 2024, DOI 10.1109/rew61692.2024.00011.
  - *Correction: the earlier pass listed it as FORGE 2024 [second-hand]; Crossref gives REW.*
- **CoDefeater** (Gohar, Hunter, Lutz & Cohen; arXiv 2407.13717; ASE 2024 NIER, DOI 10.1145/3691620.3695296) reports "initial results on two systems": LLMs "can efficiently find known and unforeseen feasible defeaters".
- **Judging defeater quality.** Rohlinger, Ratiu & Wagner (ICSRS 2025, DOI 10.1109/ICSRS68021.2025.11422208; arXiv 2607.06039) trained classifiers to assess LLM-generated defeaters in automotive and energy case studies.
  - They report "substantial human reviewer dissensus, with Cohen's kappa values below 0.442".
  - Their classifiers reached "an average F1-score of 0.84".
  - They leave "final judgment to domain experts".
- I found no study of LLM-proposed defeaters in a learning setting.
- **Confidence:** high for the metadata and abstracts [checked: arXiv API, Crossref]. The effect has been measured only in these small studies.

**F41. Documenting defeaters: Defeater Cards, and a taxonomy of real-world defeaters.** *Added 2026-10-21.*
- **Defeater Cards** (Gohar, Hunter, Purandare, Rios, Cohen & Lutz; arXiv 2606.11462, 2026-06-09; preprint). A structured record organised by the 5W1H questions:

  | Question | Fields |
  |---|---|
  | *What?* | Affected node(s); description; source (expert review, incident report or tooling) |
  | *Why?* | Rationale for including *or later dismissing* the defeater; underlying assumption; severity and impact |
  | *Who?* | The humans involved, and "automated methods (tools, LLM judges, etc.)" |
  | *When?* | Event or trigger (for example "software updates"); frequency; lifecycle phase |
  | *Where?* | Component; operational context |
  | *How?* | Mitigation and monitoring; reliability of the mitigation; limitations, including reviewer disagreement; residual risks |

  - The authors warn against "confidence-inflating" defeaters and note that "even quantitative confidence measures can be manipulated to create an illusion of rigor".
  - They release an open repository of cards [URL and licence unverified].
- **"A Taxonomy of Real-World Defeaters in Safety Assurance Cases"** (Gohar, Hunter, Cohen & Lutz; MO2RE 2025, a workshop at ICSE; DOI 10.1109/mo2re66661.2025.00007; arXiv 2502.00238)
  - It derives seven categories by open coding of 20 years of literature:
    - **Logical Fallacies**;
    - **Contextual**;
    - **Evidence Validity**;
    - **Requirements Engineering**;
    - **Structural** (lack of redundancy, interdependencies);
    - **Adversarial**;
    - **Uncertainty** (epistemic, aleatoric, ontological).
  - Its logical-fallacy subtypes come from Greenwell et al. (2006) and fall into relevance, acceptability and sufficiency.
    - Sufficiency includes "Arguing from Ignorance", "Hasty Inductive Generalization" and "Omission of Key Evidence".
    - Acceptability includes "Pseudo-precision".
  - Validation with user studies "is left to future work".
- **Confidence:** high [checked: arXiv HTML text; Crossref].

**F42. In practice confidence is assessed qualitatively, and claim status can be computed by a logic program.** *Added 2026-10-21.*
- **Practitioner interviews** (Diemert, Shortt & Weber; arXiv 2411.03657, 2024-11-06; n = 19)
  - The most common confidence-assessment methods were "(peer-)review of ACs, dialectic reasoning ('defeaters'), and comparing against checklists".
  - Participants "preferred qualitative methods and expressed concerns about quantitative CAMs".
- **Frontier AI safety cases** (Barrett et al.; arXiv 2502.05791, 2025-02-09) applied Assurance 2.0.
  - They found that "numerical quantification of confidence is challenging, though the processes associated with generating such estimates can lead to improvements in the safety case".
  - They propose a Delphi method run entirely by an LLM, and a way to prioritise which defeaters to investigate.
- **Semantic analysis with s(CASP)** (Murugesan, …, Bloomfield & Rushby; TPLP 24 (2024) 805–824, DOI 10.1017/S1471068424000425)
  - It checks Assurance 2.0 cases for "logical consistency, adequacy, indefeasibility" using goal-directed answer-set programming.
  - This is the published version of the rule engine described in F35.
- **Confidence:** high for abstracts and metadata [checked: arXiv API]; I did not read the full texts.

**F43. Understanding as an assurance artefact, as an answer to "epistemic debt"** (Robin Bloomfield, "Understanding: reframing automation and assurance", arXiv 2604.05662, 2026-04-07; preprint for the FACCT workshop, May 2026). *Added 2026-10-21.*
- **The concern.** Automation "may increase the speed, quantity, and apparent consistency of assurance artefacts while reducing the degree to which any human actually understands the system".
  - The paper cites AI-assisted-programming work on *epistemic debt*: "the accumulation of functional capability without corresponding growth in the mental models needed for correction and maintenance".
- **The proposal: two artefacts**
  - An **Understanding Basis**: "a structured Assurance-2.0-style justification addressing why the available understanding is sufficient for a specific decision".
  - A **Personal Understanding Statement**: "a reflexive artefact through which a participant makes their grasp explicit, challengeable, and revisable". It covers the system's behaviour, the evidence and reasoning, and "the doubts that remain and how they are handled".
  - Both come with "designed friction: deliberate pauses and prompts that require reviewers to interrogate complex reasoning rather than passively accept automated outputs".
- **Confidence:** high that the paper says this [checked: PDF text]. It is a position paper with no outcome data.

**F44. Evidence that shares a source fails together.** *Added 2026-10-21.*
- **VP-CONTROL** (Zheng et al.; arXiv 2609.10969, 2026-09-10; preprint)
  - A "cross-model vote over shared evidence approves 62.9% of unsafe proposals, versus 22.9% with an independent source".
  - The effect of the evidence source (40.9 points) is larger than the effect of using different models (11.3 points).
  - Its transfer is limited: one cross-domain check "fails to reproduce the source effect", and only small local models were tested.
- **The same pattern appears in stronger evidence**
  - AuthV2's spec errors surfaced only against an independent legacy engine (F30).
  - SpotIt found the gold queries were often wrong (F38).
  - The taxonomy lists "Interdependencies" as a structural defeater (F41).
- **Confidence:** low to medium for the VP-CONTROL numbers [checked: abstract only; single preprint]; high for the pattern across F30 and F38.

**Tool versions for the Bench** [checked, GitHub/npm; Z3, cvc5, Lean, CompCert, symcc and egglog re-checked on 2026-10-21 and unchanged]
- Z3 5.3.1 (2026-10-15); npm `z3-solver` 5.3.1 (2026-10-16).
- cvc5 1.4.2 (2026-10-08). SymCC pins **1.3.1**.
- Carcara's latest *release* is still 1.1.0 (2023-08-29), although the repository is active (last push 2026-10-13). Carcara checks cvc5's Alethe proofs, so the course should pin a commit.
- PGlite (`@electric-sql/pglite`) 0.5.10 (npm, 2026-10-14); Regorus 0.13.0 (2026-10-14).
- Alloy 6.2.0 (2025-01-09).

---

## 3. What this means for the course

### 3.1 Stage 7: Secrecy (authorization and information flow)

**The main change: organise Stage 7 around three layers of authorization evidence, taken from Cedar.** Today v1 mixes the layers.
- **Layer 1, properties of the policy language, proved once in Lean.**
  - The learner proves Mini-Plinth versions of `forbid_trumps_permit`, `default_deny`, `allowed_only_if_explicitly_permitted` and `order_and_dup_independent` (F3).
  - These are short, achievable proofs, and they reuse Stage 2–3 skills.
- **Layer 2, properties of a particular policy set, checked per change with SMT.**
  - The learner builds a **policy diff**: is there a request that the new policy allows and the old one denies?
  - This is exactly Zelkova's / IAM `CheckNoNewAccess` and Cedar's "More Permissive" (F4, F5).
  - Teach decidability in the same lesson. Encode the team hierarchy with quantified acyclicity and transitivity, watch the solver return `unknown`, then ground the constraints on the footprint as Cedar does (F1).
- **Layer 3, does the implementation conform?**
  - The learner tests the Rust or SQL enforcement against the reference evaluator with DRT.
  - The generator must report its *distribution*, because Cedar found 35.5% of its conditions were trivial (F2).
  - Proofs move the risk into the specification: all 7 of AuthV2's shadow-test mismatches were spec errors (F30). So the reference evaluator must itself be tested against an independent behaviour source, such as:
    - v1's hand-built access matrix;
    - a second implementation (OPA against Regorus, F32);
    - recorded requests.

    Each mismatch is triaged as a spec, implementation, tool or proof error.

**Proposed lesson map** (9 lessons instead of 8; merge 7.4 into 7.5 to stay at 8):

| # | Lesson | Borrowed from | Leaves |
|---|---|---|---|
| 7.1 | Access models and *where the recursion lives* (engine, data or rules) | Zanzibar userset rewrites (F6); Cedar's hierarchy as data (F1); Datalog fixpoints | — |
| 7.2 | Policy as Datalog: the access matrix *with derivations*, plus reverse queries (`list_objects`, `list_users`) | Soufflé minimal-height proof trees (F10); OpenFGA test format (F7) | C7.1 CHECKED[fact snapshot] |
| 7.3 | Meta-theorems of your policy language (Lean) | cedar-lean `Thm/Authorization.lean` (F3) | C7.2 PROVED[kernel] |
| 7.4 | Is this refactor permission-preserving? Policy diff in Z3 (lineage: Margrave → Zelkova → Cedar); `unknown` caused by quantified hierarchy; grounding; fail closed as Block Public Access does. Optional: count *how much* new access with model counting, which links to 7.7's bits | F1, F4, F5, F31 | S7.4 "refactor grants new access"; S7.8 "quantified hierarchy → unknown" (an UNKNOWN specimen); C7.3 |
| 7.5 | Alloy scope and instances (v1's 7.3 and 7.4 merged) | — | C7.4 CHECKED[scope n] |
| 7.6 | Enforcement vs noninterference; observers as equivalence relations (PER); self-composition and 2-safety in Z3 | F13, F14 §2.1 | C7.5 |
| 7.7 | Declassify on purpose: every release states *what, who, where, when*; test against the four principles | F14, F17 | S7.1 (E3), S7.2 count channel (measured in bits), S7.6 digit laundering |
| 7.8 | Revocation, time and the "new enemy" | Zanzibar §2.2 and zookies (F6) | S7.3, S7.5 stale snapshot after revocation |
| 7.9 | Caches as observers: information flow as Datalog reachability | RFC 9111 `private` caveat; web cache deception (F16); Cloudflare Origin Cache Control and Cache Rules (F33); Nemo filter bug (F11) | S7.7 path-confusion cache leak; S7.9 `private="Set-Cookie"` body cached at the edge (confirm on a Bench zone first); C7.6 CHECKED[flow graph] + ASSUMED[CDN honours Cache-Control] + CONFIGURED[rules read back] |

**Instruments (in the browser).** Keep v1's TypeScript semi-naive evaluator, but make it emit **minimal-height derivations** (Soufflé records rule number and height per tuple and searches backward lazily, F10), and add a `verify:datalog` CI gate that DRTs it against Soufflé 2.5. Nemo WASM is an optional second engine once bundle size and phone speed are measured (bindings experimental, not on npm). Z3 (`z3-solver` 5.3.1) runs the policy diff and paired-state checks; `@cedar-policy/cedar-wasm` 4.14.0 could power a one-lesson Mini-Plinth-vs-Cedar comparison. Regorus's WASM build (0.13.0) runs Rego source in the browser, both for the contrast specimen and for an OPA-against-Regorus DRT exercise (F32).

**Bench lab L7.** Rules in **`ascent` 0.8.1** (the learner's Rust stack), **Soufflé 2.5** as oracle and explainer (`-t explain`), a three-way DRT harness (ascent, Soufflé, TS evaluator) whose receipt records versions, n and generator statistics, plus the Z3 diff and paired-state checks, the Lean meta-theorems, and an `.fga.yaml`-style expected-access table as TESTED evidence.

**New Audit Desk cases.** **A7.4** "CheckNoNewAccess: PASS" although one statement timed out (UNKNOWN as proof; Zelkova fails closed, F5). **A7.5** a correct policy on an engine version that ignores filters (hidden trust, F11). **A7.6** a diff proved for schema S while production entities violate acyclicity (undercut premise, F1/F3). **A7.7** "a count is not data" (F14, F17). **A7.8** "revocation enforced" while checks read a replica snapshot (new enemy, F6). **A7.9** "the new engine is proved, so swapping it in is safe", with no differential or shadow run against the old one (AuthV2's 7 spec mismatches, F30). **A7.10** "Regorus is OPA-compliant": a conformance claim pinned to OPA v1.2.0 (F32).

### 3.2 Stage 9: Preservation (compiler correctness)

**Proposed lesson map** (10 lessons; still about 6–10 weeks, because 9.7 and 9.8 reuse 9.6's semantics):

| # | Lesson | Borrowed from | Leaves |
|---|---|---|---|
| 9.1 | The spectrum of compiler assurance: verified compiler (CompCert), bootstrapped (CakeML), bounded translation validation (Alive2), verified model plus DRT'd implementation (Cedar), verified source plus a restricted-subset compiler plus shadow testing (AuthV2). A Call It on each: "which would have caught bug X?" | F18–F21, F2, F30 | — |
| 9.2–9.3 | Target IR; compile (as v1) | — | — |
| 9.4 | Observations: state the theorem in **CompCert's template** (if compilation succeeds, the target's observable behaviour improves on one of the source's allowed behaviours). Name what is *excluded*: time, memory, row counts | F18, F23 | Sets up E7 |
| 9.5–9.6 | Forward simulation; prove it (as v1) | Leroy 2009 | C9.1 |
| 9.7 | The bad optimisation, plus a rewrite lab. Rules in **egglog** (in the browser); every rule must pass an Alive-style Z3 check before it is admitted | F20, F25 | S9.1 (E5); S9.6 unsound rule admitted to the e-graph |
| 9.8 | Translation validation per run: an Alive2-style **bounded** refinement check for Plinth IR. Stamp it CHECKED[bound], never PROVED. Contrast semantic and syntactic oracles | F19 | S9.2 syntactic validator accepts a wrong translation (basis for A9.2); C9.2 |
| 9.9 | **Validating generated SQL**: containment checks that a generated query returns only rows the access policy allows (Chandra–Merlin homomorphism for the restricted fragment); equivalence of rewrites with QED / SQLSolver / VeriEQL on the Bench; refutation with Polygon or ParSEval's generated databases; **replay every counterexample on PGlite or Postgres**. Three kinds of evidence: PROVED (fragment), CHECKED (bound), TESTED (generated instances). Calibrate with real numbers: about 32% of LLM rewrites changed results, and memo-based checking proved 37% (F37); checking against a single database overstated accuracy by 11.3–14.2 points (F38). Show *when bounded becomes proof* with a small-model bound for conjunctive queries (F40, a preprint). Link back to 9.7: QO-Verify's memo intersection is close to asking whether two terms share an e-class (my analogy) | F24, F34, F37–F40 | S9.3 "NEQ on equivalent queries"; S9.4 spurious bounded counterexample; S9.7 "results match on the fixture DB" (TESTED[1 instance]); S9.8 an LLM judge says "equivalent"; C9.3 |
| 9.10 | Draw the TCB with real failures: CompCert's unverified front end (Csmith), Z3 unsoundness found by Alive2, Nemo's filter bug, Lean's `native_decide` and new compiler; and the compilers inside verification pipelines (Cedar's DRT oracle is Lean compiled to C; AuthV2 trusts DafnyLite) | F11, F18, F19, F22, F30 | E8 |

**New erosion events**
- **E7: a correct compiler with leaky output.**
  - Course 09's preservation theorem holds, but its observables exclude timing and row counts.
  - The Stage 7 noninterference claim (C7.5) therefore does *not* carry over to compiled code.
  - The learner either narrows the observer stated in the claim, or adds a constant-time-style constraint and cites the secure-compilation literature (F18, F23).
- **E8: an engine bug erodes a CHECKED claim.**
  - C7.6 was CHECKED on an engine version with a known filter bug (F11).
  - This is erosion through *undermining* (the evidence is invalid). E1–E6 work through *undercutting* (the inference fails).

**New Audit Desk cases.** **A9.4** SQLSolver's "NEQ" filed as a compiler bug. **A9.5** a VeriEQL-style counterexample filed without replay. **A9.6** a `native_decide` proof reported as "kernel-checked". **A9.7** translation validation passed at unroll=1, claimed for "all inputs". **A9.8** a preservation proof whose observer omits aborts or timing (v1's A9.1, sharpened). **A9.9** an agent's "translation validation" step that is really annotation checks plus differential tests (compare what sits under AuthV2's heading of that name, F30); re-stamp it TESTED. **A9.10** an agent's PR claims a SQL rewrite is "equivalent: results match on the dev database"; that is TESTED on one instance (F37, F38). **A9.11** an LLM review "confirms" the equivalence; that earns no stamp, because LLM judges lean towards "equivalent" (F39). **A9.12** a rewrite is flagged NEQ against the reference query, but the *reference* is wrong; triage both sides (F38).

**Bench lab L9.** The Lean preservation proof; `plinth-tv` (bounded Z3 refinement checker); a restricted-SQL containment checker; an optional cross-check with QED (nightly Rust, z3 and cvc5) or VeriEQL (Python 3.10+), plus ParSEval for generated distinguishing databases; a Lean-interpreter-vs-Rust-runtime DRT harness in Cedar's style with the fuzz budget scaled from 6 h to minutes; and a receipt that lists the TCB.

### 3.3 The Claim and report system

1. **Add a defeater log to every claim (Assurance 2.0, eliminative argumentation).**
   - Each defeater records its type, `rebutting | undermining | undercutting`, and a status in Assurance 2.0's words (F35): `active`, `retired by <specimen | argument | receipt>`, or `accepted residual (rationale)`.
   - The claim card shows confidence as **m|n**: eliminated doubts out of identified doubts.
   - Residual doubts are listed by name.
   - This gives a numeric display without invented probabilities, and it puts the indefeasibility test on screen: are any doubts unexamined? (F26, F28)
   - A claim's argument is *open* while any defeater is active or any part of it is unsupported or disconnected, and *closed* otherwise (F35).
   - *m|n* is a count, not a weight. Never sum it across claims, rank by it, or gate anything on it. Assurance 2.0 uses confidence only to balance effort (F35), and kernelspace's honest-rewards rule says the same.
   - The guarded tutor may *propose* defeaters, labelled "AI-proposed" (F36), but it never retires one. Only a specimen, a receipt or a learner-written argument can retire a defeater.
   - **Record shape: borrow a compact Defeater Card (F41).** Each record holds:
     - the affected claim or step;
     - a description;
     - the source: `learner | AI-proposed | specimen | tool | erosion event`;
     - the rationale, kept *even when the defeater is dismissed*;
     - the underlying assumption;
     - the trigger: a toolchain bump, an engine release, a spec change or a TTL expiry (this ties into erosion events);
     - who or what found it;
     - status, mitigation and residual risk.

     Leave out severity scores, for three reasons:
     - SRI-CSL-2024-01 says ordinal scales have "little merit" (F35);
     - practitioners distrust quantitative methods (F42);
     - the Defeater Cards authors warn of "an illusion of rigor".
   - **Hunting for doubts.** Use the seven-category taxonomy (F41) as a checklist. It answers the eliminative-argumentation caveat "Our approach says nothing about how to identify doubts" (F28).
   - **Grading defeaters.** Reviewers agree poorly on defeater quality (kappa < 0.442, F36). So grade a defeater by whether a specimen or receipt *settles* it, not by a rubric score.
2. **Regroup v1's 12 gap classes under the three defeater types.** This is my mapping, offered for review. Classes marked *(new)* are proposed additions, not v1 classes.
   - **Rebutting:** REFUTED specimens; requirement mismatch, shown with a legitimate scenario.
   - **Undermining (the evidence is invalid):**
     - unsound encoding;
     - hidden trust (`sorry`, `axiom`, `native_decide`);
     - *(new)* trusted-tool defect: a bug in a solver, engine or compiler (F11, F19);
     - *(new)* a receipt that cannot be reproduced;
     - *(new)* common-mode evidence: two checks share the source of failure. Examples are an oracle derived from the same spec, the same fact snapshot, or an LLM reviewing LLM output over the same evidence (F30, F38, F44). It corresponds to the taxonomy's "Structural: interdependencies" (F41).
   - **Undercutting (the inference fails):**
     - statement too weak;
     - vacuous premise;
     - wrong property kind;
     - bounded presented as unbounded;
     - unstated environment assumption;
     - drift between model and implementation;
     - granularity;
     - observer too weak;
     - test presented as proof.

   **Cross-check against the 2025 taxonomy (F41).** This mapping is mine.

   | Taxonomy category | v1 counterpart |
   |---|---|
   | Logical Fallacies | classes 1, 2, 5, 8, 9 and 11. "Arguing from Ignorance" ≈ 5 (bounded presented as unbounded); "Hasty Inductive Generalization" ≈ 11 (test presented as proof); "Faulty Analogy" ≈ 8 (model–implementation drift); "Fallacy of Composition" ≈ 9 (granularity) |
   | Contextual | class 7 |
   | Evidence Validity | classes 4 and 6, plus the proposed trusted-tool-defect and unreproducible-receipt classes |
   | Requirements Engineering | classes 3 (wrong property kind) and 12 |
   | Adversarial | class 10, in Stage 7 |
   | Uncertainty | the UNKNOWN stamp and the NOT COVERED section |
   | Structural | none; hence the proposed common-mode class |
3. **Type each argument step as one of the five CAE blocks, with its side condition** (F26): *concretion* ("secure" → noninterference w.r.t. observer O and declassification set D, Stage 7's completion test); *decomposition* (per access path; side condition: the path list is complete); *substitution* (model → implementation; side condition: the refinement relation); *calculation* (Datalog fixpoint, access matrix; side condition: engine correctness); *evidence incorporation* (attach a receipt; side conditions: hashes, versions).
4. **Publish a verdict→stamp table and enforce it in the instruments and receipt importers.**

| Raw tool output | Stamp | Required qualifier or follow-up |
|---|---|---|
| `unsat` on the learner's encoding | PROVED (of the encoding) | Solver and version. Open undermining defeater "encoding unverified" until a Lean soundness argument (C4.3-style) or a second encoding cross-checks it |
| `unsat` through a Lean-verified encoder (Cedar SymCC) | PROVED | "Encoder verified (Lean); solver trusted"; list the well-formedness premises |
| `sat` plus model | REFUTED **only after replay** in the reference interpreter or PGlite | Witness size; replay receipt |
| `unknown` or timeout | UNKNOWN; in an enforcement context, **fail closed** (as S3 Block Public Access does) | Timeout, seed, solver |
| Bounded pass (Alive2 unroll k, VeriEQL bound, Alloy scope, TLC constants) | CHECKED | The bound |
| SQLSolver `NEQ` | UNKNOWN, unless a counterexample database replays | — |
| QED "provable" | PROVED[QED, fragment] | Feature list, SMT timeout |
| DRT, n inputs, no divergence | TESTED | n, generator, distribution statistics, duration |
| DRT or shadow mismatch, or disagreement with a gold or reference query | No stamp: open a defeater against **both** sides and triage its cause as spec, implementation, tool or proof. All 7 of AuthV2's were spec errors (F30), and SpotIt's gold queries were often wrong (F38) | A reproducing input |
| ParSEval: no distinguishing database found | TESTED | Instances; settings (set or bag, keys) |
| Datalog "no derivation of sink" | CHECKED[fact snapshot] | Engine and version, hash of the fact base |
| Lean theorem with `native_decide` | PROVED[kernel + Lean compiler] | Open undermining defeater |
| Same results on one fixture database (an agent's "results match") | TESTED[1 instance] | Name the database. About 32% of LLM rewrites failed even this test (F37), and it overstated text-to-SQL accuracy by 11.3–14.2 points (F38) |
| Optimizer memo match (QO-Verify-style), or the same e-class in an e-graph | PROVED[rewrite rules assumed sound] | List the rules used. Each rule is an undermining dependency unless it was checked Alive-style (9.7) |
| Memo check returns `Unknown` | UNKNOWN | It may mean a missing rule (F37) |
| Bounded pass with bound ≥ the fragment's small-model bound B | CHECKED[bound ≥ B]. Upgrade to PROVED[fragment] only after the bound theorem is peer-reviewed and fragment membership is checked mechanically | Fragment membership: conjunctive, no aggregation (F40) |
| An LLM judges "equivalent" or "safe" | **No stamp**; it is a hypothesis to send to a checker | LLM judges lean towards "equivalent" (F39) |

5. **Add CONFIGURED and NOT COVERED report sections.**
   - Today the course's stamps (PROVED, CHECKED, TESTED, ENFORCED, ASSUMED, REFUTED, UNKNOWN) lack two categories that an assurance report needs:
     - **CONFIGURED**, meaning the configuration was read back, for example cache rules;
     - **NOT COVERED**, meaning explicitly out of scope.
   - Add both as report sections, plus "Residual doubts accepted".
   - Distinguish "model-checked (design)" from "implementation conforms (trace or DRT)". Keep them as separate stamps, so that one never stands in for the other.
6. **Exports**
   - GSN-style diagram:
     - goals, strategies (CAE blocks) and solutions (receipts and specimens);
     - assumptions drawn dashed, matching DESIGN.md's dash rule;
     - *away goals* for claims from other courses;
     - *undeveloped* goals for UNKNOWN and NOT COVERED.
   - An optional SACM 2.3 mapping (F29). The course's JSON stays the source of truth.
7. **Content claims should use kernelspace's claims registry.**
   - Each fact in Stages 7 and 9 becomes `{source{url, quote}, verifiedAt, ttlDays}`: tool versions (TTL 60–90 days), bug counts (TTL 180 days), and the Cedar-versus-OpenFGA/Rego speed ratios.
   - Ratios get boundary tags such as "author-run benchmark, generated workloads".
   - Papers are historical and need no TTL.
8. **The course's own release gate, borrowed from Cedar and Zelkova**
   - Nothing ships unless `verify:calls`, `verify:specimens`, `verify:interp` and the new `verify:datalog` DRT are green (F2).
   - Bumping Z3 or cvc5 must keep previously solved Call-It queries solved (F5).
   - Pin solvers per receipt. SymCC needs cvc5 **1.3.1**, not the latest.
   - Measure proof brittleness, as AuthV2 did (F30): run every authored Z3 snippet under several random seeds and flag high variation in solver resource counts before a learner meets a flaky Call It. Re-run the Lean proofs on every toolchain bump.
9. **A Personal Understanding Statement at each viva (F43).**
   - Alongside the claim card, the learner writes a short statement of what they understand about the claim, its evidence and its residual doubts, and how each doubt is handled.
   - They write it *without* the agent; this is Bloomfield's "designed friction". The statement can be challenged in the viva.
   - It targets epistemic debt, the specific risk for a learner who builds their own system with coding agents.
   - The source is a position paper with no outcome data, so pilot it alongside open questions 7 and 11.
10. **Independence of evidence (F44).**
    - Each receipt records its *evidence source*: spec, fact snapshot, generator or model.
    - The claim card warns when two receipts for the same claim share a source.
    - A DRT receipt whose oracle comes from the same spec as the implementation automatically opens a common-mode defeater.
    - A shadow run against an independent behaviour source retires that defeater (AuthV2, F30).

### 3.4 Cross-links and alignment

- **byzantine (consistency):** link from Lesson 7.8, because zookies and external consistency are a consistency story.
- **tablespace T4 (MVCC snapshots):** relevant to stale snapshot reads.
- **tablespace T5 (planner):** link from Lesson 9.9. Planner rewrites are compiler passes, and equivalence tools validate them. CIDR 2026's memo-based checker (F37) is a story about planner internals.
- **kernelspace**
  - claims registry and release-gate patterns;
  - **production twins at pinned SHAs**:
    - Stage 7: cedar-lean `Cedar/Spec/Authorizer.lean` plus `Thm/Authorization.lean`;
    - Stage 9: Alive2's `alive-tv`, and CompCert's top-level preservation theorem (pin the file and name at build time [unverified here]).

---

## 4. Recommendations (ranked)

| Rank | Recommendation | Why (findings) | Effort |
|---|---|---|---|
| **R1** | Build Stage 7 around the **three layers of authorization evidence**: Lean meta-theorems, a per-policy SMT diff, and implementation DRT. Use cedar-lean as the production twin, and AuthV2 as the case for testing the *spec* against an independent behaviour source (all 7 of its mismatches were spec errors). Teach analyzability as a design choice ("where the recursion lives"; grounding versus quantifiers) | F1–F5, F30, F31 | M |
| **R2** | Add the **defeater log, m\|n doubt counts and CAE-typed steps** to the Claim record. Use Assurance 2.0's statuses (active, retired, accepted residual; claims open or closed), and never aggregate or gate on m\|n. Use a compact Defeater Card record: source, rationale (kept even when the defeater is dismissed), trigger, and who or what found it; no severity scores. Use the seven-category taxonomy as a checklist for hunting doubts. The tutor may propose defeaters but never retire them. Regroup the 12 gap classes under rebutting, undermining and undercutting, and consider three new undermining classes: trusted-tool defect, unreproducible receipt and common-mode evidence. Show residual doubts on every card and in the Course 10 report | F26–F28, F35, F36, F41, F42, F44 | S–M |
| **R3** | Ship the **verdict→stamp table** (§3.3 item 4) and enforce it in the importers. UNKNOWN fails closed in enforcement contexts (Block Public Access's rule), NEQ is not REFUTED, every witness must be replayed, and bounded results are stamped CHECKED. "Results match on one database" is TESTED[1 instance], and an LLM judgement earns no stamp. A DRT or gold-query mismatch opens a defeater against both sides | F5, F19, F24, F30, F37–F40 | S |
| **R4** | Add **Lesson 9.9, "Validating generated SQL"**: containment checks against the access policy; QED/SQLSolver/VeriEQL on the Bench; Polygon or ParSEval to refute; counterexample replay on PGlite. Calibrate the lesson with the CIDR 2026 and SpotIt numbers, and show when bounded checking becomes proof (small-model bounds, a preprint). This is the most direct preparation for making a translation-validation claim and for checking SQL that coding agents write | F24, F34, F37–F40, F8 (filters) | M |
| **R5** | **Assure the course itself the way Cedar is assured**: a `verify:datalog` DRT (TS evaluator against Soufflé 2.5, optionally Nemo), pinned solvers, a regression corpus that keeps solved queries solved, a seed-variation brittleness check on authored Z3 snippets (as AuthV2 did), and a release gate requiring model, proofs and DRT to be current. Show its receipt on the "About this course's assurance" page | F2, F5, F11, F30 | M |
| **R6** | Add an unassisted **Personal Understanding Statement** to each viva, and record **evidence sources** on receipts so that a shared source opens a common-mode defeater. Both address the main risk for a learner who works through coding agents: capability without understanding, and checks that fail together. Pilot the statement, since the source is a position paper | F30, F38, F43, F44 | S |
| **R7** | Use **Sabelfeld & Sands' vocabulary for declassification**: every `declassify` declares what, who, where and when; audit cases test the four principles; add the digit-laundering specimen; measure the count channel in bits | F14, F17 | S |
| **R8** | Rebuild **revocation (7.8) around Zanzibar's new-enemy problem** and zookies, with a stale-snapshot specimen and cross-links to byzantine and tablespace | F6 | S |
| **R9** | **Stage 9 translation validation the Alive2 way**: a bounded refinement checker for Plinth IR, an egglog rewrite lab where each rule must pass an SMT check before admission, and an audit case contrasting semantic and syntactic oracles | F19, F20, F25 | M |
| **R10** | Use **CompCert's theorem template** in 9.4 and list the excluded observables. Add **E7** (a correct compiler with leaky output) linking Stages 7 and 9 through secure compilation | F18, F23 | S |
| **R11** | **Cache and information-flow lesson (7.9)**: Datalog reachability with proof-tree explanations; the RFC 9111 `private` caveat, Cloudflare's Origin Cache Control default, its qualified-`private` behaviour, Cache Rule overrides and web cache deception become CONFIGURED/ASSUMED seams; add CONFIGURED and NOT COVERED report sections | F10, F16, F33 | S |
| **R12** | **Draw the TCB (9.10) with real failures**: Csmith on CompCert's front end, Z3 unsoundness from Alive2's list, Nemo's filter bug, Lean `native_decide` and the new compiler, and the compilers inside verification pipelines (Cedar's Lean-to-C DRT oracle; AuthV2's DafnyLite). Add **E8** (an engine bug erodes a CHECKED claim) | F11, F18, F19, F22, F30 | S |
| **R13** | **Exports**: a GSN v3-style diagram (away goals, undeveloped goals) and an optional SACM 2.3 mapping. The course JSON stays canonical | F29 | S |
| **R14** | **Deferred Shelf drawers**, each with the obligation that opens it:<br>• HyperLTL tools (AutoHyper, HyperQB) and HyperPardinus: open when a claim needs a ∀∃ hyperproperty over traces;<br>• Hyper Hoare Logic;<br>• cvc5 proofs plus Carcara: open when a PROVED claim must not trust the solver;<br>• CakeML | F15, F21 | S |
| **R15** | **Tool hygiene**:<br>• do not build on Oso OSS (deprecated) or DDlog (archived);<br>• use Rego as a *contrast specimen* (expressive, Datalog-based, not analyzable in general), run in the browser with Regorus;<br>• use OpenFGA's `.fga.yaml` as the model of TESTED evidence and SpiceDB's playground/WASM as a UX reference;<br>• pin Carcara by commit, since it has had no release since 2023 | F7–F10, F1, F32 | S |

---

## 5. Open questions

1. **Can Cedar SymCC's SMT-LIB output be solved by Z3-WASM in the browser?** That would let a lesson show a verified-encoder analysis without cvc5. Untested; SymCC is specified for cvc5 1.3.1, and I found no cvc5 npm/WASM package.
2. **What do Nemo-WASM's size and speed look like on a mid-range phone?** Are its experimental bindings stable enough for a lesson? Nothing is published on npm.
3. **Do `ascent` or `crepe` produce derivations or provenance?** Neither README documents it. If not, Soufflé remains the explanation oracle on the Bench.
4. **Which SQL equivalence tool best covers the restricted Postgres SQL subset the course generates** (NULLs, bags)?
   - QED and SQLSolver parse with Calcite.
   - VeriEQL's published results date from 2023.
   - None was checked against Postgres-specific semantics here.
5. **Is HyperPardinus's code available? Are the HyperQB 2.0 code and web interface public?** The 2.0 abstract is checked, but the GitHub repo was last pushed 2025-03-12. Both questions are unverified.
6. **I did not read the content of GSN v3 or of ISO/IEC/IEEE 15026-2:2022.** The GSN v3 date (May 2021) is now checked through a citation.
7. **Does the defeater, m|n and CAE apparatus help learners, or does it only add bookkeeping?** The assurance-case literature is about engineering practice, not learning outcomes. It needs a pilot, measured with the course's own outcome metrics.
8. **Licensing.** Check before bundling or redistributing:
   - CompCert's non-LGPL parts;
   - AutoHyper (GPL-3.0);
   - HyperQB's QBF solver dependency, reported as AGPL [second-hand].
9. **Does Cloudflare cache the body of a `private="…"` response under Origin Cache Control?** The docs table implies that it does (F33). Test this on a Bench zone before authoring S7.9.
10. **Can the course's stratified Datalog evaluator compute claim status?** Exact defeaters need classical negation, and Assurance 2.0 uses s(CASP) answer-set programming for this (F35). A direct TypeScript implementation of the rules may be simpler.
11. **Do AI-proposed defeaters help learners, or anchor them?** The 2024 studies (F36) evaluated LLM output against engineering assurance cases, not learning outcomes. This needs a pilot alongside question 7.
12. **AuthV2's DOI and award.** I found no DOI; a Crossref search on 2026-10-21 still found none. The "Distinguished Paper" label is second-hand; the programme page says only "Award Winner".
13. **Licences for reuse.** Check them before using the Defeater Cards repository or the taxonomy's artefacts (F41) in course content; I did not find the URL or licence of either. SpotIt+'s licence shows as NOASSERTION (F38).
14. **Will the small-model SQL bound (F40) survive peer review, and can it be extended to NULLs and aggregation?** Until it is, the course's restricted SQL is not covered by it.
15. **Can a memo-match check like QO-Verify be reproduced for Postgres?** The Postgres planner does not expose a Cascades memo. An egglog encoding of a relational-algebra IR might substitute for it (linking 9.7 and 9.9); this is untested.
16. **Does an unassisted Personal Understanding Statement measurably reduce learners' epistemic debt (F43), and how much does it cost per viva?** The source is a position paper with no outcome data; pilot it alongside questions 7 and 11.

---

## 6. Verification log

Verdicts:
- **checked:** I read the primary text or metadata.
- **summary:** the primary page was read through a summarising fetch.
- **second-hand:** search-result summary only.
- **unverified:** could not be confirmed.

| Claim | Verdict | Evidence |
|---|---|---|
| Cedar's encoding is decidable/sound/complete through grounding; quantifiers lead to undecidability and timeouts; 28.7–35.2× (OpenFGA), 42.8–80.8× (Rego); 75.1 ms; "Datalog program equivalence is undecidable" | checked (PDF text) | arxiv.org/pdf/2403.04651v2; DOI 10.1145/3649835 (Crossref) |
| VGD numbers: 4 bugs from proofs, 21 from DRT/PBT; LOC table; 3.4:1; 6 h/day, 4 vCPU/8 GB; 35.5% vs 9.7%; string-size feature dropped; limitations | checked (PDF text) | arxiv.org/pdf/2407.01688v1; DOI 10.1145/3663529.3663854 |
| Lean 5 µs vs Rust 7 µs; release-gate sentence; "small trusted computing base" | checked (page text; resume pass) | aws.amazon.com/blogs/opensource/lean-into-verified-software-development/ (2024-04-08) |
| cedar-lean verified-properties list; theorem statements; Lean v4.35.0; 26 SymCC DRT targets; TPE `reauthorize_is_sound` | checked | github.com/cedar-policy/cedar-spec (main, 2026-10-20) |
| cedar-policy 4.14.0 / symcc 0.8.0 (2026-10-17); cedar-wasm 4.14.0 (2026-10-19) and its exports | checked | crates.io API, npm registry, cedar-wasm/src/lib.rs |
| SymCC needs cvc5 1.3.1; list of analyses | summary | docs.rs/cedar-policy-symcc |
| Cedar Analysis categories and checks (2025-06-16) | summary | AWS open-source blog |
| SymCert FMCAD 2026: sole author; 5 analyses in one work day **in total** (the first pass wrongly said each); Lean models ported to Rust with Lean as DRT oracle; proofs caught factory-function bugs; RFC extension costs | checked (PDF text; resume pass) | SymCert PDF on cdn.amazon.science; DataCite DOI 10.34727/2026/isbn.978-3-85448-093-8_30 |
| Zelkova abstract ("sound", PSPACE-complete, "many millions of times daily") | checked (PDF) | FMCAD 2018 PDF; DOI 10.23919/FMCAD.2018.8602994 |
| Solver portfolio; timeout classified "public"; cvc5 0.0.4 regression | summary | amazon.science blog (2022-08-18) |
| "Billion SMT queries a day" | title only (body does not state it) | DOI 10.1007/978-3-031-13185-1_1 |
| IAM custom policy checks (three APIs) | checked | docs.aws.amazon.com page |
| Zanzibar scale, new enemy problem, zookies | checked (PDF text) | usenix.org/system/files/atc19-pang.pdf |
| OpenFGA v1.22.0, CLI v0.8.2; CNCF incubating (blog 2025-11-11); 37 production adopters | checked / summary | GitHub API; cncf.io blog |
| OpenFGA incubation date 2025-10-28 | checked (resume pass) | cncf.io/projects/openfga/ |
| `.fga.yaml` check/list_objects/list_users | summary | openfga.dev/docs/modeling/testing |
| SpiceDB v1.57.0; WASM package "not stable" | checked | GitHub API; pkg/development/wasm/README.md |
| OPA v1.21.3; v1.0.0 date and changes; Datalog lineage sentence | checked | GitHub API; docs/docs/policy-language.md |
| OPA creators joined Apple; CNCF graduated; no licence change (2025-08-20) | summary | openpolicyagent.org blog |
| OPA SQL filtering quotes | summary | openpolicyagent.org/docs/filtering/tutorial-sql-filtering |
| Oso OSS deprecated; v0.27.3 | checked | github.com/osohq/oso README, releases |
| Soufflé 2.5 notes; provenance proof trees | checked / summary | GitHub release; souffle-lang.github.io/provenance |
| Nemo v0.10.1 critical filter bug; in-browser app; experimental nemo-wasm; tracing API | checked | GitHub releases, README, nemo-wasm/src/lib.rs |
| ascent 0.8.1, crepe 0.2.0, datafrog 2.0.1 (2019), DDlog archived; egg 0.11.0, egglog 3.0.0 (runs in browser) | checked | crates.io API, GitHub API, READMEs |
| IFC / hyperproperty DOIs (Goguen–Meseguer … Hyper Hoare Logic, HyperPardinus) | checked (metadata) | Crossref |
| Self-composition: type systems "inherently imprecise" | summary (author page) | cs.famaf.unc.edu.ar/~dargenio/node/27.html |
| Sabelfeld & Sands dimensions, principles, credit-card example, PER | checked (PDF text) | cse.chalmers.se/~andrei/sabelfeld-sands-jcs07.pdf |
| AutoHyper completeness claim | second-hand (repo checked) | search summary; GitHub API |
| HyperQB 2.0 features | checked (arXiv abstract updated 2025-10-21; resume pass) | arXiv API, 2109.12989 |
| RFC 9111 `private` text | checked | rfc-editor.org/rfc/rfc9111.txt |
| Web cache deception study (340 sites; quotes) | summary | usenix.org presentation page |
| CompCert 3.18; preservation statement; excluded observables; unverified phases | checked (release) / summary (manual) | GitHub API; compcert.org; compcert.org/man/manual001.html |
| Csmith CompCert passages | checked (PDF text) | users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf |
| Alive2: 47 bugs / 28 fixed; 8 LangRef patches; 121 violations; oracle quote | checked (PDF text) | alive2-pldi21.pdf; DOI 10.1145/3453483.3454030 |
| Alive2 BugList: 101 LLVM, 24 Z3 bugs (2026-01-12), four of them Z3 unsoundness entries | checked (counted in both passes) | github.com/AliveToolkit/alive2/BugList.md |
| CakeML guarantees; v3479 | summary / checked | cakeml.org; GitHub API |
| Lean 4.22.0 new compiler; `native_decide` docstring; v4.35.0 | checked | lean-lang.org release notes; lean4 `src/Init/Tactics.lean` at v4.35.0 |
| Translation validation, CT-CompCert, robust preservation DOIs | checked (metadata) | Crossref |
| QED 299/444 and 979/1287; repo status; z3+cvc5 dependency | checked (PDF, README) | vldb.org PDF; github.com/qed-solver/prover |
| SQLSolver verdict semantics and timeout overrun; VeriEQL 3,617/3,619 genuine; SPES; Cosette deprecated | checked (SQLSolver and VeriEQL re-read in the resume pass) | READMEs via GitHub API |
| Polygon content (refutation; over 30,000 benchmarks) | checked (arXiv abstract; resume pass) | arXiv 2504.06542; DOI 10.1145/3729303 |
| Assurance 2.0: five CAE blocks; indefeasibility; defeater log | checked (PDF text) | arxiv.org/pdf/2004.10474v3; DOI 10.65391/r1313 |
| "Assessing Confidence with Assurance 2.0" perspectives; Clarissa | summary | arxiv.org/abs/2205.04522 |
| Eliminative argumentation: five elements, three defeater types, m\|n, caveat | checked (PDF text) | sei.cmu.edu …/2015_005_001_434813.pdf |
| GSN v3 is latest; dated May 2021; Dialectic Extension | summary (SCSC page) + checked (citation in SRI-CSL-2024-01) | scsc.uk/gsn-standard; arXiv 2405.15800 |
| SACM 2.3 (Oct 2023) / 2.4 beta (Sep 2026) | summary | omg.org/spec/SACM/ |
| ISO/IEC/IEEE 15026-2:2022 | unverified (403) | — |
| Hawkins et al. confidence arguments | metadata checked; content background | DOI 10.1007/978-0-85729-133-2_1 |
| Z3 5.3.1, cvc5 1.4.2, Carcara 1.1.0, Alloy 6.2.0 | checked | GitHub API, npm |
| **Resume pass:** every version and date above re-checked (Z3, cvc5, Lean, CompCert, OpenFGA and CLI, SpiceDB, OPA, Soufflé, Nemo, Alive2, CakeML, Carcara, Alloy, DDlog, crepe, cedar, symcc, ascent, datafrog, egg, egglog, cedar-wasm, z3-solver, opa-wasm); all held | checked | GitHub API via `gh`; crates.io; npm |
| AuthV2: scale; four years; Dafny and DafnyLite; 7 spec-only mismatches; 10^15 inputs; brittleness 41→4; Cedar comparison | checked (PDF text) | cdn.amazon.science AuthV2 PDF |
| AuthV2 programme date and "Award Winner"; DOI; "Distinguished Paper" | summary; not found; second-hand | conf.researchr.org; Crossref search; web search |
| Block Public Access fails closed on timeout; 0 unknowns in 19,901 policies; about 1 in 2 million estimate | checked (PDF text) | cdn.amazon.science BPA PDF; DOI 10.1145/3368089.3409728 |
| Policy-diff lineage DOIs (Margrave, stratified abstraction, BPA, permissiveness, IP model counting) | checked (metadata) | Crossref; DataCite |
| Regorus: Rust, no_std, WASM, OPA v1.2.0 compliance; v0.13.0 | checked | README via GitHub API; crates.io |
| DBSP authors; Feldera v0.367.0; DDlog README has no pointer to either | checked | Crossref; GitHub API |
| Soufflé #2476 title and state | checked | GitHub API |
| Cloudflare Origin Cache Control quotes; qualified-`private` table row | checked (raw Markdown); the behaviour I infer is untested | developers.cloudflare.com/cache/concepts/cache-control/index.md |
| ParSEval 40% and 21×; demo abstract; repository | checked | both PDFs; Crossref; GitHub API |
| SRI-CSL-2024-01: exploratory and exact defeaters; statuses; s(CASP); role of confidence | checked (PDF text) | arxiv.org/pdf/2405.15800v1 |
| LLM defeater studies (arXiv 2401.17991, 2407.13717) | checked (metadata and abstracts); FORGE listing second-hand | arXiv API |
| No new 2025–2026 SQL equivalence prover | second-hand (two searches; not exhaustive) | web search |
| **Second resume pass (2026-10-21):** Z3 5.3.1, cvc5 1.4.2, Lean v4.35.0, CompCert v3.18, symcc 0.8.0, egglog 3.0.0, OpenFGA v1.22.0, SpiceDB v1.57.0, OPA v1.21.3, Nemo v0.10.1, Soufflé 2.5, Regorus v0.13.0, cedar-wasm 4.14.0 | checked (unchanged) | GitHub API; crates.io; npm |
| DOI 10.65391/r1313 resolves to "Assurance 2.0: A Manifesto" (Rushby & Bloomfield, *Systems and Covid-19*, 2021-02-09) | checked | Crossref; doi.org redirect to scsc.uk |
| arXiv dates: 2004.10474v3 (2021-01-14); 2205.04522v4 (2024-05-03); 2405.15800v1 (2024-05-16, cover dated 2024-05-28) | checked | arXiv API; PDF cover |
| The GPT-4 Turbo defeater paper appeared at REW 2024, not FORGE 2024 (**corrected**); CoDefeater at ASE 2024 NIER | checked | Crossref; arXiv comment |
| ICSRS 2025 defeater-quality study (kappa < 0.442; F1 0.84) | checked (abstract; journal reference) | arXiv API, 2607.06039 |
| DOIs for relational verification and IFDS (JLAMP 2016, DAC 2009, CAV 2012, PLDI 2016, POPL 1995) | checked (metadata) | Crossref |
| cvc5 SQL theories: LPAR 2024, pp. 445–463, DOI 10.29007/rlt7 | checked | Crossref; EasyChair page |
| CIDR 2026: ≈32% of rewrites differed; 3100+ candidates; 37% verified; QO-Verify one-sided; median 1.2 s | checked (PDF text and slides) | cidrdb.org paper and slides |
| PVLDB 2026 companion demo | second-hand (search result) | vldb.org/pvldb/vol19/p4594-narasayya.pdf |
| SpotIt: drop of 11.3–14.2 points (71.32% → 58.80% for the top method); rankings change; gold SQL often wrong; ICLR 2026 | checked (PDF text) | arXiv 2510.26840v2 |
| SpotIt+ constraint mining; repository | checked (abstract; GitHub API) | arXiv 2603.04334; github.com/ai-ar-research/SpotIt-plus |
| LLM equivalence judges: 82% and 61% accuracy; bias towards "equivalent" | checked (abstract and PDF lines) | arXiv 2412.05561v2; 2312.10321v4 |
| Small-model bounds 2^w\|Q\| and 2^kw\|Q\|; the open problems it states | checked (HTML text) | arXiv 2609.09978v1 |
| Its claim that "a fifth" of one VeriEQL suite's "checked" pairs are inequivalent | second-hand (via the preprint) | arXiv 2609.09978v1 |
| Defeater Cards: 5W1H fields; "illusion of rigor" | checked (HTML text) | arXiv 2606.11462v1 |
| Taxonomy: seven categories; Greenwell fallacy subtypes; MO2RE 2025 | checked (HTML text; Crossref) | arXiv 2502.00238v1; DOI 10.1109/mo2re66661.2025.00007 |
| Practitioner study (n = 19); confidence in frontier AI safety cases; s(CASP) paper in TPLP 2024 | checked (abstracts; journal reference) | arXiv API |
| Bloomfield 2026: Understanding Basis; Personal Understanding Statement; designed friction; epistemic debt | checked (PDF text) | arXiv 2604.05662v1 |
| VP-CONTROL: 62.9% vs 22.9%; 40.9 vs 11.3 points | checked (abstract only) | arXiv 2609.10969v1 |
| AuthV2 DOI | still not found (Crossref search, 2026-10-21) | Crossref |

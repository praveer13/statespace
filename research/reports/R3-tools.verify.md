# R3-tools verification log (light mode, 2026-10-21)

Method: GitHub REST API (`gh api`), crates.io API, arXiv export API, doi.org CSL, shallow clones (grep only) of spectacle@5827c22 and tla-by-example@ec0cc03 in a local working directory, WebFetch of vendor pages.

| # | Claim | Verdict | Correction / note | Source |
|---|---|---|---|---|
| 1 | TLC v1.8.0 is prerelease (2026-10-20T18:35:42Z); last stable v1.7.4 (2024-08-05), v1.7.3 same day, v1.7.2 2022-02-02 | confirmed | Minor: v1.7.1 was published 2022-02-23, i.e. after v1.7.2; irrelevant to pinning | https://api.github.com/repos/tlaplus/tlaplus/releases |
| 2 | Apalache v0.62.4 (2026-10-12), 4 releases 2026-08-19..10-12; moved to TLA+ Foundation under Linux Foundation; Informal Systems funding 2020-2024 | confirmed | README text verified | https://github.com/apalache-mc/apalache |
| 3 | Quint at quint-co/quint, v0.33.0 2026-09-28, evaluator/v0.7.0 same day, prev v0.32.0 2026-03-31 | confirmed | | https://github.com/quint-co/quint/releases |
| 4 | Spectacle = will62794/tla-web (redirect), MIT, pushed 2026-09-30, HEAD 5827c22 | confirmed | | https://github.com/will62794/spectacle |
| 5 | Spectacle: 172 test specs in specs/with_state_graphs, 142 with .dot.json; no PlusCal/WF_/SF_/fairness/liveness in js/ | confirmed | Case-insensitive grep of js/ found zero hits. Still an inference from absence | clone @5827c22 |
| 6 | Spectacle README shared traces: write skew / read-only anomaly under SI; Raft log entry rolled back | confirmed | | spectacle README lines 26-28 |
| 7 | TLA+ By Example runs TLC via CheerpJ loader 4.3 with Java `version: 11`; lessons.md rule about invariant/deadlock/temporal-property; 57254 distinct states | confirmed | Loader is in public/tlc-worker.html | clone @ec0cc03 |
| 8 | CheerpJ Community Licence: FOSS/personal/evaluation; unmetered from cjrtnc.leaningtech.com; self-hosting needs Commercial Licence; business use excluded except one-person companies; credits required | confirmed | Nuance for the "licence firewall" in section 3: one-person companies ARE in the free tier, so the business-use exclusion applies only to businesses of more than one person. The report states this in F5 but drops it in section 3 | https://cheerpj.com/docs/licensing |
| 9 | CheerpJ 4.3 post (2026-04-21): supports Java 8, 11, 17; Java 21 planned "later this year"; "commercial software, free to use for FOSS projects, personal projects, and one-person companies" | confirmed | | https://labs.leaningtech.com/blog/cheerpj-4.3 |
| 10 | cvc5 1.4.0 (2026-09-17) Logos Lean checker, Ethos still recommended; VTS soundness issues, disabled in safe/stable mode; 1.4.1 (2026-09-25) removed LFSC, Ethos 0.2.5; 1.4.2 (2026-10-08) | confirmed | 1.4.0 notes cite Ethos 0.2.4, 1.4.1 cites 0.2.5 (report correctly attributes 0.2.5 to 1.4.1) | https://github.com/cvc5/cvc5/releases |
| 11 | cvc5 Alethe: `--dump-proofs --proof-format-mode=alethe`; EUF, linear arithmetic, bit-vectors, parts of strings; contrib/get-carcara-checker | confirmed | | cvc5 docs/proofs/output_alethe.rst (main) |
| 12 | Carcara last release carcara-1.1.0, 2023-08-29 | confirmed | Commit-count claim (>=100 in 2026) not re-checked | https://github.com/ufmg-smite/carcara/releases |
| 13 | Alloy v6.2.0 2025-01-09, prev v6.0.0 2021-11-04; adds CLI (`java -jar alloy.jar help`); Java 17+; LICENSE "THIS IS NOT VALID YET! CURRENTLY CODE IS UNDER MIT LICENSE" | confirmed | | https://github.com/AlloyTools/org.alloytools.alloy |
| 14 | Forge v5.2 (2026-03-06) ... v5.0.0 (2026-01-26); OOPSLA 2024 doi:10.1145/3649833 | confirmed | DOI resolves to "Forge: A Tool and Language for Teaching Formal Methods", PACMPL, 2024-04-29 (OOPSLA1 issue) | doi.org CSL; GitHub releases |
| 15 | Kani 0.68.0 2026-09-16; turmoil v0.7.2 2026-04-24; turmoil-net 0.1.0 2026-05-04; turmoil-fs 0.1.0 2026-10-19 | confirmed | | GitHub releases; crates.io API |
| 16 | Stateright 0.31.0 (2025-07-27); madsim 0.2.34 (2025-10-11), last commit 2026-02-16 "chore: bump tonic to 0.14 and etcd-client to 0.18" | confirmed | Whether these are "maintenance mode" is the report's judgement, not a fact | crates.io API; GitHub commits |
| 17 | Cirstea, Kuppe, Loillier, Merz, arXiv:2404.16075 (v1 2024-04-24); reduces to constrained TLC model checking | confirmed | Venue remains UNVERIFIED: arXiv has no journal-ref; HAL lists it as a working document; no SEFM/LNCS listing found. Do not cite "SEFM 2024" | arXiv API; https://dumas.ccsd.cnrs.fr/LORIA-ALGO/hal-04813639v1 |
| 18 | Howard, Kuppe, Ashton, Chamayou, Crooks, "Smart Casual Verification of the Confidential Consortium Framework", NSDI 2025; "CCF powers Microsoft's Azure Confidential Ledger"; "binding the formal specification in TLA+ to the C++ implementation" | confirmed | | arXiv:2406.17455 (comment: NSDI 2025) |
| 19 | Davis, Hirschhorn, Schvimer, "eXtreme Modelling in Practice", PVLDB 13(9):1346-1358 (2020); MBTC "impractical" against a highly abstract spec; MBTCG "highly successful" | confirmed | Exact abstract wording: "MBTCG was highly successful for Realm Sync, however." | arXiv:2006.00915 |
| 20 | TigerBeetle VOPR quote: real code, network/storage/process faults, 1000x speed, 24/7 on 1024 cores | confirmed | | https://docs.tigerbeetle.com/concepts/safety/ |
| 21 | P README: AWS teams (S3, EBS, DynamoDB, MemoryDB, Aurora, EC2, IoT) use P; PObserve | confirmed | | https://github.com/p-org/P |
| 22 | Antithesis $105M Series A, Jane Street lead, about 2025-12-03 | confirmed (secondary) | Secondary press only (PR Newswire, Fortune 2026-03-23); report tags it second-hand, which is correct | https://www.fortune.com/2026/03/23/antithesis-janestreet-ethereum-will-wilson-foundationdb-software |

Not re-checked (light mode): Lamport CUP book details, TLA+ Foundation grant range, AWS CACM metadata, Verus tag, PGlite/Lean/Z3 spike pins, Carcara commit count, quint.sh corporate details.

Overall: every load-bearing version, date, licence and quote I sampled matches primary sources. The report marks its uncertainties correctly. Two small issues: (a) the trace-validation venue must stay unverified; (b) the section 3 "licence firewall" line should keep the one-person-company exception.

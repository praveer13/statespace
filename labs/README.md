# statespace-lab: how the labs work

**Status:** draft: first-learner pass pending. **Date:** 2026-10-24 (machine clock).

This is the manual for the lab system. It covers what a lab is, where each check is graded, how to set up your machine, what the template contains, and what to do when you are stuck. Pins and install commands are in [TOOLS.md](TOOLS.md). The rules your coding agent reads are in [AGENTS.md](AGENTS.md).

**Reading the tags.** A statement about a tool's behavior, a version, a flag or a number ends with a tag. `[X RUN-id]` names a run that was executed and is on file. `{{run:RUN-id}}` marks a run that will be recorded before the sentence ships. A tool statement with neither is an error in this file. `[V]` marks a fact re-checked against a primary source that is not a run, and `[D]` marks design rationale.

If you read only two sections before your first weekend, read §4.1 (LAB-1 needs only `uv`) and §6 (one stage, start to finish).

---

## 1. What a lab is

A lab is a staged build on your own machine. You write real code, proofs and specifications, run the real tools on them, and keep what comes out: receipts, claim cards and specimens. There are ten labs, LAB-1 to LAB-10, one for each stage S1 to S10. They live in one repository, `statespace-lab`, which you start from the template and keep. The roadmap asks for one evolving lab repository, and that repository is your record. The browser's only record is your practice events, beside a disposable, read-only copy of your lab repository, so back the repository up with git.

Each lab arrives as a zip that carries the lab's folder, its read-only pieces and the agent kit. Unpack it into the repository root. The first zip starts the repository, and later ones add their folder.

Every lab has the same shape. Stage text, minutes and check ids are on each lab's page in the course; this file explains the system around them.

1. **Predict, then run.** The lab page asks for your call on the reference's verdict before you run it.
2. **Run the reference.** The first stage of every lab is a two-minute win: run something that already works and read what it printed.
3. **Investigate.** Three to five short items on the reference.
4. **Build in stages.** A stage takes at most 25 minutes on a weekday and at most 45 at a weekend, and ends in a check. Nothing times you; the minutes are the plan's.
5. **Read per-check results.** Each check passes or fails on its own and names what it suspects.
6. **Ask for help in order.** An explanation first, then the hint ladder (§11).
7. **Prove-it.** Predict what happens to seeded mutations of your own artifact, with your agent closed (§13).
8. **Receipt, then claim cards.** The receipt records what the tools said. The claim cards fade from prefilled to written by you.

Plan for a stage to take up to twice its nominal minutes, and a Lean proof stage up to three times, because the stuck protocol parks a goal at 90 minutes (§12) [D]. Stages marked `[weekend]` are planned at 45 minutes: every Lean stage that proves a whole theorem, rather than one case, is one. Stages marked `[stretch]` are optional and sit outside the plan's hours.

**Labs make claims, not credit.** A passing check mints or updates a claim card. It never moves "signed off", because an agent could have produced the work. Credit comes from the Defence at the end of each stage: probes on unseen seeds, seeded mutations of your own artifact, audit cases and an explain-back, with your agent closed (§13).

---

## 2. The ten labs

| Lab | You build | Stages | Graded in | Tools |
|---|---|---|---|---|
| LAB-1, Project 00, the counterexample lab | a Z3Py lab: a transfer, its guard, a buggy refund, conservation and double capture, and a README with the roadmap's five fields | LAB-1.1–LAB-1.6 | your machine with `uv run`, or the tab; witnesses are re-checked in the tab | `uv`, Z3 5.3.1 |
| LAB-2, the verified ledger | a pure credit ledger in Lean, proved against a challenge pack | LAB-2.1–LAB-2.8 (LAB-2.8 `[stretch]`) | your machine | Lean 4.35.0 |
| LAB-3, mini-plinth-core | Mini-Plinth in Lean with kernel-checked goldens and a JSON IR; then your Rust parser, typechecker and interpreter | LAB-3.1–LAB-3.13 (LAB-3.12, LAB-3.13 `[stretch]`) | your machine for Lean; the tab for your Rust (LAB-3.8–LAB-3.11) | Lean, Rust |
| LAB-4, `miniplinth check` | a verification-condition generator in Rust that emits SMT-LIB | LAB-4.1–LAB-4.9 (LAB-4.9 `[stretch]`) | the tab for your Rust; your machine for the cvc5 cross-check (LAB-4.8) | Rust, Z3, cvc5 |
| LAB-5, the holds spec | a TLA+ model of two concurrent credit operations and the holds lifecycle | LAB-5.1–LAB-5.7 (LAB-5.7 `[stretch]`) | your machine | Java 21, TLC |
| LAB-6, pg-refinement | a Transfer compiler to SQL, a differential harness, isolation anomalies, a retry policy and R(S, D) | LAB-6.1–LAB-6.9 | your machine for PostgreSQL 18.6; the tab for your compiler on PGlite | PostgreSQL 18.6, Rust |
| LAB-7, authz-flow | an access policy in Datalog, a row-level security differential, a paired-state noninterference check, revocation | LAB-7.1–LAB-7.8 (LAB-7.8 `[stretch]`) | your machine for Soufflé and PostgreSQL; the tab for its Datalog engine, for Z3 and for your Rust (LAB-7.5, LAB-7.6) | Soufflé, PostgreSQL 18.6, Z3 |
| LAB-8, effects-sim | an outbox model with crash windows, a sans-I/O machine under seeded faults, and trace validation | LAB-8.1–LAB-8.9 (LAB-8.9 `[stretch]`) | the tab for your outbox state machine under seeded faults; your computer for TLC trace validation | Rust, Java 21, TLC |
| LAB-9, compiler, preservation proof and SQL validator | a stack-machine proof, an IR and compiler, a preservation proof by cases, a SQL validator and a drawing of the trusted base | LAB-9.1–LAB-9.12 | your machine for Lean; the tab for your SQL validator (LAB-9.11) | Lean, Rust |
| LAB-10, Core assembly | your pieces wired together, an agent proposal triaged, the demonstration recorded, and the report published | LAB-10.1–LAB-10.10 (LAB-10.10 `[stretch]`) | both | all of the above |

Four labs grow pieces of the Core as they go: LAB-3, LAB-4, LAB-6 and LAB-8 each carry stages that build capstone steps. LAB-10 assembles them.

**What the course supplies, and what you write.** The course supplies harnesses: `statespace isorun`, the abstract-serializability checker, `statespace trace validate`, the reference translation validator and, on the builder's path only, a reference compiler. Course-supplied reference modules are labeled "reference module, earns nothing". You write the compilers, generators, retry policies, R(S, D), machines, specs and validators. Each lab's template states what it pre-supplies, so a stage's minutes cover only what you write.

---

## 3. How a check is graded

Every result names who ran the check. The interface shows one of three badges.

| Badge | Who ran the check | What you do | What it establishes |
|---|---|---|---|
| *re-checked here* | the course's page, in your browser tab | build your Rust to a wasm module and load it in the tab, or let the tab replay a witness | on seeds drawn when you submit, your module agrees with the reference oracle (the count and the oracle's name are printed), or the witness replays |
| *reported from your machine* | the real tools, on your machine | run `statespace check`, then import the receipt | what the tools printed: verdict lines, versions, hashes and bounds. The tab parses them again; it cannot re-run Lean, TLC or PostgreSQL |
| *self-assessed* | you | declare how much help you had; write a teach-back | nothing external; it keeps your own record honest |

Only the tab can say *re-checked here*, because only the tab re-ran the check. A receipt file can carry *reported from your machine* or *self-assessed* and nothing else.

**Graded in the tab.** Your Rust is compiled to a wasm module with no imports, so the module needs nothing from the page (drawer D-14 explains the interface). The build is `cargo build --release --target wasm32-unknown-unknown` [X RUN-scaffold]. You load the file in the tab; nothing is uploaded, because there is no server. Each check runs in a fresh instance of your module (the worker is replaced only after a timeout) under a time limit, on seeds drawn at the moment you submit. The oracles are "unseen, not secret": a static site cannot hide them. When a check fails, it names which kind of problem it suspects: your spec, your implementation, the tool or the proof.

**Checked on your machine.** Lean, TLC and multi-session PostgreSQL run authoritatively only on the Bench. The tab has stand-ins for learning (recorded Goal Replay, Spectacle for small TLA+ models, PGlite on one connection), and none of them issues a receipt. So the real tools run on your machine and write receipts (§8).

*Design-notes cross-reference.* The design notes call the first path Lane A and the second Lane B. The interface and the lessons use the badge words, and so does this file.

---

## 4. Set up the Bench

The Bench is your machine with the real tools. Labs are laptop work. On a phone you can read receipts, see the resume card for your current stage, and queue the next stage for the laptop.

### 4.1 LAB-1 needs only `uv`

Project 00 asks for one small tool. Install [`uv`](https://docs.astral.sh/uv/), then run the lab's Python with Z3 pinned:

```
uv run --with z3-solver==5.3.1 python -I <script>
```

That is the form the spikes ran [X RUN-z3-starter]. Check a stage with `uv run statespace check lab1.1`, and a whole lab with `uv run statespace check lab1`. There is no Docker and no devcontainer. A first install was the biggest drop-off risk in the course's predecessor [D], so the container waits until S2 (drawer D-15). If you would rather install nothing, every LAB-1 stage also runs in the tab, and the tab re-checks your witnesses.

### 4.2 From S2 on: three ways to set up

The design notes call these three the Bench's setup lanes; the interface says "ways to set up".

| Way | What it is | Good for | Cost and caveats |
|---|---|---|---|
| Devcontainer (default) | one image, pinned by digest, with every tool, and a PostgreSQL 18.6 service container beside it; you open the repository in a container | everyone; the only route on macOS and Windows for Lean checks, because Lean's sandbox is Linux-only | needs a container runtime; Lean's toolchain alone unpacks to 3.0 GB [X RUN-lean-toolchain]; a default container cannot start Lean's sandbox, and `statespace doctor` reports that as `failed` (§4.4); the image's size and CPU architecture are recorded when it is built [X RUN-doctor-devcontainer] |
| Native | you install each tool at its pin (TOOLS.md §2) | Linux learners who want no container | the most variance: you keep the pins; Lean's sandbox needs bubblewrap with unprivileged user namespaces, or a setuid install |
| Codespaces | the same image, prebuilt, in GitHub's cloud | no local install; a borrowed machine | needs a GitHub account (the course has no accounts and never sees your Codespace); GitHub sets and changes the free allowance, so read it there; the sandbox state in Codespaces is {{run:RUN-bwrap-lanes}} |

On the builder's path (concurrency first), your first Bench lab is LAB-5, which comes before S2. Set the Bench up before LAB-5: it needs Java 21 and the pinned TLC jar.

### 4.3 `statespace doctor`

Run it first, and again after any upgrade. It reads; it never installs or edits anything. It compares each tool it finds with the pin, reports the sandbox state (`on`, `off` or `failed`) and prints an environment block that your receipts copy. `statespace doctor` green inside the devcontainer is itself a recorded run [X RUN-doctor-devcontainer].

### 4.4 The sandbox

On Linux, `lake check` and `lake comparator` build and export your project inside bubblewrap. They exit 2 when they cannot start (no bubblewrap, or no `lake-manifest.json`) and 1 for a rejection [X RUN-lean-toolchain]. Under a default Docker container, bubblewrap fails with exit 1, the same code as a rejection [X RUN-lean-bwrap-docker]. A failed sandbox therefore looks like a failed proof unless you read the message. `statespace check` reads it for you, by evidence and never by exit code: a line that starts `bwrap:` means the sandbox failed and nothing was judged, even when later lines say that a kernel "rejected the solution", because a failed sandbox prints those lines too [X RUN-bwrap-lanes]. A check in that state carries no verdict. Receipts record `sandbox: on | off | failed` with the error line, and never require it. Running without the sandbox is your decision, made once and recorded: `statespace doctor` explains the failure and asks, or you pass `--sandbox=off`, and your repository's local settings keep the choice, so every receipt then says `off`. Your agent never makes it, and neither does a script [D].

Statement matching does not need the sandbox. With it off, an honest solution is accepted and weakened or redefined statements are rejected [X RUN-lean-comparator]. Lean itself then prints "WARNING: Sandbox disabled, this run is not trustworthy" [X RUN-lean-axioms], and the receipt repeats the state.

The sandbox is worth having because Lean runs code while it builds: the project's, and its dependencies'. Lean's manual treats un-reviewed AI-generated proofs as potentially malicious [V]. Your agent writes into this repository. If you let it write Lean, read what it wrote before you build with the sandbox off.

To start the sandbox inside a container, the template documents an opt-in profile that relaxes the container's confinement. It is never the default; read what it relaxes before you use it. The recorded set is Docker's default seccomp profile plus one rule that allows five calls (`clone`, `mount`, `pivot_root`, `umount2` and `unshare`), `systempaths=unconfined`, which leaves `/proc` and the other masked system paths open to every process in the container, and `apparmor=unconfined`, which drops Docker's AppArmor profile on a host that has one. The image also needs a `/run/user` directory, and none of the options adds a capability [X RUN-bwrap-lanes]. On a stock Ubuntu 24.04 host these options are not enough: AppArmor's restriction on unprivileged user namespaces has to be lifted on the host too [X RUN-bwrap-lanes]. Verdicts on CI runners, Docker Desktop and Codespaces, where you cannot change the host's settings, are {{run:RUN-bwrap-lanes}}.

### 4.5 Disk and downloads

The Lean 4.35.0 Linux toolchain is a 594.5 MB download and unpacks to 3.0 GB [X RUN-lean-toolchain]. Mathlib is not used: one project importing a single `Finmap` module took 7.3 GB [X RUN-lean-mathlib]. In the tab, nothing asks before an engine downloads: an engine downloads when a page needs it, and the loader shows its size. The Z3 and PGlite instruments are the large ones. The command line tool has no accounts and no telemetry. TOOLS.md §3 lists every measured size.

---

## 5. The repository

```
statespace-lab/
  AGENTS.md  CLAUDE.md           the rules your coding agent reads (CLAUDE.md imports AGENTS.md)
  .claude/                       settings and the guard hook, for Claude Code
  .devcontainer/                 the Bench image, from S2 (LAB-1 needs none)
  .statespace/                   generated: pins and the list of protected paths
  labs/LAB-{n}/
    challenge/                   read-only: definitions and pinned statements (Lean labs)
    ...                          your modules, crates and specs, with TODO(you) markers
    broken/     fixed/           counterexamples kept beside their fixes
  claims/                        your claim cards, and the statements they pin
  proposals/                     claim cards your agent proposes: shown as unreviewed text
  specimens/                     counterexamples, with labels generated from runs
  receipts/LAB-{n}.{k}/          receipts written by statespace check
  decisions/                     decision records (LAB-3.7)
  notes/                         your technical notes
  report/                        the exported report (LAB-10.8)
```

| Path | Who writes it | Notes |
|---|---|---|
| `labs/*/challenge/`, every `comparator.json` | the course | read-only; the pinned statements and the permitted axioms (§9) |
| anything with a `TODO(you)` marker | you | the part of a stage that teaches; your agent is blocked from editing it |
| `claims/` | you | your claim cards and the statements they pin; hashed into receipts |
| `receipts/` | `statespace check` | do not edit by hand; a newer receipt supersedes an older one |
| `proposals/` | your agent | claim cards an agent drafted; never stamped |
| `broken/`, `fixed/` | you | nothing in `broken/` is ever deleted (§9) |
| `specimens/` | you, from runs | labels come from a run, never from typing |
| `.claude/`, `.statespace/`, the devcontainer | the template | change a pin through the template, not by editing in place |

`labs/_solutions/` is never part of a zip. Reference solutions do not ship, in any form.

---

## 6. One stage, start to finish

1. **Open the stage** on the lab's page: its minutes, what the template supplies, the check ids, and your call.
2. **Predict.** Commit your call on the stage's reference verdict before you run it. The call is recorded in the tab, not in your repository.
3. **Build.** Write your part where the template says `TODO(you)`. Iterate with the tool's own commands (`lake build`, `cargo test`, TLC, Z3); they write nothing to `receipts/`.
4. **Check.** `statespace check lab2.2` runs the stage's checks and writes a receipt under `receipts/LAB-2.2/`. `statespace check lab2` runs the whole lab. The argument is the lab's short name: `lab2` is LAB-2, and `lab2.2` is stage LAB-2.2.
5. **Read the result.** Each check prints pass or fail with its message. Read the verdict lines, not only the exit code (§8). A failing check names what it suspects: your spec, your implementation, the tool or the proof.
6. **Import the receipt** in the tab: choose the file, or open a link when the receipt is small. The tab validates it, parses every verdict line again, recomputes statement hashes and shows the badge *reported from your machine*.
7. **Keep what you found.** A counterexample goes in `specimens/`, with the code that produced it left in `broken/` beside its fix in `fixed/` (§9).
8. **Update the claim card** the stage names. The method, tool and version come from the receipt; the proposition and the "if weakened" witness are yours.
9. **Optional:** `statespace defend lab2` for Prove-it on the finished lab (§13).

If you get stuck, go to §11 and §12 before you go to your agent.

---

## 7. Commands

The command is `statespace`. Older design notes abbreviate `statespace <command>` as `bench <command>`; they are the same commands. Run it from the repository root. Inside the devcontainer it is on your path; elsewhere, `uv run statespace <command>` runs it in the project's environment. It is a Python tool managed by `uv` and shipped in the template.

| Command | What it does |
|---|---|
| `statespace doctor` | checks the pins and the sandbox; prints a receipt-ready environment block |
| `statespace check <lab>[.<stage>]` | runs a stage's checks and writes `receipts/`. For Lean: build, then `#print axioms`, then `lake check`, then `lake comparator`, with `--paranoid` at the Defence. For TLC: the recorded argv. Z3 and cvc5 under an `rlimit`. Cargo. It also applies the claim rules locally (`claim@1` validation) |
| `statespace receipt verify <file>` | validates a receipt against `receipt@1` and recomputes its statement hashes |
| `statespace hash <file>` | prints the comparator-style statement hash of a file (§9) |
| `statespace isorun <history>` | drives two sessions on PostgreSQL 18.6, advancing a step only when it sees the other session waiting on a lock, never by sleeping; writes a history file |
| `statespace trace validate <spec> <traces>` | checks NDJSON traces as behaviors of your TLA+ spec with TLC; reports the number of seeds |
| `statespace sim <seed>` | runs your simulator under a seeded fault schedule |
| `statespace defend <lab>` | seeds mutations of a copy of your artifact, runs the right checker and writes a receipt; predictions come first (§13) |
| `statespace audit gen \| harvest` | from the late stages: turns your own repository into audit cases (§13) |
| `statespace stuck` | the stuck protocol (§12) |
| `statespace export` | bundles claims, statement texts, specimens and receipts, and exports the report |
| `statespace overlay` | the private overlay for "your system": local only, never committed |
| `statespace run <RUN-id>` | in the course repository: re-executes a recorded run and diffs its outputs |

---

## 8. Receipts

A receipt is the Bench's report of what the real tools said about one stage. `statespace check` writes it to `receipts/LAB-{n}.{k}/`. You import it in the tab, where it yields stamps and claims. It never counts as evidence of learning.

A receipt records, in plain terms:

- the lab, the stage and the date;
- the environment: the devcontainer digest (or none), the operating system and CPU architecture, and the sandbox state (`on`, `off` or `failed`);
- every tool, with its version string copied verbatim and the SHA-256 of its binary, jar or wheel;
- every pinned statement and its hash;
- every run: engine, version, argv, the hash of its input, its budget (`rlimit`, workers or seed), its exit code and its verdict lines, copied verbatim;
- an engine block where one applies. Lean: toolchain, each checker's verdict, axioms per theorem, `_native` axioms, the `sorry` count and the automation flags. TLC: spec and config hashes, constants, flags, distinct states, depth and result. Z3: the `rlimit`, the verdict and the reason when it says `unknown`. PostgreSQL: server version, isolation level, history hash and SQLSTATE classes;
- the per-check results;
- what you declared about help: `assisted` (`none`, `explain` or `code`) and `agent` (yes or no), both self-reported;
- the claims it would mint or update, and the trusted base.

**A receipt never trusts an exit code alone.** The executed runs show why.

| What you might assume | What the run showed | Run |
|---|---|---|
| exit code 0 means nothing is wrong | a file containing `sorry` builds with exit code 0 | [X RUN-lean-axioms] |
| exit code 0 means the proof is sound | a proof built under `debug.skipKernelTC` builds with exit code 0; only kernel replay rejects it | [X RUN-lean-skipkernel] |
| exit code 1 means the proof was rejected | bubblewrap under default Docker exits 1; the sandbox failed and nothing was judged | [X RUN-lean-bwrap-docker] |
| "the log says accepted" means accepted | `lake check` errors on non-standard axioms while its log still says the default kernel accepts the solution | [X RUN-lean-axioms] |

**What the tab does with a receipt.** It validates the file against `receipt@1`, parses every verdict line again with its own parser and rejects the receipt if the two disagree, and recomputes each statement hash from the text it holds. It shows the receipt as text, never as HTML, and the file's contents never leave your device. A statement hash that no longer matches voids the claim to UNKNOWN [?].

**What a receipt cannot do.** A receipt is not signed, so it can be edited by hand. It is the record of what you report, and the tab can check that it is well formed and consistent. It cannot check that you ran it. That is why credit comes from the Defence, on seeds you have not seen.

---

## 9. Challenge packs, claims and specimens

### 9.1 Challenge packs: you state, agents prove

A Lean lab's `challenge/` folder holds a read-only `Challenge` module with the definitions and the statements, and a `comparator.json`. `lake comparator` then establishes that every named theorem in your solution proves the same statement as the challenge, uses no axiom outside the permitted list, and is accepted by the kernel. This is the shape of the file the executed runs used [X RUN-lean-comparator]:

```json
{ "challenge_module": "Challenge", "solution_module": "Solution",
  "theorem_names": ["transfer_conserves"],
  "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"] }
```

Three verdicts, copied from the executed runs:

| Submission | Verdict line | Exit |
|---|---|---|
| an honest proof | `Your solution is okay!` | 0 |
| an extra hypothesis added under the same name | `error: Challenge and solution theorem statement do not match: 'transfer_conserves'` | 1 |
| `transfer` redefined | `error: Const does not match between challenge and target 'transfer'` | 1 |

All three are [X RUN-lean-comparator]. The permitted axioms are taught in S2.L9. `--paranoid` adds five bundled checkers to Lean's own kernel, so six checkers in all. `lake comparator --paranoid` replays the closure of the named theorems: the executed run took about 3 s on a small project [X RUN-lean-comparator], and 2.92 s on the LAB-2 pack [X RUN-bwrap-lanes]. `lake check --paranoid` replays the whole environment, 57,966 declarations, almost all of them Lean's own, and took 172.6 s on that pack, about three minutes [X RUN-bwrap-lanes]. The pack figures are medians on the machine that recorded them, so a slower machine takes longer, and a project that imports `Std` did not finish `lake check --paranoid` in 6 GiB [X RUN-bwrap-lanes]. Six checkers are not six separate designs: lean4lean ports the reference logic for inductives, so a bug there can reach both [V]. A stamp names its checkers and versions.

**Non-Lean statements.** Labs that are not Lean pin their statements as files you write: `claims/*.smt2`, `claims/*.tla` and `claims/*.yaml`. `statespace hash <file>` prints a hash of the text with trailing whitespace removed plus one newline, the rule Comparator Live uses for its challenge hashes. Receipts store the hash. If the statement changes after a receipt, its hash changes, and the claim voids to UNKNOWN [?].

**What pinning can and cannot do.** A pin shows that you proved this statement. It does not show that the statement says what the requirement says. Every checker can agree on a true theorem that misses the intent, and S2.L10 makes you exhibit one. Ask, of anything an agent proved: who wrote the statement?

### 9.2 Claim cards

A claim card has six fields: proposition, assumptions, model, method, correspondence, and the counterexample when an assumption is weakened. It adds a requirement row. Cards fade from receipt-prefilled to written by you. `claim@1` validation, which `statespace check` applies locally, requires the six fields, a method, tool and version equal to the receipt's, a statement hash equal to the pinned file's, an "if weakened" witness that refutes the card's own proposition when replayed, and a requirement-fit that is never [P]. No stamp is ever typed: stamps are derived from receipts.

### 9.3 Broken beside fixed; specimens

Roadmap rule 2 is "preserve broken examples and counterexample traces alongside fixed versions." In a lab that means `broken/` and `fixed/` side by side, and nothing in `broken/` is deleted or cleaned up. A specimen is a counterexample kept beside its fix, with a label generated from its run: what it violates, because, minimal or not, cured by, found in, tool version. A specimen is *mounted* once a run verifies its label, and *kept* once you re-find the same move on a fresh variant at least 7 days later. Keeping specimens is error-management practice (A/B).

---

## 10. The first two minutes of each lab

Each lab opens with a stage of about two minutes. You run something that already works, and read what it prints.

| Stage | You run | You should see | Backed by |
|---|---|---|---|
| LAB-1.1 | the Z3Py introductory example, then the roadmap's starter | `sat`, then `unsat` | [X RUN-z3-starter] |
| LAB-2.1 | `statespace check` on the reference proof | kernel acceptance and the axiom list | [X RUN-lean-ledger] |
| LAB-3.1 | the reference evaluator | one golden passes | none yet |
| LAB-4.1 | the reference checker on the guarded Transfer | "proved for the fragment" and a premise witness | {{run:RUN-check-fragment}} |
| LAB-5.1 | the provided DoubleSpend configuration on the Bench | the violation, its distinct-state count and its 4-action trace | [X RUN-tlc-doublespend] |
| LAB-6.1 | `statespace isorun` on the provided read-modify-write history | the outcome as recorded | [X RUN-pg-anomalies] |
| LAB-7.1 | the reference policy in Soufflé and in the tab engine | equal relations | [X RUN-fixedpoint-equal] |
| LAB-8.1 | the reference simulator on seed 1 | its NDJSON trace accepted by TLC | {{run:RUN-tlc-trace-validation}} |
| LAB-9.1 | the reference translation validator on one compiled command | the honest output accepted, a wrong-account write rejected | {{run:RUN-tv-reference}} |
| LAB-10.1 | the reference pipeline on the provided agent proposal | the reference report skeleton | {{run:RUN-core-demo}} |

For LAB-5.1, the executed run found the violation at 11 distinct states with a 5-state trace, which is 4 actions [X RUN-tlc-doublespend]. For LAB-6.1, application-level read-modify-write at READ COMMITTED spends 160 out of 100 [X RUN-pg-anomalies].

---

## 11. Help: the explanation gate and the hint ladder

Help is a ladder with a gate in front of it. The gate asks for a few words of your own before anything else: name the failing check, the property it protects and your hypothesis, in at least 12 words. Nothing grades what you write. It checks that you committed to something before you looked at an answer.

| Rung | What you get | On a Lean proof stage |
|---|---|---|
| R0 | a teach-back: write what you think the check verifies, then compare with three authored ideas and tick the ones you covered; self-assessed, never credit | the same |
| R1 | the concept behind the check; opens after a teach-back of at least 12 words | the same |
| R2 | where to look | the stuck goal |
| R3 | a fragment of at most three lines | a `sorry` skeleton |
| R4 | the design in prose | the informal proof |

- **Past R2** the check reads "assisted" until an unseen variant passes without help. A passing check stays passed. The record notes the help, and the credit for that skill returns when a fresh variant passes unassisted.
- **After R4 and two more failing runs** you get a worked solution. Redo it after at least 24 hours; it counts as assisted until a fresh variant passes [D].
- **You can open any rung at any time.** Opening one is recorded, never blocked, and there is no penalty and no delay.
- **Rungs are written in advance.** Nothing generates a hint while you work. Language models may draft rung wording at authoring time; the author reviews it.
- **Manual mode.** In the stages that teach a proof step, manual mode asks you not to use `grind` or `omega`. `statespace check` scans the elaborated proof for automation and records what it finds on the receipt. A flagged proof still passes and still mints its claim, whose method field then names what closed the goal. Nothing is blocked.

---

## 12. The stuck protocol

Stuck is a protocol, not a failure. After about 25, 45 and 90 minutes on one stage, the course offers the next step. It is an offer: no timer runs on screen. The pairing of steps to marks below is a design choice [D].

| At about | Do | What it produces |
|---|---|---|
| 25 minutes | run `statespace stuck` | your failing goal or check, its statement and your hypothesis, written down as a forum-ready minimal example with private paths stripped; and a short packet for your own agent |
| 45 minutes | post that example where people who know the tool will see it, such as the Lean community's Zulip (new members) or the monthly TLA+ meeting | an answer from a person, or a sharper question |
| 90 minutes | park the goal | a parked goal, carried as an assumption [A] in the claim (for a Lean goal, the claim then reads "PROVED modulo k assumed lemmas", each lemma [A]); a re-find scheduled in 7 days |

Parking is a record, not a defeat. A parked goal is declared, and the receipt keeps it visible (`sorryCount`), so the claim can never read as fully proved. A hidden `sorry` is the opposite: nobody decided it. Move on to the next stage. Nothing locks.

---

## 13. Prove-it, the Defence and your repository as the Audit Desk

**Prove-it.** After a lab, `statespace defend lab2` seeds mutations of your own artifact: drop a hypothesis, weaken a guard, switch the encoding, split an atomic action, drop fairness, widen the observer. You predict first, with your agent closed, and the right checker grades afterwards (comparator, TLC, Z3 or cargo). No model grades anything. Every mutant builds or elaborates, or its key says it fails to. For example, in S1 a mutation drops `amount > 0` under BitVec 64, and you say what happens to the guarded sender's verdict.

**The Defence** closes each stage: probes on unseen seeds, Part B (more seeded mutations of your artifact, predicted first), four audit cases of which at least one is sound, and an explain-back that is required and uncredited. It is untimed and runs over at least two sessions. A failed part is retaken on fresh seeds at least 3 days later. Nothing locks in the meantime, and every attempt stays in your record. "Signed off" is a state drawn in ink. A passed Defence is a test of n unseen items, not proof that you are competent.

**Your repository as the Audit Desk.** From the late stages, `statespace audit gen` mutates your repository with gap-class operators, each mutation paired with its sound form, and `statespace audit harvest` turns commits your own agent made to statements into audit cases, quoting its commit message as its claim. Keys come from local checkers. The bundle goes to the tab and nowhere else.

---

## 14. Your coding agent

You will build with agents, and the lab system does not pretend otherwise. It draws one line: **agents may prove; you state.** The policy is per item. Agents are welcome everywhere except Prove-it and the Defence. An agent may write code and proofs outside the by-hand parts of a stage, against pinned statements it may not change. It never states your claims: anything an agent asserts shows as quoted, unreviewed text and is never stamped.

Every lab zip carries the agent kit: `AGENTS.md`, `CLAUDE.md` (which imports it), and for Claude Code a hook that blocks edits to the protected paths. The kit is advice and friction, not enforcement. What enforces the rules is the hook plus checks run out of band: the comparator against files the course owns, kernel replay, statement hashes, and a Defence on seeds you have not seen. You can turn the guard off. Do that on purpose, and declare what happened on the receipt: `assisted: none`, `explain` or `code`, and `agent` yes or no. The declaration is self-reported and checked by no one; it calibrates your own record and polices nothing. If you are unsure, declare more help rather than less.

Read [AGENTS.md](AGENTS.md) once. It is short, and it is what your agent reads.

---

## 15. When a check surprises you

| You see | What it means | Run |
|---|---|---|
| a Lean check exits 1 and prints a line that starts `bwrap:`, such as "No permissions to create new namespace" | the sandbox could not start, so nothing was judged, even when later lines say that a kernel "rejected the solution": a failed sandbox prints those lines too. `statespace check` reads the `bwrap:` line and never the exit code, and `statespace doctor` shows `failed` with the matching hint | [X RUN-lean-bwrap-docker, RUN-bwrap-lanes] |
| the `bwrap:` line names a call or a mount: `pivot_root`, `unshare user ns`, `Failed to make / slave` or `unmount old root`, each "Operation not permitted", or `Can't mount proc` | the container blocks something bubblewrap needs: its seccomp profile allows too few calls, or its masked `/proc` paths stay masked. The opt-in profile of §4.4 allows the five calls and unmasks the paths | [X RUN-bwrap-lanes] |
| `bwrap: Can't mkdir /run/user: Read-only file system` | the image has no `/run/user` directory, and bubblewrap cannot create it; create the directory in the image | [X RUN-bwrap-lanes] |
| `bwrap: Failed to make / slave: Permission denied` | Docker's own AppArmor profile denies bubblewrap's `mount`; the opt-in profile's `apparmor=unconfined` leaves that profile, and on an Ubuntu host the next row applies too | [X RUN-bwrap-lanes] |
| on Ubuntu 24.04, `bwrap: setting up uid map: Permission denied` or `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted` | AppArmor's restriction on unprivileged user namespaces, which the host sets: container options cannot lift it. On the host, set `kernel.apparmor_restrict_unprivileged_userns` to 0, or give `/usr/bin/bwrap` an AppArmor profile that grants `userns` | [X RUN-bwrap-lanes] |
| `lake check` or `lake comparator` exits 2 | it could not start: bubblewrap is missing, there is no `lake-manifest.json` (build the project once to write one), or there are no default targets | [X RUN-lean-toolchain] |
| a Lean check exits 1 with "nanoda kernel rejected the solution", then `error: nanoda exited with 137` | a checker was killed for memory, which is not a rejection: there is no `bwrap:` line and no verdict. With `import Std` in the project, `lake check --paranoid` did not finish in 6 GiB, and `lake comparator --paranoid` did | [X RUN-bwrap-lanes] |
| "Lean default kernel accepts the solution", yet the check failed | the kernel accepted the proofs and the axiom policy rejected an axiom (`sorryAx`, a custom axiom or a `_native` axiom); read the `error:` lines | [X RUN-lean-axioms] |
| the build is green and replay rejects the proof | something skipped the kernel while building, for example `debug.skipKernelTC` | [X RUN-lean-skipkernel] |
| TLC stops at "Deadlock reached" before your invariant | with default flags the DoubleSpend run stopped there at 10 distinct states. With `-deadlock`, a flag that means "do not check for deadlock", it reported the violation at 11 distinct states. Decide which you mean to check, and let the receipt print the flags | [X RUN-tlc-doublespend] |
| a claim reads `UNKNOWN [?]` after you changed a file | a pinned statement changed after its receipt, so its hash differs; restore it, or re-check and re-mint | none; a design rule |
| Z3 says `unknown` | no verdict. Read the reason line. In the tab, budgets are `rlimit`: `timeout` never returned under Pyodide in a Node harness or in Chromium, Firefox and WebKit on a desktop, while `rlimit` stopped with `unknown (canceled)` (no phone has been measured) | [X RUN-z3-budget-pyodide, RUN-phone-pyodide] |
| a Z3 witness differs from the one you saw elsewhere | models are not canonical: the native run and the Pyodide run printed different witnesses, for nearby queries. A `sat` answer is graded by checking the witness against the property, never by matching values | [X RUN-z3-bv64-pyodide] |
| two "concurrent" sessions in PGlite run one after the other | PGlite runs one connection; concurrency in the tab comes from histories recorded on the Bench | [X RUN-pglite] |

---

## 16. What this cannot establish

- **Unassisted work is self-declared.** Nothing local can verify it, and the course says so on its assurance page.
- **Oracles are visible to a determined learner.** Seeds are drawn at grade time, so the items are unseen, not secret.
- **A receipt reports; it does not prove you ran it.**
- **An `unsat` is about your encoding,** if the solver is sound, and an uncertified solver result says so. A passing comparator run is about the pinned statement, not the requirement. A bounded check is about its bound.
- **Defence Part B has no outcome data,** and the course's measurements describe one learner. They support no causal claim.

**The evidence behind the design.** The median effect in education trials is about 0.10 SD (Kraft 2020). Nothing below adds up to a promise; these are the reasons for the choices, with grades from the course's evidence scale (A meta-analysis or several trials; B one good similar experiment; C small, correlational or preprint; D rationale).

| Choice in the labs | What the evidence says | Grade |
|---|---|---|
| a gate before hints; credit only for unassisted work | unguarded AI help raised practice scores and lowered unaided exam scores in a high-school field experiment; gated help cut failure on unaided work in a preprint (Bastani et al. 2025; Sankaranarayanan 2026) | A−/C |
| manual mode for the step being taught | when a prover automated the steps, 48% of one cohort said they could finish "without thinking, just clicking randomly" (Keenan 2026, preprint) | C |
| a redo after a hint | location hints raised immediate success but not the unaided result a week later, in an Alloy class of 85 (Cunha et al. 2024) | B |
| broken examples kept beside fixes | error-management training in adult software courses (Keith and Frese 2008) | A/B |
| predict before you run | a question before a segment helped on the content asked, in prose and video; formal procedures are untested (St. Hilaire et al. 2023) | A |
| the stuck protocol, the two-minute first stage, minutes per stage | design precedent from the predecessor course; no outcome evidence | D |
| Prove-it | face validity only; no outcome data | C/D |

---

## 17. Where to look next

- [TOOLS.md](TOOLS.md): the pinned versions, install and verify commands, measured sizes, and the re-pin policy.
- [AGENTS.md](AGENTS.md): what your coding agent may do, and what enforces it.
- Drawers: D-14 (the wasm interface your Rust is graded through), D-15 (the devcontainer and `statespace doctor`), D-07 (the Lean error museum).

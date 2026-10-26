# LAB-4: `miniplinth check`

**Status:** draft, happy path. **Date:** 2026-10-26 (machine clock).

You build `miniplinth check`, a checker for Mini-Plinth commands. It reads a command and an invariant, emits
an SMT-LIB obligation, asks Z3, decodes a model into a state, replays it in the interpreter, and reports a
stamp with its premise witness. The first stage runs the course's reference checker, so you see the output
before you write any of your own. Stages 2 to 7 are your Rust. Stage 8 compares Z3 with cvc5. Stage 9 is an
optional proof in Lean. This lab builds capstone step S10.L3.

## 1. Setting up

- Your crate is `miniplinth-check/`. It has no dependencies, so `cargo build --release --offline` builds it.
  The Bench (the devcontainer) has Rust, cargo and cvc5 1.4.2 [X RUN-scaffold#values.cvc5], and `uv run`
  brings the pinned Z3 5.3.1 [X RUN-check-fragment#version].
- Each stage is checked by `uv run statespace check lab4.<k>`. It builds your crate, sends it requests drawn
  at grade time, puts every query through Z3 under an `rlimit` of 5000000 [D], replays every witness in the
  course's interpreter, and writes a receipt under `receipts/LAB-4.<k>/`.
- The design grades stages 2 to 7 in the tab, on your crate built as a wasm module (drawer D-14). Until the
  tab's host for LAB-4 exists, `statespace check` grades the same functions on your machine, so those
  receipts read *reported from your machine*.
- `uv run python -m statespace.labs.lab4 labs/LAB-4/fixtures/<name>.json` runs the reference checker on any
  obligation fixture; add `--cvc5` on the Bench to cross-check it. On the four obligation fixtures it proves
  Transfer and Deposit, refutes the off-by-one Withdraw and the fee with witnesses that replay, and cvc5 agrees
  with Z3 on every query {{run:RUN-lab4-reference}}.

## 2. The command format

The fixtures and every request use one JSON format, `statespace/lab4-program@1`. `src/ir.rs` reads it into
Rust types, and its header is the full grammar:

```text
Expr  {"num": n} | {"var": x} | {"add": [e, e]} | {"sub": [e, e]}
Form  {"bool": b} | {"le"|"lt"|"ge"|"gt"|"eq": [e, e]} | {"and"|"or": [f, ...]} | {"not": f}
      | {"implies": [f, f]} | {"forall": y, "body": f}
Cmd   {"skip": {}} | {"assign": x, "expr": e} | {"move": {"from": x, "to": y, "amount": e}}
      | {"seq": [c, ...]} | {"if": f, "then": c, "else": c}
      | {"guard": f, "reading": "abort" | "assert" | "assume" | "reject", "body": c}
```

A program lists its `accounts` and its `commands`, each with `params`, `requires` and a `body`, and a system
for LAB-4.6 adds `init`. A name means the innermost bound variable, else a parameter, else an account.
`move` evaluates its amount once, before it changes anything, then takes it from `from` and adds it to `to`.
`requires` is a guard under the reject reading: when it fails, the command is rejected and the state is
unchanged. A guard inside a body that fails under the reject reading leaves the state as it was at the guard,
and the command goes on.

## 3. The contract

**Vocabulary.** An account `x` is `x` before the step and `x_p` after it, a parameter `amount` is `p_amount`,
and in an unrolling the state after step i is `x_<i>`, step i's parameter is `p_amount_<i>` and step i's
command is `cmd_<i>` (its index in the system's list). The host declares every one of these; your text
declares nothing, holds one formula (or one `assert` term) and may share work through `let` and
`define-fun`. Equivalence with the reference is then a question over a fixed vocabulary. Names that start
`ref_` are the reference's.

**Named conjuncts.** `vc_emit` names its conjuncts `(! … :named …)`: `inv_pre`, `guard`, `step_<i>`,
`frame_<k>` and `neg_inv_post`. The checks and `statespace defend` find conjuncts by these names, whatever
your code looks like: the premise witness is your query without `neg_inv_post`, and LAB-4.4 deletes each
`frame_<k>` in turn.

**Exports**, pure functions over JSON, dispatched by `src/lib.rs` and served by `src/main.rs` (one request
per line on standard input, one reply per line on standard output):

| Export | Stage | Request | Reply |
|---|---|---|---|
| `wp_emit` | 4.2, 4.3 | `program`, `params`, `cmd`, `post` | `defs`, `formula` |
| `vc_emit` | 4.4 | `program`, `command`, `inv`, `route` (`forward` or `wp`) | `defs`, `assert` |
| `model_decode` | 4.5 | `program`, `command`, `model` (Z3's values as printed) | `pre`, `params`, `post` |
| `verdict_compose` | 4.5 | `mode: check`, the obligation's answer and replay, the premise's, the solver | `verdict`, `stamp`, `defeaters` |
| `bmc_emit` | 4.6 | `system`, `inv`, `k` | `defs`, `assert` |
| `verdict_compose` | 4.6 | `mode: cti`, `system`, `inv`, `n`, each command's step answer, the unrolling's answers and models | `verdict`, `claim`, `trace` |

Each of your modules (`wp.rs`, `vc.rs`, `decode.rs`, `driver.rs`) states its request and reply exactly.
`json.rs`, `ir.rs`, `smt.rs` and `main.rs` are the template's: keep them as they are.

## 4. The stages

| Stage | You write | Check | It passes when |
|---|---|---|---|
| LAB-4.1 | `reading.json` | LAB-4.c1 | your reading of the reference output holds: the verdict, the stamp, and a premise witness that replays as a successful step {{run:RUN-lab4-reference}}. The witness is checked by running it, never by matching its values |
| LAB-4.2 | `src/wp.rs`: skip, assign, move | LAB-4.c2 | on the capture fixture and 20 fresh seeds [D], aliasing and capture-prone ones included, your formula is Z3-equivalent to the reference on every seed. A failing seed shows a state where the two differ; a seed Z3 cannot decide is drawn again and counted |
| LAB-4.3 | `src/wp.rs`: seq, if, the four guard readings | LAB-4.c3 | the same on 20 fresh seeds [D] of sequences and guarded commands, plus a chain of 12 sequential `if`s [D] whose reply stays within 65536 characters [D] |
| LAB-4.4 | `src/vc.rs` | LAB-4.c4 | on 20 obligations over four accounts known to hold [D], the forward route is unsat with a premise witness that replays; each `frame_<k>` is load-bearing (deleting it turns unsat into sat with account k changing); the two routes agree |
| LAB-4.5 | `src/decode.rs` | LAB-4.c5 | on the four obligation fixtures and 10 fresh seeds [D], your verdict matches the reference, every REFUTED replays and every premise witness replays; a query with a frame deleted is reported SPURIOUS and one with its guard replaced by `false` VACUOUS |
| LAB-4.6 | `src/driver.rs` | LAB-4.c6 | on 10 invariants of the holds model and its twin [D], your verdict (`inductive`, `REACHABLE in k`, or `CTI: none within N` with N = 4 [D]) matches the reference, every REACHABLE trace replays with k ≤ N, and the claim is CL-4.4 for `inductive` and CL-4.5 for a bounded verdict |
| LAB-4.7 | `broken/`, `fixed/` | LAB-4.c7 | `broken/` reports PROVED on the fee or the off-by-one fixture, which the reference refutes; its premise status is recorded; `fixed/` reports REFUTED with a witness that replays; the template's files are the same bytes in both; and reverting the hunk tagged `MISCOMPILE` gives REFUTED again |
| LAB-4.8 | `claims/cl-4-2.*`, `claims/cl-4-4.*` (or `cl-4-5.*`) | LAB-4.c8 | Z3 and cvc5 agree unsat on your two statements and on your obligations for the transfer and deposit fixtures, with sat premises; both cards pass `claim@1`, name both solvers and their versions, pin their statements, and each `.weakened.smt2` witness is sat |
| LAB-4.9 | stretch, in Lean | LAB-4.c9 | not built yet: `statespace check lab4.9` says so and writes no receipt |

A disagreement between Z3 and cvc5 fails LAB-4.c8 and is never overridden: keep the query as a specimen
candidate. Two solvers agreeing still leaves the encoding unverified, which is why every stamp says
"uncertified" and names the open defeater.

## 5. Help: the explanation gate and the hint ladders

Every ladder opens with the explanation gate (labs/README.md section 11): write what the failing check
tested, the invariant it protects and your hypothesis, in at least 12 words, then compare with three
authored ideas and tick the ones you covered (R0, self-assessed, never credited). Work past R2 is credited
as assisted until an unseen variant passes.

| Check | R1, the concept | R2, where to look | R3, a fragment | R4, the design |
|---|---|---|---|---|
| LAB-4.c1 | A premise witness shows that the premises can hold together. | Look at the `premise` line. | none | An `unsat` on its own may be vacuous. |
| LAB-4.c2 | A weakest precondition is substitution, and ResourceOps substitute sequential updates. | Look at `subst` on `forall`, and at the order of the two updates in `move`. | `Forall(y,b) => { let y2 = fresh(y, fv(e) ∪ fv(b)); Forall(y2, subst(rename(b,y,y2), x, e)) }` | Substituting under a ∀y binds a free y of e, and renaming first prevents it. |
| LAB-4.c3 | Each guard reading has its own weakest precondition, and naming intermediate formulas keeps them small. | Look at the guard's value in the distinguishing state, and at the size of the chain's query. | `emit(define_fun(q_i, state, wp_rest)); wp(If(b,c1,c2)) = and(implies(b, app(q_i, post(c1))), implies(not(b), app(q_i, post(c2))))` | An application costs one node and a copy costs the whole formula, so twelve copies double twelve times. |
| LAB-4.c4 | A forward step states every untouched location as unchanged. | Look at the `frame_<k>` that the check deleted. | `for k in accounts \ writes(cmd) { emit(named(eq(post(k), pre(k)), frame(k))) }` | Without it `post(k)` is free, and `¬Inv′` holds at k. |
| LAB-4.c5 | A witness claims something about the semantics, so it must replay. | Compare the decoded state with the interpreter's. | `if !replays(decode(m)) { report(Spurious(VcgDefect)) }` | A model that does not replay is a step the semantics forbids, so the encoding is incomplete. |
| LAB-4.c6 | A satisfiable step is not yet a bug. | Look at the unrolling in `bmc_emit` and at `Init`. | `for k in 0..=n { if sat(bmc(k)) { return Reachable(k) } }` | Reachability makes the CTI a bug, and a strengthening makes it unreachable. |
| LAB-4.c7 | Dropping premises cannot give a proof, and over-constraining can. | Look at the guard's comparison and at the write set of the fee fixture. | `emit(lt(amount, plus(bal(from), 1))) // MISCOMPILE: source says le` | A stronger guard excludes the boundary state that overdraws. |
| LAB-4.c8 | Two solvers catch solver bugs, and encoding bugs pass through both. | Look at the hash of the query they disagree on. | none | Agreement leaves the open question of whether the encoding is right. |

The three authored ideas behind each gate are those of the R1 and R4 cells and the check's own message.

## 6. Prove-it

Predict first, with your agent closed. `statespace defend lab4` will mutate a copy of your checker and grade
your prediction with Z3 and replay; it is not built yet, so for now apply each mutation by hand to a copy of
your crate (never to `broken/`) and run the stage named.

| Mutation | Stage that sees it | Predict, then check |
|---|---|---|
| delete one `frame_<k>` | LAB-4.5 | The frame fixture changes from unsat to sat and is reported spurious, because the witness changes account k and does not replay. {{run:RUN-z3-missing-frame}} |
| delete `guard` | LAB-4.5 | Transfer becomes sat and is reported spurious, because the witness violates the guard and replay rejects the command. Deposit stays proved, since dropping its guard is sound. |
| put a capture-prone postcondition into `wp_emit` | LAB-4.2 | Equivalent if you rename the bound variable, otherwise stronger, and a spurious sat follows. {{run:RUN-z3-capture}} |
| drop the strengthening conjunct from LAB-4.6 | LAB-4.6 | An inductive verdict becomes a CTI, and the bounded search finds nothing within N. |
| emit `≤` as `<` in a guard | LAB-4.7 | The off-by-one fixture is reported proved, and its premise witness is still sat. |
| signed 64-bit mode, if you built one | your own run | Transfer is refuted through the recipient's wrap. {{run:RUN-z3-bv64}} |

## 7. What this cannot establish

A passing LAB-4.c2 to LAB-4.c6 shows that your functions agreed with the reference on the seeds drawn when
you ran them, and on nothing else: the stamp's correspondence is [T] with the number of seeds. A proof your
checker reports is about the command format's semantics, not about code that runs it (SEAM-5), for one
command at a time (SEAM-2), over unbounded integers (SEAM-1). Z3 and cvc5 agreeing tells you neither solver
was wrong on that query; it says nothing about whether the query says what you meant.

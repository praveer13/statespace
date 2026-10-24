# Plinth — Hands-on Formal Methods Learning Roadmap (the user's plan, verbatim)

A project-first curriculum: learn the theory by building a tiny checked application language.

## Purpose and learning philosophy
Goal: acquire the judgment to define application semantics, derive proof obligations, inspect counterexamples, evaluate agent-produced implementations, and determine what a proof does and does not establish. Plinth is the organizing problem, not a deadline or a commitment to a fixed architecture.

Working approach: 20% reading, 65% building/proving, 15% documenting. Keep one evolving 'plinth-lab' repository. Maintain deliberately broken examples; a clear counterexample is often more educational than a passing model. Study only the material needed to make the next artifact work.

Tools in rough order: Z3Py, Lean 4, a tiny language/interpreter, TLA+, Postgres/Rust, Soufflé or Alloy. Estimated overall arc: 9–18 months at about 6–10 hours per week, with no imposed deadline; individual stage estimates are rough, not requirements.

## Progression at a glance
1. Z3 — find a bug mathematically.
2. Lean — prove a small program correct.
3. Language semantics — invent Mini-Plinth.
4. Hoare logic and SMT — derive verification conditions.
5. TLA+ — explore concurrency and liveness.
6. PostgreSQL — implement and compare abstract semantics.
7. Datalog/SMT — check authorization and information flow.
8. TLA+ — model reliable external effects.
9. Lean/Rust — establish compiler semantic preservation.
10. Integration — assemble Plinth Core.

## Stage 1 — Find a bug mathematically
Time: 2–4 focused sessions. Theory: propositions, first-order constraints, satisfiability, counterexamples, integer arithmetic. Resource: Z3Py introductory tutorial — https://microsoft.github.io/z3guide/programming/Z3%20Python/Introduction/

Project: A transfer-counterexample lab. Model two balances and an amount. Ask Z3 for an input making the source balance negative after transfer. Add a sufficient-funds guard and show the violation becomes unsatisfiable. Extend to conservation, double capture, and a buggy refund rule.

Starter code:
```python
from z3 import *
a, b, amount = Ints('a b amount')
s = Solver()
s.add(a >= 0, b >= 0, amount > 0)
s.add(a - amount < 0)
print(s.check(), s.model())   # sat, with a counterexample
s.add(amount <= a)
print(s.check())              # unsat
```
Completion test: explain why searching for a violation means asserting the negation of the property. Interpret sat, unsat, and unknown precisely. Explain the dependence on the correctness of the encoding.

## Stage 2 — Prove a small program correct
Time: 3–6 weeks. Theory: propositions-as-types, quantification, mathematical induction, proof terms, dependent types, the trusted kernel. Start with Natural Number Game: https://adam.math.hhu.de/#/g/leanprover-community/NNG4 . Then use Theorem Proving in Lean 4, especially chapters 3–5 and 7–8: https://lean-lang.org/theorem_proving_in_lean4/

Project: A verified pure credit ledger in Lean. Start with two accounts and a transfer function over mathematical integers. Prove conservation, non-negative balances after an allowed transfer, unchanged state on rejection, and preservation under arbitrary finite sequences of allowed transfers. Then generalize to finite maps of accounts.

Completion test: proofs contain no sorry. You can explain the induction and theorem statements without reciting tactics. You understand that kernel acceptance establishes the formal proposition, not that the proposition captures business intent.

## Stage 3 — Invent Mini-Plinth as a language
Time: 4–8 weeks. Theory: abstract syntax trees, type systems, small-step/big-step semantics, progress, preservation, termination. Resources: Functional Programming in Lean (chapters 1–2, 4, 7 as needed) — https://lean-lang.org/functional_programming_in_lean/ ; Practical Foundations for Programming Languages by Robert Harper (early chapters on syntax, statics, dynamics, and safety) — https://www.cs.cmu.edu/~rwh/pfpl/

Project: Represent entities, expressions, commands, guards, and resource operations as a typed AST in Lean. Skip parsing. Define an evaluator / transition relation and explicit error semantics. Prove that well-formed successful transitions preserve a simple state invariant. Introduce an unsafe command and watch a proof obligation fail.

Toy syntax: entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.

Completion test: the language has a precise semantics independent of SQL, Rust, or UI code. You can answer the behavior of zero transfers, self-transfers, failed guards, and overflow without appealing to compiler implementation details.

## Stage 4 — Build a verification-condition generator
Time: 3–6 weeks. Theory: Hoare logic, weakest preconditions, substitution, symbolic execution, soundness of SMT encoding. Resources: Software Foundations, Programming Language Foundations (Hoare/Hoare2 chapters) — https://softwarefoundations.cis.upenn.edu/plf-current/ ; Z3 Guide — https://microsoft.github.io/z3guide/

Project: `miniplinth check`. Given a command and an invariant, derive an obligation of the form Inv(S) AND Guard(S) AND Step(S,S') AND NOT Inv(S'). Ask Z3 for satisfiability. If satisfiable, explain the violating state; if unsatisfiable, report a proved obligation for the precisely supported fragment.

Adversarial exercise: intentionally miscompile a language construct into SMT so a false theorem appears true. Locate the faulty translation. Distinguish solver correctness from verification-condition-generator correctness.

Completion test: you can derive proof obligations manually for assignments and conditionals, not just paste hand-written assertions into a solver.

## Stage 5 — Model concurrency and temporal behavior
Time: 3–6 weeks. Theory: labeled transitions, safety/liveness, temporal logic, fairness, stuttering, model checking, finite-state abstraction. Resource: Learn TLA+ — https://learntla.com/

Project: Two concurrent credit operations. Model an unsafe read-then-write transfer and obtain a double-spend counterexample trace. Make the critical transition atomic and check the invariant again. Then model Available -> Held -> Captured / Released, with timeouts, duplicated effect replies, crashes, restarts, and competing resolution paths.

Completion test: distinguish 'a hold never resolves twice' (safety) from 'a hold eventually resolves' (liveness). State what scheduler and environment fairness assumptions are needed. Recognize that bounded exploration is not an unqualified proof for arbitrary state spaces.

## Stage 6 — Connect semantics to PostgreSQL
Time: 4–8 weeks. Theory: relational algebra, NULL and bag semantics, MVCC, transaction histories, serializability, snapshot isolation, refinement relations. Resource: PostgreSQL Transaction Isolation — https://www.postgresql.org/docs/current/transaction-iso.html

Project: Compile Mini-Plinth transfers into database transactions. Execute the same randomly generated commands in your abstract interpreter and in local Postgres, comparing results. Reproduce write skew or read/modify/write races with concurrent connections. Use SERIALIZABLE and retries, tracking how they affect behavior.

Formulate R(S,D), relating an abstract state S to concrete database state D. For a successful DB transition D -> D', ask whether there is a corresponding legal abstract S -> S' and whether R(S',D') holds.

Completion test: explain what differential tests establish and what they cannot establish; identify SQL semantic mismatches such as NULL, bags, numeric overflow, and serialization failures.

## Stage 7 — Prove access-control and information-flow claims
Time: 4–8 weeks. Theory: RBAC/ABAC/ReBAC, Datalog, noninterference, observational equivalence, declassification, hyperproperties. Resources: Soufflé Datalog tutorial — https://souffle-lang.github.io/tutorial ; Alloy — https://alloytools.org/

Project: Add users, teams, roles, documents, and sharing. Define read policy: a user may see a document when they are a team member or it is explicitly shared. Generate and check the access matrix; construct pairs of states differing only in another tenant's private data and compare authorized observations.

Deliberate bug: make a shared document query reveal a field that should remain private. Explore revocation and learn why preventing future reads cannot erase information previously delivered. Distinguish enforcement of a permission check from noninterference across executions.

Completion test: formulate the observer and equivalence relation; explain which information is intentionally declassified and why a blanket 'no tenant can ever observe any change in another tenant' claim is false.

## Stage 8 — Model external effects and crash recovery
Time: 3–6 weeks. Theory: asynchronous machines, durable obligations, crash consistency, idempotency, at-least-once delivery, environment assumptions. Resources: advanced Learn TLA+ examples — https://learntla.com/ ; industrial example collection — https://hillelwayne.com/post/list-of-tla-examples/

Project: Model Command commits -> Outbox intent -> Worker dispatch -> External acceptance -> Acknowledgement. Inject a crash between every two steps, plus duplicated and delayed replies. Prove safety properties over the model. Specify which progress guarantees require eventual service recovery or external idempotency.

Add a deterministic simulator capable of replaying the same state-machine transitions with injected failures. Carefully distinguish recording intent from sending an effect; an outbox alone does not guarantee exactly-once effects at an external service.

Completion test: explain every crash window, why at-least-once delivery can duplicate calls, and when a provider's idempotency implementation is part of the trusted assumptions.

## Stage 9 — Verify a compiler transformation
Time: 6–10 weeks. Theory: forward simulation, bisimulation, observational equivalence, refinement, translation validation, trusted computing base. Resources: CompCert — https://compcert.org/ ; Lean 4 Metaprogramming, selectively — https://leanprover-community.github.io/lean4-metaprogramming-book/

Project: Translate a well-defined Mini-Plinth command subset into a simpler intermediate representation. Prove semantic preservation: each successful source step corresponds to a target execution with the same observations. Introduce an incorrect optimization and construct a failing example or broken proof.

For Postgres, design a narrow translation-validation check for generated transaction plans. Keep separate the claims that a source command preserves invariants, that a compiler preserves meaning, and that the runtime follows the target semantics.

Completion test: you can describe the refinement relation, its abstraction boundaries, and which pieces of the executable system remain unverified.

## Stage 10 — Assemble Plinth Core
Time: open-ended. Combine a tiny parsed/typed language, a reference interpreter, SMT obligations, reproducible counterexamples, a Postgres compiler, and an executable transaction runtime.

Demonstration: an agent proposes an apparently reasonable credit transfer or authorization command. The checker exhibits a violation (or shows a restricted obligation is proved). The corrected command executes on Postgres, with systematic tests and a report that distinguishes proved, model-checked, runtime-enforced, and assumed properties.

Publish the operational semantics, theorem statements, counterexamples, tool versions, and known limitations. This is a research artifact even if a broad Plinth platform never ships.

## What not to study prematurely
Defer category theory, advanced dependent type theory, proof-certificate infrastructure, Kani/Verus, full cryptographic protocol verification, mobile attestation, Cloudflare topology, generalized migrations, UI code generation, and multi-framework SDKs until a concrete proof obligation or implementation demands them.

## Learning rules
1. Read only enough theory to make the current project work; revisit the difficult theory when the artifact exposes a gap.
2. Preserve broken examples and counterexample traces alongside fixed versions.
3. Explain every guarantee as: proposition, assumptions, model, checking method, implementation correspondence, and counterexample when an assumption is weakened.
4. Don't equate Lean's proof checking with validating the intended business requirement.
5. After every 2–3 stages, publish a short technical note in your own words: the model, the surprising failure, and what changed your understanding.
6. Track progress by what you can now independently reason about, not by chapters read.

## First weekend — Project 00
Counterexample laboratory (3–5 hours):
[ ] Run Z3Py introductory example.
[ ] Find a transfer that creates a negative balance.
[ ] Add a sufficient-funds guard and eliminate the counterexample.
[ ] Introduce a buggy refund rule and find a second counterexample.
[ ] Write a README with the property, assumptions, solver answer, example model, and limitations.
Start here: https://microsoft.github.io/z3guide/programming/Z3%20Python/Introduction/ . Next: https://adam.math.hhu.de/#/g/leanprover-community/NNG4 .

## End-state of this curriculum
By completion, you should be able to (a) state a property precisely, (b) distinguish safety, liveness, and information flow, (c) derive and audit proof obligations, (d) understand proofs over language semantics, (e) model adversarial concurrent executions, (f) establish or test a refinement relation to Postgres, and (g) decide which correctness claims are justified before trusting agent-written code.

## The user's additional instructions for the course (from chat)
- Design a course of the same scope and quality as https://github.com/praveer13/kernelspace (69 lessons, 9 tracks, browser sims, Rust labs graded in-browser, persistent world, capstone, zero servers).
- Design the UI/UX, style, entire feel and mechanics specifically for this course — do not copy kernelspace.
- Round 2 (now): create a new repo; run an adversarial review and majorly improve the course; research the latest landscape; use learning and teaching methods with the highest-quality scientific evidence; make the course extremely impressive.

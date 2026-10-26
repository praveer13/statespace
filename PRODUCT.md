# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A working backend engineer studying alone: fluent in Rust, at home with systems, new to formal notation. They put in 6–10 hours a week over 9–18 months while building their own system with coding agents. kernelspace graduates are the reference learner. Most of the work happens at a laptop, with the site open beside the local `statespace-lab` repository and the real tools (Z3, Lean, TLC, PostgreSQL) running on the Bench. The Bench is authoritative. Today sessions, lessons, the Audit Desk and claim cards also have to work on a phone (the phone contract in docs/DESIGN.md §7), but the phone is secondary.

The owner studies each stage first as learner-zero. Unreviewed material is labeled "draft: first-learner pass pending".

## Product Purpose

statespace is a zero-server, interactive formal-methods course. The learner builds a tiny checked application language, Mini-Plinth, and its tools, and learns to say exactly what each proof, model check and test establishes. Its scope and end-state come from the public roadmap in research/context/roadmap.md, outcomes (a)–(g). Outcome (g) runs through every stage: decide which correctness claims are justified before trusting agent-written code.

The course succeeds when the learner can publish a report from their own claim graph that separates what was proved, model-checked, tested, enforced, configured, assumed and not covered. Each entry carries its tool versions and its limits.

## Positioning

The costly failure in formal methods is a true theorem about the wrong thing, so the course's currency is a justified claim, not points or speed. Three mechanisms set it apart from other courseware: calibration is measured through Call It, erosion of earlier assumptions is scheduled, and the review of agent work is scored on precision and recall at the Audit Desk. The course holds itself to the same rules. Its graders print their bounds, its assessments carry stamps, and its own claims sit on a public assurance page that records when they erode.

## Operating Context

- Ten stages (S1 Counterexample to S10 Assembly) plus Boot. Each new tool is met first in the browser: Z3 in the tab, Goal Replay for Lean, the Theater for TLA+, PGlite for PostgreSQL, and the Derivation Board for weakest preconditions. After that it is used for real on the Bench.
- The Bench produces receipts that the browser imports. Claims, specimens and receipts live in the learner's lab repository. The browser keeps only practice events.
- Today is a 10–12-minute session, 3–5 times a week, inside a weekly Keep block. *Set your week* plans in ranges.
- Before every first run, the learner makes a call: a verdict and a confidence (guess / think so / sure).
- The Defence signs a stage off. The Clearinghouse brings weekly incidents from S3 on.
- The learner's own agent tutors through `llms.txt`, per-lesson Markdown and the agent kit in each lab zip. The site sees nothing.

## Capabilities and Constraints

- Static hosting only. No accounts, no telemetry, no grading server. Real engines run on a separate instrument origin. Nothing asks before an engine downloads, and the loader shows its size (OD-6).
- Nothing locks. Status is computed from graded evidence and is never used as a gate. There are no points for clicks, leaderboards, daily counters, overdue counts or loss framing, and no "behind".
- Graded answers come from real checkers or from keys a checker computed. No language model grades work or writes items at run time.
- Every tool number, verdict, flag and version in copy is a recorded run (`[X RUN-id]`), a pending run (`{{run:RUN-id}}`) or a labeled design estimate (`[D]`). GATE-numbers and GATE-facts enforce this.
- The stamp vocabulary is fixed: PROVED [P], MODEL-CHECKED [M], TESTED [T], ENFORCED [E], CONFIGURED [C], ASSUMED [A], UNKNOWN [?], NOT COVERED [N], REFUTED [R]. Each stamp needs its qualifier. Requirement-fit is never [P]. An agent's claim is never stamped.
- Canonical vocabulary and IDs come from docs/spine/SPINE.md. Owner decisions OD-1 to OD-16 are in docs/DECISIONS.md.
- The visual world (palette, volume inks, type roles, covers, spines) is /DESIGN.md. Screen specs, stamps, the line language, accessibility and voice are docs/DESIGN.md. design/canvas/ is v1 history and illustrative only.
- Current state (2026-10-26): the happy path is live. All lessons, stage, lab and drawer pages render. Many cells still show "run not yet recorded". Live engines, lab checkers and the Audit Desk are follow-ups (docs/waves/W1-report.md).

## Brand Commitments

- The name is statespace, lowercase, a sibling of kernelspace and tablespace. It inherits kernelspace's learning engine and none of its look.
- Voice: precise and unhurried. Second person, present tense, short sentences, US English ("the Defence" keeps its spelling). No hype, no emoji, no exclamation marks.
- Never use a bare "correct", "verified", "safe", "proven" or "guaranteed", and no check marks. Only a stamp with its qualifier says what a check established, and "proved" always names its checker.
- A failure is a find ("Specimen mounted."). Calls read "Your call matched." / "Your call missed."
- Agents: write "the agent says", followed by quoted UNREVIEWED text. Never write "the agent proved".
- Privacy: the owner's private platform repository must never appear in this repository's design or copy, even paraphrased. Run the privacy checks before every push.

## Evidence on Hand

- Executed runs and their logs under research/evidence/ and runs/, cited by run tag. Specimens (68 planned), audit cases citing dated public incidents, and the roadmap.
- The learning-science basis with evidence grades A–D is in docs/EVIDENCE.md. Expected effects are a few tenths of a standard deviation at most.
- Absences: there are no learner testimonials, no outcome data beyond n = 1 (learner-zero), and no causal claims. Future work must not invent any of these.

## Product Principles

1. **A claim says what it is about.** Every result names its proposition, assumptions, model, method and correspondence, and the interface never rounds a bounded check up to a guarantee.
2. **Judgment before the run.** Calling a verdict first, and seeing calibration afterward, is the core skill and is never skipped.
3. **The course meets its own standard.** Its numbers are recorded runs, its assessments are stamped, and its errors erode in public.
4. **Evidence moves status; nothing coerces.** No locks, no streak pressure, ranges instead of deadlines, and errata that never deduct.
5. **The learner owns the record.** Real tools on the Bench, artifacts in their own repository, and nothing leaves their machine.

## Accessibility & Inclusion

WCAG 2.2 AA (docs/DESIGN.md §10). GATE-a11y must show 0 serious axe issues at 360, 320 and 1280 px on every screen. Text contrast is at least 4.5:1. Colour is never the only signal, so stamps differ by word, code and frame. Every instrument has a keyboard path. Manual screen-reader passes run at each wave exit, with full NVDA and VoiceOver passes at W6.

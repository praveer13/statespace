# The task tracker

**Status:** in use from W0; as of 2026-10-24 every task is `todo`. This file explains how implementation workflows and people use [tasks.yaml](tasks.yaml) and [docs/TRACKER.md](../docs/TRACKER.md): what a task record holds, how a task moves from `todo` to `done`, how a wave workflow picks tasks, how acceptance is verified, and how both files stay in step.

## 1. The two files

| File | Role | Who edits it |
|---|---|---|
| `tracker/tasks.yaml` | The source of truth: the rules, the waves with their exit criteria, and one record per task | wave workflows and the owner |
| `docs/TRACKER.md` | The human view: each wave's exit criteria and a checklist by workstream, the summary tables and the critical path | changed in the same commit as `tasks.yaml` |

Both start from spine section 13 ([docs/spine/SPINE.md](../docs/spine/SPINE.md), revision 3). Its 109 tasks (the 108 of revision 2 and W0-S13) keep their IDs, titles and scope, because PLAN.md and the other documents cite them. The tracker refines and extends that list; it never renumbers it. GATE-links (built by W0-T03) reads task IDs and each task's `implements` list from `tasks.yaml`, and fails when `docs/TRACKER.md` shows a different status from `tasks.yaml`.

## 2. The task record

| Field | Meaning |
|---|---|
| `id` | `W{n}-T{nn}`, or `W0-S{nn}` for a W0 spike. Never reused, never renumbered |
| `wave` | `W0` to `W6` |
| `title` | Spine tasks keep the spine's title verbatim |
| `workstream` | The group the task appears under in `docs/TRACKER.md` |
| `kind` | `work`, or `milestone` (section 3) |
| `origin` | `spine`, `refined`, `added` or `proposed` (section 3) |
| `parent`, `children` | The link between a milestone and the tasks that carry its work |
| `description` | Two to six sentences an agent can act on, naming the source sections to read |
| `deliverables` | Repository paths the task creates or changes; a milestone lists its own plus its children's |
| `acceptance` | A list of CI gates (`GATE-*`), recorded runs (`RUN-*`) or concrete checks; every item must pass |
| `implements` | Catalog IDs the task owns (mechanics, instruments, screens, gates, lessons, lab stages, anchors, erosions, drawers), plus the invariants, owner decisions and brief changes it serves |
| `size` | `S` (at most 3 agent-days), `M` (at most 2 weeks) or `L` (at most 6 weeks). A milestone is `S`, and `spine_size` keeps the spine's size for the whole scope |
| `model` | `opus` for complex, ambiguous or high-judgment work (architecture, hard content, proofs, graders, checkers, adversarial review); `sonnet` for clearly specified work (spine section 12, decision 24) |
| `model_reason` | One line explaining the choice |
| `depends_on` | Task IDs that must be `done` first, including the builder of any gate the acceptance names when that builder is in the same wave |
| `status` | `todo`, `in-progress`, `review` or `done` |
| `owner_review` | `true` when the owner must review the result before it counts as `done` |
| `review_h` | The owner-review estimate [D] from the spine's rubric: about 1.5 h per core lesson, 0.5 h per bridge, 2–3 h per lab, 0.3 h per audit anchor, 0.25 h per drawer, 0.5–1.5 h per spike or infrastructure decision |
| `proposed_ids` | Run IDs a stage specification proposes but the spine does not yet register; GATE-links reports their uses as pending until a spine revision registers or declines them (none remain after revision 3) |
| `adopted` | Present on proposed tasks; a workflow selects one only after the owner sets it to `true`. A task the spine later registers keeps it as the record of the owner's adoption (W0-S13) |

Fields added as work proceeds:

| Field | Added when | Content |
|---|---|---|
| `started` | the task enters `in-progress` | the date |
| `evidence` | the task enters `review` | one line per acceptance item: the CI run that showed the gate green, the run file, or the test that passed |
| `review_log` | the owner reviews | a list of `{date, hours, by}` entries, with `by` naming a role such as `owner`, never a person |
| `notes` | at any point | why a task went back a step, what a reviewer asked for, whether learner-zero has studied the content |

## 3. Kinds and origins

A **milestone** is a spine task too large for one agent session. Its children carry the work under new IDs; the milestone keeps its spine ID, title and acceptance, depends on every child, and closes after its own residual work (a stage page, production-twin cards, an integration run) and its acceptance over the whole scope. Other spine tasks, and every non-spine task, are **work**.

| Origin | Meaning | Count on 2026-10-24 |
|---|---|---|
| `spine` | a section 13 task, unchanged in scope | 108 |
| `refined` | a child of a spine task, inside the parent's scope | 114 |
| `added` | work the spine or the brief requires that section 13 assigns to no task: per-stage Defence content, most drawers, several gates, the instrument bus, the content pipeline, the world's validator plug-in, each wave's screen-reader pass and exit review, the owner-decision review and spine revision 3 | 39 |
| `proposed` | scope that a companion specification proposes beyond the spine; it waits for the owner's adoption | 2 |

## 4. The status lifecycle

`todo` → `in-progress` → `review` → `done`

| Status | Enters when | Recorded | Marker in `docs/TRACKER.md` |
|---|---|---|---|
| `todo` | the task is created | nothing | `[ ]` |
| `in-progress` | a workflow or a person takes a selectable task (section 5) | `started` | `[~]` |
| `review` | every acceptance item is verified (section 6) | `evidence` | `[=]` |
| `done` | for `owner_review: false`, at once after verification; for `owner_review: true`, after the owner's review is logged | `review_log` | `[x]` |

A task goes back from `review` to `in-progress` when verification or the owner's review finds a problem, with the reason in `notes`. `done` is final: a defect found later becomes a new task or an erratum on SCR-changes, never a silent edit, because errata flag "re-check" and never deduct. The one exception is an owner decision that changes a task's scope (W0-T09), which returns the task to `todo` with a note.

Content that has not yet been through learner-zero's study and the owner's review carries the label "draft: first-learner pass pending" (PLAN.md section 11.2). A content task can be `done` while learner-zero has yet to study it; `notes` records when learner-zero's pass happens, and the label comes off then.

## 5. How a wave workflow selects tasks

1. **Find the open wave.** It is the earliest wave whose exit task is not `done`, and it is open only if the previous wave's exit task is `done` (section 9). Each wave's exit task is listed in `waves[].exit_task`.
2. **Compute the review queue:** the sum of `review_h` over tasks with `status: review` and `owner_review: true`. While it is 10 hours or more, start no new task with `owner_review: true`; tasks with `owner_review: false` may continue.
3. **Collect the candidates:** tasks in the open wave with `status: todo`, every `depends_on` task `done`, and, for a proposed task, `adopted: true`.
4. **Order them.** Tasks on the wave's longest chain (`docs/TRACKER.md`, "Critical path") go first; then tasks that unblock the most others.
5. **Launch each with its `model`.** Give the agent the task's description, deliverables, acceptance and implements list, and the source sections the description names. The agent writes its deliverables and nothing else, and every tool fact it writes cites an executed run or a `{{run:RUN-id}}` placeholder.
6. **Close milestones after their children:** run the residual work and the acceptance over the whole scope.
7. **Close the wave with its exit task** once every other task in the wave is `done`. It files `docs/waves/W{n}-exit.md` with the exit criteria and their evidence, and the review queue at that moment.

## 6. How acceptance is verified

Every item in `acceptance` must pass on the same commit that contains the task's deliverables.

| Item | Verified by | Evidence to record |
|---|---|---|
| `GATE-*` | the gate is green in its lane: fast gates on the pull request, nightly gates on a nightly run of that commit, GATE-release on an edition tag. A gate that does not exist yet cannot pass, so the task depends on the task that builds it | the CI run that showed it green |
| `RUN-*` | `runs/RUN-id.json` exists, validates against run@1, and GATE-runs resolves every reference to it. Learner-zero runs (`RUN-lz-*`) and RUN-boot-firstsuccess are event-log exports labeled descriptive, not tool runs | the run file's path and hash |
| A planted-fixture check ("trips on a planted …") | a fixture test that makes the gate fail; the fixture stays in the suite so the gate cannot weaken silently | the fixture test |
| A property test or a named check | the test passes in CI, or the named file exists with the content the item names | the test or file |
| A spike's decision record | `docs/spikes/W0-S{nn}.md` exists, states the decision and names a fallback | the file |

An item that passes only partly leaves the task `in-progress`. A red nightly run after a task is `done` does not reopen it: it downgrades the claims it touches to "unverified since <date>" (ARCHITECTURE.md section 13.4), and a new task fixes the cause.

## 7. Owner review and the queue

The owner reviews only work whose acceptance is already verified, so review hours go to judgment, not mechanics. The checklist is the same for every artifact (PLAN.md section 11.3): the invariants I1–I10; every tool number tagged; every pedagogical claim graded; glossary terms only and no internal names in learner copy; no lock copy, loss framing or counters; "your system" wherever the learner's product appears; no private-design content. Agents cannot approve their own drafts.

The owner logs the hours spent in `review_log`. After each wave, logged hours replace the estimates in `review_h` for the next wave's planning, and GATE-budget recomputes the stage budgets from learner-zero's logged times (PLAN.md section 14.5).

## 8. Updating both files

For every status change:

1. Edit the task in `tasks.yaml`: `status`, plus `started`, `evidence`, `review_log` or `notes` as section 4 says.
2. Change the marker on the task's line in `docs/TRACKER.md`: `[ ]` todo, `[~]` in-progress, `[=]` review, `[x]` done.
3. Commit both files together; GATE-links fails if they disagree.

For example, a run-recording task waiting for the owner, and then done:

```yaml
  - id: W1-T12
    # ...
    status: review
    started: 2026-12-01
    evidence:
      - "GATE-runs green on the pull request (CI run link)"
      - "runs/RUN-z3-double-capture.json and the seven other S1 run files"
```

```yaml
    status: done
    review_log:
      - {date: 2026-12-08, hours: 0.5, by: owner}
```

Other changes:

- **Adding a task:** give it the next unused number in its wave, add it to both files, and set `origin` and, for a child, `parent`. To refine an existing task, make it a milestone and move its work into children; keep its ID, title and acceptance.
- **Declining a proposal:** delete the task from both files and from every `depends_on` list, and record the decision in docs/DECISIONS.md.
- **Registering a proposed run:** spine revision 3 (W0-T10) registered every run ID that a task listed in `proposed_ids`, and each task now names them in its description, deliverables or acceptance, so no `proposed_ids` remain. A run ID proposed later goes into its task's `proposed_ids` or into `packages/ids/proposals.json` until the spine registers it; then it moves into the task's description or acceptance.
- **Changing an estimate:** edit `review_h` and refresh the summary tables in `docs/TRACKER.md`.

## 9. The wave rule

A wave starts only when the previous wave's gates are green and the owner's review queue is under 10 hours (OD-7; spine section 13). In practice, the previous wave's exit task is `done`, which means its exit criteria were verified, and the queue is under 10 hours when the new wave opens.

When review runs behind, the order of response is fixed (PLAN.md section 13.2): first stop starting new tasks that need owner review; then, if a wave's review total outruns its window, apply the cut order of spine section 14 before the queue gate is ever relaxed. Learner-zero's study also gates three exits: W1 needs S1 studied, W2 needs S1–S2 signed off, and W5 waits for the whole arc through S10.

## 10. Change log

- **2026-10-24.** The tracker is created from spine revision 2, section 13: 263 tasks (108 spine, 114 refined, 39 added, 2 proposed); 183 opus and 80 sonnet; 104 S, 158 M and 1 L; 209.75 hours of planned owner review against the spine's 189.
- **2026-10-25.** Spine revision 3 (W0-T10): W0-S13 joins section 13 (origin `spine`), W5-T36 becomes W5-T13's child, W2-T08 moves to opus, the proposed run IDs are registered and named in their tasks, and the descriptions follow the owner's decisions and the W0 results. 263 tasks (109 spine, 115 refined, 38 added, 1 proposed); 184 opus and 79 sonnet; 104 S, 158 M and 1 L; 209.75 hours of planned owner review against the spine's 192.75.

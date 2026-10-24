// Planted-fixture tests for GATE-links: each test plants one defect in the real files and
// shows that the gate fails on it, beside a run without the defect that does not.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkLinks, parseStageList, stagesNamedIn } from '../src/check.ts'
import type { Finding, Report, SourceFile } from '../src/check.ts'
import { addRow, failed, gate, insertInStage, realInputs } from './helpers.ts'
import type { Edits } from './helpers.ts'

const STEP_HEADER = '| ID | Tier | Title | Observable objective | KCs | Built in · gate | Instruments | Generators | Specimens · claims |'
const base = gate()

/**
 * The failures of one check that the planted defect added: those that the unplanted tree does not
 * already have. A planted test therefore holds whatever state the documents are in.
 */
const known = new Set(base.failures.map((f: Finding) => `${f.check}\u0000${f.message}`))
const fresh = (report: Report, check: string, text?: string | RegExp): Finding[] => failed(report, check, text).filter((f) => !known.has(`${f.check}\u0000${f.message}`))

/** The first task of the tracker's checklist that is still todo. */
function firstChecklist(md: string): string {
  const m = /^- \[ \] (W[0-9]-[TS][0-9]+)/m.exec(md)
  if (m === null) throw new Error('no todo checklist line in docs/TRACKER.md')
  return m[1] as string
}

/** Put a task into another status in both files. */
const setStatus = (id: string, status: string, marker: string): Required<Pick<Edits, 'tasks' | 'trackerMd'>> => ({
  tasks: (t) => t.replace(new RegExp(`(  - id: ${id}\\n(?:    .*\\n|      .*\\n|\\s*\\n)*?    status: )\\S+`), `$1${status}`),
  trackerMd: (t) => t.replace(new RegExp(`^- \\[.\\] ${id} `, 'm'), `- [${marker}] ${id} `),
})

const inReadme = (text: string) => (files: SourceFile[]): SourceFile[] => files.map((f) => (f.path === 'README.md' ? { ...f, text: `${f.text}\n${text}\n` } : f))

test('the real files parse, and the committed registry is what they generate', () => {
  for (const check of ['registry', 'registry-stale', 'tasks']) {
    assert.deepEqual(failed(base, check).map((f) => f.message), [], check)
  }
})

test('files with CRLF line endings read the same as files with LF', () => {
  const crlf = (t: string): string => t.replace(/\n/g, '\r\n')
  const r = gate({ spine: crlf, evidence: crlf, tasks: crlf, trackerMd: crlf })
  assert.deepEqual(r.failures.map((f) => f.message), base.failures.map((f) => f.message))
  assert.equal(r.registry.entries.length, base.registry.entries.length)
})

// ---------------------------------------------------------------- every ID resolves

test('an ID that is not in the registry fails, with file, line and column', () => {
  const planted: [string, string][] = [
    ['lesson', 'S4.L66'], ['kc', 'KC-4.no-such-kc'], ['gate', 'GATE-nonexistent'], ['task', 'W9-T01'], ['misconception', 'dp:Q99'],
    ['lab-check', 'LAB-2.c77'], ['owner-decision', 'OD-99'], ['specimen', 'SP-9.99'], ['mechanic', 'M-no-such'], ['drawer', 'D-77'],
  ]
  const mention = (id: string): string => `mention ${id} here`
  const readme = realInputs().files.find((f) => f.path === 'README.md')?.text ?? ''
  const mutated = `${readme}\n${planted.map(([, id]) => mention(id)).join('\n')}\n`
  const report = gate({ files: (files) => files.map((f) => (f.path === 'README.md' ? { ...f, text: mutated } : f)) })
  const mutatedLines = mutated.split('\n')
  const un = fresh(report, 'unresolved')
  assert.deepEqual(un.map((f) => f.id), planted.map(([, id]) => id))
  planted.forEach(([kind, id], i) => {
    const f = un[i]
    assert.equal(f?.file, 'README.md')
    assert.equal(f?.line, mutatedLines.indexOf(mention(id)) + 1)
    assert.equal(f?.col, 9)
    assert.match(f?.message ?? '', new RegExp(`${id.replace(/[.]/g, '\\.')} is not a registered ${kind} ID`))
  })
})

test('every document that is scanned counts: docs, curriculum, labs, tracker and README', () => {
  const paths = realInputs().files.map((f) => f.path)
  for (const want of ['README.md', 'docs/spine/SPINE.md', 'docs/EVIDENCE.md', 'docs/TRACKER.md', 'curriculum/S01-counterexample.md', 'curriculum/D-drawers.md', 'labs/README.md', 'tracker/tasks.yaml', 'tracker/README.md']) {
    assert.ok(paths.includes(want), want)
  }
  assert.ok(!paths.some((p) => p.startsWith('docs/history/') || p.startsWith('design/canvas/')), 'v1 history is exempt')
})

test('misconception keys resolve against the registry generated from EVIDENCE.md', () => {
  const r = gate({ files: inReadme('dp:G4 dp:Z1 dp:S14 dp:A17 dp:Q16 dp:X9 dp:Z99') })
  assert.deepEqual(fresh(r, 'unresolved').map((f) => f.id), ['dp:Z99'])
})

// ---------------------------------------------------------------- proposals

test('a proposed ID is pending, not a failure; --strict fails on it; a stale entry fails', () => {
  const files = inReadme('The spec proposes CL-9.99 for later.')
  const proposals: Edits['proposals'] = (p) => ({ proposals: [...p.proposals, { id: 'CL-9.99', proposedBy: 'a spec' }] })
  assert.equal(fresh(gate({ files }), 'unresolved').some((f) => f.id === 'CL-9.99'), true, 'without a proposal it is a failure')
  const ok = gate({ files, proposals })
  assert.equal(fresh(ok, 'unresolved').some((f) => f.id === 'CL-9.99'), false)
  assert.deepEqual(ok.pending.filter((f) => f.id === 'CL-9.99').map((f) => f.file), ['README.md'])
  const strict = gate({ files, proposals, strict: true })
  assert.ok(failed(strict, 'proposed').some((f) => f.id === 'CL-9.99'))
  assert.equal(strict.pending.length, 0)
  // an entry that nothing uses, or that the spine registers, is a failure of its own
  assert.equal(failed(gate({ proposals }), 'proposal', 'CL-9.99 is used nowhere').length, 1)
  const registered = gate({ proposals: (p) => ({ proposals: [...p.proposals, { id: 'S1.L1' }] }), files })
  assert.equal(failed(registered, 'proposal', 'S1.L1 is registered now').length, 1)
  const notAnId = gate({ proposals: (p) => ({ proposals: [...p.proposals, { id: 'not-an-id' }] }) })
  assert.equal(failed(notAnId, 'proposal', '"not-an-id" is not an ID').length, 1)
})

test("a run ID in a task's proposed_ids is pending until the spine registers it", () => {
  const tasks = (t: string): string => t.replace(/^( {4}owner_review: .*)$/m, '$1\n    proposed_ids: ["RUN-planted-proposal"]')
  const r = gate({ tasks, files: inReadme('Cites RUN-planted-proposal.') })
  assert.equal(failed(r, 'unresolved').some((f) => f.id === 'RUN-planted-proposal'), false)
  assert.ok(r.pending.some((f) => f.id === 'RUN-planted-proposal' && f.file === 'README.md'))
})

// ---------------------------------------------------------------- ownership

const OWNED: [string, string, string][] = [
  ['mechanic', '| ID | Purpose | Evidence |', '| M-planted-mech | purpose | A | ux | events |'],
  ['screen', '| ID | Purpose | Phone | Key components |', '| SCR-planted | purpose | yes | parts |'],
  ['drawer', '| ID | Drawer | Used in, or trigger |', '| D-24 | A drawer | deferred; surfaced when a claim names it |'],
  ['instrument', '| ID | Engine and pin | Notes |', '| INS-bench-planted | an engine | notes |'],
]

for (const [kind, header, row] of OWNED) {
  test(`an unowned ${kind} in the catalog fails; an owner in tracker/tasks.yaml clears it`, () => {
    const id = /\| ([A-Za-z0-9-]+) \|/.exec(row)?.[1] ?? ''
    const spine = (t: string): string => addRow(t, header, row)
    const r = gate({ spine })
    const hits = failed(r, 'owner', id)
    assert.equal(hits.length, 1, `${id} is flagged once`)
    assert.match(hits[0]?.message ?? '', new RegExp(`${id} \\(${kind}, spine §[0-9.]+\\) is implemented by no task`))
    assert.equal(failed(base, 'owner', id).length, 0, 'not flagged before it is planted')
    const owned = gate({ spine, tasks: (t) => t.replace(/implements: \["/, `implements: ["${id}", "`) })
    assert.equal(failed(owned, 'owner', id).length, 0, 'owned once a task implements it')
  })
}

test('the owner message names the task that the spine gives an unowned ID to', () => {
  const id = 'M-planted-hint'
  const spine = (t: string): string =>
    addRow(t, '| ID | Purpose | Evidence |', `| ${id} | p | A | ux | events |`).replace(/^(\| W0-T03 \|(?:[^|]*\|){4}) ([^|]*) \|/m, `$1 $2, ${id} |`)
  const hit = failed(gate({ spine }), 'owner', id)
  assert.equal(hit.length, 1)
  assert.match(hit[0]?.message ?? '', /spine §13 gives it to W0-T03, so add it to that task's implements/)
})

test('an unowned gate is a note, not a failure; an implements entry must be exactly one ID', () => {
  const r = gate({ spine: (t) => addRow(t, '| ID | Checks | Lane |', '| GATE-planted | checks | fast |') })
  assert.equal(failed(r, 'owner', 'GATE-planted').length, 0)
  assert.ok(r.advisories.some((a) => a.id === 'GATE-planted'))
  const prose = gate({ tasks: (t) => t.replace(/implements: \["/, 'implements: ["the instrument origin (I6)", "') })
  assert.ok(failed(prose, 'tasks', 'is not exactly one ID').length >= 1)
})

test('every implements entry and every depends_on resolves (a dropped task is a dangling reference)', () => {
  const r = gate({ tasks: (t) => t.replace('depends_on: [W0-S12, W0-S11]', 'depends_on: [W0-S12, W0-S99]') })
  assert.ok(failed(r, 'unresolved').some((f) => f.id === 'W0-S99' && f.file === 'tracker/tasks.yaml'))
})

// ---------------------------------------------------------------- generated "Used in" cells

test('9.1 "Used in": a stage that no lesson row gives is a mismatch', () => {
  const r = gate({ spine: (t) => addRow(t, '| ID | Engine and pin | Used in |', '| INS-planted | an engine | S9 | limits |') })
  const hit = failed(r, 'used-in', 'INS-planted')
  assert.equal(hit.length, 1)
  assert.match(hit[0]?.message ?? '', /says "S9", but its lesson rows \(the Instruments column\) give no stage: it lists S9, which its lesson rows/)
})

test('9.1 "Used in": a cell that is neither a stage list nor an exempt phrase fails; "all labs" is exempt', () => {
  const plant = (cell: string) => gate({ spine: (t) => addRow(t, '| ID | Engine and pin | Used in |', `| INS-planted-cell | an engine | ${cell} | limits |`) })
  assert.match(fresh(plant('somewhere'), 'used-in', 'INS-planted-cell')[0]?.message ?? '', /"somewhere" is neither a stage list nor an exempt cell/)
  assert.deepEqual(fresh(plant('all labs'), 'used-in', 'INS-planted-cell'), [])
})

test('9.1 "Used in": a lesson row that uses an instrument in another stage is a mismatch', () => {
  // INS-derivation is declared as S4 only; a bridge lesson of S5 now uses it.
  const row = '| S5.L10 | bridge | Planted | o | KC-5.holds-lifecycle | INS-derivation | GEN-call-it | — |'
  const s5 = gate({ spine: (t) => insertInStage(t, '3.5', row) })
  const hit = fresh(s5, 'used-in', 'INS-derivation')
  assert.equal(hit.length, 1)
  assert.match(hit[0]?.message ?? '', /§9\.1 "Used in" of INS-derivation says "S4", but its lesson rows .* give S4, S5: it omits S5/)
})

test('9.1 "Used in": a capstone step counts, and Lane A counts the labs that the step is built in', () => {
  // A new step that names INS-derivation makes S10 a stage of it; INS-lane-a's S3 comes from LAB-3.
  const step = '| S10.L9 | step | Planted | o | (S4 KCs) | LAB-4.5, after S4 · gate | INS-derivation | — | — |'
  const r = gate({ spine: (t) => addRow(t, STEP_HEADER, step) })
  assert.match(fresh(r, 'used-in', 'INS-derivation')[0]?.message ?? '', /omits S10/)
})

test('8.3 "Stages": a generator used in another stage is a mismatch; the exempt cells are exempt', () => {
  const row = '| S3.L10 | bridge | Planted | o | KC-3.abstract-syntax | INS-interp | GEN-wp-it | — |'
  const r = gate({ spine: (t) => insertInStage(t, '3.3', row) })
  assert.match(fresh(r, 'used-in', 'GEN-wp-it')[0]?.message ?? '', /§8\.3 "Stages" of GEN-wp-it says "S4", .* it omits S3/)
  // "all", GEN-defend's S1–S10 and the "interleaved to S9" tail are not lesson-derived: parseStageList and the fixture below read them.
})

test('3.12 "Used in": a stage spec that references a drawer the cell omits is a mismatch', () => {
  const planted = (t: string): string => t.replace(/^(\*\*Audit anchors\.\*\* AUD-3\.1.*)$/m, '$1\n\n**Sibling bridges.** the prerequisite card D-12.')
  const r = gate({ spine: planted })
  assert.match(fresh(r, 'used-in', 'D-12')[0]?.message ?? '', /§3\.12 "Used in" of D-12 says "S8\.L3", but the stage specs .* give S3, S8: it omits S3/)
  const extra = gate({ spine: (t) => t.replace(/^(\| D-12 \|[^|]*\| )S8\.L3 \|/m, '$1S8.L3, S9.L1 |') })
  assert.match(fresh(extra, 'used-in', 'D-12')[0]?.message ?? '', /lists S9, which the stage specs/)
})

test('parseStageList and stagesNamedIn read the cells of the spine', () => {
  assert.deepEqual([...(parseStageList('S1–S7, S10') ?? [])], ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S10'])
  assert.deepEqual([...(parseStageList('S3 (LAB-3), S4, S6, S8–S10') ?? [])], ['S3', 'S4', 'S6', 'S8', 'S9', 'S10'])
  assert.deepEqual([...(parseStageList('S1; Today items whose witnesses it covers') ?? [])], ['S1'])
  assert.deepEqual([...(parseStageList('S4, S5, interleaved to S9') ?? [])], ['S4', 'S5'])
  assert.equal(parseStageList('all labs'), null)
  assert.equal(parseStageList('all'), null)
  assert.deepEqual([...stagesNamedIn('Boot, S1.L1')], ['S1'])
  assert.deepEqual([...stagesNamedIn("S2; LAB-3.c4–LAB-3.c5's rungs")], ['S2', 'S3'])
  assert.deepEqual([...stagesNamedIn('LAB-3, LAB-4, LAB-10.2–LAB-10.3')], ['S3', 'S4', 'S10'])
})

// ---------------------------------------------------------------- counts, and [step] IDs are not lessons

const countOf = (key: string): number => base.registry.counts[key] ?? Number.NaN

test('a [step] row changes the step count and leaves the lesson count alone', () => {
  const step = '| S10.L8 | step | Planted | o | (S3 KCs) | LAB-3.8, after S3 · gate | INS-lane-a | — | — |'
  const r = gate({ spine: (t) => addRow(t, STEP_HEADER, step) })
  assert.equal(r.registry.counts.lessons, countOf('lessons'), 'the registry does not count a step as a lesson')
  assert.equal(r.registry.counts.steps, countOf('steps') + 1)
  const msgs = fresh(r, 'counts').map((f) => f.message)
  assert.ok(msgs.some((m) => /says \d+ capstone steps, but the tables give \d+/.test(m)), 'the step count is what disagrees')
  assert.ok(!msgs.some((m) => /lessons/.test(m)), 'no lesson count disagrees')
})

test('a spine that counts the steps among its lessons fails the gate', () => {
  const n = countOf('lessons')
  const steps = countOf('steps')
  const r = gate({ spine: (t) => t.replace(new RegExp(`\\b${n} lessons \\(`), `${n + steps} lessons (`) })
  const hits = fresh(r, 'counts', 'lessons (core and bridge; Boot and the [step] capstone steps are not lessons)')
  assert.ok(hits.length >= 1)
  assert.match(hits[0]?.message ?? '', new RegExp(`says ${n + steps} lessons .*but the tables give ${n}`))
})

test('a lesson added to a table disagrees with the stated counts', () => {
  const row = '| S2.L11 | bridge | Planted | o | KC-2.proof-reading | INS-goal-replay | GEN-proof-structure | — |'
  const r = gate({ spine: (t) => insertInStage(t, '3.2', row) })
  const msgs = fresh(r, 'counts').map((f) => f.message)
  assert.ok(msgs.some((m) => new RegExp(`says ${countOf('lessons')} lessons .*but the tables give ${countOf('lessons') + 1}`).test(m)))
  assert.ok(msgs.some((m) => new RegExp(`says ${countOf('bridge')} bridge, but the tables give ${countOf('bridge') + 1}`).test(m)))
})

test('a count paragraph or clause that went missing is a finding, so a reworded sentence is not silently unchecked', () => {
  const noPara = gate({ spine: (t) => t.replace('**Counts.** ', '**Totals.** ') })
  assert.equal(failed(noPara, 'counts', 'the paragraph that starts "**Counts.**" is missing').length, 1)
  const noClause = gate({ spine: (t) => t.replace(/(\*\*Counts\.\*\*[^\n]*?)(\d+) specimens/, '$1$2 specimen records') })
  assert.ok(failed(noClause, 'counts', 'specimens is unchecked').length >= 1)
})

// ---------------------------------------------------------------- docs/TRACKER.md against tracker/tasks.yaml

test('a status in docs/TRACKER.md that differs from tasks.yaml fails', () => {
  const id = firstChecklist(realInputs().trackerMd)
  const r = gate({ trackerMd: (t) => t.replace(new RegExp(`^- \\[ \\] ${id} `, 'm'), `- [x] ${id} `) })
  const hit = fresh(r, 'tracker')
  assert.equal(hit.length, 1)
  assert.equal(hit[0]?.file, 'docs/TRACKER.md')
  assert.match(hit[0]?.message ?? '', new RegExp(`${id} is \\[x\\] \\(done\\) here but todo in tracker/tasks\\.yaml \\(expected \\[ \\]\\)`))
})

test('the other direction: tasks.yaml moves and the checklist does not', () => {
  const id = firstChecklist(realInputs().trackerMd)
  const r = gate({ tasks: setStatus(id, 'review', ' ').tasks })
  assert.match(fresh(r, 'tracker')[0]?.message ?? '', new RegExp(`${id} is \\[ \\] \\(todo\\) here but review in tracker/tasks\\.yaml \\(expected \\[=\\]\\)`))
})

test('the four statuses map to the four markers, and a consistent change in both files passes', () => {
  const id = firstChecklist(realInputs().trackerMd)
  const cases: [string, string][] = [['in-progress', '~'], ['review', '='], ['done', 'x'], ['todo', ' ']]
  for (const [status, marker] of cases) {
    const edits = setStatus(id, status, marker)
    const r = gate(edits)
    assert.deepEqual(fresh(r, 'tracker').map((f) => f.message), [], `${status} ↔ [${marker}]`)
    assert.deepEqual(fresh(r, 'tasks').map((f) => f.message), [], `${status} is a status of tasks.yaml`)
  }
  // and the edit really moves the status in tasks.yaml
  const moved = setStatus(id, 'done', 'x').tasks(realInputs().tasks)
  assert.match(moved, new RegExp(`- id: ${id}[\\s\\S]*?status: done`))
})

test('a task missing from the checklist, listed twice, or unknown to tasks.yaml fails', () => {
  const id = firstChecklist(realInputs().trackerMd)
  const gone = gate({ trackerMd: (t) => t.replace(new RegExp(`^- \\[ \\] ${id} .*\\n`, 'm'), '') })
  assert.match(fresh(gone, 'tracker')[0]?.message ?? '', new RegExp(`${id} \\(todo\\) is in tracker/tasks\\.yaml but not listed here`))
  const twice = gate({ trackerMd: (t) => `${t}\n- [ ] ${id} · again · S · sonnet · —\n` })
  assert.match(fresh(twice, 'tracker')[0]?.message ?? '', new RegExp(`${id} is listed twice`))
  const unknown = gate({ trackerMd: (t) => `${t}\n- [ ] W0-T98 · invented · S · sonnet · —\n` })
  assert.equal(failed(unknown, 'tracker', 'W0-T98 is listed here but has no record in tracker/tasks.yaml').length, 1)
})

test('a task of spine section 13 that tasks.yaml dropped, and a status it does not allow, fail', () => {
  const dropped = gate({ tasks: (t) => t.replace(/^ {2}- id: W0-T03$/m, '  - id: W0-T97') })
  assert.equal(failed(dropped, 'tasks', 'spine §13 task W0-T03 has no record here').length, 1)
  const bad = gate({ tasks: (t) => t.replace(/^( {2}- id: W0-T03\n(?: {4}.*\n| {6}.*\n)*? {4}status: )\S+/m, '$1finished') })
  assert.equal(failed(bad, 'tasks', 'has status "finished"').length, 1)
})

test('a tasks.yaml that does not parse is one finding, not a cascade', () => {
  const r = gate({ tasks: () => 'schema: x\n  indented: wrongly\n' })
  assert.equal(failed(r, 'tasks', 'tasks.yaml does not parse').length, 1)
  assert.deepEqual(fresh(r, 'owner'), [])
  assert.deepEqual(fresh(r, 'tracker'), [])
  assert.deepEqual(fresh(r, 'unresolved'), [])
})

// ---------------------------------------------------------------- the committed registry

test('a spine edit without regenerating packages/ids is a stale registry', () => {
  const r = gate({ spine: (t) => addRow(t, '| ID | Purpose | Evidence |', '| M-planted-stale | p | A | ux | events |') })
  const stale = failed(r, 'registry-stale')
  assert.deepEqual(stale.map((f) => f.file), ['packages/ids/src/index.ts', 'packages/ids/src/registry.json'])
  const json = stale.find((f) => f.file.endsWith('registry.json'))
  assert.match(json?.message ?? '', /\+1 -0 ~0 IDs; new: M-planted-stale\); run `node scripts\/build-ids\.mjs`/)
})

test('a missing committed registry fails', () => {
  const r = checkLinks({ ...realInputs(), registryJson: null, registryTs: null })
  assert.deepEqual(failed(r, 'registry-stale').map((f) => f.message), ['missing; run `node scripts/build-ids.mjs`', 'missing; run `node scripts/build-ids.mjs`'])
})

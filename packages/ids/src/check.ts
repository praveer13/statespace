// GATE-links: every ID in the documents resolves against the registry generated from the
// spine, every catalog ID is owned, the generated "Used in" cells match their sources, the
// counts the spine states match the registry, and docs/TRACKER.md shows tasks.yaml's
// statuses. Pure: takes file contents, returns findings. scripts/verify-links.mjs does the I/O.

import { allIds, kindOfId, scanLine } from './grammar.ts'
import { scanBlocks } from './markdown.ts'
import { buildRegistry, diffRegistries, EVIDENCE_PATH, generateTypes, serializeRegistry, SPINE_PATH } from './registry.ts'
import type { Counts, Registry } from './registry.ts'
import { stageOfRef } from './spine.ts'
import { compareTracker, parseTasks, parseTrackerMarkdown } from './tracker.ts'

export const TASKS_PATH = 'tracker/tasks.yaml'
export const TRACKER_PATH = 'docs/TRACKER.md'
export const REGISTRY_PATH = 'packages/ids/src/registry.json'
export const TYPES_PATH = 'packages/ids/src/index.ts'
export const PROPOSALS_PATH = 'packages/ids/proposals.json'

/** Catalog kinds whose every ID must be implemented by a task (spine 11.2: sections 7, 9.1, 10.1 and 3.12; 9.2 is the Bench's half of the 23 instruments). */
export const OWNED_KINDS: readonly string[] = ['mechanic', 'instrument', 'screen', 'drawer']

/** "Used in" cells that are not derived from lesson rows (spine 9.1 and 8.3). */
const EXEMPT_CELL = /^all( labs)?$/
/** GEN-defend's S1–S10 is Part B of every Defence, not lesson-derived (spine 8.3). */
const EXEMPT_STAGE_CELLS: ReadonlySet<string> = new Set(['GEN-defend'])

export interface Finding {
  check: string
  file: string
  line: number | null
  col: number | null
  message: string
  id?: string
}

export interface SourceFile {
  path: string
  text: string
}

export interface Proposal {
  id: string
  proposedBy?: string
  note?: string
}

export interface Inputs {
  /** text of docs/spine/SPINE.md */
  spine: string
  /** text of docs/EVIDENCE.md */
  evidence: string
  /** text of tracker/tasks.yaml */
  tasks: string
  /** text of docs/TRACKER.md */
  trackerMd: string
  /** every file to scan for IDs: repo-relative paths with "/" */
  files: SourceFile[]
  /** the committed packages/ids/src/registry.json, or null */
  registryJson: string | null
  /** the committed packages/ids/src/index.ts, or null */
  registryTs: string | null
  /** packages/ids/proposals.json, or null */
  proposals: { proposals?: Proposal[] } | null
  /** treat pending proposals as failures */
  strict?: boolean
}

export interface Report {
  failures: Finding[]
  /** proposed IDs that the spine does not register yet; not failures unless strict */
  pending: Finding[]
  advisories: Finding[]
  registry: Registry
  stats: { files: number; tokens: number; distinctIds: number; entries: number; tasks: number }
}

/** The first line that starts the table row of an ID. */
function rowLine(text: string, id: string): number | null {
  const i = text.split('\n').findIndex((l) => l.startsWith(`| ${id} `))
  return i < 0 ? null : i + 1
}

const stageNum = (s: string): number => Number(s.slice(1))
const sortStages = (set: Iterable<string>): string[] => [...set].sort((a, b) => stageNum(a) - stageNum(b))

/**
 * The leading comma-separated stage list of a "Used in" cell: `S1–S7, S10`, with an
 * optional parenthetical after an item (`S3 (LAB-3)`); whatever follows is prose.
 * Returns null when the cell does not start with a stage list.
 */
export function parseStageList(cell: string): Set<string> | null {
  const item = '(S([0-9]+)(?:–S([0-9]+))?)(?:\\s*\\([^)]*\\))?'
  const head = new RegExp(`^${item}(?:,\\s*${item})*`).exec(cell.trim())
  if (head === null) return null
  const stages = new Set<string>()
  for (const m of head[0].matchAll(new RegExp(item, 'g'))) {
    const lo = Number(m[2])
    const hi = m[3] === undefined ? lo : Number(m[3])
    for (let n = lo; n <= hi; n++) stages.add(`S${n}`)
  }
  return stages
}

/**
 * The stages that a drawer's "Used in" cell names: stage, lesson and lab references (a lab
 * belongs to its stage), and Boot (S1).
 */
export function stagesNamedIn(cell: string): Set<string> {
  const out = new Set<string>()
  if (/\bBoot\b/.test(cell)) out.add('S1')
  for (const t of scanLine(cell)) {
    if (t.kind === 'stage') out.add(t.id)
    else {
      const s = stageOfRef(t.id)
      if (s !== null) out.add(s)
    }
  }
  return out
}

type Claim = [RegExp, string[]]

/**
 * Claims about counts in the two paragraphs where the spine states them. Each regex reads
 * numbers that the registry also computes; a paragraph or a clause that has gone missing
 * is itself a finding, so a reworded sentence cannot silently stop being checked.
 */
const COUNT_PARAGRAPHS: { section: string; start: string; claims: Claim[] }[] = [
  {
    section: '3.11',
    start: '**Counts.**',
    claims: [
      [/(\d+) lessons \((\d+) core, (\d+) bridge\)/, ['lessons', 'core', 'bridge']],
      [/(\d+) capstone steps/, ['steps']],
      [/(\d+) labs with (\d+) stages/, ['labs', 'labStages']],
      [/LAB-1–LAB-9 have (\d+) \((\d+) planned and (\d+) `\[stretch\]`/, ['labStagesInLab1To9', 'plannedInLab1To9', 'stretchInLab1To9']],
      [/LAB-10 has (\d+) \((\d+) planned, (\d+) `\[stretch\]`\)/, ['labStagesInLab10', 'plannedInLab10', 'stretchInLab10']],
      [/(\d+) KCs \((\d+) threshold\)/, ['kcs', 'thresholdKcs']],
      [/(\d+) specimens/, ['specimens']],
      [/(\d+) claim templates/, ['claimTemplates']],
      [/(\d+) seams/, ['seams']],
      [/(\d+) erosion events/, ['erosions']],
      [/(\d+) audit anchors/, ['anchors']],
      [/(\d+) just-in-time and (\d+) deferred drawers/, ['justInTimeDrawers', 'deferredDrawers']],
    ],
  },
  {
    section: '15',
    start: '**Counts after revision.**',
    claims: [
      [/(\d+) lessons \((\d+) core, (\d+) bridge\)/, ['lessons', 'core', 'bridge']],
      [/(\d+) capstone steps/, ['steps']],
      [/(\d+) labs with (\d+) stages \((\d+) planned, (\d+) `\[stretch\]`\)/, ['labs', 'labStages', 'plannedLabStages', 'stretchLabStages']],
      [/(\d+) KCs \((\d+) threshold\)/, ['kcs', 'thresholdKcs']],
      [/(\d+) specimens/, ['specimens']],
      [/(\d+) claim templates/, ['claimTemplates']],
      [/(\d+) seams/, ['seams']],
      [/(\d+) erosion events/, ['erosions']],
      [/(\d+) audit anchors/, ['anchors']],
      [/(\d+) generator families \((\d+) templates\)/, ['generators', 'templates']],
      [/(\d+) mechanics/, ['mechanics']],
      [/(\d+) instruments \((\d+) in the tab, (\d+) on the Bench\)/, ['instruments', 'tabInstruments', 'benchInstruments']],
      [/(\d+) screens/, ['screens']],
      [/(\d+) gates/, ['gates']],
      [/(\d+) drawers \((\d+) just-in-time; (\d+) deferred\)/, ['drawers', 'justInTimeDrawers', 'deferredDrawers']],
      [/(\d+) executed runs and (\d+) run IDs to record/, ['executedRuns', 'runsToRecord']],
      [
        /(\d+) tasks \(W0 (\d+), W1 (\d+), W2 (\d+), W3 (\d+), W4 (\d+), W5 (\d+), W6 (\d+)\)/,
        ['spineTasks', 'spineTasksW0', 'spineTasksW1', 'spineTasksW2', 'spineTasksW3', 'spineTasksW4', 'spineTasksW5', 'spineTasksW6'],
      ],
      [/(\d+) owner decisions/, ['ownerDecisions']],
    ],
  },
]

/** What a count is called in a message. */
const COUNT_LABEL: Readonly<Record<string, string>> = {
  lessons: 'lessons (core and bridge; Boot and the [step] capstone steps are not lessons)',
  steps: 'capstone steps',
  labStages: 'lab stages',
  labStagesInLab1To9: 'stages in LAB-1 to LAB-9',
  plannedInLab1To9: 'planned stages in LAB-1 to LAB-9',
  stretchInLab1To9: '[stretch] stages in LAB-1 to LAB-9',
  labStagesInLab10: 'stages in LAB-10',
  plannedInLab10: 'planned stages in LAB-10',
  stretchInLab10: '[stretch] stages in LAB-10',
  plannedLabStages: 'planned lab stages',
  stretchLabStages: '[stretch] lab stages',
  thresholdKcs: 'threshold KCs',
  claimTemplates: 'claim templates',
  erosions: 'erosion events',
  justInTimeDrawers: 'just-in-time drawers',
  deferredDrawers: 'deferred drawers',
  tabInstruments: 'tab instruments',
  benchInstruments: 'Bench instruments',
  generators: 'generator families',
  runsToRecord: 'run IDs to record',
  executedRuns: 'executed runs',
  spineTasks: 'tasks',
  ownerDecisions: 'owner decisions',
}

function checkCounts(spine: string, counts: Counts): { line: number | null; message: string }[] {
  const out: { line: number | null; message: string }[] = []
  const blocks = scanBlocks(spine)
  for (const p of COUNT_PARAGRAPHS) {
    const b = blocks.find((x) => x.type === 'text' && x.section === p.section && x.text.startsWith(p.start))
    if (b === undefined || b.type !== 'text') {
      out.push({ line: null, message: `spine §${p.section}: the paragraph that starts "${p.start}" is missing, so its counts are unchecked` })
      continue
    }
    for (const [re, keys] of p.claims) {
      const m = re.exec(b.text)
      if (m === null) {
        out.push({ line: b.line, message: `spine §${p.section}: no clause matches ${String(re)}, so ${keys.join(', ')} is unchecked (reword the sentence or update the gate)` })
        continue
      }
      keys.forEach((key, i) => {
        const stated = Number(m[i + 1])
        const actual = counts[key]
        if (stated !== actual) {
          out.push({ line: b.line, message: `spine §${p.section} says ${stated} ${COUNT_LABEL[key] ?? key}, but the tables give ${actual}` })
        }
      })
    }
  }
  return out
}

export function checkLinks(inputs: Inputs): Report {
  const failures: Finding[] = []
  const pending: Finding[] = []
  const advisories: Finding[] = []
  const add = (into: Finding[], check: string, file: string, line: number | null, message: string, x: { col?: number | null; id?: string } = {}): void => {
    const f: Finding = { check, file, line, col: x.col ?? null, message }
    if (x.id !== undefined) f.id = x.id
    into.push(f)
  }
  const fail = (check: string, file: string, line: number | null, message: string, x: { col?: number | null; id?: string } = {}): void => {
    add(failures, check, file, line, message, x)
  }

  // 1. The registry, generated from the spine and EVIDENCE.md.
  const { registry, problems } = buildRegistry(inputs.spine, inputs.evidence)
  for (const p of problems) fail('registry', p.file, p.line, p.message)
  const byId = new Map(registry.entries.map((e) => [e.id, e]))

  // 2. The committed registry and types are what the sources generate.
  const generated: [string, string | null, string][] = [
    [REGISTRY_PATH, inputs.registryJson, serializeRegistry(registry)],
    [TYPES_PATH, inputs.registryTs, generateTypes(registry)],
  ]
  for (const [path, committed, want] of generated) {
    if (committed === null) {
      fail('registry-stale', path, null, 'missing; run `node scripts/build-ids.mjs`')
    } else if (committed !== want) {
      let detail = ''
      if (path === REGISTRY_PATH) {
        try {
          const d = diffRegistries(JSON.parse(committed) as Registry, registry)
          const list = (xs: string[]): string => xs.slice(0, 4).join(', ') + (xs.length > 4 ? ', ...' : '')
          const changed = [...d.retyped, ...d.changed]
          detail =
            ` (the sources differ from it by +${d.added.length} -${d.removed.length} ~${changed.length} IDs` +
            `${d.added.length ? `; new: ${list(d.added)}` : ''}${d.removed.length ? `; gone: ${list(d.removed)}` : ''}` +
            `${changed.length ? `; changed: ${list(changed)}` : ''})`
        } catch {
          detail = ' (it does not parse as JSON)'
        }
      }
      fail('registry-stale', path, null, `out of date with ${SPINE_PATH} and ${EVIDENCE_PATH}${detail}; run \`node scripts/build-ids.mjs\``)
    }
  }

  // 3. tracker/tasks.yaml extends spine section 13 without renumbering it.
  const parsed = parseTasks(inputs.tasks)
  for (const p of parsed.problems) fail('tasks', TASKS_PATH, p.line, p.message)
  const tasks = parsed.tasks
  // When tasks.yaml does not parse, its own failure is the finding: the checks that read its tasks would only repeat it.
  const tasksRead = tasks.length > 0
  const spineTasks = registry.entries.filter((e) => e.kind === 'task')
  const taskIds = new Set(tasksRead ? tasks.map((t) => t.id) : spineTasks.map((t) => t.id))
  if (tasksRead) {
    for (const t of spineTasks) {
      if (!taskIds.has(t.id)) fail('tasks', TASKS_PATH, null, `spine §13 task ${t.id} has no record here (task IDs are never renumbered or dropped)`, { id: t.id })
    }
  }

  // 4. Every ID in the documents resolves. A proposed ID (a task's proposed_ids, or
  //    packages/ids/proposals.json) that the spine does not register yet is pending.
  const proposed = new Map<string, string>()
  for (const p of inputs.proposals?.proposals ?? []) {
    if (kindOfId(p.id) === null) fail('proposal', PROPOSALS_PATH, null, `"${p.id}" is not an ID`)
    proposed.set(p.id, PROPOSALS_PATH)
  }
  for (const t of tasks) for (const id of t.proposedIds) if (!proposed.has(id)) proposed.set(id, `${TASKS_PATH} (${t.id})`)
  const usedProposals = new Set<string>()
  let tokens = 0
  const distinct = new Set<string>()
  for (const f of inputs.files) {
    const lines = f.text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      for (const t of scanLine(lines[i] as string, i + 1)) {
        tokens++
        distinct.add(t.id)
        if (byId.has(t.id) || taskIds.has(t.id)) continue
        if (!tasksRead && t.kind === 'task') continue // the tasks are unknown: tasks.yaml's own failure stands for them
        if (proposed.has(t.id)) {
          usedProposals.add(t.id)
          add(pending, 'pending', f.path, t.line, `${t.id} is proposed, not registered in the spine yet (${proposed.get(t.id)})`, { col: t.col, id: t.id })
        } else {
          fail('unresolved', f.path, t.line, `${t.id} is not a registered ${t.kind} ID`, { col: t.col, id: t.id })
        }
      }
    }
  }

  // 5. Ownership: each task's implements names exactly one ID each, and every catalog ID of
  //    sections 7, 9.1, 9.2, 10.1 and 3.12 is implemented by a task.
  const owners = new Map<string, string[]>()
  for (const t of tasks) {
    for (const entry of t.implements) {
      const ids = allIds(entry)
      if (ids.length !== 1 || ids[0] !== entry.trim()) fail('tasks', TASKS_PATH, t.line, `task ${t.id}: implements entry "${entry}" is not exactly one ID`)
      for (const id of ids) owners.set(id, [...(owners.get(id) ?? []), t.id])
    }
  }
  for (const e of tasksRead ? registry.entries : []) {
    if (owners.has(e.id)) continue
    if (OWNED_KINDS.includes(e.kind)) {
      const spineOwners = spineTasks.filter((t) => t.implements?.includes(e.id)).map((t) => t.id)
      const hint = spineOwners.length ? `; spine §13 gives it to ${spineOwners.join(', ')}, so add it to that task's implements` : ''
      fail('owner', TASKS_PATH, null, `${e.id} (${e.kind}, spine §${e.section}) is implemented by no task${hint}`, { id: e.id })
    } else if (e.kind === 'gate') {
      add(advisories, 'owner', TASKS_PATH, null, `${e.id} is implemented by no task (the ownership rule covers sections 7, 9.1, 10.1 and 3.12; gates are not checked)`, { id: e.id })
    }
  }

  // 6. "Used in" cells are generated from their sources and must match them.
  for (const e of registry.entries) {
    const derived = new Set(e.stages ?? [])
    let declared: Set<string> | null
    let what: string
    let source: string
    if (e.kind === 'instrument' && e.section === '9.1') {
      what = `§9.1 "Used in" of ${e.id}`
      source = 'its lesson rows (the Instruments column)'
      declared = parseStageList(e.usedIn ?? '')
    } else if (e.kind === 'generator' && !EXEMPT_STAGE_CELLS.has(e.id)) {
      what = `§8.3 "Stages" of ${e.id}`
      source = 'its lesson rows (the Generators column)'
      declared = parseStageList(e.usedIn ?? '')
    } else if (e.kind === 'drawer' && e.deferred === false) {
      what = `§3.12 "Used in" of ${e.id}`
      source = 'the stage specs (their Drawers and Sibling bridges paragraphs)'
      declared = stagesNamedIn(e.usedIn ?? '')
    } else {
      continue
    }
    const line = rowLine(inputs.spine, e.id)
    if (declared === null) {
      if (!EXEMPT_CELL.test((e.usedIn ?? '').trim())) {
        fail('used-in', SPINE_PATH, line, `${what}: "${e.usedIn}" is neither a stage list nor an exempt cell`, { id: e.id })
      }
      continue
    }
    const have = declared
    const missing = sortStages([...derived].filter((s) => !have.has(s)))
    const extra = sortStages([...have].filter((s) => !derived.has(s)))
    if (missing.length || extra.length) {
      const parts: string[] = []
      if (missing.length) parts.push(`omits ${missing.join(', ')}`)
      if (extra.length) parts.push(`lists ${extra.join(', ')}, which ${source} do not give`)
      fail('used-in', SPINE_PATH, line, `${what} says "${e.usedIn}", but ${source} give ${sortStages(derived).join(', ') || 'no stage'}: it ${parts.join(' and ')}`, { id: e.id })
    }
  }
  // Advisory: a lab stage that names Lane A beside a Used in cell that omits its stage.
  const laneA = byId.get('INS-lane-a')
  if (laneA !== undefined) {
    const have = new Set(laneA.stages ?? [])
    for (const e of registry.entries) {
      const stage = stageOfRef(e.id)
      if (e.kind === 'lab-stage' && /\bLane A\b/.test(e.title ?? '') && stage !== null && !have.has(stage)) {
        add(advisories, 'used-in', SPINE_PATH, rowLine(inputs.spine, e.id), `${e.id} names Lane A, but §9.1 does not list ${stage} for INS-lane-a (no lesson row or capstone step of ${stage} names it)`, { id: e.id })
      }
    }
  }

  // 7. The counts the spine states in prose are the counts of its tables ([step] IDs are not lessons).
  for (const c of checkCounts(inputs.spine, registry.counts)) fail('counts', SPINE_PATH, c.line, c.message)

  // 8. docs/TRACKER.md lists every task with its tasks.yaml status.
  if (tasksRead) for (const c of compareTracker(tasks, parseTrackerMarkdown(inputs.trackerMd))) fail('tracker', TRACKER_PATH, c.line, c.message)

  // 9. Proposals do not rot: an entry goes when the spine registers its ID or nothing uses it.
  for (const p of inputs.proposals?.proposals ?? []) {
    if (byId.has(p.id) || taskIds.has(p.id)) fail('proposal', PROPOSALS_PATH, null, `${p.id} is registered now; delete its entry`, { id: p.id })
    else if (!usedProposals.has(p.id)) fail('proposal', PROPOSALS_PATH, null, `${p.id} is used nowhere that is scanned; delete its entry`, { id: p.id })
  }
  const registered: string[] = []
  for (const t of tasks) for (const id of t.proposedIds) if (byId.has(id)) registered.push(`${id} (${t.id})`)
  if (registered.length > 0) {
    const shown = registered.slice(0, 4).join(', ') + (registered.length > 4 ? ', ...' : '')
    add(advisories, 'proposal', TASKS_PATH, null, `${registered.length} proposed_ids entries are registered in the spine now and can move into their tasks' descriptions (tracker README, "Registering a proposed run"): ${shown}`)
  }

  if (inputs.strict) {
    for (const p of pending.splice(0)) fail('proposed', p.file, p.line, p.message, { col: p.col, ...(p.id === undefined ? {} : { id: p.id }) })
  }

  const order = (a: Finding, b: Finding): number =>
    a.check.localeCompare(b.check) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || (a.col ?? 0) - (b.col ?? 0)
  failures.sort(order)
  pending.sort(order)
  return {
    failures,
    pending,
    advisories,
    registry,
    stats: { files: inputs.files.length, tokens, distinctIds: distinct.size, entries: registry.entries.length, tasks: tasks.length },
  }
}


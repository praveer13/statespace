// tracker/tasks.yaml (the source of truth) and docs/TRACKER.md (its human view). Pure.

import { EXACT } from './grammar.ts'
import type { Problem } from './spine.ts'
import { parseYaml, YamlError } from './yaml-subset.ts'
import type { YamlValue } from './yaml-subset.ts'

export interface Task {
  id: string
  status: string
  title: string
  wave: string
  kind: string
  origin: string
  implements: string[]
  dependsOn: string[]
  proposedIds: string[]
  /** The line of its `- id:` record in tasks.yaml. */
  line: number
}

export interface Listed {
  id: string
  marker: string
  line: number
}

/** The marker docs/TRACKER.md shows for each status (tracker/README.md, section 4). */
export const STATUS_MARKERS: Readonly<Record<string, string>> = { todo: ' ', 'in-progress': '~', review: '=', done: 'x' }

const record = (v: YamlValue | undefined): { [key: string]: YamlValue } => (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {})
const strings = (v: YamlValue | undefined): string[] => (Array.isArray(v) ? v.map(String) : [])
const text = (v: YamlValue | undefined): string => (typeof v === 'string' ? v : '')

export function parseTasks(source: string): { tasks: Task[]; waves: string[]; statuses: string[]; problems: Problem[] } {
  const problems: Problem[] = []
  let doc: YamlValue
  try {
    doc = parseYaml(source)
  } catch (e) {
    if (!(e instanceof YamlError)) throw e
    return { tasks: [], waves: [], statuses: [], problems: [{ line: e.line, message: `tasks.yaml does not parse: ${e.message}` }] }
  }
  const root = record(doc)
  const statuses = strings(record(root.rules).statuses)
  if (statuses.length === 0) problems.push({ line: null, message: 'rules.statuses is missing' })
  if (!Array.isArray(root.tasks)) problems.push({ line: null, message: 'tasks is not a list' })

  const lineOf = new Map<string, number>()
  source.split('\n').forEach((l, i) => {
    const m = /^ {2}- id: (\S+)/.exec(l)
    if (m) lineOf.set(m[1] as string, i + 1)
  })

  const tasks: Task[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(root.tasks) ? root.tasks : []) {
    const t = record(raw)
    const id = String(t.id)
    const line = lineOf.get(id) ?? null
    const status = text(t.status)
    if (!EXACT.task.test(id)) problems.push({ line, message: `task ID "${id}" does not match W{n}-T{nn} or W0-S{nn}` })
    if (seen.has(id)) problems.push({ line, message: `task ${id} appears twice` })
    seen.add(id)
    if (!statuses.includes(status)) problems.push({ line, message: `task ${id} has status "${status}"; expected one of ${statuses.join(', ')}` })
    if (t.wave !== id.slice(0, 2)) problems.push({ line, message: `task ${id} says wave "${String(t.wave)}"` })
    for (const f of ['title', 'kind', 'origin']) if (typeof t[f] !== 'string') problems.push({ line, message: `task ${id} has no ${f}` })
    tasks.push({
      id,
      status,
      title: text(t.title),
      wave: text(t.wave),
      kind: text(t.kind),
      origin: text(t.origin),
      implements: strings(t.implements),
      dependsOn: strings(t.depends_on),
      proposedIds: strings(t.proposed_ids),
      line: line ?? 0,
    })
  }
  const waves = (Array.isArray(root.waves) ? root.waves : []).map((w) => String(record(w).id))
  return { tasks, waves, statuses, problems }
}

/**
 * The checklist lines of docs/TRACKER.md: `- [ ] W0-S01 · title · size · model · deps`.
 * The marker is one of the four of STATUS_MARKERS.
 */
export function parseTrackerMarkdown(source: string): Listed[] {
  const out: Listed[] = []
  source.split('\n').forEach((l, i) => {
    const m = /^\s*[-*] \[(.)\] (W[0-9]-[TS][0-9]+)(?: ·|\s|$)/.exec(l)
    if (m) out.push({ id: m[2] as string, marker: m[1] as string, line: i + 1 })
  })
  return out
}

/**
 * Compare docs/TRACKER.md with tasks.yaml: every task listed once with the marker of its
 * status, and no listed task missing from tasks.yaml.
 */
export function compareTracker(tasks: Task[], listed: Listed[]): Problem[] {
  const out: Problem[] = []
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const seen = new Map<string, number>()
  for (const l of listed) {
    const first = seen.get(l.id)
    if (first !== undefined) {
      out.push({ line: l.line, message: `${l.id} is listed twice (also on line ${first})` })
      continue
    }
    seen.set(l.id, l.line)
    const t = byId.get(l.id)
    if (t === undefined) {
      out.push({ line: l.line, message: `${l.id} is listed here but has no record in tracker/tasks.yaml` })
      continue
    }
    const want = STATUS_MARKERS[t.status]
    if (want === undefined) continue // an unknown status is reported by parseTasks
    if (l.marker !== want) {
      const shown = Object.entries(STATUS_MARKERS).find(([, m]) => m === l.marker)?.[0] ?? `unknown marker [${l.marker}]`
      out.push({ line: l.line, message: `${l.id} is [${l.marker}] (${shown}) here but ${t.status} in tracker/tasks.yaml (expected [${want}])` })
    }
  }
  for (const t of tasks) {
    if (!seen.has(t.id)) out.push({ line: null, message: `${t.id} (${t.status}) is in tracker/tasks.yaml but not listed here` })
  }
  return out
}

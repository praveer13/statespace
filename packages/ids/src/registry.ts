// Assemble the ID registry from the spine and EVIDENCE.md, count it, and write it as the
// committed files of packages/ids: src/registry.json and src/index.ts. Pure.

import { buildMisconceptionEntries } from './evidence.ts'
import { KIND_NAMES } from './grammar.ts'
import type { Kind } from './grammar.ts'
import { buildSpineEntries } from './spine.ts'
import type { Entry, Problem } from './spine.ts'

export type Counts = Record<string, number>

export interface Registry {
  schema: string
  sources: { spine: string; evidence: string }
  counts: Counts
  entries: Entry[]
}

export interface FileProblem extends Problem {
  file: string
}

export const SCHEMA = 'statespace/ids@1'
export const SPINE_PATH = 'docs/spine/SPINE.md'
export const EVIDENCE_PATH = 'docs/EVIDENCE.md'

/**
 * @param spine text of docs/spine/SPINE.md
 * @param evidence text of docs/EVIDENCE.md
 */
export function buildRegistry(spine: string, evidence: string): { registry: Registry; problems: FileProblem[] } {
  const s = buildSpineEntries(spine)
  const m = buildMisconceptionEntries(evidence)
  const order = new Map<Kind, number>(KIND_NAMES.map((k, i) => [k, i]))
  const entries = [...s.entries, ...m.entries]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (order.get(a.e.kind) ?? 0) - (order.get(b.e.kind) ?? 0) || a.i - b.i)
    .map(({ e }) => e)
  const problems: FileProblem[] = [
    ...s.problems.map((p) => ({ ...p, file: SPINE_PATH })),
    ...m.problems.map((p) => ({ ...p, file: EVIDENCE_PATH })),
  ]
  return {
    registry: { schema: SCHEMA, sources: { spine: SPINE_PATH, evidence: EVIDENCE_PATH }, counts: countEntries(entries), entries },
    problems,
  }
}

/**
 * Counts that the spine states in prose (section 3.11 and the revision log), computed
 * from the entries. Capstone steps (tier `step`) and Boot (tier `boot`) are never lessons.
 */
export function countEntries(entries: Entry[]): Counts {
  const of = (kind: Kind, pred: (e: Entry) => boolean = () => true): number => entries.filter((e) => e.kind === kind && pred(e)).length
  const tier = (t: string): number => of('lesson', (e) => e.tier === t)
  const labStages = (inScope: (lab: string) => boolean): Entry[] => entries.filter((e) => e.kind === 'lab-stage' && inScope(e.lab ?? ''))
  const early = labStages((l) => l !== 'LAB-10')
  const last = labStages((l) => l === 'LAB-10')
  const stretch = (xs: Entry[]): number => xs.filter((e) => e.stretch === true).length
  const templates = entries.filter((e) => e.kind === 'generator').reduce((n, e) => n + (e.templates ?? 0), 0)
  const counts: Counts = {
    stages: of('stage'),
    lessons: tier('core') + tier('bridge'),
    core: tier('core'),
    bridge: tier('bridge'),
    boot: tier('boot'),
    steps: tier('step'),
    labs: of('lab'),
    labStages: of('lab-stage'),
    stretchLabStages: stretch(early) + stretch(last),
    plannedLabStages: early.length + last.length - stretch(early) - stretch(last),
    labStagesInLab1To9: early.length,
    plannedInLab1To9: early.length - stretch(early),
    stretchInLab1To9: stretch(early),
    labStagesInLab10: last.length,
    plannedInLab10: last.length - stretch(last),
    stretchInLab10: stretch(last),
    labChecks: of('lab-check'),
    kcs: of('kc'),
    thresholdKcs: of('kc', (e) => e.threshold === true),
    specimens: of('specimen'),
    claimTemplates: of('claim-template'),
    seams: of('seam'),
    erosions: of('erosion'),
    anchors: of('anchor'),
    gapClasses: of('gap-class', (e) => e.parent === undefined),
    gapSubclasses: of('gap-class', (e) => e.parent !== undefined),
    generators: of('generator'),
    templates,
    mechanics: of('mechanic'),
    instruments: of('instrument'),
    tabInstruments: of('instrument', (e) => e.section === '9.1'),
    benchInstruments: of('instrument', (e) => e.section === '9.2'),
    screens: of('screen'),
    gates: of('gate'),
    drawers: of('drawer'),
    justInTimeDrawers: of('drawer', (e) => e.deferred === false),
    deferredDrawers: of('drawer', (e) => e.deferred === true),
    executedRuns: of('run', (e) => e.status === 'executed'),
    runsToRecord: of('run', (e) => e.status === 'to-record'),
    waves: of('wave'),
    spineTasks: of('task'),
    ownerDecisions: of('owner-decision'),
    briefChanges: of('brief-change'),
    invariants: of('invariant'),
    misconceptions: of('misconception'),
  }
  for (let w = 0; w <= 6; w++) counts[`spineTasksW${w}`] = of('task', (e) => e.wave === `W${w}`)
  return counts
}

/** The committed registry file: one entry per line, so that a revision shows as a small diff. */
export function serializeRegistry(registry: Registry): string {
  const counts = Object.entries(registry.counts)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${v}`)
    .join(',\n')
  const entries = registry.entries.map((e) => `    ${JSON.stringify(e)}`).join(',\n')
  return [
    '{',
    `  "schema": ${JSON.stringify(registry.schema)},`,
    `  "sources": ${JSON.stringify(registry.sources)},`,
    '  "counts": {',
    counts,
    '  },',
    '  "entries": [',
    entries,
    '  ]',
    '}',
    '',
  ].join('\n')
}

const pascal = (kind: string): string => kind.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const constName = (kind: string): string => `${kind.toUpperCase().replaceAll('-', '_')}_IDS`
/** Tasks in the registry are the spine's; tracker/tasks.yaml extends them. */
const typeName = (kind: string): string => (kind === 'task' ? 'SpineTaskId' : `${pascal(kind)}Id`)
const listName = (kind: string): string => (kind === 'task' ? 'SPINE_TASK_IDS' : constName(kind))

/**
 * The generated TypeScript module: literal unions for every kind, so that a mistyped ID is a
 * compile error, and the helpers to classify a string.
 */
export function generateTypes(registry: Registry): string {
  const out = [
    '// GENERATED by scripts/build-ids.mjs from docs/spine/SPINE.md and docs/EVIDENCE.md.',
    '// Do not edit: change the source documents and run `node scripts/build-ids.mjs`.',
    '// Full entries (title, tier, section, ...) are in registry.json beside this file.',
    '',
    "export type { Entry, Src } from './spine.ts'",
    "export type { Counts, Registry } from './registry.ts'",
    '',
    'export const KINDS = [',
    ...KIND_NAMES.map((k) => `  '${k}',`),
    '] as const',
    'export type Kind = (typeof KINDS)[number]',
    '',
  ]
  for (const kind of KIND_NAMES) {
    const ids = registry.entries.filter((e) => e.kind === kind).map((e) => e.id)
    if (kind === 'task') out.push('// The tasks of spine section 13. tracker/tasks.yaml extends them (GATE-links reads both).')
    out.push(`export const ${listName(kind)} = [`)
    let line = '  '
    for (const id of ids) {
      const item = `'${id}', `
      if (line.length + item.length > 100) {
        out.push(line.trimEnd())
        line = '  '
      }
      line += item
    }
    if (line.trim() !== '') out.push(line.trimEnd())
    out.push('] as const', `export type ${typeName(kind)} = (typeof ${listName(kind)})[number]`, '')
  }
  out.push(
    'export const IDS = {',
    ...KIND_NAMES.map((k) => `  '${k}': ${listName(k)},`),
    '} as const',
    '',
    'export type IdOf<K extends Kind> = (typeof IDS)[K][number]',
    'export type AnyId = IdOf<Kind>',
    '',
    'const kindById: ReadonlyMap<string, Kind> = new Map(',
    '  KINDS.flatMap((kind) => (IDS[kind] as readonly string[]).map((id): [string, Kind] => [id, kind])),',
    ')',
    '',
    '/** The kind of a registered ID, or undefined. */',
    'export function kindOf(id: string): Kind | undefined {',
    '  return kindById.get(id)',
    '}',
    '',
    '/** Narrow a string to a registered ID of one kind. */',
    'export function isId<K extends Kind>(kind: K, id: string): id is IdOf<K> {',
    '  return kindById.get(id) === kind',
    '}',
    '',
  )
  return out.join('\n')
}

/**
 * Compare two registries by ID. An ID is `removed` when the later registry lacks it, `retyped`
 * when its kind differs (the ID now names another sort of thing), and `changed` when only the
 * fields its table gives it differ (a title, a tier, a "Used in" cell). W0-T10 uses it to show
 * that a spine revision removed or retargeted no existing ID.
 */
export function diffRegistries(
  before: Registry,
  after: Registry,
): { added: string[]; removed: string[]; retyped: string[]; changed: string[] } {
  const index = (r: Registry): Map<string, Entry> => new Map(r.entries.map((e) => [e.id, e]))
  const a = index(before)
  const b = index(after)
  const both = [...b.keys()].filter((id) => a.has(id))
  const kindOf = (m: Map<string, Entry>, id: string): string | undefined => m.get(id)?.kind
  return {
    added: [...b.keys()].filter((id) => !a.has(id)),
    removed: [...a.keys()].filter((id) => !b.has(id)),
    retyped: both.filter((id) => kindOf(a, id) !== kindOf(b, id)),
    changed: both.filter((id) => kindOf(a, id) === kindOf(b, id) && JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id))),
  }
}

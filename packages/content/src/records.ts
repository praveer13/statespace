// A stage's and a lab's own data (content/stages/S1/stage.yaml, lab.yaml): YAML records of schemas/lesson.schema.json,
// whose root picks the stage or the lab definition by the record's ID. Each declares `schema: statespace/lesson@1`,
// which is how GATE-schema finds the file and reads it, in TypeScript and with PyYAML. They are checked against the
// registry and their references resolved, as a page's are. The spine's tables give the rest of a stage page and a lab
// page, so the build joins these records to the registry (build/index.ts) instead of asking an author to repeat
// the tables.

import { LineCounter, isMap, isSeq, parseDocument, visit } from 'yaml'
import type { LessonLab, LessonStage } from '@statespace/schema'
import { markdownProblems } from './check.ts'
import { resolveRefs } from './refs.ts'
import type { RefContext } from './refs.ts'
import type { RegistryIndex } from './registry.ts'
import type { SchemaChecker } from './schema.ts'
import { factSnapshot, runSnapshot } from './snapshot.ts'
import { lineOf } from './lines.ts'
import { SCHEMA_TAG } from './source.ts'
import type { PageProblem } from './types.ts'
import { divergence } from './yaml11.ts'

export interface YamlRead {
  value: unknown
  problems: PageProblem[]
  /** The line of each JSON Pointer the document places: every key of a mapping and every item of a list. */
  lines: ReadonlyMap<string, number>
}

const escapeKey = (key: string): string => key.replaceAll('~', '~0').replaceAll('/', '~1')

export interface YamlOptions {
  /**
   * Also report an unquoted scalar that PyYAML (YAML 1.1) reads as something other than what the YAML 1.2 reader here
   * makes of it (`no`, `2026-10-25`, `1e3`, `0777`), because GATE-schema reads a content file with PyYAML and
   * judges what it read. Off by default: a file that no gate reads with PyYAML has no use for the rule.
   */
  pyyaml?: boolean
}

/** What a thrown value says, on one line. */
const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e)).split('\n')[0] as string

/** Read YAML strictly (YAML 1.2's core schema, no duplicate keys), with the line of every node. */
export function readYaml(text: string, options: YamlOptions = {}): YamlRead {
  const problems: PageProblem[] = []
  const lines = new Map<string, number>()
  const counter = new LineCounter()
  const doc = parseDocument(text.replace(/^\uFEFF/, ''), { lineCounter: counter, uniqueKeys: true, strict: true })
  for (const e of doc.errors) problems.push({ severity: 'error', code: 'yaml', message: `not valid YAML: ${e.message.split('\n')[0]}`, line: e.linePos?.[0]?.line ?? null })
  if (doc.errors.length > 0) return { value: null, problems, lines }
  const walk = (node: unknown, pointer: string): void => {
    if (isMap(node)) {
      for (const pair of node.items) {
        const key = pair.key as { value?: unknown; range?: [number, number, number] } | null
        const p = `${pointer}/${escapeKey(String(key?.value ?? ''))}`
        if (key?.range !== undefined) lines.set(p, counter.linePos(key.range[0]).line)
        walk(pair.value, p)
      }
    } else if (isSeq(node)) {
      node.items.forEach((item, i) => {
        const p = `${pointer}/${i}`
        const range = (item as { range?: [number, number, number] } | null)?.range
        if (range !== undefined) lines.set(p, counter.linePos(range[0]).line)
        walk(item, p)
      })
    }
  }
  let value: unknown
  try {
    walk(doc.contents, '')
    // toJS refuses a document whose aliases expand past a limit (a resource-exhaustion guard), by throwing
    value = doc.toJS()
    if (options.pyyaml === true) {
      visit(doc, {
        Scalar(_key, node) {
          if (node.type !== 'PLAIN' || typeof node.source !== 'string') return
          const why = divergence(node.source, node.value)
          if (why !== null) problems.push({ severity: 'error', code: 'pyyaml', message: why, line: node.range === undefined || node.range === null ? null : counter.linePos(node.range[0]).line })
        },
      })
    }
  } catch (e) {
    problems.push({ severity: 'error', code: 'yaml', message: `not valid YAML: ${reason(e)}`, line: 1 })
    return { value: null, problems, lines }
  }
  return { value, problems, lines }
}

/** A record with every string value mapped, keys and structure kept. */
export function mapStrings(value: unknown, fn: (text: string, pointer: string) => string, pointer = ''): unknown {
  if (typeof value === 'string') return fn(value, pointer)
  if (Array.isArray(value)) return value.map((v, i) => mapStrings(v, fn, `${pointer}/${i}`))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn, `${pointer}/${escapeKey(k)}`)]))
  }
  return value
}

export interface RecordContext {
  /** The repository path of the YAML file. */
  file: string
  index: RegistryIndex
  runs: ReadonlyMap<string, unknown>
  facts: ReadonlyMap<string, unknown>
  checker: SchemaChecker
}

export interface CompiledRecord<T> {
  record: T
  runs: Record<string, ReturnType<typeof runSnapshot>>
  facts: Record<string, ReturnType<typeof factSnapshot>>
  unresolved: string[]
}

export interface RecordResult<T> {
  compiled: CompiledRecord<T> | null
  problems: PageProblem[]
}

type Kind = 'stage' | 'lab'

function semantic(kind: Kind, record: LessonStage | LessonLab, lines: ReadonlyMap<string, number>, ctx: RecordContext): PageProblem[] {
  const out: PageProblem[] = []
  const error = (code: string, message: string, pointer: string): void => void out.push({ severity: 'error', code, message, line: lineOf(lines, pointer) })
  const warn = (code: string, message: string, pointer: string): void => void out.push({ severity: 'warning', code, message, line: lineOf(lines, pointer) })
  const { index } = ctx
  if (kind === 'stage') {
    const stage = record as LessonStage
    const expected = `content/stages/${stage.id}/stage.yaml`
    if (ctx.file !== expected) error('file-name', `${stage.id}'s stage data is ${expected}, not ${ctx.file}`, '/id')
    if (!index.has('stage', stage.id)) error('id-unregistered', `${stage.id} is not a stage of the spine's registry`, '/id')
    stage.seams?.forEach((id, i) => {
      if (!index.has('seam', id)) error('unknown-seam', `${id} is not a seam of the spine's registry`, `/seams/${i}`)
    })
    stage.anchors?.forEach((id, i) => {
      const entry = index.entry(id)
      if (entry?.kind !== 'anchor') error('unknown-anchor', `${id} is not an audit anchor of the spine's registry`, `/anchors/${i}`)
      else if (entry.stage !== undefined && entry.stage !== stage.id) warn('anchor-stage', `${id} belongs to ${entry.stage} in the spine, not ${stage.id}`, `/anchors/${i}`)
    })
    stage.drawers?.forEach((id, i) => {
      if (!index.has('drawer', id)) error('unknown-drawer', `${id} is not a drawer of the spine's registry`, `/drawers/${i}`)
    })
    stage.cards?.forEach((card, i) => {
      if (card.variant === 'build-this' && card.lab === undefined) error('card-lab', 'a Build this card names its lab stage', `/cards/${i}`)
      if (card.variant !== 'build-this' && card.lab !== undefined) error('card-lab', `only a Build this card names a lab stage, not a ${card.variant} card`, `/cards/${i}`)
      if (card.lab !== undefined && !index.has('lab-stage', card.lab)) error('unknown-lab-stage', `${card.lab} is not a lab stage of the spine's registry`, `/cards/${i}`)
    })
  } else {
    const lab = record as LessonLab
    const stage = `S${lab.id.slice('LAB-'.length)}`
    const expected = `content/stages/${stage}/lab.yaml`
    if (ctx.file !== expected) error('file-name', `${lab.id}'s lab data is ${expected}, not ${ctx.file}`, '/id')
    if (!index.has('lab', lab.id)) error('id-unregistered', `${lab.id} is not a lab of the spine's registry`, '/id')
    lab.stages?.forEach((s, i) => {
      const entry = index.entry(s.id)
      if (entry?.kind !== 'lab-stage' || entry.lab !== lab.id) error('unknown-lab-stage', `${s.id} is not a stage of ${lab.id} in the spine's registry`, `/stages/${i}`)
      s.checks?.forEach((c, j) => {
        if (!index.has('lab-check', c.id) || !c.id.startsWith(`${lab.id}.`)) error('unknown-check', `${c.id} is not a check of ${lab.id} in the spine's registry`, `/stages/${i}/checks/${j}`)
      })
    })
  }
  return out
}

/** Check and compile a stage's or a lab's YAML record. */
export function compileRecord<T extends LessonStage | LessonLab>(kind: Kind, text: string, ctx: RecordContext): RecordResult<T> {
  const read = readYaml(text, { pyyaml: true })
  const problems = [...read.problems]
  if (problems.some((p) => p.severity === 'error')) return { compiled: null, problems }
  const v = read.value
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && (v as Record<string, unknown>).schema === undefined) {
    // GATE-schema finds a YAML record by this line, so a file without it is never checked by the gate
    problems.push({ severity: 'error', code: 'schema-tag', message: `a ${kind} file declares its schema, "schema: ${SCHEMA_TAG}": that line is how GATE-schema finds the file and checks it in TypeScript and in Python`, line: 1 })
    return { compiled: null, problems }
  }
  const issues = kind === 'stage' ? ctx.checker.stage(read.value) : ctx.checker.lab(read.value)
  for (const i of issues) problems.push({ severity: 'error', code: 'schema', message: `${i.path === '' ? 'the record' : i.path} ${i.message}`, line: lineOf(read.lines, i.path) })
  if (issues.length > 0) return { compiled: null, problems }
  const record = read.value as T
  problems.push(...semantic(kind, record, read.lines, ctx))
  const refCtx: RefContext = { runs: ctx.runs, facts: ctx.facts, registeredRun: (id) => ctx.index.has('run', id), draft: record.draft }
  const runs = new Set<string>()
  const facts = new Set<string>()
  const unresolved = new Set<string>()
  const resolved = mapStrings(record, (text, pointer) => {
    const line = lineOf(read.lines, pointer)
    for (const p of markdownProblems(text)) problems.push({ severity: 'error', code: p.code, message: `${pointer}: ${p.message}`, line })
    const r = resolveRefs(text, refCtx, line)
    problems.push(...r.problems)
    for (const id of r.runs) runs.add(id)
    for (const id of r.facts) facts.add(id)
    for (const id of r.unresolved) unresolved.add(id)
    return r.text
  }) as T
  if (problems.some((p) => p.severity === 'error')) return { compiled: null, problems }
  // the finished record is a valid record by the schema's root, which GATE-schema applies: a failure here is the build's bug
  const again = ctx.checker.record(resolved)
  for (const i of again) problems.push({ severity: 'error', code: 'internal', message: `the built ${kind} record does not validate: ${i.path} ${i.message}`, line: null })
  if (again.length > 0) return { compiled: null, problems }
  const runTable: CompiledRecord<T>['runs'] = {}
  for (const id of [...runs].sort()) runTable[id] = runSnapshot(id, ctx.runs.get(id))
  const factTable: CompiledRecord<T>['facts'] = {}
  for (const id of [...facts].sort()) factTable[id] = factSnapshot(id, ctx.facts.get(id))
  return { compiled: { record: resolved, runs: runTable, facts: factTable, unresolved: [...unresolved].sort() }, problems }
}

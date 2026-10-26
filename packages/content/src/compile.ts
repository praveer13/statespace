// One page, from source text to the record the site loads and the Markdown the learner's agent reads
// (ARCHITECTURE.md section 3.3): read it, validate it against the schema and the registry, resolve its references,
// derive the rail, the cited runs, the revisions, and write nothing: a pure function. A page that does not pass
// compiles to nothing; its problems say why, with the line.

import type { Lesson, LessonBlock, LessonFactSnapshot, LessonRunSnapshot } from '@statespace/schema'
import { RUN_ID, isPlaceholder, referencesIn } from '@statespace/runs'
import { checkPage } from './check.ts'
import { mapCopy } from './copy.ts'
import { canonicalJson, sha256Hex } from './hash.ts'
import { renderMarkdown } from './markdown.ts'
import { railOf } from './rail.ts'
import { citedRuns, resolveRefs } from './refs.ts'
import type { RefContext } from './refs.ts'
import type { RegistryIndex } from './registry.ts'
import { itemRev, runRecordHash } from './rev.ts'
import type { RevContext } from './rev.ts'
import type { SchemaChecker } from './schema.ts'
import { factSnapshot, runSnapshot } from './snapshot.ts'
import { lineOf } from './lines.ts'
import { parsePageSource } from './source.ts'
import type { ParsedSource } from './source.ts'
import type { PageProblem } from './types.ts'

export interface PageContext {
  /** The repository path of the source file. */
  file: string
  index: RegistryIndex
  /** The run records by ID: the contents of runs/RUN-*.json. */
  runs: ReadonlyMap<string, unknown>
  /** The facts of content/registry/facts.json by ID. */
  facts: ReadonlyMap<string, unknown>
  checker: SchemaChecker
  /** A fingerprint of a generator family's templates and key procedure, where the build can name one. */
  templateRev?: (family: string) => string | null
}

export interface CompiledPage {
  /** The page as the site loads it: authored fields, references resolved, derived fields added. */
  page: Lesson
  /** The page as the learner's agent reads it. */
  markdown: string
  /** How many items and cells got an itemRev. */
  itemRevs: number
}

export interface CompileResult {
  compiled: CompiledPage | null
  problems: PageProblem[]
}

const hasError = (problems: readonly PageProblem[]): boolean => problems.some((p) => p.severity === 'error')

/** The runs a block cites in its own fields, each with the field's path inside the block: the recorded run and the key's run. */
function fieldRuns(block: LessonBlock): Array<{ id: string; field: string }> {
  if (block.type === 'instrument') return [{ id: block.recorded, field: 'recorded' }, ...(block.call?.keyRun === undefined ? [] : [{ id: block.call.keyRun, field: 'call/keyRun' }])]
  if (block.type === 'item' && block.choice?.keyRun !== undefined) return [{ id: block.choice.keyRun, field: 'choice/keyRun' }]
  return []
}

/** Compile a lesson or a drawer from its source text. */
export function compilePage(source: string, ctx: PageContext): CompileResult {
  return compileParsed(parsePageSource(source), ctx)
}

/** Compile a page that has been read already. */
export function compileParsed(parsed: ParsedSource, ctx: PageContext): CompileResult {
  const problems: PageProblem[] = [...parsed.problems]
  if (hasError(problems) || parsed.record === null) return { compiled: null, problems }

  // 1. the schema
  const issues = ctx.checker.page(parsed.record)
  for (const i of issues) problems.push({ severity: 'error', code: 'schema', message: `${i.path === '' ? 'the page' : i.path} ${i.message}`, line: lineOf(parsed.lines, i.path) })
  if (issues.length > 0) return { compiled: null, problems }
  const page = parsed.record as unknown as Lesson

  // 2. the registry and the rules that need two fields
  problems.push(...checkPage(page, parsed.lines, { file: ctx.file, index: ctx.index }))

  // 3. the references in every string of copy
  const refCtx: RefContext = { runs: ctx.runs, facts: ctx.facts, registeredRun: (id) => ctx.index.has('run', id), draft: page.draft }
  const blockRuns = new Map<string, Set<string>>()
  const blockCited = new Map<string, Set<string>>()
  const runsCited = new Set<string>()
  const factsCited = new Set<string>()
  const unresolved = new Set<string>()
  const note = (map: Map<string, Set<string>>, path: string, ids: readonly string[]): void => {
    const key = /^\/segments\/(\d+)\/blocks\/(\d+)/.exec(path)?.slice(1, 3).join('/')
    if (key === undefined || ids.length === 0) return
    const set = map.get(key) ?? new Set<string>()
    for (const id of ids) set.add(id)
    map.set(key, set)
  }
  const resolved = mapCopy(page, (text, path, kind) => {
    const line = lineOf(parsed.lines, path)
    if (kind === 'title') {
      const stray = referencesIn(text).filter((r) => !isPlaceholder(r))
      if (stray.length > 0) problems.push({ severity: 'error', code: 'ref-in-title', message: `${path}: a title holds no run or fact reference`, line })
      return text
    }
    const r = resolveRefs(text, refCtx, line)
    problems.push(...r.problems)
    for (const id of r.runs) runsCited.add(id)
    for (const id of r.facts) factsCited.add(id)
    for (const id of r.unresolved) unresolved.add(id)
    note(blockRuns, path, r.runs)
    note(blockCited, path, citedRuns(text))
    return r.text
  })
  // ... and the runs the blocks' own fields cite
  page.segments.forEach((s, i) =>
    s.blocks.forEach((b, j) => {
      const at = `/segments/${i}/blocks/${j}`
      for (const { id, field } of fieldRuns(b)) {
        const where = `${at}/${field}`
        note(blockCited, at, [id])
        if (!RUN_ID.test(id) || !ctx.index.has('run', id)) {
          problems.push({ severity: 'error', code: 'run-unregistered', message: `${id} is not a run ID of the spine's registry (section 9.5)`, line: lineOf(parsed.lines, where) })
        } else if (ctx.runs.has(id)) {
          runsCited.add(id)
          note(blockRuns, at, [id])
        } else {
          unresolved.add(id)
          if (page.draft) problems.push({ severity: 'warning', code: 'run-pending', message: `${where} waits for ${id}, which runs/ does not hold yet (the page is a draft)`, line: lineOf(parsed.lines, where) })
          else problems.push({ severity: 'error', code: 'run-unresolved', message: `${where} cites ${id}, which runs/ does not hold: record the run, or label the page a draft`, line: lineOf(parsed.lines, where) })
        }
      }
    }),
  )
  if (hasError(problems)) return { compiled: null, problems }

  // 4. what the build derives
  const revCtx: RevContext = {
    runHash: (id) => (ctx.runs.has(id) ? runRecordHash(ctx.runs.get(id)) : null),
    templateRev: (family) => ctx.templateRev?.(family) ?? null,
  }
  let itemRevs = 0
  const segments = resolved.segments.map((s, i) => ({
    ...s,
    blocks: s.blocks.map((b, j): LessonBlock => {
      const original = (page.segments[i] as Lesson['segments'][number]).blocks[j] as LessonBlock
      const key = `${i}/${j}`
      if (b.type === 'item' || b.type === 'instrument') {
        itemRevs += 1
        return { ...b, itemRev: itemRev(original, [...(blockCited.get(key) ?? [])], revCtx) }
      }
      if (b.type === 'card') {
        const minutes = b.lab === undefined ? undefined : ctx.index.entry(b.lab)?.minutes
        const runs = [...(blockRuns.get(key) ?? [])].sort()
        return { ...b, ...(minutes === undefined ? {} : { minutes }), ...(runs.length === 0 ? {} : { runs }) }
      }
      return b
    }),
  }))
  const runs: Record<string, LessonRunSnapshot> = {}
  for (const id of [...runsCited].sort()) runs[id] = runSnapshot(id, ctx.runs.get(id))
  const facts: Record<string, LessonFactSnapshot> = {}
  for (const id of [...factsCited].sort()) facts[id] = factSnapshot(id, ctx.facts.get(id))
  const checkedBy = Object.values(runs)
    .filter((r): r is LessonRunSnapshot & { engine: string; version: string } => r.engine !== undefined && r.version !== undefined)
    .map((r) => ({ run: r.id, engine: r.engine, version: r.version }))
  const claims: string[] = []
  const specimens: string[] = []
  for (const s of segments) {
    for (const b of s.blocks) {
      if (b.type === 'claim' && !claims.includes(b.template)) claims.push(b.template)
      if (b.type === 'specimen' && !specimens.includes(b.id)) specimens.push(b.id)
    }
  }
  const built: Lesson = {
    ...resolved,
    segments,
    minutes: segments.reduce((n, s) => n + s.minutes, 0),
    rail: railOf({ segments }),
    establishes: { claims, specimens },
    runs,
    facts,
    checkedBy,
    unresolved: [...unresolved].sort(),
  }
  const finished: Lesson = { ...built, rev: sha256Hex(canonicalJson(built)) }

  // 5. the finished record is a valid record: a failure here is the build's bug, not the author's
  const again = ctx.checker.page(finished)
  for (const i of again) problems.push({ severity: 'error', code: 'internal', message: `the built page does not validate: ${i.path} ${i.message}`, line: null })
  if (again.length > 0) return { compiled: null, problems }
  return { compiled: { page: finished, markdown: renderMarkdown(finished, ctx.index), itemRevs }, problems }
}

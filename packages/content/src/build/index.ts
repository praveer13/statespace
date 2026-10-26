// The content build as a pure function (ARCHITECTURE.md section 3.3): the source files, the registry, the runs and
// the facts go in, and the files of the site's public directory come out, with every problem found. The I/O is
// scripts/build-content.mjs's: it reads the repository, calls buildContent, and writes nothing when any problem is
// an error. Everything here is deterministic: the same input gives the same bytes, so the hashed file names
// change exactly when a page's content does.
//
// What it writes, by path under apps/site/public/:
//   content/<id>.<hash>.json    one per lesson and drawer: the page, lazy and content-hashed
//   md/<id>.md                  the same page as Markdown for the learner's agent, at a stable URL
//   md/index.json               the index of those pages, from which llms.txt is written
//   content/stages.<hash>.json  every stage: the spine's tables joined to the stage's own data
//   content/labs.<hash>.json    every lab, the same way
//   content/search.<hash>.json  the search index
//   content/audit.<hash>.json   the audit pool: every anchor under content/audit/, with its cases and keys
//   schemas/<name>.schema.json  the published JSON Schemas, with schemas/index.json
//   content/manifest.json       the entry point: which file is which, by ID

import type { Entry, Registry } from '@statespace/ids'
import type { Lesson, LessonLab, LessonStage } from '@statespace/schema'
import { BLOCK_TYPES, countBlockTypes } from '../blocks.ts'
import { compilePage } from '../compile.ts'
import { canonicalJson, sha256Hex } from '../hash.ts'
import { compileRecord } from '../records.ts'
import { indexRegistry, pageTitle } from '../registry.ts'
import { makeSchemaChecker } from '../schema.ts'
import type { OutputFile, PageProblem, Problem, SourceFile } from '../types.ts'
import { LABS_FORMAT, MANIFEST_FORMAT, MARKDOWN_INDEX_FORMAT, STAGES_FORMAT } from '../output.ts'
import type { LabPage, Manifest, ManifestPage, MarkdownIndex, StagePage } from '../output.ts'
import { buildSearchIndex } from './search.ts'
import { auditPool, compileAudit } from '../audit.ts'
import type { AuditAnchor } from '../audit-types.ts'

export { buildSearchIndex } from './search.ts'

export interface ContentInput {
  registry: Registry
  /** The text files under content/stages/, content/drawers/ and content/audit/, by repository-relative path. */
  files: readonly SourceFile[]
  /** The run records by ID: the parsed contents of runs/RUN-*.json. */
  runs: ReadonlyMap<string, unknown>
  /** The parsed content/registry/facts.json, or null when there is none. */
  facts: unknown
  /** The published schemas, schemas/*.schema.json, by repository-relative path. */
  schemas: readonly SourceFile[]
  /** A fingerprint of each generator family's templates and key procedure, by family ID, where the build can name one. */
  templateRevs?: Readonly<Record<string, string>>
  /** The build date, YYYY-MM-DD: the title block's "Drawn". The only input that is not content. */
  builtAt: string
}

export interface BuildReport {
  lessons: number
  drawers: number
  stages: number
  labs: number
  /** Audit anchors built from content/audit/. */
  auditAnchors: number
  /** Blocks by type, over every built page. */
  blocks: Record<string, number>
  itemRevs: number
  runsCited: number
  files: number
  /** Files the build read and did not use, with the reason. */
  skipped: string[]
}

export interface ContentOutput {
  /** The files to write. Empty of pages that did not compile; the caller writes nothing when a problem is an error. */
  files: OutputFile[]
  problems: Problem[]
  report: BuildReport
}

/** A built page larger than this, in bytes of JSON, is reported: lessons load per route (a design value, not a tool figure). */
export const PAGE_SIZE_WARN = 120_000

/** Compare IDs the way a reader orders them: S2.L10 after S2.L9, D-02 after D-01. */
export function naturalCompare(a: string, b: string): number {
  const pa = a.split(/(\d+)/)
  const pb = b.split(/(\d+)/)
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    const x = pa[i] as string
    const y = pb[i] as string
    if (x === y) continue
    if (i % 2 === 1) return Number(x) - Number(y)
    return x < y ? -1 : 1
  }
  return pa.length - pb.length
}

const LESSON_FILE = /^content\/stages\/(S[1-9][0-9]*)\/(S[1-9][0-9]*\.L[0-9]+)\.md$/
const DRAWER_FILE = /^content\/drawers\/(D-[0-9]{2})\.md$/
const STAGE_FILE = /^content\/stages\/(S[1-9][0-9]*)\/stage\.yaml$/
const LAB_FILE = /^content\/stages\/(S[1-9][0-9]*)\/lab\.yaml$/
const AUDIT_FILE = /^content\/audit\/(AUD-[0-9]+\.[0-9]+)\.ya?ml$/
/** Files of the same folders that this build leaves alone, with the reason. */
const LEFT_ALONE: ReadonlyArray<readonly [RegExp, string]> = [
  [/^content\/stages\/budget\.yaml$/, "another task's data"],
  [/^content\/stages\/S[1-9][0-9]*\/placement\.yaml$/, "another task's data"],
  [/^content\/(?:stages|drawers)\/(?:S[1-9][0-9]*\/)?README\.md$/, 'documentation'],
  [/^content\/audit\/README\.md$/, 'documentation'],
  [/^content\/audit\/(?:_|tools\/)/, 'an audit author\'s working file'],
]

const json = (value: unknown): string => `${JSON.stringify(value)}\n`

/** The parts of a published schema this build reads. */
interface SchemaFile {
  $id?: unknown
  properties?: { schema?: { const?: unknown; $ref?: unknown } }
  $defs?: Record<string, { const?: unknown } | undefined>
}

/** The tag the records of a schema declare, from its `schema` property: a constant, or a local definition that is one. */
function recordTag(doc: SchemaFile): string | null {
  const prop = doc.properties?.schema
  if (typeof prop?.const === 'string') return prop.const
  const def = typeof prop?.$ref === 'string' ? /^#\/\$defs\/([^/]+)$/.exec(prop.$ref)?.[1] : undefined
  const via = def === undefined ? undefined : doc.$defs?.[def]?.const
  return typeof via === 'string' ? via : null
}

/** Build the site's content. */
export function buildContent(input: ContentInput): ContentOutput {
  const problems: Problem[] = []
  const add = (file: string | null, list: readonly PageProblem[]): void => void problems.push(...list.map((p) => ({ ...p, file })))
  const index = indexRegistry(input.registry)
  const checker = makeSchemaChecker()
  const factsList = (input.facts as { facts?: Array<{ id?: unknown }> } | null)?.facts ?? []
  const facts = new Map<string, unknown>(factsList.filter((f): f is { id: string } => typeof f.id === 'string').map((f) => [f.id, f]))
  const templateRev = (family: string): string | null => input.templateRevs?.[family] ?? null
  const skipped: string[] = []
  const outputs: OutputFile[] = []

  const pages = new Map<string, Lesson>()
  const sources = new Map<string, string>()
  const markdown = new Map<string, string>()
  const stages = new Map<string, { record: LessonStage; runs: Record<string, unknown>; facts: Record<string, unknown>; unresolved: string[] }>()
  const labs = new Map<string, { record: LessonLab; runs: Record<string, unknown>; facts: Record<string, unknown>; unresolved: string[] }>()
  const auditAnchors = new Map<string, AuditAnchor>()
  let itemRevs = 0

  for (const file of [...input.files].sort((a, b) => naturalCompare(a.path, b.path))) {
    try {
      const ctx = { file: file.path, index, runs: input.runs, facts, checker }
      if (LESSON_FILE.test(file.path) || DRAWER_FILE.test(file.path)) {
        const { compiled, problems: found } = compilePage(file.text, { ...ctx, templateRev })
        add(file.path, found)
        if (compiled !== null) {
          pages.set(compiled.page.id, compiled.page)
          sources.set(compiled.page.id, file.path)
          markdown.set(compiled.page.id, compiled.markdown)
          itemRevs += compiled.itemRevs
        }
      } else if (STAGE_FILE.test(file.path)) {
        const { compiled, problems: found } = compileRecord<LessonStage>('stage', file.text, ctx)
        add(file.path, found)
        if (compiled !== null) stages.set(compiled.record.id, compiled)
      } else if (LAB_FILE.test(file.path)) {
        const { compiled, problems: found } = compileRecord<LessonLab>('lab', file.text, ctx)
        add(file.path, found)
        if (compiled !== null) labs.set(compiled.record.id, compiled)
      } else if (AUDIT_FILE.test(file.path)) {
        const { anchor, problems: found } = compileAudit(file.text, file.path, { index, runs: input.runs })
        add(file.path, found)
        if (anchor !== null) auditAnchors.set(anchor.id, anchor)
      } else if (LEFT_ALONE.some(([re]) => re.test(file.path))) {
        skipped.push(`${file.path}: ${LEFT_ALONE.find(([re]) => re.test(file.path))?.[1] ?? 'left alone'}`)
      } else if (/\.md$/.test(file.path)) {
        add(file.path, [{ severity: 'error', code: 'unknown-file', message: 'a Markdown file here must be a lesson, content/stages/S1/S1.L1.md, or a drawer, content/drawers/D-01.md', line: null }])
      } else {
        add(file.path, [{ severity: 'warning', code: 'unread-file', message: 'the content build does not read this file', line: null }])
        skipped.push(`${file.path}: not read`)
      }
    } catch (e) {
      // a crash on one file is a finding about the build, with the file, and the other files still build
      add(file.path, [{ severity: 'error', code: 'internal', message: `the build failed on this file: ${e instanceof Error ? e.message : String(e)}; that is a bug in the build, not in the file`, line: null }])
    }
  }

  // the pages
  const isDrawer = (p: Lesson): number => (p.id.startsWith('D-') ? 1 : 0)
  const ordered = [...pages.values()].sort((a, b) => isDrawer(a) - isDrawer(b) || naturalCompare(a.id, b.id))
  const manifest: Manifest = {
    format: MANIFEST_FORMAT,
    builtAt: input.builtAt,
    contentRev: '',
    lessons: {},
    drawers: {},
    stages: '',
    labs: '',
    search: '',
    audit: '',
    md: 'md/index.json',
    schemas: 'schemas/index.json',
  }
  const mdIndex: MarkdownIndex['pages'] = []
  for (const page of ordered) {
    const text = json(page)
    if (text.length > PAGE_SIZE_WARN) {
      add(sources.get(page.id) ?? null, [{ severity: 'warning', code: 'page-size', message: `the built page is ${text.length} bytes of JSON, over ${PAGE_SIZE_WARN}: a lesson loads per route, and a route has a budget of its own (ARCHITECTURE.md section 14)`, line: null }])
    }
    const file = `content/${page.id}.${sha256Hex(text).slice(0, 12)}.json`
    outputs.push({ path: file, text })
    const md = `md/${page.id}.md`
    outputs.push({ path: md, text: markdown.get(page.id) as string })
    const entry: ManifestPage = {
      file,
      md,
      rev: page.rev as string,
      title: page.title,
      ...(page.tier === undefined ? {} : { tier: page.tier }),
      draft: page.draft,
      minutes: page.minutes ?? 0,
    }
    const drawer = page.id.startsWith('D-')
    ;(drawer ? manifest.drawers : manifest.lessons)[page.id] = entry
    mdIndex.push({ id: page.id, kind: drawer ? 'drawer' : 'lesson', title: page.title, path: md })
  }
  outputs.push({ path: 'md/index.json', text: json({ format: MARKDOWN_INDEX_FORMAT, pages: mdIndex } satisfies MarkdownIndex) })

  // the stages and the labs: the spine's tables joined to each one's own data
  const entries = input.registry.entries as readonly Entry[]
  const stagePages: StagePage[] = entries
    .filter((e) => e.kind === 'stage')
    .map((s) => {
      const authored = stages.get(s.id)
      const lab = entries.find((e) => e.kind === 'lab' && e.id === `LAB-${s.id.slice(1)}`)
      return {
        id: s.id,
        title: s.title ?? s.id,
        tagline: s.tagline ?? '',
        lessons: entries
          .filter((e) => e.kind === 'lesson' && e.stage === s.id)
          .map((l) => {
            const page = pages.get(l.id)
            return { id: l.id, title: pageTitle(l, page), tier: l.tier ?? '', kcs: l.kcs ?? [], built: page !== undefined, minutes: page?.minutes ?? null, draft: page?.draft ?? null }
          }),
        lab: lab === undefined ? null : { id: lab.id, title: lab.title ?? lab.id },
        labStages: lab === undefined ? [] : entries.filter((e) => e.kind === 'lab-stage' && e.lab === lab.id).map((e) => ({ id: e.id, title: e.title ?? e.id, minutes: e.minutes ?? 0, stretch: e.stretch === true })),
        anchors: entries.filter((e) => e.kind === 'anchor' && e.stage === s.id).map((e) => e.id),
        drawers: entries.filter((e) => e.kind === 'drawer' && e.stages?.includes(s.id) === true).map((e) => ({ id: e.id, title: pageTitle(e, pages.get(e.id)), deferred: e.deferred === true })),
        authored: authored?.record ?? null,
        runs: authored?.runs ?? {},
        facts: authored?.facts ?? {},
        unresolved: authored?.unresolved ?? [],
      }
    })
  const labPages: LabPage[] = entries
    .filter((e) => e.kind === 'lab')
    .map((l) => {
      const authored = labs.get(l.id)
      const byId = new Map((authored?.record.stages ?? []).map((s) => [s.id, s]))
      return {
        id: l.id,
        title: l.title ?? l.id,
        stage: `S${l.id.slice('LAB-'.length)}`,
        stages: entries
          .filter((e) => e.kind === 'lab-stage' && e.lab === l.id)
          .map((e) => {
            const own = byId.get(e.id)
            return {
              id: e.id,
              title: e.title ?? e.id,
              minutes: e.minutes ?? 0,
              stretch: e.stretch === true,
              weekend: own?.weekend === true,
              what: own?.what ?? null,
              checks: (own?.checks ?? []).map((c) => ({ id: c.id, label: c.label, passes: c.passes ?? null })),
            }
          }),
        summary: authored?.record.summary ?? null,
        extra: authored?.record.extra ?? null,
        authored: authored !== undefined,
        runs: authored?.runs ?? {},
        facts: authored?.facts ?? {},
        unresolved: authored?.unresolved ?? [],
      }
    })
  const stagesText = json({ format: STAGES_FORMAT, stages: stagePages })
  manifest.stages = `content/stages.${sha256Hex(stagesText).slice(0, 12)}.json`
  outputs.push({ path: manifest.stages, text: stagesText })
  const labsText = json({ format: LABS_FORMAT, labs: labPages })
  manifest.labs = `content/labs.${sha256Hex(labsText).slice(0, 12)}.json`
  outputs.push({ path: manifest.labs, text: labsText })

  // the search index
  const searchText = json(buildSearchIndex(input.registry, ordered))
  manifest.search = `content/search.${sha256Hex(searchText).slice(0, 12)}.json`
  outputs.push({ path: manifest.search, text: searchText })

  // the audit pool
  const auditText = json(auditPool(index, [...auditAnchors.values()].sort((a, b) => naturalCompare(a.id, b.id)), input.runs))
  manifest.audit = `content/audit.${sha256Hex(auditText).slice(0, 12)}.json`
  outputs.push({ path: manifest.audit, text: auditText })

  // the published schemas
  const published: Array<{ name: string; id: string; schema: string | null; file: string; sha256: string }> = []
  for (const s of [...input.schemas].sort((a, b) => a.path.localeCompare(b.path))) {
    const name = /([a-z][a-z0-9-]*)\.schema\.json$/.exec(s.path)?.[1]
    if (name === undefined) continue
    let doc: SchemaFile
    try {
      doc = JSON.parse(s.text) as SchemaFile
    } catch (e) {
      add(s.path, [{ severity: 'error', code: 'schema-file', message: `does not parse as JSON: ${e instanceof Error ? e.message : String(e)}`, line: null }])
      continue
    }
    const text = s.text.replaceAll('\r\n', '\n')
    outputs.push({ path: `schemas/${name}.schema.json`, text })
    published.push({ name, id: String(doc.$id ?? ''), schema: recordTag(doc), file: `schemas/${name}.schema.json`, sha256: sha256Hex(text) })
  }
  outputs.push({ path: 'schemas/index.json', text: json({ format: 'statespace published schemas, revision 1', schemas: published }) })

  // the manifest
  const { contentRev: _unused, builtAt: _date, ...rest } = manifest
  manifest.contentRev = sha256Hex(canonicalJson(rest))
  outputs.push({ path: 'content/manifest.json', text: `${JSON.stringify(manifest, null, 2)}\n` })

  const blocks: Record<string, number> = Object.fromEntries(BLOCK_TYPES.map((t) => [t, 0]))
  for (const page of ordered) for (const [type, n] of Object.entries(countBlockTypes(page))) blocks[type] = (blocks[type] ?? 0) + n
  const runsCited = new Set<string>()
  for (const page of ordered) for (const id of Object.keys(page.runs ?? {})) runsCited.add(id)
  const sortedProblems = problems.sort((a, b) => (a.file ?? '').localeCompare(b.file ?? '') || (a.line ?? 0) - (b.line ?? 0) || a.code.localeCompare(b.code))
  return {
    files: outputs,
    problems: sortedProblems,
    report: {
      lessons: Object.keys(manifest.lessons).length,
      drawers: Object.keys(manifest.drawers).length,
      stages: stages.size,
      labs: labs.size,
      auditAnchors: auditAnchors.size,
      blocks,
      itemRevs,
      runsCited: runsCited.size,
      files: outputs.length,
      skipped,
    },
  }
}

export { checkPage } from '../check.ts'
export type { CheckContext } from '../check.ts'
export { compileParsed, compilePage } from '../compile.ts'
export type { CompiledPage, CompileResult, PageContext } from '../compile.ts'
export { compileRecord, mapStrings, readYaml } from '../records.ts'
export type { CompiledRecord, RecordContext, RecordResult, YamlOptions, YamlRead } from '../records.ts'
export { citedRuns, resolveRefs } from '../refs.ts'
export type { RefContext, ResolvedText } from '../refs.ts'
export { makeSchemaChecker } from '../schema.ts'
export type { SchemaChecker, SchemaIssue } from '../schema.ts'
export { DERIVED_KEYS, FRONT_KEYS, parsePageSource, stripComments } from '../source.ts'
export type { ParseOptions, ParsedSource } from '../source.ts'
export { parseAttrs, listOf } from '../attrs.ts'
export type { AttrValue, Attrs } from '../attrs.ts'

// The build's entry holds the whole package: a gate that reads sources needs the shared half too.
export * from '../index.ts'

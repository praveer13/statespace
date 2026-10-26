// References in copy (ARCHITECTURE.md sections 9.2 and 18; runs/README.md section 4), as the build resolves them.
//
//   {{run:RUN-id}}              a citation. It stays in the text, and the run goes into the page's `runs` table, for
//                               the site to render as a run chip.
//   {{run:RUN-id#values.name}}  a value reference. The build prints the value from the run's record, so the number in
//                               copy is generated, never typed.
//   [X RUN-id]                  the documents' form. In copy it compiles to {{run:RUN-id}}, one per run in the tag;
//                               a path in the tag, which GATE-facts checks against the sentence, is dropped.
//   {{fact:id}}                 a fact of content/registry/facts.json. It stays in the text, and the fact goes into
//                               the page's `facts` table, for the site to print its value and its "stale since" badge.
//
// A run that runs/ does not hold is "unresolved". In a page labeled draft that is a warning and the reference stays
// in the text, for the site to render as "run not yet recorded"; elsewhere it is an error (GATE-runs).

import { RUN_ID, isArchitectureSpelling, isPlaceholder, isPrintable, describe, referencesIn, renderValue, resolvePath } from '@statespace/runs'
import type { Reference } from '@statespace/runs'
import type { PageProblem } from './types.ts'

export interface RefContext {
  /** The run records by ID: the contents of runs/RUN-*.json. */
  runs: ReadonlyMap<string, unknown>
  /** The facts of content/registry/facts.json by ID. */
  facts: ReadonlyMap<string, unknown>
  /** Whether the spine registers the run ID (kind run in the ID registry). */
  registeredRun(id: string): boolean
  /** Whether the page is labeled draft. */
  draft: boolean
}

export interface ResolvedText {
  text: string
  /** The runs the text cites that runs/ holds. */
  runs: string[]
  /** The facts the text cites. */
  facts: string[]
  /** The runs the text cites that runs/ does not hold, in a draft. */
  unresolved: string[]
  problems: PageProblem[]
}

/** Where a dotted path stops existing in a record, and what is there instead: "values has: queries, version". */
export function whereItBreaks(record: unknown, dotted: string): string {
  let v: unknown = record
  const walked: string[] = []
  for (const part of dotted.split('.')) {
    const next = resolvePath(v, part)
    if (next === undefined) break
    v = next
    walked.push(part)
  }
  const here = walked.length === 0 ? 'the record' : walked.join('.')
  if (v === null || typeof v !== 'object') return ''
  const keys = Array.isArray(v) ? v.map((_x, i) => String(i)) : Object.keys(v)
  const shown = keys.slice(0, 12).join(', ')
  return ` (${here} has: ${shown}${keys.length > 12 ? `, ... (${keys.length})` : ''})`
}

interface Edit {
  start: number
  end: number
  replacement: string
}

/** Resolve the references in one copy string. `line` is where the string starts in the source, for messages. */
export function resolveRefs(text: string, ctx: RefContext, line: number | null): ResolvedText {
  const problems: PageProblem[] = []
  const runs = new Set<string>()
  const facts = new Set<string>()
  const unresolved = new Set<string>()
  const edits: Edit[] = []
  const error = (code: string, message: string): void => void problems.push({ severity: 'error', code, message, line })
  const wait = (id: string, what: string): void => {
    unresolved.add(id)
    if (ctx.draft) problems.push({ severity: 'warning', code: 'run-pending', message: `${what} waits for ${id}, which runs/ does not hold yet (the page is a draft)`, line })
    else error('run-unresolved', `${what} cites ${id}, which runs/ does not hold: record the run, or label the page a draft`)
  }

  const all = referencesIn(text).filter((r) => !isPlaceholder(r))
  const tags = new Map<number, Reference[]>()
  for (const r of all) {
    if (r.form === 'tag') tags.set(r.start, [...(tags.get(r.start) ?? []), r])
    else if (r.form === 'fact') {
      if (ctx.facts.has(r.id)) facts.add(r.id)
      else error('fact-unknown', `{{fact:${r.id}}} names no fact in content/registry/facts.json`)
    } else {
      // {{run:...}}
      if (!RUN_ID.test(r.id)) {
        error('run-id', `{{run:${r.id}}} is not a run ID (RUN-{kebab})`)
        continue
      }
      if (!ctx.registeredRun(r.id)) error('run-unregistered', `${r.id} is not a run ID of the spine's registry (section 9.5)`)
      const record = ctx.runs.get(r.id)
      if (r.path === null) {
        if (record === undefined) wait(r.id, `{{run:${r.id}}}`)
        else runs.add(r.id)
        continue
      }
      if (record === undefined) {
        wait(r.id, `{{run:${r.id}#${r.path}}}`)
        continue
      }
      const value = resolvePath(record, r.path)
      if (isPrintable(value)) {
        runs.add(r.id)
        edits.push({ start: r.start, end: r.end, replacement: renderValue(value) })
      } else {
        const hint = isArchitectureSpelling(r.path) ? ` (run@1 keeps values at values.<name>, so write ${r.path.replace('outputs.values.', 'values.')})` : ''
        error('run-value', `{{run:${r.id}#${r.path}}} does not name one printable value: the record has ${describe(value)} there${value === undefined ? whereItBreaks(record, r.path) : ''}${hint}`)
      }
    }
  }
  for (const [start, items] of tags) {
    const first = items[0] as Reference
    const ids = [...new Set(items.map((i) => i.id))]
    const missing = ids.filter((id) => !ctx.runs.has(id))
    for (const id of missing) error('run-tag', `[X ${id}] says an executed run is on disk, but runs/${id}.json is missing: record the run, or write {{run:${id}}} until it is recorded`)
    for (const item of items) {
      if (item.path === null || !ctx.runs.has(item.id)) continue
      if (resolvePath(ctx.runs.get(item.id), item.path) === undefined) error('run-value', `[X ${item.id}#${item.path}]: the record has nothing at ${item.path}${whereItBreaks(ctx.runs.get(item.id), item.path)}`)
    }
    for (const id of ids) if (!ctx.registeredRun(id)) error('run-unregistered', `${id} is not a run ID of the spine's registry (section 9.5)`)
    if (missing.length === 0) {
      for (const id of ids) runs.add(id)
      edits.push({ start, end: first.end, replacement: ids.map((id) => `{{run:${id}}}`).join('') })
    }
  }

  let out = text
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.replacement + out.slice(e.end)
  return { text: out, runs: [...runs].sort(), facts: [...facts].sort(), unresolved: [...unresolved].sort(), problems }
}

/** The IDs of every run a text cites by any form, whether or not runs/ holds it: what a revision hashes. */
export function citedRuns(text: string): string[] {
  const ids = new Set<string>()
  for (const r of referencesIn(text)) {
    if (r.form === 'fact' || isPlaceholder(r)) continue
    if (RUN_ID.test(r.id)) ids.add(r.id)
  }
  return [...ids].sort()
}

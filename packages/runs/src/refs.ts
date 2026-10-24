// Run and fact references in a piece of text: the grammar that GATE-facts reads and the site's content
// compiler resolves (ARCHITECTURE.md sections 9.2 and 18, item 14; runs/README.md section 4).
//
//   [X RUN-id]              a citation in a document: an executed run on disk
//   [X RUN-id#path]         a value tag: its sentence states the value at path in the record
//   {{run:RUN-id}}          a citation in copy: renders as a run chip
//   {{run:RUN-id#path}}     a value reference: prints the value at path, so the value is generated, not typed
//   {{fact:id}}             a fact reference: prints a dated fact from content/registry/facts.json
//
// One tag may hold several items, [X RUN-a, RUN-b#values.x]. A path is dotted (values.distinct_states.w2),
// and a number indexes a list (configs.0.argv). run@1 keeps named values at the top level of a record, so a
// value path starts values.<name>; ARCHITECTURE.md writes outputs.values.<name>, the spine's camelCase shape,
// which names nothing in a run@1 record.
//
// GATE-runs (scripts/verify-runs.mjs) reads the same two run forms with the same ID grammar and the same
// placeholders, so the two gates agree on what is a reference. Pure: no I/O.

/** A run ID, RUN-{kebab}. */
export const RUN_ID = /^RUN-[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A fact ID: dotted lowercase segments, at least two (tool.pyodide.latest). Stable once published. */
export const FACT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/

/** IDs that spell a reference's format rather than name a run; exempt in code spans, as in GATE-runs. */
export const PLACEHOLDER_IDS: ReadonlySet<string> = new Set(['ID', 'RUN-id', 'RUN-ID', 'RUN-<id>', 'RUN-…', 'RUN-...', 'RUN-{kebab}', 'RUN-x', 'id'])

export type ReferenceForm = 'tag' | 'template' | 'fact'

export interface Reference {
  /** tag: [X ...]; template: {{run:...}}; fact: {{fact:...}} */
  form: ReferenceForm
  /** the run ID, or the fact ID */
  id: string
  /** the value path after #, or null for a citation */
  path: string | null
  /** offset of the whole reference ([X ...] or {{...}}) in the text, and the offset just past it */
  start: number
  end: number
  /** whether the reference sits in an inline code span */
  inCode: boolean
}

const TAG = /\[X\s+([^\]]*)\]/g
/** One item of a tag: a run ID, optionally #path. A path has no space, comma or semicolon outside parentheses. */
const TAG_ITEM = /RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?:#((?:[^\s,;\]()]|\([^)\s]*\))+))?/g
const TEMPLATE = /\{\{run:([^}#]*)(?:#([^}]*))?\}\}/g
const FACT = /\{\{fact:([^}]*)\}\}/g

/** The inline code spans of a text, as [start, end) ranges. */
export function codeSpans(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const re = /(`+)([\s\S]*?[^`])\1(?!`)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length])
  return ranges
}

/** Every run and fact reference in a text, in order of position. */
export function referencesIn(text: string): Reference[] {
  const code = codeSpans(text)
  const inCode = (at: number): boolean => code.some(([a, b]) => at >= a && at < b)
  const out: Reference[] = []
  for (const m of text.matchAll(TAG)) {
    const start = m.index
    const end = start + m[0].length
    const body = m[1] ?? ''
    for (const item of body.matchAll(TAG_ITEM)) {
      const hash = item[0].indexOf('#')
      out.push({
        form: 'tag',
        id: hash < 0 ? item[0] : item[0].slice(0, hash),
        path: item[1] ?? null,
        start,
        end,
        inCode: inCode(start),
      })
    }
  }
  for (const m of text.matchAll(TEMPLATE)) {
    // The ID is trimmed and the path is not, exactly as GATE-runs reads them (scripts/runs/registry.mjs).
    out.push({ form: 'template', id: (m[1] ?? '').trim(), path: m[2] ?? null, start: m.index, end: m.index + m[0].length, inCode: inCode(m.index) })
  }
  for (const m of text.matchAll(FACT)) {
    out.push({ form: 'fact', id: (m[1] ?? '').trim(), path: null, start: m.index, end: m.index + m[0].length, inCode: inCode(m.index) })
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end)
}

/**
 * Whether a reference names its own format rather than a run or fact: {{run:}} with no ID, the spine's
 * names RUN-id and ID anywhere, the other placeholders in code spans, and a malformed fact ID in a code span.
 */
export function isPlaceholder(ref: Reference): boolean {
  if (ref.form === 'fact') return ref.inCode && !FACT_ID.test(ref.id)
  if (ref.form === 'template' && ref.id === '') return true
  if (ref.id === 'RUN-id' || ref.id === 'ID') return true
  return ref.inCode && PLACEHOLDER_IDS.has(ref.id)
}

/** The text with every reference replaced by spaces of the same length, so offsets keep their meaning. */
export function maskReferences(text: string, refs: readonly Reference[] = referencesIn(text)): string {
  let out = text
  for (const r of refs) out = out.slice(0, r.start) + ' '.repeat(r.end - r.start) + out.slice(r.end)
  return out
}

/** The ARCHITECTURE.md spelling of a value path, which run@1 does not have. */
export const ARCHITECTURE_VALUE_PREFIX = 'outputs.values.'

/** Whether a path uses the ARCHITECTURE.md spelling outputs.values.<name>; run@1 writes values.<name>. */
export const isArchitectureSpelling = (path: string): boolean => path.startsWith(ARCHITECTURE_VALUE_PREFIX)

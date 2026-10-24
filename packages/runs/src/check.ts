// The checks of GATE-facts on one unit of a document or of learner copy: a sentence, a list item, a table row
// or a heading (spine section 11.2; ARCHITECTURE.md sections 9.2, 9.3 and 18, item 14). scripts/verify-facts.mjs
// cuts files into units with GATE-numbers' rules, so both gates read the same sentences, and does the I/O.
//
// A sentence is tagged as tool behavior when it names a value inside a run record:
//   value tag        [X RUN-id#path]: the sentence states the value at path. It must name a value a reader can
//                    read, and the sentence must state it (values.ts says what "states" means). This is how a
//                    document, read as plain text, types a value and still has it checked.
//   value reference  {{run:RUN-id#path}}: prints the value, so it cannot disagree; it must name a value a reader
//                    can read. A reference to a run that is not recorded yet waits (GATE-runs decides when that
//                    fails).
// In learner copy, wherever a sentence prints a value it uses the value form: a unit that carries a run
// reference (its own, or one that covers it under GATE-numbers' rules) may not type a run's output (a count,
// a measure, a model value, an exit code, a SQLSTATE, a verdict or a version) unless a value tag of the same
// unit states it. Flags and budgets are inputs, not outputs, and stay typed.
//
// A value tag sits inside the sentence it checks, before the full stop: after it, GATE-numbers' splitter makes
// the tag a sentence of its own, which states nothing. In copy, a finding names the value reference that would
// print the typed value, or says that no value of the cited runs equals it.
//
// A citation, [X RUN-id] or {{run:RUN-id}}, names no value, so GATE-facts does not guess which number in the
// sentence it vouches for; GATE-numbers requires the citation and GATE-runs resolves it. (Guessing was measured
// and rejected: scripts/spikes/W0-T08/heuristic-probe.mjs, recorded in RUN-facts-gate.) Pure: no I/O.

import type { Fact } from './facts.ts'
import { FACT_ID, isArchitectureSpelling, isPlaceholder, maskReferences, referencesIn, RUN_ID } from './refs.ts'
import type { Reference } from './refs.ts'
import { describe, findValue, isPrintable, renderValue, resolvePath } from './values.ts'

/** A tool-shaped token as GATE-numbers' tokensOf reports it, with its offset in the unit's text. */
export interface Token {
  kind: string
  key: string
  text: string
  index: number
}

export interface Unit {
  file: string
  /** the unit's first line */
  line: number
  /** the line of an offset inside the unit; defaults to the first line */
  lineOf?: (offset: number) => number
  text: string
  /** learner copy (content/stages/, labs/LAB-*), where values are printed, never typed */
  copy: boolean
  /** whether a run reference covers the unit (its own, a later sentence's in its paragraph, its section's) */
  covered: boolean
  /** GATE-numbers' tool-shaped tokens of the unit */
  tokens: readonly Token[]
}

export interface CheckContext {
  runs: ReadonlyMap<string, unknown>
  facts: ReadonlyMap<string, Fact>
}

export type FindingCheck = 'values' | 'copy' | 'facts'

export interface Finding {
  check: FindingCheck
  file: string
  line: number
  detail: string
}

export interface UnitCounts {
  /** value tags whose sentence states their value */
  valueTags: number
  valueRefs: number
  forwardValueRefs: number
  citations: number
  factRefs: number
  placeholders: number
  copyTokens: number
}

export interface UnitResult {
  findings: Finding[]
  counts: UnitCounts
  /** the fact IDs this unit references, resolved or not */
  factIds: string[]
}

/** The token kinds that are a run's output: in copy they are printed from the record, never typed. */
export const OUTPUT_KINDS: ReadonlySet<string> = new Set(['count', 'measure', 'model', 'exit', 'sqlstate', 'verdict', 'version'])

export const emptyCounts = (): UnitCounts => ({ valueTags: 0, valueRefs: 0, forwardValueRefs: 0, citations: 0, factRefs: 0, placeholders: 0, copyTokens: 0 })

const shown = (ref: Reference): string => (ref.form === 'tag' ? `[X ${ref.id}#${ref.path}]` : `{{run:${ref.id}#${ref.path}}}`)
const clip = (s: string, n = 140): string => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 3)}...` : t
}

/** The value a path names in a record, or the reason it cannot be printed. */
function valueAt(record: unknown, ref: Reference): { ok: true; value: string | number | boolean } | { ok: false; why: string } {
  const path = ref.path as string
  if (isArchitectureSpelling(path)) {
    const name = path.slice('outputs.values.'.length)
    return { ok: false, why: `uses ARCHITECTURE.md's spelling outputs.values; run@1 keeps named values at the top level of the record, so write ${ref.form === 'tag' ? `[X ${ref.id}#values.${name}]` : `{{run:${ref.id}#values.${name}}}`}` }
  }
  const v = resolvePath(record, path)
  if (v === undefined) {
    const parent = path.includes('.') ? resolvePath(record, path.slice(0, path.lastIndexOf('.'))) : record
    const near = parent !== null && typeof parent === 'object' && !Array.isArray(parent) ? `; ${path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : 'the record'} has ${Object.keys(parent).slice(0, 8).join(', ')}` : ''
    return { ok: false, why: `names nothing in runs/${ref.id}.json${near}` }
  }
  if (!isPrintable(v)) {
    const member = v !== null && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v)[0] : Array.isArray(v) ? '0' : undefined
    return { ok: false, why: `names ${describe(v)}, not one value a reader can read${member !== undefined ? `; name a member, such as ${path}.${member}` : ''}` }
  }
  return { ok: true, value: v }
}

/** The printable leaves of a record's version and values, as [path, value]; at most limit of them. */
function leaves(record: unknown, limit = 2000): Array<[string, string | number | boolean]> {
  const out: Array<[string, string | number | boolean]> = []
  if (record === null || typeof record !== 'object') return out
  const r = record as Record<string, unknown>
  if (isPrintable(r.version)) out.push(['version', r.version])
  const walk = (v: unknown, path: string): void => {
    if (out.length >= limit) return
    if (isPrintable(v)) out.push([path, v])
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`))
    else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.includes('.')) walk(x, `${path}.${k}`)
  }
  walk(r.values, 'values')
  return out
}

/** Where the cited runs hold a typed value: the value references that would print it. */
function wherePrinted(text: string, runIds: readonly string[], runs: ReadonlyMap<string, unknown>): string[] {
  const out: string[] = []
  for (const id of runIds) {
    for (const [path, v] of leaves(runs.get(id))) {
      if (findValue(text, v) !== null) out.push(`{{run:${id}#${path}}}`)
      if (out.length >= 3) return out
    }
  }
  return out
}

/** Check one unit. */
export function checkUnit(u: Unit, ctx: CheckContext): UnitResult {
  const findings: Finding[] = []
  const counts = emptyCounts()
  const factIds: string[] = []
  const lineOf = u.lineOf ?? (() => u.line)
  const fail = (check: FindingCheck, at: number, detail: string): void => {
    findings.push({ check, file: u.file, line: lineOf(at), detail })
  }
  const refs = referencesIn(u.text)
  const masked = maskReferences(u.text, refs)
  /** Spans of the text that a value tag shows the sentence states. */
  const stated: Array<[number, number]> = []
  const valueRefPaths = new Set(refs.filter((r) => r.form === 'template' && r.path !== null && !isPlaceholder(r)).map((r) => `${r.id}#${r.path}`))

  for (const ref of refs) {
    if (isPlaceholder(ref)) {
      counts.placeholders += 1
      continue
    }
    if (ref.form === 'fact') {
      factIds.push(ref.id)
      if (!FACT_ID.test(ref.id)) fail('facts', ref.start, `{{fact:${ref.id}}} is not a fact ID (dotted lowercase, such as tool.pyodide.latest)`)
      else if (!ctx.facts.has(ref.id)) fail('facts', ref.start, `{{fact:${ref.id}}} names no fact in content/registry/facts.json`)
      else counts.factRefs += 1
      continue
    }
    if (ref.path === null || ref.path === '') {
      counts.citations += 1
      continue
    }
    if (!RUN_ID.test(ref.id)) continue // a malformed run ID is GATE-runs' finding
    const record = ctx.runs.get(ref.id)
    if (ref.form === 'template') {
      if (record === undefined) {
        counts.forwardValueRefs += 1 // waits for its run; GATE-runs decides when that fails
        continue
      }
      const v = valueAt(record, ref)
      if (!v.ok) fail('values', ref.start, `${shown(ref)} ${v.why}`)
      else counts.valueRefs += 1
      continue
    }
    // A value tag: the sentence states the value at its path.
    if (record === undefined) {
      fail('values', ref.start, `${shown(ref)}: runs/${ref.id}.json is not on disk, so the value the sentence states cannot be checked (a value tag claims an executed run)`)
      continue
    }
    const v = valueAt(record, ref)
    if (!v.ok) {
      fail('values', ref.start, `${shown(ref)} ${v.why}`)
      continue
    }
    if (valueRefPaths.has(`${ref.id}#${ref.path}`)) {
      counts.valueTags += 1 // the unit prints the same value with a value reference
      continue
    }
    const at = findValue(masked, v.value)
    if (at !== null) {
      counts.valueTags += 1
      stated.push([at.index, at.index + at.length])
      continue
    }
    if (!/[\p{L}\p{N}]/u.test(masked)) {
      // GATE-numbers' sentences end at a full stop, so a tag after it stands alone.
      fail('values', ref.start, `${shown(ref)} stands alone after its sentence's full stop, so no sentence states ${renderValue(v.value)}: put the tag inside the sentence it checks, before the full stop`)
      continue
    }
    const typed = u.tokens.filter((t) => OUTPUT_KINDS.has(t.kind)).map((t) => t.text.trim())
    fail(
      'values',
      ref.start,
      `the sentence does not state ${ref.id}#${ref.path}, which is ${renderValue(v.value)}${typed.length > 0 ? `; it states ${typed.slice(0, 4).map((t) => JSON.stringify(t)).join(', ')}` : ''}: "${clip(u.text)}"`,
    )
  }

  // Learner copy prints run values; it never types them.
  if (u.copy && u.covered) {
    const cited = [...new Set(refs.filter((r) => r.form !== 'fact' && !isPlaceholder(r) && ctx.runs.has(r.id)).map((r) => r.id))]
    for (const t of u.tokens) {
      if (!OUTPUT_KINDS.has(t.kind)) continue
      counts.copyTokens += 1
      const end = t.index + t.text.length
      if (stated.some(([a, b]) => a < end && b > t.index)) continue
      const typed = JSON.stringify(t.text.trim())
      const where = wherePrinted(t.text, cited, ctx.runs)
      const how =
        where.length > 0
          ? `print it from the record: ${where.join(' or ')}`
          : cited.length > 0
            ? `no value of ${cited.join(', ')} is ${typed}, so check it against the run, then print it with a value reference, {{run:RUN-id#values.<name>}}`
            : 'print it from the record with a value reference, {{run:RUN-id#values.<name>}}'
      fail('copy', t.index, `learner copy types ${typed} (a ${t.kind}) in a sentence about a run; ${how} (ARCHITECTURE.md section 18, item 14): "${clip(u.text)}"`)
    }
  }
  return { findings, counts, factIds }
}

// The pruned records a page carries: the run record as the run chip and the run sheet read it, and the registry
// fact as a printed fact and its badge read it. A field of the wrong type is left out, never repaired: GATE-runs
// and GATE-facts own the records, and the page carries what they hold.

import type { LessonFactSnapshot, LessonRunSnapshot } from '@statespace/schema'

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
const SHA = /^[0-9a-f]{64}$/

/** A run record pruned to the fields of schemas/lesson.schema.json's runSnapshot. */
export function runSnapshot(id: string, record: unknown): LessonRunSnapshot {
  const out: LessonRunSnapshot = { id }
  if (!isObject(record)) return out
  if (isString(record.title)) out.title = record.title
  if (isString(record.engine)) out.engine = record.engine
  if (isString(record.version)) out.version = record.version
  if (record.binary_sha256 === null || (isString(record.binary_sha256) && SHA.test(record.binary_sha256))) out.binary_sha256 = record.binary_sha256 as string | null
  if (record.image === null || isString(record.image)) out.image = record.image as string | null
  const argv = record.argv
  if (argv === null || isStrings(argv) || (Array.isArray(argv) && argv.every(isStrings))) out.argv = argv as string[] | string[][] | null
  if (Array.isArray(record.inputs)) {
    out.inputs = record.inputs.filter(isObject).map((i) => {
      const input: NonNullable<LessonRunSnapshot['inputs']>[number] = {}
      if (isString(i.path)) input.path = i.path
      if (isString(i.url)) input.url = i.url
      if (isString(i.name)) input.name = i.name
      if (isString(i.file)) input.file = i.file
      if (isString(i.sha256) && SHA.test(i.sha256)) input.sha256 = i.sha256
      return input
    })
  }
  if (isObject(record.budget)) out.budget = record.budget
  if (record.started_at === null || isString(record.started_at)) out.started_at = record.started_at as string | null
  if (isString(record.recorded_at)) out.recorded_at = record.recorded_at
  if (record.exit_code === null || isInt(record.exit_code)) out.exit_code = record.exit_code as number | null
  if (isStrings(record.verdict_lines)) out.verdict_lines = record.verdict_lines
  if (isObject(record.values)) out.values = record.values
  if (isInt(record.ttl_days) && record.ttl_days >= 1) out.ttl_days = record.ttl_days
  if (record.origin === 'recorded' || record.origin === 'imported') out.origin = record.origin
  if (isStrings(record.notes)) out.notes = record.notes
  return out
}

const FACT_KINDS = ['tool', 'twin', 'incident', 'paper', 'leaderboard', 'quotation']

/** A registry fact pruned to the fields of schemas/lesson.schema.json's factSnapshot. */
export function factSnapshot(id: string, fact: unknown): LessonFactSnapshot {
  const out: LessonFactSnapshot = { id, kind: 'tool' }
  if (!isObject(fact)) return out
  if (isString(fact.kind) && FACT_KINDS.includes(fact.kind)) out.kind = fact.kind as LessonFactSnapshot['kind']
  if (isString(fact.statement)) out.statement = fact.statement
  if (isString(fact.value) || typeof fact.value === 'number') out.value = fact.value
  if (isString(fact.unit)) out.unit = fact.unit
  if (isObject(fact.source)) {
    const source: NonNullable<LessonFactSnapshot['source']> = {}
    if (isString(fact.source.url)) source.url = fact.source.url
    if (isString(fact.source.title)) source.title = fact.source.title
    out.source = source
  }
  if (isString(fact.checked_at)) out.checked_at = fact.checked_at
  if (isInt(fact.ttl_days) && fact.ttl_days >= 1) out.ttl_days = fact.ttl_days
  if (isString(fact.date)) out.date = fact.date
  if (isString(fact.run)) out.run = fact.run
  if (isString(fact.pin)) out.pin = fact.pin
  return out
}

// Run-sheet data (ARCHITECTURE.md section 9.2): {{run:RUN-id}} renders as a run chip (id, engine and
// version, date) that opens the run sheet (argv, input hashes, outputs, and the command that re-executes the
// run). These functions derive both from a run@1 record; the site renders them. Pure: no I/O, no clock.

import { RUN_ID } from './refs.ts'
import { dateOf, runStaleness } from './facts.ts'

/** The fields of a run@1 record that the chip and the sheet read (schemas/run.schema.json types them all). */
export interface RunLike {
  id: string
  title?: string
  engine?: string
  version?: string
  binary_sha256?: string | null
  image?: string | null
  argv?: string[] | string[][] | null
  inputs?: Array<{ path?: string; url?: string; name?: string; file?: string; sha256?: string }>
  budget?: Record<string, unknown>
  outputs?: Array<{ path?: string; sha256?: string; bytes?: number }>
  verdict_lines?: string[]
  started_at?: string | null
  recorded_at?: string
  ttl_days?: number
  origin?: 'recorded' | 'imported'
}

export interface RunChip {
  id: string
  engine: string
  version: string
  /** the day the run executed, or the day it was recorded when that is unknown */
  date: string | null
  /** "stale since" date for a run with a TTL that has passed, else null */
  staleSince: string | null
}

export interface RunSheet extends RunChip {
  title: string
  image: string | null
  binarySha256: string | null
  /** one list per command, in the order they ran */
  commands: string[][]
  inputs: Array<{ where: string; sha256: string | null }>
  budget: Record<string, unknown>
  outputs: Array<{ path: string; sha256: string | null; bytes: number | null }>
  verdictLines: string[]
  startedAt: string | null
  recordedAt: string | null
  origin: 'recorded' | 'imported'
  ttlDays: number | null
  /** the command that re-executes the run and diffs its outputs (spine section 9.6) */
  rerun: string
}

const isRun = (r: unknown): r is RunLike => r !== null && typeof r === 'object' && typeof (r as RunLike).id === 'string' && RUN_ID.test((r as RunLike).id)

/** The run chip of a record; today decides the "stale since" date of a run with a TTL. */
export function runChip(record: RunLike, today: string): RunChip {
  if (!isRun(record)) throw new Error('runChip needs a run record with a RUN-{kebab} id')
  const s = runStaleness(record, today)
  return {
    id: record.id,
    engine: record.engine ?? 'unknown engine',
    version: record.version ?? 'unknown version',
    date: dateOf(record.started_at) ?? dateOf(record.recorded_at),
    staleSince: s !== null && s.stale ? s.expires : null,
  }
}

/** The run sheet of a record. */
export function runSheet(record: RunLike, today: string): RunSheet {
  const chip = runChip(record, today)
  const argv = record.argv ?? null
  const commands: string[][] = argv === null || argv.length === 0 ? [] : Array.isArray(argv[0]) ? (argv as string[][]) : [argv as string[]]
  return {
    ...chip,
    title: record.title ?? record.id,
    image: record.image ?? null,
    binarySha256: record.binary_sha256 ?? null,
    commands,
    inputs: (record.inputs ?? []).map((i) => ({ where: i.path ?? i.url ?? i.name ?? i.file ?? '(unnamed)', sha256: i.sha256 ?? null })),
    budget: record.budget ?? {},
    outputs: (record.outputs ?? []).filter((o) => typeof o.path === 'string').map((o) => ({ path: o.path as string, sha256: o.sha256 ?? null, bytes: o.bytes ?? null })),
    verdictLines: record.verdict_lines ?? [],
    startedAt: record.started_at ?? null,
    recordedAt: record.recorded_at ?? null,
    origin: record.origin ?? 'recorded',
    ttlDays: typeof record.ttl_days === 'number' ? record.ttl_days : null,
    rerun: `statespace run ${record.id}`,
  }
}

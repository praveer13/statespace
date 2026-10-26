// bundle@1: the export file of SCR-settings (ARCHITECTURE.md section 7.7). It carries the practice events, the
// experiment-seed draws and the working records; the lab mirror is not exported, because the lab repo is its record.
// Reading a bundle treats the file as outside bytes: JSON only, a byte cap, the envelope checked, then every event and
// draw validated again by packages/ledger before anything is merged. Nothing here writes; the store does.
//
// Happy path: the parse runs on this origin with the ledger's own decoder. ARCHITECTURE.md section 18 item 2 moves the
// first parse to the instrument origin (I6); the re-validation below stays either way.

import { decodeLog, LedgerError } from '@statespace/ledger'
import type { DecodeProblem, ExpSeedDraw, LedgerEvent, Log } from '@statespace/ledger'
import type { LedgerStore, WorkingRecord } from './store.ts'
import { LEDGER_DATA_VERSION } from './db.ts'

export const BUNDLE_SCHEMA = 'bundle@1'
/** The working-state key that holds the instant of the last export (or import, which also leaves a copy). */
export const LAST_EXPORT_KEY = 'settings.last-export'
/** WebKit may clear script-written storage after seven days without interaction [webkit7d]. */
export const BACKUP_AFTER_DAYS = 7
/** A bundle larger than this is refused before it is parsed [D]. */
export const BUNDLE_MAX_BYTES = 32 * 1024 * 1024

export interface Bundle {
  readonly schema: typeof BUNDLE_SCHEMA
  readonly schemaVersion: number
  readonly exportedAt: string
  readonly dev: string
  readonly events: readonly LedgerEvent[]
  readonly expSeeds: readonly ExpSeedDraw[]
  readonly working: readonly WorkingRecord[]
}

/** The bundle of everything this browser keeps as practice: the events in fold order, the draws, the working records. */
export async function exportBundle(store: LedgerStore, now: Date = new Date()): Promise<Bundle> {
  const snap = await store.snapshot()
  const working = await store.listWorking()
  return {
    schema: BUNDLE_SCHEMA,
    schemaVersion: LEDGER_DATA_VERSION,
    exportedAt: now.toISOString(),
    dev: snap.dev,
    events: snap.events,
    expSeeds: snap.expSeeds,
    working,
  }
}

/** The file name a download takes: statespace-practice-YYYY-MM-DD.json, in local time. */
export function bundleFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `statespace-practice-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

export interface ReadBundle {
  readonly log: Log
  readonly working: readonly WorkingRecord[]
  readonly problems: readonly DecodeProblem[]
  readonly exportedAt: string | null
  readonly dev: string | null
}

/** A bundle's text to a log and working records, or a LedgerError naming why the file is refused as a whole. */
export function readBundle(text: string): ReadBundle {
  if (text.length > BUNDLE_MAX_BYTES) throw new LedgerError('invalid-log', `the file is larger than ${BUNDLE_MAX_BYTES / 1024 / 1024} MB [D]`)
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new LedgerError('not-json', 'the file is not JSON')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new LedgerError('invalid-log', 'the file is not a statespace bundle')
  const b = value as Record<string, unknown>
  if (b.schema !== BUNDLE_SCHEMA) throw new LedgerError('invalid-log', `the file is not a ${BUNDLE_SCHEMA} bundle`)
  if (typeof b.schemaVersion !== 'number' || !Number.isInteger(b.schemaVersion)) throw new LedgerError('invalid-log', 'the bundle names no schema version')
  if (b.schemaVersion > LEDGER_DATA_VERSION) throw new LedgerError('invalid-log', `the bundle was written by a newer version of the course (schema ${b.schemaVersion}); reload to update, then import it`)
  const decoded = decodeLog({ events: b.events, expSeeds: b.expSeeds ?? [] })
  const working: WorkingRecord[] = []
  const problems: DecodeProblem[] = [...decoded.problems]
  if (b.working !== undefined && !Array.isArray(b.working)) problems.push({ where: '/working', issues: ['working must be an array'] })
  ;((Array.isArray(b.working) ? b.working : []) as unknown[]).forEach((raw, i) => {
    const r = raw as Partial<WorkingRecord> | null
    if (r === null || typeof r !== 'object' || typeof r.key !== 'string' || typeof r.updatedAt !== 'string' || typeof r.dev !== 'string') {
      problems.push({ where: `/working/${i}`, issues: ['a working record has a key, a value, updatedAt and dev'] })
      return
    }
    working.push({ key: r.key, value: r.value, updatedAt: r.updatedAt, dev: r.dev })
  })
  return {
    log: decoded.log,
    working,
    problems,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : null,
    dev: typeof b.dev === 'string' ? b.dev : null,
  }
}

/** Working records an import may join: everything but this device's own last-export mark. */
export function importableWorking(records: readonly WorkingRecord[]): WorkingRecord[] {
  return records.filter((r) => r.key !== LAST_EXPORT_KEY)
}

export interface BackupState {
  /** The last export, or null when this browser has never exported. */
  readonly lastExport: string | null
  /** Events recorded since the last export (all of them when there was none). */
  readonly since: number
  /** True when the card should show: the last export is at least seven days old, or absent, and events exist since. */
  readonly due: boolean
}

/** The backup card's state (ARCHITECTURE.md section 7.8): informational, never a counter shown to the learner. */
export function backupState(events: readonly LedgerEvent[], lastExport: string | null, now: number = Date.now()): BackupState {
  const at = lastExport === null ? Number.NEGATIVE_INFINITY : Date.parse(lastExport)
  const since = events.filter((e) => Date.parse(e.at) > at).length
  const old = lastExport === null || now - at >= BACKUP_AFTER_DAYS * 24 * 60 * 60 * 1000
  return { lastExport, since, due: old && since > 0 }
}

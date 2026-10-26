// The write-ahead outbox (ARCHITECTURE.md section 7.5, item 1): an action's events, and a draw of the
// experiment seed, go to localStorage synchronously, before the IndexedDB commit begins, so a tab that closes
// or crashes mid-commit loses nothing: the next tab to open drains every outbox into IndexedDB. A call is in
// the outbox before its run is sent, so it can never be recorded after its result was seen (M-call-it).
//
// Each tab writes only its own key, statespace.ledger.outbox.<tab id>, so two tabs never rewrite each other's
// entries. Commits are idempotent (the log is a set), so draining an entry that its own tab is still committing
// does no harm. When localStorage is unavailable (blocked site data, a full quota), the outbox reports that it
// is not durable and the caller must await the commit before acting on its result.

import type { ExpSeedDraw, LedgerEvent } from '@statespace/ledger'
import { decodeLog } from '@statespace/ledger'

export const OUTBOX_PREFIX = 'statespace.ledger.outbox.'

export interface OutboxEntry {
  readonly seq: number
  readonly events: readonly LedgerEvent[]
  readonly draws: readonly ExpSeedDraw[]
}

interface OutboxFile {
  readonly v: 1
  readonly entries: readonly OutboxEntry[]
}

/** The entries of one tab's outbox found in storage, already validated, with the raw text they came from. */
export interface FoundOutbox {
  readonly key: string
  readonly raw: string
  readonly entries: readonly OutboxEntry[]
  readonly problems: readonly string[]
}

/** Parse an outbox's text. Every event and draw is validated again: localStorage is shared with other code. */
export function parseOutbox(raw: string): { entries: OutboxEntry[]; problems: string[] } {
  const problems: string[] = []
  let file: unknown
  try {
    file = JSON.parse(raw)
  } catch {
    return { entries: [], problems: ['an outbox is not JSON'] }
  }
  const list = (file as Partial<OutboxFile> | null)?.entries
  if (!Array.isArray(list)) return { entries: [], problems: ['an outbox has no entries list'] }
  const entries: OutboxEntry[] = []
  for (const item of list as unknown[]) {
    const seq = (item as { seq?: unknown } | null)?.seq
    try {
      const decoded = decodeLog({ events: (item as { events?: unknown }).events ?? [], expSeeds: (item as { draws?: unknown }).draws ?? [] })
      for (const p of decoded.problems) problems.push(`outbox entry ${String(seq)}${p.where}: ${p.issues.join('; ')}`)
      entries.push({ seq: typeof seq === 'number' ? seq : -1, events: [...decoded.log.events.values()], draws: [...decoded.log.expSeeds] })
    } catch (e) {
      problems.push(`outbox entry ${String(seq)}: ${(e as Error).message}`)
    }
  }
  return { entries, problems }
}

export class Outbox {
  readonly key: string
  private readonly storage: Storage | null
  private entries: OutboxEntry[] = []
  private seq = 0
  private writable: boolean

  constructor(storage: Storage | null, tabId: string) {
    this.storage = storage
    this.key = `${OUTBOX_PREFIX}${tabId}`
    this.writable = storage !== null
  }

  /** False when the outbox could not be written: the caller must await the commit before acting on its result. */
  get durable(): boolean {
    return this.writable
  }

  /** Write an entry synchronously and return its sequence number. */
  push(events: readonly LedgerEvent[], draws: readonly ExpSeedDraw[] = []): number {
    this.seq += 1
    this.entries.push({ seq: this.seq, events, draws })
    this.flush()
    return this.seq
  }

  /** Remove a committed entry. */
  remove(seq: number): void {
    this.entries = this.entries.filter((e) => e.seq !== seq)
    this.flush()
  }

  private flush(): void {
    if (this.storage === null) return
    try {
      if (this.entries.length === 0) this.storage.removeItem(this.key)
      else {
        this.storage.setItem(this.key, JSON.stringify({ v: 1, entries: this.entries } satisfies OutboxFile))
        this.writable = true // durable again once a pending entry could be written
      }
    } catch {
      if (this.entries.length > 0) this.writable = false
    }
  }

  /** Every tab's outbox in storage, this tab's included. */
  static scan(storage: Storage | null): FoundOutbox[] {
    if (storage === null) return []
    const found: FoundOutbox[] = []
    try {
      const keys: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i)
        if (k !== null && k.startsWith(OUTBOX_PREFIX)) keys.push(k)
      }
      for (const key of keys.sort()) {
        const raw = storage.getItem(key)
        if (raw === null) continue
        const { entries, problems } = parseOutbox(raw)
        found.push({ key, raw, entries, problems })
      }
    } catch {
      return found
    }
    return found
  }

  /** Remove a drained outbox, unless its tab rewrote it since it was read. */
  static removeIfUnchanged(storage: Storage | null, key: string, raw: string): void {
    if (storage === null) return
    try {
      if (storage.getItem(key) === raw) storage.removeItem(key)
    } catch {
      // storage became unavailable; the entries are committed, so a later drain repeats harmlessly
    }
  }
}

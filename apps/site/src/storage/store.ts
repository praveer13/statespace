// The IndexedDB adapter for packages/ledger (ARCHITECTURE.md sections 3.4, 7.4 to 7.7 and 17.3, EventStore).
//
// Write path: an action's events are validated, written to this tab's localStorage outbox synchronously, then
// committed to IndexedDB in one transaction, then announced to the other tabs. Every write is a set union
// under the canonical conflict rule, executed inside one IndexedDB transaction against the database as it is
// at that moment, so a tab that read the log long ago (a stale tab) can never undo another tab's write, and
// double imports and merges converge. Events are never edited; they leave the log only by replace-import,
// undo or reset, and merge, replace-import, undo and reset each write an undo checkpoint first, in the same
// transaction. A profile that holds a newer schema opens read-only and asks for a reload. Nothing here stores
// a learner status: screens derive their views from the log at read time (I2). A keep/kill read is taken
// through readKeepKill, which keeps its learner-zero run record in the same call, and a kept read record is
// never replaced.

import type { EventInput, ExpSeedDraw, LedgerEvent, Log, LogInput, LogSnapshot, MergePreview } from '@statespace/ledger'
import {
  canonicalJson,
  compareCodePoints,
  compareInstants,
  createEvent,
  decodeLog,
  drawFor,
  eventSetDigest,
  LedgerError,
  mergeDraws,
  mergeLogs,
  normalizeEvent,
  orderedEvents,
  previewMerge,
  resolveConflict,
  snapshotOf,
  stampTime,
} from '@statespace/ledger'
import type { ReadInput, ReadOutcome } from '@statespace/ledger/keepkill'
import type { RunRecord } from '@statespace/schema'
import type { ChangeReason, ChannelFactory, LedgerMessage } from './channel.ts'
import { Channel } from './channel.ts'
import { DB_NAME, inTransaction, LEDGER_DATA_VERSION, META, openDatabase, request, STORE } from './db.ts'
import { Outbox } from './outbox.ts'

/** The clock events are stamped from: now, and the UTC offset at that moment in minutes east. */
export interface Clock {
  nowMs(): number
  tzAt(nowMs: number): number
}

export const systemClock: Clock = {
  nowMs: () => Date.now(),
  tzAt: (ms) => -new Date(ms).getTimezoneOffset(),
}

export interface LedgerStoreOptions {
  /** Defaults to the page's indexedDB. */
  readonly indexedDB?: IDBFactory
  /** The outbox's storage; defaults to localStorage, and null runs without an outbox. */
  readonly storage?: Storage | null
  /** Defaults to BroadcastChannel; null runs without cross-tab messages. */
  readonly channel?: ChannelFactory | null
  readonly clock?: Clock
  /** Event and device ids; defaults to crypto.randomUUID(). */
  readonly randomId?: () => string
  /** The experiment seed's source; defaults to crypto.getRandomValues. */
  readonly randomUint32?: () => number
  readonly dbName?: string
  /** This tab's id, which names its outbox key; random by default. */
  readonly tabId?: string
  /** Undo checkpoints kept, newest first; default 5. */
  readonly maxCheckpoints?: number
}

export type ReadOnlyReason = 'newer-schema' | 'version-change'

export interface StoreStatus {
  readonly mode: 'ready' | 'read-only'
  /** Why the store is read-only: a newer schema in this profile, or another tab upgrading it. Either way, reload. */
  readonly reason?: ReadOnlyReason
  /** False when localStorage refused the outbox: await each write before acting on its result. */
  readonly outboxDurable: boolean
  /** False when this tab cannot message the others (no BroadcastChannel). */
  readonly crossTab: boolean
  /** Outbox entries this tab committed for tabs that closed before their commit. */
  readonly drained: number
  /** Records refused while reading outboxes or the database, never trusted. */
  readonly problems: readonly string[]
}

export interface LedgerChange {
  readonly reason: ChangeReason | 'read-only'
  /** True when this tab made the change. */
  readonly local: boolean
}

export type CheckpointReason = 'merge' | 'replace' | 'undo' | 'reset'

export interface CheckpointInfo {
  readonly id: number
  readonly at: string
  readonly reason: CheckpointReason
  readonly events: number
}

interface CheckpointRecord {
  id?: number
  at: string
  reason: CheckpointReason
  /** The log before the operation. */
  before: { events: LedgerEvent[]; expSeeds: ExpSeedDraw[] }
  /** Ids in the log right after the operation: an id outside both sets was appended later, and undo keeps it. */
  afterIds: string[]
  /** Canonical JSON of the draws right after the operation. */
  afterDraws: string[]
}

/** A last-writer-wins record of working state (section 3.4): never evidence. */
export interface WorkingRecord {
  readonly key: string
  readonly value: unknown
  readonly updatedAt: string
  readonly dev: string
}

/** A file of the read-only lab mirror (section 8.3). */
export interface MirrorEntry {
  readonly path: string
  readonly [field: string]: unknown
}

/** The working-state key prefix under which keep/kill read records are kept until exported. */
export const KEEPKILL_READ_PREFIX = 'keepkill-read:'

/** A keep/kill read taken through the store: the log is the store's own, and the read's instant defaults to now. */
export type KeepKillReadRequest = Omit<ReadInput, 'log' | 'at' | 'recordedAt'> & { readonly at?: string }

export interface LedgerStore {
  /** This browser profile's device id, the dev of every event it writes. */
  readonly dev: string
  status(): StoreStatus
  /** Stamp, validate and append one event. The outbox holds it before this returns; the promise settles on commit. */
  record(input: EventInput): Promise<LedgerEvent>
  /** Append events that already carry their envelope. The outbox holds them before this returns. */
  append(events: readonly LedgerEvent[]): Promise<void>
  /** The whole log: events and experiment-seed draws. */
  log(): Promise<Log>
  /** The events in fold order. */
  events(): Promise<LedgerEvent[]>
  /** What an export carries: the device id, the events and the draws. */
  snapshot(): Promise<LogSnapshot & { dev: string }>
  /** The digest of the event set, for memoized derivations. */
  digest(): Promise<string>
  /** What a merge of incoming records would do, without doing it. */
  previewMerge(incoming: LogInput): Promise<MergePreview>
  /** Merge incoming records (set union, the conflict rule); writes an undo checkpoint first. */
  merge(incoming: LogInput): Promise<MergePreview>
  /** Replace the events with incoming ones (draws are kept and joined); writes an undo checkpoint first. */
  replace(incoming: LogInput): Promise<void>
  /** Undo the last merge, replace, reset or undo, keeping events appended since. False when there is nothing to undo. */
  undo(): Promise<boolean>
  /** Remove every event (the experiment-seed draw stays: it is never redrawn); writes an undo checkpoint first. */
  reset(): Promise<void>
  checkpoints(): Promise<CheckpointInfo[]>
  /** Draw expSeed when the comparisons are turned on: refused once a draw or any event exists. */
  drawExpSeed(): Promise<ExpSeedDraw>
  getWorking(key: string): Promise<unknown>
  /** Last writer wins. Refused for a keepkill-read: key, which only recordKeepKillRead writes. */
  setWorking(key: string, value: unknown): Promise<void>
  listWorking(): Promise<WorkingRecord[]>
  /**
   * Join imported working records, the later updatedAt winning (ties to the smaller canonical JSON). A kept
   * keep/kill read record is never replaced: a different one under its key is reported in status().problems.
   */
  importWorking(records: readonly WorkingRecord[]): Promise<void>
  /**
   * Take a keep/kill read of this log (readComparison) and keep its learner-zero run record in the same call:
   * the way a screen takes a read, so every read leaves its record. Refused, with nothing read, when the store
   * is read-only.
   */
  readKeepKill(input: KeepKillReadRequest): Promise<ReadOutcome>
  /**
   * Keep a keep/kill read's learner-zero run record with the working state, under its id, so an export carries
   * it. The same record again changes nothing; a different record under an id already kept is refused, so a
   * read's record is never replaced.
   */
  recordKeepKillRead(record: RunRecord): Promise<void>
  keepKillReads(): Promise<RunRecord[]>
  replaceMirror(entries: readonly MirrorEntry[]): Promise<void>
  getMirror(path: string): Promise<MirrorEntry | undefined>
  listMirror(): Promise<MirrorEntry[]>
  subscribe(listener: (change: LedgerChange) => void): () => void
  close(): void
}

const defaultStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const defaultChannel: ChannelFactory | null =
  typeof BroadcastChannel === 'function' ? (name: string) => new BroadcastChannel(name) as unknown as ReturnType<ChannelFactory> : null

const defaultRandomUint32 = (): number => crypto.getRandomValues(new Uint32Array(1))[0] as number

/** Open the evidence log of this browser profile. */
export async function openLedgerStore(options: LedgerStoreOptions = {}): Promise<LedgerStore> {
  const factory = options.indexedDB ?? globalThis.indexedDB
  if (factory === undefined || factory === null) throw new Error('IndexedDB is not available in this browser')
  const randomId = options.randomId ?? (() => crypto.randomUUID())
  const tabId = options.tabId ?? randomId()
  const opened = await openDatabase(factory, options.dbName ?? DB_NAME, () => undefined)
  const store = new IdbLedgerStore({
    db: opened.db,
    storage: options.storage !== undefined ? options.storage : defaultStorage(),
    channel: options.channel !== undefined ? options.channel : defaultChannel,
    clock: options.clock ?? systemClock,
    randomId,
    randomUint32: options.randomUint32 ?? defaultRandomUint32,
    tabId,
    maxCheckpoints: options.maxCheckpoints ?? 5,
  })
  await store.init(opened.readOnly ? 'newer-schema' : undefined)
  return store
}

interface Deps {
  db: IDBDatabase
  storage: Storage | null
  channel: ChannelFactory | null
  clock: Clock
  randomId: () => string
  randomUint32: () => number
  tabId: string
  maxCheckpoints: number
}

type ExpSeedsRecord = { key: string; draws: ExpSeedDraw[] }
type GenerationRecord = { key: string; n: number }

class IdbLedgerStore implements LedgerStore {
  dev = ''
  private readonly db: IDBDatabase
  private readonly deps: Deps
  private readonly outbox: Outbox
  private readonly channel: Channel
  private readonly listeners = new Set<(change: LedgerChange) => void>()
  private readOnly: ReadOnlyReason | undefined
  private drained = 0
  private readonly problems = new Set<string>()
  private cache: { generation: number; log: Log } | undefined

  constructor(deps: Deps) {
    this.deps = deps
    this.db = deps.db
    this.outbox = new Outbox(deps.storage, deps.tabId)
    this.channel = new Channel(deps.channel, deps.tabId, (m) => this.onMessage(m))
    this.db.onversionchange = () => {
      this.db.close()
      this.becomeReadOnly('version-change')
    }
  }

  async init(readOnly: ReadOnlyReason | undefined): Promise<void> {
    this.readOnly = readOnly
    if (readOnly !== undefined) {
      // A newer schema may have moved or dropped any store: read the device id only if meta is still there.
      const device = this.db.objectStoreNames.contains(STORE.meta)
        ? await inTransaction(this.db, [STORE.meta], 'readonly', (tx) => request(tx.objectStore(STORE.meta).get(META.device))).catch(() => undefined)
        : undefined
      this.dev = (device as { dev?: string } | undefined)?.dev ?? 'read-only'
      return
    }
    const meta = await inTransaction(this.db, [STORE.meta], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE.meta)
      const ledger = (await request(store.get(META.ledger))) as { schemaVersion?: number } | undefined
      if (ledger !== undefined && typeof ledger.schemaVersion === 'number' && ledger.schemaVersion > LEDGER_DATA_VERSION) {
        const device = (await request(store.get(META.device))) as { dev?: string } | undefined
        return { newer: true, dev: device?.dev ?? 'read-only' }
      }
      if (ledger === undefined) store.put({ key: META.ledger, schemaVersion: LEDGER_DATA_VERSION })
      let device = (await request(store.get(META.device))) as { dev?: string } | undefined
      if (device?.dev === undefined) {
        device = { dev: this.deps.randomId() }
        store.put({ key: META.device, dev: device.dev })
      }
      return { newer: false, dev: device.dev as string }
    })
    this.dev = meta.dev
    if (meta.newer) {
      this.readOnly = 'newer-schema'
      return
    }
    await this.drain()
  }

  status(): StoreStatus {
    return {
      mode: this.readOnly === undefined ? 'ready' : 'read-only',
      ...(this.readOnly !== undefined ? { reason: this.readOnly } : {}),
      outboxDurable: this.outbox.durable,
      crossTab: this.channel.connected,
      drained: this.drained,
      problems: [...this.problems],
    }
  }

  subscribe(listener: (change: LedgerChange) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close(): void {
    this.listeners.clear()
    this.channel.close()
    this.db.close()
  }

  // ------------------------------------------------------------------------------------------ writing

  record(input: EventInput): Promise<LedgerEvent> {
    let event: LedgerEvent
    try {
      const nowMs = this.deps.clock.nowMs()
      event = createEvent(input, { id: this.deps.randomId(), nowMs, tz: this.deps.clock.tzAt(nowMs), dev: this.dev })
    } catch (e) {
      return Promise.reject(e)
    }
    return this.append([event]).then(() => event)
  }

  append(events: readonly LedgerEvent[]): Promise<void> {
    if (this.readOnly !== undefined) return Promise.reject(this.readOnlyError())
    let normalized: LedgerEvent[]
    try {
      normalized = events.map((e) => normalizeEvent(e))
    } catch (e) {
      return Promise.reject(e)
    }
    if (normalized.length === 0) return Promise.resolve()
    const seq = this.outbox.push(normalized) // synchronous: the events are durable before this returns
    return this.commit(normalized, []).then(() => {
      this.outbox.remove(seq)
      this.changed('append')
    })
  }

  async drawExpSeed(): Promise<ExpSeedDraw> {
    this.assertWritable()
    const log = await this.log()
    const nowMs = this.deps.clock.nowMs()
    const draw = drawFor(log, { expSeed: this.deps.randomUint32(), nowMs, tz: this.deps.clock.tzAt(nowMs), dev: this.dev })
    const seq = this.outbox.push([], [draw])
    try {
      await inTransaction(this.db, [STORE.events, STORE.meta], 'readwrite', async (tx) => {
        const count = await request(tx.objectStore(STORE.events).count())
        const held = ((await request(tx.objectStore(STORE.meta).get(META.expSeeds))) as ExpSeedsRecord | undefined)?.draws ?? []
        if (held.length > 0) throw new LedgerError('refused', 'expSeed is never redrawn: the log holds a draw already')
        if (count > 0) throw new LedgerError('refused', 'the comparisons can be turned on only before the first event is written')
        tx.objectStore(STORE.meta).put({ key: META.expSeeds, draws: [draw] } satisfies ExpSeedsRecord)
        await this.bump(tx)
      })
    } finally {
      this.outbox.remove(seq)
    }
    this.changed('exp-seed')
    return draw
  }

  /** Put-if-absent under the conflict rule, and join draws: the commit of appends and drained outboxes. */
  private commit(events: readonly LedgerEvent[], draws: readonly ExpSeedDraw[]): Promise<void> {
    return inTransaction(this.db, [STORE.events, STORE.meta], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE.events)
      for (const e of events) {
        const held = (await request(store.get(e.id))) as LedgerEvent | undefined
        if (held === undefined) store.put(e)
        else {
          const winner = resolveConflict(held, e)
          if (winner !== held) store.put(winner)
        }
      }
      if (draws.length > 0) {
        const meta = tx.objectStore(STORE.meta)
        const held = ((await request(meta.get(META.expSeeds))) as ExpSeedsRecord | undefined)?.draws ?? []
        meta.put({ key: META.expSeeds, draws: mergeDraws([...held, ...draws]) } satisfies ExpSeedsRecord)
      }
      await this.bump(tx)
    })
  }

  private async drain(): Promise<void> {
    const found = Outbox.scan(this.deps.storage)
    for (const f of found) for (const p of f.problems) this.problems.add(p)
    const entries = found.flatMap((f) => f.entries)
    if (entries.length > 0) {
      await this.commit(
        entries.flatMap((e) => e.events),
        entries.flatMap((e) => e.draws),
      )
      this.drained += entries.length
    }
    for (const f of found) Outbox.removeIfUnchanged(this.deps.storage, f.key, f.raw)
    if (entries.length > 0) this.changed('append')
  }

  private async bump(tx: IDBTransaction): Promise<void> {
    const meta = tx.objectStore(STORE.meta)
    const g = (await request(meta.get(META.generation))) as GenerationRecord | undefined
    meta.put({ key: META.generation, n: (g?.n ?? 0) + 1 } satisfies GenerationRecord)
  }

  // ------------------------------------------------------------------------------------------ reading

  async log(): Promise<Log> {
    const read = await inTransaction(this.db, [STORE.events, STORE.meta], 'readonly', async (tx) => {
      const meta = tx.objectStore(STORE.meta)
      const generation = ((await request(meta.get(META.generation))) as GenerationRecord | undefined)?.n ?? 0
      if (this.cache !== undefined && this.cache.generation === generation) return { generation, events: null, draws: null }
      const events = (await request(tx.objectStore(STORE.events).getAll())) as unknown[]
      const draws = ((await request(meta.get(META.expSeeds))) as ExpSeedsRecord | undefined)?.draws ?? []
      return { generation, events, draws }
    })
    if (read.events === null && this.cache !== undefined) return this.cache.log
    const decoded = decodeLog({ events: read.events ?? [], expSeeds: read.draws ?? [] })
    for (const p of decoded.problems) this.problems.add(`stored record ${p.where} refused: ${p.issues.join('; ')}`)
    this.cache = { generation: read.generation, log: decoded.log }
    return decoded.log
  }

  async events(): Promise<LedgerEvent[]> {
    return orderedEvents(await this.log())
  }

  async snapshot(): Promise<LogSnapshot & { dev: string }> {
    return { dev: this.dev, ...snapshotOf(await this.log()) }
  }

  async digest(): Promise<string> {
    return eventSetDigest(await this.log())
  }

  async previewMerge(incoming: LogInput): Promise<MergePreview> {
    return previewMerge(await this.log(), incoming)
  }

  // ------------------------------------------------------------------------------------------ merge, replace, undo, reset

  async merge(incoming: LogInput): Promise<MergePreview> {
    this.assertWritable()
    const add = mergeLogs(incoming) // validates every record before anything is written
    const preview = await inTransaction(this.db, [STORE.events, STORE.meta, STORE.checkpoints], 'readwrite', async (tx) => {
      const before = await this.readAll(tx)
      const result = previewMerge(mergeLogs(before), add)
      // (readAll validated every stored record, so mergeLogs(before) cannot throw on a corrupt one.)
      const events = tx.objectStore(STORE.events)
      const held = new Map(before.events.map((e) => [e.id, e]))
      for (const e of add.events.values()) {
        const prior = held.get(e.id)
        const winner = prior === undefined ? e : resolveConflict(prior, e)
        if (winner !== prior) {
          events.put(winner)
          held.set(e.id, winner)
        }
      }
      const draws = mergeDraws([...before.expSeeds, ...add.expSeeds])
      await this.writeCheckpoint(tx, 'merge', before, [...held.keys()], draws)
      tx.objectStore(STORE.meta).put({ key: META.expSeeds, draws } satisfies ExpSeedsRecord)
      await this.bump(tx)
      return result
    })
    this.changed('merge')
    return preview
  }

  async replace(incoming: LogInput): Promise<void> {
    this.assertWritable()
    const next = mergeLogs(incoming)
    await inTransaction(this.db, [STORE.events, STORE.meta, STORE.checkpoints], 'readwrite', async (tx) => {
      const before = await this.readAll(tx)
      const draws = mergeDraws([...before.expSeeds, ...next.expSeeds])
      await this.writeCheckpoint(tx, 'replace', before, [...next.events.keys()], draws)
      const events = tx.objectStore(STORE.events)
      await request(events.clear())
      for (const e of next.events.values()) events.put(e)
      tx.objectStore(STORE.meta).put({ key: META.expSeeds, draws } satisfies ExpSeedsRecord)
      await this.bump(tx)
    })
    this.changed('replace')
  }

  async reset(): Promise<void> {
    this.assertWritable()
    await inTransaction(this.db, [STORE.events, STORE.meta, STORE.checkpoints], 'readwrite', async (tx) => {
      const before = await this.readAll(tx)
      await this.writeCheckpoint(tx, 'reset', before, [], before.expSeeds)
      await request(tx.objectStore(STORE.events).clear())
      await this.bump(tx)
    })
    this.changed('reset')
  }

  async undo(): Promise<boolean> {
    this.assertWritable()
    const undone = await inTransaction(this.db, [STORE.events, STORE.meta, STORE.checkpoints], 'readwrite', async (tx) => {
      const checkpoints = tx.objectStore(STORE.checkpoints)
      const cursor = await request(checkpoints.openCursor(null, 'prev'))
      if (cursor === null) return false
      const top = cursor.value as CheckpointRecord
      const current = await this.readAll(tx)
      // Events appended after the operation (in neither the checkpoint nor the operation's result) are kept.
      const afterIds = new Set(top.afterIds)
      const later = current.events.filter((e) => !afterIds.has(e.id))
      const afterDraws = new Set(top.afterDraws)
      const laterDraws = current.expSeeds.filter((d) => !afterDraws.has(canonicalJson(d)))
      const restored = mergeLogs({ events: top.before.events, expSeeds: top.before.expSeeds }, { events: later, expSeeds: laterDraws })
      checkpoints.delete(top.id as number)
      await this.writeCheckpoint(tx, 'undo', current, [...restored.events.keys()], [...restored.expSeeds])
      const events = tx.objectStore(STORE.events)
      await request(events.clear())
      for (const e of restored.events.values()) events.put(e)
      tx.objectStore(STORE.meta).put({ key: META.expSeeds, draws: [...restored.expSeeds] } satisfies ExpSeedsRecord)
      await this.bump(tx)
      return true
    })
    if (undone) this.changed('undo')
    return undone
  }

  async checkpoints(): Promise<CheckpointInfo[]> {
    const all = await inTransaction(this.db, [STORE.checkpoints], 'readonly', (tx) => request(tx.objectStore(STORE.checkpoints).getAll()))
    return (all as CheckpointRecord[])
      .map((c) => ({ id: c.id as number, at: c.at, reason: c.reason, events: c.before.events.length }))
      .sort((a, b) => b.id - a.id)
  }

  /** The log as the transaction sees it, every record validated again; refused records are reported, never kept. */
  private async readAll(tx: IDBTransaction): Promise<{ events: LedgerEvent[]; expSeeds: ExpSeedDraw[] }> {
    const events = (await request(tx.objectStore(STORE.events).getAll())) as unknown[]
    const expSeeds = ((await request(tx.objectStore(STORE.meta).get(META.expSeeds))) as ExpSeedsRecord | undefined)?.draws ?? []
    const decoded = decodeLog({ events, expSeeds })
    for (const p of decoded.problems) this.problems.add(`stored record ${p.where} refused: ${p.issues.join('; ')}`)
    return { events: [...decoded.log.events.values()], expSeeds: [...decoded.log.expSeeds] }
  }

  private async writeCheckpoint(
    tx: IDBTransaction,
    reason: CheckpointReason,
    before: { events: LedgerEvent[]; expSeeds: ExpSeedDraw[] },
    afterIds: string[],
    afterDraws: readonly ExpSeedDraw[],
  ): Promise<void> {
    const store = tx.objectStore(STORE.checkpoints)
    const record: CheckpointRecord = { at: this.now(), reason, before, afterIds, afterDraws: afterDraws.map((d) => canonicalJson(d)) }
    await request(store.add(record))
    const keys = ((await request(store.getAllKeys())) as number[]).sort((a, b) => a - b)
    for (const k of keys.slice(0, Math.max(0, keys.length - this.deps.maxCheckpoints))) store.delete(k)
  }

  // ------------------------------------------------------------------------------------------ working state and mirror

  async getWorking(key: string): Promise<unknown> {
    const r = await inTransaction(this.db, [STORE.working], 'readonly', (tx) => request(tx.objectStore(STORE.working).get(key)))
    return (r as WorkingRecord | undefined)?.value
  }

  async setWorking(key: string, value: unknown): Promise<void> {
    this.assertWritable()
    if (key.startsWith(KEEPKILL_READ_PREFIX)) throw new LedgerError('refused', `${KEEPKILL_READ_PREFIX} keys hold keep/kill read records, which only recordKeepKillRead writes`)
    const record: WorkingRecord = { key, value: JSON.parse(canonicalJson(value)) as unknown, updatedAt: this.now(), dev: this.dev }
    await inTransaction(this.db, [STORE.working], 'readwrite', async (tx) => {
      tx.objectStore(STORE.working).put(record)
    })
    this.changed('working')
  }

  async listWorking(): Promise<WorkingRecord[]> {
    const all = await inTransaction(this.db, [STORE.working], 'readonly', (tx) => request(tx.objectStore(STORE.working).getAll()))
    return (all as WorkingRecord[]).sort((a, b) => compareCodePoints(a.key, b.key))
  }

  async importWorking(records: readonly WorkingRecord[]): Promise<void> {
    this.assertWritable()
    await inTransaction(this.db, [STORE.working], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE.working)
      for (const r of records) {
        if (typeof r.key !== 'string' || typeof r.updatedAt !== 'string' || typeof r.dev !== 'string') continue
        const next: WorkingRecord = { key: r.key, value: JSON.parse(canonicalJson(r.value)) as unknown, updatedAt: r.updatedAt, dev: r.dev }
        const held = (await request(store.get(r.key))) as WorkingRecord | undefined
        if (held !== undefined && r.key.startsWith(KEEPKILL_READ_PREFIX)) {
          // A read's record is never replaced, whatever its updatedAt says.
          if (canonicalJson(held.value) !== canonicalJson(next.value)) this.problems.add(`imported working record ${r.key} refused: a different keep/kill read record is kept under that id`)
          continue
        }
        if (held === undefined || laterWins(held, next)) store.put(next)
      }
    })
    this.changed('working')
  }

  async readKeepKill(input: KeepKillReadRequest): Promise<ReadOutcome> {
    this.assertWritable() // a read whose record cannot be kept is not taken
    // Loaded on first use, so pages that never take a read do not carry the keep/kill machinery.
    const { readComparison } = await import('@statespace/ledger/keepkill')
    const { at, ...rest } = input
    const outcome = readComparison({ ...rest, at: at ?? this.now(), log: await this.log() })
    await this.recordKeepKillRead(outcome.record)
    return outcome
  }

  async recordKeepKillRead(record: RunRecord): Promise<void> {
    this.assertWritable()
    const key = `${KEEPKILL_READ_PREFIX}${record.id}`
    const value = JSON.parse(canonicalJson(record)) as unknown
    const wrote = await inTransaction(this.db, [STORE.working], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE.working)
      const held = (await request(store.get(key))) as WorkingRecord | undefined
      if (held !== undefined) {
        if (canonicalJson(held.value) === canonicalJson(value)) return false // the same record: nothing to write
        throw new LedgerError('refused', `a different keep/kill read record is kept under ${record.id}; a read's record is never replaced`)
      }
      store.put({ key, value, updatedAt: this.now(), dev: this.dev } satisfies WorkingRecord)
      return true
    })
    if (wrote) this.changed('working')
  }

  async keepKillReads(): Promise<RunRecord[]> {
    return (await this.listWorking()).filter((r) => r.key.startsWith(KEEPKILL_READ_PREFIX)).map((r) => r.value as RunRecord)
  }

  async replaceMirror(entries: readonly MirrorEntry[]): Promise<void> {
    this.assertWritable()
    await inTransaction(this.db, [STORE.mirror], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE.mirror)
      await request(store.clear())
      for (const e of entries) store.put(JSON.parse(canonicalJson(e)) as MirrorEntry)
    })
    this.changed('mirror')
  }

  async getMirror(path: string): Promise<MirrorEntry | undefined> {
    const r = await inTransaction(this.db, [STORE.mirror], 'readonly', (tx) => request(tx.objectStore(STORE.mirror).get(path)))
    return r as MirrorEntry | undefined
  }

  async listMirror(): Promise<MirrorEntry[]> {
    const all = await inTransaction(this.db, [STORE.mirror], 'readonly', (tx) => request(tx.objectStore(STORE.mirror).getAll()))
    return all as MirrorEntry[]
  }

  // ------------------------------------------------------------------------------------------ plumbing

  private now(): string {
    const nowMs = this.deps.clock.nowMs()
    return stampTime(nowMs, this.deps.clock.tzAt(nowMs)).at
  }

  private readOnlyError(): LedgerError {
    return new LedgerError('refused', `the evidence log is read-only (${this.readOnly ?? 'unknown'}): reload the page`)
  }

  private assertWritable(): void {
    if (this.readOnly !== undefined) throw this.readOnlyError()
  }

  private changed(reason: ChangeReason): void {
    this.channel.post({ t: 'changed', reason })
    this.notify({ reason, local: true })
  }

  private notify(change: LedgerChange): void {
    for (const l of this.listeners) {
      try {
        l(change)
      } catch {
        // a listener's failure never breaks the write path
      }
    }
  }

  private onMessage(m: LedgerMessage): void {
    this.cache = undefined
    if (m.t === 'reload') this.becomeReadOnly('version-change')
    else this.notify({ reason: m.reason, local: false })
  }

  private becomeReadOnly(reason: ReadOnlyReason): void {
    if (this.readOnly !== undefined) return
    this.readOnly = reason
    this.notify({ reason: 'read-only', local: false })
  }
}

/** Last writer wins: the later updatedAt, and on equal instants the smaller canonical JSON. */
function laterWins(held: WorkingRecord, next: WorkingRecord): boolean {
  let order: number
  try {
    order = compareInstants(held.updatedAt, next.updatedAt)
  } catch {
    return false // an imported record whose updatedAt is not an instant never replaces a held one
  }
  if (order !== 0) return order < 0
  return compareCodePoints(canonicalJson(next), canonicalJson(held)) < 0
}

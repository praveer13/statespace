// The IndexedDB database `statespace` (ARCHITECTURE.md section 7.4) and promise wrappers for its requests.
// Only apps/site imports the storage adapter (section 17.2); packages/ledger holds the rules it applies.

export const DB_NAME = 'statespace'

/** The IndexedDB version: the stores and indexes below. A higher version in a profile makes this code read-only. */
export const DB_VERSION = 1

/** The data version of the records this code writes, kept in meta under "ledger" (the schema guard, section 7.5). */
export const LEDGER_DATA_VERSION = 1

export const STORE = {
  /** event@1 records keyed by id, indexed on at and on [kind, ref]. */
  events: 'events',
  /** Last-writer-wins records: settings, drafts, the last export time; and keep/kill read records, kept once and never replaced. */
  working: 'working',
  /** The read-only lab mirror, keyed by path, replaced on each lab bundle import. */
  mirror: 'mirror',
  /** Schema version, device id, the experiment-seed draws, the change counter, persistence status. */
  meta: 'meta',
  /** The undo checkpoint written before any merge, replace-import, undo or reset. */
  checkpoints: 'checkpoints',
} as const

export type StoreName = (typeof STORE)[keyof typeof STORE]

/** The meta keys this adapter uses. */
export const META = {
  ledger: 'ledger',
  device: 'device',
  expSeeds: 'exp-seeds',
  generation: 'generation',
} as const

/** Create the stores of version 1. Later versions add their migrations below the first block. */
export function upgrade(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const events = db.createObjectStore(STORE.events, { keyPath: 'id' })
    events.createIndex('at', 'at')
    events.createIndex('kind-ref', ['kind', 'ref'])
    db.createObjectStore(STORE.working, { keyPath: 'key' })
    db.createObjectStore(STORE.mirror, { keyPath: 'path' })
    db.createObjectStore(STORE.meta, { keyPath: 'key' })
    db.createObjectStore(STORE.checkpoints, { keyPath: 'id', autoIncrement: true })
  }
}

/** A request as a promise. Await only IndexedDB requests inside a transaction, or it commits early. */
export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

/** Resolves when the transaction commits; rejects when it aborts or fails. */
export function done(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
  })
}

/**
 * Run a body inside one transaction and resolve with its result once the transaction commits. The body may
 * await requests of this transaction only. A throw aborts the transaction, so nothing it wrote is kept.
 */
export async function inTransaction<T>(
  db: IDBDatabase,
  stores: readonly StoreName[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction([...stores], mode)
  const committed = done(tx)
  let result: T
  try {
    result = await body(tx)
  } catch (e) {
    try {
      tx.abort()
    } catch {
      // already finished
    }
    await committed.catch(() => undefined)
    throw e
  }
  await committed
  return result
}

export type OpenResult = { db: IDBDatabase; readOnly: false } | { db: IDBDatabase; readOnly: true; reason: 'newer-schema' }

/**
 * Open the database at DB_VERSION. When the profile holds a newer version (another deploy upgraded it), open
 * it at its own version for reading only: this code never writes a schema it does not know.
 */
export async function openDatabase(factory: IDBFactory, name: string, onBlocked: () => void): Promise<OpenResult> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(name, DB_VERSION)
      req.onupgradeneeded = (ev) => upgrade(req.result, ev.oldVersion)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('could not open IndexedDB'))
      req.onblocked = () => onBlocked()
    })
    return { db, readOnly: false }
  } catch (e) {
    if ((e as DOMException | null)?.name !== 'VersionError') throw e
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(name)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('could not open IndexedDB'))
    })
    return { db, readOnly: true, reason: 'newer-schema' }
  }
}

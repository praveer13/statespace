// Putting the learner-state fixture into a page (DESIGN.md section 12: one fixture drives the screenshots and the axe runs).
//
// The browser's record is the IndexedDB database `statespace` (ARCHITECTURE.md section 7.4): an `events` store keyed by `id`
// and a read-only `mirror` store keyed by `path`. The app creates and versions that database itself, and its upgrade code
// is its own, so this never creates a store, never opens a version, and never touches `meta`, `working` or `checkpoints`: it
// waits until the app has made the database, then writes the fixture's records into the stores that exist. A page loaded after
// that derives its screens from them, exactly as it would from a learner's own events (I2: status is derived at read time).
//
// Until the event log and its storage exist (W1-T03), the app has no database, and the fixture cannot be applied: that is
// reported, not hidden, and `--require-seed` of the a11y harness turns it into a failure.

import { readFileSync } from 'node:fs'
import type { BrowserContext, Page } from 'playwright-core'

export interface MirrorFile {
  path: string
  kind: 'statement' | 'receipt' | 'claim'
  text?: string
  value?: unknown
  [k: string]: unknown
}

export interface LearnerState {
  format: string
  description: string
  synthetic: boolean
  /** The instant the screens are drawn at (the clock is fixed to it). */
  now: string
  device: string
  events: Record<string, unknown>[]
  mirror: MirrorFile[]
}

export const DEFAULT_FIXTURE = 'tests/fixtures/learner-state.json'

export function loadLearnerState(file: string): LearnerState {
  const doc = JSON.parse(readFileSync(file, 'utf8')) as Partial<LearnerState>
  if (doc.format !== 'learner-state/1' || !Array.isArray(doc.events) || typeof doc.now !== 'string') {
    throw new Error(`${file} is not a learner-state/1 fixture`)
  }
  return { description: '', synthetic: true, device: 'dev-fixture', mirror: [], ...doc } as LearnerState
}

export interface SeedResult {
  applied: boolean
  reason?: string
  /** Records written per store, or why a store was skipped. */
  counts?: Record<string, number | string>
}

/**
 * Fix `Date` to the fixture's instant for every page of a context, before they load, so that "now" is the same in every run.
 * Timers keep running; only what Date reports is fixed, so a page's own code must not wait on Date (this module does not).
 */
export async function freezeClock(context: BrowserContext, state: LearnerState): Promise<void> {
  await context.clock.setFixedTime(new Date(state.now))
}

/**
 * Write the fixture into the app's database. The page must be on the site's origin and must have run the app, so that the
 * database exists; `waitMs` is how long to wait for it.
 */
export async function seedLearnerState(page: Page, state: LearnerState, waitMs = 4000): Promise<SeedResult> {
  return page.evaluate(
    async ({ events, mirror, waitMs: wait }) => {
      const DB = 'statespace'
      // performance.now(), not Date.now(): the clock is fixed to the fixture's instant, and a fixed Date never reaches a deadline
      const deadline = performance.now() + wait
      let found = false
      while (performance.now() < deadline) {
        const known = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : []
        if (known.some((d) => d.name === DB)) {
          found = true
          break
        }
        await new Promise((r) => setTimeout(r, 100))
      }
      if (!found) return { applied: false, reason: `the app has not created an IndexedDB database named ${DB}` }
      const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
        const req = indexedDB.open(DB)
        req.onupgradeneeded = () => {
          req.transaction?.abort() // the database vanished between the check and the open: never create it here
          resolve(null)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      if (!db) return { applied: false, reason: `${DB} was not there to open` }
      const counts: Record<string, number | string> = {}
      try {
        for (const [store, records] of [['events', events], ['mirror', mirror]] as const) {
          if (!db.objectStoreNames.contains(store)) {
            counts[store] = 'the database has no such store'
            continue
          }
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite')
            const os = tx.objectStore(store)
            for (const r of records) os.put(r)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
            tx.onabort = () => reject(tx.error)
          })
          counts[store] = records.length
        }
      } catch (e) {
        return { applied: false, reason: `writing to ${DB} failed: ${e instanceof Error ? e.message : String(e)}`, counts }
      } finally {
        db.close()
      }
      const wrote = Object.values(counts).some((c) => typeof c === 'number')
      return wrote ? { applied: true, counts } : { applied: false, reason: 'none of the expected stores exists', counts }
    },
    { events: state.events, mirror: state.mirror as unknown as Record<string, unknown>[], waitMs },
  )
}

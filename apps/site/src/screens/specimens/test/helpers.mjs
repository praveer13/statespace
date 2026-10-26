// Shared by the specimen cabinet's tests: the repository root, the committed cabinet, and events that are valid event@1
// records, so that a test of the status derivation feeds it what the ledger would hold.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateEvent } from '../../../../../../packages/ledger/src/index.ts'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '../../../../../..')
export const CABINET_FILE = path.join(REPO, 'apps/site/src/screens/specimens/data/cabinet.generated.json')

export const loadCabinet = () => JSON.parse(fs.readFileSync(CABINET_FILE, 'utf8'))
export const entryOf = (id) => {
  const e = loadCabinet().specimens.find((s) => s.record.id === id)
  if (e === undefined) throw new Error(`no ${id} in the cabinet`)
  return e
}

let counter = 0

/**
 * An event@1 record. `at` is written in UTC unless an offset is given, and `day` is the local date the offset gives, as
 * the ledger freezes it. Throws when the record is not valid event@1, so a test never feeds the derivation a record the ledger
 * would refuse.
 */
export function event(fields) {
  const { at = '2026-11-02T08:10:00Z', tz = 0, ...rest } = fields
  counter += 1
  const e = {
    id: `evt-${String(counter).padStart(5, '0')}`,
    v: 1,
    kind: 'call',
    ref: 'call:S1.L0/c1',
    provenance: 'own',
    exposure: 'unseen',
    at,
    tz,
    day: at.slice(0, 10),
    dev: 'dev-test',
    ...rest,
  }
  const issues = validateEvent(e)
  if (issues.length > 0) throw new Error(`not an event@1 record: ${issues.map((i) => `${i.instancePath} ${i.keyword}`).join(', ')}`)
  return e
}

/** A call on a cell of a lesson, the event that mounts a specimen. */
export const call = (lesson, at, extra = {}) => event({ kind: 'call', ref: `call:${lesson}/c1`, at, ...extra })

/** A re-find: a fresh, correct item whose data names the specimen. */
export const refind = (specimen, at, extra = {}) =>
  event({ kind: 'item', ref: 'item:GEN-find-the-witness/t1', at, seed: 123456, ok: true, data: { refind: { specimen } }, ...extra })

/** Deterministic Fisher-Yates over a seed, so the order-independence tests are reproducible. */
export function shuffled(list, seed) {
  const out = [...list]
  let s = seed >>> 0
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

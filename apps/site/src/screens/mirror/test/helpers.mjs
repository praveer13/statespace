// Shared by the Mirror's tests: the repository root, valid event@1 records, and a learner's log built the way the sheet writes it
// (a call with its shape and KC in data.call) and the way an exit item is written (data.exit.lesson).

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateEvent } from '../../../../../../packages/ledger/src/index.ts'
import { callDataOf } from '../../../../../../packages/learner/src/mirror/index.ts'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '../../../../../..')

let counter = 0
const pad = (n, w = 2) => String(n).padStart(w, '0')

export function event(fields) {
  const { at = '2026-11-02T08:10:00Z', tz = 0, ...rest } = fields
  counter += 1
  const e = { id: `evt-${pad(counter, 6)}`, v: 1, kind: 'call', ref: 'call:S1.L2/c1', provenance: 'own', exposure: 'unseen', at, tz, day: at.slice(0, 10), dev: 'dev-test', ...rest }
  const issues = validateEvent(e)
  if (issues.length > 0) throw new Error(`not an event@1 record: ${issues.map((i) => `${i.instancePath} ${i.keyword}`).join(', ')}`)
  return e
}

/** The instant `minutes` after 2026-11-02T08:00:00Z. */
export const minutes = (m) => new Date(Date.UTC(2026, 10, 2, 8, 0) + m * 60_000).toISOString().replace('.000Z', 'Z')

export const KC = 'KC-1.three-answers'

/** The attempt at the exit item of S1.L2, which first teaches KC-1.three-answers: first learning at minute 10. */
export const learned = (at = minutes(10)) => event({ kind: 'item', ref: 'item:GEN-call-it/t1', seed: 7, ok: true, at, data: { exit: { lesson: 'S1.L2' } } })

let questions = 0
/** A call on a question of its own, after first learning, as the sheet writes it. */
export function call({ conf = 'think', ok = true, shape = { form: 'choice', options: 3 }, kc = KC, at, provenance = 'own', exposure = 'unseen', ref } = {}) {
  questions += 1
  return event({ kind: 'call', ref: ref ?? `call:S1.L2/c${questions}`, conf, ok, at: at ?? minutes(20 + (questions % 9000)), provenance, exposure, resp: { picked: 'B' }, data: callDataOf(shape, kc) })
}

/** n calls in one band, `hits` of them right. */
export const inBand = (conf, n, hits, extra = {}) => Array.from({ length: n }, (_, i) => call({ conf, ok: i < hits, ...extra }))

/** A fresh item on a KC, `days` after first learning, as an item event carries its KC. */
export const fresh = (kc, days, ok, extra = {}) =>
  event({ kind: 'item', ref: 'item:GEN-negate-it/t1', seed: 1000 + counter, ok, at: minutes(10 + days * 24 * 60), data: { kc }, ...extra })

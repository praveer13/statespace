// Shared by the Call It tests: the repository root, the fixtures read the way the app reads content (the content build's reader
// for pages, the generator instances as JSON), and valid event@1 records.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateEvent } from '../../../../../../packages/ledger/src/index.ts'
import { itemFromCell, itemFromInstance } from '../items.ts'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '../../../../../..')
export const FIXTURES = path.join(REPO, 'apps/site/src/components/call-it/fixtures')

let parse
/** A fixture page as the content build reads it: its lesson record, or a thrown error naming what the reader found. */
export async function loadPage(id) {
  parse ??= (await import(pathToFileURL(path.join(REPO, 'packages/content/src/build/index.ts')).href)).parsePageSource
  const text = fs.readFileSync(path.join(FIXTURES, 'tree/content/stages/S1', `${id}.md`), 'utf8')
  const r = parse(text)
  if (!r.record) throw new Error(`${id}: the content reader found no record`)
  const errors = (r.problems ?? []).filter((p) => p.severity === 'error' || p.level === 'error')
  if (errors.length > 0) throw new Error(`${id}: ${errors.map((e) => e.message).join('; ')}`)
  return r.record
}

/** Every authored call of the fixture pages as the sheet's items, each with its segment's primary KC. */
export async function authoredItems() {
  const out = []
  for (const id of ['S1.L1', 'S1.L2', 'S1.L3']) {
    const record = await loadPage(id)
    for (const seg of record.segments) {
      for (const block of seg.blocks) {
        if (block.type !== 'instrument' || block.call === undefined) continue
        const item = itemFromCell(block, { lesson: record.id, ...(seg.kcs?.[0] ? { kc: seg.kcs[0] } : {}) })
        if (item) out.push(item)
      }
    }
  }
  return out
}

export const loadInstances = () => JSON.parse(fs.readFileSync(path.join(FIXTURES, 'generated/instances.json'), 'utf8')).entries

/** Every generated fixture as the sheet's items. */
export const generatedItems = () => loadInstances().map((e) => itemFromInstance(e.instance, e.key, e.instanceRef))

let counter = 0

/** An event@1 record; throws when it is not valid, so a test never feeds the code what the ledger would refuse. */
export function event(fields) {
  const { at = '2026-11-02T08:10:00Z', tz = 0, ...rest } = fields
  counter += 1
  const e = { id: `evt-${String(counter).padStart(5, '0')}`, v: 1, kind: 'call', ref: 'call:S1.L1/c1', provenance: 'own', exposure: 'unseen', at, tz, day: at.slice(0, 10), dev: 'dev-test', ...rest }
  const issues = validateEvent(e)
  if (issues.length > 0) throw new Error(`not an event@1 record: ${issues.map((i) => `${i.instancePath} ${i.keyword}`).join(', ')}`)
  return e
}

/** mulberry32, for the property tests: a failing seed reproduces exactly. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const pick = (r, list) => list[Math.floor(r() * list.length)]
export const SEEDS = Array.from({ length: 40 }, (_, i) => (i * 2654435761 + 4242) >>> 0)

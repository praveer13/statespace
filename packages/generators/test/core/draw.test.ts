import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalJson } from '@statespace/ledger'
import { assertInstance, discard, drawInstance, isDiscard, PendingTemplateError, seedSequence } from '../../src/core/index.ts'
import type { Generator, InstanceBase, KeyBase, TemplateSpec } from '../../src/core/index.ts'
import { boxPort, generator as fixture } from '../../src/core/fixture/index.ts'

const gen = fixture as unknown as Generator

/** The fixture with its key discarding the given seeds, as an undecided checker would. */
const discarding = (seeds: Set<number>): Generator => ({ ...gen, key: async (i, p) => (seeds.has(i.seed) ? discard('unknown', 'planted') : gen.key(i, p)) })

test('a draw serves a keyed instance from the drawn seed, the same one every time', async () => {
  const a = await drawInstance(gen, boxPort, { seed: 0x1234, band: 1, template: 't1' })
  const b = await drawInstance(gen, boxPort, { seed: 0x1234, band: 1, template: 't1' })
  assert.equal(a.status, 'drawn')
  assert.equal(b.status, 'drawn')
  if (a.status !== 'drawn' || b.status !== 'drawn') return
  assert.equal(a.seed, b.seed)
  assert.equal(canonicalJson(a.instance), canonicalJson(b.instance))
  assert.ok(!isDiscard(a.key))
  assert.equal(a.instance.seed, a.seed, 'the served instance carries the seed its event records')
})

test('a discarded seed is never served: the draw moves to the next seed of the sequence and records why', async () => {
  const seq = seedSequence(0x2222, 4)
  const r = await drawInstance(discarding(new Set(seq.slice(0, 2))), boxPort, { seed: 0x2222, band: 1, template: 't2' })
  assert.equal(r.status, 'drawn')
  if (r.status !== 'drawn') return
  assert.deepEqual(r.discarded.map((d) => [d.seed, d.cause]), [
    [seq[0], 'unknown'],
    [seq[1], 'unknown'],
  ])
  assert.equal(r.seed, seq[2])
})

test('seeds already in the log are stepped over without a try; a draw that runs out says so', async () => {
  const seq = seedSequence(0x3333, 3)
  const skipped = await drawInstance(gen, boxPort, { seed: 0x3333, band: 1, template: 't1', skip: (s) => s === seq[0] })
  assert.equal(skipped.status === 'drawn' && skipped.seed, seq[1])
  assert.equal(skipped.status === 'drawn' && skipped.discarded.length, 0)
  const all = { ...gen, key: async () => discard('equivalent', 'planted') } as Generator
  const out = await drawInstance(all, boxPort, { seed: 0x3333, band: 1, template: 't1', maxDraws: 3 })
  assert.equal(out.status, 'exhausted')
  assert.equal(out.discarded.length, 3)
  await assert.rejects(drawInstance(gen, boxPort, { seed: 1, band: 1, template: 't1', maxDraws: 0 }), RangeError)
})

test('an instance that does not carry what make() was asked for is a bug, not an item', () => {
  const inst = gen.make(5, 2, 't3')
  assert.doesNotThrow(() => assertInstance(gen, inst, 5, 2, 't3'))
  assert.throws(() => assertInstance(gen, inst, 6, 2, 't3'), /seed/)
  assert.throws(() => assertInstance(gen, { ...inst, band: 1 } as InstanceBase, 5, 2, 't3'), /band 1/)
  const liar: Generator<InstanceBase, KeyBase> = { ...gen, make: (s, b, t) => ({ ...gen.make(s, b, t), seed: s + 1 }) }
  return assert.rejects(drawInstance(liar, boxPort, { seed: 9, band: 1, template: 't1' }), /returned an instance with seed/)
})

test('a pending template is never drawn, and neither is a template the family does not have: no seed is tried', async () => {
  let made = 0
  const counted: Generator = { ...gen, make: (s, b, t) => (made++, gen.make(s, b, t)) }
  const slice: Generator = { ...counted, templates: gen.templates.map((t, i) => (i === 0 ? t : ({ ...t, pending: { engine: 'trace', lands: 'W3-T27' } } as TemplateSpec))) }
  await assert.rejects(drawInstance(slice, boxPort, { seed: 7, band: 2, template: 't2' }), (e: unknown) => e instanceof PendingTemplateError && e.family === 'GEN-fixture' && e.template === 't2')
  await assert.rejects(drawInstance(slice, boxPort, { seed: 7, band: 2, template: 't4' }), (e: unknown) => e instanceof RangeError && /has no template "t4"/.test((e as Error).message))
  assert.equal(made, 0, 'make() was never called for a template that cannot be served')
  const live = await drawInstance(slice, boxPort, { seed: 7, band: 2, template: 't1' })
  assert.equal(live.status, 'drawn', 'the live template of the same family still serves')
})

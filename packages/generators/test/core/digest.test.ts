import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BROWSER_ENGINES, cellOf, CORE_REV, DEFAULT_SAMPLE, DETERMINISM_SCHEMA, determinismProblems, familyDigest, halfOf, sampleSeeds } from '../../src/core/index.ts'
import type { DeterminismRecord, Generator, TemplateSpec } from '../../src/core/index.ts'
import { generator as fixture } from '../../src/core/fixture/index.ts'

const gen = fixture as unknown as Generator

test('the sample: the edges of the seed space, then graded and display seeds, the same for every family', () => {
  const seeds = sampleSeeds()
  assert.equal(new Set(seeds).size, seeds.length)
  for (const edge of [0, 1, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff]) assert.ok(seeds.includes(edge))
  assert.ok(seeds.filter((s) => halfOf(s) === 'graded').length >= DEFAULT_SAMPLE.graded)
  assert.ok(seeds.filter((s) => halfOf(s) === 'display').length >= DEFAULT_SAMPLE.display)
  assert.deepEqual(sampleSeeds(), seeds)
})

test('a family digest covers every template and band, and changes when one instance changes', () => {
  const d = familyDigest(gen)
  assert.equal(d.core, CORE_REV)
  assert.deepEqual(Object.keys(d.cells).sort(), ['t1/b1', 't1/b2', 't1/b3', 't2/b1', 't2/b2', 't2/b3', 't3/b1', 't3/b2', 't3/b3'])
  assert.deepEqual(familyDigest(gen), d)
  const changed = familyDigest({ ...gen, make: (s, b, t) => (s === 1 && b === 2 && t === 't3' ? { ...gen.make(s, b, t), seed: 1, extra: true } : gen.make(s, b, t)) })
  assert.notEqual(changed.digest, d.digest)
  assert.deepEqual(Object.keys(d.cells).filter((c) => d.cells[c] !== changed.cells[c]), [cellOf('t3', 2)])
})

const recordOf = (d: ReturnType<typeof familyDigest>): DeterminismRecord => ({
  schema: DETERMINISM_SCHEMA,
  family: d.family,
  core: d.core,
  sample: DEFAULT_SAMPLE,
  seeds: d.seeds,
  cells: d.cells,
  digest: d.digest,
  engines: [{ engine: 'node', version: '22', digest: d.digest }, ...BROWSER_ENGINES.map((engine) => ({ engine, version: 'x', digest: d.digest }))],
  run: 'RUN-generators-gate',
})

test('a recorded digest agrees only when the instances, the core and all three browsers agree', () => {
  const d = familyDigest(gen)
  const good = recordOf(d)
  assert.deepEqual(determinismProblems(good, d), [])
  assert.match(determinismProblems(undefined, d).join(), /no determinism.json/)
  assert.match(determinismProblems({ ...good, core: 'generators-core@0' }, d).join(), /re-record/)
  assert.match(determinismProblems({ ...good, digest: 'sha256:0', cells: { ...good.cells, 't2/b1': 'sha256:0' } }, d).join(), /instances changed since they were recorded \(t2\/b1\)/)
  assert.match(determinismProblems({ ...good, engines: good.engines.filter((e) => e.engine !== 'firefox') }, d).join(), /no firefox digest/)
  assert.match(determinismProblems({ ...good, engines: good.engines.map((e) => (e.engine === 'webkit' ? { ...e, digest: 'sha256:1' } : e)) }, d).join(), /webkit computed sha256:1/)
  assert.match(determinismProblems({ ...good, sample: { graded: 1, display: 1 } }, d).join(), /another sample/)
  assert.match(determinismProblems({ ...good, family: 'GEN-other' }, d).join(), /for GEN-other/)
})

test('a pending template has no cells: it is never made for the digest, and going live changes the digest', () => {
  const d = familyDigest(gen)
  const asked: string[] = []
  const slice: Generator = {
    ...gen,
    templates: gen.templates.map((t) => (t.id === 't3' ? ({ ...t, pending: { engine: 'history', lands: 'W4-T20' } } as TemplateSpec) : t)),
    make: (s, b, t) => (asked.push(t), gen.make(s, b, t)),
  }
  const p = familyDigest(slice)
  assert.deepEqual(Object.keys(p.cells).sort(), ['t1/b1', 't1/b2', 't1/b3', 't2/b1', 't2/b2', 't2/b3'])
  assert.ok(!asked.includes('t3'), 'make() is never called for a pending template')
  for (const c of Object.keys(p.cells)) assert.equal(p.cells[c], d.cells[c], `${c} is the same instance set either way`)
  assert.notEqual(p.digest, d.digest)
  // A record made while t3 was pending is stale once t3 goes live, and the other way round; both name t3's cells.
  assert.match(determinismProblems(recordOf(p), d).join(), /instances changed since they were recorded \(t3\/b1, t3\/b2, t3\/b3\)/)
  assert.match(determinismProblems(recordOf(d), p).join(), /instances changed since they were recorded \(t3\/b1, t3\/b2, t3\/b3\)/)
})

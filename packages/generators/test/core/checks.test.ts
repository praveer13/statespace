import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  BROWSER_ENGINES,
  checkFamily,
  CORE_REV,
  DEFAULT_SAMPLE,
  DETERMINISM_SCHEMA,
  discard,
  familyDigest,
  genericSamples,
  isDiscard,
} from '../../src/core/index.ts'
import { COPY, gradeItem } from '../../src/core/index.ts'
import type { CheckId, CheckOptions, ChoicePart, Generator, InstanceBase, KeyBase, RegistryView, SampleAnswer, TemplateSpec } from '../../src/core/index.ts'
import { boxPort, fixtureViolates, generator as fixture } from '../../src/core/fixture/index.ts'
import type { FixtureInstance } from '../../src/core/fixture/index.ts'
import { decide } from '../../src/core/fixture/engine.ts'
import { negate } from '../../src/core/fixture/formula.ts'

const gen = fixture as unknown as Generator

function registry(): RegistryView {
  const reg = JSON.parse(readFileSync(new URL('../../../ids/src/registry.json', import.meta.url), 'utf8')) as { entries: { id: string; kind: string; templates?: number }[] }
  const generators = new Map<string, number>()
  const misconceptions = new Set<string>()
  const kcs = new Set<string>()
  for (const e of reg.entries) {
    if (e.kind === 'generator') generators.set(e.id, e.templates ?? 0)
    if (e.kind === 'misconception') misconceptions.add(e.id)
    if (e.kind === 'kc') kcs.add(e.id)
  }
  return { generators, misconceptions, kcs }
}

const REG = registry()
const digest = familyDigest(gen)
const RECORD = {
  schema: DETERMINISM_SCHEMA,
  family: digest.family,
  core: CORE_REV,
  sample: DEFAULT_SAMPLE,
  seeds: digest.seeds,
  cells: digest.cells,
  digest: digest.digest,
  engines: BROWSER_ENGINES.map((engine) => ({ engine, version: 'test', digest: digest.digest })),
  run: 'test',
}
const run = (g: Generator, extra: Partial<CheckOptions> = {}) => checkFamily(g, { port: boxPort, registry: REG, determinism: RECORD, keySeeds: 4, ...extra })
const checksOf = async (g: Generator, extra: Partial<CheckOptions> = {}): Promise<Set<CheckId>> => new Set((await run(g, extra)).findings.map((f) => f.check))

test('the fixture family passes every check, and its stats show keys, discards and graded answers', async () => {
  const r = await run(gen, { keySeeds: 8 })
  assert.deepEqual(r.findings, [])
  assert.ok(r.stats.instances > 600)
  assert.ok(r.stats.keyed > 40)
  assert.ok(r.stats.graded > 200)
  assert.equal(r.stats.engineFree, false)
  assert.equal(r.digest?.digest, digest.digest)
  assert.ok(Object.values(r.stats.discarded).reduce((a, b) => a + b, 0) > 0, 'band 3 discards some seeds, as designed')
})

test('registry: a family the spine does not have, a template count it does not give, unknown tags and KCs', async () => {
  const notFixture = { ...gen, fixture: false }
  assert.match((await run(notFixture)).findings.map((f) => f.message).join(), /GEN-fixture is not a generator family of the spine/)
  const posing = { ...gen, fixture: false, id: 'GEN-negate-it' as const }
  assert.match((await run(posing, { skipDeterminism: true })).findings.map((f) => f.message).join(), /gives GEN-negate-it 4 templates; the family defines 3/)
  const strangeTag = { ...gen, misconceptions: [...gen.misconceptions, 'dp:Q99' as const] }
  assert.ok((await checksOf(strangeTag)).has('registry'))
  const strangeKc = { ...gen, templates: gen.templates.map((t, i) => (i === 0 ? { ...t, kcs: { primary: 'KC-1.no-such-kc' as const, secondary: [] } } : t)) }
  assert.ok((await checksOf(strangeKc)).has('registry'))
  assert.match((await checkFamily(gen, { port: boxPort, determinism: RECORD, keySeeds: 2 })).notes.join(), /no registry given/)
})

test('purity: a counting make, a make that reads the clock under a guard, and an instance that is not plain data', async () => {
  let n = 0
  assert.ok((await checksOf({ ...gen, make: (s, b, t) => ({ ...gen.make(s, b, t), n: ++n }) })).has('purity'))
  assert.ok((await checksOf({ ...gen, make: (s, b, t) => ({ ...gen.make(s, b, t), fn: () => 1 }) as InstanceBase })).has('purity'))
  assert.ok((await checksOf({ ...gen, make: (s, b, t) => ({ ...gen.make(s, b, t), seed: s + 1 }) })).has('purity'))
  assert.ok((await checksOf({ ...gen, make: () => { throw new Error('Math.random was read inside make()') } })).has('purity'))
})

test('shape: options need whys, one reference and declared tags; true/false sets keep 1 to m - 1 truths; constructed parts name their language', async () => {
  const edit = (f: (p: ChoicePart) => InstanceBase['item']['parts']): Generator => ({
    ...gen,
    make: (s, b, t) => {
      const i = gen.make(s, b, t)
      return { ...i, item: { ...i.item, parts: f(i.item.parts[0] as ChoicePart) } }
    },
  })
  const messages = async (g: Generator) => (await run(g, { skipDeterminism: true })).findings.filter((x) => x.check === 'shape').map((x) => x.message).join(' | ')
  assert.match(await messages(edit((p) => [{ ...p, options: p.options.map((o) => ({ ...o, why: '' })) }])), /has no why/)
  assert.match(await messages(edit((p) => [{ ...p, options: p.options.map((o) => ({ ...o, origin: { kind: 'reference' } as const })) }])), /4 reference options/)
  assert.match(await messages(edit((p) => [{ ...p, options: p.options.map((o) => (o.origin.kind === 'mutant' ? { ...o, origin: { ...o.origin, tag: 'dp:Q7' as const } } : o)) }])), /not among the family's misconceptions/)
  assert.match(await messages(edit((p) => [{ ...p, options: p.options.map((o, i) => ({ ...o, id: `X${i}` })) }])), /labeled "X0", not A/)
  assert.match(
    await messages(edit(() => [{ kind: 'multi-tf', id: 'set', prompt: 'True or false?', statements: ['a', 'b'].map((id) => ({ id, text: id, why: 'w', origin: { kind: 'reference' } as const })) }])),
    /2 of 2 statements meant true/,
  )
  assert.match(await messages(edit(() => [{ kind: 'constructed', id: 'w', prompt: 'p', language: { name: '', summary: '' } }])), /names its language/)
})

test('templates and banding: shared shapes and measures outside their band fail', async () => {
  assert.ok((await checksOf({ ...gen, structure: () => 'rel' })).has('templates'))
  assert.ok((await checksOf({ ...gen, measure: (i) => ({ ...gen.measure(i), span: 0 }) })).has('banding'))
  assert.ok((await checksOf({ ...gen, measure: (i) => ({ ...gen.measure(i), depth: 1 }) })).has('banding'))
})

test('determinism: no record, a stale record and an unconfirmed engine fail; the browser harness may skip the comparison', async () => {
  assert.ok((await checksOf(gen, { determinism: undefined })).has('determinism'))
  assert.ok((await checksOf(gen, { determinism: { ...RECORD, digest: 'sha256:0' } })).has('determinism'))
  assert.ok((await checksOf(gen, { determinism: { ...RECORD, engines: RECORD.engines.slice(0, 2) } })).has('determinism'))
  assert.equal((await checksOf(gen, { determinism: undefined, skipDeterminism: true })).has('determinism'), false)
})

test('unknown: a key kept on an undecided checker, a grade given on one, and a missing port all fail', async () => {
  const stubborn: Generator = {
    ...gen,
    key: async (i, p) => {
      await p.run({ engine: 'fixture-box', version: '1', input: { op: 'sat', formula: (i as unknown as { data: { property: unknown } }).data.property, vars: ['a'], span: 1 }, budget: { wallMs: 1 } }).catch(() => null)
      return gen.key(i, boxPort)
    },
  }
  assert.ok((await checksOf(stubborn)).has('unknown'))
  const guesser: Generator = {
    ...gen,
    grade: async (i, a, k, p) => {
      await p.run({ engine: 'fixture-box', version: '1', input: {}, budget: { wallMs: 1 } }).catch(() => null)
      return gen.grade(i, a, k, boxPort)
    },
  }
  assert.ok((await checksOf(guesser)).has('unknown'))
  const noPort = await checkFamily(gen, { registry: REG, determinism: RECORD, keySeeds: 2 })
  assert.match(noPort.findings.map((f) => f.message).join(), /no port over fixture-box/)
})

test('distractors: an untold pair, a witness that does not replay, a key that is not the reference, a rejected reference, a cell that cannot serve', async () => {
  const tamper = (fn: (k: KeyBase, i: InstanceBase) => KeyBase): Generator => ({
    ...gen,
    key: async (i, p) => {
      const k = await gen.key(i, p)
      return isDiscard(k) ? k : fn(k as KeyBase, i)
    },
  })
  const msgs = async (g: Generator) => (await run(g, { skipDeterminism: true })).findings.filter((f) => f.check === 'distractors').map((f) => f.message).join(' | ')
  assert.match(await msgs(tamper((k) => ({ ...k, choices: k.choices.map((c) => ({ ...c, distinctions: c.distinctions.slice(2) })) }))), /no witness tells apart/)
  assert.match(await msgs({ ...gen, replay: () => false }), /does not replay/)
  assert.match(await msgs(tamper((k, i) => ({ ...k, choices: k.choices.map((c) => ({ ...c, answer: (i.item.parts[0] as ChoicePart).options.find((o) => o.id !== c.answer)?.id ?? c.answer })) }))), /the checker keyed/)
  assert.match(await msgs({ ...gen, key: async () => discard('reference-rejected', 'planted') }), /rejected the generator's own reference/)
  assert.match(await msgs({ ...gen, key: async () => discard('vacuous', 'planted') }), /cannot serve an item/)
  assert.match(await msgs(tamper((k) => ({ ...k, engine: 'Box' }))), /not engine@version/)
  assert.match(await msgs(tamper((k) => ({ engine: k.engine, choices: k.choices, statements: k.statements }))), /states no bound/)
})

test('grading: a grader that matches everything, drops the tag, or prints no bound fails', async () => {
  const msgs = async (g: Generator) => (await run(g, { skipDeterminism: true })).findings.filter((f) => f.check === 'grading').map((f) => f.message).join(' | ')
  assert.match(await msgs({ ...gen, grade: async () => ({ ok: true, why: 'w', basis: 'b', bound: 'x' }) }), /graded true, expected false/)
  assert.match(await msgs({ ...gen, grade: async (i, a, k, p) => ({ ...(await gen.grade(i, a, k, p)), misconception: undefined } as never) }), /tagged undefined, expected dp:/)
  assert.match(await msgs({ ...gen, grade: async (i, a, k, p) => { const g = await gen.grade(i, a, k, p); const { bound: _b, ...rest } = g; return rest } }), /prints no bound/)
  assert.match(await msgs({ ...gen, grade: async () => { throw new Error('boom') } }), /grade threw: boom/)
})

test('generic samples: the key, every wrong option, one response outside the options; none for a constructed part', () => {
  const inst = gen.make(3, 1, 't1')
  const key: KeyBase = { engine: 'fixture-box@1', choices: [{ part: 'main', answer: 'A', distinctions: [] }], statements: [] }
  const { samples, constructed } = genericSamples(inst, key)
  assert.equal(constructed, false)
  assert.deepEqual(samples.map((s) => s.expect), ['ok', 'miss', 'miss', 'miss', 'ungraded'])
  const withConstructed = { ...inst, item: { ...inst.item, parts: [...inst.item.parts, { kind: 'constructed' as const, id: 'w', prompt: 'p', language: { name: 'n', summary: 's' } }] } }
  assert.deepEqual(genericSamples(withConstructed, key), { samples: [], constructed: true })
})

test('a family with a constructed part passes when its grader and its sample answers agree', async () => {
  // The fixture plus a second part: write a violating state as name=value pairs, graded by evaluating it.
  const parse = (text: unknown, vars: readonly string[]): Record<string, number> | null => {
    if (typeof text !== 'string') return null
    const s: Record<string, number> = {}
    for (const pair of text.split(',')) {
      const m = /^\s*([a-z])\s*=\s*(-?[0-9]+)\s*$/.exec(pair)
      if (!m) return null
      s[m[1] as string] = Number(m[2])
    }
    return vars.every((v) => v in s) ? s : null
  }
  const stateText = (s: Record<string, number>): string => Object.entries(s).map(([k, v]) => `${k}=${v}`).join(',')
  const withWitness: Generator = {
    ...gen,
    make: (seed, band, t) => {
      const i = gen.make(seed, band, t)
      return { ...i, item: { ...i.item, parts: [...i.item.parts, { kind: 'constructed', id: 'witness', prompt: 'Give a state that violates the requirement.', language: { name: 'state', summary: 'name=value for each variable, comma-separated' } }] } }
    },
    grade: (inst, answer, key) =>
      gradeItem(inst, answer, key, {
        basis: 'the fixture box engine',
        engine: key.engine,
        ...(key.bound === undefined ? {} : { bound: key.bound }),
        constructed: async (part, response) => {
          const fx = inst as unknown as FixtureInstance
          const s = parse(response, fx.data.vars)
          if (s === null) return { part, ok: null, ungraded: 'outside-language', why: COPY.outsideLanguage('name=value for each variable') }
          return fixtureViolates(fx, s) ? { part, ok: true, why: COPY.matched, witness: s } : { part, ok: false, why: COPY.missed, witness: s }
        },
      }),
    samples: (inst, key): SampleAnswer[] => {
      const fx = inst as unknown as FixtureInstance
      const answer = key.choices[0]?.answer as string
      const box = (f: Parameters<typeof decide>[0]['formula']) => decide({ op: 'sat', formula: f, vars: fx.data.vars, span: fx.data.span }, 1_000_000).witness as Record<string, number> | undefined
      const bad = box(negate(fx.data.property))
      const good = box(fx.data.property)
      return [
        ...(bad ? [{ label: 'a violating state', answer: { main: answer, witness: stateText(bad) }, expect: 'ok' as const }] : []),
        ...(good ? [{ label: 'a state that keeps the requirement', answer: { main: answer, witness: stateText(good) }, expect: 'miss' as const }] : []),
        { label: 'text outside the language', answer: { main: answer, witness: 'a lot' }, expect: 'ungraded' },
      ]
    },
  }
  const r = await run(withWitness, { skipDeterminism: true })
  assert.deepEqual(r.findings, [])
  assert.ok(r.stats.graded > 20)
  const { samples: _samples, ...withoutSamples } = withWitness
  const noSamples = await run(withoutSamples, { skipDeterminism: true })
  assert.match(noSamples.findings.map((f) => f.message).join(), /constructed part and the family gives no sample answers/)
})

// GEN-find-the-witness's W1 slice, on the fixture: t1 live, t2 and t3 waiting for engines of later waves. make()
// throws for a pending template, so any check that reached one would fail.
const waitOn = (t: TemplateSpec, engine: string, lands: string): TemplateSpec => ({ ...t, pending: { engine, lands } })
const SLICE: Generator = {
  ...gen,
  templates: [gen.templates[0] as TemplateSpec, waitOn(gen.templates[1] as TemplateSpec, 'trace', 'W3-T27'), waitOn(gen.templates[2] as TemplateSpec, 'history', 'W4-T20')],
  make: (s, b, t) => {
    if (t !== 't1') throw new Error(`make was called for pending template ${t}`)
    return gen.make(s, b, t)
  },
}
const sliceDigest = familyDigest(SLICE)
const SLICE_RECORD = { ...RECORD, cells: sliceDigest.cells, digest: sliceDigest.digest, engines: BROWSER_ENGINES.map((engine) => ({ engine, version: 'test', digest: sliceDigest.digest })) }
const TASKS: RegistryView = { ...REG, tasks: new Set(['W3-T27', 'W4-T20']) }

test('pending: a family with one live template passes, every check skips the pending ones, and the report says when they land', async () => {
  const r = await run(SLICE, { determinism: SLICE_RECORD, registry: TASKS, portEngines: new Set(['fixture-box']) })
  assert.deepEqual(r.findings, [])
  assert.deepEqual(r.pending, [
    { template: 't2', engine: 'trace', lands: 'W3-T27' },
    { template: 't3', engine: 'history', lands: 'W4-T20' },
  ])
  assert.equal(r.stats.instances, (await run(gen)).stats.instances / 3, 'only the live template\'s cells were made')
  assert.ok(r.stats.keyed > 0)
  assert.match(r.notes.join(' | '), /pending: t2 \(negate an implication\) waits for trace, which W3-T27 brings/)
  assert.match(r.notes.join(' | '), /t1 is the only live template; structural variety is checked once a second goes live/)
  assert.equal(r.digest?.digest, sliceDigest.digest)
})

test('pending: a template still pending once its engine has a port fails; without a port inventory the gate says it did not look', async () => {
  const caught = await run(SLICE, { determinism: SLICE_RECORD, portEngines: new Set(['fixture-box', 'history']) })
  assert.deepEqual(caught.findings.map((f) => [f.check, f.message.slice(0, 40)]), [['pending', 't3 is pending on history, but a port for']])
  const blind = await run(SLICE, { determinism: SLICE_RECORD })
  assert.deepEqual(blind.findings, [])
  assert.match(blind.notes.join(' | '), /no port inventory given/)
})

test('pending: the registry counts pending templates toward the spine\'s count and checks the task each lands with', async () => {
  const t4 = waitOn({ ...(gen.templates[0] as TemplateSpec), id: 't4', name: 'a fourth shape' }, 'pairs', 'W4-T28')
  const posing: Generator = { ...gen, fixture: false, id: 'GEN-negate-it', templates: [...gen.templates, t4] }
  const counted = await run(posing, { skipDeterminism: true, registry: { ...TASKS, tasks: new Set(['W4-T28']) } })
  assert.deepEqual(counted.findings.filter((f) => f.check === 'registry'), [], 'three live templates and one pending make the spine\'s four')
  const short = await run({ ...posing, templates: gen.templates.slice(0, 2).concat({ ...t4, id: 't3' }) }, { skipDeterminism: true })
  assert.match(short.findings.map((f) => f.message).join(), /gives GEN-negate-it 4 templates; the family defines 3, 1 of them pending/)
  const unknownTask = await run(SLICE, { determinism: SLICE_RECORD, registry: { ...REG, tasks: new Set(['W3-T27']) } })
  assert.deepEqual(unknownTask.findings.map((f) => [f.check, f.message]), [['registry', 't3: pending until W4-T20, which is not a task of the tracker']])
})

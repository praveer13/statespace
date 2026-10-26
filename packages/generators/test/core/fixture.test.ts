import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDraw } from '@statespace/rng'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, KeyBase, TemplateId } from '../../src/core/index.ts'
import { BOX_ENGINE, BOX_VERSION, boxPort, fixtureClassOf, fixtureSecondWitness, fixtureViolates, generator } from '../../src/core/fixture/index.ts'
import type { FixtureInstance } from '../../src/core/fixture/index.ts'
import { boxSize, decide } from '../../src/core/fixture/engine.ts'
import { and, evaluate, implies, negate, not, or, rel, render, shapeOf, xor } from '../../src/core/fixture/formula.ts'
import type { Formula, Lin } from '../../src/core/fixture/formula.ts'

const lin = (...terms: [string, number][]): Lin => ({ coefs: terms.map(([v, c]) => ({ v, c })), k: 0 })

/** A random formula over a, b, x, with every connective, for the property tests. */
function randomFormula(seed: number, depth = 3): Formula {
  const d = createDraw(seed)
  const go = (n: number): Formula => {
    if (n === 0 || d.chance(1, 3)) return rel(d.pick(['<', '<=', '>', '>=', '=', '!='] as const), lin(['a', d.pick([1, -1, 2])], [d.pick(['b', 'x']), d.pick([1, -1])]), d.int(-2, 2))
    switch (d.below(4)) {
      case 0:
        return not(go(n - 1))
      case 1:
        return and(go(n - 1), go(n - 1))
      case 2:
        return or(go(n - 1), go(n - 1))
      default:
        return implies(go(n - 1), go(n - 1))
    }
  }
  return go(depth)
}

test('negation is exact: negate(f) holds exactly where f fails, on random formulas and states', () => {
  for (let seed = 0; seed < 300; seed++) {
    const f = randomFormula(seed)
    const d = createDraw(seed + 10_000)
    for (let i = 0; i < 20; i++) {
      const s = { a: d.int(-5, 5), b: d.int(-5, 5), x: d.int(-5, 5) }
      assert.equal(evaluate(negate(f), s), !evaluate(f, s), `${render(f)} at ${JSON.stringify(s)}`)
      assert.equal(evaluate(xor(f, negate(f)), s), true)
    }
  }
})

test('the box engine: a sat witness satisfies the formula, unsat means no state of the box does, and a big box is unknown', () => {
  const f = and(rel('>=', lin(['a', 1], ['x', -1]), 0), rel('>', lin(['x', 1]), 2))
  const sat = decide({ op: 'sat', formula: f, vars: ['a', 'x'], span: 3 }, 1000)
  assert.equal(sat.verdict.kind, 'sat')
  assert.equal(evaluate(f, sat.witness as Record<string, number>), true)
  assert.deepEqual(sat.witness, { a: 3, x: 3 }, 'the first satisfying state in lexicographic order')
  const none = decide({ op: 'sat', formula: and(f, rel('<', lin(['a', 1]), 3)), vars: ['a', 'x'], span: 3 }, 1000)
  assert.equal(none.verdict.kind, 'unsat')
  assert.equal(none.stats.n, boxSize(2, 3))
  const big = decide({ op: 'sat', formula: f, vars: ['a', 'b', 'x', 'f'], span: 6 }, 20_000)
  assert.equal(big.verdict.kind, 'unknown')
  assert.match(big.stats.bound ?? '', /in \[−6, 6\]/)
})

test('the box port refuses what it does not run, as the bus would', async () => {
  const q = { op: 'sat', formula: rel('<', lin(['a', 1]), 0), vars: ['a'], span: 1 }
  await assert.rejects(boxPort.run({ engine: 'z3', version: BOX_VERSION, input: q, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'unknown-engine')
  await assert.rejects(boxPort.run({ engine: BOX_ENGINE, version: '2', input: q, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'version-mismatch')
  await assert.rejects(boxPort.run({ engine: BOX_ENGINE, version: BOX_VERSION, input: { op: 'prove' }, budget: { wallMs: 1 } }), (e: { code?: string }) => e.code === 'invalid-input')
})

test('every template and band makes a well-formed instance: four options, one reference, the box as its bound, the measure in band', () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      for (let seed = 0; seed < 40; seed++) {
        const inst = generator.make(seed * 7919, band, t.id)
        const part = inst.item.parts[0] as ChoicePart
        assert.equal(part.options.length, 4)
        assert.equal(part.options.filter((o) => o.origin.kind === 'reference').length, 1)
        assert.match(inst.bound ?? '', /^every state with /)
        const m = generator.measure(inst)
        for (const [axis, [lo, hi]] of Object.entries(t.bands[band])) assert.ok((m[axis] as number) >= lo && (m[axis] as number) <= hi, `${t.id} b${band} ${axis} ${m[axis]}`)
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal(ref?.text, render(negate(inst.data.property)))
      }
    }
  }
})

test('the three templates have three different shapes', () => {
  const shapes = (t: TemplateId) => new Set(BANDS.flatMap((b: Band) => Array.from({ length: 20 }, (_, s) => shapeOf(generator.make(s, b, t).data.property))))
  const [s1, s2, s3] = [shapes('t1'), shapes('t2'), shapes('t3')]
  for (const [x, y] of [
    [s1, s2],
    [s1, s3],
    [s2, s3],
  ] as const) for (const shape of x) assert.ok(!y.has(shape), shape)
})

test('keys come from the box engine: the reference confirmed, a violating state found, every pair of options told apart', async () => {
  let keyed = 0
  for (let seed = 0; seed < 30; seed++) {
    const inst = generator.make(seed, 2, 't2')
    const k = await generator.key(inst, boxPort)
    if (isDiscard(k)) continue
    keyed += 1
    const key = k as KeyBase
    const part = inst.item.parts[0] as ChoicePart
    assert.equal(part.options.find((o) => o.id === key.choices[0]?.answer)?.origin.kind, 'reference')
    for (const d of key.choices[0]?.distinctions ?? []) assert.ok(generator.replay?.(inst, 'main', d.a, d.b, d.witness), `${d.a}/${d.b}`)
    assert.equal(key.engine, `${BOX_ENGINE}@${BOX_VERSION}`)
    assert.equal(key.bound, inst.bound)
  }
  assert.ok(keyed >= 20, `${keyed} of 30 keyed`)
})

test('M-class-hint helpers: the class is the violation set; a second witness differs in every variable and is in the class', async () => {
  let checked = 0
  for (let seed = 0; seed < 20; seed++) {
    const inst: FixtureInstance = generator.make(seed, 1, 't1')
    const first = await boxPort.run<unknown, Record<string, number>>({ engine: BOX_ENGINE, version: BOX_VERSION, input: { op: 'sat', formula: negate(inst.data.property), vars: inst.data.vars, span: inst.data.span }, budget: { wallMs: 1000, maxStates: 20_000 } })
    if (first.verdict.kind !== 'sat' || !first.witness) continue
    assert.match(fixtureClassOf(inst).text, /^every state where /)
    const second = (await fixtureSecondWitness(inst, first.witness, boxPort)) as Record<string, number> | null
    if (second === null) continue
    checked += 1
    assert.ok(fixtureViolates(inst, second), 'the second witness is in the class')
    for (const v of inst.data.vars) assert.notEqual(second[v], first.witness[v], `it differs in ${v}`)
  }
  assert.ok(checked >= 10, `${checked} second witnesses checked`)
  assert.equal(await fixtureSecondWitness(generator.make(1, 1, 't1'), [1, 2] as never, boxPort), null)
})

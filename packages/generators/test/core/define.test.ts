import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  defineGenerator,
  definitionProblems,
  discard,
  discardCause,
  GeneratorDefinitionError,
  isBand,
  isDiscard,
  isPending,
  liveTemplateOf,
  liveTemplates,
  PendingTemplateError,
  pendingTemplates,
  templateOf,
} from '../../src/core/index.ts'
import type { Generator, TemplateSpec } from '../../src/core/index.ts'
import { generator as fixture } from '../../src/core/fixture/index.ts'

const base = fixture as unknown as Generator
const t1 = base.templates[0] as TemplateSpec
const withTemplates = (templates: TemplateSpec[]): Generator => ({ ...base, templates })
const problems = (g: Partial<Generator> & Record<string, unknown>): string[] => definitionProblems({ ...base, ...g } as Generator)

test('the fixture family holds the contract, and defineGenerator freezes what it returns', () => {
  assert.deepEqual(definitionProblems(base), [])
  assert.ok(Object.isFrozen(fixture))
  assert.ok(Object.isFrozen(fixture.templates))
  assert.equal(templateOf(base, 't2').name, 'negate an implication')
  assert.throws(() => templateOf(base, 't4'), RangeError)
})

test('a family has 2 to 4 templates, numbered t1 upward with distinct names', () => {
  assert.match(definitionProblems(withTemplates([t1])).join(), /2 to 4 templates, pending ones included, this one 1/)
  const five = [0, 1, 2, 3, 4].map((i) => ({ ...t1, id: `t${i + 1}`, name: `n${i}` }) as TemplateSpec)
  assert.match(definitionProblems(withTemplates(five)).join(), /this one 5/)
  assert.match(definitionProblems(withTemplates([t1, { ...t1, id: 't3', name: 'other' }])).join(), /template 2 must be t2/)
  assert.match(definitionProblems(withTemplates([t1, { ...t1, id: 't2' }])).join(), /repeats/)
})

test('KC tags: one primary KC and at most two distinct secondary KCs', () => {
  const kcs = (primary: string, secondary: string[]) => withTemplates([{ ...t1, kcs: { primary, secondary } } as TemplateSpec, base.templates[1] as TemplateSpec])
  assert.match(definitionProblems(kcs('KC-x', [])).join(), /primary KC is not a KC ID/)
  assert.match(definitionProblems(kcs('KC-1.a', ['KC-1.b', 'KC-1.c', 'KC-1.d'])).join(), /at most two secondary/)
  assert.match(definitionProblems(kcs('KC-1.a', ['KC-1.a'])).join(), /repeats among the tags/)
})

test('bands 1-3: [min, max] ranges on one set of axes that never fall and always rise somewhere', () => {
  const bands = (b: TemplateSpec['bands']) => definitionProblems(withTemplates([{ ...t1, bands: b }, base.templates[1] as TemplateSpec])).join(' | ')
  const ok = t1.bands
  assert.match(bands({ ...ok, 3: undefined } as unknown as TemplateSpec['bands']), /band 3 has no spec/)
  assert.match(bands({ ...ok, 2: { ...ok[2], variables: [3, 2] } }), /min 3 above max 2/)
  assert.match(bands({ ...ok, 2: { variables: [3, 3] } }), /band 2 constrains variables but band 1 constrains/)
  assert.match(bands({ ...ok, 3: { ...ok[3], variables: [2, 2] } }), /falls below band 2/)
  assert.match(bands({ 1: ok[1], 2: ok[1], 3: ok[3] }), /band 2 asks for nothing more than band 1/)
  assert.match(bands({ 1: {}, 2: {}, 3: {} }), /constrain no axis/)
})

test('engines, misconception keys and functions are checked', () => {
  assert.match(problems({ engines: [] }).join(), /at least one engine/)
  assert.match(problems({ engines: ['Z3'] }).join(), /not an engine name/)
  assert.match(problems({ misconceptions: ['mis:sat-means-holds'] } as never).join(), /not a dp: misconception key/)
  assert.match(problems({ misconceptions: ['dp:Z1', 'dp:Z1'] }).join(), /repeats/)
  assert.match(problems({ make: undefined } as never).join(), /make is not a function/)
  assert.match(problems({ replay: 3 } as never).join(), /replay is not a function/)
  assert.match(problems({ id: 'negate-it' } as never).join(), /not a GEN- ID/)
  assert.match(problems({ title: ' ' }).join(), /title is empty/)
})

test('a malformed template is a problem, never a crash', () => {
  assert.match(definitionProblems(withTemplates([null as never, t1])).join(), /template 1 is not an object/)
  assert.match(definitionProblems(withTemplates([{ ...t1, bands: undefined } as never, base.templates[1] as TemplateSpec])).join(), /band 1 has no spec/)
  assert.match(definitionProblems({ ...base, templates: 'none' } as never).join(), /this one 0/)
})

test('defineGenerator throws one error that lists every problem', () => {
  assert.throws(
    () => defineGenerator({ ...base, engines: [], templates: [t1] }),
    (e: unknown) => e instanceof GeneratorDefinitionError && e.problems.length >= 2,
  )
})

test('discards carry their cause', () => {
  const d = discard('budget', 'rlimit')
  assert.ok(isDiscard(d))
  assert.equal(discardCause(d), 'budget')
  assert.equal(discardCause({ discard: 'no cause' }), undefined)
  assert.equal(isDiscard({ engine: 'z3@5.3.1' }), false)
  assert.equal(isDiscard(null), false)
  assert.ok(isBand(2) && !isBand(4) && !isBand('1'))
})

const waitOn = (t: TemplateSpec, engine: string, lands: string): TemplateSpec => ({ ...t, pending: { engine, lands } })
const [, t2, t3] = base.templates as [TemplateSpec, TemplateSpec, TemplateSpec]

test('pending templates count toward 2 to 4 templates, and at least one template is live', () => {
  // GEN-find-the-witness's W1 slice: the model template live, the others waiting for engines of later waves.
  const slice = withTemplates([t1, waitOn(t2, 'trace', 'W3-T27'), waitOn(t3, 'history', 'W4-T20')])
  assert.deepEqual(definitionProblems(slice), [])
  assert.deepEqual(liveTemplates(slice).map((t) => t.id), ['t1'])
  assert.deepEqual(pendingTemplates(slice).map((t) => [t.id, t.pending.engine, t.pending.lands]), [
    ['t2', 'trace', 'W3-T27'],
    ['t3', 'history', 'W4-T20'],
  ])
  assert.ok(isPending(slice.templates[1] as TemplateSpec) && !isPending(t1))
  // One live template and one pending one is two templates; one live template alone is not enough.
  assert.deepEqual(definitionProblems(withTemplates([t1, waitOn(t2, 'trace', 'W3-T27')])), [])
  assert.match(definitionProblems(withTemplates([waitOn(t1, 'trace', 'W3-T27')])).join(' | '), /2 to 4 templates, pending ones included, this one 1/)
  const allPending = withTemplates([waitOn(t1, 'trace', 'W3-T27'), waitOn(t2, 'history', 'W4-T20')])
  assert.match(definitionProblems(allPending).join(' | '), /every template is pending/)
  // A pending template is declared in full: its name, KC tags and bands are checked like any other.
  assert.match(definitionProblems(withTemplates([t1, { ...waitOn(t2, 'trace', 'W3-T27'), bands: { 1: {}, 2: {}, 3: {} } }])).join(' | '), /t2: the bands constrain no axis/)
})

test('a pending template names an engine the family cannot consult yet and the tracker task it lands with', () => {
  const one = (t: TemplateSpec) => definitionProblems(withTemplates([t1, t]))
  assert.match(one(waitOn(t2, 'Trace', 'W3-T27')).join(), /pending engine "Trace" is not an engine name/)
  assert.match(one(waitOn(t2, 'fixture-box', 'W3-T27')).join(), /pending on fixture-box, which the family lists among its live templates' engines/)
  assert.match(one(waitOn(t2, 'trace', 'soon')).join(), /pending.lands "soon" is not a tracker task ID/)
  assert.match(one(waitOn(t2, 'trace', 'W3-27')).join(), /not a tracker task ID/)
  assert.deepEqual(one(waitOn(t2, 'trace', 'W0-S09')), [], 'a W0 spike is a task too')
  assert.match(one({ ...t2, pending: 'W3-T27' } as unknown as TemplateSpec).join(), /pending must be \{ engine, lands \}/)
  assert.match(one({ ...t2, pending: null } as unknown as TemplateSpec).join(), /pending must be \{ engine, lands \}/)
})

test('defineGenerator freezes a pending template with its pending record, and only live templates can be served', () => {
  const g = defineGenerator({ ...fixture, templates: [t1, waitOn(t2, 'trace', 'W3-T27'), t3] })
  const pending = g.templates[1] as TemplateSpec
  assert.ok(Object.isFrozen(pending) && Object.isFrozen(pending.pending))
  assert.equal(liveTemplateOf(g, 't3').id, 't3')
  assert.throws(() => liveTemplateOf(g, 't4'), (e: unknown) => e instanceof RangeError && !(e instanceof PendingTemplateError))
  assert.throws(
    () => liveTemplateOf(g, 't2'),
    (e: unknown) => e instanceof PendingTemplateError && e.template === 't2' && e.pending.lands === 'W3-T27' && /pending until W3-T27 brings trace/.test(e.message),
  )
})

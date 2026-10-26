import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { GRAPH } from '@statespace/kc'
import ts from 'typescript'
import { checkWhichIsIt, eligibleSets, planWhichIsIt, templatesByPrimaryKc, whichIsItCap } from '../../src/core/index.ts'
import { generator as fixture } from '../../src/core/fixture/index.ts'
import type { GenId, Generator, KcId, TemplateId, TemplateSpec, WhichIsItInput, WhichIsItPlan } from '../../src/core/index.ts'

// The real confusable sets of the KC graph (spine section 4); each KC is served by one or two templates.
const sets = GRAPH.confusableSets
const itemsFor = (kc: KcId): { family: GenId; template: TemplateId }[] =>
  kc.startsWith('KC-1.') ? [{ family: 'GEN-call-it', template: 't1' }, { family: 'GEN-which-stamp', template: 't1' }] : [{ family: 'GEN-which-stamp', template: 't2' }]
const stageNumber = (s: string): number => Number(s.slice(1))

/** A learner in stage `reached` who has met the exit items of `past`. */
function input(past: readonly string[], reached: number, sessionItems: number, seed: number): WhichIsItInput {
  return { sessionItems, sets, pastExit: (kc) => past.includes(kc), stageOpen: (s) => stageNumber(s) <= reached, itemsFor, seed }
}

const SET_A_PAST = ['KC-1.three-answers', 'KC-1.unknown-fails-closed', 'KC-2.axioms-and-trust']

test('the cap is half the session, rounded down; a session too short for two mixed items gets no block', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 11, 12].map(whichIsItCap), [0, 0, 1, 1, 2, 2, 5, 6])
  assert.equal(planWhichIsIt(input(SET_A_PAST, 2, 3, 1)), null)
  assert.throws(() => whichIsItCap(-1), RangeError)
})

test('a set qualifies once it has opened and two of its KCs are past their exit item', () => {
  assert.equal(planWhichIsIt(input(SET_A_PAST, 1, 10, 1)), null, 'set A opens in S2')
  assert.equal(planWhichIsIt(input(['KC-1.three-answers'], 2, 10, 1)), null, 'one KC is not a mix')
  assert.deepEqual(eligibleSets(input(SET_A_PAST, 2, 10, 1)).map((s) => s.set), ['A'])
  assert.deepEqual(eligibleSets(input(SET_A_PAST, 2, 10, 1))[0]?.kcs, ['KC-1.three-answers', 'KC-1.unknown-fails-closed', 'KC-2.axioms-and-trust'])
})

test('a block stays inside one set, mixes KCs past their exit item, never repeats a KC twice running and takes at most half the session', () => {
  // KC-6.differential-testing is in sets A and G; once both are open a block still never crosses them.
  const past = [...SET_A_PAST, 'KC-6.differential-testing', 'KC-9.forward-simulation', 'KC-9.translation-validation', 'KC-5.fairness', 'KC-5.lasso-reading']
  const seen = new Set<string>()
  for (let seed = 0; seed < 200; seed++) {
    for (const n of [4, 9, 12]) {
      const inp = input(past, 9, n, seed)
      const plan = planWhichIsIt(inp) as WhichIsItPlan
      assert.ok(plan, `seed ${seed}`)
      seen.add(plan.set)
      assert.deepEqual(checkWhichIsIt(plan, inp), [], `seed ${seed}, ${n} items`)
      assert.equal(plan.items.length, whichIsItCap(n))
      const members = sets.find((s) => s.id === plan.set)?.kcs ?? []
      for (const it of plan.items) assert.ok(members.includes(it.kc) && past.includes(it.kc))
      for (let i = 1; i < plan.items.length; i++) assert.notEqual(plan.items[i]?.kc, plan.items[i - 1]?.kc)
    }
  }
  assert.ok(seen.size >= 3, `the seed spreads blocks over the qualifying sets (${[...seen].join(', ')})`)
})

test('the plan is a pure function of its input: the same seed gives the same block, and want lowers the count', () => {
  const a = planWhichIsIt(input(SET_A_PAST, 2, 12, 42))
  assert.deepEqual(planWhichIsIt(input(SET_A_PAST, 2, 12, 42)), a)
  assert.equal(planWhichIsIt({ ...input(SET_A_PAST, 2, 12, 42), want: 3 })?.items.length, 3)
  assert.equal(planWhichIsIt({ ...input(SET_A_PAST, 2, 12, 42), want: 99 })?.items.length, 6)
})

test('checkWhichIsIt names every broken rule', () => {
  const ctx = input(SET_A_PAST, 2, 6, 1)
  const item = (kc: string) => ({ kc: kc as KcId, family: 'GEN-call-it' as GenId, template: 't1' as TemplateId })
  const crossing: WhichIsItPlan = { set: 'A', cap: 3, items: [item('KC-1.three-answers'), item('KC-9.tcb')] }
  assert.ok(checkWhichIsIt(crossing, ctx).some((p) => /never crosses sets/.test(p)))
  assert.ok(checkWhichIsIt(crossing, ctx).some((p) => /exit item/.test(p)))
  const long: WhichIsItPlan = { set: 'A', cap: 3, items: [item('KC-1.three-answers'), item('KC-1.unknown-fails-closed'), item('KC-1.three-answers'), item('KC-2.axioms-and-trust')] }
  assert.ok(checkWhichIsIt(long, ctx).some((p) => /exceed half/.test(p)))
  const single: WhichIsItPlan = { set: 'A', cap: 3, items: [item('KC-1.three-answers'), item('KC-1.three-answers')] }
  assert.ok(checkWhichIsIt(single, ctx).some((p) => /at least two KCs/.test(p)))
  assert.ok(checkWhichIsIt({ ...single, set: 'Z' }, ctx)[0]?.includes('not a confusable set'))
  assert.ok(checkWhichIsIt({ set: 'D', cap: 3, items: [item('KC-6.anomaly-isolation'), item('KC-6.compilation-pattern')] }, ctx).some((p) => /opens in S6/.test(p)))
})

test('templatesByPrimaryKc lists each KC\'s templates from the families\' definitions, ready to pass as itemsFor', () => {
  const map = templatesByPrimaryKc([fixture])
  assert.deepEqual(map.get('KC-1.violation-as-sat'), [{ family: 'GEN-fixture', template: 't1' }])
  assert.deepEqual(map.get('KC-1.only-if-direction'), [{ family: 'GEN-fixture', template: 't2' }])
  assert.deepEqual(map.get('KC-1.quantifier-negation'), [{ family: 'GEN-fixture', template: 't3' }])
  assert.equal(map.get('KC-9.tcb'), undefined)
})

test('templatesByPrimaryKc leaves out pending templates, which are never drawn', () => {
  const g = fixture as unknown as Generator
  const slice = { ...g, templates: g.templates.map((t) => (t.id === 't2' ? ({ ...t, pending: { engine: 'trace', lands: 'W3-T27' } } as TemplateSpec) : t)) }
  const map = templatesByPrimaryKc([slice])
  assert.equal(map.get('KC-1.only-if-direction'), undefined)
  assert.deepEqual(map.get('KC-1.violation-as-sat'), [{ family: 'GEN-fixture', template: 't1' }])
  assert.deepEqual(map.get('KC-1.quantifier-negation'), [{ family: 'GEN-fixture', template: 't3' }])
})

test('the planner reads no keep/kill arm: nothing it imports, directly or through the core, is the ledger or the arm readings (spine section 12 item 58)', () => {
  // Walk every core module the planner reaches, type-only imports included; record each import that leaves the core.
  const seen = new Set<string>()
  const ledger: { from: string; typeOnly: boolean }[] = []
  const outside = new Set<string>()
  const walk = (url: URL): void => {
    if (seen.has(url.href)) return
    seen.add(url.href)
    const sf = ts.createSourceFile(url.pathname, readFileSync(url, 'utf8'), ts.ScriptTarget.Latest, true)
    for (const d of sf.statements.filter(ts.isImportDeclaration)) {
      const spec = (d.moduleSpecifier as ts.StringLiteral).text
      if (spec.startsWith('.')) walk(new URL(spec, url))
      else outside.add(spec)
      if (spec.startsWith('@statespace/ledger')) ledger.push({ from: url.pathname.slice(url.pathname.lastIndexOf('/') + 1), typeOnly: d.importClause?.isTypeOnly === true })
    }
  }
  walk(new URL('../../src/core/which-is-it.ts', import.meta.url))
  const reached = [...seen].map((h) => h.slice(h.lastIndexOf('/') + 1))
  assert.ok(!reached.includes('keepkill.ts'), `the planner reaches ${reached.join(', ')}`)
  assert.ok(!reached.some((f) => /^(feedback|class-hint|grade|checks)\.ts$/.test(f)), 'nor any module that reads an arm or a grade')
  assert.deepEqual([...outside].filter((s) => !['@statespace/kc', '@statespace/rng', '@statespace/ledger'].includes(s)), [])
  // The only ledger import reached is types.ts's Json type, which erases at run time.
  assert.deepEqual(ledger, [{ from: 'types.ts', typeOnly: true }])
})

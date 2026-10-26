import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANDS, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, TemplateId } from '../../src/core/index.ts'
import { accessGranted, decide, propertyHolds, runCommand, SPEC_SCOPE_MAX_POINTS, stepPoint } from '../../src/spec-it/engine.ts'
import type { Space, Spec, StepPoint } from '../../src/spec-it/engine.ts'
import { and, arr, evaluate, flag, implies, ixNe, num, rel, render, sub, v } from '../../src/spec-it/formula.ts'
import type { Point } from '../../src/spec-it/formula.ts'
import { generator, ports } from '../../src/spec-it/index.ts'
import type { SpecItInstance, SpecItKey } from '../../src/spec-it/index.ts'
import { grants } from '../../src/spec-it/policy.ts'
import type { Policy, World } from '../../src/spec-it/policy.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]
const pt = (scalars: Record<string, number>, flags: Record<string, boolean> = {}, arrays: Record<string, number[]> = {}, accounts = 0): Point => ({ scalars, flags, arrays, ix: {}, accounts })

test('the property stories read states as the English says, worked by hand', () => {
  // "A transfer is allowed only if the amount is at most the balance."
  const onlyIf = { story: 'only-if', strict: false } as const
  assert.equal(propertyHolds(onlyIf, pt({ a: 1, x: 2 }, { ok: true })), false, 'allowed and not covered breaks it')
  assert.equal(propertyHolds(onlyIf, pt({ a: 1, x: 2 }, { ok: false })), true, 'a refused transfer keeps it')
  assert.equal(propertyHolds(onlyIf, pt({ a: 2, x: 2 }, { ok: true })), true, 'at most includes equal')
  assert.equal(propertyHolds({ story: 'only-if', strict: true }, pt({ a: 2, x: 2 }, { ok: true })), false, 'less than excludes equal')
  // "Every account in credit is backed by a different, unfrozen account holding at least as much."
  const backed = { story: 'backed', strict: false } as const
  assert.equal(propertyHolds(backed, pt({}, {}, { bal: [1, 1, 0], fz: [0, 0, 0] }, 3)), true, 'accounts 1 and 2 back each other')
  assert.equal(propertyHolds(backed, pt({}, {}, { bal: [1, 0, 0], fz: [0, 0, 0] }, 3)), false, 'no other account holds 1')
  assert.equal(propertyHolds(backed, pt({}, {}, { bal: [1, 1, 0], fz: [0, 1, 0] }, 3)), false, 'account 2 is frozen, so account 1 is unbacked')
})

test('formulas evaluate and print as written', () => {
  const f = implies(flag('ok'), rel(v('x'), '<=', v('a')))
  assert.equal(render(f), 'ok → x ≤ a')
  assert.equal(evaluate(f, pt({ a: 0, x: 1 }, { ok: true })), false)
  assert.equal(evaluate(f, pt({ a: 0, x: 1 }, { ok: false })), true)
  const post = and(rel(arr("bal'", 'x'), '=', sub(arr('bal', 'x'), v('amt'))), ixNe('x', 'y'))
  assert.equal(render(post), 'bal′(x) = bal(x) − amt ∧ x ≠ y')
})

test('the S7 policies: the subset reading grants a user on no team and refuses one on two teams (ASSESSMENT.md 4.4)', () => {
  const reference: Policy = [{ head: { p: 'canread', args: ['u', 'd'] }, body: [{ p: 'member', args: ['u', 't'] }, { p: 'owns', args: ['t', 'd'] }] }]
  const subset: Policy = [
    { head: { p: 'gap', args: ['u', 'd'] }, body: [{ p: 'member', args: ['u', 't'] }, { p: 'owns', args: ['t', 'd'], neg: true }] },
    { head: { p: 'canread', args: ['u', 'd'] }, body: [{ p: 'user', args: ['u'] }, { p: 'doc', args: ['d'] }, { p: 'gap', args: ['u', 'd'], neg: true }] },
  ]
  const w = (member: number[], owns: number[]): World => ({ teams: 2, member, owns, shareTeam: [], shareUser: false, revoked: false })
  // W1: u is in t1 and t2, d is in t1: the reference grants, the subset reading denies.
  assert.equal(grants(reference, w([1, 2], [1])), true)
  assert.equal(grants(subset, w([1, 2], [1])), false)
  // W2: u is in no team: the reference denies, the subset reading grants (vacuous truth).
  assert.equal(grants(reference, w([], [1])), false)
  assert.equal(grants(subset, w([], [1])), true)
  // The story's own reading agrees with the reference on both.
  const story = { owners: true, direct: false, revocable: false, teamShare: false }
  assert.equal(accessGranted(story, w([1, 2], [1])), true)
  assert.equal(accessGranted(story, w([], [1])), false)
})

test('Pay: the sequential update leaves the balances alone when x = y', () => {
  const pre: StepPoint = { bal: [1, 0, 1], fields: { count: 0, limit: 1 }, x: 2, y: 2, amt: 2 }
  const run = runCommand({ writes: ['count'] }, pre)
  assert.deepEqual(run.bal, [1, 0, 1])
  assert.deepEqual(run.fields, { count: 1, limit: 1 })
  const moved = runCommand({ writes: [] }, { ...pre, x: 1, y: 3 })
  assert.deepEqual(moved.bal, [-1, 0, 3])
  // The point the formulas read: bal and bal′, count and count′, the parameters.
  const p = stepPoint(3, pre, run)
  assert.equal(p.scalars["count'"], 1)
  assert.deepEqual(p.arrays["bal'"], [1, 0, 1])
})

test('the spec scope: unsat when two specs agree everywhere, sat with a point where they do not', () => {
  const space: Space = { kind: 'box', accounts: 0, dims: [{ kind: 'flag', v: 'ok' }, { kind: 'int', v: 'a', lo: 0, hi: 4 }, { kind: 'int', v: 'x', lo: 0, hi: 4 }] }
  const requirement: Spec = { kind: 'property', req: { story: 'only-if', strict: false } }
  const ref: Spec = { kind: 'formula', f: implies(flag('ok'), rel(v('x'), '<=', v('a'))) }
  const converse: Spec = { kind: 'formula', f: implies(rel(v('x'), '<=', v('a')), flag('ok')) }
  assert.equal(decide({ op: 'differ', space, a: ref, b: requirement }, SPEC_SCOPE_MAX_POINTS).verdict.kind, 'unsat')
  const d = decide({ op: 'differ', space, a: converse, b: requirement }, SPEC_SCOPE_MAX_POINTS)
  assert.equal(d.verdict.kind, 'sat')
  // The first point in order: ok false, a = 0, x = 0: covered, refused, and the converse rejects it.
  assert.deepEqual(d.witness, { ok: false, a: 0, x: 0 })
  assert.equal(decide({ op: 'differ', space, a: ref, b: requirement }, 10).verdict.kind, 'unknown', 'over the budget, no verdict')
  void num
})

test('every cell keys, the key is the reference, it grades ok, and each distractor misses with its tag', async () => {
  for (const t of generator.templates) {
    for (const band of BANDS) {
      let keyed = 0
      for (let seed = 1; seed <= 4; seed++) {
        const inst = generator.make(seed * 104729, band as Band, t.id as TemplateId) as SpecItInstance
        assert.deepEqual(generator.make(seed * 104729, band as Band, t.id as TemplateId), inst, 'make is deterministic')
        const k = await generator.key(inst, port)
        if (isDiscard(k)) continue
        keyed += 1
        const key = k as SpecItKey
        const part = inst.item.parts[0] as ChoicePart
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal(key.choices[0]?.answer, ref?.id, `${t.id} b${band}: the checker confirms the reference`)
        assert.equal((await generator.grade(inst, { main: ref?.id as string }, key, port)).ok, true)
        for (const o of part.options) {
          if (o.origin.kind !== 'mutant') continue
          const g = await generator.grade(inst, { main: o.id }, key, port)
          assert.equal(g.ok, false)
          assert.equal(g.misconception, o.origin.tag)
          assert.ok(g.bound !== undefined && g.bound.length > 0, 'the scope is printed')
        }
      }
      assert.ok(keyed > 0, `${t.id} band ${band} keys some seed`)
    }
  }
})

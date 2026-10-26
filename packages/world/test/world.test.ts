import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWorld, grade, keyOf, PROPOSALS, standingWorld, stateHash, checkCommand, parse } from '../src/index.ts'

const weeks = [
  { k: 1, seed: 0x1234abcd },
  { k: 2, seed: 0x9e3779b9 },
  { k: 3, seed: 7 },
]

test('the standing world conserves credits and is the same on every run', () => {
  const a = standingWorld()
  const b = standingWorld()
  assert.equal(a.hash, b.hash)
  const total = a.state.bals.reduce((t, x) => t + BigInt(x.bal), 0n)
  assert.equal(total, 0n)
})

test('a week replays to the same hash, and week k starts from week k-1', () => {
  const x = buildWorld({ weeks })
  const y = buildWorld({ weeks })
  assert.deepEqual(x.weeks.map((w) => w.run.endHash), y.weeks.map((w) => w.run.endHash))
  for (let i = 1; i < x.weeks.length; i++) assert.equal(x.weeks[i]!.run.startHash, x.weeks[i - 1]!.run.endHash)
  for (const w of x.weeks) for (const s of w.run.steps) assert.deepEqual(s.fired, [], `base traffic fires no rule: step ${s.i} ${s.text}`)
  for (const w of x.weeks) assert.ok(w.incidents.length >= 1 && w.incidents.length <= 3)
})

test('every family member is keyed by the reference to its own truth', () => {
  const world = buildWorld({ weeks: [{ k: 1, seed: 42 }] })
  const run = world.weeks[0]!.run
  for (const f of PROPOSALS) {
    assert.equal(checkCommand(world.standing, run, parse(f.sound.command), f.sound.ruleEdit).verdict, 'admit', `${f.id} sound`)
    assert.notEqual(checkCommand(world.standing, run, parse(f.flawed.command), f.flawed.ruleEdit).verdict, 'admit', `${f.id} flawed`)
  }
})

test('incidents admit only instances whose key matches the member, and the share is seeded', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ k: i + 1, seed: (i * 2654435761) >>> 0, size: 3 }))
  const world = buildWorld({ weeks: many })
  let sound = 0
  let all = 0
  for (const w of world.weeks) {
    for (const inc of w.incidents) {
      const key = keyOf(world, inc)
      assert.equal(key.truth, inc.member)
      if (inc.kind === 'gap') assert.ok(key.bar && !key.bar.naiveMet && key.bar.referenceMet)
      all++
      if (inc.member === 'sound') sound++
    }
  }
  assert.ok(all >= 60)
  assert.ok(sound > 0 && sound < all)
})

test('grading follows the Desk rule', () => {
  const world = buildWorld({ weeks: [{ k: 1, seed: 99, size: 3 }] })
  for (const inc of world.weeks[0]!.incidents) {
    const key = keyOf(world, inc)
    const right = grade(key, { call: key.truth === 'sound' ? 'sound' : 'gap', scenarios: key.answers, named: key.truth === 'sound' ? 'none' : key.acceptable[0]!, lines: key.truth === 'sound' ? [] : [key.loadBearing[0]!] })
    assert.ok(right.ok && right.callMatched && right.restatementRight === right.restatementOf)
  }
})

test('an adopted sound proposal joins the world from the next week', () => {
  const f = PROPOSALS.find((p) => p.id === 'transfer-guard')!
  const world = buildWorld({ weeks: weeks.slice(0, 2), adopted: [{ week: 1, family: f.id }] })
  const t1 = world.weeks[0]!.program.commands.find((c) => c.name === 'Transfer')!
  const t2 = world.weeks[1]!.program.commands.find((c) => c.name === 'Transfer')!
  assert.notDeepEqual(t1.guard, t2.guard)
  assert.ok(world.weeks[1]!.incidents.every((i) => i.kind !== 'proposal' || i.family.id !== f.id))
  void stateHash
})

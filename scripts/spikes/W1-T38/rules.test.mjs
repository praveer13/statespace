import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { failing, runGate } from '../../verify-lessons.mjs'
import { LOCK_PHRASES, PLACES, PRESSURE_PHRASES, REWARD_PHRASES } from './lib/copy.mjs'
import { BOOT, BRIDGE, CORE, RAIL } from './lib/page.mjs'
import { FIXED, NOT_PLANTED, allRules, copyRules, knownRule, ruleCheck } from './lib/rules.mjs'
import { judge } from './lib/self-check.mjs'
import { PLANTS, REPO, envFor, scratchTree } from './helpers.mjs'

const { env } = await envFor()
const all = allRules(env.glossary)
const named = new Set(PLANTS.flatMap((p) => p.rules))

/** Whether the gate, as the modules stand now, catches a plant (in process, as page.test.mjs runs them all). */
async function caught(plant) {
  const dir = scratchTree(REPO)
  try {
    plant.apply(dir, REPO)
    const r = await runGate(dir, { strict: plant.strict === true })
    return judge(plant, failing(r.findings, plant.strict === true).length > 0 ? 1 : 0, r.findings).caught
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** Whether some plant that names one of the rules is missed while `weaken` is applied (it returns its own undo). */
async function missesAPlant(rules, weaken) {
  const plants = PLANTS.filter((p) => p.rules.some((r) => rules.includes(r)))
  assert.ok(plants.length > 0, `no plant names ${rules.join(' or ')}`)
  const undo = weaken()
  try {
    for (const p of plants) if (!(await caught(p))) return true
    return false
  } finally {
    undo()
  }
}

test('every rule of the gate has a plant that names it, but the ones no plant can reach, which say what holds them', () => {
  assert.deepEqual(all.filter((r) => !named.has(r) && !Object.hasOwn(NOT_PLANTED, r)), [])
  for (const [rule, why] of Object.entries(NOT_PLANTED)) {
    assert.ok(all.includes(rule), `${rule} is not a rule`)
    assert.ok(!named.has(rule), `${rule} has a plant, so it is not one no plant can reach`)
    assert.ok(why.length > 40, rule)
  }
})

test('every rule a plant names is a rule of the gate, and every plant names one or more', () => {
  assert.deepEqual([...named].filter((r) => !all.includes(r)), [])
  for (const p of PLANTS) {
    assert.ok(Array.isArray(p.rules) && p.rules.length > 0, p.name)
    assert.equal(p.check, ruleCheck(p.rules[0]), p.name)
  }
  const names = PLANTS.map((p) => p.name)
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), [], 'plant names are unique')
})

test('the copy rules are named from their lists: each phrase, the padlock and the label, each internal name and kind, each place', () => {
  const copy = copyRules(env.glossary)
  for (const p of LOCK_PHRASES) assert.ok(copy.includes(`lock/${p.name}`), p.name)
  for (const p of PRESSURE_PHRASES) assert.ok(copy.includes(`pressure/${p.name}`), p.name)
  for (const p of REWARD_PHRASES) assert.ok(copy.includes(`reward/${p.name}`), p.name)
  for (const x of env.glossary.internal) assert.ok(copy.includes(`internal/${x.name}`), x.name)
  for (const k of env.glossary.internalIds) assert.ok(copy.includes(`internal/id-${k}`), k)
  for (const place of PLACES) assert.ok(copy.includes(`term/${place}`), place)
  assert.ok(copy.includes('lock/padlock') && copy.includes('lock/label') && copy.includes('internal/cross-reference'))
  // a phrase's name is its rule, so two phrases of one list never share a name
  for (const list of [LOCK_PHRASES, PRESSURE_PHRASES, REWARD_PHRASES]) assert.equal(new Set(list.map((p) => p.name)).size, list.length)
  assert.equal(new Set(all).size, all.length)
})

test('a rule ID is <check>/<name>, with one of the gate\'s checks, and only a rule of the registry may raise a finding', () => {
  const checks = new Set(['read', 'front', 'anatomy', 'family', 'rail', 'block-type', 'internal', 'term', 'lock', 'pressure', 'reward', 'drawer', 'generators', 'glossary'])
  for (const r of all) {
    assert.match(r, /^[a-z-]+\/\S/, r)
    assert.ok(checks.has(ruleCheck(r)), r)
    assert.ok(knownRule(r), r)
  }
  for (const [r, what] of Object.entries(FIXED)) assert.ok(what.length > 10, r)
  assert.equal(knownRule('anatomy/no-such-rule'), false)
  assert.equal(knownRule('lock'), false)
})

test('deleting any lock, pressure or reward phrase leaves a plant uncaught, so the self-check fails on it', async () => {
  const unpinned = []
  for (const [check, list] of [['lock', LOCK_PHRASES], ['pressure', PRESSURE_PHRASES], ['reward', REWARD_PHRASES]]) {
    for (let i = 0; i < list.length; i += 1) {
      const rule = `${check}/${list[i].name}`
      const plants = PLANTS.filter((p) => p.rules.includes(rule))
      const [phrase] = list.splice(i, 1)
      try {
        let missed = false
        for (const p of plants) if (!(await caught(p))) missed = true
        if (!missed) unpinned.push(rule)
      } finally {
        list.splice(i, 0, phrase)
      }
    }
  }
  assert.deepEqual(unpinned, [])
})

// The anatomy's and the rail's limits and lists are read when a rule runs (lib/page.mjs), so each can be loosened here the
// way an edit would loosen it. Each end of each range, loosened by one, and each word of each list, taken out, must leave a
// plant missed, which is what --self-check reports: the plants sit one step past each limit and name each word alone.
test('each limit loosened by one at either end, and each word of the rail\'s lists taken out, leaves a plant missed', async () => {
  /** Set obj[key] (or obj[key][i]) to a value for the length of a check. */
  const set = (obj, key, i, value) => () => {
    const holder = i === undefined ? obj : obj[key]
    const at = i === undefined ? key : i
    const before = holder[at]
    holder[at] = value(before)
    return () => {
      holder[at] = before
    }
  }
  const without = (list, word) => () => {
    const i = list.indexOf(word)
    list.splice(i, 1)
    return () => list.splice(i, 0, word)
  }
  const withoutKey = (map, key) => () => {
    const value = map[key]
    delete map[key]
    return () => {
      map[key] = value
    }
  }
  const up = (n) => n + 1
  const down = (n) => n - 1
  const weakenings = [
    ['Boot over 8 minutes', ['anatomy/boot-minutes'], set(BOOT, 'minutes', undefined, up)],
    ['a bridge over 1,000 words', ['anatomy/bridge-words'], set(BRIDGE, 'words', undefined, up)],
    ['fewer than 2 core segments', ['anatomy/core-segments'], set(CORE, 'segments', 0, down)],
    ['more than 4 core segments', ['anatomy/core-segments'], set(CORE, 'segments', 1, up)],
    ['a core segment under 12 minutes', ['anatomy/core-segment-minutes'], set(CORE, 'segmentMinutes', 0, down)],
    ['a core segment over 15 minutes', ['anatomy/core-segment-minutes'], set(CORE, 'segmentMinutes', 1, up)],
    ['a core lesson with no prequestion', ['anatomy/prequestions'], set(CORE, 'prequestions', 0, down)],
    ['a core lesson with three prequestions', ['anatomy/prequestions'], set(CORE, 'prequestions', 1, up)],
    ['a bridge with no prequestion', ['anatomy/prequestions'], set(BRIDGE, 'prequestions', 0, down)],
    ['a bridge with two prequestions', ['anatomy/prequestions'], set(BRIDGE, 'prequestions', 1, up)],
    ['a core lesson planned under 40 minutes', ['anatomy/core-planned'], set(CORE, 'planned', 0, down)],
    ['a core lesson planned over 60 minutes', ['anatomy/core-planned'], set(CORE, 'planned', 1, up)],
    ['a bridge planned under 15 minutes', ['anatomy/bridge-planned'], set(BRIDGE, 'planned', 0, down)],
    ['a bridge planned over 25 minutes', ['anatomy/bridge-planned'], set(BRIDGE, 'planned', 1, up)],
    ['a title of four words inside an option', ['rail/title-in-option', 'rail/built-title-in-option'], set(RAIL, 'titleInOptionWords', undefined, up)],
    ['a verdict in capitals', ['rail/verdict', 'rail/built-verdict'], set(RAIL, 'verdictsInAnyCase', undefined, () => false)],
    ...[...RAIL.verdictWords].map((w) => [`the verdict ${w}`, ['rail/verdict', 'rail/built-verdict'], without(RAIL.verdictWords, w)]),
    ...[...RAIL.stampWords].map((w) => [`the stamp word ${w}`, ['rail/stamp', 'rail/built-stamp'], without(RAIL.stampWords, w)]),
    ...Object.keys(RAIL.numberWords).map((w) => [`the number word ${w}`, ['rail/spelled-number', 'rail/built-spelled-number'], withoutKey(RAIL.numberWords, w)]),
  ]
  const unpinned = []
  for (const [what, rules, weaken] of weakenings) if (!(await missesAPlant(rules, weaken))) unpinned.push(what)
  assert.deepEqual(unpinned, [])
  // and every weakening was undone
  assert.deepEqual([BOOT, BRIDGE, CORE], [{ minutes: 8 }, { words: 1000, prequestions: [1, 1], planned: [15, 25] }, { segments: [2, 4], segmentMinutes: [12, 15], prequestions: [1, 2], planned: [40, 60] }])
  assert.equal(RAIL.titleInOptionWords, 4)
  assert.equal(RAIL.verdictsInAnyCase, true)
  assert.equal(RAIL.verdictWords.length, 5)
  assert.equal(RAIL.stampWords.length, 8)
  assert.equal(Object.keys(RAIL.numberWords).length, 11)
})

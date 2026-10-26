// The keep/kill acceptance: one pure allocation function reproduces RUN-keepkill-rules' vectors for its four
// example seeds (reference: scripts/spikes/W0-T07/keepkill.mjs), the estimates reproduce its interval
// vectors to within 1e-12 and its decisions exactly, and the snapshot the browser applies is the hashed file.

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { render, RULES_PATH as GEN_RULES_PATH, OUT_PATH } from '../scripts/build-rules.ts'
import {
  allocate,
  allocationKey,
  armOf,
  decideCommon,
  decideNote,
  decideWindows,
  firstWindowArm,
  fmix32,
  hash32,
  KC_COMPARISON_LIST,
  kcComparison,
  leadsByAtLeast,
  newcombe,
  orderingChance,
  PARAMETERS,
  RULES_PATH,
  RULES_SHA256,
  windowArm,
  WINDOWS,
  wilson,
  Z,
} from '../src/keepkill/index.ts'
import { rng, ROOT, SEEDS } from './helpers.ts'

const readJson = (rel: string): any => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const RUN = readJson('runs/RUN-keepkill-rules.json')
const ALLOC = readJson('runs/RUN-keepkill-rules/allocation-vectors.json')
const INTERVALS = readJson('runs/RUN-keepkill-rules/interval-vectors.json')
const hex = (v: number): string => `0x${v.toString(16).padStart(8, '0')}`

test('the snapshot is a fresh generation from the hashed rules file, whose SHA-256 RUN-keepkill-rules records', () => {
  const bytes = fs.readFileSync(path.join(ROOT, RULES_PATH))
  assert.equal(RULES_PATH, GEN_RULES_PATH)
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), RULES_SHA256)
  assert.equal(RUN.values.rules_sha256, RULES_SHA256)
  assert.equal(RUN.inputs.find((i: { path?: string }) => i.path === RULES_PATH)?.sha256, RULES_SHA256)
  assert.equal(fs.readFileSync(path.join(ROOT, OUT_PATH), 'utf8'), render(bytes))
  assert.equal(PARAMETERS.z, 1.9599639845400543)
  assert.equal(Z, RUN.values.z.rules)
  assert.deepEqual(
    KC_COMPARISON_LIST.map((c) => [c.number, c.id, Object.values(c.units).flat().length]),
    [
      [1, 'misconception-note', RUN.values.units.misconception_note],
      [2, 'proof-blocks-distractors', RUN.values.units.proof_blocks_distractors],
      [3, 'witness-generalization', RUN.values.units.witness_generalization],
    ],
  )
  assert.equal(WINDOWS.id, 'reserve-weeks')
})

test('hash32 (packages/rng, the vendored kernelspace module) and fmix32 reproduce the recorded vectors', () => {
  for (const { input, hash32: want } of ALLOC.hash32_vectors) assert.equal(hex(hash32(input)), want, input)
  for (const { input, fmix32: want } of ALLOC.fmix32_vectors) assert.equal(hex(fmix32(Number(input))), want, input)
})

test('allocate reproduces every unit of RUN-keepkill-rules for its four example seeds', () => {
  assert.deepEqual(ALLOC.seeds, [0, 1, 2654435769, 4294967295])
  let units = 0
  for (const recorded of ALLOC.comparisons.filter((c: { number: number }) => c.number <= 3)) {
    const comparison = kcComparison(recorded.id)
    assert.deepEqual([...comparison.arms], recorded.arms)
    for (const perSeed of recorded.per_seed) {
      const got = allocate(comparison, perSeed.seed)
      assert.equal(got.length, perSeed.units.length)
      got.forEach((a, i) => {
        const want = perSeed.units[i]
        assert.deepEqual(
          { unit: a.unit, stratum: a.stratum, key: a.key, v: hex(a.v), position: a.position, arm: a.arm },
          { unit: want.unit, stratum: want.stratum, key: want.key, v: want.v, position: want.position, arm: want.arm },
          `${recorded.id} seed ${perSeed.seed} position ${i}`,
        )
        assert.equal(armOf(comparison, a.unit, perSeed.seed), want.arm)
      })
      const counts: Record<string, number> = {}
      for (const a of got) counts[a.arm] = (counts[a.arm] ?? 0) + 1
      assert.deepEqual(counts, perSeed.counts)
      assert.equal((got[0]?.v ?? 0) & 1, perSeed.first_v_lowest_bit)
      units += got.length
    }
  }
  assert.equal(units, 4 * (105 + 10 + 42))
  const windows = ALLOC.comparisons.find((c: { number: number }) => c.number === 4)
  for (const w of windows.first_window) {
    const got = firstWindowArm(WINDOWS, w.seed)
    assert.deepEqual({ key: got.key, v: hex(got.v), arm: got.arm }, { key: w.key, v: w.v, arm: w.window_1 })
    assert.equal(windowArm(WINDOWS, w.seed, 1), w.window_1)
    assert.notEqual(windowArm(WINDOWS, w.seed, 2), w.window_1)
    assert.equal(windowArm(WINDOWS, w.seed, 3), w.window_1)
  }
})

test('allocation equals the reference implementation on random seeds, and stays balanced within each stratum', async () => {
  const ref = await import(pathToFileURL(path.join(ROOT, 'scripts', 'spikes', 'W0-T07', 'keepkill.mjs')).href)
  for (const seed of [...SEEDS, 0xffffffff, 0x80000000]) {
    for (const c of KC_COMPARISON_LIST) {
      const mine = allocate(c, seed).map((a) => [a.unit, a.arm])
      const theirs = ref.allocate({ id: c.id, arms: c.arms, units: c.units }, seed).map((a: { unit: string; arm: string }) => [a.unit, a.arm])
      assert.deepEqual(mine, theirs)
      for (const stratum of Object.keys(c.units)) {
        const arms = allocate(c, seed).filter((a) => a.stratum === stratum)
        const n0 = arms.filter((a) => a.arm === c.arms[0]).length
        assert.ok(Math.abs(n0 - (arms.length - n0)) <= 1, `${c.id} ${stratum} seed ${seed}`)
      }
    }
    assert.equal(firstWindowArm(WINDOWS, seed).arm, ref.firstWindowArm({ id: WINDOWS.id, arms: WINDOWS.arms }, seed).arm)
  }
  const r = rng(99)
  for (let i = 0; i < 500; i++) {
    const s = Array.from({ length: Math.floor(r() * 40) }, () => String.fromCharCode(Math.floor(r() * 0x2fff))).join('')
    assert.equal(hash32(s), ref.hash32(s))
  }
  assert.throws(() => allocationKey('x', 'y', -1), RangeError)
  assert.throws(() => allocationKey('x', 'y', 2 ** 32), RangeError)
  assert.throws(() => allocationKey('x', 'y', 1.5), RangeError)
})

test('Wilson and Newcombe bounds reproduce the interval vectors to within 1e-12, and the integer tests hold', () => {
  const close = (a: number, b: number, what: string): void => assert.ok(Math.abs(a - b) <= 1e-12, `${what}: ${a} vs ${b}`)
  assert.equal(INTERVALS.z, Z)
  for (const w of INTERVALS.wilson) {
    const [l, u] = wilson(w.x, w.n)
    close(l, w.l, `wilson ${w.x}/${w.n} l`)
    close(u, w.u, `wilson ${w.x}/${w.n} u`)
  }
  for (const v of INTERVALS.newcombe) {
    const iv = newcombe(v.x1, v.n1, v.x2, v.n2)
    close(iv.d, v.d, 'd')
    close(iv.L, v.L, 'L')
    close(iv.U, v.U, 'U')
    if ('leads_by_10_points' in v) assert.equal(leadsByAtLeast(v.x1, v.n1, v.x2, v.n2, 10), v.leads_by_10_points)
  }
  assert.equal(18 / 20 - 16 / 20, INTERVALS.floating_point_trap.double)
  assert.equal(leadsByAtLeast(18, 20, 16, 20, 10), INTERVALS.floating_point_trap.exact_test_10_points)
  for (const c of INTERVALS.window_ordering_chance) assert.deepEqual(orderingChance(c.a, c.d), c)
  assert.throws(() => wilson(3, 2), RangeError)
})

test('the decisions reproduce the decision vectors exactly', () => {
  const sameInterval = (got: Record<string, number> | null, want: Record<string, number> | null): void => {
    if (want === null || want === undefined) return assert.equal(got, null)
    assert.ok(got !== null)
    for (const k of Object.keys(want)) assert.ok(Math.abs((got[k] as number) - (want[k] as number)) <= 1e-12, k)
  }
  for (const v of INTERVALS.decisions.common) {
    const got = decideCommon(v.input)
    assert.equal(got.decision, v.result.decision, v.label)
    assert.equal(got.rule, v.result.rule, v.label)
    sameInterval(got.interval as unknown as Record<string, number> | null, v.result.interval)
  }
  for (const v of INTERVALS.decisions.misconception_note) {
    const got = decideNote(v.input)
    assert.equal(got.decision, v.result.decision, v.label)
    assert.deepEqual(got.withdrawn, v.result.withdrawn, v.label)
    sameInterval(got.interval as unknown as Record<string, number> | null, v.result.interval)
  }
  for (const v of INTERVALS.decisions.reserve_weeks) {
    const got = decideWindows(v.input)
    assert.deepEqual(got, v.result, v.label)
  }
})

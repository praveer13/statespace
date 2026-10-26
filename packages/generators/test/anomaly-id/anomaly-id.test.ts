import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { drawInstance, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, EnginePort, KeyBase, TemplateId } from '../../src/core/index.ts'
import { classify, generator, POOL, ports } from '../../src/anomaly-id/index.ts'
import type { AnomalyInstance, History } from '../../src/anomaly-id/index.ts'
import type { Op, Txn } from '../../src/anomaly-id/history.ts'

const port: EnginePort = { run: (req) => (ports[req.engine] as EnginePort).run(req) }
const GRID = join(import.meta.dirname, '../../../../content/pg-catalog/grid')

// Hand-built histories at the numbers the recorded runs print. `at` is the step's place in the interleaving.
let at = 0
const op = (o: Omit<Op, 'at'>): Op => ({ ...o, at: at++ })
const txn = (s: string, level: Txn['level'], outcome: string, ops: Op[]): Txn => ({ s, level, outcome, ops })
const hist = (balance: number, txns: Txn[], final: History['final']): History => ({
  id: 'hand',
  sha256: '',
  template: 't1',
  band: 1,
  pattern: 'hand',
  half: 'graded',
  balance,
  levels: Object.fromEntries(txns.map((t) => [t.s, t.level])),
  txns,
  final,
})

/** Two read-modify-write debits of 80 from 100, both reading before either writes (RUN-pg-claims, E2). */
function rmw(level: Txn['level']): History {
  at = 0
  const a = [op({ n: 'ab', k: 'begin' }), op({ n: 'ar', k: 'seenBal', id: 1, rows: [[[100]]] })]
  const b = [op({ n: 'bb', k: 'begin' }), op({ n: 'br', k: 'seenBal', id: 1, rows: [[[100]]] })]
  a.push(op({ n: 'aw', k: 'rmwDebit', id: 1, amt: 80, guard: 80, rows: [[[100, 20]]] }), op({ n: 'ac', k: 'commit' }))
  if (level === 'RC') {
    b.push(op({ n: 'bw', k: 'rmwDebit', id: 1, amt: 80, guard: 80, rows: [[[20, 20]]] }), op({ n: 'bc', k: 'commit' }))
    return hist(100, [txn('a', level, 'commit', a), txn('b', level, 'commit', b)], { acct: { '1': 20, '2': 100 } })
  }
  b.push(op({ n: 'bw', k: 'rmwDebit', id: 1, amt: 80, guard: 80, sqlstate: '40001' }), op({ n: 'bc', k: 'commit' }))
  return hist(100, [txn('a', level, 'commit', a), txn('b', level, 'abort:40001', b)], { acct: { '1': 20, '2': 100 } })
}

test('read-modify-write at the recorded numbers: READ COMMITTED loses an update, REPEATABLE READ fails with 40001', () => {
  const rc = classify(rmw('RC'))
  assert.ok(!('unknown' in rc))
  assert.equal(rc.cls, 'lost-update')
  assert.equal(rc.orders, 2)
  assert.match((rc.failures ?? []).join(' '), /would print 20/, 'run second, either session would have read 20')
  const rr = classify(rmw('RR'))
  assert.ok(!('unknown' in rr))
  assert.equal(rr.cls, 'serialization-failure')
  assert.deepEqual(rr.order, ['a'])
})

test('team-sum write skew at REPEATABLE READ ends at -100 and is write skew (RUN-pg-anomalies, RUN-pg-mixed-levels)', () => {
  at = 0
  const a = [op({ n: 'ab', k: 'begin' }), op({ n: 'at', k: 'seenTeam', rows: [[[200]]] })]
  const b = [op({ n: 'bb', k: 'begin' }), op({ n: 'bt', k: 'seenTeam', rows: [[[200]]] })]
  a.push(op({ n: 'ad', k: 'teamDebit', id: 1, amt: 150, guard: 150, rows: [[[100, -50]]] }))
  b.push(op({ n: 'bd', k: 'teamDebit', id: 2, amt: 150, guard: 150, rows: [[[100, -50]]] }))
  a.push(op({ n: 'ac', k: 'commit' }))
  b.push(op({ n: 'bc', k: 'commit' }))
  const c = classify(hist(100, [txn('a', 'RR', 'commit', a), txn('b', 'RR', 'commit', b)], { acct: { '1': -50, '2': -50 } }))
  assert.ok(!('unknown' in c))
  assert.equal(c.cls, 'write-skew')
})

test('a READ COMMITTED reader across a committed move sees two versions; the same reads at one snapshot do not (RUN-pg-read-skew)', () => {
  const reader = (second: number): History => {
    at = 0
    const rd = [op({ n: 'rb', k: 'begin' }), op({ n: 'r1', k: 'read', id: 1, rows: [[[100]]] })]
    const mv = [op({ n: 'mb', k: 'begin' }), op({ n: 'mt', k: 'move', id: 1, to: 2, amt: 50, rows: [[[100, 50]], [[100, 150]]] }), op({ n: 'mc', k: 'commit' })]
    rd.push(op({ n: 'r2', k: 'read', id: 2, rows: [[[second]]] }), op({ n: 'rc', k: 'commit' }))
    return hist(100, [txn('rd', 'RC', 'commit', rd), txn('mv', 'RC', 'commit', mv)], { acct: { '1': 50, '2': 150 } })
  }
  const skew = classify(reader(150))
  assert.ok(!('unknown' in skew))
  assert.equal(skew.cls, 'read-skew', 'the reader totals 250 where every committed state totals 200')
  const snapshot = classify(reader(100))
  assert.ok(!('unknown' in snapshot))
  assert.equal(snapshot.cls, 'none', 'reads of 100 and 100 fit the order rd then mv')
})

test('opposite transfers: one session fails with 40P01 and what committed is serializable (RUN-pg-claims, E4)', () => {
  at = 0
  const a = [op({ n: 'ab', k: 'begin' }), op({ n: 'ad', k: 'condDebit', id: 1, amt: 10, guard: 10, rows: [[[100, 90]]] })]
  const b = [op({ n: 'bb', k: 'begin' }), op({ n: 'bd', k: 'condDebit', id: 2, amt: 10, guard: 10, rows: [[[100, 90]]] })]
  // a's credit waits on b's lock; b's credit closes the cycle and fails with 40P01; b rolls back, a's credit completes.
  a.push(op({ n: 'ak', k: 'credit', id: 2, amt: 10, rows: [[[100, 110]]] }))
  b.push(op({ n: 'bk', k: 'credit', id: 1, amt: 10, sqlstate: '40P01' }))
  a.push(op({ n: 'ac', k: 'commit' }))
  const c = classify(hist(100, [txn('a', 'RC', 'commit', a), txn('b', 'RC', 'abort:40P01', b)], { acct: { '1': 90, '2': 110 } }))
  assert.ok(!('unknown' in c))
  assert.equal(c.cls, 'deadlock')
  assert.deepEqual(c.order, ['a'])
})

test('every pooled history is a copy of a recorded block: its id and SHA-256 are in the grid, and its numbers are in the block', () => {
  const recorded = new Map<string, { block_sha256: string; block: string }>()
  for (const f of readdirSync(GRID).filter((x) => x.endsWith('.ndjson')))
    for (const line of readFileSync(join(GRID, f), 'utf8').split('\n')) if (line.trim() !== '') {
      const h = JSON.parse(line) as { id: string; block_sha256: string; block: string }
      recorded.set(h.id, h)
    }
  assert.ok(POOL.length > 400)
  for (const h of POOL) {
    const r = recorded.get(h.id)
    assert.ok(r, h.id)
    assert.equal(r.block_sha256, h.sha256)
    const numbers = new Set(r.block.match(/-?\d+/g) ?? [])
    for (const t of h.txns) for (const o of t.ops) for (const table of o.rows ?? []) for (const row of table) for (const v of row) assert.ok(numbers.has(String(v)), `${h.id}: ${v}`)
    const c = classify(h)
    assert.ok(!('unknown' in c), `${h.id} classifies`)
  }
})

test('every template and band: the checker confirms the reference and every distractor misses with its tag', async () => {
  for (const t of ['t1', 't2', 't3', 't4'] as TemplateId[]) {
    for (const band of [1, 2, 3] as Band[]) {
      for (let seed = 1; seed <= 10; seed++) {
        for (const s of [seed * 2654435761 >>> 0 & 0x7fffffff, (seed * 2654435761 >>> 0) | 0x80000000]) {
          const out = await drawInstance(generator, port, { seed: s >>> 0, band, template: t })
          assert.equal(out.status, 'drawn')
          if (out.status !== 'drawn') continue
          const inst = out.instance as AnomalyInstance
          assert.equal(inst.data.history.half, (s >>> 0) >= 0x80000000 ? 'display' : 'graded', 'the seed half picks the pool half')
          const k = await generator.key(inst, port)
          assert.ok(!isDiscard(k))
          const part = inst.item.parts[0] as ChoicePart
          assert.equal(part.options.length, 6)
          assert.equal((k as KeyBase).choices[0]?.answer, part.options.find((o) => o.origin.kind === 'reference')?.id)
          for (const o of part.options) {
            const g = await generator.grade(inst, { main: o.id }, k as never, port)
            assert.equal(g.ok, o.origin.kind === 'reference')
            if (o.origin.kind === 'mutant') assert.equal(g.misconception, o.origin.tag)
          }
        }
      }
    }
  }
})

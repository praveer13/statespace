import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ask, BUDGET_STOPS, engineAtVersion, errorCodeOf } from '../../src/core/index.ts'
import type { EnginePort } from '../../src/core/index.ts'
import { reply, scriptedPort } from './helpers.ts'

const req = { engine: 'z3', version: '5.3.1', input: 'x', budget: { wallMs: 1000, rlimit: 5_000_000 } } as const

test('a definite verdict comes back as a verdict, with its reply', async () => {
  const a = await ask(scriptedPort(() => reply({ kind: 'sat' }, { x: 1 })), req)
  assert.equal(a.kind, 'verdict')
  assert.equal(a.kind === 'verdict' && a.reply.verdict.kind, 'sat')
})

test('an unknown verdict is unknown; Z3\'s "canceled" reason marks an rlimit stop as a budget stop', async () => {
  const plain = await ask(scriptedPort(() => reply({ kind: 'unknown', reason: 'incomplete (theory arithmetic)' })), req)
  assert.deepEqual(plain.kind === 'unknown' && { reason: plain.reason, budget: plain.budget }, { reason: 'incomplete (theory arithmetic)', budget: false })
  const canceled = await ask(scriptedPort(() => reply({ kind: 'unknown', reason: 'canceled' })), req)
  assert.equal(canceled.kind === 'unknown' && canceled.budget, true)
})

test('a budget stop from the bus is unknown; every other bus error is thrown', async () => {
  for (const code of BUDGET_STOPS) {
    const port: EnginePort = { run: async () => Promise.reject(Object.assign(new Error(code), { code })) }
    const a = await ask(port, req)
    assert.deepEqual(a.kind === 'unknown' && { reason: a.reason, budget: a.budget }, { reason: code, budget: true })
  }
  for (const code of ['invalid-input', 'engine-crashed', 'version-mismatch', undefined]) {
    const port: EnginePort = { run: async () => Promise.reject(Object.assign(new Error(String(code)), code === undefined ? {} : { code })) }
    await assert.rejects(ask(port, req))
  }
  assert.equal(errorCodeOf({ code: 'busy' }), 'busy')
  assert.equal(errorCodeOf(new Error('x')), undefined)
  assert.equal(errorCodeOf(null), undefined)
})

test('engine@version names the engine the reply came from', () => {
  assert.equal(engineAtVersion(reply({ kind: 'unsat' })), 'z3@5.3.1')
})
